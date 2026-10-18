//! Cut263 (docs/CUT263_ACHIEVEMENTS.md) and Cut269 (docs/CUT269_ACHIEVEMENTS_V2.md): the lifetime achievement list,
//! called "Achievements" in the game (the internal ids stay `honours`). An observer only: the checks read settled
//! lineage and run state, and the run's observation marks (`RunMarks`, recorded on real runs only), and write nothing
//! but `LineageState::honours` and `Run::honours`, which no run, sim, forecast, price or bot reads. A sim clone never
//! earns (`Game::sim`, `Ctx::sim`). Unlocks record the lineage day (never a wall clock), so the same seed, rules and
//! elapsed time earn the same achievements.
//!
//! Rewards: none (the owner, 2026-10-18: "pure cosmetic"). Trophies keep their own marks; no achievement mirrors one.
use crate::engine::{ExitTier, Game, LineageState, Run};
use serde::{Deserialize, Serialize};
use std::cell::Cell;
use std::collections::{BTreeMap, BTreeSet};

/// The save's version: an older save earns its state-derived achievements silently on load (`migrate`).
/// 1 = Cut263's list, 2 = Cut269's.
pub const VERSION: u32 = 2;

thread_local! {
    /// Tests only: the observer switched off entirely (G2: a game with and without it is the same game).
    static OFF: Cell<bool> = const { Cell::new(false) };
}
/// `IDLEVER_HONOURS_OFF=1` (diagnostics: the dayplayer's G2 on/off comparison) switches the observer off too.
fn off() -> bool {
    static ENV: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    *ENV.get_or_init(|| std::env::var_os("IDLEVER_HONOURS_OFF").is_some_and(|v| v == "1")) || OFF.with(|c| c.get())
}
#[cfg(test)]
pub(crate) fn set_off(v: bool) {
    OFF.with(|c| c.set(v));
}

/// One lineage's achievements.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Honours {
    #[serde(default)]
    pub v: u32,
    /// Id → the lineage day (1-based, `feats::day_of`) it was earned.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub earned: BTreeMap<String, u32>,
    /// Earned entries the camp has shown (`seen`); the rest toast once.
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub seen: BTreeSet<String>,
    /// (Cut263's `causes` count; retired with its entry, kept readable for old saves.)
    #[serde(default, skip_serializing)]
    pub causes: BTreeSet<String>,
    /// Cut269 counted entries: the classes that slew a band boss (`m_every`), the builds and pet builds worn when a
    /// boss fell (`b_seven`, `b_kennel`), the oath kinds kept (`c_vows`).
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub class_bosses: BTreeSet<String>,
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub builds: BTreeSet<String>,
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub pet_builds: BTreeSet<String>,
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub oaths: BTreeSet<String>,
}

impl Honours {
    pub fn is_default(&self) -> bool {
        self == &Honours::default()
    }
    pub fn current() -> Self {
        Honours { v: VERSION, ..Default::default() }
    }
}

/// How a boss's killing blow landed (`Kill.by`).
pub fn blow_by(run: &Run, src: &crate::turn::Src) -> &'static str {
    use crate::turn::Src;
    match src {
        Src::Hero { ranged: false } => "hero",
        Src::Hero { ranged: true } => "ranged",
        Src::Mon(j) | Src::Reflect(j) => match run.monsters.get(*j) {
            Some(m) if m.ally && m.cid.is_some() => "pet",
            Some(m) if m.ally => "ally",
            _ => "other",
        },
        Src::Fire => "fire",
        Src::Gas | Src::Burst => "gas",
        Src::Poison => "poison",
        Src::Tool(crate::tools::Tool::Counter) => "counter",
        Src::Tool(crate::tools::Tool::Sentry) => "sentry",
    }
}

/// One boss's fall as the observer saw it.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Kill {
    pub kind: String,
    pub depth: u32,
    /// `blow_by`.
    pub by: String,
    pub hp: i32,
    pub max_hp: i32,
    /// No blow on the hero since the boss came into view (`Run::hurt_since_boss`).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub untouched: bool,
    #[serde(default)]
    pub drinks: u32,
    /// The hero had struck in melee this run before the blow.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub melee: bool,
    /// A mender's revive had happened this run before the blow.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub revived: bool,
    /// Living allies at the blow.
    #[serde(default)]
    pub allies: u32,
}

