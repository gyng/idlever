//! Cut280: raw observations, with the ordinary policy and explicit bounded horizons.
use super::{Ask, Bot, Cfg, Play, SeedOut, MILESTONES, SYSTEMS};
use serde::Serialize;
use std::{
    collections::BTreeSet,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
    time::Instant,
};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
struct Request {
    #[serde(serialize_with = "seed_strings")]
    seeds: Vec<u64>,
    bots: Vec<String>,
    days: usize,
    until_depth: Option<u32>,
    checkins_per_day: u64,
}
struct Options {
    request: Request,
    threads: usize,
    out: PathBuf,
}

#[derive(Serialize)]
struct Observation {
    #[serde(serialize_with = "seed_string")]
    seed: u64,
    bot: String,
    stop_reason: &'static str,
    completed_days: usize,
    campaign_complete: bool,
    effective_checkins_per_day: u64,
    observed_hours: f64,
    best_depth: u32,
    /// First ordinary check-in reaching the requested depth; null means right-censored at this horizon.
    depth_reached_hours: Option<f64>,
    /// Wall-clock diagnostic only; never used in a gameplay comparison or deterministic digest.
    elapsed_seconds: f64,
    seed_out: SeedOut,
}
#[derive(Serialize)]
struct Export {
    schema: u32,
    kind: &'static str,
    milestones: [u32; 7],
    request: Request,
    balance: idlever_core::balance::Balance,
    records: Vec<Observation>,
}

fn seed_string<S: serde::Serializer>(seed: &u64, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&seed.to_string())
}
fn seed_strings<S: serde::Serializer>(seeds: &[u64], serializer: S) -> Result<S::Ok, S::Error> {
    serializer.collect_seq(seeds.iter().map(u64::to_string))
}

fn configurations() -> Vec<Cfg> {
    [
        Bot::Idle,
        Bot::Picked,
        Bot::Tuned,
        Bot::Random,
        Bot::Hands,
        Bot::Idle30,
        Bot::Daily,
        Bot::Away,
        Bot::PickedL,
    ]
    .into_iter()
    .map(|bot| Cfg { bot, without: None })
    .chain(
        [Bot::Picked, Bot::Daily, Bot::Away]
            .into_iter()
            .map(|bot| Cfg {
                bot,
                without: Some("nodes"),
            }),
    )
    .chain(SYSTEMS.iter().map(|system| Cfg {
        bot: Bot::Tuned,
        without: Some(system),
    }))
    .collect()
}
fn config(label: &str) -> Result<Cfg, String> {
    configurations()
        .into_iter()
        .find(|c| c.label().eq_ignore_ascii_case(label))
        .ok_or_else(|| {
            format!(
                "unknown bot `{label}`; expected {}",
                configurations()
                    .iter()
                    .map(Cfg::label)
                    .collect::<Vec<_>>()
                    .join(",")
            )
        })
}
fn number<T: std::str::FromStr>(value: &str, flag: &str) -> Result<T, String> {
    value
        .parse()
        .map_err(|_| format!("invalid {flag}: `{value}`"))
}
fn parse(args: &[String]) -> Result<Options, String> {
    let mut values = std::collections::BTreeMap::new();
    let mut i = 0;
    while i < args.len() {
        let flag = &args[i];
        if ![
            "--seeds",
            "--bots",
            "--days",
            "--until-depth",
            "--threads",
            "--checkins",
            "--out",
        ]
        .contains(&flag.as_str())
        {
            return Err(format!("unknown argument `{flag}`"));
        }
        let value = args
            .get(i + 1)
            .filter(|v| !v.starts_with("--"))
            .ok_or_else(|| format!("{flag} requires a value"))?;
        if values.insert(flag.as_str(), value.as_str()).is_some() {
            return Err(format!("duplicate argument {flag}"));
        }
        i += 2;
    }
    let required = |flag| {
        values
            .get(flag)
            .copied()
            .ok_or_else(|| format!("missing {flag}"))
    };
    let mut seeds = BTreeSet::new();
    for seed in required("--seeds")?.split(',') {
        let seed: u64 = number(seed.trim(), "--seeds")?;
        if !seeds.insert(seed) {
            return Err(format!("duplicate seed {seed}"));
        }
    }
    let mut bots = BTreeSet::new();
    for bot in required("--bots")?.split(',') {
        let label = config(bot.trim())?.label();
        if !bots.insert(label.clone()) {
            return Err(format!("duplicate bot {label}"));
        }
    }
    let days: usize = number(required("--days")?, "--days")?;
    let threads: usize = number(values.get("--threads").copied().unwrap_or("1"), "--threads")?;
    let checkins: u64 = number(
        values.get("--checkins").copied().unwrap_or("3"),
        "--checkins",
    )?;
    let until_depth = values
        .get("--until-depth")
        .map(|s| number::<u32>(s, "--until-depth"))
        .transpose()?;
    if days == 0 || threads == 0 || checkins == 0 || checkins > 86_400 {
        return Err(
            "days/threads/checkins must be positive; checkins must not exceed 86400".into(),
        );
    }
    if until_depth.is_some_and(|d| !MILESTONES.contains(&d)) {
        return Err(format!("--until-depth must be one of {MILESTONES:?}"));
    }
    if u64::try_from(days)
        .ok()
        .and_then(|d| d.checked_mul(86_400))
        .is_none()
    {
        return Err("--days exceeds the supported clock".into());
    }
    Ok(Options {
        request: Request {
            seeds: seeds.into_iter().collect(),
            bots: bots.into_iter().collect(),
            days,
            until_depth,
            checkins_per_day: checkins,
        },
        threads,
        out: PathBuf::from(required("--out")?),
    })
}

