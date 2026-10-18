//! Cut196: independent accounting regressions through actual pickup and exit paths.
use crate::{
    engine::{gold_divisor, ExitTier, FloorItem, Game},
    item::Item,
};

#[test]
fn live_pack_wire_names_each_finds_pickup_worth_and_never_moves_gold() {
    let mut g = arena();
    let id = g.run.as_mut().unwrap().new_item_id();
    pickup(&mut g, Item::new(id, "heal"));
    let (loot, raw) = { let r = g.run.as_ref().unwrap(); (r.loot, r.loot_raw) };
    let supply = g.run.as_mut().unwrap().new_item_id();
    {
        let r = g.run.as_mut().unwrap();
        r.supplies.push(supply);
        let mut s = Item::new(supply, "heal");
        s.known = true;
        r.claim_item_value(&mut s);
        r.hero.inv.push(s);
    }
    let snap = g.snapshot();
    let found = snap.hero.inv.iter().find(|i| i.id == id).expect("the find is in the pack");
    let d = gold_divisor();
    assert_eq!(found.worth, raw / d, "worth is the coins the pickup added");
    assert!(found.worth > 0 && found.fate.is_none());
    let sup = snap.hero.inv.iter().find(|i| i.id == supply).unwrap();
    assert_eq!((sup.worth, sup.fate.as_deref()), (0, Some("supply")));
    let r = g.run.as_ref().unwrap();
    assert_eq!((r.loot, r.loot_raw), (loot, raw), "the wire reads only");
}

fn arena() -> Game {
    let mut g = crate::tests::arena();
    g.lineage.gold = 500; // Keep the separately named wake grant out of these receipts.
    g.lineage.restock_off = true;
    g.lineage.kennel_declined = true;
    g
}

fn pickup(g: &mut Game, mut item: Item) -> u32 {
    let id = item.id;
    item.known = true;
    let r = g.run.as_mut().unwrap();
    r.items.push(FloorItem { pos: r.hero.pos, item });
    let (r, mut cx) = g.ctx();
    crate::turn::pickup_here(r, &mut cx);
    assert!(!r.items.iter().any(|f| f.item.id == id), "fixture pickup must actually succeed");
    id
}

fn finish(g: &mut Game, tier: ExitTier) {
    let (r, mut cx) = g.ctx();
    crate::turn::end_run(r, &mut cx, tier);
    assert!(g.finish_run().is_some());
}

#[test]
fn a_real_record_checkpoint_cannot_recreate_secured_raw_carry() {
    let mut g = arena();
    {
        let r = g.run.as_mut().unwrap();
        r.record_mark = r.depth;
        r.loot_add(43);
    }
    {
        let (r, mut cx) = g.ctx();
        crate::turn::descend(r, &mut cx);
    }
    let r = g.run.as_mut().unwrap();
    assert_eq!((r.secured, r.loot_raw, r.loot), (10, 3, 0));
    r.loot_add(5);
    assert_eq!((r.secured, r.loot_raw, r.loot), (10, 8, 2));
    {
        let (r, mut cx) = g.ctx();
        crate::turn::descend(r, &mut cx);
    }
    let r = g.run.as_ref().unwrap();
    assert_eq!((r.secured, r.loot_raw, r.loot), (12, 0, 0));
    assert_eq!(r.kept(ExitTier::Death), 12);
}

#[test]
fn checkpoint_rounding_conserves_value_and_is_idempotent() {
    for raw in 0..129 {
        let mut g = arena();
        let r = g.run.as_mut().unwrap();
        r.loot_add(raw);
        r.secure_carry();
        assert_eq!(r.secured * gold_divisor() + r.loot_raw, raw);
        assert!((0..gold_divisor()).contains(&r.loot_raw));
        let once = (r.secured, r.loot_raw, r.loot);
        assert_eq!(r.secure_carry(), 0);
        assert_eq!((r.secured, r.loot_raw, r.loot), once);
    }
}

#[test]
fn finances_are_full_alive_without_changing_return_xp() {
    let mut g = arena();
    let r = g.run.as_mut().unwrap();
    r.secured = 8;
    r.loot_add_gold(17);
    assert_eq!(r.kept(ExitTier::Bank), 25);
    assert_eq!(r.kept(ExitTier::Return), 25);
    assert_eq!(r.kept(ExitTier::Death), 8);
    assert_eq!(r.yield_pct(ExitTier::Return), 60);
    for timed_out in [false, true] {
        for driven_lost in [false, true] {
            r.timed_out = timed_out;
            r.driven_lost = driven_lost;
            assert_eq!(r.financial_pct(ExitTier::Return), 100);
            assert_eq!(r.kept(ExitTier::Return), 25);
            assert_eq!(r.kept(ExitTier::Death), 8);
        }
    }
}

#[test]
fn physical_loss_cannot_deduct_unrelated_carry_after_conversion() {
    let mut g = arena();
    let r = g.run.as_mut().unwrap();
    let mut item = Item::new(r.new_item_id(), "sword");
    let raw = r.claim_item_value(&mut item);
    assert!(raw > 0);
    r.loot_add(raw);
    r.secure_carry();
    let protected = r.secured;
    r.loot_add_gold(7);
    let physical_refund = r.loot_value(&item);
    r.loot_add(-physical_refund);
    assert_eq!((r.secured, r.loot), (protected, 7));
    assert_eq!(r.claim_item_value(&mut item), 0);
    assert_eq!(r.converted_units.len(), 1);
    // Currency itself can still be stolen: converted objects are not a second wallet.
    r.loot_add_gold(-3);
    assert_eq!((r.secured, r.loot), (protected, 4));
}

