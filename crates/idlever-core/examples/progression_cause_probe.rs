//! Controlled causal replay: a real saved world, optional legal manual Forge,
//! unchanged owned build and offline clock. Diagnostic, never IDLE acceptance.
use idlever_core::{offline, Game};
use serde_json::json;
use std::{fs, path::PathBuf};
fn main() {
    let args: Vec<_> = std::env::args().collect();
    let input = fs::read_to_string(&args[1]).unwrap();
    let out = PathBuf::from(&args[2]);
    fs::create_dir_all(&out).unwrap();
    for build in if args.iter().any(|a| a == "--traces-only") {
        Vec::new()
    } else {
        vec![false, true]
    } {
        let mut g = Game::load(&input).unwrap();
        let initial = g.save();
        let gold = g.lineage.gold;
        if build {
            g.build_town("blacksmith")
                .expect("actual earned construction eligibility");
            assert_eq!(
                g.lineage.gold, gold,
                "preserve actual zero construction cost"
            );
        }
        let label = if build { "legal-forge" } else { "unchanged" };
        let mut slices = vec![];
        for ci in 0..41 {
            let rep = offline::run_offline_counts(&mut g, 8 * 3600);
            slices.push(json!({"ci":ci,"best":g.lineage.best_depth,"completed":g.lineage.persistent.completed,"party":g.lineage.party.iter().map(|p|p.kind.clone()).collect::<Vec<_>>(),"meets":g.lineage.pkg.meets,"drills":g.lineage.pkg.drills,"returned":rep.returned,"banked":rep.banked,"packages":rep.packages}));
        }
        fs::write(out.join(format!("{label}.game.json")), g.save()).unwrap();
        fs::write(out.join(format!("{label}.json")), serde_json::to_string_pretty(&json!({"diagnostic":"controlled same saved-world legal manual Forge; not original IDLE acceptance","initial_sha_scope":"same exact loaded Game except requested real build","initial":serde_json::from_str::<serde_json::Value>(&initial).unwrap()["lineage"]["persistent"],"slices":slices})).unwrap()).unwrap();
    }
    let mut g = Game::load(&input).unwrap();
    let mut exits = vec![];
    for _ in 0..6 {
        let wait = idlever_core::persistent::remaining(&g.lineage).div_ceil(10);
        if wait > 0 {
            offline::run_offline_counts(&mut g, wait);
        }
        if g.run.is_none() {
            g.try_send().unwrap();
        }
        let result = loop {
            let result = g.step(256);
            if result.run_over {
                break result;
            }
        };
        exits.push(json!({"snapshot":result.snapshot,"events":result.events}));
        g.auto_keep();
    }
    fs::write(
        out.join("actual-exit-traces.json"),
        serde_json::to_string_pretty(&exits).unwrap(),
    )
    .unwrap();
    println!("Controlled legal Forge comparison and six actual next-run exit traces exported");
}
