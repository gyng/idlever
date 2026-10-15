//! Cut225: earned Clown/Engineer unlock camps and paired class comparisons. Diagnostic only,
//! never a balance gate. Every camp is derived from a fresh town through public actions
//! (manual house, manual sends until the Scout, 8 h check-ins with the shared paid home
//! preparation); no stat, XP, item or unlock grants.
//!   cut225_classes NEW_OUT_DIR [--seeds 1,3,5] [--checkins 9] [--only label,label]
//!
//! Owner tuning 2026-10-14: `*-skilled` builds are the same camps played by a skilled player:
//! the forecast's top package move at each check-in (PICKED's bar), every legal tree node, and
//! (Clown/Engineer) a short hand-written pen block that uses the class's tools deliberately.
use idlever_core::rules::{Cond, Row, Verb};
use idlever_core::{bloodlines::Session, hero::Class, tree};
#[path = "gunner_support/mod.rs"]
mod gunner_support;
use gunner_support::camp;
use std::path::Path;

fn gate(s: &Session, c: Class) -> Option<String> {
    idlever_core::meta::class_gate(&s.active.lineage, c)
}

/// A manual send; a hero still recovering from a death (Cut227) is waited out at home first.
fn send(s: &mut Session) {
    for _ in 0..100 {
        match s.try_send() {
            Ok(_) => return,
            Err(e) if e.contains("recovering") => {
                s.run_offline_mode(600, false, false);
            }
            Err(e) => panic!("legal manual send: {e}"),
        }
    }
    panic!("recovery never ended");
}

/// Fresh public-action progression until both earned classes open (or the cap). Returns the
/// first camp at which each class may be chosen, with receipts just below and at the gate.
fn earn(seed: u64, dir: &Path) -> (Option<Session>, Option<Session>, serde_json::Value) {
    let mut s = Session::new(seed);
    s.build_town("house").expect("manual free opening house");
    let mut checks = vec![];
    for n in 1..=30 {
        let actions = camp(&mut s, false);
        if tree::auto_send(&s.active.lineage) {
            break;
        }
        send(&mut s);
        let report = s.run_offline_mode(1, false, false);
        checks.push(serde_json::json!({"phase":"manual","send":n,"actions":actions,"runs":report.runs,"best":s.active.lineage.best_depth}));
    }
    let (mut clown, mut engineer) = (None, None);
    for n in 0..=60u32 {
        let l = &s.active.lineage;
        let receipt = serde_json::json!({"hours":n*8,"scout":tree::hired(l,"scout"),"completed":l.persistent.completed,"deepest":idlever_core::legacy::deepest(l),
            "clown":gate(&s,Class::Clown),"engineer":gate(&s,Class::Engineer)});
        checks.push(serde_json::json!({"phase":"gate","receipt":receipt}));
        if clown.is_none() && gate(&s, Class::Clown).is_none() && s.active.run.is_none() {
            std::fs::write(dir.join(format!("seed{seed}-clown-camp.json")), s.save()).unwrap();
            println!("{}", serde_json::json!({"seed":seed,"unlock":"clown","hours":n*8,"receipt":receipt}));
            clown = Some(s.clone());
        }
        if engineer.is_none() && gate(&s, Class::Engineer).is_none() && s.active.run.is_none() {
            std::fs::write(dir.join(format!("seed{seed}-engineer-camp.json")), s.save()).unwrap();
            println!("{}", serde_json::json!({"seed":seed,"unlock":"engineer","hours":n*8,"receipt":receipt}));
            engineer = Some(s.clone());
        }
        if engineer.is_some() || s.active.lineage.ended {
            break;
        }
        let actions = camp(&mut s, false);
        if !tree::auto_send(&s.active.lineage) {
            send(&mut s);
        }
        let report = s.run_offline_mode(28800, false, false);
        checks.push(serde_json::json!({"phase":"earning","hours":(n+1)*8,"actions":actions,"runs":report.runs,"deepest":report.deepest,"best":s.active.lineage.best_depth}));
    }
    (clown, engineer, serde_json::json!(checks))
}

