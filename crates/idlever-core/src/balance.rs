//! Rust-owned numerical tuning. Shipping uses DEFAULT; dev profiles are immutable
//! for the lifetime of a native process, so forecasts never mix two profiles.
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Balance {
    pub level_runs: [u32; 4],
    pub scar_pct: u32,
    pub scar_cap: u32,
    pub drill_meeting: u32,
    pub drill_days: u32,
    pub deep_drill_days: u32,
    pub steady_heal: [i32; 2],
    pub hunter_heal: [i32; 2],
    pub guarded_heal: [i32; 2],
    pub bold_heal: i32,
    pub steady_home: i32,
    pub steady_dry: [i32; 2],
    pub steady_rest: [i32; 2],
    pub guarded_home: [i32; 2],
    pub guarded_dry: [i32; 2],
    /// Cut230 (owner 2026-10-14): death recovery by the run's deepest floor — [shallow ticks, last shallow
    /// floor, first full floor, ramp exponent]; `persistent::recovery_ticks`. The full value is `RECOVERY_TICKS`.
    #[serde(default = "default_recovery")]
    pub recovery: [u32; 4],
    /// Cut233 (owner 2026-10-15: the remaining content tunables, a pure refactor — every default is the constant it
    /// replaced). Each section may be left out of a profile (its shipping values); a section given must be whole.
    #[serde(default = "default_workers")]
    pub workers: Workers,
    #[serde(default = "default_tree")]
    pub tree: TreeTune,
    #[serde(default = "default_rest")]
    pub rest: Rest,
    #[serde(default = "default_gold")]
    pub gold: Gold,
    #[serde(default = "default_kit")]
    pub kit: Kit,
    #[serde(default = "default_unlocks")]
    pub unlocks: Unlocks,
    #[serde(default = "default_stance")]
    pub stance: Stance,
    #[serde(default = "default_marks")]
    pub marks: Marks,
    #[serde(default = "default_monsters")]
    pub monsters: Monsters,
}
fn default_recovery() -> [u32; 4] { DEFAULT.recovery }
fn default_workers() -> Workers { DEFAULT.workers }
fn default_tree() -> TreeTune { DEFAULT.tree }
fn default_rest() -> Rest { DEFAULT.rest }
fn default_gold() -> Gold { DEFAULT.gold }
fn default_kit() -> Kit { DEFAULT.kit }
fn default_unlocks() -> Unlocks { DEFAULT.unlocks }
fn default_stance() -> Stance { DEFAULT.stance }
fn default_marks() -> Marks { DEFAULT.marks }
fn default_monsters() -> Monsters { DEFAULT.monsters }

