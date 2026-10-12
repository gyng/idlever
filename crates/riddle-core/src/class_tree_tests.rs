use super::*;
use crate::{bloodlines::Session, wire::ClassProg};
fn qualified(class: Class) -> Game {
    let mut g = Game::new_resident(3);
    g.lineage.class = class;
    crate::legacy::ensure(&mut g.lineage);
    for c in Class::ALL {
        g.lineage.unlocks.insert(c.name().into());
        g.lineage.classes.insert(
            c.name().into(),
            ClassProg {
                level: 8,
                xp: 19,
                next: 0,
            },
        );
    }
    g.lineage.hero_legacy.last_mut().unwrap().best_depth = 18;
    crate::packages::recompile(&mut g.lineage);
    g
}
#[test]
fn thirty_nodes_have_real_preview_verbs_and_staged_gates() {
    let mut ids = std::collections::BTreeSet::new();
    for c in Class::ALL {
        let mut g = qualified(c);
        let defs = definitions(c);
        assert_eq!(defs.len(), 6);
        let roots = defs
            .iter()
            .filter(|n| n.parent.is_none())
            .collect::<Vec<_>>();
        assert_eq!(roots.len(), 2);
        for root in roots {
            let mut gates = defs
                .iter()
                .filter(|n| n.parent.as_ref() == Some(&root.id))
                .map(|n| (n.required_level, n.required_depth))
                .collect::<Vec<_>>();
            gates.sort();
            assert_eq!(gates, vec![(5, 13), (7, 18)]);
        }
        for node in &defs {
            assert!(ids.insert(node.id.clone()));
            assert!(!node.tactics.is_empty());
            assert!(node.tactics.len() <= 2);
            for row in &node.tactics {
                assert!(crate::hero::class_has_verb(
                    c,
                    node.required_level,
                    &row.verb.v
                ));
                assert!(row.is_pkg());
                assert_eq!(crate::packages::row_label(row), Some(node.name.clone()));
            }
            reset(&mut g).unwrap();
            if let Some(parent) = &node.parent {
                learn(&mut g, parent).unwrap();
            }
            learn(&mut g, &node.id).unwrap();
            let compiled = rows(&g.lineage);
            for row in &node.tactics {
                assert!(compiled.contains(row));
            }
            assert!(g
                .lineage
                .rules()
                .rows
                .iter()
                .any(|r| r.origin.as_deref() == Some(&format!("class:path:{}", node.id))));
        }
    }
    assert_eq!(ids.len(), 30);
}
fn refused(g: &mut Game, id: &str) {
    let before = g.save();
    assert!(learn(g, id).is_err());
    assert_eq!(g.save(), before);
}
#[test]
fn gates_budget_refusals_and_reset_are_exact_without_resource_loss() {
    let mut g = qualified(Class::Fighter);
    refused(&mut g, "bogus");
    refused(&mut g, "caster_guardian");
    refused(&mut g, "fighter_recovery");
    g.lineage.classes.get_mut("fighter").unwrap().level = 2;
    refused(&mut g, "fighter_warden");
    g.lineage.classes.get_mut("fighter").unwrap().level = 3;
    g.lineage.hero_legacy.last_mut().unwrap().best_depth = 7;
    refused(&mut g, "fighter_warden");
    g.lineage.hero_legacy.last_mut().unwrap().best_depth = 8;
    g.lineage.town.home = Some(false);
    refused(&mut g, "fighter_warden");
    let before = g.save();
    assert!(reset(&mut g).is_err());
    assert_eq!(g.save(), before);
    g.lineage.town.home = Some(true);
    learn(&mut g, "fighter_warden").unwrap();
    assert_eq!(
        (
            offers(&g.lineage, false).points,
            offers(&g.lineage, false).spent
        ),
        (0, 1)
    );
    refused(&mut g, "fighter_reaver");
    learn(&mut g, "fighter_warden").unwrap();
    g.lineage.classes.get_mut("fighter").unwrap().level = 4;
    refused(&mut g, "fighter_boss_guard");
    g.lineage.classes.get_mut("fighter").unwrap().level = 5;
    refused(&mut g, "fighter_boss_guard");
    g.lineage.hero_legacy.last_mut().unwrap().best_depth = 13;
    learn(&mut g, "fighter_boss_guard").unwrap();
    g.lineage.classes.get_mut("fighter").unwrap().level = 6;
    refused(&mut g, "fighter_recovery");
    g.lineage.classes.get_mut("fighter").unwrap().level = 7;
    refused(&mut g, "fighter_recovery");
    g.lineage.hero_legacy.last_mut().unwrap().best_depth = 18;
    learn(&mut g, "fighter_recovery").unwrap();
    let resources = (
        g.lineage.classes.clone(),
        g.lineage.gold,
        g.lineage.bloodline.clone(),
    );
    reset(&mut g).unwrap();
    assert_eq!(offers(&g.lineage, false).points, 5);
    assert_eq!(offers(&g.lineage, false).spent, 0);
    assert_eq!(
        (
            g.lineage.classes.clone(),
            g.lineage.gold,
            g.lineage.bloodline.clone()
        ),
        resources
    );
    learn(&mut g, "fighter_warden").unwrap();
    g.send();
    refused(&mut g, "fighter_recovery");
    let before = g.save();
    assert!(reset(&mut g).is_err());
    assert_eq!(g.save(), before);
    assert!(!g.lineage().class_tree.unwrap().reset_available);
    let before = g.save();
    assert!(g.set_class("caster").is_err());
    assert_eq!(g.save(), before);
}
#[test]
fn cumulative_branches_and_siblings_keep_parents_and_compile_in_stable_order() {
    let mut a = qualified(Class::Fighter);
    let mut b = a.clone();
    for id in [
        "fighter_warden",
        "fighter_recovery",
        "fighter_boss_guard",
        "fighter_reaver",
        "fighter_crowd_breaker",
        "fighter_boss_breaker",
    ] {
        learn(&mut a, id).unwrap();
    }
    for id in [
        "fighter_reaver",
        "fighter_boss_breaker",
        "fighter_crowd_breaker",
        "fighter_warden",
        "fighter_boss_guard",
        "fighter_recovery",
    ] {
        learn(&mut b, id).unwrap();
    }
    assert_eq!(a.lineage.class_paths["fighter"].len(), 6);
    assert_eq!(mask(&a.lineage), 63);
    assert_eq!(rows(&a.lineage), rows(&b.lineage));
    assert_eq!(a.lineage.rules(), b.lineage.rules());
    assert_eq!(a.save(), b.save());
    assert_eq!(offers(&a.lineage, false).points, 0);
    let rs = rows(&a.lineage);
    let first_parent = rs
        .iter()
        .position(|r| r.origin.as_deref() == Some("class:path:fighter_warden"))
        .unwrap();
    let last_child = rs
        .iter()
        .rposition(|r| r.origin.as_deref() == Some("class:path:fighter_boss_breaker"))
        .unwrap();
    assert!(last_child < first_parent);
    let resources = (
        a.lineage.classes.clone(),
        a.lineage.gold,
        a.lineage.bloodline.clone(),
    );
    a.set_class("caster").unwrap();
    learn(&mut a, "caster_guardian").unwrap();
    a.set_class("fighter").unwrap();
    assert_eq!(a.lineage.class_paths["fighter"].len(), 6);
    reset(&mut a).unwrap();
    assert!(!a.lineage.class_paths.contains_key("fighter"));
    assert!(a.lineage.class_paths["caster"].contains("caster_guardian"));
    assert_eq!(
        (
            a.lineage.classes.clone(),
            a.lineage.gold,
            a.lineage.bloodline.clone()
        ),
        resources
    );
}
#[test]
fn old_empty_saves_reset_round_trip_literal_rules_and_custom_absorb_stay_exact() {
    let mut g = qualified(Class::Fighter);
    let before = g.save();
    assert!(!before.contains("class_paths"));
    assert_eq!(Game::load(&before).unwrap().save(), before);
    learn(&mut g, "fighter_warden").unwrap();
    reset(&mut g).unwrap();
    assert_eq!(g.save(), before);
    g.lineage.pkg.literal = true;
    let rules = g.lineage.rules().clone();
    let key = crate::forecast::lineage_key(&g);
    learn(&mut g, "fighter_warden").unwrap();
    assert_eq!(g.lineage.rules(), &rules);
    assert_ne!(crate::forecast::lineage_key(&g), key);
    reset(&mut g).unwrap();
    g.lineage.pkg.literal = false;
    g.lineage.pkg.stance = crate::packages::CUSTOM.into();
    g.lineage.pkg.custom = vec![Row::new(vec![Cond::n("hp<", 20)], Verb::new("return"))];
    learn(&mut g, "fighter_warden").unwrap();
    let set = g.lineage.rules().clone();
    crate::packages::absorb(&mut g.lineage, &set, true);
    assert_eq!(g.lineage.pkg.custom.len(), 1);
    learn(&mut g, "fighter_reaver").unwrap();
    assert!(g
        .lineage
        .rules()
        .rows
        .iter()
        .any(|r| r.origin.as_deref() == Some("class:path:fighter_warden")));
    reset(&mut g).unwrap();
    assert_eq!(g.lineage.rules().rows, g.lineage.pkg.custom);
}
#[test]
fn bloodline_isolation_and_active_separate_rule_cache_keys_match() {
    let mut s = Session::new(3);
    s.active = qualified(Class::Fighter);
    s.active.lineage.gold_move(10000, "fixture");
    s.add_bloodline().unwrap();
    let others = serde_json::to_string(&s.others).unwrap();
    s.learn_class_skill("fighter_warden").unwrap();
    assert_eq!(serde_json::to_string(&s.others).unwrap(), others);
    s.select_bloodline(2).unwrap();
    assert!(s.active.lineage.class_paths.is_empty());
    s.select_bloodline(1).unwrap();
    assert!(s.active.lineage.class_paths["fighter"].contains("fighter_warden"));
    assert_eq!(Session::load(&s.save()).unwrap().save(), s.save());
    let mut g = qualified(Class::Fighter);
    let key = |g: &Game| {
        (
            crate::forecast::lineage_key(g),
            crate::forecast::rules_key(g.lineage.rules()),
        )
    };
    let before = key(&g);
    g.lineage.class_paths.insert(
        "caster".into(),
        ["caster_guardian".into()].into_iter().collect(),
    );
    assert_eq!(key(&g), before);
    learn(&mut g, "fighter_warden").unwrap();
    assert_ne!(key(&g), before);
    reset(&mut g).unwrap();
    assert_eq!(key(&g), before);
}
#[test]
fn cumulative_whole_sliced_and_reloaded_offline_match_for_all_classes() {
    for c in Class::ALL {
        let mut base = Session::new(3);
        base.active = qualified(c);
        for n in definitions(c).iter().filter(|n| n.parent.is_none()) {
            learn(&mut base.active, &n.id).unwrap();
        }
        for n in definitions(c).iter().filter(|n| n.parent.is_some()) {
            learn(&mut base.active, &n.id).unwrap();
        }
        crate::tree::grant(&mut base.active.lineage, &["porter", "scout"]);
        base.send();
        let mut whole = base.clone();
        let expected = whole.run_offline_mode(3600, false, true);
        let mut sliced = base;
        let mut left = 3600;
        let widths = [1, 719, 1280];
        let mut n = 0;
        let report = loop {
            let seconds = left.min(widths[n % 3]);
            let last = left == seconds;
            let report = sliced.run_offline_slice(seconds, last);
            if last {
                break report;
            }
            left -= seconds;
            n += 1;
            sliced = Session::load(&sliced.save()).unwrap();
        };
        assert_eq!(sliced.save(), whole.save(), "{c:?}");
        assert_eq!(report, expected, "{c:?}");
    }
}
#[test]
fn recovery_path_fires_existing_real_heal_once_and_named_row() {
    let mut g = qualified(Class::Fighter);
    learn(&mut g, "fighter_warden").unwrap();
    learn(&mut g, "fighter_recovery").unwrap();
    g.send();
    let r = g.run.as_mut().unwrap();
    r.hero.hp = 20;
    r.hero.max_hp = 40;
    r.hero.max_hp_base = 40;
    r.hero.inv.clear();
    r.hero.energy = 100;
    r.monsters.clear();
    let p = r
        .hero
        .pos
        .neighbours8()
        .into_iter()
        .find(|p| r.floor.map.passable(*p))
        .unwrap();
    let mut m = crate::monster::Monster::spawn(900, "goblin", p, 1);
    m.hp = 100;
    m.max_hp = 100;
    m.awake = true;
    r.monsters.push(m);
    r.floor.map.update_vision(r.hero.pos, 8);
    let result = g.step(1);
    assert!(
        result
            .events
            .iter()
            .any(|e| matches!(e,crate::wire::Ev::Rule{verb,..} if verb.v=="second_wind")),
        "{:?}",
        result.events
    );
    assert!(g.run.as_ref().unwrap().hero.second_wind_used);
    assert!(g.run.as_ref().unwrap().hero.hp > 20);
    let (r, mut cx) = g.ctx();
    let view = crate::turn::view(r);
    assert!(!crate::ai::try_verb(
        r,
        &mut cx,
        &Verb::new("second_wind"),
        &view
    ));
}
#[test]
fn every_authored_node_makes_bounded_real_progress_on_three_fixture_seeds() {
    for c in Class::ALL {
        for node in definitions(c) {
            for seed in [3, 19, 137] {
                let mut g = qualified(c);
                g.lineage.seed = seed;
                g.sim = true;
                if let Some(parent) = &node.parent {
                    learn(&mut g, parent).unwrap();
                }
                learn(&mut g, &node.id).unwrap();
                g.send();
                // Authored-policy diagnostic only: no earned/balance credit.
                let result = g.step(10000);
                let attacks = result
                    .events
                    .iter()
                    .filter(|e| matches!(e, crate::wire::Ev::Attack { .. }))
                    .count();
                let fires=result.events.iter().filter(|e|matches!(e,crate::wire::Ev::Rule{row,..} if g.lineage.rules().rows.get(*row as usize).is_some_and(|r|r.origin.as_deref()==Some(&format!("class:path:{}",node.id))))).count();
                println!(
                    "{} seed{}: depth{} attacks{} path_fires{} ended{}",
                    node.id, seed, result.snapshot.depth, attacks, fires, result.run_over
                );
                assert!(
                    result.run_over || (attacks > 0 && result.snapshot.depth > 1),
                    "bounded progress {} seed{seed}: {:?}",
                    node.id,
                    result.snapshot
                );
            }
        }
    }
}
#[test]
fn representative_leaf_verbs_act_for_every_class_on_real_controlled_targets() {
    for (class, root, leaf, verb) in [
        (
            Class::Fighter,
            "fighter_warden",
            "fighter_recovery",
            "second_wind",
        ),
        (Class::Rogue, "rogue_stalker", "rogue_ambusher", "ambush"),
        (Class::Ranger, "ranger_hunter", "ranger_boss_hunter", "mark"),
        (Class::Caster, "caster_channeler", "caster_storm", "nova"),
        (
            Class::Gunner,
            "gunner_marksman",
            "gunner_boss_marksman",
            "aimed_shot",
        ),
    ] {
        let mut g = qualified(class);
        learn(&mut g, root).unwrap();
        learn(&mut g, leaf).unwrap();
        g.send();
        g.sim = true;
        let chosen = rows(&g.lineage)
            .into_iter()
            .find(|r| r.verb.v == verb)
            .unwrap();
        let r = g.run.as_mut().unwrap();
        r.hero.hp = 20;
        r.hero.max_hp = 40;
        r.hero.max_hp_base = 40;
        r.hero.vanish_t = 30;
        r.monsters.clear();
        r.hero.inv.clear();
        let positions = r
            .hero
            .pos
            .neighbours8()
            .into_iter()
            .filter(|p| r.floor.map.passable(*p))
            .take(2)
            .collect::<Vec<_>>();
        assert_eq!(positions.len(), 2);
        for (i, p) in positions.into_iter().enumerate() {
            let mut m = crate::monster::Monster::spawn(900 + i as u32, "goblin_warlord", p, 8);
            m.hp = 100;
            m.max_hp = 100;
            m.awake = true;
            r.monsters.push(m);
        }
        r.floor.map.update_vision(r.hero.pos, 8);
        g.events.clear();
        let (r, mut cx) = g.ctx();
        let view = crate::turn::view(r);
        assert!(
            crate::ai::try_verb(r, &mut cx, &chosen.verb, &view),
            "actual {class:?}/{verb}"
        );
        let r = g.run.as_ref().unwrap();
        match class {
            Class::Fighter => assert!(r.hero.second_wind_used && r.hero.hp == 35),
            Class::Rogue => assert!(r.monsters.iter().any(|m| m.hp < 100) && r.hero.vanish_t == 0),
            Class::Ranger => assert!(r.monsters.iter().any(|m| m.marked > 0)),
            Class::Caster => assert!(r.hero.nova_cd > 0 && r.monsters.iter().any(|m| m.hp < 100)),
            Class::Gunner => assert!(r.gun_skills.as_ref().is_some_and(|s| s.aim.is_some())),
        }
    }
}

