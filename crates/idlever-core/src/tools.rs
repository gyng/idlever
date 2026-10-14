//! Cut225: the Clown's misdirection and the Engineer's one temporary construct.
//!
//! Everything here is reached only through `Run.tools`, which is `Some` only for a Clown or
//! Engineer run. The five original classes never allocate it, so their runs neither tick,
//! draw RNG, nor serialize anything new. All cooldowns and lifetimes are absolute run ticks
//! (`Run.turn`), so offline batches, slices and reloads cannot shorten or refresh them.
//!
//! Every verb is split into a pure `plan_*` (the legality check, which also names the refusal
//! reason) and an `apply_*`; a refused verb therefore changes nothing and returns control to
//! the next row.
use crate::chronicle::callout;
use crate::engine::{Ctx, Run, HERO_ID};
use crate::geom::{Pos, DIRS8};
use crate::hero::{class_has_verb, Class};
use crate::rules::Verb;
use crate::turn::{damage_monster, Src};
use crate::wire::Ev;
use serde::{Deserialize, Serialize};

fn is_zero(n: &u32) -> bool {
    *n == 0
}

// ---------------------------------------------------------------- numbers (Cut225 contract)

/// Bell lure: placement within this many tiles of the hero; foes this close to the bell (in
/// its line of sight) are drawn to it.
pub const LURE_RANGE: i32 = 4;
/// Owner tuning 2026-10-14 (Cut225): 20 → 30.
pub const LURE_TTL: u32 = 30;
pub const LURE_COOLDOWN: u32 = 40;
/// Owner tuning 2026-10-14: window 20 → 30, damage 4 → 10, cooldown 60 → 40, one → three
/// punishing blows per window (every ability costs an attack; the counter now repays it).
pub const COUNTER_WINDOW: u32 = 30;
pub const COUNTER_DAMAGE: i32 = 10;
pub const COUNTER_COOLDOWN: u32 = 40;
/// Punishing blows one armed window can deal (one per real adjacent melee miss).
pub const COUNTER_CHARGES: u32 = 3;
/// Owner tuning 2026-10-14: 10 → 30 (about three held moves; the boss cap stays 5).
pub const BOW_PAUSE: u32 = 30;
pub const BOW_BOSS_PAUSE: u32 = 5;
pub const BOW_RANGE: i32 = 4;
pub const BOW_COOLDOWN: u32 = 60;
pub const CURTAIN_COOLDOWN: u32 = 80;
/// A decoy left by Curtain when none stands (the hero's vacated tile).
pub const CURTAIN_DECOY_TTL: u32 = 10;
pub const JAPE_FOES: usize = 3;
pub const JAPE_BOSS_TICKS: u32 = 5;
pub const JAPE_COOLDOWN: u32 = 100;
/// A boss diverted or paused cannot be diverted again for this long (no chain-lock).
pub const BOSS_GUARD: u32 = 40;

/// Owner tuning 2026-10-14 ("turret stronger, mace weaker"): HP 12 → 16, shot 3 → 4.
pub const SENTRY_HP: i32 = 16;
pub const SENTRY_TTL: u32 = 60;
pub const SENTRY_SHOT: i32 = 4;
pub const SENTRY_INTERVAL: u32 = 10;
pub const SENTRY_RANGE: i32 = 4;
pub const DEPLOY_COOLDOWN: u32 = 60;
/// Placement distance from the hero (Surveyor +1).
pub const DEPLOY_RANGE: i32 = 1;
/// A visible threat this far from the hero can usefully enter a placed sentry's range.
pub const DEPLOY_THREAT: i32 = SENTRY_RANGE + 3;
pub const BRACE_TICKS: u32 = 20;
pub const BRACE_REDUCTION: i32 = 2;
pub const BRACE_COOLDOWN: u32 = 50;
pub const DISCHARGE_DAMAGE: i32 = 5;
pub const DISCHARGE_COOLDOWN: u32 = 60;
pub const RELOCATE_COOLDOWN: u32 = 40;
pub const OVERDRIVE_TICKS: u32 = 20;
pub const OVERDRIVE_INTERVAL: u32 = 5;
pub const OVERDRIVE_COOLDOWN: u32 = 100;
/// Owner tuning 2026-10-14: an Engineer's melee blows land 2 lighter (the mace 4–8 hits 2–6,
/// below the sword's 3–7); the construct carries the class's damage.
pub const ENGINEER_MELEE: i32 = 2;

/// The class verbs this module owns, in ladder order per class.
pub const CLOWN_VERBS: [&str; 5] = ["bell_lure", "turnabout", "false_bow", "curtain", "grand_jape"];
pub const ENGINEER_VERBS: [&str; 5] = ["deploy", "brace_sentry", "discharge", "relocate", "overdrive"];

pub fn is_verb(v: &str) -> bool {
    CLOWN_VERBS.contains(&v) || ENGINEER_VERBS.contains(&v) || v == "clown_tactic" || v == "engineer_tactic"
}

// ---------------------------------------------------------------- state

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Tool {
    Counter,
    Sentry,
}

