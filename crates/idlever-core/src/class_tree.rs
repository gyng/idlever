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
    pub budget: u32,
    pub next_pick: Option<PickMilestone>,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub earned_stage:Option<EarnedStage>,
    pub available: bool,
    pub blocked: Option<String>,
    pub reset_available: bool,
    pub reset_blocked: Option<String>,
    pub nodes: Vec<Node>,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct EarnedStage {pub stage:String,pub picks:u32}
/// Canonical progress toward the next earned pick, never a clock or a purchase.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PickMilestone {
    pub stage: String,
    pub level: u32,
    pub required_level: u32,
    pub depth: u32,
    pub required_depth: u32,
    pub completed: u32,
    pub required_completed: u32,
    pub scout: bool,
    pub requires_scout: bool,
}
fn expanded(class: Class) -> bool {
    matches!(class, Class::Fighter | Class::Rogue | Class::Ranger | Class::Caster | Class::Gunner)
}
const STAGES: [(&str,u32,u32,u32);4] = [
    ("advanced",9,23,24), ("advanced_second",10,28,32),
    ("capstone",10,29,48), ("mastery",10,33,64),
];
fn completed(l:&LineageState)->u32 {
    l.runs_banked.saturating_add(l.runs_returned).saturating_add(l.runs_died)
}
fn earned_stages(l:&LineageState)->usize {
    if !expanded(l.class) || !crate::tree::hired(l,"scout") { return 0; }
    STAGES.iter().take_while(|(_,level,depth,runs)|
        l.class_level()>=*level && crate::legacy::deepest(l)>=*depth && completed(l)>=*runs
    ).count()
}
fn next_pick(l:&LineageState)->Option<PickMilestone> {
    let base=l.class_level().saturating_sub(2).min(6);
    let (stage,required_level,required_depth,required_completed,requires_scout)=if base<6 {
        ("class_level",l.class_level().saturating_add(1).max(3),0,0,false)
    } else {
        if !expanded(l.class) {return None;}
        let &(stage,level,depth,runs)=STAGES.get(earned_stages(l))?;
        (stage,level,depth,runs,true)
    };
    Some(PickMilestone {stage:stage.into(),level:l.class_level(),required_level,
        depth:crate::legacy::deepest(l),required_depth,completed:completed(l),required_completed,
        scout:crate::tree::hired(l,"scout"),requires_scout})
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
        // Cut225: two three-node chains (root → middle → leaf) per earned class. Bit order:
        // 0 root, 1 middle, 2 leaf of the first path; 3 root, 4 middle, 5 leaf of the second.
        Class::Clown => [
            ("bellkeeper", "Bellkeeper", "", vec![(vec![Cond::n("adj>=", 1), Cond::n("foes>=", 2)], "bell_lure", "")]),
            ("false_exit", "False exit", "bellkeeper", vec![
                (vec![Cond::n("adj>=", 1), Cond::n("hp<", 60)], "curtain", ""),
                (vec![Cond::n("adj>=", 1), Cond::n("foes>=", 2)], "bell_lure", ""),
            ]),
            ("ringmaster", "Ringmaster", "false_exit", vec![(vec![Cond::n("foes>=", 3)], "grand_jape", "")]),
            ("turncoat", "Turncoat", "", vec![(vec![Cond::n("adj>=", 2)], "turnabout", "")]),
            ("cruel_joke", "Cruel joke", "turncoat", vec![
                (vec![Cond::n("adj>=", 2)], "turnabout", ""),
                (vec![Cond::n("adj>=", 1), Cond::n("foes>=", 2)], "false_bow", "nearest"),
            ]),
            ("last_laugh", "Last laugh", "cruel_joke", vec![(vec![Cond::n("adj>=", 1), Cond::n("hp<", 60)], "turnabout", "")]),
        ],
        Class::Engineer => [
            ("watchmaker", "Watchmaker", "", vec![(vec![Cond::n("foes>=", 1)], "deploy", "")]),
            ("bastion", "Bastion", "watchmaker", vec![(vec![Cond::n("foes>=", 1)], "brace_sentry", "")]),
            ("artificer", "Artificer", "bastion", vec![(vec![Cond::n("foes>=", 2)], "overdrive", "")]),
            ("surveyor", "Surveyor", "", vec![(vec![Cond::n("foes>=", 1)], "deploy", "")]),
            ("mobile_works", "Mobile works", "surveyor", vec![(vec![Cond::n("foes>=", 1)], "relocate", "")]),
            ("relay", "Relay", "mobile_works", vec![
                (vec![Cond::n("foes>=", 1)], "deploy", ""),
                (vec![Cond::n("foes>=", 1)], "relocate", ""),
            ]),
        ],
    };
    let mut nodes = specs
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
                "bellkeeper" => "lure lifetime +5 ticks",
                "false_exit" => "curtain cooldown −10 ticks",
                "ringmaster" => "grand jape +1 foe",
                "turncoat" => "counter +1 damage",
                "cruel_joke" => "counter window +5 ticks",
                "last_laugh" => "counter cooldown −10 ticks",
                "watchmaker" => "sentry +4 HP",
                "bastion" => "brace −1 more damage",
                "artificer" => "overdrive +5 ticks",
                "surveyor" => "deploy range +1",
                "mobile_works" => "relocate cooldown −10 ticks",
                "relay" => "deploy cooldown −10 ticks",
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
                        | "ringmaster"
                        | "last_laugh"
                        | "artificer"
                        | "relay"
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
                        | "ringmaster"
                        | "last_laugh"
                        | "artificer"
                        | "relay"
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
        .collect::<Vec<_>>();
    nodes.extend(advanced_definitions(class));
    nodes
}
fn advanced_definitions(class:Class)->Vec<Node> {
    let specs:Vec<(&str,&str,&str,&str,Vec<Pattern>)>=match class {
        Class::Fighter=>vec![
            ("rally","Rally","recovery","wind after block → bash cooldown −20 ticks",vec![(vec![Cond::n("hp<",55)],"second_wind",""),(vec![Cond::n("adj>=",1)],"shield_bash","")]),
            ("oathguard","Oathguard","boss_guard","boss bash → one melee block +2 for10ticks",vec![(vec![Cond::t("foe_tag","boss")],"shield_bash","")]),
            ("opening_cut","Opening cut","crowd_breaker","cleave2hits → bash cooldown −10ticks",vec![(vec![Cond::n("adj>=",2)],"cleave",""),(vec![Cond::n("adj>=",1)],"shield_bash","")]),
            ("siege_rhythm","Siege rhythm","boss_breaker","boss bash → next melee +2 for10ticks",vec![(vec![Cond::t("foe_tag","boss")],"shield_bash",""),(vec![Cond::n("adj>=",1)],"attack","nearest")]),
            ("holdfast","Holdfast","rally","threatened wind → two melee blocks +2 for20ticks",vec![(vec![Cond::n("hp<",55),Cond::n("adj>=",1)],"second_wind","")]),
            ("execution_arc","Execution arc","siege_rhythm","charged kill → bash −20ticks;40tick cap",vec![(vec![Cond::t("foe_tag","boss")],"shield_bash",""),(vec![Cond::n("adj>=",1)],"attack","lowest")]),
        ],
        Class::Rogue=>vec![
            ("afterimage","Afterimage","ambusher","ambush → next shadowstep cuts vanish cooldown20ticks",vec![(vec![Cond::n("adj>=",1)],"ambush",""),(vec![Cond::n("foes>=",1)],"shadowstep","")]),
            ("tell_thief","Tell thief","boss_stalker","windup boss backstab → vanish cooldown −10ticks",vec![(vec![Cond::t("foe_tag","boss")],"backstab","")]),
            ("veiled_route","Veiled route","escape_artist","smoke blind → next shadowstep returns50%energy",vec![(vec![Cond::n("adj>=",1)],"smoke",""),(vec![Cond::n("foes>=",1)],"shadowstep","")]),
            ("patient_ambush","Patient ambush","counter_ambush","missed ambush retains at most3vanish ticks",vec![(vec![Cond::n("adj>=",1)],"ambush","")]),
            ("ghostwalk","Ghostwalk","veiled_route","smoke→shadowstep → next backstab +2damage",vec![(vec![Cond::n("adj>=",1)],"smoke",""),(vec![Cond::n("foes>=",1)],"shadowstep","")]),
            ("silent_finish","Silent finish","afterimage","ambush below25% → next shadowstep returns50%energy",vec![(vec![Cond::n("adj>=",1),Cond::n("foe_hp<",25)],"ambush","lowest"),(vec![Cond::n("foes>=",1)],"shadowstep","")]),
        ],
        Class::Ranger=>vec![
            ("spotter","Spotter","boss_hunter","marked trap trigger → mark +10ticks;cap50",vec![(vec![Cond::t("foe_tag","boss")],"mark","tag:boss"),(vec![Cond::n("foes>=",1)],"trap","")]),
            ("quiver_thread","Quiver thread","finisher","shot kills below25% → double-shot cooldown −20ticks",vec![(vec![Cond::n("foe_hp<",25)],"shoot","lowest"),(vec![Cond::n("foes>=",1)],"double_shot","nearest")]),
            ("corridor_volley","Corridor volley","crossfire","volley2hits → next shot +1range for10ticks",vec![(vec![Cond::n("foes>=",2)],"volley",""),(vec![Cond::n("foes>=",1)],"shoot","nearest")]),
            ("split_mark","Split mark","marked_barrage","marked volley → one hit foe mark copy≤20ticks",vec![(vec![Cond::t("foe_tag","boss")],"mark","tag:boss"),(vec![Cond::n("foes>=",2)],"volley","")]),
            ("patient_snare","Patient snare","spotter","marked trap trigger → double-shot cooldown −20ticks",vec![(vec![Cond::t("foe_tag","boss")],"mark","tag:boss"),(vec![Cond::n("foes>=",1)],"trap","")]),
            ("moving_line","Moving line","split_mark","split-mark volley → next kite returns50%energy",vec![(vec![Cond::n("foes>=",2)],"volley",""),(vec![Cond::n("adj>=",1)],"kite","")]),
        ],
        Class::Caster=>vec![
            ("chilling_charge","Chilling charge","boss_channel","slowed boss bolt → ward cooldown −10ticks;once per slow",vec![(vec![Cond::t("foe_tag","boss")],"slow","tag:boss"),(vec![Cond::n("foes>=",1)],"bolt","nearest")]),
            ("storm_cell","Storm cell","storm","nova2hits → next bolt one extra line foe at50%",vec![(vec![Cond::n("foes>=",2)],"nova",""),(vec![Cond::n("foes>=",1)],"bolt","nearest")]),
            ("ice_lock","Ice lock","frost_guard","warded slow +10ticks once;cap50",vec![(vec![Cond::n("hp<",70)],"ward",""),(vec![Cond::n("foes>=",1)],"slow","nearest")]),
            ("shatter_ward","Shatter ward","nova_guard","warded nova consumes ward → nova cooldown −20ticks",vec![(vec![Cond::n("hp<",70)],"ward",""),(vec![Cond::n("foes>=",2)],"nova","")]),
            ("conduct","Conduct","chilling_charge","qualifying bolt → one visible adjacent slow copy≤10ticks",vec![(vec![Cond::t("foe_tag","boss")],"slow","tag:boss"),(vec![Cond::n("foes>=",1)],"bolt","nearest")]),
            ("last_wall","Last wall","ice_lock","ward absorbs4 → blink cooldown −20ticks once",vec![(vec![Cond::n("hp<",70)],"ward",""),(vec![Cond::n("hp<",45),Cond::n("foes>=",1)],"blink","")]),
        ],
        Class::Gunner=>vec![
            ("rangefinder","Rangefinder","boss_marksman","fully aimed boss hit recovers one spent chamber",vec![(vec![Cond::t("foe_tag","boss")],"aimed_shot","tag:boss")]),
            ("chamber_chain","Chamber chain","quick_loader","completed fast reload → next aim settles1tick sooner",vec![(vec![],"fast_reload",""),(vec![Cond::n("foes>=",1)],"aimed_shot","nearest")]),
            ("smoke_walk","Smoke walk","smoke_screen","smoke blind → completed reload returns50%energy",vec![(vec![],"reload",""),(vec![Cond::n("adj>=",1)],"smoke_retreat","")]),
            ("cycling_breach","Cycling breach","close_loader","adjacent close-burst kill → fast-reload cooldown −10ticks",vec![(vec![Cond::n("adj>=",1)],"close_burst","nearest"),(vec![],"fast_reload","")]),
            ("long_watch","Long watch","chamber_chain","charged aim kill → next aim settles1tick sooner",vec![(vec![],"fast_reload",""),(vec![Cond::n("foes>=",1)],"aimed_shot","nearest")]),
            ("breach_route","Breach route","cycling_breach","close-burst kill → next smoke retreat returns50%energy",vec![(vec![Cond::n("adj>=",1)],"close_burst","nearest"),(vec![Cond::n("foes>=",1)],"smoke_retreat","")]),
        ],
        Class::Clown|Class::Engineer=>vec![],
    };
    specs.into_iter().enumerate().map(|(i,(slug,name,parent,effect,patterns))| {
        let id=format!("{}_{}",class.name(),slug);
        let tactics=patterns.into_iter().map(|(conds,verb,target)|row(&id,conds,verb,target)).collect();
        Node {id,name:name.into(),parent:Some(format!("{}_{}",class.name(),parent)),
            required_level:if i>=4 {10}else{9},required_depth:if i>=4 {29}else{23},
            owned:false,available:false,blocked:None,tactics,effect:effect.into()}
    }).collect()
}
/// Authored catalogue only: no XP, unlock, pick or owned-state grants.
pub fn catalogue(class:Class)->Vec<Node> {definitions(class)}
fn budget(l: &LineageState) -> u32 {
    l.class_level().saturating_sub(2).min(6) + earned_stages(l) as u32
}
fn spent(l: &LineageState) -> u32 {
    l.class_paths
        .get(l.class.name())
        .map_or(0, |s| s.len() as u32)
}
fn qualified(l:&LineageState,node:&Node,defs:&[Node],ancestors:&mut std::collections::BTreeSet<String>)->bool {
    if !ancestors.insert(node.id.clone()) {return false;}
    let owned=l.class_paths.get(l.class.name());
    let advanced=defs.iter().position(|n|n.id==node.id).is_some_and(|i|i>=6);
    let stage=if defs.iter().position(|n|n.id==node.id).is_some_and(|i|i>=10) {3}else{1};
    owned.is_some_and(|s|s.contains(&node.id)) && l.class_level()>=node.required_level
        && crate::legacy::deepest(l)>=node.required_depth && (!advanced||earned_stages(l)>=stage)
        && node.parent.as_ref().is_none_or(|p|defs.iter().find(|n|&n.id==p)
            .is_some_and(|parent|qualified(l,parent,defs,ancestors)))
}
fn parent_qualified(l:&LineageState,node:&Node)->bool {
    let defs=definitions(l.class);
    node.parent.as_ref().is_none_or(|p|defs.iter().find(|n|&n.id==p)
        .is_some_and(|parent|qualified(l,parent,&defs,&mut std::collections::BTreeSet::new())))
}
fn node_block(l: &LineageState, away: bool, node: &Node) -> Option<String> {
    home_block(l, away).or_else(|| {
        if l.class_level() < node.required_level {
            Some(format!("reach class level {}", node.required_level))
        } else if crate::legacy::deepest(l) < node.required_depth {
            Some(format!("reach D{}", node.required_depth))
        } else if !parent_qualified(l,node) {
            Some("learn parent skill".into())
        } else if expanded(l.class) && definitions(l.class).iter().position(|n|n.id==node.id)
            .is_some_and(|i|i>=6 && earned_stages(l)<if i>=10 {3}else{1}) {
            Some("earn advanced stage".into())
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
        budget: budget(l),
        next_pick: next_pick(l),
        earned_stage:l.class_stages_announced.get(l.class.name()).copied().filter(|n|expanded(l.class)&&*n>0&&usize::from(*n)<=STAGES.len()).map(|n|EarnedStage {stage:STAGES[usize::from(n)-1].0.into(),picks:6+u32::from(n)}),
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
    if !l.class_paths.contains_key(l.class.name()) {return vec![];}
    let defs = definitions(l.class);
    let mut eligible=defs.iter().enumerate().filter(|(_,n)|
        qualified(l,n,&defs,&mut std::collections::BTreeSet::new())
    ).collect::<Vec<_>>();
    let depth=|node:&Node| {let mut depth=0;let mut parent=node.parent.as_ref();let mut seen=std::collections::BTreeSet::new();
        while let Some(id)=parent {if !seen.insert(id) {break;} let Some(p)=defs.iter().find(|n|&n.id==id)else{break;};depth+=1;parent=p.parent.as_ref();}depth};
    // Stable authored sibling order and unchanged old child-before-root policy.
    if eligible.iter().any(|(i,_)|*i>=6) {
        eligible.sort_by_key(|(i,n)|(std::cmp::Reverse(depth(n)),*i));
    } else {
        // Clown/Engineer already had three tiers. Their no-advanced compiled policy stays exact too.
        eligible.sort_by_key(|(i,n)|(if n.parent.is_some(){0}else{1},*i));
    }
    eligible.into_iter().flat_map(|(_,n)|n.tactics.clone()).collect()
}
/// Class-local authored node bits, old0–5 retained and advanced6–11 appended, derived only at send. Old/no-choice
/// lineages return zero; invalid or unqualified stored IDs never grant effects.
pub fn mask(l: &LineageState) -> u32 {
    if !l.class_paths.contains_key(l.class.name()) {return 0;}
    let defs=definitions(l.class);
    defs.iter().enumerate().filter(|(_,n)|
        qualified(l,n,&defs,&mut std::collections::BTreeSet::new())
    ).fold(0,|bits,(i,_)|bits|(1<<i))
}

pub fn label(id: &str) -> Option<String> {
    let id = id.strip_prefix("path:")?;
    static LABELS: std::sync::OnceLock<std::collections::BTreeMap<String, String>> = std::sync::OnceLock::new();
    LABELS.get_or_init(|| Class::EVERY.into_iter().flat_map(definitions)
        .map(|node| (node.id,node.name)).collect()).get(id).cloned()
}
#[cfg(test)]
#[path = "class_tree_tests.rs"]
mod tests;

/// Pure personal progress; announcements are committed only by actual mutations.
pub(crate) fn earned_stage(l:&LineageState)->u8 {earned_stages(l) as u8}
pub(crate) fn announce_stage(game:&mut Game,before:u8,t:u32) {
    if game.sim{return;}
    let now=earned_stage(&game.lineage);
    if now<=before{return;}
    let class=game.lineage.class.name();
    if game.lineage.class_stages_announced.get(class).copied().unwrap_or(0)>=now{return;}
    game.lineage.class_stages_announced.insert(class.into(),now);
    let stage=STAGES[usize::from(now)-1].0.to_string();
    game.events.push(crate::wire::Ev::ClassStage {t,class:class.into(),stage,picks:budget(&game.lineage)});
}
