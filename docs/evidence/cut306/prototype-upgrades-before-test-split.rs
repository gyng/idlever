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

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Game {
        let mut g = Game::new(1);
        g.lineage.best_depth = 28;
        g.lineage.gold = 100_000;
        g.lineage.tree.chest = 0;
        g.lineage.tree.ledger = 100_000;
        g.lineage.town.home = Some(true);
        g.lineage.town.built.push(("bank".into(), 0));
        g.lineage.tree.hired.push(("clerk".into(), 0));
        g.lineage.persistent.defeats = 1;
        g
    }
    #[test]
    fn cut306_paid_levels_preserve_ledger_and_old_save_shape() {
        let mut g = fixture();
        let original = g.save();
        assert!(!serde_json::to_value(&g.lineage.town)
            .unwrap()
            .as_object()
            .unwrap()
            .contains_key("levels"));
        let loaded = Game::load(&original).unwrap();
        assert_eq!(loaded.save(), original);
        g.lineage.last_night_net = 1000;
        let before = g.lineage.night_net;
        purchase(&mut g, "bank", 3400).unwrap();
        assert_eq!(g.lineage.gold, 96_600);
        assert_eq!(g.lineage.tree.ledger, 96_600);
        assert_eq!(g.lineage.night_net, before);
        assert_eq!(crate::town::bank_cap(&g.lineage), 5000);
        g.bank_deposit(1000).unwrap();
        assert_eq!(crate::town::night(&mut g.lineage), 40);
        assert_eq!(
            i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
            g.lineage.tree.ledger
        );
        g.bank_withdraw(500).unwrap();
        assert_eq!(
            i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
            g.lineage.tree.ledger
        );
        purchase(&mut g, "bank", 13500).unwrap();
        let saved = g.save();
        assert!(purchase(&mut g, "bank", i32::MAX).is_err());
        assert_eq!(saved, g.save());
    }
    #[test]
    fn cut306_failed_purchases_do_not_mutate() {
        let mut g = fixture();
        for id in ["bad", "bank", "device"] {
            let saved = g.save();
            assert!(purchase(&mut g, id, 0).is_err());
            assert_eq!(g.save(), saved);
        }
        g.lineage.best_depth = 12;
        let saved = g.save();
        assert!(purchase(&mut g, "device", i32::MAX).is_err());
        assert_eq!(g.save(), saved);
        g.lineage.best_depth = 28;
        g.lineage.gold = 10;
        let saved = g.save();
        assert!(purchase(&mut g, "bank", i32::MAX).is_err());
        assert_eq!(g.save(), saved);
        g.lineage.gold = 100_000;
        g.start_run(None);
        let saved = g.save();
        assert!(purchase(&mut g, "device", i32::MAX).is_err());
        assert_eq!(g.save(), saved);
    }
    #[test]
    fn cut306_future_recovery_and_hurry_without_retroactive_skip() {
        let mut g = fixture();
        crate::persistent::recover_at(&mut g.lineage, 28);
        let until = g.lineage.persistent.recovery_until_tick;
        let rest = g.lineage.rest_left;
        let price0 = crate::persistent::hurry_price(&g.lineage, false).unwrap();
        purchase(&mut g, "device", 3400).unwrap();
        assert_eq!(g.lineage.persistent.recovery_until_tick, until);
        assert_eq!(g.lineage.rest_left, rest);
        assert!(crate::persistent::hurry_price(&g.lineage, false).unwrap() < price0);
        for depth in 1..=40 {
            crate::persistent::recover_at(&mut g.lineage, depth);
            assert_eq!(
                g.lineage.persistent.recovery_ticks,
                (crate::persistent::recovery_ticks(depth) * 80).div_ceil(100)
            );
            assert_eq!(
                g.rest_after(100, crate::engine::ExitTier::Death) as u64,
                recovery_ticks(&g.lineage, g.lineage.best_depth)
            );
        }
        purchase(&mut g, "device", 13500).unwrap();
        crate::persistent::recover_at(&mut g.lineage, 28);
        assert_eq!(g.lineage.persistent.recovery_ticks, 7800);
        g.lineage.town.levels.insert("device".into(), u32::MAX);
        assert_eq!(recovery_ticks(&g.lineage, 28), 7800);
    }
}
