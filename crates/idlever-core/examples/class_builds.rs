//! Cut293: current earned class/loadout comparisons; no state grants.
use idlever_core::{
    bloodlines::Session,
    class_tree, kit,
    rules::{Cond, Row, Verb},
};
use serde_json::{json, Value};
use std::{fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
fn write(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
fn save(dir: &Path, name: &str, s: &Session) -> Result<()> {
    fs::write(dir.join(name), s.save())?;
    Ok(())
}
fn observed(mut s: Session, quantum: u32) -> Result<(Session, Vec<Value>)> {
    let mut events = Vec::new();
    for _ in 0..200000 / quantum {
        let step = s.step(quantum);
        events.extend(
            serde_json::to_value(step.events)?
                .as_array()
                .ok_or("events not array")?
                .iter()
                .cloned(),
        );
        if step.run_over {
            return Ok((s, events));
        }
    }
    Err("run censored at200000 ticks".into())
}
fn run(input: &str, dir: &Path, weapon: &str, policy: &str) -> Result<()> {
    let mut s = Session::load(input)?;
    if s.run.is_some()
        || !s.others.is_empty()
        || s.lineage.start != 1
        || idlever_core::tree::on(&s.lineage, "scout")
    {
        return Err("requires original home single-resident D1 Scout-off parent".into());
    }
    save(dir, "normalized-input.json", &s)?;
    write(
        dir,
        "class-offers-before.json",
        &class_tree::offers(&s.active.lineage, false),
    )?;
    write(dir, "vocabulary-before.json", &s.vocabulary_wire())?;
    let before = (
        s.lineage.gold,
        s.lineage.marks,
        s.lineage.clock_s,
        s.lineage.rng.clone(),
    );
    let mut actions = Vec::new();
    match (s.lineage.class.name(), policy) {
        (_, "baseline") => {}
        ("fighter", "authored") => {
            for id in ["fighter_warden", "fighter_recovery", "fighter_reaver"] {
                let offer = class_tree::offers(&s.active.lineage, false);
                s.learn_class_skill(id)?;
                actions.push(json!({"method":"learn_class_skill","id":id,"offers_before":offer,"offers_after":class_tree::offers(&s.active.lineage,false)}));
            }
        }
        ("caster", "authored") => {
            if !s.lineage.pkg.pen_open {
                return Err("pen closed".into());
            }
            let mut rules = s.lineage.rules().clone();
            let added = vec![
                Row::new(
                    vec![Cond::n("hp<", 70), Cond::n("foes>=", 1)],
                    Verb::new("ward"),
                ),
                Row::new(vec![Cond::n("foes>=", 1)], Verb::arg("bolt", "nearest")),
            ];
            rules.rows.splice(0..0, added.clone());
            s.set_rules(rules)?;
            actions.push(json!({"method":"set_rules","added":added,"own_rows_after":s.lineage.rules().own_rows(),"max_rows":s.lineage.max_rows()}));
        }
        _ => return Err("undeclared policy/class".into()),
    }
    assert_eq!(
        before,
        (
            s.lineage.gold,
            s.lineage.marks,
            s.lineage.clock_s,
            s.lineage.rng.clone()
        )
    );
    write(dir, "policy-actions.json", &actions)?;
    save(dir, "policy-parent.json", &s)?;
    write(
        dir,
        "gear-offers-before.json",
        &kit::starting_wire(&s.lineage),
    )?;
    write(dir, "kit-offers-before.json", &kit::ladders(&s.lineage))?;
    let mut config = s
        .lineage
        .starting_config
        .clone()
        .ok_or("missing existing starting config")?;
    let method = if s.lineage.class.name() == "gunner" {
        kit::buy(&mut s.active, weapon)?;
        "choose_firearm"
    } else {
        config.weapon = Some(weapon.into());
        kit::set_starting(&mut s.active, Some(config.clone()))?;
        "set_starting"
    };
    assert_eq!(
        before,
        (
            s.lineage.gold,
            s.lineage.marks,
            s.lineage.clock_s,
            s.lineage.rng.clone()
        )
    );
    write(
        dir,
        "loadout-action.json",
        &json!({"method":method,"weapon":weapon,"config":config,"gold_spent":0,"marks_spent":0}),
    )?;
    write(dir, "ready.json", &s.lineage())?;
    write(dir, "compiled-rules.json", s.lineage.rules())?;
    save(dir, "ready-save.json", &s)?;
    s.try_send()?;
    save(dir, "sent.json", &s)?;
    write(dir, "initial-run.json", &s.run)?;
    let id = s.run.as_ref().ok_or("send did not create run")?.id;
    let (fine, events) = observed(s.clone(), 1)?;
    let (coarse, events_coarse) = observed(s.clone(), 100)?;
    write(dir, "events.json", &events)?;
    write(dir, "events-coarse.json", &events_coarse)?;
    save(dir, "after-fine.json", &fine)?;
    save(dir, "after-coarse.json", &coarse)?;
    if fine.save() != coarse.save() || events != events_coarse {
        return Err("observer mismatch".into());
    }
    let replay = fine.replay(id).ok_or("new actual run replay missing")?;
    write(dir, "replay.json", &replay)?;
    let mut away = s.clone();
    let report = away.run_offline_mode(28800, false, true);
    let mut repeat = s.clone();
    let report2 = repeat.run_offline_mode(28800, false, true);
    write(dir, "absence-report.json", &report)?;
    write(dir, "absence-repeat-report.json", &report2)?;
    save(dir, "absence-after.json", &away)?;
    save(dir, "absence-repeat-after.json", &repeat)?;
    if away.save() != repeat.save()
        || serde_json::to_value(&report)? != serde_json::to_value(&report2)?
    {
        return Err("absence repeat mismatch".into());
    }
    assert_eq!(away.lineage.clock_s - s.lineage.clock_s, 28800);
    write(
        dir,
        "summary.json",
        &json!({"class":s.lineage.class.name(),"weapon":weapon,"policy":policy,"run_id":id,"events":events.len(),"observer_events_exact":true,"observer_save_exact":true,"absence_repeat_report_exact":true,"absence_repeat_save_exact":true,"clock_delta":away.lineage.clock_s-s.lineage.clock_s,"purse_delta":away.lineage.gold-s.lineage.gold,"last_run":fine.lineage.last_run}),
    )?;
    Ok(())
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 5 {
        return Err("class_builds SAVE NEW_OUT WEAPON baseline|authored".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let input = fs::read_to_string(&args[1])?;
    let dir = Path::new(&args[2]);
    fs::create_dir(dir)?;
    if let Err(error) = run(&input, dir, &args[3], &args[4]) {
        write(dir, "failure.json", &json!({"error":error.to_string()}))?;
        return Err(error);
    }
    Ok(())
}