impl Tool {
    pub fn cause(self) -> &'static str {
        match self {
            Tool::Counter => "counter",
            Tool::Sentry => "sentry",
        }
    }
    pub fn ranged(self) -> bool {
        self == Tool::Sentry
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Decoy {
    pub id: u32,
    pub pos: Pos,
    pub until: u32,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Sentry {
    pub id: u32,
    pub pos: Pos,
    pub hp: i32,
    pub max_hp: i32,
    pub until: u32,
    pub next_shot: u32,
    #[serde(default)]
    pub brace_until: u32,
    #[serde(default)]
    pub overdrive_until: u32,
}

/// A per-monster deadline (a pause, a jape's diversion, a boss's immunity).
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Hold {
    pub id: u32,
    pub until: u32,
}

/// What the tools actually did this run (receipts for traces, reports and comparisons).
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct ToolStats {
    #[serde(default)]
    pub lures: u32,
    /// Monster movements redirected toward (or held at) the decoy.
    #[serde(default)]
    pub lure_steps: u32,
    #[serde(default)]
    pub counters_armed: u32,
    #[serde(default)]
    pub counters: u32,
    #[serde(default)]
    pub counter_damage: u32,
    /// Counters that expired without a miss to punish.
    #[serde(default)]
    pub counters_wasted: u32,
    #[serde(default)]
    pub pauses: u32,
    #[serde(default)]
    pub pause_steps: u32,
    #[serde(default)]
    pub curtains: u32,
    #[serde(default)]
    pub japes: u32,
    #[serde(default)]
    pub japed: u32,
    #[serde(default)]
    pub decoys_wasted: u32,
    #[serde(default)]
    pub deploys: u32,
    #[serde(default)]
    pub shots: u32,
    #[serde(default)]
    pub shot_damage: u32,
    #[serde(default)]
    pub tool_kills: u32,
    #[serde(default)]
    pub sentry_ticks: u32,
    #[serde(default)]
    pub sentry_hits: u32,
    #[serde(default)]
    pub brace_absorbed: u32,
    #[serde(default)]
    pub braces: u32,
    #[serde(default)]
    pub discharges: u32,
    #[serde(default)]
    pub relocates: u32,
    #[serde(default)]
    pub overdrives: u32,
    #[serde(default)]
    pub expired: u32,
    #[serde(default)]
    pub destroyed: u32,
    /// Ticks a live sentry had no target in range (its lane was empty).
    #[serde(default)]
    pub idle_ticks: u32,
}

impl ToolStats {
    pub fn add(&mut self, o: &ToolStats) {
        self.lures += o.lures;
        self.lure_steps += o.lure_steps;
        self.counters_armed += o.counters_armed;
        self.counters += o.counters;
        self.counter_damage += o.counter_damage;
        self.counters_wasted += o.counters_wasted;
        self.pauses += o.pauses;
        self.pause_steps += o.pause_steps;
        self.curtains += o.curtains;
        self.japes += o.japes;
        self.japed += o.japed;
        self.decoys_wasted += o.decoys_wasted;
        self.deploys += o.deploys;
        self.shots += o.shots;
        self.shot_damage += o.shot_damage;
        self.tool_kills += o.tool_kills;
        self.sentry_ticks += o.sentry_ticks;
        self.sentry_hits += o.sentry_hits;
        self.brace_absorbed += o.brace_absorbed;
        self.braces += o.braces;
        self.discharges += o.discharges;
        self.relocates += o.relocates;
        self.overdrives += o.overdrives;
        self.expired += o.expired;
        self.destroyed += o.destroyed;
        self.idle_ticks += o.idle_ticks;
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Tools {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy: Option<Decoy>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sentry: Option<Sentry>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub paused: Vec<Hold>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub japed: Vec<Hold>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub boss_guard: Vec<Hold>,
    #[serde(default)]
    pub counter_until: u32,
    /// Counters already dealt in the armed window (a window holds `COUNTER_CHARGES`).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub counter_hits: u32,
    /// Absolute ready tick of each ladder ability (index = ladder position).
    #[serde(default)]
    pub ready: [u32; 5],
    /// The current decoy has drawn at least one foe (for the wasted-decoy receipt).
    #[serde(default)]
    pub decoy_used: bool,
    #[serde(default)]
    pub stats: ToolStats,
}

impl Tools {
    /// A sentry stands on its tile: monsters (and the hero) step around it. Decoys never block.
    pub fn blocks(&self, p: Pos) -> bool {
        self.sentry.is_some_and(|s| s.pos == p)
    }
    /// Something acts or expires on an exact tick (quiet batches stop for it).
    pub fn live(&self) -> bool {
        self.decoy.is_some() || self.sentry.is_some() || !self.paused.is_empty() || !self.japed.is_empty() || !self.boss_guard.is_empty() || self.counter_until > 0
    }
}

fn slot(verb: &str) -> Option<usize> {
    CLOWN_VERBS.iter().position(|v| *v == verb).or_else(|| ENGINEER_VERBS.iter().position(|v| *v == verb))
}

fn owns(run: &Run, verb: &str) -> bool {
    run.tools.is_some() && class_has_verb(run.hero.class, run.hero.level, verb)
}

fn cooling(run: &Run, verb: &str) -> bool {
    match (run.tools.as_ref(), slot(verb)) {
        (Some(t), Some(i)) => t.ready[i] > run.turn,
        _ => false,
    }
}

/// Remaining cooldown ticks of a tool verb (0 when ready or not a tool verb).
pub fn cooldown_left(run: &Run, verb: &str) -> u32 {
    match (run.tools.as_ref(), slot(verb)) {
        (Some(t), Some(i)) => t.ready[i].saturating_sub(run.turn),
        _ => 0,
    }
}

fn set_ready(run: &mut Run, verb: &str, cooldown: u32) {
    let now = run.turn;
    if let (Some(t), Some(i)) = (run.tools.as_mut(), slot(verb)) {
        t.ready[i] = now.saturating_add(cooldown);
    }
}

fn skill(run: &Run, class: Class, bit: u32) -> i32 {
    run.hero.skill(class, bit)
}

fn ticks(base: u32, delta: i32) -> u32 {
    (base as i32 + delta).max(1) as u32
}

fn hazard(run: &Run, p: Pos) -> bool {
    run.overlays.iter().any(|o| o.x == p.x && o.y == p.y)
}

fn free(run: &Run, p: Pos) -> bool {
    run.floor.map.in_bounds(p) && run.floor.map.passable(p) && !run.occupied(p) && !hazard(run, p)
}

fn hostile_alive(run: &Run, i: usize) -> bool {
    let m = &run.monsters[i];
    m.hp > 0 && m.hostile() && !m.dormant
}

/// A foe the bell can actually draw: awake, coming (not fleeing or afraid), not adjacent to the
/// hero and not a boss (a boss is diverted only by Grand jape, five ticks at most).
fn lure_eligible(run: &Run, i: usize) -> bool {
    let m = &run.monsters[i];
    hostile_alive(run, i) && m.awake && !m.fleeing && m.fear == 0 && !m.is_boss() && !m.pos.adjacent(run.hero.pos)
}

fn guarded(t: &Tools, id: u32, now: u32) -> bool {
    t.boss_guard.iter().any(|h| h.id == id && h.until > now)
}

fn emit(run: &Run, cx: &mut Ctx, id: u32, kind: &str, state: &str, (pos, until, hp): (Pos, u32, i32)) {
    cx.events.push(Ev::Tool { t: run.turn, id, kind: kind.into(), state: state.into(), x: pos.x, y: pos.y, until, hp });
}

fn log_use(run: &Run, cx: &mut Ctx, verb: &str) {
    crate::provenance::cooldown(run, cx, verb);
}

// ---------------------------------------------------------------- Clown plans

enum Plan {
    Lure(Pos),
    Counter,
    Bow(usize),
    Curtain(Pos),
    Jape(Vec<usize>),
    Deploy(Pos),
    Brace,
    Discharge(usize),
    Relocate(Pos),
    Overdrive,
}

/// The nearest visible hostile (ties by id), from `v.foes` (already sorted by distance, id).
fn nearest_threat(run: &Run, v: &crate::turn::View) -> Option<usize> {
    v.foes.iter().copied().find(|&i| hostile_alive(run, i))
}

fn plan_lure(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    let hp = run.hero.pos;
    let Some(ti) = v.foes.iter().copied().find(|&i| lure_eligible(run, i)) else {
        return Err(if v.foes.is_empty() {
            "no threat"
        } else if v.foes.iter().any(|&i| hostile_alive(run, i) && run.monsters[i].is_boss() && !run.monsters[i].pos.adjacent(hp)) {
            "boss resists"
        } else {
            "no target"
        });
    };
    if run.tools.as_ref().is_some_and(|t| t.decoy.is_some_and(|d| d.until > run.turn)) {
        return Err("decoy live");
    }
    let tp = run.monsters[ti].pos;
    let map = &run.floor.map;
    let mut best: Option<((i32, i32, i32, i32), Pos)> = None;
    for dy in -LURE_RANGE..=LURE_RANGE {
        for dx in -LURE_RANGE..=LURE_RANGE {
            let q = Pos::new(hp.x + dx, hp.y + dy);
            let d = q.cheb(hp);
            if !(2..=LURE_RANGE).contains(&d) || !free(run, q) || !map.is_visible(q) || !map.los(hp, q) || q.cheb(tp) > LURE_RANGE || !map.los(tp, q) {
                continue;
            }
            // Near the threat, far from the hero: the bell pulls the foe off its line.
            let key = (q.cheb(tp), -d, q.y, q.x);
            if best.is_none_or(|(k, _)| key < k) {
                best = Some((key, q));
            }
        }
    }
    best.map(|(_, q)| Plan::Lure(q)).ok_or("no space")
}

fn apply_lure(run: &mut Run, cx: &mut Ctx, q: Pos) -> bool {
    let until = run.turn + ticks(LURE_TTL, 5 * skill(run, Class::Clown, 0));
    let id = run.new_id();
    let t = run.tools.as_mut().unwrap();
    if t.decoy.is_some() && !t.decoy_used {
        t.stats.decoys_wasted += 1;
    }
    t.decoy = Some(Decoy { id, pos: q, until });
    t.decoy_used = false;
    t.stats.lures += 1;
    set_ready(run, "bell_lure", LURE_COOLDOWN);
    log_use(run, cx, "bell_lure");
    emit(run, cx, id, "decoy", "placed", (q, until, 0));
    callout(run, cx, "bell lure");
    true
}

fn plan_counter(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    let hp = run.hero.pos;
    if !v.foes.iter().any(|&i| hostile_alive(run, i) && run.monsters[i].pos.cheb(hp) <= 2) {
        return Err("no threat");
    }
    if run.tools.as_ref().is_some_and(|t| t.counter_until > run.turn) {
        return Err("armed");
    }
    Ok(Plan::Counter)
}

fn apply_counter(run: &mut Run, cx: &mut Ctx) -> bool {
    let until = run.turn + ticks(COUNTER_WINDOW, 5 * skill(run, Class::Clown, 4));
    let cd = ticks(COUNTER_COOLDOWN, -10 * skill(run, Class::Clown, 5));
    let t = run.tools.as_mut().unwrap();
    t.counter_until = until;
    t.counter_hits = 0;
    t.stats.counters_armed += 1;
    set_ready(run, "turnabout", cd);
    log_use(run, cx, "turnabout");
    callout(run, cx, "turnabout");
    true
}

fn bow_target(run: &Run, sel: &str, v: &crate::turn::View) -> Result<usize, &'static str> {
    let hp = run.hero.pos;
    let now = run.turn;
    let t = run.tools.as_ref().unwrap();
    let eligible = |i: usize| {
        let m = &run.monsters[i];
        hostile_alive(run, i) && m.awake && !m.fleeing && !m.pos.adjacent(hp) && m.pos.cheb(hp) <= BOW_RANGE && !t.paused.iter().any(|h| h.id == m.id && h.until > now)
    };
    let cands: Vec<usize> = v.foes.iter().copied().filter(|&i| eligible(i)).collect();
    if cands.is_empty() {
        return Err(if v.foes.is_empty() { "no threat" } else { "no target" });
    }
    let open: Vec<usize> = cands.iter().copied().filter(|&i| !(run.monsters[i].is_boss() && guarded(t, run.monsters[i].id, now))).collect();
    if open.is_empty() {
        return Err("boss resists");
    }
    let pick = match sel {
        "tag:boss" => open.iter().copied().find(|&i| run.monsters[i].is_boss()),
        "lowest" => open.iter().copied().min_by_key(|&i| (run.monsters[i].hp, run.monsters[i].id)),
        _ => open.first().copied(),
    };
    pick.ok_or("no target")
}

fn plan_bow(run: &Run, sel: &str, v: &crate::turn::View) -> Result<Plan, &'static str> {
    bow_target(run, sel, v).map(Plan::Bow)
}

fn apply_bow(run: &mut Run, cx: &mut Ctx, mi: usize) -> bool {
    let now = run.turn;
    let (id, boss, pos) = (run.monsters[mi].id, run.monsters[mi].is_boss(), run.monsters[mi].pos);
    let until = now + if boss { BOW_BOSS_PAUSE } else { BOW_PAUSE };
    let t = run.tools.as_mut().unwrap();
    t.paused.retain(|h| h.id != id);
    t.paused.push(Hold { id, until });
    if boss {
        t.boss_guard.retain(|h| h.id != id);
        t.boss_guard.push(Hold { id, until: until + BOSS_GUARD });
    }
    t.stats.pauses += 1;
    set_ready(run, "false_bow", BOW_COOLDOWN);
    log_use(run, cx, "false_bow");
    cx.events.push(Ev::Attack { t: now, src: HERO_ID, dst: id, dmg: 0, hit: true, verb: Some("false_bow".into()) });
    let _ = pos;
    callout(run, cx, "false bow");
    true
}

fn plan_curtain(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    let Some(ti) = nearest_threat(run, v) else { return Err("no threat") };
    let hp = run.hero.pos;
    let tp = run.monsters[ti].pos;
    let d = ((tp.x - hp.x).signum(), (tp.y - hp.y).signum());
    // Perpendicular steps, and the perpendicular-and-back diagonals (never toward the threat).
    let perp = [(-d.1, d.0), (d.1, -d.0)];
    let mut cands: Vec<(i32, i32)> = Vec::new();
    for p in perp {
        cands.push(p);
        let back = ((p.0 - d.0).signum(), (p.1 - d.1).signum());
        if back != (0, 0) {
            cands.push(back);
        }
    }
    let map = &run.floor.map;
    let threats: Vec<Pos> = v.foes.iter().copied().filter(|&i| hostile_alive(run, i)).map(|i| run.monsters[i].pos).collect();
    let best = cands
        .into_iter()
        .map(|s| hp.step(s))
        .filter(|q| *q != hp && map.can_step(hp, *q) && free(run, *q))
        .min_by_key(|q| (threats.iter().filter(|t| t.adjacent(*q)).count(), -q.cheb(tp), q.y, q.x));
    best.map(Plan::Curtain).ok_or("no space")
}

fn apply_curtain(run: &mut Run, cx: &mut Ctx, q: Pos) -> bool {
    let from = run.hero.pos;
    let now = run.turn;
    let cd = ticks(CURTAIN_COOLDOWN, -10 * skill(run, Class::Clown, 1));
    let keep = run.tools.as_ref().is_some_and(|t| t.decoy.is_some_and(|d| d.until > now));
    crate::ai::move_hero(run, cx, q);
    if !keep {
        let id = run.new_id();
        let until = now + CURTAIN_DECOY_TTL;
        let t = run.tools.as_mut().unwrap();
        t.decoy = Some(Decoy { id, pos: from, until });
        t.decoy_used = false;
        emit(run, cx, id, "decoy", "placed", (from, until, 0));
    }
    run.tools.as_mut().unwrap().stats.curtains += 1;
    set_ready(run, "curtain", cd);
    log_use(run, cx, "curtain");
    callout(run, cx, "curtain");
    true
}

fn plan_jape(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    let now = run.turn;
    let t = run.tools.as_ref().unwrap();
    let Some(d) = t.decoy.filter(|d| d.until > now) else { return Err("no decoy") };
    let hp = run.hero.pos;
    let cands: Vec<usize> = v.foes.iter().copied().filter(|&i| hostile_alive(run, i) && !run.monsters[i].pos.adjacent(hp) && run.monsters[i].pos.cheb(d.pos) > 1).collect();
    if cands.is_empty() {
        return Err(if v.foes.is_empty() { "no threat" } else { "no target" });
    }
    let cap = JAPE_FOES + skill(run, Class::Clown, 2) as usize;
    let open: Vec<usize> = cands.into_iter().filter(|&i| !(run.monsters[i].is_boss() && guarded(t, run.monsters[i].id, now))).take(cap).collect();
    if open.is_empty() {
        return Err("boss resists");
    }
    Ok(Plan::Jape(open))
}

fn apply_jape(run: &mut Run, cx: &mut Ctx, foes: Vec<usize>) -> bool {
    let now = run.turn;
    let t = run.tools.as_mut().unwrap();
    let d = t.decoy.unwrap();
    for &i in &foes {
        let (id, boss) = (run.monsters[i].id, run.monsters[i].is_boss());
        let until = if boss { (now + JAPE_BOSS_TICKS).min(d.until) } else { d.until };
        t.japed.retain(|h| h.id != id);
        t.japed.push(Hold { id, until });
        if boss {
            t.boss_guard.retain(|h| h.id != id);
            t.boss_guard.push(Hold { id, until: until + BOSS_GUARD });
        }
        t.stats.japed += 1;
    }
    t.stats.japes += 1;
    set_ready(run, "grand_jape", JAPE_COOLDOWN);
    log_use(run, cx, "grand_jape");
    for &i in &foes {
        let id = run.monsters[i].id;
        cx.events.push(Ev::Attack { t: now, src: d.id, dst: id, dmg: 0, hit: true, verb: Some("grand_jape".into()) });
    }
    callout(run, cx, "grand jape");
    true
}

// ---------------------------------------------------------------- Engineer plans

fn sentry_live(run: &Run) -> Option<Sentry> {
    run.tools.as_ref().and_then(|t| t.sentry)
}

/// Legal construct tiles near the hero: free, visible, not a corridor and with five open
/// neighbours (a sentry can never seal its owner into a one-tile passage).
fn placements(run: &Run, exclude: Option<Pos>) -> Vec<Pos> {
    let hp = run.hero.pos;
    let r = DEPLOY_RANGE + skill(run, Class::Engineer, 3);
    let map = &run.floor.map;
    let mut out = Vec::new();
    for dy in -r..=r {
        for dx in -r..=r {
            let q = Pos::new(hp.x + dx, hp.y + dy);
            if q == hp || Some(q) == exclude || !free(run, q) || !map.is_visible(q) || map.is_corridor(q) || !map.los(hp, q) {
                continue;
            }
            let open = DIRS8.iter().filter(|d| {
                let n = q.step(**d);
                map.in_bounds(n) && map.passable(n)
            }).count();
            if open >= 5 {
                out.push(q);
            }
        }
    }
    out
}

/// The placement that best covers the nearest threat (in range and sight first, then nearest).
fn best_placement(run: &Run, cands: &[Pos], tp: Pos) -> Option<Pos> {
    let map = &run.floor.map;
    cands.iter().copied().min_by_key(|q| (!(q.cheb(tp) <= SENTRY_RANGE && map.los(*q, tp)), q.cheb(tp), q.y, q.x))
}

fn plan_deploy(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    if sentry_live(run).is_some() {
        return Err("construct live");
    }
    let hp = run.hero.pos;
    let Some(ti) = v.foes.iter().copied().find(|&i| hostile_alive(run, i) && run.monsters[i].pos.cheb(hp) <= DEPLOY_THREAT) else {
        return Err("no threat");
    };
    let cands = placements(run, None);
    best_placement(run, &cands, run.monsters[ti].pos).map(Plan::Deploy).ok_or("no space")
}

fn apply_deploy(run: &mut Run, cx: &mut Ctx, q: Pos) -> bool {
    let now = run.turn;
    let hp_max = SENTRY_HP + 4 * skill(run, Class::Engineer, 0);
    let cd = ticks(DEPLOY_COOLDOWN, -10 * skill(run, Class::Engineer, 5));
    let id = run.new_id();
    let s = Sentry { id, pos: q, hp: hp_max, max_hp: hp_max, until: now + SENTRY_TTL, next_shot: now + SENTRY_INTERVAL, brace_until: 0, overdrive_until: 0 };
    let t = run.tools.as_mut().unwrap();
    t.sentry = Some(s);
    t.stats.deploys += 1;
    set_ready(run, "deploy", cd);
    log_use(run, cx, "deploy");
    emit(run, cx, id, "sentry", "placed", (q, s.until, s.hp));
    callout(run, cx, "deploy");
    true
}

fn plan_brace(run: &Run) -> Result<Plan, &'static str> {
    let Some(s) = sentry_live(run) else { return Err("no construct") };
    if s.brace_until > run.turn {
        return Err("braced");
    }
    Ok(Plan::Brace)
}

fn apply_brace(run: &mut Run, cx: &mut Ctx) -> bool {
    let now = run.turn;
    let t = run.tools.as_mut().unwrap();
    let s = t.sentry.as_mut().unwrap();
    s.brace_until = now + BRACE_TICKS;
    let s = *s;
    t.stats.braces += 1;
    set_ready(run, "brace_sentry", BRACE_COOLDOWN);
    log_use(run, cx, "brace_sentry");
    emit(run, cx, s.id, "sentry", "braced", (s.pos, s.until, s.hp));
    callout(run, cx, "brace");
    true
}

/// The construct's target: the nearest visible hostile in its range and line of sight.
fn sentry_target(run: &Run, s: &Sentry) -> Option<usize> {
    let map = &run.floor.map;
    (0..run.monsters.len())
        .filter(|&i| {
            let m = &run.monsters[i];
            hostile_alive(run, i) && map.is_visible(m.pos) && m.pos.cheb(s.pos) <= SENTRY_RANGE && map.los(s.pos, m.pos)
        })
        .min_by_key(|&i| (run.monsters[i].pos.cheb(s.pos), run.monsters[i].id))
}

fn plan_discharge(run: &Run) -> Result<Plan, &'static str> {
    let Some(s) = sentry_live(run) else { return Err("no construct") };
    sentry_target(run, &s).map(Plan::Discharge).ok_or("no target")
}

