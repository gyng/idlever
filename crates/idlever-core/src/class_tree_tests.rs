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
fn original_thirty_nodes_keep_real_preview_verbs_and_staged_gates() {
    let mut ids = std::collections::BTreeSet::new();
    for c in Class::ALL {
        let mut g = qualified(c);
        let defs = definitions(c).into_iter().take(6).collect::<Vec<_>>();
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
    g.step(1); // An actual moving run is away; a ready turn-zero preparation is editable.
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
fn original_six_whole_sliced_and_reloaded_offline_match_for_all_classes() {
    for c in Class::ALL {
        let mut base = Session::new(3);
        base.active = qualified(c);
        for n in definitions(c).iter().take(6).filter(|n| n.parent.is_none()) {
            learn(&mut base.active, &n.id).unwrap();
        }
        for n in definitions(c).iter().take(6).filter(|n| n.parent.is_some()) {
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
fn original_six_nodes_make_bounded_real_progress_on_three_fixture_seeds() {
    for c in Class::ALL {
        for node in definitions(c).into_iter().take(6) {
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
            Class::Clown | Class::Engineer => unreachable!("original classes only"),
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

/// Controlled threshold fixtures test rules; they are not earned-play evidence.
fn advanced_home(class:Class)->Game {
    let mut g=qualified(class);
    g.lineage.classes.get_mut(class.name()).unwrap().level=10;
    g.lineage.hero_legacy.last_mut().unwrap().best_depth=33;
    g.lineage.runs_banked=64;
    g.lineage.tree.hired.push(("scout".into(),0));
    g
}
#[test]
fn expanded_catalogue_has_seventy_two_stable_nodes_and_four_real_tiers() {
    let mut ids=std::collections::BTreeSet::new();
    for class in Class::EVERY {
        let defs=definitions(class);
        assert_eq!(defs.len(),if expanded(class){12}else{6});
        for node in &defs {
            assert!(ids.insert(node.id.clone()));
            for row in &node.tactics {
                assert!(row.verb.v=="attack"||crate::hero::class_has_verb(class,if class.earned(){crate::engine::MAX_LEVEL}else{node.required_level},&row.verb.v),"{} verb{}",node.id,row.verb.v);
                assert!(row.is_pkg());
                assert_eq!(crate::packages::row_label(row),Some(node.name.clone()));
            }
            let mut current=node;let mut depth=1;
            while let Some(parent)=&current.parent {current=defs.iter().find(|n|&n.id==parent).unwrap();depth+=1;assert!(depth<=4);}
        }
        if expanded(class) {
            for node in &defs[6..10] {assert_eq!((node.required_level,node.required_depth),(9,23));}
            for node in &defs[10..12] {assert_eq!((node.required_level,node.required_depth),(10,29));}
            assert!(defs[10..].iter().all(|n|n.parent.as_ref().is_some_and(|id|defs[6..10].iter().any(|p|&p.id==id))));
        }
    }
    assert_eq!(ids.len(),72);
}
#[test]
fn advanced_budget_thresholds_are_personal_cumulative_and_pause_independent() {
    for class in Class::ALL {
        for (stage,&(_,level,depth,runs)) in STAGES.iter().enumerate() {
            let mut g=advanced_home(class);
            g.lineage.classes.get_mut(class.name()).unwrap().level=level;
            g.lineage.hero_legacy.last_mut().unwrap().best_depth=depth;
            g.lineage.runs_banked=runs;g.lineage.runs_returned=0;g.lineage.runs_died=0;
            assert_eq!(offers(&g.lineage,false).budget,7+stage as u32);
            for dimension in 0..4 {
                let mut missing=g.clone();
                match dimension {
                    0=>missing.lineage.classes.get_mut(class.name()).unwrap().level=level-1,
                    1=>missing.lineage.hero_legacy.last_mut().unwrap().best_depth=depth-1,
                    2=>missing.lineage.runs_banked=runs-1,
                    _=>missing.lineage.tree.hired.clear(),
                }
                assert!(offers(&missing.lineage,false).budget<7+stage as u32,"{} stage{stage} dimension{dimension}",class.name());
            }
            g.lineage.tree.paused.insert("scout".into());
            assert_eq!(offers(&g.lineage,false).budget,7+stage as u32,"hired Scout qualifies even paused");
            let save=g.save();let _=offers(&g.lineage,false);assert_eq!(g.save(),save,"reads never award progress");
            assert_eq!(g.lineage.gold,qualified(class).lineage.gold,"no currency requirement or free award");
        }
        let mut g=advanced_home(class);let tree=offers(&g.lineage,false);
        assert_eq!(tree.budget,10);assert!(tree.next_pick.is_none());
        g.lineage.runs_banked=0;g.lineage.runs_returned=64;
        assert_eq!(offers(&g.lineage,false).budget,10,"nonfatal delves qualify every stage");
        g.lineage.runs_returned=0;g.lineage.runs_died=64;
        assert_eq!(offers(&g.lineage,false).budget,10,"death is an alternative, never required");
    }
}
#[test]
fn advanced_children_require_all_ancestors_and_compile_descendants_before_parents() {
    for class in Class::ALL {
        let mut g=advanced_home(class);let defs=definitions(class);
        let leaf=&defs[10];let parent=defs.iter().find(|n|Some(&n.id)==leaf.parent.as_ref()).unwrap();
        g.lineage.class_paths.entry(class.name().into()).or_default().insert(parent.id.clone());
        assert_eq!(mask(&g.lineage),0,"stored invalid parent cannot enable its child");
        refused(&mut g,&leaf.id);
        g.lineage.class_paths.clear();
        let mut chain=Vec::new();let mut n=leaf;
        loop {chain.push(n.id.clone());let Some(id)=&n.parent else{break;};n=defs.iter().find(|n|&n.id==id).unwrap();}
        for id in chain.iter().rev() {learn(&mut g,id).unwrap();}
        let ordered=rows(&g.lineage).iter().filter_map(|r|r.origin.clone()).collect::<Vec<_>>();
        assert_eq!(ordered.first(),Some(&format!("class:path:{}",leaf.id)));
        assert_ne!(mask(&g.lineage)&(1<<10),0);
        let save=g.save();let restored=Game::load(&save).unwrap();assert_eq!(restored.save(),save);
        let history=(g.lineage.runs_banked,g.lineage.runs_returned,g.lineage.runs_died,g.lineage.classes.clone(),g.lineage.gold);
        reset(&mut g).unwrap();
        assert_eq!(history,(g.lineage.runs_banked,g.lineage.runs_returned,g.lineage.runs_died,g.lineage.classes.clone(),g.lineage.gold));
        assert_eq!(offers(&g.lineage,false).budget,10);
    }
}

#[test]
fn actual_scout_hire_announces_one_recorded_current_class_stage_and_reads_never_replay_it() {
    let mut g=advanced_home(Class::Fighter);g.lineage.tree.hired.retain(|(id,_)|id!="scout");
    crate::tree::grant(&mut g.lineage,&["quartermaster","porter"]);
    g.lineage.tree.done.insert("scout".into(),2);g.lineage.tree.shown.insert("scout".into());
    assert_eq!(earned_stage(&g.lineage),0);
    assert!(offers(&g.lineage,false).earned_stage.is_none());
    let price=crate::tree::price(&g.lineage,crate::tree::def("scout").unwrap());
    g.lineage.gold=price; // Exactly funded controlled purchase fixture, not earned Gold.
    g.hire("scout").unwrap();assert_eq!(g.lineage.gold,0,"actual existing Scout price is paid");
    let notices=g.events.iter().filter_map(|e|match e {crate::wire::Ev::ClassStage {class,stage,picks,..}=>Some((class.as_str(),stage.as_str(),*picks)),_=>None}).collect::<Vec<_>>();
    assert_eq!(notices,vec![("fighter","mastery",10)],"one highest transition, not four/five-class flood");
    let notice=offers(&g.lineage,false).earned_stage.unwrap();assert_eq!((notice.stage.as_str(),notice.picks),("mastery",10));
    let saved=g.save();let events=g.events.clone();
    for _ in 0..3 {let _=g.lineage();let _=crate::journal::wire(&g.lineage,false);}
    assert_eq!(g.save(),saved);assert_eq!(g.events,events);
    assert!(g.hire("scout").is_err());assert_eq!(g.save(),saved);
    let mut restored=Game::load(&saved).unwrap();assert_eq!(restored.save(),saved);
    let notices_before_switch=restored.events.iter().filter(|e|matches!(e,crate::wire::Ev::ClassStage {..})).count();
    restored.set_class("caster").unwrap();assert!(offers(&restored.lineage,false).earned_stage.is_none());
    restored.set_class("fighter").unwrap();assert!(offers(&restored.lineage,false).earned_stage.is_some());
    assert_eq!(restored.events.iter().filter(|e|matches!(e,crate::wire::Ev::ClassStage {..})).count(),notices_before_switch,"switches never invent earned transitions; existing delivered events remain saved");
    let other=advanced_home(Class::Fighter);assert!(offers(&other.lineage,false).earned_stage.is_none(),"another resident's eligible records cannot inherit an announcement");
}
#[test]
fn migrated_eligible_records_do_not_announce_on_reads_and_journal_has_reachable_maximum() {
    let mut g=advanced_home(Class::Fighter);let save=g.save();
    assert!(offers(&g.lineage,false).earned_stage.is_none());
    let journal=crate::journal::wire(&g.lineage,false);let entry=journal.chapters.iter().flat_map(|c|&c.entries).find(|e|e.id=="class_tree").unwrap();
    assert_eq!(entry.progress.as_ref().unwrap().required,10);assert_eq!(entry.action.as_ref().unwrap().target,"class");
    assert_eq!(g.save(),save);assert!(g.events.is_empty());
    // Learn ten actual public tree policies through legal ancestors; twelve
    // alternatives exist, but the canonical eventual allocation remains ten.
    for index in [0,1,2,3,4,5,6,7,8,10] {let id=definitions(Class::Fighter)[index].id.clone();learn(&mut g,&id).unwrap();}
    assert_eq!(offers(&g.lineage,false).points,0);
    let journal=crate::journal::wire(&g.lineage,false);let entry=journal.chapters.iter().flat_map(|c|&c.entries).find(|e|e.id=="class_tree").unwrap();
    assert_eq!(entry.state,"complete");assert_eq!(entry.progress.as_ref().unwrap().current,10);
}
#[test]
fn actual_nonfatal_settlement_crosses_one_stage_once_and_saved_notice_is_personal() {
    let mut g=advanced_home(Class::Fighter);
    g.lineage.classes.get_mut("fighter").unwrap().level=9;
    g.lineage.hero_legacy.last_mut().unwrap().best_depth=23;
    g.lineage.runs_banked=23;g.lineage.runs_returned=0;g.lineage.runs_died=0;
    crate::tree::set_worker(&mut g.lineage,"scout",false).unwrap();
    assert_eq!(earned_stage(&g.lineage),0);
    g.try_send().unwrap();g.bail();let result=g.step(100);
    assert!(result.run_over);
    assert_eq!(g.lineage.runs_died,0,"no defeat requirement");
    assert_eq!(completed(&g.lineage),24);
    assert_eq!(earned_stage(&g.lineage),1);
    let notices=result.events.iter().filter_map(|e|match e {crate::wire::Ev::ClassStage {class,stage,picks,..}=>Some((class.as_str(),stage.as_str(),*picks)),_=>None}).collect::<Vec<_>>();
    assert_eq!(notices,vec![("fighter","advanced",7)]);
    let saved=g.save();let restored=Game::load(&saved).unwrap();assert_eq!(restored.save(),saved);
    assert_eq!(offers(&restored.lineage,false).earned_stage.unwrap().picks,7);
    assert!(!restored.lineage.class_stages_announced.contains_key("caster"));
}

/// Cut257: Rogue `ghostwalk` armed (293/583/652 in the preserved earned runs) but its pick owned no
/// `backstab` row, so its authored "+2 on the next backstab" could never be consumed. Its own row
/// must survive `packages::compile`'s duplicate drop — the parent `veiled_route` already holds its
/// byte-identical `smoke`/`shadowstep` patterns, so only a row the parent does not hold can carry the
/// payoff into the compiled set.
#[test]
fn ghostwalk_pick_compiles_a_backstab_row() {
    let mut g = advanced_home(Class::Rogue);
    for id in ["rogue_shade", "rogue_escape_artist", "rogue_veiled_route"] {
        learn(&mut g, id).unwrap();
    }
    assert_eq!(offers(&g.lineage, false).budget, 10);
    let before = crate::packages::compile(&g.lineage).rows;
    assert!(
        !before.iter().any(|r| r.verb.v == "backstab"),
        "the parent branch authors no backstab row"
    );
    learn(&mut g, "rogue_ghostwalk").unwrap();
    let after = crate::packages::compile(&g.lineage).rows;
    assert_eq!(
        (
            offers(&g.lineage, false).spent,
            offers(&g.lineage, false).points
        ),
        (4, 6),
        "four real picks out of the ten an eligible rogue holds"
    );
    assert_ne!(before, after, "the pick must change the compiled policy");
    let own = after
        .iter()
        .find(|r| r.origin.as_deref() == Some("class:path:rogue_ghostwalk") && r.verb.v == "backstab")
        .expect("the pick's own backstab row compiled in, not dropped as a duplicate");
    assert_eq!(own.conds, vec![Cond::n("adj>=", 1)]);
    assert_eq!(own.verb, Verb::new("backstab"));
    assert_eq!(own.verb.a, None);
    // The authored enablers stay in the set; the parent owns the surviving copies.
    assert!(after
        .iter()
        .any(|r| r.verb.v == "smoke" && r.conds == vec![Cond::n("adj>=", 1)]));
    assert!(after
        .iter()
        .any(|r| r.verb.v == "shadowstep" && r.conds == vec![Cond::n("foes>=", 1)]));
}

/// Cut257: `conduct`'s patterns were byte-identical to `chilling_charge`'s and `Row::eq` ignores
/// origin, so `packages::compile` dropped them and the fourth pick bought no policy change at all
/// (identical `row_fired` vectors in the preserved evidence). The pick must now add its own row:
/// the qualifying bolt at the slowed boss, with the visible neighbour it copies onto.
#[test]
fn conduct_pick_is_not_a_duplicate_of_its_parent() {
    let mut g = advanced_home(Class::Caster);
    for id in ["caster_channeler", "caster_boss_channel", "caster_chilling_charge"] {
        learn(&mut g, id).unwrap();
    }
    let parent = crate::packages::compile(&g.lineage).rows;
    learn(&mut g, "caster_conduct").unwrap();
    let picked = crate::packages::compile(&g.lineage).rows;
    assert_eq!(
        (
            offers(&g.lineage, false).spent,
            offers(&g.lineage, false).points
        ),
        (4, 6),
        "four real picks out of the ten an eligible caster holds"
    );
    assert_ne!(
        parent, picked,
        "the pick must change the compiled policy, not only the row label"
    );
    for row in &parent {
        assert!(picked.contains(row), "the pick keeps every parent row");
    }
    let own = picked
        .iter()
        .find(|r| r.origin.as_deref() == Some("class:path:caster_conduct"))
        .expect("the pick's own row compiled in");
    assert_eq!(own.conds, vec![Cond::t("foe_tag", "boss"), Cond::n("foes>=", 2)]);
    assert_eq!(own.verb, Verb::arg("bolt", "tag:boss"));
    assert!(
        !parent.iter().any(|r| r.conds == own.conds && r.verb == own.verb),
        "not byte-identical to any row the parent already holds"
    );
}

/// Cut257: `chilling_charge`'s authored reward lowers `ward_cd`, which only the `ward` verb writes,
/// and no row its chain owned ever ran `ward`, so the amount was always 0 (0 receipts in all nine
/// caster branches). Its own `ward` row must compile in, and stay distinct from the sibling
/// `guardian`/`frost_guard`/`ice_lock` rows it can legally be picked beside.
#[test]
fn chilling_charge_pick_compiles_its_own_ward_row() {
    let mut g = advanced_home(Class::Caster);
    for id in ["caster_channeler", "caster_boss_channel"] {
        learn(&mut g, id).unwrap();
    }
    assert!(
        !crate::packages::compile(&g.lineage).rows.iter().any(|r| r.verb.v == "ward"),
        "the ancestor chain authors no ward row"
    );
    learn(&mut g, "caster_chilling_charge").unwrap();
    assert_eq!(
        (
            offers(&g.lineage, false).spent,
            offers(&g.lineage, false).points
        ),
        (3, 7),
        "three real picks out of the ten an eligible caster holds"
    );
    let rows = crate::packages::compile(&g.lineage).rows;
    let own = rows
        .iter()
        .find(|r| r.origin.as_deref() == Some("class:path:caster_chilling_charge") && r.verb.v == "ward")
        .expect("the pick's own ward row compiled in");
    assert_eq!(own.conds, vec![Cond::n("hp<", 70), Cond::n("foes>=", 1)]);
    assert_eq!(own.verb, Verb::new("ward"));
    let mut both = advanced_home(Class::Caster);
    for id in [
        "caster_channeler",
        "caster_boss_channel",
        "caster_chilling_charge",
        "caster_guardian",
        "caster_frost_guard",
        "caster_ice_lock",
    ] {
        learn(&mut both, id).unwrap();
    }
    let rows = crate::packages::compile(&both.lineage).rows;
    for id in ["caster_chilling_charge", "caster_ice_lock"] {
        assert!(
            rows.iter().any(|r| r.origin.as_deref() == Some(format!("class:path:{id}").as_str())),
            "{id}'s authored ward row survives beside the other branch's"
        );
    }
}
