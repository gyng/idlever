//! Permanent town-wide equipment patterns earned from actual dungeon finds.
use crate::{engine::{Ctx, LineageState, Run, HERO_ID}, hero::Class, item::{Item, Rarity}, wire::Ev};
use serde::{Deserialize, Serialize};

pub struct Definition {
    pub kind: &'static str,
    pub label: &'static str,
    pub effect: &'static str,
    pub tradeoff: &'static str,
    pub source: &'static str,
}
pub const DEFINITIONS: [Definition; 5] = [
    Definition { kind:"crownsplitter", label:"Crownsplitter", effect:"Deal +2 melee damage to stunned or slowed foes.", tradeoff:"Slower than a sword. Control must be active.", source:"Defeat the Warlord." },
    Definition { kind:"hearthglass", label:"Hearthglass", effect:"Recover 2 HP when a direct attack slays a natural hostile foe.", tradeoff:"Only 1 base guard. Summons, allies and hazards give no healing.", source:"Defeat the Bloat Mother, or the Warlord as a Gunner." },
    Definition { kind:"frostmantle", label:"Frostmantle", effect:"Take 2 less gas and poison damage, with at least 1 damage per harmful tick.", tradeoff:"Slower movement. Take +1 damage from melee blows.", source:"Defeat the Lich." },
    Definition { kind:"hearthglass_hood", label:"Hearthglass Hood", effect:"Hearthglass family: two equipped pieces kindle regeneration after direct kills.", tradeoff:"No base guard. Three pieces take +1 incoming melee damage.", source:"Defeat the Lich after discovering Hearthglass." },
    Definition { kind:"hearthglass_boots", label:"Hearthglass Boots", effect:"Hearthglass family: three equipped pieces turn excess kill healing into up to 4 ward.", tradeoff:"No speed bonus. Three pieces take +1 incoming melee damage.", source:"Defeat the Foundry Master after discovering the Hearthglass Hood." },
];
pub fn definition(kind: &str) -> Option<&'static Definition> {
    DEFINITIONS.iter().find(|d|d.kind==kind)
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct OwnedShape {
    pub kind: String,
    pub label: String,
    pub effect: String,
    pub tradeoff: String,
    pub compatible: bool,
    pub available: bool,
    pub blocked: Option<String>,
    pub source: String,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Discovery {
    /// Named patterns alone are legendary; ordinary temporary high enchantments
    /// are masterwork. Earlier in-progress named-only fixtures omitted this.
    #[serde(default="discovery_rarity_default")]
    pub rarity: Rarity,
    pub kind: String,
    pub label: String,
    pub effect: String,
    pub tradeoff: String,
    pub source: String,
    pub depth: u32,
    pub run_id: u32,
    pub hero_name: String,
    pub first: bool,
    pub target: String,
}
fn discovery_rarity_default()->Rarity {Rarity::Legendary}
pub fn owned_wire(l: &LineageState) -> Vec<OwnedShape> {
    DEFINITIONS.iter().filter(|d|l.town.owned_shapes.contains(d.kind)).map(|d| {
        let compatible=d.kind!="crownsplitter"||l.class!=Class::Gunner;
        OwnedShape {kind:d.kind.into(),label:d.label.into(),effect:d.effect.into(),tradeoff:d.tradeoff.into(),compatible,available:compatible,
            blocked:(!compatible).then(||"Gunner uses firearms".into()),source:d.source.into()}
    }).collect()
}
/// Pure tagged hash: discovery does not consume the combat/loot RNG stream.
pub(crate) fn repeat_hash(seed:u64, boss:&str)->u64 {
    let mut h=seed^0x4c45_4745_4e44_4152;
    for b in boss.bytes() {h=(h^u64::from(b)).wrapping_mul(0x100_0000_01b3);}
    h ^= h>>30;h=h.wrapping_mul(0xbf58_476d_1ce4_e5b9);h ^= h>>27;h=h.wrapping_mul(0x94d0_49bb_1331_11eb);h^(h>>31)
}
pub fn boss_drop(run:&Run, boss:&str, owned:&std::collections::BTreeSet<String>)->Option<&'static str> {
    let kind=match boss {
        "goblin_warlord" if run.hero.class==Class::Gunner=>"hearthglass",
        "goblin_warlord"=>"crownsplitter",
        "bloat_mother"=>"hearthglass",
        "lich"=>"frostmantle",
        _=>return None,
    };
    (!owned.contains(kind)||repeat_hash(run.seed,boss).is_multiple_of(8)).then_some(kind)
}
/// Return true only for a new permanent pattern; ordinary enchanted gear keeps
/// its physical instance and temporary enchantment.
pub fn discover(run:&mut Run,cx:&mut Ctx, it:&Item,source:&str)->bool {
    if !matches!(it.cat(),crate::defs::Cat::Weapon|crate::defs::Cat::Armour)
        || !(matches!(crate::item::rarity(it,true),Rarity::Masterwork|Rarity::Legendary)||crate::armour_sets::standalone(&it.kind)) {return false;}
    if !cx.owned_shapes.insert(it.kind.clone()) {return false;}
    let d=definition(&it.kind);
    let find=Discovery {rarity:crate::item::rarity(it,true),kind:it.kind.clone(),label:crate::item::kind_name(&it.kind),
        effect:d.map_or("Unlock this base shape for starting gear.",|d|d.effect).into(),
        tradeoff:d.map_or("Found enchantment remains temporary.",|d|d.tradeoff).into(),source:source.into(),
        depth:run.depth,run_id:run.id,hero_name:run.hero_name.clone(),first:true,target:"loadouts".into()};
    cx.events.push(Ev::Discovery {t:run.turn,find:Box::new(find.clone())});
    run.discoveries.push(find);
    true
}
/// A real drop is found in the kill action, before any exit decision. It needs
/// no pack slot and is never equipped implicitly. Receipts retain its identity.
pub fn collect_pattern(run:&mut Run,cx:&mut Ctx,mut it:Item,source:&str) {
    let raw=run.claim_item_value(&mut it);
    run.loot_add(raw);
    run.note_found(it.id,&it.kind,1);
    let (_,_,label)=crate::item::describe(&it,cx.facts,cx.flavours);
    cx.events.push(Ev::Pickup {t:run.turn,id:HERO_ID,item:label.clone()});
    crate::provenance::found(run,cx,&it.kind,&label);
    discover(run,cx,&it,source);
    run.pattern_receipts.push(it);
}
pub fn claim_found_value(run:&mut Run,cx:&mut Ctx,it:&mut Item)->i32 {
    discover(run,cx,it,"Dungeon find");
    run.claim_item_value(it)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{engine::{ExitTier,FloorItem,Game},kit::StartingConfig,turn::Src};
    fn arena()->Game {
        let mut g=crate::tests::arena();g.lineage.gold=500;g.lineage.restock_off=true;g.lineage.kennel_declined=true;g
    }
    fn kill(g:&mut Game,kind:&str) {
        let id=crate::tests::add_monster(g,kind,5,5);
        let (r,mut cx)=g.ctx();
        let i=r.monsters.iter().position(|m|m.id==id).unwrap();
        r.aimed=true;
        assert!(crate::turn::damage_monster(r,&mut cx,i,10000,&Src::Hero{ranged:false}));
    }
    fn finish(g:&mut Game,tier:ExitTier) {
        let (r,mut cx)=g.ctx();crate::turn::end_run(r,&mut cx,tier);assert!(g.finish_run().is_some());
    }
    #[test]
    fn actual_boss_drop_is_immediate_full_pack_safe_and_death_permanent() {
        for class in [Class::Fighter,Class::Gunner] {
            for tier in [ExitTier::Return,ExitTier::Death] {
                let mut g=arena();
                let r=g.run.as_mut().unwrap();r.hero.class=class;
                for id in 100..100+crate::hero::INV_SLOTS as u32 {r.hero.inv.push(Item::new(id,"heal"));}
                assert!(r.hero.inv_full());let count=r.hero.inv.len();
                let shape=if class==Class::Gunner {"hearthglass"}else{"crownsplitter"};
                kill(&mut g,"goblin_warlord");
                let r=g.run.as_ref().unwrap();
                assert_eq!(r.hero.inv.len(),count);
                assert_eq!(r.pattern_receipts.iter().map(|i|i.kind.as_str()).collect::<Vec<_>>(),vec![shape,"ironcap","trailboots"]);
                assert_eq!(r.loot_raw,crate::defs::item_def(shape).value+crate::defs::item_def("ironcap").value+crate::defs::item_def("trailboots").value);
                assert_eq!(r.discoveries[0].kind,shape);
                assert_eq!(r.discoveries[0].source,"Goblin Warlord");
                assert_eq!(g.events.iter().filter(|e|matches!(e,Ev::Discovery{..})).count(),3);
                assert!(g.lineage.town.owned_shapes.contains(shape));
                finish(&mut g,tier);
                assert!(g.lineage.town.owned_shapes.contains(shape));
                let line=g.batch.exits.last().unwrap();
                assert_eq!(line.discoveries.iter().map(|d|d.kind.as_str()).collect::<Vec<_>>(),vec![shape,"ironcap","trailboots"]);
                for kind in ["ironcap","trailboots"] {assert!(line.found.iter().any(|f|f.kind==kind&&f.n==1&&f.fate=="converted"));}
                assert!(line.found.iter().any(|f|f.kind==shape&&f.n==1&&f.fate=="converted"));
                assert!(line.finds.iter().any(|f|f.label==definition(shape).unwrap().label));
                let loaded=Game::load(&g.save()).unwrap();
                assert_eq!(loaded.lineage.town.owned_shapes,g.lineage.town.owned_shapes);
                assert_eq!(loaded.batch.discoveries,g.batch.discoveries);
            }
        }
    }
    #[test]
    fn actual_duplicate_value_once_without_duplicate_unlock_or_autoequip() {
        let mut g=arena();
        let weapon=g.run.as_ref().unwrap().hero.weapon.clone();
        for id in [901,902] {
            let (r,mut cx)=g.ctx();collect_pattern(r,&mut cx,Item::new(id,"crownsplitter"),"controlled real pickup");
        }
        let r=g.run.as_ref().unwrap();assert_eq!(r.loot_raw,50);
        assert_eq!(r.hero.weapon,weapon);assert_eq!(r.discoveries.len(),1);
        let mut receipt=r.pattern_receipts[0].clone();
        let (r,mut cx)=g.ctx();assert_eq!(claim_found_value(r,&mut cx,&mut receipt),0);
        assert_eq!(r.loot_raw,50);assert_eq!(r.discoveries.len(),1);
        finish(&mut g,ExitTier::Return);
        assert_eq!(g.lineage.gold,512);
        assert_eq!(g.batch.discoveries.iter().map(|d|d.kind.as_str()).collect::<Vec<_>>(),vec!["crownsplitter"]);
    }
    #[test]
    fn ordinary_masterwork_unlocks_shape_but_never_permanent_enchantment() {
        let mut g=arena();let mut it=Item::new(910,"sword");it.enchant=8;
        assert_eq!(crate::item::rarity(&it,true),Rarity::Masterwork);
        let r=g.run.as_mut().unwrap();r.items.push(FloorItem{pos:r.hero.pos,item:it});
        let (r,mut cx)=g.ctx();crate::turn::pickup_here(r,&mut cx);
        assert_eq!(r.loot_raw,105);
        assert!(cx.owned_shapes.contains("sword"));
        assert!(r.discoveries[0].tradeoff.contains("temporary"));
        finish(&mut g,ExitTier::Death);
        g.lineage.starting_config=Some(StartingConfig{weapon:Some("sword".into()),armour:Some("none".into()),supplies:vec![],..Default::default()});
        let mut h=crate::hero::Hero::new(Class::Fighter,crate::geom::Pos::new(0,0));crate::kit::equip(&g.lineage,&mut h);
        assert_eq!(h.weapon.as_ref().unwrap().enchant,0);
        assert_eq!(h.atk(),(3,7));
    }
    #[test]
    fn crownsplitter_control_bonus_has_real_tempo_cost() {
        for controlled in [false,true] {
            let mut sword=arena();let mut crown=sword.clone();
            crown.run.as_mut().unwrap().hero.weapon=Some(Item::new(crate::kit::WEAPON_ID,"crownsplitter")).into();
            for g in [&mut sword,&mut crown] {
                crate::tests::add_monster(g,"goblin",5,5);
                let (r,mut cx)=g.ctx();r.monsters[0].hp=30;r.monsters[0].max_hp=30;
                r.monsters[0].stun=if controlled {1}else{0};
                crate::turn::damage_monster(r,&mut cx,0,4,&Src::Hero{ranged:false});
            }
            assert_eq!(sword.run.as_ref().unwrap().monsters[0].hp,26);
            assert_eq!(crown.run.as_ref().unwrap().monsters[0].hp,if controlled {24}else{26});
            assert_eq!(crown.run.as_ref().unwrap().hero.speed(),sword.run.as_ref().unwrap().hero.speed()-1);
            assert_eq!(crown.run.as_ref().unwrap().rng,sword.run.as_ref().unwrap().rng);
        }
    }
    #[test]
    fn hearthglass_heals_natural_hero_kills_only_and_has_lower_guard() {
        for (summoned,ally,neutral,hero_kill) in [(false,false,false,true),(true,false,false,true),(false,true,false,true),(false,false,true,true),(false,false,false,false)] {
            let mut g=arena();crate::tests::add_monster(&mut g,"goblin",5,5);
            let (r,mut cx)=g.ctx();r.hero.hp=10;r.hero.armour=Some(Item::new(crate::kit::ARMOUR_ID,"hearthglass")).into();
            r.monsters[0].summoned=summoned;r.monsters[0].ally=ally;r.monsters[0].neutral=neutral;
            crate::turn::damage_monster(r,&mut cx,0,100,&if hero_kill {Src::Hero{ranged:false}}else{Src::Fire});
            assert_eq!(r.hero.hp,if !summoned&&!ally&&!neutral&&hero_kill {12}else{10});
            assert_eq!(r.hero.def(),1);
            r.hero.armour=Some(Item::new(crate::kit::ARMOUR_ID,"mail")).into();assert_eq!(r.hero.def(),3);
        }
    }
    #[test]
    fn frostmantle_hazards_never_round_to_immunity_and_melee_costs_more() {
        for src in [Src::Gas,Src::Poison,Src::Burst] {
            for (raw,want) in [(1,1),(2,1),(3,1),(5,3)] {
                let mut g=arena();let (r,mut cx)=g.ctx();r.hero.hp=30;r.hero.armour=Some(Item::new(crate::kit::ARMOUR_ID,"frostmantle")).into();
                crate::turn::damage_hero(r,&mut cx,raw,&src);assert_eq!(r.hero.hp,30-want);
            }
        }
        for (shape,want) in [("frostmantle",5),("mail",3)] {
            let mut g=arena();crate::tests::add_monster(&mut g,"goblin",5,5);
            let (r,mut cx)=g.ctx();r.hero.hp=30;r.hero.armour=Some(Item::new(crate::kit::ARMOUR_ID,shape)).into();
            let dmg=(6-r.hero.def()).max(1);crate::turn::damage_hero(r,&mut cx,dmg,&Src::Mon(0));assert_eq!(r.hero.hp,30-want);
        }
    }
    #[test]
    fn explicit_armour_all_ranks_classes_are_monotonic_without_default_changes() {
        for class in Class::ALL {
            for shape in ["leather","mail","plate","hearthglass","frostmantle"] {
                let mut g=Game::new_resident(1);g.lineage.class=class;g.lineage.town.owned_shapes.insert(shape.into());
                let mut previous=0;
                for rank in 0..=7 {
                    g.lineage.kit.insert("armour".into(),rank);
                    g.lineage.starting_config=None;
                    let mut default=crate::hero::Hero::new(class,crate::geom::Pos::new(0,0));crate::kit::equip(&g.lineage,&mut default);
                    let expected=[0,1,2,3,4,5,5,6][rank as usize];assert_eq!(default.def(),expected);
                    g.lineage.starting_config=Some(StartingConfig{weapon:None,armour:Some(shape.into()),supplies:vec![],..Default::default()});
                    let mut explicit=crate::hero::Hero::new(class,crate::geom::Pos::new(0,0));crate::kit::equip(&g.lineage,&mut explicit);
                    let guard=explicit.def();assert_eq!(guard,crate::defs::item_def(shape).a.0+(expected-1).max(0));
                    assert!(guard>=previous);previous=guard;
                }
            }
        }
    }
    #[test]
    fn unowned_and_incompatible_named_shapes_refuse_atomically() {
        let mut g=Game::new_resident(1);
        let config=StartingConfig{weapon:Some("crownsplitter".into()),armour:None,supplies:vec![],..Default::default()};
        let before=g.save();assert!(crate::kit::set_starting(&mut g,Some(config.clone())).is_err());assert_eq!(g.save(),before);
        g.lineage.town.owned_shapes.insert("crownsplitter".into());g.lineage.class=Class::Gunner;
        let before=g.save();assert!(crate::kit::set_starting(&mut g,Some(config)).is_err());assert_eq!(g.save(),before);
        assert!(!owned_wire(&g.lineage)[0].compatible);
    }
    #[test]
    fn drop_hash_is_read_only_compatible_and_repeat_is_bounded() {
        let mut g=arena();let r=g.run.as_mut().unwrap();let rng=r.rng.clone();
        assert_eq!(boss_drop(r,"goblin_warlord",&Default::default()),Some("crownsplitter"));
        r.hero.class=Class::Gunner;assert_eq!(boss_drop(r,"goblin_warlord",&Default::default()),Some("hearthglass"));
        let owned=["hearthglass".into()].into_iter().collect();
        let n=(0..256).filter(|seed|{r.seed= *seed;boss_drop(r,"goblin_warlord",&owned).is_some()}).count();
        assert!((16..=48).contains(&n),"{n}");assert_eq!(r.rng,rng);
        assert_eq!(boss_drop(r,"goblin",&owned),None);
    }
    #[test]
    fn prepared_kit_refits_merged_units_without_repaying_or_respawning() {
        let mut g=Game::new(13);g.build_town("house").unwrap();
        // Controlled catalogue/waystone, actual preparation, paid upgrades,
        // ration and current free passage. No claimed earned unlock evidence.
        g.lineage.gold=2000;
        g.lineage.forge.insert("heal".into(),crate::wire::ForgeRow::at(5));
        g.lineage.town.owned_shapes.extend(["crownsplitter","frostmantle","hearthglass","hearthglass_hood","hearthglass_boots"].map(str::to_string));
        crate::kit::buy(&mut g,"pack").unwrap();
        crate::feats::buy_ration(&mut g.lineage).unwrap();
        assert_eq!(g.lineage.supplies.iter().filter(|i|i.free&&i.kind=="leash").count(),1);
        g.buy_supply("leash").unwrap();g.buy_supply("leash").unwrap();g.buy_supply("heal").unwrap();
        g.lineage.waystones.push(9);
        g.lineage.lane_stones.push((9,g.lineage.rules().route().prefix(9).0));
        g.lineage.set_start(9).unwrap();
        g.start_run(None);
        let old=g.run.as_ref().unwrap().clone();
        assert_eq!(old.prepared_supplies.iter().filter(|i|i.kind=="leash"&&!i.free).count(),2);
        assert_eq!(old.hero.inv.iter().filter(|i|i.kind=="leash").map(|i|i.amount).sum::<i32>(),3);
        assert!(old.hero.fed);assert_eq!(old.start,9);
        assert_eq!(old.toll,crate::engine::LineageState::start_toll(9));
        assert!(g.lineage.night_passes.contains(&9));
        let gold=g.lineage.gold;let ledger=g.lineage.ledger();let rations=g.lineage.feats.rations;
        let config=StartingConfig{weapon:Some("crownsplitter".into()),armour:Some("frostmantle".into()),supplies:vec!["leash".into(),"leash".into(),"leash".into(),"heal".into()],follow_set:Some("hearthglass".into()),pins:Some(crate::armour_sets::Pins{armour:Some("frostmantle".into()),..Default::default()}),..Default::default()};
        crate::kit::set_starting(&mut g,Some(config.clone())).unwrap();
        let r=g.run.as_ref().unwrap();
        assert_eq!(r.hero.weapon.as_ref().unwrap().kind,"crownsplitter");assert_eq!(r.hero.armour.as_ref().unwrap().kind,"frostmantle");
        assert_eq!(r.hero.helm.as_ref().unwrap().kind,"hearthglass_hood");assert_eq!(r.hero.boots.as_ref().unwrap().kind,"hearthglass_boots");
        assert_eq!(crate::armour_sets::count(&r.hero),2);
        assert_eq!(r.hero.inv.iter().filter(|i|i.kind=="leash").map(|i|i.amount).sum::<i32>(),3);
        assert_eq!(r.prepared_supplies.iter().filter(|i|i.free).count(),1);
        assert_eq!(r.bought_leashes.len(),2);assert_eq!(r.hero.inv.iter().filter(|i|i.kind=="heal").count(),1);
        assert_eq!(r.rng,old.rng);assert_eq!(r.floor,old.floor);assert_eq!(r.route,old.route);
        assert_eq!(r.next_item_id,old.next_item_id);assert_eq!(r.hero.pos,old.hero.pos);
        assert_eq!(r.monsters,old.monsters);assert_eq!(r.items,old.items);
        assert_eq!(r.toll,old.toll);assert_eq!(r.start,old.start);assert_eq!(r.hero.max_hp,old.hero.max_hp);
        assert_eq!(g.lineage.gold,gold);assert_eq!(g.lineage.ledger(),ledger);assert_eq!(g.lineage.feats.rations,rations);
        let before=g.save();let mut oversized=config;oversized.supplies.push("heal".into());
        assert!(crate::kit::set_starting(&mut g,Some(oversized)).is_err());assert_eq!(g.save(),before);
        let mut loaded=Game::load(&before).unwrap();
        let saved_config=loaded.lineage.starting_config.clone().unwrap();
        let kid=crate::kit::save_starting(&mut loaded,"Control",saved_config,None).unwrap();
        loaded.lineage.gold=0;
        crate::kit::select_starting(&mut loaded,&kid).unwrap();
        assert_eq!(loaded.lineage.gold,0);
        assert_eq!(loaded.run.as_ref().unwrap().prepared_supplies.iter().filter(|i|i.free).count(),1);
    }
    #[test]
    fn discoveries_union_across_real_paid_residents_and_reads_stay_pure() {
        let mut s=crate::bloodlines::Session::new(1);s.build_town("house").unwrap();s.lineage.gold=1000;s.add_bloodline().unwrap();
        crate::kit::buy(&mut s.active,"weapon").unwrap();
        s.active.lineage.town.owned_shapes.insert("crownsplitter".into());
        s.others.get_mut(&2).unwrap().lineage.town.owned_shapes.insert("hearthglass".into());
        let saved=s.save();let mut loaded=crate::bloodlines::Session::load(&saved).unwrap();
        loaded.select_bloodline(2).unwrap();
        let before=loaded.save();let rows=loaded.lineage().legendaries;
        assert_eq!(rows.len(),2);assert_eq!(loaded.save(),before);
        assert_eq!(crate::kit::owned(&loaded.lineage,"weapon"),0);
        loaded.select_bloodline(1).unwrap();assert_eq!(loaded.lineage().legendaries,rows);
        assert_eq!(crate::kit::owned(&loaded.lineage,"weapon"),1);
        assert_eq!(loaded.lineage.kit,s.active.lineage.kit);
    }
    #[test]
    fn automatic_floor_find_and_receipts_match_whole_sliced_reloaded_offline() {
        let mut g=arena();
        let r=g.run.as_mut().unwrap();r.items.push(FloorItem{pos:r.hero.pos,item:Item::new(950,"hearthglass")});
        let mut whole=g.clone();let mut sliced=Game::load(&g.save()).unwrap();
        let a=crate::offline::run_offline_slice(&mut whole,60,true);
        let b=crate::offline::run_offline_slice(&mut sliced,30,false);
        assert!(b.slice_pending);
        sliced=Game::load(&sliced.save()).unwrap();let c=crate::offline::run_offline_slice(&mut sliced,30,true);
        assert!(whole.lineage.town.owned_shapes.contains("hearthglass"));
        assert_eq!(whole.lineage.town.owned_shapes,sliced.lineage.town.owned_shapes);
        assert_eq!(whole.lineage.gold,sliced.lineage.gold);
        assert_eq!(whole.lineage.total_turns,sliced.lineage.total_turns);
        assert_eq!(whole.run,sliced.run);
        assert_eq!(a.discoveries.len(),1);
        assert_eq!(a.discoveries,b.discoveries.into_iter().chain(c.discoveries).collect::<Vec<_>>());
    }
    #[test]
    fn first_discovery_survives_capped_recent_exits_in_actual_report() {
        let mut g=arena();kill(&mut g,"goblin_warlord");finish(&mut g,ExitTier::Return);
        for _ in 0..8 {g.start_run(None);finish(&mut g,ExitTier::Return);}
        assert_eq!(g.batch.exits.len(),crate::engine::EXITS_CAP);
        assert!(g.batch.exits.iter().all(|l|l.discoveries.is_empty()));
        assert_eq!(g.batch.discoveries.iter().map(|d|d.kind.as_str()).collect::<Vec<_>>(),vec!["crownsplitter","ironcap","trailboots"]);
        let facts=g.lineage.facts.clone();let class=g.lineage.class.name().to_string();let rank=g.lineage.class_level();
        let report=crate::offline::report_with(&mut g,0,&facts,&class,rank,false,false,false);
        assert_eq!(report.discoveries.len(),3);
        assert_eq!(report.discoveries[0].kind,"crownsplitter");
    }
    #[test]
    fn ordinary_sword_gets_more_real_attacks_without_control() {
        let mut sword=arena();crate::tests::add_monster(&mut sword,"goblin",5,5);
        let r=sword.run.as_mut().unwrap();r.hero.hp=1000;r.hero.max_hp=1000;r.monsters[0].hp=10000;r.monsters[0].max_hp=10000;
        let mut crown=sword.clone();crown.run.as_mut().unwrap().hero.weapon=Some(Item::new(crate::kit::WEAPON_ID,"crownsplitter")).into();
        for _ in 0..60 {sword.tick();crown.tick();}
        let attacks=|g:&Game|g.events.iter().filter(|e|matches!(e,Ev::Attack{src:HERO_ID,..})).count();
        assert!(attacks(&sword)>attacks(&crown),"sword={} crown={}",attacks(&sword),attacks(&crown));
        assert!(sword.run.as_ref().unwrap().over.is_none()&&crown.run.as_ref().unwrap().over.is_none());
    }
    #[test]
    fn hearthglass_wins_a_trash_clear_but_mail_wins_repeated_single_target_blows() {
        for trash in [true,false] {
            let mut scores=Vec::new();
            for shape in ["hearthglass","mail"] {
                let mut g=arena();g.run.as_mut().unwrap().hero.hp=15;
                g.run.as_mut().unwrap().hero.armour=Some(Item::new(crate::kit::ARMOUR_ID,shape)).into();
                if trash {kill(&mut g,"goblin");kill(&mut g,"goblin");}
                else {
                    crate::tests::add_monster(&mut g,"goblin",5,5);
                    let (r,mut cx)=g.ctx();
                    for _ in 0..2 {let dmg=(6-r.hero.def()).max(1);crate::turn::damage_hero(r,&mut cx,dmg,&Src::Mon(0));}
                    crate::turn::damage_monster(r,&mut cx,0,100,&Src::Hero{ranged:false});
                }
                scores.push(g.run.as_ref().unwrap().hero.hp);
            }
            assert_eq!(scores,if trash {vec![19,15]}else{vec![7,9]});
        }
    }
    #[test]
    fn actual_confirmed_stat_rebirth_and_world_reset_retain_patterns_with_honest_ranks() {
        let mut g=Game::new(215);g.build_town("house").unwrap();g.try_send().unwrap();
        for boss in ["goblin_warlord","bloat_mother","lich"] {kill(&mut g,boss);}
        let owned=g.lineage.town.owned_shapes.clone();assert_eq!(owned.iter().map(String::as_str).collect::<Vec<_>>(),vec!["crownsplitter","frostmantle","hearthglass","ironcap","trailboots"]);
        let (r,mut cx)=g.ctx();crate::turn::damage_hero(r,&mut cx,999,&Src::Gas);g.finish_run().unwrap();
        assert_eq!(g.lineage.town.owned_shapes,owned);
        g.advance(60_000);assert_eq!(crate::persistent::remaining(&g.lineage),0);
        // Controlled qualification/budget; all purchases and resets themselves
        // use the actual APIs. This does not certify an earned world clear.
        g.lineage.best_depth=8;g.lineage.gold=1000;crate::legacy::ensure(&mut g.lineage);
        g.lineage.bloodline.as_mut().unwrap().points=20;
        g.upgrade_hero_next("health").unwrap();
        crate::kit::buy(&mut g,"weapon").unwrap();crate::kit::buy(&mut g,"armour").unwrap();
        let ranks=g.lineage.kit.clone();let gold=g.lineage.gold;
        let preview=crate::persistent::preview(&g.lineage,crate::persistent::away(&g));
        assert!(preview.available,"{:?}",preview.blocked);g.rebirth_hero(&preview.token).unwrap();
        assert_eq!(g.lineage.town.owned_shapes,owned);assert_eq!(g.lineage.kit,ranks);assert_eq!(g.lineage.gold,gold);
        assert!(g.lineage.bloodline.as_ref().unwrap().upgrades.is_empty());
        g.advance(60_000);g.lineage.ended=true;g.ascend("short_list").unwrap();
        assert_eq!(g.lineage.town.owned_shapes,owned);
        assert!(g.lineage.kit.is_empty(),"existing world reset clears paid ranks");assert_eq!(g.lineage.gold,0);
        crate::kit::set_starting(&mut g,Some(StartingConfig{weapon:Some("crownsplitter".into()),armour:Some("frostmantle".into()),supplies:vec![],..Default::default()})).unwrap();
        assert_eq!(g.lineage.gold,0);
        let wire=crate::kit::starting_wire(&g.lineage);
        assert_eq!(wire.actual_weapon,"crownsplitter");assert_eq!(wire.actual_armour.as_deref(),Some("frostmantle"));
        let loaded=Game::load(&g.save()).unwrap();assert_eq!(loaded.lineage.town.owned_shapes,owned);
    }
}
