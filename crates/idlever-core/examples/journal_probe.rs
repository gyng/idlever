//! Earned Cut208 guidance probe: actual fresh towns/public actions, no grants.
use idlever_core::{Game,journal,tree,town,kit,offline};
use serde_json::json;
use std::{fs,path::PathBuf};
fn main() {
    let out=PathBuf::from(std::env::args().nth(1).expect("output directory"));fs::create_dir_all(&out).unwrap();
    let mut rows=Vec::new();
    for seed in [1,13] {
        let mut g=Game::new(seed);let mut observations=vec![json!({"checkpoint":"fresh","journal":g.lineage().journal})];
        fs::write(out.join(format!("seed-{seed}-fresh.game.json")),g.save()).unwrap();
        g.build_town("house").unwrap();
        fs::write(out.join(format!("seed-{seed}-house.game.json")),g.save()).unwrap();
        for delve in 1..=3 {
            g.send();offline::run_offline_counts(&mut g,1);
            observations.push(json!({"checkpoint":format!("manual{delve}"),"journal":g.lineage().journal,"gold":g.lineage.gold}));
            fs::write(out.join(format!("seed-{seed}-manual{delve}.game.json")),g.save()).unwrap();
        }
        if tree::lit(&g.lineage).is_some_and(|n|n.id=="porter") {g.hire("porter").unwrap();observations.push(json!({"checkpoint":"actual-ready-Porter","journal":g.lineage().journal}));fs::write(out.join(format!("seed-{seed}-porter-hired.game.json")),g.save()).unwrap();}
        fs::write(out.join(format!("seed-{seed}-scout-ready.game.json")),g.save()).unwrap();
        assert_eq!(g.lineage().journal.unwrap().recommended.as_deref(),Some("scout"));g.hire("scout").unwrap();
        for round in 1..=6 {
            offline::run_offline_counts(&mut g,8*3600);
            for (id,_) in town::BUILDINGS {if town::build_ready(&g.lineage,id) {g.build_town(id).unwrap();}}
            // Optional genuinely affordable permanent upgrades: no resource or unlock injection.
            for slot in kit::KIT_SLOTS {if g.lineage.gold>=kit::price(&g.lineage,slot,kit::owned(&g.lineage,slot) as usize) as i32 {let _=kit::buy(&mut g,slot);}}
            let before=g.save();let j=journal::wire(&g.lineage,g.run.is_some());assert_eq!(before,g.save());
            observations.push(json!({"checkpoint":format!("{round}x8h"),"journal":j,"best":g.lineage.best_depth,"scout":tree::hired(&g.lineage,"scout"),"quests_done":g.lineage.town.quests_done}));
            fs::write(out.join(format!("seed-{seed}-{round}x8h.game.json")),g.save()).unwrap();
        }
        rows.push(json!({"seed":seed,"observations":observations}));
    }
    fs::write(out.join("earned-journal.json"),serde_json::to_vec_pretty(&json!({"fixture":"actual fresh seed1/13,3manualdelves,paidScout,48h+optional earned forge upgrades","seeds":rows})).unwrap()).unwrap();
    println!("earned Journal seed1/13 probe complete");
}
