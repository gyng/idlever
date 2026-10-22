//! The state library: dayplayer check-in saves (`DP_SAVE_DIR`, BOT-sSEED-dDAY-cCI.json), densified over the first
//! day (a camp after each send of an absence, where the porter's hire and the first levels move the kernel fast),
//! scanned into features; and the kernel jobs that measure them.
use super::fit::Structure;
use super::kernel::{Job, Variant};
use super::model::StateRec;
use serde_json::Value;
use std::path::Path;

pub fn parse_name(name: &str) -> Option<(String, u64, u32, u32, u32)> {
    let stem = name.strip_suffix(".json")?;
    let mut toks: Vec<&str> = stem.split('-').collect();
    let x = match toks.last()?.strip_prefix('x') {
        Some(n) => {
            let n = n.parse().ok()?;
            toks.pop();
            n
        }
        None => 0,
    };
    let ci = toks.pop()?.strip_prefix('c')?.parse().ok()?;
    let day = toks.pop()?.strip_prefix('d')?.parse().ok()?;
    let seed = toks.pop()?.strip_prefix('s')?.parse().ok()?;
    if toks.is_empty() {
        return None;
    }
    Some((toks.join("-"), seed, day, ci, x))
}

pub fn features(path: &Path, st: &Structure) -> Result<StateRec, String> {
    let name = path.file_name().and_then(|n| n.to_str()).ok_or("bad path")?;
    let (_, seed, day, ci, x) = parse_name(name).ok_or_else(|| format!("{name}: not BOT-sSEED-dDAY-cCI[-xN].json"))?;
    let v: Value = serde_json::from_str(&std::fs::read_to_string(path).map_err(|e| e.to_string())?).map_err(|e| format!("{name}: {e}"))?;
    let l = &v["lineage"];
    let class = l["class"].as_str().unwrap_or("fighter");
    let best = l["best_depth"].as_u64().unwrap_or(0) as u32;
    let level = l["classes"][class]["level"].as_u64().unwrap_or(1) as u32;
    let xp = l["classes"][class]["xp"].as_u64().unwrap_or(0) as u32;
    let drills = l["pkg"]["drills"].as_array().map(|a| a.iter().filter(|d| !d["revoked"].as_bool().unwrap_or(false)).filter_map(|d| d["boss"].as_str().map(String::from)).collect()).unwrap_or_default();
    let porter = l["tree"]["hired"].as_array().is_some_and(|a| a.iter().any(|h| h[0].as_str() == Some("porter")));
    Ok(StateRec {
        path: path.to_string_lossy().into(), seed, day, ci, x, best, content: st.reach(best), level, xp, porter, drills,
        clock_s: l["clock_s"].as_u64().unwrap_or(0),
    })
}

/// Every state of `bot` under `dirs`, in trajectory order.
pub fn scan(dirs: &[&Path], bot: &str, st: &Structure) -> Result<Vec<StateRec>, String> {
    let mut out = Vec::new();
    for d in dirs {
        let Ok(rd) = std::fs::read_dir(d) else { continue };
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if parse_name(&name).is_some_and(|p| p.0 == bot) {
                out.push(features(&e.path(), st)?);
            }
        }
    }
    out.sort_by_key(|s| (s.seed, s.day, s.ci, s.x));
    Ok(out)
}

