//! Cut253 earned diagnostic; public actions only, no grants. See earned-preparation/protocol.md.
//! advanced_campaign OUT_DIR SEED CLASS [--from PLAIN_SESSION] [--hours 336] [--resume]
use idlever_core::{bloodlines::Session, class_tree, hero::Class, legacy, persistent, tree, Ev};
#[path = "gunner_support/mod.rs"]
mod support;
use serde_json::{json, Value};
use std::{fs, path::{Path, PathBuf}, process::Command};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
fn digest(path: &Path) -> Result<String> {
    let o = Command::new("sha256sum").arg(path).output()?;
    if !o.status.success() { return Err(format!("hash failed: {}", path.display()).into()); }
    Ok(String::from_utf8(o.stdout)?.split_whitespace().next().ok_or("empty hash")?.into())
}
fn sources(dir: &Path, paths: &mut Vec<PathBuf>) -> Result<()> {
    for item in fs::read_dir(dir)? { let p=item?.path();
        if p.is_dir() { sources(&p, paths)?; }
        else if p.extension().is_some_and(|e|e=="rs") { paths.push(p); }
    } Ok(())
}
fn identity() -> Result<Value> {
    let mut paths=vec![PathBuf::from("Cargo.lock"),PathBuf::from("crates/idlever-core/Cargo.toml"),PathBuf::from("crates/idlever-core/examples/advanced_campaign.rs"),PathBuf::from("crates/idlever-core/examples/gunner_support/mod.rs")];
    sources(Path::new("crates/idlever-core/src"),&mut paths)?;
    paths.sort(); let mut hashes=serde_json::Map::new();
    for p in paths { hashes.insert(p.to_string_lossy().into_owned(),json!(digest(&p)?)); }
    Ok(json!({"sources":hashes,"binary_sha256":digest(&std::env::current_exe()?)?}))
}
fn immutable(path:&Path, raw:&str)->Result<()> {
    if path.exists() { if fs::read_to_string(path)?!=raw {return Err(format!("immutable output differs: {}",path.display()).into());} }
    else {fs::write(path,raw)?;} Ok(())
}
fn emit(dir:&Path,name:&str,value:&Value)->Result<()> {immutable(&dir.join(name),&(serde_json::to_string_pretty(value)?+"\n"))}
fn stamp(s:&Session)->Value {
    let l=&s.active.lineage;
    json!({"seed":l.seed,"class":l.class.name(),"owner":s.selected,"hero":persistent::name(l),
        "clock_s":l.clock_s,"ticks":l.total_turns,"gold":l.gold,"best":legacy::deepest(l),
        "level":l.class_level(),"completed":l.runs_banked.saturating_add(l.runs_returned).saturating_add(l.runs_died),
        "deaths":l.runs_died,"persistent":l.persistent,"kit":l.kit,"orders":l.orders,
        "scout":tree::hired(l,"scout"),"class_tree":s.lineage().class_tree,
        "live":s.run.as_ref().map(|r|json!({"id":r.id,"turn":r.turn,"class":r.hero.class.name(),"weapon":r.hero.weapon.as_ref().map(|w|&w.kind)}))})
}
fn stage(s:&Session)->usize {
    let l=&s.active.lineage;
    if !tree::hired(l,"scout") {return 0;}
    let done=l.runs_banked.saturating_add(l.runs_returned).saturating_add(l.runs_died);
    [(9,23,24),(10,28,32),(10,29,48),(10,33,64)].into_iter()
        .take_while(|&(level,depth,runs)|l.class_level()>=level&&legacy::deepest(l)>=depth&&done>=runs).count()
}
fn chain(class:Class)->&'static str { match class {
    Class::Fighter=>"fighter_holdfast",Class::Rogue=>"rogue_ghostwalk",Class::Ranger=>"ranger_moving_line",
    Class::Caster=>"caster_conduct",Class::Gunner=>"gunner_long_watch",_=>unreachable!()}}
