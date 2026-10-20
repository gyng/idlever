//! Cut282: legal same-camp worker/start/order interventions; diagnostic, never a gate.
use idlever_core::{offline, Game};
use serde_json::json;
use std::{fs, io::Write, time::Instant};

const VARIANTS: [&str; 8] = [
    "unchanged",
    "pause-apprentice",
    "pause-drillmaster",
    "pause-both",
    "start1",
    "start5",
    "forge-all",
    "unchanged-repeat",
];

fn prepare(source: &Game, variant: &str) -> Result<Game, String> {
    let mut game = source.clone();
    match variant {
        "unchanged" | "unchanged-repeat" => {}
        "pause-apprentice" => game.set_worker("apprentice", false)?,
        "pause-drillmaster" => game.set_worker("drillmaster", false)?,
        "pause-both" => {
            game.set_worker("apprentice", false)?;
            game.set_worker("drillmaster", false)?;
        }
        "start1" => game.set_start(1)?,
        "start5" => game.set_start(5)?,
        "forge-all" => {
            let mut orders = game.lineage.standing_orders();
            orders.forge = "all".into();
            game.set_orders(&orders)?;
        }
        _ => return Err("unknown variant".into()),
    }
    assert_eq!(game.lineage.gold, source.lineage.gold);
    assert_eq!(game.lineage.town.bank, source.lineage.town.bank);
    assert_eq!(game.lineage.marks, source.lineage.marks);
    assert_eq!(game.lineage.total_turns, source.lineage.total_turns);
    assert_eq!(game.lineage.kit, source.lineage.kit);
    Ok(game)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        return Err("worker_absence NEW_OUTPUT SAVE...".into());
    }
    if std::path::Path::new(&args[0]).exists() {
        return Err("output already exists".into());
    }
    idlever_core::balance::configure_from_env()?;
    idlever_core::forecast::set_parallel_sims(false);
    idlever_core::engine::set_capsules(false);
    let sources = args[1..]
        .iter()
        .map(|path| -> Result<_, Box<dyn std::error::Error>> {
            let input = fs::read_to_string(path)?;
            let source = Game::load(&input)?;
            if source.run.is_some() {
                return Err("expected a home camp".into());
            }
            let prepared = VARIANTS
                .iter()
                .map(|v| prepare(&source, v))
                .collect::<Result<Vec<_>, _>>()?;
            Ok((path, input, source, prepared))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let mut cases = Vec::new();
    for (path, input, source, prepared) in sources {
        let source_before = source.save();
        let wealth = source.lineage.gold as i64 + source.lineage.town.bank as i64;
        let mut control = None;
        for (variant, mut game) in VARIANTS.into_iter().zip(prepared) {
            let before = game.save();
            let started = Instant::now();
            let report = offline::run_offline_counts(&mut game, 24 * 3600);
            let elapsed = started.elapsed().as_secs_f64();
            let after = game.save();
            let summary = json!({"best":game.lineage.best_depth,"runs":report.runs,"banked":report.banked,"returned":report.returned,"deaths":report.deaths,
                "net_wealth":game.lineage.gold as i64 + game.lineage.town.bank as i64 - wealth,"kit":game.lineage.kit,"acts":game.lineage.tree.acts});
            assert_eq!(
                game.lineage.gold as i64 + game.lineage.town.bank as i64,
                game.lineage.tree.ledger
            );
            if variant == "unchanged" {
                control = Some((summary.clone(), after.clone()));
            }
            if variant == "unchanged-repeat" {
                assert_eq!(
                    control.as_ref(),
                    Some(&(summary.clone(), after.clone())),
                    "unchanged repeat must be bit-identical"
                );
            }
            cases.push(json!({"input":path,"variant":variant,"seconds":elapsed,"summary":summary,"prepared":before,"after":after}));
        }
        assert_eq!(source.save(), source_before, "source mutation");
        assert_eq!(fs::read_to_string(path)?, input, "input file mutation");
    }
    let body = serde_json::to_vec(
        &json!({"diagnostic":true,"canonicalGateStatus":"NOT_RUN","hours":24,"cases":cases}),
    )?;
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&args[0])?;
    output.write_all(&body)?;
    println!("{} fixed continuations; legal preparation, source preservation, gold conservation and exact repeated controls pass", cases.len());
    Ok(())
}