/// One build from an identical eligible camp: choose the class (free), optionally learn one
/// path's nodes as they become legal, play `checkins` × 8 h with the same home protocol.
/// The skilled player's pen rows for the two tool classes (written at home, public `set_rules`).
fn skilled_rows(class: Class) -> Vec<Row> {
    let r = |conds: Vec<Cond>, v: Verb| Row::new(conds, v).from("player");
    match class {
        Class::Clown => vec![
            r(vec![Cond::n("adj>=", 1), Cond::n("hp<", 45)], Verb::new("curtain")),
            r(vec![Cond::n("adj>=", 2)], Verb::new("turnabout")),
            r(vec![Cond::n("adj>=", 1), Cond::n("foes>=", 2)], Verb::new("bell_lure")),
            r(vec![Cond::n("foes>=", 3)], Verb::new("grand_jape")),
            r(vec![Cond::n("adj>=", 1), Cond::n("foes>=", 2)], Verb::arg("false_bow", "nearest")),
        ],
        Class::Engineer => vec![
            r(vec![Cond::n("foes>=", 1)], Verb::new("deploy")),
            r(vec![Cond::n("foes>=", 2)], Verb::new("overdrive")),
        ],
        _ => vec![],
    }
}

/// A skilled check-in: the forecast's top package move when it clears PICKED's bar, then the
/// pen rows (kept at the pen's top) once the pen is open.
fn skilled_camp(s: &mut Session, class: Class, actions: &mut Vec<String>) {
    let g = &mut s.active;
    let stance = g.lineage.pkg.stance.clone();
    while idlever_core::packages::level_price(&g.lineage, &stance).is_some_and(|m| m <= g.lineage.marks) {
        if g.spend_level(&stance).is_err() {
            break;
        }
        actions.push(format!("level {stance}"));
    }
    let pick = |o: &idlever_core::packages::PkgOption| idlever_core::packages::score(o) + 0.2 * o.d_mean;
    let mut opts = g.package_options(32);
    opts.sort_by(|a, b| pick(b).total_cmp(&pick(a)));
    if let Some(top) = opts.iter().find(|o| o.action == "equip") {
        if pick(top) > 0.12 && idlever_core::packages::apply(&mut g.lineage, &top.id, &top.action, top.slot).is_ok() {
            actions.push(format!("{} {}", top.action, top.id));
        }
    }
    let rows = skilled_rows(class);
    if rows.is_empty() || !g.lineage.pkg.pen_open {
        return;
    }
    let mut set = g.lineage.rules().clone();
    if rows.iter().all(|r| set.rows.contains(r)) {
        return;
    }
    set.rows.retain(|r| !rows.contains(r));
    for (i, r) in rows.iter().enumerate() {
        set.rows.insert(i, r.clone());
    }
    match g.set_rules(set) {
        Ok(()) => actions.push("pen rows".into()),
        Err(e) => actions.push(format!("pen refused: {e}")),
    }
}

fn play(original: &Session, class: Class, path: &[&str], checkins: u32, dir: &Path, label: &str) -> serde_json::Value {
    let seed = original.active.lineage.seed;
    let mut s = original.clone();
    let gold0 = s.active.lineage.gold;
    s.set_class(class.name()).expect("legal free class choice at home");
    assert_eq!(s.active.lineage.gold, gold0, "class choice is free");
    // Start with the chosen class's own weapon, not an inherited Fighter sword.

    std::fs::write(dir.join(format!("seed{seed}-{label}-start.json")), s.save()).unwrap();
    let best0 = s.active.lineage.best_depth;
    let (mut runs, mut deaths, mut stalls) = (0u32, 0u32, 0u32);
    let mut first = std::collections::BTreeMap::new();
    let mut tools = idlever_core::tools::ToolStats::default();
    let mut rows = vec![];
    for n in 1..=checkins {
        let mut actions = camp(&mut s, false);
        if label.ends_with("-skilled") {
            skilled_camp(&mut s, class, &mut actions);
        }
        for id in path {
            let node = format!("{}_{id}", class.name());
            let owned = s.active.lineage.class_paths.get(class.name()).is_some_and(|p| p.contains(&node));
            if !owned && idlever_core::class_tree::learn(&mut s.active, &node).is_ok() {
                actions.push(format!("learn {node}"));
            }
        }
        let r = s.run_offline_mode(28800, false, false);
        runs += r.runs;
        deaths += r.deaths.iter().map(|d| d.n).sum::<u32>();
        stalls += r.stalled;
        if let Some(t) = &r.tools {
            tools.add(t);
        }
        for m in [13u32, 18, 23, 28] {
            if s.active.lineage.best_depth >= m {
                first.entry(m).or_insert(n * 8);
            }
        }
        let row = serde_json::json!({"hours":n*8,"runs":r.runs,"deaths":r.deaths.iter().map(|d| d.n).sum::<u32>(),"played_depth":r.deepest,"best":s.active.lineage.best_depth,"level":s.active.lineage.class_level(),"mask":idlever_core::class_tree::mask(&s.active.lineage),"actions":actions,"tools":r.tools});
        rows.push(row);
    }
    std::fs::write(dir.join(format!("seed{seed}-{label}-after.json")), s.save()).unwrap();
    let out = serde_json::json!({"seed":seed,"label":label,"class":class.name(),"path":path,"start_best":best0,"best":s.active.lineage.best_depth,"runs":runs,"deaths":deaths,"stalls":stalls,
        "first_hours":first,"level":s.active.lineage.class_level(),"tools":tools,"checks":rows});
    println!("{}", serde_json::json!({"seed":seed,"label":label,"best":s.active.lineage.best_depth,"runs":runs,"deaths":deaths,"first_hours":out["first_hours"],"level":out["level"],
        "lure_steps":tools.lure_steps,"counters":tools.counters,"counter_damage":tools.counter_damage,"pause_steps":tools.pause_steps,"curtains":tools.curtains,
        "deploys":tools.deploys,"shots":tools.shots,"shot_damage":tools.shot_damage,"tool_kills":tools.tool_kills,"sentry_ticks":tools.sentry_ticks,"idle_ticks":tools.idle_ticks,"destroyed":tools.destroyed,"relocates":tools.relocates}));
    out
}

