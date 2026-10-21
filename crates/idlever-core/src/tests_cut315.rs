//! Cut315: the adopted Bank/Vat upgrades (Cut314's mechanics fixtures on the shipping API).
use crate::{bloodlines::Session, persistent, upgrades, upgrades::Request, Ev, Game};

fn wallet(s: &Session) -> i64 {
    i64::from(s.active.lineage.gold) + i64::from(s.active.lineage.town.bank)
}
fn req(s: &Session, id: &str, max_price: i32, use_savings: bool) -> Request {
    let level = upgrades::level(&s.active.lineage, id) + 1;
    Request { id: id.into(), payer: s.selected, level, max_price, use_savings }
}
/// A town of `slots` residents: hero 1 holds the D33 record and the Vat's service; hero 2 (selected) has neither.
fn fixture(slots: usize) -> Session {
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
    for id in 2..=slots as u32 {
        s.select_bloodline(id).unwrap();
    }
    s.select_bloodline(1).unwrap();
    for game in std::iter::once(&mut s.active).chain(s.others.values_mut()) {
        game.lineage.last_night_net = 1000;
        game.lineage.last_day_net = 4000;
        persistent::recover_at(&mut game.lineage, 28);
    }
    s.select_bloodline(2).unwrap();
    assert_eq!(s.active.lineage.best_depth, 0);
    s
}
fn refuse(label: &str, mut s: Session, r: Request) {
    let before = s.save();
    assert!(s.upgrade_building(&r).is_err(), "{label} refused");
    assert_eq!(s.save(), before, "{label}: a refusal changes nothing");
}

#[test]
fn refusals_change_nothing() {
    let s = fixture(2);
    refuse("unknown", fixture(2), Request { id: "kennel".into(), ..req(&s, "bank", i32::MAX, true) });
    let mut s = fixture(2);
    s.active.lineage.town.built.retain(|(id, _)| id != "bank");
    let r = req(&s, "bank", i32::MAX, true);
    refuse("unbuilt", s, r);
    let mut s = fixture(2);
    s.active.lineage.tree.hired.retain(|(id, _)| id != "clerk");
    let r = req(&s, "bank", i32::MAX, true);
    refuse("no clerk", s, r);
    let mut s = fixture(2);
    s.others.get_mut(&1).unwrap().lineage.persistent.defeats = 0;
    let r = req(&s, "device", i32::MAX, true);
    refuse("vat unearned", s, r);
    let mut s = fixture(2);
    s.others.get_mut(&1).unwrap().lineage.best_depth = 0;
    let r = req(&s, "bank", i32::MAX, true);
    refuse("depth", s, r);
    let mut s = fixture(2);
    s.active.send();
    s.active.run.as_mut().unwrap().turn = 1;
    let r = req(&s, "bank", i32::MAX, true);
    refuse("away", s, r);
    let s = fixture(2);
    let r = req(&s, "bank", 3399, true);
    refuse("stale price", s, r);
    let s = fixture(2);
    let r = Request { level: 4, ..req(&s, "bank", i32::MAX, true) };
    refuse("stale level", s, r);
    let s = fixture(2);
    let r = Request { payer: 1, ..req(&s, "bank", i32::MAX, true) };
    refuse("other payer", s, r);
    let s = fixture(2);
    let r = req(&s, "bank", 3400, false);
    refuse("gold only short", s, r);
    let mut s = fixture(2);
    s.active.lineage.town.bank = 100;
    s.active.lineage.tree.ledger = 1100;
    let r = req(&s, "bank", 3400, true);
    refuse("combined short", s, r);
    let mut s = fixture(2);
    s.active.lineage.town.levels.insert("bank".into(), 4);
    let r = Request { level: 5, ..req(&s, "bank", i32::MAX, true) };
    refuse("max level", s, r);
}

