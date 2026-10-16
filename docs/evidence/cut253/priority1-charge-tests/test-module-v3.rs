//! Actual combat actions on controlled arenas; never an earned campaign claim.
use super::*;
use crate::{
    class_advanced::{Combo, Effect, Phase},
    rng::Rng,
    rules::Row,
    Game,
};
fn arena(class: Class, bits: &[u32]) -> Game {
    let mut g = crate::tests::arena();
    g.sim = true;
    crate::tests::rules(&mut g, vec![Row::new(vec![], Verb::new("hold"))]);
    let r = g.run.as_mut().unwrap();
    r.hero.class = class;
    r.hero.level = 10;
    r.hero.class_skills = bits.iter().fold(0, |mask, bit| mask | (1 << bit));
    r.hero.advanced = None;
    r.hero.armour = None.into();
    r.hero.helm = None.into();
    r.hero.boots = None.into();
    r.hero.hp = 1000;
    r.hero.max_hp = 1000;
    r.hero.max_hp_base = 1000;
    r.hero.str_bonus = 0;
    r.hero.gift = Default::default();
    r.hero.legacy_effects = 0;
    r.hero.legacy_armour = 0;
    r.hero.weapon = Some(Item::new(
        crate::kit::WEAPON_ID,
        match class {
            Class::Ranger => "bow",
            Class::Gunner => "long_gun",
            _ => "sword",
        },
    ))
    .into();
    r.hero.weapon.as_mut().unwrap().enchant = 20; // Controlled100%-aim weapon, never paid/earned evidence.
    r.hero.inv.clear();
    r.floor.map.update_vision(r.hero.pos, 8);
    g.events.clear();
    g
}
fn foe(g: &mut Game, kind: &str, x: i32, y: i32) -> usize {
    crate::tests::add_monster(g, kind, x, y);
    let r = g.run.as_mut().unwrap();
    let i = r.monsters.len() - 1;
    r.monsters[i].hp = 1000;
    r.monsters[i].max_hp = 1000;
    r.monsters[i].stun = 1000;
    i
}
fn act(g: &mut Game, verb: &str) -> bool {
    let (r, mut cx) = g.ctx();
    let v = view(r);
    try_verb(r, &mut cx, &Verb::new(verb), &v)
}
fn scheduled(g: &mut Game, verb: &str) {
    crate::tests::rules(g, vec![Row::new(vec![], Verb::new(verb))]);
    let r = g.run.as_mut().unwrap();
    r.hero.energy = crate::engine::ACT_ENERGY
        - r.hero.speed()
        - crate::kit::pace_energy(r.hero.pace, r.turn + 1);
    let actions = r.actions;
    g.tick();
    assert_eq!(
        g.run.as_ref().unwrap().actions,
        actions + 1,
        "one real scheduler debit"
    );
    crate::tests::rules(g, vec![Row::new(vec![], Verb::new("hold"))]);
}
fn receipt(g: &Game, bit: u32, phase: Phase, effect: Effect) -> Vec<i32> {
    let r = g.run.as_ref().unwrap();
    let id = format!(
        "path:{}",
        crate::class_tree::catalogue(r.hero.class)[bit as usize].id
    );
    g.events
        .iter()
        .filter_map(|e| match e {
            Ev::ClassInteraction {
                src,
                skill,
                phase: p,
                effect: f,
                amount,
                ..
            } if *src == HERO_ID && skill.id == id && *p == phase && *f == effect => Some(*amount),
            _ => None,
        })
        .collect()
}
fn hit_verb(g: &mut Game, verb: &str) {
    for seed in 0..128 {
        let mut branch = g.clone();
        branch.run.as_mut().unwrap().rng = Rng::new(seed);
        let before = branch.events.len();
        if act(&mut branch, verb)
            && branch.events[before..]
                .iter()
                .any(|e| matches!(e,Ev::Attack {src,hit:true,..} if *src==HERO_ID))
        {
            *g = branch;
            return;
        }
    }
    panic!("controlled actual {verb} never landed");
}
fn enemy_hit(g: &mut Game, mi: usize, verb: &str) {
    for seed in 0..128 {
        let mut branch = g.clone();
        branch.run.as_mut().unwrap().rng = Rng::new(seed);
        let before = branch.events.len();
        {
            let (r, mut cx) = branch.ctx();
            monster_attack(r, &mut cx, mi, 1, verb);
        }
        if branch.events[before..]
            .iter()
            .any(|e| matches!(e,Ev::Attack {dst,hit:true,..} if *dst==HERO_ID))
        {
            *g = branch;
            return;
        }
    }
    panic!("controlled monster attack never landed");
}
#[test]
fn rally_is_an_actual_guard_then_one_successful_wind_not_a_miss_or_hazard() {
    let mut g = arena(Class::Fighter, &[6]);
    let mi = foe(&mut g, "bloat_mother", 5, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.hero.bulwark_t = 30;
        r.hero.bash_cd = 50;
    }
    enemy_hit(&mut g, mi, "attack");
    assert!(g
        .run
        .as_ref()
        .unwrap()
        .hero
        .advanced
        .as_ref()
        .unwrap()
        .last_block_t
        .is_some());
    g.run.as_mut().unwrap().hero.hp = 500;
    assert!(act(&mut g, "second_wind"));
    assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 30);
    assert_eq!(
        receipt(&g, 6, Phase::Applied, Effect::BashCooldown),
        vec![20]
    );
    let save = g.save();
    assert!(!act(&mut g, "second_wind"));
    assert_eq!(g.save(), save);
    for verb in ["shoot", "bolt"] {
        let mut excluded = arena(Class::Fighter, &[6]);
        let mi = foe(&mut excluded, "bloat_mother", 5, 5);
        excluded.run.as_mut().unwrap().hero.bulwark_t = 30;
        enemy_hit(&mut excluded, mi, verb);
        assert!(
            excluded.run.as_ref().unwrap().hero.advanced.is_none(),
            "ranged hit cannot become a block"
        );
    }
}
#[test]
fn boss_bash_arms_oathguard_and_siege_followup_kill_obeys_execution_clock() {
    let mut g = arena(Class::Fighter, &[7, 9, 11]);
    let mi = foe(&mut g, "bloat_mother", 5, 5);
    assert!(act(&mut g, "shield_bash"));
    assert_eq!(receipt(&g, 7, Phase::Armed, Effect::MeleeBlock), vec![1]);
    assert_eq!(receipt(&g, 9, Phase::Armed, Effect::Damage), vec![1]);
    enemy_hit(&mut g, mi, "attack");
    assert!(!receipt(&g, 7, Phase::Applied, Effect::MeleeBlock).is_empty());
    g.run.as_mut().unwrap().monsters[mi].hp = 1;
    assert!(act(&mut g, "attack"));
    assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 30);
    assert_eq!(
        receipt(&g, 11, Phase::Applied, Effect::BashCooldown),
        vec![20]
    );
    // A second actual boss-bash/kill after the charge window but before40ticks
    // cannot claim another Execution reduction.
    let next = foe(&mut g, "bloat_mother", 5, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.turn = 11;
        r.hero.bash_cd = 0;
    }
    assert!(act(&mut g, "shield_bash"));
    g.run.as_mut().unwrap().monsters[next].hp = 1;
    assert!(act(&mut g, "attack"));
    assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 50);
    assert_eq!(
        receipt(&g, 11, Phase::Applied, Effect::BashCooldown),
        vec![20]
    );
}
#[test]
fn opening_cut_requires_two_actual_cleave_hits_and_holdfast_has_two_charges() {
    let mut g = arena(Class::Fighter, &[8]);
    foe(&mut g, "goblin", 5, 5);
    foe(&mut g, "goblin", 4, 6);
    g.run.as_mut().unwrap().hero.bash_cd = 50;
    assert!(act(&mut g, "cleave"));
    assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 40);
    assert_eq!(
        receipt(&g, 8, Phase::Applied, Effect::BashCooldown),
        vec![10]
    );
    let mut hold = arena(Class::Fighter, &[10]);
    let mi = foe(&mut hold, "bloat_mother", 5, 5);
    hold.run.as_mut().unwrap().hero.hp = 500;
    assert!(act(&mut hold, "second_wind"));
    assert_eq!(
        receipt(&hold, 10, Phase::Armed, Effect::MeleeBlock),
        vec![2]
    );
    for _ in 0..3 {
        enemy_hit(&mut hold, mi, "attack");
    }
    assert_eq!(
        receipt(&hold, 10, Phase::Consumed, Effect::MeleeBlock),
        vec![1, 1]
    );
    assert_eq!(
        hold.run
            .as_ref()
            .unwrap()
            .hero
            .advanced
            .as_ref()
            .unwrap()
            .charges[&Combo::Holdfast]
            .remaining,
        0
    );
}
#[test]
fn afterimage_and_tell_thief_use_real_ambush_and_observed_windup() {
    let mut g = arena(Class::Rogue, &[6]);
    foe(&mut g, "goblin", 5, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.hero.vanish_t = 30;
        r.hero.vanish_cd = 100;
    }
    assert!(act(&mut g, "ambush"));
    assert!(act(&mut g, "shadowstep"));
    assert_eq!(g.run.as_ref().unwrap().hero.vanish_cd, 80);
    assert_eq!(
        receipt(&g, 6, Phase::Applied, Effect::VanishCooldown),
        vec![20]
    );
    let mut tell = arena(Class::Rogue, &[7]);
    let mi = foe(&mut tell, "bloat_mother", 5, 5);
    {
        let r = tell.run.as_mut().unwrap();
        r.hero.vanish_cd = 100;
        r.monsters[mi].pending = Some(Pending::HeavyHit);
    }
    assert!(act(&mut tell, "backstab"));
    assert_eq!(tell.run.as_ref().unwrap().hero.vanish_cd, 90);
    assert_eq!(
        tell.run.as_ref().unwrap().monsters[mi].pending,
        Some(Pending::HeavyHit),
        "committed boss attack remains"
    );
}
#[test]
fn veiled_route_refunds_actual_debit_and_ghostwalk_only_one_real_backstab() {
    let mut g = arena(Class::Rogue, &[8, 10]);
    foe(&mut g, "goblin", 5, 5);
    assert!(act(&mut g, "smoke"));
    scheduled(&mut g, "shadowstep");
    assert_eq!(receipt(&g, 8, Phase::Applied, Effect::Energy), vec![50]);
    assert_eq!(g.run.as_ref().unwrap().hero.energy, 50);
    assert!(act(&mut g, "backstab"));
    assert_eq!(receipt(&g, 10, Phase::Applied, Effect::Damage), vec![2]);
    assert!(act(&mut g, "backstab"));
    assert_eq!(receipt(&g, 10, Phase::Applied, Effect::Damage), vec![2]);
}
#[test]
fn patient_ambush_retains_only_preexisting_three_ticks_on_a_real_miss() {
    let mut g = arena(Class::Rogue, &[9]);
    foe(&mut g, "goblin", 5, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.hero.weapon = Some(Item::new(900, "sword")).into();
        r.hero.vanish_t = 30;
    }
    let mut found = None;
    for seed in 0..128 {
        let mut b = g.clone();
        b.run.as_mut().unwrap().rng = Rng::new(seed);
        assert!(act(&mut b, "ambush"));
        if b.events
            .iter()
            .any(|e| matches!(e,Ev::Attack {src,hit:false,..} if *src==HERO_ID))
        {
            found = Some(b);
            break;
        }
    }
    let miss = found.expect("actual missed ambush");
    assert_eq!(miss.run.as_ref().unwrap().hero.vanish_t, 3);
    assert_eq!(receipt(&miss, 9, Phase::Applied, Effect::Vanish), vec![3]);
}
#[test]
fn silent_finish_is_low_pre_hit_hp_and_concurrent_returns_never_repeat_same_tick() {
    let mut g = arena(Class::Rogue, &[8, 11]);
    let mi = foe(&mut g, "goblin", 5, 5);
    foe(&mut g, "goblin", 7, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.hero.vanish_t = 30;
        r.monsters[mi].hp = 1;
    }
    assert!(act(&mut g, "smoke"));
    assert!(act(&mut g, "ambush"));
    scheduled(&mut g, "shadowstep");
    let r = g.run.as_ref().unwrap();
    assert!(r.hero.energy < 100);
    let refund: i32 = receipt(&g, 8, Phase::Applied, Effect::Energy)
        .into_iter()
        .chain(receipt(&g, 11, Phase::Applied, Effect::Energy))
        .sum();
    assert_eq!(refund, 99);
    assert_eq!(r.actions, 1);
}
#[test]
fn marked_trap_is_consumed_once_and_both_snare_benefits_use_actual_trigger() {
    let mut g = arena(Class::Ranger, &[6, 10]);
    let mi = foe(&mut g, "goblin", 6, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[mi].marked = 30;
        r.hero.double_cd = 40;
    }
    assert!(act(&mut g, "trap"));
    {
        let (r, mut cx) = g.ctx();
        move_monster(r, &mut cx, mi, Pos::new(5, 5));
    }
    assert_eq!(g.run.as_ref().unwrap().monsters[mi].marked, 40);
    assert_eq!(receipt(&g, 6, Phase::Applied, Effect::Mark), vec![10]);
    assert_eq!(
        receipt(&g, 10, Phase::Applied, Effect::DoubleShotCooldown),
        vec![20]
    );
    {
        let (r, mut cx) = g.ctx();
        move_monster(r, &mut cx, mi, Pos::new(6, 5));
        move_monster(r, &mut cx, mi, Pos::new(5, 5));
    }
    assert_eq!(receipt(&g, 6, Phase::Applied, Effect::Mark), vec![10]);
    assert_eq!(
        receipt(&g, 10, Phase::Applied, Effect::DoubleShotCooldown),
        vec![20]
    );
}
#[test]
fn quiver_thread_uses_killed_targets_pre_shot_hp_not_post_hit_hp() {
    for (hp, expected) in [(1, 20), (250, 40)] {
        let mut g = arena(Class::Ranger, &[7]);
        let mi = foe(&mut g, "goblin", 6, 5);
        {
            let r = g.run.as_mut().unwrap();
            r.monsters[mi].hp = hp;
            r.hero.double_cd = 40;
            r.hero.str_bonus = 1000;
        }
        assert!(act(&mut g, "shoot"));
        assert!(g.run.as_ref().unwrap().monsters[mi].hp <= 0);
        assert_eq!(
            g.run.as_ref().unwrap().hero.double_cd,
            expected,
            "exact25% is excluded"
        );
    }
}
fn volley_arena(bits: &[u32]) -> Game {
    let mut g = arena(Class::Ranger, bits);
    let first = foe(&mut g, "goblin", 6, 5);
    foe(&mut g, "goblin", 7, 5);
    g.run.as_mut().unwrap().monsters[first].marked = 30;
    g
}
#[test]
fn corridor_volley_reaches_one_extra_tile_and_split_mark_copies_to_only_one_hit() {
    let mut g = volley_arena(&[8, 9]);
    assert!(act(&mut g, "volley"));
    assert_eq!(receipt(&g, 8, Phase::Armed, Effect::Range), vec![1]);
    assert_eq!(receipt(&g, 9, Phase::Applied, Effect::Mark), vec![20]);
    assert_eq!(g.run.as_ref().unwrap().monsters[1].marked, 20);
    let mi = foe(&mut g, "goblin", 11, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[0].hp = 0;
        r.monsters[1].hp = 0;
    }
    let before = g.run.as_ref().unwrap().monsters[mi].hp;
    assert!(act(&mut g, "shoot"));
    assert!(g.run.as_ref().unwrap().monsters[mi].hp < before);
    assert_eq!(receipt(&g, 8, Phase::Applied, Effect::Range), vec![1]);
    // The next shot must approach; the consumed bonus cannot persist.
    let hp = g.run.as_ref().unwrap().monsters[mi].hp;
    assert!(act(&mut g, "shoot"));
    assert_eq!(g.run.as_ref().unwrap().monsters[mi].hp, hp);
}
#[test]
fn moving_line_requires_an_actual_mark_copy_then_a_legal_kite() {
    let mut g = volley_arena(&[9, 11]);
    assert!(act(&mut g, "volley"));
    scheduled(&mut g, "kite");
    assert_eq!(receipt(&g, 11, Phase::Applied, Effect::Energy), vec![50]);
    let mut no_mark = volley_arena(&[9, 11]);
    no_mark.run.as_mut().unwrap().monsters[0].marked = 0;
    assert!(act(&mut no_mark, "volley"));
    scheduled(&mut no_mark, "kite");
    assert!(receipt(&no_mark, 11, Phase::Applied, Effect::Energy).is_empty());
}
#[test]
fn chilling_charge_and_conduct_share_original_slow_but_each_apply_once() {
    let mut g = arena(Class::Caster, &[6, 10]);
    let boss = foe(&mut g, "bloat_mother", 5, 5);
    let other = foe(&mut g, "goblin", 6, 5);
    g.run.as_mut().unwrap().hero.ward_cd = 50;
    assert!(act(&mut g, "slow"));
    hit_verb(&mut g, "bolt");
    assert_eq!(g.run.as_ref().unwrap().hero.ward_cd, 40);
    assert_eq!(g.run.as_ref().unwrap().monsters[other].slow_t, 10);
    assert_eq!(
        receipt(&g, 6, Phase::Applied, Effect::WardCooldown),
        vec![10]
    );
    assert_eq!(receipt(&g, 10, Phase::Applied, Effect::Slow), vec![10]);
    assert!(
        g.run.as_ref().unwrap().monsters[other]
            .advanced_slow
            .is_none(),
        "copied slow has no recursive cast identity"
    );
    hit_verb(&mut g, "bolt");
    assert_eq!(
        receipt(&g, 6, Phase::Applied, Effect::WardCooldown),
        vec![10]
    );
    assert_eq!(receipt(&g, 10, Phase::Applied, Effect::Slow), vec![10]);
    assert!(
        g.run.as_ref().unwrap().monsters[boss]
            .advanced_slow
            .as_ref()
            .unwrap()
            .conduct_used
    );
}
#[test]
fn ice_lock_extends_only_a_fresh_warded_slow_and_refused_repeats_are_exact() {
    let mut g = arena(Class::Caster, &[8]);
    let mi = foe(&mut g, "goblin", 6, 5);
    assert!(act(&mut g, "ward"));
    assert!(act(&mut g, "slow"));
    assert_eq!(g.run.as_ref().unwrap().monsters[mi].slow_t, 40);
    assert_eq!(receipt(&g, 8, Phase::Applied, Effect::Slow), vec![10]);
    let save = g.save();
    assert!(!act(&mut g, "slow"));
    assert_eq!(g.save(), save);
}
#[test]
fn storm_cell_hits_only_one_extra_on_line_foe_after_real_multi_target_nova() {
    let mut g = arena(Class::Caster, &[7]);
    foe(&mut g, "goblin", 5, 5);
    foe(&mut g, "goblin", 4, 6);
    let extra = foe(&mut g, "goblin", 6, 5);
    foe(&mut g, "goblin", 7, 5);
    assert!(act(&mut g, "nova"));
    assert_eq!(receipt(&g, 7, Phase::Armed, Effect::Damage), vec![1]);
    hit_verb(&mut g, "bolt");
    assert_eq!(receipt(&g, 7, Phase::Consumed, Effect::Damage), vec![1]);
    assert_eq!(receipt(&g, 7, Phase::Applied, Effect::Damage).len(), 1);
    assert!(g.run.as_ref().unwrap().monsters[extra].hp < 1000);
    assert_eq!(g.run.as_ref().unwrap().monsters[3].hp, 1000);
    hit_verb(&mut g, "bolt");
    assert_eq!(receipt(&g, 7, Phase::Applied, Effect::Damage).len(), 1);
}
#[test]
fn shatter_ward_consumes_exact_cast_and_last_wall_requires_four_actual_absorbed() {
    let mut g = arena(Class::Caster, &[9]);
    foe(&mut g, "goblin", 5, 5);
    assert!(act(&mut g, "ward"));
    assert!(act(&mut g, "nova"));
    assert_eq!(g.run.as_ref().unwrap().hero.ward_t, 0);
    assert_eq!(g.run.as_ref().unwrap().hero.nova_cd, 130);
    assert_eq!(receipt(&g, 9, Phase::Consumed, Effect::Ward), vec![30]);
    assert_eq!(
        receipt(&g, 9, Phase::Applied, Effect::NovaCooldown),
        vec![20]
    );
    let mut wall = arena(Class::Caster, &[11]);
    let mi = foe(&mut wall, "bloat_mother", 5, 5);
    wall.run.as_mut().unwrap().hero.blink_cd = 50;
    assert!(act(&mut wall, "ward"));
    enemy_hit(&mut wall, mi, "attack");
    assert!(receipt(&wall, 11, Phase::Applied, Effect::BlinkCooldown).is_empty());
    enemy_hit(&mut wall, mi, "attack");
    assert_eq!(
        receipt(&wall, 11, Phase::Applied, Effect::BlinkCooldown),
        vec![20]
    );
    enemy_hit(&mut wall, mi, "attack");
    assert_eq!(
        receipt(&wall, 11, Phase::Applied, Effect::BlinkCooldown),
        vec![20]
    );
}
fn empty_gun(g: &mut Game) {
    g.run
        .as_mut()
        .unwrap()
        .hero
        .weapon
        .as_mut()
        .unwrap()
        .firearm
        .as_mut()
        .unwrap()
        .loaded = 0;
}
fn finish_reload(g: &mut Game) {
    let at = g.run.as_ref().unwrap().gun_reload.unwrap().at;
    while g.run.as_ref().unwrap().turn < at {
        g.tick();
    }
}
#[test]
fn rangefinder_recovers_only_an_actually_spent_prepared_boss_round() {
    let mut g = arena(Class::Gunner, &[6]);
    foe(&mut g, "bloat_mother", 6, 5);
    assert!(act(&mut g, "aimed_shot"));
    assert!(act(&mut g, "fire"));
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .weapon
            .as_ref()
            .unwrap()
            .firearm
            .unwrap()
            .loaded,
        1
    );
    assert_eq!(receipt(&g, 6, Phase::Applied, Effect::Chamber), vec![1]);
    assert!(act(&mut g, "fire"));
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .weapon
            .as_ref()
            .unwrap()
            .firearm
            .unwrap()
            .loaded,
        0
    );
    assert_eq!(receipt(&g, 6, Phase::Applied, Effect::Chamber), vec![1]);
    let save = g.save();
    assert!(!act(&mut g, "fire"));
    assert_eq!(g.save(), save);
}
#[test]
fn chamber_chain_requires_full_fast_reload_and_shifts_real_next_action_one_tick() {
    let mut g = arena(Class::Gunner, &[7]);
    foe(&mut g, "goblin", 6, 5);
    empty_gun(&mut g);
    scheduled(&mut g, "fast_reload");
    let deadline = g.run.as_ref().unwrap().gun_reload.unwrap().at;
    while g.run.as_ref().unwrap().turn + 1 < deadline {
        g.tick();
    }
    assert!(receipt(&g, 7, Phase::Armed, Effect::AimSettle).is_empty());
    g.tick();
    assert_eq!(receipt(&g, 7, Phase::Armed, Effect::AimSettle), vec![1]);
    scheduled(&mut g, "aimed_shot");
    assert_eq!(receipt(&g, 7, Phase::Applied, Effect::AimSettle), vec![1]);
    let mut shortened = g.clone();
    let mut baseline = g.clone();
    baseline.run.as_mut().unwrap().hero.energy = 0;
    let actions = shortened.run.as_ref().unwrap().actions;
    for _ in 0..9 {
        shortened.tick();
        baseline.tick();
    }
    assert_eq!(shortened.run.as_ref().unwrap().actions, actions + 1);
    assert_eq!(baseline.run.as_ref().unwrap().actions, actions);
    baseline.tick();
    assert_eq!(baseline.run.as_ref().unwrap().actions, actions + 1);
}
#[test]
fn smoke_walk_returns_original_reload_debit_only_on_owned_completion_inside_window() {
    let mut g = arena(Class::Gunner, &[8]);
    foe(&mut g, "goblin", 5, 5);
    empty_gun(&mut g);
    scheduled(&mut g, "reload");
    let deadline = g.run.as_ref().unwrap().gun_reload.unwrap().at;
    while g.run.as_ref().unwrap().turn < deadline - 10 {
        g.tick();
    }
    scheduled(&mut g, "smoke_retreat");
    finish_reload(&mut g);
    assert_eq!(receipt(&g, 8, Phase::Applied, Effect::Energy), vec![50]);
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .weapon
            .as_ref()
            .unwrap()
            .firearm
            .unwrap()
            .loaded,
        1
    );
    for _ in 0..5 {
        g.tick();
    }
    assert_eq!(receipt(&g, 8, Phase::Applied, Effect::Energy), vec![50]);
}
#[test]
fn cycling_breach_and_breach_route_need_real_adjacent_burst_kill_and_legal_smoke() {
    let mut g = arena(Class::Gunner, &[9, 11]);
    {
        let r = g.run.as_mut().unwrap();
        let mut gun = Item::new(crate::kit::WEAPON_ID, "short_gun");
        gun.enchant = 20;
        r.hero.weapon = Some(gun).into();
        r.gun_skills = Some(Default::default());
        r.gun_skills.as_mut().unwrap().fast_ready = 100;
    }
    let mi = foe(&mut g, "goblin", 5, 5);
    foe(&mut g, "goblin", 6, 6);
    g.run.as_mut().unwrap().monsters[mi].hp = 1;
    assert!(act(&mut g, "close_burst"));
    assert_eq!(
        receipt(&g, 9, Phase::Applied, Effect::FastReloadCooldown),
        vec![10]
    );
    scheduled(&mut g, "smoke_retreat");
    assert_eq!(receipt(&g, 11, Phase::Applied, Effect::Energy), vec![50]);
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .weapon
            .as_ref()
            .unwrap()
            .firearm
            .unwrap()
            .loaded,
        0,
        "refund never reloads the spent chambers"
    );
}
#[test]
fn long_watch_is_reachable_through_real_rangefinder_recovery_without_free_ammo() {
    let mut g = arena(Class::Gunner, &[6, 7, 10]);
    let boss = foe(&mut g, "goblin_warlord", 6, 5);
    empty_gun(&mut g);
    scheduled(&mut g, "fast_reload");
    finish_reload(&mut g);
    scheduled(&mut g, "aimed_shot");
    g.run.as_mut().unwrap().monsters[boss].hp = 1;
    assert!(act(&mut g, "fire"));
    assert_eq!(receipt(&g, 10, Phase::Armed, Effect::AimSettle), vec![1]);
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .weapon
            .as_ref()
            .unwrap()
            .firearm
            .unwrap()
            .loaded,
        1,
        "actual Rangefinder recovered the round"
    );
    foe(&mut g, "goblin", 7, 5);
    scheduled(&mut g, "aimed_shot");
    assert_eq!(
        receipt(&g, 10, Phase::Applied, Effect::AimSettle),
        vec![1],
        "state={:?}; events={:?}",
        g.run.as_ref().unwrap().hero.advanced,
        g.events
    );
    assert_eq!(
        receipt(&g, 6, Phase::Applied, Effect::Chamber),
        vec![1],
        "no double recovery"
    );
}