fn main() {
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let args: Vec<_> = std::env::args().collect();
    let out = Path::new(args.get(1).expect("new output directory"));
    std::fs::create_dir(out).expect("new directory preserves previous evidence");
    let seeds: Vec<u64> = args.iter().position(|a| a == "--seeds").map_or(vec![1, 3, 5], |i| args[i + 1].split(',').map(|x| x.parse().unwrap()).collect());
    let checkins: u32 = args.iter().position(|a| a == "--checkins").map_or(9, |i| args[i + 1].parse().unwrap());
    let only: Option<String> = args.iter().position(|a| a == "--only").map(|i| args[i + 1].clone());
    let only = &only;
    let results: Vec<serde_json::Value> = std::thread::scope(|sc| {
        let hs: Vec<_> = seeds
            .iter()
            .map(|&seed| {
                sc.spawn(move || {
                    let (clown, engineer, earning) = earn(seed, out);
                    std::fs::write(out.join(format!("seed{seed}-earning.json")), serde_json::to_string_pretty(&earning).unwrap()).unwrap();
                    let mut res = vec![];
                    if let Some(c) = &clown {
                        for (label, class, path) in [
                            ("clown-fighter", Class::Fighter, &[][..]),
                            ("clown-rogue", Class::Rogue, &[][..]),
                            ("clown-base", Class::Clown, &[][..]),
                            ("clown-misdirector", Class::Clown, &["bellkeeper", "false_exit", "ringmaster"][..]),
                            ("clown-counterplayer", Class::Clown, &["turncoat", "cruel_joke", "last_laugh"][..]),
                            ("clown-rogue-skilled", Class::Rogue, &[][..]),
                            ("clown-skilled", Class::Clown, &["turncoat", "cruel_joke", "last_laugh", "bellkeeper", "false_exit", "ringmaster"][..]),
                        ] {
                            if class == Class::Rogue && !c.active.lineage.unlocks.contains("rogue") {
                                continue;
                            }
                            if only.as_ref().is_none_or(|o| o.split(',').any(|x| label.contains(x))) {
                                res.push(play(c, class, path, checkins, out, label));
                            }
                        }
                    }
                    if let Some(e) = &engineer {
                        for (label, class, path) in [
                            ("engineer-fighter", Class::Fighter, &[][..]),
                            ("engineer-base", Class::Engineer, &[][..]),
                            ("engineer-emplacement", Class::Engineer, &["watchmaker", "bastion", "artificer"][..]),
                            ("engineer-fieldwork", Class::Engineer, &["surveyor", "mobile_works", "relay"][..]),
                            ("engineer-fighter-skilled", Class::Fighter, &[][..]),
                            ("engineer-skilled", Class::Engineer, &["watchmaker", "bastion", "artificer", "surveyor", "mobile_works", "relay"][..]),
                        ] {
                            if only.as_ref().is_none_or(|o| o.split(',').any(|x| label.contains(x))) {
                                res.push(play(e, class, path, checkins, out, label));
                            }
                        }
                    }
                    res
                })
            })
            .collect();
        hs.into_iter().flat_map(|h| h.join().unwrap()).collect()
    });
    std::fs::write(out.join("results.json"), serde_json::to_string_pretty(&serde_json::json!({"diagnostic":true,"no_grants":true,"checkin_hours":8,"checkins":checkins,"results":results})).unwrap()).unwrap();
}
