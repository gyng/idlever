//! Cut306 isolated utility prototype. Not shipped, not adopted.
use crate::{engine::LineageState, Game};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

/// Process-local experimental content. Never serialized into game saves.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Profile {
    pub schema: u32,
    pub gate_depth: [u32; 2],
    pub bank_price_units: [u32; 2],
    pub vat_price_units: [u32; 2],
    pub bank_nights: [i32; 2],
    pub bank_bonus_permille: [i32; 2],
    pub vat_recovery_off_pct: [u64; 2],
    pub vat_hurry_off_pct: [u64; 2],
}
impl Default for Profile {
    fn default() -> Self {
        Self {
            schema: 1,
            gate_depth: [13, 23],
            bank_price_units: [8, 20],
            vat_price_units: [8, 20],
            bank_nights: [5, 8],
            bank_bonus_permille: [20, 40],
            vat_recovery_off_pct: [20, 35],
            vat_hurry_off_pct: [25, 50],
        }
    }
}
impl Profile {
    pub fn parse(raw: &str) -> Result<Self, String> {
        let p: Self = serde_json::from_str(raw).map_err(|e| e.to_string())?;
        if p.schema != 1 {
            return Err("unsupported upgrade profile schema".into());
        }
        fn ordered<T: PartialOrd + Copy>(v: [T; 2], lo: T, hi: T) -> bool {
            lo <= v[0] && v[0] <= v[1] && v[1] <= hi
        }
        if !ordered(p.gate_depth, 1, 33)
            || !ordered(p.bank_price_units, 1, 1000)
            || !ordered(p.vat_price_units, 1, 1000)
            || !ordered(p.bank_nights, 3, 16)
            || !ordered(p.bank_bonus_permille, 0, 100)
            || !ordered(p.vat_recovery_off_pct, 0, 80)
            || !ordered(p.vat_hurry_off_pct, 0, 90)
        {
            return Err("upgrade profile range/order invalid".into());
        }
        Ok(p)
    }
}
static PROFILE: OnceLock<Profile> = OnceLock::new();
pub fn configure_profile(raw: &str) -> Result<(), String> {
    let profile = Profile::parse(raw)?;
    PROFILE
        .set(profile)
        .map_err(|_| "upgrade profile already initialized".into())
}
pub fn current_profile() -> &'static Profile {
    PROFILE.get_or_init(Profile::default)
}

#[derive(Debug, Clone, Serialize)]
pub struct Offer {
    pub id: String,
    pub level: u32,
    pub price: i32,
    pub gate: u32,
    pub ready: bool,
    pub affordable: bool,
}

pub fn level(l: &LineageState, id: &str) -> u32 {
    let base = if id == "bank" { 2 } else { 1 };
    l.town
        .levels
        .get(id)
        .copied()
        .unwrap_or(base)
        .clamp(base, base + 2)
}
pub fn bank_nights(l: &LineageState) -> i32 {
    match level(l, "bank") {
        3 => current_profile().bank_nights[0],
        4 => current_profile().bank_nights[1],
        _ => crate::town::bank_nights(),
    }
}
pub fn bank_bonus_permille(l: &LineageState) -> i32 {
    match level(l, "bank") {
        3 => current_profile().bank_bonus_permille[0],
        4 => current_profile().bank_bonus_permille[1],
        _ => 0,
    }
}
pub fn recovery_off(l: &LineageState) -> u64 {
    match level(l, "device") {
        2 => current_profile().vat_recovery_off_pct[0],
        3 => current_profile().vat_recovery_off_pct[1],
        _ => 0,
    }
}
pub fn recovery_ticks(l: &LineageState, depth: u32) -> u64 {
    (crate::persistent::recovery_ticks(depth) * (100 - recovery_off(l))).div_ceil(100)
}
pub fn hurry_price(l: &LineageState, original: i32) -> i32 {
    let off = match level(l, "device") {
        2 => current_profile().vat_hurry_off_pct[0],
        3 => current_profile().vat_hurry_off_pct[1],
        _ => return original,
    };
    let vat = crate::balance::get().vat;
    let round = u64::from(vat.hurry_round.max(1));
    let raw = (original as u64 * (100 - off)).div_ceil(100);
    (raw.div_ceil(round) * round)
        .max(u64::from(vat.hurry_floor))
        .min(i32::MAX as u64) as i32
}
pub fn offers(l: &LineageState) -> Vec<Offer> {
    offers_for(
        l,
        l.best_depth,
        crate::persistent::service_availability(l, false)[2],
    )
}
pub fn offers_for(l: &LineageState, depth: u32, device: bool) -> Vec<Offer> {
    if !l.town.home.unwrap_or(true) {
        return Vec::new();
    }
    ["bank", "device"]
        .into_iter()
        .filter_map(|id| {
            let base = if id == "bank" { 2 } else { 1 };
            let available = if id == "bank" {
                crate::town::built(l, id) && crate::tree::hired(l, "clerk")
            } else {
                device
            };
            let level = level(l, id);
            if !available || level >= base + 2 {
                return None;
            }
            let i = (level - base) as usize;
            let gate = current_profile().gate_depth[i];
            let units = if id == "bank" {
                current_profile().bank_price_units[i]
            } else {
                current_profile().vat_price_units[i]
            };
            let price = (units * crate::kit::unit(gate)) as i32;
            Some(Offer {
                id: id.into(),
                level: level + 1,
                price,
                gate,
                ready: depth >= gate,
                affordable: crate::tree::purse(l) >= price,
            })
        })
        .collect()
}
pub fn purchase(g: &mut Game, id: &str, max_price: i32) -> Result<(), String> {
    if crate::persistent::away(g) {
        return Err("hero away".into());
    }
    let offer = offers(&g.lineage)
        .into_iter()
        .find(|o| o.id == id)
        .ok_or("no upgrade")?;
    if !offer.ready {
        return Err(format!("D{} needed", offer.gate));
    }
    if offer.price > max_price {
        return Err("price changed".into());
    }
    if !offer.affordable {
        return Err("not enough gold".into());
    }
    g.lineage
        .gold_move(-offer.price, &format!("upgrade {id} {}", offer.level));
    g.lineage.town.levels.insert(id.into(), offer.level);
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct SessionOffer {
    pub offer: Offer,
    pub purse: i32,
    pub savings: i32,
    pub withdrawal: i32,
    pub affordable_with_savings: bool,
    pub home: bool,
}
#[derive(Debug, Clone, Serialize)]
pub struct Purchase {
    pub payer: u32,
    pub id: String,
    pub level: u32,
    pub price: i32,
    pub withdrawal: i32,
    pub gold_after: i32,
    pub purse_after: i32,
    pub savings_after: i32,
}
