//! Actual earned Cut203 comparison, no grants. Same starting wall and simulation seeds.
use idlever_core::{Game, kit, offline, tree};
use serde_json::json;
use std::{fs, path::PathBuf};

fn main() {
    let out = PathBuf::from(std::env::args().nth(1).expect("output directory"));
    fs::create_dir_all(&out).unwrap();
    let mut g = Game::new_resident(1);
    for _ in 0..3 {
        while let Some(id) = g.lineage().town.next.filter(|_| g.lineage().town.next_ready) { g.build_town(&id).unwrap(); }
        if tree::lit(&g.lineage).is_some_and(|n| n.id == "porter") { g.hire("porter").unwrap(); }
        g.send(); offline::run_offline_counts(&mut g, 1);
    }
    g.hire("scout").unwrap();
    offline::run_offline_counts(&mut g, 8*3600);
    assert!(g.lineage.forge.get("axe").is_some_and(|r| r.craftable));
    assert!(g.lineage.forge.get("leather").is_some_and(|r| r.craftable));
    fs::write(out.join("earned-wall.json"),g.save()).unwrap();
    let wall = g.lineage.best_depth;
    let mut results = Vec::new();
    for (name,weapon,armour) in [("Steady blade","sword","leather"),("Heavy strike","axe","none")] {
        let config = kit::StartingConfig { weapon: Some(weapon.into()), armour: Some(armour.into()), supplies: vec![] };
        let mut run = g.clone();
        let id = kit::save_starting(&mut run,name,config,None).unwrap();
        kit::select_starting(&mut run,&id).unwrap();
        let mut h = idlever_core::hero::Hero::new(run.lineage.class,idlever_core::geom::Pos::new(0,0));
        kit::equip(&run.lineage,&mut h);
        fs::write(out.join(format!("{}.json",name.replace(' ',"-"))),run.save()).unwrap();
        let before = run.lineage.gold;
        let report = offline::run_offline_counts(&mut run,3600);
        results.push(json!({"name":name,"wall":wall,"damage":h.atk(),"speed":h.speed(),"armour":h.def(),
            "runs":report.runs,"gold_delta":run.lineage.gold-before,"deepest":run.lineage.best_depth}));
    }
    let report = json!({"fixture":"earned: fresh seed1, three manual delves, paid Scout, actual8h","forge":g.lineage.forge,"matched_1h":results});
    fs::write(out.join("comparison.json"),serde_json::to_vec_pretty(&report).unwrap()).unwrap();
    println!("{}",report);
}
