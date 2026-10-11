//! Actual paid silence-patch comparison from an earned camp, without grants.
use riddle_core::bloodlines::Session;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 5 { return Err("silence_check SAVE DEATH_ID HOURS OUTPUT".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let text = std::fs::read_to_string(&args[1])?;
    let source = Session::load(&text)?;
    if source.run.is_some() || source.pending_exit.is_some() { return Err("idle settled camp required".into()); }
    let id = args[2].parse()?;
    let hours: u64 = args[3].parse()?;
    if !(1..=336).contains(&hours) { return Err("hours must be 1..336".into()); }
    let mut audit = source.clone();
    let patches = audit.death_deltas(id).ok_or("death unavailable")?;
    let patch = patches.into_iter().find(|p| p.buys.as_ref().is_some_and(|b| b.kind == "silence")
        && p.row.verb == riddle_core::Verb::arg("read", "silence")).ok_or("silence patch unavailable")?;
    let mut cases = Vec::new();
    for take in [false, true] {
        let mut game = source.clone();
        let gold_before = game.lineage.gold;
        if take {
            game.buy_supply("silence")?;
            let mut p = patch.clone();
            if p.row.origin.is_none() { p.row = p.row.from("patch"); }
            let rules = riddle_core::offline::apply_patch(game.lineage.rules(), &p, game.vocabulary().max_rows);
            game.set_rules(rules)?;
        }
        let paid = gold_before - game.lineage.gold;
        let before = game.save();
        let report = game.run_offline_mode(hours * 3600, false, true);
        cases.push(json!({"take_patch":take,"paid_gold":paid,"before":before,"report":report,"after":game.save()}));
    }
    if std::fs::read_to_string(&args[1])? != text { return Err("source save changed".into()); }
    std::fs::write(&args[4], serde_json::to_vec(&json!({"source":args[1],"death_id":id,"hours":hours,"patch":patch,"no_grants":true,"cases":cases}))?)?;
    Ok(())
}
