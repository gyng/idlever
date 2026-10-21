//! Queue item 40: the purse's growth rate on the town clock (`rates`).
use crate::{bloodlines::Session, rates, town, Game};

fn camp() -> Game {
    let mut g = Game::new_resident(1);
    g.lineage.clock_s = 9_600;
    g.lineage.gold = 5000;
    g
}
fn tick(g: &mut Game, s: u64) {
    let from = g.lineage.clock_s;
    g.lineage.clock_s += s;
    rates::commit(&mut g.lineage, from);
}

#[test]
fn short_history_shows_no_rate() {
    let mut g = camp();
    assert!(rates::wire(&g.lineage).is_none(), "nothing moved yet");
    g.lineage.gold_move(300, "returned $300");
    tick(&mut g, 120);
    assert!(rates::wire(&g.lineage).is_none(), "two minutes is too short to quote a rate");
    tick(&mut g, 480);
    let h = rates::wire(&g.lineage).unwrap().hour.unwrap();
    assert_eq!((h.window_s, h.earned, h.spent), (600, 300, 0));
    assert_eq!(h.earned_h, 1800, "$300 in ten minutes is $1800/h");
}

#[test]
fn bank_moves_are_transfers_and_refunds_lower_spending() {
    let mut g = camp();
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.gold_move(1000, "returned $1000");
    g.lineage.gold_move(-200, "bought heal");
    g.lineage.gold_move(50, "refund heal");
    let _ = town::deposit(&mut g.lineage, 400);
    let _ = town::withdraw(&mut g.lineage, 100);
    tick(&mut g, 1800);
    let h = rates::wire(&g.lineage).unwrap().hour.unwrap();
    assert_eq!((h.earned, h.spent, h.net), (1000, 150, 850), "{h:?}");
    assert_eq!(h.net_h, 1700);
}

#[test]
fn an_absence_spreads_over_its_hours() {
    let mut g = camp();
    g.lineage.gold_move(7200, "returned $7200");
    tick(&mut g, 4 * 3600);
    let w = rates::wire(&g.lineage).unwrap();
    let (h, d) = (w.hour.unwrap(), w.day.unwrap());
    assert_eq!((h.window_s, h.earned), (3600, 1800), "the last of four hours holds a quarter");
    assert_eq!((d.window_s, d.earned), (4 * 3600, 7200), "the day holds all of it, over the four hours measured");
    assert_eq!((h.earned_h, d.earned_h), (1800, 1800), "one average rate, no spike at the return");
}

#[test]
fn a_day_of_buckets_is_kept() {
    let mut g = camp();
    for _ in 0..30 {
        g.lineage.gold_move(100, "returned $100");
        tick(&mut g, 3600);
    }
    assert!(g.lineage.gold_rate.buckets.len() as u64 <= rates::KEEP);
    let d = rates::wire(&g.lineage).unwrap().day.unwrap();
    assert_eq!((d.window_s, d.earned), (86_400, 2400));
}

#[test]
fn real_offline_rate_matches_the_ledger_and_survives_reload() {
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("../../../web/tests/fixtures/earned-first-ascension-clear.json")).unwrap();
    let mut s = Session::load(&fixture.to_string()).unwrap();
    let tally = |s: &Session| -> i64 { s.active.lineage.gold_tally.iter().filter(|(k, _)| *k != "bank").map(|(_, v)| v).sum() };
    let before = tally(&s);
    s.run_offline(3 * 3600);
    let w = rates::wire(&s.active.lineage).expect("a three-hour absence has a rate");
    let d = w.day.clone().unwrap();
    assert!(d.window_s >= 3 * 3600 - 1, "{d:?}");
    assert!(d.earned > 0, "the absence earned: {d:?}");
    assert_eq!(d.net, tally(&s) - before, "net is every purse movement but the Bank's transfers");
    let again = Session::load(&s.save()).unwrap();
    assert_eq!(rates::wire(&again.active.lineage), Some(w), "the rate reloads unchanged");
}

#[test]
fn a_two_resident_town_shares_one_rate_and_slices_agree() {
    let fixture = include_str!("../../../web/tests/fixtures/earned-first-ascension-clear.json");
    let mut s = Session::load(fixture).unwrap();
    s.add_bloodline().unwrap();
    let mut whole = Session::load(&s.save()).unwrap();
    let mut sliced = Session::load(&s.save()).unwrap();
    whole.run_offline_mode(1800, false, true);
    for i in 0..6 {
        sliced.run_offline_slice(300, i == 5);
        if i < 5 {
            sliced = Session::load(&sliced.save()).unwrap();
        }
    }
    assert_eq!(whole.save(), sliced.save(), "whole and sliced absences agree");
    let w = rates::wire(&whole.active.lineage);
    for g in whole.others.values() {
        assert_eq!(rates::wire(&g.lineage), w, "every resident reads the town's one rate");
    }
}
