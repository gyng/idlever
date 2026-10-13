//! Cut 23 §1: the forge — the heir's starting kit bought with gold (both cohort-18 raters held
//! ~$2100 after the absence and nothing worth buying). Three ladders (weapon, armour, pack),
//! each step permanent for the lineage: every heir starts with every owned step, a death loses
//! none. Prices come from the lineage (`unit`: its best depth, as the shelf's are), so a step
//! costs about the same share of a night wherever the lineage is; the row slots sit on the
//! same ladder (`row_gold`).
use crate::engine::{Game, LineageState};
use crate::hero::Hero;
use crate::item::Item;
use crate::wire::{KitBranch, KitLadder, KitNext, KitStep};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct StartingConfig {
    pub weapon: Option<String>,
    pub armour: Option<String>,
    pub supplies: Vec<String>,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub helm: Option<String>,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub boots: Option<String>,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub follow_set: Option<String>,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub pins: Option<crate::armour_sets::Pins>,
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct NamedKit {
    pub id: String,
    pub name: String,
    pub config: StartingConfig,
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct GearChoice {
    pub kind: String,
    pub label: String,
    pub damage: [i32; 2],
    pub armour: i32,
    pub speed: i32,
    pub available: bool,
    pub needs: Option<String>,
    pub ranged: bool,
    pub compatible: bool,
    #[serde(default, skip_serializing_if="std::ops::Not::not")]
    pub legendary: bool,
    #[serde(default, skip_serializing_if="Option::is_none")]
    pub effect: Option<String>,
    #[serde(default, skip_serializing_if="Option::is_none")]
    pub tradeoff: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct StartingKits {
    pub current: Option<StartingConfig>,
    pub selected: Option<String>,
    pub saved: Vec<NamedKit>,
    pub weapons: Vec<GearChoice>,
    pub armours: Vec<GearChoice>,
    pub actual_weapon: String,
    pub actual_armour: Option<String>,
    pub helms: Vec<GearChoice>,
    pub boots: Vec<GearChoice>,
    pub armour_sets: Vec<crate::armour_sets::FamilyWire>,
}

pub(crate) fn shape_available(l: &LineageState, kind: &str, cat: crate::defs::Cat) -> bool {
    if cat == crate::defs::Cat::Weapon && l.class == crate::hero::Class::Gunner { return false; }
    if crate::legendary::definition(kind).is_some()&&!l.town.owned_shapes.contains(kind) {return false;}
    crate::defs::ITEMS.iter().any(|d| d.kind == kind && d.cat == cat)
        && crate::firearm::Profile::of(kind).is_none()
        && (cat == crate::defs::Cat::Weapon && kind == crate::firearm::starting_kind(l)
            || l.town.owned_shapes.contains(kind)
            || l.forge.get(kind).is_some_and(|row| row.craftable))
}

pub fn starting_weapon_compatible(l: &LineageState) -> bool {
    l.starting_config.as_ref().and_then(|c|c.weapon.as_deref()).is_none_or(|k|shape_available(l,k,crate::defs::Cat::Weapon))
}

pub fn starting_wire(l: &LineageState) -> StartingKits {
    let choices = |cat| crate::defs::ITEMS.iter().filter(|d| d.cat == cat && crate::firearm::Profile::of(d.kind).is_none()
            && (crate::legendary::definition(d.kind).is_none()||l.town.owned_shapes.contains(d.kind)))
        .map(|d| GearChoice { kind: d.kind.into(), label: crate::item::kind_name(d.kind),
            legendary:crate::legendary::definition(d.kind).is_some(),
            effect:crate::legendary::definition(d.kind).map(|x|x.effect.into()),
            tradeoff:crate::legendary::definition(d.kind).map(|x|x.tradeoff.into()),
            damage: if cat == crate::defs::Cat::Weapon {
                let mut w=Item::new(WEAPON_ID,d.kind);w.enchant=owned(l,"weapon") as i32;w.forged=weapon_forged(l);
                let (a,b)=w.atk();[a,b]
            } else { [0,0] },
            armour: if cat == crate::defs::Cat::Armour { d.a.0+if crate::armour_sets::slot(d.kind)==crate::armour_sets::Slot::Armour {explicit_armour_bonus(l)}else{0} } else { 0 }, speed: d.speed,
            available: shape_available(l, d.kind, cat),
            ranged: d.ranged, compatible: cat != crate::defs::Cat::Weapon || l.class != crate::hero::Class::Gunner,
            needs: (!shape_available(l, d.kind, cat)).then(|| if cat == crate::defs::Cat::Weapon && l.class == crate::hero::Class::Gunner {
                "Gunner uses firearms".into()
            } else if crate::armour_sets::standalone(d.kind) {"Defeat the Warlord".into()}
            else if let Some(def)=crate::legendary::definition(d.kind) {def.source.into()}
            else { format!("discover {} more", 5u32.saturating_sub(l.forge.get(d.kind).map_or(0, |r| r.salvaged))) }) }).collect::<Vec<_>>();
    let mut hero=Hero::new(l.class,crate::geom::Pos::new(0,0)); equip(l,&mut hero);
    StartingKits { current: l.starting_config.clone(), selected: l.starting_selected.clone(),
        saved: l.named_kits.clone(), weapons: choices(crate::defs::Cat::Weapon), armours: choices(crate::defs::Cat::Armour).into_iter().filter(|d|crate::armour_sets::slot(&d.kind)==crate::armour_sets::Slot::Armour).collect(),
        helms:choices(crate::defs::Cat::Armour).into_iter().filter(|d|crate::armour_sets::slot(&d.kind)==crate::armour_sets::Slot::Helm).collect(),
        boots:choices(crate::defs::Cat::Armour).into_iter().filter(|d|crate::armour_sets::slot(&d.kind)==crate::armour_sets::Slot::Boots).collect(),
        armour_sets:crate::armour_sets::wire(l,Some(&hero)),
        actual_weapon: hero.weapon.as_ref().map(|w|w.kind.clone()).unwrap_or_default(), actual_armour: hero.armour.as_ref().map(|a|a.kind.clone()) }
}

fn validate_config(game: &Game, config: &StartingConfig) -> Result<(), String> {
    if config.weapon.as_ref().is_some_and(|k| !shape_available(&game.lineage, k, crate::defs::Cat::Weapon))
        || config.armour.as_ref().is_some_and(|k| k != "none" && !shape_available(&game.lineage, k, crate::defs::Cat::Armour)) {
        return Err("gear not unlocked".into());
    }
    if config.follow_set.as_deref().is_some_and(|s|s!="hearthglass") {return Err("unknown armour set".into());}
    if config.follow_set.is_some()&&!game.lineage.town.owned_shapes.contains("hearthglass") {return Err("Discover Hearthglass first".into());}
    for slot in crate::armour_sets::SLOTS {
        if crate::armour_sets::fallback(config,slot).is_some_and(|k|!crate::armour_sets::available(&game.lineage,k,slot))
            ||config.pins.as_ref().and_then(|p|p.get(slot)).is_some_and(|k|!crate::armour_sets::available(&game.lineage,k,slot)) {return Err("slot gear not unlocked".into());}
    }
    let extra_free = game.lineage.supplies.iter().chain(home_preparation(game).iter()).filter(|i| i.free).count()
        .saturating_sub(config.supplies.iter().filter(|k| k.as_str() == "leash").count());
    if config.supplies.len() + extra_free > game.lineage.supply_cap() { return Err("kit too large".into()); }
    let catalogue = game.supply_catalogue();
    if config.supplies.iter().any(|k| !catalogue.iter().any(|s| &s.kind == k)) { return Err("item not unlocked".into()); }
    Ok(())
}

pub fn set_starting(game: &mut Game, mut config: Option<StartingConfig>) -> Result<(), String> {
    if let (Some(old),Some(new))=(&game.lineage.starting_config,config.as_mut()) {
        if old.follow_set.is_some()&&new.follow_set.is_none() {
            let mut compared=old.clone();compared.follow_set=None;
            if *new==compared {
                for slot in crate::armour_sets::SLOTS {
                    let (kind,_)=crate::armour_sets::resolve(&game.lineage,slot);
                    match slot {crate::armour_sets::Slot::Helm=>new.helm=kind,crate::armour_sets::Slot::Armour=>new.armour=kind,crate::armour_sets::Slot::Boots=>new.boots=kind}
                }
            }
        }
    }
    if let Some(config) = &config { validate_config(game, config)?; }
    game.lineage.starting_config = config;
    game.lineage.starting_selected = None;
    refit_starting(game);
    Ok(())
}

pub fn save_starting(game: &mut Game, name: &str, config: StartingConfig, id: Option<&str>) -> Result<String, String> {
    validate_config(game, &config)?;
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 32 || name.chars().any(char::is_control) { return Err("invalid kit name".into()); }
    if let Some(id) = id {
        let old = game.lineage.named_kits.iter_mut().find(|k| k.id == id).ok_or("unknown kit")?;
        old.name = name.into(); old.config = config;
        if game.lineage.starting_selected.as_deref() == Some(id) { game.lineage.starting_selected = None; }
        return Ok(id.into());
    }
    if game.lineage.named_kits.len() >= 8 { return Err("eight kits maximum".into()); }
    let id = format!("kit{}", game.lineage.next_named_kit);
    game.lineage.next_named_kit += 1;
    game.lineage.named_kits.push(NamedKit { id: id.clone(), name: name.into(), config });
    Ok(id)
}

pub fn select_starting(game: &mut Game, id: &str) -> Result<(), String> {
    let config = game.lineage.named_kits.iter().find(|k| k.id == id).ok_or("unknown kit")?.config.clone();
    validate_config(game, &config)?;
    game.lineage.starting_config = Some(config);
    game.lineage.starting_selected = Some(id.into());
    refit_starting(game);
    Ok(())
}

pub fn delete_starting(game: &mut Game, id: &str) -> Result<(), String> {
    let i = game.lineage.named_kits.iter().position(|k| k.id == id).ok_or("unknown kit")?;
    game.lineage.named_kits.remove(i);
    if game.lineage.starting_selected.as_deref() == Some(id) { game.lineage.starting_selected = None; }
    Ok(())
}

/// Replace preparation only for an explicitly selected configuration. Preserve kennel provenance.
pub fn prepare_starting(game: &mut Game) {
    let Some(config) = game.lineage.starting_config.clone() else { return };
    let mut remaining = config.supplies.clone();
    game.lineage.supplies.retain_mut(|i| {
        if let Some(n) = remaining.iter().position(|k| *k == i.kind) {
            remaining.remove(n);
            if !i.free { i.auto_packed = false; }
            true
        } else { i.free }
    });
    // Authored named slots replace the old repeated selection; package slots may use spare space.
    game.lineage.last_supplies = config.supplies.clone();
    game.lineage.last_supply_origins.clear();
    for kind in remaining {
        let _ = game.buy_supply(&kind);
    }
}

/// Exact unconsumed home units. Old in-flight preparations can be recovered
/// from the persisted packing ledger; no loot or value is manufactured.
fn home_preparation(game:&Game)->Vec<Item> {
    let Some(run)=game.run.as_ref().filter(|_|!crate::persistent::away(game)) else {return Vec::new()};
    if !run.prepared_supplies.is_empty() {return run.prepared_supplies.clone();}
    let mut items=Vec::new();
    let mut used=std::collections::BTreeSet::new();
    let mut free_leashes=run.packed.iter().filter(|k|k.as_str()=="leash").count().saturating_sub(run.bought_leashes.len());
    let all:Vec<_>=run.hero.inv.iter().chain(run.hero.weapon.iter()).chain(run.hero.armour.iter()).chain(run.hero.helm.iter()).chain(run.hero.boots.iter()).collect();
    for (n,kind) in run.packed.iter().enumerate() {
        let physical=all.iter().find(|i|i.kind==*kind&&(kind=="leash"||run.supplies.contains(&i.id)&&!used.contains(&i.id)));
        let Some(physical)=physical else {continue};
        let mut item=(*physical).clone();
        if kind!="leash" {used.insert(item.id);}
        if kind=="leash" {
            item.amount=1;
            item.free=free_leashes>0;
            free_leashes=free_leashes.saturating_sub(1);
        }
        item.auto_packed=game.lineage.last_supply_origins.get(n).is_some_and(|(k,a)|k==kind&&*a);
        item.value_claimed=true;
        items.push(item);
    }
    items
}
fn refit_starting(game:&mut Game) {
    if crate::persistent::away(game)||game.run.is_none() {prepare_starting(game);return;}
    let old=home_preparation(game);
    let run=game.run.as_mut().unwrap();
    let mut leash_units=old.iter().filter(|i|i.kind=="leash").count() as i32;
    run.hero.inv.retain_mut(|i| {
        if i.kind=="leash"&&leash_units>0 {
            let removed=i.amount.max(1).min(leash_units);
            i.amount=i.amount.max(1)-removed;leash_units-=removed;
            i.amount>0
        }else{!run.supplies.contains(&i.id)}
    });
    if run.hero.weapon.as_ref().is_some_and(|i|run.supplies.contains(&i.id)) {run.hero.weapon=None.into();}
    if run.hero.armour.as_ref().is_some_and(|i|run.supplies.contains(&i.id)) {run.hero.armour=None.into();}
    if run.hero.helm.as_ref().is_some_and(|i|run.supplies.contains(&i.id)) {run.hero.helm=None.into();}
    if run.hero.boots.as_ref().is_some_and(|i|run.supplies.contains(&i.id)) {run.hero.boots=None.into();}
    game.lineage.supplies.extend(old);
    prepare_starting(game);
    let run=game.run.as_mut().unwrap();
    run.supplies.clear();run.packed.clear();run.bought_leashes.clear();run.prepared_supplies.clear();
    for mut it in std::mem::take(&mut game.lineage.supplies) {
        it.value_claimed=true;
        run.supplies.push(it.id);run.packed.push(it.kind.clone());
        run.prepared_supplies.push(it.clone());
        if it.kind=="leash" {
            if !it.free {run.bought_leashes.push(it.paid);}
            match run.hero.inv.iter_mut().find(|i|i.kind=="leash") {
                Some(stack)=>stack.amount+=it.amount.max(1),
                None=>run.hero.inv.push(it),
            }
        }else{run.hero.auto_equip(it);}
    }
    // Reuse the paid actor and its floor/RNG/toll/pets; refresh replay snapshots.
    crate::persistent::refit_build(game,true);
}

/// The ladders, in the camp's order.
pub const KIT_SLOTS: [&str; 3] = ["weapon", "armour", "pack"];

/// Weapon steps: the class's starting arm, +1 per step, to +3. (Deviation from the contract's
/// 4–5 steps: a fourth, +4, doubled the fighter's blow at depth and broke the D33 wall without
/// its counter — the kitted FULL−D33 passed on 3–5 of 30 seeds, bar 3.)
/// Cut 30 (the idle-first pivot retired the "not engaging fails" rows that capped it: the blacksmith
/// is a multiplier the idle floor lacks): three more steps, each a harder blow (+1 damage).
pub const WEAPON_MULT: [u32; 6] = [1, 4, 9, 16, 25, 36];
/// Weapon steps past this many are damage, not aim.
pub const AIM_STEPS: i32 = 3;
/// Each weapon step past the aim adds this much to the blow.
pub const DMG_PER_STEP: i32 = 2;
/// Cut 25 §1 (AN: the forge moved bank more than any row): a weapon step is aim — this many
/// points on the 80 % to hit — not damage (`Hero::hit_pct`; the arm's blow is the class's own).
pub const AIM_PER_STEP: u32 = 4;
/// Armour steps: (kind, enchant) and their multiples. The top is mail +1 (4 armour): armour
/// subtracts from every blow, and a fifth point (mail +2) made the Deep's lurkers harmless —
/// the kitted FULL−D28 passed the Queen's wall on 11 of 30 seeds without her counter.
/// Cut 30: three more steps (mail +2, plate, plate +1), the forge a multiplier the idle floor lacks.
pub const ARMOUR_STEPS: [(&str, i32); 7] = [("leather", 0), ("leather", 1), ("mail", 0), ("mail", 1), ("mail", 2), ("plate", 0), ("plate", 1)];
pub const ARMOUR_MULT: [u32; 7] = [1, 4, 8, 14, 22, 32, 45];
/// Cut 113 §2 (blind cohorts: "forge/upgrades were strictly ordered"): each weapon and armour tier
/// offers two steps, priced alike — weapon `aim` (the to-hit) · `edge` (the blow), armour `plate`
/// (the next piece) · `pace` (speed). The ladder's own order is each tier's default (aim to +3,
/// then the edge; plate throughout), so a lineage that never chooses forges what it always did.
pub const BRANCHES: [(&str, [&str; 2]); 2] = [("weapon", ["aim", "edge"]), ("armour", ["plate", "pace"])];
/// Aim past the ladder's third aim step: this many points a step (the to-hit tops out at 100).
pub const AIM_PER_LATE_STEP: u32 = 3;
/// An edge taken in the aim's tiers (the first three) adds this much to the blow (the measured
/// branch panel: a full `DMG_PER_STEP` there out-reached the aim at every wall).
pub const EARLY_EDGE: i32 = 1;
/// Each pace step's speed, in tenths of a point (base 10: `pace +8%` is 0.8), the first pace step
/// first — falling, since a full point a step out-reached plate at every wall from the fifth.
pub const PACE_TENTHS: [i32; 7] = [8, 7, 6, 5, 5, 4, 4];

/// The speed in tenths of `q` pace steps.
pub fn pace_tenths(q: usize) -> i32 {
    PACE_TENTHS.iter().take(q).sum()
}

/// A tick's share of a fractional pace (`Hero::pace` in tenths): one more energy on this many ticks of ten.
pub fn pace_energy(pace: i32, tick: u32) -> i32 {
    ((tick % 10) < (pace.rem_euclid(10)) as u32) as i32
}

/// A ladder's two branches (`None`: the pack, one step a tier).
pub fn branches(slot: &str) -> Option<[&'static str; 2]> {
    BRANCHES.iter().find(|(s, _)| *s == slot).map(|(_, b)| *b)
}

/// Tier `i`'s default branch (the ladder's own order).
pub fn default_branch(slot: &str, i: usize) -> Option<&'static str> {
    let b = branches(slot)?;
    Some(if slot == "weapon" && i >= AIM_STEPS as usize { b[1] } else { b[0] })
}

/// The branch tier `i` took (or would take with no choice made).
pub fn branch_at(l: &LineageState, slot: &str, i: usize) -> Option<&'static str> {
    let b = branches(slot)?;
    let d = default_branch(slot, i)?;
    let alt = l.kit_alt.get(slot).is_some_and(|m| m >> i & 1 == 1);
    Some(if alt { if d == b[0] { b[1] } else { b[0] } } else { d })
}

/// The tiers owned on each branch of a ladder (`[first, second]`).
pub fn branch_counts(l: &LineageState, slot: &str) -> [u32; 2] {
    let mut out = [0, 0];
    if let Some(b) = branches(slot) {
        for i in 0..owned(l, slot) as usize {
            out[(branch_at(l, slot, i) == Some(b[1])) as usize] += 1;
        }
    }
    out
}

/// The forged arm's aim steps (`Item::forged`, else the ladder's own split: aim to +3).
pub fn aim_steps(w: &Item) -> i32 {
    w.forged.map_or_else(|| w.enchant.clamp(0, AIM_STEPS), |f| f[0])
}

/// The forged arm's added blow: its edge steps (`DMG_PER_STEP` each; an edge taken in the aim's tiers
/// `EARLY_EDGE`), and an enchant read on it since, as the ladder's own steps past the aim.
pub fn blow(w: &Item) -> i32 {
    match w.forged {
        Some([_, b, tiers]) => b + DMG_PER_STEP * (w.enchant - tiers).max(0),
        None => DMG_PER_STEP * (w.enchant - AIM_STEPS).max(0),
    }
}

/// A forged arm's chance to hit: 80 %, +4 a step for three aim steps, +3 a step past them, at most 100.
pub fn hit_pct(w: &Item) -> u32 {
    let a = aim_steps(w).max(0) as u32;
    let early = a.min(AIM_STEPS as u32);
    (80 + AIM_PER_STEP * early + AIM_PER_LATE_STEP * (a - early)).min(100)
}

/// The armour piece the plate steps reach (`ARMOUR_STEPS[plate − 1]`).
fn plate_piece(plate: usize) -> Option<(&'static str, i32)> {
    plate.checked_sub(1).map(|i| ARMOUR_STEPS[i.min(ARMOUR_STEPS.len() - 1)])
}

fn piece_label((k, e): (&str, i32)) -> String {
    if e > 0 { format!("{k} +{e}") } else { k.to_string() }
}

/// A branch's tile line for the next tier: `aim +4%`, `edge +2`, `mail +1`, `pace +1`.
pub fn branch_label(l: &LineageState, slot: &str, branch: &str) -> String {
    let n = owned(l, slot) as usize;
    match branch {
        "aim" => {
            let a = branch_counts(l, slot)[0];
            format!("aim +{}%", if a < AIM_STEPS as u32 { AIM_PER_STEP } else { AIM_PER_LATE_STEP })
        }
        "edge" => format!("edge +{}", if n < AIM_STEPS as usize { EARLY_EDGE } else { DMG_PER_STEP }),
        "plate" => plate_piece(branch_counts(l, slot)[0] as usize + 1).map(piece_label).unwrap_or_else(|| step_label(l, slot, n)),
        _ => format!("pace +{}%", PACE_TENTHS.get(branch_counts(l, slot)[1] as usize).copied().unwrap_or(0)),
    }
}

/// Pack steps: one more supply on the shelf each (`LineageState::supply_cap`).
pub const PACK_MULT: [u32; 4] = [2, 5, 10, 16];
/// The shelf never holds more than this many supplies (the pack's ten slots less the kit and
/// room for what a run finds).
pub const SUPPLY_CAP_MAX: usize = 8;
/// Cut 23 §1: the row slots on the forge's ladder (`row5` … `row10`), multiples of `unit`.
pub const ROW_MULT: [(&str, u32); 6] = [("row5", 2), ("row6", 5), ("row7", 10), ("row8", 16), ("row9", 22), ("row10", 30)];

/// The kit's item ids (never loot: an exit neither salvages nor keeps them).
pub const WEAPON_ID: u32 = 1;
pub const ARMOUR_ID: u32 = 2;
/// Reserved outside historical floor/supply ids; the optional backup is never loot.
pub const SIDEARM_ID:u32=u32::MAX-1;
pub const HELM_ID:u32=u32::MAX-2;
pub const BOOTS_ID:u32=u32::MAX-3;
pub fn is_kit_id(id: u32) -> bool {
    id == WEAPON_ID || id == ARMOUR_ID || id == SIDEARM_ID || id == HELM_ID || id == BOOTS_ID
}

/// The unit a step's price is a multiple of: `100 + 25 × best depth` ($300 at D8). A night of a
/// mostly-home cohort set at D8 nets ~$1000–3700, so the first step of each ladder is under a
/// night and the top steps are two or three.
pub fn unit(best_depth: u32) -> u32 {
    100 + 25 * best_depth
}

/// Cut 24 §3 (AL: leather +1 $1000 → $1100 → $1400, mail $2800 → $3600 as the best deepened —
/// "the gold I banked overnight chases a price that rises with my best"): the lineage's unit,
/// fixed the first time the forge is shown (`lock_unit`: a step owned, or the purse able to buy
/// a first step) — every step's price is then fixed for good; until then it is today's.
pub fn unit_of(l: &LineageState) -> u32 {
    l.kit_unit.unwrap_or_else(|| unit(l.best_depth))
}

/// Cut 24 §3: fix the unit (`LineageState::kit_unit`) once the forge is shown — a step owned, or
/// a first step (a ladder's cheapest) the purse can buy. Called where the purse or the kit moves
/// (an exit, a purchase).
pub fn lock_unit(l: &mut LineageState) {
    // QA on 0c6e126: the row slots' price is shown from the first camp — fixed at the first exit that has a best floor
    if l.row_unit.is_none() && l.best_depth >= 1 {
        l.row_unit = Some(l.kit_unit.unwrap_or_else(|| unit(l.best_depth)));
    }
    if l.kit_unit.is_some() {
        return;
    }
    let first = KIT_SLOTS.iter().map(|s| mults(s)[0]).min().unwrap_or(1) * unit(l.best_depth);
    // QA on 0c6e126 (qaZ: every forge price +10 % after an absence with nothing bought): the forge tile is carved at the first salvage
    // (`Lineage.forge`) and shows the ladders' prices from then — shown is fixed
    if KIT_SLOTS.iter().any(|s| owned(l, s) > 0) || l.gold >= first as i32 || !l.forge.is_empty() {
        l.kit_unit = Some(unit(l.best_depth));
    }
}

pub fn mults(slot: &str) -> &'static [u32] {
    match slot {
        "weapon" => &WEAPON_MULT,
        "armour" => &ARMOUR_MULT,
        "pack" => &PACK_MULT,
        _ => &[],
    }
}

