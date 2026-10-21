//! Cut315 (Cut308's town-first plan, adopted): an engaged player's Bank/Vat upgrades. Once Bank III is ready it
//! pauses tithes (the public `ration` sink order keeps rations), saves, and buys Bank III → Vat II → Vat III →
//! Bank IV from owned Gold and Savings, keeping the shelf's three units in the purse; then restores its order.
//! A building not yet standing (the Vat unearned) is passed over until it is.
use idlever_core::{upgrades, upgrades::Request, Game};

const PLAN: [(&str, u32); 4] = [("bank", 3), ("device", 2), ("device", 3), ("bank", 4)];

#[derive(Clone, Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Plan {
    /// the sink order before saving began (None: not saving yet)
    pub sink: Option<String>,
    pub done: bool,
}

fn set_sink(g: &mut Game, sink: &str) {
    let mut o = g.lineage.standing_orders();
    o.sink = Some(sink.into());
    g.set_orders(&o).expect("public sink order");
}

impl Plan {
    /// One check-in's purchases; returns the gold spent.
    pub fn step(&mut self, g: &mut Game) -> i64 {
        if self.done {
            return 0;
        }
        if self.sink.is_none() {
            if !upgrades::offers(&g.lineage).iter().any(|o| o.id == "bank" && o.ready) {
                return 0;
            }
            self.sink = Some(g.lineage.orders.sink.clone());
            set_sink(g, "ration");
        }
        let mut spent = 0;
        for (id, target) in PLAN {
            if upgrades::level(&g.lineage, id) >= target {
                continue;
            }
            let Some(offer) = upgrades::offers(&g.lineage).into_iter().find(|o| o.id == id) else { continue };
            let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
            let needed = (offer.price + reserve - idlever_core::tree::purse(&g.lineage)).max(0);
            if !offer.ready || needed > g.lineage.town.bank {
                break;
            }
            if needed > 0 {
                g.bank_withdraw(needed).expect("owned Savings");
            }
            let r = Request { id: id.into(), payer: 1, level: offer.level, max_price: offer.price, use_savings: false };
            spent += i64::from(g.upgrade_building(&r).expect("quoted purchase").price);
        }
        if PLAN.iter().all(|(id, t)| upgrades::level(&g.lineage, id) >= *t) {
            let sink = self.sink.clone().unwrap();
            set_sink(g, &sink);
            self.done = true;
        }
        spent
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn waits_for_bank_then_buys_all_four_and_restores_order() {
        let mut g = Game::new_resident(1);
        let before = g.save();
        let mut plan = Plan::default();
        assert_eq!(plan.step(&mut g), 0);
        assert_eq!(g.save(), before, "nothing before Bank III is ready");
        g.lineage.best_depth = 33;
        g.lineage.gold = 3000;
        g.lineage.town.bank = 197000;
        g.lineage.tree.ledger = 200000;
        g.lineage.tree.chest = 0;
        g.lineage.persistent.defeats = 1;
        g.lineage.town.built.push(("bank".into(), 0));
        g.lineage.tree.hired.push(("clerk".into(), 0));
        let mut g = Game::load(&g.save()).unwrap();
        let sink = g.lineage.orders.sink.clone();
        assert_eq!(plan.step(&mut g), 93200);
        assert!(plan.done);
        assert_eq!(g.lineage.orders.sink, sink);
        assert_eq!(i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank), 200000 - 93200);
        assert_eq!(plan.step(&mut g), 0);
    }
}
