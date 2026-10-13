//! Explicit equipment projection fixtures; earned camp captures are separate evidence.
use crate::{forecast, item::Item, rng::splitmix, tree, Game};

fn item(id: u32, kind: &str, enchant: i32) -> Item {
    let mut i = Item::new(id, kind); i.enchant = enchant; i.known = true; i
}
fn fixture() -> Game {
    let mut g = Game::new(159); g.build_town("house").unwrap();
    g.lineage.gold_move(5000, "test income");
    g.lineage.unlocks.insert("vault2".into());
    g.lineage.vault = vec![item(100_001, "axe", 3), item(100_002, "leather", 2)];
    tree::grant(&mut g.lineage, &["armourer"]); // Explicit test grant only.
    g
}

#[test]
fn forecast_equipment_matches_real_existing_armourer_order() {
    for case in 0..12 {
        let mut g = fixture();
        match case {
            1 => assert!(g.set_worker("armourer", false).is_err()),
            2 => g.lineage.tree.hired.retain(|(id, _)| id != "armourer"),
            3 => g.lineage.pkg.literal = true,
            4 => g.lineage.variant = "bones_only".into(),
            5 => g.lineage.tree.sends = (8, 3),
            6 => { g.lineage.tree.sends = (8, 3); g.lineage.tree.ranks.insert("armourer".into(), 2); }
            7 => { g.lineage.kit.insert("weapon".into(), 8); g.lineage.kit.insert("armour".into(), 8); }
            8 => { g.lineage.vault.push(item(100_003, "sword", 1)); g.loadout.push(100_003); }
            9 => g.loadout.push(100_001),
            10 => { g.lineage.vault = vec![item(100_002, "mail", 2)]; }
            11 => { g.lineage.tree.ranks.insert("armourer".into(), 2); g.lineage.orders.insure = false; }
            _ => {}
        }
        let before = g.save(); let tag = 159;
        let seed = splitmix(g.lineage.seed ^ splitmix(tag ^ 0xA24B_AED4_963E_E407));
        let sim = forecast::sim_game(&g, g.lineage.rules(), tag, 0, None);
        let mut actual = g.clone(); actual.start_run(Some(seed));
        assert_eq!(sim.run.as_ref().unwrap().hero, actual.run.as_ref().unwrap().hero, "case{case}: full first hero");
        assert_eq!(sim.run.as_ref().unwrap().brought, actual.run.as_ref().unwrap().brought, "case{case}: pack ids");
        assert_eq!(sim.lineage.gold, actual.lineage.gold, "case{case}: premiums/restocking");
        assert_eq!(sim.lineage.insured, actual.lineage.insured);
        assert_eq!(g.save(), before, "real camp unchanged");
        assert_eq!(sim.lineage.tree.acts, g.lineage.tree.acts, "preview records no real act");
        // Direct historical simulation remains untouched; only fresh forecast projection packs.
        let mut raw = g.sim_clone(); let selected = raw.loadout.clone();
        raw.start_run(Some(seed));
        assert!(raw.run.as_ref().unwrap().brought.iter().all(|id| selected.contains(id)));
    }
}

#[test]
fn equipment_projection_invalidates_cache_and_preserves_ordered_panels() {
    let g = fixture(); let key = forecast::lineage_key(&g);
    let mut paused = g.clone(); assert!(paused.set_worker("armourer", false).is_err());
    assert_eq!(key, forecast::lineage_key(&paused));
    let mut ranked = g.clone(); ranked.lineage.tree.ranks.insert("armourer".into(), 2);
    assert_eq!(key, forecast::lineage_key(&ranked), "retired worker metadata changes no projected send");
    let mut wall = g.clone(); wall.lineage.tree.sends = (8, 3);
    assert_eq!(key, forecast::lineage_key(&wall));
    let before = g.save(); let rules = g.lineage.rules();
    let old = forecast::parallel_sims();
    forecast::set_parallel_sims(false);
    let prefix = forecast::simulate(&g, rules, 2, 159, 3);
    let all = forecast::simulate(&g, rules, 6, 159, 3);
    let resumed = forecast::simulate_budget_from(&g, rules, 6, 159, 3, u64::MAX, prefix);
    forecast::set_parallel_sims(true);
    let threaded = forecast::simulate(&g, rules, 6, 159, 3);
    forecast::set_parallel_sims(old);
    assert_eq!(all, resumed); assert_eq!(all, threaded);
    let cached = forecast::camp_panel(&g, rules, 6);
    assert_eq!(cached, forecast::camp_panel(&g, rules, 6));
    let fresh = g.clone(); fresh.panel_cache.borrow_mut().clear();
    assert_eq!(cached, forecast::camp_panel(&fresh, rules, 6));
    assert_eq!(g.save(), before);
}
