//! Cut317: expeditions (docs/CUT317_EXPEDITIONS.md) under a test profile — shipping keeps them off.
use crate::{balance, bloodlines::Session, Game};

const GUNNER: &str = include_str!("../../../web/tests/fixtures/earned-gunner-home.json");

/// Shipping, flat: expeditions as `DEFAULT` ships them, without the stretch (these tests read depths as floors).
fn expedition() -> balance::Balance {
    let mut b = balance::DEFAULT;
    b.expedition.stretch = 1;
    b.expedition.laps = false;
    b
}

#[test]
fn shipping_has_expeditions_and_the_classic_suite_does_not() {
    let e = balance::DEFAULT.expedition;
    assert!(e.on && e.stretch == 3 && e.laps && e.run_cap_ticks == 864_000, "owner 2026-10-22: expeditions shipped");
    assert_eq!((balance::DEFAULT.rest.min_ticks, balance::DEFAULT.rest.cap_ticks), (1200, 3000));
    assert!(!balance::get().expedition.on, "the pre-Cut317 unit suite runs the classic dungeon");
    assert_eq!(crate::engine::run_cap(), crate::engine::MAX_TURNS_PER_RUN);
}

#[test]
fn the_shipping_stretch_reaches_d99_and_laps_on() {
    balance::with_test_profile(balance::DEFAULT, || {
        use crate::engine::{band_floor, boss_floor, content_of, lap_of, reach};
        assert_eq!((content_of(1), content_of(3), content_of(4), content_of(99)), (1, 1, 2, 33));
        assert!(band_floor(24) && !band_floor(23), "a band's boss stands on its last floor");
        assert_eq!((boss_floor(8), boss_floor(33)), (24, 99));
        assert_eq!((reach(23), reach(24), reach(99)), (7, 8, 33));
        assert_eq!((lap_of(99), lap_of(100), content_of(100)), (0, 1, 1), "past the bottom: the next tier from D1");
    });
}

#[test]
fn shipping_expeditions_dive_the_stretched_dungeon_from_a_save() {
    balance::with_test_profile(balance::DEFAULT, || {
        let mut g = Game::load(GUNNER).unwrap();
        let mut deepest = 0;
        for _ in 0..4 * 3600 {
            g.advance(1000);
            if let Some(r) = g.run.as_ref().filter(|r| r.expedition) {
                deepest = deepest.max(r.depth);
                assert_eq!(r.content_depth(), crate::engine::content_of(r.depth));
            }
        }
        assert!(deepest > 33, "an expedition dives past the old bottom's number: D{deepest}");
    });
}

#[test]
fn expeditions_start_at_d1_camp_safely_and_never_stall() {
    balance::with_test_profile(expedition(), || {
        let mut g = Game::load(GUNNER).unwrap();
        let (mut starts, mut camps, mut longest) = (Vec::new(), 0, 0u32);
        let mut cur = None;
        for _ in 0..8 * 3600 {
            g.advance(1000);
            let Some(r) = &g.run else { continue };
            if cur != Some(r.id) {
                cur = Some(r.id);
                starts.push(r.start);
            }
            longest = longest.max(r.turn);
            if r.in_camp {
                camps += 1;
                assert!(r.monsters.iter().all(|m| m.ally || m.hp <= 0), "a camp is a safe zone");
                assert!(r.porter, "the gunner's town has its porter");
                assert_eq!(r.loot, 0, "the porter took the carry up at the camp");
                assert_eq!(r.depth, r.max_depth, "a camp is no new depth");
            }
        }
        assert!(starts.len() >= 3, "several expeditions in 8 h: {starts:?}");
        assert!(starts.iter().all(|&d| d == 1), "every expedition starts fresh: {starts:?}");
        assert!(camps > 0, "camps were made");
        // the shipping cap (3 h 20 min) ended this fixture's stalemates empty-handed; the progress clock ends them
        assert!(longest < crate::engine::MAX_TURNS_PER_RUN, "no run near the cap: {longest} ticks");
    });
}

