//! Cut299: one earned early camp, legal Lich row removals; diagnostic, never a gate.
use idlever_core::{bloodlines::Session, engine::Capsule, packages, Ev, Replay, RunRec};
use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path};
type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
fn emit(dir: &Path, name: &str, value: &impl serde::Serialize) -> Result<()> {
    fs::write(dir.join(name), serde_json::to_vec(value)?)?;
    Ok(())
}
fn point(g: &idlever_core::Game) -> Option<Value> {
    let r = g.run.as_ref()?;
    if r.depth != r.route.boss_depth("lich")? {
        return None;
    }
    let boss = r.monsters.iter().find(|m| m.kind == "lich")?;
    Some(
        json!({"t":r.turn,"actions":r.actions,"hero_hp":r.hero.hp,"hero_max_hp":r.hero.max_hp,
        "hero_pos":r.hero.pos,"boss_id":boss.id,"boss_hp":boss.hp,"boss_max_hp":boss.max_hp,"boss_pos":boss.pos,
        "boss_visible":r.floor.map.is_visible(boss.pos)&&r.floor.map.los(r.hero.pos,boss.pos),
        "boss_pending":boss.pending,"boss_cooldown":boss.cooldown,
        "summons":r.monsters.iter().filter(|m|m.hp>0&&m.hostile()&&m.summoned&&m.kind=="skeleton").count()}),
    )
}
fn reconstruct(dir: &Path, cap: &Capsule, rec: &RunRec, replay: &Replay) -> Result<()> {
    assert!(cap.inputs.is_empty());
    let mut g = (*cap.game).clone();
    g.events = cap.pre.clone();
    let rules = g.lineage.rules().clone();
    let mut events = Vec::new();
    let mut frames = Vec::new();
    let mut ticks = [0_u64; 3]; // Lich alive: total, without skeletons, with skeletons.
    idlever_core::engine::without_history(|| {
        while g.run.as_ref().is_some_and(|r| r.over.is_none()) {
            let before = point(&g);
            if let Some(p) = &before {
                if p["boss_hp"].as_i64().unwrap() > 0 {
                    ticks[0] += 1;
                    ticks[1] += u64::from(p["summons"].as_u64().unwrap() == 0);
                    ticks[2] += u64::from(p["summons"].as_u64().unwrap() > 0);
                }
            }
            g.tick();
            let after = point(&g);
            if let Some(p) = &after {
                let changed = before.as_ref().is_none_or(|b| {
                    b["actions"] != p["actions"]
                        || b["boss_hp"] != p["boss_hp"]
                        || b["summons"] != p["summons"]
                });
                if changed {
                    frames.push(json!({"before":before,"after":after}));
                }
            }
            events.append(&mut g.events);
        }
    });
    let r = g.run.as_ref().unwrap();
    assert_eq!(r.turn, rec.turns);
    assert_eq!(r.depth, rec.depth);
    assert_eq!(r.over.unwrap().name(), rec.tier);
    let public: Vec<Ev> = replay
        .floors
        .iter()
        .flat_map(|f| f.events.iter().cloned())
        .collect();
    assert_eq!(events, public, "complete actual public replay events");
    assert_eq!(idlever_core::engine::events_hash(&events), replay.hash);
    emit(
        dir,
        &format!("run-{:06}.json", rec.id),
        &json!({"record":rec,"replay":replay,
        "public_events_exact":true,"lich_ticks":ticks,"frames":frames,"rules":rules,
        "raw_row_tally":g.row_tally,"terminal_run":r}),
    )
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if !(args.len() == 2 || args.len() == 3 && args[2] == "--scope-undead") {
        return Err("lich_pen_probe NEW_OUTPUT SAVED_CAMP [--scope-undead]".into());
    }
    if std::env::var_os("IDLEVER_BALANCE_JSON").is_some()
        || std::env::var_os("IDLEVER_BALANCE_FILE").is_some()
    {
        return Err("no tuning overrides".into());
    }
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let out = Path::new(&args[0]);
    fs::create_dir(out)?;
    let scoped = args.len() == 3;
    for input in &args[1..2] {
        let raw = fs::read_to_string(input)?;
        let source = Session::load(&raw)?;
        assert!(source.run.is_none());
        assert!(source.others.is_empty());
        let label = Path::new(input).file_stem().unwrap().to_str().unwrap();
        let dir = out.join(label);
        fs::create_dir(&dir)?;
        fs::write(dir.join("original.json"), &raw)?;
        fs::write(dir.join("canonical.json"), source.save())?;
        let source_before = source.save();
        let variants: &[&str] = if scoped {
            &["scope-undead"]
        } else {
            &[
                "unchanged",
                "remove-both",
                "remove-summoned",
                "remove-boss",
                "unchanged-repeat",
            ]
        };
        let mut control = None;
        for &variant in variants {
            let branch = dir.join(variant);
            fs::create_dir(&branch)?;
            let mut s = source.clone();
            let funds = (
                s.lineage.gold,
                s.lineage.town.bank,
                s.lineage.marks,
                s.lineage.clock_s,
                s.lineage.total_turns,
            );
            if variant.starts_with("remove-") {
                let mut rules = s.lineage.rules().clone();
                let before = rules.rows.len();
                rules.rows.retain(|row| {
                    let summon = row.verb.v == "attack"
                        && row.verb.a.as_deref() == Some("tag:summoned")
                        && row.conds
                            == vec![
                                idlever_core::rules::Cond::t("foe_tag", "summoned"),
                                idlever_core::rules::Cond::n("hp>", 45),
                            ];
                    let boss = row.verb.v == "attack"
                        && row.verb.a.as_deref() == Some("tag:boss")
                        && row.conds
                            == vec![
                                idlever_core::rules::Cond::t("foe_tag", "undead"),
                                idlever_core::rules::Cond::n("hp>", 45),
                            ];
                    !(row.origin.as_deref() == Some("player")
                        && match variant {
                            "remove-both" => summon || boss,
                            "remove-summoned" => summon,
                            "remove-boss" => boss,
                            _ => false,
                        })
                });
                assert_eq!(
                    before - rules.rows.len(),
                    if variant == "remove-both" { 2 } else { 1 }
                );
                s.set_rules(rules)?;
            }
            if variant == "scope-undead" {
                let mut rules = s.lineage.rules().clone();
                let mut changed = 0;
                for row in &mut rules.rows {
                    if row.origin.as_deref() == Some("player")
                        && row.verb.v == "attack"
                        && row.verb.a.as_deref() == Some("tag:summoned")
                        && row.conds
                            == vec![
                                idlever_core::rules::Cond::t("foe_tag", "summoned"),
                                idlever_core::rules::Cond::n("hp>", 45),
                            ]
                    {
                        row.conds[0] = idlever_core::rules::Cond::t("foe_tag", "undead");
                        changed += 1;
                    }
                }
                assert_eq!(changed, 1);
                s.set_rules(rules)?;
            }
            assert_eq!(
                funds,
                (
                    s.lineage.gold,
                    s.lineage.town.bank,
                    s.lineage.marks,
                    s.lineage.clock_s,
                    s.lineage.total_turns
                )
            );
            fs::write(branch.join("prepared.json"), s.save())?;
            emit(
                &branch,
                "packing.json",
                &json!({"quartermaster":packages::quartermaster(&s.lineage),
                "package_kinds":packages::pack_kinds(&s.lineage),"supply_cap":s.lineage.supply_cap()}),
            )?;
            let frontier = s.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0);
            let mut last = frontier;
            let mut caps = BTreeMap::new();
            let mut records = Vec::new();
            let mut report = None;
            for slice in 1..=480 {
                report = Some(s.run_offline_slice(60, slice == 480));
                for cap in s.active.capsules.0.iter().filter(|c| c.id > frontier) {
                    if let std::collections::btree_map::Entry::Vacant(e) = caps.entry(cap.id) {
                        assert_eq!(cap.game.run.as_ref().unwrap().turn, 0);
                        emit(&branch, &format!("send-{:06}.json", cap.id), cap)?;
                        e.insert(cap.clone());
                    }
                }
                for rec in s.lineage.run_log.iter().filter(|r| r.id > last) {
                    let replay = s.replay(rec.id).ok_or("actual replay unavailable")?;
                    reconstruct(
                        &branch,
                        caps.get(&rec.id).ok_or("actual capsule unavailable")?,
                        rec,
                        &replay,
                    )?;
                    records.push(json!({"record":rec,"replay_hash":replay.hash}));
                }
                last = last.max(s.lineage.run_log.iter().map(|r| r.id).max().unwrap_or(0));
            }
            assert_eq!(records.len(), caps.len(), "every captured send completes");
            let report = report.unwrap();
            assert!(!report.sampled);
            emit(&branch, "report.json", &report)?;
            fs::write(branch.join("after.json"), s.save())?;
            assert_eq!(
                i64::from(s.lineage.gold) + i64::from(s.lineage.town.bank),
                s.lineage.tree.ledger
            );
            let result = json!({"records":records,"best":s.lineage.best_depth,"gold":s.lineage.gold,
                "bank":s.lineage.town.bank,"ledger":s.lineage.tree.ledger,"clock_s":s.lineage.clock_s,
                "requested_seconds":28800,"scope":"current-rule continuation of historical earned camp; diagnostic, not a gate"});
            emit(&branch, "result.json", &result)?;
            let actual = (s.save(), serde_json::to_string(&report)?, result);
            if variant == "unchanged" {
                control = Some(actual.clone());
            }
            if variant == "unchanged-repeat" {
                assert_eq!(control.as_ref(), Some(&actual));
            }
            println!(
                "{label}/{variant}: D{} {} runs",
                s.lineage.best_depth,
                records.len()
            );
        }
        assert_eq!(source.save(), source_before);
        assert_eq!(fs::read_to_string(input)?, raw);
    }
    Ok(())
}