/// Steps owned on a ladder.
pub fn owned(l: &LineageState, slot: &str) -> u32 {
    l.kit.get(slot).copied().unwrap_or(0).min(mults(slot).len() as u32)
}

/// The kit at step `i` (0-based) of a ladder: `sword +1`, `mail`, `pack 4`.
pub fn step_label(l: &LineageState, slot: &str, i: usize) -> String {
    match slot {
        "weapon" => format!("{} +{}", crate::firearm::starting_kind(l).replace('_'," "), i + 1),
        // Cut 113 §2: a pace tier reads its pace; a plate tier the piece its plate count reaches
        "armour" => {
            if branch_at(l, slot, i) == Some("pace") {
                return format!("pace +{}%", pace_tenths((0..=i).filter(|&j| branch_at(l, slot, j) == Some("pace")).count()));
            }
            piece_label(ARMOUR_STEPS[(0..i).filter(|&j| branch_at(l, slot, j) == Some("plate")).count().min(ARMOUR_STEPS.len() - 1)])
        }
        _ => format!("pack {}", base_cap(l) + i + 1),
    }
}

/// Run-clear: a step's item and its rarity (`item::rarity` of the kit piece it forges: `sword +3`, `mail +1`);
/// `None` for the pack's steps (no item).
pub fn step_item(l: &LineageState, slot: &str, i: usize) -> Option<(String, crate::item::Rarity)> {
    let (kind, e) = match slot {
        "weapon" => (crate::firearm::starting_kind(l).to_string(), i as i32 + 1),
        "armour" => {
            let (k, e) = ARMOUR_STEPS[i.min(ARMOUR_STEPS.len() - 1)];
            (k.to_string(), e)
        }
        _ => return None,
    };
    let mut it = Item::new(0, &kind);
    it.enchant = e;
    Some((kind, crate::item::rarity(&it, true)))
}

