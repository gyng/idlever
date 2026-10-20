//! Current earned continuation and observed single-run catalogue; no game state grants.
use idlever_core::{bloodlines::Session, packages};
use serde_json::{json, Value};
use std::{fs, path::Path};

fn write(dir: &Path, name: &str, value: &impl serde::Serialize) {
    fs::write(dir.join(name), serde_json::to_vec(value).unwrap()).unwrap();
}
fn positions(s: &Session) -> Value {
    s.run.as_ref().map_or(Value::Null, |r| json!({
        "turn":r.turn,"depth":r.depth,"hero":r.hero.pos,"hp":r.hero.hp,"max_hp":r.hero.max_hp,
        "monsters":r.monsters.iter().map(|m|json!({"id":m.id,"kind":m.kind,"pos":m.pos,
            "hp":m.hp,"ally":m.ally,"neutral":m.neutral,"buff_def":m.buff_def,"pending":m.pending})).collect::<Vec<_>>(),
        "overlays":r.overlays,"gas_dmg_floor":r.gas_dmg_floor,"hunger_periods":r.hunger_periods,
        "hunger_lost":r.hunger_lost,"passed":r.passed
    }))
}
fn trace(
    mut s: Session,
    quantum: u32,
    dir: Option<&Path>,
) -> Result<(Session, Vec<Value>), String> {
    let mut events = Vec::new();
    let mut frames = Vec::new();
    let mut floors = Vec::new();
    let mut last_depth = None;
    for _ in 0..200_000 / quantum {
        if let Some(r) = &s.run {
            if last_depth != Some(r.depth) {
                if dir.is_some() {
                    floors.push(json!({"depth":r.depth,"route":r.route,"turn":r.turn,
                        "floor":r.floor,"hero":r.hero,"monsters":r.monsters,"overlays":r.overlays,
                        "twist":r.floor_twist}));
                }
                last_depth = Some(r.depth);
            }
        }
        let before = if dir.is_some() {
            positions(&s)
        } else {
            Value::Null
        };
        let step = s.step(quantum);
        let evs = serde_json::to_value(step.events).map_err(|e| e.to_string())?;
        if dir.is_some() && !evs.as_array().unwrap().is_empty() {
            frames.push(json!({"before":before,"after":positions(&s),"events":evs}));
        }
        events.extend(evs.as_array().unwrap().iter().cloned());
        if step.run_over {
            if let Some(dir) = dir {
                write(dir, "frames.json", &frames);
                write(dir, "floors.json", &floors);
            }
            return Ok((s, events));
        }
    }
    Err("bounded trace did not finish within 200000 ticks".into())
}
fn choose(s: &mut Session, choice: &str) -> Result<(), String> {
    if choice == "baseline" {
        return Ok(());
    }
    let (id, variant) = choice
        .split_once('@')
        .map_or((choice, None), |(id, v)| (id, Some(v)));
    s.equip_package(id, 0)?;
    if let Some(variant) = variant {
        s.set_tactic_variant(
            id,
            variant
                .parse::<u32>()
                .map_err(|_| "invalid tactic variant")?,
        )?;
    }
    Ok(())
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() < 5 {
        return Err(
            "earn|prepare|trace|absence|loadout|purchase|reasons|packages SAVE NEW_OUT ARG [CARDS/CHOICE] [COMMON_SUPPLIES] [REVOKE_DRILLS]".into(),
        );
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let input = fs::read_to_string(&args[2])?;
    let mut s = Session::load(&input)?;
    if !s.others.is_empty() {
        return Err("catalogue requires an earned single-resident parent".into());
    }
    let dir = Path::new(&args[3]);
    fs::create_dir(dir)?;
    fs::write(dir.join("normalized-input.json"), s.save())?;
    match args[1].as_str() {
        "packages" => {
            let before = s.save();
            write(dir, "packages.json", &idlever_core::packages::wire(&s.active.lineage));
            if before != s.save() {
                return Err("package wire read mutated save".into());
            }
        }
        "earn" => {
            let hours: u64 = args[4].parse()?;
            if !(1..=24).contains(&hours) {
                return Err("earned continuation must be 1..24h".into());
            }
            let report = s.run_offline_mode(hours * 3600, false, true);
            write(dir, "report.json", &report);
        }
        "absence" => {
            let hours: u64 = args[4].parse()?;
            if hours != 8 || s.run.is_some() {
                return Err("absence comparison requires a home parent and exactly8h".into());
            }
            s.set_worker("scout", true)?;
            write(
                dir,
                "actions.json",
                &json!([{"command":"set_worker","id":"scout","on":true}]),
            );
            fs::write(dir.join("common-away-parent.json"), s.save())?;
            if let Some(choice) = args.get(5) {
                choose(&mut s, choice)?;
            }
            fs::write(dir.join("choice-parent.json"), s.save())?;
            let report = s.run_offline_mode(hours * 3600, false, true);
            write(dir, "report.json", &report);
        }
        "reasons" => {
            let ticks: u32 = args[4].parse()?;
            if ticks != 50 || s.run.is_some() {
                return Err("reason probe requires home and exactly50 ticks".into());
            }
            if let Some(choice) = args.get(5) {
                choose(&mut s, choice)?;
            }
            fs::write(dir.join("choice-parent.json"), s.save())?;
            s.try_send()?;
            fs::write(dir.join("send.json"), s.save())?;
            let mut events = Vec::new();
            for _ in 0..ticks {
                let step = s.step(1);
                events.extend(step.events);
                if step.run_over {
                    return Err("reason prefix ended before50 ticks".into());
                }
            }
            write(dir, "events.json", &events);
            write(
                dir,
                "trace.json",
                &s.run.as_ref().ok_or("missing live run")?.trace,
            );
        }
        "purchase" => {
            if s.run.is_some() {
                return Err("purchase comparison requires home".into());
            }
            write(dir, "offers-before.json", &s.unlocks());
            let marks = s.lineage.marks;
            let gold = s.lineage.gold;
            match s.buy(&args[4]) {
                Ok(()) => write(
                    dir,
                    "purchase.json",
                    &json!({"id":args[4],"ok":true,
                    "marks_spent":marks-s.lineage.marks,"gold_spent":gold-s.lineage.gold}),
                ),
                Err(error) => {
                    write(
                        dir,
                        "purchase.json",
                        &json!({"id":args[4],"ok":false,"error":error}),
                    );
                    fs::write(dir.join("after-refusal.json"), s.save())?;
                    return Err(error.into());
                }
            }
        }
        "loadout" => {
            if s.run.is_some() {
                return Err("loadout comparison requires home".into());
            }
            let config: idlever_core::kit::StartingConfig =
                serde_json::from_str(&fs::read_to_string(&args[4])?)?;
            write(
                dir,
                "offers-before.json",
                &idlever_core::kit::starting_wire(&s.lineage),
            );
            let before = s.clone();
            idlever_core::kit::set_starting(&mut s.active, Some(config.clone()))?;
            assert_eq!(s.lineage.gold, before.lineage.gold);
            assert_eq!(s.lineage.marks, before.lineage.marks);
            assert_eq!(s.lineage.clock_s, before.lineage.clock_s);
            assert_eq!(s.lineage.rng, before.lineage.rng);
            assert_eq!(s.lineage.bloodline, before.lineage.bloodline);
            write(
                dir,
                "actions.json",
                &json!([{"command":"set_starting","config":config,"gold_spent":0}]),
            );
            write(
                dir,
                "offers-after.json",
                &idlever_core::kit::starting_wire(&s.lineage),
            );
        }
        "prepare" => {
            let depth: u32 = args[4].parse()?;
            let mut actions = Vec::new();
            s.set_worker("scout", false)?;
            actions.push(json!({"command":"set_worker","id":"scout","on":false}));
            if s.run.is_some() {
                return Err("use a completed earned camp; do not discard an in-flight run".into());
            }
            let ticks = idlever_core::persistent::remaining(&s.lineage);
            if ticks > 0 {
                let seconds = ticks.div_ceil(10);
                let report = s.run_offline_mode(seconds, false, true);
                actions.push(json!({"command":"wait_recovery","seconds":seconds,"report":report}));
            }
            s.set_start(depth)?;
            actions.push(json!({"command":"set_start","depth":depth}));
            if let Some(cards) = args.get(5) {
                for id in cards.split(',') {
                    while s.lineage.pkg.level(id) < 3 {
                        let price = packages::level_price(&s.lineage, id);
                        let level = s.spend_level(id)?;
                        actions.push(
                            json!({"command":"spend_level","id":id,"price":price,"level":level}),
                        );
                    }
                }
            }
            if let Some(supplies) = args.get(6) {
                for kind in supplies.split(',') {
                    if !s.lineage.supplies.iter().any(|item| item.kind == kind) {
                        let gold = s.lineage.gold;
                        s.buy_supply(kind)?;
                        assert_eq!(s.lineage.gold, gold);
                        actions.push(json!({"command":"buy_supply","kind":kind,"gold_spent":0}));
                    }
                }
            }
            if let Some(drills) = args.get(7) {
                for boss in drills.split(',') {
                    s.revoke_drill(boss, true)?;
                    actions.push(json!({"command":"revoke_drill","boss":boss,"revoked":true}));
                }
            }
            s.set_live_decisions(false);
            actions.push(json!({"command":"set_live_decisions","on":false}));
            write(dir, "actions.json", &actions);
        }
        "trace" => {
            let depth: u32 = args[4].parse()?;
            if s.lineage.start != depth || s.run.is_some() {
                return Err("trace requires prepared home at requested start".into());
            }
            let before = s.clone();
            if let Some(choice) = args.get(5) {
                choose(&mut s, choice)?;
            }
            assert_eq!(s.lineage.gold, before.lineage.gold);
            assert_eq!(s.lineage.clock_s, before.lineage.clock_s);
            assert_eq!(s.lineage.marks, before.lineage.marks);
            assert_eq!(s.lineage.rng, before.lineage.rng);
            assert_eq!(s.lineage.bloodline, before.lineage.bloodline);
            fs::write(dir.join("choice-parent.json"), s.save())?;
            let snapshot = s.try_send()?;
            write(dir, "send-snapshot.json", &snapshot);
            fs::write(dir.join("send.json"), s.save())?;
            let coarse = s.clone();
            let (fine, events) = trace(s, 1, Some(dir))?;
            let (coarse, coarse_events) = trace(coarse, 100, None)?;
            write(dir, "events.json", &events);
            fs::write(dir.join("after-fine.json"), fine.save())?;
            fs::write(dir.join("after-coarse.json"), coarse.save())?;
            write(
                dir,
                "observer-parity.json",
                &json!({"events":events==coarse_events,"save":fine.save()==coarse.save(),"event_count":events.len()}),
            );
            if events != coarse_events || fine.save() != coarse.save() {
                return Err(
                    "observer quantum changed events or complete after-save; retain failure".into(),
                );
            }
            s = fine;
        }
        _ => return Err("unknown mode".into()),
    }
    fs::write(dir.join("after.json"), s.save())?;
    write(
        dir,
        "summary.json",
        &json!({"best_depth":s.lineage.best_depth,"gold":s.lineage.gold,
        "marks":s.lineage.marks,"clock_s":s.lineage.clock_s,"start":s.lineage.start,
        "owned":s.lineage.pkg.owned,"levels":s.lineage.pkg.owned.iter().map(|id|(id.clone(),s.lineage.pkg.level(id))).collect::<std::collections::BTreeMap<_,_>>(),
        "last_run":s.lineage.last_run}),
    );
    Ok(())
}
