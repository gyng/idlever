//! Cut156 explicit storage fixtures: preserve choices, worker access and absence truth.
use crate::{engine::{ExitTier, PendingExit}, item::Item, tree, Game};

fn item(id: u32, kind: &str, enchant: i32) -> Item {
    let mut i = Item::new(id, kind); i.enchant = enchant; i.known = true; i
}
fn pending(items: Vec<Item>) -> PendingExit {
    PendingExit { run_id: 1, tier: ExitTier::Bank, pct: 100, items, brought: vec![], found: vec![], stalled: false }
}

#[test]
fn storage_still_offers_distinct_and_per_instance_choices() {
    let vault = vec![item(100_001, "dagger", 0)];
    let decision = crate::engine::keep_is_a_decision;
    assert!(!decision(&pending(vec![item(10, "dagger", 2), item(11, "dagger", 1)]), &[], 1));
    assert!(decision(&pending(vec![item(10, "dagger", 2), item(11, "bow", 1)]), &[], 1));
    assert!(decision(&pending(vec![item(10, "dagger", 2)]), &[item(100_001, "sword", 0), item(100_002, "dagger", 0)], 2), "the order could evict a different weapon kind");
    let mut forged = item(10, "dagger", 2); forged.forged = Some([1, 0, 1]);
    assert!(decision(&pending(vec![forged]), &vault, 1));
    assert!(decision(&pending(vec![item(10, "long_gun", 1)]), &[item(100_001, "long_gun", 0)], 1), "chambers remain an individual choice");
    assert!(decision(&pending(vec![item(10, "long_gun", 1), item(11, "long_gun", 2)]), &[], 1));
    assert!(decision(&pending(vec![item(1, "dagger", 2)]), &vault, 1), "legacy kit damage differs from an ordinary enchantment");
}

fn worker_fixture() -> Game {
    let mut g = Game::new(156); g.build_town("house").unwrap();
    g.lineage.gold_move(2000, "test income");
    g.lineage.vault = vec![item(100_001, "dagger", 0)];
    g.lineage.next_vault_id = 100_100;
    assert!(g.build_town("storehouse").is_err());
    tree::grant(&mut g.lineage, &["quartermaster", "porter", "scout", "apprentice"]);
    g
}

#[test]
fn automatic_salvage_preserves_known_and_hidden_item_names() {
    let mut g = Game::new_literal(156); g.lineage.keep_pref = "none".into();
    g.pending_exit = Some(pending(vec![item(10, "heal", 0), Item::new(11, "strength")]));
    let before = g.save(); let preview = g.exit_pending_wire().unwrap();
    assert_eq!(g.save(), before, "preview does not identify or settle the real items");
    let known = preview.items.iter().find(|i| i.id == 10).unwrap();
    let hidden = preview.items.iter().find(|i| i.id == 11).unwrap();
    assert!(preview.auto_salvaged.iter().any(|r| r.kind == known.kind), "known item retains its canonical wire kind");
    assert!(preview.auto_salvaged.iter().any(|r| r.kind == hidden.label), "unknown item keeps its visible flavour");
    assert!(!preview.auto_salvaged.iter().any(|r| matches!(r.kind.as_str(), "strength" | "strength potion")), "salvage does not reveal an unknown kind");
    g.auto_keep();
    assert_eq!(preview.auto_salvaged.iter().map(|r| r.gold).sum::<i32>(), g.batch.salvage_gold);
}

#[test]
fn retired_storage_workers_never_reappear_from_manual_acts_or_age() {
    let mut g = worker_fixture();
    for chore in ["keep", "wear"] { for _ in 0..3 { tree::did(&mut g.lineage, chore); } }
    g.lineage.clock_s = 72 * 3600;
    for id in ["keeper", "armourer"] {
        assert!(tree::def(id).is_none());
        assert_eq!(tree::count(&g.lineage, id), 0);
        assert!(g.hire(id).is_err());
    }
    let wire = g.lineage();
    assert!(wire.tree.unwrap().nodes.iter().all(|n| !matches!(n.id.as_str(), "keeper" | "armourer")));
    assert!(!wire.town.buildings.iter().any(|b| b.id == "storehouse"));
}
#[test]
fn saved_routine_keep_sheet_preserves_one_and_three_hero_eight_hour_absences() {
    use crate::bloodlines::Session;
    for slots in [1, 3] {
        let mut source = Session::new(156); source.active = worker_fixture();
        if slots == 3 { source.add_bloodline().unwrap(); source.add_bloodline().unwrap(); }
        source.pending_exit = Some(pending(vec![item(10, "dagger", 1), item(11, "dagger", 2)]));
        let saved = source.save(); let source = Session::load(&saved).unwrap();
        assert!(!source.exit_pending_wire().unwrap().decide);
        let mut whole = source.clone(); let expected = whole.run_offline_mode(8*3600, false, true);
        assert!(expected.runs > 0);
        for reload in [false, true] {
            let mut sliced = source.clone(); let mut left = 8*3600; let mut i = 0;
            let widths = [1, 719, 3600];
            let report = loop {
                let seconds = left.min(widths[i%widths.len()]); let last = seconds == left;
                let report = sliced.run_offline_slice(seconds, last);
                if last { break report; }
                left -= seconds; i += 1;
                if reload { sliced = Session::load(&sliced.save()).unwrap(); }
            };
            assert_eq!(report, expected, "whole report: slots{slots},reload{reload}");
            assert!(serde_json::to_value(&sliced).unwrap() == serde_json::to_value(&whole).unwrap(), "every save/replay field: slots{slots},reload{reload}");
        }
    }
}
