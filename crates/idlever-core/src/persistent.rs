//! Persistent hero identity, automatic recovery, and confirmed commitment resets.
use crate::{
    engine::{Game, LineageState},
    legacy,
};
use serde::{Deserialize, Serialize};

/// The full death recovery (20 game minutes; owner amendment 2026-10-14), from `balance.recovery[2]` down.
pub const RECOVERY_TICKS: u64 = 12000;
/// Cut230 (owner 2026-10-14, docs/CUT230_EARLY_PACING.md): a death's recovery scales with the run's deepest floor
/// (`Run::max_depth`, the floor he fell on or below it): `balance.recovery[0]` ticks to the last shallow floor,
/// `RECOVERY_TICKS` from the first full floor, a ramp (`(d−lo)/(hi−lo)` to the exponent) between.
pub fn recovery_ticks(depth: u32) -> u64 {
    let [shallow, lo, hi, exp] = crate::balance::get().recovery;
    let shallow = u64::from(shallow);
    if depth <= lo {
        return shallow;
    }
    if depth >= hi {
        return RECOVERY_TICKS;
    }
    let (num, den) = (u64::from(depth - lo).pow(exp), u64::from(hi - lo).pow(exp));
    shallow + (RECOVERY_TICKS - shallow) * num / den
}
pub const REBIRTH_DELVES: u32 = 8;
pub const REBIRTH_SECONDS: u64 = 3600;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct State {
    #[serde(default)]
    pub exit_gold_credit:bool,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub queued_temperament:Option<String>,
    pub name: String,
    pub rebirths: u32,
    pub completed: u32,
    #[serde(default)]
    pub defeats: u32,
    pub last_rebirth_completed: u32,
    pub last_rebirth_s: u64,
    pub recovery_until_tick: u64,
    /// Cut230: the length of the recovery under way (its first ticks read `reincarnating`); 0 on an older save
    /// (the full `RECOVERY_TICKS`).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub recovery_ticks: u64,
}
fn is_zero(n: &u64) -> bool {
    *n == 0
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Attribute {
    pub id: String,
    pub name: String,
    pub rank: u32,
    pub value: i32,
    pub next_price: Option<u32>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Rebirth {
    pub available: bool,
    pub blocked: Option<String>,
    pub token: String,
    pub refund: u32,
    pub points_after: Option<u32>,
    pub required_depth: u32,
    pub delves_remaining: u32,
    pub seconds_remaining: u64,
    pub resets: Vec<String>,
    pub retains: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Hero {
    pub progression:crate::progression::BuildProgression,
    pub id: String,
    pub name: String,
    pub incarnation: u32,
    pub rebirths: u32,
    pub state: String,
    pub recovery_s: u64,
    /// Cut264: the whole recovery's length (s; 0 when none is under way) — the vat's progress ring.
    #[serde(default)]
    pub recovery_total_s: u64,
    /// Cut264 §3: the live price of skipping it (`None`: not offered).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hurry_price: Option<i32>,
    pub rest_s: u64,
    pub need: String,
    pub attributes: Vec<Attribute>,
    pub guild: Service,
    pub pool: Service,
    pub device: Service,
    pub rebirth: Rebirth,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Service {
    pub id: String,
    pub name: String,
    pub available: bool,
    pub body: String,
}

pub fn name(l: &LineageState) -> String {
    if l.persistent.name.is_empty() {
        legacy::hero_identity(l.seed, 1, l.bloodline_id)
    } else {
        l.persistent.name.clone()
    }
}
pub fn away(g: &Game) -> bool {
    g.run
        .as_ref()
        .is_some_and(|r| r.turn > 0 || r.over.is_some())
}
/// Refit only a home preparation, never replay start/payment/loot generation.
pub fn refit_build(g: &mut Game, class_changed: bool) {
    if away(g) {
        return;
    }
    let l = &g.lineage;
    let Some(run) = g.run.as_mut() else { return };
    if class_changed {
        let fed = run.hero.fed;
        let carried: Vec<_> = run
            .hero
            .inv
            .iter()
            .chain(run.hero.weapon.iter())
            .chain(run.hero.armour.iter())
            .chain(run.hero.helm.iter())
            .chain(run.hero.boots.iter())
            .filter(|i| !crate::kit::is_kit_id(i.id))
            .cloned()
            .collect();
        let mut hero = crate::hero::Hero::new(l.class, run.hero.pos);
        hero.apply_level(l.class_level());
        legacy::apply(l, &mut hero);
        crate::tree::safer_start(l, &mut hero);
        if fed {
            let add =
                (hero.max_hp * crate::feats::RATION_PCT / 100).max(crate::feats::RATION_MIN_HP);
            hero.max_hp += add;
            hero.hp += add;
            hero.fed = true;
        }
        crate::kit::equip(l, &mut hero);
        for it in carried {
            hero.auto_equip(it);
        }
        if hero.class == crate::hero::Class::Gunner {
            for i in hero.inv.iter_mut().chain(hero.weapon.iter_mut()) {
                if let Some(p) = crate::firearm::Profile::of(&i.kind) {
                    i.firearm = Some(crate::firearm::Chambers::loaded(p));
                }
            }
        }
        for i in hero
            .inv
            .iter_mut()
            .chain(hero.weapon.iter_mut())
            .chain(hero.armour.iter_mut())
            .chain(hero.helm.iter_mut())
            .chain(hero.boots.iter_mut())
        {
            i.value_claimed = true;
        }
        run.hero = hero;
        crate::traits::wear(run, l);
        run.gun_reload = None;
        run.gun_skills = (l.class == crate::hero::Class::Gunner).then(Default::default);
        run.tools = l.class.earned().then(Default::default);
    }
    run.hero.specialization = crate::specialization::current(l);
    run.hero.class_skills = crate::class_tree::mask(l);
    if let Some(sent) = g.sent_state.as_mut() {
        sent.lineage.class = l.class;
        sent.lineage.classes = l.classes.clone();
        sent.lineage.class_paths = l.class_paths.clone();
        sent.lineage.specializations = l.specializations.clone();
        sent.lineage.pkg = l.pkg.clone();
        sent.lineage.sets = l.sets.clone();
        sent.lineage.starting_config = l.starting_config.clone();
        sent.lineage.starting_selected = l.starting_selected.clone();
    }
    crate::progression::prepared_traits(g);
    sync_preparation(g);
}
pub(crate) fn sync_preparation(g: &mut Game) {
    if away(g) {
        return;
    }
    let Some(run) = g.run.as_ref() else { return };
    g.floor_start = Some((run.clone(), g.lineage.facts.clone()));
    if let Some(cap) = g.capsules.0.iter_mut().find(|c| c.id == run.id) {
        cap.game.run = Some(run.clone());
        cap.game.lineage = g.lineage.clone();
        cap.game.floor_start = g.floor_start.clone();
        cap.game.sent_state = g.sent_state.clone();
    }
}
pub fn remaining(l: &LineageState) -> u64 {
    l.persistent
        .recovery_until_tick
        .saturating_sub(l.total_turns)
}
/// Cut264 §4: the hero is `reincarnating` (in the vat) for the whole recovery, then `ready`. (`recovering` is no longer
/// emitted; the pool keeps a living exit's rest, which never blocks a send.) Rust never reads the string.
pub fn life_state(l:&LineageState,away:bool)->&'static str {
    if away {"away"}else if remaining(l)>0 {"reincarnating"}else{"ready"}
}
/// The length of the recovery under way (ticks; an older save's is the full one).
pub fn recovery_total(l: &LineageState) -> u64 {
    if l.persistent.recovery_ticks == 0 { RECOVERY_TICKS } else { l.persistent.recovery_ticks }
}
/// Cut264 §3 (docs/CUT264_CLONE_VAT.md): the gold that skips the whole recovery left now — offered only while the
/// hero is home and cloning with at least `vat.hurry_min_s` left. Priced live by the record's unit
/// (`kit::unit(best)`), so it falls as the clone grows: `max(floor, roundup(round, ⌈remaining_s × unit × permille /
/// 60000⌉))`.
pub fn hurry_price(l: &LineageState, away: bool) -> Option<i32> {
    if away || !l.town.home.unwrap_or(true) {
        return None;
    }
    let left = remaining(l);
    let v = crate::balance::get().vat;
    let left_s = left.div_ceil(crate::offline::TICKS_PER_SECOND);
    if left == 0 || left_s < u64::from(v.hurry_min_s) {
        return None;
    }
    let unit = u64::from(crate::kit::unit(l.best_depth));
    let raw = (left_s * unit * u64::from(v.hurry_permille)).div_ceil(60_000);
    let round = u64::from(v.hurry_round.max(1));
    let p = (raw.div_ceil(round) * round).max(u64::from(v.hurry_floor));
    Some(p.min(i32::MAX as u64) as i32)
}
/// Cut264 §3: skip the whole recovery for gold — an explicit camp command (never offline, never a bot or a worker).
/// Refused with `price changed` when the live price is above `max_price` (the button showed an older one).
pub fn hurry(l: &mut LineageState, away: bool, max_price: i32) -> Result<i32, String> {
    let p = hurry_price(l, away).ok_or("not cloning")?;
    if p > max_price {
        return Err("price changed".into());
    }
    if crate::tree::purse(l) < p {
        return Err("not enough gold".into());
    }
    let left = remaining(l);
    l.persistent.recovery_until_tick = l.total_turns;
    l.rest_left = l.rest_left.saturating_sub(left.min(u64::from(u32::MAX)) as u32);
    l.gold_move(-p, "hurry clone");
    Ok(p)
}
/// The full recovery (a confirmed reclone).
pub fn recover(l: &mut LineageState) {
    recover_for(l, RECOVERY_TICKS);
}
/// Cut230: a death on (or past) `depth` — its depth-scaled recovery (`recovery_ticks`).
pub fn recover_at(l: &mut LineageState, depth: u32) {
    recover_for(l, recovery_ticks(depth));
}
fn recover_for(l: &mut LineageState, ticks: u64) {
    l.persistent.recovery_until_tick = l.total_turns.saturating_add(ticks);
    l.persistent.recovery_ticks = ticks;
    l.rest_left = ticks as u32;
}
pub fn preview(l: &LineageState, away: bool) -> Rebirth {
    let p = &l.persistent;
    let allocation = l.bloodline.clone().unwrap_or_default();
    let delves_remaining = if p.rebirths == 0 {
        0
    } else {
        REBIRTH_DELVES.saturating_sub(p.completed.saturating_sub(p.last_rebirth_completed))
    };
    let seconds_remaining = if p.rebirths == 0 {
        0
    } else {
        REBIRTH_SECONDS.saturating_sub(l.clock_s.saturating_sub(p.last_rebirth_s))
    };
    let points_after = allocation.points.checked_add(allocation.spent);
    let blocked = if away {
        Some("Hero away".into())
    } else if !l.town.home.unwrap_or(true) {
        Some("Build a house".into())
    } else if remaining(l) > 0 {
        Some("Finish recovery".into())
    } else if legacy::deepest(l) < 8 {
        Some("Reach D8".into())
    } else if allocation.upgrades.is_empty() && l.heirs.blood.is_none() && l.heirs.bloodline.is_none() {
        Some("No attribute commitments".into())
    } else if delves_remaining > 0 {
        Some(format!("Complete {delves_remaining} more delves"))
    } else if seconds_remaining > 0 {
        Some("Let the new clone settle".into())
    } else if points_after.is_none() {
        Some("Legacy total overflow".into())
    } else {
        None
    };
    // Bind confirmation to identity and every relevant current commitment/counter.
    let basis = serde_json::to_string(&(l.seed, l.bloodline_id, l.heir, p, &allocation, &l.heirs, away))
        .expect("rebirth preview");
    Rebirth {
        available: blocked.is_none(),
        blocked,
        token: format!("{:016x}", crate::rng::hash_str(&basis)),
        refund: allocation.spent,
        points_after,
        required_depth: 8,
        delves_remaining,
        seconds_remaining,
        resets: vec![
            "Legacy attributes and branches".into(),
            "Current clone's deeds".into(),
            "Lasting traits and family lean".into(),
        ],
        retains: vec![
            "Name and identity".into(),
            "Refunded Legacy".into(),
            "Class XP and learned skills".into(),
            "Temperament".into(),
            "Kits and discoveries".into(),
            "Town, Gold and dungeon progress".into(),
            "Companion ownership".into(),
        ],
    }
}
/// Physical services belong to the town; their earned availability can be
/// combined across residents without combining their individual needs.
pub fn service_availability(l: &LineageState, away: bool) -> [bool; 3] {
    if !l.town.home.unwrap_or(true) {
        return [false; 3];
    }
    [
        // Cut273: the Guild reception stands once the Guildhouse is built (the Receptionist's arrival); before, its plot
        crate::tree::hired(l, "scout"),
        l.persistent.completed > 0 || remaining(l) > 0 || l.rest_left > 0,
        l.persistent.defeats > 0
            || l.heir > 1
            || l.persistent.rebirths > 0
            || preview(l, away).available,
    ]
}
pub fn wire(l: &LineageState, away: bool) -> Hero {
    let recovery_s = remaining(l).div_ceil(crate::offline::TICKS_PER_SECOND);
    let [guild_available, pool_available, device_available] = service_availability(l, away);
    let home = l.town.home.unwrap_or(true);
    let service = |id: &str, title: &str, body: &str, available: bool| Service {
        id: id.into(),
        name: title.into(),
        available: home && available,
        body: body.into(),
    };
    // Cut258: the receptionist by her name at the guild's desk
    let receptionist = || crate::tree::def("scout").map_or("The Receptionist", |n| n.person);
    Hero {
        progression:crate::progression::wire(l),
        id: format!("{}:{}", l.seed, l.bloodline_id),
        name: name(l),
        incarnation: 1u32
            .saturating_add(l.persistent.defeats)
            .saturating_add(l.persistent.rebirths),
        rebirths: l.persistent.rebirths,
        state:life_state(l,away).into(),
        recovery_s,
        recovery_total_s: if recovery_s > 0 { recovery_total(l).div_ceil(crate::offline::TICKS_PER_SECOND) } else { 0 },
        hurry_price: hurry_price(l, away),
        rest_s: u64::from(l.rest_left).div_ceil(crate::offline::TICKS_PER_SECOND),
        need: if recovery_s > 0 {
            "recovery"
        } else if l.rest_left > 0 {
            "rest"
        } else {
            "none"
        }
        .into(),
        attributes: [
            ("health", "Vitality"),
            ("damage", "Strength"),
            ("armour", "Guard"),
        ]
        .into_iter()
        .map(|(id, n)| {
            let rank = l
                .bloodline
                .as_ref()
                .and_then(|b| b.upgrades.get(id))
                .copied()
                .unwrap_or(0);
            Attribute {
                id: id.into(),
                name: n.into(),
                rank,
                value: legacy::root_effect(id, rank),
                next_price: (rank < legacy::CAP).then(|| legacy::root_price(rank)),
            }
        })
        .collect(),
        guild: service(
            "guild",
            "Guild reception",
            &if crate::tree::auto_send(l) {
                format!("{}, the Receptionist, books another delve after recovery.", receptionist())
            } else {
                "Build the Guildhouse to book delves while away.".to_string()
            },
            guild_available,
        ),
        pool: service(
            "recovery",
            "Recovery pool",
            "Rest completes automatically. Nothing needs tending.",
            pool_available,
        ),
        device: service(
            "reincarnation",
            "Clone vat",
            "Defeat regrows the same hero as a clone. Attributes and builds remain.",
            device_available,
        ),
        rebirth: preview(l, away),
    }
}
pub fn rename(g: &mut Game, new_name: &str) -> Result<(), String> {
    let n = new_name.trim();
    if n.is_empty() || n.chars().count() > 32 || n.chars().any(char::is_control) {
        return Err("Use 1–32 characters without control characters".into());
    }
    if away(g) {
        return Err("Hero away".into());
    }
    if !g.lineage.town.home.unwrap_or(true) {
        return Err("Build a house".into());
    }
    g.lineage.persistent.name = n.into();
    if let Some(h) = g.lineage.hero_legacy.last_mut() {
        h.name = n.into();
    }
    if let Some(r) = g.run.as_mut() {
        r.hero_name = n.into();
    }
    crate::progression::prepared_traits(g);
    sync_preparation(g);
    Ok(())
}
pub fn rebirth(g: &mut Game, token: &str) -> Result<(), String> {
    let offer = preview(&g.lineage, away(g));
    if !offer.available {
        return Err(offer
            .blocked
            .unwrap_or_else(|| "Reclone unavailable".into()));
    }
    if token != offer.token {
        return Err("Reclone preview changed".into());
    }
    let before = g.lineage.bloodline.clone().unwrap_or_default();
    let l = &mut g.lineage;
    l.chronicle_heir("recloned", None);
    let b = l.bloodline.as_mut().expect("rebirth allocation");
    b.points = offer.points_after.expect("validated total");
    b.spent = 0;
    b.upgrades.clear();
    l.persistent.rebirths += 1;
    l.persistent.last_rebirth_completed = l.persistent.completed;
    l.persistent.last_rebirth_s = l.clock_s;
    l.heirs.blood=None;l.heirs.bloodline=None;l.heirs.cut=false;
    l.new_heir();
    recover(l);
    // Keep an unbegun paid preparation. A rebuild could repeat tolls/supply ownership.
    legacy::refit(g, &before);
    if let Some(r) = g.run.as_mut() {
        r.heir = g.lineage.heir;
        r.hero_name = name(&g.lineage);
    }
    if let Some(sent) = g.sent_state.as_mut() {
        sent.lineage.heir = g.lineage.heir;
        sent.lineage.persistent = g.lineage.persistent.clone();
    }
    crate::progression::prepared_traits(g);
    sync_preparation(g);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn home() -> Game {
        let mut g = Game::new_literal(71);
        g.lineage.gold = 500;
        g
    }
    #[test]
    fn defeat_preserves_identity_commitments_and_requires_real_recovery() {
        let mut g = home();
        rename(&mut g, "Mara").unwrap();
        g.start_run(None);
        let old_name = g.run.as_ref().unwrap().hero_name.clone();
        let traits = g.lineage.heirs.clone();
        let temperament = g.lineage.pkg.temperament.clone();
        let class = g.lineage.classes.clone();
        let kit = g.lineage.starting_config.clone();
        let stats = g.lineage.bloodline.clone();
        let heir = g.lineage.heir;
        let r = g.run.as_mut().unwrap();
        r.hero.hp = 0;
        r.death_cause = Some("goblin".into());
        r.over = Some(crate::engine::ExitTier::Death);
        g.finish_run();
        assert_eq!(name(&g.lineage), old_name);
        assert_eq!(g.lineage.heir, heir + 1);
        assert_eq!(g.lineage.heirs.born, traits.born);
        assert_eq!(g.lineage.heirs.blood, traits.blood);
        assert_eq!(g.lineage.pkg.temperament, temperament);
        assert_eq!(g.lineage.classes, class);
        assert_eq!(g.lineage.starting_config, kit);
        assert_eq!(
            g.lineage.bloodline.as_ref().unwrap().upgrades,
            stats.unwrap().upgrades
        );
        // (Cut230: a first-floor death's recovery, the shallow end of the ramp)
        let r = recovery_ticks(1);
        assert_eq!(remaining(&g.lineage), r);
        let save = g.save();
        assert!(g.try_send().is_err());
        assert_eq!(g.save(), save);
        g.rest_tick(r as u32 - 1);
        assert_eq!(remaining(&g.lineage), 1);
        assert!(g.try_send().is_err());
        g.rest_tick(1);
        assert_eq!(remaining(&g.lineage), 0);
        assert!(g.try_send().is_ok());
        assert!(g.lineage.chronicle.last().unwrap().contains("goblin"));
    }

    #[test]
    fn cut230_recovery_scales_with_the_deepest_floor() {
        let [shallow, lo, hi, _] = crate::balance::get().recovery;
        assert_eq!(recovery_ticks(1), u64::from(shallow));
        assert_eq!(recovery_ticks(lo), u64::from(shallow));
        assert_eq!(recovery_ticks(hi), RECOVERY_TICKS);
        assert_eq!(recovery_ticks(40), RECOVERY_TICKS);
        let ramp: Vec<u64> = (1..=40).map(recovery_ticks).collect();
        assert!(ramp.windows(2).all(|w| w[0] <= w[1]), "never shorter deeper: {ramp:?}");
        assert!(recovery_ticks(lo + 1) > u64::from(shallow) && recovery_ticks(hi - 1) < RECOVERY_TICKS);
        // a deep death owes the full recovery, read as reincarnating the whole time (Cut264 §4)
        let mut g = home();
        g.start_run(None);
        let r = g.run.as_mut().unwrap();
        r.max_depth = hi;
        r.over = Some(crate::engine::ExitTier::Death);
        r.death_cause = Some("goblin".into());
        g.finish_run();
        assert_eq!(remaining(&g.lineage), RECOVERY_TICKS);
        assert_eq!(g.lineage.persistent.recovery_ticks, RECOVERY_TICKS);
        assert_eq!(g.lineage.rest_left as u64, RECOVERY_TICKS);
        assert_eq!(life_state(&g.lineage, false), "reincarnating");
        g.rest_tick(10);
        assert_eq!(life_state(&g.lineage, false), "reincarnating");
        // a shallow death's short recovery reads the same phases on its own length
        let mut g = home();
        g.start_run(None);
        let r = g.run.as_mut().unwrap();
        r.over = Some(crate::engine::ExitTier::Death);
        r.death_cause = Some("goblin".into());
        g.finish_run();
        assert_eq!(remaining(&g.lineage), u64::from(shallow));
        assert_eq!(life_state(&g.lineage, false), "reincarnating");
        g.rest_tick(10);
        assert_eq!(life_state(&g.lineage, false), "reincarnating");
        g.rest_tick(shallow);
        assert_eq!(life_state(&g.lineage, false), "ready");
        // an older save (no recorded length) reads the full recovery's length
        g.lineage.persistent.recovery_ticks = 0;
        assert_eq!(recovery_total(&g.lineage), RECOVERY_TICKS);
        // a reclone's recovery stays the full one
        let mut g = home();
        g.lineage.best_depth = 8;
        g.lineage.bloodline.as_mut().unwrap().points = 34;
        g.upgrade_hero("damage").unwrap();
        let p = preview(&g.lineage, false);
        rebirth(&mut g, &p.token).unwrap();
        assert_eq!(remaining(&g.lineage), RECOVERY_TICKS);
    }
    #[test]
    fn confirmed_rebirth_conserves_budget_and_refuses_stale_or_rapid_repeat() {
        let mut g = home();
        g.lineage.best_depth = 8;
        let b = g.lineage.bloodline.as_mut().unwrap();
        b.points = 34;
        g.upgrade_hero("damage").unwrap();
        let b = g.lineage.bloodline.as_ref().unwrap();
        let budget = b.points + b.spent;
        let gold = g.lineage.gold;
        let classes = g.lineage.classes.clone();
        let p = preview(&g.lineage, false);
        assert!(p.available);
        assert_eq!(p.refund, crate::legacy::root_price(0));
        let saved = g.save();
        assert!(rebirth(&mut g, "false").is_err());
        assert_eq!(g.save(), saved);
        rename(&mut g, "Renamed hero").unwrap();
        let renamed = g.save();
        assert!(rebirth(&mut g, &p.token).is_err());
        assert_eq!(g.save(), renamed);
        let p = preview(&g.lineage, false);
        rebirth(&mut g, &p.token).unwrap();
        let b = g.lineage.bloodline.as_ref().unwrap();
        assert_eq!(b.points, budget);
        assert_eq!(b.spent, 0);
        assert!(b.upgrades.is_empty());
        assert_eq!(g.lineage.gold, gold);
        assert_eq!(g.lineage.classes, classes);
        assert_eq!(g.lineage.persistent.rebirths, 1);
        assert_eq!(remaining(&g.lineage), RECOVERY_TICKS);
        g.rest_tick(RECOVERY_TICKS as u32);
        g.lineage
            .bloodline
            .as_mut()
            .unwrap()
            .upgrades
            .insert("damage".into(), 1);
        assert_eq!(preview(&g.lineage, false).delves_remaining, 8);
        g.lineage.persistent.completed += 8;
        assert!(!preview(&g.lineage, false).available);
        g.lineage.clock_s += 3600;
        assert!(preview(&g.lineage, false).available);
        g.lineage.best_depth = 7;
        g.lineage
            .hero_legacy
            .iter_mut()
            .for_each(|h| h.best_depth = 0);
        assert!(!preview(&g.lineage, false).available);
    }

    #[test]
    fn recovery_read_and_reload_are_pure_and_slices_identical() {
        let mut g = home();
        recover(&mut g.lineage);
        let saved = g.save();
        let _ = wire(&g.lineage, false);
        assert_eq!(g.save(), saved);
        let mut whole = Game::load(&saved).unwrap();
        let mut sliced = whole.clone();
        whole.rest_tick(RECOVERY_TICKS as u32);
        sliced.rest_tick(177);
        sliced = Game::load(&sliced.save()).unwrap();
        sliced.rest_tick(RECOVERY_TICKS as u32 - 177);
        assert_eq!(whole.save(), sliced.save());
        assert_eq!(remaining(&whole.lineage), 0);
    }
    #[test]
    fn prepared_rebirth_keeps_paid_run_and_removes_attributes_without_recharging() {
        let mut g = home();
        g.lineage.best_depth = 8;
        let b = g.lineage.bloodline.as_mut().unwrap();
        b.points = 15;
        g.upgrade_hero("damage").unwrap();
        g.lineage.rest_left = 100;
        g.ensure_run();
        let run = g.run.as_ref().unwrap();
        let id = run.id;
        let rng = run.rng.clone();
        let items = run.hero.inv.clone();
        let toll = run.toll;
        let strength = run.hero.str_bonus;
        let gold = g.lineage.gold;
        let p = preview(&g.lineage, legacy::away(&g));
        assert!(p.available);
        rebirth(&mut g, &p.token).unwrap();
        let run = g.run.as_ref().unwrap();
        assert_eq!(run.id, id);
        assert_eq!(run.rng, rng);
        assert_eq!(run.hero.inv, items);
        assert_eq!(run.toll, toll);
        assert_eq!(run.hero.str_bonus, strength - 1);
        assert_eq!(run.heir, g.lineage.heir);
        assert_eq!(g.lineage.gold, gold);
    }
    #[test]
    fn repeated_incarnations_do_not_reaward_the_same_depth_legacy() {
        let mut g = home();
        g.start_run(None);
        let r = g.run.as_mut().unwrap();
        r.max_depth = 8;
        r.over = Some(crate::engine::ExitTier::Death);
        r.death_cause = Some("goblin".into());
        g.finish_run();
        let first = g.lineage.bloodline.as_ref().unwrap().points;
        g.rest_tick(RECOVERY_TICKS as u32);
        g.start_run(None);
        let r = g.run.as_mut().unwrap();
        r.max_depth = 8;
        r.over = Some(crate::engine::ExitTier::Death);
        r.death_cause = Some("goblin".into());
        g.finish_run();
        assert_eq!(first, 9 + crate::balance::get().marks.legacy_start);
        assert_eq!(g.lineage.bloodline.as_ref().unwrap().points, first + 1);
    }
    #[test]
    fn real_offline_recovery_and_multihero_identity_survive_sliced_reload() {
        let mut g = home();
        rename(&mut g, "Mara").unwrap();
        recover(&mut g.lineage);
        let mut session = crate::bloodlines::Session::load(&g.save()).unwrap();
        session.add_bloodline().unwrap();
        session.select_bloodline(2).unwrap();
        rename(&mut session.active, "Bryn").unwrap();
        session.select_bloodline(1).unwrap();
        let saved = session.save();
        let slots=session.lineage().hero_slots;
        assert_eq!(slots.iter().find(|h|h.id==1).map(|h|(&*h.life_state,h.recovery_s)),Some(("reincarnating",RECOVERY_TICKS/10)));
        assert_eq!(slots.iter().find(|h|h.id==2).map(|h|(&*h.life_state,h.recovery_s)),Some(("ready",0)));
        assert_eq!(session.save(),saved,"slot readiness reads cannot mutate any hero");
        let mut whole = crate::bloodlines::Session::load(&saved).unwrap();
        let mut sliced = whole.clone();
        whole.run_offline_mode(RECOVERY_TICKS / 10, false, false);
        sliced.run_offline_mode(17, false, false);
        sliced = crate::bloodlines::Session::load(&sliced.save()).unwrap();
        sliced.run_offline_mode(RECOVERY_TICKS / 10 - 17, false, false);
        assert_eq!(remaining(&whole.active.lineage), 0);
        assert_eq!(
            whole.active.lineage.persistent,
            sliced.active.lineage.persistent
        );
        assert_eq!(
            whole.active.lineage.total_turns,
            sliced.active.lineage.total_turns
        );
        assert_eq!(whole.active.lineage.gold, sliced.active.lineage.gold);
        assert_eq!(whole.active.lineage.heir, sliced.active.lineage.heir);
        assert_eq!(name(&whole.active.lineage), "Mara");
        whole.select_bloodline(2).unwrap();
        assert_eq!(name(&whole.active.lineage), "Bryn");
    }
    #[test]
    fn ready_preparation_accepts_class_and_spec_edits_without_repayment_or_rng() {
        // Controlled unlocked fixture; the paid preparation/edits use real APIs.
        let mut g = home();
        g.lineage.classes.get_mut("fighter").unwrap().level = 10;
        g.lineage.best_depth = 23;
        g.lineage
            .facts
            .insert(crate::item::ident_fact(&g.lineage.flavours, "heal").unwrap());
        g.buy_supply("heal").unwrap();
        g.start_run(None);
        g.lineage.rest_left = 0;
        assert!(!away(&g));
        assert_eq!(g.lineage().persistent_hero.unwrap().state, "ready");
        let r = g.run.as_ref().unwrap();
        let id = r.id;
        let rng = r.rng.clone();
        let route = r.route;
        let floor = r.floor.clone();
        let toll = r.toll;
        let supplies: Vec<_> = r
            .hero
            .inv
            .iter()
            .filter(|i| !crate::kit::is_kit_id(i.id))
            .cloned()
            .collect();
        let gold = g.lineage.gold;
        assert!(g
            .lineage()
            .class_styles
            .unwrap()
            .offers
            .iter()
            .any(|o| o.id == crate::specialization::Style::Sentinel && o.available));
        g.set_specialization("sentinel").unwrap();
        assert_eq!(
            g.run.as_ref().unwrap().hero.specialization,
            Some(crate::specialization::Style::Sentinel)
        );
        g.learn_class_skill("fighter_warden").unwrap();
        g.learn_class_skill("fighter_recovery").unwrap();
        assert_ne!(g.run.as_ref().unwrap().hero.class_skills, 0);
        g.reset_class_skills().unwrap();
        assert_eq!(g.run.as_ref().unwrap().hero.class_skills, 0);
        let saved = g.save();
        assert!(g.set_class("ranger").is_err());
        assert_eq!(g.save(), saved);
        g.lineage.unlocks.insert("ranger".into());
        g.set_class("ranger").unwrap();
        let r = g.run.as_ref().unwrap();
        assert_eq!(r.hero.class, crate::hero::Class::Ranger);
        assert_eq!(r.hero.weapon.as_ref().unwrap().kind, "bow");
        assert_eq!(r.hero.specialization, None);
        assert_eq!(r.id, id);
        assert_eq!(r.rng, rng);
        assert_eq!(r.route, route);
        assert_eq!(r.floor, floor);
        assert_eq!(r.toll, toll);
        let retained: Vec<_> = r
            .hero
            .inv
            .iter()
            .filter(|i| !crate::kit::is_kit_id(i.id))
            .cloned()
            .collect();
        assert_eq!(retained, supplies);
        assert_eq!(g.lineage.gold, gold);
        assert_eq!(
            g.sent_state.as_ref().unwrap().lineage.class,
            crate::hero::Class::Ranger
        );
    }
    #[test]
    fn home_services_follow_actual_milestones_and_keep_normal_rest_visible() {
        let mut g = Game::new(33);
        let h = wire(&g.lineage, false);
        assert!(!h.guild.available && !h.pool.available && !h.device.available);
        g.build_town("house").unwrap();
        let h = wire(&g.lineage, false);
        assert!(!h.pool.available && !h.device.available);
        g.start_run(None);
        g.run.as_mut().unwrap().over = Some(crate::engine::ExitTier::Return);
        g.finish_run();
        let h = wire(&g.lineage, false);
        assert!(h.pool.available);
        assert_eq!(h.need, "rest");
        assert_eq!(h.rest_s, u64::from(g.lineage.rest_left).div_ceil(10));
        assert!(!h.device.available);
        g.start_run(None);
        let r = g.run.as_mut().unwrap();
        r.over = Some(crate::engine::ExitTier::Death);
        r.death_cause = Some("goblin".into());
        g.finish_run();
        let h = wire(&g.lineage, false);
        assert!(h.device.available && h.pool.available);
        assert_eq!(h.need, "recovery");
        assert_eq!(h.recovery_s, recovery_ticks(g.lineage.best_depth.max(1)) / 10);
    }
    #[test]
    fn first_unscouted_defeat_recovers_through_actual_session_wall_clock() {
        let mut g = Game::new(91);
        g.build_town("house").unwrap();
        g.try_send().unwrap();
        {
            let (run, mut cx) = g.ctx();
            crate::turn::damage_hero(run, &mut cx, 999, &crate::turn::Src::Gas);
        }
        g.finish_run();
        assert!(!crate::tree::hired(&g.lineage, "scout"));
        let r = recovery_ticks(1);
        assert_eq!(remaining(&g.lineage), r);
        let mut whole = crate::bloodlines::Session::load(&g.save()).unwrap();
        let mut sliced = whole.clone();
        let next = whole.active.lineage.next_run_id;
        whole.advance(r * 100);
        sliced.advance(17000);
        sliced = crate::bloodlines::Session::load(&sliced.save()).unwrap();
        sliced.advance(r * 100 - 17000);
        assert_eq!(remaining(&whole.active.lineage), 0);
        assert_eq!(remaining(&sliced.active.lineage), 0);
        assert_eq!(
            whole.active.lineage.total_turns,
            sliced.active.lineage.total_turns
        );
        assert_eq!(
            whole.active.lineage.persistent,
            sliced.active.lineage.persistent
        );
        assert_eq!(whole.active.lineage.gold, sliced.active.lineage.gold);
        assert_eq!(
            whole.active.lineage.next_run_id, next,
            "no automatic departure before Receptionist"
        );
        assert!(whole.active.run.is_none());
        assert!(whole.try_send().is_ok());
        let mut counts = Game::load(&g.save()).unwrap();
        crate::offline::run_offline_counts(&mut counts, r / 10);
        assert_eq!(remaining(&counts.lineage), 0);
        assert_eq!(counts.lineage.next_run_id, next);
        assert!(counts.run.is_none());
        assert!(counts.try_send().is_ok());
    }
    #[test]
    fn prepared_class_changes_refresh_the_real_replay_capsule() {
        let mut g = Game::new_resident(73);
        g.ensure_run();
        g.lineage.unlocks.insert("ranger".into());
        g.set_class("ranger").unwrap();
        let r = g.run.as_ref().unwrap();
        let id = r.id;
        let cap = g
            .capsules
            .0
            .iter()
            .find(|c| c.id == id)
            .expect("real capsule");
        assert_eq!(cap.game.run.as_ref().unwrap().hero, r.hero);
        assert_eq!(cap.game.lineage.class, g.lineage.class);
        assert_eq!(cap.game.run.as_ref().unwrap().rng, r.rng);
        g.run_to_end(crate::engine::MAX_TURNS_PER_RUN);
        let actual = g.events.clone();
        let replay = g.replay(id).unwrap();
        let events: Vec<_> = replay
            .floors
            .iter()
            .flat_map(|f| f.events.iter().cloned())
            .collect();
        assert_eq!(
            crate::engine::events_hash(&events),
            crate::engine::events_hash(&actual)
        );
    }
    #[test]
    fn recovery_journal_and_reset_entrypoints_cannot_bypass_readiness() {
        let mut g = Game::new(19);
        let saved = g.save();
        assert!(g.rename_hero("Name").is_err());
        assert_eq!(g.save(), saved);
        g.build_town("house").unwrap();
        recover(&mut g.lineage);
        let j = g.lineage().journal.unwrap();
        assert_eq!(j.recommended.as_deref(), Some("delve"));
        let e = j
            .chapters
            .iter()
            .flat_map(|c| &c.entries)
            .find(|e| e.id == "delve")
            .unwrap();
        assert_eq!(e.state, "active");
        assert!(!e.action.as_ref().unwrap().enabled);
        assert!(e.reason.contains(&format!("{} minutes", (RECOVERY_TICKS / 10).div_ceil(60))));
        let saved = g.save();
        assert!(g.ascend("no_rest").is_err());
        assert_eq!(g.save(), saved);
        assert!(g.begin_descent(0).is_err());
        assert_eq!(g.save(), saved);
        let mut s = crate::bloodlines::Session::load(&saved).unwrap();
        s.advance(RECOVERY_TICKS * 100);
        assert_eq!(remaining(&s.active.lineage), 0);
        let j = s.lineage().journal.unwrap();
        let e = j
            .chapters
            .iter()
            .flat_map(|c| &c.entries)
            .find(|e| e.id == "delve")
            .unwrap();
        assert!(e.action.as_ref().unwrap().enabled);
    }
}
