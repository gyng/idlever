//! Cut 270 (docs/CUT270_LIVE_DECISIONS.md): live decisions open between ticks of a watched run and apply through an
//! existing order (the cache's pick, a bail); the auto-pick sends nothing, so it is today's run; nothing but the watch's
//! step ever waits on one; the boss chest is a side channel of the step.
use crate::engine::{events_hash, Input};
use crate::tree;
use crate::wire::{Ev, StepResult};
use crate::Game;
use std::collections::BTreeMap;

fn scouted(seed: u64) -> Game {
    let mut g = Game::new_resident(seed);
    tree::grant(&mut g.lineage, &["porter", "scout"]);
    g.lineage.next_run_id = crate::decide::MIN_SENDS + 1;
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

/// G2: the auto-pick is today's run — every decision auto-resolved gives the events of the run with decisions off,
/// byte for byte, and the lineage it leaves.
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
    let total: usize = met.iter().sum();
    eprintln!("cut270 auto met {met:?}");
    assert!(total >= 8, "decisions met across 16 seeds × 6 runs: {met:?}");
}

/// G3: a recorded choice replays to the live run's events; G6: the caps.
#[test]
fn chosen_decisions_replay_and_respect_the_caps() {
    let mut kinds = BTreeMap::new();
    let mut back = 0;
    for seed in 1..=8u64 {
        let mut g = scouted(seed);
        g.tap = Some(BTreeMap::new());
        for _ in 0..5 {
            let (id, evs, met) = watch(&mut g, true, &mut |_| Some(1));
            assert!(met.len() as u32 <= crate::decide::PER_RUN, "seed {seed}: ≤ 3 a run");
            let mut floors: Vec<u32> = met.iter().map(|d| d.depth).collect();
            floors.dedup();
            assert_eq!(floors.len(), met.len(), "seed {seed}: one a floor");
            for d in &met {
                assert!(d.t >= crate::decide::MIN_TICK, "seed {seed}: never in the first ticks");
                assert!(d.options.len() >= 2 && d.options.iter().all(|o| o.label.split_whitespace().count() <= 3));
                assert!(d.title.split_whitespace().filter(|w| w.chars().any(char::is_alphabetic)).count() <= 3);
                *kinds.entry(d.kind.clone()).or_insert(0) += 1;
            }
            let cap = g.capsules.0.iter().find(|c| c.id == id).unwrap();
            for d in &met {
                let o = &d.options[1];
                let recorded = cap.inputs.iter().any(|(t, i)| *t == d.t && (matches!(i, Input::Pick(x) if x.to_string() == o.id) || (o.id == "back" && *i == Input::Bail)));
                assert!(recorded || d.default == 1, "seed {seed}: the choice is on the capsule at its tick");
            }
            if met.iter().any(|d| d.kind != "cache") {
                back += 1;
                let exit = evs.iter().find_map(|e| if let Ev::Exit { tier, .. } = e { Some(tier.clone()) } else { None });
                assert_eq!(exit.as_deref(), Some("return"), "seed {seed}: turning back is a return");
            }
            let tapped = &g.tap.as_ref().unwrap()[&id];
            assert_eq!(g.replay(id).unwrap().hash, events_hash(tapped), "seed {seed} run {id}: the choices replay");
        }
    }
    assert!(kinds.values().sum::<usize>() > 0, "some decisions were met: {kinds:?}");
    eprintln!("cut270 kinds {kinds:?} turned-back runs {back}");
}