fn plan_relocate(run: &Run, v: &crate::turn::View) -> Result<Plan, &'static str> {
    let Some(s) = sentry_live(run) else { return Err("no construct") };
    let cands = placements(run, Some(s.pos));
    let tp = nearest_threat(run, v).map(|i| run.monsters[i].pos).unwrap_or(run.hero.pos);
    best_placement(run, &cands, tp).map(Plan::Relocate).ok_or("no space")
}

fn plan_overdrive(run: &Run) -> Result<Plan, &'static str> {
    let Some(s) = sentry_live(run) else { return Err("no construct") };
    if s.overdrive_until > run.turn {
        return Err("overdrive on");
    }
    Ok(Plan::Overdrive)
}

fn apply_relocate(run: &mut Run, cx: &mut Ctx, q: Pos) -> bool {
    let cd = ticks(RELOCATE_COOLDOWN, -10 * skill(run, Class::Engineer, 4));
    let t = run.tools.as_mut().unwrap();
    let s = t.sentry.as_mut().unwrap();
    // No heal, no lifetime refresh, no recycled shot: only the tile changes.
    s.pos = q;
    let s = *s;
    t.stats.relocates += 1;
    set_ready(run, "relocate", cd);
    log_use(run, cx, "relocate");
    emit(run, cx, s.id, "sentry", "moved", (q, s.until, s.hp));
    callout(run, cx, "relocate");
    true
}

