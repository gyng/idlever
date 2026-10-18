//! Cut258 §2 (docs/CUT258_ROUGH_START.md): the opening probe. A fresh town played as an attentive new player for its
//! first hour: build the house, send by hand whenever the hero is home and able (a hand send clears the camp rest;
//! death recovery still blocks), watch every run at 1× (10 ticks a second: a minute is 600 ticks), and buy the
//! cheapest upgrade the moment it is affordable. Hires and plots come as the game offers them (`tree::lit`,
//! `town::build_ready`: Cut232's one decision a report is the engine's own); nothing is granted or bypassed.
//!
//! An upgrade (the contract's definition): a purchase or spend that changes the next run — a worker hire that costs
//! gold, a worker rank with an edge (`tree::rank_bonus`; a look-only rank is cosmetic), a Legacy rank, a worn
//! package's level bought with marks, a forge step. Free hires, plots, the chest and the return pick are logged as free and
//! never counted.
//!
//! Waiting at camp (the hero recovering) advances the clock with `offline::run_offline_counts` in ≤ 60 s slices, as
//! the open camp's catch-up does; once the Receptionist (`scout`) is hired he may send in such a slice, and that run
//! is then watched like a hand send.
//!
//! Per seed: G1 first upgrade affordable (min), G2 longest gap between affordable upgrades in 0–60 (from minute 0
//! and to the window's end included), G3 upgrades in 0–30, G4 Receptionist affordable (min), G6 longest forced wait
//! in 0–30 (hero home, nothing to send, nothing to buy). Across seeds: median and worst against the Cut258 bars. A
//! bar without "median" reads every seed. Deterministic; `IDLEVER_BALANCE_JSON` (with `--features dev-balance`) as
//! the dayplayer reads it, so `tools/sweep.mjs --example opening` can drive it. Diagnostic, never the gate.
//!
//!   cargo run -q --profile fast -p idlever-core --example opening -- [--seeds 16] [--threads N] [--minutes 60]
//!       [--absent 8h] [--timeline SEED] [--rows ?|opening-gap,…] [--kit-check] [--watch-x 4]
//!   IDLEVER_BALANCE_JSON="$(cat P.json)" cargo run -q --profile fast -p idlever-core --features dev-balance --example opening
use idlever_core::{kit, legacy, offline, packages, persistent, town, tree, Ev, Game};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

const MIN: u64 = 600;

/// Cut260 (diagnostic, never the gate): `--watch-x X` — a watched run's game ticks cost 1/X of their wall time (the
/// dayplayer's first-session model reads the shipped `fights` mode as an effective 4×, `WATCH_X`). The bars are read
/// at the default 1×; any other speed is a sensitivity reading.
static WATCH_X: std::sync::OnceLock<u64> = std::sync::OnceLock::new();
fn watch_x() -> u64 {
    *WATCH_X.get().unwrap_or(&1)
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Cur {
    Gold,
    Legacy,
    Marks,
}
impl Cur {
    fn sign(self) -> &'static str {
        match self {
            Cur::Gold => "$",
            Cur::Legacy => "L",
            Cur::Marks => "◆",
        }
    }
}

