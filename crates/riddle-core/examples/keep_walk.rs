//! Read-only saved-camp walk through eight real watched exits; no grants or forced loot.
use riddle_core::Game;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 { return Err("keep_walk SAVE OUTPUT.json".into()); }
    riddle_core::chronicle::use_shipping_words();
    let source = std::fs::read_to_string(&args[1])?;
    let mut game = Game::load(&source)?;
    if game.run.is_some() || game.pending_exit.is_some() { return Err("an idle saved camp is required".into()); }
    let mut cases = Vec::new();
    for _ in 0..8 {
        let before_send = game.save();
        let salvage_before = game.batch.salvage_gold;
        game.send();
        if game.run.is_none() { return Err("public Send did not begin a run".into()); }
        let mut steps = 0;
        while game.run.is_some() {
            game.step(4000);
            steps += 1;
            if steps > 100 { return Err("bounded watched run did not finish".into()); }
        }
        let before_settlement = game.save();
        let pending = game.exit_pending_wire().ok_or("actual exit has no pending settlement")?;
        let run_id = game.pending_exit.as_ref().unwrap().run_id;
        game.auto_keep();
        // step_result moves last_exit into its event; the batch holds the settled find fates.
        let exit = game.batch.exits.iter().find(|line| line.run_id == run_id).ok_or("settled exit line missing")?;
        cases.push(json!({"before_send":before_send,"before_settlement":before_settlement,"pending":pending,
            "after_settlement":game.save(),"run_id":run_id,"settled_exit":exit,"vault":game.lineage.vault,
            "gold":game.lineage.gold,"fractional_carry":game.lineage.gold_carry,"forge":game.lineage.forge,
            "salvage_gold_total":game.batch.salvage_gold,"salvage_gold_delta":game.batch.salvage_gold-salvage_before,"salvaged_total":game.batch.salvaged}));
    }
    std::fs::write(&args[2], serde_json::to_vec_pretty(&json!({"source":args[1],"synthetic_fixture":false,"no_grants":true,
        "scope":"Eight real manual sends with existing source configuration and automatic settlement; no changed loadout, purchases or earned-play claim for synthetic fixtures.","cases":cases}))?)?;
    if std::fs::read_to_string(&args[1])? != source { return Err("source save changed".into()); }
    Ok(())
}