fn apply_overdrive(run: &mut Run, cx: &mut Ctx) -> bool {
    let now = run.turn;
    let dur = ticks(OVERDRIVE_TICKS, 5 * skill(run, Class::Engineer, 2));
    let t = run.tools.as_mut().unwrap();
    let s = t.sentry.as_mut().unwrap();
    s.overdrive_until = now + dur;
    // The next shot comes no later than one overdrive interval away (never an instant shot).
    s.next_shot = s.next_shot.min(now + OVERDRIVE_INTERVAL);
    let s = *s;
    t.stats.overdrives += 1;
    set_ready(run, "overdrive", OVERDRIVE_COOLDOWN);
    log_use(run, cx, "overdrive");
    emit(run, cx, s.id, "sentry", "overdrive", (s.pos, s.until, s.hp));
    callout(run, cx, "overdrive");
    true
}

/// A physical tool blow: normal armour, then the ordinary damage pipeline (reflection, the
/// counter table, the shield wall) with the tool as its named source.
fn tool_hit(run: &mut Run, cx: &mut Ctx, mi: usize, amount: i32, src_id: u32, tool: Tool, verb: &str) -> i32 {
    let dmg = (amount - run.monsters[mi].effective_def()).max(0);
    let (id, from, to) = (run.monsters[mi].id, run.tools.as_ref().and_then(|t| t.sentry).map_or(run.hero.pos, |s| s.pos), run.monsters[mi].pos);
    if tool == Tool::Sentry {
        crate::ai::projectile(run, cx, src_id, id, from, to);
    }
    cx.events.push(Ev::Attack { t: run.turn, src: src_id, dst: id, dmg, hit: true, verb: Some(verb.into()) });
    let before = run.monsters[mi].hp;
    if dmg > 0 {
        damage_monster(run, cx, mi, dmg, &Src::Tool(tool));
    }
    let landed = (before - run.monsters[mi].hp.max(0)).max(0);
    if let Some(t) = run.tools.as_mut() {
        if run.monsters[mi].hp <= 0 {
            t.stats.tool_kills += 1;
        }
    }
    landed
}

