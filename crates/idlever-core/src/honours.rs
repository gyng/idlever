//! Cut263 (docs/CUT263_ACHIEVEMENTS.md, docs/research/ACHIEVEMENTS_RESEARCH.md): honours — the lifetime achievement
//! list. An observer only: the checks read settled lineage and run state and write nothing but `LineageState::honours`,
//! which no run, sim, forecast, price or bot reads. A sim clone never earns (`Game::sim`). Unlocks record the
//! lineage day (never a wall clock), so the same seed, rules and elapsed time earn the same honours.
//!
//! Rewards: none that touch play (§5). The mirrored trophies keep paying their own marks, unchanged.
use crate::engine::{ExitTier, Game, LineageState, Run};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// The save's honours version: an old save (0) earns its state-derived honours silently on load (`migrate`).
pub const VERSION: u32 = 1;

/// One lineage's honours.
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Honours {
    #[serde(default)]
    pub v: u32,
    /// Honour id → the lineage day (1-based, `feats::day_of`) it was earned.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub earned: BTreeMap<String, u32>,
    /// Earned honours the camp has shown (`seen`); the rest toast once.
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub seen: BTreeSet<String>,
    /// The death causes met (the `causes` honour's own count; `sifter::cause_key` words).
    #[serde(default, skip_serializing_if = "BTreeSet::is_empty")]
    pub causes: BTreeSet<String>,
}

impl Honours {
    pub fn is_default(&self) -> bool {
        self == &Honours::default()
    }
    pub fn current() -> Self {
        Honours { v: VERSION, ..Default::default() }
    }
}

/// What a check sees: the lineage, the run just finished (with its exit) and the session's bloodline count (0 when
/// the caller cannot know it: a session-only honour then waits for the session's own sweep).
pub struct Seen<'a> {
    pub l: &'a LineageState,
    pub run: Option<(&'a Run, ExitTier)>,
    pub bloodlines: u32,
    /// The player's command that asked (`rename`, `look`): a curiosity honour reads the act, not a state.
    pub act: Option<&'static str>,
}

/// A counted honour's `(n, of)` from the lineage.
pub type Progress = fn(&LineageState) -> (u32, u32);

/// An honour: data, a check and (for a counted one) its progress.
pub struct Def {
    pub id: &'static str,
    /// ≤ 3 words (the callout budget): the toast says it.
    pub name: &'static str,
    /// ≤ 5 words (the quest_goal budget), no sentence; hidden while a secret is unearned.
    pub goal: &'static str,
    pub group: &'static str,
    pub secret: bool,
    pub check: fn(&Seen) -> bool,
    /// A counted honour's `(n, of)`.
    pub progress: Option<Progress>,
}

/// The groups in their gallery order.
pub const GROUPS: [&str; 10] = ["depth", "bosses", "town", "workers", "packages", "pen", "deaths", "heroes", "companions", "lore"];

const BOSSES: [&str; 6] = ["goblin_warlord", "bloat_mother", "lich", "foundry_master", "lurker_queen", "mirror_king"];

fn slain(l: &LineageState, kind: &str) -> bool {
    l.kills.contains(kind)
}
fn depth_n(l: &LineageState, of: u32) -> (u32, u32) {
    (l.best_depth.min(of), of)
}
fn waystones_n(l: &LineageState) -> (u32, u32) {
    let lit = crate::engine::WAYSTONES.iter().filter(|d| l.waystones.contains(d)).count() as u32;
    (lit, crate::engine::WAYSTONES.len() as u32)
}
fn buildings_n(l: &LineageState) -> (u32, u32) {
    let built = crate::town::BUILDINGS.iter().filter(|(id, _)| l.town.built.iter().any(|(b, _)| b == id)).count() as u32;
    (built, crate::town::BUILDINGS.len() as u32)
}
fn legends_n(l: &LineageState) -> (u32, u32) {
    let found = crate::legendary::DEFINITIONS.iter().filter(|d| l.town.owned_shapes.contains(d.kind)).count() as u32;
    (found, crate::legendary::DEFINITIONS.len() as u32)
}
fn staff_n(l: &LineageState) -> (u32, u32) {
    let hired = crate::tree::NODES.iter().filter(|n| crate::tree::hired(l, n.id)).count() as u32;
    (hired, crate::tree::NODES.len() as u32)
}
fn causes_n(l: &LineageState) -> (u32, u32) {
    (l.honours.causes.len().min(5) as u32, 5)
}
fn classes_n(l: &LineageState) -> (u32, u32) {
    (l.classes.values().filter(|c| c.level > 1 || c.xp > 0).count().min(2) as u32, 2)
}

