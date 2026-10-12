//! Explicit learned-ability fixtures; no player save or playtest credit.
use crate::{ai, hero::{Class, Hero}, rules::Verb, tests::{arena, add_monster}, turn, Game};

fn fixture(class: Class, mask: u32, boss: bool) -> Game {
    let mut g = arena();
    let run = g.run.as_mut().unwrap();
    run.hero.class = class; run.hero.level = 9; run.hero.class_skills = mask;
    run.hero.base_atk = (8, 8); run.hero.hp = 10; run.hero.max_hp = 40;
    add_monster(&mut g, if boss {"goblin_warlord"} else {"goblin"}, 5, 5);
    let m = &mut g.run.as_mut().unwrap().monsters[0];
    m.hp = 100; m.max_hp = 100; m.buff_def = (-100, 0);
    m.broken = true; // Exposed Warlord: measure the boss hit rather than shield interposition.
    g
}
fn act(g: &mut Game, verb: &str) {
    let (run, mut cx) = g.ctx(); let v = turn::view(run);
    assert!(ai::try_verb(run, &mut cx, &Verb::new(verb), &v), "{verb}");
}
fn weapon(g: &mut Game, kind: &str) {
    let mut w = crate::item::Item::new(50_000, kind);
    if let Some(p) = crate::firearm::Profile::of(kind) { w.firearm = Some(crate::firearm::Chambers::loaded(p)); }
    g.run.as_mut().unwrap().hero.weapon = Some(w).into();
}

#[test]
fn learned_damage_nodes_have_exact_conditions_and_stack() {
    use Class::*;
    let cases = [(Fighter, 3, "cleave", false, 100, false, 1),
        (Fighter, 5, "shield_bash", true, 100, false, 1),
        (Rogue, 0, "backstab", false, 100, false, 1),
        (Rogue, 1, "ambush", false, 100, false, 2),
        (Rogue, 2, "backstab", true, 100, false, 1),
        (Ranger, 0, "shoot", false, 49, false, 1),
        (Ranger, 2, "shoot", false, 24, false, 1),
        (Ranger, 4, "shoot", false, 100, false, 1),
        (Ranger, 5, "shoot", false, 100, true, 1),
        (Caster, 0, "bolt", false, 100, false, 1),
        (Caster, 2, "nova", false, 100, false, 1),
        (Caster, 5, "nova", false, 100, false, 1),
        (Gunner, 0, "aimed_shot", false, 100, false, 1),
        (Gunner, 1, "aimed_shot", true, 100, false, 1),
        (Gunner, 3, "close_burst", false, 100, false, 1)];
    for (class, bit, verb, boss, hp, marked, bonus) in cases {
        let mut h = Hero::new(class, crate::geom::Pos::new(0, 0)); h.ward_t = 1;
        assert_eq!(h.skill_damage(verb, boss, hp, 100, marked), 0);
        h.class_skills = 1 << bit;
        assert_eq!(h.skill_damage(verb, boss, hp, 100, marked), bonus, "{class:?} bit{bit}");
        assert_eq!(h.skill_damage("attack", boss, hp, 100, marked), 0);
        h.class = if class == Fighter { Rogue } else { Fighter };
        assert_eq!(h.skill_damage(verb, boss, hp, 100, marked), 0, "wrong class");
    }
    let mut h = Hero::new(Ranger, crate::geom::Pos::new(0, 0)); h.class_skills = 63;
    assert_eq!(h.skill_damage("shoot", false, 25, 100, true), 3);
    assert_eq!(h.skill_damage("shoot", false, 24, 100, true), 4);
    assert_eq!(h.skill_damage("shoot", false, 50, 100, false), 1);
    h.class = Caster; h.ward_t = 0;
    assert_eq!(h.skill_damage("nova", false, 100, 100, false), 1);
    h.ward_t = 1; assert_eq!(h.skill_damage("nova", false, 100, 100, false), 2);
}

