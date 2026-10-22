//! Cut 270: live decisions — a few short choices in a watched run, each opened BETWEEN two ticks
//! (`Game::step` holds the world there, as take-over's `awaiting` does) and each applied through an
//! order the engine already has: the cache's pick (`Run::vault_want`, read by `turn::vault_take`) or a
//! bail (`Input::Bail`, a `return` at the hero's next action). The auto-pick sends nothing, so a run
//! whose decisions all auto-resolve is the run with decisions off, byte for byte. Never in an absence,
//! an `advance`, a fold, a sim or a harness: those never open one, and any tick clears one pending.
//! Also the boss chest (`Chest`): what a band boss's kill tick gave, a side channel of the step.
use crate::engine::{Game, Run};
use serde::{Deserialize, Serialize};

/// At most this many per run, one per floor.
pub const PER_RUN: u32 = 3;
/// Never in a run's first ticks (30 s at 1×).
pub const MIN_TICK: u32 = 300;
/// Never on the lineage's first sends.
pub const MIN_SENDS: u32 = 2;
/// A record reached under this share of max HP opens `hurt`.
pub const HURT_PCT: i32 = 50;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct DecisionOption {
    pub id: String,
    /// ≤ 3 words (`sword +1`, `Turn back`).
    pub label: String,
    /// `item` · `go` · `safe`.
    pub tone: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item: Option<crate::item::InvItem>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Decision {
    /// `<t>-<kind>`, unique in the run.
    pub id: String,
    /// `cache` · `boss` · `hurt`.
    pub kind: String,
    /// The tick it opened after (the picture shows it there).
    pub t: u32,
    pub depth: u32,
    /// ≤ 3 words (`Take one`, `Boss ahead`, `Hurt · record`).
    pub title: String,
    pub options: Vec<DecisionOption>,
    /// The option the hero takes when nobody chooses (today's behaviour).
    pub default: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChestItem {
    pub kind: String,
    pub label: String,
    pub rarity: String,
}

/// A band boss's kill tick: what it gave (patterns, set pieces) and the carry those added.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Chest {
    pub t: u32,
    pub boss: String,
    pub title: String,
    /// The best item's rarity (`common` with nothing dropped).
    pub rarity: String,
    pub items: Vec<ChestItem>,
    pub gold: i32,
}

/// The session's live-decision state: transient (never saved, never compared).
#[derive(Clone, Debug, Default)]
pub struct Live {
    /// The client watches with live decisions on (`setLiveDecisions`).
    pub on: bool,
    pub pending: Option<Decision>,
    /// (run id, decisions opened, floors with one, boss kinds offered, `hurt` offered).
    run: u32,
    n: u32,
    floors: Vec<u32>,
    bosses: Vec<String>,
    hurt: bool,
    /// Decisions resolved this run: (id, option index, chosen by hand).
    pub log: Vec<(String, u32, bool)>,
}
impl PartialEq for Live {
    fn eq(&self, _: &Self) -> bool {
        true
    }
}

impl Live {
    fn reset_for(&mut self, run: u32) {
        if self.run != run {
            *self = Live { on: self.on, run, ..Live::default() };
        }
    }
}

fn rarity_word(r: crate::item::Rarity) -> &'static str {
    use crate::item::Rarity::*;
    match r {
        Common => "common",
        Uncommon => "uncommon",
        Rare => "rare",
        Epic | Masterwork => "epic",
        Legendary => "legendary",
    }
}
fn rarity_rank(s: &str) -> u8 {
    match s {
        "uncommon" => 1,
        "rare" => 2,
        "epic" => 3,
        "legendary" => 4,
        _ => 0,
    }
}

/// The run may open a decision now (the watched run alone).
fn allowed(g: &Game, r: &Run) -> bool {
    g.live.on
        && g.watched
        && !g.sim
        && !g.offline
        && !g.lineage.in_absence
        && !g.lineage.pkg.literal
        && r.id > MIN_SENDS
        && r.over.is_none()
        && r.turn >= MIN_TICK
        && !r.manual
        && !r.bail
        && r.homeward.is_none()
        && g.live.n < PER_RUN
        && !g.live.floors.contains(&r.depth)
}

/// Cut 270: after a watched tick, the moment it made relevant (a pure read; the caps are noted).
pub fn detect(g: &mut Game) -> Option<Decision> {
    let id = g.run.as_ref()?.id;
    g.live.reset_for(id);
    let r = g.run.as_ref()?;
    if !allowed(g, r) {
        return None;
    }
    // owner 2026-10-22 ("make take item automatic ie, remove feature" · "remove boss fight/turn back also"): the cache and the boss
    // are never asked — the hero takes his `vault_pref` pick and fights as his rows say
    let d = hurt(g, r)?;
    let depth = r.depth;
    let live = &mut g.live;
    live.n += 1;
    live.floors.push(depth);
    match d.kind.as_str() {
        "boss" => live.bosses.push(d.options[0].id.clone()),
        "hurt" => live.hurt = true,
        _ => {}
    }
    Some(d)
}