/// One identical controlled input per row, forked before its first actual action.
/// Only the tested frozen bit differs. These are causal component experiments,
/// not a claim those manually authored masks were earned through the public tree.
fn paired_scenario(class: Class, bit: u32, on: bool) -> (Game, i32) {
    let bits: &[u32] = match (class, bit) {
        (Class::Fighter, 11) => &[9, 11],
        (Class::Rogue, 10) => &[8, 10],
        (Class::Ranger, 11) => &[9, 11],
        (Class::Caster, 10) => &[6, 10],
        (Class::Gunner, 10) => &[6, 7, 10],
        _ => &[],
    };
    let mut selected = bits.to_vec();
    if !selected.contains(&bit) {
        selected.push(bit);
    }
    let mut g = arena(class, &selected);
    if !on {
        g.run.as_mut().unwrap().hero.class_skills &= !(1 << bit);
    }
    let metric = match (class, bit) {
        (Class::Fighter, 6) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.hero.bulwark_t = 30;
                r.hero.bash_cd = 50;
            }
            enemy_hit(&mut g, mi, "attack");
            g.run.as_mut().unwrap().hero.hp = 500;
            assert!(act(&mut g, "second_wind"));
            -g.run.as_ref().unwrap().hero.bash_cd
        }
        (Class::Fighter, 7) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            assert!(act(&mut g, "shield_bash"));
            enemy_hit(&mut g, mi, "attack");
            g.run.as_ref().unwrap().hero.hp
        }
        (Class::Fighter, 8) => {
            foe(&mut g, "goblin", 5, 5);
            foe(&mut g, "goblin", 4, 6);
            g.run.as_mut().unwrap().hero.bash_cd = 50;
            assert!(act(&mut g, "cleave"));
            -g.run.as_ref().unwrap().hero.bash_cd
        }
        (Class::Fighter, 9 | 11) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            assert!(act(&mut g, "shield_bash"));
            if bit == 11 {
                g.run.as_mut().unwrap().monsters[mi].hp = 1;
            }
            assert!(act(&mut g, "attack"));
            if bit == 11 {
                -g.run.as_ref().unwrap().hero.bash_cd
            } else {
                -g.run.as_ref().unwrap().monsters[mi].hp
            }
        }
        (Class::Fighter, 10) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            g.run.as_mut().unwrap().hero.hp = 500;
            assert!(act(&mut g, "second_wind"));
            enemy_hit(&mut g, mi, "attack");
            g.run.as_ref().unwrap().hero.hp
        }
        (Class::Rogue, 6) => {
            foe(&mut g, "goblin", 5, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.hero.vanish_t = 30;
                r.hero.vanish_cd = 100;
            }
            assert!(act(&mut g, "ambush"));
            assert!(act(&mut g, "shadowstep"));
            -g.run.as_ref().unwrap().hero.vanish_cd
        }
        (Class::Rogue, 7) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.monsters[mi].pending = Some(Pending::HeavyHit);
                r.hero.vanish_cd = 100;
            }
            assert!(act(&mut g, "backstab"));
            -g.run.as_ref().unwrap().hero.vanish_cd
        }
        (Class::Rogue, 8 | 10) => {
            let mi = foe(&mut g, "goblin", 5, 5);
            assert!(act(&mut g, "smoke"));
            scheduled(&mut g, "shadowstep");
            if bit == 10 {
                assert!(act(&mut g, "backstab"));
                -g.run.as_ref().unwrap().monsters[mi].hp
            } else {
                g.run.as_ref().unwrap().hero.energy
            }
        }
        (Class::Rogue, 9) => {
            foe(&mut g, "goblin", 5, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.hero.weapon = Some(Item::new(900, "sword")).into();
                r.hero.vanish_t = 30;
            }
            let mut missed = None;
            for seed in 0..128 {
                let mut b = g.clone();
                b.run.as_mut().unwrap().rng = Rng::new(seed);
                assert!(act(&mut b, "ambush"));
                if b.events
                    .iter()
                    .any(|e| matches!(e,Ev::Attack {src,hit:false,..} if *src==HERO_ID))
                {
                    missed = Some(b);
                    break;
                }
            }
            g = missed.unwrap();
            g.run.as_ref().unwrap().hero.vanish_t
        }
        (Class::Rogue, 11) => {
            let mi = foe(&mut g, "goblin", 5, 5);
            foe(&mut g, "goblin", 7, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.monsters[mi].hp = 1;
                r.hero.vanish_t = 30;
            }
            assert!(act(&mut g, "ambush"));
            scheduled(&mut g, "shadowstep");
            g.run.as_ref().unwrap().hero.energy
        }
        (Class::Ranger, 6 | 10) => {
            let mi = foe(&mut g, "goblin", 6, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.monsters[mi].marked = 30;
                r.hero.double_cd = 40;
            }
            assert!(act(&mut g, "trap"));
            {
                let (r, mut cx) = g.ctx();
                move_monster(r, &mut cx, mi, Pos::new(5, 5));
            }
            if bit == 6 {
                g.run.as_ref().unwrap().monsters[mi].marked
            } else {
                -g.run.as_ref().unwrap().hero.double_cd
            }
        }
        (Class::Ranger, 7) => {
            let mi = foe(&mut g, "goblin", 6, 5);
            {
                let r = g.run.as_mut().unwrap();
                r.monsters[mi].hp = 1;
                r.hero.double_cd = 40;
            }
            assert!(act(&mut g, "shoot"));
            -g.run.as_ref().unwrap().hero.double_cd
        }
        (Class::Ranger, 8 | 9 | 11) => {
            let a = foe(&mut g, "goblin", 6, 5);
            let b = foe(&mut g, "goblin", 7, 5);
            g.run.as_mut().unwrap().monsters[a].marked = 30;
            assert!(act(&mut g, "volley"));
            if bit == 8 {
                let extra = foe(&mut g, "goblin", 11, 5);
                {
                    let r = g.run.as_mut().unwrap();
                    r.monsters[a].hp = 0;
                    r.monsters[b].hp = 0;
                }
                assert!(act(&mut g, "shoot"));
                -g.run.as_ref().unwrap().monsters[extra].hp
            } else if bit == 9 {
                g.run.as_ref().unwrap().monsters[b].marked
            } else {
                scheduled(&mut g, "kite");
                g.run.as_ref().unwrap().hero.energy
            }
        }
        (Class::Caster, 6 | 10) => {
            foe(&mut g, "bloat_mother", 5, 5);
            let other = foe(&mut g, "goblin", 6, 5);
            g.run.as_mut().unwrap().hero.ward_cd = 50;
            assert!(act(&mut g, "slow"));
            hit_verb(&mut g, "bolt");
            if bit == 6 {
                -g.run.as_ref().unwrap().hero.ward_cd
            } else {
                g.run.as_ref().unwrap().monsters[other].slow_t
            }
        }
        (Class::Caster, 7) => {
            foe(&mut g, "goblin", 5, 5);
            foe(&mut g, "goblin", 4, 6);
            let other = foe(&mut g, "goblin", 6, 5);
            assert!(act(&mut g, "nova"));
            hit_verb(&mut g, "bolt");
            -g.run.as_ref().unwrap().monsters[other].hp
        }
        (Class::Caster, 8) => {
            let mi = foe(&mut g, "goblin", 6, 5);
            assert!(act(&mut g, "ward"));
            assert!(act(&mut g, "slow"));
            g.run.as_ref().unwrap().monsters[mi].slow_t
        }
        (Class::Caster, 9) => {
            foe(&mut g, "goblin", 5, 5);
            assert!(act(&mut g, "ward"));
            assert!(act(&mut g, "nova"));
            -g.run.as_ref().unwrap().hero.nova_cd
        }
        (Class::Caster, 11) => {
            let mi = foe(&mut g, "bloat_mother", 5, 5);
            g.run.as_mut().unwrap().hero.blink_cd = 50;
            assert!(act(&mut g, "ward"));
            enemy_hit(&mut g, mi, "attack");
            enemy_hit(&mut g, mi, "attack");
            -g.run.as_ref().unwrap().hero.blink_cd
        }
        (Class::Gunner, 6) => {
            foe(&mut g, "goblin_warlord", 6, 5);
            assert!(act(&mut g, "aimed_shot"));
            assert!(act(&mut g, "fire"));
            g.run
                .as_ref()
                .unwrap()
                .hero
                .weapon
                .as_ref()
                .unwrap()
                .firearm
                .unwrap()
                .loaded as i32
        }
        (Class::Gunner, 7 | 10) => {
            let boss = foe(&mut g, "goblin_warlord", 6, 5);
            empty_gun(&mut g);
            scheduled(&mut g, "fast_reload");
            finish_reload(&mut g);
            scheduled(&mut g, "aimed_shot");
            if bit == 10 {
                g.run.as_mut().unwrap().monsters[boss].hp = 1;
                assert!(act(&mut g, "fire"));
                foe(&mut g, "goblin", 7, 5);
                scheduled(&mut g, "aimed_shot");
            }
            g.run.as_ref().unwrap().hero.energy
        }
        (Class::Gunner, 8) => {
            foe(&mut g, "goblin", 5, 5);
            empty_gun(&mut g);
            scheduled(&mut g, "reload");
            let at = g.run.as_ref().unwrap().gun_reload.unwrap().at;
            while g.run.as_ref().unwrap().turn < at - 10 {
                g.tick();
            }
            scheduled(&mut g, "smoke_retreat");
            finish_reload(&mut g);
            let r = g.run.as_ref().unwrap();
            r.hero.energy + (r.actions as i32) * 100
        }
        (Class::Gunner, 9 | 11) => {
            {
                let r = g.run.as_mut().unwrap();
                let mut gun = Item::new(crate::kit::WEAPON_ID, "short_gun");
                gun.enchant = 20;
                r.hero.weapon = Some(gun).into();
                r.gun_skills = Some(Default::default());
                r.gun_skills.as_mut().unwrap().fast_ready = 100;
            }
            let mi = foe(&mut g, "goblin", 5, 5);
            foe(&mut g, "goblin", 6, 6);
            g.run.as_mut().unwrap().monsters[mi].hp = 1;
            assert!(act(&mut g, "close_burst"));
            if bit == 9 {
                -(g.run
                    .as_ref()
                    .unwrap()
                    .gun_skills
                    .as_ref()
                    .unwrap()
                    .fast_ready as i32)
            } else {
                scheduled(&mut g, "smoke_retreat");
                g.run.as_ref().unwrap().hero.energy
            }
        }
        _ => unreachable!(),
    };
    (g, metric)
}
#[test]
fn all_thirty_named_interactions_have_enabled_disabled_actual_action_controls() {
    let mut proven = std::collections::BTreeSet::new();
    for class in Class::ALL {
        for bit in 6..12 {
            let (enabled, value) = paired_scenario(class, bit, true);
            let (disabled, control) = paired_scenario(class, bit, false);
            let id = crate::class_tree::catalogue(class)[bit as usize].id.clone();
            assert!(
                value > control,
                "{id}: enabled{value} must improve its own actual output over control{control}"
            );
            assert!(disabled.events.iter().all(|e|!matches!(e,Ev::ClassInteraction {skill,..} if skill.id==format!("path:{id}"))),"disabled {id} never invents a receipt");
            assert!(enabled.events.iter().any(|e|matches!(e,Ev::ClassInteraction {skill,phase:Phase::Applied,amount,..} if skill.id==format!("path:{id}")&&*amount>0)),"{id} needs positive actual application");
            println!("paired {id}: enabled={value}, control={control}");
            proven.insert(id);
        }
    }
    assert_eq!(proven.len(), 30);
}

