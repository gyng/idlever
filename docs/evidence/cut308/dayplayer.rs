//! Cut 30 §6 (docs/CUT30.md): fourteen simulated days of the idle-first bots — IDLE (sends at each
//! check-in, never edits, picks, buys or deposits; the wake takes card 1), PICKED (IDLE + the
//! forecast's top package move, a blacksmith step when affordable, a bank deposit), TUNED (PICKED +
//! the pen once it opens: the situation answers, the worst death's patch, the stall patch, the wall's
//! edit, the kennel fielded) and RANDOM (random package picks, random rows once the pen opens) — and
//! TUNED's leave-one-outs (TUNED less one system: packages, pen, forge, pets, bank, quests). Prints the
//! per-seed milestones and the idle gates; `--gate` exits non-zero on a failed bar (never weaken a bar).
//!   cargo run -q --profile fast -p idlever-core --example dayplayer -- [--seeds 8] [--days 14] [--checkins 3] [--gate] [--bots idle,picked,tuned,random] [--loo] [--verbose]
//! `--timeline FILE` (Cut231 §4): each configuration × seed's unlock timeline (read-only beats) as JSON; summarize with
//! `node tools/timeline-summary.mjs FILE`.
use idlever_core::rules::{Row, RuleSet};
use idlever_core::rng::Rng;
use idlever_core::Game;
#[path = "jobcache_lib/mod.rs"]
mod jobcache;
#[path = "dayplayer_checkpoint/mod.rs"]
mod checkpoint_game;

/// Cut 121 §1–2: the PICKED+L bars' names (dayplayer_rows reads them).
const PICKED_L_KING: &str = "PICKED+L King no sooner than day 7 (median), never before day 4";
const PICKED_L_PURSE: &str = "PICKED+L purse at day 3 spent ≥ 50 % of income since Kit complete";
/// Milestones (Cut 30 §6: time-to-milestone = simulated hours to reach each).
const MILESTONES: [u32; 7] = [8, 13, 18, 23, 28, 29, 33];
const SYSTEMS: [&str; 6] = ["packages", "pen", "forge", "pets", "bank", "quests"];

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Bot {
    Idle,
    Picked,
    Tuned,
    Random,
    /// Cut 30.5: IDLE + every open chore by hand, never a node but the scout
    Hands,
    /// Cut 30.5: Cut 30's IDLE, the reference for IDLE's bounded delta — the workers up to the scout given at
    /// the start (an old save's mapping), no first session: the cut30-client fortnight
    Idle30,
    /// Cut 30.5 (the owner, 2026-10-02): the daily player — PICKED at one check-in a day (workers never cost a floor)
    Daily,
    /// Cut 30.5 (the owner): the away player — PICKED looking in every 2–3 days (workers pay here)
    Away,
    /// Cut 121 §1: PICKED that spends Legacy `balanced` by hand at each check-in, as every human rater does
    PickedL,
}

impl Bot {
    fn name(self) -> &'static str {
        match self {
            Bot::Idle => "IDLE",
            Bot::Picked => "PICKED",
            Bot::Tuned => "TUNED",
            Bot::Random => "RANDOM",
            Bot::Hands => "HANDS",
            Bot::Idle30 => "IDLE30",
            Bot::Daily => "DAILY",
            Bot::Away => "AWAY",
            Bot::PickedL => "PICKED+L",
        }
    }
}

#[derive(Clone, Copy)]
struct Cfg {
    bot: Bot,
    /// TUNED less one system (leave-one-out); PICKED less `nodes` (Cut 30.5: the chores by hand, the scout alone hired).
    without: Option<&'static str>,
}

impl Cfg {
    fn label(&self) -> String {
        match self.without {
            Some(s) => format!("{}-{s}", self.bot.name()),
            None => self.bot.name().to_string(),
        }
    }
    fn has(&self, s: &str) -> bool {
        self.without != Some(s)
    }
}

#[derive(Default, Clone, serde::Serialize, serde::Deserialize)]
struct SeedOut {
    seed: u64,
    /// Hours to each milestone (`MILESTONES`), if reached.
    hours: Vec<Option<f64>>,
    best_day: Vec<u32>,
    /// Purse + bank change per day (the day's net).
    gold_day: Vec<i64>,
    /// Longest run of days with no new best before D23 was reached.
    stall: usize,
    /// The day the Mirror King fell (1-based), if he did.
    king_day: Option<usize>,
    /// The Mirror King's least hp left (%) over every try at him by the fortnight's end, and the tries (the bar's
    /// margin: owner option C, 2026-10-10).
    #[serde(default)]
    king_left: Option<(u32, u32)>,
    stance_level_day: Vec<u32>,
    checkins: u32,
    grew: u32,
    /// Cut 113 §3: check-ins whose return carried a pick (offered; no bot takes one).
    #[serde(default)]
    picks: u32,
    stage_days: usize,
    /// Sends and those that stalled (the stall guard's timeout) over the fortnight.
    #[serde(default)]
    sends: u32,
    #[serde(default)]
    stalled: u32,
    /// Deaths, quests kept, and the best depth summed over the days (the climb's area).
    #[serde(default)]
    deaths: u32,
    #[serde(default)]
    quests: u32,
    #[serde(default)]
    depth_area: u32,
    /// PROGRESSION_V2 (reported, gated in Cut 31): systems open at day 1's end, the most systems and
    /// beats one report brought, days with something new, the longest run of days without.
    day1_systems: usize,
    max_systems: usize,
    max_beats: usize,
    new_days: usize,
    new_gap: usize,
    rules: String,
    /// Cut 30.5 (the works tree): the first session's minute the porter and the scout were hired, the sends by
    /// hand before the scout; each node's hours when its chore opened, its trigger was met, it was hired; the
    /// check-ins where purse + chest + bank ≠ the ledger; the largest chest.
    #[serde(default)]
    porter_min: Option<f64>,
    #[serde(default)]
    scout_min: Option<f64>,
    #[serde(default)]
    scout_sends: u32,
    #[serde(default)]
    node_open_h: Vec<(String, f64)>,
    #[serde(default)]
    node_ready_h: Vec<(String, f64)>,
    #[serde(default)]
    node_hired_h: Vec<(String, f64)>,
    #[serde(default)]
    unconserved: u32,
    #[serde(default)]
    chest_max: i64,
    /// Cut 121 §2: the hours Kit complete came, the town's income (`income`) and wealth (purse + bank) then, and
    /// at day 3's end the income since and the share of it spent (percent).
    #[serde(default)]
    kit_h: Option<f64>,
    #[serde(default)]
    kit_at: Option<(i64, i64)>,
    #[serde(default)]
    kit_spent_d3: Option<(i64, f64)>,
    /// Cut 121 §1: the Legacy upgrades bought by hand (PICKED+L) and the points spent.
    #[serde(default)]
    legacy_buys: u32,
    /// Cut231 §4: the unlock timeline (`note_beats`, read-only) and the first session's length in player minutes.
    #[serde(default)]
    timeline: Vec<Beat>,
    #[serde(default)]
    session_m: f64,
    /// Cut233 (owner 2026-10-15, cadence30 counts gaps between looks only): the first session's camp arrivals, in
    /// player minutes (minute 0, then one at each run's return) — a stretch with no arrival inside it is one watched
    /// run, never a gap.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    looks: Vec<f64>,
}

/// Cut 121 §2: the town's gold income so far (the hauls and the porter's, fetched and recovered gold).
fn income(g: &Game) -> i64 {
    let t = &g.lineage.gold_tally;
    ["earned", "fetched", "recovered"].iter().map(|k| t.get(*k).copied().unwrap_or(0)).sum()
}

fn wealth(g: &Game) -> i64 {
    g.lineage.gold as i64 + g.lineage.town.bank as i64
}

/// Cut 121 §1: the upgrade Legacy `balanced` would buy now (the order's own pick, whatever order stands).
fn legacy_balanced_pick(g: &mut Game) -> Option<String> {
    let old = std::mem::replace(&mut g.lineage.orders.legacy, "balanced".into());
    let pick = idlever_core::tree::legacy_pick(&g.lineage);
    g.lineage.orders.legacy = old;
    pick
}

/// Cut 121 §1: PICKED+L's check-in: every upgrade `balanced` buys while the points pay (for the next run while away).
fn spend_legacy(g: &mut Game, out: &mut SeedOut) {
    for _ in 0..64 {
        let Some(id) = legacy_balanced_pick(g) else { break };
        if idlever_core::legacy::buy_next(g, &id).is_err() {
            break;
        }
        out.legacy_buys += 1;
    }
}

/// An own row into the pen (the compiled set's top): room is made from the pen's bottom.
fn insert_row(g: &mut Game, row: Row, at: i32) -> bool {
    if at < 0 || !g.lineage.pkg.pen_open {
        return false;
    }
    let max_rows = g.vocabulary().max_rows;
    let mut rules = g.lineage.rules().clone();
    if rules.rows.contains(&row) {
        return false;
    }
    let pen: Vec<usize> = (0..rules.rows.len()).filter(|&i| !rules.rows[i].is_pkg()).collect();
    if !row.is_card() && rules.own_rows() >= max_rows {
        if let Some(&drop) = pen.iter().rev().find(|&&i| !rules.rows[i].is_card()) {
            rules.rows.remove(drop);
        } else {
            return false;
        }
    }
    let pen_len = rules.rows.iter().take_while(|r| !r.is_pkg()).count();
    let at = (at as usize).min(pen_len);
    rules.rows.insert(at, row.from("player"));
    g.set_rules(rules).is_ok()
}

/// Follow the death screen's landed gem, not the moment's provisional survival estimate.
fn measured_death_patch(patches: &[idlever_core::Patch]) -> Option<&idlever_core::Patch> {
    patches.iter().find(|p| p.gem && !p.camp_pending && idlever_core::trace::gem_eligible(p))
}

/// Report plateau patches already carry the camp's paired reach measurement (no death gem).
fn measured_stall_patch(patches: &[idlever_core::Patch]) -> Option<&idlever_core::Patch> {
    patches.iter().find(|p| !p.camp_pending && !p.below_bar && p.forecast_delta > 0.0
        && p.whole.as_ref().is_none_or(|_| idlever_core::trace::gem_eligible(p)))
}

/// Apply the offered operation and its purchase just as the patch tablet does. A full pen
/// without a measured named drop asks a player; the bot does not invent a different drop.
fn take_patch(g: &mut Game, patch: &idlever_core::Patch) -> bool {
    if !g.lineage.pkg.literal && !g.lineage.pkg.pen_open {
        return false;
    }
    let same = |r: &Row| r.conds == patch.row.conds && r.verb == patch.row.verb;
    let insert = !patch.remove && !patch.replace && patch.moves_from.is_none();
    let held = insert && g.lineage.rules().rows.iter().any(same);
    if patch.insert_at < 0 {
        let vocab = g.vocabulary();
        let locked = patch.row.conds.iter().find(|c| vocab.locked.iter().any(|l| l.cond.same_token(c)))
            .or_else(|| patch.row.conds.iter().find(|c| !vocab.conds.iter().any(|v| v.same_token(c))));
        let Some(cond) = locked else { return false };
        let Some(id) = idlever_core::meta::cond_unlock(&cond.k) else { return false };
        if !g.unlocks().iter().any(|u| u.id == id && !u.owned && u.available) || g.buy(id).is_err() {
            return false;
        }
        if held { return true }
        let mut p = patch.clone();
        p.insert_at = 0;
        return take_patch(g, &p);
    }
    if held { return false }
    let max_rows = g.vocabulary().max_rows;
    if insert && !patch.row.is_card() && g.lineage.rules().own_rows() >= max_rows && patch.drops.is_none() {
        return false;
    }
    if let Some(buy) = &patch.buys {
        if g.buy_supply(&buy.kind).is_err() { return false }
    }
    let mut p = patch.clone();
    if p.row.origin.is_none() { p.row = p.row.from("patch"); }
    let rules = idlever_core::offline::apply_patch(g.lineage.rules(), &p, max_rows);
    if rules == *g.lineage.rules() { return false }
    g.set_rules(rules).is_ok()
}

/// Exact fallback rows authored by this bot; cloned together with the game at forks.
#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
struct CounterCopy { boss: String, rows: Vec<Row> }

fn same_owned_row(a: &Row, b: &Row) -> bool {
    a == b && a.origin == b.origin
}

/// Refresh only a tracked, unedited fallback copy. Independent pen edits retain priority.
fn maintain_counter_copies(g: &mut Game, copies: &mut Vec<CounterCopy>) {
    let heal = idlever_core::packages::heal_pct(&g.lineage.pkg.stance, g.lineage.pkg.level(&g.lineage.pkg.stance));
    let mut set = g.lineage.rules().clone();
    let mut next = Vec::new();
    for copy in copies.iter() {
        let wanted: Vec<Row> = idlever_core::packages::drill_rows(&copy.boss, heal)
            .into_iter().map(|r| r.from("player")).collect();
        let shape = |r: &Row| {
            let mut r = r.clone();
            for c in &mut r.conds { if c.k == "hp>" { c.n = None; } }
            r
        };
        let independent: Vec<Row> = set.rows.iter()
            .filter(|row| !row.is_pkg() && !copy.rows.iter().any(|r| same_owned_row(r, row)))
            .cloned().collect();
        let mut assigned = Vec::new();
        let mut rows = Vec::new();
        for row in set.rows {
            if copy.rows.iter().any(|r| same_owned_row(r, &row)) {
                let fresh = wanted.iter().find(|r| shape(r) == shape(&row)).cloned().unwrap_or(row);
                // An independent authored equivalent keeps its original origin and position.
                if independent.contains(&fresh) { continue; }
                if !assigned.iter().any(|r| same_owned_row(r, &fresh)) {
                    assigned.push(fresh.clone());
                    rows.push(fresh);
                }
            } else { rows.push(row); }
        }
        set.rows = rows;
        if !assigned.is_empty() { next.push(CounterCopy { boss: copy.boss.clone(), rows: assigned }); }
    }
    if set != *g.lineage.rules() && g.set_rules(set).is_err() { return; }
    *copies = next;
}

/// Copy the fallback counter in canonical priority order at the pen's top.
fn write_counter_rows(g: &mut Game, b: &str, heal: i32, copies: &mut Vec<CounterCopy>) {
    for row in idlever_core::packages::drill_rows(b, heal).into_iter().rev() {
        // (the card or the verb it needs, bought with marks or gold when the purse has it)
        let need = match (row.verb.v.as_str(), row.card()) {
            (_, Some(c)) => Some(c.to_string()),
            ("throw", _) => Some("throw".to_string()),
            _ => None,
        };
        if let Some(u) = need.filter(|u| !g.lineage.unlocks.contains(u)) {
            if g.buy(&u).is_err() {
                let _ = g.buy_unlock_gold(&u);
            }
        }
        if insert_row(g, row.clone(), 0) {
            let owned = row.from("player");
            if let Some(copy) = copies.iter_mut().find(|copy| copy.boss == b) {
                if !copy.rows.iter().any(|r| same_owned_row(r, &owned)) { copy.rows.push(owned); }
            } else { copies.push(CounterCopy { boss: b.into(), rows: vec![owned] }); }
        }
    }
}

/// The situation answers a player writes once the pen is open and the fact is held (the stray's
/// tame row only when pets are in play).
fn write_own_rows(g: &mut Game, pets: impl Fn() -> bool) -> u32 {
    if !g.lineage.pkg.pen_open {
        return 0;
    }
    let mut n = 0;
    // (the stray's row only when its fact is held — the loop's own test — and pets are in play: asked then)
    let stray = g.lineage.facts.contains("stray") && pets();
    // (the situations' rows are gone: answered on every floor at the pen's top they slowed the Deep's walk —
    // the late pen fine-tunes walls, it does not rewrite the walk)
    let situations = std::iter::once("stray").filter(|_| stray);
    for what in situations {
        if !g.lineage.facts.contains(what) {
            continue;
        }
        let row = idlever_core::probes::situation_answer(what);
        let vocab = g.vocabulary();
        let ok = row.conds.iter().all(|c| vocab.conds.iter().any(|v| v.k == c.k && v.t == c.t)) && vocab.verbs.iter().any(|v| v.v == row.verb.v && v.a == row.verb.a);
        if !ok || g.lineage.rules().rows.contains(&row) {
            continue;
        }
        if g.lineage.rules().own_rows() < g.vocabulary().max_rows && insert_row(g, row, 0) {
            n += 1;
        }
    }
    n
}

/// PICKED's package move: the forecast's top swap or level spend, when it beats the set as it stands.
fn pick_package(g: &mut Game, verbose: bool, day: usize, swap: bool) -> bool {
    // the marks buy the worn stance's next level first (a level is progress the forecast need not price)
    let stance = g.lineage.pkg.stance.clone();
    let mut moved = false;
    while idlever_core::packages::level_price(&g.lineage, &stance).is_some_and(|m| m <= g.lineage.marks) {
        if g.spend_level(&stance).is_err() {
            break;
        }
        moved = true;
    }
    if !swap || idlever_core::packages::candidates(&g.lineage).iter().all(|c| c.1 == "level") {
        return moved;
    }
    let mut opts = g.package_options(PICK_SIMS);
    // (Cut 30.5: weighed by the picker's own read — `pick_score`, best first)
    opts.sort_by(|a, b| pick_score(b).total_cmp(&pick_score(a)));
    if verbose {
        eprintln!("  day {} options: {}", day + 1, opts.iter().map(|o| format!("{} {} {:+.2} (p{:.2} r{:.2} b{:.2} d{:.2})", o.action, o.id, idlever_core::packages::score(o), o.past, o.reach, o.bank, o.death)).collect::<Vec<_>>().join(" | "));
    }
    // (a swap must not cost the walk: the sends from where they start keep their floors — the wall's
    // answer is taken, not a stance that reads well at the wall and dies on the way to it)
    // (a swap that passes clearly more may cost a little more death: half its gain in passes)
    // (and a wall's clear answer is taken whatever the walk reads — Hunter at the Foundry's golems read
    // +0.3 to +1.1 for two days and lost each time to a tactic that passed the walk's test)
    let Some(top) = opts.iter().find(|o| o.action == "equip" && (pick_score(o) >= PICK_STRONG || o.d_mean >= -0.25 && o.d_death <= 0.05f64.max(o.d_past / 2.0))) else { return moved };
    // a swap when it clearly helps (the panel's noise is ~±0.1 at these sims)
    if pick_score(top) > PICK_BAR && idlever_core::packages::apply(&mut g.lineage, &top.id, &top.action, top.slot).is_ok() {
        if verbose {
            eprintln!("  day {} {} {} (Δpast {:+.2} Δbank {:+.2} Δdeath {:+.2})", day + 1, top.action, top.id, top.d_past, top.d_bank, top.d_death);
        }
        return true;
    }
    moved
}

/// The picker's read of a move (Cut 30.5, a bot change: with a new record no longer ending a run, how deep the sends
/// go is the climb's pace — the camp's score weighs a floor of mean depth at a tenth of a send past the record; the
/// picker weighs it at three tenths).
fn pick_score(o: &idlever_core::packages::PkgOption) -> f64 {
    idlever_core::packages::score(o) + PICK_MEAN * o.d_mean
}
const PICK_MEAN: f64 = 0.2;

