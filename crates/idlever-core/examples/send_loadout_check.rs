//! Read-only actual send versus production forecast helper equipment audit.
//! An equipment difference alone is not a package-outcome or balance verdict.
use idlever_core::{forecast, rng::splitmix, Game};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 { return Err("send_loadout_check SAVE OUTPUT".into()); }
    idlever_core::balance::configure_from_env()?;
    idlever_core::chronicle::use_shipping_words();
    let text = std::fs::read_to_string(&args[1])?;
    let source = Game::load(&text)?;
    if source.run.is_some() || source.pending_exit.is_some() { return Err("settled camp required".into()); }
    let tag: u64 = 158;
    let seed = splitmix(source.lineage.seed ^ splitmix(tag ^ 0xA24B_AED4_963E_E407));
    let simulation = forecast::sim_game(&source, source.lineage.rules(), tag, 0, None);
    let mut actual = source.clone();
    actual.start_run(Some(seed));
    let describe = |g: &Game| {
        let run = g.run.as_ref().unwrap();
        json!({"hero":run.hero,"start":run.start,"rules":g.lineage.rules(),"brought":run.brought,
            "worker_acts":g.lineage.tree.acts,"save":g.save()})
    };
    let a = describe(&actual); let s = describe(&simulation);
    let same_equipment = a["hero"]["weapon"] == s["hero"]["weapon"] && a["hero"]["armour"] == s["hero"]["armour"];
    if std::fs::read_to_string(&args[1])? != text { return Err("source changed".into()); }
    std::fs::write(&args[2], serde_json::to_vec(&json!({"source":args[1],"tag":tag,"seed":seed,
        "scope":"Equipment fidelity only; no package outcome or balance verdict", "no_grants":true,
        "before":text,"same_equipment":same_equipment,"actual":a,"simulation":s}))?)?;
    Ok(())
}
