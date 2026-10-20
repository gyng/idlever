
use idlever_core::{cut306_upgrades::*, Game};
fn fixture() -> Game {
    let mut g = Game::new(1);
    g.lineage.best_depth = 28;
    g.lineage.gold = 100_000;
    g.lineage.tree.chest = 0;
    g.lineage.tree.ledger = 100_000;
    g.lineage.town.home = Some(true);
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.tree.hired.push(("clerk".into(), 0));
    g.lineage.persistent.defeats = 1;
    Game::load(&g.save()).unwrap()
}
#[test]
fn cut306_paid_levels_preserve_ledger_and_old_save_shape() {
    let mut g = fixture();
    let original = g.save();
    assert!(!serde_json::to_value(&g.lineage.town)
        .unwrap()
        .as_object()
        .unwrap()
        .contains_key("levels"));
    let loaded = Game::load(&original).unwrap();
    assert_eq!(loaded.save(), original);
    g.lineage.last_night_net = 1000;
    let before = g.lineage.night_net;
    purchase(&mut g, "bank", 3400).unwrap();
    assert_eq!(g.lineage.gold, 96_600);
    assert_eq!(g.lineage.tree.ledger, 96_600);
    assert_eq!(g.lineage.night_net, before);
    assert_eq!(idlever_core::town::bank_cap(&g.lineage), 5000);
    g.bank_deposit(1000).unwrap();
    assert_eq!(idlever_core::town::night(&mut g.lineage), 40);
    assert_eq!(
        i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
        g.lineage.tree.ledger
    );
    g.bank_withdraw(500).unwrap();
    assert_eq!(
        i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
        g.lineage.tree.ledger
    );
    purchase(&mut g, "bank", 13500).unwrap();
    let saved = g.save();
    assert!(purchase(&mut g, "bank", i32::MAX).is_err());
    assert_eq!(saved, g.save());
}
#[test]
fn cut306_failed_purchases_do_not_mutate() {
    let mut g = fixture();
    for id in ["bad", "bank", "device"] {
        let saved = g.save();
        assert!(purchase(&mut g, id, 0).is_err());
        assert_eq!(g.save(), saved);
    }
    g.lineage.best_depth = 12;
    let saved = g.save();
    assert!(purchase(&mut g, "device", i32::MAX).is_err());
    assert_eq!(g.save(), saved);
    g.lineage.best_depth = 28;
    g.lineage.gold = 10;
    let saved = g.save();
    assert!(purchase(&mut g, "bank", i32::MAX).is_err());
    assert_eq!(g.save(), saved);
    g.lineage.gold = 100_000;
    g.start_run(None);
    g.tick();
    let saved = g.save();
    assert!(purchase(&mut g, "device", i32::MAX).is_err());
    assert_eq!(g.save(), saved);
}
#[test]
fn cut306_future_recovery_and_hurry_without_retroactive_skip() {
    let mut g = fixture();
    idlever_core::persistent::recover_at(&mut g.lineage, 28);
    let until = g.lineage.persistent.recovery_until_tick;
    let rest = g.lineage.rest_left;
    let price0 = idlever_core::persistent::hurry_price(&g.lineage, false).unwrap();
    purchase(&mut g, "device", 3400).unwrap();
    assert_eq!(g.lineage.persistent.recovery_until_tick, until);
    assert_eq!(g.lineage.rest_left, rest);
    assert!(idlever_core::persistent::hurry_price(&g.lineage, false).unwrap() < price0);
    for depth in 1..=40 {
        idlever_core::persistent::recover_at(&mut g.lineage, depth);
        assert_eq!(
            g.lineage.persistent.recovery_ticks,
            (idlever_core::persistent::recovery_ticks(depth) * 80).div_ceil(100)
        );
        assert_eq!(
            g.rest_after(100, idlever_core::engine::ExitTier::Death) as u64,
            recovery_ticks(&g.lineage, g.lineage.best_depth)
        );
    }
    purchase(&mut g, "device", 13500).unwrap();
    idlever_core::persistent::recover_at(&mut g.lineage, 28);
    assert_eq!(g.lineage.persistent.recovery_ticks, 7800);
    g.lineage.town.levels.insert("device".into(), u32::MAX);
    assert_eq!(recovery_ticks(&g.lineage, 28), 7800);
}

fn main() {}
