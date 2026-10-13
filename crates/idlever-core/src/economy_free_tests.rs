//! Cut 191: permanent eligibility, free preparation, and no removal-income loop.
use crate::{engine::Game, item::Item, wire::ForgeRow};

fn unlocked() -> Game {
    let mut g = Game::new_resident(191);
    g.clear_supplies();
    g.lineage.gold = 0;
    for kind in ["heal", "mapping", "sword"] {
        g.lineage.forge.insert(kind.into(), ForgeRow::at(5));
    }
    g
}

#[test]
fn eligible_potion_scroll_leash_and_weapon_prepare_at_zero_gold() {
    for kind in ["heal", "mapping", "leash", "sword"] {
        let mut g = unlocked();
        let ledger = g.lineage.gold_ledger.clone();
        assert_eq!(g.supply_catalogue().iter().find(|s| s.kind == kind).unwrap().price, 0);
        g.buy_supply(kind).unwrap();
        let prepared = g.lineage.supplies.last().unwrap();
        assert_eq!(prepared.kind, kind);
        assert!(prepared.known);
        assert_eq!(prepared.paid, 0);
        assert!(!prepared.free, "ordinary preparation is not a kennel grant");
        assert_eq!(g.lineage.gold, 0);
        assert_eq!(g.lineage.gold_ledger, ledger);
        assert!(g.batch.spent.is_empty());
    }
}

#[test]
fn identified_items_are_eligible_and_locked_items_do_not_become_free_grants() {
    let mut g = Game::new_resident(192);
    g.clear_supplies();
    g.lineage.gold = 0;
    let fact = crate::item::ident_fact(&g.lineage.flavours, "heal").unwrap();
    g.lineage.facts.insert(fact);
    assert!(!g.lineage.forge.contains_key("heal"));
    g.buy_supply("heal").unwrap();
    assert_eq!(g.lineage.gold, 0);
    let saved = g.save();
    assert_eq!(g.buy_supply("long_gun").unwrap_err(), "not unlocked");
    assert_eq!(g.save(), saved, "a locked item changes no state");
}

#[test]
fn historical_positive_and_negative_quotes_cannot_charge_or_mint_gold() {
    for quote in [-100, 26, 1_000_000] {
        let mut g = unlocked();
        let ledger = g.lineage.gold_ledger.clone();
        g.buy_supply_priced("heal", "repeat heal", Some(quote)).unwrap();
        assert_eq!(g.lineage.gold, 0);
        assert_eq!(g.lineage.supplies.last().unwrap().paid, 0);
        assert_eq!(g.lineage.gold_ledger, ledger);
    }
}

#[test]
fn removing_clearing_and_toggling_repeat_never_generate_gold() {
    let mut g = unlocked();
    let ledger = g.lineage.gold_ledger.clone();
    for _ in 0..10 {
        g.buy_supply("heal").unwrap();
        let id = g.lineage.supplies.last().unwrap().id;
        g.drop_supply(id).unwrap();
        g.buy_supply("mapping").unwrap();
        g.clear_supplies();
        g.buy_supply("sword").unwrap();
        g.set_restock(false);
        g.set_restock(true);
        g.clear_supplies();
    }
    // An obsolete paid/found shelf instance cannot mint refunds either.
    let mut obsolete = Item::new(100_999, "heal");
    obsolete.paid = 500;
    obsolete.found = true;
    g.lineage.supplies.push(obsolete);
    g.drop_supply(100_999).unwrap();
    assert_eq!(g.lineage.gold, 0);
    assert_eq!(g.lineage.gold_ledger, ledger);
    assert_eq!(g.batch.salvage_gold, 0);
    assert!(g.batch.spent.is_empty());
}

