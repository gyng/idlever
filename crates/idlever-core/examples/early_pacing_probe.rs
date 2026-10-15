//! Public-action early progression baseline. No grants; native timing is not visual wall time.
use idlever_core::{Game, Ev, offline, town, tree};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};

fn state(g: &Game) -> Value {
    let l = g.lineage();
    json!({
        "clock_s":g.lineage.clock_s,"total_ticks":g.lineage.total_turns,
        "gold":l.gold,"best":l.best_depth,"heir":l.heir,
        "plots":town::BUILDINGS.iter().filter(|(id,_)|town::build_ready(&g.lineage,id)).map(|(id,_)|*id).collect::<Vec<_>>(),
        "systems":l.systems,"journal":l.journal,"class":l.classes,"bloodline":l.bloodline,"legacy_offers":l.legacy_upgrades,
        "worker":tree::lit(&g.lineage).map(|n|n.id),"scout":tree::hired(&g.lineage,"scout"),
    })
}

fn main() {
    let out = PathBuf::from(std::env::args().nth(1).expect("output directory"));
    fs::create_dir_all(&out).unwrap();
    let mut seeds = Vec::new();
    for seed in 1..=16 {
        let mut g = Game::new(seed);
        g.build_town("house").unwrap();
        let mut observations = vec![json!({"at":"house","state":state(&g)})];
        for manual in 1..=5 {
            let recovery = serde_json::to_value(g.lineage()).unwrap()["persistent_hero"]["recovery_s"].as_u64().unwrap_or(0);
            if recovery > 0 { offline::run_offline_counts(&mut g,recovery); }
            g.try_send().expect("actual recovered manual departure");
            let mut exits = Vec::new();
            loop {
                let r = g.step(256);
                exits.extend(r.events.into_iter().filter(|e|matches!(e,Ev::Exit {..})));
                if r.run_over {break;}
            }
            observations.push(json!({"at":format!("manual{manual}"),"state":state(&g),"exits":exits}));
            if tree::lit(&g.lineage).is_some_and(|n|n.id=="porter") {
                g.hire("porter").unwrap();
                observations.push(json!({"at":"actual-Porter-hire","state":state(&g)}));
            }
            if tree::lit(&g.lineage).is_some_and(|n|n.id=="scout") {
                g.hire("scout").unwrap();
                observations.push(json!({"at":"actual-Scout-hire","manual":manual,"state":state(&g)}));
                break;
            }
        }
        fs::write(out.join(format!("seed-{seed}-first-session.game.json")),g.save()).unwrap();
        if tree::hired(&g.lineage,"scout") {
            for sample in 1..=4 {
                let report = offline::run_offline_counts(&mut g,8*3600);
                observations.push(json!({"at":format!("{sample}x8h"),"state":state(&g),"report":report}));
            }
        }
        seeds.push(json!({"seed":seed,"observations":observations}));
    }
    fs::write(out.join("early-pacing.json"),serde_json::to_vec_pretty(&json!({"protocol":"actual House;manual public sends;actual ready Porter/Scout;unchanged owned default build;four8h samples;no grants", "seeds":seeds})).unwrap()).unwrap();
    println!("sixteen actual early progression seeds complete");
}