fn apply_discharge(run: &mut Run, cx: &mut Ctx, mi: usize) -> bool {
    let s = sentry_live(run).unwrap();
    let landed = sentry_shot(run, cx, &s, mi, DISCHARGE_DAMAGE, "discharge");
    let t = run.tools.as_mut().unwrap();
    t.stats.discharges += 1;
    t.stats.shot_damage += landed as u32;
    // The construct's remaining life is spent on the shot.
    t.sentry = None;
    set_ready(run, "discharge", DISCHARGE_COOLDOWN);
    log_use(run, cx, "discharge");
    emit(run, cx, s.id, "sentry", "discharged", (s.pos, run.turn, 0));
    callout(run, cx, "discharge");
    true
}

/// One construct shot (or discharge): a reflecting target sends it back into the construct.
fn sentry_shot(run: &mut Run, cx: &mut Ctx, s: &Sentry, mi: usize, amount: i32, verb: &str) -> i32 {
    if run.monsters[mi].reflects_ranged() {
        let (id, to) = (run.monsters[mi].id, run.monsters[mi].pos);
        crate::ai::projectile(run, cx, s.id, id, s.pos, to);
        cx.events.push(Ev::Attack { t: run.turn, src: id, dst: s.id, dmg: amount, hit: true, verb: Some("reflect".into()) });
        hurt_sentry(run, cx, amount);
        return 0;
    }
    tool_hit(run, cx, mi, amount, s.id, Tool::Sentry, verb)
}

