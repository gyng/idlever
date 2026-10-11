//! Compare legal saved-camp loadouts through identical actual absences, without grants.
//! loadout_check SAVE HOURS OUTPUT; source loadout, no brought items, and all actual earned vault items.
use riddle_core::Game;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 4 { return Err("loadout_check SAVE HOURS OUTPUT".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let source = Game::load(&std::fs::read_to_string(&args[1])?)?;
    let hours: u64 = args[2].parse()?;
    if !(1..=336).contains(&hours) { return Err("hours must be 1..336".into()); }
    let mut cases = Vec::new();
    for mode in 0..3 {
        let mut game = source.clone();
        if mode == 1 { game.loadout(Vec::new()); }
        if mode == 2 { game.loadout(source.lineage.vault.iter().map(|item| item.id).collect()); }
        let selected = game.loadout.clone();
        let report = riddle_core::offline::run_offline_counts(&mut game, hours * 3600);
        cases.push(serde_json::json!({"choice":match mode { 1 => "no brought items", 2 => "all earned vault items", _ => "saved loadout" },"loadout":selected,"report":report,"save":game.save()}));
    }
    std::fs::write(&args[3], serde_json::to_vec(&serde_json::json!({"hours":hours,"no_grants":true,"cases":cases}))?)?;
    Ok(())
}
