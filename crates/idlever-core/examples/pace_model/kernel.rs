//! Layer 1 measurement: one expedition at a time from a frozen camp state (a dayplayer check-in save), under the
//! process's balance profile. Each sample clones the state, varies the run seed, plays exactly one send through the
//! ordinary offline path in 5-second slices (floor arrival ticks observed between slices), and settles the absence.
use idlever_core::Game;
use serde::{Deserialize, Serialize};
use std::sync::{atomic::{AtomicUsize, Ordering}, Mutex};

/// A counterfactual variant of a library state: the class level set, a boss's drill added or revoked.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Variant {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level: Option<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub drill_add: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub drill_drop: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Job {
    pub state: String,
    pub variant: Variant,
    pub reps: u32,
    /// The first rep's index (a resumed or widened measurement draws new seeds).
    #[serde(default)]
    pub rep0: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub branch: Option<(u32, u32)>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Sample {
    pub state: String,
    pub variant: Variant,
    pub rep: u32,
    pub level: u32,
    pub best_before: u32,
    pub max_floor: u32,
    pub start: u32,
    pub tier: String,
    pub reason: String,
    pub turns: u32,
    /// Floor arrivals (floor, run tick), first arrival each.
    pub floors: Vec<(u32, u32)>,
    pub xp: u32,
    pub wealth: i64,
    /// Town ticks owed after the send (rest or death recovery).
    pub rest: u32,
    pub drilled: Vec<String>,
    pub capped: bool,
    /// The state's walls: each band's boss (content depth, boss, drilled before the send).
    pub walls: Vec<(u32, String, bool)>,
    /// Splitting: the branch (0: the natural continuation) and the floor it branched at (0: none).
    #[serde(default)]
    pub branch: u32,
    #[serde(default)]
    pub from: u32,
}

/// The bands' walls (content depth of each band's boss).
pub const WALLS: [u32; 6] = [8, 13, 18, 23, 28, 33];

pub fn walls(g: &Game) -> Vec<(u32, String, bool)> {
    let route = g.lineage.rules().route();
    WALLS.iter().filter_map(|&c| route.boss(c).map(|b| (c, b.to_string(), g.lineage.pkg.drills.iter().any(|d| d.boss == b && !d.revoked)))).collect()
}

pub fn apply_variant(g: &mut Game, v: &Variant) {
    if let Some(level) = v.level {
        let class = g.lineage.class.name().to_string();
        if let Some(c) = g.lineage.classes.get_mut(&class) {
            c.level = level.clamp(1, idlever_core::engine::MAX_LEVEL);
            c.xp = 0;
        }
    }
    let mut changed = false;
    for b in &v.drill_drop {
        for d in g.lineage.pkg.drills.iter_mut().filter(|d| d.boss == *b) {
            changed |= !d.revoked;
            d.revoked = true;
        }
    }
    for b in &v.drill_add {
        if g.lineage.pkg.drills.iter().any(|d| d.boss == *b && !d.revoked) {
            continue;
        }
        g.lineage.pkg.drills.retain(|d| d.boss != *b);
        let stance = g.lineage.pkg.stance.clone();
        let heal = idlever_core::packages::heal_pct(&stance, g.lineage.pkg.level(&stance));
        let rows = idlever_core::packages::drill_rows(b, heal);
        g.lineage.pkg.drills.push(idlever_core::packages::Drill { boss: b.clone(), rows, revoked: false, announced: true });
        changed = true;
    }
    if changed {
        idlever_core::packages::recompile(&mut g.lineage);
    }
}

fn wealth(g: &Game) -> i64 { g.lineage.gold as i64 + g.lineage.town.bank as i64 + g.lineage.tree.chest as i64 }
fn exits(g: &Game) -> u32 { g.lineage.runs_banked + g.lineage.runs_returned + g.lineage.runs_died }

#[derive(Clone, Default)]
struct Track { floors: Vec<(u32, u32)>, start: u32, max_floor: u32, turns: u32, capped: bool, xp: u32 }

/// Plays the send on in 5-second slices until it ends (true) or, with `stop`, until it first stands on that floor
/// still running (false).
fn advance(g: &mut Game, t: &mut Track, n0: u32, cap_ticks: u32, stop: Option<u32>) -> bool {
    for _ in 0..10_000_000 {
        let _ = idlever_core::offline::run_offline_slice(g, 5, false);
        t.xp = g.batch.xp_gained;
        if let Some(run) = g.run.as_ref().filter(|r| r.over.is_none()) {
            if t.start == 0 {
                t.start = run.depth;
            }
            if t.floors.last().is_none_or(|f| run.depth > f.0) {
                t.floors.push((run.depth, run.turn));
            }
            t.max_floor = t.max_floor.max(run.max_depth);
            t.turns = run.turn;
            if run.turn >= cap_ticks {
                t.capped = true;
                return true;
            }
            if stop.is_some_and(|f| run.depth >= f) {
                return false;
            }
        }
        if exits(g) > n0 {
            return true;
        }
    }
    t.capped = true;
    true
}