fn turn_back(id: &str) -> DecisionOption {
    DecisionOption { id: id.into(), label: /* copy:callout */ "Turn back".into(), tone: "safe".into(), item: None }
}

/// D3: a record floor reached this tick (deeper than the lineage's best at send) under HURT_PCT.
fn hurt(g: &Game, r: &Run) -> Option<Decision> {
    if g.live.hurt || r.floor_turn > 1 || r.depth_t.last().is_none_or(|(d, t)| *d != r.depth || *t + 1 < r.turn) {
        return None;
    }
    if r.depth <= r.best_at_send.unwrap_or(u32::MAX) || r.hero.hp * 100 >= r.hero.max_hp * HURT_PCT {
        return None;
    }
    let push = DecisionOption { id: "push".into(), label: /* copy:callout */ "Push on".into(), tone: "go".into(), item: None };
    Some(Decision { id: format!("{}-hurt", r.turn), kind: "hurt".into(), t: r.turn, depth: r.depth, title: /* copy:callout */ "Hurt · record".into(), options: vec![push, turn_back("back")], default: 0 })
}

impl Game {
    /// Cut 270: the client watches with live decisions (`true` while the watch is up and visible); off
    /// resolves one pending as the default.
    pub fn set_live_decisions(&mut self, on: bool) {
        self.live.on = on;
        if !on {
            self.live_default();
        }
    }

    /// Cut 270: resolve the pending decision — `Some(i)` the option, `None` the auto-pick (no order sent).
    pub fn decide(&mut self, option: Option<u32>) -> Result<(), String> {
        let d = self.live.pending.take().ok_or("no decision")?;
        let i = option.unwrap_or(d.default);
        let o = d.options.get(i as usize).ok_or("no such option")?.clone();
        self.live.log.push((d.id.clone(), i, option.is_some()));
        if option.is_none() || i == d.default {
            return Ok(());
        }
        match d.kind.as_str() {
            "cache" => {
                let id: u32 = o.id.parse().map_err(|_| "bad item")?;
                self.pick_cache(id)
            }
            _ if o.id == "back" => {
                self.bail();
                Ok(())
            }
            _ => Ok(()),
        }
    }

    /// Cut 270: the cache's pick before it opens (`Input::Pick`; `turn::vault_take` reads it).
    pub fn pick_cache(&mut self, item_id: u32) -> Result<(), String> {
        let run = self.run.as_mut().filter(|r| r.over.is_none()).ok_or("no run")?;
        if !run.vault_cage.iter().any(|i| i.id == item_id) {
            return Err("not in the cache".into());
        }
        run.vault_want = Some(item_id);
        let (id, t) = (run.id, run.turn);
        self.input(id, t, crate::engine::Input::Pick(item_id));
        Ok(())
    }

    /// Any path but the watch's step: a pending decision takes its default (nothing is sent).
    pub fn live_default(&mut self) {
        if let Some(d) = self.live.pending.take() {
            self.live.log.push((d.id, d.default, false));
        }
    }
}

/// What a tick's boss chest is measured against (boss kills, pattern receipts, carry).
pub fn chest_before(g: &Game) -> (usize, usize, i32) {
    g.run.as_ref().map_or((0, 0, 0), |r| (r.boss_kills.len(), r.pattern_receipts.len(), r.carried()))
}

/// The boss chest of one tick: `before` = (boss kills, pattern receipts, carry) before it.
pub fn chest(g: &Game, before: (usize, usize, i32)) -> Option<Chest> {
    let r = g.run.as_ref()?;
    if r.boss_kills.len() <= before.0 {
        return None;
    }
    let (t, kind) = r.boss_kills.last()?.clone();
    let l = &g.lineage;
    let items: Vec<ChestItem> = r
        .pattern_receipts
        .iter()
        .skip(before.1)
        .map(|it| {
            let (_, _, label) = crate::item::describe(it, &l.facts, &l.flavours);
            ChestItem { kind: it.kind.clone(), label, rarity: rarity_word(crate::item::rarity(it, true)).into() }
        })
        .collect();
    let rarity = items.iter().map(|i| i.rarity.as_str()).max_by_key(|s| rarity_rank(s)).unwrap_or("common").to_string();
    Some(Chest { t, title: crate::engine::kind_title(&kind), boss: kind, rarity, items, gold: (r.carried() - before.2).max(0) })
}