/// A real run's observation marks (`Run::honours`): what the send held, and each boss's fall.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct RunMarks {
    /// The marks were taken at the send (a run from before Cut269 has none: its send-time checks wait).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub sent: bool,
    /// The send's compiled set: its rows, a written whole stance, whether it holds a `bank` / `return` row.
    #[serde(default)]
    pub rows: u32,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub custom: bool,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub exit_rows: bool,
    /// `packages::build_mask` of the send's set.
    #[serde(default)]
    pub builds: u8,
    /// Companions that walked down with the heir.
    #[serde(default)]
    pub party: u32,
    /// The band bosses met before this send (`pkg.meets`).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub met: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub kills: Vec<Kill>,
}

impl RunMarks {
    pub fn is_default(&self) -> bool {
        self == &RunMarks::default()
    }
}

/// The send's marks (`Game::start_run`, a real send only).
pub fn at_send(run: &mut Run, l: &LineageState) {
    if off() {
        return;
    }
    let rules = l.rules();
    let party = run.monsters.iter().filter(|m| m.ally && m.cid.is_some()).count() as u32;
    run.honours = RunMarks {
        sent: true,
        rows: rules.rows.len() as u32,
        custom: !l.pkg.literal && l.pkg.stance == crate::packages::CUSTOM,
        exit_rows: rules.rows.iter().any(|r| matches!(r.verb.v.as_str(), "bank" | "return")),
        builds: crate::packages::build_mask(rules),
        party,
        met: l.pkg.meets.keys().cloned().collect(),
        kills: Vec::new(),
    };
}

/// A boss's killing blow (`turn::damage_monster_with_bonus`, a real run only: `!cx.sim`).
pub fn on_boss_kill(run: &mut Run, kind: &str, src: &crate::turn::Src) {
    if off() {
        return;
    }
    let by = blow_by(run, src).to_string();
    let allies = run.monsters.iter().filter(|m| m.ally && m.hp > 0).count() as u32;
    run.honours.kills.push(Kill {
        kind: kind.into(),
        depth: run.depth,
        by,
        hp: run.hero.hp,
        max_hp: run.hero.max_hp,
        untouched: !run.hurt_since_boss,
        drinks: run.drinks,
        melee: run.melee_used,
        revived: run.pets.revived,
        allies,
    });
}

/// What a check sees: the lineage, the run just finished (with its exit) and the session's bloodline count (0 when
/// the caller cannot know it: a session-only entry then waits for the session's own sweep).
pub struct Seen<'a> {
    pub l: &'a LineageState,
    pub run: Option<(&'a Run, ExitTier)>,
    pub bloodlines: u32,
}

/// A counted entry's `(n, of)` from the lineage.
pub type Progress = fn(&LineageState) -> (u32, u32);

/// An achievement: data, a check and (for a counted one) its progress.
pub struct Def {
    pub id: &'static str,
    /// ≤ 3 words (the callout budget): the toast says it.
    pub name: &'static str,
    /// ≤ 5 words (the quest_goal budget), no sentence; never sent while a secret is unearned.
    pub goal: &'static str,
    pub group: &'static str,
    pub secret: bool,
    pub check: fn(&Seen) -> bool,
    pub progress: Option<Progress>,
}

/// The groups in their gallery order.
pub const GROUPS: [&str; 6] = ["journey", "mastery", "challenges", "builds", "moments", "oddities"];

/// A group's badge tier (`Row.tier`: the cut267 badge art).
pub fn tier(group: &str) -> &'static str {
    match group {
        "mastery" => "gold",
        "challenges" | "builds" | "oddities" => "silver",
        _ => "bronze",
    }
}

const BAND: [&str; 6] = ["goblin_warlord", "bloat_mother", "lich", "foundry_master", "lurker_queen", "mirror_king"];

/// The ids Cut269 added (G1: ≥ 25 new).
pub const NEW_IN_V2: [&str; 30] = [
    "m_fighter", "m_rogue", "m_ranger", "m_caster", "m_gunner", "m_clown", "m_engineer", "m_every",
    "c_dry", "c_empty", "c_lone", "c_bare", "c_walk", "c_noexit", "c_first", "c_flawless", "c_three", "c_desc3", "c_vows",
    "b_seven", "b_kennel", "b_stance", "b_route",
    "x_thread", "x_wind", "x_dog", "x_fire",
    "o_gas", "o_turncoat", "o_pratfall",
];

