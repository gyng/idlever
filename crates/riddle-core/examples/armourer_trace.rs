//! Observe genuine offline sends through production transport slices, proving final-state parity.
use riddle_core::{offline, Game};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 4 { return Err("armourer_trace SAVE HOURS OUTPUT".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let text = std::fs::read_to_string(&args[1])?;
    let source = Game::load(&text)?;
    if source.run.is_some() || source.pending_exit.is_some() { return Err("settled camp required".into()); }
    let hours: u64 = args[2].parse()?;
    if !(1..=72).contains(&hours) { return Err("hours must be1..72".into()); }
    let mut cases = Vec::new();
    for enabled in [true, false] {
        let mut g = source.clone(); g.set_worker("armourer", enabled)?;
        let before = g.save(); let mut normal = g.clone();
        let normal_report = offline::run_offline_counts(&mut normal, hours * 3600);
        let mut sends = Vec::new(); let mut last_run = None;
        let mut completed = Vec::new();
        let mut focused_exit = None;
        let mut last_record = g.lineage.run_log.last().map(|r| r.id);
        for elapsed in 1..=hours * 3600 {
            if enabled && elapsed == 112019 && g.run.as_ref().is_some_and(|r| r.id == 98) {
                let mut exit = g.clone();
                let before_exit = exit.save();
                for _ in 0..10 {
                    if exit.run.as_ref().is_none_or(|r| r.over.is_some()) { break; }
                    exit.tick();
                }
                if exit.run.as_ref().is_some_and(|r| r.over.is_some()) {
                    exit.finish_run();
                    let pending = exit.pending_exit.clone();
                    let plan = pending.as_ref().map(|p| riddle_core::engine::auto_keep_plan(
                        p, &exit.lineage.vault, exit.lineage.vault_slots(), &exit.lineage.keep_pref, true));
                    exit.auto_keep();
                    focused_exit = Some(json!({"before_exit":before_exit,"pending":pending,"plan":plan,
                        "keep_pref":exit.lineage.keep_pref,"slots":exit.lineage.vault_slots(),
                        "vault_after":exit.lineage.vault,"exit_line":exit.batch.exits.iter().find(|e| e.run_id == 98),
                        "scope":"Production tick/finish/keep clone of observed pre-exit state; clock parity not claimed"}));
                }
            }
            offline::run_offline_slice(&mut g, 1, false);
            if let Some(r) = g.run.as_ref().filter(|r| Some(r.id) != last_run && r.turn > 0) {
                last_run = Some(r.id);
                sends.push(json!({"elapsed_s":elapsed,"run_id":r.id,"observed_turn":r.turn,"heir":r.heir,
                    "start":r.start,"depth":r.depth,"hero":r.hero,"brought":r.brought,
                    "best":g.lineage.best_depth,"kit":g.lineage.kit,"vault":g.lineage.vault,
                    "worker_sends":g.lineage.tree.sends,"worker_acts":g.lineage.tree.acts,
                    "gold":g.lineage.gold}));
            }
            if let Some(rec) = g.lineage.run_log.last().filter(|r| Some(r.id) != last_record) {
                last_record = Some(rec.id);
                let line = g.batch.exits.iter().find(|e| e.run_id == rec.id);
                completed.push(json!({"elapsed_s":elapsed,"record":rec,"exit_line":line,
                    "vault_after":g.lineage.vault,"gold_after":g.lineage.gold}));
            }
        }
        let traced_report = offline::run_offline_slice(&mut g, 0, true);
        let equal = g.save() == normal.save();
        cases.push(json!({"armourer_enabled":enabled,"before":before,"sends":sends,"completed":completed,"focused_exit":focused_exit,
            "complete_saved_state_equal":equal,"normal_report":normal_report,"traced_report":traced_report,
            "normal_after":normal.save(),"traced_after":g.save()}));
    }
    if std::fs::read_to_string(&args[1])? != text { return Err("source changed".into()); }
    let equal = cases.iter().all(|c| c["complete_saved_state_equal"] == true);
    std::fs::write(&args[3], serde_json::to_vec(&json!({"source":args[1],"hours":hours,"no_grants":true,
        "observation":"First observed tick of each run, not necessarily tick0", "cases":cases}))?)?;
    if !equal { return Err("trace final state differs from normal absence; inspect preserved output".into()); }
    Ok(())
}