/// The forecast's panel for a package move, and the move it must clear.
const PICK_SIMS: u32 = 32;
const PICK_BAR: f64 = 0.12;
const PICK_STRONG: f64 = 0.4;

/// Whether `forge` would take a step (it buys the cheapest when the purse pays it with `reserve` to spare).
fn forge_due(g: &Game, reserve: i32) -> bool {
    let lads = idlever_core::kit::ladders(&g.lineage);
    lads.iter().filter_map(|l| l.next.as_ref().map(|x| x.price)).min().is_some_and(|price| g.lineage.gold >= price as i32 + reserve)
}

/// A blacksmith step whenever the purse pays it with `reserve` to spare.
fn forge(g: &mut Game, reserve: i32) -> u32 {
    let mut n = 0;
    loop {
        let lads = idlever_core::kit::ladders(&g.lineage);
        let Some((slot, price)) = lads.iter().filter_map(|l| l.next.as_ref().map(|x| (l.slot.clone(), x.price))).min_by_key(|x| x.1) else { break };
        if g.lineage.gold < price as i32 + reserve || idlever_core::kit::buy(g, &slot).is_err() {
            break;
        }
        n += 1;
    }
    n
}

fn field_kennel(g: &mut Game) {
    let slots = g.lineage.party_slots() as usize;
    if g.lineage.party.len() < slots && !g.lineage.kennel.is_empty() {
        let mut ids: Vec<u32> = g.lineage.party.iter().map(|c| c.id).collect();
        let mut k: Vec<_> = g.lineage.kennel.iter().filter(|c| !ids.contains(&c.id)).collect();
        k.sort_by_key(|c| std::cmp::Reverse(c.level));
        for c in k.iter().take(slots - ids.len()) {
            ids.push(c.id);
        }
        let _ = g.set_party(ids);
    }
}

// ---------------------------------------------------------------- Cut 30.5: the works tree's bots

/// The first session's model (docs/CUT30_5.md §4): a watched run's screen time is its game time at an
/// effective 4× (`fights` mode: the map at 16×, fights at 2×), then 25 s at camp (the report, the taps), 5 s a hire.
const WATCH_X: f64 = 4.0;
const CAMP_S: f64 = 25.0;
const HIRE_S: f64 = 5.0;
/// The engaged bots (PICKED, TUNED) stay this long in the first session, tapping SEND whenever the hero is
/// home; the others leave once the scout is hired.
const STAY_S: f64 = 45.0 * 60.0;

/// The away player's check-in days: every 2–3 days (days 0, 3, 5, 8, 10, 13).
fn away_checkin(day: usize) -> bool {
    (day * 2) % 5 < 2
}

/// One send by hand, played out as the client's unwatched slice: the run in flight, home. Its game seconds.
fn send_once(g: &mut Game, out: &mut SeedOut) -> f64 {
    g.send();
    // (`DP_WATCH_FOLD=1`, Cut232 proposal — a diagnostic, never in a gate run: the watch folds the floors the camp's
    // panel clears ≥ 95 % (`Game::fold`, Cut 27), so they cost `FOLD_FLOOR_S` of screen time each, not their ticks;
    // measured on a clone, the game itself unchanged)
    let folded = std::env::var_os("DP_WATCH_FOLD").map(|_| {
        let mut c = g.clone();
        let line = c.fold();
        let floors = (line.to + 1).saturating_sub(line.from);
        (c.run.as_ref().map_or(0, |r| r.turn) as f64 / 10.0, floors as f64)
    });
    let before = g.lineage.total_turns;
    let rep = idlever_core::offline::run_offline_counts(g, 1);
    out.sends += rep.runs;
    out.stalled += rep.stalled;
    out.deaths += rep.deaths.iter().map(|d| d.n).sum::<u32>();
    let game_s = (g.lineage.total_turns - before) as f64 / 10.0;
    match folded {
        Some((fold_s, floors)) => (game_s - fold_s).max(0.0) + floors * FOLD_FLOOR_S * WATCH_X,
        None => game_s,
    }
}

/// `DP_WATCH_FOLD`: a folded floor's screen time (the fold line's beat).
const FOLD_FLOOR_S: f64 = 2.0;

/// The first session: SEND, the run, the camp's taps (the bot's), until the scout (IDLE, HANDS, RANDOM) or the
/// engaged stay (PICKED, TUNED). Its seconds.
fn first_session(g: &mut Game, out: &mut SeedOut, ask: &Ask) -> u64 {
    let arm = ask.q(Q::Arm);
    if arm == 4 {
        return 0;
    }
    let stay = if arm == 2 { STAY_S } else { 0.0 };
    let mut t = 0.0;
    for _ in 0..60 {
        let hired = g.lineage.tree.hired.len();
        // (Cut231 §4: what the player sees arriving at camp, before the taps — the first look is the baseline)
        note_beats(g, out, t / 60.0);
        out.looks.push(t / 60.0);
        // (`DP_LOOK_TRACE`: each first-session look — minute, record, the last run (start, depth, exit, ticks); a diagnostic, never in a gate run)
        if std::env::var_os("DP_LOOK_TRACE").is_some() { let r = g.lineage.run_log.last(); eprintln!("look seed {} m {:.2} best D{} last {:?}", g.lineage.seed, t / 60.0, g.lineage.best_depth, r.map(|r| (r.start, r.depth, r.tier.clone(), r.turns))); }
        camp_taps(g, ask, arm, out, t / 3600.0);
        if arm == 3 || arm == 2 {
            // (the session's chores by hand: the find worn)

        }
        t += HIRE_S * (g.lineage.tree.hired.len() - hired) as f64;
        if idlever_core::tree::hired(&g.lineage, "porter") && out.porter_min.is_none() {
            out.porter_min = Some(t / 60.0);
        }
        if idlever_core::tree::hired(&g.lineage, "scout") && out.scout_min.is_none() {
            out.scout_min = Some(t / 60.0);
            out.scout_sends = idlever_core::tree::count(&g.lineage, "scout");
        }
        // Introductory sends prioritize the scout; paid camp chores follow that unlock.
        // Hire timestamps exclude later chores, whose real tap costs still extend the session.
        if (arm == 2 || arm == 3) && idlever_core::tree::auto_send(&g.lineage) {
            t += HIRE_S * first_session_chores(g, ask) as f64;
        }
        note_nodes(g, out, t / 3600.0);
        note_beats(g, out, t / 60.0);
        if idlever_core::tree::auto_send(&g.lineage) && t >= stay {
            break;
        }
        let before = (out.deaths, g.lineage.total_turns);
        // Cut230: before the scout the client refuses SEND while the hero recovers (`try_send`): the player waits the
        // recovery out at camp (charged whole), then sends — a send by hand during recovery is no send by hand
        t += wait_recovery(g);
        t += send_once(g, out) / WATCH_X + CAMP_S;
        // (`DP_SCOUT_TRACE`: a diagnostic line per first-session send — never in a gate run's output)
        if std::env::var("DP_SCOUT_TRACE").is_ok() && out.scout_min.is_none() {
            eprintln!("scout-trace seed {} arm {arm} t {:.0}s death {} ticks {} best D{} gold {} sends {} price {}", g.lineage.seed, t, out.deaths > before.0, g.lineage.total_turns - before.1, g.lineage.best_depth, g.lineage.gold, idlever_core::tree::count(&g.lineage, "scout"), idlever_core::tree::price(&g.lineage, idlever_core::tree::def("scout").unwrap()));
        }
    }
    out.session_m = t / 60.0;
    t as u64
}

/// A check-in before the scout: sends by hand until he is hired (the gem, then the camp's taps).
fn by_hand_until_scout(g: &mut Game, out: &mut SeedOut, ask: &Ask, h: f64) {
    let arm = ask.q(Q::Arm);
    for _ in 0..20 {
        camp_taps(g, ask, arm, out, h);
        if idlever_core::tree::auto_send(&g.lineage) {
            break;
        }
        wait_recovery(g);
        send_once(g, out);
    }
}

/// Cut230: before the scout, the death recovery still owed waited out at camp (`Game::try_send` refuses until it
/// ends). Its seconds; 0 once the scout sends (his sends wait for it themselves).
fn wait_recovery(g: &mut Game) -> f64 {
    let owed = idlever_core::persistent::remaining(&g.lineage);
    if owed == 0 || idlever_core::tree::auto_send(&g.lineage) || g.run.as_ref().is_some_and(|r| r.turn > 0 && r.over.is_none()) {
        return 0.0;
    }
    g.lineage.rest_left = g.lineage.rest_left.max(owed as u32);
    g.rest_tick(owed as u32);
    owed as f64 / 10.0
}

/// The works tree's taps at camp, by arm: every bot hires the scout the moment he lights (IDLE's one engagement);
/// HANDS, PICKED and TUNED open the chest (so the free porter lights first: they hire him too); PICKED and TUNED
/// hire each lit node the purse and chest pay (a node whose system the configuration leaves out is hired and
/// switched off: its chore stays undone; PICKED − nodes hires the trunk to the scout alone). Purse + chest + bank against the ledger, the largest chest.
fn camp_taps(g: &mut Game, ask: &Ask, arm: u8, out: &mut SeedOut, h: f64) {
    use idlever_core::tree;
    if arm == 4 {
        return;
    }
    // Engaged bots make the player's newly manual construction choices at camp.
    if arm == 2 || arm == 3 {
        for (id, _) in idlever_core::town::BUILDINGS {
            if id != "bank" || ask.has("bank") { let _ = g.build_town(id); }
        }
    }
    if (arm == 2 || arm == 3) && g.lineage.tree.chest > 0 {
        let _ = g.open_chest();
    }
    for _ in 0..tree::NODES.len() {
        let Some(n) = tree::lit(&g.lineage) else { break };
        if g.lineage.gold < tree::price(&g.lineage, n) {
            break;
        }
        // (the trunk to the scout is every bot's: a bot that opens the chest lights the free porter first, in
        // the scout's way — HANDS and PICKED − nodes hire him too, and never another)
        let trunk = n.id == "scout" || (n.id == "porter" && (g.lineage.town.auto_collect || (arm != 0 && arm != 1)));
        if !trunk && (arm != 2 || !ask.has("nodes")) {
            break;
        }
        let off = match n.id {
            "apprentice" => Some("forge"),
            "clerk" => Some("bank"),
            "kennel_hand" | "kennel_keeper" => Some("pets"),
            "drillmaster" => Some("packages"),
            "herald" => Some("quests"),
            _ => None,
        };
        // (Cut273: the workplace built — exactly the hire: its trigger, its price, one at a time)
        if g.build_workplace(idlever_core::town::workplace_of(n.id).map_or("", |w| w.id)).is_err() {
            break;
        }
        if off.is_some_and(|sys| !ask.has(sys)) {
            let _ = g.set_worker(n.id, false);
        }
        // (`DP_OFF=a,b`: a probe's workers hired and switched off — never in a gate run)
        if std::env::var("DP_OFF").is_ok_and(|v| v.split(',').any(|x| x == n.id)) {
            let _ = g.set_worker(n.id, false);
        }
    }
    // (week 2: PICKED and TUNED — with nodes or by hand — take each hired worker's rank on offer as the purse and
    // chest pay it, after any hire)
    for _ in 0..tree::NODES.len() {
        let Some(n) = tree::lit_rank(&g.lineage) else { break };
        if arm != 2 || g.lineage.gold < tree::rank_price(&g.lineage, n) || g.promote(n.id).is_err() {
            break;
        }
    }
    let l = &g.lineage;
    if l.gold as i64 + l.town.bank as i64 != l.tree.ledger || l.tree.chest < 0 || l.tree.chest > l.gold {
        out.unconserved += 1;
    }
    out.chest_max = out.chest_max.max(l.tree.chest as i64);
    note_nodes(g, out, h);
}

/// The guide's start by hand: the worker's own rule (`tree::guide_pick`), when it moves the start.
fn guide_pick(g: &Game) -> Option<u32> {
    let s = idlever_core::tree::guide_pick(&g.lineage, true);
    (s != g.lineage.start.max(1)).then_some(s)
}

/// The chores HANDS, PICKED and TUNED do by hand until a worker does them: the herald's swap (a quest from an
/// earlier day still unkept), the guide's start, the pets fielded (asked when the kennel has one to field).
fn by_hand_rest(g: &mut Game, ask: &Ask) -> u32 {
    let mut taps = 0;
    use idlever_core::tree;
    let l = &g.lineage;
    if !tree::on(l, "herald") && idlever_core::town::quests_open(l) && l.town.quest.as_ref().is_some_and(|q| !q.done && q.day < idlever_core::town::today(l)) && l.town.swap_day != Some(l.day) {
        taps += u32::from(g.swap_quest().is_ok());
    }
    // (`DP_OFF=guide`: a probe without the guide's starts at all, by hand or by the worker)
    if !tree::on(&g.lineage, "guide") && !std::env::var("DP_OFF").is_ok_and(|v| v.split(',').any(|x| x == "guide")) {
        if let Some(s) = guide_pick(g) {
            taps += u32::from(g.set_start(s).is_ok());
        }
    }
    let l = &g.lineage;
    if !tree::on(l, "kennel_hand") && l.party.len() < l.party_slots() as usize && !l.kennel.is_empty() && ask.has("pets") {
        let before = g.lineage.party.len();
        field_kennel(g);
        taps += (g.lineage.party.len() - before) as u32;
    }
    taps
}

/// The documented first-session chores, paid from earned resources and charged as actual taps.
fn first_session_chores(g: &mut Game, ask: &Ask) -> u32 {
    let mut taps = 0;
    let stance = g.lineage.pkg.stance.clone();
    if idlever_core::packages::level_price(&g.lineage, &stance).is_some_and(|price| price <= g.lineage.marks) && ask.has("packages") {
        while idlever_core::packages::level_price(&g.lineage, &stance).is_some_and(|price| price <= g.lineage.marks) {
            if g.spend_level(&stance).is_err() { break; }
            taps += 1;
        }
    }
    let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
    let apprentice_all = idlever_core::tree::on(&g.lineage, "apprentice") && idlever_core::tree::forge_share(&g.lineage).is_none();
    if !apprentice_all && forge_due(g, reserve) && ask.has("forge") { taps += forge(g, reserve); }
    taps += by_hand_rest(g, ask);
    if idlever_core::town::built(&g.lineage, "bank") && !idlever_core::tree::on(&g.lineage, "clerk") && ask.has("bank") {
        let next = idlever_core::kit::ladders(&g.lineage).iter().filter_map(|l| l.next.as_ref().map(|x| x.price as i32)).min().unwrap_or(0);
        let spare = g.lineage.gold - next - reserve;
        if spare > 0 && g.bank_deposit(spare).is_ok() { taps += 1; }
    }
    taps
}

/// HANDS: every open chore by hand at a check-in — the forge's steps keeping the shelf's money, a deposit
/// above the next step, the worn stance's levels, the herald's swap, the guide's start, the pets.
fn hands_chores(g: &mut Game) {
    let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
    let stance = g.lineage.pkg.stance.clone();
    while idlever_core::packages::level_price(&g.lineage, &stance).is_some_and(|m| m <= g.lineage.marks) {
        if g.spend_level(&stance).is_err() {
            break;
        }
    }
    if forge_due(g, reserve) {
        forge(g, reserve);
    }
    let l = &g.lineage;
    if !idlever_core::tree::on(l, "herald") && idlever_core::town::quests_open(l) && l.town.quest.as_ref().is_some_and(|q| !q.done && q.day < idlever_core::town::today(l)) && l.town.swap_day != Some(l.day) {
        let _ = g.swap_quest();
    }
    if let Some(s) = guide_pick(g) {
        let _ = g.set_start(s);
    }
    let l = &g.lineage;
    if l.party.len() < l.party_slots() as usize && !l.kennel.is_empty() {
        field_kennel(g);
    }
    if idlever_core::town::built(&g.lineage, "bank") {
        let next = idlever_core::kit::ladders(&g.lineage).iter().filter_map(|l| l.next.as_ref().map(|x| x.price as i32)).min().unwrap_or(0);
        let spare = idlever_core::tree::purse(&g.lineage) - next - reserve;
        if spare > 0 {
            let _ = g.bank_deposit(spare);
        }
    }
}

/// Each node's hours: its chore open, its trigger met, hired (first time each).
fn note_nodes(g: &Game, out: &mut SeedOut, h: f64) {
    use idlever_core::tree;
    let l = &g.lineage;
    for n in tree::NODES.iter().filter(|n| !n.chore.is_empty()) {
        let first = |v: &mut Vec<(String, f64)>| {
            if !v.iter().any(|(id, _)| id == n.id) {
                v.push((n.id.to_string(), h));
            }
        };
        if tree::chore_open(l, n) {
            first(&mut out.node_open_h);
        }
        if tree::ready(l, n) {
            first(&mut out.node_ready_h);
        }
        if tree::hired(l, n.id) {
            first(&mut out.node_hired_h);
        }
    }
}

/// Cut231 §4 (the unlock timeline): one observed beat — the player minute it was first seen (the first session's
/// own clock; a check-in's return after an absence), its key (`kind:id`), whether it puts a new decision in front
/// of the player, and whether it is a minor beat (continuous progress: a new record floor, a class level — never
/// counted by the cadence row). `m` < 0: the state the game began in (a baseline, never a beat).
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
struct Beat {
    m: f64,
    k: String,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    d: bool,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    minor: bool,
}