fn band(kind: &str) -> bool {
    BAND.contains(&kind)
}
/// A band boss at or below D18 (the Lich, the Master, the Queen, the King).
fn deep_band(kind: &str) -> bool {
    BAND[2..].contains(&kind)
}
fn slain(l: &LineageState, kind: &str) -> bool {
    l.kills.contains(kind)
}
fn run_of<'a>(s: &Seen<'a>) -> Option<&'a Run> {
    s.run.map(|(r, _)| r)
}
/// Any boss's fall this run that `f` accepts.
fn kill(s: &Seen, f: impl Fn(&Run, &Kill) -> bool) -> bool {
    run_of(s).is_some_and(|r| r.honours.kills.iter().any(|k| f(r, k)))
}
/// A fall of `kind` this run that `f` accepts.
fn kill_of(s: &Seen, kind: &str, f: impl Fn(&Run, &Kill) -> bool) -> bool {
    kill(s, |r, k| k.kind == kind && f(r, k))
}
fn sent(r: &Run) -> bool {
    r.honours.sent
}
fn class_is(r: &Run, c: crate::hero::Class) -> bool {
    r.hero.class == c
}
fn style_is(r: &Run, st: crate::specialization::Style) -> bool {
    r.hero.specialization == Some(st)
}
fn packed_nothing(r: &Run) -> bool {
    r.packed.is_empty() && r.prepared_supplies.is_empty()
}
fn forge_unbought(l: &LineageState) -> bool {
    l.forge.is_empty() && crate::kit::KIT_SLOTS.iter().all(|s| crate::kit::owned(l, s) == 0)
}
fn new_record(r: &Run) -> bool {
    r.best_at_send.is_some_and(|b| r.max_depth > b)
}

fn waystones_n(l: &LineageState) -> (u32, u32) {
    let lit = crate::engine::WAYSTONES.iter().filter(|d| l.waystones.contains(d)).count() as u32;
    (lit, crate::engine::WAYSTONES.len() as u32)
}
fn legends_n(l: &LineageState) -> (u32, u32) {
    let found = crate::legendary::DEFINITIONS.iter().filter(|d| l.town.owned_shapes.contains(d.kind)).count() as u32;
    (found, crate::legendary::DEFINITIONS.len() as u32)
}
fn trades_n(l: &LineageState) -> (u32, u32) {
    let n = crate::hero::Class::EVERY.iter().filter(|c| l.honours.class_bosses.contains(c.name())).count() as u32;
    (n, crate::hero::Class::EVERY.len() as u32)
}
fn builds_n(l: &LineageState) -> (u32, u32) {
    let n = crate::packages::SYNERGIES.iter().filter(|s| l.honours.builds.contains(s.id)).count() as u32;
    (n, crate::packages::SYNERGIES.len() as u32)
}
fn pet_builds_n(l: &LineageState) -> (u32, u32) {
    let n = crate::pets::PET_SYNERGIES.iter().filter(|s| l.honours.pet_builds.contains(s.id)).count() as u32;
    (n, crate::pets::PET_SYNERGIES.len() as u32)
}
fn vows_n(l: &LineageState) -> (u32, u32) {
    (l.honours.oaths.len().min(3) as u32, 3)
}
fn descent_n(l: &LineageState) -> (u32, u32) {
    (l.endgame.as_ref().and_then(|p| p.cleared).unwrap_or(0).min(3), 3)
}
fn full(p: Progress) -> impl Fn(&LineageState) -> bool {
    move |l| {
        let (n, of) = p(l);
        n >= of
    }
}

macro_rules! entry {
    ($id:literal, $name:literal, $goal:literal, $group:literal, $check:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: $group, secret: false, check: $check, progress: None }
    };
    ($id:literal, $name:literal, $goal:literal, $group:literal, $check:expr, $progress:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: $group, secret: false, check: $check, progress: Some($progress) }
    };
}
macro_rules! secret {
    ($id:literal, $name:literal, $goal:literal, $check:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: "oddities", secret: true, check: $check, progress: None }
    };
}

use crate::hero::Class;
use crate::specialization::Style;

