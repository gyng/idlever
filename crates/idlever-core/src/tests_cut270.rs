//! Cut 270 (docs/CUT270_LIVE_DECISIONS.md): live decisions opened between ticks of a watched run. Owner 2026-10-22: none
//! is asked any more (the cache, the boss and the hurt record are the hero's own); a watched run with them on is the run
//! with them off, byte for byte; the boss chest stays a side channel of the step.
use crate::engine::events_hash;
use crate::tree;
use crate::wire::{Ev, StepResult};
use crate::Game;

fn scouted(seed: u64) -> Game {
    let mut g = Game::new_resident(seed);
    tree::grant(&mut g.lineage, &["porter", "scout"]);
    g.lineage.next_run_id = 3;
    g
}

/// How a watched run answers each decision: `None` auto, `Some(i)` option i (clamped to the option count).
type Chooser<'a> = &'a mut dyn FnMut(&crate::decide::Decision) -> Option<u32>;

/// A watched run with live decisions `on`: (run id, its events, the decisions met).
fn watch(g: &mut Game, on: bool, choose: Chooser) -> (u32, Vec<Ev>, Vec<crate::decide::Decision>) {
    let id = g.send().run.id;
    g.set_live_decisions(on);
    let mut evs = Vec::new();
    let mut met = Vec::new();
    for _ in 0..20_000 {
        let r: StepResult = g.step(25);
        evs.extend(r.events);
        if let Some(d) = r.decision {
            assert!(!r.run_over);
            let c = choose(&d).map(|i| i.min(d.options.len() as u32 - 1));
            met.push(d);
            g.decide(c).expect("a decision is open");
            continue;
        }
        if r.run_over {
            break;
        }
    }
    g.set_live_decisions(false);
    (id, evs, met)
}

fn json(evs: &[Ev]) -> String {
    serde_json::to_string(evs).unwrap()
}

/// G2: live decisions on is the run with them off, byte for byte, and the lineage it leaves (none is asked).
#[test]
fn auto_decisions_are_the_run_with_decisions_off() {
    let met = crate::tests::par_seeds(1..=16u64, |seed| {
        let (mut off, mut on) = (scouted(seed), scouted(seed));
        let mut n = 0;
        for _ in 0..6 {
            let (_, a, _) = watch(&mut off, false, &mut |_| None);
            let (_, b, d) = watch(&mut on, true, &mut |_| None);
            assert_eq!(events_hash(&a), events_hash(&b), "seed {seed}: the same events");
            assert_eq!(json(&a), json(&b), "seed {seed}");
            n += d.len();
        }
        assert_eq!(off.lineage.to_wire(), on.lineage.to_wire(), "seed {seed}: the same lineage");
        assert_eq!(off.save(), on.save(), "seed {seed}: the same save");
        n
    });
    assert!(met.iter().all(|&n| n == 0), "none asked: {met:?}");
}

/// Owner 2026-10-22: a watched run never stops to ask — 16 seeds × 6 runs, none met.
#[test]
fn a_watched_run_never_asks() {
    for seed in 1..=16u64 {
        let mut g = scouted(seed);
        for _ in 0..6 {
            let (id, _, met) = watch(&mut g, true, &mut |_| Some(1));
            assert!(met.is_empty(), "seed {seed} run {id}: asked {:?}", met.iter().map(|d| &d.kind).collect::<Vec<_>>());
            assert!(g.live.pending.is_none());
        }
    }
}

/// The boss chest: a band boss's kill tick reports what it gave (the Warlord's pattern on a fresh lineage).
#[test]
fn a_boss_kill_reports_its_chest() {
    let mut g = crate::tests::arena();
    g.lineage.gold = 500;
    let id = crate::tests::add_monster(&mut g, "goblin_warlord", 5, 5);
    let before = crate::decide::chest_before(&g);
    {
        let (r, mut cx) = g.ctx();
        let i = r.monsters.iter().position(|m| m.id == id).unwrap();
        r.aimed = true;
        assert!(crate::turn::damage_monster(r, &mut cx, i, 10_000, &crate::turn::Src::Hero { ranged: false }));
    }
    let c = crate::decide::chest(&g, before).expect("a chest");
    assert_eq!(c.boss, "goblin_warlord");
    assert!(c.items.iter().any(|i| i.kind == "crownsplitter"), "{c:?}");
    assert_eq!(c.rarity, "legendary");
    // no boss down: no chest
    assert!(crate::decide::chest(&g, crate::decide::chest_before(&g)).is_none());
}
