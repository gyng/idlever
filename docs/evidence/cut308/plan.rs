//! Explicit diagnostic camp policy; no game default or canonical cache change.
use super::{income, Bot, Cfg};
use idlever_core::{cut306_upgrades as upgrades, Game};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Plan {
    pub enabled: bool,
    pub next: usize,
    pub original_sink: Option<String>,
    pub events: Vec<Value>,
    pub daily: Vec<Value>,
    pub spent: i64,
    pub final_state: Option<Value>,
    #[serde(skip)]
    root: Option<PathBuf>,
    label: String,
}
impl Plan {
    pub fn new(seed: u64, cfg: &Cfg) -> Self {
        Self {
            enabled: std::env::var("IDLEVER_TOWN_PLAN").is_ok_and(|v| v == "town-first")
                && cfg.without.is_none()
                && matches!(cfg.bot, Bot::Picked | Bot::Tuned),
            label: format!("{}-s{seed}", cfg.label()),
            root: std::env::var_os("DP_UPGRADE_RECORD_DIR").map(PathBuf::from),
            ..Self::default()
        }
    }
    fn save(&self, g: &Game, tag: &str) -> String {
        let file = format!("{}-{}-{tag}.json", self.label, self.events.len());
        if let Some(root) = &self.root {
            use std::io::Write;
            let mut f = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(root.join(&file))
                .expect("immutable policy record");
            f.write_all(g.save().as_bytes())
                .expect("complete policy record");
        }
        file
    }
    fn order(&mut self, g: &mut Game, value: &str, day: usize, ci: u64, h: f64) {
        let before = self.save(g, "before");
        let mut expected = serde_json::to_value(&g).unwrap();
        let mut o = g.lineage.standing_orders();
        o.sink = Some(value.into());
        g.set_orders(&o).expect("public sink order");
        expected["lineage"]["orders"]["sink"] = json!(value);
        assert_eq!(
            serde_json::to_value(&g).unwrap(),
            expected,
            "only declared order changes"
        );
        let after = self.save(g, "after");
        self.events.push(json!({"kind":"order","day":day,"checkin":ci,"hours":h,"sink":value,"before":before,"after":after}));
    }
    pub fn step(&mut self, g: &mut Game, day: usize, ci: u64, h: f64) {
        if !self.enabled || self.next == 4 {
            return;
        }
        let plan = ["bank", "device", "device", "bank"];
        if self.original_sink.is_none() {
            if !upgrades::offers(&g.lineage)
                .iter()
                .any(|o| o.id == "bank" && o.ready)
            {
                return;
            }
            self.original_sink = Some(g.lineage.orders.sink.clone());
            self.order(g, "ration", day, ci, h);
        }
        while self.next < 4 {
            let id = plan[self.next];
            let offer = upgrades::offers(&g.lineage)
                .into_iter()
                .find(|o| o.id == id)
                .expect("planned effect remains offered");
            let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
            let needed = (offer.price + reserve - idlever_core::tree::purse(&g.lineage)).max(0);
            if !offer.ready || needed > g.lineage.town.bank {
                break;
            }
            let before = self.save(g, "before");
            let wealth = i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank);
            let rng = g.lineage.rng.clone();
            let rules = g.lineage.rules().clone();
            let net = (g.lineage.night_net, g.lineage.day_net);
            let timer = (
                g.lineage.persistent.recovery_until_tick,
                g.lineage.persistent.recovery_ticks,
                g.lineage.rest_left,
            );
            if needed > 0 {
                assert_eq!(g.bank_withdraw(needed).unwrap(), needed);
            }
            let withdrawn = self.save(g, "withdrawn");
            upgrades::purchase(g, id, offer.price).expect("priced public purchase");
            assert_eq!(
                wealth - i64::from(offer.price),
                i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank)
            );
            assert!(idlever_core::tree::purse(&g.lineage) >= reserve);
            assert_eq!(rng, g.lineage.rng);
            assert_eq!(&rules, g.lineage.rules());
            assert_eq!(net, (g.lineage.night_net, g.lineage.day_net));
            assert_eq!(
                timer,
                (
                    g.lineage.persistent.recovery_until_tick,
                    g.lineage.persistent.recovery_ticks,
                    g.lineage.rest_left
                )
            );
            let after = self.save(g, "after");
            self.spent += i64::from(offer.price);
            self.events.push(json!({"kind":"purchase","day":day,"checkin":ci,"hours":h,"id":id,"offer":offer,"withdrawal":needed,"reserve":reserve,"before":before,"withdrawn":withdrawn,"after":after}));
            self.next += 1;
        }
        if self.next == 4 {
            let original = self.original_sink.clone().unwrap();
            self.order(g, &original, day, ci, h);
        }
    }
    pub fn day_end(&mut self, g: &Game, day: usize) {
        self.daily.push(json!({"day":day,"income":income(g),"spent":self.spent,
            "gold":g.lineage.gold,"bank":g.lineage.town.bank,"ledger":g.lineage.tree.ledger,
            "clock_s":g.lineage.clock_s,"best":g.lineage.best_depth,"levels":g.lineage.town.levels,
            "legacy":g.lineage.bloodline.as_ref().map(|b|b.points),"gold_tally":g.lineage.gold_tally}));
    }
    pub fn finish(&mut self, g: &Game) {
        let file = self.save(g, "final");
        self.final_state = Some(json!({"file":file,"gold":g.lineage.gold,
            "bank":g.lineage.town.bank,"ledger":g.lineage.tree.ledger,"income":income(g),"spent":self.spent,
            "legacy":g.lineage.bloodline.as_ref().map(|b|b.points),"sink":g.lineage.orders.sink,
            "gold_tally":g.lineage.gold_tally,"kit":g.lineage.kit}));
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn disabled_plan_never_changes_game() {
        let mut g = Game::new_resident(1);
        let before = g.save();
        let mut plan = Plan::default();
        plan.step(&mut g, 1, 0, 8.0);
        assert_eq!(g.save(), before);
        assert!(plan.events.is_empty());
        assert_eq!(plan.spent, 0);
    }
    #[test]
    fn plan_waits_for_earned_bank_without_issuing_orders() {
        let mut g = Game::new_resident(1);
        let before = g.save();
        let mut plan = Plan {
            enabled: true,
            ..Plan::default()
        };
        plan.step(&mut g, 1, 0, 8.0);
        assert_eq!(g.save(), before);
        assert!(plan.original_sink.is_none());
        assert!(plan.events.is_empty());
    }
    #[test]
    fn paid_plan_uses_owned_savings_and_restores_order() {
        // Controlled mechanics fixture only; all campaign tests start unmodified towns.
        let mut g = Game::new_resident(1);
        g.lineage.best_depth = 33;
        g.lineage.gold = 3000;
        g.lineage.town.bank = 197000;
        g.lineage.tree.ledger = 200000;
        g.lineage.tree.chest = 0;
        g.lineage.persistent.defeats = 1;
        g.lineage.town.built.push(("bank".into(), 0));
        g.lineage.tree.hired.push(("clerk".into(), 0));
        let mut g = Game::load(&g.save()).unwrap();
        let rng = g.lineage.rng.clone();
        let rules = g.lineage.rules().clone();
        let mut plan = Plan {
            enabled: true,
            ..Plan::default()
        };
        plan.step(&mut g, 3, 0, 48.0);
        assert_eq!(plan.next, 4);
        assert_eq!(plan.spent, 33800); // Default reference profile in this isolated test process.
        assert_eq!(g.lineage.gold + g.lineage.town.bank, 166200);
        assert_eq!(g.lineage.tree.ledger, 166200);
        assert_eq!(g.lineage.orders.sink, "both");
        assert_eq!(g.lineage.rng, rng);
        assert_eq!(g.lineage.rules(), &rules);
        assert_eq!(
            plan.events
                .iter()
                .filter(|e| e["kind"] == "purchase")
                .count(),
            4
        );
        let after = g.save();
        plan.step(&mut g, 3, 1, 56.0);
        assert_eq!(g.save(), after);
        assert_eq!(plan.events.len(), 6);
    }
}