/// The list (docs/CUT269_ACHIEVEMENTS_V2.md §3), in gallery order within each group.
pub const DEFS: &[Def] = &[
    // Journey (kept from Cut263)
    entry!("boss_warlord", "Warlord Felled", "slay the Warlord", "journey", |s| slain(s.l, BAND[0])),
    entry!("boss_lich", "Lich Undone", "slay the Lich", "journey", |s| slain(s.l, BAND[2])),
    entry!("boss_queen", "Queen Unseated", "slay the Lurker Queen", "journey", |s| slain(s.l, BAND[4])),
    entry!("boss_king", "Mirror Broken", "slay the Mirror King", "journey", |s| slain(s.l, BAND[5])),
    entry!("waystones", "Every Waystone", "light all six waystones", "journey", |s| full(waystones_n)(s.l), waystones_n),
    entry!("legend_all", "Legend Armory", "find all five patterns", "journey", |s| full(legends_n)(s.l), legends_n),
    entry!("seek", "Sought Out", "spend a boss token", "journey", |s| s.l.feats.seek.is_some()),
    entry!("descent", "Deeper Still", "clear a numbered descent", "journey", |s| s.l.endgame.as_ref().is_some_and(|p| p.cleared.is_some())),
    entry!("second_hero", "Second Hearth", "house a second hero", "journey", |s| s.bloodlines >= 2),
    entry!("pen_row", "First Row", "write a pen row", "journey", |s| !s.l.pkg.literal && !s.l.pkg.pen.is_empty()),
    // Mastery: one feat per class
    entry!("m_fighter", "Riposte", "slay a boss as Sentinel", "mastery", |s| kill(s, |r, _| style_is(r, Style::Sentinel))),
    entry!("m_rogue", "Knife Work", "slay the Lich as Rogue", "mastery", |s| kill_of(s, BAND[2], |r, _| class_is(r, Class::Rogue))),
    entry!("m_ranger", "Arm's Length", "Ranger boss, never in melee", "mastery", |s| kill(s, |r, k| class_is(r, Class::Ranger) && !k.melee)),
    entry!("m_caster", "Hexed Down", "slay a boss as Hexbinder", "mastery", |s| kill(s, |r, _| style_is(r, Style::Hexbinder))),
    entry!("m_gunner", "Last Round", "slay the Lich as Gunner", "mastery", |s| kill_of(s, BAND[2], |r, _| class_is(r, Class::Gunner))),
    entry!("m_clown", "Send In Clown", "slay the Lich as Clown", "mastery", |s| kill_of(s, BAND[2], |r, _| class_is(r, Class::Clown))),
    entry!("m_engineer", "Built To Kill", "sentry kills a boss", "mastery", |s| kill(s, |_, k| k.by == "sentry")),
    entry!("m_every", "Every Trade", "band boss with each class", "mastery", |s| full(trades_n)(s.l), trades_n),
    // Challenges: restrictions and risk
    entry!("c_dry", "Teetotal", "slay the Queen, no drink", "challenges", |s| kill_of(s, BAND[4], |_, k| k.drinks == 0)),
    entry!("c_empty", "Empty Pockets", "slay the Lich, nothing packed", "challenges", |s| kill_of(s, BAND[2], |r, _| sent(r) && packed_nothing(r))),
    entry!("c_lone", "Lone Wolf", "Foundry Master, no companion", "challenges", |s| kill_of(s, BAND[3], |r, k| sent(r) && r.honours.party == 0 && r.tamed.is_empty() && k.allies == 0)),
    entry!("c_bare", "Bare Steel", "Foundry Master, forge unbought", "challenges", |s| forge_unbought(s.l) && kill_of(s, BAND[3], |_, _| true)),
    entry!("c_walk", "Long Walk", "D1 to D28, one run", "challenges", |s| run_of(s).is_some_and(|r| r.start <= 1 && r.max_depth >= 28)),
    entry!("c_noexit", "No Way Back", "new record, no exit rows", "challenges", |s| run_of(s).is_some_and(|r| sent(r) && !r.honours.exit_rows && r.max_depth >= 18 && new_record(r))),
    entry!("c_first", "First Sight", "slay the Queen, first meeting", "challenges", |s| kill_of(s, BAND[4], |r, _| sent(r) && !r.honours.met.iter().any(|m| m == BAND[4]))),
    entry!("c_flawless", "Flawless", "Queen or King, untouched", "challenges", |s| kill(s, |_, k| BAND[4..].contains(&k.kind.as_str()) && k.untouched)),
    entry!("c_three", "Three Lines", "slay a boss, three rows", "challenges", |s| kill(s, |r, _| sent(r) && r.honours.rows <= 3)),
    entry!("c_desc3", "Third Descent", "clear descent three", "challenges", |s| full(descent_n)(s.l), descent_n),
    entry!("c_vows", "Many Vows", "keep three oath kinds", "challenges", |s| full(vows_n)(s.l), vows_n),
    entry!("trial", "Trial Cleared", "clear a weekly trial", "challenges", |s| !s.l.feats.trials.is_empty()),
    // Builds
    entry!("b_seven", "Seven Builds", "boss with each build", "builds", |s| full(builds_n)(s.l), builds_n),
    entry!("b_kennel", "Kennel Builds", "boss with each pet build", "builds", |s| full(pet_builds_n)(s.l), pet_builds_n),
    entry!("b_stance", "Own Stance", "slay the Lich, own stance", "builds", |s| kill_of(s, BAND[2], |r, _| sent(r) && r.honours.custom)),
    entry!("b_route", "Off The Map", "slay a boss off-route", "builds", |s| kill(s, |r, _| !r.route.is_base())),
    // Moments: the killing blow and the clutch
    entry!("x_thread", "By A Thread", "Lich or deeper at 5%", "moments", |s| kill(s, |_, k| deep_band(&k.kind) && k.hp > 0 && k.hp * 20 <= k.max_hp)),
    entry!("x_wind", "Second Wind", "revived, then a boss", "moments", |s| kill(s, |_, k| k.revived)),
    entry!("x_dog", "Good Dog", "pet fells Lich or deeper", "moments", |s| kill(s, |_, k| deep_band(&k.kind) && k.by == "pet")),
    entry!("x_fire", "Pyromaniac", "fire fells Lich or deeper", "moments", |s| kill(s, |_, k| deep_band(&k.kind) && k.by == "fire")),
    // Oddities: secret, absent until earned
    secret!("o_gas", "Bad Air", "gas kills a boss", |s| kill(s, |_, k| k.by == "gas")),
    secret!("o_turncoat", "Turncoat", "captive fells Lich or deeper", |s| kill(s, |_, k| deep_band(&k.kind) && k.by == "ally")),
    secret!("o_pratfall", "Pratfall", "counter kills a boss", |s| kill(s, |_, k| k.by == "counter")),
    secret!("old_enemy", "Old Enemy", "tame a grudge", |s| run_of(s).is_some_and(|r| !r.tamed_grudges.is_empty())),
];