/// The price of step `i` of a ladder (fixed once the forge is shown: `unit_of`).
pub fn price(l: &LineageState, slot: &str, i: usize) -> u32 {
    unit_of(l) * mults(slot).get(i).copied().unwrap_or(0)
}

/// Cut 23 §1: a row slot's gold price on the forge's ladder (`None` for any other unlock).
pub fn row_gold(l: &LineageState, id: &str) -> Option<u32> {
    ROW_MULT.iter().find(|(r, _)| *r == id).map(|(_, m)| l.row_unit.unwrap_or_else(|| unit_of(l)) * m)
}

/// The night's net `nights` divides by (the last full night's, or tonight's when larger).
pub fn per_night(l: &LineageState) -> i32 {
    l.last_night_net.max(l.night_net)
}

fn s_short(l: &LineageState, price: u32) -> i64 {
    price as i64 - crate::tree::purse(l) as i64
}

/// The shelf's cap before the pack steps (3, or 5 with `supply_cap_5`).
pub fn base_cap(l: &LineageState) -> usize {
    if l.unlocks.contains("supply_cap_5") {
        5
    } else {
        3
    }
}

/// The nights of income until `short` coins are in the purse: the last full night's net
/// (`LineageState::last_night_net`), else none to go on.
pub fn nights(l: &LineageState, short: i64) -> Option<u32> {
    if short <= 0 {
        return Some(0);
    }
    let per = per_night(l);
    (per > 0).then(|| ((short + per as i64 - 1) / per as i64) as u32)
}

