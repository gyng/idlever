//! Controlled all-pattern UI fixtures, plus current-schema earned-save exports.
//! Controlled placement/damage/class qualification is never earned pacing proof.
use idlever_core::{Game,Ev,hero::Class,monster::Monster,turn::{self,Src},engine::ExitTier};
use serde_json::json;
use std::{fs,path::{Path,PathBuf}};
fn save(dir:&Path,name:&str,g:&Game) {
    fs::write(dir.join(format!("{name}.game.json")),g.save()).unwrap();
    fs::write(dir.join(format!("{name}.lineage.json")),serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
}
fn main() {
    let mut args=std::env::args().skip(1);
    let out=PathBuf::from(args.next().expect("output directory"));let earned=PathBuf::from(args.next().expect("previous earned raw directory"));fs::create_dir_all(&out).unwrap();
    let controlled=out.join("controlled");fs::create_dir_all(&controlled).unwrap();
    let mut g=Game::new(215);g.build_town("house").unwrap();g.try_send().unwrap();
    for kind in ["goblin_warlord","bloat_mother","lich"] {
        let (r,mut cx)=g.ctx();let id=r.new_id();let mut m=Monster::spawn(id,kind,r.hero.pos.step((1,0)),r.depth);m.awake=true;
        r.monsters.push(m);let index=r.monsters.len()-1;r.aimed=true;
        assert!(turn::damage_monster(r,&mut cx,index,10000,&Src::Hero{ranged:false}));
    }
    assert_eq!(g.lineage.town.owned_shapes.len(),3);
    fs::write(controlled.join("actual-controlled-discovery-events.json"),serde_json::to_vec_pretty(&g.events.iter().filter(|e|matches!(e,Ev::Discovery{..}|Ev::Pickup{..})).collect::<Vec<_>>()).unwrap()).unwrap();
    let mut death=g.clone();
    let (r,mut cx)=death.ctx();turn::damage_hero(r,&mut cx,999,&Src::Gas);death.finish_run().unwrap();
    assert_eq!(death.last_exit.as_ref().unwrap().tier,"death");assert_eq!(death.last_exit.as_ref().unwrap().discoveries.len(),3);
    save(&controlled,"all3-actual-death-receipt",&death);
    let (r,mut cx)=g.ctx();turn::end_run(r,&mut cx,ExitTier::Return);g.finish_run().unwrap();
    g.advance(3600*1000);assert!(!idlever_core::persistent::away(&g));save(&controlled,"fighter-all3-home",&g);
    // Qualification is controlled; the class mutation itself uses the real API.
    g.lineage.unlocks.insert("gunner".into());g.set_class("gunner").unwrap();assert_eq!(g.lineage.class,Class::Gunner);
    save(&controlled,"gunner-all3-home",&g);
    fs::write(controlled.join("manifest.json"),serde_json::to_vec_pretty(&json!({"controlled":true,"earned":false,"protocol":"fresh House/public Send; explicitly controlled natural boss placement and10000 directdamage; actual drop/pickup/receipt/Return; actual1h advance finishes home rest; controlled Gunner qualification, then actual setClass API","death_fixture":"all3-actual-death-receipt.game.json clones the actual controlled post-drop state, then actual999Gas damage/Core death/end/finish, before batch receipt clear. No Discovery/ExitLine was authored.","not_proof":"These files do not certify earned boss reach, class unlock timing or progression balance. No receipt/event was fabricated."})).unwrap()).unwrap();
    for seed in [1,13] {
        let source=earned.join(format!("seed-{seed}"));let dest=out.join(format!("seed-{seed}"));fs::create_dir_all(&dest).unwrap();
        for stage in ["earned-after-hour-find","earned-replay-before-find","earned-replay-after-find","earned-owned-home"] {
            let current=Game::load(&fs::read_to_string(source.join(format!("{stage}.game.json"))).unwrap()).unwrap();
            assert!(current.batch.discoveries.iter().chain(current.run.iter().flat_map(|r|r.discoveries.iter())).all(|d|d.kind=="crownsplitter"&&d.rarity==idlever_core::item::Rarity::Legendary));
            save(&dest,stage,&current);
        }
        let mut replay=Game::load(&fs::read_to_string(dest.join("earned-replay-before-find.game.json")).unwrap()).unwrap();
        let step=replay.step(1);
        assert!(step.events.iter().any(|e|matches!(e,Ev::Discovery{find,..}if find.kind=="crownsplitter"&&find.rarity==idlever_core::item::Rarity::Legendary)));
        fs::write(dest.join("actual-discovery-events.json"),serde_json::to_vec_pretty(&step.events).unwrap()).unwrap();
        for name in ["manifest.json","actions.json"] {fs::copy(source.join(name),dest.join(name)).unwrap();}
        let mut manifest:serde_json::Value=serde_json::from_slice(&fs::read(dest.join("manifest.json")).unwrap()).unwrap();
        manifest["schema_export"]=json!("Current Rust load/save export of unchanged earned raw source; all prior discovery entries verified named Crownsplitter. Rarity metadata added; actual next-tick discovery reproduced by current step(1), with no grants or synthetic kills.");
        fs::write(dest.join("manifest.json"),serde_json::to_vec_pretty(&manifest).unwrap()).unwrap();
    }
    println!("controlled all3 plus current-schema earned seeds1/13 exported");
}