fn simulate(seed: u64, cfg: Cfg, request: &Request) -> Observation {
    let start = Instant::now();
    let mut p = Play::new(
        seed,
        request.days,
        request.checkins_per_day,
        false,
        &Ask::new(&cfg),
    );
    let mut reached = None;
    while !p.done() {
        p.step(&Ask::new(&cfg));
        if request
            .until_depth
            .is_some_and(|d| p.g.lineage.best_depth >= d)
        {
            reached = Some((p.k * p.interval) as f64 / 3600.0);
            break;
        }
    }
    Observation {
        seed,
        bot: cfg.label(),
        stop_reason: if reached.is_some() {
            "depth"
        } else {
            "horizon"
        },
        completed_days: p.day,
        campaign_complete: p.done(),
        effective_checkins_per_day: p.checkins,
        observed_hours: (p.k * p.interval) as f64 / 3600.0,
        best_depth: p.g.lineage.best_depth,
        depth_reached_hours: reached,
        elapsed_seconds: start.elapsed().as_secs_f64(),
        seed_out: p.out,
    }
}
fn observations(request: &Request, threads: usize) -> Vec<Observation> {
    let jobs: Vec<_> = request
        .bots
        .iter()
        .flat_map(|label| {
            request
                .seeds
                .iter()
                .map(move |seed| (*seed, config(label).expect("validated configuration")))
        })
        .collect();
    let next = AtomicUsize::new(0);
    // Include queued trajectories in the divisor: a new worker must never borrow
    // capacity still reserved for a trajectory that has not started. As jobs end,
    // widen forecast panels using the same mechanism as the ordinary dayplayer.
    let remaining = Mutex::new(jobs.len());
    let width = &super::WIDTH;
    width.store((threads / jobs.len().max(1)).max(1), Ordering::Relaxed);
    let records = Mutex::new(Vec::with_capacity(jobs.len()));
    std::thread::scope(|scope| {
        for _ in 0..threads.min(jobs.len()) {
            let (next, records, jobs, remaining) = (&next, &records, &jobs, &remaining);
            scope.spawn(move || loop {
                let index = next.fetch_add(1, Ordering::Relaxed);
                let Some((seed, cfg)) = jobs.get(index) else {
                    break;
                };
                let record = idlever_core::forecast::with_sim_width(width, || {
                    simulate(*seed, *cfg, request)
                });
                {
                    let mut left = remaining.lock().expect("remaining trajectories lock");
                    *left -= 1;
                    width.store((threads / (*left).max(1)).max(1), Ordering::Relaxed);
                }
                eprintln!(
                    "stat_probe {} seed {} {} at {:.1}h D{} ({:.3}s)",
                    record.bot,
                    record.seed,
                    record.stop_reason,
                    record.observed_hours,
                    record.best_depth,
                    record.elapsed_seconds
                );
                records.lock().expect("observation lock").push(record);
            });
        }
    });
    let mut records = records.into_inner().expect("completed observations");
    records.sort_by(|a, b| a.bot.cmp(&b.bot).then(a.seed.cmp(&b.seed)));
    records
}

