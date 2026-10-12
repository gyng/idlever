//! Paired actual earned-camp paid supply choice. Diagnostic only, never a gate actor.
use idlever_core::Game;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<_> = std::env::args().collect();
    if a.len() != 5 { return Err("supply_check SAVE HOURS KIND OUTPUT".into()); }
    idlever_core::balance::configure_from_env()?;
    idlever_core::chronicle::use_shipping_words();
    let source = std::fs::read_to_string(&a[1])?;
    let original = Game::load(&source)?;
    if original.run.is_some() || original.pending_exit.is_some() { return Err("settled camp required".into()); }
    let hours: u64 = a[2].parse()?;
    if !(1..=72).contains(&hours) { return Err("hours1..72 required".into()); }
    let mut cases = Vec::new();
    for bought in [false, true] {
        let mut g = original.clone();
        let prior_gold = g.lineage.gold;
        if bought { g.buy_supply(&a[3])?; }
        let paid = prior_gold - g.lineage.gold;
        let before = g.save();
        let mut send = g.clone(); send.send();
        let hero = send.run.as_ref().ok_or("send failed")?.hero.clone();
        let report = idlever_core::offline::run_offline_counts(&mut g, hours * 3600);
        cases.push(json!({"bought_supply":bought,"paid":paid,"before":before,"send_hero":hero,"report":report,"after":g.save()}));
    }
    if source != std::fs::read_to_string(&a[1])? { return Err("source changed".into()); }
    std::fs::write(&a[4], serde_json::to_vec(&json!({"source":a[1],"hours":hours,"supply":a[3],
        "scope":"Only public paid supply choice; diagnostic, no actor adoption or gate pass","cases":cases}))?)?;
    Ok(())
}