/// A choice changes only what it should: the run is today's up to the decision; the cache's pick is the item found.
#[test]
fn a_choice_changes_only_its_own_branch() {
    let mut cached = 0;
    let mut turned = 0;
    for seed in 1..=16u64 {
        let mut g = scouted(seed);
        for _ in 0..6 {
            let (mut a, mut b) = (g.clone(), g.clone());
            let (_, ea, da) = watch(&mut a, true, &mut |_| None);
            let mut first: Option<crate::decide::Decision> = None;
            let (_, eb, _) = watch(&mut b, true, &mut |d| {
                if first.is_none() {
                    first = Some(d.clone());
                    Some(if d.default == 0 { 1 } else { 0 })
                } else {
                    None
                }
            });
            g = a;
            let Some(d) = first else { continue };
            assert_eq!(da.first().map(|x| &x.id), Some(&d.id), "seed {seed}: the same first decision");
            let upto = |e: &[Ev]| e.iter().take_while(|x| x.t() <= d.t).cloned().collect::<Vec<_>>();
            assert_eq!(json(&upto(&ea)), json(&upto(&eb)), "seed {seed}: identical up to the decision");
            if d.kind == "cache" {
                let picked = &d.options[if d.default == 0 { 1 } else { 0 }];
                let label = picked.item.as_ref().unwrap().label.clone();
                if eb.iter().any(|e| matches!(e, Ev::Note { text, .. } if text.contains(" in the cache"))) {
                    assert!(eb.iter().any(|e| matches!(e, Ev::Note { text, .. } if text.starts_with(&format!("Found the {label}")))), "seed {seed}: the picked {label}");
                    cached += 1;
                }
            } else {
                let exit = eb.iter().find_map(|e| if let Ev::Exit { tier, t, .. } = e { Some((tier.clone(), *t)) } else { None }).unwrap();
                assert_eq!(exit.0, "return", "seed {seed}: turned back");
                turned += 1;
            }
            break;
        }
    }
    eprintln!("cut270 cached {cached} turned {turned}");
    assert!(cached + turned > 0, "some choice was exercised");
}

/// G5: nothing but the watch's step waits — `advance`, an absence, a send, a bail and take-over all take the default.
#[test]
fn offline_never_waits_on_a_decision() {
    let mut opened = 0;
    for seed in 1..=16u64 {
        let mut g = scouted(seed);
        let mut pending: Option<Game> = None;
        'runs: for _ in 0..6 {
            g.send();
            g.set_live_decisions(true);
            for _ in 0..20_000 {
                let r = g.step(25);
                if r.decision.is_some() {
                    pending = Some(g.clone());
                    break 'runs;
                }
                if r.run_over {
                    break;
                }
            }
        }
        let Some(open) = pending else { continue };
        opened += 1;
        // the step holds: no tick passes while it is open
        let mut held = open.clone();
        let t0 = held.run.as_ref().unwrap().turn;
        let r = held.step(50);
        assert_eq!(r.snapshot.turn, t0, "seed {seed}: the world waits");
        assert!(r.decision.is_some() && r.events.is_empty());
        let mut auto = open.clone();
        auto.decide(None).unwrap();
        // an hour of the open app's clock, an absence, a send: each as if the default had been taken
        for f in [
            &(|g: &mut Game| {
                g.advance(3_600_000);
            }) as &dyn Fn(&mut Game),
            &|g: &mut Game| {
                g.run_offline(3600);
            },
            &|g: &mut Game| {
                g.bail();
            },
        ] {
            let (mut a, mut b) = (open.clone(), auto.clone());
            a.set_live_decisions(false);
            b.set_live_decisions(false);
            f(&mut a);
            f(&mut b);
            assert!(a.live.pending.is_none(), "seed {seed}: no decision waits");
            assert_eq!(a.save(), b.save(), "seed {seed}: the default, at once");
        }
        // live decisions off resolves it too
        let mut off = open.clone();
        off.set_live_decisions(false);
        assert!(off.live.pending.is_none());
    }
    assert!(opened >= 4, "decisions opened on {opened} seeds");
}

/// G6: never on the lineage's first sends (run ids 1 and 2).
#[test]
fn never_on_the_first_sends() {
    for seed in 1..=8u64 {
        let mut g = Game::new_resident(seed);
        tree::grant(&mut g.lineage, &["porter", "scout"]);
        for _ in 0..crate::decide::MIN_SENDS {
            let (id, _, met) = watch(&mut g, true, &mut |_| None);
            assert!(id <= crate::decide::MIN_SENDS && met.is_empty(), "seed {seed}: none on send {id}");
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