#[test]
fn learned_ability_mask_snapshots_and_reloads_without_reading_later_camp_memory() {
    let mut g = qualified(Class::Fighter);
    learn(&mut g, "fighter_warden").unwrap();
    learn(&mut g, "fighter_recovery").unwrap();
    assert_eq!(mask(&g.lineage), 3);
    g.send();
    assert_eq!(g.run.as_ref().unwrap().hero.class_skills, 3);
    let saved = g.save();
    let loaded = Game::load(&saved).unwrap();
    assert_eq!(loaded.save(), saved);
    assert_eq!(loaded.run.as_ref().unwrap().hero.class_skills, 3);
    g.lineage.class_paths.clear();
    assert_eq!(mask(&g.lineage), 0);
    assert_eq!(g.run.as_ref().unwrap().hero.class_skills, 3);
    let mut bad = qualified(Class::Fighter);
    bad.lineage.class_paths.insert(
        "fighter".into(),
        ["fighter_recovery".into(), "bogus".into()]
            .into_iter()
            .collect(),
    );
    assert_eq!(mask(&bad.lineage), 0);
    bad.lineage
        .class_paths
        .get_mut("fighter")
        .unwrap()
        .insert("fighter_warden".into());
    bad.lineage.classes.get_mut("fighter").unwrap().level = 2;
    assert_eq!(mask(&bad.lineage), 0);
}