#[test]
fn ghostwalk_keeps_charge_through_actual_miss_and_zero_damage_hit() {
    let mut g = arena(Class::Rogue, &[8, 10]);
    let mi = foe(&mut g, "goblin", 5, 5);
    assert!(act(&mut g, "smoke"));
    assert!(act(&mut g, "shadowstep"));
    let original = g
        .run
        .as_ref()
        .unwrap()
        .hero
        .advanced
        .as_ref()
        .unwrap()
        .charges[&Combo::Ghostwalk]
        .clone();
    g.run.as_mut().unwrap().hero.weapon = Some(Item::new(900, "sword")).into();
    let mut missed = None;
    for seed in 0..128 {
        let mut b = g.clone();
        let before = b.events.len();
        b.run.as_mut().unwrap().rng = Rng::new(seed);
        assert!(act(&mut b, "backstab"));
        if b.events[before..]
            .iter()
            .any(|e| matches!(e,Ev::Attack {src,hit:false,..} if *src==HERO_ID))
        {
            missed = Some(b);
            break;
        }
    }
    g = missed.expect("real Backstab miss");
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .advanced
            .as_ref()
            .unwrap()
            .charges[&Combo::Ghostwalk],
        original
    );
    {
        let r = g.run.as_mut().unwrap();
        let mut w = Item::new(crate::kit::WEAPON_ID, "sword");
        w.enchant = 20;
        r.hero.weapon = Some(w).into();
        r.monsters[mi].def = 10000;
    }
    assert!(act(&mut g, "backstab"));
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .advanced
            .as_ref()
            .unwrap()
            .charges[&Combo::Ghostwalk],
        original
    );
    assert!(receipt(&g, 10, Phase::Consumed, Effect::Damage).is_empty());
    g.run.as_mut().unwrap().monsters[mi].def = 0;
    assert!(act(&mut g, "backstab"));
    assert_eq!(receipt(&g, 10, Phase::Consumed, Effect::Damage), vec![1]);
    assert_eq!(receipt(&g, 10, Phase::Applied, Effect::Damage), vec![2]);
}
#[test]
fn moving_line_does_not_refund_kite_shooting_in_place() {
    let mut g = volley_arena(&[9, 11]);
    assert!(act(&mut g, "volley"));
    // Explicit component geometry diagnostic: keep the earned-from-actions
    // charge but place the nearest foe at the Kite shooting distance.
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[0].pos = Pos::new(7, 5);
        r.monsters[1].pos = Pos::new(8, 5);
    }
    let pos = g.run.as_ref().unwrap().hero.pos;
    scheduled(&mut g, "kite");
    assert_eq!(g.run.as_ref().unwrap().hero.pos, pos);
    assert!(receipt(&g, 11, Phase::Applied, Effect::Energy).is_empty());
    assert_eq!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .advanced
            .as_ref()
            .unwrap()
            .charges[&Combo::MovingLine]
            .remaining,
        1
    );
}
#[test]
fn split_mark_cannot_chain_from_a_copy_but_fresh_mark_restores_original_provenance() {
    let mut g = volley_arena(&[9]);
    assert!(act(&mut g, "volley"));
    assert!(g.run.as_ref().unwrap().monsters[1].advanced_mark_copy);
    let c = foe(&mut g, "goblin", 8, 5);
    // Reset only the controlled cooldown to isolate the provenance guard;
    // this is not a claim that a second70/80t Volley fits a20t copied mark.
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[0].hp = 0;
        r.hero.volley_cd = 0;
    }
    assert!(act(&mut g, "volley"));
    assert_eq!(g.run.as_ref().unwrap().monsters[c].marked, 0);
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[1].marked = 0;
        r.hero.volley_cd = 0;
    }
    assert!(act(&mut g, "mark"));
    assert!(!g.run.as_ref().unwrap().monsters[1].advanced_mark_copy);
    assert!(act(&mut g, "volley"));
    assert_eq!(g.run.as_ref().unwrap().monsters[c].marked, 20);
}
#[test]
fn tell_thief_does_not_misname_ambush_as_a_backstab() {
    let mut g = arena(Class::Rogue, &[7]);
    let mi = foe(&mut g, "bloat_mother", 5, 5);
    {
        let r = g.run.as_mut().unwrap();
        r.hero.vanish_t = 30;
        r.hero.vanish_cd = 100;
        r.monsters[mi].pending = Some(Pending::HeavyHit);
    }
    assert!(act(&mut g, "ambush"));
    assert_eq!(g.run.as_ref().unwrap().hero.vanish_cd, 100);
    assert_eq!(
        g.run.as_ref().unwrap().monsters[mi].pending,
        Some(Pending::HeavyHit)
    );
    assert!(receipt(&g, 7, Phase::Applied, Effect::VanishCooldown).is_empty());
}

