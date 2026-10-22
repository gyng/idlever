//! The calibrated model: per bot, the fitted kernel (hazard + aux), its library of camp states and the replicas'
//! starting camps; and the profile's Layer 2 parameters (`Meta`).
use super::fit::{Aux, Hazard, Structure};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StateRec {
    pub path: String,
    pub seed: u64,
    pub day: u32,
    pub ci: u32,
    /// Densified states: the send after the check-in (0: the check-in's own camp).
    pub x: u32,
    pub best: u32,
    /// The record's content depth (the calibration structure's reach).
    pub content: u32,
    pub level: u32,
    pub xp: u32,
    pub porter: bool,
    pub drills: Vec<String>,
    pub clock_s: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Init {
    pub seed: u64,
    pub session_s: u64,
    pub best: u32,
    pub level: u32,
    pub xp: u32,
    pub drills: Vec<String>,
    pub porter: bool,
}

/// A calibration seed's power curves by record: (seed, after the porter, before him).
pub type SeedCurve = (u64, Vec<(f64, f64)>, Vec<(f64, f64)>);

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BotModel {
    pub bot: String,
    pub hazard: Hazard,
    pub aux: Aux,
    pub states: Vec<StateRec>,
    /// Power at class level 10 by record content: (content, α10), after the porter and before him.
    pub curve: Vec<(f64, f64)>,
    pub curve_pre: Vec<(f64, f64)>,
    /// The same per calibration seed (a replica follows its own seed's lineage: its stance, route and kit choices).
    #[serde(default)]
    pub seed_curves: Vec<SeedCurve>,
    /// Power at class level 10 by lineage hours, per calibration seed (what the bot's check-ins bought by then).
    #[serde(default)]
    pub time_curves: Vec<(u64, Vec<(f64, f64)>)>,
    /// How a replica's power is read: `record` (by its record), `time` (by its hours) or `min` (the stronger).
    #[serde(default = "record")]
    pub index: String,
    /// The route's walls (content, boss).
    pub walls: Vec<(u32, String)>,
    pub init: Vec<Init>,
    /// Lineage hours when the porter came (expeditions begin), for a replica that starts without him.
    pub porter_h: f64,
}

fn record() -> String { "record".into() }

fn interp(curve: &[(f64, f64)], c: f64) -> f64 {
    if curve.is_empty() {
        return -8.0;
    }
    if c <= curve[0].0 {
        return curve[0].1;
    }
    for w in curve.windows(2) {
        if c <= w[1].0 {
            let t = (c - w[0].0) / (w[1].0 - w[0].0).max(1e-9);
            return w[0].1 + t * (w[1].1 - w[0].1);
        }
    }
    curve[curve.len() - 1].1
}

impl BotModel {
    pub fn alpha(&self, seed: u64, record_content: u32, hours: f64, level: u32, porter: bool, shift: f64) -> f64 {
        let (post, pre) = self.seed_curves.iter().find(|s| s.0 == seed && !s.1.is_empty()).map_or((&self.curve, &self.curve_pre), |s| (&s.1, &s.2));
        let pre = if pre.is_empty() { &self.curve_pre } else { pre };
        let curve = if porter || pre.is_empty() { post } else { pre };
        let by_record = interp(curve, f64::from(record_content));
        let by_time = || self.time_curves.iter().find(|s| s.0 == seed).map_or(by_record, |s| interp(&s.1, hours));
        let a10 = match self.index.as_str() {
            "time" => by_time(),
            "min" => by_record.min(by_time()),
            _ => by_record,
        };
        a10 - self.hazard.beta_l * (10.0 - f64::from(level)) + shift
    }
    /// The power curves from the fitted state powers: the median α10 at each record content, made monotone.
    pub fn build_curves(&mut self) {
        let mk = |pre: bool, s: &BotModel, seed: Option<u64>| -> Vec<(f64, f64)> {
            let mut by: std::collections::BTreeMap<u32, Vec<f64>> = Default::default();
            for (i, st) in s.states.iter().enumerate().filter(|(_, st)| st.porter != pre && seed.is_none_or(|x| x == st.seed)) {
                let a10 = s.hazard.alpha[i] + s.hazard.beta_l * (10.0 - f64::from(st.level));
                by.entry(st.content).or_default().push(a10);
            }
            let mut v: Vec<(f64, f64)> = by.into_iter().map(|(c, mut a)| {
                a.sort_by(f64::total_cmp);
                (f64::from(c), a[a.len() / 2])
            }).collect();
            // power never falls as the record deepens (the record is the deepest send so far)
            for i in 1..v.len() {
                if v[i].1 > v[i - 1].1 {
                    v[i].1 = v[i - 1].1;
                }
            }
            v
        };
        self.curve = mk(false, self, None);
        self.curve_pre = mk(true, self, None);
        let seeds: std::collections::BTreeSet<u64> = self.states.iter().map(|s| s.seed).collect();
        self.seed_curves = seeds.iter().map(|x| (*x, mk(false, self, Some(*x)), mk(true, self, Some(*x)))).collect();
        self.time_curves = seeds
            .iter()
            .map(|x| {
                let mut v: Vec<(f64, f64)> = self.states.iter().enumerate().filter(|(_, st)| st.seed == *x).map(|(i, st)| (st.clock_s as f64 / 3600.0, self.hazard.alpha[i] + self.hazard.beta_l * (10.0 - f64::from(st.level)))).collect();
                v.sort_by(|a, b| a.0.total_cmp(&b.0));
                for i in 1..v.len() {
                    if v[i].1 > v[i - 1].1 {
                        v[i].1 = v[i - 1].1;
                    }
                }
                (*x, v)
            })
            .collect();
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Model {
    pub schema: u32,
    pub calib_profile: Value,
    pub structure: Structure,
    pub bots: Vec<BotModel>,
    /// The calibration's measured samples (refits draw on them as the prior's data).
    pub samples: String,
    pub library: String,
}

/// Layer 2's profile parameters.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Meta {
    /// rest min, cap, turns divisor (ticks)
    pub rest: [u32; 3],
    pub recovery: [u32; 4],
    pub recovery_full: u32,
    pub xp_early: u32,
    pub xp_late: u32,
    pub xp_early_to: u32,
    pub drill_meeting: u32,
    pub drill_days: u32,
    pub deep_drill_days: u32,
    #[serde(default)]
    pub alpha_shift: f64,
}
impl Meta {
    pub fn of(b: &idlever_core::balance::Balance) -> Meta {
        Meta {
            rest: [b.rest.min_ticks, b.rest.cap_ticks, b.rest.turns_div], recovery: b.recovery, recovery_full: b.recovery_full_ticks,
            xp_early: b.marks.xp_early, xp_late: b.marks.xp_late, xp_early_to: b.marks.xp_early_to,
            drill_meeting: b.drill_meeting, drill_days: b.drill_days, deep_drill_days: b.deep_drill_days, alpha_shift: 0.0,
        }
    }
}

/// The profile's fields Layer 2 reads (or the model leaves to the calibration): a profile differing from the
/// calibration only in these needs no new send measured. Everything else may change a send and is measured.
pub const META_KEYS: [&str; 6] = ["rest", "recovery", "recovery_full_ticks", "drill_meeting", "drill_days", "deep_drill_days"];
pub const META_MARKS: [&str; 3] = ["xp_early", "xp_late", "xp_early_to"];
/// Fields no layer models (hires, system unlocks, upgrades): a change is reported, its effect is not predicted.
pub const UNMODELED: [&str; 4] = ["workers", "unlocks", "upgrades", "vat"];

pub fn strip_meta(v: &Value) -> Value {
    let mut v = v.clone();
    if let Some(o) = v.as_object_mut() {
        for k in META_KEYS.iter().chain(UNMODELED.iter()) {
            o.remove(*k);
        }
        if let Some(m) = o.get_mut("marks").and_then(Value::as_object_mut) {
            for k in META_MARKS {
                m.remove(k);
            }
        }
    }
    v
}
pub fn unmodeled_diff(a: &Value, b: &Value) -> Vec<String> {
    UNMODELED.iter().filter(|k| a.get(**k) != b.get(**k)).map(|k| k.to_string()).collect()
}
