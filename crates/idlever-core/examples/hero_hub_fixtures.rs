//! Cut220 genuine public-action derivations from immutable Cut219 earned saves.
use idlever_core::{
    armour_sets::Pins,
    bloodlines::Session,
    kit::{self, StartingConfig},
    persistent, Game,
};
use std::{fs, path::Path};
fn export(out: &Path, id: &str, g: &Game) {
    let before = g.save();
    let started = std::time::Instant::now();
    for _ in 0..50 {
        std::hint::black_box(g.lineage());
    }
    eprintln!(
        "{id}: 50 lineage reads {:?}; save {} bytes",
        started.elapsed(),
        before.len()
    );
    assert_eq!(g.save(), before);
    fs::write(out.join(format!("{id}.game.json")), before).unwrap();
    fs::write(
        out.join(format!("{id}.lineage.json")),
        serde_json::to_vec_pretty(&g.lineage()).unwrap(),
    )
    .unwrap();
}
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let input = Path::new(&args[1]);
    let out = Path::new(&args[2]);
    fs::create_dir_all(out).unwrap();
    let mut g = Game::load(
        &fs::read_to_string(input.join("earned-family-committed-home.game.json")).unwrap(),
    )
    .unwrap();
    assert!(!persistent::away(&g));
    export(out, "earned-ready", &g);
    let cfg = StartingConfig {
        follow_set: Some("hearthglass".into()),
        pins: Some(Pins {
            helm: Some("ironcap".into()),
            ..Default::default()
        }),
        ..Default::default()
    };
    kit::set_starting(&mut g, Some(cfg.clone())).unwrap();
    kit::save_starting(&mut g, "Hybrid", cfg, None).unwrap();
    export(out, "earned-hybrid-saved-kit", &g);
    kit::set_starting(
        &mut g,
        Some(StartingConfig {
            follow_set: Some("hearthglass".into()),
            pins: Some(Pins {
                helm: Some("none".into()),
                ..Default::default()
            }),
            ..Default::default()
        }),
    )
    .unwrap();
    export(out, "earned-pinned-empty", &g);
    g.try_send().unwrap();
    g.step(1);
    g.pick_temperament("skittish").unwrap();
    export(out, "earned-delving-queued", &g);
    let mut home = Game::load(
        &fs::read_to_string(input.join("earned-family-committed-home.game.json")).unwrap(),
    )
    .unwrap();
    let p = persistent::preview(&home.lineage, false);
    assert!(p.available);
    persistent::rebirth(&mut home, &p.token).unwrap();
    assert!(persistent::remaining(&home.lineage) > 0);
    assert!(!persistent::away(&home));
    assert_eq!(
        home.lineage().persistent_hero.unwrap().state,
        "reincarnating"
    );
    export(out, "earned-reincarnating-rebirth", &home);
    idlever_core::offline::run_offline_counts(&mut home, 1);
    assert_eq!(home.lineage().persistent_hero.unwrap().state, "reincarnating"); // (Cut264: the whole recovery)
    export(out, "earned-recovering-rebirth", &home);
    let mut s =
        Session::load(&fs::read_to_string(input.join("earned-three-residents.game.json")).unwrap())
            .unwrap();
    for id in 1..=3 {
        s.select_bloodline(id).unwrap();
        let before = s.save();
        let l = s.lineage();
        assert_eq!(s.save(), before);
        fs::write(
            out.join(format!("paid-resident-{id}.lineage.json")),
            serde_json::to_vec_pretty(&l).unwrap(),
        )
        .unwrap();
    }
    s.select_bloodline(1).unwrap();
    fs::write(out.join("earned-three-residents.game.json"), s.save()).unwrap();
}
