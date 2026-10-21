//! Cut315 (Cut306–314 redesign, adopted): the Bank and Vat upgrades. Bank L3/L4 hold more nights and pay extra
//! interest a night on real Savings; Vat L2/L3 shorten every FUTURE death's recovery and discount the manual hurry.
//! One shared town level each (`Town::levels`, synchronized by `bloodlines::town_from`), bought explicitly at home.
//! Numbers live in `balance::Upgrades`.
use crate::engine::LineageState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Offer {
    pub id: String,
    pub level: u32,
    pub price: i32,
    pub gate: u32,
    pub ready: bool,
    pub affordable: bool,
}

fn tune() -> &'static crate::balance::Upgrades {
    &crate::balance::get().upgrades
}
fn base(id: &str) -> u32 {
    if id == "bank" { 2 } else { 1 }
}
/// The building's shared level: Bank 2 (the Clerk's) to 4, Vat 1 to 3.
pub fn level(l: &LineageState, id: &str) -> u32 {
    let b = base(id);
    l.town.levels.get(id).copied().unwrap_or(b).clamp(b, b + 2)
}
pub fn max_level(id: &str) -> u32 {
    base(id) + 2
}
pub fn bank_nights(l: &LineageState) -> i32 {
    match level(l, "bank") {
        3 => tune().bank_nights[0],
        4 => tune().bank_nights[1],
        _ => crate::town::bank_nights(),
    }
}
pub fn bank_bonus_permille(l: &LineageState) -> i32 {
    match level(l, "bank") {
        3 => tune().bank_bonus_permille[0],
        4 => tune().bank_bonus_permille[1],
        _ => 0,
    }
}
pub fn recovery_off(l: &LineageState) -> u64 {
    match level(l, "device") {
        2 => tune().vat_recovery_off_pct[0],
        3 => tune().vat_recovery_off_pct[1],
        _ => 0,
    }
}
fn hurry_off(l: &LineageState) -> u64 {
    match level(l, "device") {
        2 => tune().vat_hurry_off_pct[0],
        3 => tune().vat_hurry_off_pct[1],
        _ => 0,
    }
}
/// A future death's recovery on `depth`, after the Vat's reduction (rounded up to the tick).
pub fn recovery_ticks(l: &LineageState, depth: u32) -> u64 {
    (crate::persistent::recovery_ticks(depth) * (100 - recovery_off(l))).div_ceil(100)
}
pub fn hurry_price(l: &LineageState, original: i32) -> i32 {
    let off = hurry_off(l);
    if off == 0 {
        return original;
    }
    let vat = crate::balance::get().vat;
    let round = u64::from(vat.hurry_round.max(1));
    let raw = (original as u64 * (100 - off)).div_ceil(100);
    (raw.div_ceil(round) * round).max(u64::from(vat.hurry_floor)).min(i32::MAX as u64) as i32
}
/// What a level gives, in the town's words (`+2%/night · 5 nights`, `−20% clone · −25% hurry`).
pub fn effect(id: &str, level: u32) -> String {
    let t = tune();
    if id == "bank" {
        let nights = match level { 3 => t.bank_nights[0], 4 => t.bank_nights[1], _ => crate::town::bank_nights() };
        let bonus = match level { 3 => t.bank_bonus_permille[0], 4 => t.bank_bonus_permille[1], _ => 0 };
        if bonus == 0 { format!("{nights} nights") } else { format!("+{}%/night · {nights} nights", fmt_permille(bonus)) }
    } else {
        let i = match level { 2 => 0, 3 => 1, _ => return "no discount".into() };
        format!("−{}% clone · −{}% hurry", t.vat_recovery_off_pct[i], t.vat_hurry_off_pct[i])
    }
}
fn fmt_permille(p: i32) -> String {
    if p % 10 == 0 { (p / 10).to_string() } else { format!("{}.{}", p / 10, p % 10) }
}
/// The next level of each building on offer: readiness by `depth` (the town's deepest record) and `device` (the
/// Vat earned by any resident). Bank needs its plot and the Clerk. None away from home or at the top level.
pub fn offers_for(l: &LineageState, depth: u32, device: bool) -> Vec<Offer> {
    if !l.town.home.unwrap_or(true) {
        return Vec::new();
    }
    ["bank", "device"]
        .into_iter()
        .filter_map(|id| {
            let available = if id == "bank" {
                crate::town::built(l, id) && crate::tree::hired(l, "clerk")
            } else {
                device
            };
            let level = level(l, id);
            if !available || level >= max_level(id) {
                return None;
            }
            let i = (level - base(id)) as usize;
            let gate = tune().gate_depth[i];
            let units = if id == "bank" { tune().bank_price_units[i] } else { tune().vat_price_units[i] };
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
/// One hero's own offers (its record, its own Vat) — the single-hero game and the bots.
pub fn offers(l: &LineageState) -> Vec<Offer> {
    offers_for(l, l.best_depth, crate::persistent::service_availability(l, false)[2])
}

/// A quote for the selected hero: the purse and Savings it would pay from and the exact withdrawal it needs.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionOffer {
    pub offer: Offer,
    pub payer: u32,
    pub purse: i32,
    pub savings: i32,
    pub withdrawal: i32,
    pub affordable_with_savings: bool,
    pub home: bool,
}
/// The receipt of a purchase.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
/// The client's request, bound to the quote it showed: payer, level and price (a stale one is refused).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Request {
    pub id: String,
    pub payer: u32,
    pub level: u32,
    pub max_price: i32,
    #[serde(default)]
    pub use_savings: bool,
}

/// Quotes for `payer` paying from `g`'s purse and Savings, readiness from `depth` and `device`. Pure.
pub fn quotes(g: &crate::Game, payer: u32, depth: u32, device: bool) -> Vec<SessionOffer> {
    let purse = crate::tree::purse(&g.lineage);
    let savings = g.lineage.town.bank;
    let home = !crate::persistent::away(g);
    offers_for(&g.lineage, depth, device)
        .into_iter()
        .map(|offer| {
            let withdrawal = (offer.price - purse).max(0);
            SessionOffer { offer, payer, purse, savings, withdrawal, affordable_with_savings: withdrawal <= savings, home }
        })
        .collect()
}
/// Buy the requested level. Every refusal precedes any mutation: away, unknown, stale payer/level/price, locked,
/// unaffordable (a Savings shortfall needs `use_savings`). Then the exact shortfall is withdrawn and the price paid once.
pub fn buy(g: &mut crate::Game, payer: u32, depth: u32, device: bool, r: &Request) -> Result<Purchase, String> {
    if crate::persistent::away(g) {
        return Err("hero away".into());
    }
    if r.payer != payer {
        return Err("hero changed".into());
    }
    let q = quotes(g, payer, depth, device).into_iter().find(|q| q.offer.id == r.id).ok_or("no upgrade")?;
    if q.offer.level != r.level || q.offer.price > r.max_price {
        return Err("price changed".into());
    }
    if !q.offer.ready {
        return Err(format!("D{} needed", q.offer.gate));
    }
    if q.withdrawal > 0 && (!r.use_savings || !q.affordable_with_savings) {
        return Err("not enough gold".into());
    }
    if q.withdrawal > 0 {
        let got = crate::town::withdraw(&mut g.lineage, q.withdrawal).expect("validated owned Savings");
        assert_eq!(got, q.withdrawal);
    }
    g.lineage.gold_move(-q.offer.price, &format!("upgrade {} {}", r.id, q.offer.level));
    g.lineage.town.levels.insert(r.id.clone(), q.offer.level);
    Ok(Purchase {
        payer,
        id: r.id.clone(),
        level: q.offer.level,
        price: q.offer.price,
        withdrawal: q.withdrawal,
        gold_after: g.lineage.gold,
        purse_after: crate::tree::purse(&g.lineage),
        savings_after: g.lineage.town.bank,
    })
}

impl crate::Game {
    /// A lone hero's quotes (its own record and Vat); a Session overrides with the town-wide ones.
    pub fn building_upgrade_offers(&self) -> Vec<SessionOffer> {
        quotes(self, 1, self.lineage.best_depth, crate::persistent::service_availability(&self.lineage, false)[2])
    }
    pub fn upgrade_building(&mut self, r: &Request) -> Result<Purchase, String> {
        let device = crate::persistent::service_availability(&self.lineage, false)[2];
        buy(self, 1, self.lineage.best_depth, device, r)
    }
}

/// The town wire's rows: each upgradable building standing (Bank with its Clerk, an earned Vat), its quote.
pub fn wire(g: &crate::Game, payer: u32, depth: u32, device: bool) -> Vec<crate::wire::BuildingUpgradeWire> {
    let l = &g.lineage;
    let quotes = quotes(g, payer, depth, device);
    let standing = |id: &str| if id == "bank" { crate::town::built(l, id) && crate::tree::hired(l, "clerk") } else { device };
    ["bank", "device"]
        .into_iter()
        .filter(|id| standing(id))
        .map(|id| crate::wire::BuildingUpgradeWire {
            id: id.into(),
            level: level(l, id),
            max: max_level(id),
            effect: effect(id, level(l, id)),
            next: quotes.iter().find(|q| q.offer.id == id).map(|q| crate::wire::BuildingUpgradeNext {
                level: q.offer.level,
                price: q.offer.price,
                gate_depth: q.offer.gate,
                ready: q.offer.ready,
                effect: effect(id, q.offer.level),
                payer: q.payer,
                purse: q.purse,
                withdrawal: q.withdrawal,
                affordable_with_savings: q.affordable_with_savings,
            }),
        })
        .collect()
}