#[test]
fn shared_levels_payment_and_future_recovery() {
    for slots in [2, 3] {
        let mut s = fixture(slots);
        let before = s.save();
        let quotes = s.building_upgrade_offers();
        assert_eq!(s.save(), before, "quotes are pure");
        assert_eq!(quotes.len(), 2);
        assert!(quotes.iter().all(|q| q.offer.ready && q.affordable_with_savings && q.home && q.payer == 2));
        for (id, price) in [("bank", 3400), ("device", 3400), ("device", 43200), ("bank", 43200)] {
            let total = wallet(&s);
            let rng = s.active.lineage.rng.clone();
            let r = req(&s, id, price, true);
            let receipt = s.upgrade_building(&r).unwrap();
            assert_eq!((receipt.price, receipt.payer), (price, 2));
            assert_eq!(wallet(&s), total - i64::from(price));
            assert_eq!(s.active.lineage.rng, rng);
            for g in s.others.values() {
                assert_eq!(g.lineage.gold, s.active.lineage.gold);
                assert_eq!(g.lineage.town.bank, s.active.lineage.town.bank);
                assert_eq!(g.lineage.town.levels, s.active.lineage.town.levels);
            }
        }
        assert_eq!(wallet(&s), 106800);
        assert!(s.building_upgrade_offers().is_empty());
        for g in std::iter::once(&s.active).chain(s.others.values()) {
            assert_eq!(upgrades::bank_nights(&g.lineage), 8);
            assert_eq!(upgrades::bank_bonus_permille(&g.lineage), 40);
            assert_eq!(upgrades::recovery_ticks(&g.lineage, 28), 7800);
            assert_eq!(persistent::recovery_total(&g.lineage), 12000, "a recovery in flight keeps its length");
        }
        let loaded = Session::load(&s.save()).unwrap();
        assert_eq!(loaded.active.lineage.town.levels, s.active.lineage.town.levels);
        assert_eq!(loaded.save(), Session::load(&loaded.save()).unwrap().save());
        if slots == 2 {
            s.active.bank_withdraw(250).unwrap();
            s.add_bloodline().unwrap();
            assert_eq!(wallet(&s), 106550, "a new resident inherits the levels for its own price only");
            assert_eq!(s.others[&3].lineage.town.levels, s.active.lineage.town.levels);
        } else {
            let mut whole = loaded.clone();
            let mut sliced = loaded;
            whole.run_offline_mode(1300, false, true);
            for i in 0..13 {
                sliced.run_offline_slice(100, i == 12);
                if i < 12 {
                    sliced = Session::load(&sliced.save()).unwrap();
                }
            }
            assert_eq!(whole.save(), sliced.save(), "paid background whole/sliced/reloaded");
        }
        // A future ordinary death stores — and the Rest announces — the paid length; a reclone keeps the full one.
        s.select_bloodline(1).unwrap();
        let mut g = s.active.clone();
        g.lineage.rest_left = 0;
        g.lineage.persistent.recovery_until_tick = g.lineage.total_turns;
        g.send();
        let run = g.run.as_mut().unwrap();
        run.max_depth = 28;
        run.hero.hp = 0;
        run.over = Some(crate::engine::ExitTier::Death);
        g.events.clear();
        g.finish_run().unwrap();
        assert_eq!(persistent::recovery_total(&g.lineage), 7800);
        assert!(g.events.iter().any(|e| matches!(e, Ev::Rest { seconds: 780, .. })));
        persistent::recover(&mut g.lineage);
        assert_eq!(persistent::recovery_total(&g.lineage), 12000);
    }
}

#[test]
fn chest_is_not_funding_and_gold_only_leaves_savings() {
    let mut s = fixture(2);
    s.active.lineage.tree.chest = 900;
    s.select_bloodline(1).unwrap();
    s.select_bloodline(2).unwrap();
    let r = req(&s, "bank", 3400, true);
    assert_eq!(s.upgrade_building(&r).unwrap().withdrawal, 3300);
    assert_eq!(s.active.lineage.tree.chest, 900);
    let mut s = fixture(2);
    s.active.lineage.gold = 4000;
    s.active.lineage.town.bank = 196000;
    s.select_bloodline(1).unwrap();
    s.select_bloodline(2).unwrap();
    let r = req(&s, "bank", 3400, false);
    assert_eq!(s.upgrade_building(&r).unwrap().withdrawal, 0);
    assert_eq!(s.active.lineage.town.bank, 196000);
}

#[test]
fn no_levels_keep_old_saves_and_wire() {
    let g = Game::new_resident(7);
    assert!(!g.save().contains("\"levels\""), "empty levels are not serialized");
    assert_eq!(upgrades::level(&g.lineage, "bank"), 2);
    assert_eq!(upgrades::level(&g.lineage, "device"), 1);
    assert_eq!(upgrades::recovery_ticks(&g.lineage, 5), persistent::recovery_ticks(5));
    assert_eq!(upgrades::hurry_price(&g.lineage, 125), 125);
    assert_eq!(upgrades::effect("bank", 3), "+2%/night · 5 nights");
    assert_eq!(upgrades::effect("device", 3), "−35% clone · −50% hurry");
}

#[test]
fn shallow_recovery_is_fifteen_seconds() {
    for d in 0..=14 {
        assert_eq!(persistent::recovery_ticks(d), 150, "D{d}");
    }
    assert_eq!(persistent::recovery_ticks(28), 12000);
    assert!((15..28).all(|d| persistent::recovery_ticks(d) < persistent::recovery_ticks(d + 1)));
}