/// The ladders as the camp shows them (no sims).
pub fn ladders(l: &LineageState) -> Vec<KitLadder> {
    let mut out:Vec<_>=KIT_SLOTS
        .iter()
        .map(|slot| {
            let n = owned(l, slot) as usize;
            let steps: Vec<KitStep> = (0..mults(slot).len()).map(|i| {
                let item = step_item(l, slot, i);
                let branch = (i < n).then(|| branch_at(l, slot, i)).flatten().map(str::to_string);
                KitStep { label: step_label(l, slot, i), price: price(l, slot, i), owned: i < n, kind: item.as_ref().map(|x| x.0.clone()), rarity: item.map(|x| x.1).unwrap_or_default(), branch }
            }).collect();
            let short = s_short(l, steps.get(n).map(|s| s.price).unwrap_or(0));
            let purse = crate::tree::purse(l);
            let next = steps.get(n).map(|s| KitNext { label: s.label.clone(), price: s.price, affordable: purse >= s.price as i32, nights: nights(l, s.price as i64 - purse as i64), per_night: (short > 0 && per_night(l) > 0).then(|| per_night(l)), ..Default::default() });
            // Cut 113 §2: the next tier's two steps, priced alike (the default first)
            let branches = match (branches(slot), next.as_ref(), default_branch(slot, n)) {
                (Some(b), Some(_), Some(d)) => b.iter().map(|id| KitBranch { id: (*id).into(), label: branch_label(l, slot, id), default: *id == d, lean: l.kit_lean.get(*slot).is_some_and(|x| x == id) }).collect(),
                _ => Vec::new(),
            };
            KitLadder { slot: (*slot).into(), selected:None, owned: n as u32, steps, next, branches }
        })
        .collect();
    out.extend(crate::firearm::sidearm_ladder(l));out
}

