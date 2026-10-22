//! Layer 2: progression between sends, a Monte Carlo of the bot's fortnight on the fitted kernel. Each replica
//! starts from a calibration seed's camp after the first session and plays absences of one check-in interval: town
//! rest and death recovery from the profile, sends drawn floor by floor from the hazard, XP to class levels by the
//! profile's marks, a boss met on a day counted towards its drill by the profile's drill rules, the record read at
//! each check-in (a send begun before the check-in finishes inside it, as the offline batch does).
use super::fit::{wall_of, Aux, Hazard, Structure};
use super::model::{BotModel, Meta};
use idlever_core::rng::Rng;

pub const MILESTONES: [u32; 7] = [8, 13, 18, 23, 28, 29, 33];

#[derive(Clone, Debug, Default)]
pub struct Run {
    pub hours: Vec<Option<f64>>,
    pub level_day: Vec<u32>,
    pub gold_day: Vec<f64>,
    pub best_day: Vec<u32>,
    pub sends: u32,
    /// Lineage hours each boss was drilled.
    pub drilled_h: Vec<(String, f64)>,
}

fn unit(rng: &mut Rng) -> f64 { (rng.next_u64() >> 11) as f64 / (1u64 << 53) as f64 }

pub fn xp_to_next(level: u32, m: &Meta) -> f64 {
    let k = if level <= m.xp_early_to { m.xp_early } else { m.xp_late };
    f64::from(k) * f64::from(level * level)
}
pub fn recovery_ticks(content: u32, m: &Meta) -> f64 {
    let [shallow, lo, hi, ex] = m.recovery;
    let d = content.max(1);
    if d <= lo {
        return f64::from(shallow);
    }
    if d >= hi {
        return f64::from(m.recovery_full);
    }
    let num = f64::from(d - lo).powi(ex as i32);
    let den = f64::from(hi - lo).powi(ex as i32);
    f64::from(shallow) + (f64::from(m.recovery_full) - f64::from(shallow)) * num / den
}
fn need(boss: &str, deep: bool, m: &Meta) -> u32 {
    match boss {
        "goblin_warlord" => m.drill_meeting,
        _ if deep => m.deep_drill_days,
        "foundry_master" => m.drill_days + 1,
        _ => m.drill_days,
    }
}

/// One send: the floor it ends on, its ticks and its exit tier (0 bank, 1 return, 2 death).
pub fn send(h: &Hazard, a: &Aux, st: &Structure, alpha: f64, walls: &[(u32, String, bool)], rng: &mut Rng) -> (u32, f64, usize) {
    let top = super::fit::max_floor(st);
    let mut t = 0.0;
    let mut f = 0;
    loop {
        f += 1;
        let c = st.content(f).clamp(1, 33);
        if f > top {
            // past the King's floor the walk is not followed: the record is what the milestones read
            f = top;
            break;
        }
        let w = wall_of(st, f, walls);
        let p = 1.0 / (1.0 + (-h.eta(alpha, c, w)).exp());
        if unit(rng) < p {
            break;
        }
        t += a.tau[(c - 1) as usize];
    }
    let c = st.content(f);
    let wall = wall_of(st, f, walls).is_some_and(|w| w.0 < 6);
    let tier = if unit(rng) < a.pdeath[super::fit::bucket(c, wall)] { 2 } else if unit(rng) < a.p_return { 1 } else { 0 };
    t += a.last[tier];
    (f, t, tier)
}