/// Cut231 §4: the beats the state shows now (`kind:id`, decision, minor). Reads the game only — never a tap, never a
/// call that moves the game — so the timeline cannot change an outcome (the invariance proof diffs the job cache).
///   decisions: `lit:<worker>` (its hire offered), `rankable:<worker>:<n>` (the one rank on offer), `plot:<building>` (its construction offered), `pkg:<id>` (a
///   package to wear), `levelable:<stance>:<n>` (a stance level the marks pay), `system:<trigger>` (a reveal: one unit
///   per trigger, as `max_systems` counts them), `chest:first` (the first chest to open by hand), `legacy:offer` (a
///   Legacy upgrade the points pay);
///   beats: `hire:<worker>`, `rank:<worker>:<n>`, `built:<building>`, `level:<stance>:<n>`, `boss:<kind>` (first kill), `record:D<m>`
///   (a `MILESTONES` depth), `legacy:spent`, `reclone`, `king:try`, `king:slain`, `death:first`;
///   minor: `depth:D<n>` (each new record floor), `class:<n>`, `bloodline2:affordable` (house up, purse ≥ the slot
///   price — the dayplayer plays one bloodline and never founds a second).
fn beats_now(g: &Game) -> Vec<(String, bool, bool)> {
    use idlever_core::{packages, town, tree};
    let l = &g.lineage;
    let mut v: Vec<(String, bool, bool)> = Vec::new();
    for n in tree::NODES {
        if tree::hired(l, n.id) {
            v.push((format!("hire:{}", n.id), false, false));
        } else if tree::ready(l, n) {
            v.push((format!("lit:{}", n.id), true, false));
        }
    }
    for n in tree::NODES {
        for r in 2..=tree::rank(l, n.id) {
            v.push((format!("rank:{}:{r}", n.id), false, false));
        }
    }
    if let Some(n) = tree::lit_rank(l) {
        v.push((format!("rankable:{}:{}", n.id, tree::rank(l, n.id) + 1), true, false));
    }
    for b in ["house", "blacksmith", "kennel", "bank"] {
        if town::build_ready(l, b) {
            v.push((format!("plot:{b}"), true, false));
        }
        if town::built(l, b) || (b == "house" && l.town.home == Some(true)) {
            v.push((format!("built:{b}"), false, false));
        }
    }
    for id in l.pkg.owned.iter() {
        v.push((format!("pkg:{id}"), true, false));
    }
    let stance = &l.pkg.stance;
    let lv = l.pkg.level(stance);
    for n in 2..=lv {
        v.push((format!("level:{stance}:{n}"), false, false));
    }
    if packages::level_price(l, stance).is_some_and(|p| p <= l.marks) {
        v.push((format!("levelable:{stance}:{}", lv + 1), true, false));
    }
    for id in l.systems.iter() {
        if let Some(d) = idlever_core::systems::SYSTEMS.iter().find(|d| d.id == id.as_str()) {
            let key = if d.trigger.is_empty() { format!("system:{id}") } else { format!("system:{}", d.trigger) };
            if !v.iter().any(|(k, _, _)| *k == key) {
                v.push((key, true, false));
            }
        }
    }
    if l.tree.chest > 0 || tree::count(l, "porter") > 0 {
        v.push(("chest:first".into(), true, false));
    }
    if idlever_core::legacy::offers(l, false).iter().any(|u| u.affordable) {
        v.push(("legacy:offer".into(), true, false));
    }
    if idlever_core::legacy::current(l).is_some_and(|b| b.spent > 0 || !b.upgrades.is_empty()) {
        v.push(("legacy:spent".into(), false, false));
    }
    if l.persistent.rebirths > 0 {
        v.push(("reclone".into(), false, false));
    }
    for k in l.kills.iter() {
        if idlever_core::defs::monster_def(k).boss {
            v.push((format!("boss:{k}"), false, false));
        }
    }
    for m in MILESTONES {
        if l.best_depth >= m {
            v.push((format!("record:D{m}"), false, false));
        }
    }
    if l.feats.siege.get("mirror_king").is_some_and(|s| s.tries > 0) || l.kills.contains("mirror_king") {
        v.push(("king:try".into(), false, false));
    }
    if l.kills.contains("mirror_king") {
        v.push(("king:slain".into(), false, false));
    }
    if l.systems.contains("death") {
        v.push(("death:first".into(), false, false));
    }
    for d in 1..=l.best_depth {
        v.push((format!("depth:D{d}"), false, true));
    }
    for n in 2..=l.class_level() {
        v.push((format!("class:{n}"), false, true));
    }
    if l.town.home != Some(false) && l.gold >= idlever_core::bloodlines::SLOT_PRICE {
        v.push(("bloodline2:affordable".into(), false, true));
    }
    v
}

/// Cut231 §4: the beats new since the last look, stamped at player minute `m` (the first look is the baseline).
fn note_beats(g: &Game, out: &mut SeedOut, m: f64) {
    let base = out.timeline.is_empty();
    for (k, d, minor) in beats_now(g) {
        if !out.timeline.iter().any(|b| b.k == k) {
            out.timeline.push(Beat { m: if base { -1.0 } else { m }, k, d, minor });
        }
    }
}

/// Cut231 §4: a decision's unit — each worker's hire, each building's plot and each reveal (by trigger) is its own
/// decision; the packages that arrive together are one pick (one shelf), as are the stance's levels, the chest and the
/// Legacy offers.
fn decision_unit(k: &str) -> &str {
    let kind = k.split(':').next().unwrap_or(k);
    if matches!(kind, "lit" | "plot" | "system") { k } else { kind }
}

/// Cut231 §4: the first-30-min cadence of one seed — the longest gap between major beats over the player's first
/// `win` minutes (from minute 0 to the first beat, between beats, and from the last to the window's end when the
/// session reaches it, else to the session's end), and the most new decisions one look brought (a look = one
/// minute stamp). `None` when the seed recorded no timeline.
/// Cut233 (owner 2026-10-15): the gap counts between looks only — a stretch with no camp arrival (`SeedOut::looks`)
/// strictly inside it is one watched run (the player is watching it), never a gap. A seed without looks (an old
/// job) counts every stretch, as before.
fn cadence(o: &SeedOut, win: f64, session_m: f64) -> Option<(f64, usize)> {
    if o.timeline.is_empty() {
        return None;
    }
    let end = win.min(session_m.max(0.0));
    let mut times: Vec<f64> = o.timeline.iter().filter(|b| !b.minor && b.m >= 0.0 && b.m <= end).map(|b| b.m).collect();
    times.sort_by(|a, b| a.total_cmp(b));
    times.dedup();
    let mut gap = 0.0f64;
    let mut last = 0.0;
    for t in times.iter().chain(std::iter::once(&end)) {
        let one_run = !o.looks.is_empty() && !o.looks.iter().any(|v| *v > last && *v < *t);
        if !one_run {
            gap = gap.max(t - last);
        }
        last = *t;
    }
    let mut most = 0usize;
    for t in &times {
        let mut units: Vec<&str> = o.timeline.iter().filter(|b| b.d && !b.minor && b.m == *t).map(|b| decision_unit(&b.k)).collect();
        units.sort_unstable();
        units.dedup();
        most = most.max(units.len());
    }
    Some((gap, most))
}

/// Cut233: the longest stretch between two consecutive first-session looks inside the first `win` minutes (one
/// watched run, its recovery wait and the camp after it) — reported beside the cadence gap, never gated.
fn longest_run(o: &SeedOut, win: f64) -> f64 {
    o.looks.windows(2).filter(|w| w[0] < win).map(|w| w[1].min(win) - w[0]).fold(0.0f64, f64::max)
}

thread_local! {
    static PH: std::cell::RefCell<std::collections::BTreeMap<&'static str, f64>> = Default::default();
}
/// This process's CPU seconds (user + system, `/proc/self/stat`): a phase's sims run on worker threads.
fn proc_cpu() -> f64 {
    let s = std::fs::read_to_string("/proc/self/stat").unwrap_or_default();
    let f: Vec<&str> = s.rsplit(')').next().unwrap_or("").split_whitespace().collect();
    let t = |i: usize| f.get(i).and_then(|x| x.parse::<f64>().ok()).unwrap_or(0.0);
    (t(11) + t(12)) / 100.0
}
/// `DP_PHASES=1` (one group at a time, `--threads 1`: the process's CPU is the group's): each phase's CPU
/// seconds on the group's line, and each day's best and CPU.
fn ph<R>(name: &'static str, f: impl FnOnce() -> R) -> R {
    if std::env::var_os("DP_PHASES").is_none() {
        return f();
    }
    let t = proc_cpu();
    let r = f();
    let dt = proc_cpu() - t;
    PH.with(|m| *m.borrow_mut().entry(name).or_default() += dt);
    r
}

/// What a bot's play reads of its configuration. Every read goes through `Ask` and is logged, so two
/// configurations that answer a check-in's reads alike play that check-in alike from the same state —
/// the fortnights of a seed share their common prefix (`Tree`): PICKED, TUNED and its leave-one-outs
/// are one game until a read tells them apart (TUNED's at the pen, TUNED − forge's at its first forge
/// step …), and TUNED − pen is PICKED throughout. A read is asked where its answer is used, never
/// earlier (`ask.has("forge")` only when a forge step is affordable), so the shared prefix is the
/// longest the code allows.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Q {
    /// the bot's arm: 0 IDLE, 1 RANDOM, 2 PICKED or TUNED, 3 HANDS, 4 IDLE30
    Arm,
    /// TUNED with its pen (the pen's rows written once it opens)
    Tuned,
    Has(&'static str),
    /// Cut 30.5: one check-in a day (the away player)
    Cadence,
    /// Cut 121 §1: the Legacy spent by hand at a check-in (PICKED+L), asked only when an upgrade is affordable
    Legacy,
}

fn answer(cfg: &Cfg, q: Q) -> u8 {
    match q {
        Q::Arm => match cfg.bot {
            Bot::Idle => 0,
            Bot::Random => 1,
            Bot::Picked | Bot::Tuned | Bot::Daily | Bot::Away | Bot::PickedL => 2,
            Bot::Hands => 3,
            Bot::Idle30 => 4,
        },
        Q::Tuned => (cfg.bot == Bot::Tuned && cfg.has("pen")) as u8,
        Q::Cadence => match cfg.bot {
            Bot::Daily => 1,
            Bot::Away => 2,
            _ => 0,
        },
        Q::Has(s) => cfg.has(s) as u8,
        Q::Legacy => (cfg.bot == Bot::PickedL) as u8,
    }
}

struct Ask<'a> {
    cfg: &'a Cfg,
    log: std::cell::RefCell<Vec<(Q, u8)>>,
}

impl Ask<'_> {
    fn new(cfg: &Cfg) -> Ask<'_> {
        Ask { cfg, log: Default::default() }
    }
    fn q(&self, q: Q) -> u8 {
        let a = answer(self.cfg, q);
        self.log.borrow_mut().push((q, a));
        a
    }
    fn has(&self, s: &'static str) -> bool {
        self.q(Q::Has(s)) == 1
    }
    /// Whether `other` answers every read logged so far as this configuration did.
    fn same(&self, other: &Cfg) -> bool {
        self.log.borrow().iter().all(|(q, a)| answer(other, *q) == *a)
    }
}

/// One bot's fortnight as a state that advances a check-in at a time (`step`), cloned where the
/// configurations sharing it part.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Play {
    #[serde(default)]
    upgrade_plan: upgrade_plan::Plan,
    seed: u64,
    days: usize,
    checkins: u64,
    interval: u64,
    verbose: bool,
    #[serde(with = "checkpoint_game")]
    g: Game,
    out: SeedOut,
    rng: Rng,
    last_best: u32,
    stall_cur: usize,
    reached23: bool,
    k: u64,
    last_key: Option<(usize, u32, Vec<String>)>,
    cool: u32,
    last_wall: Option<usize>,
    gap: usize,
    // the day's
    wealth0: i64,
    new_today: bool,
    level0: u32,
    stages0: Vec<(String, String)>,
    opened: bool,
    /// the next check-in
    day: usize,
    ci: u64,
    /// Cut 30.5: the first session's seconds (the first absence is the check-in interval less them)
    session_s: u64,
    counter_copies: Vec<CounterCopy>,
}

/// Internal check-in snapshot, not a player save: Game::load applies camp
/// migrations, so restore the complete serde state directly and exactly.
#[derive(serde::Serialize, serde::Deserialize)]
struct Checkpoint { key: String, body: String, checksum: u64 }
fn checkpoint_hash(text: &str) -> u64 { idlever_core::rng::hash_str(text) }
fn checkpoint_read(path: &std::path::Path, key: &str, seed: u64, days: usize) -> Option<Play> {
    let record: Checkpoint = jobcache::read(path)?;
    if record.key != key || checkpoint_hash(&record.body) != record.checksum { return None; }
    let p: Play = jobcache::decode(&record.body)?;
    (p.seed == seed && p.out.seed == seed && p.days == days && p.day <= days
        && p.checkins > 0 && p.ci < p.checkins && p.interval == 24 * 3600 / p.checkins
        && !p.verbose && !p.done()).then_some(p)
}
fn checkpoint_keep(path: &std::path::Path, key: &str, p: &Play) {
    if let Some(body) = jobcache::text(p) {
        jobcache::keep(path, &Checkpoint { key: key.into(), checksum: checkpoint_hash(&body), body });
    }
}

#[cfg(test)]
mod cadence_tests {
    use super::*;
    fn beat(m: f64) -> Beat {
        Beat { m, k: format!("b{m}"), d: false, minor: false }
    }
    /// Cut233 (owner 2026-10-15): a stretch with no look inside it is one watched run, never a gap; a stretch over
    /// an empty look counts whole; an old job without looks counts every stretch.
    #[test]
    fn gap_counts_between_looks_only() {
        let mut o = SeedOut { timeline: vec![beat(-1.0), beat(8.0), beat(10.0), beat(20.0)], looks: vec![0.0, 8.0, 10.0, 15.0, 20.0, 27.0], ..Default::default() };
        // 0→8 and 8→10 are single runs; 10→20 spans the empty look at 15 (10 min); 20→30 spans the look at 27
        assert_eq!(cadence(&o, 30.0, 40.0), Some((10.0, 0)));
        o.looks = vec![0.0, 8.0, 10.0, 20.0, 27.0];
        assert_eq!(cadence(&o, 30.0, 40.0), Some((10.0, 0)), "20 → 30 still spans the look at 27");
        o.looks = vec![0.0, 8.0, 10.0, 20.0];
        assert_eq!(cadence(&o, 30.0, 40.0), Some((0.0, 0)), "every stretch one run");
        o.looks.clear();
        assert_eq!(cadence(&o, 30.0, 40.0), Some((10.0, 0)), "no looks: as before");
        assert_eq!(longest_run(&SeedOut { looks: vec![0.0, 8.0, 10.0, 20.0, 33.0], ..Default::default() }, 30.0), 10.0);
    }
}

