//! Cut306 fixed saved-world upgrade utility screen; experimental, never a gate.
use idlever_core::Game;
use serde_json::{json, Value};
use std::{fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
#[cfg(feature = "dev-balance")]
fn buy(g: &mut Game, id: &str) -> Result<Value> {
    let offer = idlever_core::cut306_upgrades::offers(&g.lineage)
        .into_iter()
        .find(|o| o.id == id)
        .ok_or("no upgrade offer")?;
    if !offer.ready {
        return Err("depth locked".into());
    }
    let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
    let needed = (offer.price + reserve - idlever_core::tree::purse(&g.lineage)).max(0);
    if needed > g.lineage.town.bank {
        return Err("earned wealth cannot pay with reserve".into());
    }
    let before = g.save();
    let wealth = i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank);
    if needed > 0 {
        assert_eq!(g.bank_withdraw(needed)?, needed);
    }
    let withdrawn = g.save();
    let night_net = g.lineage.night_net;
    let timer = (
        g.lineage.persistent.recovery_until_tick,
        g.lineage.persistent.recovery_ticks,
        g.lineage.rest_left,
    );
    idlever_core::cut306_upgrades::purchase(g, id, offer.price)?;
    assert_eq!(g.lineage.night_net, night_net);
    assert_eq!(
        timer,
        (
            g.lineage.persistent.recovery_until_tick,
            g.lineage.persistent.recovery_ticks,
            g.lineage.rest_left
        )
    );
    assert_eq!(
        wealth - i64::from(offer.price),
        i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank)
    );
    assert!(idlever_core::tree::purse(&g.lineage) >= reserve);
    Ok(
        json!({"id":id,"offer":offer,"withdrawal":needed,"reserve":reserve,
        "before":serde_json::from_str::<Value>(&before)?,"after_withdrawal":serde_json::from_str::<Value>(&withdrawn)?}),
    )
}
#[cfg(not(feature = "dev-balance"))]
fn buy(_g: &mut Game, _id: &str) -> Result<Value> {
    Err("shipping control has no experimental upgrades".into())
}

