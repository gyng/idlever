//! Fitting a bot's model from its samples; predictions, the truth they are checked against, claims and the grid.
use super::fit::{self, Hazard, Structure};
use super::kernel::Sample;
use super::meta::{self, MILESTONES};
use super::model::{BotModel, Init, Meta, StateRec};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::Path;

/// Horizon of a prediction (the dayplayer fortnight) and its check-ins a day.
pub const DAYS: usize = 14;
pub const CHECKINS: u64 = 3;
/// An unreached milestone's imputed hours (horizon plus one check-in, as the statistical study does).
pub fn censor_h() -> f64 { (DAYS as f64) * 24.0 + 24.0 / CHECKINS as f64 }

pub fn fit_bot(bot: &str, states: &[StateRec], samples: &[Sample], st: &Structure, prior: Option<&BotModel>) -> Result<BotModel, String> {
    // calibration: the measured states; a refit keeps the calibration's library (unmeasured states keep their prior)
    let states: Vec<StateRec> = match prior {
        Some(p) => p.states.clone(),
        None => states.iter().filter(|s| samples.iter().any(|x| x.state == s.path)).cloned().collect(),
    };
    let index: BTreeMap<String, usize> = states.iter().enumerate().map(|(i, s)| (s.path.clone(), i)).collect();
    let mut base_level: BTreeMap<String, u32> = states.iter().map(|s| (s.path.clone(), s.level)).collect();
    for x in samples.iter().filter(|x| x.variant.level.is_none()) {
        base_level.insert(x.state.clone(), x.level);
    }
    let rows = fit::rows(samples, st, &index, &base_level);
    let n = states.len();
    let th = match prior {
        None => {
            let pr = fit::default_prior(n, -8.0);
            let mut best: Option<(Vec<f64>, f64, f64)> = None;
            for g in [0.0, 0.25, 0.5, 0.75, 1.0] {
                let (th, ll) = fit::irls(&rows, n, &pr, &pr.mean, g);
                if best.as_ref().is_none_or(|b| ll > b.1) {
                    best = Some((th, ll, g));
                }
            }
            let (th, _, g) = best.unwrap();
            (th, g)
        }
        Some(p) => {
            let cal = p.hazard.to_vec();
            // stage 1: one shift of every state's power, the rest held at the calibration
            let hz = &p.hazard;
            let base: Vec<(f64, f64, f64)> = rows
                .iter()
                .map(|(k, (nr, y))| {
                    let w = if k.3 >= 0 { Some((k.3 as usize, k.4)) } else { None };
                    (hz.eta(hz.alpha[k.0] + hz.beta_l * f64::from(k.1), k.2, w), *nr, *y)
                })
                .collect();
            let mut shift = 0.0;
            for _ in 0..100 {
                let (mut g, mut h) = (0.0, 1e-3);
                for (eta, nr, y) in &base {
                    let pr = 1.0 / (1.0 + (-(eta + shift)).exp());
                    g += y - nr * pr;
                    h += nr * pr * (1.0 - pr);
                }
                let step = (g / h).clamp(-2.0, 2.0);
                shift += step;
                if step.abs() < 1e-7 {
                    break;
                }
            }
            // stage 2: everything refit around the shifted calibration
            let p_len = Hazard::len(n);
            let mut mean = cal.clone();
            for m in mean.iter_mut().take(n) {
                *m += shift;
            }
            let mut prec = vec![vec![0.0; p_len]; p_len];
            for (s, row) in prec.iter_mut().enumerate().take(n) {
                row[s] = 1.0 / 0.6f64.powi(2);
            }
            prec[n][n] = 100.0;
            let o = n + 1;
            for c in 0..fit::C {
                prec[o + c][o + c] += 1.0 / 1.5f64.powi(2);
            }
            fit::smooth(&mut prec, o, 4.0);
            for k in 0..2 * fit::NW {
                prec[o + fit::C + k][o + fit::C + k] += 1.0;
            }
            let pr = fit::Prior { mean: mean.clone(), prec };
            (fit::irls(&rows, n, &pr, &mean, p.hazard.gamma).0, p.hazard.gamma)
        }
    };
    let (th, gamma) = th;
    let hazard = Hazard::from_vec(&th, n, gamma);
    let aux = fit::aux(samples, st, prior.map(|p| &p.aux));
    let (walls, init, porter_h) = match prior {
        Some(p) => (p.walls.clone(), p.init.clone(), p.porter_h),
        None => {
            let mut count: BTreeMap<Vec<(u32, String)>, usize> = BTreeMap::new();
            for x in samples {
                *count.entry(x.walls.iter().map(|w| (w.0, w.1.clone())).collect()).or_default() += 1;
            }
            let walls = count.into_iter().max_by_key(|x| x.1).map(|x| x.0).unwrap_or_default();
            let mut init = Vec::new();
            let mut porter_hs = Vec::new();
            let seeds: std::collections::BTreeSet<u64> = states.iter().map(|s| s.seed).collect();
            for seed in seeds {
                let of: Vec<&StateRec> = states.iter().filter(|s| s.seed == seed).collect();
                let Some(c0) = of.iter().find(|s| s.day == 1 && s.ci == 0 && s.x == 0) else { continue };
                let c1 = of.iter().find(|s| s.day == 1 && s.ci == 1 && s.x == 0);
                let interval = 24 * 3600 / CHECKINS;
                let session_s = c1.map_or(0, |c1| interval.saturating_sub(c1.clock_s.saturating_sub(c0.clock_s)));
                init.push(Init { seed, session_s, best: c0.best, level: c0.level, xp: c0.xp, drills: c0.drills.clone(), porter: c0.porter });
                if !c0.porter {
                    if let Some(p) = of.iter().filter(|s| s.porter).min_by_key(|s| s.clock_s) {
                        porter_hs.push(p.clock_s as f64 / 3600.0);
                    }
                }
            }
            porter_hs.sort_by(f64::total_cmp);
            let porter_h = porter_hs.get(porter_hs.len() / 2).copied().unwrap_or(0.0);
            if init.is_empty() {
                return Err(format!("{bot}: no day-1 check-in camp (BOT-sSEED-d1-c0.json) in the library"));
            }
            (walls, init, porter_h)
        }
    };
    let mut bm = BotModel { bot: bot.into(), hazard, aux, states, curve: vec![], curve_pre: vec![], seed_curves: vec![], time_curves: vec![], index: prior.map_or_else(|| std::env::var(format!("PACE_INDEX_{bot}")).unwrap_or_else(|_| if bot == "IDLE" { "record".into() } else { "time".into() }), |p| p.index.clone()), walls, init, porter_h };
    bm.build_curves();
    Ok(bm)
}