/// A worker's hire trigger and price (`tree::NODES`): chores by hand that light it, its price in tenths of a forge
/// unit (0: free), the lineage age (h) that lights it without the count once its chore exists (0: none).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Worker {
    pub need: u32,
    pub price_tenths: u32,
    pub fallback_h: u32,
    /// Cut235 (docs/CUT235_FEATS.md): what lights it before the fallback — `count` (`need` chores by hand) or `feat`
    /// (one real outcome of its chore done by hand, `tree::feat_name`). Absent in a profile from before: `count`.
    #[serde(default)]
    pub goal: Goal,
}
/// Cut235: a worker's hire goal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Goal {
    #[default]
    Count,
    Feat,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Workers {
    pub quartermaster: Worker,
    pub porter: Worker,
    pub scout: Worker,
    pub apprentice: Worker,
    pub clerk: Worker,
    pub drillmaster: Worker,
    pub kennel_hand: Worker,
    pub herald: Worker,
    pub guide: Worker,
    pub kennel_keeper: Worker,
}
impl Workers {
    /// The worker `id`'s tuning (`None`: not a worker).
    pub fn of(&self, id: &str) -> Option<&Worker> {
        Some(match id {
            "quartermaster" => &self.quartermaster,
            "porter" => &self.porter,
            "scout" => &self.scout,
            "apprentice" => &self.apprentice,
            "clerk" => &self.clerk,
            "drillmaster" => &self.drillmaster,
            "kennel_hand" => &self.kennel_hand,
            "herald" => &self.herald,
            "guide" => &self.guide,
            "kennel_keeper" => &self.kennel_keeper,
            _ => return None,
        })
    }
    fn all(&self) -> [&Worker; 10] {
        [&self.quartermaster, &self.porter, &self.scout, &self.apprentice, &self.clerk, &self.drillmaster, &self.kennel_hand, &self.herald, &self.guide, &self.kennel_keeper]
    }
}
/// The works tree beyond the hires (`tree.rs`): the reserve the apprentice and the clerk keep (forge units), the
/// guide's band under the record, the days of service to ranks II–IV, a rank's price (forge units × the rank less
/// one), the rank perks, the drillmaster's rank discount (marks), the scout's wall ledger and the guide's stone memory.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TreeTune {
    pub reserve_units: i32,
    pub guide_gap: u32,
    pub rank_days: [u32; 3],
    pub rank_price_units: i32,
    pub porter_bonus_pct: i32,
    pub apprentice_off_pct: u32,
    pub clerk_bonus_permille: i32,
    pub scout_rest_off_pct: u32,
    pub safer_start_pct: i32,
    pub drill_rank_off: u32,
    pub wall_deaths: u32,
    pub wall_near: u32,
    pub wall_retry: u32,
    pub stone_memory: u32,
}
/// The rest after a living exit (`offline::rest_after`): `turns / turns_div` ticks, clamped to [min, cap].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rest {
    pub min_ticks: u32,
    pub cap_ticks: u32,
    pub turns_div: u32,
}
/// Gold and exits (`engine.rs`, `town.rs`): the exit share by tier [bank, return, death] (class XP and renown; Gold
/// is credited whole on a living exit), the loot divisor, the floor's coin piles (`coin_piles` × a draw in
/// [coin_draw[0], coin_draw[1]) × depth / divisor), the nest ((`nest[0]` × depth + a draw in [nest[1], nest[2])) /
/// divisor), a picked floor's freshness (permille by picks, capped), the wake top-up, the night's bounty, the bank's
/// interest (% a night), nights held and floor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Gold {
    pub exit_pct: [i32; 3],
    pub divisor: i32,
    pub coin_piles: u32,
    pub coin_draw: [i32; 2],
    pub nest: [i32; 3],
    pub picked_cap: u32,
    pub freshness: [u32; 8],
    pub picked_shown: u32,
    pub wake_pay: i32,
    pub bounty_below: u32,
    pub bounty_gold_mult: i32,
    pub bank_pct: i32,
    pub bank_nights: i32,
    pub bank_floor: i32,
}
/// The forge and the kit (`kit.rs`): the unit (`unit_base + unit_per_depth × best`), each ladder's price multiples,
/// the row slots' multiples (row5–row10), the pace branch's steps (tenths), the supply cap, commissions (units, the
/// floor), the potion price cap and the salvage ladder (craftable · tier 1 · tier 2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Kit {
    pub unit_base: u32,
    pub unit_per_depth: u32,
    pub weapon_mult: [u32; 6],
    pub armour_mult: [u32; 7],
    pub pack_mult: [u32; 4],
    pub row_mult: [u32; 6],
    pub pace_tenths: [i32; 7],
    pub supply_cap_max: u32,
    pub commission_units: u32,
    pub commission_floor: u32,
    pub supply_price_cap: i32,
    pub forge_ladder: [u32; 3],
}
/// The system reveals' minimum ages (h, `systems.rs`) besides their triggers (`pen`: the pen's group).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SystemHours {
    pub party: u32,
    pub kennel: u32,
    pub stances: u32,
    pub tactics: u32,
    pub bank: u32,
    pub quests: u32,
    pub class: u32,
    pub start: u32,
    pub tactic2: u32,
    pub automations: u32,
    pub pen: u32,
}
/// Unlock gates: the Forge plot's completed delves (with the Scout and exit gold), the build stages' [completed
/// delves, depth] (temperament, inherited, family), the reveals' minimum ages and the pen's fallback age (h).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Unlocks {
    pub forge_delves: u32,
    pub temperament: [u32; 2],
    pub inherited: [u32; 2],
    pub family: [u32; 2],
    pub hours: SystemHours,
    pub pen_fallback_h: u32,
}
/// Stance rows outside the heal/home bars above (`packages::stance_rows`): Hunter home hurt [L1–4, L5], out of
/// heals, its rest; Steady's rest cap and the record under which it holds; Bold's bank past the record [L1–4, L5]
/// and rest; a level's price in marks (`level + level_marks`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Stance {
    pub hunter_home: [i32; 2],
    pub hunter_dry: i32,
    pub hunter_rest: i32,
    pub steady_rest_cap: i32,
    pub steady_rest_cap_below: u32,
    pub bold_bank: [i32; 2],
    pub bold_rest: i32,
    pub level_marks: u32,
}
/// Marks, XP and Legacy: a renown rank at `rank_base × r²` (a mark each), a new trophy's marks, class XP to the next
/// level (`xp_early × L²` up to `xp_early_to`, then `xp_late × L²`), an unlock's gold per mark, the Legacy roots'
/// rank prices and the effects' prices by depth tier (D8, D18).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Marks {
    pub rank_base: u32,
    pub trophy: u32,
    pub xp_early: u32,
    pub xp_late: u32,
    pub xp_early_to: u32,
    pub gold_per_mark: u32,
    pub legacy_root: [u32; 8],
    pub legacy_effect: [u32; 2],
    /// Cut258 (G1: a first buy in the opening minutes): the Legacy a fresh lineage's bloodline starts with — the first
    /// rank is the camp's first choice, before any delve (0: none, as before Cut258).
    #[serde(default)]
    pub legacy_start: u32,
}
/// Monster depth scaling (`defs.rs`): the content depth's cap, HP bonus = depth / `hp_div`, attack = depth / `atk_div`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Monsters {
    pub depth_cap: u32,
    pub hp_div: i32,
    pub atk_div: i32,
}

