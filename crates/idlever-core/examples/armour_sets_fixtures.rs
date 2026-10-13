//! Canonical UI fixtures from genuinely earned stage saves; no ownership grants.
use idlever_core::{Game,Ev,kit,offline,persistent};
use std::{fs,path::{Path,PathBuf}};
use serde_json::json;
fn save(dir:&Path,name:&str,g:&Game){
    fs::write(dir.join(format!("{name}.game.json")),g.save()).unwrap();
    fs::write(dir.join(format!("{name}.lineage.json")),serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
}
fn main(){
    let source=PathBuf::from(std::env::args().nth(1).expect("earned source"));
    let out=PathBuf::from(std::env::args().nth(2).expect("output"));fs::create_dir_all(&out).unwrap();
    let mut entries=Vec::new();
    for seed in [1,13] {
        let dir=out.join(format!("seed-{seed}"));fs::create_dir_all(&dir).unwrap();
        for (stage,kind) in [("body","hearthglass"),("hood","hearthglass_hood"),("boots","hearthglass_boots")] {
            let text=fs::read_to_string(source.join(format!("seed-{seed}/earned-{kind}.game.json"))).unwrap();
            let mut g=Game::load(&text).unwrap();
            assert!(g.lineage.town.owned_shapes.contains(kind));
            g.set_worker("scout",false).unwrap();let report=offline::run_offline_counts(&mut g,3600);
            assert!(!persistent::away(&g));assert_eq!(persistent::remaining(&g.lineage),0);
            save(&dir,&format!("earned-{stage}-home"),&g);
            entries.push(json!({"id":format!("seed-{seed}-{stage}"),"home":format!("seed-{seed}/earned-{stage}-home.game.json"),"earned":true,"piece":kind,"source":"genuinely earned public-action survey; actual Scout pause and one-hour completion/rest, no forced Return","completed_during_home":report.runs}));
            if stage=="boots" {
                let mut c=g.lineage.starting_config.clone().unwrap_or_default();c.follow_set=Some("hearthglass".into());c.pins=None;
                kit::set_starting(&mut g,Some(c.clone())).unwrap();g.ensure_run();
                save(&dir,"earned-full-prepared",&g);
                c.pins=Some(idlever_core::armour_sets::Pins{boots:Some("trailboots".into()),..Default::default()});
                kit::set_starting(&mut g,Some(c)).unwrap();save(&dir,"earned-hybrid-prepared",&g);
                let snapshot=g.try_send().unwrap();assert_eq!(snapshot.hero.boots.as_deref(),Some("trailboots"));
                let stepped=g.step(1);assert!(!stepped.run_over);save(&dir,"earned-hybrid-away",&g);
            }
        }
    }
    let controlled=out.join("controlled");fs::create_dir_all(&controlled).unwrap();
    let text=fs::read_to_string(out.join("seed-1/earned-boots-home.game.json")).unwrap();
    let mut gunner=Game::load(&text).unwrap();
    // Only class qualification is controlled; ownership is genuinely earned.
    gunner.lineage.unlocks.insert("gunner".into());gunner.set_class("gunner").unwrap();gunner.ensure_run();
    save(&controlled,"earned-collection-controlled-gunner",&gunner);
    entries.push(json!({"id":"controlled-gunner","home":"controlled/earned-collection-controlled-gunner.game.json","earned":false,"controlled":"Gunner class qualification only; real public setClass; collection/ranks/currency from earned seed1","expectedFollowCount":3}));
    let text=fs::read_to_string(out.join("seed-1/earned-body-home.game.json")).unwrap();
    let mut focus=Game::load(&text).unwrap();
    assert!(!focus.lineage.town.owned_shapes.contains("hearthglass_hood"));
    // Controlled source qualification and early-return policy, never a fake receipt.
    focus.lineage.best_depth=focus.lineage.best_depth.max(18);
    focus.lineage.pkg.literal=true;
    let rules=serde_json::from_str(r#"{"rows":[{"conds":[],"verb":{"v":"return"},"origin":"fixture"}]}"#).unwrap();
    focus.set_rules_raw(rules).unwrap();
    focus=Game::load(&focus.save()).unwrap();
    idlever_core::armour_sets::set_focus(&mut focus,Some("hearthglass")).unwrap();
    let mut proof=Vec::new();
    for attempt in 1..=3 {
        focus.try_send().unwrap();
        if attempt==3 {save(&controlled,"source-focus-before-third-miss",&focus);}
        let mut ticks=0;
        loop {let step=focus.step(1);ticks+=1;if step.run_over{break;}assert!(ticks<1000);}
        proof.push(json!({"attempt":attempt,"actual_ticks":ticks,"actual_exit":focus.batch.exits.last(),"focus":idlever_core::armour_sets::focus_wire(&focus.lineage)}));
    }
    save(&controlled,"source-focus-stopped-after-three",&focus);
    assert!(focus.lineage.set_focus.is_none());assert!(focus.lineage.set_focus_note.as_deref().unwrap().contains("3 delves"));
    fs::write(controlled.join("source-focus-proof.json"),serde_json::to_vec_pretty(&proof).unwrap()).unwrap();
    entries.push(json!({"id":"controlled-focus-stop","home":"controlled/source-focus-stopped-after-three.game.json","before":"controlled/source-focus-before-third-miss.game.json","earned":false,"controlled":"Known-source record qualification and early-return policy only; actual public sends/steps and three real Core Return receipts; no fake counters/stops/discoveries","findSteps":proof.last().unwrap()["actual_ticks"]}));
    // The retained capsule is an actual source run, not a manufactured event.
    // Some early firsts fall outside the two serialized boss capsules; record that honestly.
    for seed in [1,13] {
        let dir=out.join(format!("seed-{seed}"));
        for kind in ["hearthglass","hearthglass_hood","hearthglass_boots"] {
            let g=Game::load(&fs::read_to_string(source.join(format!("seed-{seed}/earned-{kind}.game.json"))).unwrap()).unwrap();
            let mut found=None;
            for cap in &g.capsules.0 {
                let mut replay=(*cap.game).clone();replay.events.clear();
                for _ in 0..idlever_core::engine::MAX_TURNS_PER_RUN {
                    let prior=replay.clone();replay.tick();
                    if replay.events.iter().any(|e|matches!(e,Ev::Discovery{find,..}if find.kind==kind)) {found=Some((prior,replay));break;}
                    if replay.run.as_ref().is_none_or(|r|r.over.is_some()){break;}
                    replay.events.clear();
                }
                if found.is_some(){break;}
            }
            if let Some((before,after))=found {
                save(&dir,&format!("earned-{kind}-before"),&before);save(&dir,&format!("earned-{kind}-after"),&after);
                fs::write(dir.join(format!("earned-{kind}-events.json")),serde_json::to_vec_pretty(&after.events).unwrap()).unwrap();
                entries.push(json!({"id":format!("seed-{seed}-{kind}-discovery"),"earned":true,"before":format!("seed-{seed}/earned-{kind}-before.game.json"),"after":format!("seed-{seed}/earned-{kind}-after.game.json"),"findSteps":1,"piece":kind,"source":"actual serialized earned capsule replay; no kill/damage/drop/event grants"}));
            }else {entries.push(json!({"id":format!("seed-{seed}-{kind}-discovery"),"earned":true,"not_held":"first source capsule outside serialized two-boss cap; stage/home evidence remains real"}));}
        }
    }
    fs::write(out.join("manifest.json"),serde_json::to_vec_pretty(&json!({"entries":entries})).unwrap()).unwrap();
}