pub fn print_bot_fit(b: &BotModel) {
    eprintln!("{}: γ {:.2} · β_L {:+.3} · states {} · porter at {:.1} h · inits {}", b.bot, b.hazard.gamma, b.hazard.beta_l, b.states.len(), b.porter_h, b.init.len());
    eprintln!("  ψ {:?}", b.hazard.psi.iter().map(|x| (x * 10.0).round() / 10.0).collect::<Vec<_>>());
    eprintln!("  ω {:?} δ {:?}", b.hazard.omega.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>(), b.hazard.delta.iter().map(|x| (x * 100.0).round() / 100.0).collect::<Vec<_>>());
    eprintln!("  α10(record) {:?}", b.curve.iter().map(|(c, a)| format!("D{c}:{a:.1}")).collect::<Vec<_>>());
    eprintln!("  τ {:?} · last {:?} · xp {:?} · wealth {:?} · return {:.2}", b.aux.tau.iter().map(|x| x.round()).collect::<Vec<_>>(), b.aux.last.map(|x| x.round()), b.aux.xp_k, b.aux.wealth, b.aux.p_return);
}

#[derive(Clone, Debug, Serialize)]
pub struct BotPrediction {
    pub bot: String,
    /// Median arrival hours by milestone (MILESTONES), the replicas' quartiles and the share unreached by the horizon.
    pub hours: Vec<f64>,
    pub q25: Vec<f64>,
    pub q75: Vec<f64>,
    pub censored: Vec<f64>,
    pub level_day: Vec<f64>,
    pub gold_day: Vec<f64>,
    pub best_day: Vec<f64>,
    pub sends_per_day: f64,
    #[serde(skip)]
    pub walls: Vec<(u32, String)>,
    #[serde(skip)]
    pub runs: Vec<meta::Run>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Prediction {
    pub milestones: Vec<u32>,
    pub bots: Vec<BotPrediction>,
}

fn quantile(v: &mut [f64], q: f64) -> f64 {
    if v.is_empty() {
        return f64::NAN;
    }
    v.sort_by(f64::total_cmp);
    let i = ((v.len() - 1) as f64 * q).round() as usize;
    v[i]
}

pub fn predict(bots: &[BotModel], meta: &Meta, st: &Structure, replicas: usize) -> Prediction {
    let mut out = Vec::new();
    for bm in bots {
        let runs: Vec<meta::Run> = (0..replicas)
            .map(|r| {
                let mut rng = idlever_core::rng::Rng::derive(0x9ACE_0000 + r as u64, 0x5EED);
                meta::simulate(bm, meta, st, r % bm.init.len(), DAYS, CHECKINS, &mut rng)
            })
            .collect();
        let col = |i: usize| -> Vec<f64> { runs.iter().map(|r| r.hours[i].unwrap_or(censor_h())).collect() };
        let hours = (0..MILESTONES.len()).map(|i| quantile(&mut col(i), 0.5)).collect();
        let q25 = (0..MILESTONES.len()).map(|i| quantile(&mut col(i), 0.25)).collect();
        let q75 = (0..MILESTONES.len()).map(|i| quantile(&mut col(i), 0.75)).collect();
        let censored = (0..MILESTONES.len()).map(|i| runs.iter().filter(|r| r.hours[i].is_none()).count() as f64 / runs.len() as f64).collect();
        let per_day = |f: &dyn Fn(&meta::Run, usize) -> f64| -> Vec<f64> { (0..DAYS).map(|d| quantile(&mut runs.iter().map(|r| f(r, d)).collect::<Vec<_>>(), 0.5)).collect() };
        let level_day = per_day(&|r, d| f64::from(r.level_day[d]));
        let gold_day = per_day(&|r, d| r.gold_day[d]);
        let best_day = per_day(&|r, d| f64::from(r.best_day[d]));
        let sends_per_day = runs.iter().map(|r| f64::from(r.sends)).sum::<f64>() / runs.len() as f64 / DAYS as f64;
        out.push(BotPrediction { bot: bm.bot.clone(), hours, q25, q75, censored, level_day, gold_day, best_day, sends_per_day, walls: bm.walls.clone(), runs });
    }
    Prediction { milestones: MILESTONES.to_vec(), bots: out }
}

fn fmt_h(h: f64) -> String { if h >= censor_h() { "—".into() } else { format!("{h:.0}") } }

pub fn print_prediction(p: &Prediction, notes: &[String]) {
    for n in notes {
        println!("note: {n}");
    }
    println!("| bot | {} | sends/day |", p.milestones.iter().map(|m| format!("D{m} h")).collect::<Vec<_>>().join(" | "));
    println!("|---|{}---:|", "---:|".repeat(p.milestones.len()));
    for b in &p.bots {
        println!("| {} | {} | {:.1} |", b.bot, b.hours.iter().zip(&b.q25).zip(&b.q75).map(|((h, a), z)| format!("{} [{}–{}]", fmt_h(*h), fmt_h(*a), fmt_h(*z))).collect::<Vec<_>>().join(" | "), b.sends_per_day);
    }
    for b in &p.bots {
        println!("{} level by day: {:?}", b.bot, b.level_day.iter().map(|x| *x as u32).collect::<Vec<_>>());
        println!("{} record (content) by day: {:?}", b.bot, b.best_day.iter().map(|x| *x as u32).collect::<Vec<_>>());
        println!("{} net gold day 2 {:.0} · day 10 {:.0} (send income; PICKED's purchases are not modeled)", b.bot, b.gold_day[1], b.gold_day[9]);
    }
    if let (Some(i), Some(k)) = (p.bots.iter().find(|b| b.bot == "IDLE"), p.bots.iter().find(|b| b.bot == "PICKED")) {
        for (j, m) in p.milestones.iter().enumerate() {
            if [13, 18, 23].contains(m) {
                println!("IDLE/PICKED at D{m}: {:.2}", ratio(i, k, j));
            }
        }
    }
}

/// The median over replica pairs of a per-pair hours ratio (the study's per-seed ratio).
pub fn ratio(num: &BotPrediction, den: &BotPrediction, i: usize) -> f64 {
    let mut v: Vec<f64> = num.runs.iter().zip(&den.runs).map(|(a, b)| a.hours[i].unwrap_or(censor_h()) / b.hours[i].unwrap_or(censor_h()).max(1e-9)).collect();
    quantile(&mut v, 0.5)
}

#[derive(Clone, Debug, Serialize)]
pub struct Truth {
    pub bot: String,
    pub seeds: usize,
    pub hours: Vec<f64>,
    pub censored: Vec<f64>,
    pub level_day: Vec<f64>,
    pub gold_day: Vec<f64>,
    pub best_day: Vec<f64>,
}

/// A stat_probe observation file (DIR/obs.json) and its DP_SAVE_DIR (DIR/saves) for class levels by day.
pub fn truth(dir: &Path, st: &Structure) -> Result<Vec<Truth>, String> {
    // every stat_probe file DIR/obs*.json (seeds may be split over several runs)
    let mut all = Vec::new();
    for e in std::fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with("obs") && name.ends_with(".json") {
            let v: Value = serde_json::from_str(&std::fs::read_to_string(e.path()).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            all.extend(v["records"].as_array().cloned().unwrap_or_default());
        }
    }
    let recs = &all;
    let mut out = Vec::new();
    let mut bots: Vec<String> = recs.iter().filter_map(|r| r["bot"].as_str().map(String::from)).collect();
    bots.dedup();
    bots.sort();
    bots.dedup();
    for bot in bots {
        let rs: Vec<&Value> = recs.iter().filter(|r| r["bot"].as_str() == Some(&bot)).collect();
        let col = |i: usize| -> Vec<f64> { rs.iter().map(|r| r["seed_out"]["hours"][i].as_f64().unwrap_or(censor_h())).collect() };
        let hours = (0..MILESTONES.len()).map(|i| quantile(&mut col(i), 0.5)).collect();
        let censored = (0..MILESTONES.len()).map(|i| rs.iter().filter(|r| r["seed_out"]["hours"][i].is_null()).count() as f64 / rs.len() as f64).collect();
        let gold_day = (0..DAYS).map(|d| quantile(&mut rs.iter().filter_map(|r| r["seed_out"]["gold_day"][d].as_f64()).collect::<Vec<_>>(), 0.5)).collect();
        let best_day = (0..DAYS).map(|d| quantile(&mut rs.iter().filter_map(|r| r["seed_out"]["best_day"][d].as_f64()).collect::<Vec<_>>(), 0.5)).collect();
        let mut level_day = Vec::new();
        for d in 0..DAYS {
            // the camp at the next day's first check-in is this day's end
            let mut lv = Vec::new();
            for r in &rs {
                let seed = r["seed"].as_str().unwrap_or("0");
                let p = dir.join("saves").join(format!("{bot}-s{seed}-d{}-c0.json", d + 2));
                if let Ok(t) = std::fs::read_to_string(&p) {
                    if let Ok(s) = super::library::features(&p, st).map(|f| (f, t)) {
                        lv.push(f64::from(s.0.level));
                    }
                }
            }
            level_day.push(quantile(&mut lv, 0.5));
        }
        out.push(Truth { bot, seeds: rs.len(), hours, censored, level_day, gold_day, best_day });
    }
    Ok(out)
}

pub fn print_validation(p: &Prediction, truth: &[Truth], notes: &[String], secs: f64) {
    for n in notes {
        println!("note: {n}");
    }
    println!("prediction {secs:.1}s");
    println!("| bot | milestone | predicted h [q25–q75] | simulated median h (seeds) | error h | error % |");
    println!("|---|---|---:|---:|---:|---:|");
    for t in truth {
        let Some(b) = p.bots.iter().find(|b| b.bot == t.bot) else { continue };
        for (i, m) in p.milestones.iter().enumerate() {
            let (ph, th) = (b.hours[i], t.hours[i]);
            let err = ph - th;
            let pct = if th > 0.0 && th < censor_h() { format!("{:+.0}%", 100.0 * err / th) } else { "".into() };
            println!("| {} | D{m} | {} [{}–{}] | {} ({}, {:.0}% unreached) | {:+.0} | {pct} |", t.bot, fmt_h(ph), fmt_h(b.q25[i]), fmt_h(b.q75[i]), fmt_h(th), t.seeds, 100.0 * t.censored[i], err);
        }
        println!("| {} | level by day (pred) | {:?} | | | |", t.bot, b.level_day.iter().map(|x| *x as u32).collect::<Vec<_>>());
        println!("| {} | level by day (sim) | {:?} | | | |", t.bot, t.level_day.iter().map(|x| if x.is_nan() { 0 } else { *x as u32 }).collect::<Vec<_>>());
        let mut dh: Vec<String> = Vec::new();
        for (_, boss) in &b.walls {
            let mut v: Vec<f64> = b.runs.iter().map(|r| r.drilled_h.iter().find(|x| x.0 == *boss).map_or(censor_h(), |x| x.1)).collect();
            dh.push(format!("{} {}", &boss[..boss.len().min(6)], fmt_h(quantile(&mut v, 0.5))));
        }
        println!("| {} | drilled at h (pred) | {} | | | |", t.bot, dh.join(", "));
        println!("| {} | net gold d2 / d10 | {:.0} / {:.0} | {:.0} / {:.0} | | |", t.bot, b.gold_day[1], b.gold_day[9], t.gold_day[1], t.gold_day[9]);
        println!("| {} | record by day (pred) | {:?} | | | |", t.bot, b.best_day.iter().map(|x| *x as u32).collect::<Vec<_>>());
        println!("| {} | record by day (sim) | {:?} | | | |", t.bot, t.best_day.iter().map(|x| *x as u32).collect::<Vec<_>>());
    }
}

#[derive(Clone, Debug)]
pub struct Claim {
    pub id: String,
    pub metric: Value,
    pub at_least: bool,
    pub threshold: f64,
    pub scale: f64,
}
pub fn claims_of(study: &Value) -> Result<Vec<Claim>, String> {
    let cs = study["claims"].as_array().ok_or("study has no claims")?;
    Ok(cs
        .iter()
        .map(|c| Claim {
            id: c["id"].as_str().unwrap_or("?").into(),
            metric: c["metric"].clone(),
            at_least: c["direction"].as_str() == Some("at-least"),
            threshold: c["threshold"].as_f64().unwrap_or(0.0),
            scale: c["rankingScale"].as_f64().unwrap_or(1.0),
        })
        .collect())
}
pub fn default_claims() -> Vec<Claim> {
    let study: Value = serde_json::from_str(include_str!("../../../../tuning/studies/cut317-adopt.json")).unwrap_or(Value::Null);
    claims_of(&study).unwrap_or_default()
}

/// A scalar metric per replica index (None: a bot or field the model does not predict).
fn metric(p: &Prediction, m: &Value, r: usize) -> Option<f64> {
    if let Some(pair) = m["ratio"].as_array() {
        return Some(metric(p, &pair[0], r)? / metric(p, &pair[1], r)?.max(1e-9));
    }
    let b = p.bots.iter().find(|b| Some(b.bot.as_str()) == m["bot"].as_str())?;
    let run = b.runs.get(r)?;
    match m["field"].as_str()? {
        "arrival_hours" => {
            let i = MILESTONES.iter().position(|x| Some(u64::from(*x)) == m["depth"].as_u64())?;
            Some(run.hours[i].unwrap_or(censor_h()))
        }
        "gold_day" => run.gold_day.get(m["day"].as_u64()? as usize - 1).copied(),
        "best_day" => run.best_day.get(m["day"].as_u64()? as usize - 1).map(|x| f64::from(*x)),
        _ => None,
    }
}

/// Each claim's predicted median and normalized margin (positive: passes), and the worst of them.
pub fn margins(p: &Prediction, claims: &[Claim]) -> (f64, Vec<(f64, f64)>) {
    let n = p.bots.iter().map(|b| b.runs.len()).min().unwrap_or(0);
    let mut worst = f64::INFINITY;
    let mut out = Vec::new();
    for c in claims {
        let mut v: Vec<f64> = (0..n).filter_map(|r| metric(p, &c.metric, r)).collect();
        if v.is_empty() {
            out.push((f64::NAN, f64::NAN));
            continue;
        }
        let est = quantile(&mut v, 0.5);
        let m = if c.at_least { est - c.threshold } else { c.threshold - est } / c.scale.max(1e-9);
        let m = m / if c.scale == 1.0 { c.threshold.abs().max(1.0) } else { 1.0 };
        worst = worst.min(m);
        out.push((est, m));
    }
    (worst, out)
}

fn set_path(v: &mut Value, path: &str, value: Value) -> Result<(), String> {
    let toks: Vec<String> = path.replace('[', ".").replace(']', "").split('.').filter(|t| !t.is_empty()).map(String::from).collect();
    let mut o = v;
    for (i, t) in toks.iter().enumerate() {
        let next = match t.parse::<usize>() {
            Ok(k) => o.get_mut(k),
            Err(_) => o.get_mut(t.as_str()),
        };
        let Some(next) = next else { return Err(format!("no {path} in the base profile")) };
        if i + 1 == toks.len() {
            *next = value;
            return Ok(());
        }
        o = next;
    }
    Err(format!("empty path {path}"))
}

/// tools/sweep.mjs's grid: {"grid": {path: [values]}} (Cartesian) and/or {"candidates": [{name?, set}]}.
pub fn expand_grid(base: &str, spec: &Value) -> Result<Vec<(String, String)>, String> {
    let base: Value = serde_json::from_str(base).map_err(|e| e.to_string())?;
    type Set = (Option<String>, Vec<(String, Value)>);
    let mut sets: Vec<Set> = Vec::new();
    if let Some(g) = spec["grid"].as_object() {
        let mut combos: Vec<Vec<(String, Value)>> = vec![vec![]];
        for (path, vals) in g {
            let vals = vals.as_array().ok_or_else(|| format!("grid {path} needs values"))?;
            combos = combos.into_iter().flat_map(|c| vals.iter().map(move |v| {
                let mut c = c.clone();
                c.push((path.clone(), v.clone()));
                c
            })).collect();
        }
        sets.extend(combos.into_iter().map(|c| (None, c)));
    }
    for c in spec["candidates"].as_array().into_iter().flatten() {
        let set = c["set"].as_object().map(|o| o.iter().map(|(k, v)| (k.clone(), v.clone())).collect()).unwrap_or_default();
        sets.push((c["name"].as_str().map(String::from), set));
    }
    let mut out = Vec::new();
    for (name, set) in sets {
        let mut p = base.clone();
        for (k, v) in &set {
            set_path(&mut p, k, v.clone())?;
        }
        let name = name.unwrap_or_else(|| if set.is_empty() { "base".into() } else { set.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join(",") });
        out.push((name, p.to_string()));
    }
    Ok(out)
}

/// `base` + (`p` − `c`): a paired difference of two refits applied to the calibration.
pub fn apply_delta(base: &BotModel, p: &BotModel, c: &BotModel) -> BotModel {
    let d = |b: &[f64], x: &[f64], y: &[f64]| -> Vec<f64> { b.iter().zip(x).zip(y).map(|((b, x), y)| b + x - y).collect() };
    let mut out = base.clone();
    let (h, hp, hc) = (&mut out.hazard, &p.hazard, &c.hazard);
    // the per-state and per-depth differences are noisy at a profile's few sends: only their linear trend in
    // content depth is applied (a shift and a slope of power and of depth difficulty)
    let line = |xs: &[f64], ys: &[f64]| -> (f64, f64) {
        let n = xs.len() as f64;
        let (mx, my) = (xs.iter().sum::<f64>() / n, ys.iter().sum::<f64>() / n);
        let sxx: f64 = xs.iter().map(|x| (x - mx).powi(2)).sum();
        let b = if sxx > 0.0 { xs.iter().zip(ys).map(|(x, y)| (x - mx) * (y - my)).sum::<f64>() / sxx } else { 0.0 };
        (my - b * mx, b)
    };
    let xs: Vec<f64> = base.states.iter().map(|s| f64::from(s.content)).collect();
    let ys: Vec<f64> = hp.alpha.iter().zip(&hc.alpha).map(|(x, y)| x - y).collect();
    let (a0, a1) = line(&xs, &ys);
    h.alpha = h.alpha.iter().zip(&xs).map(|(a, c)| a + a0 + a1 * c).collect();
    let cs: Vec<f64> = (1..=fit::C).map(|c| c as f64).collect();
    let ys: Vec<f64> = hp.psi.iter().zip(&hc.psi).map(|(x, y)| x - y).collect();
    let (p0, p1) = line(&cs, &ys);
    h.psi = h.psi.iter().zip(&cs).map(|(v, c)| v + p0 + p1 * c).collect();
    h.omega = d(&h.omega, &hp.omega, &hc.omega);
    h.delta = d(&h.delta, &hp.delta, &hc.delta);
    let a = &mut out.aux;
    a.tau = a.tau.iter().zip(&p.aux.tau).zip(&c.aux.tau).map(|((b, x), y)| b * x / y.max(1.0)).collect();
    for i in 0..3 {
        a.last[i] *= p.aux.last[i] / c.aux.last[i].max(1.0);
    }
    for i in 0..2 {
        a.xp_k[i] += p.aux.xp_k[i] - c.aux.xp_k[i];
        a.wealth[i] += p.aux.wealth[i] - c.aux.wealth[i];
    }
    a.pdeath = a.pdeath.iter().zip(&p.aux.pdeath).zip(&c.aux.pdeath).map(|((b, x), y)| (b + x - y).clamp(0.0, 1.0)).collect();
    a.p_return = (a.p_return + p.aux.p_return - c.aux.p_return).clamp(0.0, 1.0);
    out.build_curves();
    out
}
