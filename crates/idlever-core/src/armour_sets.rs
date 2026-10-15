//! Actual armour slots, permanent family discovery and next-departure intent.
use serde::{Deserialize, Serialize};
use crate::{engine::LineageState, hero::Hero};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all="snake_case")]
pub enum Slot { Helm, Armour, Boots }
impl Slot {
    pub fn key(self)->&'static str { match self {Self::Helm=>"helm",Self::Armour=>"armour",Self::Boots=>"boots"} }
}
pub const SLOTS:[Slot;3]=[Slot::Helm,Slot::Armour,Slot::Boots];
pub fn slot(kind:&str)->Slot {match kind {"ironcap"|"hearthglass_hood"=>Slot::Helm,"trailboots"|"hearthglass_boots"=>Slot::Boots,_=>Slot::Armour}}
pub fn family_piece(slot:Slot)->&'static str {match slot {Slot::Helm=>"hearthglass_hood",Slot::Armour=>"hearthglass",Slot::Boots=>"hearthglass_boots"}}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pins {
    #[serde(default,skip_serializing_if="Option::is_none")] pub helm:Option<String>,
    #[serde(default,skip_serializing_if="Option::is_none")] pub armour:Option<String>,
    #[serde(default,skip_serializing_if="Option::is_none")] pub boots:Option<String>,
}
impl Pins {pub fn get(&self,s:Slot)->Option<&str>{match s {Slot::Helm=>self.helm.as_deref(),Slot::Armour=>self.armour.as_deref(),Slot::Boots=>self.boots.as_deref()}}}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Focus {
    pub family:String,
    pub kind:String,
    pub source:String,
    pub failures:u32,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Piece {
    pub slot:Slot,pub kind:String,pub label:String,pub owned:bool,pub compatible:bool,pub available:bool,pub blocked:Option<String>,pub source:String,
    pub victories:u32,pub guaranteed_by:u32,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Equipment {
    pub slot:Slot,pub kind:Option<String>,pub label:String,pub origin:String,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bonus {pub required:u32,pub label:String,pub effect:String,pub active:bool}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct FocusWire {
    pub active:bool,pub available:bool,pub label:String,pub status:String,pub blocked:Option<String>,pub source:Option<String>,pub depth:Option<u32>,pub failures:u32,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct FamilyWire {
    pub id:String,pub label:String,pub pieces:Vec<Piece>,pub actual:Vec<Equipment>,pub next:Vec<Equipment>,pub actual_count:u32,pub next_count:u32,pub actual_bonuses:Vec<Bonus>,pub next_bonuses:Vec<Bonus>,pub focus:FocusWire,
}
pub fn equipped(hero:&Hero,s:Slot)->Option<&crate::item::Item> {match s {Slot::Helm=>hero.helm.as_ref(),Slot::Armour=>hero.armour.as_ref(),Slot::Boots=>hero.boots.as_ref()}}
pub fn count(hero:&Hero)->u32 {SLOTS.iter().filter(|s|equipped(hero,**s).is_some_and(|i|i.kind==family_piece(**s))).count() as u32}
pub fn fallback(config:&crate::kit::StartingConfig,s:Slot)->Option<&str>{match s {Slot::Helm=>config.helm.as_deref(),Slot::Armour=>config.armour.as_deref(),Slot::Boots=>config.boots.as_deref()}}
pub fn available(l:&LineageState,kind:&str,s:Slot)->bool {
    kind=="none" || slot(kind)==s && crate::kit::shape_available(l,kind,crate::defs::Cat::Armour)
}
/// Resolve without changing the saved fallback or any actor/RNG.
pub fn resolve(l:&LineageState,s:Slot)->(Option<String>, &'static str) {
    let Some(c)=&l.starting_config else {return (None,"default")};
    if let Some(k)=c.pins.as_ref().and_then(|p|p.get(s)).filter(|k|available(l,k,s)) {return(Some(k.into()),"pin")}
    if c.follow_set.as_deref()==Some("hearthglass") && available(l,family_piece(s),s) {return(Some(family_piece(s).into()),"follow")}
    if let Some(k)=fallback(c,s).filter(|k|available(l,k,s)) {return(Some(k.into()),"fallback")}
    (None,"default")
}
pub fn standalone(kind:&str)->bool {matches!(kind,"ironcap"|"trailboots")}
pub fn piece_source(kind:&str)->Option<(&'static str,&'static str)> {match kind {
    "hearthglass_hood"=>Some(("lich","hearthglass")),
    "hearthglass_boots"=>Some(("foundry_master","hearthglass_hood")),_=>None}}
pub fn next_piece(l:&LineageState)->Option<&'static str> {
    if !l.town.owned_shapes.contains("hearthglass") {return None;}
    ["hearthglass_hood","hearthglass_boots"].into_iter().find(|k|!l.town.owned_shapes.contains(*k))
}
fn focus_blocked(l:&LineageState,kind:&str)->Option<String> {
    let Some((boss,_))=piece_source(kind) else{return Some("No missing family piece".into())};
    let route=l.rules().route();
    let Some(depth)=route.boss_depth(boss) else{return Some("Source is not on this route".into())};
    if l.best_depth<depth {return Some(format!("Reach D{depth} to find this source"));}
    if l.tree.start_by_hand.is_some_and(|(start,_)|start>depth) {return Some("Pinned start skips this source".into());}
    if l.feats.seek.is_some()||l.feats.trial.is_some(){return Some("Finish the chosen boss expedition first".into());}
    None
}
pub fn set_focus(g:&mut crate::Game,family:Option<&str>)->Result<(),String> {
    let Some(family)=family else {if g.lineage.set_focus.take().is_some(){g.lineage.set_focus_note=Some("Focus ended. Normal delves resume.".into());}return Ok(())};
    if family!="hearthglass" {return Err("unknown armour set".into());}
    let kind=next_piece(&g.lineage).ok_or("No eligible missing family piece")?;
    if let Some(reason)=focus_blocked(&g.lineage,kind){return Err(reason);}
    let (source,_)=piece_source(kind).expect("family source");
    let focus=Focus{family:family.into(),kind:kind.into(),source:source.into(),failures:0};
    if let Some(run)=g.run.as_mut().filter(|r|r.turn==0&&r.over.is_none()) {
        if run.route.boss_depth(source).is_some_and(|d|run.start<=d) {run.set_focus=Some(focus.clone());}
    }
    g.lineage.set_focus=Some(focus);g.lineage.set_focus_note=None;Ok(())
}
pub fn focus_wire(l:&LineageState)->FocusWire {
    let missing=next_piece(l);
    let blocked=missing.map_or_else(||Some(if l.town.owned_shapes.contains("hearthglass"){"All family pieces discovered"}else{"Discover Hearthglass first"}.into()),|k|focus_blocked(l,k));
    let source=missing.and_then(piece_source).map(|(s,_)|s.to_string());
    let depth=source.as_deref().and_then(|s|l.rules().route().boss_depth(s));
    let source=source.map(|s|crate::engine::kind_title(&s));
    let active=l.set_focus.as_ref().is_some_and(|f|!l.town.owned_shapes.contains(&f.kind));
    let status=if missing.is_none()&&l.town.owned_shapes.contains("hearthglass"){"Collection complete".into()}
        else if active&&blocked.is_some(){"Focus paused".into()}
        else if active {"Following source".into()}
        else if l.set_focus.as_ref().is_some_and(|f|l.town.owned_shapes.contains(&f.kind)){"Piece discovered. Normal delves resume.".into()}
        else {l.set_focus_note.clone().unwrap_or_else(||"Normal delves".into())};
    FocusWire {active,available:blocked.is_none(),label:"Find next piece".into(),status,blocked,source,depth,failures:l.set_focus.as_ref().map_or(0,|f|f.failures)}
}
pub fn wire(l:&LineageState,actual:Option<&Hero>)->Vec<FamilyWire> {
    if !l.town.owned_shapes.contains("hearthglass"){return Vec::new();}
    let mut next=Hero::new(l.class,crate::geom::Pos::new(0,0));crate::kit::equip(l,&mut next);
    let actual=actual.unwrap_or(&next);
    let equipment=|hero:&Hero,queued:bool|SLOTS.into_iter().map(|s| {
        let kind=equipped(hero,s).map(|i|i.kind.clone());
        Equipment {slot:s,label:kind.as_deref().map_or("None".into(),crate::item::kind_name),kind,origin:if queued {resolve(l,s).1}else{"equipped"}.into()}
    }).collect();
    let bonuses=|count|vec![
        Bonus{required:2,label:"Embers".into(),effect:"After your attacks kill a foe, restore 1 HP each second for 3 seconds. A new kill restarts the 3 seconds. Summoned enemies, allies, pet kills, and trap or ongoing damage do not count.".into(),active:count>=2},
        Bonus{required:3,label:"Glassward".into(),effect:"Kill healing left over at full HP adds ward, up to 4. Ward absorbs damage. Take +1 damage from nearby melee attacks.".into(),active:count>=3}];
    let actual_count=count(actual);let next_count=count(&next);
    vec![FamilyWire{id:"hearthglass".into(),label:"Hearthglass".into(),pieces:SLOTS.into_iter().map(|s| {
        let kind=family_piece(s);let owned=l.town.owned_shapes.contains(kind);
        Piece {slot:s,kind:kind.into(),label:crate::item::kind_name(kind),owned,compatible:true,available:owned,blocked:(!owned).then(||"Find this piece".into()),source:crate::legendary::definition(kind).expect("family definition").source.into(),victories:l.town.piece_victories.get(kind).copied().unwrap_or(0),guaranteed_by:if piece_source(kind).is_some(){8}else{1}}
    }).collect(),actual:equipment(actual,false),next:equipment(&next,true),actual_count,next_count,actual_bonuses:bonuses(actual_count),next_bonuses:bonuses(next_count),focus:focus_wire(l)}]
}
/// Scoped plan: no edits to normal route/start and no token expenditure.
pub fn at_send(g:&mut crate::Game)->Option<(u32,Focus)> {
    let f=g.lineage.set_focus.clone()?;
    if g.lineage.town.owned_shapes.contains(&f.kind){g.lineage.set_focus=None;g.lineage.set_focus_note=Some("Piece discovered. Normal delves resume.".into());return None;}
    if focus_blocked(&g.lineage,&f.kind).is_some(){return None;}
    let depth=g.lineage.rules().route().boss_depth(&f.source)?;
    let stone=g.lineage.stones().into_iter().filter(|d|*d<=depth&&g.lineage.start_payable(*d)).max().unwrap_or(1);
    Some((stone,f))
}
/// A paid preparation can predate another resident's discovery. Resolve once,
/// at its first actual departure, without replaying payment or floor creation.
pub fn departure(g:&mut crate::Game) {
    let Some(r)=g.run.as_ref().filter(|r|r.turn==0&&r.over.is_none()) else{return;};
    let Some(c)=&g.lineage.starting_config else{return;};
    if c.follow_set.is_none()&&c.pins.is_none(){return;}
    let mut next=Hero::new(g.lineage.class,r.hero.pos);crate::kit::equip(&g.lineage,&mut next);
    let differs=SLOTS.into_iter().any(|s|equipped(&r.hero,s).map(|i|(&i.kind,i.enchant))!=equipped(&next,s).map(|i|(&i.kind,i.enchant)));
    if differs {crate::persistent::refit_build(g,true);}
    let hero=&g.run.as_ref().expect("prepared actor").hero;
    let slots=SLOTS.into_iter().map(|s|equipped(hero,s).map(|i|i.kind.clone())).collect::<Vec<_>>();
    if slots!=g.lineage.set_last_equipped {
        let text=format!("Armour prepared · {}/3 Hearthglass pieces",count(hero));
        g.events.push(crate::wire::Ev::Note{t:0,text});
        g.lineage.set_last_equipped=slots;
    }
}
pub fn finish(g:&mut crate::Game,run:&crate::engine::Run) {
    let Some(f)=g.lineage.set_focus.as_mut() else{return;};
    if g.lineage.town.owned_shapes.contains(&f.kind){g.lineage.set_focus=None;g.lineage.set_focus_note=Some("Piece discovered. Normal delves resume.".into());return;}
    if run.set_focus.as_ref().is_none_or(|r|r.kind!=f.kind){return;}
    if run.boss_kills.iter().any(|(_,boss)|*boss==f.source){f.failures=0;}else{f.failures+=1;}
    if f.failures>=3 {g.lineage.set_focus=None;g.lineage.set_focus_note=Some("Source missed on 3 delves. Normal delves resume.".into());}
}
pub fn kill_proc(run:&mut crate::engine::Run,cx:&mut crate::engine::Ctx) {
    let n=count(&run.hero);
    if n>=2 {run.hero.hearth_regen=30;}
    if run.hero.armour.as_ref().is_some_and(|i|i.kind=="hearthglass") {
        let before=run.hero.hp;let gained=(run.hero.max_hp-before).clamp(0,2);
        run.hero.hp+=gained;
        if gained>0 {cx.events.push(crate::wire::Ev::Heal{t:run.turn,id:crate::engine::HERO_ID,amount:gained,src:"hearthglass".into()});}
        if n>=3 {
            let old=run.hero.hearth_ward;run.hero.hearth_ward=(old+2-gained).min(4);
            if run.hero.hearth_ward>old {cx.events.push(crate::wire::Ev::Use{t:run.turn,item:"Glassward".into(),outcome:format!("ward +{}",run.hero.hearth_ward-old)});}
        }
    }
}
pub(crate) const HEAL_TICKS: u32 = 10;

/// The scheduler excludes every healing boundary from a quiet span. With no
/// actions inside it, piece counts stay fixed and only the timer can expire.
pub(crate) fn quiet_ticks(run: &mut crate::engine::Run, ticks: u32) {
    debug_assert!(ticks > 0 && run.turn / HEAL_TICKS == (run.turn + ticks) / HEAL_TICKS);
    let n = count(&run.hero);
    if n < 3 { run.hero.hearth_ward = 0; }
    if n < 2 { run.hero.hearth_regen = 0; }
    if run.hero.hearth_regen > 0 {
        run.hero.hearth_regen = (run.hero.hearth_regen - ticks as i32).max(0);
    }
}

pub fn tick(run:&mut crate::engine::Run,cx:&mut crate::engine::Ctx) {
    let n=count(&run.hero);
    if n<3 {run.hero.hearth_ward=0;}
    if n<2 {run.hero.hearth_regen=0;}
    if run.hero.hearth_regen>0 {
        if run.turn.is_multiple_of(HEAL_TICKS)&&run.hero.hp<run.hero.max_hp {
            run.hero.hp+=1;cx.events.push(crate::wire::Ev::Heal{t:run.turn,id:crate::engine::HERO_ID,amount:1,src:"hearthglass_embers".into()});
        }
        run.hero.hearth_regen-=1;
    }
}
/// Actual eligible victories alone advance monotonic town protection.
pub fn source_drops(run:&mut crate::engine::Run,cx:&mut crate::engine::Ctx,boss:&str,source:&str) {
    let mut drops=Vec::new();
    if boss=="goblin_warlord" {
        for kind in ["ironcap","trailboots"] {if !cx.owned_shapes.contains(kind){drops.push(kind);}}
    }
    for kind in ["hearthglass_hood","hearthglass_boots"] {
        let (target,prior)=piece_source(kind).expect("piece source");
        if boss!=target||!cx.owned_shapes.contains(prior)||run.route.boss_depth(target).is_none_or(|d|run.depth<d) {continue;}
        let hash=crate::legendary::repeat_hash(run.seed,kind);
        if cx.owned_shapes.contains(kind) {
            if hash.is_multiple_of(8) {drops.push(kind);}
        }else {
            let n=cx.piece_victories.entry(kind.into()).or_default();*n=n.saturating_add(1);
            if *n>=8||hash.is_multiple_of(4) {drops.push(kind);}
        }
    }
    for kind in drops {let item=crate::item::Item::new(run.new_item_id(),kind);crate::legendary::collect_pattern(run,cx,item,source);}
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{engine::{ExitTier,Game,HERO_ID},item::Item,turn::Src,kit::StartingConfig};
    fn arena()->Game {let mut g=crate::tests::arena();g.lineage.gold=500;g.lineage.restock_off=true;g.lineage.kennel_declined=true;g}
    fn kill(g:&mut Game,kind:&str,source:Src) {
        let id=crate::tests::add_monster(g,kind,5,5);let (r,mut cx)=g.ctx();
        let i=r.monsters.iter().position(|m|m.id==id).unwrap();r.aimed=true;
        crate::turn::damage_monster(r,&mut cx,i,10000,&source);
    }
    fn outfit(h:&mut Hero,n:u32) {
        h.armour=Some(Item::new(crate::kit::ARMOUR_ID,"hearthglass")).into();
        h.helm=(n>=2).then(||Item::new(crate::kit::HELM_ID,"hearthglass_hood")).into();
        h.boots=(n>=3).then(||Item::new(crate::kit::BOOTS_ID,"hearthglass_boots")).into();
    }
    #[test]
    fn actual_slots_guard_speed_and_original_forged_floor() {
        let mut h=Hero::new(crate::hero::Class::Fighter,crate::geom::Pos::new(0,0));
        h.armour=Some(Item::new(crate::kit::ARMOUR_ID,"mail")).into();
        let baseline=h.blunt(8);assert_eq!(baseline,5);
        h.auto_equip(Item::new(crate::kit::HELM_ID,"ironcap"));
        assert_eq!((h.def(),h.speed(),h.blunt(8)),(5,9,3));
        h.auto_equip(Item::new(crate::kit::BOOTS_ID,"trailboots"));
        assert_eq!((h.def(),h.speed(),h.blunt(8)),(4,10,4));
        assert_eq!(h.blunt(3),1,"positive extra guard cannot erase forged floor");
        assert_eq!(h.armour.as_ref().unwrap().kind,"mail");
        h.armour=None.into();h.helm=None.into();assert_eq!(h.blunt(3),4,"negative boots guard matters without a body");
    }
    #[test]
    fn same_tick_unprotected_body_replacement_cannot_spend_stale_full_set_ward() {
        let mut g=arena();outfit(&mut g.run.as_mut().unwrap().hero,3);
        {let h=&mut g.run.as_mut().unwrap().hero;h.hp=h.max_hp;}
        kill(&mut g,"rat",Src::Hero{ranged:false});kill(&mut g,"rat",Src::Hero{ranged:false});
        let h=&mut g.run.as_mut().unwrap().hero;assert_eq!(h.hearth_ward,4);let hp=h.hp;
        assert!(h.auto_equip(Item::new(10000,"mail")).is_some());
        assert_eq!(count(h),2);assert_eq!(h.hearth_ward,0);assert_eq!(h.hearth_regen,30);
        let (r,mut cx)=g.ctx();crate::turn::damage_hero(r,&mut cx,3,&Src::Gas);
        assert_eq!(r.hero.hp,hp-3,"no tick or delay between replacement and damage");
    }
    #[test]
    fn distinct_equipped_thresholds_caps_and_real_proc_sources() {
        let mut g=arena();outfit(&mut g.run.as_mut().unwrap().hero,2);
        g.run.as_mut().unwrap().hero.hp=10;
        kill(&mut g,"rat",Src::Hero{ranged:false});
        assert_eq!(g.run.as_ref().unwrap().hero.hp,12);
        assert_eq!(g.run.as_ref().unwrap().hero.hearth_regen,30);
        let (r,mut cx)=g.ctx();r.turn=10;tick(r,&mut cx);assert_eq!(r.hero.hp,13);
        assert!(cx.events.iter().any(|e|matches!(e,crate::wire::Ev::Heal{id,amount:1,src,..} if *id==HERO_ID&&src=="hearthglass_embers")));
        outfit(&mut g.run.as_mut().unwrap().hero,3);
        {let h=&mut g.run.as_mut().unwrap().hero;h.hp=h.max_hp;}
        for _ in 0..5 {kill(&mut g,"rat",Src::Hero{ranged:true});}
        assert_eq!(g.run.as_ref().unwrap().hero.hearth_ward,4);
        let hp=g.run.as_ref().unwrap().hero.hp;
        {let (r,mut cx)=g.ctx();crate::turn::damage_hero(r,&mut cx,6,&Src::Gas);}
        assert_eq!(g.run.as_ref().unwrap().hero.hp,hp-2);
        assert_eq!(g.run.as_ref().unwrap().hero.hearth_ward,0);
        kill(&mut g,"rat",Src::Gas);
        assert_eq!(g.run.as_ref().unwrap().hero.hp,hp-2,"hazard gives no kill healing");
        g.run.as_mut().unwrap().hero.helm=None.into();
        {let (r,mut cx)=g.ctx();tick(r,&mut cx);assert_eq!(r.hero.hearth_ward,0);}
    }
    #[test]
    fn source_stages_eight_victory_ceiling_and_no_combat_rng_draw() {
        for seed in 1..=16 {
            let mut g=arena();g.run.as_mut().unwrap().seed=seed;
            g.run.as_mut().unwrap().depth=18;
            let rng=g.run.as_ref().unwrap().rng.clone();
            {let (r,mut cx)=g.ctx();source_drops(r,&mut cx,"lich","Lich");}
            assert!(!g.lineage.town.owned_shapes.contains("hearthglass_hood"));
            g.lineage.town.owned_shapes.insert("hearthglass".into());
            for _ in 0..8 {let (r,mut cx)=g.ctx();source_drops(r,&mut cx,"lich","Lich");}
            assert!(g.lineage.town.owned_shapes.contains("hearthglass_hood"));
            assert!(!g.lineage.town.owned_shapes.contains("hearthglass_boots"));
            g.run.as_mut().unwrap().depth=23;
            for _ in 0..8 {let (r,mut cx)=g.ctx();source_drops(r,&mut cx,"foundry_master","Foundry Master");}
            assert!(g.lineage.town.owned_shapes.contains("hearthglass_boots"));
            assert!(g.lineage.town.piece_victories.values().all(|n|*n<=8));
            assert_eq!(g.run.as_ref().unwrap().rng,rng);
            let loaded=Game::load(&g.save()).unwrap();assert_eq!(loaded.lineage.town,g.lineage.town);
        }
    }
    #[test]
    fn intent_pin_partial_free_named_reuse_and_live_actor_protection() {
        let mut g=arena();g.run.as_mut().unwrap().turn=0;g.lineage.gold=0;
        g.lineage.town.owned_shapes.extend(["hearthglass","hearthglass_hood","ironcap","trailboots"].map(str::to_string));
        let c=StartingConfig {helm:Some("ironcap".into()),boots:Some("trailboots".into()),follow_set:Some("hearthglass".into()),pins:Some(Pins{boots:Some("trailboots".into()),..Default::default()}),..Default::default()};
        let id=crate::kit::save_starting(&mut g,"Embers runner",c.clone(),None).unwrap();
        crate::kit::select_starting(&mut g,&id).unwrap();
        assert_eq!(g.lineage.gold,0);assert_eq!(count(&g.run.as_ref().unwrap().hero),2);
        g.run.as_mut().unwrap().turn=1;
        g.lineage.town.owned_shapes.insert("hearthglass_boots".into());
        let old=g.run.as_ref().unwrap().hero.clone();
        crate::kit::select_starting(&mut g,&id).unwrap();
        assert_eq!(g.run.as_ref().unwrap().hero,old,"away edits cannot change actor");
        g.run.as_mut().unwrap().hero.auto_equip(Item::new(10000,"plate"));
        assert_eq!(g.run.as_ref().unwrap().hero.armour.as_ref().unwrap().kind,"hearthglass");
        assert_eq!(resolve(&g.lineage,Slot::Boots),(Some("trailboots".into()),"pin"));
        let before=g.save();let bad=StartingConfig{helm:Some("plate".into()),..Default::default()};
        assert!(crate::kit::set_starting(&mut g,Some(bad)).is_err());assert_eq!(before,g.save());
        let mut off=c;off.follow_set=None;crate::kit::set_starting(&mut g,Some(off)).unwrap();
        assert_eq!(g.lineage.starting_config.as_ref().unwrap().helm.as_deref(),Some("hearthglass_hood"));
        let mut frozen=Hero::new(g.lineage.class,crate::geom::Pos::new(0,0));crate::kit::equip(&g.lineage,&mut frozen);
        assert!(frozen.protected_slots.contains(&Slot::Armour));
        frozen.auto_equip(Item::new(10001,"plate"));
        assert_eq!(frozen.armour.as_ref().unwrap().kind,"hearthglass","Follow-off freezes the selected family body through ordinary loot");
    }
    #[test]
    fn focus_is_known_scoped_and_stops_after_three_real_completed_failures() {
        let mut g=arena();g.lineage.town.owned_shapes.insert("hearthglass".into());
        let before=g.save();assert!(set_focus(&mut g,Some("hearthglass")).is_err());assert_eq!(g.save(),before);
        g.lineage.best_depth=18;set_focus(&mut g,Some("hearthglass")).unwrap();
        let start=g.lineage.start;let rules=g.lineage.rules().clone();
        for failure in 1..=3 {
            g.start_run(None);let r=g.run.as_ref().unwrap();assert!(r.start<=18);assert!(r.set_focus.is_some());
            let (r,mut cx)=g.ctx();crate::turn::end_run(r,&mut cx,ExitTier::Return);g.finish_run().unwrap();
            assert_eq!(g.lineage.start,start);assert_eq!(*g.lineage.rules(),rules);
            assert_eq!(g.lineage.set_focus.as_ref().map(|f|f.failures),if failure<3{Some(failure)}else{None});
        }
        set_focus(&mut g,Some("hearthglass")).unwrap();
        g.lineage.best_depth=23;g.lineage.waystones.push(19);g.set_start(19).unwrap();
        let paused=focus_wire(&g.lineage);assert!(paused.active);assert!(paused.blocked.is_some());assert_eq!(paused.status,"Focus paused");
        assert!(at_send(&mut g).is_none());assert_eq!(g.lineage.start,19,"blocked focus preserves manual start");
    }
    #[test]
    fn reads_have_no_mutation_and_do_not_count_collection_as_equipped() {
        let mut g=arena();g.lineage.town.owned_shapes.extend(["hearthglass","hearthglass_hood","hearthglass_boots"].map(str::to_string));
        g.lineage.set_focus_note=Some("Source missed on 3 delves. Normal delves resume.".into());
        let before=g.save();for _ in 0..5 {let l=g.lineage();let set=&l.starting_kits.armour_sets[0];assert_eq!(set.actual_count,0);assert_eq!(set.next_count,0);assert_eq!(set.focus.status,"Collection complete","completed collection takes precedence over old source failure");}
        let mut missing=g.lineage.clone();missing.town.owned_shapes.remove("hearthglass_boots");assert_eq!(focus_wire(&missing).status,"Source missed on 3 delves. Normal delves resume.","keep failure history while a piece is missing");
        assert_eq!(before,g.save());
    }
    #[test]
    fn paired_sixteen_seed_sustain_burst_and_mobility_tradeoffs() {
        let mut rows=Vec::new();
        for seed in 1..=16 {
            let mut base=arena();base.run.as_mut().unwrap().rng=crate::rng::Rng::new(seed);
            base.run.as_mut().unwrap().hero.hp=10;
            let mut full=base.clone();outfit(&mut full.run.as_mut().unwrap().hero,3);
            let mut ordinary=base.clone();{
                let h=&mut ordinary.run.as_mut().unwrap().hero;
                h.armour=Some(Item::new(crate::kit::ARMOUR_ID,"mail")).into();
                h.helm=Some(Item::new(crate::kit::HELM_ID,"ironcap")).into();
                h.boots=Some(Item::new(crate::kit::BOOTS_ID,"trailboots")).into();
            }
            // Identical real incoming rolls and natural direct-attack kills.
            // This isolates proc output at equal ranks, attributes and skill budget.
            for _ in 0..8 {
                let roll=full.run.as_mut().unwrap().rng.range(1,2);
                let same=ordinary.run.as_mut().unwrap().rng.range(1,2);assert_eq!(roll,same);
                for g in [&mut full,&mut ordinary] {
                    let id=crate::tests::add_monster(g,"rat",5,5);let (r,mut cx)=g.ctx();
                    let i=r.monsters.iter().position(|m|m.id==id).unwrap();
                    let damage=r.hero.blunt(roll);crate::turn::damage_hero(r,&mut cx,damage,&Src::Mon(i));
                    r.aimed=true;crate::turn::damage_monster(r,&mut cx,i,99,&Src::Hero{ranged:false});
                }
            }
            let full_hp=full.run.as_ref().unwrap().hero.hp;let ordinary_hp=ordinary.run.as_ref().unwrap().hero.hp;
            assert!(full_hp>ordinary_hp,"sustain seed {seed}: {full_hp} vs {ordinary_hp}");
            let full_h=&full.run.as_ref().unwrap().hero;let ordinary_h=&ordinary.run.as_ref().unwrap().hero;
            let burst_full=full_h.blunt(8)+1;let burst_ordinary=ordinary_h.blunt(8);
            assert!(burst_ordinary<burst_full,"standalone burst defence wins seed {seed}");
            let mut hybrid=full_h.clone();hybrid.boots=Some(Item::new(crate::kit::BOOTS_ID,"trailboots")).into();
            assert_eq!(count(&hybrid),2);assert!(hybrid.speed()>full_h.speed());
            let full_moves=100*full_h.speed()/crate::engine::ACT_ENERGY;
            let hybrid_moves=100*hybrid.speed()/crate::engine::ACT_ENERGY;
            assert!(hybrid_moves>full_moves,"hybrid actual action budget wins mobility");
            rows.push((seed,full_hp,ordinary_hp,burst_full,burst_ordinary,full_moves,hybrid_moves));
        }
        eprintln!("Cut216 controlled paired16 sustain/burst/mobility: {rows:?}");
    }
    #[test]
    fn paid_resident_discovery_changes_other_next_departure_not_live_actor() {
        let mut s=crate::bloodlines::Session::new(1);s.active=arena();
        kill(&mut s.active,"bloat_mother",Src::Hero{ranged:false});
        let before_gold=s.lineage.gold;s.add_bloodline().unwrap();
        assert_eq!(s.lineage.gold,before_gold-crate::bloodlines::SLOT_PRICE);
        s.select_bloodline(2).unwrap();
        let follow=StartingConfig{follow_set:Some("hearthglass".into()),..Default::default()};
        crate::kit::set_starting(&mut s.active,Some(follow.clone())).unwrap();
        s.ensure_run();s.active.run.as_mut().unwrap().turn=1;
        let actor=s.active.run.as_ref().unwrap().hero.clone();
        s.select_bloodline(1).unwrap();
        s.active.run.as_mut().unwrap().depth=18;
        s.lineage.town.piece_victories.insert("hearthglass_hood".into(),7);
        kill(&mut s.active,"lich",Src::Hero{ranged:false});
        assert!(s.lineage.town.owned_shapes.contains("hearthglass_hood"));
        s.select_bloodline(2).unwrap();assert_eq!(s.active.run.as_ref().unwrap().hero,actor);
        assert_eq!(s.lineage().starting_kits.armour_sets[0].next_count,2);
        let saved=s.save();let mut loaded=crate::bloodlines::Session::load(&saved).unwrap();
        assert_eq!(loaded.lineage.town.piece_victories["hearthglass_hood"],8);
        let (r,mut cx)=loaded.active.ctx();crate::turn::end_run(r,&mut cx,ExitTier::Return);
        loaded.active.finish_run().unwrap();
        loaded.active.start_run(None);assert_eq!(count(&loaded.active.run.as_ref().unwrap().hero),2);
        assert_eq!(loaded.lineage.starting_config,Some(follow));
        assert_eq!(crate::kit::owned(&loaded.lineage,"armour"),0,"another hero's ranks do not transfer");
    }
    #[test]
    fn real_source_pickup_controller_and_counters_whole_slice_reload_parity() {
        let mut g=arena();g.lineage.town.owned_shapes.insert("hearthglass".into());
        g.lineage.best_depth=18;g.run.as_mut().unwrap().depth=18;
        g.lineage.town.piece_victories.insert("hearthglass_hood".into(),7);
        crate::kit::set_starting(&mut g,Some(StartingConfig{follow_set:Some("hearthglass".into()),..Default::default()})).unwrap();
        set_focus(&mut g,Some("hearthglass")).unwrap();
        let id=crate::tests::add_monster(&mut g,"lich",5,5);
        {let r=g.run.as_mut().unwrap();r.monsters.iter_mut().find(|m|m.id==id).unwrap().hp=1;}
        // Controlled depth placement changes the offer basis. Canonicalize once
        // before either arm so both start with the same legitimate loaded state.
        let g=Game::load(&g.save()).unwrap();
        assert_eq!(Game::load(&g.save()).unwrap().save(),g.save());
        let mut whole=g.clone();let mut sliced=Game::load(&g.save()).unwrap();
        crate::offline::run_offline_slice(&mut whole,60,true);
        crate::offline::run_offline_slice(&mut sliced,30,false);
        sliced=Game::load(&sliced.save()).unwrap();crate::offline::run_offline_slice(&mut sliced,30,true);
        assert_eq!(whole.save(),sliced.save());
        assert!(whole.lineage.town.owned_shapes.contains("hearthglass_hood"));
        assert_eq!(whole.lineage.town.piece_victories["hearthglass_hood"],8);
    }
}