/// Buy the next step of `slot` by hand (the ledger reads `forge <label>`; Cut 30.5: it counts toward the
/// apprentice).
pub fn buy(game: &mut Game, slot: &str) -> Result<(), String> {
    if slot=="gun_sidearm:pack" {return crate::firearm::set_sidearm(game,true);}
    if slot=="gun_sidearm:stow" {return crate::firearm::set_sidearm(game,false);}
    if slot==crate::firearm::SIDEARM_SLOT {return crate::firearm::forge_sidearm(game);}
    if crate::firearm::Profile::of(slot).is_some() {return crate::firearm::choose(game,slot);}
    // Cut 113 §2: `weapon:edge` — a tier's branch by hand (the apprentice leans the same way after)
    if let Some((s, b)) = slot.split_once(':').filter(|(s, _)| branches(s).is_some()) {
        let n = owned(&game.lineage, s) as usize;
        buy_branch_off(&mut game.lineage, s, Some(b), 0)?;
        let l = &mut game.lineage;
        if default_branch(s, n) == Some(b) { l.kit_lean.remove(s); } else { l.kit_lean.insert(s.into(), b.into()); }
        crate::tree::did(l, "forge");
        return Ok(());
    }
    buy_step(&mut game.lineage, slot)?;
    crate::tree::did(&mut game.lineage, "forge");
    Ok(())
}

/// Buy the next step of `slot` from the purse (the apprentice's, and `buy`'s).
pub fn buy_step(l: &mut LineageState, slot: &str) -> Result<(), String> {
    buy_step_off(l, slot, 0)
}

/// `buy_step` at `off` percent off the price (Cut 30.5: the apprentice's rank), on the branch the
/// player leans to (Cut 113 §2: `kit_lean`), else the tier's default.
pub fn buy_step_off(l: &mut LineageState, slot: &str, off: u32) -> Result<(), String> {
    let lean = l.kit_lean.get(slot).cloned();
    buy_branch_off(l, slot, lean.as_deref(), off)
}

/// Buy tier `owned` of `slot` on `branch` (`None`: the tier's default) at `off` percent off.
pub fn buy_branch_off(l: &mut LineageState, slot: &str, branch: Option<&str>, off: u32) -> Result<(), String> {
    if let Some(b) = branch {
        if !branches(slot).is_some_and(|x| x.contains(&b)) {
            return Err("unknown branch".into());
        }
    }
    if !KIT_SLOTS.contains(&slot) {
        return Err("unknown slot".into());
    }
    lock_unit(l);
    let n = owned(l, slot) as usize;
    if n >= mults(slot).len() {
        return Err("top of the ladder".into());
    }
    let p = price(l, slot, n) as i32;
    let p = p - p * off.min(100) as i32 / 100;
    if crate::tree::purse(l) < p {
        return Err("not enough gold".into());
    }
    let alt = branch.is_some_and(|b| default_branch(slot, n) != Some(b));
    let mask = l.kit_alt.entry(slot.into()).or_insert(0);
    if alt { *mask |= 1 << n; } else { *mask &= !(1 << n); }
    if *mask == 0 { l.kit_alt.remove(slot); }
    let label = step_label(l, slot, n);
    l.gold_move(-p, &format!("forge {label}"));
    *l.kit.entry(slot.into()).or_insert(0) += 1;
    Ok(())
}

/// Every step of every ladder owned (the `KITTED` bot).
pub fn buy_all(l: &mut LineageState) {
    for slot in KIT_SLOTS {
        l.kit.insert(slot.into(), mults(slot).len() as u32);
    }
}

