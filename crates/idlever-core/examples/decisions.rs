//! Cut 270 oracle (docs/CUT270_LIVE_DECISIONS.md §8 G6–G8): watched runs from saved camps, live decisions on. At each
//! decision the game forks once per option; each fork applies its option, turns live decisions off and plays a horizon
//! of the open app's clock (`advance`), scored `purse + 50 × best depth`. The default's fork is today's game. The main
//! game always takes the default, so the runs it plays are the runs the bots play.
//!   cargo run --profile fast -p idlever-core --example decisions -- [--runs N] [--horizon-h H] [--threads T] SAVE...
use idlever_core::Game;
use std::sync::Mutex;

fn arg(args: &[String], key: &str) -> Option<String> {
    args.iter().position(|a| a == key).and_then(|i| args.get(i + 1).cloned())
}

#[derive(Clone, Debug, Default)]
struct Moment {
    kind: String,
    options: usize,
    default: usize,
    scores: Vec<f64>,
    depth_gain: Vec<i64>,
    gold: Vec<i64>,
}

fn score(g: &Game) -> (f64, i64, i64) {
    let gold = g.lineage.gold as i64;
    let best = g.lineage.best_depth as i64;
    (gold as f64 + 50.0 * best as f64, best, gold)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let runs: u32 = arg(&args, "--runs").and_then(|s| s.parse().ok()).unwrap_or(6);
    let horizon_h: u64 = arg(&args, "--horizon-h").and_then(|s| s.parse().ok()).unwrap_or(2);
    let threads: usize = arg(&args, "--threads").and_then(|s| s.parse().ok()).unwrap_or(8);
    let saves: Vec<String> = args
        .iter()
        .enumerate()
        .skip(1)
        .filter(|(i, a)| !a.starts_with("--") && !args[i - 1].starts_with("--"))
        .map(|(_, a)| a.clone())
        .collect();
    idlever_core::engine::set_capsules(false);
    idlever_core::forecast::set_parallel_sims(false);
    let horizon_ms = horizon_h * 3600 * 1000;
    let out: Mutex<Vec<Moment>> = Mutex::new(Vec::new());
    let runs_seen: Mutex<(u32, u32, u32)> = Mutex::new((0, 0, 0)); // runs, runs with ≥ 1, max per run
    let next = Mutex::new(0usize);
    std::thread::scope(|s| {
        for _ in 0..threads.max(1) {
            s.spawn(|| loop {
                let i = {
                    let mut n = next.lock().unwrap();
                    let i = *n;
                    *n += 1;
                    i
                };
                let Some(path) = saves.get(i) else { break };
                let text = std::fs::read_to_string(path).unwrap_or_else(|e| panic!("{path}: {e}"));
                let mut g = Game::load(&text).unwrap_or_else(|e| panic!("{path}: {e}"));
                for _ in 0..runs {
                    // a camp in recovery waits on the open app's clock first (as the player would)
                    let left = idlever_core::persistent::remaining(&g.lineage);
                    if left > 0 {
                        g.advance(left * 100 + 100);
                    }
                    if !g.may_go() {
                        break;
                    }
                    g.send();
                    g.set_live_decisions(true);
                    let mut n = 0u32;
                    for _ in 0..20_000 {
                        let r = g.step(100);
                        if let Some(d) = r.decision.clone() {
                            n += 1;
                            let mut m = Moment { kind: d.kind.clone(), options: d.options.len(), default: d.default as usize, ..Moment::default() };
                            for k in 0..d.options.len() {
                                let mut f = g.clone();
                                f.decide(Some(k as u32)).expect("option");
                                f.set_live_decisions(false);
                                f.advance(horizon_ms);
                                let (sc, best, gold) = score(&f);
                                m.scores.push(sc);
                                m.depth_gain.push(best);
                                m.gold.push(gold);
                            }
                            out.lock().unwrap().push(m);
                            g.decide(None).expect("auto");
                            continue;
                        }
                        if r.run_over {
                            break;
                        }
                    }
                    g.set_live_decisions(false);
                    let mut rs = runs_seen.lock().unwrap();
                    rs.0 += 1;
                    rs.1 += u32::from(n > 0);
                    rs.2 = rs.2.max(n);
                }
            });
        }
    });
    let ms = out.into_inner().unwrap();
    let (runs_n, with, max_n) = runs_seen.into_inner().unwrap();
    println!("# Cut 270 decisions oracle · {} saves · {runs} runs each · horizon {horizon_h} h", saves.len());
    println!("runs {runs_n} · with ≥ 1 decision {with} ({:.0} %) · max per run {max_n} · decisions {}", 100.0 * with as f64 / runs_n.max(1) as f64, ms.len());
    println!();
    println!("| kind | n | differ | best non-default | top option share | oracle Δ best depth (mean) | oracle Δ purse (mean, %) |");
    println!("|---|---|---|---|---|---|---|");
    let mut all = (0usize, 0f64, 0f64, 0f64);
    for kind in ["cache", "boss", "hurt"] {
        let k: Vec<&Moment> = ms.iter().filter(|m| m.kind == kind).collect();
        if k.is_empty() {
            println!("| {kind} | 0 | | | | | |");
            continue;
        }
        let mut differ = 0;
        let mut nondefault = 0;
        let mut best_counts = vec![0usize; k.iter().map(|m| m.options).max().unwrap_or(0)];
        let (mut dd, mut dg, mut base_g) = (0f64, 0f64, 0f64);
        for m in &k {
            let best = (0..m.options).max_by(|a, b| m.scores[*a].partial_cmp(&m.scores[*b]).unwrap().then(b.cmp(a))).unwrap();
            let spread = m.scores.iter().cloned().fold(f64::MIN, f64::max) - m.scores.iter().cloned().fold(f64::MAX, f64::min);
            if spread > 0.5 {
                differ += 1;
                let best = if m.scores[best] > m.scores[m.default] + 0.5 { best } else { m.default };
                best_counts[best] += 1;
                if best != m.default {
                    nondefault += 1;
                }
            }
            let b = if m.scores[best] > m.scores[m.default] { best } else { m.default };
            dd += (m.depth_gain[b] - m.depth_gain[m.default]) as f64;
            dg += (m.gold[b] - m.gold[m.default]) as f64;
            base_g += m.gold[m.default].max(1) as f64;
        }
        let top = best_counts.iter().copied().max().unwrap_or(0);
        let n = k.len() as f64;
        println!(
            "| {kind} | {} | {differ} | {nondefault} ({:.0} %) | {:.0} % | {:+.2} | {:+.1} ({:+.1} %) |",
            k.len(),
            100.0 * nondefault as f64 / differ.max(1) as f64,
            100.0 * top as f64 / differ.max(1) as f64,
            dd / n,
            dg / n,
            100.0 * dg / base_g.max(1.0)
        );
        all.0 += k.len();
        all.1 += dd;
        all.2 += dg;
        all.3 += base_g;
    }
    let n = all.0.max(1) as f64;
    println!();
    println!("all: oracle Δ best depth {:+.2} floors/decision · Δ purse {:+.1} ({:+.1} %)", all.1 / n, all.2 / n, 100.0 * all.2 / all.3.max(1.0));
}
