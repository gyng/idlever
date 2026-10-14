//! Genuine public-action transaction diagnostics, not natural progression/balance proof.
use idlever_core::{
    armour_sets::Pins,
    bloodlines::Session,
    engine::Manual,
    kit::{self, StartingConfig},
    persistent,
    rules::{Cond, Row, RuleSet, Verb},
    wire::{Ev, ExitLine, GoldLine, StepResult},
};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};
fn row(conds: Vec<Cond>, verb: &str) -> Row {
    let mut r = Row::new(conds, Verb::new(verb));
    r.origin = Some("player".into());
    r
}
fn one(verb: &str) -> RuleSet {
    RuleSet {
        rows: vec![row(vec![], verb)],
        ..Default::default()
    }
}
fn exit(result: &StepResult) -> Option<ExitLine> {
    result.events.iter().find_map(|e| match e {
        Ev::Exit { line: Some(l), .. } => Some((**l).clone()),
        _ => None,
    })
}
fn receipts(before: &[GoldLine], after: &[GoldLine]) -> Vec<GoldLine> {
    let n = (0..=before.len().min(after.len()))
        .rev()
        .find(|n| before[before.len() - n..] == after[..*n])
        .unwrap();
    after[n..].to_vec()
}
fn pause(s: &mut Session) {
    if idlever_core::tree::hired(&s.lineage, "scout") {
        s.set_worker("scout", false).unwrap();
    }
}
fn empty_armour(s: &mut Session) {
    kit::set_starting(
        s,
        Some(StartingConfig {
            pins: Some(Pins {
                helm: Some("none".into()),
                armour: Some("none".into()),
                boots: Some("none".into()),
            }),
            ..Default::default()
        }),
    )
    .unwrap();
}
fn load(input: &Path, name: &str) -> Session {
    Session::load(&fs::read_to_string(input.join(format!("{name}.game.json"))).unwrap()).unwrap()
}
fn adjacent_threat(s: &Session) -> bool {
    s.run.as_ref().is_some_and(|r| {
        r.monsters
                .iter()
                .any(|m| m.hp > 0 && m.hostile() && m.pos.adjacent(r.hero.pos))
    })
}
fn pre_info(s: &Session) -> Value {
    let r = s.run.as_ref().unwrap();
    json!({"runId":r.id,"turn":r.turn,"depth":r.depth,"hp":r.hero.hp,"secured":r.secured,"remainingCarry":r.loot,"carried":r.carried(),"livingPets":s.lineage().actual_party,"manual":r.manual,"manualActionQueued":r.manual_act.is_some()})
}
fn emit(
    out: &Path,
    id: &str,
    pre: &Session,
    after: &Session,
    line: Option<ExitLine>,
    operations: Value,
    provenance: Value,
) -> Value {
    let save = pre.save();
    let before = pre.lineage.gold;
    let ledger = pre.lineage.gold_ledger.clone();
    let new = receipts(&ledger, &after.lineage.gold_ledger);
    assert_eq!(
        new.iter().map(|r| i64::from(r.delta)).sum::<i64>(),
        i64::from(after.lineage.gold - before)
    );
    let p = out.join(format!("{id}.session.json"));
    fs::write(&p, &save).unwrap();
    fs::write(out.join(format!("{id}.after.session.json")), after.save()).unwrap();
    let fetched: i32 = new
        .iter()
        .filter(|r| r.why.starts_with("fetched by "))
        .map(|r| r.delta)
        .sum();
    let gross_lost = line.as_ref().map_or(0, |l| (l.carried - l.kept).max(0));
    let expected = json!({"goldBefore":before,"goldAfter":after.lineage.gold,"newLedger":new,"ledgerAfter":after.lineage.gold_ledger,"exitLine":line,"pre":pre_info(pre),"fetched":fetched,"grossLostBeforeFetch":gross_lost,"lostAfterFetch":(gross_lost-fetched).max(0)});
    fs::write(
        out.join(format!("{id}.expected.json")),
        serde_json::to_vec_pretty(&expected).unwrap(),
    )
    .unwrap();
    assert_eq!(pre.save(), save);
    json!({"id":id,"home":p,"activeBloodline":pre.selected,"transactionDiagnostic":true,"naturalProgressionProof":false,"operations":operations,"expected":expected,"provenance":provenance})
}
fn observed_boundary(
    out: &Path,
    id: &str,
    start: &Session,
    manual_wait: bool,
    provenance: Value,
) -> (Value, ExitLine) {
    let beginning = start.save();
    let initial = start.run.as_ref().unwrap().turn;
    let mut actual = Session::load(&beginning).unwrap();
    let mut final_line = None;
    for _ in 0..20_000 {
        if manual_wait && actual.run.as_ref().unwrap().manual_act.is_none() {
            actual.act(Manual::Wait).unwrap();
        }
        let result = actual.step(if manual_wait { 1 } else { 64 });
        if result.run_over {
            final_line = exit(&result).map(|l| (l, result.snapshot.turn));
            break;
        }
    }
    let (line, end) = final_line.expect("bounded real exit");
    let ticks = end - initial;
    assert!(ticks > 0);
    let mut pre = Session::load(&beginning).unwrap();
    if manual_wait {
        for i in 0..ticks {
            if pre.run.as_ref().unwrap().manual_act.is_none() {
                pre.act(Manual::Wait).unwrap();
            }
            if i + 1 < ticks {
                assert!(!pre.step(1).run_over);
            }
        }
    } else if ticks > 1 {
        assert!(!pre.step(ticks - 1).run_over);
    }
    let mut repeat = Session::load(&pre.save()).unwrap();
    let result = repeat.step(1);
    assert!(result.run_over);
    assert_eq!(exit(&result), Some(line.clone()));
    assert_eq!(repeat.lineage.gold, actual.lineage.gold);
    assert_eq!(repeat.lineage.gold_ledger, actual.lineage.gold_ledger);
    let entry = emit(
        out,
        id,
        &pre,
        &repeat,
        Some(line.clone()),
        json!([{"method":"step","args":[1]}]),
        provenance,
    );
    (entry, line)
}
fn main() {
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let args: Vec<_> = std::env::args().collect();
    let input = PathBuf::from(&args[1]);
    let out = PathBuf::from(&args[2]);
    fs::create_dir_all(&out).unwrap();
    let mut entries = Vec::new();
    // Existing pen is genuinely open; bank only after an actual pickup.
    let mut bank = load(&input, "earned-family-committed-home");
    pause(&mut bank);
    assert!(bank.lineage.pkg.pen_open);
    bank.set_start(1).unwrap();
    bank.try_send().unwrap();
    let mut found = false;
    for _ in 0..2000 {
        if bank.run.as_ref().unwrap().loot > 0 {
            found = true;
            break;
        }
        assert!(!bank.step(1).run_over, "bank prefix ended before carry");
    }
    assert!(found);
    bank.set_rules(one("bank")).unwrap();
    let (entry, line) = observed_boundary(
        &out,
        "bank-positive",
        &bank,
        false,
        json!({"input":"earned-family-committed-home.game.json","actions":["pause hired Scout","setStart(1)","send","step(1) until genuine carry>0","setRules one bank row through already-open pen"],"noGrants":true}),
    );
    assert_eq!(line.tier, "bank");
    assert!(line.kept > 0);
    entries.push(entry);
    // Actual paid resident2, personal record0. Try ordinary play first.
    let mut death = load(&input, "earned-three-residents");
    death.select_bloodline(2).unwrap();
    pause(&mut death);
    empty_armour(&mut death);
    death.set_start(1).unwrap();
    let mut saved = false;
    for attempt in 1..=16 {
        death.try_send().unwrap();
        let start = death.save();
        let mut boundary = None;
        for _ in 0..20_000 {
            let r = death.step(64);
            if r.run_over {
                boundary = exit(&r);
                break;
            }
        }
        if let Some(l) = boundary {
            eprintln!(
                "ordinary paidresident2 attempt{attempt}: tier{} secured{} carry{} kept{}",
                l.tier, l.secured, l.carried, l.kept
            );
            if l.tier == "death" && l.secured > 0 && l.carried > l.kept {
                let initial = Session::load(&start).unwrap();
                let (e, confirmed) = observed_boundary(
                    &out,
                    "death-secured-lost",
                    &initial,
                    false,
                    json!({"input":"earned-three-residents.game.json","actions":["selectBloodline(2)","pause hired Scout","free pins helm/body/boots empty","setStart(1)",format!("actual ordinary departure{attempt}")],"noGrants":true}),
                );
                assert_eq!(confirmed, l);
                entries.push(e);
                saved = true;
                break;
            }
        }
        if persistent::remaining(&death.lineage) > 0 {
            death.run_offline_mode(60, false, true);
        }
    }
    // Legal watch Take control/Wait fallback; never bypass the new resident's locked pen.
    if !saved {
        let mut d = load(&input, "earned-three-residents");
        d.select_bloodline(2).unwrap();
        pause(&mut d);
        empty_armour(&mut d);
        d.set_start(1).unwrap();
        d.try_send().unwrap();
        let mut found = false;
        for _ in 0..20_000 {
            if d.run.as_ref().is_some_and(|r| r.secured > 0 && r.loot > 0) && adjacent_threat(&d) {
                found = true;
                break;
            }
            if d.step(1).run_over {
                break;
            }
        }
        assert!(
            found,
            "need real secured carry and adjacent threat; no patches"
        );
        d.take_control(true).unwrap();
        let (e, l) = observed_boundary(
            &out,
            "death-secured-lost",
            &d,
            true,
            json!({"input":"earned-three-residents.game.json","actions":["selectBloodline(2)","pause hired Scout","free empty armour pins","send and real steps until secured>0/carry>0/adjacent threat","takeControl(true), existing ungated live-watch capability","actual Wait actions until demise"],"noGrants":true}),
        );
        assert_eq!(l.tier, "death");
        assert!(l.secured > 0 && l.carried > l.kept);
        entries.push(e);
    }
    // Deliberate lawful build/pen setup to expose named fetch protection.
    let mut protected_saved = false;
    for minimum in [5, 10, 20, 40] {
        let mut d = load(&input, "earned-family-committed-home");
        pause(&mut d);
        assert!(d.lineage.pkg.pen_open);
        let offer = persistent::preview(&d.lineage, false);
        assert!(offer.available);
        persistent::rebirth(&mut d, &offer.token).unwrap();
        d.run_offline_mode(60, false, true);
        assert_eq!(persistent::remaining(&d.lineage), 0);
        d.unequip_package("temperament").unwrap();
        empty_armour(&mut d);
        d.set_start(1).unwrap();
        let pet = d
            .lineage
            .party
            .iter()
            .chain(&d.lineage.kennel)
            .find(|p| p.name == "Greth")
            .unwrap()
            .id;
        d.set_party(vec![pet]).unwrap();
        d.set_companion_rules(
            pet,
            RuleSet {
                rows: vec![
                    row(vec![Cond::n("foes>=", 1)], "retreat"),
                    row(vec![], "follow"),
                ],
                ..Default::default()
            },
        )
        .unwrap();
        d.try_send().unwrap();
        let mut found = false;
        for _ in 0..20_000 {
            if d.run.as_ref().is_some_and(|r| r.loot >= minimum) && adjacent_threat(&d) {
                found = true;
                break;
            }
            if d.step(1).run_over {
                break;
            }
        }
        if !found {
            eprintln!("fetch candidate minimum{minimum}: no live qualifying carry/threat");
            continue;
        }
        d.set_rules(one("hold")).unwrap();
        let (e, l) = observed_boundary(
            &out,
            &format!("fetch-candidate-{minimum}"),
            &d,
            false,
            json!({"input":"earned-family-committed-home.game.json","actions":["pause hired Scout","confirmed Rebirth","lawful60s recovery","clear temperament","free empty armour pins","select actual earned Greth","public pet retreat/follow rules","send",format!("real carry>={minimum} and adjacent threat"),"setRules hold through earned open pen"],"noGrants":true}),
        );
        let fetched = e["expected"]["fetched"].as_i64().unwrap();
        eprintln!(
            "fetch candidate{minimum}: tier{} carried{} kept{} fetched{fetched}",
            l.tier, l.carried, l.kept
        );
        if l.tier == "death" && fetched > 0 && e["expected"]["lostAfterFetch"].as_i64().unwrap() > 0
        {
            entries.push(e);
            protected_saved = true;
            break;
        }
    }
    assert!(
        protected_saved,
        "need genuinely living pet and positive named fetch; no carry surgery"
    );
    // Three actual paid residents, actual sends, one actual absence transaction.
    let mut multi = load(&input, "earned-three-residents");
    pause(&mut multi);
    for id in 1..=3 {
        multi.select_bloodline(id).unwrap();
        multi.set_start(1).unwrap();
        multi.try_send().unwrap();
    }
    multi.select_bloodline(1).unwrap();
    let pre = multi.clone();
    let before = pre.save();
    let report = multi.run_offline_mode(8 * 3600, false, true);
    assert!(report.bloodlines.len() >= 3);
    assert!(report.bloodlines.iter().filter(|r| r.runs > 0).count() >= 2);
    let mut e = emit(
        &out,
        "multihero-absence",
        &pre,
        &multi,
        None,
        json!([{"method":"runOfflineQuick","args":[28800]}]),
        json!({"input":"earned-three-residents.game.json","actions":["pause hired Scout","select1/setStart1/send","select2/setStart1/send","select3/setStart1/send","select1","actual8h absence with all3live"],"noGrants":true}),
    );
    e["expected"]["report"] = serde_json::to_value(&report).unwrap();
    assert_eq!(pre.save(), before);
    entries.push(e);
    fs::write(
        out.join("manifest-raw.json"),
        serde_json::to_vec_pretty(&json!({"transactionDiagnostics":true,"entries":entries}))
            .unwrap(),
    )
    .unwrap();
}