pub fn simulate(bm: &BotModel, meta: &Meta, st: &Structure, init: usize, days: usize, checkins: u64, rng: &mut Rng) -> Run {
    let i0 = &bm.init[init];
    let interval = 24 * 3600 / checkins;
    let mut best = i0.best;
    let mut level = i0.level;
    let mut xp = f64::from(i0.xp);
    let mut drilled: Vec<String> = i0.drills.clone();
    let mut porter = i0.porter;
    let mut meets: Vec<(String, Vec<u64>)> = Vec::new();
    let mut met_runs: Vec<(String, u32)> = Vec::new();
    let mut golem_known = false;
    let mut out = Run { hours: vec![None; MILESTONES.len()], ..Default::default() };
    let mut rest_left = 0.0f64;
    let mut owed_recovery = false;
    let mut wealth = 0.0;
    let mut w0 = 0.0;
    // the lineage's clock: it starts after the first session, so it runs a session behind the check-in hours
    // (a meeting's day is the clock's day at the absence's start: the day's first absence still counts the day before)
    let mut clock = 1.0f64;
    for k in 0..(days as u64 * checkins) {
        let day = (clock / 86_400.0).floor() as u64;
        let budget = if k == 0 { (interval as f64 - i0.session_s as f64).max(1.0) * 10.0 } else { interval as f64 * 10.0 };
        if !owed_recovery {
            rest_left = rest_left.min(6000.0);
        }
        let mut used = 0.0;
        while used < budget {
            if rest_left > 0.0 {
                let r = rest_left.min(budget - used);
                used += r;
                rest_left -= r;
                if rest_left > 0.0 {
                    break;
                }
            }
            owed_recovery = false;
            let now_h = (clock + used / 10.0) / 3600.0;
            if !porter && now_h >= bm.porter_h {
                porter = true;
            }
            let alpha = bm.alpha(i0.seed, st.reach(best), now_h, level, porter, meta.alpha_shift);
            let walls: Vec<(u32, String, bool)> = bm.walls.iter().map(|(c, b)| (*c, b.clone(), drilled.contains(b))).collect();
            let (m, t, tier) = send(&bm.hazard, &bm.aux, st, alpha, &walls, rng);
            used += t;
            out.sends += 1;
            // meetings: a boss met on a day (his floor reached) counts towards his drill
            for (c, b) in &bm.walls {
                let floor = c * st.stretch;
                let met = if b == "foundry_master" {
                    if st.content(m) + 4 >= *c {
                        golem_known = true;
                    }
                    golem_known && m >= 19
                } else {
                    m >= floor
                };
                if !met || drilled.contains(b) {
                    continue;
                }
                let n = if b == "goblin_warlord" {
                    let e = match met_runs.iter_mut().find(|x| x.0 == *b) {
                        Some(e) => e,
                        None => {
                            met_runs.push((b.clone(), 0));
                            met_runs.last_mut().unwrap()
                        }
                    };
                    e.1 += 1;
                    e.1
                } else {
                    let e = match meets.iter_mut().find(|x| x.0 == *b) {
                        Some(e) => e,
                        None => {
                            meets.push((b.clone(), Vec::new()));
                            meets.last_mut().unwrap()
                        }
                    };
                    if !e.1.contains(&day) {
                        e.1.push(day);
                    }
                    e.1.len() as u32
                };
                if n >= need(b, *c >= 28, meta) {
                    drilled.push(b.clone());
                    out.drilled_h.push((b.clone(), now_h));
                }
            }
            best = best.max(m);
            let walked: f64 = (1..=m).map(|f| 2.0 + f64::from(st.content(f))).sum();
            if tier < 2 {
                xp += bm.aux.xp_k[tier] * walked;
            }
            while level < 10 && xp >= xp_to_next(level, meta) {
                xp -= xp_to_next(level, meta);
                level += 1;
            }
            let csum: f64 = (1..=m).map(|f| f64::from(st.content(f))).sum();
            wealth += bm.aux.wealth[0] + bm.aux.wealth[1] * csum;
            if tier == 2 {
                rest_left = recovery_ticks(st.reach(m), meta);
                owed_recovery = true;
            } else {
                let r = (t / f64::from(meta.rest[2].max(1))).floor();
                rest_left = r.clamp(f64::from(meta.rest[0]), f64::from(meta.rest[1]));
            }
        }
        clock += budget / 10.0;
        let h = ((k + 1) * interval) as f64 / 3600.0;
        for (i, m) in MILESTONES.iter().enumerate() {
            if out.hours[i].is_none() && st.reach(best) >= *m {
                out.hours[i] = Some(h);
            }
        }
        if (k + 1) % checkins == 0 {
            out.level_day.push(level);
            out.gold_day.push(wealth - w0);
            out.best_day.push(st.reach(best));
            w0 = wealth;
        }
    }
    out
}