/// The heir's starting kit: the class arm at the weapon ladder's enchant, the armour step's
/// piece (none before the first step). Items with the kit's ids are never loot.
fn weapon_forged(l:&LineageState)->Option<[i32;3]> {
    l.kit_alt.get("weapon").is_some_and(|m|*m!=0).then(|| {
        let n=owned(l,"weapon") as usize;
        let edge=|i:usize|if i<AIM_STEPS as usize {EARLY_EDGE}else{DMG_PER_STEP};
        let b=(0..n).filter(|&i|branch_at(l,"weapon",i)==Some("edge")).map(edge).sum();
        [branch_counts(l,"weapon")[0] as i32,b,n as i32]
    })
}
fn explicit_armour_bonus(l:&LineageState)->i32 {
    let plate=branch_counts(l,"armour")[0];
    plate_piece(plate as usize).map_or(0,|(kind,e)|crate::defs::item_def(kind).a.0+e-1).max(0)
}
pub fn equip(l: &LineageState, hero: &mut Hero) {
    let mut w = Item::new(WEAPON_ID, l.starting_config.as_ref().and_then(|c| c.weapon.as_deref())
        .filter(|kind| shape_available(l, kind, crate::defs::Cat::Weapon)).unwrap_or_else(|| crate::firearm::starting_kind(l)));
    w.enchant = owned(l, "weapon") as i32;
    // Cut 113 §2: a tier off the ladder's own split carries its aim count
    let forged = weapon_forged(l);
    w.forged = forged;
    if hero.class==crate::hero::Class::Gunner {hero.weapon=Some(w).into();}else {hero.auto_equip(w);}
    if hero.class==crate::hero::Class::Gunner&&crate::firearm::sidearm_selected(l) {
        let mut sidearm=Item::new(SIDEARM_ID,"sword");sidearm.enchant=owned(l,"weapon") as i32;sidearm.forged=forged;
        hero.auto_equip(sidearm);
    }
    let [plate, pace] = branch_counts(l, "armour");
    hero.pace = pace_tenths(pace as usize);
    let default_armour = plate_piece(plate as usize);
    let (resolved,_) = crate::armour_sets::resolve(l,crate::armour_sets::Slot::Armour);
    let chosen = resolved.as_deref();
    let piece = match chosen {
        Some("none") => None,
        Some(k) if shape_available(l, k, crate::defs::Cat::Armour) => Some((k, explicit_armour_bonus(l))),
        _ => default_armour,
    };
    if let Some((k, e)) = piece {
        let mut it = Item::new(ARMOUR_ID, k);
        it.enchant = e;
        if chosen.is_some() { hero.pace += it.def().speed * 10; }
        hero.auto_equip(it);
    }
    for (slot,id) in [(crate::armour_sets::Slot::Helm,HELM_ID),(crate::armour_sets::Slot::Boots,BOOTS_ID)] {
        let (kind,_) = crate::armour_sets::resolve(l,slot);
        if let Some(kind)=kind.filter(|k|k!="none") {hero.auto_equip(Item::new(id,&kind));}
    }
    hero.protected_slots=crate::armour_sets::SLOTS.into_iter().filter(|s| {
        let (kind,origin)=crate::armour_sets::resolve(l,*s);
        origin=="pin"||origin=="follow"||kind.as_deref()==Some(crate::armour_sets::family_piece(*s))
    }).collect();
}

/// The ladders with each next step measured (`Engine.kitDeltas`): the camp's panel for the
/// active set with the step owned, paired against the panel without (the same seeds, the
/// forecast's own sims), read at the floor its own reach is nearest half (≤ best + 1): the reach there and the
/// bank and death shares. Memoised like the cage tablet (the options' panels land in the
/// game's panel cache, keyed by the lineage fingerprint, which carries the kit).
pub fn deltas(game: &Game) -> Vec<KitLadder> {
    deltas_with(game, crate::forecast::option_sims(game, game.lineage.rules()), false)
}

/// Forge previews read depth/exit shares, never skipped-floor gold.
pub fn estimates(game: &Game) -> Vec<KitLadder> {
    deltas_with(game, crate::forecast::PREVIEW_SIMS, true)
}

fn deltas_with(game: &Game, sims: u32, outcomes: bool) -> Vec<KitLadder> {
    let rules = game.lineage.rules().clone();
    let panel = if outcomes { crate::forecast::camp_panel_outcomes } else { crate::forecast::camp_panel };
    let base = panel(game, &rules, sims);
    // the move is read where the set's own reach is nearest even (best + 1 sits under 1 %, so
    // every step read `≈`): the deepest floor the base reaches on about half its runs
    let reach_at = |d: u32| base.iter().filter(|r| r.max_depth >= d).count() as f64 / base.len().max(1) as f64;
    let depth = (2..=game.lineage.best_depth + 1)
        .min_by(|&x, &y| (reach_at(x) - 0.5).abs().total_cmp(&(reach_at(y) - 0.5).abs()).then(y.cmp(&x)))
        .unwrap_or(game.lineage.best_depth + 1);
    let mut out = ladders(&game.lineage);
    for lad in out.iter_mut() {
        let Some(next) = lad.next.as_mut() else { continue };
        let mut g = game.sim_clone();
        *g.lineage.kit.entry(lad.slot.clone()).or_insert(0) += 1;
        // Cut 25 §4: a pack step holds one more supply — measured holding it (the shelf's most
        // packed kind, one more), not empty (an empty slot is the same panel as the base, a
        // third of the forge's time for an exact 0).
        if lad.slot == "pack" {
            let mut n: BTreeMap<&str, usize> = BTreeMap::new();
            for it in &game.lineage.supplies {
                *n.entry(it.kind.as_str()).or_insert(0) += 1;
            }
            if let Some((kind, _)) = n.into_iter().max_by(|a, b| a.1.cmp(&b.1).then(b.0.cmp(a.0))) {
                let gold = g.lineage.gold;
                g.lineage.gold = i32::MAX / 2;
                let _ = g.buy_supply(kind);
                g.lineage.gold = gold;
            }
        }
        *g.panel_cache.borrow_mut() = game.panel_cache.borrow().clone();
        let a = panel(&g, &rules, sims);
        for (k, v) in g.panel_cache.into_inner() {
            crate::forecast::panel_insert(game, k, v);
        }
        let n = a.len().min(base.len());
        let (a, b) = (&a[..n], &base[..n]);
        let ind = |x: bool| if x { 1.0 } else { 0.0 };
        // Cut 25 §6 (AM: the forge `≈` on every item late): the move is read where it is clearest —
        // the floor whose paired move clears its ± by the most — else where the reach is nearest
        // half (the step moves nothing past its ±: `≈ ±N` there, honestly).
        let clear = (2..=game.lineage.best_depth + 1)
            .map(|d| (d, crate::forecast::paired(a, b, |r| ind(r.max_depth >= d))))
            .filter(|(_, m)| m.delta.abs() > m.pm + 1e-9)
            .max_by(|x, y| (x.1.delta.abs() - x.1.pm).total_cmp(&(y.1.delta.abs() - y.1.pm)).then(x.0.cmp(&y.0)));
        let (depth, reach) = clear.unwrap_or_else(|| (depth, crate::forecast::paired(a, b, |r| ind(r.max_depth >= depth))));
        next.depth = Some(depth);
        next.delta = Some(reach.delta);
        next.pm = Some(reach.pm);
        next.bank = Some(crate::forecast::paired(a, b, |r| ind(r.tier == crate::engine::ExitTier::Bank && !r.timed_out)).delta);
        next.death = Some(crate::forecast::paired(a, b, |r| ind(r.tier == crate::engine::ExitTier::Death)).delta);
    }
    out
}

/// Cut 29 §5: a commission's price in forge units, before the climb (`commission_price`).
pub const COMMISSION_UNITS: u32 = 10;

