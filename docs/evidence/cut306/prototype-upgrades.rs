//! Cut306 isolated utility prototype. Not shipped, not adopted.
use crate::{engine::LineageState, Game};
use serde::Serialize;

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
        3 => 5,
        4 => 8,
        _ => crate::town::bank_nights(),
    }
}
pub fn bank_bonus_permille(l: &LineageState) -> i32 {
    match level(l, "bank") {
        3 => 20,
        4 => 40,
        _ => 0,
    }
}
pub fn recovery_off(l: &LineageState) -> u64 {
    match level(l, "device") {
        2 => 20,
        3 => 35,
        _ => 0,
    }
}
pub fn recovery_ticks(l: &LineageState, depth: u32) -> u64 {
    (crate::persistent::recovery_ticks(depth) * (100 - recovery_off(l))).div_ceil(100)
}
pub fn hurry_price(l: &LineageState, original: i32) -> i32 {
    let off = match level(l, "device") {
        2 => 25,
        3 => 50,
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
    ["bank", "device"]
        .into_iter()
        .filter_map(|id| {
            let base = if id == "bank" { 2 } else { 1 };
            let available = if id == "bank" {
                crate::town::built(l, id) && crate::tree::hired(l, "clerk")
            } else {
                crate::persistent::service_availability(l, false)[2]
            };
            let level = level(l, id);
            if !available || level >= base + 2 {
                return None;
            }
            let i = (level - base) as usize;
            let gate = [13, 23][i];
            let price = ([8, 20][i] * crate::kit::unit(gate)) as i32;
            Some(Offer {
                id: id.into(),
                level: level + 1,
                price,
                gate,
                ready: l.best_depth >= gate,
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

