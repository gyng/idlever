//! Cut264 (docs/CUT264_CLONE_VAT.md): short early clones, the gold hurry, the vat's whole-recovery phase.
use crate::bloodlines::Session;
use crate::engine::{gold_term, ExitTier, Game};
use crate::persistent::{self, recovery_ticks, remaining, RECOVERY_TICKS};

/// A home hero with gold, dead on a run whose deepest floor was `depth`.
fn dead_at(depth: u32, gold: i32) -> Game {
    let mut g = Game::new_literal(264);
    g.lineage.gold = gold;
    g.start_run(None);
    let r = g.run.as_mut().unwrap();
    r.max_depth = depth;
    r.over = Some(ExitTier::Death);
    r.death_cause = Some("goblin".into());
    g.finish_run();
    g.lineage.best_depth = depth;
    g
}

#[test]
fn retained_curve_is_one_minute_shallow_and_twenty_minutes_deep() {
    assert_eq!(recovery_ticks(1), 600);
    assert_eq!(recovery_ticks(14), 600);
    assert_eq!(recovery_ticks(21), 600 + (RECOVERY_TICKS - 600) * 7 / 14);
    assert_eq!(recovery_ticks(28), RECOVERY_TICKS);
    assert_eq!(recovery_ticks(40), RECOVERY_TICKS);
    let g = dead_at(5, 0);
    assert_eq!(remaining(&g.lineage), 600);
    assert_eq!(persistent::life_state(&g.lineage, false), "reincarnating");
}

#[test]
fn the_hero_is_in_the_vat_for_the_whole_recovery() {
    let mut g = dead_at(28, 0);
    let w = persistent::wire(&g.lineage, false);
    assert_eq!((w.state.as_str(), w.recovery_s, w.recovery_total_s), ("reincarnating", 1200, 1200));
    g.rest_tick(11_990);
    assert_eq!(persistent::life_state(&g.lineage, false), "reincarnating", "the last second still clones");
    g.rest_tick(10);
    assert_eq!(persistent::life_state(&g.lineage, false), "ready");
    let w = persistent::wire(&g.lineage, false);
    assert_eq!((w.recovery_s, w.recovery_total_s, w.hurry_price), (0, 0, None));
}

#[test]
fn hurry_price_is_live_by_depth_and_falls_with_time() {
    // D21: 10 min left ≈ $1,560 (owner's example); D30, 20 min ≈ $4,250
    let mut g = dead_at(21, 0);
    let left_s = remaining(&g.lineage).div_ceil(10);
    assert_eq!(left_s, 630);
    g.rest_tick(300);
    assert_eq!(remaining(&g.lineage), 6000);
    assert_eq!(persistent::hurry_price(&g.lineage, false), Some(1565));
    let g = dead_at(30, 0);
    assert_eq!(persistent::hurry_price(&g.lineage, false), Some(4250));
    // falls as the clone grows; never offered under `hurry_min_s`, while away or once ready
    let mut g = dead_at(30, 0);
    let p0 = persistent::hurry_price(&g.lineage, false).unwrap();
    g.rest_tick(6000);
    let p1 = persistent::hurry_price(&g.lineage, false).unwrap();
    assert!(p1 < p0 && p1 % 5 == 0, "{p0} → {p1}");
    assert_eq!(persistent::hurry_price(&g.lineage, true), None);
    g.rest_tick((RECOVERY_TICKS - 6000 - 299) as u32);
    assert_eq!(remaining(&g.lineage), 299);
    assert!(persistent::hurry_price(&g.lineage, false).is_some(), "29.9 s left reads 30 s: still offered");
    g.rest_tick(10);
    assert_eq!(persistent::hurry_price(&g.lineage, false), None, "under 30 s: not offered");
    let mut g = dead_at(5, 0);
    assert_eq!(persistent::hurry_price(&g.lineage, false), Some(60), "the retained 60 s clone has a live offer");
    g.rest_tick(310);
    assert_eq!(persistent::hurry_price(&g.lineage, false), None, "a shallow clone below 30 s is not offered");
    // the floor: a tiny unit still costs `hurry_floor`
    let mut g = dead_at(28, 0);
    g.lineage.best_depth = 0;
    g.rest_tick((RECOVERY_TICKS - 300) as u32);
    assert_eq!(persistent::hurry_price(&g.lineage, false), Some(10.max((30u64 * 100 * 250).div_ceil(60_000).div_ceil(5) as i32 * 5)));
}