pub fn def(id: &str) -> Option<&'static Def> {
    DEFS.iter().find(|d| d.id == id)
}

/// The entries `seen` meets that its lineage has not earned, in list order.
fn due(seen: &Seen) -> Vec<&'static str> {
    DEFS.iter().filter(|d| !seen.l.honours.earned.contains_key(d.id) && (d.check)(seen)).map(|d| d.id).collect()
}
fn record(l: &mut LineageState, new: &[&'static str], day: u32) {
    for id in new {
        l.honours.earned.insert((*id).into(), day);
    }
}

/// Sweep the lineage on its own (a command's state change, a load).
pub fn sweep(l: &mut LineageState, bloodlines: u32) -> Vec<&'static str> {
    if off() {
        return Vec::new();
    }
    let day = crate::feats::day_of(l.clock_s);
    let new = due(&Seen { l, run: None, bloodlines });
    record(l, &new, day);
    new
}

/// A settled run's counted sets, then every check with the run in view.
pub(crate) fn settle(l: &mut LineageState, run: &Run, tier: ExitTier, day: u32) -> Vec<&'static str> {
    let h = &mut l.honours;
    if run.honours.kills.iter().any(|k| band(&k.kind)) {
        h.class_bosses.insert(run.hero.class.name().into());
    }
    if !run.honours.kills.is_empty() {
        for (i, syn) in crate::packages::SYNERGIES.iter().enumerate() {
            if run.honours.builds & (1 << i) != 0 {
                h.builds.insert(syn.id.into());
            }
        }
        for (i, syn) in crate::pets::PET_SYNERGIES.iter().enumerate() {
            if run.pets.syn & (1 << i) != 0 {
                h.pet_builds.insert(syn.id.into());
            }
        }
    }
    if let (Some(o), Some((true, _))) = (&run.oath, &run.oath_said) {
        h.oaths.insert(o.kind.clone());
    }
    let new = due(&Seen { l, run: Some((run, tier)), bloodlines: 0 });
    record(l, &new, day);
    new
}