/// Actual prefixes arm every bounded charge. Their expiration is tested on
/// complete saved native Games; no helper directly grants a charge.
fn armed_charge_fixtures() -> Vec<(Game, Combo)> {
    let mut cases = Vec::new();
    let mut bash = arena(Class::Fighter, &[7, 9]);
    foe(&mut bash, "goblin_warlord", 5, 5);
    bash.run.as_mut().unwrap().aimed = true;
    assert!(act(&mut bash, "shield_bash"));
    cases.push((bash.clone(), Combo::Oathguard));
    cases.push((bash, Combo::SiegeRhythm));
    let mut hold = arena(Class::Fighter, &[10]);
    foe(&mut hold, "goblin", 5, 5);
    hold.run.as_mut().unwrap().hero.hp = 500;
    assert!(act(&mut hold, "second_wind"));
    cases.push((hold, Combo::Holdfast));
    let mut ambush = arena(Class::Rogue, &[6, 11]);
    let mi = foe(&mut ambush, "goblin", 5, 5);
    foe(&mut ambush, "goblin", 7, 5);
    {
        let r = ambush.run.as_mut().unwrap();
        r.monsters[mi].hp = 1;
        r.hero.vanish_t = 30;
    }
    assert!(act(&mut ambush, "ambush"));
    cases.push((ambush.clone(), Combo::Afterimage));
    cases.push((ambush, Combo::SilentFinish));
    let mut smoke = arena(Class::Rogue, &[8, 10]);
    foe(&mut smoke, "goblin", 5, 5);
    assert!(act(&mut smoke, "smoke"));
    cases.push((smoke.clone(), Combo::VeiledRoute));
    assert!(act(&mut smoke, "shadowstep"));
    cases.push((smoke, Combo::Ghostwalk));
    let mut volley = volley_arena(&[8, 9, 11]);
    assert!(act(&mut volley, "volley"));
    cases.push((volley.clone(), Combo::CorridorVolley));
    cases.push((volley, Combo::MovingLine));
    let mut nova = arena(Class::Caster, &[7]);
    foe(&mut nova, "goblin", 5, 5);
    foe(&mut nova, "goblin", 4, 6);
    assert!(act(&mut nova, "nova"));
    cases.push((nova, Combo::StormCell));
    let mut reload = arena(Class::Gunner, &[7]);
    foe(&mut reload, "goblin", 6, 5);
    empty_gun(&mut reload);
    scheduled(&mut reload, "fast_reload");
    finish_reload(&mut reload);
    cases.push((reload, Combo::ChamberChain));
    let mut long = arena(Class::Gunner, &[6, 7, 10]);
    let boss = foe(&mut long, "goblin_warlord", 6, 5);
    empty_gun(&mut long);
    scheduled(&mut long, "fast_reload");
    finish_reload(&mut long);
    scheduled(&mut long, "aimed_shot");
    long.run.as_mut().unwrap().monsters[boss].hp = 1;
    assert!(act(&mut long, "fire"));
    foe(&mut long, "goblin", 7, 5);
    cases.push((long, Combo::LongWatch));
    let mut burst = arena(Class::Gunner, &[11]);
    {
        let r = burst.run.as_mut().unwrap();
        let mut w = Item::new(crate::kit::WEAPON_ID, "short_gun");
        w.enchant = 20;
        r.hero.weapon = Some(w).into();
    }
    let mi = foe(&mut burst, "goblin", 5, 5);
    burst.run.as_mut().unwrap().monsters[mi].hp = 1;
    assert!(act(&mut burst, "close_burst"));
    foe(&mut burst, "goblin", 6, 6);
    cases.push((burst, Combo::BreachRoute));
    let mut gun_smoke = arena(Class::Gunner, &[8]);
    foe(&mut gun_smoke, "goblin", 5, 5);
    assert!(act(&mut gun_smoke, "smoke_retreat"));
    cases.push((gun_smoke, Combo::SmokeWalk));
    cases
}
#[test]
fn every_actual_charge_preserves_complete_save_across_active_deadline_expired_whole_sliced_reload()
{
    let cases = armed_charge_fixtures();
    assert_eq!(cases.len(), 14);
    for (mut initial, combo) in cases {
        initial.sim = false;
        // A real observation can open existing Oath offers. Public load is a
        // camp/offer canonicalization boundary outside an absence; construct
        // one idempotent input before forking instead of erasing offer fields.
        initial.tick();
        initial = Game::load(&initial.save()).unwrap();
        initial.events.clear();
        let deadline = crate::class_advanced::charge(initial.run.as_ref().unwrap(), combo)
            .expect("real prefix armed charge")
            .expires_t;
        let start = initial.run.as_ref().unwrap().turn;
        assert_eq!(
            Game::load(&initial.save()).unwrap().save(),
            initial.save(),
            "{combo:?} active save"
        );
        let mut whole = initial.clone();
        let mut sliced = Game::load(&initial.save()).unwrap();
        let mut left = deadline - start + 3;
        let mut settled = false;
        while left > 0 {
            let width = left.min(3);
            let used = whole.tick_batch(width, &mut settled);
            assert!(used > 0 && used <= width);
            for _ in 0..used {
                sliced.tick();
            }
            // Persistence promises every serialized actor field, not #[serde(skip)]
            // BFS/acting-row scratch caches. Exact full saves/events remain below.
            if serde_json::to_value(&whole.run).unwrap()
                != serde_json::to_value(&sliced.run).unwrap()
            {
                fn differences(
                    a: &serde_json::Value,
                    b: &serde_json::Value,
                    path: &str,
                    out: &mut Vec<String>,
                ) {
                    match (a, b) {
                        (serde_json::Value::Object(a), serde_json::Value::Object(b)) => {
                            for key in a
                                .keys()
                                .chain(b.keys())
                                .collect::<std::collections::BTreeSet<_>>()
                            {
                                differences(
                                    a.get(key).unwrap_or(&serde_json::Value::Null),
                                    b.get(key).unwrap_or(&serde_json::Value::Null),
                                    &format!("{path}.{key}"),
                                    out,
                                );
                            }
                        }
                        (serde_json::Value::Array(a), serde_json::Value::Array(b)) => {
                            for i in 0..a.len().max(b.len()) {
                                differences(
                                    a.get(i).unwrap_or(&serde_json::Value::Null),
                                    b.get(i).unwrap_or(&serde_json::Value::Null),
                                    &format!("{path}[{i}]"),
                                    out,
                                );
                            }
                        }
                        _ if a != b && out.len() < 24 => {
                            out.push(format!("{path}: {a} vs {b}"));
                        }
                        _ => {}
                    }
                }
                let mut delta = Vec::new();
                differences(
                    &serde_json::to_value(&whole.run).unwrap(),
                    &serde_json::to_value(&sliced.run).unwrap(),
                    "run",
                    &mut delta,
                );
                panic!(
                    "{combo:?} complete Run at{}: {}",
                    whole.run.as_ref().unwrap().turn,
                    delta.join("; ")
                );
            }
            assert_eq!(whole.events, sliced.events, "{combo:?} actual events");
            assert_eq!(whole.save(), sliced.save(), "{combo:?} complete save");
            whole.events.clear();
            sliced.events.clear(); // Each delivery chunk was compared above.
            sliced = Game::load(&sliced.save()).unwrap();
            left -= used;
        }
        assert!(
            crate::class_advanced::charge(whole.run.as_ref().unwrap(), combo).is_none(),
            "{combo:?} expired"
        );
        assert!(
            whole
                .run
                .as_ref()
                .unwrap()
                .hero
                .advanced
                .as_ref()
                .unwrap()
                .charges
                .len()
                <= 14
        );
        let mut exact = initial.clone();
        while exact.run.as_ref().unwrap().turn < deadline {
            exact.tick();
        }
        assert!(
            crate::class_advanced::charge(exact.run.as_ref().unwrap(), combo).is_some(),
            "{combo:?} inclusive deadline"
        );
        exact.tick();
        assert!(
            crate::class_advanced::charge(exact.run.as_ref().unwrap(), combo).is_none(),
            "{combo:?} deadline+1"
        );
    }
}
#[test]
fn expired_actual_charges_never_benefit_their_real_legal_followup() {
    for (mut g, combo) in armed_charge_fixtures() {
        let charge = crate::class_advanced::charge(g.run.as_ref().unwrap(), combo)
            .unwrap()
            .clone();
        while g.run.as_ref().unwrap().turn <= charge.expires_t {
            g.tick();
        }
        let before = g.events.len();
        match combo {
            Combo::Oathguard | Combo::Holdfast => {
                let mi = g
                    .run
                    .as_ref()
                    .unwrap()
                    .monsters
                    .iter()
                    .position(|m| m.hp > 0 && m.hostile())
                    .unwrap();
                enemy_hit(&mut g, mi, "attack");
            }
            Combo::SiegeRhythm => {
                assert!(act(&mut g, "attack"));
            }
            Combo::Afterimage | Combo::VeiledRoute | Combo::SilentFinish => {
                assert!(act(&mut g, "shadowstep"));
            }
            Combo::Ghostwalk => {
                assert!(act(&mut g, "backstab"));
            }
            Combo::CorridorVolley => {
                assert!(act(&mut g, "shoot"));
            }
            Combo::MovingLine => {
                assert!(act(&mut g, "kite"));
            }
            Combo::StormCell => {
                hit_verb(&mut g, "bolt");
            }
            Combo::ChamberChain | Combo::LongWatch => {
                assert!(act(&mut g, "aimed_shot"));
            }
            Combo::BreachRoute => {
                assert!(act(&mut g, "smoke_retreat"));
            }
            Combo::SmokeWalk => {
                assert!(act(&mut g, "fire"));
                scheduled(&mut g, "reload");
                finish_reload(&mut g);
            }
        }
        let bit = match combo {
            Combo::Oathguard | Combo::StormCell | Combo::ChamberChain => 7,
            Combo::SiegeRhythm => 9,
            Combo::Holdfast | Combo::Ghostwalk | Combo::LongWatch => 10,
            Combo::Afterimage => 6,
            Combo::VeiledRoute | Combo::CorridorVolley | Combo::SmokeWalk => 8,
            Combo::SilentFinish | Combo::MovingLine | Combo::BreachRoute => 11,
        };
        let id = format!(
            "path:{}",
            crate::class_tree::catalogue(g.run.as_ref().unwrap().hero.class)[bit].id
        );
        assert!(g.events[before..].iter().all(|e|!matches!(e,Ev::ClassInteraction {skill,phase:Phase::Consumed|Phase::Applied,..} if skill.id==id)),"{combo:?} expired actual followup");
    }
}
#[test]
fn every_actual_charge_has_public_offline_whole_sliced_reloaded_complete_parity() {
    for (mut input, combo) in armed_charge_fixtures() {
        input.sim = false;
        input.tick();
        input = Game::load(&input.save()).unwrap();
        input.events.clear();
        let original = input.save();
        assert_eq!(
            Game::load(&original).unwrap().save(),
            original,
            "{combo:?} canonical input"
        );
        let mut whole = input.clone();
        let expected = crate::offline::run_offline_slice(&mut whole, 3, true);
        let mut sliced = input.clone();
        for _ in 0..2 {
            let report = crate::offline::run_offline_slice(&mut sliced, 1, false);
            assert!(report.slice_pending);
            sliced = Game::load(&sliced.save()).unwrap();
        }
        let actual = crate::offline::run_offline_slice(&mut sliced, 1, true);
        assert_eq!(actual, expected, "{combo:?} complete actual offline report");
        assert_eq!(
            sliced.save(),
            whole.save(),
            "{combo:?} byte-exact complete offline Game"
        );
        assert_eq!(input.save(), original, "immutable paired parent input");
    }
}

