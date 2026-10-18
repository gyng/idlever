//! Cut264's PICKED+H: one explicit paid hurry after ordinary PICKED choices at each normal check-in.
//! No hurry in the introductory watched session, during an absence, or between the three daily check-ins.
use super::{Ask, Bot, Cfg, Play, income, median};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::{Mutex, atomic::{AtomicUsize, Ordering}}};

#[derive(Clone, Serialize, Deserialize)]
struct Checkin {
    day: usize,
    checkin: u64,
    offered: Option<i32>,
    collected_purse: i32,
    paid: i32,
}
#[derive(Clone, Serialize, Deserialize)]
struct Result {
    identity: String,
    seed: u64,
    days: usize,
    checkins_per_day: u64,
    king_day: Option<usize>,
    total_spend: i64,
    spend_days_3_14: i64,
    income_days_3_14: i64,
    share_days_3_14_pct: Option<f64>,
    best_day: Vec<u32>,
    checkins: Vec<Checkin>,
}
fn simulate(seed:u64,identity:&str)->Result {
    let cfg=Cfg {bot:Bot::Picked,without:None};
    let ask=Ask::new(&cfg);
    let mut p=Play::new(seed,14,3,false,&ask);
    let mut checkins=Vec::new();
    let mut total_spend=0i64;
    let mut spend=0i64;
    let mut income_start=0i64;
    while !p.done() {
        let (day,ci)=(p.day+1,p.ci+1);
        if day==3 && ci==1 {income_start=income(&p.g);}
        p.step(&ask);
        // Play::step completes one ordinary PICKED check-in. Only this diagnostic then
        // presses the live-priced command once, with the existing collected purse.
        let price=idlever_core::persistent::hurry_price(&p.g.lineage,idlever_core::persistent::away(&p.g));
        let purse=idlever_core::tree::purse(&p.g.lineage);
        let paid=price.filter(|price|purse>=*price).map_or(0,|price|p.g.hurry_clone(price).expect("live affordable hurry"));
        total_spend+=i64::from(paid);
        if day>=3 {spend+=i64::from(paid);}
        checkins.push(Checkin {day,checkin:ci,offered:price,collected_purse:purse,paid});
    }
    assert_eq!(checkins.len(),42,"fourteen days of three normal check-ins");
    for (i,checkin) in checkins.iter().enumerate() {
        assert_eq!((checkin.day,checkin.checkin),(i/3+1,(i%3+1) as u64),"normal check-in protocol");
    }
    let earned=income(&p.g)-income_start;
    Result {identity:identity.into(),seed,days:14,checkins_per_day:3,king_day:p.out.king_day,total_spend,
        spend_days_3_14:spend,income_days_3_14:earned,share_days_3_14_pct:(earned>0).then(||100.0*spend as f64/earned as f64),
        best_day:p.out.best_day,checkins}
}
pub(super) fn run() {
    idlever_core::balance::configure_from_env().expect("valid immutable balance profile");
    idlever_core::engine::set_capsules(false);
    let args:Vec<String>=std::env::args().collect();
    let value=|name:&str|args.iter().position(|a|a==name).and_then(|i|args.get(i+1));
    let seeds=value("--seeds").map_or(16,|s|s.parse::<usize>().expect("positive seeds"));
    let threads=value("--threads").map_or(4,|s|s.parse::<usize>().expect("positive threads"));
    assert!(seeds>0&&threads>0);
    let out=PathBuf::from(value("--out").map_or("target/picked-hurry",String::as_str));
    std::fs::create_dir_all(&out).expect("output directory");
    // Bind resumable per-seed results to the exact executable and immutable balance profile.
    let mut hash=0xcbf29ce484222325u64;
    for byte in std::fs::read(std::env::current_exe().expect("exe")).expect("binary identity") {
        hash=(hash^u64::from(byte)).wrapping_mul(0x100000001b3);
    }
    let identity=format!("picked-hurry-v1-{hash:016x}-{}",serde_json::to_string(idlever_core::balance::get()).unwrap());
    let next=AtomicUsize::new(1);
    let results=Mutex::new(Vec::new());
    std::thread::scope(|scope| {
        for _ in 0..threads.min(seeds) {
            let (next,results,out,identity)=(&next,&results,&out,&identity);
            scope.spawn(move||loop {
                let seed=next.fetch_add(1,Ordering::Relaxed);
                if seed>seeds {break;}
                let file=out.join(format!("seed-{seed}.json"));
                let cached=std::fs::read_to_string(&file).ok().and_then(|text|serde_json::from_str::<Result>(&text).ok())
                    .filter(|r|r.identity==*identity&&r.seed==seed as u64&&r.checkins.len()==42);
                let r=cached.unwrap_or_else(|| {
                    let r=simulate(seed as u64,identity);
                    std::fs::write(&file,serde_json::to_string_pretty(&r).unwrap()).expect("save seed result");
                    r
                });
                eprintln!("PICKED+H seed {} King {:?} hurry ${} days3–14 income ${} share {:?}%",r.seed,r.king_day,r.spend_days_3_14,r.income_days_3_14,r.share_days_3_14_pct);
                results.lock().unwrap().push(r);
            });
        }
    });
    let mut results=results.into_inner().unwrap();results.sort_by_key(|r|r.seed);
    // Unslain Kings are right-censored beyond the fortnight, matching dayplayer's capped milestone convention.
    let king_median=median(results.iter().map(|r|r.king_day.unwrap_or(15) as f64).collect());
    let earliest=results.iter().filter_map(|r|r.king_day).min();
    let share:Vec<f64>=results.iter().filter_map(|r|r.share_days_3_14_pct).collect();
    let share_median=(!share.is_empty()).then(||median(share));
    let pass=earliest.is_none_or(|day|day>=7);
    let summary=serde_json::json!({"bot":"PICKED+H","protocol":"ordinary PICKED choices then one affordable explicit hurry at each normal check-in; no first-session/away hurry", "seeds":seeds,"days":14,"checkins_per_day":3,
        "hurry_king":{"median_day_censored_at_15":king_median,"earliest_slain_day":earliest,"minimum_earliest_day":7,"pass":pass},
        "hurry_share":{"median_pct_days_3_14":share_median,"gate":null,"note":"Cut264 specifies spend share reporting without a numeric acceptance threshold; denominator is earned+fetched+recovered gold"},"results":results});
    std::fs::write(out.join("summary.json"),serde_json::to_string_pretty(&summary).unwrap()).expect("save summary");
    println!("hurry-king: median {king_median:.1} d, earliest {earliest:?}, {}",if pass {"PASS"} else {"FAIL"});
    println!("hurry-share: median {share_median:?}% of income days 3–14 (diagnostic)");
    if !pass {std::process::exit(1);}
}
