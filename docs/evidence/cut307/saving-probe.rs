//! Fixed explicit saving tactic from earned camps. Experimental, never a gate.
use idlever_core::{cut306_upgrades as upgrades, Game};
use serde_json::{json, Value};
use std::{fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
fn sink(g: &mut Game, value: &str) -> Result<()> {
    let mut expected = serde_json::to_value(&g)?;
    let mut orders = g.lineage.standing_orders();
    orders.sink = Some(value.into());
    g.set_orders(&orders)?;
    expected["lineage"]["orders"]["sink"] = json!(value);
    assert_eq!(
        serde_json::to_value(&g)?,
        expected,
        "only explicit sink order changes"
    );
    Ok(())
}
fn attempt(g: &mut Game, id: &str) -> Result<Option<Value>> {
    let offer = upgrades::offers(&g.lineage)
        .into_iter()
        .find(|o| o.id == id)
        .ok_or("planned next effect missing")?;
    let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
    let needed = (offer.price + reserve - idlever_core::tree::purse(&g.lineage)).max(0);
    if !offer.ready || needed > g.lineage.town.bank {
        return Ok(None);
    }
    let before = g.save();
    let wealth = i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank);
    if needed > 0 {
        assert_eq!(g.bank_withdraw(needed)?, needed);
    }
    let withdrawn = g.save();
    upgrades::purchase(g, id, offer.price)?;
    assert_eq!(
        wealth - i64::from(offer.price),
        i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank)
    );
    assert!(idlever_core::tree::purse(&g.lineage) >= reserve);
    Ok(Some(
        json!({"id":id,"offer":offer,"withdrawal":needed,"reserve":reserve,
        "clock_s":g.lineage.clock_s,"town_day":g.lineage.clock_s/idlever_core::engine::DAY_S+1,
        "before":serde_json::from_str::<Value>(&before)?,"after_withdrawal":serde_json::from_str::<Value>(&withdrawn)?,
        "after":serde_json::to_value(g)?}),
    ))
}
fn play(input: &str, out: &Path, role: &str) -> Result<Value> {
    fs::create_dir(out)?;
    fs::write(out.join("original.json"), input)?;
    let mut g = Game::load(input)?;
    assert!(g.run.is_none());
    assert!(!g.lineage.pkg.literal);
    let initial = g.clone();
    fs::write(out.join("canonical.json"), g.save())?;
    let original_sink = g.lineage.orders.sink.clone();
    assert_eq!(original_sink, "both");
    let planned = role != "unchanged";
    if planned {
        sink(&mut g, "ration")?;
    }
    fs::write(out.join("prepared.json"), g.save())?;
    let plan = ["bank", "device", "device", "bank"];
    let mut next = 0;
    let mut purchases = Vec::new();
    let mut reports = Vec::new();
    let mut completed = 0;
    let mut deaths = 0;
    // Initial purchase choice, then21ordinary returns from eight-hour absences.
    for checkin in 0..=21 {
        fs::write(out.join(format!("camp-{checkin:02}-before.json")), g.save())?;
        if planned {
            while next < plan.len() {
                let Some(mut receipt) = attempt(&mut g, plan[next])? else {
                    break;
                };
                receipt["checkin"] = json!(checkin);
                purchases.push(receipt);
                next += 1;
            }
            if next == plan.len() && g.lineage.orders.sink != original_sink {
                sink(&mut g, &original_sink)?;
            }
        }
        assert_eq!(
            i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank),
            g.lineage.tree.ledger
        );
        fs::write(out.join(format!("camp-{checkin:02}-after.json")), g.save())?;
        if checkin == 21 {
            break;
        }
        let report = idlever_core::offline::run_offline_counts(&mut g, 8 * 3600);
        assert!(!report.sampled);
        completed += report.runs;
        deaths += report.deaths.iter().map(|d| d.n).sum::<u32>();
        reports.push(report);
    }
    assert_eq!(
        g.lineage.persistent.completed - initial.lineage.persistent.completed,
        completed
    );
    assert_eq!(g.lineage.clock_s - initial.lineage.clock_s, 7 * 86400);
    fs::write(out.join("after.json"), g.save())?;
    let total_spend: i64 = purchases
        .iter()
        .map(|p| p["offer"]["price"].as_i64().unwrap())
        .sum();
    let late_spend: i64 = purchases
        .iter()
        .filter(|p| p["town_day"].as_u64().unwrap() >= 3)
        .map(|p| p["offer"]["price"].as_i64().unwrap())
        .sum();
    let result = json!({"scope":"fixed explicit saving tactic, not ordinary new-town/gate acceptance",
        "purchases":purchases,"reports":reports,"completed":completed,"deaths":deaths,"best":g.lineage.best_depth,
        "all_four_bought":next==4,"total_spend":total_spend,"late_spend":late_spend,
        "sink_restored":g.lineage.orders.sink==original_sink,"gold":g.lineage.gold,"bank":g.lineage.town.bank,
        "ledger":g.lineage.tree.ledger,"legacy_points":g.lineage.bloodline.as_ref().map(|b|b.points),
        "king_slain":g.lineage.kills.contains("mirror_king"),"clock_s":g.lineage.clock_s,
        "target_pass":planned && next==4 && late_spend>=86400 && g.lineage.orders.sink==original_sink});
    emit(out, "result.json", &result)?;
    Ok(json!({"result":result,"after":g.save()}))
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() != 3 {
        return Err("upgrade_saving_probe PROFILE SPEC NEW_OUTPUT".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no overrides".into());
    }
    upgrades::configure_profile(&fs::read_to_string(&args[0])?)?;
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let spec: Value = serde_json::from_slice(&fs::read(&args[1])?)?;
    let out = Path::new(&args[2]);
    fs::create_dir(out)?;
    emit(out, "profile.json", upgrades::current_profile())?;
    std::thread::scope(|scope| -> Result<()> {
        let mut jobs = Vec::new();
        for c in spec["contexts"].as_array().ok_or("contexts missing")? {
            let input = c["input"].as_str().unwrap().to_string();
            let label = c["label"].as_str().unwrap().to_string();
            let dir = out.join(&label);
            fs::create_dir(&dir)?;
            jobs.push(scope.spawn(move || -> Result<()> {
                let raw = fs::read_to_string(&input)?;
                let mut reference = None;
                for role in ["unchanged", "town-first", "town-first-repeat"] {
                    let result = play(&raw, &dir.join(role), role)?;
                    if role == "town-first" {
                        reference = Some(result.clone());
                    }
                    if role == "town-first-repeat" {
                        assert_eq!(reference.as_ref(), Some(&result), "whole saving repeat");
                    }
                    println!(
                        "{label}/{role}: bought{} late{} runs{} Legacy{}",
                        result["result"]["purchases"].as_array().unwrap().len(),
                        result["result"]["late_spend"],
                        result["result"]["completed"],
                        result["result"]["legacy_points"]
                    );
                }
                assert_eq!(fs::read_to_string(input)?, raw);
                Ok(())
            }));
        }
        for job in jobs {
            job.join().expect("saving worker panicked")?;
        }
        Ok(())
    })
}
