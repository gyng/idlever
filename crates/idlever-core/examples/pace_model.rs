//! Pacing prediction model (docs/PACE_MODEL.md): predicts a balance profile's dayplayer milestones (IDLE/PICKED
//! arrival hours at D8…D33, class level by day, daily net gold) in seconds, from a one-time calibration.
//!   cargo run -q --profile fast -p idlever-core --features dev-balance --example pace_model -- calibrate --out target/pace-model/
//!   … -- predict --profile PATH [--model target/pace-model/model.json]
//!   … -- search --grid GRID.json [--base tuning/balance.json] [--claims tuning/studies/cut317-adopt.json]
//!   … -- validate --profile PATH --truth DIR (a stat_probe obs.json + its DP_SAVE_DIR saves)
//! Internal workers (run under IDLEVER_BALANCE_JSON): `kernel --jobs J --out S`, `densify --library DIR --out DIR`.
#[path = "pace_model/fit.rs"]
mod fit;
#[path = "pace_model/kernel.rs"]
mod kernel;
#[path = "pace_model/library.rs"]
mod library;
#[path = "pace_model/meta.rs"]
mod meta;
#[path = "pace_model/model.rs"]
mod model;
#[path = "pace_model/rebase.rs"]
mod rebase;
#[path = "pace_model/report.rs"]
mod report;

use std::path::{Path, PathBuf};

fn arg<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
    args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1)).map(String::as_str)
}
fn num<T: std::str::FromStr>(args: &[String], flag: &str, default: T) -> Result<T, String> {
    match arg(args, flag) {
        Some(v) => v.parse().map_err(|_| format!("invalid {flag} `{v}`")),
        None => Ok(default),
    }
}
fn read(path: &Path) -> Result<String, String> { std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display())) }

const USAGE: &str = "usage: pace_model calibrate --out DIR [--library DIR] [--seeds 1,2,3] [--bots IDLE,PICKED] [--threads 16]
       pace_model predict --profile P [--model DIR/model.json] [--threads 16] [--replicas 96] [--json OUT]
       pace_model search --grid G.json [--base P] [--claims STUDY.json] [--model M] [--threads 16]
       pace_model validate --profile P --truth DIR [--model M]";

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let rest = args.get(1..).unwrap_or(&[]);
    let result = match args.first().map(String::as_str) {
        Some("kernel") => cmd_kernel(rest),
        Some("densify") => cmd_densify(rest),
        Some("calibrate") => cmd_calibrate(rest),
        Some("predict") => cmd_predict(rest),
        Some("search") => cmd_search(rest),
        Some("validate") => cmd_validate(rest),
        _ => Err(USAGE.into()),
    };
    if let Err(e) = result {
        eprintln!("pace_model: {e}");
        std::process::exit(2);
    }
}

fn worker_setup() -> Result<(), String> {
    idlever_core::balance::configure_from_env()?;
    idlever_core::engine::set_capsules(false);
    idlever_core::forecast::set_parallel_sims(false);
    Ok(())
}

fn cmd_kernel(args: &[String]) -> Result<(), String> {
    worker_setup()?;
    let jobs: Vec<kernel::Job> = serde_json::from_str(&read(Path::new(arg(args, "--jobs").ok_or("--jobs")?))?).map_err(|e| e.to_string())?;
    let threads: usize = num(args, "--threads", 8)?;
    let cap: u32 = num(args, "--cap-ticks", 288_000)?;
    let t = std::time::Instant::now();
    let samples = kernel::measure(&jobs, threads, cap)?;
    eprintln!("kernel: {} samples in {:.1}s", samples.len(), t.elapsed().as_secs_f64());
    std::fs::write(arg(args, "--out").ok_or("--out")?, serde_json::to_string(&samples).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

fn cmd_densify(args: &[String]) -> Result<(), String> {
    worker_setup()?;
    let lib = PathBuf::from(arg(args, "--library").ok_or("--library")?);
    let out = PathBuf::from(arg(args, "--out").ok_or("--out")?);
    let seeds: Vec<u64> = arg(args, "--seeds").unwrap_or("1,2,3").split(',').map(|s| s.parse().map_err(|_| "--seeds")).collect::<Result<_, _>>()?;
    let days: u32 = num(args, "--days", 1)?;
    let bot = arg(args, "--bot").ok_or("--bot")?;
    let n = library::densify(&lib, &out, bot, &seeds, days)?;
    eprintln!("densify {bot}: {n} camps");
    Ok(())
}

/// Runs this executable as a worker under `profile` (balance JSON text).
fn spawn(profile: &str, from: &fit::Structure, args: &[&str]) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let status = std::process::Command::new(exe)
        .args(args)
        .env("IDLEVER_BALANCE_JSON", profile)
        .env("PACE_FROM_STRETCH", from.stretch.to_string())
        .env("PACE_FROM_LAPS", if from.laps { "1" } else { "0" })
        .env_remove("IDLEVER_BALANCE_FILE")
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("worker {:?} failed", args.first()));
    }
    Ok(())
}