#[test]
fn hurry_skips_the_whole_recovery_and_is_a_sink() {
    let mut g = dead_at(28, 10_000);
    let (gold, net, day) = (g.lineage.gold, g.lineage.night_net, g.lineage.day_net);
    let p = persistent::hurry_price(&g.lineage, false).unwrap();
    assert_eq!(g.hurry_clone(p).unwrap(), p);
    assert_eq!(remaining(&g.lineage), 0);
    assert_eq!(g.lineage.rest_left, 0);
    assert_eq!(persistent::life_state(&g.lineage, false), "ready");
    assert_eq!(g.lineage.gold, gold - p);
    assert_eq!((g.lineage.night_net, g.lineage.day_net), (net, day), "a purchase is not the night's net");
    assert_eq!(gold_term("hurry clone"), "sinks");
    assert_eq!(g.lineage.gold_tally.get("sinks").copied(), Some(-i64::from(p)));
    assert!(g.lineage.gold_ledger.last().is_some_and(|l| l.why == "hurry clone" && l.delta == -p));
    assert!(g.try_send().is_ok(), "he goes at once");
    // nothing to hurry now
    assert!(g.hurry_clone(i32::MAX).is_err());
}

#[test]
fn hurry_refuses_a_changed_price_and_a_short_purse_untouched() {
    let mut g = dead_at(28, 10_000);
    let p = persistent::hurry_price(&g.lineage, false).unwrap();
    let before = g.save();
    assert_eq!(g.hurry_clone(p - 1).unwrap_err(), "price changed");
    assert_eq!(g.save(), before, "a refused hurry changes nothing");
    let mut poor = dead_at(28, 100);
    let before = poor.save();
    assert_eq!(poor.hurry_clone(i32::MAX).unwrap_err(), "not enough gold");
    assert_eq!(poor.save(), before);
    let mut chest = dead_at(28, 10_000);
    chest.lineage.tree.chest = 9_900;
    let before = chest.save();
    assert_eq!(chest.hurry_clone(i32::MAX).unwrap_err(), "not enough gold");
    assert_eq!(chest.save(), before, "uncollected haul cannot fund a manual hurry");
}

/// A save less the absence-count bookkeeping a slice adds (`reel_pairs`: one reel pair list per absence).
fn state(s: &Session) -> serde_json::Value {
    let mut v: serde_json::Value = serde_json::from_str(&s.save()).unwrap();
    v["lineage"].as_object_mut().unwrap().remove("reel_pairs");
    v
}

#[test]
fn hurry_whole_equals_sliced() {
    // the same absence whole or in slices, then the same hurry, lands on the same bytes
    let base = Session::load(&dead_at(30, 50_000).save()).unwrap();
    let mut whole = Session::load(&base.save()).unwrap();
    let mut sliced = Session::load(&base.save()).unwrap();
    whole.run_offline_mode(300, false, false);
    sliced.run_offline_mode(120, false, false);
    sliced = Session::load(&sliced.save()).unwrap();
    sliced.run_offline_mode(180, false, false);
    let pw = whole.lineage().hero_slots.iter().find_map(|h| h.hurry_price).unwrap();
    let ps = sliced.lineage().hero_slots.iter().find_map(|h| h.hurry_price).unwrap();
    assert_eq!(pw, ps);
    assert_eq!(state(&whole), state(&sliced));
    assert_eq!(whole.hurry_clone(pw).unwrap(), sliced.hurry_clone(ps).unwrap());
    assert_eq!(state(&whole), state(&sliced));
    // (a later absence's delves are not compared: slicing a delving absence already differs in its run log on main —
    // a pre-existing property of `run_offline_mode`, measured without any hurry)
    assert_eq!(remaining(&whole.active.lineage), 0);
}

#[test]
fn offline_never_hurries() {
    let mut s = Session::load(&dead_at(30, 50_000).save()).unwrap();
    let left = remaining(&s.active.lineage);
    s.run_offline_mode(600, false, false);
    assert!(!s.active.lineage.gold_ledger.iter().any(|l| l.why == "hurry clone"), "an absence never spends on a hurry");
    assert_eq!(remaining(&s.active.lineage), left - 6000, "the clone grows at the clock's pace");
    assert!(s.active.lineage.gold >= 50_000 - 1, "no gold left the purse for speed");
}