#[cfg(test)]
mod checkpoint_tests {
    use super::*;
    #[test]
    fn resume_preserves_complete_bot_outputs_and_game() {
        idlever_core::forecast::set_parallel_sims(false);
        idlever_core::engine::set_capsules(false);
        let dir = std::env::temp_dir().join(format!("idlever-dp-checkpoint-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("play.json");
        for bot in [Bot::Idle, Bot::Random, Bot::Picked, Bot::Away] {
            let cfg = Cfg { bot, without: None };
            let mut original = Play::new(5, 2, 3, false, &Ask::new(&cfg));
            original.step(&Ask::new(&cfg));
            checkpoint_keep(&path, "exact-runtime-and-parameters", &original);
            assert!(checkpoint_read(&path, "changed-runtime", 5, 2).is_none());
            assert!(checkpoint_read(&path, "exact-runtime-and-parameters", 6, 2).is_none());
            let mut restored = checkpoint_read(&path, "exact-runtime-and-parameters", 5, 2).unwrap();
            while !original.done() { original.step(&Ask::new(&cfg)); }
            while !restored.done() { restored.step(&Ask::new(&cfg)); }
            assert_eq!(jobcache::text(&original.out), jobcache::text(&restored.out), "{} outputs", cfg.label());
            let a = original.g.save(); let b = restored.g.save();
            if a != b {
                std::fs::write(dir.join("original.json"), &a).unwrap();
                std::fs::write(dir.join("restored.json"), &b).unwrap();
                panic!("{} game mismatch: {}", cfg.label(), dir.display());
            }
            let mut bad: Checkpoint = jobcache::read(&path).unwrap();
            bad.body.push(' '); jobcache::keep(&path, &bad);
            assert!(checkpoint_read(&path, "exact-runtime-and-parameters", 5, 2).is_none());
            std::fs::write(&path, "truncated {").unwrap();
            assert!(checkpoint_read(&path, "exact-runtime-and-parameters", 5, 2).is_none());
        }
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn failure_priority_changes_only_queue_order() {
        let pool = Pool::default();
        let cfgs = [Cfg { bot: Bot::Idle, without: None }];
        for seed in 1..=6 { rows::push_seed_first(&pool, Group { seed, members: vec![0], state: None }, &cfgs, 2, 3, &[5]); }
        let mut seen = Vec::new();
        while let Some(g) = pool.pop() { seen.push(g.seed); pool.done(); }
        assert_eq!(seen, vec![5,1,2,3,4,6]);
        seen.sort(); assert_eq!(seen, (1..=6).collect::<Vec<_>>());
    }
}

#[cfg(test)]
mod session_chore_tests {
    use super::*;
    #[test]
    fn session_levels_are_paid_and_disabled_packages_do_nothing() {
        let cfg = Cfg { bot: Bot::Picked, without: Some("forge") };
        let mut g = Game::new_resident(7);
        // (Cut232: a level bought with marks comes with the Scout — the session's chores follow his hire)
        idlever_core::tree::grant(&mut g.lineage, &["porter", "scout"]);
        g.lineage.marks = 14; // Unit fixture, not an earned evaluation.
        let taps = first_session_chores(&mut g, &Ask::new(&cfg));
        assert_eq!(taps, 4);
        assert_eq!(g.lineage.marks, 0);
        assert_eq!(g.lineage.pkg.level("steady"), 5);
        assert_eq!(HIRE_S * taps as f64, 20.0);
        let off = Cfg { bot: Bot::Tuned, without: Some("packages") };
        let mut untouched = Game::new_resident(7);
        untouched.lineage.marks = 14;
        let before = untouched.save();
        assert_eq!(first_session_chores(&mut untouched, &Ask::new(&off)), 0);
        assert_eq!(untouched.save(), before);
    }
    #[test]
    fn session_forge_keeps_reserve_and_respects_disabled_or_automated_work() {
        let cfg = Cfg { bot: Bot::Picked, without: Some("packages") };
        let mut g = Game::new_resident(7);
        g.lineage.gold = 2000; // Unit fixture only.
        g.lineage.banked_depths.insert(1);
        // Controlled eligible plot for the reserve test, not an earned opening.
        g.lineage.town.forge_eligible = true;
        g.build_town("blacksmith").unwrap();
        let original = g.clone();
        let before = idlever_core::tree::count(&g.lineage, "apprentice");
        let taps = first_session_chores(&mut g, &Ask::new(&cfg));
        assert!(taps > 0);
        assert_eq!(taps, idlever_core::tree::count(&g.lineage, "apprentice") - before);
        assert!(g.lineage.gold >= 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32);
        assert!(g.lineage.gold < original.lineage.gold);
        let off = Cfg { bot: Bot::Tuned, without: Some("forge") };
        let mut disabled = original.clone();
        assert_eq!(first_session_chores(&mut disabled, &Ask::new(&off)), 0);
        assert_eq!(disabled.lineage.gold, original.lineage.gold);
        let mut automated = original;
        automated.lineage.orders.forge = "all".into();
        idlever_core::tree::grant(&mut automated.lineage, &["apprentice"]);
        let gold = automated.lineage.gold;
        assert_eq!(first_session_chores(&mut automated, &Ask::new(&cfg)), 0);
        assert_eq!(automated.lineage.gold, gold);
    }
    #[test]
    fn session_savings_respects_disabled_bank_and_keeps_next_forge_step() {
        let cfg = Cfg { bot: Bot::Picked, without: Some("forge") };
        let mut g = Game::new_resident(7);
        g.lineage.gold = 2000;
        g.lineage.last_night_net = 100;
        g.build_town("bank").unwrap();
        // Isolate Savings from manual forge purchases in both configurations (unit fixture only).
        g.lineage.orders.forge = "all".into();
        idlever_core::tree::grant(&mut g.lineage, &["apprentice"]);
        let original = g.clone();
        let wealth = g.lineage.gold + g.lineage.town.bank;
        let next = idlever_core::kit::ladders(&g.lineage).iter().filter_map(|l| l.next.as_ref().map(|x| x.price as i32)).min().unwrap_or(0);
        assert_eq!(first_session_chores(&mut g, &Ask::new(&cfg)), 1);
        assert!(g.lineage.town.bank > 0);
        assert!(g.lineage.gold >= next + 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32);
        assert_eq!(g.lineage.town.bank, idlever_core::town::bank_nights() * g.lineage.last_night_net);
        assert_eq!(g.lineage.gold + g.lineage.town.bank, wealth);
        let off = Cfg { bot: Bot::Tuned, without: Some("bank") };
        let mut disabled = original;
        assert_eq!(first_session_chores(&mut disabled, &Ask::new(&off)), 0);
        assert_eq!(disabled.lineage.town.bank, 0);
        assert_eq!(disabled.lineage.gold, wealth);
    }

}

impl Play {
    fn new(seed: u64, days: usize, checkins: u64, verbose: bool, ask: &Ask) -> Play {
        let checkins = if ask.q(Q::Cadence) > 0 { 1 } else { checkins };
        let interval = 24 * 3600 / checkins;
        let mut g = Game::new_resident(seed);
        // Explicit controlled causal experiment, never a player/gate protocol.
        if std::env::var_os("DP_CAUSAL_START_FORGE").is_some() {
            assert!(verbose, "causal setup requires verbose diagnostic/no caches");
            g.lineage.town.forge_eligible = true;
            g.build_town("blacksmith").expect("controlled initial Forge");
            g.lineage.kennel_leash();
            assert!(g.lineage.supplies.iter().any(|s| s.kind == "leash" && s.free), "controlled first shelf really contains free leash");
            eprintln!("CONTROLLED initial built Forge/free leash: not earned pacing acceptance");
        }
        if !ask.has("quests") {
            g.lineage.town.off = true;
        }
        // (Cut 30's IDLE: an old save's workers — the porter, the scout — from the start, no session)
        if ask.q(Q::Arm) == 4 {
            idlever_core::tree::grant(&mut g.lineage, &idlever_core::tree::LEGACY);
        }
        let out = SeedOut { seed, hours: vec![None; MILESTONES.len()], ..Default::default() };
        let rng = Rng::derive(seed, 0x5EED_0B07);
        Play { upgrade_plan:upgrade_plan::Plan::new(seed,ask.cfg), seed, days, checkins, interval, verbose, g, out, rng, last_best: 0, stall_cur: 0, reached23: false, k: 0, last_key: None, cool: 0, last_wall: None, gap: 0, wealth0: 0, new_today: false, level0: 0, stages0: Vec::new(), opened: false, day: 0, ci: 0, session_s: 0, counter_copies: Vec::new() }
    }

    fn done(&self) -> bool {
        self.day >= self.days
    }

    /// One check-in (its day's start before the first, the day's end after the last).
    fn step(&mut self, ask: &Ask) {
        let (checkins, interval, verbose, day, ci) = (self.checkins, self.interval, self.verbose, self.day, self.ci);
        let cfg = ask.cfg;
        if ci == 0 {
            let g = &self.g;
            self.wealth0 = g.lineage.gold as i64 + g.lineage.town.bank as i64;
            self.new_today = false;
            self.level0 = g.lineage.class_level();
            self.stages0 = idlever_core::town::stage_set(&g.lineage);
            self.opened = false;
        }
        let Play { g, out, rng, k, last_key, cool, last_wall, session_s, counter_copies, upgrade_plan, .. } = self;
        {
            *k += 1;
            let tuned = g.lineage.pkg.pen_open && ask.q(Q::Tuned) == 1;
            // (the stall verdict and the death verdict cost more than the absence: TUNED reads the worst
            // death once a day and takes the wall's edit for a plateau)
            // Cut 30.5: day 0 opens with the first session (the sends by hand to the scout, the engaged bots'
            // stay); a check-in before the scout sends by hand until he is hired
            if *k == 1 {
                *session_s = first_session(g, out, ask);
                // (`DP_SESSION_ONLY=1`: the first session alone, for a cadence tuning loop — never in a gate run)
                if std::env::var_os("DP_SESSION_ONLY").is_some() {
                    self.day = self.days;
                    return;
                }
            } else if !idlever_core::tree::auto_send(&g.lineage) {
                let h = ((*k - 1) * interval) as f64 / 3600.0;
                by_hand_until_scout(g, out, ask, h);
            }
            let elapsed = if *k == 1 { interval.saturating_sub(*session_s).max(1) } else { interval };
            // (`DP_SAVE_DIR=dir`: each absence's camp saved, for the wall-absence probe — never in a gate run)
            if let Some(dir) = std::env::var_os("DP_SAVE_DIR") {
                let _ = std::fs::write(std::path::Path::new(&dir).join(format!("{}-s{}-d{}-c{ci}.json", cfg.label(), self.seed, day + 1)), g.save());
            }
            let rep = ph("offline", || idlever_core::offline::run_offline_counts(g, elapsed));
            out.checkins += 1;
            out.sends += rep.runs;
            out.stalled += rep.stalled;
            out.deaths += rep.deaths.iter().map(|d| d.n).sum::<u32>();
            // `DP_STALLS=1`: each stalled send's last turns (the rows that looped)
            if rep.stalled > 0 && std::env::var("DP_STALLS").is_ok() {
                for rec in g.deaths.values().filter(|r| r.death.verdict == "stall" && !r.death.trace.turns.is_empty()) {
                    let tail: Vec<String> = rec.death.trace.turns.iter().rev().take(8).map(|t| if t.row >= 0 { rec.rules.rows.get(t.row as usize).map(|r| format!("{}[{}]", r.describe(), r.origin.clone().unwrap_or_default())).unwrap_or_default() } else { format!("chore {}", t.verb.v) }).collect();
                    eprintln!("  stall D{} {}: {}", rec.death.depth, rec.death.cause, tail.join(" | "));
                }
                g.deaths.retain(|_, r| r.death.verdict != "stall");
            }
            out.grew += !rep.grew.is_empty() as u32;
            out.picks += rep.pick.is_some() as u32;
            self.opened |= !rep.systems_opened.is_empty();
            // (a reveal is a unit: the pen's group is one)
            let mut triggers: Vec<&str> = rep.systems_opened.iter().filter_map(|id| idlever_core::systems::SYSTEMS.iter().find(|d| d.id == id).map(|d| d.trigger)).collect();
            triggers.dedup();
            let units = triggers.len();
            out.max_systems = out.max_systems.max(units);
            out.max_beats = out.max_beats.max(rep.packages.len() + units);
            self.new_today |= !rep.systems_opened.is_empty() || !rep.packages.is_empty() || !rep.bests.is_empty();
            let hours = (*k * interval) as f64 / 3600.0;
            for (i, m) in MILESTONES.iter().enumerate() {
                if out.hours[i].is_none() && g.lineage.best_depth >= *m {
                    out.hours[i] = Some(hours);
                }
            }
            if out.king_day.is_none() && g.lineage.kills.contains("mirror_king") {
                out.king_day = Some(day + 1);
            }
            if out.kit_h.is_none() && idlever_core::feats::kit_complete(&g.lineage) {
                out.kit_h = Some(hours);
                out.kit_at = Some((income(g), wealth(g)));
            }
            out.king_left = g.lineage.feats.siege.get("mirror_king").map(|s| (s.best_pct, s.tries));
            if verbose && !rep.packages.is_empty() {
                eprintln!("  [{}] day {} {}", cfg.label(), day + 1, rep.packages.join(" · "));
            }
            if verbose {
                eprintln!("  [{}] day {} ci {} runs {} bank {} ret {} stalled {} deaths {:?} best D{} wearing {:?}", cfg.label(), day + 1, ci, rep.runs, rep.banked, rep.returned, rep.stalled, rep.deaths.iter().map(|d| format!("{}×{}", d.cause, d.n)).collect::<Vec<_>>(), g.lineage.best_depth, g.lineage.pkg.equipped());
                if g.lineage.best_depth >= 26 {
                    let pen: Vec<String> = g.lineage.pkg.pen.iter().map(|r| r.describe()).collect();
                    eprintln!("    qm {:?} shelf {:?} pen {:?} queen counter {} silence id {}", idlever_core::packages::quartermaster(&g.lineage), g.lineage.supplies.iter().map(|s| s.kind.clone()).collect::<Vec<_>>(), pen, idlever_core::facts::boss_counter_known(&g.lineage.facts, "lurker_queen"), idlever_core::item::is_identified(&g.lineage.facts, &g.lineage.flavours, "silence"));
                }
            }
            let hours_now = hours;
            // (Cut 30.5, the owner: the away player looks in every 2–3 days — between, the absence runs on alone)
            let present = ask.q(Q::Cadence) != 2 || away_checkin(day);
            let arm = if present { ask.q(Q::Arm) } else { 99 };
            // (Cut231 §4: the return as the player finds it, before the camp's taps; an away check-in unseen)
            if present {
                note_beats(g, out, hours_now * 60.0);
            }
            // Cut 30.5: the camp's taps of the works tree (the chest, the hires) before the bot's own
            if present {
                camp_taps(g, ask, arm, out, hours_now);
            }
            match arm {
                0 | 4 | 99 => {}
                3 => hands_chores(g),
                1 => {
                    // a random package each check-in, blind: any arrived one (the worn one included)
                    // into its slot — not a forecast's move list, which holds only moves worth making
                    let owned: Vec<String> = g.lineage.pkg.owned.iter().filter(|id| idlever_core::packages::def(id).is_some()).cloned().collect();
                    if !owned.is_empty() {
                        let id = owned[rng.below(owned.len() as u32) as usize].clone();
                        let slot = rng.below(2) as usize;
                        let _ = idlever_core::packages::equip(&mut g.lineage, &id, slot);
                    }
                    if g.lineage.pkg.pen_open && rng.chance(34) {
                        let vocab = g.vocabulary();
                        let set = idlever_core::probes::random_rules(rng, &vocab, 3);
                        let mut rules = g.lineage.rules().clone();
                        rules.rows.retain(|r| r.is_pkg());
                        for (i, r) in set.rows.into_iter().enumerate() {
                            rules.rows.insert(i, r.from("player"));
                        }
                        let _ = g.set_rules(rules);
                    }
                }
                _ => {
                    if ask.has("packages") {
                        // the forecast is read when something new is on the shelf (a package arrived, a
                        // new record, a wake card) and once a day besides
                        // (a swap holds a day before the next is weighed, unless a package arrives)
                        let key = (g.lineage.pkg.owned.len(), g.lineage.best_depth, g.lineage.pkg.offer.clone());
                        let arrived = last_key.as_ref().is_some_and(|k| k.0 != key.0 || k.2 != key.2);
                        // (once a day, and when a package arrives: a new record alone re-reads nothing — the
                        // camp's panels are the harness's costliest call)
                        let fresh = arrived || (*cool == 0 && ci == 0);
                        let stance = g.lineage.pkg.equipped();
                        ph("pick", || pick_package(g, verbose, day, fresh));
                        *cool = if g.lineage.pkg.equipped() != stance { checkins as u32 } else { cool.saturating_sub(1) };
                        *last_key = Some((g.lineage.pkg.owned.len(), g.lineage.best_depth, g.lineage.pkg.offer.clone()));
                    }
                    // Cut 121 §1: PICKED+L spends its Legacy `balanced` by hand at each check-in (asked only when the
                    // points buy an upgrade: PICKED and PICKED+L share a game until then)
                    if legacy_balanced_pick(g).is_some() && ask.q(Q::Legacy) == 1 {
                        spend_legacy(g, out);
                    }
                    if tuned {
                        let pets = || ask.has("pets");
                        maintain_counter_copies(g, counter_copies);
                        write_own_rows(g, pets);
                        // a wall's counter, written once its fact is known (the drill is days away; at the deep
                        // walls a week): the boss on the record's floor or the next, not yet slain nor drilled
                        let best = g.lineage.best_depth;
                        let route = g.lineage.rules().route();
                        for b in [best, best + 1].into_iter().filter_map(|d| route.boss(d)) {
                            // (the Foundry only where the route puts it deep — its drill late: above that a
                            // package answers it, Hunter's reflect read, and a pen row over the stance hid that
                            // answer from the picker; its counter is its golems' fact, as its drill's)
                            let deep = route.boss_depth(b).is_some_and(|d| d >= idlever_core::packages::DEEP_FROM);
                            let known = if b == "foundry_master" {
                                deep && (idlever_core::facts::boss_counter_known(&g.lineage.facts, b) || idlever_core::facts::tag_known(&g.lineage.facts, "iron_golem", "reflect_melee"))
                            } else {
                                idlever_core::facts::boss_counter_known(&g.lineage.facts, b)
                            };
                            if known && !g.lineage.kills.contains(b) && !g.lineage.pkg.drills.iter().any(|d| d.boss == b) {
                                let heal = idlever_core::packages::heal_pct(&g.lineage.pkg.stance, g.lineage.pkg.level(&g.lineage.pkg.stance));
                                write_counter_rows(g, b, heal, counter_copies);
                            }
                        }
                        // (a death's patch is taken at a wall — the record held — not on the walk: the pen is
                        // the late fine-tuning a stuck player reaches for, and a patch for a death on the
                        // way down slowed the Deep's walk)
                        if let Some(id) = rep.worst_death_id.filter(|_| ci == 0 && idlever_core::wall::at_wall(&g.lineage)) {
                            if let Some(death) = ph("death", || g.death(id)) {
                                if death.verdict == "gap" {
                                    if let Some(patches) = ph("death_deltas", || g.death_deltas(id)) {
                                        if let Some(p) = measured_death_patch(&patches) {
                                            take_patch(g, p);
                                        }
                                    }
                                }
                            }
                        }
                        if let Some(stall) = &rep.stall {
                            if let Some(p) = measured_stall_patch(&stall.patches) {
                                take_patch(g, p);
                            }
                        }
                        // (the wall search is the harness's costliest call: at most every other day)
                        let fresh = g.lineage.wall_day != Some(g.lineage.day) && last_wall.is_none_or(|d| day >= d + 2);
                        if fresh && idlever_core::wall::at_wall(&g.lineage) {
                            *last_wall = Some(day);
                        }
                        if let Some(w) = if fresh { ph("wall", || g.wall_edit()) } else { None } {
                            if g.set_rules(w.rules.clone()).is_ok() {
                                if let Some(s) = w.start {
                                    let _ = g.set_start(s);
                                }
                                if verbose {
                                    eprintln!("  [{}] day {} wall D{}: {}", cfg.label(), day + 1, w.depth, w.edits.join(" ; "));
                                }
                            }
                        }
                        // room for the pen: the cheapest row unlock the marks pay for
                        let mut opts: Vec<_> = ph("unlocks", || g.unlocks()).into_iter().filter(|u| !u.owned && u.available && u.id.starts_with("row") && u.cost <= g.lineage.marks).collect();
                        opts.sort_by(|a, b| a.cost.cmp(&b.cost).then(a.id.cmp(&b.id)));
                        if let Some(u) = opts.first() {
                            let _ = g.buy(&u.id);
                        }
                        // (the kennel fielded when pets are in play: nothing to field, nothing asked)
                        if g.lineage.party.len() < g.lineage.party_slots() as usize && !g.lineage.kennel.is_empty() && pets() {
                            field_kennel(g);
                        }
                    }
                    // (the purse keeps the shelf's money: three units — a few sends' potions at depth)
                    let reserve = 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
                    // (blind 1fb7786: the apprentice's `half` order leaves the rest of the purse to the player's own taps)
                    let apprentice_all = idlever_core::tree::on(&g.lineage, "apprentice") && idlever_core::tree::forge_share(&g.lineage).is_none();
                    if !apprentice_all && forge_due(g, reserve) && ask.has("forge") {
                        forge(g, reserve);
                    }
                    // Cut 30.5: the chores by hand until their worker: the herald's swap, the guide's start, the pets
                    by_hand_rest(g, ask);
                    if idlever_core::town::built(&g.lineage, "bank") && !idlever_core::tree::on(&g.lineage, "clerk") {
                        // the purse keeps the next forge step and the shelf's money; the rest earns
                        let next = idlever_core::kit::ladders(&g.lineage).iter().filter_map(|l| l.next.as_ref().map(|x| x.price as i32)).min().unwrap_or(0);
                        let spare = g.lineage.gold - next - 3 * idlever_core::kit::unit(g.lineage.best_depth) as i32;
                        if spare > 0 && ask.has("bank") {
                            let _ = g.bank_deposit(spare);
                        }
                    }
                }
            }
            if present { upgrade_plan.step(g,day+1,ci,hours_now); }
            note_nodes(g, out, hours_now);
            if present {
                note_beats(g, out, hours_now * 60.0);
            }
        }
        self.ci += 1;
        if self.ci == checkins {
            self.day_end(cfg);
            self.ci = 0;
            self.day += 1;
            if self.done() {
                self.out.rules = self.g.lineage.rules().rows.iter().map(|r| r.describe()).collect::<Vec<_>>().join(" | ");
            }
        }
    }

    fn day_end(&mut self, cfg: &Cfg) {
        let (seed, day, verbose) = (self.seed, self.day, self.verbose);
        let Play { g, out, .. } = self;
        let best = g.lineage.best_depth;
        if std::env::var("DP_PHASES").is_ok() {
            eprintln!("  [{}] s{seed} day {} D{best} pen {} cpu {:.0}", cfg.label(), day + 1, g.lineage.pkg.pen_open, proc_cpu());
        }
        self.upgrade_plan.day_end(g,day+1);
        out.best_day.push(best);
        out.depth_area += best;
        out.quests = g.lineage.town.quests_done;
        out.gold_day.push(g.lineage.gold as i64 + g.lineage.town.bank as i64 - self.wealth0);
        if day == 2 {
            if let Some((i0, w0)) = out.kit_at {
                let earned = income(g) - i0;
                let kept = wealth(g) - w0;
                out.kit_spent_d3 = Some((earned, if earned > 0 { 100.0 * (earned - kept) as f64 / earned as f64 } else { 100.0 }));
            }
        }
        out.stance_level_day.push(g.lineage.pkg.level(&g.lineage.pkg.stance));
        self.opened |= idlever_core::town::stage_set(&g.lineage).len() > self.stages0.len();
        // `DP_STAGES=1`: each day's new stages
        if std::env::var_os("DP_STAGES").is_some() {
            let now = idlever_core::town::stage_set(&g.lineage);
            let new: Vec<String> = now.iter().filter(|x| !self.stages0.contains(x)).map(|(t, s)| format!("{t}:{s}")).collect();
            eprintln!("  [{}] s{} day {} D{} stages {} {}", cfg.label(), self.seed, day + 1, g.lineage.best_depth, if self.opened { "Y" } else { "-" }, new.join(", "));
        }
        out.stage_days += self.opened as usize;
        self.new_today |= g.lineage.class_level() > self.level0;
        if day == 0 {
            out.day1_systems = g.lineage.systems.len();
        }
        if self.new_today {
            out.new_days += 1;
            self.gap = 0;
        } else {
            self.gap += 1;
            out.new_gap = out.new_gap.max(self.gap);
        }
        if best > self.last_best {
            self.last_best = best;
            self.stall_cur = 0;
        } else if !self.reached23 {
            self.stall_cur += 1;
            out.stall = out.stall.max(self.stall_cur);
        }
        self.reached23 |= best >= 23;
        if verbose {
            let p = &g.lineage.pkg;
            eprintln!("  [{}] s{} day {} D{} ${} bank {} L{} {} L{} drills {} kit {} pen {} legacy ◆{} spent {}", cfg.label(), seed, day + 1, best, g.lineage.gold, g.lineage.town.bank, g.lineage.class_level(), p.stance, p.level(&p.stance), p.drills.len(), idlever_core::kit::KIT_SLOTS.iter().map(|s| idlever_core::kit::owned(&g.lineage, s)).sum::<u32>(), p.pen_open, idlever_core::legacy::current(&g.lineage).map_or(0, |b| b.points), idlever_core::legacy::current(&g.lineage).map_or(0, |b| b.spent));
        }
    }
}

/// One configuration's fortnight, alone.
#[allow(dead_code)]
fn play(seed: u64, days: usize, checkins: u64, cfg: Cfg, verbose: bool) -> SeedOut {
    let ask = Ask::new(&cfg);
    let mut p = Play::new(seed, days, checkins, verbose, &ask);
    while !p.done() {
        p.step(&Ask::new(&cfg));
    }
    p.out
}

/// A seed's configurations playing one game (`Play`) until a read parts them; `state` is `None` before
/// the lineage is made.
struct Group {
    seed: u64,
    members: Vec<usize>,
    state: Option<Play>,
}

/// The groups waiting, longest first (the TUNED family's fortnights before the others, then by the
/// check-ins left); a group that parts pushes the parting members back. The workers stop when the
/// queue is empty and no group is playing.
/// (the groups waiting with their priority and order, groups pushed, groups queued or playing)
type Queue = (Vec<(u64, u64, Group)>, u64, usize);

#[derive(Default)]
struct Pool {
    q: std::sync::Mutex<Queue>,
    cv: std::sync::Condvar,
}

impl Pool {
    fn push(&self, g: Group, cfgs: &[Cfg], days: usize, checkins: u64) {
        let weight = g.members.iter().map(|c| match cfgs[*c].bot {
            Bot::Tuned => 3,
            Bot::Picked | Bot::PickedL => 2,
            _ => 1,
        });
        let left = g.state.as_ref().map_or(days as u64 * checkins, |p| (days - p.day) as u64 * checkins - p.ci);
        let prio = weight.max().unwrap_or(1) * left;
        let mut q = self.q.lock().unwrap();
        q.1 += 1;
        q.2 += 1;
        let seq = q.1;
        q.0.push((prio, u64::MAX - seq, g));
        self.cv.notify_one();
    }
    fn pop(&self) -> Option<Group> {
        let mut q = self.q.lock().unwrap();
        loop {
            if let Some(i) = (0..q.0.len()).max_by_key(|i| (q.0[*i].0, q.0[*i].1)) {
                return Some(q.0.swap_remove(i).2);
            }
            if q.2 == 0 {
                return None;
            }
            q = self.cv.wait(q).unwrap();
        }
    }
    fn done(&self) {
        let mut q = self.q.lock().unwrap();
        q.2 -= 1;
        if q.2 == 0 {
            self.cv.notify_all();
        }
    }
}

fn median(mut v: Vec<f64>) -> f64 {
    if v.is_empty() {
        return f64::NAN;
    }
    v.sort_by(|a, b| a.total_cmp(b));
    let n = v.len();
    if n % 2 == 1 {
        v[n / 2]
    } else {
        (v[n / 2 - 1] + v[n / 2]) / 2.0
    }
}

/// Hours to a milestone, `cap` when never reached (14 days + one check-in: slower than any reach).
fn hours_or(o: &SeedOut, i: usize, cap: f64) -> f64 {
    o.hours[i].unwrap_or(cap)
}

/// The median over seeds of slower ÷ faster at milestone `i`; a milestone the faster bot reaches and
/// the slower never does counts as passed (∞).
fn ratio(slow: &[SeedOut], fast: &[SeedOut], i: usize) -> f64 {
    let rs: Vec<f64> = slow
        .iter()
        .zip(fast)
        .filter_map(|(s, f)| match (s.hours[i], f.hours[i]) {
            (_, None) => None,
            (None, Some(_)) => Some(f64::INFINITY),
            (Some(a), Some(b)) => Some(a / b.max(1.0)),
        })
        .collect();
    if rs.is_empty() {
        return f64::NAN;
    }
    median(rs)
}

/// The panel width of every group playing (`forecast::with_sim_width`): `--threads` shared among the
/// groups playing — one each while the groups fill the threads, wider as they end (the last fortnights
/// alone read their camp panels on every thread). The results are the same at any width.
static WIDTH: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(1);

fn main() {
    idlever_core::balance::configure_from_env().expect("valid immutable balance profile");
    // RUNS_UI: real games at scale keep no replay capsules (a lineage clone per send never read)
    idlever_core::engine::set_capsules(false);
    // The groups fill `--threads` (10 unless set) seed by seed; a group's panels take the threads the
    // others leave (`WIDTH`) — never threads of threads (a TUNED bot's wall search and verdicts on every
    // core, 32 jobs at once, ran the load past 150).
    let a: Vec<String> = std::env::args().collect();
    if let Some(i) = a.iter().position(|s| s == "--checkpoint-bench") {
        eprintln!("checkpoint encoding diagnostic only; not gate acceptance");
        let input = std::path::Path::new(a.get(i + 1).expect("--checkpoint-bench PATH"));
        let read_start = std::time::Instant::now();
        let record: Checkpoint = jobcache::read(input).expect("valid checkpoint envelope");
        assert_eq!(checkpoint_hash(&record.body), record.checksum, "checkpoint checksum");
        let p: Play = jobcache::decode(&record.body).expect("complete checkpoint state");
        let read_seconds = read_start.elapsed().as_secs_f64();
        let mut times = Vec::new();
        let mut expected = None;
        let repeats = a.iter().position(|s| s == "--repeats").and_then(|i| a.get(i + 1)).and_then(|s| s.parse::<usize>().ok()).unwrap_or(7);
        assert!(repeats > 0, "--repeats must be positive");
        for _ in 0..repeats {
            let start = std::time::Instant::now();
            let body = jobcache::text(&p).expect("encode state");
            let encoded = jobcache::text(&Checkpoint { key: record.key.clone(), checksum: checkpoint_hash(&body), body }).expect("encode envelope");
            times.push(start.elapsed().as_secs_f64());
            if let Some(ref bytes) = expected { assert_eq!(&encoded, bytes, "encoding must be repeatable"); }
            else { expected = Some(encoded); }
        }
        let encoded = expected.expect("at least one repetition");
        if let Some(i) = a.iter().position(|s| s == "--output") { std::fs::write(a.get(i + 1).expect("--output PATH"), &encoded).unwrap(); }
        println!("{}", serde_json::json!({"diagnostic": "checkpoint-encode", "read_seconds": read_seconds, "seconds": times, "bytes": encoded.len(), "hash": checkpoint_hash(&encoded)}));
        return;
    }
    let get = |k: &str, d: u64| a.iter().position(|x| x == k).and_then(|i| a.get(i + 1)).and_then(|s| s.parse().ok()).unwrap_or(d);
    let seeds = get("--seeds", 8);
    let days = get("--days", 14) as usize;
    let checkins = get("--checkins", 3);
    let gate = a.iter().any(|x| x == "--gate");
    let verbose = a.iter().any(|x| x == "--verbose");
    let routine = a.iter().any(|x| x == "--routine");
    let loo = a.iter().any(|x| x == "--loo") || (gate && !routine);
    let only = a.iter().position(|x| x == "--only").and_then(|i| a.get(i + 1)).and_then(|s| s.parse::<u64>().ok());
    let bots_arg = a.iter().position(|x| x == "--bots").and_then(|i| a.get(i + 1)).cloned().unwrap_or_else(|| "idle,picked,tuned,random,hands,daily,away".into());
    let mut cfgs: Vec<Cfg> = bots_arg
        .split(',')
        .filter_map(|b| match b {
            "idle" => Some(Bot::Idle),
            "picked" => Some(Bot::Picked),
            "tuned" => Some(Bot::Tuned),
            "random" => Some(Bot::Random),
            "hands" => Some(Bot::Hands),
            "idle30" => Some(Bot::Idle30),
            "daily" => Some(Bot::Daily),
            "away" => Some(Bot::Away),
            "picked+l" | "pickedl" => Some(Bot::PickedL),
            _ => None,
        })
        .map(|bot| Cfg { bot, without: None })
        .collect();
    // (Cut 30.5: IDLE's bounded delta reads Cut 30's IDLE beside it)
    if !routine && cfgs.iter().any(|c| c.bot == Bot::Idle) && !cfgs.iter().any(|c| c.bot == Bot::Idle30) {
        cfgs.push(Cfg { bot: Bot::Idle30, without: None });
    }
    // (`--loo-only packages,forge`: a probe's leave-one-outs, the rest left out)
    let loo_only: Option<Vec<String>> = a.iter().position(|x| x == "--loo-only").and_then(|i| a.get(i + 1)).map(|s| s.split(',').map(String::from).collect());
    if (loo || loo_only.as_ref().is_some_and(|o| o.iter().any(|x| x == "nodes"))) && cfgs.iter().any(|c| c.bot == Bot::Picked) {
        // (Cut 30.5: PICKED by hand — the trunk to the scout alone hired; nothing required)
        cfgs.push(Cfg { bot: Bot::Picked, without: Some("nodes") });
    }
    for b in [Bot::Daily, Bot::Away] {
        if cfgs.iter().any(|c| c.bot == b) {
            // (Cut 30.5, the owner: the same player doing every chore by hand at its check-ins)
            cfgs.push(Cfg { bot: b, without: Some("nodes") });
        }
    }
    if loo || loo_only.is_some() {
        for s in SYSTEMS {
            if loo_only.as_ref().is_none_or(|o| o.iter().any(|x| x == s)) {
                cfgs.push(Cfg { bot: Bot::Tuned, without: Some(s) });
            }
        }
    }
    // `--rows <ids or substrings> [--fail-fast]`: only the configurations, seeds and days the named rows read
    // (dayplayer_rows: the rows' needs, the early verdicts) — a tuning loop's check, never the gate
    let plan = a.iter().position(|x| x == "--rows").and_then(|i| a.get(i + 1)).map(|r| rows::Plan::new(r, a.iter().any(|x| x == "--fail-fast"), &mut cfgs, seeds, get("--tuned-seeds", seeds), get("--loo-seeds", 4), days, checkins));
    let t0 = std::time::Instant::now();
    // (a leave-one-out is a TUNED fortnight less a system — the table's costliest job, ~25 CPU-min
    // each: `--loo-seeds`, 4 by default, the first seeds of the bots' own)
    let loo_seeds = get("--loo-seeds", 4);
    // (TUNED is a leave-one-out's base: the same seeds, `--tuned-seeds`, the bots' own by default)
    let tuned_seeds = get("--tuned-seeds", seeds);
    // (the owner 2026-10-14: `--random-seeds N` plays RANDOM and PICKED on N seeds (never fewer than `--seeds`) for
    // the RANDOM-vs-PICKED row alone — its ≥ 14/16 bar demanded 2/2 on the routine's two seeds; every other row reads
    // PICKED's and RANDOM's first `--seeds` seeds, unchanged)
    let random_seeds = get("--random-seeds", seeds).max(seeds);
    let has_random = cfgs.iter().any(|c| c.bot == Bot::Random && c.without.is_none());
    let seeds_of = |c: usize| if matches!(cfgs[c].bot, Bot::Away | Bot::Daily) { seeds } else if cfgs[c].without.is_some() { loo_seeds.min(seeds) } else if cfgs[c].bot == Bot::Tuned { tuned_seeds.min(seeds) } else if cfgs[c].bot == Bot::Random || (cfgs[c].bot == Bot::Picked && has_random) { random_seeds } else { seeds };
    // Per-job results are kept under `target/gates/dp/` (a job is a pure function of the code, the bot, the
    // seed and the days): a rerun reprints at once, and an interrupted run resumes where it stopped. The key
    // is the binary's own hash, or — under `tools/gates.mjs`, which sets `IDLEVER_SRC_KEY` to the hash of the
    // core's sources, the lockfile and the toolchain — that and this file less `main` (the bars below), so an
    // edit to a bar reprints the table from the jobs kept.
    let fnv = |bytes: &[u8], mut h: u64| {
        for b in bytes {
            h ^= *b as u64;
            h = h.wrapping_mul(0x0100_0000_01b3);
        }
        h
    };
    let bin_key = match std::env::var("IDLEVER_SRC_KEY") {
        Ok(k) => {
            let src = include_str!("dayplayer.rs");
            let body = src.find("\nfn main() {").map_or(src, |i| &src[..i]);
            let env = std::env::var("IDLEVER_SKIP_TWIST").unwrap_or_default();
            let checkpoint = include_str!("dayplayer_checkpoint/mod.rs");
            let cache = include_str!("jobcache_lib/mod.rs");
            format!("src{:016x}", fnv(cache.as_bytes(), fnv(checkpoint.as_bytes(), fnv(env.as_bytes(), fnv(body.as_bytes(), fnv(k.as_bytes(), 0xcbf2_9ce4_8422_2325))))))
        }
        Err(_) => format!("{:016x}", fnv(&std::fs::read(std::env::current_exe().expect("exe")).unwrap_or_default(), 0xcbf2_9ce4_8422_2325)),
    };
    // Direct feature-enabled invocations need the same input binding as the
    // tooling wrapper. Never let a different profile read another one's jobs.
    let bin_key = match std::env::var("IDLEVER_BALANCE_JSON") {
        Ok(profile) => format!("{bin_key}-balance{:016x}", fnv(profile.as_bytes(), 0xcbf2_9ce4_8422_2325)),
        Err(_) => bin_key,
    };
    let bin_key = match std::env::var("IDLEVER_SKIP_TWIST") {
        Ok(value) => format!("{bin_key}-twist{:016x}", fnv(value.as_bytes(), 0xcbf2_9ce4_8422_2325)),
        Err(_) => bin_key,
    };
    // (`DP_STALLS` prunes the stall records it prints: a different game, never kept)
    let keep = !verbose && std::env::var("DP_STALLS").is_err() && std::env::var("DP_OFF").is_err() && std::env::var_os("DP_CAUSAL_START_FORGE").is_none() && std::env::var_os("DP_SESSION_ONLY").is_none();
    let cache_dir = std::path::PathBuf::from("target/gates/dp");
    let _ = std::fs::create_dir_all(&cache_dir);
    let cache_of = |c: &Cfg, s: u64| cache_dir.join(format!("{bin_key}-{}-s{s}-d{days}-c{checkins}.json", c.label()));
    // Opt in for long local runs. Bind the complete executable (runtime AND
    // harness), exact CLI parameters, and behavior-affecting environment.
    let resume = keep && a.iter().any(|x| x == "--resume");
    let checkpoint_dir = cache_dir.join("checkpoints");
    if resume { let _ = std::fs::create_dir_all(&checkpoint_dir); }
    let executable = std::fs::read(std::env::current_exe().expect("exe")).expect("checkpoint executable");
    let identity = format!("{:016x}", fnv(&executable, 0xcbf2_9ce4_8422_2325));
    let env = ["IDLEVER_SKIP_TWIST", "IDLEVER_BALANCE_JSON", "DP_OFF", "DP_STALLS", "DP_CAUSAL_START_FORGE"].iter()
        .map(|k| format!("{k}={}", std::env::var(k).unwrap_or_default())).collect::<Vec<_>>().join("\n");
    let checkpoint_key = format!("{identity}:{:016x}", fnv(env.as_bytes(), fnv(serde_json::to_string(&a[1..]).unwrap().as_bytes(), 0xcbf2_9ce4_8422_2325)));
    let checkpoint_of = |c: &Cfg, s: u64| checkpoint_dir.join(format!("{checkpoint_key}-{}-s{s}.json", c.label()));
    let results: std::sync::Mutex<Vec<(usize, SeedOut)>> = std::sync::Mutex::new(Vec::new());
    // Each seed's configurations to play (those not kept), as one group: the group plays as its first
    // member and parts where a member answers a read differently (`Ask`) — the parting members go on as a
    // group of their own from the check-in's start (`Play` cloned there). `--no-share`: each alone.
    let share = !verbose && !a.iter().any(|x| x == "--no-share");
    let mut groups: Vec<Group> = Vec::new();
    let max_seed = (0..cfgs.len()).map(&seeds_of).max().unwrap_or(0);
    for s in (1..=max_seed).filter(|s| only.is_none_or(|o| o == *s)) {
        let mut members = Vec::new();
        for c in (0..cfgs.len()).filter(|c| s <= seeds_of(*c) && plan.as_ref().is_none_or(|p| p.wants(&cfgs[*c], s))) {
            let hit = if keep && std::env::var_os("IDLEVER_CACHE_FRESH").is_none() { jobcache::read::<SeedOut>(&cache_of(&cfgs[c], s)) } else { None };
            match hit {
                Some(o) => results.lock().unwrap().push((c, o)),
                None => {
                    let state = (resume && std::env::var_os("IDLEVER_CACHE_FRESH").is_none()).then(|| checkpoint_read(&checkpoint_of(&cfgs[c], s), &checkpoint_key, s, days)).flatten();
                    if let Some(p) = state {
                        eprintln!("dayplayer: resume {} s{s} at day {} check-in {}", cfgs[c].label(), p.day + 1, p.ci + 1);
                        groups.push(Group { seed: s, members: vec![c], state: Some(p) });
                    } else { members.push(c); }
                }
            }
        }
        // (the longest bots lead: TUNED first, so a group's first member is the one that parts least)
        members.sort_by_key(|c| (cfgs[*c].bot != Bot::Tuned || cfgs[*c].without.is_some(), cfgs[*c].bot != Bot::Picked, *c));
        if share {
            if !members.is_empty() {
                groups.push(Group { seed: s, members, state: None });
            }
        } else {
            groups.extend(members.into_iter().map(|c| Group { seed: s, members: vec![c], state: None }));
        }
    }
    let threads = get("--threads", 10) as usize;
    let pool = Pool::default();
    let priority = plan.as_ref().map(|p| p.priority_seeds()).unwrap_or_default();
    if !priority.is_empty() { eprintln!("dayplayer: prior failure seeds first {priority:?} (scheduling hints only)"); }
    // (fail-fast: the lower seeds first, so a seed's verdicts land early)
    let push = |g: Group| if plan.as_ref().is_some_and(|p| p.fail_fast) { rows::push_seed_first(&pool, g, &cfgs, days, checkins, &priority) } else { pool.push(g, &cfgs, days, checkins) };
    for g in groups {
        push(g);
    }
    let cap = (days as f64 + 1.0) * 24.0;
    if let Some(pl) = &plan {
        eprintln!("dayplayer: targeted rows {} — configurations {}", pl.say(), cfgs.iter().map(|c| c.label()).collect::<Vec<_>>().join(","));
        pl.check(&results.lock().unwrap(), &cfgs, cap, "the kept jobs", t0);
    }
    let playing = std::sync::Mutex::new(0usize);
    let widen = |d: isize| {
        let mut p = playing.lock().unwrap();
        *p = (*p as isize + d) as usize;
        WIDTH.store((threads / (*p).max(1)).max(1), std::sync::atomic::Ordering::Relaxed);
    };
    std::thread::scope(|sc| {
        for _ in 0..threads.max(1) {
            sc.spawn(|| {
                while let Some(Group { seed: s, mut members, state }) = pool.pop() {
                    widen(1);
                    let t = std::time::Instant::now();
                    let lead = members[0];
                    let part = |ask: &Ask, members: &mut Vec<usize>, snap: Option<Play>| {
                        let (same, diff): (Vec<usize>, Vec<usize>) = members[1..].iter().partition(|m| ask.same(&cfgs[**m]));
                        if !diff.is_empty() {
                            push(Group { seed: s, members: diff, state: snap });
                        }
                        members.truncate(1);
                        members.extend(same);
                    };
                    let mut p = match state {
                        Some(p) => p,
                        None => {
                            let ask = Ask::new(&cfgs[lead]);
                            let p = Play::new(s, days, checkins, verbose, &ask);
                            part(&ask, &mut members, None);
                            p
                        }
                    };
                    idlever_core::forecast::with_sim_width(&WIDTH, || {
                        while !p.done() && !plan.as_ref().is_some_and(|pl| pl.enough(&p, &members, &cfgs)) {
                            let snap = (members.len() > 1).then(|| p.clone());
                            let ask = Ask::new(&cfgs[lead]);
                            p.step(&ask);
                            if members.len() > 1 {
                                part(&ask, &mut members, snap);
                            }
                            if resume && !p.done() {
                                ph("checkpoint", || {
                                    for &c in &members { checkpoint_keep(&checkpoint_of(&cfgs[c], s), &checkpoint_key, &p); }
                                });
                                if std::env::var("DP_CHECKPOINT_STOP_AFTER").is_ok_and(|v| v.parse::<u64>().ok() == Some(p.day as u64 * p.checkins + p.ci)) {
                                    eprintln!("dayplayer: diagnostic stop after complete checkpoint (not acceptance)");
                                    std::process::exit(75);
                                }
                            }
                        }
                    });
                    widen(-1);
                    let phs = PH.with(|m| std::mem::take(&mut *m.borrow_mut()));
                    for &c in &members {
                        // (a game stopped early for `--rows` is not the job: never kept)
                        if keep && p.done() {
                            jobcache::keep(&cache_of(&cfgs[c], s), &p.out);
                            if resume { let _ = std::fs::remove_file(checkpoint_of(&cfgs[c], s)); }
                        }
                        results.lock().unwrap().push((c, p.out.clone()));
                    }
                    eprintln!("dayplayer: {} s{s} done in {:.0}s {}", members.iter().map(|c| cfgs[*c].label()).collect::<Vec<_>>().join(" = "), t.elapsed().as_secs_f64(), phs.iter().map(|(k, v)| format!("{k} {v:.0}")).collect::<Vec<_>>().join(" "));
                    if let Some(pl) = &plan {
                        let last = format!("{} s{s} (day {})", members.iter().map(|c| cfgs[*c].label()).collect::<Vec<_>>().join(" = "), p.day);
                        pl.check(&results.lock().unwrap(), &cfgs, cap, &last, t0);
                    }
                    pool.done();
                }
            });
        }
    });
    let mut res = results.into_inner().unwrap();
    res.sort_by_key(|(c, o)| (*c, o.seed));
    let by = |label: &str| -> Vec<SeedOut> { res.iter().filter(|(c, _)| cfgs[*c].label() == label).map(|(_, o)| o.clone()).collect() };
    for (ci, cfg) in cfgs.iter().enumerate() {
        println!("\n{} ({} seeds)", cfg.label(), res.iter().filter(|(c, _)| *c == ci).count());
        println!("seed  {}  best by day", MILESTONES.iter().map(|m| format!("{:>6}", format!("h→D{m}"))).collect::<Vec<_>>().join(" "));
        for (_, o) in res.iter().filter(|(c, _)| *c == ci) {
            println!(
                "{:>4}  {}  {:?}  stall {} king {:?} {} L{:?}",
                o.seed,
                o.hours.iter().map(|h| h.map(|x| format!("{x:>6.0}")).unwrap_or_else(|| format!("{:>6}", "-"))).collect::<Vec<_>>().join(" "),
                o.best_day,
                o.stall,
                o.king_day,
                o.king_left.map_or("untried".to_string(), |(p, n)| format!("left {p}% ×{n}")),
                o.stance_level_day
            );
            if verbose {
                println!("      rules: {}", o.rules);
            }
            // `DP_NODES=1`: each node's hours — its chore open · its trigger met · hired
            if std::env::var_os("DP_NODES").is_some() {
                let at = |v: &[(String, f64)], id: &str| v.iter().find(|(x, _)| x == id).map_or("-".to_string(), |x| format!("{:.1}", x.1));
                println!("      nodes: {}", idlever_core::tree::NODES.iter().skip(1).map(|n| format!("{} {}/{}/{}", n.id, at(&o.node_open_h, n.id), at(&o.node_ready_h, n.id), at(&o.node_hired_h, n.id))).collect::<Vec<_>>().join(" · "));
            }
        }
    }
    println!("\nbots over {seeds} seeds × {days} days × {checkins}/day ({:.0}s)", t0.elapsed().as_secs_f64());
    let idle = by("IDLE");
    // (`--random-seeds`: the RANDOM-vs-PICKED row reads every seed played; the other rows the first `--seeds`)
    let picked_all = by("PICKED");
    let random_all = by("RANDOM");
    let picked: Vec<SeedOut> = picked_all.iter().filter(|o| o.seed <= seeds).cloned().collect();
    let tuned = by("TUNED");
    let random: Vec<SeedOut> = random_all.iter().filter(|o| o.seed <= seeds).cloned().collect();
    let mut bars: Vec<(String, String, bool)> = Vec::new();
    // (rows the owner keeps in view, ungated)
    let mut infos: Vec<(String, String)> = Vec::new();
    // (the nothing-required row's worst seed: two days behind IDLE at most, from day 5 — the owner, rounds 8–10)
    const NOTHING_REQ_MAX_LAG: f64 = 48.0;
    // (the pen's opening: the start of day 5)
    const PEN_DAY_H: f64 = 96.0;
    if !idle.is_empty() {
        let n = idle.len();
        let d8 = idle.iter().filter(|o| o.hours[0].is_some_and(|h| h <= 24.0)).count();
        bars.push(("IDLE reaches D8 by the end of day 1 (every seed)".into(), format!("{d8}/{n}"), d8 == n));
        let d13 = median(idle.iter().map(|o| hours_or(o, 1, cap) / 24.0).collect());
        bars.push(("IDLE reaches D13 by day 4 (median day)".into(), format!("{d13:.1}"), d13 <= 4.0));
        let d23: Vec<f64> = idle.iter().map(|o| hours_or(o, 3, cap) / 24.0).collect();
        let d23n = d23.iter().filter(|d| **d <= 12.0).count();
        let d23m = median(d23);
        bars.push(("IDLE reaches D23 by day 12 (≥ 6/8 seeds, median)".into(), format!("{d23n}/{n} · {d23m:.1}"), d23n * 8 >= 6 * n && d23m <= 12.0));
        let stall = idle.iter().map(|o| o.stall).max().unwrap_or(0);
        bars.push(("IDLE longest best-depth stall before D23 ≤ 4 d".into(), format!("{stall}"), stall <= 4));
        let gold_days = idle.iter().map(|o| o.gold_day.iter().filter(|g| **g > 0).count()).min().unwrap_or(0);
        bars.push((format!("IDLE net gold > 0 every day ({days}/{days}, every seed)"), format!("{gold_days}"), gold_days == days));
        let king = idle.iter().filter(|o| o.king_day.is_some()).count();
        bars.push(("IDLE does not slay the Mirror King within 14 days".into(), format!("{king}/{n}"), king == 0));
        // (the bar's margin, owner option C: the closest unslain seed — the King's least hp left, its tries)
        if let Some(o) = idle.iter().filter(|o| o.king_day.is_none() && o.king_left.is_some()).min_by_key(|o| o.king_left.unwrap().0) {
            let (p, t) = o.king_left.unwrap();
            let tried = idle.iter().filter(|o| o.king_left.is_some()).count();
            infos.push(("IDLE King margin: least hp left (seed, tries) · seeds that tried him".into(), format!("{p}% (s{}, ×{t}) · {tried}/{n}", o.seed)));
        }
        let l3 = median(idle.iter().map(|o| o.stance_level_day.iter().position(|l| *l >= 3).map_or(99.0, |d| d as f64 + 1.0)).collect());
        let l5 = median(idle.iter().map(|o| o.stance_level_day.iter().position(|l| *l >= 5).map_or(99.0, |d| d as f64 + 1.0)).collect());
        bars.push(("Stance L3 by day 2, L5 by day 7 (IDLE median)".into(), format!("{l3:.0} · {l5:.0}"), l3 <= 2.0 && l5 <= 7.0));
        let grew: u32 = idle.iter().map(|o| o.grew).sum();
        let cis: u32 = idle.iter().map(|o| o.checkins).sum();
        bars.push(("Every IDLE check-in grows ≥ 1 track".into(), format!("{grew}/{cis}"), grew == cis));
        // Cut 113 §3: each return carries a decision (offered at every check-in; IDLE takes none)
        let picks: u32 = idle.iter().map(|o| o.picks).sum();
        bars.push(("Every IDLE check-in offers a return pick".into(), format!("{picks}/{cis}"), picks == cis));
        let sd = median(idle.iter().map(|o| o.stage_days as f64).collect());
        bars.push((format!("Days with a stage opened: IDLE ≥ 8/{days} (median)"), format!("{sd:.1}"), sd >= 8.0));
    }
    if !picked.is_empty() && !idle.is_empty() {
        let rs: Vec<f64> = [1, 2, 3].iter().map(|&i| ratio(&idle, &picked, i)).collect();
        bars.push(("PICKED ≥ 1.5× IDLE at D13, D18, D23".into(), rs.iter().map(|r| format!("{r:.2}")).collect::<Vec<_>>().join(" · "), rs.iter().all(|r| *r >= 1.5)));
        let mut pairs = 0;
        let mut ok = 0;
        for (i, _) in MILESTONES.iter().enumerate() {
            for (p, s) in picked.iter().zip(&idle) {
                if p.hours[i].is_none() && s.hours[i].is_none() {
                    continue;
                }
                pairs += 1;
                ok += (hours_or(p, i, cap) <= hours_or(s, i, cap)) as u32;
            }
        }
        let pct = 100.0 * ok as f64 / pairs.max(1) as f64;
        bars.push(("IDLE never out-paces PICKED (≥ 90 % of seed × milestone)".into(), format!("{pct:.0}%"), pct >= 90.0));
        let sd = median(picked.iter().map(|o| o.stage_days as f64).collect());
        bars.push((format!("Days with a stage opened: PICKED ≥ 10/{days} (median)"), format!("{sd:.1}"), sd >= 10.0));
    }
    // Cut 30 §6, the kept rows re-derived on the new bots (docs/CUT30.md, deviations): content reach (was
    // COUNTERED ≥ D14 ≥ 50 %, a written counter set) is PICKED past the Mother's floor by day 2; stalls (was
    // ≤ 1 % on every cohort set) are ≤ 1 % of every bot's sends
    if !picked.is_empty() {
        let n = picked.len();
        let d14 = picked.iter().filter(|o| o.best_day.get(1).is_some_and(|b| *b >= 14)).count();
        bars.push(("Content reach: PICKED ≥ D14 by day 2 (≥ 50 %)".into(), format!("{d14}/{n}"), d14 * 2 >= n));
        // Cut 118 §4: the purse has a use after Kit complete — PICKED's wealth (purse + bank) falls on some day by
        // day 14 (the sinks), on the median seed; and the days it falls, median
        let falls: Vec<usize> = picked.iter().map(|o| o.gold_day.iter().filter(|g| **g < 0).count()).collect();
        let seeds_falling = falls.iter().filter(|f| **f > 0).count();
        let mut sorted = falls.clone();
        sorted.sort_unstable();
        infos.push(("Cut 118: PICKED wealth no longer monotone by day 14 (seeds; median falling days)".into(), format!("{seeds_falling}/{n} · {}", sorted[n / 2])));
    }
    // Cut 121 §1: PICKED+L (PICKED spending its Legacy `balanced` by hand at each check-in, as every rater does) —
    // the King no sooner than day 7 on the median seed and never before day 4 (an unslain seed counts as day 15);
    // its D23 · D28 · D33 hours beside. §2: the purse at day 3 has spent ≥ 50 % of the gold earned since Kit
    // complete (median over the seeds Kit complete reached by then).
    let picked_l = by("PICKED+L");
    if !picked_l.is_empty() {
        let n = picked_l.len();
        let kd: Vec<f64> = picked_l.iter().map(|o| o.king_day.map_or(days as f64 + 1.0, |d| d as f64)).collect();
        let (km, kmin) = (median(kd.clone()), kd.iter().copied().fold(f64::INFINITY, f64::min));
        let slain = picked_l.iter().filter(|o| o.king_day.is_some()).count();
        bars.push((PICKED_L_KING.into(), format!("{km:.1} · min {kmin:.0} ({slain}/{n} slain)"), km >= 7.0 && kmin >= 4.0));
        let hm = |i: usize| median(picked_l.iter().map(|o| hours_or(o, i, cap)).collect());
        infos.push(("PICKED+L King day (median · min) · D23 · D28 · D33 (median h)".into(), format!("{km:.1} · {kmin:.0} · {:.0} · {:.0} · {:.0}", hm(3), hm(4), hm(6))));
        let buys = median(picked_l.iter().map(|o| o.legacy_buys as f64).collect());
        infos.push(("PICKED+L Legacy upgrades bought (median)".into(), format!("{buys:.0}")));
        let spent: Vec<f64> = picked_l.iter().filter_map(|o| o.kit_spent_d3.map(|x| x.1)).collect();
        let k = spent.len();
        let m = if k > 0 { median(spent.clone()) } else { f64::NAN };
        let earned = median(picked_l.iter().filter_map(|o| o.kit_spent_d3.map(|x| x.0 as f64)).collect());
        bars.push((PICKED_L_PURSE.into(), format!("{m:.0}% ({k}/{n} seeds · earned ${earned:.0})"), k > 0 && m >= 50.0));
    }
    for (label, v) in [("IDLE", &idle), ("PICKED", &picked), ("TUNED", &tuned)] {
        if v.is_empty() {
            continue;
        }
        let worst = v.iter().map(|o| o.stalled as f64 / o.sends.max(1) as f64).fold(0.0f64, f64::max);
        bars.push((format!("Stalls ≤ 1 % of sends, every {label} seed"), format!("{:.2}%", 100.0 * worst), worst <= 0.01));
    }
    if !tuned.is_empty() && !picked.is_empty() {
        // (the owner, 2026-10-01: the pen is an optional late fine-tuning layer — it beats the packages at
        // the deepest walls by ≥ 15 %, and nothing needs it; was `TUNED ≥ 1.5× PICKED at D18, D23, D28`;
        // round 6: past D28 — D29 — not the D28 floor, which the walls above it gate; round 8: D33 alone, D29
        // printed — where the route puts the Foundry at D28 a package answers it and the scars let PICKED
        // through the Queen in a day or four, so D29 reads 0.9–1.2 by seed set)
        let d29 = ratio(&picked, &tuned, 5);
        let d33 = ratio(&picked, &tuned, 6);
        bars.push(("TUNED beats PICKED by ≥ 15 % at D33 (median hours)".into(), format!("{d33:.2}"), d33 >= 1.15));
        infos.push(("TUNED vs PICKED at D29 (median hours)".into(), format!("{d29:.2}")));
    }
    // (the owner, round 6: a random package is mostly a good one, so RANDOM is weighed against the picker —
    // never ahead of PICKED on any seed at D13 or D23; the RANDOM-vs-IDLE row prints as retired)
    let mut retired: Vec<(String, String)> = Vec::new();
    if !random_all.is_empty() && !picked_all.is_empty() {
        let (random, picked) = (&random_all, &picked_all);
        let n = random.len().min(picked.len());
        let at = |i: usize| random.iter().zip(picked).filter(|(r, p)| hours_or(r, i, cap) >= hours_or(p, i, cap)).count();
        let (a, b) = (at(1), at(3));
        // (Cut 30.5, the owner 2026-10-02: under the record rule a lucky lineage dives a band in one absence — RANDOM
        // is slower than PICKED on the median seed and on ≥ 14/16 of the seeds, at D13 and D23; was every seed)
        let med = |i: usize| median(random[..n].iter().map(|r| hours_or(r, i, cap)).collect()) - median(picked[..n].iter().map(|p| hours_or(p, i, cap)).collect());
        let (m13, m23) = (med(1), med(3));
        let enough = |k: usize| k * 16 >= 14 * n;
        bars.push(("RANDOM slower than PICKED at D13, D23 (median seed, ≥ 14/16 seeds)".into(), format!("{a}/{n} · {b}/{n} · median {m13:+.0} · {m23:+.0} h"), enough(a) && enough(b) && m13 > 0.0 && m23 > 0.0));
        retired.push(("RANDOM never beats PICKED at D13, D23 (every seed)".into(), format!("{a}/{n} · {b}/{n}")));
    }
    if !random.is_empty() && !idle.is_empty() {
        let n = random.len();
        let not_faster = random.iter().zip(&idle).filter(|(r, i)| hours_or(r, 1, cap) >= hours_or(i, 1, cap)).count();
        let slower = random.iter().zip(&idle).filter(|(r, i)| hours_or(r, 3, cap) > hours_or(i, 3, cap)).count();
        let (a, b) = (100.0 * not_faster as f64 / n as f64, 100.0 * slower as f64 / n as f64);
        retired.push(("RANDOM never faster than IDLE to D13, slower to D23 (≥ 80 % each)".into(), format!("{a:.0}% · {b:.0}%")));
    }
    if !tuned.is_empty() && !idle.is_empty() {
        let step = (24 / checkins) as f64;
        let loo_n = SYSTEMS.iter().map(|s| by(&format!("TUNED-{s}")).len()).max().unwrap_or(0).max(1);
        let d23_tuned = median(tuned.iter().take(loo_n).map(|o| hours_or(o, 3, cap)).collect());
        let d23_idle = median(idle.iter().take(loo_n).map(|o| hours_or(o, 3, cap)).collect());
        let gap = (d23_idle - d23_tuned).max(1.0);
        let mut worst_req = String::new();
        let mut req_ok = true;
        let mut moves = Vec::new();
        for s in SYSTEMS {
            let v = by(&format!("TUNED-{s}"));
            if v.is_empty() {
                continue;
            }
            // never slower than IDLE at any milestone on the median seed (± a check-in), and no seed more
            // than a day behind (the owner, round 8: before the pen opens TUNED − packages is IDLE with the
            // forge and the bank — the forge's steps re-roll the runs, a chaotic twin ±16–32 h either way)
            for (i, _) in MILESTONES.iter().enumerate() {
                let lag: Vec<f64> = v.iter().zip(&idle).filter(|(x, y)| x.hours[i].is_some() || y.hours[i].is_some()).map(|(x, y)| hours_or(x, i, cap) - hours_or(y, i, cap)).collect();
                if lag.is_empty() {
                    continue;
                }
                // (the owner, round 9 (b): the worst seed's cap counts from the pen's opening, day 5 — the lag
                // accrued after it: each side's hours clamped up to the day's start, so a milestone both reach
                // before it adds nothing; before day 5 the median clause alone applies)
                let after: Vec<f64> = v.iter().zip(&idle).filter(|(x, y)| x.hours[i].is_some() || y.hours[i].is_some()).map(|(x, y)| hours_or(x, i, cap).max(PEN_DAY_H) - hours_or(y, i, cap).max(PEN_DAY_H)).collect();
                let (med, max) = (median(lag.clone()), after.iter().cloned().fold(f64::MIN, f64::max));
                if med > step || max > NOTHING_REQ_MAX_LAG {
                    req_ok = false;
                    worst_req = format!("{s} D{} median {med:+.0} h · worst from day 5 {max:+.0} h", MILESTONES[i]);
                }
            }
            let n = v.len().min(tuned.len());
            let t = &tuned[..n];
            let w = &v[..n];
            let mean = |xs: &[SeedOut], f: &dyn Fn(&SeedOut) -> f64| xs.iter().map(f).sum::<f64>() / xs.len().max(1) as f64;
            // each system by its own output (the owner, 2026-10-01: systems are not measured on depth)
            let (with, without, unit, ok) = match s {
                "bank" => {
                    let g = |o: &SeedOut| o.gold_day.iter().sum::<i64>() as f64 / o.gold_day.len().max(1) as f64;
                    let (a, b) = (mean(t, &g), mean(w, &g));
                    (a, b, "$/day", a > b * 1.01)
                }
                "pets" => {
                    let d = |o: &SeedOut| 100.0 * o.deaths as f64 / o.sends.max(1) as f64;
                    let (a, b) = (mean(t, &d), mean(w, &d));
                    // Owner 2026-10-17: ±2 points. The clause's own record shows the effect it tests is
                    // 0.02–1.95 points with no significant paired signal at 16 seeds (4 pass / 2 fail
                    // across the six cached source keys, one failure turning on +0.02 —
                    // `docs/evidence/mechanics/pets-clause-finding-2026-10-16.md`), so a strict `<` reports
                    // noise. The sibling `bank` clause already carries a 1 % margin.
                    (a, b, "% deaths", a < b + 2.0)
                }
                "quests" => {
                    let q = |o: &SeedOut| o.quests as f64;
                    let (a, b) = (mean(t, &q), mean(w, &q));
                    (a, b, "kept", a >= 1.0 && a > b)
                }
                "forge" | "pen" => {
                    let d = |o: &SeedOut| o.depth_area as f64 / o.best_day.len().max(1) as f64;
                    let (a, b) = (mean(t, &d), mean(w, &d));
                    (a, b, "mean best", a > b)
                }
                _ => {
                    let h = |o: &SeedOut| hours_or(o, 3, cap);
                    let (a, b) = (median(t.iter().map(h).collect()), median(w.iter().map(h).collect()));
                    (a, b, "h→D23", a + step <= b)
                }
            };
            moves.push((s, with, without, unit, ok));
        }
        if !moves.is_empty() {
            bars.push(("Nothing required: TUNED − S ≤ IDLE on the median seed (± a check-in), no seed > 48 h behind from day 5".into(), if req_ok { "ok".into() } else { worst_req }, req_ok));
            let each = moves.iter().all(|m| m.4);
            bars.push(("Each system adds value by its own output (TUNED vs TUNED − S)".into(), moves.iter().map(|(s, a, b, u, _)| format!("{s} {a:.1}/{b:.1} {u}")).collect::<Vec<_>>().join(" · "), each));
            // (`none > 60 % of TUNED − IDLE` retired: the systems are measured by their own outputs, no
            // longer on one depth scale; `nothing required` and each system's own value replace it)
            let _ = (gap, d23_tuned);
        }
    }
    // Cut 30.5 (docs/CUT30_5.md §4): the works tree
    let hands = by("HANDS");
    let idle30 = by("IDLE30");
    let by_hand = by("PICKED-nodes");
    let step = (24 / checkins) as f64;
    if !picked.is_empty() {
        let pm: Vec<f64> = picked.iter().map(|o| o.porter_min.unwrap_or(f64::INFINITY)).collect();
        let worst = pm.iter().cloned().fold(0.0f64, f64::max);
        let med = median(pm);
        bars.push(("Porter bought ≤ min 12 (PICKED median), every seed ≤ min 15".into(), format!("{med:.1} · worst {worst:.1}"), med <= 12.0 && worst <= 15.0));
    }
    {
        let mut worst_min = 0.0f64;
        let mut worst_sends = 0u32;
        let mut n = 0;
        for o in idle.iter().chain(&picked).chain(&hands).chain(&random) {
            worst_min = worst_min.max(o.scout_min.unwrap_or(f64::INFINITY));
            worst_sends = worst_sends.max(if o.scout_min.is_some() { o.scout_sends } else { u32::MAX });
            n += 1;
        }
        if n > 0 {
            let med = median(idle.iter().chain(&picked).map(|o| o.scout_min.unwrap_or(f64::INFINITY)).collect());
            bars.push(("Scout bought ≤ min 15, ≤ 5 sends by hand (every seed, every bot)".into(), format!("med {med:.1} · worst {worst_min:.1} min, {worst_sends} sends"), worst_min <= 15.0 && worst_sends <= 5));
        }
    }
    // Cut231 §4 (docs/CUT231_PROGRESSION.md): the first-30-min cadence — PICKED (the engaged first session, which
    // stays `STAY_S`): the longest gap between major beats ≤ 6 min and never two new decisions in one look, every seed
    if !picked.is_empty() {
        let c: Vec<(f64, usize)> = picked.iter().filter_map(|o| cadence(o, 30.0, o.session_m)).collect();
        if !c.is_empty() {
            let gaps: Vec<f64> = c.iter().map(|x| x.0).collect();
            let worst_gap = gaps.iter().cloned().fold(0.0f64, f64::max);
            let worst_dec = c.iter().map(|x| x.1).max().unwrap_or(0);
            let ok_n = c.iter().filter(|x| x.0 <= 6.0 && x.1 <= 1).count();
            // (Cut233: the gap counts between looks only; the longest single watched run is shown beside it, never gated)
            let run = picked.iter().map(|o| longest_run(o, 30.0)).fold(0.0f64, f64::max);
            let (name, value) = ("First-30-min cadence: look gap ≤ 6 min, ≤ 1 new decision a look (every PICKED seed)".to_string(), format!("gap med {:.1} · worst {worst_gap:.1} min · dec {worst_dec} · {ok_n}/{} (run ≤ {run:.1})", median(gaps), c.len()));
            bars.push((name, value, ok_n == c.len() && c.len() == picked.len()));
        }
    }
    if !idle.is_empty() {
        // (IDLE leaves at the scout: its cadence reads its own short session, never the absence)
        let c: Vec<(f64, usize)> = idle.iter().filter_map(|o| cadence(o, 30.0, o.session_m)).collect();
        if !c.is_empty() {
            infos.push(("IDLE first-session cadence (its own session): gap med · worst min · most decisions".into(), format!("{:.1} · {:.1} · {}", median(c.iter().map(|x| x.0).collect()), c.iter().map(|x| x.0).fold(0.0f64, f64::max), c.iter().map(|x| x.1).max().unwrap_or(0))));
        }
    }
    // `--timeline FILE`: every configuration × seed's unlock timeline (read-only beats; tools/timeline-summary.mjs)
    if let Some(path) = a.iter().position(|x| x == "--timeline").and_then(|i| a.get(i + 1)) {
        let rows: Vec<serde_json::Value> = res.iter().map(|(c, o)| serde_json::json!({
            "bot": cfgs[*c].label(), "seed": o.seed, "session_m": o.session_m, "porter_min": o.porter_min, "scout_min": o.scout_min,
            "scout_sends": o.scout_sends, "hours": o.hours, "milestones": MILESTONES, "best_day": o.best_day, "king_day": o.king_day,
            "checkins_per_day": checkins, "days": days, "timeline": o.timeline, "looks": o.looks,
        })).collect();
        std::fs::write(path, serde_json::to_string(&serde_json::json!({ "seeds": seeds, "days": days, "checkins": checkins, "runs": rows })).unwrap()).expect("write --timeline");
        eprintln!("dayplayer: timeline → {path}");
    }
    let at = |v: &[(String, f64)], id: &str| v.iter().find(|(x, _)| x == id).map(|x| x.1);
    let unlit =|o: &SeedOut, by_h: f64| o.node_open_h.iter().filter(|(id, h)| *h <= by_h && at(&o.node_ready_h, id).is_none_or(|r| r > by_h)).count() as f64;
    let unbought = |o: &SeedOut, by_h: f64| o.node_open_h.iter().filter(|(id, h)| *h <= by_h && at(&o.node_hired_h, id).is_none_or(|r| r > by_h)).count() as f64;
    if !picked.is_empty() && !hands.is_empty() {
        let (p, h) = (median(picked.iter().map(|o| unlit(o, 48.0)).collect()), median(hands.iter().map(|o| unlit(o, 48.0)).collect()));
        bars.push(("Every node whose chore exists lit by 48 h (PICKED, HANDS median unlit)".into(), format!("{p:.0} · {h:.0}"), p == 0.0 && h == 0.0));
    }
    if !picked.is_empty() {
        let b = median(picked.iter().map(|o| unbought(o, 72.0)).collect());
        let lit_all = median(picked.iter().map(|o| o.node_hired_h.len() as f64).collect());
        bars.push(("Every node whose chore exists bought by 72 h (PICKED median unbought)".into(), format!("{b:.0} ({lit_all:.0} hired by day 14)"), b == 0.0));
    }
    {
        let all: Vec<&SeedOut> = res.iter().map(|(_, o)| o).collect();
        if !all.is_empty() {
            let bad: u32 = all.iter().map(|o| o.unconserved).sum();
            let chest = all.iter().map(|o| o.chest_max).max().unwrap_or(0);
            bars.push(("Gold conserved: purse + chest + bank = ledger (every bot × check-in)".into(), format!("{bad} off · chest ≤ ${chest}"), bad == 0));
        }
    }
    if !hands.is_empty() && !idle.is_empty() {
        let lags: Vec<f64> = [1, 2, 3].iter().map(|&i| median(hands.iter().zip(&idle).filter(|(a, b)| a.hours[i].is_some() || b.hours[i].is_some()).map(|(a, b)| hours_or(a, i, cap) - hours_or(b, i, cap)).collect())).collect();
        bars.push(("HANDS never slower than IDLE at D13, D18, D23 (median lag ± a check-in)".into(), lags.iter().map(|l| format!("{l:+.0}")).collect::<Vec<_>>().join(" · "), lags.iter().all(|l| l.is_nan() || *l <= step)));
    }
    if !by_hand.is_empty() && !picked.is_empty() {
        let n = by_hand.len().min(picked.len());
        let (p, b) = (&picked[..n], &by_hand[..n]);
        let (mp, mb) = (median(p.iter().map(|o| hours_or(o, 2, cap)).collect()), median(b.iter().map(|o| hours_or(o, 2, cap)).collect()));
        let mean = |v: &[SeedOut]| v.iter().map(|o| hours_or(o, 2, cap)).sum::<f64>() / v.len().max(1) as f64;
        infos.push(("PICKED vs PICKED − nodes at D18 (median h, 3 check-ins a day)".into(), format!("{mp:.0} vs {mb:.0} (mean {:.0} vs {:.0})", mean(p), mean(b))));
        if !idle.is_empty() {
            let mut ok = true;
            let mut worst = String::from("ok");
            for (i, m) in MILESTONES.iter().enumerate() {
                let pairs: Vec<(&SeedOut, &SeedOut)> = b.iter().zip(&idle).filter(|(x, y)| x.hours[i].is_some() || y.hours[i].is_some()).collect();
                if pairs.is_empty() {
                    continue;
                }
                let med = median(pairs.iter().map(|(x, y)| hours_or(x, i, cap) - hours_or(y, i, cap)).collect());
                let max = pairs.iter().map(|(x, y)| hours_or(x, i, cap).max(PEN_DAY_H) - hours_or(y, i, cap).max(PEN_DAY_H)).fold(f64::MIN, f64::max);
                if med > step || max > NOTHING_REQ_MAX_LAG {
                    ok = false;
                    worst = format!("D{m} median {med:+.0} h · worst from day 5 {max:+.0} h");
                }
            }
            bars.push(("Nothing required, S = nodes: PICKED − nodes ≤ IDLE (median ± a check-in, 48 h)".into(), worst, ok));
        }
    }
    // (the owner, 2026-10-02: automation pays the player who is away — one check-in a day, workers vs every chore by
    // hand at that check-in: D18 sooner on the median seed, or a better mean best depth over the fortnight)
    let away = by("AWAY");
    let away_hand = by("AWAY-nodes");
    let mean_best = |v: &[SeedOut]| v.iter().map(|o| o.depth_area as f64 / o.best_day.len().max(1) as f64).sum::<f64>() / v.len().max(1) as f64;
    if !away.is_empty() && !away_hand.is_empty() {
        let n = away.len().min(away_hand.len());
        let (a, b) = (&away[..n], &away_hand[..n]);
        let (ma, mb) = (median(a.iter().map(|o| hours_or(o, 2, cap)).collect()), median(b.iter().map(|o| hours_or(o, 2, cap)).collect()));
        let (da, db) = (mean_best(a), mean_best(b));
        bars.push(("Workers pay the away player (in every 2–3 days): D18 sooner or a deeper mean best".into(), format!("D18 {ma:.0} vs {mb:.0} h · mean best {da:.2} vs {db:.2}"), ma < mb || da > db));
    }
    let daily = by("DAILY");
    let daily_hand = by("DAILY-nodes");
    if !daily.is_empty() && !daily_hand.is_empty() {
        let n = daily.len().min(daily_hand.len());
        let (da, db) = (mean_best(&daily[..n]), mean_best(&daily_hand[..n]));
        bars.push(("Workers never cost the daily player a floor: mean best ≥ by hand − 1".into(), format!("{da:.2} vs {db:.2}"), da >= db - 1.0));
    }
    if !idle30.is_empty() && !idle.is_empty() {
        let n = idle.len().min(idle30.len());
        let med = |v: &[SeedOut], i: usize| median(v[..n].iter().map(|o| hours_or(o, i, cap)).collect());
        let d13 = med(&idle, 1) - med(&idle30, 1);
        bars.push(("IDLE within a bounded delta of Cut 30's: median h→D13 moves ≤ a check-in".into(), format!("{d13:+.0} h"), d13.abs() <= step));
        infos.push(("IDLE − Cut 30's IDLE, median hours at D8 · D13 · D18 · D23 · D28".into(), [0, 1, 2, 3, 4].iter().map(|&i| format!("{:+.0}", med(&idle, i) - med(&idle30, i))).collect::<Vec<_>>().join(" · ")));
        let same = idle[..n].iter().zip(&idle30[..n]).filter(|(a, b)| a.hours == b.hours).count();
        infos.push(("IDLE's milestones identical to Cut 30's (seeds)".into(), format!("{same}/{n}")));
    }
    for (label, v) in [("IDLE", &idle), ("HANDS", &hands), ("PICKED", &picked), ("TUNED", &tuned)] {
        if !v.is_empty() {
            infos.push((format!("{label}: porter · scout minute (median), sends to the scout"), format!("{:.1} · {:.1} · {:.0}", median(v.iter().map(|o| o.porter_min.unwrap_or(f64::NAN)).filter(|x| !x.is_nan()).collect()), median(v.iter().map(|o| o.scout_min.unwrap_or(f64::INFINITY)).collect()), median(v.iter().map(|o| o.scout_sends as f64).collect()))));
        }
    }
    if let Some(pl) = &plan {
        let fails = pl.finish(&bars, &res, &cfgs, cap, t0);
        std::process::exit((fails > 0) as i32);
    }
    // PROGRESSION_V2 (reported now, gated in Cut 31)
    for (label, v) in [("IDLE", &idle), ("PICKED", &picked), ("TUNED", &tuned)] {
        if v.is_empty() {
            continue;
        }
        let med = |f: &dyn Fn(&SeedOut) -> usize| median(v.iter().map(|o| f(o) as f64).collect());
        println!(
            "info {label}: day-1 systems {:.0} (≤ 10) · most systems a report {} (≤ 1) · most beats a report {} (≤ 5) · days with something new {:.0}/{days} (≥ 27/30) · longest gap {} d (≤ 1)",
            med(&|o| o.day1_systems),
            v.iter().map(|o| o.max_systems).max().unwrap_or(0),
            v.iter().map(|o| o.max_beats).max().unwrap_or(0),
            med(&|o| o.new_days),
            v.iter().map(|o| o.new_gap).max().unwrap_or(0)
        );
    }
    println!();
    if routine { eprintln!("routine coverage: current player modes and paired daily/away workers; historical migration and TUNED system-removal balance comparisons require --exhaustive"); }
    println!("{:<64} {:>18}  result", "bar", "value");
    let mut fails = 0;
    for (name, value, ok) in &bars {
        println!("{:<64} {:>18}  {}", name, value, if *ok { "PASS" } else { "FAIL" });
        if !ok {
            fails += 1;
        }
    }
    for (name, value) in &infos {
        println!("{:<64} {:>18}  info", name, value);
    }
    for (name, value) in &retired {
        println!("{:<64} {:>18}  retired", name, value);
    }
    println!("dayplayer: {}", if fails > 0 { "FAIL" } else { "all PASS" });
    if gate && fails > 0 {
        eprintln!("{fails} bar(s) FAIL");
        std::process::exit(1);
    }
    let _ = RuleSet::default();
}

/// Cut 119 (`examples/pets_eval.rs`, which includes this file as a module): `bot`'s fortnight (`idle` or `picked`),
/// `each(day, check-in, game)` after every check-in (its absence and the bot's taps). (After `main`: the gate
/// cache's source key reads the file above it.)
#[allow(dead_code)]
pub(crate) fn walk(seed: u64, days: usize, bot: &str, mut each: impl FnMut(usize, u64, &Game)) {
    let cfg = Cfg { bot: match bot { "picked" => Bot::Picked, "tuned" => Bot::Tuned, _ => Bot::Idle }, without: None };
    let mut p = Play::new(seed, days, 3, false, &Ask::new(&cfg));
    while !p.done() {
        let (day, ci) = (p.day, p.ci);
        p.step(&Ask::new(&cfg));
        each(day, ci, &p.g);
    }
}

#[cfg(test)]
mod counter_order_tests {
    use super::*;
    use idlever_core::{geom::Pos, gen::Floor, item::Item, monster::Monster, tiles::{Map, Tile, VISION}, wire::Ev};

    fn counter_fight(boss: &str) -> (Game, u32, u32) {
        let mut g = Game::new_resident(55);
        g.lineage.best_depth = 23;
        g.lineage.gold = 1_000;
        g.lineage.marks = 100;
        g.lineage.systems.insert("pen".into());
        assert!(idlever_core::packages::update_pen(&mut g.lineage));
        idlever_core::packages::recompile(&mut g.lineage);
        for kind in [boss, "spectral_blade"] {
            g.lineage.facts.insert(format!("foe:{kind}"));
            for tag in idlever_core::defs::monster_def(kind).tags {
                g.lineage.facts.insert(format!("foe:{kind}:{tag}"));
            }
        }
        let heal = idlever_core::packages::heal_pct(&g.lineage.pkg.stance, g.lineage.pkg.level(&g.lineage.pkg.stance));
        write_counter_rows(&mut g, boss, heal, &mut Vec::new());
        assert_eq!(g.lineage.pkg.pen.len(), 2, "both legally exposed fallback rows were written");
        assert!(g.lineage.rules().validate().is_ok());
        g.start_run(Some(55));
        let run = g.run.as_mut().unwrap();
        run.depth = if boss == "lich" { 18 } else { 23 };
        let mut map = Map::new(16, 12, Tile::Wall);
        for y in 1..11 { for x in 1..15 { map.set(Pos::new(x, y), Tile::Floor); } }
        let up = Pos::new(1, 1);
        let down = Pos::new(14, 10);
        map.set(up, Tile::StairsUp);
        map.set(down, Tile::StairsDown);
        run.floor = Floor { map, stairs_up: up, stairs_down: down, rooms: Vec::new(), vision: VISION };
        run.monsters.clear();
        run.items.clear();
        run.overlays.clear();
        run.hero.pos = Pos::new(4, 5);
        run.hero_dist_pos = None;
        run.hero.hp = run.hero.max_hp;
        run.hero.energy = 100;
        run.hero.inv.push(Item::new(700_001, "bow"));
        let id = run.new_id();
        let mut m = Monster::spawn(id, boss, Pos::new(5, 5), run.depth);
        m.awake = true;
        m.stun = 500;
        run.monsters.push(m);
        let minion = if boss == "lich" {
            let id = run.new_id();
            let mut m = Monster::spawn(id, "spectral_blade", Pos::new(4, 6), run.depth);
            m.awake = true;
            m.stun = 500;
            run.monsters.push(m);
            id
        } else { id };
        run.floor.map.update_vision(run.hero.pos, VISION);
        g.events.clear();
        (g, id, minion)
    }

    #[test]
    fn copied_master_counter_raises_the_bow_before_its_buffer_attack() {
        let (mut g, _, _) = counter_fight("foundry_master");
        g.tick();
        let fired = g.events.iter().find_map(|e| if let Ev::Rule { verb, .. } = e { Some(verb) } else { None }).unwrap();
        assert_eq!(*fired, idlever_core::rules::Verb::arg("tactic", "reflect_read"));
        assert_eq!(g.run.as_ref().unwrap().hero.weapon_kind(), "bow");
        assert!(!g.events.iter().any(|e| matches!(e, Ev::Attack { verb: Some(v), .. } if v == "reflect")));
    }

    #[test]
    fn copied_lich_counter_hits_the_summoned_foe_before_the_boss() {
        let (mut g, boss, minion) = counter_fight("lich");
        g.tick();
        let fired = g.events.iter().find_map(|e| if let Ev::Rule { verb, .. } = e { Some(verb) } else { None }).unwrap();
        assert_eq!(*fired, idlever_core::rules::Verb::arg("attack", "tag:summoned"));
        assert!(g.events.iter().any(|e| matches!(e, Ev::Attack { dst, .. } if *dst == minion)));
        assert!(!g.events.iter().any(|e| matches!(e, Ev::Attack { dst, .. } if *dst == boss)));
    }
}

// (after `main`: outside the job cache's key — it picks the games and where they stop, never what they do)
#[path = "dayplayer_rows/mod.rs"]
mod rows;

#[cfg(test)]
mod patch_consumer_tests {
    use super::*;
    use idlever_core::{Cond, Patch, PatchBuy, PatchWhole, Verb};

    fn row(n: i32) -> Row {
        Row::new(vec![Cond::n("hp<", n)], Verb::new("rest")).from("player")
    }
    fn game() -> Game {
        let mut g = Game::new_literal(1);
        g.set_rules(RuleSet { rows: vec![row(10), row(20), row(30)], ..Default::default() }).unwrap();
        g
    }
    fn patch(r: Row, at: i32) -> Patch {
        Patch { row: r, insert_at: at, survive: 1.0, forecast_delta: 0.2,
            replace: false, remove: false, root: None, below_bar: false, forecast_depth: 8,
            forecast_pm: 0.02, camp_pending: false, drops: None, exits: false, buys: None,
            moves_from: None, whole: Some(PatchWhole { reach: 0.2, ..Default::default() }),
            gem: true, restores: None, no_gain: false }
    }
    fn rows(g: &Game) -> Vec<i32> {
        g.lineage.rules().rows.iter().map(|r| r.conds[0].n.unwrap()).collect()
    }

    #[test]
    fn patch_consumer_applies_remove_replace_move_and_restore_at_actual_positions() {
        let mut g = game();
        let mut p = patch(row(20), 1);
        p.remove = true;
        assert!(take_patch(&mut g, &p));
        assert_eq!(rows(&g), [10, 30]);
        p.remove = false;
        p.restores = Some(1);
        assert!(take_patch(&mut g, &p));
        assert_eq!(rows(&g), [10, 20, 30]);
        p.restores = None;
        p.replace = true;
        p.row = row(25);
        assert!(take_patch(&mut g, &p));
        assert_eq!(rows(&g), [10, 25, 30]);
        p.replace = false;
        p.row = row(30);
        p.moves_from = Some(2);
        p.insert_at = 0;
        assert!(take_patch(&mut g, &p));
        assert_eq!(rows(&g), [30, 10, 25]);
        assert_eq!(g.lineage.rules().rows[0].origin.as_deref(), Some("player"));
    }

    #[test]
    fn patch_consumer_drops_named_row_and_preserves_measured_insertion_position() {
        let mut g = game();
        let max = g.vocabulary().max_rows;
        g.set_rules(RuleSet { rows: (0..max).map(|i| row(10 + i as i32)).collect(), ..Default::default() }).unwrap();
        let mut p = patch(Row::new(vec![Cond::n("hp<", 80)], Verb::new("rest")), 2);
        // No named drop is a player choice, never an arbitrary bottom-row deletion.
        assert!(!take_patch(&mut g, &p));
        p.drops = Some(0);
        assert!(take_patch(&mut g, &p));
        let mut expected: Vec<i32> = (1..max).map(|i| 10 + i as i32).collect();
        expected.insert(1, 80);
        assert_eq!(rows(&g), expected);
        assert_eq!(g.lineage.rules().rows[1].origin.as_deref(), Some("patch"));
    }

    #[test]
    fn patch_consumer_requires_landed_gem_and_rejects_whole_run_harm() {
        let mut provisional = patch(row(40), 0);
        provisional.camp_pending = true;
        provisional.whole = None;
        let mut harm = patch(row(50), 0);
        harm.whole.as_mut().unwrap().death = 0.1;
        let mut harm_flag = patch(row(60), 0);
        harm_flag.whole.as_mut().unwrap().harms = true;
        let mut loss = patch(row(70), 0);
        loss.whole.as_mut().unwrap().reach = -0.1;
        let mut below = patch(row(80), 0);
        below.below_bar = true;
        let safe = patch(row(90), 1);
        let patches = vec![provisional, harm, harm_flag, loss, below, safe.clone()];
        assert_eq!(measured_death_patch(&patches), Some(&safe));
        assert!(measured_death_patch(&patches[..5]).is_none());
        let mut no_gem = safe;
        no_gem.gem = false;
        assert!(measured_death_patch(&[no_gem]).is_none());
    }

    #[test]
    fn patch_consumer_report_stall_accepts_measured_cut_and_replace_without_death_gem() {
        let mut g = game();
        let mut cut = patch(row(20), 1);
        cut.whole = None;
        cut.gem = false;
        cut.remove = true;
        let selected = measured_stall_patch(std::slice::from_ref(&cut)).unwrap();
        assert!(take_patch(&mut g, selected));
        assert_eq!(rows(&g), [10, 30]);
        let mut replace = patch(row(35), 1);
        replace.whole = None;
        replace.gem = false;
        replace.replace = true;
        assert!(take_patch(&mut g, measured_stall_patch(std::slice::from_ref(&replace)).unwrap()));
        assert_eq!(rows(&g), [10, 35]);
        replace.forecast_delta = 0.0;
        assert!(measured_stall_patch(&[replace]).is_none());
    }

    #[test]
    fn patch_consumer_full_preparation_applies_nothing_and_free_success_carries_supply() {
        let mut g = game();
        g.set_rules(RuleSet { rows: vec![row(10), row(20)], ..Default::default() }).unwrap();
        let mut p = patch(Row::new(vec![Cond::n("hp<", 40)], Verb::arg("drink", "heal")), 1);
        g.lineage.facts.insert(idlever_core::item::ident_fact(&g.lineage.flavours, "heal").unwrap());
        p.buys = Some(PatchBuy { kind: "heal".into(), label: "heal".into(), price: 10 });
        g.lineage.gold = 0;
        let mut full = g.clone();
        for _ in 0..full.lineage.supply_cap() {
            full.buy_supply("heal").unwrap();
        }
        let before = full.save();
        assert!(!take_patch(&mut full, &p));
        assert_eq!(full.save(), before, "full preparation rejects the entire patch atomically");
        let ledger = g.lineage.gold_ledger.clone();
        assert!(take_patch(&mut g, &p));
        assert!(g.lineage.supplies.iter().any(|s| s.kind == "heal"));
        assert_eq!(g.lineage.gold, 0, "unlocked preparation ignores the historical paid quote");
        assert_eq!(g.lineage.gold_ledger, ledger);
        assert_eq!(g.lineage.rules().rows[1].verb, p.row.verb);
        let prepared = g.save();
        assert!(!take_patch(&mut g, &p));
        assert_eq!(g.save(), prepared, "already-written patch buys nothing twice");
    }

    #[test]
    fn patch_consumer_package_recompile_keeps_existing_authored_priority() {
        let mut g = Game::new_resident(1);
        g.lineage.pkg.pen_open = true;
        g.set_rules(RuleSet { rows: vec![row(10), row(20)], ..Default::default() }).unwrap();
        let generated: Vec<Row> = g.lineage.rules().rows.iter().filter(|r| r.is_pkg()).cloned().collect();
        assert!(!generated.is_empty());
        let mut p = patch(row(30), 1);
        p.row.origin = None;
        assert!(take_patch(&mut g, &p));
        let own: Vec<_> = g.lineage.rules().rows.iter().filter(|r| !r.is_pkg()).cloned().collect();
        assert_eq!(own, [row(10), row(30).from("patch"), row(20)]);
        assert_eq!(g.lineage.rules().rows[..3], own);
        assert_eq!(g.lineage.rules().rows[3..], generated);
        let canonical = g.lineage.rules().clone();
        let mut generated_move = patch(g.lineage.rules().rows[3].clone(), 0);
        generated_move.moves_from = Some(3);
        assert!(take_patch(&mut g, &generated_move));
        assert_eq!(g.lineage.rules(), &canonical, "public setter keeps generated rows behind authored pen");
    }
}
#[cfg(test)]
mod counter_copy_tests {
    use super::*;
    use idlever_core::{Cond, Verb, geom::Pos, gen::Floor, item::Item, monster::Monster, tiles::{Map, Tile, VISION}, wire::Ev};

    fn game() -> Game {
        let mut g = Game::new_resident(11);
        g.lineage.best_depth = 28;
        g.lineage.gold = 10_000;
        g.lineage.marks = 100;
        g.lineage.pkg.pen_open = true;
        g.lineage.unlocks.extend(["row5", "row6", "row7", "row8"].map(String::from));
        g.lineage.pkg.stance = "hunter".into();
        g.lineage.pkg.runs.insert("hunter".into(), 220);
        for kind in ["lurker_queen", "lich", "spectral_blade"] {
            g.lineage.facts.insert(format!("foe:{kind}"));
            for tag in idlever_core::defs::monster_def(kind).tags {
                g.lineage.facts.insert(format!("foe:{kind}:{tag}"));
            }
        }
        for kind in ["heal", "silence"] {
            if let Some(f) = idlever_core::item::ident_fact(&g.lineage.flavours, kind) { g.lineage.facts.insert(f); }
        }
        idlever_core::packages::recompile(&mut g.lineage);
        g
    }

    fn queen_fight(g: &mut Game) {
        g.start_run(Some(11));
        let run = g.run.as_mut().unwrap();
        run.depth = 28;
        let mut map = Map::new(16, 12, Tile::Wall);
        for y in 1..11 { for x in 1..15 { map.set(Pos::new(x, y), Tile::Floor); } }
        let up = Pos::new(1, 1);
        let down = Pos::new(14, 10);
        map.set(up, Tile::StairsUp);
        map.set(down, Tile::StairsDown);
        run.floor = Floor { map, stairs_up: up, stairs_down: down, rooms: Vec::new(), vision: VISION };
        run.monsters.clear();
        run.items.clear();
        run.overlays.clear();
        run.hero.pos = Pos::new(4, 5);
        run.hero_dist_pos = None;
        run.hero.max_hp = 100;
        run.hero.hp = 30;
        run.hero.energy = 100;
        run.hero.inv = vec![Item::new(990001, "heal"), Item::new(990002, "silence")].into();
        let mut queen = Monster::spawn(run.new_id(), "lurker_queen", Pos::new(5, 5), 28);
        queen.awake = true;
        queen.stun = 500;
        run.monsters.push(queen);
        run.floor.map.update_vision(run.hero.pos, VISION);
        g.events.clear();
    }

    #[test]
    fn owned_copy_refresh_yields_to_held_heal_through_public_setter() {
        let mut g = game();
        let mut copies = Vec::new();
        write_counter_rows(&mut g, "lurker_queen", 25, &mut copies);
        write_counter_rows(&mut g, "lurker_queen", 45, &mut copies);
        assert_eq!(copies[0].rows.len(), 2);
        let mut before = g.clone();
        queen_fight(&mut before);
        before.tick();
        assert!(before.events.iter().any(|e| matches!(e, Ev::Rule { verb, .. } if *verb == Verb::arg("read", "silence"))));
        maintain_counter_copies(&mut g, &mut copies);
        write_counter_rows(&mut g, "lurker_queen", 35, &mut copies);
        assert_eq!(copies[0].rows.len(), 1);
        assert_eq!(g.lineage.pkg.pen.len(), 1);
        assert!(g.lineage.rules().validate().is_ok());
        queen_fight(&mut g);
        g.tick();
        assert!(g.events.iter().any(|e| matches!(e, Ev::Rule { verb, .. } if *verb == Verb::arg("drink", "heal"))));
        assert!(g.run.as_ref().unwrap().hero.inv.iter().any(|i| i.kind == "silence"));
        assert!(!g.run.as_ref().unwrap().hero.inv.iter().any(|i| i.kind == "heal"));
    }

    #[test]
    fn refresh_preserves_independent_equivalent_instead_of_claiming_it() {
        let mut g = game();
        let mut copies = Vec::new();
        write_counter_rows(&mut g, "lurker_queen", 25, &mut copies);
        let independent = idlever_core::packages::drill_rows("lurker_queen", 35)
            .remove(0).from("patch");
        let before = Row::new(vec![Cond::n("hp<", 80)], Verb::new("rest")).from("player");
        let after = Row::new(vec![Cond::n("hp<", 5)], Verb::new("retreat")).from("patch");
        let mut set = g.lineage.rules().clone();
        set.rows.insert(1, before.clone());
        set.rows.insert(2, independent.clone());
        set.rows.insert(3, after.clone());
        g.set_rules(set).unwrap();
        maintain_counter_copies(&mut g, &mut copies);
        assert!(copies.is_empty(), "equivalent independent row is never claimed");
        assert_eq!(g.lineage.pkg.pen.len(), 3);
        assert!(same_owned_row(&g.lineage.pkg.pen[0], &before));
        assert!(same_owned_row(&g.lineage.pkg.pen[1], &independent));
        assert!(same_owned_row(&g.lineage.pkg.pen[2], &after));
    }

    #[test]
    fn ownership_preserves_independent_rows_and_forked_counter_order() {
        let mut g = game();
        let mut copies = Vec::new();
        write_counter_rows(&mut g, "lurker_queen", 25, &mut copies);
        let independent = idlever_core::packages::drill_rows("lurker_queen", 70).remove(0).from("patch");
        let custom = Row::new(vec![Cond::n("hp<", 15)], Verb::new("retreat")).from("player");
        let mut set = g.lineage.rules().clone();
        set.rows.insert(0, independent.clone());
        set.rows.insert(0, custom.clone());
        g.set_rules(set).unwrap();
        let mut fork = g.clone();
        let mut fork_copies = copies.clone();
        maintain_counter_copies(&mut fork, &mut fork_copies);
        assert!(fork.lineage.pkg.pen.iter().any(|r| same_owned_row(r, &independent)));
        assert!(fork.lineage.pkg.pen.iter().any(|r| same_owned_row(r, &custom)));
        assert_eq!(copies[0].rows[0].conds[1].n, Some(25));
        assert_eq!(fork_copies[0].rows[0].conds[1].n, Some(35));
        write_counter_rows(&mut fork, "lich", 25, &mut fork_copies);
        let verbs: Vec<_> = fork.lineage.pkg.pen.iter().take(2).map(|r| r.verb.clone()).collect();
        maintain_counter_copies(&mut fork, &mut fork_copies);
        let after: Vec<_> = fork.lineage.pkg.pen.iter().take(2).map(|r| r.verb.clone()).collect();
        assert_eq!(after, verbs);
        maintain_counter_copies(&mut fork, &mut fork_copies);
        assert_eq!(fork_copies.iter().find(|c| c.boss == "lich").unwrap().rows.len(), 2);
        // This experiment maintains an owned fallback even if its drill later arrives.
        fork.lineage.pkg.drills.push(idlever_core::packages::Drill {
            boss: "lurker_queen".into(), rows: idlever_core::packages::drill_rows("lurker_queen", 35),
            revoked: false, announced: false,
        });
        idlever_core::packages::recompile(&mut fork.lineage);
        maintain_counter_copies(&mut fork, &mut fork_copies);
        assert_eq!(fork_copies.iter().find(|c| c.boss == "lurker_queen").unwrap().rows.len(), 1);
    }
}

// Opt-in diagnostic only, deliberately after main: ordinary policy and its source-cache salt stay unchanged.
#[path = "dayplayer_hurry/mod.rs"]
mod hurry_diagnostic;
#[allow(dead_code)]
pub fn picked_hurry_diagnostic() { hurry_diagnostic::run(); }

// Opt-in statistical observations, outside the ordinary policy/main cache-key prefix.
#[path = "dayplayer_stat/mod.rs"]
mod stat_probe;
pub fn statistical_probe() -> Result<(), String> { stat_probe::run() }

#[path="dayplayer_upgrade/mod.rs"]
mod upgrade_plan;