/// The works a lineage commissions, in order (then numbered): no sim reads them.
pub const WORKS: [&str; 8] = ["heir's statue", "camp hall", "chronicle wall", "boss trophies", "the forge's bell", "a banner", "the long table", "a lantern tower"];

/// Cut 29 §5: the next commission's price — 10 forge units × 1.25ⁿ (n the works built), in tens —
/// priced against income: never more than half a day's net (`LineageState::last_day_net`, fixed
/// through a day), nor under `COMMISSION_FLOOR` units. The climb alone outran the purse at a stall
/// (rater AS s1: $5959 held on day 5, a work at ~$5900 against a day's net of ~$2600); at a whole
/// day's net a purse holding tomorrow's oath beside it still sat over 1.5 days' net (AS s2: $3078,
/// a $2020 work, a $930 oath).
pub fn commission_price(l: &LineageState) -> i32 {
    let unit = unit_of(l) as f64;
    let climb = COMMISSION_UNITS as f64 * unit * 1.25f64.powi(l.works.len() as i32);
    let income = (l.last_day_net.max(0) as f64 / 2.0).max(COMMISSION_FLOOR as f64 * unit);
    (climb.min(income) / 10.0).round() as i32 * 10
}

/// The fewest forge units a commission costs (its price against a day's net: `commission_price`).
pub const COMMISSION_FLOOR: u32 = 5;

fn work_label(n: usize) -> String {
    match WORKS.get(n) {
        Some(w) => w.to_string(),
        None => format!("{} {}", WORKS[n % WORKS.len()], n / WORKS.len() + 1),
    }
}

pub fn commission_wire(l: &LineageState) -> crate::wire::Commission {
    let price = commission_price(l);
    crate::wire::Commission { price, label: work_label(l.works.len()), available: crate::tree::purse(l) >= price }
}

/// Cut 29 §5: commission the next work (policy-neutral: the gold's sink, the chronicle's line).
pub fn commission(game: &mut Game) -> Result<String, String> {
    let l = &mut game.lineage;
    lock_unit(l);
    let price = commission_price(l);
    if crate::tree::purse(l) < price {
        return Err("not enough gold".into());
    }
    let label = work_label(l.works.len());
    l.gold_move(-price, &format!("forge commission {label}"));
    l.works.push(label.clone());
    Ok(label)
}

#[cfg(test)]
mod starting_kit_tests {
    use super::*;

    fn config(weapon: &str, armour: &str, supplies: &[&str]) -> StartingConfig {
        StartingConfig { weapon: Some(weapon.into()), armour: Some(armour.into()), supplies: supplies.iter().map(|k| (*k).into()).collect(),..Default::default() }
    }
    fn controlled() -> Game {
        let mut g = Game::new_resident(1);
        for k in ["axe","leather","mail","heal"] { g.lineage.forge.insert(k.into(),crate::wire::ForgeRow::at(5)); }
        g.lineage.gold = 0;
        g
    }

    #[test]
    fn locked_gear_and_invalid_saved_selection_are_atomic() {
        let mut g = Game::new_resident(1);
        g.lineage.forge.insert("axe".into(),crate::wire::ForgeRow::at(4));
        let before = g.save();
        assert!(set_starting(&mut g,Some(config("axe","none",&[]))).is_err());
        assert!(select_starting(&mut g,"absent").is_err());
        assert_eq!(g.save(),before);
        g.lineage.forge.insert("axe".into(),crate::wire::ForgeRow::at(5));
        let id = save_starting(&mut g,"Axe",config("axe","none",&[]),None).unwrap();
        select_starting(&mut g,&id).unwrap();
        assert_eq!(g.lineage.starting_selected.as_deref(),Some(id.as_str()));
    }

    #[test]
    fn named_authored_duplicates_refill_for_three_actual_departures_at_zero_gold() {
        let mut g = controlled();
        let id = save_starting(&mut g,"Healer",config("axe","leather",&["heal","heal","leash"]),None).unwrap();
        select_starting(&mut g,&id).unwrap();
        for _ in 0..3 {
            g.lineage.gold = 0;
            let transactions = g.lineage.ledger();
            g.send();
            let run = g.run.as_ref().unwrap();
            assert_eq!(run.hero.weapon.as_ref().unwrap().kind,"axe");
            assert_eq!(run.hero.inv.iter().filter(|i| i.kind == "heal").count(),2);
            assert_eq!(run.hero.inv.iter().filter(|i| i.kind == "leash").map(|i| i.amount).sum::<i32>(),1);
            assert!(run.hero.inv.iter().chain(run.hero.weapon.iter()).chain(run.hero.armour.iter()).all(|i| i.value_claimed));
            assert_eq!(g.lineage.gold,0);
            assert_eq!(g.lineage.ledger(),transactions);
            crate::offline::run_offline_counts(&mut g,1);
        }
    }

    #[test]
    fn named_identity_limits_delete_and_gear_tradeoffs_survive_reload() {
        let mut g = controlled();
        let a = save_starting(&mut g,"Blade",config("sword","leather",&[]),None).unwrap();
        let b = save_starting(&mut g,"Axe",config("axe","none",&[]),None).unwrap();
        let stats = |g: &Game| { let mut h = Hero::new(g.lineage.class,crate::geom::Pos::new(0,0)); equip(&g.lineage,&mut h); (h.atk(),h.speed(),h.def()) };
        select_starting(&mut g,&a).unwrap(); let blade=stats(&g);
        select_starting(&mut g,&b).unwrap(); let axe=stats(&g);
        assert_eq!(blade,((3,7),10,1)); assert_eq!(axe,((4,9),9,0));
        save_starting(&mut g,"Edited axe",config("sword","none",&[]),Some(&b)).unwrap();
        assert_eq!(stats(&g),axe);
        assert_eq!(g.lineage.starting_selected,None);
        assert_ne!(g.lineage.named_kits.iter().find(|k|k.id==b).unwrap().config,g.lineage.starting_config.clone().unwrap());
        let mut loaded = Game::load(&g.save()).unwrap();
        assert_eq!(loaded.lineage.named_kits,g.lineage.named_kits);
        delete_starting(&mut loaded,&b).unwrap(); assert_eq!(stats(&loaded),axe);
        for n in 0..7 { save_starting(&mut loaded,&format!("kit{n}"),config("sword","none",&[]),None).unwrap(); }
        let before=loaded.save();
        assert!(save_starting(&mut loaded,"overflow",config("sword","none",&[]),None).is_err());
        assert!(save_starting(&mut loaded," ",config("sword","none",&[]),Some(&a)).is_err());
        assert_eq!(loaded.save(),before);
    }