const fn w(need: u32, price_tenths: u32, fallback_h: u32) -> Worker {
    Worker { need, price_tenths, fallback_h, goal: Goal::Count }
}
/// Cut235: a worker lit by its feat (`need` stays for a save from before, whose count still lights it).
const fn f(need: u32, price_tenths: u32, fallback_h: u32) -> Worker {
    Worker { need, price_tenths, fallback_h, goal: Goal::Feat }
}
pub const DEFAULT: Balance = Balance {
    level_runs: [10, 40, 120, 200], scar_pct: 5, scar_cap: 30,
    drill_meeting: 2, drill_days: 3, deep_drill_days: 6,
    steady_heal: [30,35], hunter_heal: [30,35], guarded_heal: [40,45], bold_heal: 25,
    steady_home: 25, steady_dry: [40,35], steady_rest: [40,60],
    guarded_home: [30,25], guarded_dry: [45,44],
    recovery: [600, 14, 28, 1],
    workers: Workers {
        quartermaster: w(0, 0, 0), porter: w(3, 0, 0), scout: w(0, 1, 0), apprentice: f(3, 30, 30), clerk: f(3, 40, 36),
        drillmaster: f(2, 4, 36), kennel_hand: f(2, 30, 40), herald: f(2, 20, 40), guide: f(3, 40, 44), kennel_keeper: f(2, 30, 48),
    },
    tree: TreeTune {
        reserve_units: 3, guide_gap: 4, rank_days: [2, 4, 8], rank_price_units: 1,
        porter_bonus_pct: 2, apprentice_off_pct: 5, clerk_bonus_permille: 25, scout_rest_off_pct: 5, safer_start_pct: 5, drill_rank_off: 1,
        wall_deaths: 2, wall_near: 2, wall_retry: 3, stone_memory: 12,
    },
    rest: Rest { min_ticks: 20 * 60 * 10, cap_ticks: 30 * 60 * 10, turns_div: 2 },
    gold: Gold {
        exit_pct: [100, 60, 0], divisor: 4, coin_piles: 6, coin_draw: [3, 7], nest: [12, 4, 12],
        picked_cap: 7, freshness: [1000, 800, 640, 512, 410, 328, 262, 250], picked_shown: 3,
        wake_pay: 40, bounty_below: 2, bounty_gold_mult: 2, bank_pct: 2, bank_nights: 3, bank_floor: 100,
    },
    kit: Kit {
        unit_base: 100, unit_per_depth: 25,
        weapon_mult: [1, 4, 9, 16, 25, 36], armour_mult: [1, 4, 8, 14, 22, 32, 45], pack_mult: [2, 5, 10, 16], row_mult: [2, 5, 10, 16, 22, 30],
        pace_tenths: [8, 7, 6, 5, 5, 4, 4], supply_cap_max: 8, commission_units: 10, commission_floor: 5, supply_price_cap: 26,
        forge_ladder: [5, 15, 40],
    },
    unlocks: Unlocks {
        forge_delves: 4, temperament: [6, 5], inherited: [8, 8], family: [12, 13],
        hours: SystemHours { party: 1, kennel: 1, stances: 1, tactics: 4, bank: 8, quests: 12, class: 16, start: 20, tactic2: 56, automations: 96, pen: 0 },
        // Owner 2026-10-17: the pen's stall fallback was 120 h (five days), and three of three
        // blind raters bounced off the closed pen - the game's own verb arrived only by meeting
        // the Bloat Mother or after five idle days - the report's top gripe
        // (`docs/evidence/eval-2026-10-16/blind-a-triage-2026-10-16.md`). At 8 h it lands on the
        // first night, level with `bank`'s age and ahead of quests/class/start, keeping the
        // Mother-met path as the instant one. The tuning profile mirrors this.
        pen_fallback_h: 8,
    },
    stance: Stance { hunter_home: [20, 15], hunter_dry: 35, hunter_rest: 50, steady_rest_cap: 50, steady_rest_cap_below: 18, bold_bank: [25, 20], bold_rest: 50, level_marks: 1 },
    marks: Marks {
        rank_base: 100, trophy: 2, xp_early: 60, xp_late: 100, xp_early_to: 3, gold_per_mark: 150,
        legacy_root: [12, 36, 108, 300, 800, 2000, 5000, 12000], legacy_effect: [700, 1800], legacy_start: 20,
    },
    monsters: Monsters { depth_cap: 16, hp_div: 2, atk_div: 6 },
};
pub fn parse(text: &str) -> Result<Balance, String> {
    let b: Balance = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if b.level_runs[0] == 0 || b.level_runs.windows(2).any(|w| w[0] >= w[1]) || b.level_runs[3] > 1_000_000
        || b.scar_pct == 0 || b.scar_pct > b.scar_cap || b.scar_cap > 100
        || [b.drill_meeting,b.drill_days,b.deep_drill_days].iter().any(|n| *n == 0 || *n > 365)
        || b.deep_drill_days < b.drill_days
        || b.steady_heal.iter().chain(&b.hunter_heal).chain(&b.guarded_heal).chain(&b.steady_dry)
            .chain(&b.steady_rest).chain(&b.guarded_home).chain(&b.guarded_dry)
            .chain([b.bold_heal,b.steady_home].iter()).any(|n| !(1..=100).contains(n))
        || b.recovery[0] == 0 || u64::from(b.recovery[0]) > crate::persistent::RECOVERY_TICKS
        || b.recovery[1] >= b.recovery[2] || b.recovery[2] > 40 || !(1..=4).contains(&b.recovery[3]) {
        return Err("invalid balance bounds or progression ordering".into());
    }
    check_sections(&b).map_err(|e| format!("invalid balance: {e}"))?;
    Ok(b)
}
/// Cut233: the new sections' bounds (a profile the game cannot play is refused, never clamped).
fn check_sections(b: &Balance) -> Result<(), &'static str> {
    fn inc<T: PartialOrd>(v: &[T]) -> bool { v.windows(2).all(|x| x[0] < x[1]) }
    let wk = &b.workers;
    if wk.all().iter().any(|n| n.need > 100 || n.price_tenths > 1000 || n.fallback_h > 24 * 365) { return Err("workers"); }
    // (Cut258: the Scout alone may need no send — offered from the first look, bought from the first run's gold)
    if wk.all().iter().skip(1).any(|n| n.need == 0 && !std::ptr::eq(*n, &wk.scout)) || *wk.all()[0] != w(0, 0, 0) { return Err("workers: need ≥ 1 (the quartermaster is given)"); }
    // (Cut235: the porter and the Scout teach the chore itself — their goal stays a count)
    if [wk.porter, wk.scout].iter().any(|n| n.goal != Goal::Count) { return Err("workers: the porter and the scout count"); }
    let t = &b.tree;
    if !(0..=50).contains(&t.reserve_units) || !(1..=40).contains(&t.guide_gap) || t.rank_days[0] == 0 || !inc(&t.rank_days) || t.rank_days[2] > 365
        || !(0..=50).contains(&t.rank_price_units) || !(0..=50).contains(&t.porter_bonus_pct) || t.apprentice_off_pct > 30
        || !(0..=200).contains(&t.clerk_bonus_permille) || t.scout_rest_off_pct > 30 || !(0..=50).contains(&t.safer_start_pct)
        || t.drill_rank_off > 1 || !(1..=10).contains(&t.wall_deaths) || t.wall_near > 10 || !(1..=20).contains(&t.wall_retry)
        || !(1..=100).contains(&t.stone_memory) { return Err("tree"); }
    let r = &b.rest;
    if r.min_ticks == 0 || r.min_ticks > r.cap_ticks || r.cap_ticks > 6 * 3600 * 10 || !(1..=10).contains(&r.turns_div) { return Err("rest"); }
    let g = &b.gold;
    if g.exit_pct.iter().any(|p| !(0..=100).contains(p)) || g.exit_pct[0] < g.exit_pct[1] || g.exit_pct[1] < g.exit_pct[2]
        || !(1..=20).contains(&g.divisor) || g.coin_piles > 20 || g.coin_draw[0] < 0 || g.coin_draw[0] >= g.coin_draw[1] || g.coin_draw[1] > 100
        || !(0..=100).contains(&g.nest[0]) || g.nest[1] < 0 || g.nest[1] >= g.nest[2] || g.nest[2] > 200
        || g.picked_cap as usize >= g.freshness.len() || g.freshness[0] != 1000 || g.freshness.iter().any(|f| *f == 0 || *f > 1000)
        || g.freshness.windows(2).any(|x| x[1] > x[0])
        || g.picked_shown > g.picked_cap || !(0..=1000).contains(&g.wake_pay) || g.bounty_below > 10 || !(1..=10).contains(&g.bounty_gold_mult)
        || !(0..=20).contains(&g.bank_pct) || !(1..=30).contains(&g.bank_nights) || !(0..=100_000).contains(&g.bank_floor) { return Err("gold"); }
    let k = &b.kit;
    if !(1..=10_000).contains(&k.unit_base) || k.unit_per_depth > 1000
        || [&k.weapon_mult[..], &k.armour_mult, &k.pack_mult, &k.row_mult].iter().any(|m| m[0] == 0 || !inc(m) || m[m.len() - 1] > 1000)
        || k.pace_tenths.iter().any(|p| !(0..=50).contains(p)) || !(1..=32).contains(&k.supply_cap_max)
        || !(1..=1000).contains(&k.commission_units) || !(1..=1000).contains(&k.commission_floor) || !(1..=1000).contains(&k.supply_price_cap)
        || k.forge_ladder[0] == 0 || !inc(&k.forge_ladder) || k.forge_ladder[2] > 10_000 { return Err("kit"); }
    let u = &b.unlocks;
    let h = &u.hours;
    if u.forge_delves > 100 || [u.temperament, u.inherited, u.family].iter().any(|[n, d]| *n > 200 || *d > 40)
        || [h.party, h.kennel, h.stances, h.tactics, h.bank, h.quests, h.class, h.start, h.tactic2, h.automations, h.pen].iter().any(|x| *x > 24 * 365)
        || u.pen_fallback_h > 24 * 365 { return Err("unlocks"); }
    let st = &b.stance;
    if st.hunter_home.iter().chain([st.hunter_dry, st.hunter_rest, st.steady_rest_cap, st.bold_rest].iter()).chain(&st.bold_bank).any(|n| !(1..=100).contains(n))
        || st.steady_rest_cap_below > 40 || st.level_marks > 100 { return Err("stance"); }
    let m = &b.marks;
    if !(1..=100_000).contains(&m.rank_base) || m.trophy > 100 || !(1..=100_000).contains(&m.xp_early) || !(1..=100_000).contains(&m.xp_late)
        || m.xp_early_to > crate::engine::MAX_LEVEL || !(1..=100_000).contains(&m.gold_per_mark)
        || m.legacy_root[0] == 0 || !inc(&m.legacy_root) || m.legacy_root[7] > 10_000_000
        || m.legacy_effect[0] == 0 || m.legacy_effect[0] > m.legacy_effect[1] || m.legacy_effect[1] > 10_000_000
        || m.legacy_start > m.legacy_root[1] { return Err("marks"); }
    let mo = &b.monsters;
    if !(1..=40).contains(&mo.depth_cap) || !(1..=40).contains(&mo.hp_div) || !(1..=40).contains(&mo.atk_div) { return Err("monsters"); }
    Ok(())
}
#[cfg(feature = "dev-balance")]
static PROFILE: std::sync::OnceLock<Balance> = std::sync::OnceLock::new();
#[inline]
pub fn get() -> &'static Balance {
    #[cfg(feature = "dev-balance")]
    if let Some(b) = PROFILE.get() { return b; }
    &DEFAULT
}
/// Call before constructing any game; a second installation is an error.
pub fn configure_from_env() -> Result<(), String> {
    if let Ok(text) = std::env::var("IDLEVER_BALANCE_JSON") {
        #[cfg(feature = "dev-balance")]
        { return PROFILE.set(parse(&text)?).map_err(|_| "balance already installed".into()); }
        #[cfg(not(feature = "dev-balance"))]
        { let _ = text; return Err("balance overrides require --features dev-balance".into()); }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shipping_template_and_bounds() {
        let text = include_str!("../../../tuning/balance.json");
        assert_eq!(parse(text).unwrap(), DEFAULT);
        assert!(parse(&text.replace("\"scar_pct\": 5", "\"scar_pct\": 0")).is_err());
        assert!(parse(&text.replace("10, 40, 120, 200", "10, 10, 120, 200")).is_err());
        assert!(parse(&text.replace("\"scar_pct\"", "\"typo\"")).is_err());
        // Cut233: the sections — a typo inside one, bounds, a section left whole out (its shipping values)
        assert!(parse(&text.replace("\"price_tenths\"", "\"price_tenth\"")).is_err());
        assert!(parse(&text.replace("\"turns_div\": 2", "\"turns_div\": 0")).is_err());
        assert!(parse(&text.replace("\"freshness\": [1000,", "\"freshness\": [900,")).is_err());
        let mut v: serde_json::Value = serde_json::from_str(text).unwrap();
        v.as_object_mut().unwrap().retain(|k, _| !["workers", "tree", "rest", "gold", "kit", "unlocks", "stance", "marks", "monsters"].contains(&k.as_str()));
        assert_eq!(parse(&serde_json::to_string(&v).unwrap()).unwrap(), DEFAULT, "a profile from before Cut233 still parses, at shipping values");
        let mut d = DEFAULT;
        d.workers.drillmaster.price_tenths = 6;
        assert_eq!(parse(&serde_json::to_string(&d).unwrap()).unwrap(), d);
        // Cut235: a worker's goal — `count` sweeps back in; the porter and the scout never take a feat; a profile
        // without `goal` reads `count`
        d.workers.apprentice.goal = Goal::Count;
        assert_eq!(parse(&serde_json::to_string(&d).unwrap()).unwrap(), d);
        let mut e = DEFAULT;
        e.workers.scout.goal = Goal::Feat;
        assert!(parse(&serde_json::to_string(&e).unwrap()).is_err());
        assert!(parse(&text.replace("\"goal\": \"feat\"", "\"goal\": \"feats\"")).is_err());
        assert_eq!(parse(&text.replace(", \"goal\": \"feat\"", "")).unwrap().workers.clerk.goal, Goal::Count);
    }
}
