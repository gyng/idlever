//! Controlled recovery fixtures and separately earned stat choices; no earned-resource grants.
use idlever_core::{bloodlines::Session, kit, legacy, offline, persistent, town, tree, Game};
use serde_json::json;
use std::{fs, path::PathBuf};
fn save(out: &std::path::Path, name: &str, g: &Game) {
    fs::write(out.join(format!("{name}.game.json")), g.save()).unwrap();
    fs::write(out.join(format!("{name}.lineage.json")),serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
}
fn main() {
    let out = PathBuf::from(std::env::args().nth(1).expect("output directory"));
    fs::create_dir_all(&out).unwrap();
    let mut g = Game::new(91);
    g.build_town("house").unwrap();
    g.rename_hero("Mara").unwrap();
    g.try_send().unwrap();
    {
        let (r, mut cx) = g.ctx();
        idlever_core::turn::damage_hero(r, &mut cx, 999, &idlever_core::turn::Src::Gas);
    }
    g.finish_run();
    save(&out, "controlled-reincarnating-600", &g);
    let mut s = Session::load(&g.save()).unwrap();
    s.advance(1000);
    save(&out, "controlled-recovering-590", &s.active);
    s.advance(58900);
    save(&out, "controlled-recovering-1", &s.active);
    s.advance(100);
    save(&out, "controlled-ready-0", &s.active);
    s.try_send().unwrap();
    s.step(10);
    save(&out, "controlled-away", &s.active);
    let mut rows = vec![];
    for seed in [1, 13] {
        let mut g = Game::new(seed);
        g.build_town("house").unwrap();
        for _ in 0..3 {
            let secs = persistent::remaining(&g.lineage).div_ceil(10);
            if secs > 0 {
                offline::run_offline_counts(&mut g, secs);
            }
            g.try_send().unwrap();
            offline::run_offline_counts(&mut g, 1);
        }
        if tree::lit(&g.lineage).is_some_and(|n| n.id == "porter") {
            g.hire("porter").unwrap();
        }
        g.hire("scout").expect("actual first-session Scout");
        let mut rounds = 0;
        while (g.lineage.bloodline.as_ref().unwrap().points < 55 || legacy::deepest(&g.lineage) < 8)
            && rounds < 42
        {
            offline::run_offline_counts(&mut g, 8 * 3600);
            rounds += 1;
            for (id, _) in town::BUILDINGS {
                if town::build_ready(&g.lineage, id) {
                    g.build_town(id).unwrap();
                }
            }
            for slot in kit::KIT_SLOTS {
                if g.lineage.gold
                    >= kit::price(&g.lineage, slot, kit::owned(&g.lineage, slot) as usize) as i32
                {
                    let _ = kit::buy(&mut g, slot);
                }
            }
        }
        let before = g.save();
        save(&out, &format!("earned-seed-{seed}-budget"), &g);
        let mut focused = Game::load(&before).unwrap();
        let mut balanced = Game::load(&before).unwrap();
        focused.upgrade_hero_next("damage").unwrap();
        focused.upgrade_hero_next("damage").unwrap();
        for id in ["health", "damage", "armour"] {
            balanced.upgrade_hero_next(id).unwrap();
        }
        assert_eq!(focused.lineage.clock_s, balanced.lineage.clock_s);
        assert_eq!(focused.lineage.gold, balanced.lineage.gold);
        save(&out, &format!("earned-seed-{seed}-strength"), &focused);
        save(&out, &format!("earned-seed-{seed}-balanced"), &balanced);
        let before_focus = persistent::wire(&focused.lineage, persistent::away(&focused));
        let before_balance = persistent::wire(&balanced.lineage, persistent::away(&balanced));
        let focus = offline::run_offline_counts(&mut focused, 8 * 3600);
        let balance = offline::run_offline_counts(&mut balanced, 8 * 3600);
        rows.push(json!({"seed":seed,"earned_hours":rounds*8,"budget":g.lineage.bloodline,"focused":before_focus,"balanced":before_balance,"next_8h":{"focused":{"runs":focus.runs,"deaths":focus.deaths.iter().map(|d|d.n).sum::<u32>(),"best":focused.lineage.best_depth,"gold":focused.lineage.gold},"balanced":{"runs":balance.runs,"deaths":balance.deaths.iter().map(|d|d.n).sum::<u32>(),"best":balanced.lineage.best_depth,"gold":balanced.lineage.gold}}}));
    }
    fs::write(out.join("contract.json"),serde_json::to_vec_pretty(&json!({"controlled":"fresh House/public Send followed by controlled999Gasdamage; actual Core death/recovery, no fake receipts;600→590→1→0 ticks via actualSession.advance","earned":"seeds1/13,freshHouse,3manualdelves,actualPorter/Scouthire,8h batches and affordablepermanentkitupgrades; no Gold/Legacy/depth/discovery grants; same earnedwallet focused55 versus balanced45 spent, remainder retained","seeds":rows})).unwrap()).unwrap();
}
