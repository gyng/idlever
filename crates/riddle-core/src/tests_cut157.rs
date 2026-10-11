//! Explicit synthetic settlement fixtures, never earned-play or balance gates.
use crate::{engine::{ExitTier, PendingExit}, item::Item, Game};

fn item(id: u32, kind: &str, enchant: i32) -> Item {
    let mut i = Item::new(id, kind); i.enchant = enchant; i.known = true; i
}

#[test]
fn manual_receipt_matches_existing_settlement_complete_save() {
    let mut checked = 0;
    for (tier, pct) in [(ExitTier::Bank, 100), (ExitTier::Return, 60), (ExitTier::Death, 0)] {
        for case in 0..5 {
            for carry in [0, 37, 99] {
                let mut g = Game::new_literal(157);
                g.lineage.gold_carry = carry; g.lineage.next_vault_id = 100_100;
                let (vault, items, picks) = match case {
                    0 => (vec![item(100_001, "dagger", 0)], vec![item(10, "bow", 1)], vec![10]),
                    1 => (vec![item(100_001, "heal", 0)], vec![item(10, "dagger", 4)], vec![10]),
                    2 => (vec![item(100_001, "bow", 4)], vec![item(10, "dagger", 0)], vec![10]),
                    3 => (vec![], vec![item(10, "dagger", 0), item(11, "bow", 1)], vec![10, 11]),
                    _ => (vec![], vec![item(10, "heal", 0), Item::new(11, "strength")], vec![]),
                };
                g.lineage.vault = vault;
                // Prior report totals must never leak into this exit's receipt.
                g.batch.salvaged.insert("dagger".into(), (7, 900));
                g.batch.salvaged_coins.insert("dagger".into(), 9);
                g.batch.salvage_gold = 9;
                let found = items.iter().map(|i| (i.id, i.kind.clone())).collect();
                g.pending_exit = Some(PendingExit { run_id: 1, tier, pct, items, brought: vec![], found, stalled: false });
                let before = g.save(); let before_gold = g.lineage.gold;
                let mut old = g.clone(); old.keep(picks.clone()).unwrap();
                let receipt = g.keep_with_receipt(picks.clone()).unwrap();
                assert_eq!(g.save(), old.save(), "case{case} {tier:?} carry{carry}: complete truth unchanged");
                assert_eq!(receipt.iter().map(|r| r.gold).sum::<i32>(), g.lineage.gold-before_gold);
                if pct == 0 { assert!(receipt.is_empty()); }
                else {
                    assert!(!receipt.is_empty());
                    assert_eq!(receipt.iter().map(|r| r.n).sum::<u32>(), g.batch.salvaged.values().map(|(n, _)| *n).sum::<u32>()-7);
                    if case == 0 { assert_eq!(receipt[0].kind, "dagger"); }
                    if case == 1 { assert_eq!(receipt[0].kind, "heal"); }
                    if case == 4 {
                        assert!(receipt.iter().any(|r| r.kind == "heal"));
                        assert!(!receipt.iter().any(|r| r.kind == "strength" || r.kind == "strength potion"));
                    }
                }
                let settled = g.save();
                assert!(g.keep_with_receipt(vec![]).is_err()); assert_eq!(g.save(), settled);
                let normal = serde_json::to_value(g.lineage()).unwrap();
                assert!(normal.get("keep_salvaged").is_none());
                assert!(!settled.contains("keep_salvaged"));
                let mut reloaded = Game::load(&before).unwrap();
                assert_eq!(reloaded.keep_with_receipt(picks).unwrap(), receipt);
                assert_eq!(reloaded.save(), old.save(), "reload has the same complete settlement");
                checked += 1;
            }
        }
    }
    assert_eq!(checked, 45);
}
