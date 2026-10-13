//! Read-only guidance over existing rules. No claims, rewards, RNG or progression are added.
use crate::{engine::LineageState, systems, town, tree};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Journal { pub bloodline_id:u32, pub seed:String, pub heir:u32, pub recommended:Option<String>, pub chapters:Vec<JournalChapter>, pub discoveries:Vec<JournalDiscovery>, pub quest:Option<JournalQuest> }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalChapter { pub id:String, pub title:String, pub entries:Vec<JournalEntry> }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalEntry { pub id:String, pub title:String, pub reason:String, pub effect:String, pub state:String, pub progress:Option<JournalProgress>, pub requirements:Vec<String>, pub action:Option<JournalAction> }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalProgress { pub current:u32, pub required:u32, pub unit:String }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalAction { pub kind:String, pub target:String, pub label:String, pub enabled:bool, pub blocked:Option<String> }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalDiscovery { pub id:String, pub title:String, pub body:String }
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct JournalQuest { pub goal:String, pub reward:String, pub progress:f64, pub done:bool, pub swap:bool, pub body:String }

fn action(kind:&str,target:&str,label:&str,blocked:Option<String>)->Option<JournalAction> {
    Some(JournalAction {kind:kind.into(),target:target.into(),label:label.into(),enabled:blocked.is_none(),blocked})
}
fn entry(id:&str,title:&str,reason:&str,effect:&str,state:&str)->JournalEntry {
    JournalEntry {id:id.into(),title:title.into(),reason:reason.into(),effect:effect.into(),state:state.into(),progress:None,requirements:vec![],action:None}
}
fn gate(l:&LineageState,id:&str,title:&str,reason:&str,effect:&str,target:&str)->JournalEntry {
    let open=systems::is_open(l,id);
    let mut e=entry(id,title,reason,effect,if open {"complete"} else {"later"});
    if let Some((met,age,fallback,ready))=systems::journal_gate(l,id) {
        if !open && ready {e.state="ready".into();e.requirements.push("Opens at the next progression update".into());}
        if !met {e.requirements.push(systems::SYSTEMS.iter().find(|s|s.id==id).unwrap().trigger.into());}
        if l.age_h()<age {e.requirements.push(format!("{age}h elapsed; {}h so far",l.age_h()));}
        if fallback>0 && !open {e.requirements.push(format!("Opens after {fallback}h even without the milestone"));}
    }
    e.action=action("open",target,title,(!open).then(||"Not unlocked".into()));e
}
pub fn wire(l:&LineageState,away:bool)->Journal {
    let home=l.town.home.unwrap_or(true);
    let mut house=entry("house","Build a house","Your first hero needs a home.","A resident arrives. Construction costs no Gold.",if home {"complete"} else {"ready"});
    house.action=action("build_town","house","Build house",home.then(||"Already built".into()));
    let n=tree::def("scout").unwrap();let count=tree::count(l,"scout");let hired=tree::hired(l,"scout");let price=tree::price(l,n);
    let scout_ready=tree::lit(l).is_some_and(|n|n.id=="scout")&&l.gold>=price&&home;
    let mut scout=entry("scout","Hire the Scout","Until the Scout is hired, each departure needs your tap.","The Scout sends the hero after each rest. Away progress becomes uncapped.",if hired {"complete"} else if scout_ready {"ready"} else {"later"});
    scout.progress=Some(JournalProgress {current:count.min(n.need),required:n.need,unit:"manual delves".into()});
    if !hired {scout.requirements.push(format!("{} manual delves; {price} Gold",n.need));if tree::ready(l,n)&&!scout_ready {scout.requirements.push(if l.gold<price {format!("{} more Gold",price-l.gold)} else {"Hire the earlier ready worker first".into()});}}
    scout.action=action("hire","scout","Hire Scout",(!scout_ready||hired).then(||if hired {"Already hired".into()} else {"Requirements unmet".into()}));
    if hired {
        scout.action=action("open","workers","Workers",None);
        scout.effect="When enabled, the Scout sends the hero after each rest. Pausing the worker stops automatic departures.".into();
        if !tree::on(l,"scout") {scout.state="active".into();scout.requirements.push("Enable the Scout in Workers".into());}
    }
    let p=tree::def("porter").unwrap();let porter_hired=tree::hired(l,"porter");let porter_ready=home&&tree::lit(l).is_some_and(|n|n.id=="porter");
    let mut porter=entry("porter","Hire the Porter","Workers automate chores once their milestones are ready.","Hiring costs no Gold. The Porter collects the actual haul; new towns already receive returned Gold automatically.",if porter_hired {"complete"} else if porter_ready {"ready"} else {"later"});
    porter.progress=Some(JournalProgress {current:tree::count(l,"porter").min(p.need),required:p.need,unit:"hauls".into()});
    if !porter_hired {porter.requirements.push(format!("{} hauls;0 Gold",p.need));}
    porter.action=action("hire","porter","Hire Porter",(!porter_ready||porter_hired).then(||"Requirements unmet".into()));
    let mut entries=vec![house,porter,scout];
    for (id,title,reason,effect) in [("blacksmith","Build the Forge","Permanent upgrades change every future starting kit.","Spend Gold once on upgrades. Unlocked gear and supplies are free to reuse."),("kennel","Build the Kennel","Companions can join your builds.","Manage your tamed companions and their party slots."),("bank","Build Savings","Spare Gold can earn interest.","Deposits earn2% per night before worker bonuses; withdrawals return your Gold.")] {
        let built=town::built(l,id);let ready=town::build_ready(l,id);let mut e=entry(id,title,reason,effect,if built {"complete"} else if ready {"ready"} else {"later"});
        if !built&&!ready {e.requirements.push(match id {"blacksmith"=>"Bank at a checkpoint or bring home Gold".into(),"kennel"=>"Tame a pet with a leash or bring home a companion".into(),_=>format!("Complete a positive-income night; hold its net Gold (currently {})",l.last_night_net)});if !home {e.requirements.push("Build a house".into());}}
        e.action=action("build_town",id,title,(!ready).then(||if built {"Already built".into()} else {"Milestone unmet".into()}));entries.push(e);
    }
    let mut bloodline=entry("bloodlines","More bloodlines","Each bloodline keeps its own build and progression.","An additional resident costs250 Gold. The town supports three bloodlines.",if home {"active"} else {"later"});
    bloodline.requirements=vec![format!("{} Gold for another resident",crate::bloodlines::SLOT_PRICE)];bloodline.action=action("open","legacy","Bloodlines",(!home).then(||"Build a house".into()));entries.push(bloodline);
    entries.last_mut().unwrap().effect=format!("An additional resident costs{} Gold. The town supports{} bloodlines.",crate::bloodlines::SLOT_PRICE,crate::bloodlines::SLOT_CAP);
    let mut builds=vec![gate(l,"loadout","Reusable Loadouts","Try another build without paying for each departure.","Choose owned starting shapes and save up to eight named kits. Prepared items refill free.","loadouts"),gate(l,"tactics","Tactics","Tactics choose when the hero uses learned abilities.","Equip optional policy packages. Your choices change future delves.","tactics"),gate(l,"reorder","Orders","Workers can follow your standing choices.","Adjust automation priorities. Hired workers carry out enabled orders.","orders"),gate(l,"heirs","Legacy","A death leaves knowledge and bloodline progress.","Review Legacy and the cause of the last death.","legacy")];
    let class=crate::class_tree::offers(l,away);let node=class.nodes.iter().find(|n|!n.owned);
    let mut more_classes=gate(l,"class","More classes","Classes bring different weapons and abilities.","Meet the real class unlock requirements, then choose your role at home.","class");
    if !systems::is_open(l,"class") {
        for id in ["ranger","caster"] {if !l.unlocks.contains(id) {let d=crate::meta::def(id).unwrap();more_classes.requirements.push(format!("{id}:{} Marks; {}",d.cost,crate::meta::tier_need(d.tier)));}}
    }
    builds.push(more_classes);
    let all_owned=class.nodes.iter().all(|n|n.owned);
    let mut e=entry("class_tree","Class builds","Class policies add optional branches to your build.","Learn cumulative class policies; changing a build does not erase earned class XP.",if all_owned {"complete"} else if class.nodes.iter().any(|n|n.available) {"ready"} else {"later"});
    if let Some(n)=node {e.requirements=vec![format!("Level{}; historical depth{}; a class point",n.required_level,n.required_depth)];}
    if let Some(blocked)=class.blocked {e.requirements.push(blocked);}
    e.progress=Some(JournalProgress {current:class.nodes.iter().filter(|n|n.owned).count() as u32,required:class.nodes.len() as u32,unit:"class policies learned".into()});e.action=action("open","class","Class tree",(!home).then(||"Build a house".into()));builds.push(e);
    if let Some(e)=builds.iter_mut().find(|e|e.id=="loadout") {if home {e.state="ready".into();e.action=action("open","loadouts","Loadouts",None);e.requirements.clear();}}
    let mut pets=entry("tame","Tame with a leash","A leash can turn a suitable creature into a companion.","Prepare a leash free. Taming needs a stray or suitable weakened creature and an open party slot.",if l.tamed_kinds()>0 {"complete"} else {"active"});
    pets.action=action("open","companions","Companions",(!home).then(||"Build a house".into()));builds.push(pets);
    let completed=l.expeditions>0;let mut delve=entry("delve",if completed {"Delve again"} else {"Delve"},"The hero chooses actions and fights on his own.","A completed delve earns experience, discoveries and its actual returned Gold.",if away {"active"} else if home {"ready"} else {"later"});
    delve.action=if away {action("open","watch","Watch",None)} else {action("delve","","Delve",(!home).then(||"Build a house".into()))};
    let recovering=crate::persistent::remaining(l);
    if recovering>0 {
        let seconds=recovering.div_ceil(crate::offline::TICKS_PER_SECOND);
        delve.title="Recovery".into();delve.state="active".into();
        delve.reason=format!("The same hero returns through the reincarnation device. Recovery finishes in {seconds} seconds.");
        delve.requirements=vec![format!("Recover for {seconds} more seconds")];
        delve.action=action("delve","","Delve",Some("Finish recovery".into()));
    }
    let mut gold=entry("gold","Gold on return","Found loot converts once when picked up.","Alive returns keep all remaining carried Gold. Death keeps secured checkpoint Gold and named pet protection; ordinary unprotected carry is lost.",if completed {"complete"} else {"later"});gold.action=action("open","chronicle","Chronicle",(!completed).then(||"Complete a delve".into()));
    let quest=town::wire(l).quest.map(|q|JournalQuest {goal:q.goal,reward:q.reward.clone(),progress:q.progress,done:q.done,swap:q.swap,body:quest_reward(l,&q.reward,q.done)});
    let mut quest_entry=gate(l,"quests","Quest board","A quest gives a goal beyond the next depth record.","Progress settles automatically after a run. One free swap is available per day.","quests");
    quest_entry.action=None;
    if let Some(q)=&quest {
        quest_entry.state=if q.done {"complete"} else {"active"}.into();
        quest_entry.action=None;
        // The real board awards quests before its older shortcut's age gate. Show truth now.
        quest_entry.effect="Your current quest is shown here. Its progress and reward settle automatically after real runs.".into();
    }
    let discoveries=vec![];
    let recommended=if !home {"house"} else if away||recovering>0 {"delve"} else if porter_ready&&!porter_hired&&!hired {"porter"} else if scout_ready&&!hired || hired&&!tree::on(l,"scout") {"scout"} else if !hired {"delve"} else if let Some(e)=entries.iter().find(|e|e.state=="ready"&&e.id!="scout"&&e.id!="porter") {&e.id} else if let Some(e)=builds.iter().find(|e|e.id=="class_tree"&&e.state=="ready") {&e.id} else if systems::is_open(l,"loadout") {"loadout"} else {"delve"}.to_string();
    Journal {bloodline_id:l.bloodline_id,seed:l.seed.to_string(),heir:l.heir,recommended:Some(recommended),chapters:vec![JournalChapter{id:"town".into(),title:"Town".into(),entries},JournalChapter{id:"builds".into(),title:"Builds".into(),entries:builds},JournalChapter{id:"delving".into(),title:"Delving".into(),entries:vec![delve,gold,quest_entry]}],discoveries,quest}
}
fn quest_reward(l:&LineageState,reward:&str,done:bool)->String {
    let effect=match reward {
        "row"=>"Unlocks the first unowned rule slot, from five through ten. This adds space for an optional policy row.".to_string(),
        "slot"=>"Unlocks the first unowned companion slot, from two through four. You can field one more companion.".into(),
        "card"=>format!("Advances {} to its next package training threshold, if one remains.",crate::packages::name(&l.pkg.stance)),
        _=>"Adds this quest's title and two Marks. Marks buy permanent unlocks.".into(),
    };
    format!("{effect} {}",if done {"The reward was applied automatically at settlement."} else {"The reward applies automatically when a run completes the objective."})
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::Game;
    fn find<'a>(j:&'a Journal,id:&str)->&'a JournalEntry {j.chapters.iter().flat_map(|c|&c.entries).find(|e|e.id==id).unwrap()}
    #[test]
    fn fresh_guidance_manual_actions_and_reads_do_not_mutate() {
        let mut g=Game::new(208);let before=g.save();
        for _ in 0..3 {let j=g.lineage().journal.unwrap();assert_eq!(j.recommended.as_deref(),Some("house"));assert_eq!(j.seed,"208");assert!(find(&j,"house").action.as_ref().unwrap().enabled);}
        assert_eq!(before,g.save());
        assert!(g.hire("scout").is_err());assert_eq!(before,g.save());
        g.build_town("house").unwrap();let j=g.lineage().journal.unwrap();assert_eq!(j.recommended.as_deref(),Some("delve"));
        assert_eq!(find(&j,"scout").progress.as_ref().unwrap().required,3);
        g.send();g.step(1);let j=g.lineage().journal.unwrap();assert_eq!(find(&j,"delve").action.as_ref().unwrap().target,"watch");
    }
    #[test]
    fn scout_and_porter_recommendation_uses_actual_lit_worker_and_price() {
        let mut g=Game::new_resident(1);
        for _ in 0..3 {g.send();crate::offline::run_offline_counts(&mut g,1);}
        if tree::lit(&g.lineage).is_some_and(|n|n.id=="porter") {
            assert_eq!(g.lineage().journal.unwrap().recommended.as_deref(),Some("porter"));g.hire("porter").unwrap();
        }
        let j=g.lineage().journal.unwrap();assert_eq!(j.recommended.as_deref(),Some("scout"));
        // Controlled legacy-haul readiness verifies the real lit-worker ordering separately.
        let mut legacy=g.clone();legacy.lineage.tree.hired.retain(|(id,_)|id!="porter");legacy.lineage.tree.done.insert("porter".into(),tree::def("porter").unwrap().need);
        assert_eq!(legacy.lineage().journal.unwrap().recommended.as_deref(),Some("porter"));
        legacy.hire("porter").unwrap();assert_eq!(legacy.lineage().journal.unwrap().recommended.as_deref(),Some("scout"));
        let price=tree::price(&g.lineage,tree::def("scout").unwrap());let gold=g.lineage.gold;
        g.hire("scout").unwrap();assert_eq!(g.lineage.gold,gold-price);assert_eq!(find(&g.lineage().journal.unwrap(),"scout").state,"complete");
        crate::offline::run_offline_counts(&mut g,8*3600);
        assert_ne!(g.lineage().journal.unwrap().recommended.as_deref(),Some("porter"),"a later optional Porter must not displace build guidance after actual Scout hire");
    }
    #[test]
    fn age_and_milestone_requirements_are_independent_and_discoveries_complete() {
        let mut g=Game::new_resident(1);g.lineage.kills.insert("goblin_warlord".into());
        let j=g.lineage().journal.unwrap();let tactics=find(&j,"tactics");assert_eq!(tactics.state,"later");assert!(tactics.requirements.iter().any(|x|x.contains("4h")));assert!(!tactics.requirements.iter().any(|x|x.contains("Warlord")));
        g.lineage.facts.insert("vault".into());let j=g.lineage().journal.unwrap();assert!(j.discoveries.is_empty());assert!(!j.chapters.iter().flat_map(|c|&c.entries).any(|e|e.id=="vault"||e.id=="cage"));
        assert!(g.lineage().systems.iter().all(|s|s.id!="cage"));
    }
    #[test]
    fn real_quest_completion_rewards_are_explained_without_a_claim() {
        for reward in ["title","row","slot","card"] {
            let mut g=Game::new_resident(1);g.lineage.kills.insert("goblin_warlord".into());
            g.lineage.town.quest=Some(town::Quest{id:9,goal:"reach".into(),depth:3,boss:None,reward:reward.into(),progress:0,day:0,done:false});
            let before=g.save();let q=g.lineage().journal.unwrap().quest.unwrap();assert!(!q.done);assert!(q.body.contains("automatically"));assert_eq!(g.save(),before);
            assert!(town::on_run(&mut g.lineage,3,crate::engine::ExitTier::Return,false,3,&[]).is_some());
            let q=g.lineage().journal.unwrap().quest.unwrap();assert!(q.done);assert_eq!(q.progress,1.0);assert!(q.body.contains("was applied automatically"));
            match reward {"title"=>assert_eq!(g.lineage.marks,2),"row"=>assert!(g.lineage.unlocks.contains("row5")),"slot"=>assert!(g.lineage.unlocks.contains("party_slot_2")),_=>assert!(g.lineage.pkg.runs.get(&g.lineage.pkg.stance).copied().unwrap_or(0)>0)}
        }
    }
    #[test]
    fn journal_matches_whole_sliced_reload_and_selected_bloodline() {
        let mut s=crate::bloodlines::Session::new(1);s.build_town("house").unwrap();s.lineage.gold=1000;s.add_bloodline().unwrap();
        crate::tree::grant(&mut s.lineage,&crate::tree::LEGACY);
        let mut whole=crate::bloodlines::Session::load(&s.save()).unwrap();let mut sliced=crate::bloodlines::Session::load(&s.save()).unwrap();
        whole.run_offline_slice(8*3600,true);sliced.run_offline_slice(4*3600,false);sliced=crate::bloodlines::Session::load(&sliced.save()).unwrap();sliced.run_offline_slice(4*3600,true);
        for id in 1..=2 {whole.select_bloodline(id).unwrap();sliced.select_bloodline(id).unwrap();assert_eq!(whole.lineage().journal,sliced.lineage().journal);assert_eq!(whole.lineage().journal.unwrap().bloodline_id,id);}
    }
    fn cache_fixture(pref:&str)->Game {
        let mut g=Game::new_literal(210);g.lineage.gold=500;
        g.set_vault_pref(pref).unwrap();
        g.set_rules_raw(crate::rules::RuleSet {rows:vec![crate::rules::Row::new(vec![],crate::rules::Verb::new("hold"))],..Default::default()}).unwrap();
        g.send();let r=g.run.as_mut().unwrap();r.monsters.clear();r.items.clear();r.hero.inv.clear();r.hero.energy=100;
        r.floor.map.set(r.hero.pos,crate::tiles::Tile::Vault);
        r.vault_cage=["sword","mail","heal"].iter().enumerate().map(|(i,k)|crate::item::Item::new(900+i as u32,k)).collect();g
    }
    #[test]
    fn automatic_cache_opens_without_choice_rng_or_duplicate_currency() {
        let mut watched=cache_fixture("armour");let mut offline=watched.clone();offline.offline=true;
        let rng=watched.run.as_ref().unwrap().rng.clone();let step=watched.step(1);offline.tick();
        let r=watched.run.as_ref().unwrap();assert!(r.vault_choice.is_none());assert!(step.snapshot.vault_choice.is_none());
        assert_eq!(r.rng,rng);assert_eq!((r.loot_raw,r.loot),(30,7));assert_eq!(*r.caged,vec![901]);
        assert_eq!(r.hero.armour.as_ref().unwrap().kind,"mail");assert_eq!(offline.run.as_ref().unwrap().hero.armour,r.hero.armour);
        assert!(step.events.iter().any(|e|matches!(e,crate::wire::Ev::Pickup {item,..} if item=="mail")));
        assert!(!step.events.iter().any(|e|matches!(e,crate::wire::Ev::Callout {text,..} if text.contains("choose"))));
        let before=watched.save();assert!(watched.choose(900).is_err());assert_eq!(watched.save(),before);
        watched.step(3);assert_eq!(watched.run.as_ref().unwrap().loot_raw,30);
        let (r,mut cx)=watched.ctx();crate::turn::end_run(r,&mut cx,crate::engine::ExitTier::Return);watched.finish_run();
        assert_eq!(watched.lineage.gold,507);assert!(watched.pending_exit.is_none());assert_eq!(watched.lineage.forge["mail"].salvaged,1);
    }
    #[test]
    fn saved_pending_cache_settles_on_next_tick_with_saved_preference_and_privacy() {
        let mut g=cache_fixture("potion");let r=g.run.as_mut().unwrap();r.floor.map.set(r.hero.pos,crate::tiles::Tile::VaultOpen);
        r.vault_choice=Some((r.turn,std::mem::take(&mut r.vault_cage)));
        let mut loaded=Game::load(&g.save()).unwrap();assert!(loaded.snapshot().vault_choice.is_none());
        let step=loaded.step(1);let r=loaded.run.as_ref().unwrap();assert!(r.vault_choice.is_none());assert_eq!((r.loot_raw,r.loot),(12,3));assert_eq!(*r.caged,vec![902]);
        assert!(step.events.iter().any(|e|matches!(e,crate::wire::Ev::Pickup {item,..} if item.contains("potion?")&&!item.contains("heal"))));
        let mut loaded=Game::load(&loaded.save()).unwrap();loaded.step(2);assert_eq!(loaded.run.as_ref().unwrap().loot_raw,12);
    }
}