/// Damage to the construct (brace reduces each hit); at 0 HP it is destroyed.
fn hurt_sentry(run: &mut Run, cx: &mut Ctx, dmg: i32) {
    let now = run.turn;
    let reduce = BRACE_REDUCTION + skill(run, Class::Engineer, 1);
    let t = run.tools.as_mut().unwrap();
    let Some(s) = t.sentry.as_mut() else { return };
    let braced = s.brace_until > now;
    let taken = if braced { (dmg - reduce).max(0) } else { dmg };
    if braced {
        t.stats.brace_absorbed += (dmg - taken) as u32;
    }
    s.hp -= taken;
    t.stats.sentry_hits += 1;
    let s = *s;
    if s.hp <= 0 {
        t.sentry = None;
        t.stats.destroyed += 1;
        emit(run, cx, s.id, "sentry", "destroyed", (s.pos, now, 0));
        callout(run, cx, "sentry down");
    }
}

// ---------------------------------------------------------------- dispatch

fn plan(run: &Run, verb: &Verb, v: &crate::turn::View) -> Result<Plan, &'static str> {
    if !owns(run, &verb.v) {
        return Err("class locked");
    }
    if cooling(run, &verb.v) {
        return Err("cooldown");
    }
    let sel = verb.a.as_deref().unwrap_or("nearest");
    match verb.v.as_str() {
        "bell_lure" => plan_lure(run, v),
        "turnabout" => plan_counter(run, v),
        "false_bow" => plan_bow(run, sel, v),
        "curtain" => plan_curtain(run, v),
        "grand_jape" => plan_jape(run, v),
        "deploy" => plan_deploy(run, v),
        "brace_sentry" => plan_brace(run),
        "discharge" => plan_discharge(run),
        "relocate" => plan_relocate(run, v),
        "overdrive" => plan_overdrive(run),
        _ => Err("no use"),
    }
}

fn apply(run: &mut Run, cx: &mut Ctx, p: Plan) -> bool {
    match p {
        Plan::Lure(q) => apply_lure(run, cx, q),
        Plan::Counter => apply_counter(run, cx),
        Plan::Bow(mi) => apply_bow(run, cx, mi),
        Plan::Curtain(q) => apply_curtain(run, cx, q),
        Plan::Jape(f) => apply_jape(run, cx, f),
        Plan::Deploy(q) => apply_deploy(run, cx, q),
        Plan::Brace => apply_brace(run, cx),
        Plan::Discharge(mi) => apply_discharge(run, cx, mi),
        Plan::Relocate(q) => apply_relocate(run, cx, q),
        Plan::Overdrive => apply_overdrive(run, cx),
    }
}

fn try_one(run: &mut Run, cx: &mut Ctx, verb: &str, v: &crate::turn::View) -> bool {
    match plan(run, &Verb::new(verb), v) {
        Ok(p) => apply(run, cx, p),
        Err(_) => false,
    }
}

/// A row's tool verb: acts (spending the hero's action) or refuses with no change.
pub fn act(run: &mut Run, cx: &mut Ctx, verb: &Verb, v: &crate::turn::View) -> bool {
    match verb.v.as_str() {
        "clown_tactic" => clown_tactic(run, cx, v),
        "engineer_tactic" => engineer_tactic(run, cx, v),
        _ => match plan(run, verb, v) {
            Ok(p) => apply(run, cx, p),
            Err(_) => false,
        },
    }
}

/// Why a tool verb could not act (≤ 2 words), from the same pure plan the action uses.
pub fn refusal(run: &Run, verb: &Verb, v: &crate::turn::View) -> &'static str {
    match verb.v.as_str() {
        "clown_tactic" | "engineer_tactic" => {
            if run.tools.is_none() {
                "class locked"
            } else if v.foes.is_empty() {
                "no threat"
            } else {
                "no use"
            }
        }
        _ => plan(run, verb, v).err().unwrap_or("no use"),
    }
}

