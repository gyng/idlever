//! Current causal-theft fixture inventory after immediate cache timing; no grants or tuning.
fn main() {
    for seed in 103..=768 {
        let mut g = idlever_core::Game::new_literal(seed);
        g.max_deaths = 1000;
        idlever_core::systems::open_all(&mut g.lineage);
        idlever_core::traits::neutral(&mut g.lineage);
        idlever_core::offline::run_offline_counts(&mut g, 8 * 3600);
        let ids: Vec<_> = g
            .deaths
            .iter()
            .filter(|(_, r)| r.root.as_ref().is_some_and(|r| r.kind == "theft"))
            .map(|(id, _)| *id)
            .collect();
        for id in ids {
            let Some(d) = g.death(id) else { continue };
            let roots:Vec<_>=d.patches.iter().filter_map(|p|p.root.as_ref().map(|r|serde_json::json!({"text":r.text,"survive":p.survive,"delta":p.forecast_delta,"no_gain":p.no_gain}))).collect();
            if !roots.is_empty() {
                println!(
                    "{}",
                    serde_json::json!({"seed":seed,"death":id,"baseline":d.baseline,"roots":roots,"first_survive":d.patches.first().map(|p|p.survive),"first_is_root":d.patches.first().is_some_and(|p|p.root.is_some())})
                );
                if d.baseline == 0.0
                    && roots.iter().any(|r| {
                        r["survive"] == 0.0
                            && r["delta"] == 0.0
                            && r["no_gain"] == true
                            && r["text"]
                                .as_str()
                                .is_some_and(|s| s.starts_with("den took"))
                    })
                    && d.patches
                        .first()
                        .is_some_and(|p| p.root.is_none() && p.survive > 0.0)
                {
                    return;
                }
            }
        }
    }
}
