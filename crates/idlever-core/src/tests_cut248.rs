//! Cut248: fractional pace preserves the single-tick action schedule.
use crate::{engine::{events_hash, ACT_ENERGY}, wire::Ev, Game, Row, RuleSet, Verb};
const EARNED: &str = include_str!("../../../docs/evidence/cut248/earned-paid-pace.sent.session.json");

#[test]
fn actual_paid_earned_pace_has_all_eight_bonuses_in_first_ten_ticks() {
    let mut single = Game::load(EARNED).unwrap();
    let mut batch = single.clone();
    assert_eq!(single.lineage.gold, 3021, "actual12021−9000Gold paid preparation");
    assert_eq!(single.run.as_ref().unwrap().hero.pace, 8);
    for _ in 0..10 { single.tick(); }
    let mut used = 0;
    let mut settled = false;
    let mut skipped = 0;
    while used < 10 {
        let n = batch.tick_batch(10 - used, &mut settled);
        assert!(n > 0);
        used += n;
        skipped += n.saturating_sub(1);
    }
    assert_eq!(single.run.as_ref().unwrap().hero.energy, 88, "8whole speed×10 +8fractional bonuses");
    assert_eq!(batch.run.as_ref().unwrap().hero.energy, 88);
    assert_eq!(batch.events, single.events);
    assert!(batch.run == single.run);
    assert!(skipped > 0);
}

fn controlled(template: &Game, pace: i32, phase: u32, speed: i32, energy: i32, speed_t: i32) -> Game {
    let mut g = template.clone();
    g.lineage.sets[0] = RuleSet { rows: vec![Row::new(vec![], Verb::new("hold"))], ..Default::default() };
    g.lineage.active_set = 0;
    let r = g.run.as_mut().unwrap();
    r.turn = phase;
    r.floor_turn = phase;
    r.hero.energy = energy;
    r.hero.pace = pace;
    r.hero.speed_t = 0;
    let current = r.hero.speed();
    if current < speed { r.hero.gift.quick += speed - current; }
    else { r.hero.gift.slow += current - speed; }
    assert_eq!(r.hero.speed(), speed);
    r.hero.speed_t = speed_t;
    g.events.clear();
    g
}

fn compare_span(batch: &mut Game, single: &mut Game, limit: u32, settled: &mut bool, skipped: &mut u32, all: &mut Vec<Ev>) {
    let mut used = 0;
    while used < limit && batch.run.as_ref().unwrap().over.is_none() {
        let n = batch.tick_batch(limit - used, settled);
        assert!(n > 0 && n <= limit - used);
        *skipped += n.saturating_sub(1);
        for _ in 0..n { single.tick(); }
        used += n;
        let b = batch.run.as_ref().unwrap();
        let s = single.run.as_ref().unwrap();
        assert_eq!(b.hero.energy, s.hero.energy, "pace{} tick{}", b.hero.pace, b.turn);
        assert_eq!(b.rng, s.rng);
        assert!(b == s, "complete run differs at tick{}", b.turn);
        let be = std::mem::take(&mut batch.events);
        let se = std::mem::take(&mut single.events);
        assert_eq!(be, se, "events at tick{}", b.turn);
        all.extend(se);
    }
}

fn model(pace: i32, phase: u32, speed: i32, mut energy: i32, speed_t: i32, ticks: u32) -> (i32, Vec<u32>) {
    let mut actions = Vec::new();
    for offset in 1..=ticks {
        let t = phase + offset;
        energy += speed + if offset <= speed_t.max(0) as u32 { 5 } else { 0 };
        if t % 10 < pace.rem_euclid(10) as u32 { energy += 1; }
        while energy >= ACT_ENERGY {
            energy -= ACT_ENERGY;
            actions.push(t);
        }
    }
    (energy, actions)
}

