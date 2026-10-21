//! Cut317 §1: what a run is today — per run its start and end depth, length, floor pace and how it ended,
//! and the share of wall time the hero spends in the dungeon. Plays a save for N hours through the open app's
//! clock (`advance`, one second a step), as a player who leaves the tab open. Diagnostic, never a gate.
//!   cargo run -q --profile fast -p idlever-core --example expedition_probe -- SAVE.json [--hours 24]
use idlever_core::Game;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let path = args.get(1).expect("SAVE.json");
    let hours: u64 = args
        .iter()
        .position(|a| a == "--hours")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(24);
    let mut g = Game::load(&std::fs::read_to_string(path).expect("read save")).expect("load save");
    let (mut inside, mut total) = (0u64, 0u64);
    let mut cur: Option<(u32, u32, u64, u32)> = None; // run id, start depth, wall second it began, deepest
    let mut purse = g.lineage.gold;
    let mut timed = false;
    let mut why = String::new();
    let counts = |g: &Game| {
        (
            g.lineage.runs_banked,
            g.lineage.runs_returned,
            g.lineage.runs_died,
        )
    };
    let mut before = counts(&g);
    let mut lens: Vec<u64> = Vec::new();
    println!(
        "{:>4} {:>6} {:>5} {:>5} {:>7} {:>9} exit",
        "run", "at_h", "from", "to", "min", "min/floor"
    );
    for s in 0..hours * 3600 {
        g.advance(1000);
        total += 1;
        if let Some(r) = &g.run {
            inside += 1;
            match &mut cur {
                Some(c) if c.0 == r.id => {
                    c.3 = c.3.max(r.depth);
                    timed = r.timed_out;
                    if let Some(i) = r.exit_row.or(r.homeward) {
                        let set =
                            &g.lineage.sets[g.lineage.active_set.min(g.lineage.sets.len() - 1)];
                        why = set
                            .rows
                            .get(i.max(0) as usize)
                            .map(|row| format!("row {i}: {row:?}"))
                            .unwrap_or(format!("row {i}"));
                        why.truncate(110);
                    }
                }
                _ => cur = Some((r.id, r.depth, s, r.depth)),
            }
        } else if let Some((id, from, at, to)) = cur.take() {
            let now = counts(&g);
            let exit = if now.2 > before.2 {
                "death"
            } else if now.0 > before.0 {
                "bank"
            } else if now.1 > before.1 {
                "return"
            } else {
                "?"
            };
            before = now;
            let gold = g.lineage.gold - purse;
            purse = g.lineage.gold;
            let secs = s - at;
            lens.push(secs);
            let floors = (to + 1).saturating_sub(from).max(1);
            println!(
                "{id:>4} {:>6.1} {from:>5} {to:>5} {:>7.1} {:>9.1} {exit}{} purse{gold:+}",
                at as f64 / 3600.0,
                secs as f64 / 60.0,
                secs as f64 / 60.0 / f64::from(floors),
                if timed { " (cap)" } else { "" }
            );
            if !why.is_empty() {
                println!("       {}", std::mem::take(&mut why));
            }
        }
    }
    lens.sort_unstable();
    let med = lens.get(lens.len() / 2).copied().unwrap_or(0);
    println!(
        "runs {} · median {:.1} min · in dungeon {:.0}% of {} h",
        lens.len(),
        med as f64 / 60.0,
        100.0 * inside as f64 / total.max(1) as f64,
        hours
    );
}
