//! Synthetic restock catalogue and genuine earned sends; never a balance gate.
use riddle_core::{Game, packages};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 { return Err("pack_check CAMP_DIR OUTPUT".into()); }
    riddle_core::chronicle::use_shipping_words();
    let mut cases = Vec::new();
    for name in ["heal_only", "tactical_fire", "multiple_counters", "low_cap", "full_manual", "poor",
        "offline_capped", "literal", "custom", "manual_duplicates", "stale_automatic"] {
        let mut g = Game::new_resident(163);
        g.lineage.supplies.clear();
        g.lineage.gold_move(10_000 - g.lineage.gold, "fixture");
        for kind in ["heal", "fire", "silence"] {
            if let Some(f) = riddle_core::item::ident_fact(&g.lineage.flavours, kind) { g.lineage.facts.insert(f); }
            g.lineage.forge.entry(kind.into()).or_default().craftable = true;
        }
        if name != "heal_only" {
            g.lineage.pkg.owned.insert("reflect_read".into());
            g.lineage.pkg.tactics.push("reflect_read".into());
        }
        if name != "low_cap" { g.lineage.kit.insert("pack".into(), 2); }
        match name {
            "multiple_counters" => {
                g.lineage.best_depth = 28;
                for boss in ["bloat_mother", "lurker_queen"] {
                    g.lineage.pkg.drills.push(packages::Drill { boss:boss.into(), rows:packages::drill_rows(boss,30), revoked:false, announced:false });
                }
            }
            "full_manual" => { for _ in 0..g.lineage.supply_cap() { g.buy_supply("fire")?; } }
            "poor" => { g.lineage.gold_move(-g.lineage.gold,"fixture"); }
            "offline_capped" => { g.offline=true;g.batch=Default::default(); }
            "literal" => g.lineage.pkg.literal=true,
            "custom" => g.lineage.pkg.stance=packages::CUSTOM.into(),
            "manual_duplicates" => {
                for automatic in [true,false] {g.buy_supply("heal")?;g.lineage.supplies.last_mut().unwrap().auto_packed=automatic;}
                g.lineage.last_supplies=vec!["heal".into(),"heal".into()];
                g.lineage.last_supply_origins=vec![("heal".into(),true),("heal".into(),false)];
            }
            "stale_automatic" => {
                for _ in 0..g.lineage.supply_cap() {g.buy_supply("fire")?;g.lineage.supplies.last_mut().unwrap().auto_packed=true;}
            }
            _ => {}
        }
        packages::recompile(&mut g.lineage);
        // Explicit synthetic depth changes must refresh the oath board before
        // snapshotting, as a real camp/load does. No shipping-code change.
        riddle_core::oath::refresh(&mut g.lineage);
        let before=g.save();let bought=g.restock();let after=g.save();
        let mut reload=Game::load(&before)?;reload.restock();
        cases.push(json!({"case":name,"synthetic":true,"before":before,"bought":bought,"after":after,
            "reload_equal":after==reload.save(),"reload_after":reload.save(),"slots":g.lineage.supply_cap()}));
    }
    let mut earned=Vec::new();
    for seed in [1,2] {for day in [2,3] {
        let path=std::path::Path::new(&args[1]).join(format!("AWAY-s{seed}-d{day}-c0.json"));
        let source=std::fs::read_to_string(&path)?;let mut g=Game::load(&source)?;
        let before=g.save();g.send();let after=g.save();
        let mut reload=Game::load(&before)?;reload.send();
        assert_eq!(after,reload.save());assert_eq!(source,std::fs::read_to_string(&path)?);
        earned.push(json!({"source":path,"source_unchanged":true,"before":before,"after":after,
            "reload_equal":true,"hero":g.run.as_ref().ok_or("Send failed")?.hero,"slots":g.lineage.supply_cap()}));
    }}
    let mut parity=Vec::new();
    for seed in [1,2] { for slots in [1,3] {
        let path=std::path::Path::new(&args[1]).join(format!("AWAY-s{seed}-d3-c0.json"));
        let source=std::fs::read_to_string(&path)?;
        let mut base=riddle_core::bloodlines::Session::load(&source)?;
        let gold=base.lineage.gold;
        for _ in 1..slots {base.add_bloodline()?;}
        assert_eq!(gold-base.lineage.gold,(slots-1)*riddle_core::bloodlines::SLOT_PRICE);
        let before=base.save();
        let mut whole=base.clone();let expected=whole.run_offline_mode(8*3600,false,true);
        for reload in [false,true] {
            let mut sliced=base.clone();let mut left=8*3600;let mut i=0;let widths=[1,719,3600];
            let report=loop {
                let seconds=left.min(widths[i%widths.len()]);let last=seconds==left;
                let r=sliced.run_offline_slice(seconds,last);
                if last {break r;}
                left-=seconds;i+=1;
                if reload {sliced=riddle_core::bloodlines::Session::load(&sliced.save())?;}
            };
            assert_eq!(report,expected,"full report: seed{seed}/slots{slots}/reload{reload}");
            assert_eq!(sliced.save(),whole.save(),"full save: seed{seed}/slots{slots}/reload{reload}");
        }
        assert_eq!(source,std::fs::read_to_string(&path)?);
        parity.push(json!({"seed":seed,"slots":slots,"paid_slots":gold-base.lineage.gold,"before":before,
            "after":whole.save(),"report":expected,"whole_sliced_reloaded_equal":true}));
    }}
    std::fs::write(&args[2],serde_json::to_vec(&json!({"synthetic":cases,"earned":earned,"parity":parity}))?)?;
    Ok(())
}
