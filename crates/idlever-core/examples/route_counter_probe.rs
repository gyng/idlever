//! Cut284 controlled fixtures: route-aware counter packing; never earned-play acceptance.
use idlever_core::{
    descent::Route,
    packages,
    rules::{Cond, Row},
    Game,
};
use serde_json::json;
use std::{fs, io::Write};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let output = std::env::args()
        .nth(1)
        .ok_or("route_counter_probe NEW_OUTPUT")?;
    if std::path::Path::new(&output).exists() {
        return Err("output exists".into());
    }
    let mut cells = Vec::new();
    for route in Route::all() {
        for (boss, item) in [("bloat_mother", "fire"), ("lurker_queen", "silence")] {
            let depth = route.boss_depth(boss).unwrap();
            let before = [1, 5, 9, 14, 19, 24, 29]
                .into_iter()
                .filter(|s| *s <= depth)
                .max()
                .unwrap();
            let after = [5, 9, 14, 19, 24, 29].into_iter().find(|s| *s > depth);
            let mut cases = vec![
                ("not-in-reach", depth - 3, 1, false),
                ("in-reach", depth - 2, 1, true),
                ("crossing", 33, before, true),
            ];
            if let Some(start) = after {
                cases.push(("skipping", 33, start, false));
            }
            for (label, best, start, expected) in cases {
                for pen in [false, true] {
                    let mut game = Game::new_resident(284);
                    game.lineage.best_depth = best;
                    let set = game.lineage.rules().clone().with_route(route);
                    game.lineage.sets[game.lineage.active_set] = set;
                    game.lineage.light_waystones_on(best, route);
                    for (kind, _) in route.bosses() {
                        game.lineage.kills.insert(kind.into());
                    }
                    game.set_start(start)?;
                    game.lineage.facts.insert(
                        idlever_core::item::ident_fact(&game.lineage.flavours, item).unwrap(),
                    );
                    if pen {
                        game.lineage.pkg.pen_open = true;
                        game.lineage.pkg.pen.push(Row::new(
                            vec![Cond::t("foe_tag", "boss")],
                            idlever_core::facts::counter_row(boss).verb,
                        ));
                    } else {
                        game.lineage.pkg.drills.push(packages::Drill {
                            boss: boss.into(),
                            rows: packages::drill_rows(boss, 30),
                            revoked: false,
                            announced: false,
                        });
                    }
                    packages::recompile(&mut game.lineage);
                    assert_eq!(game.lineage.rules().route(), route);
                    let packed = packages::quartermaster(&game.lineage)
                        .iter()
                        .any(|s| s == item);
                    if pen {
                        assert_eq!(
                            packed, expected,
                            "pen control: route {route:?} {boss} {label}"
                        );
                    }
                    if route.is_base() {
                        assert_eq!(packed, expected, "base route must retain correct behavior");
                    }
                    cells.push(json!({"route":route.0,"forks":route.forks(),"boss":boss,"item":item,"bossDepth":depth,"case":label,"best":best,"start":start,"pen":pen,"expected":expected,"packed":packed,"matches":packed==expected}));
                }
            }
        }
    }
    let mismatches = cells.iter().filter(|c| c["matches"] == false).count();
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(output)?;
    file.write_all(&serde_json::to_vec_pretty(&json!({"diagnostic":"controlled fixtures, not earned play","routes":13,"cells":cells,"mismatches":mismatches}))?)?;
    println!("{} controlled route cells; {mismatches} drilled-counter mismatches; all pen/base controls pass",cells.len());
    Ok(())
}
