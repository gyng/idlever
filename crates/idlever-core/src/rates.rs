//! Queue item 40: how fast the town's Gold grows, measured on the town clock (`clock_s`).
//!
//! Every purse movement (`LineageState::gold_move_n`) lands in `pending` as earned or spent; the clock's commit
//! (`commit`, called wherever `clock_s` moves) spreads it evenly over the seconds just committed, in ten-minute
//! buckets. An absence's income therefore reads as its average rate across the absence, never as a spike at the
//! return. Bank deposits and withdrawals are transfers between the purse and Savings, not earnings or spending; a
//! refund of a purchase lowers spending. The purse is the town's: `bloodlines::town_from` copies this with it.
use serde::{Deserialize, Serialize};

use crate::engine::LineageState;

pub const BUCKET_S: u64 = 600;
/// A day of buckets.
pub const KEEP: u64 = 144;
/// No rate is shown over less history than this (no invented precision).
pub const MIN_WINDOW_S: u64 = 300;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct GoldRate {
    /// The clock (`clock_s`) when measuring began.
    #[serde(default)]
    pub since: u64,
    /// Earned and spent since the clock last committed.
    #[serde(default)]
    pub pending: (i64, i64),
    /// (bucket = clock_s / BUCKET_S, earned, spent), oldest first, at most `KEEP`.
    #[serde(default)]
    pub buckets: Vec<(u64, i64, i64)>,
}
impl GoldRate {
    pub fn is_empty(&self) -> bool {
        self.buckets.is_empty() && self.pending == (0, 0)
    }
}

/// A purse movement, by its ledger reason and term (`engine::gold_term`).
pub fn record(l: &mut LineageState, delta: i32, why: &str, term: &str) {
    if delta == 0 || term == "bank" {
        return;
    }
    if l.gold_rate.is_empty() {
        l.gold_rate.since = l.clock_s;
    }
    let d = i64::from(delta);
    let refund = matches!(term, "supplies" | "works" | "forge" | "hires" | "sinks") || why.starts_with("forswear ");
    let p = &mut l.gold_rate.pending;
    if d < 0 || refund {
        p.1 -= d;
    } else {
        p.0 += d;
    }
}

/// The clock moved from `from` to now (`clock_s`): spread what is pending over those seconds.
pub fn commit(l: &mut LineageState, from: u64) {
    let to = l.clock_s;
    let (earned, spent) = std::mem::take(&mut l.gold_rate.pending);
    if earned == 0 && spent == 0 {
        return;
    }
    let r = &mut l.gold_rate;
    let to = to.max(from + 1);
    let span = i128::from(to - from);
    let (mut e_left, mut s_left) = (earned, spent);
    let (first, last) = (from / BUCKET_S, (to - 1) / BUCKET_S);
    for b in first..=last {
        let (lo, hi) = ((b * BUCKET_S).max(from), ((b + 1) * BUCKET_S).min(to));
        let (e, s) = if b == last {
            (e_left, s_left)
        } else {
            let part = |v: i64| (i128::from(v) * i128::from(hi - lo) / span) as i64;
            (part(earned), part(spent))
        };
        e_left -= e;
        s_left -= s;
        if e == 0 && s == 0 {
            continue;
        }
        match r.buckets.iter_mut().find(|x| x.0 == b) {
            Some(x) => {
                x.1 += e;
                x.2 += s;
            }
            None => {
                let at = r.buckets.partition_point(|x| x.0 < b);
                r.buckets.insert(at, (b, e, s));
            }
        }
    }
    let keep_from = last.saturating_sub(KEEP - 1);
    r.buckets.retain(|x| x.0 >= keep_from);
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct RateWindow {
    /// The seconds measured (the window, or less while history is short).
    pub window_s: u64,
    pub earned: i64,
    pub spent: i64,
    pub net: i64,
    /// Per hour of the window.
    pub earned_h: i64,
    pub spent_h: i64,
    pub net_h: i64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct GoldRateWire {
    /// The last hour of the town clock; absent under `MIN_WINDOW_S` of history.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hour: Option<RateWindow>,
    /// The last day.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub day: Option<RateWindow>,
}

fn window(r: &GoldRate, now: u64, span: u64) -> Option<RateWindow> {
    let start = now.saturating_sub(span).max(r.since);
    let window_s = now.saturating_sub(start);
    if window_s < MIN_WINDOW_S {
        return None;
    }
    let (mut earned, mut spent) = r.pending;
    for &(b, e, s) in &r.buckets {
        // (measuring began inside its first bucket: that bucket holds only the seconds since)
        let (lo, hi) = ((b * BUCKET_S).max(r.since), (b + 1) * BUCKET_S);
        if hi <= start || lo >= now.max(start + 1) {
            continue;
        }
        // a bucket the window's start cuts counts in proportion
        let cut = hi.min(now) - lo.max(start);
        let full = hi.min(now.max(lo + 1)) - lo;
        let part = |v: i64| (i128::from(v) * i128::from(cut) / i128::from(full.max(1))) as i64;
        earned += part(e);
        spent += part(s);
    }
    let per_h = |v: i64| (i128::from(v) * 3600 / i128::from(window_s)) as i64;
    Some(RateWindow { window_s, earned, spent, net: earned - spent, earned_h: per_h(earned), spent_h: per_h(spent), net_h: per_h(earned - spent) })
}

pub fn wire(l: &LineageState) -> Option<GoldRateWire> {
    let r = &l.gold_rate;
    if r.is_empty() {
        return None;
    }
    let hour = window(r, l.clock_s, 3600);
    let day = window(r, l.clock_s, 86_400);
    (hour.is_some() || day.is_some()).then_some(GoldRateWire { hour, day })
}
