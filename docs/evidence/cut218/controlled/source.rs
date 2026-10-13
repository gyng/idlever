use idlever_core::{bloodlines::Session,turn::{self,Src}};
use std::{fs,path::PathBuf};
use serde_json::json;
fn main(){
 let mut args=std::env::args().skip(1);let input=PathBuf::from(args.next().unwrap());let out=PathBuf::from(args.next().unwrap());fs::create_dir_all(&out).unwrap();
 let mut s=Session::load(&fs::read_to_string(&input).unwrap()).unwrap();let before=s.lineage();assert_eq!(before.hero_slots.len(),3);
 s.set_worker("scout",false).unwrap();s.advance(2_000_000);
 let ready=s.lineage();assert!(ready.hero_slots.iter().all(|h|h.recovery_s==0&&h.rest_s==0.));
 let mut actions=vec![];
 for id in [1,2,3]{s.select_bloodline(id).unwrap();let snap=s.active.try_send().unwrap();let (r,mut cx)=s.active.ctx();turn::damage_hero(r,&mut cx,999,&Src::Gas);s.active.finish_run().unwrap();let l=s.lineage();let h=l.hero_slots.iter().find(|h|h.id==id).unwrap();assert_eq!(h.life_state,"reincarnating");assert_eq!(h.recovery_s,60);actions.push(json!({"id":id,"real_run_id":snap.run.id,"last_exit":s.active.last_exit,"phase":h.life_state,"recovery_s":h.recovery_s}));}
 s.select_bloodline(1).unwrap();let l=s.lineage();assert!(l.hero_slots.iter().all(|h|h.life_state=="reincarnating"&&h.recovery_s==60));assert!(l.persistent_hero.as_ref().unwrap().device.available);
 fs::write(out.join("three-controlled-reincarnating.game.json"),s.save()).unwrap();fs::write(out.join("three-controlled-reincarnating.lineage.json"),serde_json::to_vec_pretty(&l).unwrap()).unwrap();
 fs::write(out.join("manifest.json"),serde_json::to_vec_pretty(&json!({"source_commit":"03562fee","controlled":true,"earned_paid_roster":true,"earned_death":false,"input":input,"protocol":"Load genuine paid3roster; publicScoutpause; actual2000sadvancepastrest; eachpublicselection+Game.try_send+real999Gasdamage+Core.finish_run atsameclock. No life/receipt metadata authored.","before_gold":before.gold,"ready_gold":ready.gold,"after_gold":l.gold,"actions":actions})).unwrap()).unwrap();
 s.advance(2_000);assert!(s.lineage().hero_slots.iter().all(|h|h.life_state=="recovering"));fs::write(out.join("three-controlled-recovering.game.json"),s.save()).unwrap();
 s.advance(60_000);assert!(s.lineage().hero_slots.iter().all(|h|h.life_state=="ready"));fs::write(out.join("three-controlled-ready.game.json"),s.save()).unwrap();
 println!("PASS actual isolated Core3reincarnations/recovering/ready; paidroster provenance, controlled Gas deaths");
}