// Priority1: controlled component contexts, but every charge below is armed by
// its real preceding verb. Geometry/cooldowns are fixture inputs, never earned
// progression or injected charge state.
fn p1_meta(combo: Combo) -> (u32, Effect) {
    match combo {
        Combo::Oathguard => (7, Effect::MeleeBlock),
        Combo::Holdfast => (10, Effect::MeleeBlock),
        Combo::SiegeRhythm => (9, Effect::Damage),
        Combo::Afterimage => (6, Effect::VanishCooldown),
        Combo::VeiledRoute => (8, Effect::Energy),
        Combo::SilentFinish => (11, Effect::Energy),
        Combo::Ghostwalk => (10, Effect::Damage),
        Combo::CorridorVolley => (8, Effect::Range),
        Combo::MovingLine => (11, Effect::Energy),
        Combo::StormCell => (7, Effect::Damage),
        Combo::ChamberChain => (7, Effect::AimSettle),
        Combo::LongWatch => (10, Effect::AimSettle),
        Combo::BreachRoute => (11, Effect::Energy),
        Combo::SmokeWalk => (8, Effect::Energy),
    }
}
fn p1_charge(g: &Game, combo: Combo) -> crate::class_advanced::Charge {
    g.run
        .as_ref()
        .unwrap()
        .hero
        .advanced
        .as_ref()
        .unwrap()
        .charges[&combo]
        .clone()
}
fn p1_inputs() -> Vec<(Game, Combo)> {
    armed_charge_fixtures()
        .into_iter()
        .map(|(mut g, combo)| {
            match combo {
                Combo::SiegeRhythm => {
                    // Warlord shielding may zero a legal ordinary attack. Use
                    // an unshielded boss for the positive damage oracle.
                    g = arena(Class::Fighter, &[9]);
                    foe(&mut g, "bloat_mother", 5, 5);
                    assert!(act(&mut g, "shield_bash"));
                }
                Combo::Afterimage => {
                    // A real Vanish creates a nonzero cooldown for the consumer.
                    assert!(act(&mut g, "vanish"));
                }
                Combo::CorridorVolley => {
                    // Isolate the extra-range target, as in the existing range test.
                    for m in &mut g.run.as_mut().unwrap().monsters {
                        m.hp = 0;
                    }
                    foe(&mut g, "goblin", 11, 5);
                }
                Combo::StormCell => {
                    foe(&mut g, "goblin", 6, 5);
                }
                Combo::SmokeWalk => {
                    // Normal reload lasts20ticks: starting it AFTER smoke cannot
                    // finish inside10. Start the real reload, then smoke late.
                    g = arena(Class::Gunner, &[8]);
                    foe(&mut g, "goblin", 5, 5);
                    empty_gun(&mut g);
                    scheduled(&mut g, "reload");
                    let at = g.run.as_ref().unwrap().gun_reload.unwrap().at;
                    while g.run.as_ref().unwrap().turn < at - 10 {
                        g.tick();
                    }
                    scheduled(&mut g, "smoke_retreat");
                }
                _ => {}
            }
            assert!(
                crate::class_advanced::charge(g.run.as_ref().unwrap(), combo).is_some(),
                "{combo:?} real active prefix"
            );
            g.events.clear();
            (g, combo)
        })
        .collect()
}
fn p1_consume(g: &mut Game, combo: Combo) {
    let old = p1_charge(g, combo);
    let (bit, effect) = p1_meta(combo);
    let hp = g.run.as_ref().unwrap().hero.hp;
    let pos = g.run.as_ref().unwrap().hero.pos;
    let vanish_cd = g.run.as_ref().unwrap().hero.vanish_cd;
    let monster_hp: i32 = g
        .run
        .as_ref()
        .unwrap()
        .monsters
        .iter()
        .map(|m| m.hp.max(0))
        .sum();
    match combo {
        Combo::Oathguard | Combo::Holdfast => {
            let mi = g
                .run
                .as_ref()
                .unwrap()
                .monsters
                .iter()
                .position(|m| m.hp > 0 && m.hostile())
                .unwrap();
            enemy_hit(g, mi, "attack");
            assert!(
                g.run.as_ref().unwrap().hero.hp < hp,
                "{combo:?} real remaining melee damage"
            );
        }
        Combo::SiegeRhythm => hit_verb(g, "attack"),
        Combo::Ghostwalk => hit_verb(g, "backstab"),
        Combo::Afterimage => {
            assert!(act(g, "shadowstep"));
        }
        Combo::VeiledRoute | Combo::SilentFinish => scheduled(g, "shadowstep"),
        Combo::CorridorVolley => {
            assert!(act(g, "shoot"));
        }
        Combo::MovingLine => scheduled(g, "kite"),
        Combo::StormCell => hit_verb(g, "bolt"),
        Combo::ChamberChain | Combo::LongWatch => scheduled(g, "aimed_shot"),
        Combo::BreachRoute => scheduled(g, "smoke_retreat"),
        Combo::SmokeWalk => {
            assert!(g.run.as_ref().unwrap().gun_reload.is_some());
            finish_reload(g);
            assert!(g.run.as_ref().unwrap().gun_reload.is_none());
            assert_eq!(
                g.run
                    .as_ref()
                    .unwrap()
                    .hero
                    .weapon
                    .as_ref()
                    .unwrap()
                    .firearm
                    .unwrap()
                    .loaded,
                1
            );
        }
    }
    let new = p1_charge(g, combo);
    assert_eq!(
        new.remaining,
        old.remaining - 1,
        "{combo:?} exactly one physical charge"
    );
    assert_eq!(
        (new.expires_t, new.source, new.target),
        (old.expires_t, old.source, old.target),
        "{combo:?} no refresh/retarget"
    );
    assert_eq!(
        receipt(g, bit, Phase::Consumed, effect),
        vec![1],
        "{combo:?} one actual consumer"
    );
    let amounts = receipt(g, bit, Phase::Applied, effect);
    assert_eq!(amounts.len(), 1, "{combo:?} exactly one actual benefit");
    assert!(amounts[0] > 0, "{combo:?} nonzero applied output");
    match combo {
        Combo::Afterimage => assert_eq!(vanish_cd - g.run.as_ref().unwrap().hero.vanish_cd, 20),
        Combo::VeiledRoute | Combo::SilentFinish | Combo::MovingLine => {
            assert_ne!(
                g.run.as_ref().unwrap().hero.pos,
                pos,
                "{combo:?} actual movement"
            );
            assert_eq!(amounts, vec![50]);
            assert!(g.run.as_ref().unwrap().hero.energy < crate::engine::ACT_ENERGY);
        }
        Combo::BreachRoute | Combo::SmokeWalk => assert_eq!(amounts, vec![50]),
        Combo::ChamberChain | Combo::LongWatch | Combo::CorridorVolley => {
            assert_eq!(amounts, vec![1])
        }
        Combo::SiegeRhythm | Combo::Ghostwalk | Combo::StormCell => {
            let after: i32 = g
                .run
                .as_ref()
                .unwrap()
                .monsters
                .iter()
                .map(|m| m.hp.max(0))
                .sum();
            assert!(after < monster_hp, "{combo:?} actual target HP reduced");
        }
        Combo::Oathguard | Combo::Holdfast => assert!(amounts[0] <= 2),
    }
}
fn p1_canonical(mut g: Game, combo: Combo) -> Game {
    // Real observation tick then public load reaches the same canonical offer
    // boundary used by the prior full-save parity tests. No fields discarded.
    g.sim = false;
    g.tick();
    let g = Game::load(&g.save()).unwrap();
    assert_eq!(
        Game::load(&g.save()).unwrap().save(),
        g.save(),
        "{combo:?} idempotent canonical checkpoint"
    );
    g
}
fn p1_offline_parity(mut input: Game, combo: Combo) {
    input.events.clear();
    let mut whole = input.clone();
    let expected = crate::offline::run_offline_slice(&mut whole, 3, true);
    let mut sliced = input;
    for _ in 0..2 {
        assert!(crate::offline::run_offline_slice(&mut sliced, 1, false).slice_pending);
        sliced = Game::load(&sliced.save()).unwrap();
    }
    let actual = crate::offline::run_offline_slice(&mut sliced, 1, true);
    assert_eq!(actual, expected, "{combo:?} spent complete report");
    assert_eq!(sliced.save(), whole.save(), "{combo:?} spent complete Game");
}
#[test]
fn priority1_all_fourteen_real_prefixes_refuse_without_spending_or_save_mutation() {
    let cases = p1_inputs();
    assert_eq!(cases.len(), 14);
    for (mut g, combo) in cases {
        let verb = match combo {
            Combo::Oathguard | Combo::SiegeRhythm => "shield_bash",
            Combo::Holdfast => "second_wind",
            Combo::ChamberChain | Combo::LongWatch => {
                // A real unprepared Fire spends the round, not the Aim charge.
                assert!(act(&mut g, "fire"));
                "aimed_shot"
            }
            Combo::SmokeWalk => "reload", // Actual reload still in flight.
            Combo::BreachRoute => {
                let r = g.run.as_mut().unwrap();
                r.gun_skills
                    .get_or_insert_with(Default::default)
                    .smoke_ready = r.turn + 20;
                "smoke_retreat" // Controlled legitimate cooldown refusal context.
            }
            _ => {
                for m in &mut g.run.as_mut().unwrap().monsters {
                    m.dormant = true;
                }
                match combo {
                    Combo::Afterimage | Combo::VeiledRoute | Combo::SilentFinish => "shadowstep",
                    Combo::Ghostwalk => "backstab",
                    Combo::CorridorVolley => "shoot",
                    Combo::MovingLine => "kite",
                    Combo::StormCell => "bolt",
                    _ => unreachable!(),
                }
            }
        };
        let before = p1_charge(&g, combo);
        g.events.clear();
        let save = g.save();
        assert!(!act(&mut g, verb), "{combo:?} actual {verb} refusal");
        assert_eq!(g.save(), save, "{combo:?} refusal complete save");
        assert_eq!(
            p1_charge(&g, combo),
            before,
            "{combo:?} refusal charge/deadline/source"
        );
        assert!(
            g.events.is_empty(),
            "{combo:?} refusal emits no false action"
        );
        println!(
            "priority1 refusal {combo:?} verb={verb} remaining={} exactSave=true",
            before.remaining
        );
    }
}
#[test]
fn priority1_all_fourteen_actual_consumers_persist_spent_state_and_holdfast_partial() {
    let cases = p1_inputs();
    assert_eq!(cases.len(), 14);
    for (mut g, combo) in cases {
        let initial = p1_charge(&g, combo);
        assert_eq!(
            initial.remaining,
            if combo == Combo::Holdfast { 2 } else { 1 }
        );
        p1_consume(&mut g, combo);
        g = p1_canonical(g, combo);
        if combo == Combo::Holdfast {
            assert_eq!(
                p1_charge(&g, combo).remaining,
                1,
                "first hit survives reload partially spent"
            );
            p1_offline_parity(g.clone(), combo);
            g.events.clear();
            p1_consume(&mut g, combo);
            g = p1_canonical(g, combo);
        }
        assert_eq!(
            p1_charge(&g, combo).remaining,
            0,
            "{combo:?} exhausted after actual use"
        );
        assert!(crate::class_advanced::charge(g.run.as_ref().unwrap(), combo).is_none());
        assert_eq!(
            p1_charge(&g, combo).source,
            initial.source,
            "{combo:?} original source retained"
        );
        p1_offline_parity(g.clone(), combo);
        let (bit, effect) = p1_meta(combo);
        g.events.clear();
        match combo {
            Combo::Oathguard | Combo::Holdfast => {
                let mi = g
                    .run
                    .as_ref()
                    .unwrap()
                    .monsters
                    .iter()
                    .position(|m| m.hp > 0 && m.hostile())
                    .unwrap();
                let before = g.run.as_ref().unwrap().hero.hp;
                enemy_hit(&mut g, mi, "attack");
                assert!(g.run.as_ref().unwrap().hero.hp < before);
            }
            Combo::SiegeRhythm => hit_verb(&mut g, "attack"),
            Combo::Ghostwalk => hit_verb(&mut g, "backstab"),
            Combo::Afterimage | Combo::VeiledRoute | Combo::SilentFinish => {
                assert!(act(&mut g, "shadowstep"));
            }
            Combo::CorridorVolley => {
                let before = g.run.as_ref().unwrap().hero.pos;
                assert!(act(&mut g, "shoot"));
                assert_ne!(
                    g.run.as_ref().unwrap().hero.pos,
                    before,
                    "spent range approaches instead"
                );
            }
            Combo::MovingLine => {
                // A legal follow-up can shoot in place: do not call this a
                // second moving-step proof. Exhausted state still must persist.
                assert!(act(&mut g, "kite"));
            }
            Combo::StormCell => hit_verb(&mut g, "bolt"),
            Combo::ChamberChain | Combo::LongWatch => {
                let save = g.save();
                assert!(!act(&mut g, "aimed_shot"), "same prepared Aim is refused");
                assert_eq!(g.save(), save);
            }
            Combo::BreachRoute | Combo::SmokeWalk => {
                // Breach smoke is now cooling down. SmokeWalk has a full gun;
                // another20tick reload cannot fit its original10tick window.
                let verb = if combo == Combo::SmokeWalk {
                    "reload"
                } else {
                    "smoke_retreat"
                };
                let save = g.save();
                assert!(!act(&mut g, verb));
                assert_eq!(g.save(), save);
            }
        }
        assert!(
            receipt(&g, bit, Phase::Consumed, effect).is_empty(),
            "{combo:?} no repeated spend"
        );
        assert!(
            receipt(&g, bit, Phase::Applied, effect).is_empty(),
            "{combo:?} no repeated benefit"
        );
        assert_eq!(p1_charge(&g, combo).remaining, 0);
        println!("priority1 consumer {combo:?} spentReload=true wholeSliceReportSave=true repeatNoBenefit=true");
    }
}