/// A real run has settled (`Game::finish_run`, after every system read it).
pub fn on_run_end(game: &mut Game, run: &Run, tier: ExitTier) {
    if game.sim || off() {
        return;
    }
    // (inside an absence, the absence's moment: `Game::clock_at`)
    let day = crate::feats::day_of(game.clock_at.unwrap_or(game.lineage.clock_s));
    settle(&mut game.lineage, run, tier, day);
}

/// An older save (v < VERSION): its state-derived entries are earned now and marked seen (no toast flood; G6). Run- and
/// moment-based entries cannot be derived and wait for play.
pub fn migrate(l: &mut LineageState) {
    if l.honours.v >= VERSION {
        return;
    }
    l.honours.earned.retain(|id, _| def(id).is_some());
    l.honours.causes.clear();
    sweep(l, 0);
    l.honours.seen = l.honours.earned.keys().cloned().collect();
    l.honours.v = VERSION;
}

/// Drop ids the list no longer holds (a save from a later or earlier list).
pub fn tidy(h: &mut Honours) {
    h.earned.retain(|id, _| def(id).is_some());
    h.seen.retain(|id| def(id).is_some());
}

/// The camp showed the new entries.
pub fn mark_seen(l: &mut LineageState, ids: &BTreeSet<String>) {
    for id in ids {
        if def(id).is_some() {
            l.honours.seen.insert(id.clone());
        }
    }
}

/// A gallery row (`Lineage.honours.rows`). An unearned secret is never a row.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Row {
    pub id: String,
    pub name: String,
    pub goal: String,
    pub group: String,
    /// `bronze` · `silver` · `gold` (`tier`): the badge.
    #[serde(default)]
    pub tier: String,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub secret: bool,
    /// The lineage day it was earned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub day: Option<u32>,
    /// A counted entry's progress (unearned only).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub of: Option<u32>,
    /// Earned since the camp last showed them (`seenHonours()` clears).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub new: bool,
}

/// `Lineage.honours`: the union over a session's lineages (the selected one's progress). `earned` / `total` count the
/// visible list only; `secrets` counts the secrets earned (how many exist is never sent).
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Wire {
    pub earned: u32,
    pub total: u32,
    #[serde(default)]
    pub secrets: u32,
    pub rows: Vec<Row>,
}

/// The wire over `lineages` (the selected first: progress is read from it).
pub fn wire<'a>(lineages: impl IntoIterator<Item = &'a LineageState>) -> Wire {
    let all: Vec<&LineageState> = lineages.into_iter().collect();
    let mut earned: BTreeMap<&str, u32> = BTreeMap::new();
    let mut seen: BTreeSet<&str> = BTreeSet::new();
    for l in &all {
        for (id, day) in &l.honours.earned {
            let e = earned.entry(id.as_str()).or_insert(*day);
            *e = (*e).min(*day);
        }
        seen.extend(l.honours.seen.iter().map(String::as_str));
    }
    let first = all.first().copied();
    let rows: Vec<Row> = DEFS
        .iter()
        .filter_map(|d| {
            let day = earned.get(d.id).copied();
            if d.secret && day.is_none() {
                return None;
            }
            let (n, of) = match (d.progress, first, day) {
                (Some(p), Some(l), None) => {
                    let (n, of) = p(l);
                    (Some(n), Some(of))
                }
                _ => (None, None),
            };
            Some(Row {
                id: d.id.into(),
                name: d.name.into(),
                goal: d.goal.into(),
                group: d.group.into(),
                tier: tier(d.group).into(),
                secret: d.secret,
                day,
                n,
                of,
                new: day.is_some() && !seen.contains(d.id),
            })
        })
        .collect();
    let open = |r: &&Row| !r.secret;
    Wire {
        earned: rows.iter().filter(open).filter(|r| r.day.is_some()).count() as u32,
        total: DEFS.iter().filter(|d| !d.secret).count() as u32,
        secrets: rows.iter().filter(|r| r.secret).count() as u32,
        rows,
    }
}

#[cfg(test)]
#[path = "honours_tests.rs"]
mod tests;
