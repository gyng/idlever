//! Compare legal saved-camp loadouts through identical actual absences, without grants.
//! loadout_check SAVE HOURS OUTPUT; source loadout, no brought items, and all actual earned vault items.
use idlever_core::Game;
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if !(4..=5).contains(&args.len()) || args.get(4).is_some_and(|value| value != "train") { return Err("loadout_check SAVE HOURS OUTPUT [train]".into()); }
    idlever_core::balance::configure_from_env()?;
    idlever_core::chronicle::use_shipping_words();
    let source = Game::load(&std::fs::read_to_string(&args[1])?)?;
    let hours: u64 = args[2].parse()?;
    if !(1..=336).contains(&hours) { return Err("hours must be 1..336".into()); }
    let mut cases = Vec::new();
    for mode in 0..if args.len() == 5 { 4 } else { 3 } {
        let mut game = source.clone();
        if mode == 1 { game.loadout(Vec::new()); }
        if mode == 2 { game.loadout(source.lineage.vault.iter().map(|item| item.id).collect()); }
        let marks_before = game.lineage.marks;
        if mode == 3 {
            let stance = game.lineage.pkg.stance.clone();
            while idlever_core::packages::level_price(&game.lineage, &stance).is_some_and(|price| price <= game.lineage.marks) {
                game.spend_level(&stance)?;
            }
        }
        let trained = (mode == 3).then(|| serde_json::json!({"stance":game.lineage.pkg.stance,"level":game.lineage.pkg.level(&game.lineage.pkg.stance),"marks_spent":marks_before-game.lineage.marks}));
        let selected = game.loadout.clone();
        let report = idlever_core::offline::run_offline_counts(&mut game, hours * 3600);
        cases.push(serde_json::json!({"choice":match mode { 1 => "no brought items", 2 => "all earned vault items", 3 => "paid stance levels", _ => "saved loadout" },"loadout":selected,"report":report,"save":game.save()}));
        if let Some(trained) = trained { cases.last_mut().unwrap()["trained"] = trained; }
    }
    std::fs::write(&args[3], serde_json::to_vec(&serde_json::json!({"hours":hours,"no_grants":true,"cases":cases}))?)?;
    Ok(())
}
