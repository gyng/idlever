//! Cut249: previous visibility is saved provenance history, not disposable cache.
use crate::{bloodlines::Session, Game};

const PAID: &str = include_str!("../../../docs/evidence/cut248/earned-paid-pace.sent.session.json");

#[test]
fn actual_paid_checkpoint_keeps_next_tick_last_seen_provenance() {
    let mut live = Session::load(PAID).unwrap();
    live.run_offline_slice(720, false);
    assert_eq!(live.run.as_ref().unwrap().turn, 7200);
    let checkpoint = live.save();
    let mut loaded = Session::load(&checkpoint).unwrap();
    assert_eq!(loaded.save(), checkpoint);
    live.tick();
    loaded.tick();
    let p = live.prov.iter().find(|p| p.key == "seen:goblin_archer").unwrap();
    assert_eq!((p.t, p.depth, p.text.as_str()), (7201, 6, "goblin archer last seen D6"));
    assert_eq!(loaded.events, live.events);
    assert_eq!(serde_json::to_value(&loaded.run).unwrap(), serde_json::to_value(&live.run).unwrap());
    assert_eq!(loaded.prov, live.prov, "next-tick sight-loss history must survive loading");
    assert_eq!(loaded.save(), live.save());
}

#[test]
fn actual_paid_eight_hour_report_and_complete_save_survive_slice_reloads() {
    let source = Session::load(PAID).unwrap();
    let frozen = source.save();
    let mut whole = source.clone();
    let expected = whole.run_offline_mode(28800, false, true);
    let record = whole.lineage.run_log.iter().find(|r| r.id == 133).unwrap();
    assert_eq!((record.depth, record.turns, record.tier.as_str()), (28, 43450, "death"));
    assert_eq!(expected.runs, 1);
    for reload in [false, true] {
        let mut sliced = source.clone();
        let mut remaining = 28800;
        let mut i = 0;
        let actual = loop {
            let width = remaining.min([1, 719, 3600][i % 3]);
            i += 1;
            remaining -= width;
            let report = sliced.run_offline_slice(width, remaining == 0);
            if remaining == 0 { break report; }
            if reload { sliced = Session::load(&sliced.save()).unwrap(); }
        };
        assert_eq!(actual, expected, "full report, reload {reload}");
        assert_eq!(sliced.save(), whole.save(), "every saved field, reload {reload}");
    }
    assert_eq!(source.save(), frozen);
}

fn vision(g: &mut Game) {
    let (run, mut cx) = g.ctx();
    crate::facts::on_vision(run, &mut cx);
}

#[test]
fn ordered_ids_sentinel_capsule_history_and_floor_start_roundtrip_exactly() {
    let mut g = crate::tests::arena();
    let ids = vec![u32::MAX, 17, 3, 17];
    g.run.as_mut().unwrap().last_visible = ids.clone();
    let run = g.run.as_ref().unwrap().clone();
    g.history.push_back((run.clone(), g.lineage.facts.clone()));
    g.floor_start = Some((run.clone(), g.lineage.facts.clone()));
    // Literal arena runs do not create public replay capsules; this controlled
    // serialization fixture explicitly supplies one, without changing live gameplay.
    let capsule = crate::engine::Capsule { id: run.id, game: Box::new(g.clone()), pre: Vec::new(), inputs: Vec::new() };
    g.capsules.0.push_back(capsule);
    g.capsules.1 = true;
    let saved = g.save();
    let loaded = Game::load(&saved).unwrap();
    assert_eq!(loaded.run.as_ref().unwrap().last_visible, ids);
    assert_eq!(loaded.history.back().unwrap().0.last_visible, ids);
    assert_eq!(loaded.floor_start.as_ref().unwrap().0.last_visible, ids);
    assert_eq!(loaded.capsules.live().unwrap().game.run.as_ref().unwrap().last_visible, ids);
    assert_eq!(loaded.save(), saved, "full nested save, with no ID sorting/deduplication");
}

#[test]
fn legacy_empty_history_and_real_loss_keep_hostility_and_simulation_semantics() {
    let mut g = crate::tests::arena();
    let hostile = crate::tests::add_monster(&mut g, "jackal", 6, 5);
    let dead = crate::tests::add_monster(&mut g, "goblin", 6, 6);
    let neutral = crate::tests::add_monster(&mut g, "goblin_archer", 5, 6);
    let r = g.run.as_mut().unwrap();
    r.monsters.iter_mut().find(|m| m.id == dead).unwrap().hp = 0;
    r.monsters.iter_mut().find(|m| m.id == neutral).unwrap().neutral = true;
    r.last_visible = vec![u32::MAX, hostile, hostile, dead, neutral];
    g.prov.clear();
    let mut legacy = serde_json::to_value(&g).unwrap();
    legacy["run"].as_object_mut().unwrap().remove("last_visible");
    let mut old = Game::load(&legacy.to_string()).unwrap();
    assert!(old.run.as_ref().unwrap().last_visible.is_empty());
    assert!(serde_json::to_value(&old).unwrap()["run"].get("last_visible").is_none());
    vision(&mut old);
    assert_eq!(old.run.as_ref().unwrap().last_visible, vec![hostile, neutral]);
    assert!(old.prov.is_empty(), "missing old history must not invent a lost foe");

    g.run.as_mut().unwrap().floor.map.visible.fill(false);
    let saved = g.save();
    let mut loaded = Game::load(&saved).unwrap();
    let mut sim = loaded.clone();
    sim.sim = true;
    vision(&mut g);
    vision(&mut loaded);
    vision(&mut sim);
    assert_eq!(loaded.prov, g.prov);
    assert_eq!(g.prov.len(), 1, "duplicate hostile IDs replace, dead/neutral/MAX never log");
    assert_eq!(g.prov[0].key, "seen:jackal");
    assert_eq!(g.prov[0].text, "jackal last seen D1");
    assert!(sim.prov.is_empty());
    assert!(sim.run.as_ref().unwrap().last_visible.is_empty());
    vision(&mut loaded);
    assert_eq!(loaded.prov.len(), 1, "unchanged repeated pass must not duplicate the event");
}

#[test]
fn floor_transition_replaces_previous_floor_ids_after_roundtrip() {
    let mut live = crate::tests::arena();
    live.run.as_mut().unwrap().last_visible = vec![u32::MAX, u32::MAX - 1, u32::MAX - 1];
    let mut loaded = Game::load(&live.save()).unwrap();
    for g in [&mut live, &mut loaded] {
        let (r, mut cx) = g.ctx();
        crate::turn::descend(r, &mut cx);
        assert_eq!(r.depth, 2);
        let expected: Vec<u32> = r.monsters.iter().filter(|m| m.hp > 0 && r.floor.map.is_visible(m.pos)).map(|m| m.id).collect();
        assert_eq!(r.last_visible, expected);
        assert!(!r.last_visible.contains(&u32::MAX));
    }
    assert_eq!(live.prov, loaded.prov);
    assert_eq!(live.save(), loaded.save());
}
