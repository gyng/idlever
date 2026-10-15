//! Cut238 diagnostic only: strict IDLE actions on the continuously advancing Session clock.
//! Not canonical dayplayer/check-in acceptance; no policy/default/gameplay changes or grants.
use idlever_core::{bloodlines::Session, legacy, persistent, tree};
use serde_json::{json, Value};
use std::{fs, path::Path, time::Instant};

const WINDOW_S: u64 = 48 * 3600;
const QUANTUM_MS: u64 = 1000;

fn points(s: &Session) -> u32 {
    legacy::current(&s.lineage).map_or(0, |l| l.points)
}
fn stamp(s: &Session) -> Value {
    json!({"clock_s":s.lineage.clock_s,"total_ticks":s.lineage.total_turns,
        "selected":s.selected,"resident_count":s.others.len()+1,"name":persistent::name(&s.lineage),
        "bloodline_id":s.lineage.bloodline_id,"seed":s.lineage.seed,"gold":s.lineage.gold,
        "bank":s.lineage.town.bank,"chest":s.lineage.tree.chest,"best":s.lineage.best_depth,
        "legacy":s.lineage.bloodline,"recovery_ticks":persistent::remaining(&s.lineage),
        "live":s.run.as_ref().map(|r|json!({"id":r.id,"turn":r.turn,"depth":r.depth,"max_depth":r.max_depth})),
        "scout":tree::hired(&s.lineage,"scout"),"orders":s.lineage.orders})
}
fn save(s: &Session, dir: &Path, name: &str) -> String {
    let name = format!("{name}.game.json");
    fs::write(dir.join(&name), s.save()).expect("checkpoint save");
    name
}
fn checkpoint(s: &Session, dir: &Path, name: &str, detail: Value) -> Value {
    json!({"save":save(s,dir,name),"observed":stamp(s),"detail":detail})
}
fn guard(s: &Session, identity: &(u64, u32, String)) {
    assert_eq!(s.selected, 1);
    assert!(s.others.is_empty(), "no unearned second resident");
    assert_eq!(
        (
            s.lineage.seed,
            s.lineage.bloodline_id,
            persistent::name(&s.lineage)
        ),
        *identity
    );
    assert_eq!(
        s.lineage.orders.legacy, "off",
        "no continuing Legacy spending"
    );
    assert_eq!(s.lineage.orders.ranks, "off", "no incidental rank order");
}
fn departure(s: &Session, id: u32) -> Value {
    let cap = s
        .capsules
        .0
        .iter()
        .find(|c| c.id == id)
        .expect("real departure capsule retained");
    let at = cap.game.run.as_ref().expect("initial real run");
    assert_eq!(at.turn, 0, "departure stats must precede live combat");
    json!({"run_id":id,"observed_clock_s":s.lineage.clock_s,
        "observed_within_s":1,"started_total_tick":at.started_turn,"start":at.start,
        "name":at.hero_name,"max_hp":at.hero.max_hp,"base_atk":at.hero.base_atk,
        "str_bonus":at.hero.str_bonus,"legacy_armour":at.hero.legacy_armour,
        "legacy_effects":at.hero.legacy_effects,"class":at.hero.class.name(),
        "owned_at_send":cap.game.lineage.bloodline,
        "sent_snapshot":s.sent_state.as_ref().filter(|_|s.run.as_ref().is_some_and(|r|r.id==id)).map(|x|json!({"legacy":x.lineage.bloodline,"seed":x.lineage.seed,"bloodline_id":x.lineage.bloodline_id}))})
}
fn new_exits(s: &Session, last: u32) -> Vec<Value> {
    s.lineage
        .run_log
        .iter()
        .filter(|r| r.id > last)
        .map(|r| {
            let receipt = s.batch.exits.iter().find(|x| x.run_id == r.id);
            json!({"id":r.id,"clock_s":r.clock_s,"tier":r.tier,"depth":r.depth,
            "start":r.start,"turns":r.turns,"gold":r.gold,"secured":r.secured,
            "legacy_earned_receipt":receipt.map(|x|x.legacy_earned),"sampled":r.sampled})
        })
        .collect()
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 {
        return Err("legacy_first_rank NEW_OUTPUT_ROOT SEED".into());
    }
    let seed: u64 = args[2].parse()?;
    if !(1..=16).contains(&seed) {
        return Err("seed must be1–16".into());
    }
    idlever_core::balance::configure_from_env()?;
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let timer = Instant::now();
    let dir = Path::new(&args[1]).join(format!("seed-{seed}"));
    fs::create_dir_all(Path::new(&args[1]))?;
    fs::create_dir(&dir)?;
    let mut s = Session::new(seed);
    let identity = (
        s.lineage.seed,
        s.lineage.bloodline_id,
        persistent::name(&s.lineage),
    );
    let initial_gold = s.lineage.gold;
    s.build_town("house")?;
    assert_eq!(s.lineage.gold, initial_gold, "actual free opening house");
    let mut actions =
        vec![json!({"clock_s":s.lineage.clock_s,"action":"build house","gold":s.lineage.gold})];
    let initial = checkpoint(&s, &dir, "initial", json!({"free_house":true}));
    let mut first_death = None;
    let mut affordable = None;
    let mut fork = None;
    let mut first_home_eligible = None;
    let mut manual_sends = 0;
    let mut scout = None;
    let mut last_exit = 0;
    let mut exits = vec![];
    while s.lineage.clock_s <= WINDOW_S {
        guard(&s, &identity);
        if manual_sends < 2
            && !tree::hired(&s.lineage, "scout")
            && !persistent::away(&s.active)
            && persistent::remaining(&s.lineage) == 0
        {
            s.try_send()?;
            manual_sends += 1;
            actions.push(json!({"clock_s":s.lineage.clock_s,"action":"manual send","number":manual_sends,"run_id":s.run.as_ref().map(|r|r.id)}));
        }
        if !tree::hired(&s.lineage, "scout")
            && tree::lit(&s.lineage).is_some_and(|n| n.id == "scout")
            && s.lineage.gold >= tree::price(&s.lineage, tree::def("scout").unwrap())
        {
            let gold = s.lineage.gold;
            s.hire("scout")?;
            actions.push(json!({"clock_s":s.lineage.clock_s,"action":"hire earned Scout","gold_before":gold,"gold_after":s.lineage.gold}));
            scout = Some(stamp(&s));
        }
        if first_death.is_some()
            && points(&s) >= 15
            && !legacy::away(&s.active)
            && tree::hired(&s.lineage, "scout")
        {
            fork = Some(checkpoint(
                &s,
                &dir,
                "common-fork",
                json!({"manual_sends":manual_sends,"actual_home_purchase_opportunity":true,"scout_hired":true}),
            ));
            break;
        }
        if s.lineage.clock_s >= WINDOW_S {
            break;
        }
        // All future baseline progression is autonomous; no other choice/worker/build/order edits.
        s.advance(QUANTUM_MS);
        let newly = new_exits(&s, last_exit);
        if let Some(x) = newly.last() {
            last_exit = x["id"].as_u64().unwrap() as u32;
        }
        for x in &newly {
            if x["tier"] == "death" && first_death.is_none() {
                first_death = Some(checkpoint(
                    &s,
                    &dir,
                    "first-death",
                    json!({"actual_exit":x,"observation_lag_s_max":1}),
                ));
            }
        }
        exits.extend(newly);
        if first_death.is_some()
            && points(&s) >= 15
            && !legacy::away(&s.active)
            && first_home_eligible.is_none()
        {
            first_home_eligible = Some(checkpoint(
                &s,
                &dir,
                "first-home-eligible-after-death",
                json!({"scout_hired":tree::hired(&s.lineage,"scout"),"note":"Diagnostic fork waits for the identical Scout introduction in every arm"}),
            ));
        }
        if points(&s) >= 15 && affordable.is_none() {
            affordable = Some(checkpoint(
                &s,
                &dir,
                "first-affordable-15",
                json!({"away":legacy::away(&s.active),"observation_quantum_s":1}),
            ));
        }
    }
    assert!(manual_sends <= 2);
    let prefix_terminal = checkpoint(
        &s,
        &dir,
        "baseline-prefix-terminal",
        json!({"window_s":WINDOW_S}),
    );
    let mut arms = vec![];
    if fork.is_some() {
        let original = s.save();
        assert_eq!(
            Session::load(&original)?.save(),
            original,
            "current checkpoint reload exact"
        );
        let fork_s = s.lineage.clock_s;
        assert!(
            s.run.is_none(),
            "this public-clock protocol naturally forks between runs; never force home"
        );
        let initial_owned = s.lineage.bloodline.clone().unwrap();
        assert_eq!(initial_owned.spent, 0, "strict baseline never spent Legacy");
        assert!(initial_owned.upgrades.is_empty());
        for root in [None, Some("health"), Some("damage"), Some("armour")] {
            let label = root.unwrap_or("no-spend");
            let mut arm = s.clone();
            let before = stamp(&arm);
            let before_run = serde_json::to_value(&arm.run)?;
            let before_sent = serde_json::to_value(&arm.sent_state)?;
            let before_log = serde_json::to_value(&arm.lineage.run_log)?;
            let gold_terms = json!([
                arm.lineage.gold,
                arm.lineage.town.bank,
                arm.lineage.tree.chest,
                arm.lineage.gold_ledger,
                arm.lineage.gold_tally
            ]);
            let mut purchase = None;
            if let Some(id) = root {
                assert!(
                    !persistent::away(&arm.active),
                    "never force a live hero home"
                );
                let offer = legacy::offers(&arm.lineage, false)
                    .into_iter()
                    .find(|x| x.id == id)
                    .unwrap();
                assert_eq!(offer.price, 15, "independent current first-rank contract");
                assert_eq!(offer.rank, 0);
                arm.upgrade_hero(id)?;
                let owned = arm.lineage.bloodline.as_ref().unwrap();
                assert_eq!(owned.points, initial_owned.points - 15);
                assert_eq!(owned.spent, initial_owned.spent + 15);
                assert_eq!(owned.upgrades.get(id), Some(&1));
                assert_eq!(owned.upgrades.len(), 1);
                assert_eq!(
                    json!([
                        arm.lineage.gold,
                        arm.lineage.town.bank,
                        arm.lineage.tree.chest,
                        arm.lineage.gold_ledger,
                        arm.lineage.gold_tally
                    ]),
                    gold_terms,
                    "Legacy never touches shared Gold accounting"
                );
                assert_eq!(
                    serde_json::to_value(&arm.lineage.run_log)?,
                    before_log,
                    "historical runs immutable"
                );
                if arm.run.as_ref().is_none_or(|r| r.turn > 0) {
                    assert_eq!(serde_json::to_value(&arm.run)?, before_run);
                    assert_eq!(serde_json::to_value(&arm.sent_state)?, before_sent);
                }
                purchase = Some(checkpoint(
                    &arm,
                    &dir,
                    &format!("{label}-purchase"),
                    json!({"upgrade":id,"price":15,"before":before,"after":stamp(&arm),"shared_gold_unchanged":true,"historical_runs_unchanged":true}),
                ));
            }
            let expected_spent = initial_owned.spent + if root.is_some() { 15 } else { 0 };
            let mut first_departure = None;
            let mut endpoint = None;
            let mut arm_exits = vec![];
            let mut seen = last_exit;
            let mut hour_samples = vec![];
            while arm.lineage.clock_s < fork_s + WINDOW_S {
                let lower = arm.lineage.clock_s;
                let next_run_before = arm.lineage.next_run_id;
                arm.advance(QUANTUM_MS);
                if first_departure.is_none() && arm.lineage.next_run_id > next_run_before {
                    let stats = departure(&arm, next_run_before);
                    first_departure = Some(checkpoint(
                        &arm,
                        &dir,
                        &format!("{label}-first-departure"),
                        stats,
                    ));
                }
                if let Some(run) = arm.run.as_ref().filter(|r| r.turn > 0 && r.over.is_none()) {
                    if run.max_depth >= 13 {
                        endpoint = Some(checkpoint(
                            &arm,
                            &dir,
                            &format!("{label}-next-d13"),
                            json!({"run_id":run.id,"actual_run_max_depth":run.max_depth,"crossing_clock_s_bracket":[lower,arm.lineage.clock_s],"elapsed_from_fork_s_bracket":[lower-fork_s,arm.lineage.clock_s-fork_s]}),
                        ));
                    }
                }
                let newly = new_exits(&arm, seen);
                if let Some(x) = newly.last() {
                    seen = x["id"].as_u64().unwrap() as u32;
                }
                // A crossing and exit within one observation quantum remains genuine, not a historical best.
                for x in &newly {
                    if x["depth"].as_u64().unwrap() >= 13 && endpoint.is_none() {
                        assert!(
                            first_departure.is_some(),
                            "post-fork departure observed before endpoint"
                        );
                        endpoint = Some(checkpoint(
                            &arm,
                            &dir,
                            &format!("{label}-next-d13"),
                            json!({"run_id":x["id"],"exit":x,"crossing_clock_s_bracket":[lower,arm.lineage.clock_s],"elapsed_from_fork_s_bracket":[lower-fork_s,arm.lineage.clock_s-fork_s]}),
                        ));
                    }
                }
                arm_exits.extend(newly);
                if (arm.lineage.clock_s - fork_s).is_multiple_of(3600) {
                    guard(&arm, &identity);
                    hour_samples.push(stamp(&arm));
                    assert_eq!(
                        arm.lineage.bloodline.as_ref().unwrap().spent,
                        expected_spent,
                        "no later treatment-only spending"
                    );
                }
                if endpoint.is_some() {
                    break;
                }
            }
            guard(&arm, &identity);
            assert_eq!(
                arm.lineage.bloodline.as_ref().unwrap().spent,
                expected_spent
            );
            arms.push(json!({"arm":label,"purchase":purchase,"first_departure":first_departure,"endpoint":endpoint,
                "censored":endpoint.is_none(),"observation_window_s":WINDOW_S,"elapsed_s":arm.lineage.clock_s-fork_s,
                "final":checkpoint(&arm,&dir,&format!("{label}-final"),json!({"no_further_legacy_spends":true})),"exits":arm_exits,"hour_samples":hour_samples}));
            assert_eq!(s.save(), original, "diagnostic fork source stays unchanged");
            println!(
                "seed{seed} {label} observed{}s censored{}",
                arm.lineage.clock_s - fork_s,
                endpoint.is_none()
            );
        }
    }
    if !arms.is_empty() {
        let base = &arms[0]["first_departure"]["detail"];
        assert!(
            !base.is_null(),
            "a first real baseline departure is required"
        );
        for (arm, root) in arms.iter().skip(1).zip(["health", "damage", "armour"]) {
            let actual = &arm["first_departure"]["detail"];
            assert_eq!(
                actual["run_id"], base["run_id"],
                "same first future deterministic run seed"
            );
            assert_eq!(
                actual["owned_at_send"]["upgrades"][root], 1,
                "one paid rank actually sent"
            );
            for (field, delta) in [
                ("max_hp", if root == "health" { 3 } else { 0 }),
                ("str_bonus", if root == "damage" { 1 } else { 0 }),
                ("legacy_armour", if root == "armour" { 1 } else { 0 }),
            ] {
                assert_eq!(
                    actual[field].as_i64().unwrap(),
                    base[field].as_i64().unwrap() + delta,
                    "first actual sent effect {root}/{field}"
                );
            }
        }
    }
    let result = json!({"diagnostic_only":true,"seed":seed,"protocol":"strict IDLE choices; continuous public Session.advance1000ms; not canonical dayplayer/check-in/WATCH_X acceptance","acquisition_window_s":WINDOW_S,"post_fork_window_s":WINDOW_S,"observation_quantum_ms":QUANTUM_MS,"no_grants_or_direct_state_edits":true,"initial":initial,"actions":actions,"manual_sends":manual_sends,"scout":scout,"first_death":first_death,"first_affordable_15":affordable,"first_home_eligible_after_death":first_home_eligible,"first_eligible_post_intro_home_purchase":fork,"baseline_prefix_exits":exits,"baseline_prefix_terminal":prefix_terminal,"unreached_checkpoint":fork.is_none(),"arms":arms,"native_runtime_s":timer.elapsed().as_secs_f64()});
    fs::write(
        dir.join("results.json"),
        serde_json::to_vec_pretty(&result)?,
    )?;
    println!(
        "seed{seed} complete in{:.2}s",
        timer.elapsed().as_secs_f64()
    );
    Ok(())
}