#[test]
fn whole_and_sliced_expedition_absences_agree() {
    balance::with_test_profile(expedition(), || {
        let s = Session::load(GUNNER).unwrap();
        let mut whole = Session::load(&s.save()).unwrap();
        let mut sliced = Session::load(&s.save()).unwrap();
        whole.run_offline_mode(4 * 3600, false, true);
        for i in 0..8 {
            sliced.run_offline_slice(1800, i == 7);
            if i < 7 {
                sliced = Session::load(&sliced.save()).unwrap();
            }
        }
        assert_eq!(whole.save(), sliced.save(), "whole and sliced absences agree");
    });
}

#[test]
fn an_edit_while_delving_reaches_him_at_the_next_porter_camp_and_replays() {
    balance::with_test_profile(expedition(), || {
        let mut g = Game::load(GUNNER).unwrap();
        g.tap = Some(std::collections::BTreeMap::new());
        while g.run.as_ref().is_none_or(|r| !r.expedition || r.in_camp || r.turn < 600) {
            g.advance(1000);
        }
        let id = g.run.as_ref().unwrap().id;
        let carried = |g: &Game| g.lineage.carried_sets.clone();
        let town = |g: &Game| Some((g.lineage.sets.clone(), g.lineage.active_set));
        assert_eq!(carried(&g), town(&g), "the expedition carries the town's sets from the send");
        let mut set = g.lineage.sets[g.lineage.active_set].clone();
        set.rows.pop();
        g.set_rules_raw(set).unwrap();
        assert_ne!(carried(&g), town(&g), "an edit in town waits for the porter");
        let camps = g.run.as_ref().unwrap().camps;
        while g.run.as_ref().is_some_and(|r| r.id == id && r.camps == camps) {
            g.advance(1000);
            if g.run.as_ref().is_some_and(|r| r.id == id && r.camps == camps) {
                assert_ne!(carried(&g), town(&g), "no camp yet: the hero plays the rows he left with");
            }
        }
        assert!(g.run.as_ref().is_some_and(|r| r.id == id), "the run reached a camp");
        g.advance(1000);
        assert_eq!(carried(&g), town(&g), "the porter brought the edit down at the camp");
        while g.run.as_ref().is_some_and(|r| r.id == id) {
            g.advance(1000);
        }
        let tapped = &g.tap.as_ref().unwrap()[&id];
        assert_eq!(g.replay(id).unwrap().hash, crate::engine::events_hash(tapped), "the run replays with its camp edit");
    });
}

#[test]
fn the_crier_hears_the_expedition_and_keeps_a_short_feed() {
    balance::with_test_profile(expedition(), || {
        let mut g = Game::load(GUNNER).unwrap();
        assert!(g.lineage.cries.is_empty(), "nothing cried before");
        for _ in 0..6 * 3600 {
            g.advance(1000);
        }
        let kinds: std::collections::BTreeSet<&str> = g.lineage.cries.iter().map(|c| c.k.as_str()).collect();
        assert!(kinds.contains("camp"), "the porter's camps are cried: {kinds:?}");
        assert!(kinds.contains("home") || kinds.contains("death"), "an expedition's end is cried: {kinds:?}");
        assert!(g.lineage.cries.len() <= crate::engine::CRIES_KEPT);
        assert!(g.lineage.cries.windows(2).all(|w| w[0].t <= w[1].t), "newest last");
        assert!(g.lineage.cries.iter().all(|c| crate::rules::word_count(&c.text) <= 3), "≤ 3 words a cry");
    });
}

#[test]
fn the_classic_dungeon_cries_nothing() {
    let mut g = Game::load(GUNNER).unwrap();
    for _ in 0..3600 {
        g.advance(1000);
    }
    assert!(g.lineage.cries.is_empty(), "the crier's feed is an expedition's");
}
