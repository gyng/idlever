//! Owner amendment 2026-10-14 (Cut227; Cut230 depth ramp): controlled recovery fixtures at the current
//! recovery of a first-floor death (`persistent::recovery_ticks(1)`; Cut227's were the flat `RECOVERY_TICKS`). The same protocols as Cut211's `persistent_probe` (one hero)
//! and Cut218's `controlled/source.rs` (the paid three-hero roster): a public Send, controlled
//! 999 Gas damage, an actual Core `finish_run`, then actual `Session::advance`. No grants.
//! `cargo run -q --profile fast -p idlever-core --example recovery_fixtures -- THREE_ACTUAL.game.json OUT_DIR`
use idlever_core::{
    bloodlines::Session,
    persistent::recovery_ticks,
    turn::{self, Src},
    Game,
};
use serde_json::json;
use std::{fs, path::PathBuf};
fn save(out: &std::path::Path, name: &str, g: &Game) {
    fs::write(out.join(format!("{name}.game.json")), g.save()).unwrap();
    fs::write(out.join(format!("{name}.lineage.json")), serde_json::to_vec_pretty(&g.lineage()).unwrap()).unwrap();
}
fn main() {
    let mut args = std::env::args().skip(1);
    let input = PathBuf::from(args.next().expect("three-actual save"));
    let out = PathBuf::from(args.next().expect("output directory"));
    fs::create_dir_all(&out).unwrap();
    let r = recovery_ticks(1);
    let secs = r / 10;
    // One hero (Cut211 protocol): R → R-10 → 1 → 0 ticks, then away.
    let mut g = Game::new(91);
    g.build_town("house").unwrap();
    g.rename_hero("Mara").unwrap();
    g.try_send().unwrap();
    {
        let (run, mut cx) = g.ctx();
        turn::damage_hero(run, &mut cx, 999, &Src::Gas);
    }
    g.finish_run();
    assert_eq!(g.lineage().persistent_hero.as_ref().unwrap().state, "reincarnating");
    assert_eq!(idlever_core::persistent::remaining(&g.lineage), r, "a first-floor death's recovery");
    save(&out, &format!("controlled-reincarnating-{r}"), &g);
    let mut s = Session::load(&g.save()).unwrap();
    s.advance(1000);
    save(&out, &format!("controlled-recovering-{}", r - 10), &s.active);
    s.advance(r * 100 - 1100);
    assert_eq!(idlever_core::persistent::remaining(&s.active.lineage), 1);
    save(&out, "controlled-recovering-1", &s.active);
    s.advance(100);
    save(&out, "controlled-ready-0", &s.active);
    s.try_send().unwrap();
    s.step(10);
    save(&out, "controlled-away", &s.active);
    // Three heroes (Cut218 protocol) on the genuine paid roster.
    let mut s = Session::load(&fs::read_to_string(&input).unwrap()).unwrap();
    let before = s.lineage();
    assert_eq!(before.hero_slots.len(), 3);
    s.set_worker("scout", false).unwrap();
    s.advance(2_000_000);
    let ready = s.lineage();
    assert!(ready.hero_slots.iter().all(|h| h.recovery_s == 0 && h.rest_s == 0.));
    let mut actions = vec![];
    for id in [1, 2, 3] {
        s.select_bloodline(id).unwrap();
        let snap = s.active.try_send().unwrap();
        let (run, mut cx) = s.active.ctx();
        turn::damage_hero(run, &mut cx, 999, &Src::Gas);
        s.active.finish_run().unwrap();
        let l = s.lineage();
        let h = l.hero_slots.iter().find(|h| h.id == id).unwrap();
        assert_eq!(h.life_state, "reincarnating");
        assert_eq!(h.recovery_s, secs);
        actions.push(json!({"id":id,"real_run_id":snap.run.id,"last_exit":s.active.last_exit,"phase":h.life_state,"recovery_s":h.recovery_s}));
    }
    s.select_bloodline(1).unwrap();
    let l = s.lineage();
    assert!(l.hero_slots.iter().all(|h| h.life_state == "reincarnating" && h.recovery_s == secs));
    fs::write(out.join("three-controlled-reincarnating.game.json"), s.save()).unwrap();
    fs::write(out.join("three-controlled-reincarnating.lineage.json"), serde_json::to_vec_pretty(&l).unwrap()).unwrap();
    s.advance(2_000);
    assert!(s.lineage().hero_slots.iter().all(|h| h.life_state == "reincarnating")); // (Cut264: the whole recovery reads reincarnating)
    fs::write(out.join("three-controlled-recovering.game.json"), s.save()).unwrap();
    s.advance(secs * 1000);
    assert!(s.lineage().hero_slots.iter().all(|h| h.life_state == "ready"));
    fs::write(out.join("three-controlled-ready.game.json"), s.save()).unwrap();
    fs::write(out.join("manifest.json"), serde_json::to_vec_pretty(&json!({
        "recovery_ticks": r, "controlled": true, "earned_death": false,
        "input": input, "protocol": "Cut211 persistent_probe and Cut218 controlled/source.rs at the Cut230 first-floor recovery: public Send + controlled 999 Gas damage + Core finish_run; actual Session.advance",
        "before_gold": before.gold, "ready_gold": ready.gold, "after_gold": l.gold, "actions": actions,
    })).unwrap()).unwrap();
    println!("PASS controlled recovery fixtures at {r} ticks");
}
