//! Earned Cut160 bank98 upgrade/settlement check; no grants or gameplay choices.
use riddle_core::Game;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<_> = std::env::args().collect();
    if a.len() != 3 { return Err("brought_upgrade_check PRE_EXIT OUTPUT".into()); }
    riddle_core::chronicle::use_shipping_words();
    let source = std::fs::read_to_string(&a[1])?;
    let mut g = Game::load(&source)?;
    for _ in 0..10 {
        if g.run.as_ref().is_none_or(|r| r.over.is_some()) { break; }
        g.tick();
    }
    if g.run.as_ref().is_none_or(|r| r.id != 98 || r.over.is_none()) { return Err("expected earned bank98 exit".into()); }
    g.finish_run();
    let before = g.save();
    let pending = g.exit_pending_wire().ok_or("no pending exit")?;
    assert_eq!(before, g.save(), "preview mutates source");
    assert_eq!(pending.auto_keep, vec![94]);
    let mut manual = g.clone(); manual.keep(vec![100004])?;
    assert_eq!(manual.lineage.vault[0].kind, "axe", "explicit manual selection changed");
    let prior_axes = g.batch.salvaged.get("axe").map_or(0, |p| p.0);
    g.auto_keep();
    let after = g.save();
    let mut restored = Game::load(&before)?; restored.auto_keep();
    assert_eq!(after, restored.save());
    g.auto_keep(); assert_eq!(after, g.save());
    assert_eq!(g.lineage.vault.len(), 1);
    assert_eq!(g.lineage.vault[0].kind, "sword");
    assert_eq!(g.lineage.vault[0].enchant, 2);
    assert_eq!(g.batch.salvaged.get("axe").map_or(0, |p| p.0) - prior_axes, 1);
    let line = g.batch.exits.iter().find(|e| e.run_id == 98).ok_or("exit line missing")?;
    assert!(line.found.iter().any(|f| f.kind == "sword" && f.fate == "kept" && f.n == 1));
    assert_eq!(std::fs::read_to_string(&a[1])?, source);
    std::fs::write(&a[2], serde_json::to_vec(&json!({"before":before,"pending":pending,"after":after,
        "manual_after":manual.save(),"exit":line,"source_unchanged":true,"preview_unchanged":true,
        "reloaded_settlement_equal":true,"idempotent":true,"salvaged_axe_count":1}))?)?;
    Ok(())
}
