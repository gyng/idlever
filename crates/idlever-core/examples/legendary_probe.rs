//! Real earned first-discovery survey and exact held-run replay fixtures.
use idlever_core::{Game,Ev,kit,offline,persistent,town,tree};
use serde_json::json;
use std::{fs,path::{Path,PathBuf}};
fn save(dir:&Path,name:&str,g:&Game) {
    fs::write(dir.join(format!("{name}.game.json")),g.save()).unwrap();
    fs::write(dir.join(format!("{name}.lineage.json")),serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
}
fn main() {
    let out=PathBuf::from(std::env::args().nth(1).expect("output directory"));fs::create_dir_all(&out).unwrap();
    let mut rows=Vec::new();
    for seed in 1..=16 {
        let mut g=Game::new(seed);g.build_town("house").unwrap();let mut actions=vec![json!({"action":"build","id":"house"})];
        for manual in 1..=5 {
            let recovery=persistent::remaining(&g.lineage).div_ceil(10);
            if recovery>0 {offline::run_offline_counts(&mut g,recovery);}
            g.try_send().unwrap();
            loop {let step=g.step(256);if step.run_over {break;}}
            actions.push(json!({"action":"manual-delve","n":manual,"clock_s":g.lineage.clock_s,"depth":g.lineage.best_depth,"gold":g.lineage.gold}));
            if tree::lit(&g.lineage).is_some_and(|n|n.id=="porter") {g.hire("porter").unwrap();actions.push(json!({"action":"hire","id":"porter"}));}
            if tree::lit(&g.lineage).is_some_and(|n|n.id=="scout") {g.hire("scout").unwrap();actions.push(json!({"action":"hire","id":"scout","manual":manual}));break;}
        }
        assert!(tree::hired(&g.lineage,"scout"));
        let mut found=None;
        for hour in 1..=48 {
            for (id,_) in town::BUILDINGS {if town::build_ready(&g.lineage,id) {g.build_town(id).unwrap();actions.push(json!({"action":"build","id":id,"hour":hour}));}}
            for slot in kit::KIT_SLOTS {
                if kit::owned(&g.lineage,slot)<kit::mults(slot).len() as u32 {
                    let price=kit::price(&g.lineage,slot,kit::owned(&g.lineage,slot) as usize) as i32;
                    if g.lineage.gold>=price {kit::buy(&mut g,slot).unwrap();actions.push(json!({"action":"forge","slot":slot,"price":price,"hour":hour}));}
                }
            }
            let report=offline::run_offline_counts(&mut g,3600);
            actions.push(json!({"action":"absence","seconds":3600,"hour":hour,"runs":report.runs,"best":g.lineage.best_depth,"gold":g.lineage.gold,"discoveries":report.discoveries}));
            if let Some(find)=report.discoveries.first().cloned() {found=Some((hour,find));break;}
        }
        let row=if let Some((hour,find))=found {
            if [1,13].contains(&seed) {
                let dir=out.join(format!("seed-{seed}"));fs::create_dir_all(&dir).unwrap();save(&dir,"earned-after-hour-find",&g);
                let cap=g.capsules.0.iter().find(|c|c.id==find.run_id).expect("first boss capsule held");
                let mut replay=(*cap.game).clone();replay.events.clear();let mut before=None;
                for _ in 0..idlever_core::engine::MAX_TURNS_PER_RUN {
                    let prior=replay.clone();replay.tick();
                    if replay.events.iter().any(|e|matches!(e,Ev::Discovery{find:f,..}if f.kind==find.kind)) {before=Some(prior);break;}
                    replay.events.clear();assert!(replay.run.as_ref().is_some_and(|r|r.over.is_none()));
                }
                let before=before.expect("actual held earned run reproduces first discovery");save(&dir,"earned-replay-before-find",&before);save(&dir,"earned-replay-after-find",&replay);
                fs::write(dir.join("actual-discovery-events.json"),serde_json::to_vec_pretty(&replay.events).unwrap()).unwrap();
                g.set_worker("scout",false).unwrap();offline::run_offline_counts(&mut g,3600);
                assert!(!persistent::away(&g));assert_eq!(persistent::remaining(&g.lineage),0);save(&dir,"earned-owned-home",&g);
                actions.push(json!({"action":"pause-worker","id":"scout","on":false,"then_absence_s":3600}));
                fs::write(dir.join("actions.json"),serde_json::to_vec_pretty(&actions).unwrap()).unwrap();
                fs::write(dir.join("manifest.json"),serde_json::to_vec_pretty(&json!({"seed":seed,"earned":true,"protocol":"fresh House, actual manual delves and ready Porter/Scout hires, hourly uncapped absences and affordable existing permanent kit purchases; no Gold/fact/depth/discovery grants","first":find,"first_hour":hour,"before_fixture":"earned-replay-before-find.game.json","before_semantics":"exact real earned held-run replay one tick before first drop; no synthetic damage/kill/drop/receipt; may show capsule send clock rather than later absence clock","find_steps":1,"owned_home":"earned-owned-home.game.json","home_semantics":"actual Scout pause and one-hour absence finish the in-flight run and recovery; no forced Return or grants"})).unwrap()).unwrap();
            }
            json!({"seed":seed,"first_hour":hour,"discovery":find,"best":g.lineage.best_depth,"gold":g.lineage.gold})
        }else{json!({"seed":seed,"failed":"no actual legendary source killed within48hour bounded engaged-upgrade protocol","best":g.lineage.best_depth,"gold":g.lineage.gold})};
        println!("{row}");rows.push(row);
    }
    fs::write(out.join("survey.json"),serde_json::to_vec_pretty(&json!({"protocol":"16 fresh seeds; actual first-session sends/hires; hourly absences, manual ready builds and affordable permanent kit purchases;48hour bound; no grants","seeds":rows})).unwrap()).unwrap();
}
