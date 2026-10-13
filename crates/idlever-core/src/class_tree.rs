//! Optional, explicitly selected class policies; existing ability progression is unchanged.
use crate::{
    engine::{Game, LineageState},
    hero::Class,
    rules::{Cond, Row, Verb},
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Node {
    pub id: String,
    pub name: String,
    pub parent: Option<String>,
    pub required_level: u32,
    pub required_depth: u32,
    pub owned: bool,
    pub available: bool,
    pub blocked: Option<String>,
    pub tactics: Vec<Row>,
    pub effect: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Tree {
    pub class: String,
    pub level: u32,
    pub xp: u32,
    pub next: u32,
    pub points: u32,
    pub spent: u32,
    pub available: bool,
    pub blocked: Option<String>,
    pub reset_available: bool,
    pub reset_blocked: Option<String>,
    pub nodes: Vec<Node>,
}
fn home_block(l: &LineageState, away: bool) -> Option<String> {
    if away {
        Some("hero away".into())
    } else if !l.town.home.unwrap_or(true) {
        Some("build a house".into())
    } else {
        None
    }
}
fn row(id: &str, conds: Vec<Cond>, verb: &str, target: &str) -> Row {
    Row {
        conds,
        verb: if target.is_empty() {
            Verb::new(verb)
        } else {
            Verb::arg(verb, target)
        },
        origin: Some(format!("class:path:{id}")),
    }
}
type Pattern = (Vec<Cond>, &'static str, &'static str);
type Definition = (&'static str, &'static str, &'static str, Vec<Pattern>);
fn definitions(class: Class) -> Vec<Node> {
    // Six independently previewable policies. Cooldowns/one-use checks belong to the
    // existing verbs; no new state or per-tick behavior is introduced here.
    let specs: [Definition; 6] = match class {
        Class::Fighter => [
            (
                "warden",
                "Warden",
                "",
                vec![(
                    vec![Cond::n("adj>=", 1), Cond::n("hp<", 70)],
                    "shield_bash",
                    "",
                )],
            ),
            (
                "recovery",
                "Recovery",
                "warden",
                vec![
                    (vec![Cond::n("hp<", 55)], "second_wind", ""),
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp<", 70)],
                        "shield_bash",
                        "",
                    ),
                ],
            ),
            (
                "boss_guard",
                "Boss guard",
                "warden",
                vec![(
                    vec![Cond::t("foe_tag", "boss"), Cond::n("adj>=", 1)],
                    "shield_bash",
                    "",
                )],
            ),
            (
                "reaver",
                "Reaver",
                "",
                vec![(vec![Cond::n("adj>=", 2), Cond::n("hp>", 55)], "cleave", "")],
            ),
            (
                "crowd_breaker",
                "Crowd breaker",
                "reaver",
                vec![
                    (vec![Cond::n("adj>=", 2)], "cleave", ""),
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp>", 70)],
                        "shield_bash",
                        "",
                    ),
                ],
            ),
            (
                "boss_breaker",
                "Boss breaker",
                "reaver",
                vec![
                    (
                        vec![Cond::t("foe_tag", "boss"), Cond::n("adj>=", 1)],
                        "shield_bash",
                        "",
                    ),
                    (vec![Cond::n("adj>=", 2), Cond::n("hp>", 55)], "cleave", ""),
                ],
            ),
        ],
        Class::Rogue => [
            (
                "stalker",
                "Stalker",
                "",
                vec![
                    (vec![Cond::n("adj>=", 1), Cond::n("hp>", 55)], "vanish", ""),
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp>", 55)],
                        "backstab",
                        "",
                    ),
                ],
            ),
            (
                "ambusher",
                "Ambusher",
                "stalker",
                vec![
                    (vec![Cond::n("adj>=", 1), Cond::n("hp>", 55)], "vanish", ""),
                    (vec![Cond::n("adj>=", 1), Cond::n("hp>", 55)], "ambush", ""),
                ],
            ),
            (
                "boss_stalker",
                "Boss stalker",
                "stalker",
                vec![
                    (
                        vec![Cond::t("foe_tag", "boss"), Cond::n("adj>=", 1)],
                        "vanish",
                        "",
                    ),
                    (
                        vec![Cond::t("foe_tag", "boss"), Cond::n("adj>=", 1)],
                        "backstab",
                        "",
                    ),
                ],
            ),
            (
                "shade",
                "Shade",
                "",
                vec![(vec![Cond::n("foes>=", 2), Cond::n("hp<", 70)], "vanish", "")],
            ),
            (
                "escape_artist",
                "Escape artist",
                "shade",
                vec![
                    (vec![Cond::n("adj>=", 2), Cond::n("hp<", 55)], "smoke", ""),
                    (vec![Cond::n("foes>=", 2), Cond::n("hp<", 70)], "vanish", ""),
                ],
            ),
            (
                "counter_ambush",
                "Counter ambush",
                "shade",
                vec![
                    (vec![Cond::n("adj>=", 1), Cond::n("hp<", 70)], "vanish", ""),
                    (vec![Cond::n("adj>=", 1)], "ambush", ""),
                ],
            ),
        ],
        Class::Ranger => [
            (
                "hunter",
                "Hunter",
                "",
                vec![(vec![Cond::n("foe_hp<", 50)], "shoot", "lowest")],
            ),
            (
                "boss_hunter",
                "Boss hunter",
                "hunter",
                vec![
                    (vec![Cond::t("foe_tag", "boss")], "mark", "tag:boss"),
                    (vec![Cond::t("foe_tag", "boss")], "shoot", "tag:boss"),
                ],
            ),
            (
                "finisher",
                "Finisher",
                "hunter",
                vec![(vec![Cond::n("foe_hp<", 70)], "shoot", "lowest")],
            ),
            (
                "barrage",
                "Barrage",
                "",
                vec![(vec![Cond::n("foes>=", 3)], "volley", "")],
            ),
            (
                "crossfire",
                "Crossfire",
                "barrage",
                vec![
                    (vec![Cond::n("foes>=", 2)], "volley", ""),
                    (vec![Cond::n("foe_hp<", 40)], "shoot", "lowest"),
                ],
            ),
            (
                "marked_barrage",
                "Marked barrage",
                "barrage",
                vec![
                    (vec![Cond::t("foe_tag", "boss")], "mark", "tag:boss"),
                    (vec![Cond::n("foes>=", 3)], "volley", ""),
                ],
            ),
        ],
        Class::Caster => [
            (
                "channeler",
                "Channeler",
                "",
                vec![(vec![Cond::n("foe_hp<", 50)], "bolt", "lowest")],
            ),
            (
                "boss_channel",
                "Boss channel",
                "channeler",
                vec![
                    (vec![Cond::t("foe_tag", "boss")], "slow", "tag:boss"),
                    (vec![Cond::t("foe_tag", "boss")], "bolt", "tag:boss"),
                ],
            ),
            (
                "storm",
                "Storm",
                "channeler",
                vec![
                    (vec![Cond::n("adj>=", 2)], "nova", ""),
                    (vec![Cond::n("foe_hp<", 50)], "bolt", "lowest"),
                ],
            ),
            (
                "guardian",
                "Guardian",
                "",
                vec![(vec![Cond::n("foes>=", 2), Cond::n("hp<", 70)], "ward", "")],
            ),
            (
                "frost_guard",
                "Frost guard",
                "guardian",
                vec![
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp<", 70)],
                        "slow",
                        "nearest",
                    ),
                    (vec![Cond::n("foes>=", 2), Cond::n("hp<", 70)], "ward", ""),
                ],
            ),
            (
                "nova_guard",
                "Nova guard",
                "guardian",
                vec![
                    (vec![Cond::n("adj>=", 2), Cond::n("hp<", 70)], "ward", ""),
                    (vec![Cond::n("adj>=", 2)], "nova", ""),
                ],
            ),
        ],
        Class::Gunner => [
            (
                "marksman",
                "Marksman",
                "",
                vec![(vec![Cond::t("foe_tag", "boss")], "aimed_shot", "tag:boss")],
            ),
            (
                "boss_marksman",
                "Boss marksman",
                "marksman",
                vec![
                    (vec![Cond::t("foe_tag", "boss")], "aimed_shot", "tag:boss"),
                    (vec![Cond::t("foe_tag", "boss")], "fire", "tag:boss"),
                ],
            ),
            (
                "quick_loader",
                "Quick loader",
                "marksman",
                vec![
                    (vec![Cond::n("foes>=", 1)], "fast_reload", ""),
                    (vec![Cond::t("foe_tag", "boss")], "aimed_shot", "tag:boss"),
                ],
            ),
            (
                "breacher",
                "Breacher",
                "",
                vec![(
                    vec![Cond::n("adj>=", 2), Cond::n("hp>", 55)],
                    "close_burst",
                    "nearest",
                )],
            ),
            (
                "smoke_screen",
                "Smoke screen",
                "breacher",
                vec![
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp<", 55)],
                        "smoke_retreat",
                        "",
                    ),
                    (
                        vec![Cond::n("adj>=", 2), Cond::n("hp>", 55)],
                        "close_burst",
                        "nearest",
                    ),
                ],
            ),
            (
                "close_loader",
                "Close loader",
                "breacher",
                vec![
                    (vec![Cond::n("foes>=", 1)], "fast_reload", ""),
                    (
                        vec![Cond::n("adj>=", 1), Cond::n("hp>", 55)],
                        "close_burst",
                        "nearest",
                    ),
                ],
            ),
        ],
    };
    specs
        .into_iter()
        .map(|(slug, name, parent, patterns)| {
            let id = format!("{}_{slug}", class.name());
            let tactics: Vec<Row> = patterns
                .into_iter()
                .map(|(c, v, t)| row(&id, c, v, t))
                .collect();
            let effect = match slug {
                "warden" => "bash stun +1 tick",
                "recovery" => "second wind +3 HP",
                "boss_guard" => "boss melee −1 damage",
                "reaver" => "cleave +1 damage",
                "crowd_breaker" => "cleave cooldown −10 ticks",
                "boss_breaker" => "boss bash +1 damage",
                "stalker" => "backstab +1 damage",
                "ambusher" => "ambush +2 damage",
                "boss_stalker" => "boss backstab +1 damage",
                "shade" => "vanish +5 ticks",
                "escape_artist" => "smoke blind +5 ticks",
                "counter_ambush" => "vanish cooldown −10 ticks",
                "hunter" => "below 50% shot +1",
                "boss_hunter" => "boss mark +10 ticks",
                "finisher" => "below 25% shot +1",
                "barrage" => "volley cooldown −10 ticks",
                "crossfire" => "bow shots +1 damage",
                "marked_barrage" => "marked shots +1 damage",
                "channeler" => "bolt +1 damage",
                "boss_channel" => "boss slow +10 ticks",
                "storm" => "nova +1 damage",
                "guardian" => "ward +5 ticks",
                "frost_guard" => "slow +5 ticks",
                "nova_guard" => "warded nova +1 damage",
                "marksman" => "aimed shot +1 damage",
                "boss_marksman" => "boss aim +1 damage",
                "quick_loader" => "fast reload −1 tick",
                "breacher" => "close burst +1 damage",
                "smoke_screen" => "smoke blind +5 ticks",
                "close_loader" => "fast cooldown −10 ticks",
                _ => unreachable!("authored node summary"),
            }
            .to_string();
            Node {
                id,
                name: name.into(),
                parent: (!parent.is_empty()).then(|| format!("{}_{parent}", class.name())),
                required_level: if parent.is_empty() {
                    3
                } else if matches!(
                    slug,
                    "recovery"
                        | "boss_breaker"
                        | "ambusher"
                        | "counter_ambush"
                        | "boss_hunter"
                        | "marked_barrage"
                        | "storm"
                        | "nova_guard"
                        | "quick_loader"
                        | "close_loader"
                ) {
                    7
                } else {
                    5
                },
                required_depth: if parent.is_empty() {
                    8
                } else if matches!(
                    slug,
                    "recovery"
                        | "boss_breaker"
                        | "ambusher"
                        | "counter_ambush"
                        | "boss_hunter"
                        | "marked_barrage"
                        | "storm"
                        | "nova_guard"
                        | "quick_loader"
                        | "close_loader"
                ) {
                    18
                } else {
                    13
                },
                owned: false,
                available: false,
                blocked: None,
                tactics,
                effect,
            }
        })
        .collect()
}
fn budget(l: &LineageState) -> u32 {
    l.class_level().saturating_sub(2).min(6)
}
fn spent(l: &LineageState) -> u32 {
    l.class_paths
        .get(l.class.name())
        .map_or(0, |s| s.len() as u32)
}
fn node_block(l: &LineageState, away: bool, node: &Node) -> Option<String> {
    home_block(l, away).or_else(|| {
        if l.class_level() < node.required_level {
            Some(format!("reach class level {}", node.required_level))
        } else if crate::legacy::deepest(l) < node.required_depth {
            Some(format!("reach D{}", node.required_depth))
        } else if node.parent.as_ref().is_some_and(|parent| {
            l.class_paths
                .get(l.class.name())
                .is_none_or(|s| !s.contains(parent))
        }) {
            Some("learn parent skill".into())
        } else if !l
            .class_paths
            .get(l.class.name())
            .is_some_and(|s| s.contains(&node.id))
            && spent(l) >= budget(l)
        {
            Some("no skill picks".into())
        } else {
            None
        }
    })
}
pub fn offers(l: &LineageState, away: bool) -> Tree {
    let learned = l.class_paths.get(l.class.name());
    let home = home_block(l, away);
    let nodes = definitions(l.class)
        .into_iter()
        .map(|mut n| {
            n.owned = learned.is_some_and(|s| s.contains(&n.id));
            n.blocked = node_block(l, away, &n);
            n.available = !n.owned && n.blocked.is_none();
            n
        })
        .collect::<Vec<_>>();
    let blocked = home.clone().or_else(|| {
        if l.class_level() < 3 {
            Some("reach class level 3".into())
        } else if crate::legacy::deepest(l) < 8 {
            Some("reach D8".into())
        } else {
            None
        }
    });
    let level = l.class_level();
    let xp = l.classes.get(l.class.name()).map_or(0, |p| p.xp);
    Tree {
        class: l.class.name().into(),
        level,
        xp,
        next: if level >= crate::engine::MAX_LEVEL {
            0
        } else {
            crate::hero::xp_to_next(level)
        },
        points: budget(l).saturating_sub(spent(l)),
        spent: spent(l),
        available: blocked.is_none(),
        blocked,
        reset_available: learned.is_some_and(|s| !s.is_empty()) && home.is_none(),
        reset_blocked: home,
        nodes,
    }
}
pub fn learn(g: &mut Game, id: &str) -> Result<(), String> {
    if let Some(reason) = home_block(&g.lineage, crate::persistent::away(g)) {
        return Err(reason);
    }
    let node = definitions(g.lineage.class)
        .into_iter()
        .find(|n| n.id == id)
        .ok_or("unknown class skill")?;
    if let Some(reason) = node_block(&g.lineage, false, &node) {
        return Err(reason);
    }
    g.lineage
        .class_paths
        .entry(g.lineage.class.name().into())
        .or_default()
        .insert(id.into());
    crate::packages::recompile(&mut g.lineage);
    crate::persistent::refit_build(g,false);
    Ok(())
}
pub fn reset(g: &mut Game) -> Result<(), String> {
    if let Some(reason) = home_block(&g.lineage, crate::persistent::away(g)) {
        return Err(reason);
    }
    g.lineage.class_paths.remove(g.lineage.class.name());
    crate::packages::recompile(&mut g.lineage);
    crate::persistent::refit_build(g,false);
    Ok(())
}
pub fn rows(l: &LineageState) -> Vec<Row> {
    let Some(learned) = l.class_paths.get(l.class.name()) else {
        return vec![];
    };
    let defs = definitions(l.class);
    let eligible = |n: &&Node| {
        learned.contains(&n.id)
            && l.class_level() >= n.required_level
            && crate::legacy::deepest(l) >= n.required_depth
            && n.parent.as_ref().is_none_or(|p| learned.contains(p))
    };
    // Descendants precede parent defaults. Authored order, never learning order,
    // settles peers; the compiled set records this exact cumulative policy.
    defs.iter()
        .filter(eligible)
        .filter(|n| n.parent.is_some())
        .chain(defs.iter().filter(eligible).filter(|n| n.parent.is_none()))
        .flat_map(|n| n.tactics.clone())
        .collect()
}
/// Six class-local authored node bits, derived only at send. Old/no-choice
/// lineages return zero; invalid or unqualified stored IDs never grant effects.
pub fn mask(l: &LineageState) -> u32 {
    let Some(learned) = l.class_paths.get(l.class.name()) else {
        return 0;
    };
    definitions(l.class)
        .iter()
        .enumerate()
        .filter(|(_, n)| {
            learned.contains(&n.id)
                && l.class_level() >= n.required_level
                && crate::legacy::deepest(l) >= n.required_depth
                && n.parent.as_ref().is_none_or(|p| learned.contains(p))
        })
        .fold(0, |bits, (i, _)| bits | (1 << i))
}
pub fn label(id: &str) -> Option<String> {
    let id = id.strip_prefix("path:")?;
    static LABELS: std::sync::OnceLock<std::collections::BTreeMap<String, String>> = std::sync::OnceLock::new();
    LABELS.get_or_init(|| Class::ALL.into_iter().flat_map(definitions)
        .map(|node| (node.id,node.name)).collect()).get(id).cloned()
}
#[cfg(test)]
#[path = "class_tree_tests.rs"]
mod tests;
