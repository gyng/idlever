//! Cut247: armour timers and heals are identical under the real quiet scheduler.
use crate::{bloodlines::Session, engine::{events_hash, ExitTier}, item::Item, wire::Ev, Game};

const EARNED: &str = include_str!("../../../docs/evidence/cut247/earned-fighter-sword.sent.session.json");
const THREE: &str = include_str!("../../../docs/evidence/cut247/earned-three.prepared.session.json");

fn span(batch: &mut Game, single: &mut Game, limit: u32, settled: &mut bool, skipped: &mut u32, all: &mut Vec<Ev>) {
    let mut used = 0;
    while used < limit && batch.run.as_ref().unwrap().over.is_none() {
        let n = batch.tick_batch(limit - used, settled);
        assert!(n > 0 && n <= limit - used);
        *skipped += n.saturating_sub(1);
        for _ in 0..n { single.tick(); }
        used += n;
        let b = batch.run.as_ref().unwrap();
        let s = single.run.as_ref().unwrap();
        assert_eq!(b.hero.hearth_regen, s.hero.hearth_regen, "regeneration at tick {}", b.turn);
        assert_eq!(b.hero.hearth_ward, s.hero.hearth_ward, "ward at tick {}", b.turn);
        assert_eq!(b.rng, s.rng, "RNG at tick {}", b.turn);
        assert!(b == s, "complete run differs at tick {} (HP {} vs {})", b.turn, b.hero.hp, s.hero.hp);
        let be = std::mem::take(&mut batch.events);
        let se = std::mem::take(&mut single.events);
        assert_eq!(be, se, "event sequence at tick {}", b.turn);
        all.extend(se);
    }
}

#[test]
fn actual_earned_send_matches_single_ticks_batches_and_held_replay() {
    let mut single = Game::load(EARNED).unwrap();
    let initial = single.run.as_ref().unwrap();
    assert_eq!((initial.id, initial.turn, initial.depth), (133, 0, 1));
    assert_eq!(initial.hero.weapon.as_ref().unwrap().kind, "sword");
    assert_eq!(crate::armour_sets::count(&initial.hero), 2);
    assert_eq!(initial.hero.pace, 0, "this earned failure isolates the armour timer");
    let pre = single.capsules.0.iter().find(|c| c.id == 133).unwrap().pre.clone();
    let mut all = pre;
    single.events.clear();
    let mut batch = single.clone();
    let mut skipped = 0;
    let mut settled = false;
    let widths = [1, 2, 9, 13, 23, 71, 1000];
    let mut i = 0;
    while batch.run.as_ref().unwrap().over.is_none() {
        span(&mut batch, &mut single, widths[i % widths.len()], &mut settled, &mut skipped, &mut all);
        assert_eq!(batch.save(), single.save(), "complete Game at boundary {i}");
        i += 1;
    }
    let run = single.run.as_ref().unwrap();
    assert_eq!((run.over, run.depth, run.turn), (Some(ExitTier::Bank), 22, 33345), "independent original single-tick e62c outcome");
    assert!(skipped > 0, "exercise actual quiet spans");
    let replay = single.replay(133).unwrap();
    assert_eq!(replay.ticks, run.turn);
    assert_eq!(replay.floors.last().unwrap().snapshot.depth, run.depth);
    assert_eq!(replay.hash, events_hash(&all));
    let replay_events: Vec<_> = replay.floors.into_iter().flat_map(|f| f.events).collect();
    assert_eq!(replay_events, all, "complete replay event sequence, including actual heals");
}

fn controlled(pieces: u32, turn: u32, regen: i32, ward: i32, injured: bool) -> Game {
    let mut g = crate::tests::arena();
    let r = g.run.as_mut().unwrap();
    r.monsters.clear();
    r.overlays.clear();
    r.turn = turn;
    r.floor_turn = turn;
    r.hero.energy = 0;
    r.hero.armour = (pieces >= 1).then(|| Item::new(2, "hearthglass")).into();
    r.hero.helm = (pieces >= 2).then(|| Item::new(3, "hearthglass_hood")).into();
    r.hero.boots = (pieces >= 3).then(|| Item::new(4, "hearthglass_boots")).into();
    r.hero.max_hp = 1000;
    r.hero.hp = if injured { 100 } else { 1000 };
    r.hero.hearth_regen = regen;
    r.hero.hearth_ward = ward;
    g.events.clear();
    g
}