fn run_case(mut batch: Game, pace: i32, phase: u32, speed: i32, energy: i32, speed_t: i32, skipped: &mut u32) {
    let mut single = batch.clone();
    let mut settled = false;
    let mut all = Vec::new();
    for width in [1, 2, 3, 7, 9, 10] {
        compare_span(&mut batch, &mut single, width, &mut settled, skipped, &mut all);
    }
    let (expected_energy, expected_actions) = model(pace, phase, speed, energy, speed_t, 32);
    let actions: Vec<_> = all.iter().filter_map(|e| match e { Ev::Rule { t, verb, .. } if verb.v == "hold" => Some(*t), _ => None }).collect();
    assert_eq!(batch.run.as_ref().unwrap().hero.energy, expected_energy);
    assert_eq!(actions, expected_actions, "independent eligible ticks: pace{pace},phase{phase},speed{speed},energy{energy},speed_t{speed_t}");
    assert_eq!(batch.save(), single.save());
}

#[test]
fn every_signed_remainder_phase_and_near_action_threshold_has_exact_action_ticks() {
    let template = crate::tests::arena();
    let mut skipped = 0;
    for whole in [-10, 0, 10] {
        for remainder in 0..10 {
            let pace = whole + remainder;
            for phase in 0..10 {
                for speed in [-1, 0, 1, 8, 12] {
                    for energy in [0, 88, 89, 90, 91, 98, 99, 100, 101, 199, 200] {
                        let g = controlled(&template, pace, phase, speed, energy, 0);
                        run_case(g, pace, phase, speed, energy, 0, &mut skipped);
                    }
                }
            }
        }
    }
    assert!(skipped > 0, "fractional builds retain actual quiet batching");
}

#[test]
fn speed_expiry_and_monster_bounds_truncate_the_final_fractional_sum() {
    let mut template = crate::tests::arena();
    crate::tests::add_monster(&mut template, "goblin", 12, 9);
    let mut skipped = 0;
    for pace in 0..10 {
        for phase in 0..10 {
            for speed_t in [1, 2, 3, 8, 9, 10, 11] {
                for monster_energy in [0, 50, 98] {
                    let mut g = controlled(&template, pace, phase, 8, 0, speed_t);
                    g.run.as_mut().unwrap().monsters[0].energy = monster_energy;
                    run_case(g, pace, phase, 8, 0, speed_t, &mut skipped);
                }
            }
        }
    }
    assert!(skipped > 0);
}

#[test]
fn complete_paid_earned_pace_run_and_replay_match_single_ticks() {
    let mut single = Game::load(EARNED).unwrap();
    let mut all = single.capsules.0.iter().find(|c| c.id == 133).unwrap().pre.clone();
    single.events.clear();
    let mut batch = single.clone();
    let mut settled = false;
    let mut skipped = 0;
    while batch.run.as_ref().unwrap().over.is_none() {
        compare_span(&mut batch, &mut single, 997, &mut settled, &mut skipped, &mut all);
        assert_eq!(batch.save(), single.save());
    }
    let r = single.run.as_ref().unwrap();
    let replay = single.replay(133).unwrap();
    assert_eq!(replay.ticks, r.turn);
    assert_eq!(replay.floors.last().unwrap().snapshot.depth, r.depth);
    assert_eq!(replay.hash, events_hash(&all));
    assert_eq!(replay.floors.into_iter().flat_map(|f| f.events).collect::<Vec<_>>(), all);
    assert!(skipped > 0);
}

#[test]
fn periodic_prefix_matches_all_signed_phases_and_quiet_spans() {
    for pace in -31i32..=39 {
        for turn in (0..20).chain((u32::MAX - 9)..=u32::MAX) {
            for ticks in 0..10 {
                let expected = (1..=ticks).filter(|offset| (u64::from(turn) + u64::from(*offset)) % 10 < pace.rem_euclid(10) as u64).count() as i32;
                assert_eq!(crate::kit::quiet_pace_energy(pace, turn, ticks), expected, "pace{pace},turn{turn},ticks{ticks}");
            }
        }
    }
}