/// One send from `base` (cloned), the `rep`th seed; `cap_ticks` bounds the observed expedition (censored past it).
/// `branch` (floor, k): a send that reaches the floor is continued k times from there, the first as it falls, the
/// others with the run's random stream redrawn (splitting: k conditional draws past a deep floor for one walk to it).
pub fn sample(base: &Game, state: &str, variant: &Variant, rep: u32, cap_ticks: u32, branch: Option<(u32, u32)>) -> Vec<Sample> {
    let mut g = base.clone();
    g.lineage.next_run_id += 7919 * (rep + 1);
    g.lineage.rest_left = 0;
    g.lineage.persistent.recovery_until_tick = 0;
    let level = g.lineage.class_level();
    let best_before = g.lineage.best_depth;
    let (w0, n0) = (wealth(&g), exits(&g));
    let walls = walls(&g);
    let drills0: Vec<String> = g.lineage.pkg.drills.iter().filter(|d| !d.revoked).map(|d| d.boss.clone()).collect();
    let mut t = Track::default();
    let finish = |mut g: Game, mut t: Track, b: u32, from: u32| -> Sample {
        let rec = if t.capped { None } else { g.lineage.run_log.last().cloned() };
        let _ = idlever_core::offline::run_offline_slice(&mut g, 0, true);
        let (tier, reason) = match &rec {
            Some(r) => {
                t.max_floor = t.max_floor.max(r.depth);
                t.turns = r.turns;
                if t.start == 0 {
                    t.start = r.start;
                }
                (r.tier.clone(), r.reason.clone().unwrap_or_default())
            }
            None => ("cap".into(), String::new()),
        };
        let xp = t.xp.max(g.batch.xp_gained);
        let drilled = g.lineage.pkg.drills.iter().filter(|d| !d.revoked && !drills0.contains(&d.boss)).map(|d| d.boss.clone()).collect();
        Sample {
            state: state.into(), variant: variant.clone(), rep, level, best_before, max_floor: t.max_floor, start: t.start, tier, reason,
            turns: t.turns, floors: t.floors, xp, wealth: wealth(&g) - w0,
            rest: g.lineage.rest_left.max(idlever_core::persistent::remaining(&g.lineage) as u32), drilled, capped: t.capped,
            walls: walls.clone(), branch: b, from,
        }
    };
    match branch {
        Some((floor, k)) if !advance(&mut g, &mut t, n0, cap_ticks, Some(floor)) => (0..k.max(1))
            .map(|b| {
                let mut g2 = g.clone();
                if b > 0 {
                    if let Some(run) = g2.run.as_mut() {
                        run.rng = idlever_core::rng::Rng::derive(run.rng.next_u64() ^ u64::from(rep), 0xB4A1 + u64::from(b));
                    }
                }
                let mut t2 = t.clone();
                advance(&mut g2, &mut t2, n0, cap_ticks, None);
                finish(g2, t2, b, floor)
            })
            .collect(),
        Some(_) => vec![finish(g, t, 0, 0)],
        None => {
            advance(&mut g, &mut t, n0, cap_ticks, None);
            vec![finish(g, t, 0, 0)]
        }
    }
}

pub fn load_state(path: &str) -> Result<Game, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))?;
    let mut g = Game::load(&text).map_err(|e| format!("{path}: {e}"))?;
    super::rebase::rebase(&mut g);
    Ok(g)
}

/// Every job's samples, `threads` at a time (bit-identical whatever the thread count).
pub fn measure(jobs: &[Job], threads: usize, cap_ticks: u32) -> Result<Vec<Sample>, String> {
    let units: Vec<(usize, u32)> = jobs.iter().enumerate().flat_map(|(i, j)| (j.rep0..j.rep0 + j.reps).map(move |r| (i, r))).collect();
    let bases: Vec<Mutex<Option<Game>>> = jobs.iter().map(|_| Mutex::new(None)).collect();
    let next = AtomicUsize::new(0);
    let out = Mutex::new(Vec::with_capacity(units.len()));
    let err = Mutex::new(None);
    std::thread::scope(|s| {
        for _ in 0..threads.max(1).min(units.len().max(1)) {
            s.spawn(|| loop {
                let i = next.fetch_add(1, Ordering::Relaxed);
                let Some(&(j, rep)) = units.get(i) else { break };
                let job = &jobs[j];
                let base = {
                    let mut slot = bases[j].lock().unwrap();
                    if slot.is_none() {
                        match load_state(&job.state) {
                            Ok(mut g) => {
                                apply_variant(&mut g, &job.variant);
                                *slot = Some(g);
                            }
                            Err(e) => {
                                *err.lock().unwrap() = Some(e);
                                break;
                            }
                        }
                    }
                    slot.as_ref().unwrap().clone()
                };
                let smp = sample(&base, &job.state, &job.variant, rep, cap_ticks, job.branch);
                out.lock().unwrap().push((i, smp));
            });
        }
    });
    if let Some(e) = err.into_inner().unwrap() {
        return Err(e);
    }
    let mut v = out.into_inner().unwrap();
    v.sort_by_key(|x| x.0);
    Ok(v.into_iter().flat_map(|x| x.1).collect())
}
