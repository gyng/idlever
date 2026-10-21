//! Controlled mechanics fixtures only. No earned affordability or progression claim.
use idlever_core::{bloodlines::Session, cut306_upgrades as upgrades, persistent, Game};
use serde_json::{json, Value};
use std::{fs, io::Write, sync::OnceLock};

fn configure() {
    static INIT: OnceLock<()> = OnceLock::new();
    INIT.get_or_init(|| upgrades::configure_profile(include_str!("cut314-budget.json")).unwrap());
}
fn snapshot(s: &Session) -> Value {
    serde_json::from_str(&s.save()).unwrap()
}
fn wallet(s: &Session) -> i64 {
    i64::from(s.active.lineage.gold) + i64::from(s.active.lineage.town.bank)
}
fn personal(mut value: Value) -> Value {
    fn strip(g: &mut Value) {
        let l = g["lineage"].as_object_mut().unwrap();
        for key in ["gold", "gold_tally", "gold_ledger"] {
            l.remove(key);
        }
        for key in ["bank", "levels"] {
            l["town"].as_object_mut().unwrap().remove(key);
        }
        l["tree"].as_object_mut().unwrap().remove("ledger");
    }
    strip(&mut value);
    for g in value["others"].as_object_mut().unwrap().values_mut() {
        strip(g);
    }
    value
}
fn fixture(slots: usize) -> Session {
    configure();
    let mut g = Game::new_resident(1);
    g.lineage.gold = 200000;
    g.lineage.tree.ledger = 200000;
    g.lineage.tree.chest = 0;
    g.lineage.best_depth = 33;
    g.lineage.persistent.defeats = 1;
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.tree.hired.push(("clerk".into(), 0));
    let mut s = Session::load(&g.save()).unwrap();
    for _ in 1..slots {
        s.add_bloodline().unwrap();
    }
    s.active.lineage.gold = 1000;
    s.active.lineage.town.bank = 199000;
    s.active.lineage.tree.ledger = 200000;
    // Close the existing lazy town mirrors before testing a purchase's exact delta.
    for id in 2..=slots as u32 {
        s.select_bloodline(id).unwrap();
    }
    s.select_bloodline(1).unwrap();
    for (id, game) in
        std::iter::once((1, &mut s.active)).chain(s.others.iter_mut().map(|(id, g)| (*id, g)))
    {
        game.lineage.total_turns = u64::from(id) * 100;
        game.lineage.clock_s = u64::from(id) * 10;
        game.lineage.last_night_net = 1000;
        game.lineage.last_day_net = 4000;
        persistent::recover_at(&mut game.lineage, 28);
    }
    s.select_bloodline(2).unwrap();
    assert_eq!(s.active.lineage.best_depth, 0);
    assert_eq!(s.active.lineage.persistent.defeats, 0);
    s
}
fn refusal(label: &str, mut s: Session, id: &str, max: i32, savings: bool) -> Value {
    let before = s.save();
    let error = s.upgrade_building(id, max, savings).unwrap_err();
    assert_eq!(s.save(), before, "whole refusal {label}");
    json!({"label":label,"id":id,"max_price":max,"use_savings":savings,"error":error,
        "before":serde_json::from_str::<Value>(&before).unwrap(),"after":snapshot(&s)})
}
fn pay(s: &mut Session, id: &str, price: i32) -> Value {
    let before = snapshot(s);
    let total = wallet(s);
    let quote = s.building_upgrade_offers();
    assert_eq!(snapshot(s), before, "quotes are pure");
    let receipt = s.upgrade_building(id, price, true).unwrap();
    assert_eq!(receipt.price, price);
    assert_eq!(wallet(s), total - i64::from(price));
    assert_eq!(
        personal(snapshot(s)),
        personal(before.clone()),
        "personal/RNG/timers/orders untouched"
    );
    for g in std::iter::once(&s.active).chain(s.others.values()) {
        assert_eq!(g.lineage.gold, s.active.lineage.gold);
        assert_eq!(g.lineage.town.bank, s.active.lineage.town.bank);
        assert_eq!(g.lineage.tree.ledger, wallet(s));
        assert_eq!(g.lineage.town.levels, s.active.lineage.town.levels);
    }
    json!({"before":before,"quotes":quote,"receipt":receipt,"after":snapshot(s)})
}
fn all_cases() -> Value {
    let mut refusals = Vec::new();
    refusals.push(refusal("unknown", fixture(2), "unknown", i32::MAX, true));
    let mut s = fixture(2);
    s.active.lineage.town.built.retain(|(id, _)| id != "bank");
    refusals.push(refusal("unbuilt", s, "bank", i32::MAX, true));
    let mut s = fixture(2);
    s.active.lineage.tree.hired.retain(|(id, _)| id != "clerk");
    refusals.push(refusal("no-clerk", s, "bank", i32::MAX, true));
    let mut s = fixture(2);
    s.others.get_mut(&1).unwrap().lineage.persistent.defeats = 0;
    refusals.push(refusal("vat-unearned", s, "device", i32::MAX, true));
    let mut s = fixture(2);
    s.active.lineage.best_depth = 0;
    s.others.get_mut(&1).unwrap().lineage.best_depth = 0;
    refusals.push(refusal("depth", s, "bank", i32::MAX, true));
    let mut s = fixture(2);
    s.active.send();
    s.active.run.as_mut().unwrap().turn = 1;
    refusals.push(refusal("away", s, "bank", i32::MAX, true));
    refusals.push(refusal("stale-price", fixture(2), "bank", 3399, true));
    refusals.push(refusal("gold-only", fixture(2), "bank", 3400, false));
    let mut s = fixture(2);
    s.active.lineage.town.bank = 100;
    s.active.lineage.tree.ledger = 1100;
    refusals.push(refusal("combined-poor", s, "bank", 3400, true));
    let mut s = fixture(2);
    s.active.lineage.town.levels.insert("bank".into(), 4);
    refusals.push(refusal("max-level", s, "bank", i32::MAX, true));

    let mut sequences = Vec::new();
    let mut lifecycle = None;
    let mut future = None;
    for slots in [2, 3] {
        let mut s = fixture(slots);
        let before = snapshot(&s);
        let quotes = s.building_upgrade_offers();
        assert_eq!(snapshot(&s), before);
        assert_eq!(quotes.len(), 2);
        assert!(quotes
            .iter()
            .all(|q| q.offer.ready && q.affordable_with_savings && q.home));
        assert_eq!(
            s.active.lineage.best_depth, 0,
            "readiness is town-wide, not forged personal depth"
        );
        assert_eq!(s.active.lineage.persistent.defeats, 0);
        let mut purchases = Vec::new();
        for (id, price) in [
            ("bank", 3400),
            ("device", 3400),
            ("device", 43200),
            ("bank", 43200),
        ] {
            purchases.push(pay(&mut s, id, price));
        }
        assert_eq!(wallet(&s), 106800);
        assert!(s.building_upgrade_offers().is_empty());
        for g in std::iter::once(&s.active).chain(s.others.values()) {
            assert_eq!(upgrades::bank_nights(&g.lineage), 8);
            assert_eq!(upgrades::bank_bonus_permille(&g.lineage), 40);
            assert_eq!(upgrades::recovery_ticks(&g.lineage, 28), 7800);
            assert_eq!(
                persistent::recovery_total(&g.lineage),
                12000,
                "existing recovery untouched"
            );
        }
        let saved = s.save();
        assert_eq!(
            Session::load(&saved).unwrap().save(),
            saved,
            "paid save/reload"
        );
        if slots == 2 {
            let old = snapshot(&s);
            s.active.bank_withdraw(250).unwrap();
            s.add_bloodline().unwrap();
            assert_eq!(
                wallet(&s),
                106550,
                "only the existing resident price is paid"
            );
            assert_eq!(
                s.others[&3].lineage.town.levels,
                s.active.lineage.town.levels
            );
            for id in [1, 2, 3] {
                s.select_bloodline(id).unwrap();
                assert_eq!(wallet(&s), 106550);
            }
            lifecycle = Some(json!({"before":old,"after":snapshot(&s),"resident_price":250}));
        } else {
            s.select_bloodline(1).unwrap();
            let mut g = s.active.clone();
            g.lineage.rest_left = 0;
            g.lineage.persistent.recovery_until_tick = g.lineage.total_turns;
            g.send();
            let run = g.run.as_mut().unwrap();
            run.max_depth = 28;
            run.hero.hp = 0;
            run.over = Some(idlever_core::engine::ExitTier::Death);
            g.events.clear();
            g.finish_run().unwrap();
            let duration = persistent::recovery_total(&g.lineage);
            assert_eq!(duration, 7800);
            assert!(
                g.events
                    .iter()
                    .any(|e| matches!(e, idlever_core::Ev::Rest { seconds: 780, .. })),
                "public rest matches paid timer"
            );
            future = Some(
                json!({"duration_ticks":duration,"events":g.events,"after":serde_json::from_str::<Value>(&g.save()).unwrap()}),
            );
            persistent::recover(&mut g.lineage);
            assert_eq!(
                persistent::recovery_total(&g.lineage),
                12000,
                "stat reset reclones unchanged"
            );
        }
        sequences
            .push(json!({"slots":slots,"before":before,"quotes":quotes,"purchases":purchases}));
    }
    // Legacy uncollected chest is not spendable funding.
    let mut s = fixture(2);
    s.active.lineage.tree.chest = 900;
    s.select_bloodline(1).unwrap();
    s.select_bloodline(2).unwrap();
    let chest = pay(&mut s, "bank", 3400);
    assert_eq!(chest["receipt"]["withdrawal"], 3300);
    assert_eq!(s.active.lineage.tree.chest, 900);
    assert_eq!(idlever_core::tree::purse(&s.active.lineage), 0);
    json!({"schema":1,"scope":"controlled mechanics fixtures, not earned pacing","profile":upgrades::current_profile(),
        "refusals":refusals,"sequences":sequences,"lifecycle":lifecycle,"future_death":future,"legacy_chest":chest})
}
fn main() {
    let path = std::env::args().nth(1).expect("NEW_JSON_OUTPUT");
    let result = all_cases();
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .unwrap()
        .write_all(serde_json::to_vec(&result).unwrap().as_slice())
        .unwrap();
    println!("PASS10atomic refusals,9paid transactions,2/3resident scopes, legacy chest, timers and lifecycle");
}
#[cfg(test)]
mod tests {
    #[test]
    fn shared_upgrade_contract() {
        let _ = super::all_cases();
    }
}
