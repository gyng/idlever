//! Read-only current-runtime verdict audit of actual recorded deaths in a saved Session.
//! cargo run -q --profile fast -p riddle-core --example death_check -- SAVE ID[,ID...]
use riddle_core::bloodlines::Session;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 { return Err("death_check SAVE ID[,ID...]".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let source = Session::load(&std::fs::read_to_string(&args[1])?)?;
    let mut results = Vec::new();
    for value in args[2].split(',') {
        let id: u32 = value.parse()?;
        let mut session = source.clone();
        let original = session.deaths.get(&id).ok_or("missing death")?.clone();
        let death = session.death(id).ok_or("unavailable verdict")?;
        let deltas = session.death_deltas(id).ok_or("unavailable deltas")?;
        let checkpoint = original.t10.as_ref().map(|r| json!({"hp":r.hero.hp,"max_hp":r.hero.max_hp,"tick":r.turn,"depth":r.depth}));
        results.push(json!({"id":id,"checkpoint":checkpoint,"death_tick":original.death_tick,"recorded_rules":original.rules,"verdict":death,"priced_patches":deltas}));
    }
    println!("{}",serde_json::to_string_pretty(&results)?);
    Ok(())
}