fn branch(input: &str, dir: &Path, role: &str) -> Result<Value> {
    fs::create_dir(dir)?;
    let mut g = Game::load(input)?;
    assert!(g.run.is_none(), "earned camp must be at home");
    assert!(!g.lineage.pkg.literal);
    let original = g.save();
    fs::write(dir.join("original.json"), input)?;
    fs::write(dir.join("canonical.json"), &original)?;
    let purchase = match role {
        "bank-first" | "vat-first" => {
            let id = if role == "bank-first" {
                "bank"
            } else {
                "device"
            };
            match buy(&mut g, id) {
                Ok(receipt) => json!({"status":"paid","receipt":receipt}),
                Err(error) => {
                    assert_eq!(g.save(), original, "failed preparation untouched");
                    json!({"status":"unavailable","reason":error.to_string()})
                }
            }
        }
        "unchanged" | "unchanged-repeat" => json!({"status":"unchanged"}),
        _ => return Err("unknown role".into()),
    };
    fs::write(dir.join("prepared.json"), g.save())?;
    emit(dir, "purchase.json", &purchase)?;
    let completed0 = g.lineage.persistent.completed;
    let night0 = completed0 / idlever_core::engine::NIGHT_RUNS;
    let interest0 = g.lineage.town.interest;
    let ticks0 = g.lineage.total_turns;
    let mut last_run = g.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0);
    let mut nights = Vec::new();
    let mut runs = Vec::new();
    let mut deaths = Vec::new();
    let mut minutes = Vec::new();
    let mut last_night = night0;
    let mut recovery_spent = 0_u64;
    // Ten-second slices ensure no two deaths can follow a >=48s shallow recovery.
    // Record every minute, plus each individual completion/death/payment crossing.
    'horizon: for minute in 1..=10080 {
        for _ in 0..6 {
            let before_ticks = g.lineage.total_turns;
            let remaining_before = idlever_core::persistent::remaining(&g.lineage);
            let pending = idlever_core::offline::run_offline_slice(&mut g, 10, false);
            assert!(pending.slice_pending);
            recovery_spent += remaining_before.min(g.lineage.total_turns - before_ticks);
            let records: Vec<_> = g
                .lineage
                .run_log
                .iter()
                .filter(|r| r.id > last_run)
                .cloned()
                .collect();
            let ds: Vec<_> = records.iter().filter(|r| r.tier == "death").collect();
            assert!(ds.len() <= 1, "death receipt resolution");
            if let Some(rec) = ds.first() {
                let base = idlever_core::persistent::recovery_ticks(rec.depth);
                let off = if role == "vat-first" && purchase["status"] == "paid" {
                    20
                } else {
                    0
                };
                let expected = (base * (100 - off)).div_ceil(100);
                assert_eq!(g.lineage.persistent.recovery_ticks, expected);
                let began = g.lineage.persistent.recovery_until_tick - expected;
                recovery_spent += (g.lineage.total_turns - began).min(expected);
                deaths.push(json!({"id":rec.id,"depth":rec.depth,"base_ticks":base,
                    "actual_ticks":g.lineage.persistent.recovery_ticks,"off_pct":off,
                    "until_tick":g.lineage.persistent.recovery_until_tick}));
            }
            runs.extend(records.iter().map(|r| json!(r)));
            last_run = last_run.max(g.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0));
            let n = g.lineage.persistent.completed / idlever_core::engine::NIGHT_RUNS;
            assert!(n <= last_night + 1, "payment receipt resolution");
            if n > last_night {
                nights.push(json!({"night":n-night0,"completed":g.lineage.persistent.completed,
                    "interest":g.lineage.town.interest-interest0,"elapsed_ticks":g.lineage.total_turns-ticks0,
                    "gold":g.lineage.gold,"bank":g.lineage.town.bank,"ledger":g.lineage.tree.ledger}));
                last_night = n;
            }
            assert_eq!(
                i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
                g.lineage.tree.ledger
            );
            if n >= night0 + 30 || g.lineage.ended {
                break 'horizon;
            }
        }
        minutes.push(json!({"minute":minute,"completed":g.lineage.persistent.completed,
            "interest":g.lineage.town.interest-interest0,"elapsed_ticks":g.lineage.total_turns-ticks0,
            "recovery_ticks":g.lineage.persistent.recovery_ticks,
            "recovery_remaining":idlever_core::persistent::remaining(&g.lineage),
            "recovery_spent_ticks":recovery_spent}));
    }
    // Close the single transport absence once, retaining its ordinary finish-run tail.
    let horizon_completed = g.lineage.persistent.completed;
    let horizon_ticks = g.lineage.total_turns - ticks0;
    let terminal_report = idlever_core::offline::run_offline_slice(&mut g, 0, true);
    let tail: Vec<_> = g
        .lineage
        .run_log
        .iter()
        .filter(|r| r.id > last_run)
        .cloned()
        .collect();
    assert!(tail.len() <= 1, "at most one normal finish-run tail");
    for rec in &tail {
        if rec.tier == "death" {
            let base = idlever_core::persistent::recovery_ticks(rec.depth);
            let off = if role == "vat-first" && purchase["status"] == "paid" {
                20
            } else {
                0
            };
            assert_eq!(
                g.lineage.persistent.recovery_ticks,
                (base * (100 - off)).div_ceil(100)
            );
            deaths.push(json!({"id":rec.id,"depth":rec.depth,"base_ticks":base,
                "actual_ticks":g.lineage.persistent.recovery_ticks,"off_pct":off,
                "until_tick":g.lineage.persistent.recovery_until_tick}));
        }
    }
    runs.extend(tail.iter().map(|r| json!(r)));
    assert_eq!(
        runs.len() as u32,
        g.lineage.persistent.completed - completed0
    );
    assert!(!terminal_report.sampled);
    let result = json!({"purchase":purchase,"completed0":completed0,"night0":night0,"interest0":interest0,
        "runs":runs,"deaths":deaths,"nights":nights,"minutes":minutes,
        "completed":g.lineage.persistent.completed-completed0,
        "actual_interest":g.lineage.town.interest-interest0,"elapsed_ticks":g.lineage.total_turns-ticks0,
        "best":g.lineage.best_depth,"gold":g.lineage.gold,"bank":g.lineage.town.bank,
        "ledger":g.lineage.tree.ledger,"reached_30_payments":last_night>=night0+30,
        "horizon_completed":horizon_completed,"horizon_ticks":horizon_ticks,
        "finish_run_tail":tail,"recovery_spent_ticks":recovery_spent,
        "scope":"experimental saved-world utility, not population/gate acceptance"});
    fs::write(dir.join("after.json"), g.save())?;
    emit(dir, "result.json", &result)?;
    emit(dir, "terminal-report.json", &terminal_report)?;
    Ok(json!({"result":result,"after":g.save()}))
}

fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 3 {
        return Err("upgrade_utility_probe INPUT_SPEC NEW_OUTPUT shipping|prototype".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no overrides".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let spec: Value = serde_json::from_slice(&fs::read(&args[0])?)?;
    let out = Path::new(&args[1]);
    fs::create_dir(out)?;
    let roles = match args[2].as_str() {
        "shipping" => vec!["unchanged"],
        "prototype" => vec!["unchanged", "unchanged-repeat", "bank-first", "vat-first"],
        _ => return Err("invalid mode".into()),
    };
    std::thread::scope(|scope| -> Result<()> {
        let mut jobs = Vec::new();
        for context in spec["contexts"].as_array().ok_or("contexts missing")? {
            let input = context["input"]
                .as_str()
                .ok_or("input missing")?
                .to_string();
            let label = context["label"]
                .as_str()
                .ok_or("label missing")?
                .to_string();
            let path = out.join(&label);
            fs::create_dir(&path)?;
            let roles = &roles;
            jobs.push(scope.spawn(move || -> Result<()> {
                let raw = fs::read_to_string(&input)?;
                let mut control = None;
                for role in roles {
                    let result = branch(&raw, &path.join(role), role)?;
                    if *role == "unchanged" {
                        control = Some(result.clone());
                    }
                    if *role == "unchanged-repeat" {
                        assert_eq!(control.as_ref(), Some(&result), "full continuation repeat");
                    }
                    println!(
                        "{label}/{role}: {} runs, {} interest, paid {}",
                        result["result"]["completed"],
                        result["result"]["actual_interest"],
                        result["result"]["purchase"]["status"]
                    );
                }
                assert_eq!(fs::read_to_string(&input)?, raw);
                Ok(())
            }));
        }
        for job in jobs {
            job.join().expect("utility worker panicked")?;
        }
        Ok(())
    })
}