// ---------------------------------------------------------------- default class policy

/// The Clown's default policy: escape when hurt and pressed, arm a counter when engaged,
/// bell the approaching foe, gather a crowd at the bell, pause a second foe. Nothing fires
/// without a visible threat, so quiet actions are never spent on props.
fn clown_tactic(run: &mut Run, cx: &mut Ctx, v: &crate::turn::View) -> bool {
    if run.hero.class != Class::Clown || v.foes.is_empty() {
        return false;
    }
    let hp_pct = run.hero.hp_pct();
    let adj = v.adj;
    if adj > 0 && hp_pct < 50 && try_one(run, cx, "curtain", v) {
        return true;
    }
    // A counter only pays when several blows are coming (one punish per window).
    if adj >= 2 && try_one(run, cx, "turnabout", v) {
        return true;
    }
    let hp = run.hero.pos;
    // Approaching foes that would join the fight: awake, not adjacent, within five tiles.
    let joining = v.foes.iter().filter(|&&i| lure_eligible(run, i) && run.monsters[i].pos.cheb(hp) <= 5).count();
    if adj > 0 && joining >= 1 && try_one(run, cx, "bell_lure", v) {
        return true;
    }
    if joining >= 2 && try_one(run, cx, "grand_jape", v) {
        return true;
    }
    if adj > 0 && joining >= 1 && try_one(run, cx, "false_bow", v) {
        return true;
    }
    false
}

/// The Engineer's default policy: deploy only when a visible threat can enter the sentry's
/// range, brace it under attack, overdrive into a crowd, move it when its lane is empty and
/// spend its last ticks as a discharge.
fn engineer_tactic(run: &mut Run, cx: &mut Ctx, v: &crate::turn::View) -> bool {
    if run.hero.class != Class::Engineer || v.foes.is_empty() {
        return false;
    }
    let Some(s) = sentry_live(run) else {
        return try_one(run, cx, "deploy", v);
    };
    let now = run.turn;
    let attackers = run.monsters.iter().filter(|m| m.hp > 0 && m.hostile() && m.pos.adjacent(s.pos)).count();
    if attackers > 0 && try_one(run, cx, "brace_sentry", v) {
        return true;
    }
    let in_lane = (0..run.monsters.len()).filter(|&i| hostile_alive(run, i) && run.floor.map.is_visible(run.monsters[i].pos) && run.monsters[i].pos.cheb(s.pos) <= SENTRY_RANGE && run.floor.map.los(s.pos, run.monsters[i].pos)).count();
    if in_lane >= 2 && try_one(run, cx, "overdrive", v) {
        return true;
    }
    if in_lane == 0 && try_one(run, cx, "relocate", v) {
        return true;
    }
    if s.until.saturating_sub(now) <= SENTRY_INTERVAL && in_lane > 0 && try_one(run, cx, "discharge", v) {
        return true;
    }
    false
}

/// The class's default policy row (Gunner's pattern): one autonomous row after chosen policy.
pub fn row(l: &crate::engine::LineageState) -> Option<crate::rules::Row> {
    match l.class {
        Class::Clown => Some(crate::rules::Row::new(vec![], Verb::new("clown_tactic")).from("class:clown")),
        Class::Engineer => Some(crate::rules::Row::new(vec![], Verb::new("engineer_tactic")).from("class:engineer")),
        _ => None,
    }
}

// ---------------------------------------------------------------- the world's side

/// A hostile's movement under the tools (called from `ai::chase` when the hero is not
/// adjacent). Returns true when the tools spent the monster's move: paused, hitting the
/// construct in its way, or drawn toward / held at the decoy. Telegraphed (pending) strikes
/// are never touched here: they resolve in `monster_act` before any chase.
pub fn chase_override(run: &mut Run, cx: &mut Ctx, mi: usize) -> bool {
    let now = run.turn;
    let Some(t) = run.tools.as_ref() else { return false };
    let m = &run.monsters[mi];
    if !m.hostile() || m.hp <= 0 {
        return false;
    }
    let (id, mp, boss) = (m.id, m.pos, m.is_boss());
    if t.paused.iter().any(|h| h.id == id && h.until > now) {
        run.tools.as_mut().unwrap().stats.pause_steps += 1;
        return true;
    }
    if let Some(s) = t.sentry {
        if s.pos.adjacent(mp) {
            attack_sentry(run, cx, mi);
            return true;
        }
    }
    let Some(d) = t.decoy.filter(|d| d.until > now) else { return false };
    let japed = t.japed.iter().any(|h| h.id == id && h.until > now);
    let drawn = japed || (!boss && mp.cheb(d.pos) <= LURE_RANGE && run.floor.map.los(mp, d.pos));
    if !drawn {
        return false;
    }
    let t = run.tools.as_mut().unwrap();
    t.stats.lure_steps += 1;
    t.decoy_used = true;
    if mp.cheb(d.pos) <= 1 {
        // At the bell: it looks, and loses the move.
        return true;
    }
    let map = &run.floor.map;
    let water_only = run.monsters[mi].has_tag("water");
    let step = DIRS8
        .iter()
        .map(|dd| mp.step(*dd))
        .filter(|q| map.can_step(mp, *q) && !run.occupied(*q) && (!water_only || map.get(*q) == crate::tiles::Tile::Water))
        .min_by_key(|q| (q.cheb(d.pos), q.x, q.y));
    match step {
        Some(q) if q.cheb(d.pos) < mp.cheb(d.pos) => {
            crate::ai::move_monster(run, cx, mi, q);
            true
        }
        _ => false,
    }
}

fn attack_sentry(run: &mut Run, cx: &mut Ctx, mi: usize) {
    let Some(s) = sentry_live(run) else { return };
    let atk = run.monsters[mi].effective_atk();
    let (hit, dmg) = crate::ai::roll_hit(&mut run.rng, atk, 0);
    let id = run.monsters[mi].id;
    cx.events.push(Ev::Attack { t: run.turn, src: id, dst: s.id, dmg, hit, verb: Some("attack".into()) });
    if hit && dmg > 0 {
        hurt_sentry(run, cx, dmg);
    }
}

