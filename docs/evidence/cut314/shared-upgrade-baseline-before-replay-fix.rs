//! Cut314: unchanged-core parity of an earned camp and explicit resident additions.
use idlever_core::{bloodlines::Session, Game};
use std::{fs, path::Path};

fn main() {
    let args: Vec<_> = std::env::args().skip(1).collect();
    assert_eq!(args.len(), 3, "NEW_OUTPUT SAVED_CAMP SLOTS");
    let out = Path::new(&args[0]);
    fs::create_dir(out).unwrap();
    let raw = fs::read_to_string(&args[1]).unwrap();
    let slots: usize = args[2].parse().unwrap();
    assert!((1..=3).contains(&slots));
    idlever_core::chronicle::use_shipping_words();
    idlever_core::forecast::set_parallel_sims(false);
    let g = Game::load(&raw).unwrap();
    fs::write(out.join("game.json"), g.save()).unwrap();
    let replays: Vec<_> = g
        .capsules
        .0
        .iter()
        .map(|cap| (cap.id, g.replay(cap.id).expect("held replay")))
        .collect();
    assert!(
        !replays.is_empty(),
        "earned fixture must retain a historical replay"
    );
    fs::write(
        out.join("replays.json"),
        serde_json::to_vec(&replays).unwrap(),
    )
    .unwrap();
    let mut session = Session::load(&raw).unwrap();
    for _ in 1..slots {
        session.add_bloodline().unwrap(); // Actual owned Gold, no grants.
    }
    let before = session.save();
    let view = session.lineage();
    assert_eq!(session.save(), before, "read model purity");
    fs::write(out.join("before.json"), &before).unwrap();
    fs::write(out.join("read.json"), serde_json::to_vec(&view).unwrap()).unwrap();
    let mut whole = Session::load(&before).unwrap();
    let mut sliced = Session::load(&before).unwrap();
    let report = whole.run_offline_mode(3600, false, true);
    let mut last = None;
    for i in 0..60 {
        last = Some(sliced.run_offline_slice(60, i == 59));
        if i < 59 {
            sliced = Session::load(&sliced.save()).unwrap();
        }
    }
    assert_eq!(whole.save(), sliced.save(), "whole/sliced/reloaded Session");
    assert_eq!(
        serde_json::to_value(&report).unwrap(),
        serde_json::to_value(last.unwrap()).unwrap()
    );
    fs::write(out.join("after.json"), whole.save()).unwrap();
    fs::write(
        out.join("report.json"),
        serde_json::to_vec(&report).unwrap(),
    )
    .unwrap();
    println!("PASS no-level {slots}-resident Game/read/Session/whole/sliced/reload");
}