#[test]
fn cooldown_duration_and_healing_nodes_change_real_actions() {
    for (class, bit, verb) in [(Class::Fighter, 0, "shield_bash"), (Class::Fighter, 1, "second_wind"),
        (Class::Fighter, 4, "cleave"), (Class::Rogue, 3, "vanish"), (Class::Rogue, 4, "smoke"),
        (Class::Rogue, 5, "vanish"), (Class::Ranger, 1, "mark"), (Class::Ranger, 3, "volley"),
        (Class::Caster, 1, "slow"), (Class::Caster, 3, "ward"), (Class::Caster, 4, "slow") ] {
        let mut base = fixture(class, 0, true); if class == Class::Ranger {weapon(&mut base, "bow");}
        let mut learned = base.clone(); learned.run.as_mut().unwrap().hero.class_skills = 1 << bit;
        act(&mut base, verb); act(&mut learned, verb);
        let a = base.run.unwrap(); let b = learned.run.unwrap();
        match (class, bit) {
            (Class::Fighter, 0) => assert_eq!(b.monsters[0].stun, a.monsters[0].stun + 1),
            (Class::Fighter, 1) => assert_eq!(b.hero.hp, a.hero.hp + 3),
            (Class::Fighter, 4) => assert_eq!(b.hero.cleave_cd, a.hero.cleave_cd - 10),
            (Class::Rogue, 3) => assert_eq!(b.hero.vanish_t, a.hero.vanish_t + 5),
            (Class::Rogue, 4) => assert_eq!(b.monsters[0].blind, a.monsters[0].blind + 5),
            (Class::Rogue, 5) => assert_eq!(b.hero.vanish_cd, a.hero.vanish_cd - 10),
            (Class::Ranger, 1) => assert_eq!(b.monsters[0].marked, a.monsters[0].marked + 10),
            (Class::Ranger, 3) => assert_eq!(b.hero.volley_cd, a.hero.volley_cd - 10),
            (Class::Caster, 1) => assert_eq!(b.monsters[0].slow_t, a.monsters[0].slow_t + 10),
            (Class::Caster, 3) => assert_eq!(b.hero.ward_t, a.hero.ward_t + 5),
            (Class::Caster, 4) => assert_eq!(b.monsters[0].slow_t, a.monsters[0].slow_t + 5),
            _ => unreachable!(),
        }
    }
}

#[test]
fn gunner_smoke_and_fast_reload_use_learned_deadlines() {
    let mut base = fixture(Class::Gunner, 0, false); weapon(&mut base, "long_gun");
    let mut learned = base.clone(); learned.run.as_mut().unwrap().hero.class_skills = 1 << 4;
    act(&mut base, "smoke_retreat"); act(&mut learned, "smoke_retreat");
    assert_eq!(learned.run.as_ref().unwrap().monsters[0].blind, base.run.as_ref().unwrap().monsters[0].blind + 5);
    for kind in ["long_gun", "short_gun"] {
        let mut g = fixture(Class::Gunner, 0, false); weapon(&mut g, kind);
        g.run.as_mut().unwrap().hero.weapon.as_mut().unwrap().firearm.as_mut().unwrap().loaded = 0;
        let mut learned = g.clone(); learned.run.as_mut().unwrap().hero.class_skills = (1 << 2) | (1 << 5);
        act(&mut g, "fast_reload"); act(&mut learned, "fast_reload");
        let a = g.run.unwrap(); let b = learned.run.unwrap();
        assert_eq!(b.gun_reload.unwrap().at, a.gun_reload.unwrap().at - 1);
        assert_eq!(b.gun_skills.unwrap().fast_ready, a.gun_skills.unwrap().fast_ready - 10);
    }
}

