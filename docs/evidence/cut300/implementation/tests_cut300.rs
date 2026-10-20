//! Controlled fixtures for the proposed generated Lich scope; not earned progression.
use crate::{
    engine::{Game, HERO_ID},
    packages::{self, Drill},
    rules::{Cond, Row, Verb},
    tests::{add_monster, arena, give, rules, ticks},
    wire::Ev,
};

fn summon(g: &mut Game, kind: &str, x: i32, y: i32) -> u32 {
    let id = add_monster(g, kind, x, y);
    let r = g.run.as_mut().unwrap();
    let m = r.monsters.iter_mut().find(|m| m.id == id).unwrap();
    m.summoned = true;
    if !m.has_tag("summoned") {
        m.extra_tags.push("summoned".into());
    }
    m.stun = 1000;
    m.hp = 100;
    m.max_hp = 100;
    let tags = m.tags();
    for tag in tags {
        g.lineage.facts.insert(format!("foe:{kind}:{tag}"));
    }
    id
}
fn policy(g: &mut Game) {
    let mut rows = vec![
        packages::drill_rows("lich", 45).remove(0),
        Row::new(vec![Cond::n("hp<", 45)], Verb::arg("drink", "heal")),
        Row::new(vec![], Verb::new("hold")),
    ];
    for row in &rows {
        assert!(row.conds.len() <= 2);
    }
    rules(g, std::mem::take(&mut rows));
    let r = g.run.as_mut().unwrap();
    r.hero.max_hp = 100;
    r.hero.max_hp_base = 100;
    r.hero.hp = 100;
    r.hero.pos = crate::geom::Pos::new(5, 5);
    r.hero_dist_pos = None;
    r.floor.map.update_vision(r.hero.pos, crate::tiles::VISION);
}
#[test]
fn lich_scope_ignores_blade_only_room() {
    let mut g = arena();
    let id = summon(&mut g, "spectral_blade", 6, 5);
    policy(&mut g);
    let ev = ticks(&mut g, 10);
    assert!(
        !ev.iter().any(|e| matches!(e, Ev::Rule { row: 0, .. })),
        "a blade alone must not activate the Lich template"
    );
    assert!(!ev
        .iter()
        .any(|e| matches!(e,Ev::Attack{src,dst,..}if *src==HERO_ID&&*dst==id)));
}
#[test]
fn lich_scope_still_attacks_summoned_skeleton() {
    let mut g = arena();
    let id = summon(&mut g, "skeleton", 6, 5);
    policy(&mut g);
    let ev = ticks(&mut g, 10);
    assert!(ev.iter().any(|e| matches!(e, Ev::Rule { row: 0, .. })));
    assert!(ev
        .iter()
        .any(|e| matches!(e,Ev::Attack{src,dst,..}if *src==HERO_ID&&*dst==id)));
}
#[test]
fn lich_scope_keeps_low_health_heal_priority() {
    let mut g = arena();
    summon(&mut g, "skeleton", 6, 5);
    policy(&mut g);
    give(&mut g, "heal");
    g.run.as_mut().unwrap().hero.inv.last_mut().unwrap().known = true;
    g.run.as_mut().unwrap().hero.hp = 40;
    let ev = ticks(&mut g, 10);
    assert!(!ev.iter().any(|e| matches!(e, Ev::Rule { row: 0, .. })));
    assert!(ev
        .iter()
        .any(|e| matches!(e,Ev::Rule{verb,..}if *verb==Verb::arg("drink","heal"))));
}
fn legacy() -> Row {
    Row::new(
        vec![Cond::t("foe_tag", "summoned"), Cond::n("hp>", 5)],
        Verb::arg("attack", "tag:summoned"),
    )
}
#[test]
fn lich_scope_compiles_legacy_drill_without_rewriting_stored_or_player_rows() {
    let mut g = Game::new_resident(300);
    let old = legacy();
    g.lineage.pkg.pen_open = true;
    g.lineage.pkg.pen = vec![old.clone().from("player")];
    g.lineage.pkg.drills = vec![Drill {
        boss: "lich".into(),
        rows: vec![old.clone()],
        ..Default::default()
    }];
    let stored = g.lineage.pkg.drills.clone();
    let pen = g.lineage.pkg.pen.clone();
    let before = g.save();
    let compiled = packages::compile(&g.lineage);
    assert_eq!(g.save(), before, "compilation is read-only");
    let generated = compiled
        .rows
        .iter()
        .find(|r| r.origin.as_deref() == Some("drill:lich"))
        .unwrap();
    assert!(generated.conds.contains(&Cond::t("foe_tag", "undead")));
    assert!(!generated.conds.contains(&Cond::t("foe_tag", "summoned")));
    let heal = packages::heal_pct(
        &g.lineage.pkg.stance,
        g.lineage.pkg.level(&g.lineage.pkg.stance),
    );
    assert!(generated.conds.contains(&Cond::n("hp>", heal)));
    assert!(compiled
        .rows
        .iter()
        .any(|r| r == &pen[0] && r.origin == pen[0].origin));
    packages::recompile(&mut g.lineage);
    assert_eq!(g.lineage.pkg.drills, stored);
    assert_eq!(g.lineage.pkg.pen, pen);
}
#[test]
fn lich_scope_does_not_retarget_another_drill_or_custom_condition() {
    for (boss, body) in [
        ("mirror_king", legacy()),
        (
            "lich",
            Row::new(
                vec![Cond::t("foe_tag", "ranged"), Cond::n("hp>", 5)],
                Verb::arg("attack", "tag:summoned"),
            ),
        ),
    ] {
        let mut g = Game::new_resident(300);
        g.lineage.pkg.drills = vec![Drill {
            boss: boss.into(),
            rows: vec![body.clone()],
            ..Default::default()
        }];
        let compiled = packages::compile(&g.lineage);
        let row = compiled
            .rows
            .iter()
            .find(|r| r.origin.as_deref() == Some(&format!("drill:{boss}")))
            .unwrap();
        assert_eq!(row.conds[0], body.conds[0]);
    }
}
#[test]
fn lich_scope_is_an_undead_presence_gate_not_a_skeleton_only_selector() {
    let mut g = arena();
    summon(&mut g, "spectral_blade", 6, 5);
    let id = add_monster(&mut g, "skeleton", 8, 5);
    let r = g.run.as_mut().unwrap();
    r.monsters.iter_mut().find(|m| m.id == id).unwrap().stun = 1000;
    policy(&mut g);
    let ev = ticks(&mut g, 10);
    assert!(
        ev.iter().any(|e| matches!(e, Ev::Rule { row: 0, .. })),
        "another visible undead permits other summoned targets; keep the limitation explicit"
    );
}