/// Densify: play the absence after each first-day check-in again and keep the camp after each send. Runs under the
/// calibration profile (a worker process). The bot acts only at check-ins, so a camp between them is its own.
pub fn densify(dir: &Path, out: &Path, bot: &str, seeds: &[u64], days: u32) -> Result<usize, String> {
    std::fs::create_dir_all(out).map_err(|e| e.to_string())?;
    let mut n = 0;
    for &seed in seeds {
        for day in 1..=days {
            for ci in 0..3u32 {
                let path = dir.join(format!("{bot}-s{seed}-d{day}-c{ci}.json"));
                let next = if ci < 2 { dir.join(format!("{bot}-s{seed}-d{day}-c{}.json", ci + 1)) } else { dir.join(format!("{bot}-s{seed}-d{}-c0.json", day + 1)) };
                let (Ok(text), Ok(next_text)) = (std::fs::read_to_string(&path), std::fs::read_to_string(&next)) else { continue };
                let g0 = idlever_core::Game::load(&text)?;
                let clock_next = serde_json::from_str::<Value>(&next_text).map_err(|e| e.to_string())?["lineage"]["clock_s"].as_u64().unwrap_or(0);
                let budget = clock_next.saturating_sub(g0.lineage.clock_s);
                let mut g = g0;
                let exits = |g: &idlever_core::Game| g.lineage.runs_banked + g.lineage.runs_returned + g.lineage.runs_died;
                let mut seen = exits(&g);
                let mut x = 0;
                let mut t = 0;
                while t < budget {
                    let step = 60.min(budget - t);
                    let _ = idlever_core::offline::run_offline_slice(&mut g, step, false);
                    t += step;
                    let now = exits(&g);
                    if now > seen && g.run.as_ref().is_none_or(|r| r.over.is_some() || r.turn == 0) {
                        seen = now;
                        x += 1;
                        let mut c = g.clone();
                        let _ = idlever_core::offline::run_offline_slice(&mut c, 0, true);
                        std::fs::write(out.join(format!("{bot}-s{seed}-d{day}-c{ci}-x{x}.json")), c.save()).map_err(|e| e.to_string())?;
                        n += 1;
                    }
                }
            }
        }
    }
    Ok(n)
}

/// The wall floors (calibration structure: band bosses; the golem band's first floor) and the boss a drill answers.
fn wall_floors(st: &Structure) -> Vec<(u32, &'static str)> {
    let s = st.stretch;
    vec![(8 * s, "goblin_warlord"), (13 * s, "bloat_mother"), (18 * s, "lich"), (18 * s + 1, "foundry_master"), (23 * s, "foundry_master"), (28 * s, "lurker_queen"), (33 * s, "mirror_king")]
}

/// Calibration jobs: each distinct state (record content, drills, porter, level) measured as it stands, at class
/// level ±2 (the level's own effect), and at its next wall by splitting with and without that wall's drill.
pub fn calibration_jobs(states: &[StateRec], st: &Structure, reps: u32, wall_reps: u32) -> Vec<Job> {
    let mut jobs = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for s in states {
        let key = (s.seed, s.content, s.drills.clone(), s.porter, s.level.min(10));
        if !seen.insert(key) {
            continue;
        }
        jobs.push(Job { state: s.path.clone(), variant: Variant::default(), reps, rep0: 0, branch: None });
        if s.level < 10 {
            for l in [s.level.saturating_sub(2), s.level + 2] {
                if (1..=10).contains(&l) && l != s.level {
                    jobs.push(Job { state: s.path.clone(), variant: Variant { level: Some(l), ..Default::default() }, reps, rep0: 0, branch: None });
                }
            }
        }
        if !s.porter || s.best < 20 {
            continue;
        }
        if let Some((wf, b)) = wall_floors(st).into_iter().find(|(wf, _)| *wf + 2 >= s.best) {
            jobs.push(Job { state: s.path.clone(), variant: Variant::default(), reps: wall_reps, rep0: 100, branch: Some((wf, 4)) });
            let v = if s.drills.iter().any(|d| d == b) { Variant { drill_drop: vec![b.into()], ..Default::default() } } else { Variant { drill_add: vec![b.into()], ..Default::default() } };
            jobs.push(Job { state: s.path.clone(), variant: v, reps: wall_reps, rep0: 100, branch: Some((wf, 4)) });
        }
    }
    jobs
}

/// A profile's jobs: one state per record content (and porter), as it stands, plus its next wall split.
pub fn profile_jobs(states: &[StateRec], st: &Structure, reps: u32, wall_reps: u32) -> Vec<Job> {
    let mut jobs = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for s in states {
        if !seen.insert((s.content, s.porter, s.drills.len())) {
            continue;
        }
        jobs.push(Job { state: s.path.clone(), variant: Variant::default(), reps, rep0: 1000, branch: None });
        let best = s.content * st.stretch;
        if s.porter && best >= 20 {
            if let Some((wf, _)) = wall_floors(st).into_iter().find(|(wf, _)| *wf + 2 >= best) {
                jobs.push(Job { state: s.path.clone(), variant: Variant::default(), reps: wall_reps, rep0: 1100, branch: Some((wf, 3)) });
            }
        }
    }
    jobs
}