/// Publish a complete document atomically without ever replacing an existing immutable output.
fn publish(path: &Path, value: &impl Serialize) -> Result<(), String> {
    use std::io::Write;
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    let tmp = path.with_file_name(format!(
        ".{}.{}.tmp",
        path.file_name()
            .ok_or("output needs a filename")?
            .to_string_lossy(),
        std::process::id()
    ));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&tmp)
        .map_err(|e| format!("{}: {e}", tmp.display()))?;
    let result = (|| {
        file.write_all(&bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        std::fs::hard_link(&tmp, path).map_err(|e| format!("{}: {e}", path.display()))
    })();
    drop(file);
    let _ = std::fs::remove_file(tmp);
    result
}

pub(super) fn run() -> Result<(), String> {
    let options = parse(&std::env::args().skip(1).collect::<Vec<_>>())?;
    for flag in [
        "DP_SESSION_ONLY",
        "DP_CAUSAL_START_FORGE",
        "DP_WATCH_FOLD",
        "DP_OFF",
        "DP_STALLS",
        "IDLEVER_SKIP_TWIST",
    ] {
        if std::env::var_os(flag).is_some() {
            return Err(format!(
                "{flag} changes ordinary policy; unset it for statistical observations"
            ));
        }
    }
    if options.out.exists() {
        return Err(format!(
            "{} already exists; observations are immutable",
            options.out.display()
        ));
    }
    idlever_core::balance::configure_from_env()?;
    idlever_core::engine::set_capsules(false);
    idlever_core::forecast::set_parallel_sims(false);
    let records = observations(&options.request, options.threads);
    let export = Export {
        schema: 1,
        kind: "dayplayer-stat-probe",
        milestones: MILESTONES,
        request: options.request,
        balance: idlever_core::balance::get().clone(),
        records,
    };
    publish(&options.out, &export)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(seeds: Vec<u64>, bots: &[&str], until_depth: Option<u32>) -> Request {
        Request {
            seeds,
            bots: bots.iter().map(|s| s.to_string()).collect(),
            days: 1,
            until_depth,
            checkins_per_day: 3,
        }
    }
    fn gameplay(record: &Observation) -> serde_json::Value {
        let mut value = serde_json::to_value(record).unwrap();
        value.as_object_mut().unwrap().remove("elapsed_seconds");
        value
    }
    fn prepare() {
        idlever_core::engine::set_capsules(false);
        idlever_core::forecast::set_parallel_sims(false);
    }
    #[test]
    fn exporter_matches_the_actual_ordinary_play_and_scout_protocol() {
        prepare();
        let request = request(vec![1], &["IDLE"], None);
        let cfg = config("IDLE").unwrap();
        let observed = simulate(1, cfg, &request);
        let canonical = super::super::play(1, 1, 3, cfg, false);
        assert_eq!(
            serde_json::to_value(&observed.seed_out).unwrap(),
            serde_json::to_value(canonical).unwrap()
        );
        // Full SeedOut parity includes actual manual-send counts; historical two-send wording is not a new product assertion.
        assert!(observed.seed_out.scout_min.is_some());
        assert!(observed.campaign_complete);
        assert_eq!(observed.completed_days, 1);
        assert_eq!(observed.observed_hours, 24.0);
        assert_eq!(observed.seed_out.best_day.len(), 1);
    }
    #[test]
    fn depth_stop_is_the_same_checkin_prefix_and_does_not_invent_daily_observations() {
        prepare();
        let request = request(vec![1001], &["PICKED"], Some(8));
        let cfg = config("PICKED").unwrap();
        let observed = simulate(1001, cfg, &request);
        let mut canonical = Play::new(1001, 1, 3, false, &Ask::new(&cfg));
        while !canonical.done() && canonical.g.lineage.best_depth < 8 {
            canonical.step(&Ask::new(&cfg));
        }
        assert_eq!(
            serde_json::to_value(&observed.seed_out).unwrap(),
            serde_json::to_value(&canonical.out).unwrap()
        );
        assert_eq!(observed.best_depth, canonical.g.lineage.best_depth);
        assert_eq!(observed.completed_days, canonical.day);
        assert_eq!(observed.campaign_complete, canonical.done());
        assert_eq!(observed.seed_out.best_day.len(), observed.completed_days);
        assert_eq!(observed.seed_out.gold_day.len(), observed.completed_days);
        assert_eq!(
            observed.depth_reached_hours,
            Some((canonical.k * canonical.interval) as f64 / 3600.0)
        );
        assert_eq!(observed.stop_reason, "depth");
    }
    #[test]
    fn arbitrary_seed_observations_are_thread_deterministic() {
        prepare();
        let request = request(vec![1, u64::MAX], &["IDLE", "RANDOM"], Some(8));
        let single = observations(&request, 1);
        let parallel = observations(&request, 3);
        assert_eq!(
            single.iter().map(gameplay).collect::<Vec<_>>(),
            parallel.iter().map(gameplay).collect::<Vec<_>>()
        );
        let mut first_history = serde_json::to_value(&single[0].seed_out).unwrap();
        let mut holdout_history = serde_json::to_value(&single[1].seed_out).unwrap();
        first_history.as_object_mut().unwrap().remove("seed");
        holdout_history.as_object_mut().unwrap().remove("seed");
        assert_ne!(
            first_history, holdout_history,
            "the holdout produces a distinct actual game history, beyond its seed metadata"
        );
        assert_eq!(single[1].seed_out.seed, u64::MAX);
    }
    #[test]
    fn explicit_configuration_and_full_width_seed_parsing_are_strict() {
        let args = |tail: &[&str]| {
            [
                "--seeds",
                "18446744073709551615,0",
                "--bots",
                "picked-nodes,AWAY,TUNED-pets",
                "--days",
                "1",
                "--out",
                "out.json",
            ]
            .into_iter()
            .chain(tail.iter().copied())
            .map(String::from)
            .collect::<Vec<_>>()
        };
        let options = parse(&args(&["--until-depth", "13"])).unwrap();
        assert_eq!(options.request.seeds, [0, u64::MAX]);
        let serialized = serde_json::to_value(&options.request).unwrap();
        assert_eq!(
            serialized["seeds"],
            serde_json::json!(["0", "18446744073709551615"])
        );
        assert_eq!(options.request.bots, ["AWAY", "PICKED-nodes", "TUNED-pets"]);
        let picked = config("PICKED-nodes").unwrap();
        assert_eq!(picked.bot, Bot::Picked);
        assert!(!picked.has("nodes"));
        assert!(picked.has("forge"));
        assert_eq!(
            super::super::answer(&config("AWAY").unwrap(), super::super::Q::Cadence),
            2
        );
        for invalid in [
            &["--until-depth", "12"][..],
            &["--threads", "0"],
            &["--checkins", "0"],
            &["--days", "2"],
            &["--unknown", "yes"],
        ] {
            assert!(parse(&args(invalid)).is_err(), "reject {invalid:?}");
        }
        assert!(config("IDLE-forge").is_err());
        assert!(
            config("PICKED+H").is_err(),
            "a diagnostic policy is never an ordinary bot"
        );
    }
    #[test]
    fn publishing_never_replaces_an_existing_observation() {
        let dir = std::env::temp_dir().join(format!("idlever-stat-publish-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("immutable.json");
        publish(&path, &serde_json::json!({"seed":"18446744073709551615"})).unwrap();
        let original = std::fs::read(&path).unwrap();
        assert!(publish(&path, &serde_json::json!({"changed":true})).is_err());
        assert_eq!(std::fs::read(&path).unwrap(), original);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