    #[test]
    fn default_draws_paid_upgrades_and_selected_offline_reload_remain_exact() {
        let mut g=controlled(); let mut default=g.clone();
        set_starting(&mut default,None).unwrap();
        g.send(); default.send(); assert_eq!(g.run,default.run);
        let mut g=controlled();
        assert!(buy(&mut g,"weapon").is_err());
        let price=price(&g.lineage,"weapon",0) as i32; g.lineage.gold=price;
        buy(&mut g,"weapon").unwrap(); assert_eq!(g.lineage.gold,0);
        set_starting(&mut g,Some(config("axe","mail",&["heal","heal"]))).unwrap();
        crate::tree::grant(&mut g.lineage,&crate::tree::LEGACY);
        let mut whole=g.clone(); let mut sliced=Game::load(&g.save()).unwrap();
        crate::offline::run_offline_counts(&mut whole,3600);
        crate::offline::run_offline_counts(&mut sliced,1800);
        sliced=Game::load(&sliced.save()).unwrap();
        crate::offline::run_offline_counts(&mut sliced,1800);
        assert_eq!(whole.lineage.gold,sliced.lineage.gold);
        assert_eq!(whole.lineage.best_depth,sliced.lineage.best_depth);
        assert_eq!(whole.lineage.total_turns,sliced.lineage.total_turns);
        assert_eq!(whole.run,sliced.run);
        assert_eq!(owned(&whole.lineage,"weapon"),1);
    }

    #[test]
    fn explicit_armour_drag_preserves_fractional_pace_and_class_safety() {
        let mut g=controlled();
        g.lineage.kit.insert("armour".into(),1);
        g.lineage.kit_alt.insert("armour".into(),1);
        set_starting(&mut g,Some(config("axe","mail",&[]))).unwrap();
        let mut h=Hero::new(g.lineage.class,crate::geom::Pos::new(0,0)); equip(&g.lineage,&mut h);
        assert_eq!(h.pace,-2); assert_eq!(h.speed(),8); // axe9 + mail−1 + pace0.8
        assert_eq!((0..10).map(|t|pace_energy(h.pace,t)).sum::<i32>(),8);
        let id=save_starting(&mut g,"Mail axe",config("axe","mail",&[]),None).unwrap();
        select_starting(&mut g,&id).unwrap();
        g.lineage.unlocks.insert("gunner".into());
        g.set_class("gunner").unwrap();
        assert_eq!(g.lineage.starting_config.as_ref().unwrap().weapon,None);
        assert_eq!(g.lineage.starting_selected,None);
        assert_eq!(starting_wire(&g.lineage).actual_weapon,crate::firearm::starting_kind(&g.lineage));
        let before=g.save();
        assert!(select_starting(&mut g,"absent").is_err());
        assert!(set_starting(&mut g,Some(config("axe","mail",&[]))).is_err());
        assert_eq!(g.save(),before);
        let mut h=Hero::new(g.lineage.class,crate::geom::Pos::new(0,0)); equip(&g.lineage,&mut h);
        assert_eq!(h.weapon.as_ref().unwrap().kind,crate::firearm::starting_kind(&g.lineage));
    }

    #[test]
    fn three_bloodline_choices_are_local_and_offline_slicing_keeps_shared_gold() {
        let mut s=crate::bloodlines::Session::new(1);
        s.build_town("house").unwrap(); s.lineage.gold=10_000;
        s.add_bloodline().unwrap(); s.add_bloodline().unwrap();
        crate::tree::grant(&mut s.lineage,&crate::tree::LEGACY);
        for id in 1..=3 {
            s.select_bloodline(id).unwrap();
            s.lineage.forge.insert("axe".into(),crate::wire::ForgeRow::at(5));
            let c=config(if id==2 {"axe"} else {"sword"},"none",&[]);
            let k=save_starting(&mut s,&format!("Hero{id}"),c,None).unwrap();
            select_starting(&mut s,&k).unwrap();
        }
        let saved=s.save(); let mut whole=crate::bloodlines::Session::load(&saved).unwrap();
        let mut sliced=crate::bloodlines::Session::load(&saved).unwrap();
        whole.run_offline_slice(3600,true);
        sliced.run_offline_slice(1800,false);
        sliced=crate::bloodlines::Session::load(&sliced.save()).unwrap();
        sliced.run_offline_slice(1800,true);
        for id in 1..=3 {
            whole.select_bloodline(id).unwrap(); sliced.select_bloodline(id).unwrap();
            assert_eq!(whole.lineage.gold,sliced.lineage.gold);
            assert_eq!(whole.lineage.total_turns,sliced.lineage.total_turns);
            assert_eq!(whole.run,sliced.run);
            assert_eq!(whole.lineage.starting_config,sliced.lineage.starting_config);
            assert_eq!(whole.lineage.named_kits[0].name,format!("Hero{id}"));
            assert_eq!(whole.lineage.starting_config.as_ref().unwrap().weapon.as_deref(),Some(if id==2 {"axe"} else {"sword"}));
        }
    }

    #[test]
    fn fired_class_skill_has_actual_origin_and_deterministic_event_identity() {
        let mut g=controlled();
        crate::legacy::ensure(&mut g.lineage);
        g.lineage.classes.insert("fighter".into(),crate::wire::ClassProg { level:8,xp:19,next:0 });
        g.lineage.hero_legacy.last_mut().unwrap().best_depth=18;
        crate::class_tree::learn(&mut g,"fighter_warden").unwrap();
        crate::class_tree::learn(&mut g,"fighter_recovery").unwrap();
        g.send();
        let r=g.run.as_mut().unwrap();
        r.hero.hp=20; r.hero.max_hp=40; r.hero.max_hp_base=40;
        r.hero.inv.clear(); r.hero.energy=100; r.monsters.clear();
        let p=r.hero.pos.neighbours8().into_iter().find(|p|r.floor.map.passable(*p)).unwrap();
        let mut m=crate::monster::Monster::spawn(900,"goblin",p,1);
        m.hp=100; m.max_hp=100; m.awake=true; r.monsters.push(m);
        r.floor.map.update_vision(r.hero.pos,8);
        let mut twin=Game::load(&g.save()).unwrap();
        let a=g.step(1); let b=twin.step(1);
        assert_eq!(a.events,b.events);
        let event=a.events.iter().find(|e|matches!(e,crate::wire::Ev::Rule { verb,.. } if verb.v=="second_wind")).unwrap();
        match event {
            crate::wire::Ev::Rule { skill:Some(skill),.. } => {
                assert_eq!(skill.id,"fighter_recovery");
                assert_eq!(Some(skill.name.clone()),crate::class_tree::label("path:fighter_recovery"));
            }, _=>panic!("executing path row must identify its actual skill"),
        }
        assert_eq!(serde_json::from_str::<crate::wire::Ev>(&serde_json::to_string(event).unwrap()).unwrap(),*event);
        let r=g.run.as_mut().unwrap(); r.hero.hp=r.hero.max_hp; r.hero.energy=100;
        let regular=g.step(1);
        assert!(regular.events.iter().any(|e|matches!(e,crate::wire::Ev::Rule { verb,skill:None,.. } if verb.v=="attack")));
        assert!(regular.events.iter().all(|e|!matches!(e,crate::wire::Ev::Rule { row,skill:Some(_),.. } if *row<0)));
    }
}
