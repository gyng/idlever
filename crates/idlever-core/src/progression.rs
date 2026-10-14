//! Survivor-friendly build stages; reads and offers never mutate combat RNG.
use crate::{
    engine::{Game, LineageState},
    packages, persistent, traits,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Gate {
    pub available: bool,
    pub label: String,
    pub blocked: Option<String>,
    pub required_completed: u32,
    pub completed: u32,
    pub completed_remaining: u32,
    pub required_depth: u32,
    pub depth_remaining: u32,
}
pub fn gate(l: &LineageState, n: u32, d: u32, scout: bool) -> Gate {
    let remaining = n.saturating_sub(l.persistent.completed);
    let depth = d.saturating_sub(l.best_depth);
    let blocked = if scout && !crate::tree::hired(l, "scout") {
        Some("Hire the Scout".into())
    } else if remaining > 0 {
        Some(format!("Complete {remaining} more delves"))
    } else if depth > 0 {
        Some(format!("Reach D{d}"))
    } else {
        None
    };
    Gate {
        available: blocked.is_none(),
        label: format!("{n} delves · D{d}"),
        blocked,
        required_completed: n,
        completed: l.persistent.completed,
        completed_remaining: remaining,
        required_depth: d,
        depth_remaining: depth,
    }
}
pub fn temperament_open(l: &LineageState) -> bool {
    gate(l, 6, 5, true).available
}
pub fn inherited_open(l: &LineageState) -> bool {
    !l.heirs.neutral && gate(l, 8, 8, false).available
}
pub fn family_gate(l: &LineageState) -> Gate {
    let mut g = gate(l, 12, 13, false);
    if g.available && l.heirs.blood.is_none() {
        g.available = false;
        g.blocked = Some("Choose a lasting trait first".into());
    }
    g
}
pub fn family_open(l: &LineageState) -> bool {
    !l.heirs.neutral && family_gate(l).available
}
pub fn leash_available(l: &LineageState) -> bool {
    crate::town::built(l, "blacksmith")
}
pub fn offer(l: &LineageState) -> Vec<traits::Card> {
    if !inherited_open(l) || l.heirs.blood.is_some() {
        return Vec::new();
    }
    let pool = traits::shipped();
    let mut rng = crate::rng::Rng::derive(
        l.seed,
        crate::rng::hash_str("persistent_trait_offer")
            ^ u64::from(l.bloodline_id)
            ^ u64::from(l.persistent.rebirths).rotate_left(32),
    );
    let mut chosen = Vec::new();
    for _ in 0..3 {
        let options: Vec<_> = pool
            .iter()
            .filter(|(s, _)| {
                !s.is_twist() && !chosen.iter().any(|c: &traits::Card| c.shape.when == s.when)
            })
            .collect();
        if options.is_empty() {
            break;
        }
        let (shape, _) = *options[rng.below(options.len() as u32) as usize];
        chosen.push(traits::Card {
            shape,
            source: "commitment".into(),
        });
    }
    chosen
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct BuildProgression {
    pub temperament: Gate,
    pub inherited: Gate,
    pub family: Gate,
    pub actual_temperament: Option<String>,
    pub next_temperament: Option<String>,
    pub temperament_choices: Vec<String>,
    pub inherited_offer: Vec<traits::TraitCard>,
    pub inherited_chosen: Option<traits::TraitCard>,
    pub actual_inherited: Option<traits::TraitCard>,
    pub family_contexts: Vec<FamilyContext>,
    pub family_chosen: Option<String>,
    pub actual_family: Option<String>,
    pub commitment_blocked: Option<String>,
    pub leash_available: bool,
    pub leash_blocked: Option<String>,
    pub temperament_order_available: bool,
}
pub fn wire(l: &LineageState) -> BuildProgression {
    let card = |s: traits::Shape| {
        let mut c = traits::card(s, "commitment", &l.facts);
        c.formula = s.formula(true);
        c
    };
    let leash = leash_available(l);
    BuildProgression {
        temperament: gate(l, 6, 5, true),
        inherited: gate(l, 8, 8, false),
        family: family_gate(l),
        actual_temperament: l.pkg.temperament.clone(),
        next_temperament: l
            .persistent
            .queued_temperament
            .as_ref()
            .map(|k| if k == "none" { None } else { Some(k.clone()) })
            .unwrap_or_else(|| l.pkg.temperament.clone()),
        temperament_choices: if temperament_open(l) {
            packages::PACKAGES
                .iter()
                .filter(|p| p.kind == packages::Kind::Temperament)
                .map(|p| p.id.into())
                .collect()
        } else {
            Vec::new()
        },
        inherited_offer: offer(l).iter().map(|c| card(c.shape)).collect(),
        inherited_chosen: l.heirs.blood.map(card),
        actual_inherited: l.heirs.blood.map(card),
        family_contexts: contexts(l),
        family_chosen: l.heirs.bloodline.map(|w| w.word().into()),
        actual_family: l.heirs.bloodline.map(|w| w.word().into()),
        commitment_blocked: l
            .heirs
            .blood
            .map(|_| "Confirm a reclone to change lasting traits".into()),
        leash_available: leash,
        leash_blocked: (!leash).then(|| "Build the Forge".into()),
        temperament_order_available: temperament_open(l),
    }
}
pub fn prepared_traits(g: &mut Game) {
    if persistent::away(g) {
        return;
    }
    if let Some(r) = g.run.as_mut().filter(|r| r.turn == 0 && r.over.is_none()) {
        traits::neutralize(r);
        traits::wear(r, &g.lineage);
    }
    if let Some(s) = g.sent_state.as_mut() {
        s.lineage.heirs = g.lineage.heirs.clone();
        s.lineage.pkg = g.lineage.pkg.clone();
        s.lineage.sets = g.lineage.sets.clone();
        s.lineage.active_set = g.lineage.active_set;
    }
    persistent::sync_preparation(g);
}
pub fn set_inherited(g: &mut Game, name: &str) -> Result<(), String> {
    if !inherited_open(&g.lineage) {
        return Err("Reach D8 after eight delves".into());
    }
    if g.lineage.heirs.blood.is_some() {
        return Err("Confirm a reclone to change lasting traits".into());
    }
    let c = offer(&g.lineage)
        .into_iter()
        .find(|c| c.shape.chip() == name || c.shape.head() == name)
        .ok_or("Trait not offered")?;
    g.lineage.heirs.blood = Some(c.shape);
    prepared_traits(g);
    Ok(())
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct FamilyContext {
    pub condition_effect: String,
    pub gift_effect: String,
    pub cost_effect: String,
    pub learned: bool,
    pub id: String,
    pub label: String,
    pub effect: String,
    pub available: bool,
    pub blocked: Option<String>,
}
fn contexts(l: &LineageState) -> Vec<FamilyContext> {
    traits::WHENS
        .iter()
        .map(|w| {
            let shape = l.heirs.blood.map(|mut s| {
                s.when = *w;
                s
            });
            let compatible =
                shape.is_some_and(|s| traits::shipped().iter().any(|(p, _)| p.same_parts(s)));
            let available = family_open(l) && l.heirs.bloodline.is_none() && compatible;
            FamilyContext {
                condition_effect: traits::condition_effect(*w),
                gift_effect: shape.map(traits::gift_effect).unwrap_or_else(|| "Choose a lasting trait first".into()),
                cost_effect: shape.map(|s|traits::cost_effect(s.cost)).unwrap_or_else(|| "Choose a lasting trait first".into()),
                learned: shape.is_some_and(|s|l.facts.contains(&s.fact())),
                id: w.word().into(),
                label: match w {
                    traits::When::Hurt => format!("Below {}% HP", traits::HURT_PCT),
                    traits::When::Crowded => "Two nearby foes".into(),
                    traits::When::Boss => "Boss in sight".into(),
                    traits::When::Quiet => "No foes visible".into(),
                    traits::When::Deep => format!("D{} or deeper", traits::DEEP_FROM),
                    traits::When::First => format!("First {} turns", traits::FIRST_TURNS),
                    _ => w.word().into(),
                },
                effect: shape
                    .map(|s| s.formula(true))
                    .unwrap_or_else(|| "Choose a lasting trait first".into()),
                available,
                blocked: (!available).then(|| {
                    if l.heirs.bloodline.is_some() {
                        "Confirm a reclone to change family context".into()
                    } else if l.heirs.blood.is_none() {
                        "Choose a lasting trait first".into()
                    } else if !compatible {
                        "No compatible trait shape".into()
                    } else {
                        "Reach D13 after twelve delves".into()
                    }
                }),
            }
        })
        .collect()
}
pub fn set_family(g: &mut Game, when: &str) -> Result<(), String> {
    let context = contexts(&g.lineage)
        .into_iter()
        .find(|c| c.id == when)
        .ok_or("Unknown family context")?;
    if !context.available {
        return Err(context
            .blocked
            .unwrap_or("Family context unavailable".into()));
    }
    let w = traits::When::parse(when).ok_or("Unknown context")?;
    g.lineage.heirs.bloodline = Some(w);
    g.lineage
        .heirs
        .blood
        .as_mut()
        .expect("validated blood")
        .when = w;
    prepared_traits(g);
    Ok(())
}
pub fn set_temperament(g: &mut Game, id: Option<&str>) -> Result<(), String> {
    if !temperament_open(&g.lineage) || g.lineage.pkg.literal {
        return Err("Temperament locked".into());
    }
    if id.is_some_and(|id| packages::def(id).is_none_or(|d| d.kind != packages::Kind::Temperament))
    {
        return Err("Unknown temperament".into());
    }
    g.lineage.orders.temperament = "keep".into();
    if persistent::away(g) {
        g.lineage.persistent.queued_temperament = Some(id.unwrap_or("none").into());
        return Ok(());
    }
    packages::wear(&mut g.lineage, id);
    g.lineage.pkg.temperament_chosen = id.is_some();
    packages::recompile(&mut g.lineage);
    prepared_traits(g);
    Ok(())
}
pub const TEMPERAMENT_ORDERS: [&str; 3] = ["keep", "adapt", "variety"];
pub fn prepare(l: &mut LineageState) {
    if !temperament_open(l) || l.pkg.literal {
        return;
    }
    if l.persistent.queued_temperament.is_none() && l.orders.temperament != "keep" {
        let id = if l.orders.temperament == "variety" {
            let choices = ["skittish", "unbowed", "light_hands", "iron_gut"];
            Some(
                choices[(crate::rng::hash_str(&format!(
                    "{}:{}:{}",
                    l.seed, l.bloodline_id, l.persistent.completed
                )) % 4) as usize]
                    .to_string(),
            )
        } else {
            l.last_run
                .as_ref()
                .and_then(|r| r.cause.as_deref())
                .filter(|k| l.facts.contains(&format!("foe:{k}")))
                .and_then(traits::answer_gift)
                .map(|(gift, _)| {
                    if gift == traits::Gift::Quick {
                        "skittish"
                    } else if gift == traits::Gift::Mend {
                        "iron_gut"
                    } else {
                        "unbowed"
                    }
                    .into()
                })
        };
        if let Some(id) = id {
            if l.pkg.temperament.as_ref() != Some(&id) {
                l.persistent.queued_temperament = Some(id);
            }
        }
    }
    if let Some(id) = l.persistent.queued_temperament.take() {
        let changed = l.pkg.temperament.as_deref() != if id == "none" { None } else { Some(&id) };
        packages::wear(l, if id == "none" { None } else { Some(&id) });
        l.pkg.temperament_chosen = id != "none";
        packages::recompile(l);
        if changed {
            crate::feats::news(
                l,
                "temperament",
                format!("Temperament: {}", if id == "none" { "none" } else { &id }),
                crate::feats::day_of(l.clock_s),
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn staged() -> Game {
        let mut g = Game::new(7);
        g.build_town("house").unwrap();
        g.lineage.persistent.completed = 12;
        g.lineage.best_depth = 13;
        g.lineage.tree.hired.push(("scout".into(), 0));
        g
    }
    #[test]
    fn staged_boundaries_ignore_deaths_and_purse() {
        let mut g = staged();
        g.lineage.gold = 0;
        g.lineage.graveyard.clear();
        g.lineage.heir = 1;
        for (n, d, yes) in [(5, 5, false), (6, 4, false), (6, 5, true)] {
            g.lineage.persistent.completed = n;
            g.lineage.best_depth = d;
            assert_eq!(temperament_open(&g.lineage), yes);
        }
        for (n, d, yes) in [(7, 8, false), (8, 7, false), (8, 8, true)] {
            g.lineage.persistent.completed = n;
            g.lineage.best_depth = d;
            assert_eq!(inherited_open(&g.lineage), yes);
        }
        let first = offer(&g.lineage)[0].shape;
        set_inherited(&mut g, &first.chip()).unwrap();
        for (n, d, yes) in [(11, 13, false), (12, 12, false), (12, 13, true)] {
            g.lineage.persistent.completed = n;
            g.lineage.best_depth = d;
            assert_eq!(family_open(&g.lineage), yes);
        }
    }
    #[test]
    fn stable_read_only_commitment_and_atomic_rejection() {
        let mut g = staged();
        let before = g.save();
        let cards = offer(&g.lineage);
        assert_eq!(cards.len(), 3);
        for _ in 0..4 {
            assert_eq!(offer(&g.lineage), cards);
            let _ = wire(&g.lineage);
        }
        assert_eq!(g.save(), before);
        assert!(set_inherited(&mut g, "not offered").is_err());
        assert_eq!(before, g.save());
        set_inherited(&mut g, &cards[0].shape.chip()).unwrap();
        let chosen = g.lineage.heirs.blood.unwrap();
        let before = g.save();
        assert!(set_inherited(&mut g, &cards[1].shape.chip()).is_err());
        assert_eq!(g.save(), before);
        let context = contexts(&g.lineage)
            .into_iter()
            .find(|c| c.available)
            .unwrap();
        set_family(&mut g, &context.id).unwrap();
        let changed = g.lineage.heirs.blood.unwrap();
        assert_eq!(chosen.gift, changed.gift);
        assert_eq!(chosen.cost, changed.cost);
        assert_eq!(chosen.tier, changed.tier);
        let before = g.save();
        assert!(set_family(&mut g, &context.id).is_err());
        assert_eq!(before, g.save());
    }
    #[test]
    fn free_home_changes_and_away_queue_preserve_actor_and_capsule() {
        let mut g = staged();
        g.lineage.gold = 0;
        g.ensure_run();
        for id in ["unbowed", "skittish", "light_hands"] {
            set_temperament(&mut g, Some(id)).unwrap();
            assert_eq!(g.lineage.gold, 0);
            assert_eq!(g.lineage.pkg.temperament.as_deref(), Some(id));
        }
        g.try_send().unwrap();
        g.step(1);
        let actor = g.run.clone();
        let sent = serde_json::to_string(&g.sent_state).unwrap();
        let rules = g.lineage.rules().clone();
        set_temperament(&mut g, Some("iron_gut")).unwrap();
        assert_eq!(g.run, actor);
        assert_eq!(serde_json::to_string(&g.sent_state).unwrap(), sent);
        assert_eq!(*g.lineage.rules(), rules);
        assert_eq!(
            wire(&g.lineage).next_temperament.as_deref(),
            Some("iron_gut")
        );
        let mut l = g.lineage.clone();
        prepare(&mut l);
        assert_eq!(l.pkg.temperament.as_deref(), Some("iron_gut"));
        assert!(l.persistent.queued_temperament.is_none());
    }
}

#[cfg(test)]
mod lifecycle_tests {
    use super::*;
    fn qualified() -> Game {
        let mut g = Game::new(9);
        g.build_town("house").unwrap();
        g.lineage.tree.hired.push(("scout".into(), 0));
        g.lineage.persistent.completed = 12;
        g.lineage.best_depth = 13;
        g
    }
    #[test]
    fn forge_needs_real_credit_and_is_never_automatic() {
        let mut g = qualified();
        g.lineage.persistent.completed = 3;
        g.lineage.gold_move(10, "died D5");
        assert!(!crate::town::build_ready(&g.lineage, "blacksmith"));
        g.lineage.persistent.completed = 4;
        g.lineage.gold_move(-10, "forge test");
        assert_eq!(g.lineage.gold, 0);
        assert!(crate::town::build_ready(&g.lineage, "blacksmith"));
        assert!(!crate::town::built(&g.lineage, "blacksmith"));
        assert!(!leash_available(&g.lineage));
        let before = g.save();
        assert!(g.buy_supply("leash").is_err());
        assert_eq!(before, g.save());
        g.build_town("blacksmith").unwrap();
        assert!(leash_available(&g.lineage));
        g.buy_supply("leash").unwrap();
        assert_eq!(g.lineage.gold, 0);
        assert!(!crate::town::build_ready(
            &qualified().lineage,
            "blacksmith"
        ));
    }
    #[test]
    fn queue_roundtrip_and_three_departures_do_not_charge() {
        let mut g = qualified();
        g.lineage.gold = 0;
        g.ensure_run();
        g.try_send().unwrap();
        g.step(1);
        set_temperament(&mut g, Some("iron_gut")).unwrap();
        let loaded = Game::load(&g.save()).unwrap();
        assert_eq!(
            loaded.lineage.persistent.queued_temperament.as_deref(),
            Some("iron_gut")
        );
        let mut current = loaded;
        current.set_worker("scout", false).unwrap();
        while !current.step(256).run_over {}
        let completed = current.lineage.persistent.completed;
        let ledger = current.lineage.gold_ledger.len();
        let gold = current.lineage.gold;
        for _ in 0..3 {
            let wait =
                persistent::remaining(&current.lineage).div_ceil(crate::offline::TICKS_PER_SECOND);
            if wait > 0 {
                crate::offline::run_offline_counts(&mut current, wait);
            }
            current.try_send().unwrap();
            assert_eq!(current.lineage.pkg.temperament.as_deref(), Some("iron_gut"));
            while !current.step(256).run_over {}
        }
        assert_eq!(current.lineage.persistent.completed, completed + 3);
        let movements = &current.lineage.gold_ledger[ledger..];
        assert!(
            movements.iter().all(|m| m.delta >= 0),
            "free preparation creates no debit"
        );
        assert_eq!(
            current.lineage.gold,
            gold + movements.iter().map(|m| m.delta).sum::<i32>()
        );
    }
    #[test]
    fn commitment_changes_bind_rebirth_token_and_reset_requires_confirmation() {
        let mut g = qualified();
        let first = offer(&g.lineage)[0].shape;
        set_inherited(&mut g, &first.chip()).unwrap();
        let token = persistent::preview(&g.lineage, false).token;
        let context = contexts(&g.lineage)
            .into_iter()
            .find(|c| c.available)
            .unwrap();
        set_family(&mut g, &context.id).unwrap();
        assert_ne!(persistent::preview(&g.lineage, false).token, token);
        let before = g.save();
        assert!(persistent::rebirth(&mut g, &token).is_err());
        assert_eq!(before, g.save());
        let valid = persistent::preview(&g.lineage, false);
        assert!(valid.available);
        persistent::rebirth(&mut g, &valid.token).unwrap();
        assert!(g.lineage.heirs.blood.is_none());
        assert!(g.lineage.heirs.bloodline.is_none());
        assert_eq!(g.lineage.persistent.rebirths, 1);
        assert!(persistent::remaining(&g.lineage) > 0);
    }
}

#[cfg(test)]
mod replay_tests {
    use super::*;
    #[test]
    fn prepared_refit_keeps_paid_world_and_refreshes_actual_capsule() {
        let mut g = Game::new(5);
        g.build_town("house").unwrap();
        g.lineage.tree.hired.push(("scout".into(), 0));
        g.lineage.persistent.completed = 8;
        g.lineage.best_depth = 8;
        g.ensure_run();
        let before = g.run.clone().unwrap();
        let gold = g.lineage.gold;
        set_temperament(&mut g, Some("unbowed")).unwrap();
        let r = g.run.as_ref().unwrap();
        assert_eq!(r.id, before.id);
        assert_eq!(r.rng, before.rng);
        assert_eq!(r.floor, before.floor);
        assert_eq!(r.route, before.route);
        assert_eq!(r.toll, before.toll);
        assert_eq!(r.hero.fed, before.hero.fed);
        assert_eq!(r.hero.inv, before.hero.inv);
        assert_eq!(g.lineage.gold, gold);
        let cap = g.capsules.0.iter().find(|c| c.id == r.id).unwrap();
        assert_eq!(cap.game.run.as_ref().unwrap().worn, r.worn);
        assert_eq!(*cap.game.lineage.rules(), *g.lineage.rules());
    }
    #[test]
    fn whole_slice_reload_offline_stage_truth_matches() {
        let mut g = Game::new(12);
        g.build_town("house").unwrap();
        for _ in 0..3 {
            let wait = persistent::remaining(&g.lineage).div_ceil(10);
            if wait > 0 {
                crate::offline::run_offline_counts(&mut g, wait);
            }
            g.try_send().unwrap();
            while !g.step(256).run_over {}
            if crate::tree::lit(&g.lineage).is_some_and(|n| n.id == "porter") {
                g.hire("porter").unwrap();
            }
            if crate::tree::lit(&g.lineage).is_some_and(|n| n.id == "scout") {
                g.hire("scout").unwrap();
            }
        }
        assert!(crate::tree::hired(&g.lineage, "scout"));
        let mut whole = Game::load(&g.save()).unwrap();
        let mut split = whole.clone();
        crate::offline::run_offline_slice(&mut whole, 8 * 3600, true);
        crate::offline::run_offline_slice(&mut split, 4 * 3600, false);
        split = Game::load(&split.save()).unwrap();
        crate::offline::run_offline_slice(&mut split, 4 * 3600, true);
        assert_eq!(whole.save(), split.save());
        assert!(!crate::town::built(&whole.lineage, "blacksmith"));
    }
}

#[cfg(test)]
mod shared_tests {
    #[test]
    fn eligible_town_does_not_relock_on_paid_new_resident() {
        let mut s = crate::bloodlines::Session::new(1);
        s.build_town("house").unwrap();
        s.lineage.tree.hired.push(("scout".into(), 0));
        s.lineage.persistent.completed = 4;
        s.lineage.gold_move(750, "banked D5");
        let gold = s.lineage.gold;
        s.add_bloodline().unwrap();
        s.add_bloodline().unwrap();
        assert_eq!(s.lineage.gold, gold - 500);
        s.select_bloodline(2).unwrap();
        assert_eq!(s.lineage.persistent.completed, 0);
        assert!(crate::town::build_ready(&s.lineage, "blacksmith"));
        let before = s.save();
        let _ = s.lineage();
        assert_eq!(before, s.save());
        let mut s = crate::bloodlines::Session::load(&before).unwrap();
        s.build_town("blacksmith").unwrap();
        s.select_bloodline(3).unwrap();
        assert!(crate::town::built(&s.lineage, "blacksmith"));
        assert_eq!(s.lineage.persistent.completed, 0);
        assert!(s.lineage.heirs.blood.is_none());
        assert!(s.lineage.pkg.temperament.is_none());
    }
}