macro_rules! honour {
    ($id:literal, $name:literal, $goal:literal, $group:literal, $check:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: $group, secret: false, check: $check, progress: None }
    };
    ($id:literal, $name:literal, $goal:literal, $group:literal, $check:expr, $progress:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: $group, secret: false, check: $check, progress: Some($progress) }
    };
}
macro_rules! secret {
    ($id:literal, $name:literal, $goal:literal, $check:expr) => {
        Def { id: $id, name: $name, goal: $goal, group: "lore", secret: true, check: $check, progress: None }
    };
}

/// The launch list (docs/CUT263_ACHIEVEMENTS.md §3, after both critique passes), in gallery order within each group.
pub const DEFS: &[Def] = &[
    honour!("depth_20", "Twenty Deep", "reach D20", "depth", |s| s.l.best_depth >= 20, |l| depth_n(l, 20)),
    honour!("depth_30", "Thirty Deep", "reach D30", "depth", |s| s.l.best_depth >= 30, |l| depth_n(l, 30)),
    honour!("waystones", "Every Waystone", "light all six waystones", "depth", |s| { let (n, of) = waystones_n(s.l); n >= of }, waystones_n),
    honour!("boss_warlord", "Warlord Felled", "slay the Warlord", "bosses", |s| slain(s.l, BOSSES[0])),
    honour!("boss_mother", "Mother Burst", "slay the Bloat Mother", "bosses", |s| slain(s.l, BOSSES[1])),
    honour!("boss_lich", "Lich Undone", "slay the Lich", "bosses", |s| slain(s.l, BOSSES[2])),
    honour!("boss_master", "Forge Quenched", "slay the Foundry Master", "bosses", |s| slain(s.l, BOSSES[3])),
    honour!("boss_queen", "Queen Unseated", "slay the Lurker Queen", "bosses", |s| slain(s.l, BOSSES[4])),
    honour!("boss_king", "Mirror Broken", "slay the Mirror King", "bosses", |s| slain(s.l, BOSSES[5])),
    honour!("seek", "Sought Out", "spend a boss token", "bosses", |s| s.l.feats.seek.is_some()),
    honour!("descent", "Deeper Still", "clear a numbered descent", "bosses", |s| s.l.endgame.as_ref().is_some_and(|p| p.cleared.is_some())),
    honour!("town_full", "Full Town", "build all three buildings", "town", |s| { let (n, of) = buildings_n(s.l); n >= of }, buildings_n),
    honour!("kit", "Full Kit", "complete the forge kit", "town", |s| crate::feats::kit_complete(s.l)),
    honour!("second_hero", "Second Hearth", "house a second hero", "town", |s| s.bloodlines >= 2),
    honour!("legend_all", "Legend Armory", "find all five patterns", "town", |s| { let (n, of) = legends_n(s.l); n >= of }, legends_n),
    honour!("scout", "Hands Free", "hire the receptionist", "workers", |s| crate::tree::hired(s.l, "scout")),
    honour!("staff", "Full Staff", "hire every worker", "workers", |s| { let (n, of) = staff_n(s.l); n >= of }, staff_n),
    honour!("promoted", "Promoted", "promote a worker", "workers", |s| s.l.tree.ranks.values().any(|r| *r >= 2)),
    honour!("loadout", "Full Loadout", "wear all three package kinds", "packages", |s| !s.l.pkg.literal && !s.l.pkg.tactics.is_empty() && s.l.pkg.temperament.is_some()),
    honour!("variant", "Second Thoughts", "pick a tactic variant", "packages", |s| !s.l.pkg.variants.is_empty()),
    honour!("pen_row", "First Row", "write a pen row", "pen", |s| !s.l.pkg.literal && !s.l.pkg.pen.is_empty()),
    honour!("fix", "Lesson Taken", "take a death's fix", "pen", |s| !s.l.pkg.taught.is_empty()),
    honour!("own_words", "Own Words", "slay a boss, pen written", "pen", |s| !s.l.pkg.literal && !s.l.pkg.pen.is_empty() && s.run.is_some_and(|(r, _)| !r.boss_kills.is_empty())),
    honour!("causes", "Many Teachers", "die to five causes", "deaths", |s| s.l.honours.causes.len() >= 5, causes_n),
    honour!("legacy", "Legacy Spent", "buy a Legacy upgrade", "heroes", |s| s.l.hero_legacy.iter().any(|h| h.spent > 0) || s.l.bloodline.as_ref().is_some_and(|b| b.spent > 0)),
    honour!("new_trade", "New Trade", "train a second class", "heroes", |s| classes_n(s.l).0 >= 2),
    honour!("bred", "New Litter", "breed a pup", "companions", |s| !s.l.bred.is_empty()),
    honour!("oath", "Oathkeeper", "keep a sworn oath", "lore", |s| s.l.oaths_kept >= 1),
    honour!("trial", "Trial Cleared", "clear a weekly trial", "lore", |s| !s.l.feats.trials.is_empty()),
    secret!("old_enemy", "Old Enemy", "tame a grudge", |s| s.run.is_some_and(|(r, _)| !r.tamed_grudges.is_empty())),
    secret!("named", "Name Given", "rename the hero", |s| s.act == Some("rename")),
    secret!("new_look", "New Look", "change the hero's look", |s| s.act == Some("look")),
];

