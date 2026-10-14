//! Actual earned stage exports; public actions, no ownership/currency/stat/record grants.
use idlever_core::{kit, legacy, offline, persistent, progression, tree, Game};
use serde_json::json;
use std::{
    fs,
    path::{Path, PathBuf},
};
fn save(dir: &Path, id: &str, g: &Game) {
    fs::write(dir.join(format!("{id}.game.json")), g.save()).unwrap();
    fs::write(
        dir.join(format!("{id}.lineage.json")),
        serde_json::to_vec_pretty(&g.lineage()).unwrap(),
    )
    .unwrap();
}
fn home(g: &mut Game) {
    if tree::hired(&g.lineage, "scout") {
        g.set_worker("scout", false).unwrap();
    }
    offline::run_offline_counts(g, 3600);
    assert!(!persistent::away(g));
    assert_eq!(persistent::remaining(&g.lineage), 0);
}
fn main() {
    let out = PathBuf::from(std::env::args().nth(1).expect("out"));
    let baseline = PathBuf::from(std::env::args().nth(2).expect("baseline"));
    let earned = PathBuf::from(std::env::args().nth(3).expect("earned collection"));
    fs::create_dir_all(&out).unwrap();
    let mut entries = Vec::new();
    let mut fresh = Game::new(1);
    fresh.build_town("house").unwrap();
    save(&out, "fresh-home", &fresh);
    entries.push(json!({"id":"fresh-home","earned":true,"stage":"fresh"}));
    let mut survivor_found = false;
    let mut temperament_saved = false;
    for seed in 1..=16 {
        let text =
            fs::read_to_string(baseline.join(format!("seed-{seed}-first-session.game.json")))
                .unwrap();
        let mut g = Game::load(&text).unwrap();
        if g.lineage.persistent.defeats > 0 {
            continue;
        }
        g.set_worker("scout", false).unwrap();
        let mut inherited_saved = false;
        for _ in 0..80 {
            if idlever_core::town::build_ready(&g.lineage, "blacksmith") {
                g.build_town("blacksmith").unwrap();
            }
            if idlever_core::town::built(&g.lineage, "blacksmith") {
                for _ in 0..16 {
                    let armour = kit::ladders(&g.lineage)
                        .into_iter()
                        .find(|l| l.slot == "armour");
                    if armour.and_then(|l| l.next).is_some_and(|n| n.affordable) {
                        kit::buy(&mut g, "armour").unwrap();
                    } else {
                        break;
                    }
                }
            }
            if idlever_core::town::built(&g.lineage, "blacksmith") {
                for _ in 0..16 {
                    if kit::ladders(&g.lineage)
                        .into_iter()
                        .find(|l| l.slot == "weapon")
                        .and_then(|l| l.next)
                        .is_some_and(|n| n.affordable)
                    {
                        kit::buy(&mut g, "weapon").unwrap();
                    } else {
                        break;
                    }
                }
            }
            for _ in 0..16 {
                let Some(o) = legacy::offers(&g.lineage, false)
                    .into_iter()
                    .filter(|o| o.affordable)
                    .min_by_key(|o| o.price)
                else {
                    break;
                };
                legacy::buy_next(&mut g, &o.id).unwrap();
            }
            let wait = persistent::remaining(&g.lineage).div_ceil(10);
            if wait > 0 {
                offline::run_offline_counts(&mut g, wait);
            }
            g.try_send().unwrap();
            while !g.step(256).run_over {}
            if g.lineage.persistent.defeats > 0 {
                break;
            }
            if progression::temperament_open(&g.lineage) && !temperament_saved {
                home(&mut g);
                save(&out, "survivor-temperament-home", &g);
                temperament_saved = true;
                entries.push(json!({"id":"survivor-temperament-home","earned":true,"stage":"temperament","defeats":0,"seed":seed,"completed":g.lineage.persistent.completed,"best":g.lineage.best_depth}));
            }
            if progression::inherited_open(&g.lineage) && !inherited_saved {
                home(&mut g);
                save(&out, "survivor-inherited-home", &g);
                inherited_saved = true;
                entries.push(json!({"id":"survivor-inherited-home","earned":true,"stage":"inherited","defeats":0,"seed":seed,"completed":g.lineage.persistent.completed,"best":g.lineage.best_depth}));
                let offered = progression::offer(&g.lineage);
                let c = offered
                    .iter()
                    .find(|c| c.shape.gift == idlever_core::traits::Gift::Guard)
                    .unwrap_or(&offered[0]);
                g.set_inherited_trait(&c.shape.chip()).unwrap();
            }
            if progression::family_open(&g.lineage) {
                home(&mut g);
                save(&out, "survivor-family-home", &g);
                entries.push(json!({"id":"survivor-family-home","earned":true,"stage":"family","defeats":0,"seed":seed,"completed":g.lineage.persistent.completed,"best":g.lineage.best_depth}));
                survivor_found = true;
                break;
            }
        }
        if survivor_found {
            break;
        }
    }
    assert!(
        survivor_found,
        "no genuine zero-defeat survivor reached inherited gate in bounded probe"
    );
    let text =
        fs::read_to_string(earned.join("seed-1/earned-hearthglass_boots.game.json")).unwrap();
    let mut g = Game::load(&text).unwrap();
    home(&mut g);
    save(&out, "earned-inherited-offer-home", &g);
    let chosen = progression::offer(&g.lineage)[0].shape;
    g.set_inherited_trait(&chosen.chip()).unwrap();
    save(&out, "earned-family-offer-home", &g);
    let family = g
        .lineage()
        .persistent_hero
        .unwrap()
        .progression
        .family_contexts
        .into_iter()
        .find(|c| c.available)
        .unwrap();
    g.set_family_lean(&family.id).unwrap();
    save(&out, "earned-family-committed-home", &g);
    save(&out, "earned-rebirth-home", &g);
    assert!(persistent::preview(&g.lineage, false).available);
    g.pick_temperament("unbowed").unwrap();
    g.try_send().unwrap();
    g.step(1);
    g.pick_temperament("skittish").unwrap();
    save(&out, "earned-queued-away", &g);
    let mut residents = idlever_core::bloodlines::Session::load(
        &fs::read_to_string(out.join("earned-family-committed-home.game.json")).unwrap(),
    )
    .unwrap();
    let gold0 = residents.lineage.gold;
    residents.add_bloodline().unwrap();
    residents.add_bloodline().unwrap();
    assert_eq!(residents.lineage.gold, gold0 - 500);
    let first = residents.active.lineage.clone();
    residents.select_bloodline(2).unwrap();
    assert_eq!(residents.lineage.persistent.completed, 0);
    assert!(residents.lineage.heirs.blood.is_none());
    assert!(residents.lineage.pkg.temperament.is_none());
    let saved = residents.save();
    assert!(residents.set_inherited_trait("not offered").is_err());
    assert_eq!(saved, residents.save());
    residents.select_bloodline(1).unwrap();
    assert_eq!(residents.lineage.heirs.blood, first.heirs.blood);
    assert_eq!(residents.lineage.heirs.bloodline, first.heirs.bloodline);
    fs::write(
        out.join("earned-three-residents.game.json"),
        residents.save(),
    )
    .unwrap();
    entries.push(json!({"id":"earned-three-residents","earned":true,"stage":"residents","actual_paid":500,"gold_before":gold0,"gold_after":residents.lineage.gold}));
    for (id, stage) in [
        ("earned-inherited-offer-home", "inherited"),
        ("earned-family-offer-home", "family"),
        ("earned-family-committed-home", "committed"),
        ("earned-rebirth-home", "rebirth"),
        ("earned-queued-away", "queued"),
    ] {
        entries.push(json!({"id":id,"earned":true,"stage":stage,"source":"actual prior earned collection; public Scout pause/home completion/commitment/send/queue actions under current source"}));
    }
    fs::write(
        out.join("manifest.json"),
        serde_json::to_vec_pretty(&json!({"entries":entries})).unwrap(),
    )
    .unwrap();
    println!("actual stage fixtures complete");
}
