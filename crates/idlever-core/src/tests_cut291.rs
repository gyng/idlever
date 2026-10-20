//! Controlled throw refusal tests; fixtures are not earned progression claims.
use crate::engine::Game;
use crate::geom::Pos;
use crate::hero::Class;
use crate::rules::{Row, Verb};
use crate::tests::{add_monster, arena, give, rules, ticks};
use crate::wire::Ev;

fn setup(class: Class, unlocked: bool, item: bool, target: Option<Pos>) -> Game {
    let mut g = arena();
    g.lineage.class = class;
    g.lineage.unlocks.remove("throw");
    if unlocked {
        g.lineage.unlocks.insert("throw".into());
    }
    let run = g.run.as_mut().unwrap();
    run.hero.class = class;
    run.hero.level = 9;
    if item {
        give(&mut g, "fire");
        g.run.as_mut().unwrap().hero.inv.last_mut().unwrap().known = true;
    }
    if let Some(pos) = target {
        add_monster(&mut g, "bloat", pos.x, pos.y);
    }
    rules(
        &mut g,
        vec![
            Row::new(vec![], Verb::arg("throw", "fire,nearest")),
            Row::new(vec![], Verb::new("hold")),
        ],
    );
    g
}
fn reason(g: &Game) -> String {
    g.run
        .as_ref()
        .unwrap()
        .trace
        .last()
        .unwrap()
        .rows
        .as_ref()
        .unwrap()
        .iter()
        .find(|r| r.row == 0)
        .unwrap()
        .why
        .clone()
}
fn fire_used(events: &[Ev]) -> bool {
    events
        .iter()
        .any(|e| matches!(e, Ev::Use { item, .. } if item.contains("fire")))
}
#[test]
fn throw_missing_permission_names_learning_instead_of_geometry() {
    let mut g = setup(Class::Fighter, false, true, Some(Pos::new(7, 5)));
    let events = ticks(&mut g, 10);
    assert!(!fire_used(&events));
    assert_eq!(reason(&g), "not learned");
    assert!(g
        .run
        .as_ref()
        .unwrap()
        .hero
        .inv
        .iter()
        .any(|i| i.kind == "fire"));
}
#[test]
fn throw_permission_refusal_precedes_item_and_target_checks() {
    for (item, target) in [(false, Some(Pos::new(7, 5))), (true, None), (false, None)] {
        let mut g = setup(Class::Fighter, false, item, target);
        assert!(!fire_used(&ticks(&mut g, 10)));
        assert_eq!(reason(&g), "not learned");
    }
}
#[test]
fn throw_rogue_and_general_unlock_still_execute_the_same_verb() {
    for (class, unlocked) in [(Class::Rogue, false), (Class::Fighter, true)] {
        let mut g = setup(class, unlocked, true, Some(Pos::new(7, 5)));
        assert!(fire_used(&ticks(&mut g, 10)), "{class:?}");
        assert!(!g
            .run
            .as_ref()
            .unwrap()
            .hero
            .inv
            .iter()
            .any(|i| i.kind == "fire"));
    }
}
#[test]
fn throw_authorized_other_refusals_keep_their_existing_reasons() {
    for (item, target, expected) in [
        (false, Some(Pos::new(7, 5)), "no item"),
        (true, None, "no target"),
        (true, Some(Pos::new(11, 5)), "no line"),
    ] {
        let mut g = setup(Class::Fighter, true, item, target);
        assert!(!fire_used(&ticks(&mut g, 10)));
        assert_eq!(reason(&g), expected);
    }
}
#[test]
fn throw_learning_reason_is_registered_and_has_a_precise_gloss() {
    assert!(crate::turn::ROW_REASONS.contains(&"not learned"));
    assert_eq!(
        Game::new_literal(1)
            .vocabulary_wire()
            .why_gloss
            .get("not learned")
            .map(String::as_str),
        Some("learn ability first")
    );
    assert!(crate::rules::word_count("learn Throw first") <= 3);
    assert_eq!(
        crate::turn::why_gloss("throw", "not learned"),
        Some("learn Throw first")
    );
}
