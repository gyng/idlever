//! Cut304: current earned worker camps, actual exit traces; diagnostic, never a gate.
use idlever_core::{bloodlines::Session, engine::Capsule, packages, Ev, Replay, RunRec};
use serde_json::json;
use std::{collections::BTreeMap, fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
fn reconstruct(dir: &Path, cap: &Capsule, rec: &RunRec, replay: &Replay) -> Result<()> {
    assert!(cap.inputs.is_empty());
    let mut g = (*cap.game).clone();
    g.events = cap.pre.clone();
    let rules = g.lineage.rules().clone();
    let mut events = Vec::new();
    idlever_core::engine::without_history(|| {
        while g.run.as_ref().is_some_and(|r| r.over.is_none()) {
            g.tick();
            events.append(&mut g.events);
        }
    });
    let r = g.run.as_ref().unwrap();
    assert_eq!(r.turn, rec.turns);
    assert_eq!(r.depth, rec.depth);
    assert_eq!(r.over.unwrap().name(), rec.tier);
    let public: Vec<Ev> = replay
        .floors
        .iter()
        .flat_map(|f| f.events.iter().cloned())
        .collect();
    assert_eq!(events, public, "complete actual public replay events");
    assert_eq!(idlever_core::engine::events_hash(&events), replay.hash);
    emit(
        dir,
        &format!("run-{:06}.json", rec.id),
        &json!({"record":rec,"replay":replay,
        "public_events_exact":true,"rules":rules,
        "raw_row_tally":g.row_tally,"terminal_run":r,
        "exit_row_body":r.exit_row.and_then(|i|usize::try_from(i).ok()).and_then(|i|rules.rows.get(i)),
        "send_kit":cap.game.lineage.kit,"send_worker_acts":cap.game.lineage.tree.acts}),
    )
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        return Err("worker_trace_probe NEW_OUTPUT SAVED_CAMP...".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no tuning overrides".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let out = Path::new(&args[0]);
    fs::create_dir(out)?;
    for input in &args[1..] {
        let raw = fs::read_to_string(input)?;
        let source = Session::load(&raw)?;
        assert!(source.run.is_none());
        assert!(source.others.is_empty());
        let label = Path::new(input).file_stem().unwrap().to_str().unwrap();
        let dir = out.join(label);
        fs::create_dir(&dir)?;
        fs::write(dir.join("original.json"), &raw)?;
        fs::write(dir.join("canonical.json"), source.save())?;
        let source_before = source.save();
        let variants = ["unchanged", "pause-apprentice", "unchanged-repeat"];
        let mut control = None;
        for variant in variants {
            let branch = dir.join(variant);
            fs::create_dir(&branch)?;
            let mut s = source.clone();
            let funds = (
                s.lineage.gold,
                s.lineage.town.bank,
                s.lineage.marks,
                s.lineage.clock_s,
                s.lineage.total_turns,
            );
            if variant == "pause-apprentice" {
                s.set_worker("apprentice", false)?;
            }
            assert_eq!(
                funds,
                (
                    s.lineage.gold,
                    s.lineage.town.bank,
                    s.lineage.marks,
                    s.lineage.clock_s,
                    s.lineage.total_turns
                )
            );
            fs::write(branch.join("prepared.json"), s.save())?;
            emit(
                &branch,
                "packing.json",
                &json!({"quartermaster":packages::quartermaster(&s.lineage),
                "package_kinds":packages::pack_kinds(&s.lineage),"supply_cap":s.lineage.supply_cap()}),
            )?;
            let frontier = s.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0);
            let mut last = frontier;
            let mut caps = BTreeMap::new();
            let mut records = Vec::new();
            let mut report = None;
            for slice in 1..=1440 {
                report = Some(s.run_offline_slice(60, slice == 1440));
                for cap in s.active.capsules.0.iter().filter(|c| c.id > frontier) {
                    if let std::collections::btree_map::Entry::Vacant(e) = caps.entry(cap.id) {
                        assert_eq!(cap.game.run.as_ref().unwrap().turn, 0);
                        emit(&branch, &format!("send-{:06}.json", cap.id), cap)?;
                        e.insert(cap.clone());
                    }
                }
                for rec in s.lineage.run_log.iter().filter(|r| r.id > last) {
                    let replay = s.replay(rec.id).ok_or("actual replay unavailable")?;
                    reconstruct(
                        &branch,
                        caps.get(&rec.id).ok_or("actual capsule unavailable")?,
                        rec,
                        &replay,
                    )?;
                    records.push(json!({"record":rec,"replay_hash":replay.hash}));
                }
                last = last.max(s.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0));
            }
            assert_eq!(records.len(), caps.len(), "every captured send completes");
            let report = report.unwrap();
            assert!(!report.sampled);
            emit(&branch, "report.json", &report)?;
            fs::write(branch.join("after.json"), s.save())?;
            assert_eq!(
                i64::from(s.lineage.gold) + i64::from(s.lineage.town.bank),
                s.lineage.tree.ledger
            );
            let result = json!({"records":records,"best":s.lineage.best_depth,"gold":s.lineage.gold,
                "bank":s.lineage.town.bank,"ledger":s.lineage.tree.ledger,"clock_s":s.lineage.clock_s,
                "requested_seconds":86400,"scope":"current-rule continuation of historical earned camp; diagnostic, not a gate"});
            emit(&branch, "result.json", &result)?;
            let actual = (s.save(), serde_json::to_string(&report)?, result);
            if variant == "unchanged" {
                control = Some(actual.clone());
            }
            if variant == "unchanged-repeat" {
                assert_eq!(control.as_ref(), Some(&actual));
            }
            println!(
                "{label}/{variant}: D{} {} runs",
                s.lineage.best_depth,
                records.len()
            );
        }
        assert_eq!(source.save(), source_before);
        assert_eq!(fs::read_to_string(input)?, raw);
    }
    Ok(())
}
