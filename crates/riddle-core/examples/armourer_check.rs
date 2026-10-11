//! Paired actual saved-camp absences with the hired armourer enabled or paused.
//! No grants, changed loadout, purchases or substitution into acceptance gates.
use riddle_core::Game;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 4 { return Err("armourer_check SAVE HOURS OUTPUT".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let original = std::fs::read_to_string(&args[1])?;
    let source = Game::load(&original)?;
    if source.run.is_some() || source.pending_exit.is_some() { return Err("idle settled camp required".into()); }
    let hours: u64 = args[2].parse()?;
    if !(1..=336).contains(&hours) { return Err("hours must be 1..336".into()); }
    let mut cases = Vec::new();
    for enabled in [true, false] {
        let mut game = source.clone();
        game.set_worker("armourer", enabled)?;
        let before = game.save();
        // A separate clone observes Send without adding an extra send to the absence.
        let mut sent = game.clone();
        sent.send();
        let run = sent.run.as_ref().ok_or("public Send did not start a run")?;
        let send = json!({"loadout":sent.loadout,"hero":run.hero,"save":sent.save()});
        let report = riddle_core::offline::run_offline_counts(&mut game, hours * 3600);
        cases.push(json!({"armourer_enabled":enabled,"before":before,"send":send,"report":report,"after":game.save()}));
    }
    if std::fs::read_to_string(&args[1])? != original { return Err("source save changed".into()); }
    std::fs::write(&args[3], serde_json::to_vec(&json!({"source":args[1],"hours":hours,"no_grants":true,"cases":cases}))?)?;
    Ok(())
}
