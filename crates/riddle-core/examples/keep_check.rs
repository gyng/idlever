//! Synthetic storage/settlement catalogue for Cut140; never an earned-play or balance gate.
use riddle_core::{engine::{auto_keep_plan, ExitTier, PendingExit}, item::Item, Game};
use serde_json::json;

fn item(id: u32, kind: &str, enchant: i32) -> Item {
    let mut it = Item::new(id, kind);
    it.enchant = enchant;
    it.known = true;
    it
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output = std::env::args().nth(1).ok_or("keep_check OUTPUT.json")?;
    let mut cases = Vec::new();
    for name in ["empty", "zero_slots", "free_one", "same_kind_excess", "same_kind_upgrade", "weaker_same_kind", "distinct_kind", "preferred_fallback", "brought", "none", "keeper", "paused_keeper"] {
        for (tier, pct) in [(ExitTier::Bank, 100), (ExitTier::Return, 60), (ExitTier::Death, 0)] {
            let mut g = Game::new_literal(140);
            g.lineage.gold_carry = 37;
            g.lineage.next_vault_id = 100_100;
            g.lineage.keep_pref = "best_weapon".into();
            let mut brought = Vec::new();
            let items = match name {
                "empty" => Vec::new(),
                "zero_slots" => { g.lineage.variant = "bones_only".into(); vec![item(10, "dagger", 0)] },
                "free_one" => vec![item(10, "dagger", 0)],
                "same_kind_excess" => vec![item(10, "dagger", 0), item(11, "dagger", 1), item(12, "dagger", 2)],
                "same_kind_upgrade" | "keeper" | "paused_keeper" => {
                    g.lineage.vault = vec![item(100_001, "dagger", 0)];
                    vec![item(10, "dagger", 1)]
                },
                "weaker_same_kind" => {
                    g.lineage.vault = vec![item(100_001, "dagger", 2)];
                    vec![item(10, "dagger", 0)]
                },
                "distinct_kind" => {
                    g.lineage.vault = vec![item(100_001, "dagger", 0)];
                    vec![item(10, "bow", 1)]
                },
                "preferred_fallback" => {
                    // A vaulted consumable is protected against a cross-category eviction.
                    g.lineage.unlocks.insert("vault2".into());
                    g.lineage.vault = vec![item(100_001, "heal", 0)];
                    vec![item(10, "dagger", 0), item(11, "leather", 0)]
                },
                "brought" => { brought.push(100_001); vec![item(100_001, "dagger", 0), item(10, "bow", 1)] },
                "none" => { g.lineage.keep_pref = "none".into(); vec![item(10, "dagger", 1), item(11, "heal", 0)] },
                _ => unreachable!(),
            };
            if matches!(name, "keeper" | "paused_keeper") {
                riddle_core::tree::grant(&mut g.lineage, &["keeper"]); // Explicit unit fixture only.
                if name == "paused_keeper" { g.set_worker("keeper", false)?; }
            }
            let found = items.iter().filter(|it| !brought.contains(&it.id)).map(|it| (it.id, it.kind.clone())).collect();
            g.pending_exit = Some(PendingExit { run_id: 1, tier, items, pct, brought, found, stalled: false });
            let before = g.save();
            let pending = g.exit_pending_wire().unwrap();
            let p = g.pending_exit.as_ref().unwrap();
            let (retained_ids, evicted_ids) = auto_keep_plan(p, &g.lineage.vault, g.lineage.vault_slots(), &g.lineage.keep_pref, true);
            g.auto_keep();
            let after = g.save();
            g.auto_keep();
            let idempotent = after == g.save();
            let mut restored = Game::load(&before)?;
            restored.auto_keep();
            let serialized_settlement_equal = after == restored.save();
            cases.push(json!({"case":name,"tier":tier.name(),"fixture":true,"slots":g.lineage.vault_slots(),"pending":pending,
                "plan":{"retain":retained_ids,"evict":evicted_ids},"before":before,"after":after,
                "settlement_idempotent":idempotent,"serialized_settlement_equal":serialized_settlement_equal,
                "settled":{"vault":g.lineage.vault,"gold":g.lineage.gold,"fractional_carry":g.lineage.gold_carry,
                    "forge":g.lineage.forge,"salvaged":g.batch.salvaged,"salvaged_coins":g.batch.salvaged_coins,"salvage_gold":g.batch.salvage_gold,"found":g.batch.found}}));
        }
    }
    std::fs::write(output, serde_json::to_vec_pretty(&json!({"synthetic_fixtures":true,"earned_play":false,"balance_gate":false,
        "limitation":"Pending-exit fixtures isolate storage settlement; they do not prove which finds a real death makes eligible or a complete run report.","cases":cases}))?)?;
    Ok(())
}