fn checkpoint(dir:&Path,s:&Session,state:&mut Value,n:usize)->Result<()> {
    let path=format!("campaign-{n:04}.session.json"); immutable(&dir.join(&path),&s.save())?;
    state["save"]=json!(path); state["observed"]=stamp(s);
    fs::write(dir.join("state.tmp"),serde_json::to_string_pretty(state)?+"\n")?;
    fs::rename(dir.join("state.tmp"),dir.join("state.json"))?; Ok(())
}
fn action(s:&Session,method:&str,detail:Value,before:i32)->Value {
    json!({"clock_s":s.active.lineage.clock_s,"method":method,"detail":detail,"gold_before":before,"gold_after":s.active.lineage.gold})
}
fn prepare(s:&mut Session,class:Class)->Result<Vec<Value>> {
    if persistent::away(&s.active) {return Err("campaign check-in did not actually reach home".into());}
    let mut actions=vec![];
    if s.active.lineage.ended {
        let tier=s.active.lineage.endgame.as_ref().map_or(1,|p|p.tier.max(1));
        let gold=s.active.lineage.gold;s.begin_descent(tier)?;actions.push(action(s,"begin_descent",json!(tier),gold));
    }
    let gold=s.active.lineage.gold;let paid=support::camp(s,false);
    actions.push(action(s,"existing_paid_camp",json!(paid),gold));
    if tree::hired(&s.active.lineage,"scout")&&!tree::on(&s.active.lineage,"scout") {
        let gold=s.active.lineage.gold;s.set_worker("scout",true)?;
        actions.push(action(s,"set_worker",json!({"id":"scout","on":true}),gold));
    }
    if s.active.lineage.class!=class {
        if let Some(id)=class.unlock().filter(|id|!s.active.lineage.unlocks.contains(*id)) {
            let gold=s.active.lineage.gold;
            match s.buy(id) {Ok(_)=>actions.push(action(s,"buy_unlock",json!(id),gold)),Err(reason)=>actions.push(action(s,"unlock_refused",json!({"id":id,"reason":reason}),gold))}
        }
        if class.unlock().is_none_or(|id|s.active.lineage.unlocks.contains(id)) {
            let gold=s.active.lineage.gold;s.set_class(class.name())?;actions.push(action(s,"set_class",json!(class.name()),gold));
        }
    }
    Ok(actions)
}
fn learn(s:&mut Session,id:&str,actions:&mut Vec<Value>)->Result<()> {
    let gold=s.active.lineage.gold;let before=s.save();let tree=class_tree::offers(&s.active.lineage,false);
    let node=tree.nodes.iter().find(|n|n.id==id).ok_or("unknown node")?;
    if !node.available {return Err(format!("earned node {id} blocked: {:?}",node.blocked).into());}
    s.learn_class_skill(id)?;assert_eq!(s.active.lineage.gold,gold);
    actions.push(action(s,"learn_class_skill",json!({"id":id,"points_before":tree.points,"before_save_bytes":before.len()}),gold));Ok(())
}
fn pair(dir:&Path,source:&Session,class:Class)->Result<()> {
    assert_eq!(source.active.lineage.class,class);
    assert!(source.active.lineage.class_paths.get(class.name()).is_none_or(|ids|ids.is_empty()),"reference must have no selected current-class skills");
    let pairdir=dir.join("pair");fs::create_dir_all(&pairdir)?;
    immutable(&pairdir.join("no-selection.session.json"),&source.save())?;
    let frontier=source;
    let mut common=source.clone();let common_actions=prepare(&mut common,class)?;
    emit(&pairdir,"common-preparation.actions.json",&json!(common_actions))?;
    immutable(&pairdir.join("common-prepared-no-selection.session.json"),&common.save())?;
    let source=&common;
    let catalogue=class_tree::catalogue(class);let mut ids=vec![];let mut next=Some(chain(class).to_owned());
    while let Some(id)=next {let n=catalogue.iter().find(|n|n.id==id).ok_or("missing ancestor")?;ids.push(id);next=n.parent.clone();}ids.reverse();
    for label in ["no-selection","parent-only","selected"] {
        let selected=label=="selected";
        let branch=pairdir.join(label);fs::create_dir_all(&branch)?;
        if branch.join("result.json").exists() {continue;}
        let mut s=source.clone();let mut actions=vec![];
        for (i,id) in ids.iter().enumerate() {if selected||(label=="parent-only"&&i+1<ids.len()) {learn(&mut s,id,&mut actions)?;}}
        emit(&branch,"actions.json",&json!(actions))?;immutable(&branch.join("prepared.session.json"),&s.save())?;
        let origin=s.save();let mut records=vec![];let mut receipts=vec![];
        let mut last=s.active.lineage.run_log.iter().map(|r|r.id).max().unwrap_or(0);
        for slice in 1..=480 {
            let report=s.run_offline_slice(60,slice==480);
            if slice==1 {immutable(&branch.join("first-slice-with-send-capsule.session.json"),&s.save())?;}
            for rec in s.active.lineage.run_log.iter().filter(|r|r.id>last) {
                let replay=s.replay(rec.id).ok_or("actual run capsule missing before receipt capture")?;
                assert_eq!(replay.ticks,rec.turns,"actual/replay duration mismatch");
                let named:Vec<_>=replay.floors.iter().flat_map(|f|&f.events).filter(|e|matches!(e,Ev::ClassInteraction {..})).collect();
                receipts.push(json!({"run":rec,"replay_hash":replay.hash,"replay_ticks":replay.ticks,"kind":"reconstructed_named_events_endpoint_duration_checked","interactions":named}));
                records.push(json!(rec));
            }
            last=last.max(s.active.lineage.run_log.iter().map(|r|r.id).max().unwrap_or(0));
            if slice==480 {assert!(!report.sampled);emit(&branch,"report.json",&json!(report))?;}
        }
        immutable(&branch.join("after.session.json"),&s.save())?;
        emit(&branch,"receipts.json",&json!(receipts))?;
        emit(&branch,"result.json",&json!({"before":stamp(source),"after":stamp(&s),"branch":label,"selected":selected,"chain":ids,
            "requested_seconds":28800,"actual_runs":records,"row_why":s.active.lineage.row_why(),
            "no_selection_source_unchanged":frontier.save()==fs::read_to_string(pairdir.join("no-selection.session.json"))?,
            "branch_origin_bytes":origin.len(),"receipt_limit":"Reconstructed events, not direct watched/event/RNG equivalence proof"}))?;
    } Ok(())
}
fn main()->Result<()> {
    let args:Vec<_>=std::env::args().collect();
    if args.len()<4 {return Err("advanced_campaign OUT SEED CLASS [--from PLAIN_SESSION] [--hours 336] [--resume]".into());}
    let dir=Path::new(&args[1]);let seed:u64=args[2].parse()?;if ![1,3,5].contains(&seed){return Err("genuine cohort seeds are1/3/5".into());}
    let class=Class::parse(&args[3]).filter(|c|Class::ALL.contains(c)).ok_or("original class required")?;
    let option=|name:&str|args.iter().position(|a|a==name).and_then(|i|args.get(i+1));
    let hours:u64=option("--hours").map_or(Ok(336),|v|v.parse())?;if hours==0||!hours.is_multiple_of(8){return Err("positive eight-hour horizon required".into());}
    idlever_core::chronicle::use_shipping_words();idlever_core::forecast::set_parallel_sims(false);
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()||std::env::var_os("IDLEVER_BALANCE_FILE").is_some(){return Err("no diagnostic tuning overrides".into());}
    let from=option("--from");let origin=if let Some(path)=from {fs::read_to_string(path)?}else{Session::new(seed).save()};
    let id=identity()?;let config=json!({"seed":seed,"class":class.name(),"hours":hours,"from":from,"identity":id});
    let (mut s,mut state)=if args.iter().any(|a|a=="--resume") {
        let state:Value=serde_json::from_str(&fs::read_to_string(dir.join("state.json"))?)?;
        if state["config"]!=config||fs::read_to_string(dir.join("original.session.json"))?!=origin {return Err("resume source/config/binary mismatch".into());}
        (Session::load(&fs::read_to_string(dir.join(state["save"].as_str().ok_or("missing checkpoint")?))?)?,state)
    }else{
        fs::create_dir(dir)?;immutable(&dir.join("original.session.json"),&origin)?;
        let mut s=Session::load(&origin)?;
        if !s.others.is_empty()||s.selected!=1||s.active.lineage.seed!=seed||persistent::away(&s.active){return Err("single genuine matching-seed home source required".into());}
        if !s.active.lineage.town.home.unwrap_or(false) {s.build_town("house")?;}
        let mut state=json!({"config":config,"steps":0,"requested_s":0,"fresh_origin":from.is_none(),"checks":[],"stages":[],"paired":false,"status":"RUNNING"});
        checkpoint(dir,&s,&mut state,0)?;(s,state)
    };
    // A crash during a paired branch must resume the exact retained frontier,
    // before any further campaign time or paid preparation is performed.
    if s.active.lineage.class==class&&stage(&s)>=3&&!state["paired"].as_bool().unwrap() {
        let frontier=dir.join("paired-frontier.session.json");
        immutable(&frontier,&s.save())?;
        pair(dir,&s,class)?;state["paired"]=json!(true);
        let n=state["steps"].as_u64().unwrap() as usize;checkpoint(dir,&s,&mut state,n)?;
    }
    while state["requested_s"].as_u64().unwrap()<hours*3600 && (s.active.lineage.class!=class||stage(&s)<4) {
        let n=state["steps"].as_u64().unwrap() as usize+1;
        let mut actions=prepare(&mut s,class)?;
        if !tree::auto_send(&s.active.lineage) {
            let remaining=persistent::remaining(&s.active.lineage);
            if remaining>0 {s.advance(remaining.saturating_mul(100));}
            let gold=s.active.lineage.gold;s.try_send()?;actions.push(action(&s,"manual_send",json!(null),gold));
        }
        let quantum=if tree::auto_send(&s.active.lineage){28800}else{60};
        let duration=quantum.min(hours*3600-state["requested_s"].as_u64().unwrap());
        let report=s.run_offline_mode(duration,false,false);assert!(!report.sampled);
        emit(dir,&format!("campaign-{n:04}.report.json"),&json!(report))?;
        let observed=stamp(&s);state["checks"].as_array_mut().unwrap().push(json!({"step":n,"actions":actions,"requested_s":duration,"nominal_quantum_s":quantum,"shortened_final_sample":duration<quantum,"observed":observed}));
        let got=if s.active.lineage.class==class {stage(&s)}else{0};
        let seen=state["stages"].as_array().unwrap().len();
        for k in seen+1..=got {state["stages"].as_array_mut().unwrap().push(json!({"stage":k,"observed_step":n,"clock_s":s.active.lineage.clock_s,"lifetime_deaths":s.active.lineage.runs_died,"save":format!("campaign-{n:04}.session.json")}));}
        state["steps"]=json!(n);state["requested_s"]=json!(state["requested_s"].as_u64().unwrap()+duration);
        checkpoint(dir,&s,&mut state,n)?;
        if got>=3&&!state["paired"].as_bool().unwrap() {
            immutable(&dir.join("paired-frontier.session.json"),&s.save())?;
            pair(dir,&s,class)?;state["paired"]=json!(true);checkpoint(dir,&s,&mut state,n)?;
        }
        println!("{}",json!({"seed":seed,"class":class.name(),"step":n,"stage":got,"clock_s":s.active.lineage.clock_s,"deaths":s.active.lineage.runs_died}));
    }
    state["status"]=json!(if stage(&s)==4&&s.active.lineage.class==class {"ALL_STAGES_OBSERVED"}else{"CENSORED"});
    state["zero_defeat_all_stages"]=json!(state["fresh_origin"]==true&&state["status"]=="ALL_STAGES_OBSERVED"&&s.active.lineage.runs_died==0);
    if identity()?!=state["config"]["identity"] {return Err("runtime source/binary changed during campaign; evidence is not final-source bound".into());}
    let n=state["steps"].as_u64().unwrap() as usize;checkpoint(dir,&s,&mut state,n)?;
    emit(dir,"result.json",&state)?;Ok(())
}
