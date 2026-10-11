//! Actual earned-camp starting-stone comparison. Diagnostic only, never a gate actor.
use riddle_core::Game;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<_> = std::env::args().collect();
    if a.len() != 5 { return Err("start_check SAVE HOURS START OUTPUT".into()); }
    riddle_core::balance::configure_from_env()?;
    riddle_core::chronicle::use_shipping_words();
    let source = std::fs::read_to_string(&a[1])?;
    let original = Game::load(&source)?;
    if original.run.is_some() || original.pending_exit.is_some() { return Err("settled camp required".into()); }
    let hours: u64 = a[2].parse()?;
    if !(1..=72).contains(&hours) { return Err("hours1..72 required".into()); }
    let start: u32 = a[3].parse()?;
    let mut cases = Vec::new();
    for changed in [false, true] {
        let mut g = original.clone();
        if changed { g.set_start(start)?; }
        let before = g.save();
        let mut send = g.clone(); send.send();
        let hero = send.run.as_ref().ok_or("send failed")?.hero.clone();
        let report = riddle_core::offline::run_offline_counts(&mut g, hours * 3600);
        cases.push(json!({"changed_start":changed,"before":before,"send_hero":hero,"report":report,"after":g.save()}));
    }
    if source != std::fs::read_to_string(&a[1])? { return Err("source changed".into()); }
    std::fs::write(&a[4], serde_json::to_vec(&json!({"source":a[1],"hours":hours,"chosen_start":start,
        "scope":"Only public starting-stone choice; diagnostic, no actor adoption or gate pass","cases":cases}))?)?;
    Ok(())
}