#[test]
fn claimed_item_provenance_survives_serialization_and_bones_recovery() {
    let mut g = arena();
    let id = g.run.as_mut().unwrap().new_item_id();
    pickup(&mut g, Item::new(id, "sword"));
    g.run.as_mut().unwrap().secure_carry();
    finish(&mut g, ExitTier::Death);
    let saved = g.save();
    let loaded = Game::load(&saved).unwrap();
    let item = loaded.lineage.bones.iter().flat_map(|b| &b.items).find(|i| i.id == id).unwrap().clone();
    assert!(item.value_claimed);
    let mut next = arena();
    pickup(&mut next, item);
    let r = next.run.as_ref().unwrap();
    assert_eq!(r.loot, 0, "recovered converted bones cannot pay again");
    assert!(r.converted_units.is_empty(), "recovery is not another forge discovery");
}

#[test]
fn prepared_brought_and_kit_items_have_zero_conversion_income() {
    let mut g = arena();
    let r = g.run.as_mut().unwrap();
    let prepared = r.new_item_id();
    let brought = r.new_item_id();
    r.supplies.push(prepared);
    r.brought.push(brought);
    for id in [prepared, brought, 1] {
        let mut item = Item::new(id, "sword");
        assert_eq!(r.claim_item_value(&mut item), 0);
        assert!(item.value_claimed);
    }
    assert!(r.converted_units.is_empty());
    assert_eq!((r.loot, r.loot_raw), (0, 0));
}

#[test]
fn twelve_real_pickup_exit_cases_convert_once_without_keep_or_salvage_income() {
    for kind in ["sword", "leather", "heal", "leash"] {
        for tier in [ExitTier::Bank, ExitTier::Return, ExitTier::Death] {
            let mut g = arena();
            let id = g.run.as_mut().unwrap().new_item_id();
            let mut item = Item::new(id, kind);
            if kind == "leash" { item.amount = 3; }
            let units = if kind == "leash" { 3 } else { 1 };
            let raw = item.value();
            let old_discovery = g.lineage.forge.get(kind).map_or(0, |f| f.salvaged);
            g.run.as_mut().unwrap().secured = 8;
            pickup(&mut g, item);
            let expected = 8 + if tier == ExitTier::Death { 0 } else { raw / gold_divisor() };
            let before = g.lineage.gold;
            finish(&mut g, tier);
            assert_eq!(g.lineage.gold - before, expected, "{kind} {tier:?}: one income value");
            assert!(g.lineage.supplies.is_empty(), "found potions are converted, not shelf stock");
            assert_eq!(g.lineage.forge.get(kind).unwrap().salvaged - old_discovery, units);
            let line = g.last_exit.as_ref().unwrap();
            assert_eq!(line.tier, tier.name(), "outcome is explicit, not inferred from money share");
            assert_eq!(line.kept, expected);
            assert!(line.salvaged.is_empty(), "no fictitious second salvage receipt");
            if tier != ExitTier::Death {
                assert!(line.found.iter().any(|f| f.fate == "converted" && f.n == units));
            }
            let saved = g.save();
            let loaded = Game::load(&saved).unwrap();
            assert_eq!(loaded.lineage.gold, g.lineage.gold);
            assert!(g.finish_run().is_none());
            assert_eq!(g.lineage.gold, before + expected, "repeated settlement pays nothing");
        }
    }
}

#[test]
fn a_real_found_leash_stack_only_values_its_genuine_units() {
    let mut g = arena();
    let r = g.run.as_mut().unwrap();
    let owned = r.new_item_id();
    let mut prepared = Item::new(owned, "leash");
    prepared.amount = 2;
    prepared.value_claimed = true;
    r.supplies.push(owned);
    r.bought_leashes = vec![0, 0];
    r.hero.inv.push(prepared);
    let found = r.new_item_id();
    let mut item = Item::new(found, "leash");
    item.amount = 3;
    pickup(&mut g, item);
    let r = g.run.as_ref().unwrap();
    assert_eq!(r.hero.inv.iter().find(|i| i.kind == "leash").unwrap().amount, 5);
    assert_eq!(r.loot_raw, 18);
    assert_eq!(r.found_left(owned, "leash"), 3);
    let before = g.lineage.gold;
    finish(&mut g, ExitTier::Return);
    assert_eq!(g.lineage.gold - before, 18 / gold_divisor());
    assert_eq!(g.lineage.supplies.iter().filter(|i| i.kind == "leash").map(|i| i.amount).sum::<i32>(), 2);
    assert_eq!(g.lineage.forge.get("leash").unwrap().salvaged, 3);
    let card = g.last_exit.as_ref().unwrap().finds.iter().find(|i| i.kind == "leash").unwrap();
    assert_eq!(card.label, "leash (3)", "find cards exclude the two prepared units");
}
