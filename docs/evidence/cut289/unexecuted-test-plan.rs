//! Gas-step prepared throw behavior; arenas are controlled diagnostics, not earned saves.
use crate::engine::{Game, HERO_ID};
use crate::geom::Pos;
use crate::item::Item;
use crate::rules::{Row, Verb};
use crate::tests::{add_monster, arena, give, rules, ticks};
use crate::tiles::Tile;
use crate::wire::Ev;

fn gas_arena() -> (Game, u32, u32) {
    let mut g = arena();
    g.lineage.unlocks.insert("gas_step".into());
    g.lineage.facts.insert("foe:bloat:gas".into());
    rules(
        &mut g,
        vec![Row::new(vec![], Verb::arg("tactic", "gas_step"))],
    );
    let target = add_monster(&mut g, "bloat", 7, 5);
    let fire = give(&mut g, "fire");
    g.run.as_mut().unwrap().hero.inv.last_mut().unwrap().known = true;
    (g, target, fire)
}
fn used_fire(events: &[Ev]) -> usize {
    events
        .iter()
        .filter(|e| matches!(e, Ev::Use { item, .. } if item.contains("fire")))
        .count()
}
#[test]
fn gas_step_throws_one_known_fire_without_discarding_heals() {
    let (mut g, target, fire) = gas_arena();
    let heal1 = give(&mut g, "heal");
    let heal2 = give(&mut g, "heal");
    let events = ticks(&mut g, 10);
    assert_eq!(used_fire(&events), 1, "{events:?}");
    let r = g.run.as_ref().unwrap();
    assert!(!r.hero.inv.iter().any(|i| i.id == fire));
    assert!(r.hero.inv.iter().any(|i| i.id == heal1));
    assert!(r.hero.inv.iter().any(|i| i.id == heal2));
    assert!(events
        .iter()
        .any(|e| matches!(e, Ev::Projectile { src, dst, .. } if *src==HERO_ID && *dst==target)));
    assert!(!r
        .overlays
        .iter()
        .any(|o| o.x == r.hero.pos.x && o.y == r.hero.pos.y));
}
#[test]
fn gas_step_preserves_fire_when_no_safe_known_visible_dry_target_exists() {
    for case in [
        "adjacent",
        "unknown",
        "water",
        "reflect",
        "blocked",
        "out_of_range",
    ] {
        let (mut g, _, fire) = gas_arena();
        let r = g.run.as_mut().unwrap();
        match case {
            "adjacent" => r.monsters[0].pos = Pos::new(5, 5),
            "unknown" => r.hero.inv[0].known = false,
            "water" => r.floor.map.set(Pos::new(7, 5), Tile::Water),
            "reflect" => r.monsters[0].extra_tags.push("reflect".into()),
            "blocked" => r.floor.map.set(Pos::new(6, 5), Tile::Wall),
            "out_of_range" => r.monsters[0].pos = Pos::new(11, 5),
            _ => unreachable!(),
        }
        r.floor.map.update_vision(r.hero.pos, crate::tiles::VISION);
        let events = ticks(&mut g, 10);
        assert_eq!(used_fire(&events), 0, "{case}: {events:?}");
        assert!(
            g.run
                .as_ref()
                .unwrap()
                .hero
                .inv
                .iter()
                .any(|i| i.id == fire),
            "{case}"
        );
    }
}
#[test]
fn gas_step_keeps_equipped_bow_behavior_and_makes_progress_without_a_throwable() {
    let (mut g, target, fire) = gas_arena();
    let r = g.run.as_mut().unwrap();
    r.hero.weapon = Some(Item::new(r.new_item_id(), "bow"));
    let events = ticks(&mut g, 10);
    assert_eq!(used_fire(&events), 0);
    assert!(g
        .run
        .as_ref()
        .unwrap()
        .hero
        .inv
        .iter()
        .any(|i| i.id == fire));
    assert!(events.iter().any(|e| matches!(e,Ev::Attack{src,dst,verb,..} if *src==HERO_ID && *dst==target && verb=="shoot")));
    let (mut g, target, _) = gas_arena();
    g.run.as_mut().unwrap().hero.inv.clear();
    let events = ticks(&mut g, 100);
    assert!(events
        .iter()
        .any(|e| matches!(e,Ev::Attack{src,dst,..} if *src==HERO_ID && *dst==target)));
    assert!(g
        .run
        .as_ref()
        .unwrap()
        .monsters
        .iter()
        .all(|m| m.id != target || m.hp <= 0));
}
