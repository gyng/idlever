//! Real core API boundary evidence. Controlled world/qualification fixtures, not earned progression.
use idlever_core::{Game, engine::ExitTier, item::Item, rules::{Row, RuleSet, Verb}, wire::ClassProg};
use serde_json::json;
use std::{fs,path::PathBuf};

fn write(out:&std::path::Path,name:&str,v:impl serde::Serialize) {
    fs::write(out.join(name),serde_json::to_vec_pretty(&v).unwrap()).unwrap();
}
fn cage() -> Game {
    let mut g=Game::new_literal(206);
    g.lineage.gold=500;
    g.set_rules_raw(RuleSet { rows:vec![Row::new(vec![],Verb::new("hold"))], ..Default::default() }).unwrap();
    g.send();
    let r=g.run.as_mut().unwrap();
    r.monsters.clear();r.items.clear();r.hero.inv.clear();r.hero.energy=100;
    r.floor.map.set(r.hero.pos,idlever_core::tiles::Tile::Vault);
    r.vault_cage=["sword","mail","heal"].iter().enumerate().map(|(i,k)|Item::new(900+i as u32,k)).collect();
    g.step(1);
    assert_eq!(g.snapshot().vault_choice.as_ref().unwrap().items.len(),3);
    g
}
fn main() {
    let out=PathBuf::from(std::env::args().nth(1).expect("output directory"));
    fs::create_dir_all(&out).unwrap();
    let opened=cage();
    fs::write(out.join("cage-active.game.json"),opened.save()).unwrap();
    write(&out,"cage-active.snapshot.json",opened.snapshot());
    let mut selected=Game::load(&opened.save()).unwrap();
    selected.choose(901).unwrap();
    let duplicate_refused=selected.choose(902).is_err();
    let r=selected.run.as_ref().unwrap();
    assert_eq!((r.loot_raw,r.loot),(30,7));
    write(&out,"cage-choice.events.json",&selected.events);
    let pickup=json!({"chosen_id":901,"kind":"mail","raw":r.loot_raw,"carry":r.loot,"caged":r.caged,"duplicate_refused":duplicate_refused});
    let (r,mut cx)=selected.ctx();idlever_core::turn::end_run(r,&mut cx,ExitTier::Return);
    let outcome=selected.finish_run().unwrap();
    assert_eq!(selected.lineage.gold,507);
    write(&out,"cage-return.outcome.json",outcome);
    write(&out,"cage-return.lineage.json",selected.lineage());
    let mut timeout=Game::load(&opened.save()).unwrap();
    timeout.set_vault_pref("potion").unwrap();
    let timeout_step=timeout.step(idlever_core::engine::VAULT_GRACE);
    let r=timeout.run.as_ref().unwrap();
    assert!(r.vault_choice.is_none());assert_eq!((r.loot_raw,r.loot),(12,3));
    write(&out,"cage-timeout.events.json",&timeout_step.events);
    write(&out,"cage-contract.json",json!({"fixture":"controlled world: seed206,500Gold,hold row,cleared monsters/items,three authored cage items; opening/pickup/return/timeout are actual core actions",
        "apis":{"choose":"choose(901)","preference":"setVaultPref('potion')","timeout":"step(50) from turn1 active save","grace_ticks":idlever_core::engine::VAULT_GRACE},
        "pickup":pickup,"return_gold":selected.lineage.gold,"return_financial_pct":100,"unknown_potion_label":opened.snapshot().vault_choice.unwrap().items[2].label,
        "timeout":{"pick":902,"raw":r.loot_raw,"carry":r.loot},"no_keep_prompt":selected.pending_exit.is_none()}));

    let mut g=Game::new_resident(203);
    idlever_core::legacy::ensure(&mut g.lineage);
    g.lineage.classes.insert("fighter".into(),ClassProg {level:8,xp:19,next:0});
    g.lineage.hero_legacy.last_mut().unwrap().best_depth=18;
    idlever_core::class_tree::learn(&mut g,"fighter_warden").unwrap();
    idlever_core::class_tree::learn(&mut g,"fighter_recovery").unwrap();
    g.send();
    let r=g.run.as_mut().unwrap();
    r.hero.hp=20;r.hero.max_hp=40;r.hero.max_hp_base=40;r.hero.inv.clear();r.hero.energy=100;r.monsters.clear();
    let p=r.hero.pos.neighbours8().into_iter().find(|p|r.floor.map.passable(*p)).unwrap();
    let mut m=idlever_core::monster::Monster::spawn(900,"goblin",p,1);
    m.hp=100;m.max_hp=100;m.awake=true;r.monsters.push(m);r.floor.map.update_vision(r.hero.pos,8);
    fs::write(out.join("skill-before.game.json"),g.save()).unwrap();
    let before_snapshot=g.snapshot();
    write(&out,"skill-before.snapshot.json",&before_snapshot);
    let step=g.step(1);
    assert!(step.events.iter().any(|e|matches!(e,idlever_core::wire::Ev::Rule {verb,skill:Some(skill),..} if verb.v=="second_wind" && skill.id=="fighter_recovery")));
    write(&out,"skill-step.json",&step);
    write(&out,"skill-replay-window.json",json!({"fixture":"actual one-tick snapshot/event window; controlled post-send world, not a held-run replay capsule",
        "before":before_snapshot,"events":step.events,"after":step.snapshot}));
    fs::write(out.join("skill-after.game.json"),g.save()).unwrap();
    write(&out,"skill-contract.json",json!({"fixture":"controlled qualification: Fighterlevel8/XP19/historicaldepth18; public learn(warden),learn(recovery),send; controlled20/40HP,energy100,adjacent100HPgoblin. Actualstep(1) executes learned Recovery",
        "api":"step(1)","expected_skill":{"id":"fighter_recovery","name":"Recovery"},"expected_verb":"second_wind","before_hp":20,"after_hp":g.run.as_ref().unwrap().hero.hp}));
    println!("exported real-core controlled cage and learned skill fixtures");
}
