//! Current permanent preparation projection; controlled fixtures, not earned pacing.
//! Cut244 supersedes vault-instance/armourer cases; originals are archived.
use crate::{forecast, rng::splitmix, Game};

fn fixture() -> Game {
    let mut game = Game::new(159);
    game.build_town("house").unwrap();
    game.lineage.gold_move(5000, "test income");
    game
}

#[test]
fn forecast_equipment_matches_real_current_permanent_preparation() {
    for (weapon, armour) in [(0, 0), (1, 0), (4, 0), (0, 4), (4, 4), (8, 8)] {
        let mut game = fixture();
        game.lineage.kit.insert("weapon".into(), weapon);
        game.lineage.kit.insert("armour".into(), armour);
        let before = game.save();
        let tag = 159;
        let seed = splitmix(game.lineage.seed ^ splitmix(tag ^ 0xA24B_AED4_963E_E407));
        let sim = forecast::sim_game(&game, game.lineage.rules(), tag, 0, None);
        let mut actual = game.clone();
        actual.start_run(Some(seed));
        assert_eq!(sim.run.as_ref().unwrap().hero, actual.run.as_ref().unwrap().hero, "weapon{weapon}/armour{armour}: full first hero");
        assert!(sim.run.as_ref().unwrap().brought.is_empty());
        assert_eq!(sim.lineage.gold, actual.lineage.gold);
        assert_eq!(game.save(), before, "real camp unchanged");
        assert_eq!(sim.lineage.tree.acts, game.lineage.tree.acts, "preview records no real act");
    }
}

#[test]
fn equipment_projection_invalidates_cache_and_preserves_ordered_panels() {
    let game = fixture();
    let key = forecast::lineage_key(&game);
    let mut upgraded = game.clone();
    upgraded.lineage.kit.insert("armour".into(), 4);
    assert_ne!(key, forecast::lineage_key(&upgraded), "current permanent preparation changes the actual send");
    let before = game.save();
    let rules = game.lineage.rules();
    let old = forecast::parallel_sims();
    forecast::set_parallel_sims(false);
    let prefix = forecast::simulate(&game, rules, 2, 159, 3);
    let all = forecast::simulate(&game, rules, 6, 159, 3);
    let resumed = forecast::simulate_budget_from(&game, rules, 6, 159, 3, u64::MAX, prefix);
    forecast::set_parallel_sims(true);
    let threaded = forecast::simulate(&game, rules, 6, 159, 3);
    forecast::set_parallel_sims(old);
    assert_eq!(all, resumed);
    assert_eq!(all, threaded);
    let cached = forecast::camp_panel(&game, rules, 6);
    assert_eq!(cached, forecast::camp_panel(&game, rules, 6));
    let fresh = game.clone();
    fresh.panel_cache.borrow_mut().clear();
    assert_eq!(cached, forecast::camp_panel(&fresh, rules, 6));
    assert_eq!(game.save(), before);
}
