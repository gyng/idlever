//! Genuine historical saves: retirement purity and separately measured oath pricing.
use idlever_core::bloodlines::Session;
use serde_json::json;
use std::{fs,path::Path};
fn main() {
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../docs/evidence/cut222/core");
 let mut entries=Vec::new();
 for id in ["wishes-0","wishes-1","wishes-5","waiting-song","wishes-1-pending-news","wishes-5-pending-news"] {
  let text=fs::read_to_string(root.join("baseline-preserved-news").join(format!("{id}.session.json"))).unwrap();
  let mut whole=Session::load(&text).unwrap();let before=whole.save();let gold=whole.lineage.gold;
  let report=whole.run_offline_slice(86400,true);let saved=whole.save();
  let mut split=Session::load(&before).unwrap();
  for _ in 0..2 {split.run_offline_slice(28800,false);split=Session::load(&split.save()).unwrap();}
  let sliced=split.run_offline_slice(28800,true);
  assert!(saved==split.save());assert_eq!(serde_json::to_value(&report).unwrap(),serde_json::to_value(&sliced).unwrap());assert_eq!(whole.lineage.gold,gold);
  for _ in 0..3 {whole.lineage();}assert!(whole.save()==saved);
  fs::write(root.join(format!("{id}.after24h.session.json")),&saved).unwrap();
  entries.push(json!({"id":id,"goldBefore":gold,"goldAfter":whole.lineage.gold,"day":whole.lineage.day,"history":whole.lineage.feats.wishes,"wishAt":whole.lineage.feats.wish_at,"historicalNews":report.feats.iter().filter(|n|n.k=="wish").collect::<Vec<_>>(),"exact24hParity":true,"readSaveEqual":true}));
 }
 // The old whole24h result was recovered verbatim from the preserved failed assertion,
 // not edited. The swear operation is unchanged; compare its actual paid transaction.
 let mut old=Session::load(&fs::read_to_string(root.join("preexisting-whole24h.session.json")).unwrap()).unwrap();old.select_bloodline(1).unwrap();
 let mut new=Session::load(&fs::read_to_string(root.join("wishes-0.after24h.session.json")).unwrap()).unwrap();new.select_bloodline(1).unwrap();
 let id=old.lineage.oaths[0].id.clone();assert_eq!(new.lineage.oaths[0].id,id);
 let old_gold=old.lineage.gold;let new_gold=new.lineage.gold;
 old.swear_oath(&id).unwrap();new.swear_oath(&id).unwrap();
 assert_eq!(old_gold-old.lineage.gold,3510);assert_eq!(new_gold-new.lineage.gold,4250);
 let pricing=json!({"bloodline":1,"oath":id,"oldWholeActualDebit":old_gold-old.lineage.gold,"correctedActualDebit":new_gold-new.lineage.gold,"delta":740,"lastClosedIncome":new.lineage.last_day_net,"cause":"Real day closes consistently; no wish replacement","provenance":"old whole24h retained verbatim from original failed assertion; public selectBloodline and swearOath on both actual worlds"});
 fs::write(root.join("retirement-checks-final.json"),serde_json::to_string_pretty(&json!({"entries":entries,"engagingOathPricing":pricing})).unwrap()).unwrap();
 println!("PASS6 genuine24h read/history/whole-slice-reload; actual oath debit3510 ->4250");
}