#[derive(Clone, Debug)]
enum Act {
    Hire(&'static str),
    Rank(&'static str),
    Legacy(String),
    Level(String),
    Forge(&'static str),
}

#[derive(Clone, Debug)]
struct Offer {
    act: Act,
    label: String,
    price: u32,
    cur: Cur,
    affordable: bool,
    upgrade: bool,
}

/// What the camp sells now (the ones on offer; `affordable` from the wallet the buy itself checks).
fn offers(g: &Game) -> Vec<Offer> {
    let l = &g.lineage;
    let mut v = Vec::new();
    if let Some(n) = tree::lit(l) {
        let p = tree::price(l, n).max(0) as u32;
        v.push(Offer {
            act: Act::Hire(n.id),
            label: format!("hire {}", n.id),
            price: p,
            cur: Cur::Gold,
            affordable: l.gold >= p as i32,
            upgrade: p > 0,
        });
    }
    if let Some(n) = tree::lit_rank(l) {
        let p = tree::rank_price(l, n).max(0) as u32;
        let r = tree::rank(l, n.id) + 1;
        v.push(Offer {
            act: Act::Rank(n.id),
            label: format!("rank {} {r}", n.id),
            price: p,
            cur: Cur::Gold,
            affordable: l.gold >= p as i32,
            upgrade: tree::rank_bonus(n.id, r).is_some(),
        });
    }
    for o in legacy::offers(l, false) {
        if o.blocked.is_none() || o.blocked.as_deref() == Some("More Legacy needed") {
            v.push(Offer {
                act: Act::Legacy(o.id.clone()),
                label: format!("legacy {} {}", o.id, o.rank + 1),
                price: o.price,
                cur: Cur::Legacy,
                affordable: o.affordable,
                upgrade: true,
            });
        }
    }
    // (the worn packages: a level of one on the shelf changes no run)
    if packages::level_open(l) {
        let worn = std::iter::once(&l.pkg.stance)
            .chain(l.pkg.tactics.iter())
            .chain(l.pkg.temperament.iter());
        for id in worn.filter(|id| l.pkg.owned.contains(*id)) {
            if let Some(p) = packages::level_price(l, id) {
                v.push(Offer {
                    act: Act::Level(id.clone()),
                    label: format!("level {id} L{}", l.pkg.level(id) + 1),
                    price: p,
                    cur: Cur::Marks,
                    affordable: l.marks >= p,
                    upgrade: true,
                });
            }
        }
    }
    if town::built(l, "blacksmith") {
        for s in kit::KIT_SLOTS {
            let n = kit::owned(l, s) as usize;
            if n < kit::mults(s).len() {
                let p = kit::price(l, s, n);
                v.push(Offer {
                    act: Act::Forge(s),
                    label: format!("forge {s} #{}", n + 1),
                    price: p,
                    cur: Cur::Gold,
                    affordable: tree::purse(l) >= p as i32,
                    upgrade: true,
                });
            }
        }
    }
    v
}

#[derive(Clone, Debug)]
struct Buy {
    t: u64,
    label: String,
    price: u32,
    cur: Cur,
    upgrade: bool,
}

#[derive(Clone, Debug, Default)]
struct Sample {
    min: u64,
    gold: i32,
    legacy: u32,
    marks: u32,
    runs: u32,
    deaths: u32,
    best: u32,
    rest: f64,
    recovery: f64,
    state: &'static str,
    next: String,
}

#[derive(Clone, Debug, Default)]
struct Out {
    seed: u64,
    samples: Vec<Sample>,
    buys: Vec<Buy>,
    /// forced waits: [from, to) ticks
    waits: Vec<(u64, u64)>,
    /// other events: (tick, text)
    notes: Vec<(u64, String)>,
    receptionist: Option<u64>,
    forge_built: Option<u64>,
    /// kit::buy refusals while a step was affordable (the metrics Forge 0/44 question)
    kit_refusals: Vec<String>,
    end: u64,
    absence: Option<String>,
}

impl Out {
    fn first_upgrade(&self) -> Option<u64> {
        self.buys.iter().find(|b| b.upgrade).map(|b| b.t)
    }
    /// G2: the longest gap between affordable upgrades within [0, to): from 0 to the first, between, and the last to `to`.
    fn longest_gap(&self, to: u64) -> u64 {
        let mut last = 0;
        let mut gap = 0;
        for b in self.buys.iter().filter(|b| b.upgrade && b.t < to) {
            gap = gap.max(b.t - last);
            last = b.t;
        }
        gap.max(to.saturating_sub(last))
    }
    fn upgrades_before(&self, to: u64) -> usize {
        self.buys.iter().filter(|b| b.upgrade && b.t < to).count()
    }
    fn longest_wait(&self, to: u64) -> u64 {
        self.waits
            .iter()
            .map(|&(a, b)| b.min(to).saturating_sub(a))
            .max()
            .unwrap_or(0)
    }
}

struct P {
    g: Game,
    /// wall ticks since the start (10 a second at 1×)
    t: u64,
    end: u64,
    next_min: u64,
    out: Out,
    wait_from: Option<u64>,
}

impl P {
    fn new(seed: u64, minutes: u64) -> P {
        P {
            g: Game::new(seed),
            t: 0,
            end: minutes * MIN,
            next_min: 0,
            out: Out {
                seed,
                ..Default::default()
            },
            wait_from: None,
        }
    }

    fn note(&mut self, s: String) {
        self.out.notes.push((self.t, s));
    }

    fn state(&self) -> &'static str {
        if legacy::away(&self.g) {
            "run"
        } else if persistent::remaining(&self.g.lineage) > 0 {
            "recover"
        } else {
            "home"
        }
    }

    fn sample(&mut self) {
        while self.t >= self.next_min * MIN && self.next_min * MIN <= self.end {
            let l = &self.g.lineage;
            let next = offers(&self.g)
                .into_iter()
                .filter(|o| o.upgrade && !o.affordable)
                .map(|o| format!("{} {}{}", o.label, o.cur.sign(), o.price))
                .collect::<Vec<_>>()
                .join(", ");
            let s = Sample {
                min: self.next_min,
                gold: l.gold,
                legacy: legacy::current(l).map_or(0, |b| b.points),
                marks: l.marks,
                runs: l.persistent.completed,
                deaths: l.persistent.defeats,
                best: l.best_depth,
                rest: l.rest_left as f64 / MIN as f64,
                recovery: persistent::remaining(l) as f64 / MIN as f64,
                state: self.state(),
                next,
            };
            self.out.samples.push(s);
            self.next_min += 1;
        }
    }

    /// The free acts a player takes at camp: the chest, a ready plot, a free hire, the return pick.
    fn chores(&mut self) {
        let _ = self.g.open_chest();
        for (id, _) in town::BUILDINGS {
            if town::build_ready(&self.g.lineage, id) && self.g.build_town(id).is_ok() {
                if id == "blacksmith" {
                    self.out.forge_built = Some(self.t);
                }
                self.note(format!("build {id}"));
            }
        }
        if self.g.lineage.return_pick.is_some() && self.g.take_return_pick("legacy").is_ok() {
            self.note("return pick legacy (free)".into());
        }
    }

    /// Buy the cheapest affordable thing, again, until nothing is affordable.
    fn shop(&mut self) {
        self.chores();
        for _ in 0..256 {
            let all = offers(&self.g);
            if self.out.receptionist.is_none()
                && all
                    .iter()
                    .any(|o| matches!(o.act, Act::Hire("scout")) && o.affordable)
            {
                self.out.receptionist = Some(self.t);
            }
            let mut buy: Vec<Offer> = all.into_iter().filter(|o| o.affordable).collect();
            buy.sort_by_key(|o| (o.price, o.label.clone()));
            let Some(o) = buy.into_iter().next() else {
                break;
            };
            let r = match &o.act {
                Act::Hire(id) => self.g.build_workplace(town::workplace_of(id).map_or("", |w| w.id)).map(|_| ()),
                Act::Rank(id) => self.g.promote(id).map(|_| ()),
                Act::Legacy(id) => legacy::buy_next(&mut self.g, id),
                Act::Level(id) => self.g.spend_level(id).map(|_| ()),
                Act::Forge(s) => kit::buy(&mut self.g, s),
            };
            match r {
                Ok(()) => {
                    let label = if o.upgrade {
                        o.label.clone()
                    } else {
                        format!("{} (free)", o.label)
                    };
                    self.out.buys.push(Buy {
                        t: self.t,
                        label,
                        price: o.price,
                        cur: o.cur,
                        upgrade: o.upgrade,
                    });
                    self.chores();
                }
                Err(e) => {
                    if matches!(o.act, Act::Forge(_)) {
                        self.out.kit_refusals.push(format!(
                            "{} at {:.1} min: {e}",
                            o.label,
                            self.t as f64 / MIN as f64
                        ));
                    }
                    self.note(format!("{} refused: {e}", o.label));
                    break;
                }
            }
        }
    }

    fn close_wait(&mut self) {
        if let Some(a) = self.wait_from.take() {
            if self.t > a {
                self.out.waits.push((a, self.t));
            }
        }
    }

    /// Watch the run in flight to its end (or the window's).
    fn watch(&mut self) {
        self.close_wait();
        loop {
            if self.t >= self.end {
                return;
            }
            let to_min = MIN - self.t % MIN;
            let n = (to_min * watch_x()).min(256) as u32;
            let t0 = self.g.lineage.total_turns;
            let r = self.g.step(n);
            let dt = self.g.lineage.total_turns - t0;
            self.t += dt.div_ceil(watch_x());
            for e in &r.events {
                if let Ev::Exit { tier, .. } = e {
                    let tier = format!("{tier:?}");
                    self.note(format!(
                        "exit {} D{} → ${}",
                        tier.to_lowercase(),
                        self.g.lineage.best_depth,
                        self.g.lineage.gold
                    ));
                }
            }
            self.sample();
            if r.run_over || dt == 0 {
                return;
            }
            // (Legacy is spendable while he is away: `buy_next`)
            self.shop();
        }
    }

    /// The hero home and not able to go: the camp's clock, a slice at a time.
    fn wait(&mut self) {
        let rem = persistent::remaining(&self.g.lineage);
        let to_min = MIN - self.t % MIN;
        let ticks = rem
            .clamp(10, MIN)
            .min(to_min.max(10))
            .min(self.end - self.t);
        let secs = ticks.div_ceil(10).max(1);
        let forced = !offers(&self.g).iter().any(|o| o.affordable);
        if forced && self.wait_from.is_none() {
            self.wait_from = Some(self.t);
        } else if !forced {
            self.close_wait();
        }
        // (with the Receptionist the watched camp counts the recovery down as a rest and he sends at its end —
        // `step`, tick-exact; before him an absence slice moves the clock and never sends)
        if self.g.may_go() {
            let t0 = self.g.lineage.total_turns;
            self.g.step(ticks as u32);
            self.t += (self.g.lineage.total_turns - t0).max(1);
        } else {
            offline::run_offline_counts(&mut self.g, secs);
            self.t += secs * 10;
        }
        self.sample();
    }

    fn play(&mut self) {
        self.g
            .build_town("house")
            .expect("a fresh town builds its house");
        self.note("build house".into());
        self.sample();
        while self.t < self.end {
            self.shop();
            if legacy::away(&self.g) {
                self.watch();
                continue;
            }
            if persistent::remaining(&self.g.lineage) > 0 {
                self.wait();
                continue;
            }
            match self.g.try_send() {
                Ok(_) => {
                    self.note(format!(
                        "send (runs {})",
                        self.g.lineage.persistent.completed
                    ));
                    self.watch();
                }
                Err(e) => {
                    self.note(format!("send refused: {e}"));
                    self.wait();
                }
            }
        }
        self.close_wait();
        self.sample();
        self.out.end = self.t;
    }

    fn absent(&mut self, secs: u64) {
        let (g0, c0, b0) = (
            self.g.lineage.gold,
            self.g.lineage.persistent.completed,
            self.out.buys.len(),
        );
        let r = offline::run_offline_counts(&mut self.g, secs);
        self.t += secs * 10;
        self.shop();
        let l = &self.g.lineage;
        let bought: Vec<String> = self.out.buys[b0..]
            .iter()
            .map(|b| format!("{} {}{}", b.label, b.cur.sign(), b.price))
            .collect();
        self.out.absence = Some(format!(
            "{:.1} h away: {} runs ({} reported), +${} gold, D{} best; on return bought {}: {}",
            secs as f64 / 3600.0,
            l.persistent.completed - c0,
            r.runs,
            l.gold - g0
                + self.out.buys[b0..]
                    .iter()
                    .filter(|b| b.cur == Cur::Gold)
                    .map(|b| b.price as i32)
                    .sum::<i32>(),
            l.best_depth,
            self.out.buys.len() - b0,
            if bought.is_empty() {
                "nothing".into()
            } else {
                bought.join(", ")
            }
        ));
    }
}

fn play(seed: u64, minutes: u64, absent: Option<u64>) -> Out {
    let mut p = P::new(seed, minutes);
    p.play();
    if let Some(s) = absent {
        p.absent(s);
    }
    p.out
}

fn mins(t: u64) -> f64 {
    t as f64 / MIN as f64
}

fn median(v: &[f64]) -> f64 {
    let mut s = v.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap());
    if s.is_empty() {
        return f64::NAN;
    }
    let n = s.len();
    if n % 2 == 1 {
        s[n / 2]
    } else {
        (s[n / 2 - 1] + s[n / 2]) / 2.0
    }
}

/// The rows (`--rows ?`): id, the bar's name (its printed line starts with it).
const ROWS: [(&str, &str); 5] = [
    (
        "opening-first",
        "G1 first upgrade affordable, min (every seed ≤ 3)",
    ),
    (
        "opening-gap",
        "G2 longest gap between upgrades 0–60, min (median ≤ 6, every seed ≤ 10)",
    ),
    ("opening-buys30", "G3 upgrades in 0–30 (median ≥ 6)"),
    (
        "opening-receptionist",
        "G4 Receptionist affordable, min (every seed ≤ 10)",
    ),
    (
        "opening-wait30",
        "G6 longest forced wait 0–30, min (every seed ≤ 5)",
    ),
];

/// The gate bars: (row id, value, PASS).
fn bars(outs: &[Out], minutes: u64) -> Vec<(&'static str, String, bool)> {
    let w60 = minutes.min(60) * MIN;
    let w30 = minutes.min(30) * MIN;
    let never = |t: Option<u64>| t.map_or(f64::INFINITY, mins);
    let g1: Vec<f64> = outs.iter().map(|o| never(o.first_upgrade())).collect();
    let g2: Vec<f64> = outs.iter().map(|o| mins(o.longest_gap(w60))).collect();
    let g3: Vec<f64> = outs.iter().map(|o| o.upgrades_before(w30) as f64).collect();
    let g4: Vec<f64> = outs.iter().map(|o| never(o.receptionist)).collect();
    let g6: Vec<f64> = outs.iter().map(|o| mins(o.longest_wait(w30))).collect();
    let max = |v: &[f64]| v.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min = |v: &[f64]| v.iter().cloned().fold(f64::INFINITY, f64::min);
    let say = |m: f64, w: f64| format!("med {m:.1} · worst {w:.1}");
    vec![
        ("opening-first", say(median(&g1), max(&g1)), max(&g1) <= 3.0),
        (
            "opening-gap",
            say(median(&g2), max(&g2)),
            median(&g2) <= 6.0 && max(&g2) <= 10.0,
        ),
        (
            "opening-buys30",
            say(median(&g3), min(&g3)),
            median(&g3) >= 6.0,
        ),
        (
            "opening-receptionist",
            say(median(&g4), max(&g4)),
            max(&g4) <= 10.0,
        ),
        (
            "opening-wait30",
            say(median(&g6), max(&g6)),
            max(&g6) <= 5.0,
        ),
    ]
}

fn timeline(o: &Out) {
    println!("\nseed {} timeline (1×: a minute is 600 ticks)", o.seed);
    println!(
        "{:>4} {:>7} {:>5} {:>4} {:>4} {:>4} {:>4} {:>6} {:>6} {:<8} events",
        "min", "gold", "leg", "mrk", "runs", "dead", "best", "rest", "recov", "state"
    );
    let mut events: BTreeMap<u64, Vec<String>> = BTreeMap::new();
    for b in &o.buys {
        events.entry(b.t / MIN).or_default().push(format!(
            "BUY {} {}{}",
            b.label,
            b.cur.sign(),
            b.price
        ));
    }
    for (t, n) in &o.notes {
        events.entry(t / MIN).or_default().push(n.clone());
    }
    for &(a, b) in &o.waits {
        events.entry(a / MIN).or_default().push(format!(
            "WAIT {:.1} min (to {:.1})",
            mins(b - a),
            mins(b)
        ));
    }
    for s in &o.samples {
        let ev = events.remove(&s.min).unwrap_or_default().join(" · ");
        println!(
            "{:>4} {:>7} {:>5} {:>4} {:>4} {:>4} {:>4} {:>6.1} {:>6.1} {:<8} {}{}",
            s.min,
            s.gold,
            s.legacy,
            s.marks,
            s.runs,
            s.deaths,
            s.best,
            s.rest,
            s.recovery,
            s.state,
            ev,
            if s.next.is_empty() {
                String::new()
            } else {
                format!("  [next: {}]", s.next)
            }
        );
    }
    for (m, ev) in events {
        println!("{m:>4} {}", ev.join(" · "));
    }
    if let Some(a) = &o.absence {
        println!("absence: {a}");
    }
}

/// The metrics Forge 0/44 question (`metrics.rs:597-601`): what `kit::buy` returns on a fresh town and on the
/// metrics harness's lineage, before any blacksmith is built.
fn kit_check(seed: u64) {
    let mut g = Game::new(seed);
    g.build_town("house").unwrap();
    g.lineage.gold = 4000;
    println!(
        "kit::buy, fresh town (house, $4000, no blacksmith): {:?}; blacksmith built: {}",
        kit::buy(&mut g, "weapon"),
        town::built(&g.lineage, "blacksmith")
    );
    let mut h = Game::new_literal(seed);
    idlever_core::systems::open_all(&mut h.lineage);
    h.lineage.gold = 4000;
    println!(
        "kit::buy, metrics harness lineage (new_literal + open_all, $4000): {:?}; blacksmith built: {}; manual town: {}; forge plot ready: {}",
        kit::buy(&mut h, "weapon"),
        town::built(&h.lineage, "blacksmith"),
        h.lineage.town.manual,
        town::build_ready(&h.lineage, "blacksmith")
    );
}

fn arg<'a>(a: &'a [String], k: &str) -> Option<&'a str> {
    a.iter()
        .position(|x| x == k)
        .and_then(|i| a.get(i + 1))
        .map(String::as_str)
}

