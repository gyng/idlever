//! Cut305: controlled future RNG from actual encounter starts; never a gate.
use idlever_core::{engine::Capsule, Ev};
use serde_json::{json, Value};
use std::{collections::BTreeSet, fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}

fn expedition(cap: &Capsule, state: Option<u64>, limit: u64) -> Result<(Value, Value)> {
    assert!(cap.inputs.is_empty());
    let original = serde_json::to_value(&cap.game)?;
    let mut g = (*cap.game).clone();
    assert_eq!(g.run.as_ref().unwrap().turn, 0);
    assert!(g.run.as_ref().unwrap().over.is_none());
    g.events = cap.pre.clone();
    let mut expected = original.clone();
    expected["events"] = serde_json::to_value(&cap.pre)?;
    if let Some(state) = state {
        assert_ne!(state, 0);
        g.run.as_mut().unwrap().rng = serde_json::from_value(json!({"s":state}))?;
        expected["run"]["rng"] = json!({"s":state});
    }
    let prepared = serde_json::to_value(&g)?;
    assert_eq!(prepared, expected, "only declared RNG/event preparation");
    let mut events = Vec::new();
    let mut ticks = 0_u64;
    idlever_core::engine::without_history(|| {
        while g.run.as_ref().is_some_and(|r| r.over.is_none()) && ticks < limit {
            g.tick();
            events.append(&mut g.events);
            ticks += 1;
        }
    });
    let r = g.run.as_ref().unwrap();
    let result = json!({
        "state":state.map(|s|s.to_string()),"ticks":ticks,"censored":r.over.is_none(),
        "max_depth":r.max_depth,"depth":r.depth,"tier":r.over.map(|t|t.name()),
        "turns":r.turn,"hp":r.hero.hp,"carry":r.loot,"secured":r.secured,
        "death_cause":r.death_cause,"events_hash":idlever_core::engine::events_hash(&events),
        "events":events,"terminal_run":r,
    });
    assert_eq!(
        serde_json::to_value(&cap.game)?,
        original,
        "source untouched"
    );
    Ok((prepared, result))
}

fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 2 {
        return Err("worker_rng_probe SPEC NEW_OUTPUT".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no tuning overrides".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let raw_spec = fs::read(&args[0])?;
    let spec: Value = serde_json::from_slice(&raw_spec)?;
    let states: Vec<u64> = spec["seeds"]
        .as_array()
        .ok_or("seeds missing")?
        .iter()
        .map(|s| {
            s.as_str()
                .ok_or("state must be string")?
                .parse()
                .map_err(Into::into)
        })
        .collect::<Result<_>>()?;
    assert_eq!(states.len(), 64);
    assert_eq!(states.iter().collect::<BTreeSet<_>>().len(), 64);
    let limit = spec["safety_ticks"].as_u64().ok_or("limit missing")?;
    assert_eq!(limit, 1_000_000);
    let contexts = spec["contexts"].as_array().ok_or("contexts missing")?;
    assert_eq!(contexts.len(), 4);
    let out = Path::new(&args[1]);
    fs::create_dir(out)?;
    fs::write(out.join("spec.json"), &raw_spec)?;
    let mut loaded = Vec::new();
    // All four original controls must pass before any controlled outcome.
    for context in contexts {
        let label = format!(
            "{}-{}",
            context["context"].as_str().unwrap(),
            context["role"].as_str().unwrap()
        );
        let cap: Capsule = serde_json::from_slice(&fs::read(context["send"].as_str().unwrap())?)?;
        let actual: Value = serde_json::from_slice(&fs::read(context["run"].as_str().unwrap())?)?;
        let (prepared, control) = expedition(&cap, None, limit)?;
        assert_eq!(control["censored"], false);
        let public: Vec<Ev> = actual["replay"]["floors"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|f| f["events"].as_array().unwrap().iter())
            .map(|e| serde_json::from_value(e.clone()).unwrap())
            .collect();
        assert_eq!(control["events"], serde_json::to_value(public)?);
        assert_eq!(control["events_hash"], actual["replay"]["hash"]);
        assert_eq!(control["terminal_run"], actual["terminal_run"]);
        emit(out, &format!("{label}-original-prepared.json"), &prepared)?;
        emit(out, &format!("{label}-original.json"), &control)?;
        println!("original {label}: exact");
        loaded.push((label, cap));
    }
    let mut rows = Vec::new();
    for (label, cap) in &loaded {
        let mut first = None;
        for (i, state) in states.iter().enumerate() {
            let (prepared, result) = expedition(cap, Some(*state), limit)?;
            emit(out, &format!("{label}-{i:02}-prepared.json"), &prepared)?;
            emit(out, &format!("{label}-{i:02}.json"), &result)?;
            let mut row = result.clone();
            row.as_object_mut().unwrap().remove("events");
            row.as_object_mut().unwrap().remove("terminal_run");
            row["label"] = json!(label);
            row["index"] = json!(i);
            rows.push(row);
            if i == 0 {
                first = Some((prepared, result));
            }
        }
        let repeat = expedition(cap, Some(states[0]), limit)?;
        assert_eq!(first.as_ref(), Some(&repeat), "full repeat exactly equal");
        emit(out, &format!("{label}-repeat-prepared.json"), &repeat.0)?;
        emit(out, &format!("{label}-repeat.json"), &repeat.1)?;
        println!("controlled {label}: 64 and exact repeat");
    }
    emit(out, "rows.json", &rows)?;
    assert_eq!(fs::read(&args[0])?, raw_spec);
    Ok(())
}