fn parse_profile(text: &str) -> Result<(idlever_core::balance::Balance, serde_json::Value), String> {
    let b = idlever_core::balance::parse(text)?;
    let v = serde_json::to_value(&b).map_err(|e| e.to_string())?;
    Ok((b, v))
}

fn cmd_calibrate(args: &[String]) -> Result<(), String> {
    let t0 = std::time::Instant::now();
    let out = PathBuf::from(arg(args, "--out").unwrap_or("target/pace-model"));
    std::fs::create_dir_all(&out).map_err(|e| e.to_string())?;
    let profile_path = arg(args, "--profile").unwrap_or("tuning/balance.json");
    let profile_text = read(Path::new(profile_path))?;
    let (bal, value) = parse_profile(&profile_text)?;
    let st = fit::Structure::of(&bal);
    let threads: usize = num(args, "--threads", 16)?;
    let seeds = arg(args, "--seeds").unwrap_or("1,2,3").to_string();
    let bots: Vec<String> = arg(args, "--bots").unwrap_or("IDLE,PICKED").split(',').map(String::from).collect();
    let reps: u32 = num(args, "--reps", 6)?;
    let wall_reps: u32 = num(args, "--wall-reps", 10)?;
    let lib = match arg(args, "--library") {
        Some(l) => PathBuf::from(l),
        None => {
            // the library: the ordinary dayplayer's check-in camps under the calibration profile
            let lib = out.join("library");
            std::fs::create_dir_all(&lib).map_err(|e| e.to_string())?;
            let probe = std::env::current_exe().map_err(|e| e.to_string())?.with_file_name("stat_probe");
            if !probe.exists() {
                return Err(format!("{} missing: cargo build --profile fast -p idlever-core --features dev-balance --example stat_probe (or pass --library)", probe.display()));
            }
            let obs = out.join(format!("library-obs-{}.json", std::process::id()));
            eprintln!("calibrate: playing the library fortnights ({seeds} × {})", bots.join(","));
            let status = std::process::Command::new(probe)
                .args(["--seeds", &seeds, "--bots", &bots.join(","), "--days", "14", "--threads", &threads.min(seeds.split(',').count() * bots.len()).to_string(), "--out"])
                .arg(&obs)
                .env("IDLEVER_BALANCE_JSON", &profile_text)
                .env("DP_SAVE_DIR", &lib)
                .status()
                .map_err(|e| e.to_string())?;
            if !status.success() {
                return Err("stat_probe failed".into());
            }
            lib
        }
    };
    let dense = out.join("dense");
    let seed_list: Vec<u64> = seeds.split(',').map(|s| s.parse().map_err(|_| "--seeds")).collect::<Result<_, _>>()?;
    let mut bms = Vec::new();
    let mut all_samples = Vec::new();
    for bot in &bots {
        if !dense.join(format!(".{bot}.done")).exists() {
            spawn(&profile_text, &st, &["densify", "--library", &lib.to_string_lossy(), "--out", &dense.to_string_lossy(), "--bot", bot, "--seeds", &seeds, "--days", "1"])?;
            std::fs::write(dense.join(format!(".{bot}.done")), "").map_err(|e| e.to_string())?;
        }
        let states: Vec<_> = library::scan(&[&lib, &dense], bot, &st)?.into_iter().filter(|s| seed_list.contains(&s.seed)).collect();
        if states.is_empty() {
            return Err(format!("no {bot} states in {}", lib.display()));
        }
        let jobs = library::calibration_jobs(&states, &st, reps, wall_reps);
        let jobs_path = out.join(format!("jobs-{bot}.json"));
        let samples_path = out.join(format!("samples-{bot}.json"));
        std::fs::write(&jobs_path, serde_json::to_string(&jobs).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        if !samples_path.exists() {
            eprintln!("calibrate: {bot}: {} states, {} jobs, {} sends", states.len(), jobs.len(), jobs.iter().map(|j| j.reps).sum::<u32>());
            spawn(&profile_text, &st, &["kernel", "--jobs", &jobs_path.to_string_lossy(), "--out", &samples_path.to_string_lossy(), "--threads", &threads.to_string()])?;
        }
        let samples: Vec<kernel::Sample> = serde_json::from_str(&read(&samples_path)?).map_err(|e| e.to_string())?;
        let bm = report::fit_bot(bot, &states, &samples, &st, None)?;
        all_samples.push((bot.clone(), samples_path.to_string_lossy().to_string()));
        bms.push(bm);
    }
    let m = model::Model { schema: 1, calib_profile: value, structure: st, bots: bms, samples: serde_json::to_string(&all_samples).unwrap_or_default(), library: lib.to_string_lossy().into() };
    let path = out.join("model.json");
    std::fs::write(&path, serde_json::to_string_pretty(&m).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    eprintln!("calibrate: {} in {:.0}s", path.display(), t0.elapsed().as_secs_f64());
    for b in &m.bots {
        report::print_bot_fit(b);
    }
    Ok(())
}

fn load_model(args: &[String]) -> Result<(model::Model, PathBuf), String> {
    let path = PathBuf::from(arg(args, "--model").unwrap_or("target/pace-model/model.json"));
    let m: model::Model = serde_json::from_str(&read(&path)?).map_err(|e| format!("{}: {e}", path.display()))?;
    Ok((m, path))
}

/// The model for a profile: the calibration's own kernel when the profile differs only in Layer 2's fields, else a
/// measured refit (cached by the profile's kernel fields).
fn model_for(m: &model::Model, model_path: &Path, profile_text: &str, threads: usize, quiet: bool) -> Result<(Vec<model::BotModel>, model::Meta, fit::Structure, Vec<String>), String> {
    let (bal, value) = parse_profile(profile_text)?;
    let st = fit::Structure::of(&bal);
    let meta = model::Meta::of(&bal);
    let mut notes: Vec<String> = model::unmodeled_diff(&value, &m.calib_profile).into_iter().map(|k| format!("`{k}` differs from the calibration: not modeled")).collect();
    if model::strip_meta(&value) == model::strip_meta(&m.calib_profile) {
        return Ok((m.bots.clone(), meta, st, notes));
    }
    let key = format!("{:016x}", idlever_core::rng::hash_str(&model::strip_meta(&value).to_string()));
    let dir = model_path.parent().unwrap_or(Path::new(".")).join("profiles").join(&key);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let paired_ok = st == m.structure;
    let cal_text = m.calib_profile.to_string();
    let mut bots = Vec::new();
    for bm in &m.bots {
        let jobs = library::profile_jobs(&bm.states, &st, 3, 4);
        let jobs_text = serde_json::to_string(&jobs).map_err(|e| e.to_string())?;
        let measure = |text: &str, out: &Path, what: &str| -> Result<Vec<kernel::Sample>, String> {
            if !out.exists() {
                let jobs_path = out.with_extension("jobs.json");
                std::fs::write(&jobs_path, &jobs_text).map_err(|e| e.to_string())?;
                if !quiet {
                    eprintln!("predict: {}: measuring {} sends under {what}", bm.bot, jobs.iter().map(|j| j.reps).sum::<u32>());
                }
                spawn(text, &m.structure, &["kernel", "--jobs", &jobs_path.to_string_lossy(), "--out", &out.to_string_lossy(), "--threads", &threads.to_string()])?;
            }
            serde_json::from_str(&read(out)?).map_err(|e| e.to_string())
        };
        let samples = measure(profile_text, &dir.join(format!("samples-{}.json", bm.bot)), "the profile")?;
        let refit = report::fit_bot(&bm.bot, &bm.states, &samples, &st, Some(bm))?;
        if paired_ok {
            // common random numbers: the same sends under the calibration profile, refit the same way; the
            // profile's model is the calibration plus the difference of the two refits
            let paired_dir = model_path.parent().unwrap_or(Path::new(".")).join("paired");
            std::fs::create_dir_all(&paired_dir).map_err(|e| e.to_string())?;
            let jh = format!("{:016x}", idlever_core::rng::hash_str(&jobs_text));
            let cal = measure(&cal_text, &paired_dir.join(format!("samples-{}-{jh}.json", bm.bot)), "the calibration (paired, once)")?;
            let base = report::fit_bot(&bm.bot, &bm.states, &cal, &st, Some(bm))?;
            bots.push(report::apply_delta(bm, &refit, &base));
        } else {
            bots.push(refit);
        }
    }
    notes.push(format!("kernel measured under the profile ({key})"));
    Ok((bots, meta, st, notes))
}

fn cmd_predict(args: &[String]) -> Result<(), String> {
    let t0 = std::time::Instant::now();
    let (m, mp) = load_model(args)?;
    let profile = read(Path::new(arg(args, "--profile").ok_or("--profile")?))?;
    let threads: usize = num(args, "--threads", 16)?;
    let replicas: usize = num(args, "--replicas", 96)?;
    let (bots, meta, st, notes) = model_for(&m, &mp, &profile, threads, false)?;
    let p = report::predict(&bots, &meta, &st, replicas);
    report::print_prediction(&p, &notes);
    if let Some(o) = arg(args, "--json") {
        std::fs::write(o, serde_json::to_string_pretty(&p).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    }
    eprintln!("predict: {:.1}s", t0.elapsed().as_secs_f64());
    Ok(())
}

fn cmd_validate(args: &[String]) -> Result<(), String> {
    let (m, mp) = load_model(args)?;
    let profile = read(Path::new(arg(args, "--profile").ok_or("--profile")?))?;
    let threads: usize = num(args, "--threads", 16)?;
    let replicas: usize = num(args, "--replicas", 96)?;
    let t0 = std::time::Instant::now();
    let (bots, meta, st, notes) = model_for(&m, &mp, &profile, threads, false)?;
    let p = report::predict(&bots, &meta, &st, replicas);
    let secs = t0.elapsed().as_secs_f64();
    let truth = report::truth(Path::new(arg(args, "--truth").ok_or("--truth")?), &st)?;
    report::print_validation(&p, &truth, &notes, secs);
    if let Some(o) = arg(args, "--json") {
        std::fs::write(o, serde_json::to_string_pretty(&serde_json::json!({"prediction": p, "truth": truth, "seconds": secs})).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn cmd_search(args: &[String]) -> Result<(), String> {
    let (m, mp) = load_model(args)?;
    let base_text = read(Path::new(arg(args, "--base").unwrap_or("tuning/balance.json")))?;
    let grid: serde_json::Value = serde_json::from_str(&read(Path::new(arg(args, "--grid").ok_or("--grid")?))?).map_err(|e| e.to_string())?;
    let claims = match arg(args, "--claims") {
        Some(p) => report::claims_of(&serde_json::from_str(&read(Path::new(p))?).map_err(|e| e.to_string())?)?,
        None => report::default_claims(),
    };
    let threads: usize = num(args, "--threads", 16)?;
    let replicas: usize = num(args, "--replicas", 96)?;
    let top: usize = num(args, "--top", 10)?;
    let candidates = report::expand_grid(&base_text, &grid)?;
    eprintln!("search: {} candidates", candidates.len());
    let mut ranked = Vec::new();
    for (name, text) in candidates {
        let t = std::time::Instant::now();
        let (bots, meta, st, notes) = model_for(&m, &mp, &text, threads, true)?;
        let p = report::predict(&bots, &meta, &st, replicas);
        let (worst, margins) = report::margins(&p, &claims);
        eprintln!("  {name}: worst margin {worst:+.3} ({:.1}s){}", t.elapsed().as_secs_f64(), if notes.is_empty() { String::new() } else { format!(" · {}", notes.join("; ")) });
        ranked.push((worst, name, margins));
    }
    ranked.sort_by(|a, b| b.0.total_cmp(&a.0));
    println!("| rank | candidate | worst normalized margin | {} |", claims.iter().map(|c| c.id.clone()).collect::<Vec<_>>().join(" | "));
    println!("|---|---|---:|{}", "---:|".repeat(claims.len()));
    for (i, (w, name, ms)) in ranked.iter().take(top).enumerate() {
        println!("| {} | {name} | {w:+.3} | {} |", i + 1, ms.iter().map(|(est, _)| format!("{est:.2}")).collect::<Vec<_>>().join(" | "));
    }
    Ok(())
}