#[test]
fn bossguard_does_not_reduce_ranged_or_hazards_and_masks_persist() {
    let mut g = fixture(Class::Fighter, 1 << 2, true);
    let h = &g.run.as_ref().unwrap().hero;
    assert_eq!(h.boss_melee_damage(4, true, false), 3);
    assert_eq!(h.boss_melee_damage(4, true, true), 4);
    assert_eq!(h.boss_melee_damage(4, false, false), 4);
    assert_eq!(h.boss_melee_damage(0, true, false), 0);
    let before = h.hp; let (run, mut cx) = g.ctx(); turn::damage_hero(run, &mut cx, 4, &turn::Src::Gas);
    assert_eq!(run.hero.hp, before - 4, "hazard bypasses melee modifier");
    let restored = Game::load(&g.save()).unwrap();
    assert_eq!(restored.run.unwrap().hero.class_skills, 1 << 2);
    let h = Hero::new(Class::Fighter, crate::geom::Pos::new(0, 0));
    let mut json = serde_json::to_value(&h).unwrap(); assert!(json.get("class_skills").is_none());
    json.as_object_mut().unwrap().remove("class_skills");
    assert_eq!(serde_json::from_value::<Hero>(json).unwrap().class_skills, 0);
}

#[test]
fn learned_damage_changes_real_hits_without_extra_random_draws() {
    use Class::*;
    for (class, mask, verb, boss, hp, marked, ward, expected) in [
        (Fighter, 1 << 3, "cleave", false, 100, false, false, 1),
        (Fighter, 1 << 5, "shield_bash", true, 100, false, false, 1),
        (Rogue, 1 << 0, "backstab", false, 100, false, false, 1),
        (Rogue, 1 << 1, "ambush", false, 100, false, false, 2),
        (Rogue, (1 << 0) | (1 << 2), "backstab", true, 100, false, false, 2),
        (Ranger, (1 << 0) | (1 << 2), "shoot", false, 24, false, false, 2),
        (Ranger, 1 << 4, "shoot", false, 100, false, false, 1),
        (Ranger, 1 << 5, "shoot", false, 100, true, false, 1),
        (Caster, 1 << 0, "bolt", false, 100, false, false, 1),
        (Caster, 1 << 2, "nova", false, 100, false, false, 1),
        (Caster, 1 << 5, "nova", false, 100, false, true, 1),
        (Gunner, 1 << 0, "aimed_shot", false, 100, false, false, 1),
        (Gunner, 1 << 1, "aimed_shot", true, 100, false, false, 1),
        (Gunner, 1 << 3, "close_burst", false, 100, false, false, 1),
    ] {
        let mut base = fixture(class, 0, boss);
        {
            let r = base.run.as_mut().unwrap();
            r.monsters[0].hp = hp; r.monsters[0].marked = if marked {30} else {0};
            r.monsters[0].stun = 10; r.hero.ward_t = i32::from(ward);
            if verb == "ambush" { r.hero.vanish_t = 30; }
        }
        if class == Ranger { weapon(&mut base, "bow"); }
        if class == Gunner { weapon(&mut base, if verb == "close_burst" {"short_gun"} else {"long_gun"}); }
        let mut learned = base.clone(); learned.run.as_mut().unwrap().hero.class_skills = mask;
        // Prepared shots take the ordinary public two-action route.
        if verb == "aimed_shot" { act(&mut base, verb); act(&mut learned, verb); act(&mut base, "fire"); act(&mut learned, "fire"); }
        else { act(&mut base, verb); act(&mut learned, verb); }
        let a = base.run.as_ref().unwrap(); let b = learned.run.as_ref().unwrap();
        let a_dmg = hp - a.monsters[0].hp; let b_dmg = hp - b.monsters[0].hp;
        assert!(a_dmg > 0, "fixture landed {class:?} {mask} {verb} boss{boss}: {:?}", base.events);
        // Mark multiplies the real roll plus improvement; compare the emitted raw attack below instead.
        if marked {
            let raw = |g: &Game| g.events.iter().find_map(|e| match e {crate::wire::Ev::Attack {src, dmg, ..} if *src == crate::engine::HERO_ID => Some(*dmg), _ => None}).unwrap();
            assert_eq!(raw(&learned) - raw(&base), expected);
        } else { assert_eq!(b_dmg - a_dmg, expected, "{verb}"); }
        // No learned node consumes additional randomness.
        let mut ar = a.rng.clone(); let mut br = b.rng.clone();
        assert_eq!(ar.next_u64(), br.next_u64(), "RNG {verb}");
    }
}