#[test]
fn automatic_and_authored_repeat_ignore_away_income_and_stale_quotes() {
    let mut g = unlocked();
    crate::tree::grant(&mut g.lineage, &crate::tree::LEGACY);
    g.lineage.last_supplies = vec!["heal".into(), "heal".into()];
    g.lineage.last_supply_origins = vec![("heal".into(), false), ("heal".into(), false)];
    g.lineage.repeat_quote.insert("heal".into(), 10_000);
    g.offline = true;
    // Paid permanent actions can leave an absence's available income below zero.
    g.batch.spent.insert("forge sword".into(), (1, 100));
    let spent = g.batch.spent.clone();
    let ledger = g.lineage.gold_ledger.clone();
    g.restock_at(true);
    assert_eq!(g.lineage.supplies.iter().filter(|s| s.kind == "heal").count(), 2);
    assert!(g.lineage.supplies.iter().all(|s| !s.free));
    assert!(g.lineage.supplies.iter().any(|s| !s.auto_packed), "authored repeat ownership survives alongside automatic packing");
    assert_eq!(g.lineage.gold, 0);
    assert_eq!(g.lineage.gold_ledger, ledger);
    assert_eq!(g.batch.spent, spent, "preparation creates no fake spending rows");
    assert!(!g.batch.restock_capped);
    assert!(!g.batch.repeat_short);
    let saved = g.save();
    assert!(g.restock().is_empty());
    assert_eq!(g.save(), saved, "a filled loadout is not duplicated");
}

#[test]
fn authored_loadout_repeats_three_delves_without_payment() {
    let mut g = Game::new_literal(193);
    g.lineage.town.home = Some(true);
    g.clear_supplies();
    g.lineage.gold = 0;
    g.lineage.forge.insert("heal".into(), ForgeRow::at(5));
    g.lineage.sets[0] = crate::rules::RuleSet {
        rows: vec![
            crate::Row::new(vec![crate::Cond::n("hp<", 90)], crate::Verb::arg("drink", "heal")),
            crate::Row::new(Vec::new(), crate::Verb::arg("attack", "nearest")),
        ],
        ..Default::default()
    };
    g.buy_supply("heal").unwrap();
    let ledger = g.lineage.gold_ledger.clone();
    for _ in 0..3 {
        g.start_run(None);
        let run = g.run.as_mut().unwrap();
        assert_eq!(run.hero.inv.iter().filter(|i| i.kind == "heal").count(), 1);
        run.hero.hp = 1;
        for _ in 0..64 {
            if !g.run.as_ref().unwrap().hero.inv.iter().any(|i| i.kind == "heal") { break; }
            g.tick();
        }
        assert!(!g.run.as_ref().unwrap().hero.inv.iter().any(|i| i.kind == "heal"), "the actual healing action consumes the chosen item");
        g.bail();
        g.finish_run().unwrap();
        g.auto_keep();
        assert_eq!(g.lineage.supplies.iter().filter(|s| s.kind == "heal").count(), 1);
        assert!(g.lineage.supplies.iter().filter(|s| s.kind == "heal").all(|s| !s.auto_packed && !s.free), "the authored healing slot is distinct from the kennel's automatic leash grant");
        assert_eq!(g.lineage.gold, 0);
    }
    assert!(g.batch.spent.is_empty());
    assert!(g.lineage.gold_ledger.iter().filter(|row| row.delta != 0).eq(ledger.iter().filter(|row| row.delta != 0)));
}

#[test]
fn permanent_forge_upgrade_and_gunner_sidearm_still_require_gold() {
    let mut g = unlocked();
    assert_eq!(crate::kit::buy(&mut g, "weapon").unwrap_err(), "not enough gold");
    let price = crate::kit::price(&g.lineage, "weapon", 0) as i32;
    g.lineage.gold = price;
    crate::kit::buy(&mut g, "weapon").unwrap();
    assert_eq!(g.lineage.gold, 0);
    assert_eq!(crate::kit::owned(&g.lineage, "weapon"), 1);
    g.lineage.class = crate::hero::Class::Gunner;
    g.lineage.unlocks.insert("gunner".into());
    assert_eq!(crate::firearm::forge_sidearm(&mut g).unwrap_err(), "not enough gold");
    let price = crate::kit::unit_of(&g.lineage) as i32;
    g.lineage.gold = price;
    crate::firearm::forge_sidearm(&mut g).unwrap();
    assert_eq!(g.lineage.gold, 0);
    assert_eq!(g.lineage.kit.get(crate::firearm::SIDEARM_SLOT), Some(&1));
}
