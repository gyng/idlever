//! Earned collection survey. No equipment, currency, facts or milestones are granted.
use idlever_core::{Game,armour_sets,kit,legacy,offline,packages,persistent,town,tree};
use serde_json::json;
use std::{fs,path::PathBuf};
fn check_in(g:&mut Game,actions:&mut Vec<serde_json::Value>) {
    for (id,_) in town::BUILDINGS {if town::build_ready(&g.lineage,id)&&g.build_town(id).is_ok(){actions.push(json!({"action":"build","id":id}));}}
    for _ in 0..32 {
        let ladders=kit::ladders(&g.lineage);
        let next=ladders.iter().filter_map(|l|l.next.as_ref().map(|n|(l.slot.clone(),n.price))).min_by_key(|(_,p)|*p);
        let Some((slot,price))=next else{break;};
        if g.lineage.gold<price as i32||kit::buy(g,&slot).is_err(){break;}
        actions.push(json!({"action":"forge","slot":slot,"price":price}));
    }
    for _ in 0..32 {
        let pick=legacy::offers(&g.lineage,false).into_iter().filter(|o|o.affordable).min_by_key(|o|o.price);
        let Some(pick)=pick else{break;};if legacy::buy_next(g,&pick.id).is_err(){break;}
        actions.push(json!({"action":"train","id":pick.id,"price":pick.price}));
    }
    // Actual offered packages only; the policy never grants a counter.
    let offered=g.lineage.pkg.offer.clone();
    for id in offered {
        if packages::apply(&mut g.lineage,&id,"pick",0).is_ok(){actions.push(json!({"action":"package","id":id}));break;}
    }
    if g.lineage.town.owned_shapes.contains("hearthglass")&&g.lineage.starting_config.is_none() {
        let config=kit::StartingConfig{follow_set:Some("hearthglass".into()),
            helm:g.lineage.town.owned_shapes.contains("ironcap").then(||"ironcap".into()),
            boots:g.lineage.town.owned_shapes.contains("trailboots").then(||"trailboots".into()),..Default::default()};
        if kit::set_starting(g,Some(config)).is_ok(){actions.push(json!({"action":"follow","family":"hearthglass"}));}
    }
    if g.lineage.set_focus.is_none()&&armour_sets::focus_wire(&g.lineage).available&&armour_sets::set_focus(g,Some("hearthglass")).is_ok() {
        actions.push(json!({"action":"find-next-piece"}));
    }
}
fn main() {
    let out=PathBuf::from(std::env::args().nth(1).expect("output directory"));fs::create_dir_all(&out).unwrap();
    let days=std::env::args().nth(2).and_then(|s|s.parse::<u32>().ok()).unwrap_or(14);
    let max_seed=std::env::args().nth(3).and_then(|s|s.parse::<u64>().ok()).unwrap_or(16);
    let mut rows=Vec::new();
    for seed in 1..=max_seed {
        let dir=out.join(format!("seed-{seed}"));fs::create_dir_all(&dir).unwrap();
        let mut g=Game::new(seed);g.build_town("house").unwrap();let mut actions=vec![json!({"action":"build","id":"house"})];
        for n in 1..=5 {
            let wait=persistent::remaining(&g.lineage).div_ceil(10);if wait>0{offline::run_offline_counts(&mut g,wait);}
            g.try_send().unwrap();while !g.step(256).run_over {}
            actions.push(json!({"action":"manual-delve","n":n}));
            if tree::lit(&g.lineage).is_some_and(|w|w.id=="porter"){g.hire("porter").unwrap();}
            if tree::lit(&g.lineage).is_some_and(|w|w.id=="scout"){g.hire("scout").unwrap();actions.push(json!({"action":"hire","id":"scout","manual":n}));break;}
        }
        assert!(tree::hired(&g.lineage,"scout"));
        let mut milestones=Vec::new();
        for check in 1..=days*3 {
            check_in(&mut g,&mut actions);
            let report=offline::run_offline_counts(&mut g,8*3600);
            for find in report.discoveries.iter().filter(|f|["hearthglass","hearthglass_hood","hearthglass_boots"].contains(&f.kind.as_str())) {
                milestones.push(json!({"check":check,"hours":check*8,"find":find,"victories":g.lineage.town.piece_victories}));
                fs::write(dir.join(format!("earned-{}.game.json",find.kind)),g.save()).unwrap();
                fs::write(dir.join(format!("earned-{}.lineage.json",find.kind)),serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
            }
            actions.push(json!({"action":"absence","seconds":28800,"check":check,"best":g.lineage.best_depth,"runs":report.runs,"gold":g.lineage.gold,"source_victories":g.lineage.town.piece_victories}));
            if ["hearthglass","hearthglass_hood","hearthglass_boots"].iter().all(|k|g.lineage.town.owned_shapes.contains(*k)){break;}
        }
        fs::write(dir.join("actions.json"),serde_json::to_vec_pretty(&actions).unwrap()).unwrap();
        fs::write(dir.join("final.game.json"),g.save()).unwrap();
        let row=json!({"seed":seed,"earned":true,"milestones":milestones,"owned":g.lineage.town.owned_shapes,"victories":g.lineage.town.piece_victories,"best":g.lineage.best_depth,"clock_s":g.lineage.clock_s});
        println!("{row}");rows.push(row);
        fs::write(out.join("survey.json"),serde_json::to_vec_pretty(&json!({"protocol":"Fresh House; real manual sends, ready Porter/Scout hires <=5; eight-hour public offline reports; affordable Forge/Legacy purchases and offered packages; actual Follow/eligible source-focus actions. No grants. Bounded14days default.","days":days,"rows":rows})).unwrap()).unwrap();
    }
}
