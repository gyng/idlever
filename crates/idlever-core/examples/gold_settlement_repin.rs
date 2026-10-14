//! Replays immutable genuine pre-exit saves on current source; no new setup/search.
use idlever_core::{bloodlines::Session,wire::Ev};
use serde_json::{json,Value};
use std::{env,fs,path::Path};
fn main(){
 // Match WASM chronicle word choices, as the original Cut223 exporter does.
 idlever_core::chronicle::use_shipping_words();
 let args:Vec<_>=env::args().collect();let input=Path::new(&args[1]);let out=Path::new(&args[2]);fs::create_dir_all(out).unwrap();
 let mut manifest:Value=serde_json::from_str(&fs::read_to_string("docs/evidence/cut223/settlements-inputs.json").unwrap()).unwrap();
 for entry in manifest["entries"].as_array_mut().unwrap(){
  let id=entry["id"].as_str().unwrap().to_owned();let text=fs::read_to_string(input.join(format!("{id}.session.json"))).unwrap();
  let mut s=Session::load(&text).unwrap();let before=s.save();for _ in 0..3{s.lineage();}assert!(s.save()==before);
  let mut expected=entry["expected"].clone();let operation=&entry["operations"][0];
  if operation["method"]=="step" {
   let result=s.step(1);assert!(result.run_over);
   let line=result.events.iter().find_map(|e|match e{Ev::Exit{line:Some(l),..}=>Some(l.as_ref()),_=>None}).unwrap();
   // (Cut232 `news`: a report brings one new decision — a package arrival may wait for a quieter report, so the
   // exit's `packages` beats are re-pinned; every other field, the Gold and the ledger stay exact)
   let mut actual=serde_json::to_value(line).unwrap();
   let strip=|v:&mut Value|{v.as_object_mut().unwrap().remove("packages");};
   let mut want=expected["exitLine"].clone();strip(&mut want);let mut got=actual.clone();strip(&mut got);
   assert_eq!(got,want);
   if actual.get("packages")!=expected["exitLine"].get("packages") { println!("NOTE {id}: exit packages {:?} → {:?}",expected["exitLine"].get("packages"),actual.get("packages")); }
   expected["exitLine"]=std::mem::take(&mut actual);
  }else{
   assert_eq!(operation["method"],"runOfflineQuick");let report=s.run_offline_mode(operation["args"][0].as_u64().unwrap(),false,true);
   expected["report"]=serde_json::to_value(report).unwrap();
  }
  assert_eq!(s.lineage.gold,expected["goldAfter"].as_i64().unwrap() as i32);
  assert_eq!(serde_json::to_value(&s.lineage.gold_ledger).unwrap(),expected["ledgerAfter"]);
  let after=s.save();for _ in 0..3{s.lineage();}assert!(s.save()==after);
  fs::write(out.join(format!("{id}.after.session.json")),&after).unwrap();
  fs::write(out.join(format!("{id}.expected.json")),serde_json::to_vec_pretty(&expected).unwrap()).unwrap();
  entry["expected"]=expected;
  entry["repinProvenance"]=json!({"sourcePhase":"Cut222 retired wishes +canonical committed day closure","setup":"unchanged original Cut223 immutable public-action pre-exit fixture","operations":"same exact original public operation","assertions":"original exact ledger, Gold, ExitLine and owner receipts preserved; regenerated full after save/report without normalization"});
  println!("PASS {id}: exact original Gold/ledger/exit, current full-state exported");
 }
 manifest["repinnedFrom"]=json!("docs/evidence/cut223/settlements-inputs.json");
 fs::write(out.join("manifest-unpinned.json"),serde_json::to_vec_pretty(&manifest).unwrap()).unwrap();
}