/// A real adjacent melee miss on the hero while a counter is armed: one punishing blow.
pub fn on_miss(run: &mut Run, cx: &mut Ctx, mi: usize) {
    let now = run.turn;
    let Some(t) = run.tools.as_mut() else { return };
    if t.counter_until <= now || !run.monsters[mi].pos.adjacent(run.hero.pos) || !run.monsters[mi].hostile() {
        return;
    }
    t.counter_hits += 1;
    if t.counter_hits >= COUNTER_CHARGES {
        t.counter_until = 0;
        t.counter_hits = 0;
    }
    t.stats.counters += 1;
    let amount = COUNTER_DAMAGE + skill(run, Class::Clown, 3);
    let landed = tool_hit(run, cx, mi, amount, HERO_ID, Tool::Counter, "counter");
    run.tools.as_mut().unwrap().stats.counter_damage += landed as u32;
    callout(run, cx, "turnabout!");
}

/// Per-tick upkeep (only for runs with tools): expiries and the construct's shots.
pub fn tick(run: &mut Run, cx: &mut Ctx) {
    let now = run.turn;
    let Some(t) = run.tools.as_mut() else { return };
    t.paused.retain(|h| h.until > now);
    t.japed.retain(|h| h.until > now);
    t.boss_guard.retain(|h| h.until > now);
    if t.counter_until > 0 && t.counter_until <= now {
        t.counter_until = 0;
        if t.counter_hits == 0 {
            t.stats.counters_wasted += 1;
        }
        t.counter_hits = 0;
    }
    if let Some(d) = t.decoy.filter(|d| d.until <= now) {
        if !t.decoy_used {
            t.stats.decoys_wasted += 1;
        }
        t.decoy = None;
        t.decoy_used = false;
        emit(run, cx, d.id, "decoy", "expired", (d.pos, d.until, 0));
    }
    let Some(s) = sentry_live(run) else { return };
    if s.until <= now {
        let t = run.tools.as_mut().unwrap();
        t.sentry = None;
        t.stats.expired += 1;
        emit(run, cx, s.id, "sentry", "expired", (s.pos, s.until, s.hp));
        return;
    }
    run.tools.as_mut().unwrap().stats.sentry_ticks += 1;
    if now < s.next_shot {
        return;
    }
    let Some(mi) = sentry_target(run, &s) else {
        run.tools.as_mut().unwrap().stats.idle_ticks += 1;
        return;
    };
    let interval = if s.overdrive_until > now { OVERDRIVE_INTERVAL } else { SENTRY_INTERVAL };
    if let Some(live) = run.tools.as_mut().unwrap().sentry.as_mut() {
        live.next_shot = now + interval;
    }
    run.tools.as_mut().unwrap().stats.shots += 1;
    let landed = sentry_shot(run, cx, &s, mi, SENTRY_SHOT, "sentry");
    if let Some(t) = run.tools.as_mut() {
        t.stats.shot_damage += landed as u32;
    }
}

/// The floor is left: the decoy and the construct stay behind (expired), holds clear.
pub fn leave_floor(run: &mut Run, cx: &mut Ctx) {
    let now = run.turn;
    let Some(t) = run.tools.as_mut() else { return };
    let decoy = t.decoy.take();
    let sentry = t.sentry.take();
    t.paused.clear();
    t.japed.clear();
    t.boss_guard.clear();
    if decoy.is_some() && !t.decoy_used {
        t.stats.decoys_wasted += 1;
    }
    t.decoy_used = false;
    if sentry.is_some() {
        t.stats.expired += 1;
    }
    if let Some(d) = decoy {
        emit(run, cx, d.id, "decoy", "expired", (d.pos, now, 0));
    }
    if let Some(s) = sentry {
        emit(run, cx, s.id, "sentry", "expired", (s.pos, now, s.hp));
    }
}

// ---------------------------------------------------------------- descriptors (wire)

/// Cut225: one tool ability as the client shows it — canonical level, cooldown and state.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct AbilityView {
    pub verb: String,
    pub level: u32,
    pub owned: bool,
    /// Remaining cooldown ticks (0 when ready).
    pub cooldown: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct DecoyView {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    /// Remaining lifetime ticks.
    pub ttl: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SentryView {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub ttl: u32,
    pub range: i32,
    pub next_shot: u32,
    pub braced: bool,
    pub overdrive: bool,
    /// The construct's current target (None when its lane is empty).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<u32>,
}

/// Cut225: the live tool view on the snapshot (only for Clown/Engineer runs).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ToolsView {
    pub abilities: Vec<AbilityView>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decoy: Option<DecoyView>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sentry: Option<SentryView>,
    /// Remaining ticks of an armed counter (0 when none).
    #[serde(default)]
    pub counter: u32,
    pub stats: ToolStats,
}

pub fn view(run: &Run) -> Option<ToolsView> {
    let t = run.tools.as_ref()?;
    let now = run.turn;
    let class = run.hero.class;
    let abilities = crate::hero::class_ladder(class)
        .iter()
        .map(|(verb, level)| AbilityView { verb: (*verb).into(), level: *level, owned: run.hero.level >= *level, cooldown: cooldown_left(run, verb) })
        .collect();
    Some(ToolsView {
        abilities,
        decoy: t.decoy.map(|d| DecoyView { id: d.id, x: d.pos.x, y: d.pos.y, ttl: d.until.saturating_sub(now) }),
        sentry: t.sentry.map(|s| SentryView {
            id: s.id,
            x: s.pos.x,
            y: s.pos.y,
            hp: s.hp,
            max_hp: s.max_hp,
            ttl: s.until.saturating_sub(now),
            range: SENTRY_RANGE,
            next_shot: s.next_shot.saturating_sub(now),
            braced: s.brace_until > now,
            overdrive: s.overdrive_until > now,
            target: sentry_target(run, &s).map(|i| run.monsters[i].id),
        }),
        counter: t.counter_until.saturating_sub(now),
        stats: t.stats.clone(),
    })
}

#[cfg(test)]
#[path = "tools_tests.rs"]
mod tests;