pub fn def(id: &str) -> Option<&'static Def> {
    DEFS.iter().find(|d| d.id == id)
}

/// Record every honour `seen` meets and that `h` has not; returns the new ids in list order.
fn sweep_into(h: &mut Honours, seen: &Seen, day: u32) -> Vec<&'static str> {
    let mut new = Vec::new();
    for d in DEFS {
        if !h.earned.contains_key(d.id) && (d.check)(seen) {
            h.earned.insert(d.id.into(), day);
            new.push(d.id);
        }
    }
    new
}

/// Sweep the lineage on its own (a command's state change, a load).
pub fn sweep(l: &mut LineageState, bloodlines: u32) -> Vec<&'static str> {
    let day = crate::feats::day_of(l.clock_s);
    let mut h = std::mem::take(&mut l.honours);
    let new = sweep_into(&mut h, &Seen { l, run: None, bloodlines, act: None }, day);
    l.honours = h;
    new
}

/// A player's command (`rename`, `look`) on a real lineage.
pub fn on_act(l: &mut LineageState, act: &'static str) -> Vec<&'static str> {
    let day = crate::feats::day_of(l.clock_s);
    let mut h = std::mem::take(&mut l.honours);
    let new = sweep_into(&mut h, &Seen { l, run: None, bloodlines: 0, act: Some(act) }, day);
    l.honours = h;
    new
}

/// A real run has settled (`Game::finish_run`, after every system read it): its causes, then every check with the
/// run in view.
pub fn on_run_end(game: &mut Game, run: &Run, tier: ExitTier) {
    if game.sim {
        return;
    }
    if tier == ExitTier::Death {
        if let Some(c) = run.death_cause.as_deref() {
            game.lineage.honours.causes.insert(crate::sifter::cause_key(c));
        }
    }
    // (inside an absence, the absence's moment: `Game::clock_at`)
    let day = crate::feats::day_of(game.clock_at.unwrap_or(game.lineage.clock_s));
    let mut h = std::mem::take(&mut game.lineage.honours);
    sweep_into(&mut h, &Seen { l: &game.lineage, run: Some((run, tier)), bloodlines: 0, act: None }, day);
    game.lineage.honours = h;
}

/// An old save (v 0): its state-derived honours are earned now and marked seen (no toast flood; G6).
pub fn migrate(l: &mut LineageState) {
    if l.honours.v >= VERSION {
        return;
    }
    l.honours.earned.retain(|id, _| def(id).is_some());
    sweep(l, 0);
    l.honours.seen = l.honours.earned.keys().cloned().collect();
    l.honours.v = VERSION;
}

/// Drop ids the list no longer holds (a save from a later or earlier list).
pub fn tidy(h: &mut Honours) {
    h.earned.retain(|id, _| def(id).is_some());
    h.seen.retain(|id| def(id).is_some());
}

/// The camp showed the new honours.
pub fn mark_seen(l: &mut LineageState, ids: &BTreeSet<String>) {
    for id in ids {
        if def(id).is_some() {
            l.honours.seen.insert(id.clone());
        }
    }
}

/// A gallery row (`Lineage.honours.rows`).
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Row {
    pub id: String,
    /// Empty for an unearned secret.
    pub name: String,
    pub goal: String,
    pub group: String,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub secret: bool,
    /// The lineage day it was earned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub day: Option<u32>,
    /// A counted honour's progress (unearned only).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub of: Option<u32>,
    /// Earned since the camp last showed them (`seenHonours()` clears).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub new: bool,
}

/// `Lineage.honours`: the union over a session's lineages (the selected one's progress).
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Wire {
    pub earned: u32,
    pub total: u32,
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
        .map(|d| {
            let day = earned.get(d.id).copied();
            let hidden = d.secret && day.is_none();
            let (n, of) = match (d.progress, first, day) {
                (Some(p), Some(l), None) => {
                    let (n, of) = p(l);
                    (Some(n), Some(of))
                }
                _ => (None, None),
            };
            Row {
                id: d.id.into(),
                name: if hidden { String::new() } else { d.name.into() },
                goal: if hidden { String::new() } else { d.goal.into() },
                group: d.group.into(),
                secret: d.secret,
                day,
                n,
                of,
                new: day.is_some() && !seen.contains(d.id),
            }
        })
        .collect();
    Wire { earned: rows.iter().filter(|r| r.day.is_some()).count() as u32, total: rows.len() as u32, rows }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn words(s: &str) -> usize {
        s.split_whitespace().filter(|w| w.chars().any(|c| c.is_alphabetic())).count()
    }

    /// G1: the launch list — count, secrets, unique ids, copy budgets.
    #[test]
    fn launch_list_meets_g1() {
        assert_eq!(DEFS.len(), 32, "the contract's launch count");
        let secrets = DEFS.iter().filter(|d| d.secret).count();
        assert!((3..=6).contains(&secrets), "secrets {secrets}");
        assert_eq!(secrets, 3);
        let ids: BTreeSet<&str> = DEFS.iter().map(|d| d.id).collect();
        assert_eq!(ids.len(), DEFS.len(), "unique ids");
        for d in DEFS {
            assert!(words(d.name) <= 3, "{} name over budget", d.id);
            assert!(words(d.goal) <= 5, "{} goal over budget", d.id);
            assert!(!d.name.is_empty() && !d.goal.is_empty(), "{}", d.id);
            for s in [d.name, d.goal] {
                assert!(!s.ends_with(['.', '!', '?']), "{} sentence", d.id);
                for w in s.split_whitespace() {
                    let w = w.trim_matches(|c: char| !c.is_alphabetic()).to_lowercase();
                    assert!(!["you", "your", "tap", "click"].contains(&w.as_str()), "{} forbidden word", d.id);
                }
            }
            assert!(GROUPS.contains(&d.group), "{} group", d.id);
        }
    }

    #[test]
    fn a_fresh_lineage_has_none_and_secrets_stay_hidden() {
        let g = Game::new(7);
        let w = wire([&g.lineage]);
        assert_eq!(w.earned, 0);
        assert_eq!(w.total as usize, DEFS.len());
        for r in w.rows.iter().filter(|r| r.secret) {
            assert!(r.name.is_empty() && r.goal.is_empty(), "an unearned secret leaks {}", r.id);
        }
        let depth = w.rows.iter().find(|r| r.id == "depth_20").unwrap();
        assert_eq!((depth.n, depth.of), (Some(0), Some(20)));
        assert_eq!(g.lineage.honours.v, VERSION, "a new game is current");
    }

    #[test]
    fn earned_once_new_until_seen_and_union_across_lineages() {
        let mut a = Game::new(3);
        a.lineage.best_depth = 22;
        a.lineage.kills.insert("goblin_warlord".into());
        let new = sweep(&mut a.lineage, 1);
        assert_eq!(new, vec!["depth_20", "boss_warlord"]);
        assert!(sweep(&mut a.lineage, 1).is_empty(), "earned once");
        let mut b = Game::new(4);
        let w = wire([&b.lineage, &a.lineage]);
        assert_eq!(w.earned, 2, "the union across a session's lineages");
        assert!(w.rows.iter().filter(|r| r.day.is_some()).all(|r| r.new));
        let ids: BTreeSet<String> = a.lineage.honours.earned.keys().cloned().collect();
        mark_seen(&mut b.lineage, &ids);
        let w = wire([&b.lineage, &a.lineage]);
        assert!(w.rows.iter().all(|r| !r.new), "seen on any lineage is seen");
    }

    #[test]
    fn an_old_save_migrates_silently_and_round_trips() {
        let mut g = Game::new(5);
        g.lineage.best_depth = 21;
        g.lineage.honours = Honours::default(); // a save from before Cut263
        let text = g.save();
        assert!(!text.contains("\"honours\""), "a pre-honours save carries none");
        let loaded = Game::load(&text).unwrap();
        let h = &loaded.lineage.honours;
        assert_eq!(h.v, VERSION);
        assert!(h.earned.contains_key("depth_20") && !h.earned.contains_key("depth_30"));
        assert_eq!(h.seen.len(), h.earned.len(), "retroactive honours are not toasted");
        let again = Game::load(&loaded.save()).unwrap();
        assert_eq!(again.save(), loaded.save(), "save → load → save is stable");
    }

    /// G2: honours are never read back. The same seed played twice — once with nothing earned, once with every honour
    /// already earned (so the observer writes nothing) — ends in the same game once `honours` is set aside.
    #[test]
    fn honours_never_change_a_game() {
        let play = |prefill: bool| -> (String, usize) {
            let mut g = Game::new_resident(9);
            crate::tree::grant(&mut g.lineage, &["porter", "scout"]);
            if prefill {
                for d in DEFS {
                    g.lineage.honours.earned.insert(d.id.into(), 0);
                }
            }
            g.send();
            g.run_offline(10 * 3600);
            let earned = g.lineage.honours.earned.len();
            g.lineage.honours = Honours::default();
            let mut v: serde_json::Value = serde_json::from_str(&g.save()).unwrap();
            strip(&mut v); // (the lineage's, and any copy a capsule holds)
            (v.to_string(), earned)
        };
        let (a, earned) = play(false);
        let (b, _) = play(true);
        assert!(earned > 0, "a ten-hour game earns something to observe");
        if a != b {
            let (va, vb): (serde_json::Value, serde_json::Value) = (serde_json::from_str(&a).unwrap(), serde_json::from_str(&b).unwrap());
            let mut paths = Vec::new();
            diff("", &va, &vb, &mut paths);
            let (c, _) = play(false);
            panic!("honours changed the game at {:?} (same-input rerun identical: {})", &paths[..paths.len().min(12)], c == a);
        }
    }

    fn strip(v: &mut serde_json::Value) {
        match v {
            serde_json::Value::Object(m) => {
                m.remove("honours");
                m.values_mut().for_each(strip);
            }
            serde_json::Value::Array(a) => a.iter_mut().for_each(strip),
            _ => {}
        }
    }

    fn diff(at: &str, a: &serde_json::Value, b: &serde_json::Value, out: &mut Vec<String>) {
        match (a, b) {
            (serde_json::Value::Object(x), serde_json::Value::Object(y)) => {
                for k in x.keys().chain(y.keys()).collect::<BTreeSet<_>>() {
                    match (x.get(k), y.get(k)) {
                        (Some(p), Some(q)) => diff(&format!("{at}.{k}"), p, q, out),
                        _ => out.push(format!("{at}.{k}")),
                    }
                }
            }
            (serde_json::Value::Array(x), serde_json::Value::Array(y)) if x.len() == y.len() => {
                for (i, (p, q)) in x.iter().zip(y).enumerate() {
                    diff(&format!("{at}[{i}]"), p, q, out);
                }
            }
            _ if a != b => out.push(at.to_string()),
            _ => {}
        }
    }

    /// The curiosity secrets read the player's own act, never a state a bot or a new resident reaches by itself.
    #[test]
    fn curiosity_secrets_come_from_the_act() {
        let mut g = Game::new(8);
        g.lineage.town.home = Some(true);
        g.lineage.look = Some("cat".into());
        assert!(sweep(&mut g.lineage, 1).is_empty(), "a look already worn earns nothing by itself");
        g.set_look("cat").unwrap();
        g.rename_hero("Ada").unwrap();
        assert!(g.lineage.honours.earned.contains_key("new_look"));
        assert!(g.lineage.honours.earned.contains_key("named"));
    }

    #[test]
    fn unknown_ids_are_dropped_on_load() {
        let mut g = Game::new(6);
        g.lineage.honours.earned.insert("retired_honour".into(), 2);
        g.lineage.honours.seen.insert("retired_honour".into());
        let loaded = Game::load(&g.save()).unwrap();
        assert!(!loaded.lineage.honours.earned.contains_key("retired_honour"));
        assert!(!loaded.lineage.honours.seen.contains("retired_honour"));
    }
}