#[test]
fn armour_timers_heals_and_piece_loss_match_at_quiet_boundaries() {
    let mut skipped = 0;
    for pieces in 0..=3 {
        for turn in [0, 1, 8, 9, 10, 11, 18, 19] {
            for regen in [0, 1, 2, 9, 10, 11, 29, 30, 31] {
                for ward in [0, 1, 4] {
                    for injured in [false, true] {
                        let mut batch = controlled(pieces, turn, regen, ward, injured);
                        let mut single = batch.clone();
                        let mut settled = false;
                        let mut events = Vec::new();
                        for width in [1, 2, 3, 7, 9, 13, 23] {
                            span(&mut batch, &mut single, width, &mut settled, &mut skipped, &mut events);
                            assert_eq!(batch.save(), single.save());
                        }
                        let elapsed = 58; // Independently sum the declared widths above.
                        let eligible = if pieces >= 2 && injured { regen.min(elapsed) as u32 } else { 0 };
                        let expected = (turn + 1..=turn + eligible).filter(|t| t.is_multiple_of(10)).count();
                        let heals = events.iter().filter(|e| matches!(e, Ev::Heal { src, .. } if src == "hearthglass_embers")).count();
                        assert_eq!(heals, expected, "pieces {pieces}, turn {turn}, regen {regen}, injured {injured}");
                        let r = batch.run.as_ref().unwrap();
                        assert_eq!(r.hero.hearth_regen, 0, "expiry and lost pieces clear regeneration");
                        assert_eq!(r.hero.hearth_ward, if pieces == 3 { ward } else { 0 });
                    }
                }
            }
        }
    }
    assert!(skipped > 0, "the boundary matrix must exercise quiet batching");
}

#[test]
fn earned_one_and_three_residents_match_whole_sliced_and_reloaded_absence() {
    for (text, residents) in [(EARNED, 1), (THREE, 3)] {
        let source = Session::load(text).unwrap();
        assert_eq!(source.others.len() + 1, residents);
        let frozen = source.save();
        let mut whole = source.clone();
        let expected = whole.run_offline_mode(8 * 3600, false, true);
        assert!(expected.runs > 0);
        if residents == 1 {
            let record = whole.lineage.run_log.iter().find(|r| r.id == 133).unwrap();
            assert_eq!((record.depth, record.turns, record.tier.as_str()), (22, 33345, "bank"));
            let replay = whole.replay(133).unwrap();
            assert_eq!(replay.ticks, record.turns);
            assert_eq!(replay.floors.last().unwrap().snapshot.depth, record.depth);
        }
        for reload in [false, true] {
            let mut sliced = source.clone();
            let mut remaining = 8 * 3600;
            let mut index = 0;
            let widths = [1, 719, 3600];
            let actual = loop {
                let seconds = remaining.min(widths[index % widths.len()]);
                let last = seconds == remaining;
                let report = sliced.run_offline_slice(seconds, last);
                if last { break report; }
                remaining -= seconds;
                index += 1;
                if reload { sliced = Session::load(&sliced.save()).unwrap(); }
            };
            assert_eq!(actual, expected, "{residents} residents, reload {reload}");
            assert_eq!(sliced.save(), whole.save(), "complete Session: {residents} residents, reload {reload}");
            assert_eq!(sliced.selected, source.selected);
        }
        assert_eq!(source.save(), frozen, "original prepared Session is immutable");
    }
}

#[test]
fn quiet_span_clears_bonuses_after_pieces_are_removed() {
    let mut batch = controlled(3, 1, 30, 4, true);
    let mut single = batch.clone();
    let mut settled = false;
    let mut skipped = 0;
    let mut events = Vec::new();
    span(&mut batch, &mut single, 1, &mut settled, &mut skipped, &mut events);
    for g in [&mut batch, &mut single] {
        let hero = &mut g.run.as_mut().unwrap().hero;
        hero.helm = None.into();
        hero.boots = None.into();
    }
    span(&mut batch, &mut single, 6, &mut settled, &mut skipped, &mut events);
    let hero = &batch.run.as_ref().unwrap().hero;
    assert_eq!((hero.hearth_regen, hero.hearth_ward), (0, 0));
    assert!(skipped > 0, "piece loss must be observed by an actual quiet span");
}