fn parse_secs(s: &str) -> u64 {
    let (n, mult) = match s.chars().last() {
        Some('h') => (&s[..s.len() - 1], 3600.0),
        Some('m') => (&s[..s.len() - 1], 60.0),
        Some('s') => (&s[..s.len() - 1], 1.0),
        _ => (s, 3600.0),
    };
    (n.parse::<f64>().expect("--absent: hours, e.g. 8h or 90m") * mult) as u64
}

fn main() {
    idlever_core::balance::configure_from_env().expect("valid immutable balance profile");
    let a: Vec<String> = std::env::args().collect();
    let rows_arg = arg(&a, "--rows");
    if rows_arg == Some("?") {
        eprintln!("opening rows (--rows ids or substrings):");
        for (id, key) in ROWS {
            eprintln!("  {id:<22} {key}");
        }
        std::process::exit(2);
    }
    let seeds: u64 = arg(&a, "--seeds").map_or(16, |s| s.parse().expect("--seeds N"));
    let minutes: u64 = arg(&a, "--minutes").map_or(60, |s| s.parse().expect("--minutes N"));
    let threads: usize = arg(&a, "--threads")
        .map_or_else(
            || {
                std::thread::available_parallelism()
                    .map_or(4, |n| n.get())
                    .min(16)
            },
            |s| s.parse().expect("--threads N"),
        )
        .max(1);
    let absent = arg(&a, "--absent").map(parse_secs);
    let wx: u64 = arg(&a, "--watch-x").map_or(1, |s| s.parse().expect("--watch-x N"));
    WATCH_X.set(wx.max(1)).expect("watch speed set once");
    let show: Option<u64> = arg(&a, "--timeline").map(|s| s.parse().expect("--timeline SEED"));
    if a.iter().any(|x| x == "--kit-check") {
        kit_check(1);
    }
    let picked: Vec<&str> = match rows_arg {
        Some(r) => {
            let want: Vec<&str> = r.split(',').filter(|s| !s.is_empty()).collect();
            let ids: Vec<&str> = ROWS
                .iter()
                .map(|r| r.0)
                .filter(|id| want.iter().any(|w| id.contains(w)))
                .collect();
            if ids.is_empty() {
                eprintln!("opening: no row matches `{r}` (--rows ? lists them)");
                std::process::exit(2);
            }
            ids
        }
        None => ROWS.iter().map(|r| r.0).collect(),
    };
    let t0 = std::time::Instant::now();
    let list: Vec<u64> = match show {
        Some(s) if s > seeds => (1..=seeds).chain([s]).collect(),
        _ => (1..=seeds).collect(),
    };
    let next = AtomicUsize::new(0);
    let res: Mutex<Vec<Out>> = Mutex::new(Vec::new());
    std::thread::scope(|sc| {
        for _ in 0..threads.min(list.len()) {
            sc.spawn(|| loop {
                let i = next.fetch_add(1, Ordering::Relaxed);
                let Some(&seed) = list.get(i) else { break };
                let o = play(seed, minutes, absent);
                res.lock().unwrap().push(o);
            });
        }
    });
    let mut all = res.into_inner().unwrap();
    all.sort_by_key(|o| o.seed);
    if let Some(s) = show {
        if let Some(o) = all.iter().find(|o| o.seed == s) {
            timeline(o);
        }
    }
    let outs: Vec<Out> = all.into_iter().filter(|o| o.seed <= seeds).collect();
    if outs.is_empty() {
        return; // (`--seeds 0 --timeline S`: the timeline alone)
    }
    let w60 = minutes.min(60) * MIN;
    let w30 = minutes.min(30) * MIN;
    let fmt = |t: Option<u64>| t.map_or("never".into(), |t| format!("{:.1}", mins(t)));
    println!(
        "\nopening probe ({} seeds, {} min at {}×{}): per seed",
        outs.len(),
        minutes,
        watch_x(),
        absent.map_or(String::new(), |s| format!(
            ", then {:.1} h away",
            s as f64 / 3600.0
        ))
    );
    println!(
        "{:>4} {:>6} {:>6} {:>5} {:>6} {:>6} {:>6} {:>5} {:>5} {:>6}  first upgrades",
        "seed", "G1", "G2", "G3", "G4", "G6", "forge", "runs", "dead", "gold"
    );
    for o in &outs {
        let last = o.samples.last().cloned().unwrap_or_default();
        let firsts: Vec<String> = o
            .buys
            .iter()
            .filter(|b| b.upgrade)
            .take(6)
            .map(|b| format!("{:.0}′ {} {}{}", mins(b.t), b.label, b.cur.sign(), b.price))
            .collect();
        println!(
            "{:>4} {:>6} {:>6.1} {:>5} {:>6} {:>6.1} {:>6} {:>5} {:>5} {:>6}  {}",
            o.seed,
            fmt(o.first_upgrade()),
            mins(o.longest_gap(w60)),
            o.upgrades_before(w30),
            fmt(o.receptionist),
            mins(o.longest_wait(w30)),
            fmt(o.forge_built),
            last.runs,
            last.deaths,
            last.gold,
            firsts.join(" · ")
        );
        if let Some(abs) = &o.absence {
            println!("       {abs}");
        }
    }
    let refusals: Vec<String> = outs
        .iter()
        .flat_map(|o| {
            o.kit_refusals
                .iter()
                .map(move |r| format!("seed {}: {r}", o.seed))
        })
        .collect();
    let built = outs.iter().filter(|o| o.forge_built.is_some()).count();
    let steps: usize = outs
        .iter()
        .map(|o| {
            o.buys
                .iter()
                .filter(|b| b.label.starts_with("forge "))
                .count()
        })
        .sum();
    println!(
        "kit::buy: forge built on {built}/{} seeds by minute {minutes}; {steps} forge steps bought; {} refusals of an affordable step{}",
        outs.len(),
        refusals.len(),
        if refusals.is_empty() { String::new() } else { format!(": {}", refusals.join("; ")) }
    );
    println!("\n{:<74}  {:>22}  result", "bar (targeted)", "value");
    let mut fails = 0;
    for (id, value, ok) in bars(&outs, minutes) {
        if !picked.contains(&id) {
            continue;
        }
        let key = ROWS.iter().find(|r| r.0 == id).unwrap().1;
        println!(
            "{key:<74}  {value:>22}  {}",
            if ok { "PASS" } else { "FAIL" }
        );
        fails += !ok as usize;
    }
    println!(
        "opening (targeted: {}, {} seeds, {:.0}s): {} — not a gate pass",
        picked.join(","),
        outs.len(),
        t0.elapsed().as_secs_f64(),
        if fails > 0 {
            "FAIL"
        } else {
            "targeted rows PASS"
        }
    );
    std::process::exit(if fails > 0 { 1 } else { 0 });
}
