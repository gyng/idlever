//! Read-only profile scan/quote diagnostics. No population/gate acceptance.
use idlever_core::{cut306_upgrades as upgrades, Game};
use serde_json::{json, Value};
use std::{fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        return Err("upgrade_profile_probe PROFILE check|scan|quote [INPUT NEW_OUTPUT]".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no overrides".into());
    }
    assert!(
        upgrades::configure_profile("{}").is_err(),
        "failed parse must not lock defaults"
    );
    let raw = fs::read_to_string(&args[0])?;
    upgrades::configure_profile(&raw)?;
    let expected = upgrades::Profile::parse(&raw)?;
    assert_eq!(upgrades::current_profile(), &expected);
    assert!(
        upgrades::configure_profile(&raw).is_err(),
        "no process reconfiguration"
    );
    if args[1] == "check" {
        if args.len() != 2 {
            return Err("check takes only profile".into());
        }
        println!(
            "{}",
            json!({"profile":expected,"failed_parse_untouched":true,"reconfiguration_rejected":true})
        );
        return Ok(());
    }
    if args.len() != 4 {
        return Err("scan/quote requires input and new output".into());
    }
    if !["scan", "quote"].contains(&args[1].as_str()) {
        return Err("invalid mode".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let out = Path::new(&args[3]);
    fs::create_dir(out)?;
    emit(out, "profile.json", &expected)?;
    if args[1] == "scan" {
        let spec: Value = serde_json::from_slice(&fs::read(&args[2])?)?;
        let mut rows = Vec::new();
        for c in spec["camps"].as_array().ok_or("camps missing")? {
            let path = c["input"].as_str().ok_or("input missing")?;
            let input = fs::read_to_string(path)?;
            let g = Game::load(&input)?;
            let before = g.save();
            assert_eq!(g.lineage.seed, c["seed"].as_u64().unwrap());
            let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i64;
            let owned =
                i64::from(idlever_core::tree::purse(&g.lineage)) + i64::from(g.lineage.town.bank);
            let offers = upgrades::offers(&g.lineage);
            let eligible: Vec<_> = offers
                .iter()
                .filter(|o| {
                    o.ready
                        && !idlever_core::persistent::away(&g)
                        && owned >= i64::from(o.price) + reserve
                })
                .map(|o| o.id.clone())
                .collect();
            let p = upgrades::current_profile();
            rows.push(json!({"context":c,"clock_s":g.lineage.clock_s,"best":g.lineage.best_depth,
                "at_home":!idlever_core::persistent::away(&g),"gold":g.lineage.gold,"chest":g.lineage.tree.chest,
                "bank":g.lineage.town.bank,"reserve":reserve,"owned":owned,"offers":offers,"eligible":eligible,
                "hypothetical_second_bank_price":p.bank_price_units[1]*idlever_core::kit::unit(p.gate_depth[1]),
                "hypothetical_second_vat_price":p.vat_price_units[1]*idlever_core::kit::unit(p.gate_depth[1])}));
            assert_eq!(before, g.save(), "read-only scan");
            assert_eq!(fs::read_to_string(path)?, input);
        }
        emit(out, "rows.json", &rows)?;
        println!("{} camps read without mutation", rows.len());
    } else {
        let raw = fs::read_to_string(&args[2])?;
        let source = Game::load(&raw)?;
        let before = source.save();
        assert!(source.run.is_none());
        fs::write(out.join("canonical.json"), &before)?;
        for id in ["bank", "device"] {
            let dir = out.join(id);
            fs::create_dir(&dir)?;
            let mut g = source.clone();
            let offer = upgrades::offers(&g.lineage)
                .into_iter()
                .find(|o| o.id == id)
                .ok_or("offer missing")?;
            if !offer.ready {
                return Err("locked".into());
            }
            let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
            let needed = (offer.price + reserve - idlever_core::tree::purse(&g.lineage)).max(0);
            if needed > g.lineage.town.bank {
                return Err("unaffordable with reserve".into());
            }
            if needed > 0 {
                assert_eq!(g.bank_withdraw(needed)?, needed);
            }
            let wealth = i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank);
            upgrades::purchase(&mut g, id, offer.price)?;
            assert_eq!(
                wealth - i64::from(offer.price),
                i64::from(g.lineage.gold) + i64::from(g.lineage.town.bank)
            );
            assert_eq!(g.lineage.rng, source.lineage.rng);
            assert_eq!(g.lineage.rules(), source.lineage.rules());
            assert_eq!(g.lineage.total_turns, source.lineage.total_turns);
            fs::write(dir.join("prepared.json"), g.save())?;
            emit(
                &dir,
                "quote.json",
                &json!({"paid_first":offer,"withdrawal":needed,
                "next":upgrades::offers(&g.lineage).into_iter().find(|o|o.id==id),
                "bank_nights":upgrades::bank_nights(&g.lineage),"bank_bonus_permille":upgrades::bank_bonus_permille(&g.lineage),
                "recovery_off":upgrades::recovery_off(&g.lineage),"recovery_at28":upgrades::recovery_ticks(&g.lineage,28)}),
            )?;
        }
        assert_eq!(source.save(), before);
        assert_eq!(fs::read_to_string(&args[2])?, raw);
    }
    assert_eq!(upgrades::current_profile(), &expected);
    Ok(())
}
