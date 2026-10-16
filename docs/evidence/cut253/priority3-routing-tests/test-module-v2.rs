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
                // Controlled geometry makes a second actual kite step legal,
                // rather than vacuously checking an in-place shot.
                let pos = g.run.as_ref().unwrap().hero.pos;
                foe(&mut g, "goblin", pos.x + 1, pos.y);
                assert!(act(&mut g, "kite"));
                assert_ne!(g.run.as_ref().unwrap().hero.pos, pos);
            }
            Combo::StormCell => hit_verb(&mut g, "bolt"),
            Combo::ChamberChain | Combo::LongWatch => {
                let save = g.save();
                assert!(!act(&mut g, "aimed_shot"), "same prepared Aim is refused");
                assert_eq!(g.save(), save);
                // A genuinely different, nearer target permits a new Aim.
                // Its real scheduler debit must receive no spent settle bonus.
                let pos = g.run.as_ref().unwrap().hero.pos;
                foe(&mut g, "goblin", pos.x + 1, pos.y);
                scheduled(&mut g, "aimed_shot");
                assert_eq!(g.run.as_ref().unwrap().hero.energy, 0);
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

#[test]
fn priority1_siege_spends_on_a_real_blocked_attack_without_claiming_damage() {
    let (mut g, _) = armed_charge_fixtures()
        .into_iter()
        .find(|(_, combo)| *combo == Combo::SiegeRhythm)
        .unwrap();
    g.events.clear();
    let before = g.run.as_ref().unwrap().monsters[0].hp;
    hit_verb(&mut g, "attack");
    assert_eq!(g.run.as_ref().unwrap().monsters[0].hp, before);
    assert_eq!(p1_charge(&g, Combo::SiegeRhythm).remaining, 0);
    assert_eq!(receipt(&g, 9, Phase::Consumed, Effect::Damage), vec![1]);
    assert!(receipt(&g, 9, Phase::Applied, Effect::Damage).is_empty());
    let g = p1_canonical(g, Combo::SiegeRhythm);
    assert_eq!(p1_charge(&g, Combo::SiegeRhythm).remaining, 0);
    p1_offline_parity(g, Combo::SiegeRhythm);
}

// Priority2 selected-node counterexamples. These are controlled component
// contexts; every asserted exclusion follows an actual action/output oracle.
fn p2_no_receipt(g: &Game, bits: &[u32]) {
    for bit in bits {
        let id = format!(
            "path:{}",
            crate::class_tree::catalogue(g.run.as_ref().unwrap().hero.class)[*bit as usize].id
        );
        assert!(
            g.events
                .iter()
                .all(|e| !matches!(e, Ev::ClassInteraction {skill,..} if skill.id==id)),
            "unexpected selected-node receipt {id}"
        );
    }
}
fn p2_roll(g: &Game, verb: &str, wanted: bool) -> Game {
    for seed in 0..512 {
        let mut chosen = g.clone();
        chosen.events.clear();
        chosen.run.as_mut().unwrap().rng = Rng::new(seed);
        if !act(&mut chosen, verb) {
            continue;
        }
        if !chosen
            .events
            .iter()
            .any(|e| matches!(e,Ev::Attack {src,hit,..} if *src==HERO_ID && *hit==wanted))
        {
            continue;
        }
        // The same actual action/RNG fork with advanced nodes disabled must
        // have the same hit and physical HP/ammunition outcome for a negative.
        let mut control = g.clone();
        control.events.clear();
        let r = control.run.as_mut().unwrap();
        r.hero.class_skills &= 0x3f;
        r.rng = Rng::new(seed);
        assert!(act(&mut control, verb));
        assert!(control
            .events
            .iter()
            .any(|e| matches!(e,Ev::Attack {src,hit,..} if *src==HERO_ID && *hit==wanted)));
        assert_eq!(
            chosen
                .run
                .as_ref()
                .unwrap()
                .monsters
                .iter()
                .map(|m| m.hp)
                .collect::<Vec<_>>(),
            control
                .run
                .as_ref()
                .unwrap()
                .monsters
                .iter()
                .map(|m| m.hp)
                .collect::<Vec<_>>(),
            "{verb} selected negative physical HP vs identical RNG control"
        );
        assert_eq!(
            chosen
                .run
                .as_ref()
                .unwrap()
                .hero
                .weapon
                .as_ref()
                .and_then(|w| w.firearm),
            control
                .run
                .as_ref()
                .unwrap()
                .hero
                .weapon
                .as_ref()
                .and_then(|w| w.firearm)
        );
        println!("priority2 {verb} actual hit={wanted} sameRngSeed={seed}");
        return chosen;
    }
    panic!("no actual {verb} hit={wanted} branch");
}
fn p2_enemy(g: &Game, mi: usize, hit: bool, intercepted: bool) -> Game {
    for seed in 0..512 {
        let mut branch = g.clone();
        branch.events.clear();
        branch.run.as_mut().unwrap().rng = Rng::new(seed);
        {
            let (r, mut cx) = branch.ctx();
            monster_attack(r, &mut cx, mi, 1, "attack");
        }
        let main = branch
            .events
            .iter()
            .any(|e| matches!(e,Ev::Attack {dst,hit:h,..} if *dst==HERO_ID&&*h==hit));
        let guarded = branch
            .events
            .iter()
            .any(|e| matches!(e,Ev::Attack {verb:Some(v),hit:true,..} if v=="guarded"));
        if main && guarded == intercepted {
            let mut control = g.clone();
            control.events.clear();
            let r = control.run.as_mut().unwrap();
            r.hero.class_skills &= 0x3f;
            r.rng = Rng::new(seed);
            {
                let (r, mut cx) = control.ctx();
                monster_attack(r, &mut cx, mi, 1, "attack");
            }
            assert_eq!(
                branch.events, control.events,
                "incoming negative same-RNG complete events"
            );
            assert_eq!(
                branch.run.as_ref().unwrap().hero.hp,
                control.run.as_ref().unwrap().hero.hp
            );
            println!("priority2 incoming hit={hit} intercepted={intercepted} seed={seed}");
            return branch;
        }
    }
    panic!("no actual incoming hit={hit} intercepted={intercepted}");
}
#[test]
fn priority2_rally_excludes_actual_miss_unmitigated_hazard_and_intercepted_melee() {
    let mut base = arena(Class::Fighter, &[6]);
    let mi = foe(&mut base, "goblin", 5, 5);
    let mut miss = base.clone();
    miss.run.as_mut().unwrap().hero.bulwark_t = 30;
    miss = p2_enemy(&miss, mi, false, false);
    assert_eq!(miss.run.as_ref().unwrap().hero.hp, 1000);
    assert!(miss.run.as_ref().unwrap().hero.advanced.is_none());
    let mut plain = p2_enemy(&base, mi, true, false);
    assert!(plain.run.as_ref().unwrap().hero.hp < 1000);
    assert!(plain.run.as_ref().unwrap().hero.advanced.is_none());
    let mut hazard = base.clone();
    {
        let (r, mut cx) = hazard.ctx();
        r.hero.bulwark_t = 30;
        crate::turn::place_overlay(
            r,
            &mut cx,
            r.hero.pos,
            0,
            crate::tiles::OverlayKind::Gas,
            30,
        );
    }
    for _ in 0..10 {
        hazard.tick();
    }
    assert!(hazard.run.as_ref().unwrap().hero.hp < 1000);
    assert!(hazard
        .events
        .iter()
        .any(|e| matches!(e,Ev::Hurt {id,dmg,cause,..} if *id==HERO_ID&&*dmg>0&&cause=="gas")));
    assert!(hazard.run.as_ref().unwrap().hero.advanced.is_none());
    // A Goblin's whole roll is blunted by Bulwark3 before interception.
    // The real stronger attacker leaves damage for an actual pet draw.
    let mut pet = arena(Class::Fighter, &[6]);
    let mi = foe(&mut pet, "ogre", 5, 5);
    let c = crate::wire::Companion {
        id: 7000001,
        kind: "goblin".into(),
        name: "Guard".into(),
        level: 1,
        tags: vec![],
        gen: 0,
        rules: crate::rules::RuleSet::default(),
        max_rows: 2,
        hp: 100,
        max_hp: 100,
        life: Default::default(),
    };
    {
        let r = pet.run.as_mut().unwrap();
        r.hero.bulwark_t = 30;
        r.pets.on = true;
        let mut m = crate::engine::companion_monster(500, &c, Pos::new(5, 6));
        m.hp = 1000;
        m.max_hp = 1000;
        r.monsters.push(m);
        r.companions.push(c);
    }
    pet = p2_enemy(&pet, mi, true, true);
    assert_eq!(pet.run.as_ref().unwrap().hero.hp, 1000);
    assert!(pet.run.as_ref().unwrap().monsters[1].hp < 1000);
    assert!(pet.run.as_ref().unwrap().hero.advanced.is_none());
    // Every excluded context still permits an actual healing Wind, without
    // rewarding a nonexistent preceding block.
    for g in [&mut miss, &mut plain, &mut hazard, &mut pet] {
        g.run.as_mut().unwrap().hero.hp = 500;
        g.run.as_mut().unwrap().hero.bash_cd = 50;
        assert!(act(g, "second_wind"));
        assert!(g.run.as_ref().unwrap().hero.hp > 500);
        assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 50);
        p2_no_receipt(g, &[6]);
    }
}
#[test]
fn priority2_bash_cleave_and_safe_wind_require_their_actual_qualifying_targets() {
    let mut nonboss = arena(Class::Fighter, &[7, 9]);
    foe(&mut nonboss, "goblin", 5, 5);
    let nonboss = p2_roll(&nonboss, "shield_bash", true);
    assert!(nonboss.run.as_ref().unwrap().monsters[0].hp < 1000);
    p2_no_receipt(&nonboss, &[7, 9]);
    let mut boss = arena(Class::Fighter, &[7, 9]);
    foe(&mut boss, "bloat_mother", 5, 5);
    boss.run
        .as_mut()
        .unwrap()
        .hero
        .weapon
        .as_mut()
        .unwrap()
        .enchant = 0;
    let boss = p2_roll(&boss, "shield_bash", false);
    assert_eq!(boss.run.as_ref().unwrap().monsters[0].hp, 1000);
    assert!(
        boss.run.as_ref().unwrap().hero.bash_cd > 0,
        "actual miss still spent Bash cooldown"
    );
    p2_no_receipt(&boss, &[7, 9]);
    let mut cleave = arena(Class::Fighter, &[8]);
    foe(&mut cleave, "goblin", 5, 5);
    cleave.run.as_mut().unwrap().hero.bash_cd = 50;
    assert!(act(&mut cleave, "cleave"));
    assert_eq!(
        cleave
            .events
            .iter()
            .filter(
                |e| matches!(e,Ev::Hurt {id,dmg,cause,..} if *id!=HERO_ID&&*dmg>0&&cause=="hero")
            )
            .count(),
        1
    );
    assert_eq!(cleave.run.as_ref().unwrap().hero.bash_cd, 50);
    p2_no_receipt(&cleave, &[8]);
    let mut wind = arena(Class::Fighter, &[10]);
    foe(&mut wind, "goblin", 7, 5);
    wind.run.as_mut().unwrap().hero.hp = 500;
    assert!(act(&mut wind, "second_wind"));
    assert!(wind.run.as_ref().unwrap().hero.hp > 500);
    assert!(crate::class_advanced::charge(wind.run.as_ref().unwrap(), Combo::Holdfast).is_none());
    p2_no_receipt(&wind, &[10]);
}
#[test]
fn priority2_exact_quarter_ambush_and_actual_missed_low_hp_finish_do_not_arm_silent() {
    let mut exact = arena(Class::Rogue, &[11]);
    let mi = foe(&mut exact, "goblin", 5, 5);
    exact.run.as_mut().unwrap().monsters[mi].hp = 250;
    exact.run.as_mut().unwrap().hero.vanish_t = 30;
    let exact = p2_roll(&exact, "ambush", true);
    assert!(exact.run.as_ref().unwrap().monsters[mi].hp < 250);
    p2_no_receipt(&exact, &[11]);
    let mut missed = arena(Class::Rogue, &[6, 11]);
    let mi = foe(&mut missed, "goblin", 5, 5);
    {
        let r = missed.run.as_mut().unwrap();
        r.monsters[mi].hp = 1;
        r.hero.vanish_t = 30;
        r.hero.weapon.as_mut().unwrap().enchant = 0;
    }
    let missed = p2_roll(&missed, "ambush", false);
    assert_eq!(missed.run.as_ref().unwrap().monsters[mi].hp, 1);
    p2_no_receipt(&missed, &[6, 11]);
    for missed in [false, true] {
        let mut quiver = arena(Class::Ranger, &[7]);
        let mi = foe(&mut quiver, "goblin", 6, 5);
        {
            let r = quiver.run.as_mut().unwrap();
            r.monsters[mi].hp = 200;
            r.hero.double_cd = 40;
            if missed {
                r.hero.weapon.as_mut().unwrap().enchant = 0;
            }
        }
        let quiver = p2_roll(&quiver, "shoot", !missed);
        assert!(
            quiver.run.as_ref().unwrap().monsters[mi].hp > 0,
            "no actual kill"
        );
        assert_eq!(quiver.run.as_ref().unwrap().hero.double_cd, 40);
        p2_no_receipt(&quiver, &[7]);
    }
}
#[test]
fn priority2_unmarked_and_naturally_expired_marks_do_not_reward_actual_traps() {
    for expire in [false, true] {
        let mut g = arena(Class::Ranger, &[6, 10]);
        let mi = foe(&mut g, "goblin", 6, 5);
        g.run.as_mut().unwrap().hero.double_cd = 40;
        if expire {
            assert!(act(&mut g, "mark"));
            assert!(g.run.as_ref().unwrap().monsters[mi].marked > 0);
            while g.run.as_ref().unwrap().monsters[mi].marked > 0 {
                g.tick();
            }
            while g.run.as_ref().unwrap().hero.double_cd > 0 {
                g.tick();
            }
            assert!(act(&mut g, "double_shot"));
            assert!(g.run.as_ref().unwrap().hero.double_cd > 20);
        }
        assert!(act(&mut g, "trap"));
        let cd = g.run.as_ref().unwrap().hero.double_cd;
        g.events.clear();
        let before = g.run.as_ref().unwrap().items.len();
        {
            let (r, mut cx) = g.ctx();
            move_monster(r, &mut cx, mi, Pos::new(5, 5));
        }
        assert_eq!(
            g.run.as_ref().unwrap().items.len() + 1,
            before,
            "actual physical trap consumed"
        );
        assert_eq!(g.run.as_ref().unwrap().monsters[mi].stun, 20);
        assert_eq!(g.run.as_ref().unwrap().monsters[mi].marked, 0);
        assert_eq!(g.run.as_ref().unwrap().hero.double_cd, cd);
        p2_no_receipt(&g, &[6, 10]);
    }
}
#[test]
fn priority2_single_damaged_volley_and_nova_do_not_arm_multi_target_paths() {
    for class in [Class::Ranger, Class::Caster] {
        let (bits, verb, combo) = if class == Class::Ranger {
            (vec![8, 9, 11], "volley", Combo::CorridorVolley)
        } else {
            (vec![7], "nova", Combo::StormCell)
        };
        let mut g = arena(class, &bits);
        let mi = foe(&mut g, "goblin", 5, 5);
        if class == Class::Ranger {
            assert!(act(&mut g, "mark"));
            assert!(g.run.as_ref().unwrap().monsters[mi].marked > 0);
            g.events.clear();
        }
        assert!(act(&mut g, verb));
        let targets: std::collections::BTreeSet<_> = g
            .events
            .iter()
            .filter_map(|e| match e {
                Ev::Hurt { id, dmg, cause, .. }
                    if *id != HERO_ID
                        && *dmg > 0
                        && cause
                            == if class == Class::Caster {
                                "fire"
                            } else {
                                "hero"
                            } =>
                {
                    Some(*id)
                }
                _ => None,
            })
            .collect();
        assert_eq!(
            targets.len(),
            1,
            "{verb} actually damaged exactly one recipient"
        );
        assert!(crate::class_advanced::charge(g.run.as_ref().unwrap(), combo).is_none());
        p2_no_receipt(&g, &bits);
    }
}
#[test]
fn priority2_unwarded_expired_ward_unslowed_and_nonboss_spells_stay_ordinary() {
    for expired in [false, true] {
        let mut g = arena(Class::Caster, &[8]);
        let mi = foe(&mut g, "goblin", 6, 5);
        if expired {
            assert!(act(&mut g, "ward"));
            while g.run.as_ref().unwrap().hero.ward_t > 0 {
                g.tick();
            }
        }
        g.events.clear();
        assert!(act(&mut g, "slow"));
        assert_eq!(
            g.run.as_ref().unwrap().monsters[mi].slow_t,
            30,
            "actual ordinary Slow"
        );
        p2_no_receipt(&g, &[8]);
    }
    for boss in [false, true] {
        let mut g = arena(Class::Caster, &[6, 10]);
        let mi = foe(&mut g, if boss { "bloat_mother" } else { "goblin" }, 5, 5);
        foe(&mut g, "goblin", 6, 5);
        if !boss {
            assert!(act(&mut g, "slow"));
        }
        g.run.as_mut().unwrap().hero.ward_cd = 50;
        g.events.clear();
        let g = p2_roll(&g, "bolt", true);
        assert!(g.run.as_ref().unwrap().monsters[mi].hp < 1000);
        assert_eq!(g.run.as_ref().unwrap().hero.ward_cd, 50);
        assert_eq!(g.run.as_ref().unwrap().monsters[1].slow_t, 0);
        p2_no_receipt(&g, &[6, 10]);
    }
}
#[test]
fn priority2_actual_unprepared_nonboss_missed_and_nonkill_gun_hits_do_not_reward() {
    for (boss, prepared, hit) in [
        (true, false, true),
        (false, true, true),
        (true, false, false), // Prepared shots canonically hit100%; no invented miss.
    ] {
        let mut g = arena(Class::Gunner, &[6, 10]);
        let mi = foe(&mut g, if boss { "bloat_mother" } else { "goblin" }, 6, 5);
        if !hit {
            g.run
                .as_mut()
                .unwrap()
                .hero
                .weapon
                .as_mut()
                .unwrap()
                .enchant = 0;
        }
        if prepared {
            assert!(act(&mut g, "aimed_shot"));
        }
        let g = p2_roll(&g, "fire", hit);
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
            "real shot spent its chamber, no recovery"
        );
        assert!(g.run.as_ref().unwrap().monsters[mi].hp > 0, "no kill");
        p2_no_receipt(&g, &[6, 10]);
    }
    let mut burst = arena(Class::Gunner, &[9, 11]);
    {
        let r = burst.run.as_mut().unwrap();
        r.hero.weapon = Some(Item::new(crate::kit::WEAPON_ID, "short_gun")).into();
        r.hero.weapon.as_mut().unwrap().enchant = 20;
        r.gun_skills.get_or_insert_with(Default::default).fast_ready = 100;
    }
    let mi = foe(&mut burst, "goblin", 5, 5);
    let burst = p2_roll(&burst, "close_burst", true);
    assert!(burst.run.as_ref().unwrap().monsters[mi].hp > 0);
    assert_eq!(
        burst
            .run
            .as_ref()
            .unwrap()
            .gun_skills
            .as_ref()
            .unwrap()
            .fast_ready,
        100
    );
    p2_no_receipt(&burst, &[9, 11]);
}
#[test]
fn priority2_ordinary_reload_no_new_blind_and_lost_original_gun_cannot_arm() {
    let mut ordinary = arena(Class::Gunner, &[7]);
    foe(&mut ordinary, "goblin", 6, 5);
    empty_gun(&mut ordinary);
    scheduled(&mut ordinary, "reload");
    finish_reload(&mut ordinary);
    assert_eq!(
        ordinary
            .run
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
    p2_no_receipt(&ordinary, &[7]);
    let mut blind = arena(Class::Gunner, &[8]);
    let mi = foe(&mut blind, "goblin", 5, 5);
    blind.run.as_mut().unwrap().monsters[mi].blind = 40;
    let pos = blind.run.as_ref().unwrap().hero.pos;
    assert!(act(&mut blind, "smoke_retreat"));
    assert_ne!(
        blind.run.as_ref().unwrap().hero.pos,
        pos,
        "actual legal Smoke movement"
    );
    assert_eq!(blind.run.as_ref().unwrap().monsters[mi].blind, 40);
    p2_no_receipt(&blind, &[8]);
    let mut lost = arena(Class::Gunner, &[7, 8]);
    foe(&mut lost, "goblin", 5, 5);
    empty_gun(&mut lost);
    scheduled(&mut lost, "fast_reload");
    scheduled(&mut lost, "smoke_retreat");
    let smoke = p1_charge(&lost, Combo::SmokeWalk);
    assert_eq!(smoke.remaining, 1);
    let mut owned = lost.clone();
    lost.events.clear();
    owned.events.clear();
    // Controlled ownership interruption after a real reload prefix. The
    // engine's real drop helper preserves the original physical gun clock.
    let item = lost.run.as_mut().unwrap().hero.weapon.take().unwrap();
    let id = item.id;
    {
        let r = lost.run.as_mut().unwrap();
        crate::turn::drop_near(r, r.hero.pos, item);
    }
    finish_reload(&mut lost);
    finish_reload(&mut owned);
    assert!(lost.run.as_ref().unwrap().gun_reload.is_none());
    let gun = lost
        .run
        .as_ref()
        .unwrap()
        .items
        .iter()
        .find(|w| w.item.id == id)
        .unwrap();
    assert_eq!(
        gun.item.firearm.unwrap().loaded,
        1,
        "unowned original gun physically completes"
    );
    p2_no_receipt(&lost, &[7, 8]);
    assert_eq!(
        p1_charge(&lost, Combo::SmokeWalk),
        smoke,
        "unowned completion cannot consume the owner's live charge"
    );
    assert_eq!(receipt(&owned, 8, Phase::Applied, Effect::Energy), vec![50]);
    assert_eq!(p1_charge(&owned, Combo::SmokeWalk).remaining, 0);
    let total = |g: &Game| {
        let r = g.run.as_ref().unwrap();
        i64::from(r.hero.energy) + i64::from(r.actions) * i64::from(crate::engine::ACT_ENERGY)
    };
    assert_eq!(
        total(&owned) - total(&lost),
        50,
        "same physical completion: only actual owner receives refund"
    );
}

#[test]
fn priority2_real_charged_nonkill_or_miss_never_earns_execution_or_long_watch() {
    for hit in [true, false] {
        let mut g = arena(Class::Fighter, &[9, 11]);
        let mi = foe(&mut g, "bloat_mother", 5, 5);
        assert!(act(&mut g, "shield_bash"));
        assert!(
            crate::class_advanced::charge(g.run.as_ref().unwrap(), Combo::SiegeRhythm).is_some()
        );
        g.events.clear();
        if hit {
            hit_verb(&mut g, "attack");
            assert_eq!(receipt(&g, 9, Phase::Applied, Effect::Damage), vec![2]);
        } else {
            g.run
                .as_mut()
                .unwrap()
                .hero
                .weapon
                .as_mut()
                .unwrap()
                .enchant = 0;
            g = p2_roll(&g, "attack", false);
        }
        assert!(g.run.as_ref().unwrap().monsters[mi].hp > 0);
        assert_eq!(p1_charge(&g, Combo::SiegeRhythm).remaining, 0);
        assert_eq!(g.run.as_ref().unwrap().hero.bash_cd, 50);
        p2_no_receipt(&g, &[11]);
    }
    let mut g = arena(Class::Gunner, &[7, 10]);
    let mi = foe(&mut g, "bloat_mother", 6, 5);
    empty_gun(&mut g);
    scheduled(&mut g, "fast_reload");
    finish_reload(&mut g);
    scheduled(&mut g, "aimed_shot");
    assert_eq!(receipt(&g, 7, Phase::Applied, Effect::AimSettle), vec![1]);
    assert!(
        g.run
            .as_ref()
            .unwrap()
            .hero
            .advanced
            .as_ref()
            .unwrap()
            .aim
            .as_ref()
            .unwrap()
            .shortened
    );
    g.events.clear();
    let before = g.run.as_ref().unwrap().monsters[mi].hp;
    assert!(act(&mut g, "fire")); // Prepared fire canonically hits100%.
    let hp = g.run.as_ref().unwrap().monsters[mi].hp;
    assert!(
        hp > 0 && hp < before,
        "real charged prepared shot damaged but did not kill"
    );
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
    assert!(crate::class_advanced::charge(g.run.as_ref().unwrap(), Combo::LongWatch).is_none());
    p2_no_receipt(&g, &[10]);
}

#[test]
fn priority2_unwarded_or_naturally_expired_cast_cannot_shatter_or_credit_absorption() {
    for expired in [false, true] {
        let mut g = arena(Class::Caster, &[9, 11]);
        let mi = foe(&mut g, "goblin", 5, 5);
        if expired {
            assert!(act(&mut g, "ward"));
            assert!(g
                .run
                .as_ref()
                .unwrap()
                .hero
                .advanced
                .as_ref()
                .unwrap()
                .ward
                .is_some());
            while g.run.as_ref().unwrap().hero.ward_t > 0 {
                g.tick();
            }
        }
        g.run.as_mut().unwrap().hero.blink_cd = 50;
        g.events.clear();
        let hp = g.run.as_ref().unwrap().hero.hp;
        enemy_hit(&mut g, mi, "attack");
        assert!(
            g.run.as_ref().unwrap().hero.hp < hp,
            "actual unwarded incoming HP damage"
        );
        assert_eq!(g.run.as_ref().unwrap().hero.blink_cd, 50);
        let before = g.run.as_ref().unwrap().monsters[mi].hp;
        assert!(act(&mut g, "nova"));
        assert!(
            g.run.as_ref().unwrap().monsters[mi].hp < before,
            "actual Nova damage"
        );
        assert_eq!(g.run.as_ref().unwrap().hero.nova_cd, 150);
        assert_eq!(g.run.as_ref().unwrap().hero.ward_t, 0);
        p2_no_receipt(&g, &[9, 11]);
    }
}

// Priority3 routing. Direct verb calls are controlled component actions, not
// evidence of natural scheduler cadence or earned progression.
fn p3_exact(
    g: &Game,
    bit: u32,
    phase: Phase,
    effect: Effect,
    expected: &[(u32, i32, Option<u32>, Option<u32>)],
) {
    let node = &crate::class_tree::catalogue(g.run.as_ref().unwrap().hero.class)[bit as usize];
    let id = format!("path:{}", node.id);
    let actual = g
        .events
        .iter()
        .filter_map(|e| match e {
            Ev::ClassInteraction {
                t,
                src,
                dst,
                skill,
                phase: p,
                effect: f,
                amount,
                expires_t,
            } if skill.id == id && *p == phase && *f == effect => {
                assert_eq!(*src, HERO_ID, "actual canonical actor");
                assert_eq!(skill.name, node.name, "canonical authored name");
                Some((*t, *amount, *dst, *expires_t))
            }
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(
        actual, expected,
        "{id} exact {phase:?}/{effect:?} time/amount/recipient/absolute expiry"
    );
}
fn p3_arg(g: &mut Game, verb: &str, target: &str) -> bool {
    let (r, mut cx) = g.ctx();
    let v = view(r);
    try_verb(r, &mut cx, &Verb::arg(verb, target), &v)
}
fn p3_projectiles(g: &Game) -> Vec<u32> {
    g.events
        .iter()
        .filter_map(|e| match e {
            Ev::Projectile { src, dst, .. } if *src == HERO_ID => Some(*dst),
            _ => None,
        })
        .collect()
}
#[test]
fn priority3_all_fourteen_real_arms_name_the_actor_original_target_and_absolute_expiry() {
    for (g, combo) in armed_charge_fixtures() {
        let r = g.run.as_ref().unwrap();
        let c = p1_charge(&g, combo);
        let ticks = if combo == Combo::Holdfast { 20 } else { 10 };
        let count = if combo == Combo::Holdfast { 2 } else { 1 };
        let dst = match combo {
            Combo::Oathguard
            | Combo::SiegeRhythm
            | Combo::Afterimage
            | Combo::SilentFinish
            | Combo::LongWatch => Some(r.monsters[0].id),
            _ => None,
        };
        assert_eq!(
            c.target, dst,
            "{combo:?} actual prefix victim, not inferred current target"
        );
        assert_eq!(
            c.expires_t,
            r.turn + ticks,
            "{combo:?} absolute contract window"
        );
        assert_eq!(c.source >> 32, u64::from(r.turn), "actual arm tick");
        assert!(
            (c.source as u32) <= r.actions,
            "source never names a future action"
        );
        assert_eq!(c.remaining, count);
        let (bit, effect) = p1_meta(combo);
        p3_exact(
            &g,
            bit,
            Phase::Armed,
            effect,
            &[(r.turn, i32::from(count), dst, Some(r.turn + ticks))],
        );
    }
}
#[test]
fn priority3_three_actual_volley_recipients_copy_mark_to_exactly_one_real_victim() {
    let mut g = arena(Class::Ranger, &[9, 11]);
    foe(&mut g, "goblin", 6, 5);
    foe(&mut g, "goblin", 7, 5);
    let third = foe(&mut g, "goblin", 8, 5);
    assert!(act(&mut g, "mark"));
    assert!(act(&mut g, "volley"));
    let r = g.run.as_ref().unwrap();
    let ids = r.monsters.iter().map(|m| m.id).collect::<Vec<_>>();
    assert_eq!(
        p3_projectiles(&g),
        ids,
        "three actual projectiles in ray order"
    );
    assert!(r.monsters.iter().all(|m| m.hp < 1000));
    assert_eq!(r.monsters[0].marked, 30);
    assert_eq!(r.monsters[1].marked, 20);
    assert_eq!(r.monsters[third].marked, 0);
    assert_eq!(
        r.monsters.iter().filter(|m| m.advanced_mark_copy).count(),
        1
    );
    p3_exact(
        &g,
        9,
        Phase::Applied,
        Effect::Mark,
        &[(r.turn, 20, Some(ids[1]), None)],
    );
    p3_exact(
        &g,
        11,
        Phase::Armed,
        Effect::Energy,
        &[(r.turn, 1, None, Some(r.turn + 10))],
    );
}
#[test]
fn priority3_actual_bolt_on_copied_boss_slow_cannot_chain_b_to_c_but_fresh_cast_can() {
    let mut g = arena(Class::Caster, &[6, 10]);
    let a = foe(&mut g, "bloat_mother", 5, 5);
    let b = foe(&mut g, "bloat_mother", 6, 5);
    let c = foe(&mut g, "bloat_mother", 7, 5);
    assert!(act(&mut g, "slow"));
    hit_verb(&mut g, "bolt");
    let bid = g.run.as_ref().unwrap().monsters[b].id;
    let cid = g.run.as_ref().unwrap().monsters[c].id;
    p3_exact(
        &g,
        10,
        Phase::Applied,
        Effect::Slow,
        &[(0, 10, Some(bid), None)],
    );
    assert_eq!(g.run.as_ref().unwrap().monsters[b].slow_t, 10);
    assert!(g.run.as_ref().unwrap().monsters[b].advanced_slow.is_none());
    // Controlled target routing via actual monster movement, not a new cast
    // or forged source marker. The copied recipient is itself a boss.
    {
        let (r, mut cx) = g.ctx();
        move_monster(r, &mut cx, a, Pos::new(4, 8));
    }
    g.events.clear();
    let hp = g.run.as_ref().unwrap().monsters[b].hp;
    hit_verb(&mut g, "bolt");
    assert!(g
        .events
        .iter()
        .any(|e| matches!(e,Ev::Attack {src,dst,hit:true,..} if *src==HERO_ID&&*dst==bid)));
    assert!(g.run.as_ref().unwrap().monsters[b].hp < hp);
    assert_eq!(g.run.as_ref().unwrap().monsters[c].slow_t, 0);
    p3_exact(&g, 10, Phase::Applied, Effect::Slow, &[]);
    while g.run.as_ref().unwrap().monsters[b].slow_t > 0 {
        g.tick();
    }
    assert!(act(&mut g, "slow"));
    assert!(g.run.as_ref().unwrap().monsters[b].advanced_slow.is_some());
    g.events.clear();
    hit_verb(&mut g, "bolt");
    assert_eq!(
        g.run.as_ref().unwrap().monsters[c].slow_t,
        10,
        "fresh actual B cast legitimately permits C copy"
    );
    let t = g.run.as_ref().unwrap().turn;
    p3_exact(
        &g,
        10,
        Phase::Applied,
        Effect::Slow,
        &[(t, 10, Some(cid), None)],
    );
}
fn p3_storm() -> Game {
    let mut g = arena(Class::Caster, &[7]);
    foe(&mut g, "goblin", 5, 5);
    foe(&mut g, "goblin", 4, 6);
    assert!(act(&mut g, "nova"));
    assert!(crate::class_advanced::charge(g.run.as_ref().unwrap(), Combo::StormCell).is_some());
    g.events.clear();
    g
}
#[test]
fn priority3_storm_actual_primary_hit_respects_wall_offline_hidden_and_range() {
    for condition in ["wall", "off_line", "hidden", "range"] {
        let mut g = p3_storm();
        let (x, y) = match condition {
            "wall" => (7, 5),
            "off_line" => (6, 6),
            "range" => (11, 5),
            _ => (6, 5),
        };
        let other = foe(&mut g, "goblin", x, y);
        {
            let r = g.run.as_mut().unwrap();
            if condition == "wall" {
                r.floor.map.set(Pos::new(6, 5), Tile::Wall);
                r.floor.map.update_vision(r.hero.pos, 8);
                assert!(!r.floor.map.los(r.hero.pos, r.monsters[other].pos));
            }
            if condition == "hidden" {
                r.floor.map.update_vision(r.hero.pos, 1);
                assert!(!r.floor.map.is_visible(r.monsters[other].pos));
                assert!(r.floor.map.los(r.hero.pos, r.monsters[other].pos));
            }
            if condition == "range" {
                assert!(r.floor.map.is_visible(r.monsters[other].pos));
                assert!(r.monsters[other].pos.cheb(r.hero.pos) > BOW_RANGE);
            }
        }
        let primary = g.run.as_ref().unwrap().monsters[0].id;
        hit_verb(&mut g, "bolt");
        assert!(g.events.iter().any(|e|matches!(e,Ev::Attack {src,dst,hit:true,dmg,..} if *src==HERO_ID&&*dst==primary&&*dmg>=2)),"{condition} actual qualifying primary Bolt damage");
        assert_eq!(
            g.run.as_ref().unwrap().monsters[other].hp,
            1000,
            "{condition} candidate untouched"
        );
        assert_eq!(p3_projectiles(&g), vec![primary]);
        p3_exact(
            &g,
            7,
            Phase::Consumed,
            Effect::Damage,
            &[(0, 1, Some(primary), Some(10))],
        );
        p3_exact(&g, 7, Phase::Applied, Effect::Damage, &[]);
    }
}
#[test]
fn priority3_storm_secondary_reflection_uses_real_reflector_and_never_applies_bypass_damage() {
    let mut g = p3_storm();
    let other = foe(&mut g, "lich", 6, 5);
    assert!(g.run.as_ref().unwrap().monsters[other].reflects_ranged());
    let primary = g.run.as_ref().unwrap().monsters[0].id;
    let dst = g.run.as_ref().unwrap().monsters[other].id;
    hit_verb(&mut g, "bolt");
    assert_eq!(p3_projectiles(&g), vec![primary, dst]);
    let reflected = g
        .events
        .iter()
        .filter_map(|e| match e {
            Ev::Attack {
                src,
                dst: d,
                hit: true,
                dmg,
                verb: Some(v),
                ..
            } if *src == dst && *d == HERO_ID && v == "reflect" => Some(*dmg),
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(reflected.len(), 1);
    assert!(reflected[0] > 0);
    assert_eq!(g.run.as_ref().unwrap().hero.hp, 1000 - reflected[0]);
    assert_eq!(g.run.as_ref().unwrap().monsters[other].hp, 1000);
    p3_exact(
        &g,
        7,
        Phase::Consumed,
        Effect::Damage,
        &[(0, 1, Some(primary), Some(10))],
    );
    p3_exact(&g, 7, Phase::Applied, Effect::Damage, &[]);
}
#[test]
fn priority3_storm_primary_mirror_reflection_stops_before_secondary_projectile() {
    let mut g = arena(Class::Caster, &[7]);
    let king = foe(&mut g, "mirror_king", 5, 5);
    scheduled(&mut g, "bolt");
    scheduled(&mut g, "bolt");
    assert_eq!(
        g.run.as_ref().unwrap().verb_ring,
        vec!["bolt", "bolt"],
        "actual two scheduled previous casts"
    );
    foe(&mut g, "goblin", 4, 6);
    // Direct component Nova creates the actual charge; unlike a scheduled
    // Nova this deliberately does not replace the controlled rhythm context.
    // This is branch coverage, never a claimed natural full-action cadence.
    assert!(act(&mut g, "nova"));
    let extra = foe(&mut g, "goblin", 6, 5);
    let extra_id = g.run.as_ref().unwrap().monsters[extra].id;
    let t = g.run.as_ref().unwrap().turn;
    let expires = p1_charge(&g, Combo::StormCell).expires_t;
    let id = g.run.as_ref().unwrap().monsters[king].id;
    let before = g.run.as_ref().unwrap().monsters[king].hp;
    let other = g.run.as_ref().unwrap().monsters[1].hp;
    let hp = g.run.as_ref().unwrap().hero.hp;
    let original = g.clone();
    let mut found = None;
    for seed in 0..128 {
        let mut b = g.clone();
        b.events.clear();
        b.run.as_mut().unwrap().rng = Rng::new(seed);
        assert!(p3_arg(&mut b, "bolt", "tag:boss"));
        if b.events.iter().any(|e|matches!(e,Ev::Attack {src,dst,hit:true,verb:Some(v),..} if *src==id&&*dst==HERO_ID&&v=="mirror")) {found=Some(b);break;}
    }
    let g = found.expect("actual primary reflected hit");
    assert!(g.run.as_ref().unwrap().hero.hp < hp);
    assert!(
        g.run.as_ref().unwrap().monsters[king].hp >= before,
        "ordinary Mirror healing preserved"
    );
    assert_eq!(g.run.as_ref().unwrap().monsters[1].hp, other);
    assert_eq!(g.run.as_ref().unwrap().monsters[extra].hp, 1000);
    assert_eq!(p3_projectiles(&g), vec![id]);
    p3_exact(
        &g,
        7,
        Phase::Consumed,
        Effect::Damage,
        &[(t, 1, Some(id), Some(expires))],
    );
    p3_exact(&g, 7, Phase::Applied, Effect::Damage, &[]);
    // A real scheduled Hold breaks the rhythm in a separate fork while the
    // same charge remains active. Its Bolt must reach the eligible extra foe.
    let mut control = original;
    scheduled(&mut control, "hold");
    assert_eq!(
        control.run.as_ref().unwrap().verb_ring.last().unwrap(),
        "hold"
    );
    let mut positive = None;
    for seed in 0..128 {
        let mut b = control.clone();
        b.events.clear();
        b.run.as_mut().unwrap().rng = Rng::new(seed);
        assert!(p3_arg(&mut b, "bolt", "tag:boss"));
        if b.events.iter().any(|e| matches!(e, Ev::Attack {src,dst,hit:true,dmg,..} if *src==HERO_ID&&*dst==id&&*dmg>=2)) {
            positive = Some(b);
            break;
        }
    }
    let control = positive.expect("actual unreflected primary hit");
    assert_eq!(p3_projectiles(&control), vec![id, extra_id]);
    let applied = 1000 - control.run.as_ref().unwrap().monsters[extra].hp;
    assert!(
        applied > 0,
        "same eligible secondary is actually reached without reflection"
    );
    let now = control.run.as_ref().unwrap().turn;
    p3_exact(
        &control,
        7,
        Phase::Applied,
        Effect::Damage,
        &[(now, applied, Some(extra_id), None)],
    );
}
#[test]
fn priority3_corridor_one_charge_is_spent_once_across_two_actual_projectiles() {
    let (mut g, _) = armed_charge_fixtures()
        .into_iter()
        .find(|(_, c)| *c == Combo::CorridorVolley)
        .unwrap();
    let charge = p1_charge(&g, Combo::CorridorVolley);
    let id = g.run.as_ref().unwrap().monsters[0].id;
    g.events.clear();
    assert!(act(&mut g, "double_shot"));
    assert_eq!(p3_projectiles(&g), vec![id, id]);
    assert_eq!(p1_charge(&g, Combo::CorridorVolley).remaining, 0);
    p3_exact(
        &g,
        8,
        Phase::Consumed,
        Effect::Range,
        &[(0, 1, Some(id), Some(charge.expires_t))],
    );
    p3_exact(&g, 8, Phase::Applied, Effect::Range, &[]); // Neither normal-range arrow needed extension.
    for m in &mut g.run.as_mut().unwrap().monsters {
        m.dormant = true;
    }
    let far = foe(&mut g, "goblin", 11, 5);
    g.events.clear();
    let pos = g.run.as_ref().unwrap().hero.pos;
    assert!(act(&mut g, "shoot"));
    assert_ne!(
        g.run.as_ref().unwrap().hero.pos,
        pos,
        "spent range actually approaches"
    );
    assert_eq!(g.run.as_ref().unwrap().monsters[far].hp, 1000);
    assert!(p3_projectiles(&g).is_empty());
}
fn p3_guard(combo: Combo) -> Game {
    let bit = if combo == Combo::Oathguard { 7 } else { 10 };
    let mut g = arena(Class::Fighter, &[bit]);
    foe(&mut g, "bloat_mother", 5, 5);
    if combo == Combo::Oathguard {
        assert!(act(&mut g, "shield_bash"));
    } else {
        g.run.as_mut().unwrap().hero.hp = 500;
        assert!(act(&mut g, "second_wind"));
    }
    g.events.clear();
    g
}
#[test]
fn priority3_guard_routes_to_different_real_attacker_and_caps_actual_one_two_five_damage() {
    for combo in [Combo::Oathguard, Combo::Holdfast] {
        for raw in [1, 2, 5] {
            let mut g = p3_guard(combo);
            let origin = p1_charge(&g, combo);
            let attacker = foe(&mut g, "goblin", 5, 6);
            g.run.as_mut().unwrap().monsters[attacker].atk = (raw, raw);
            let id = g.run.as_ref().unwrap().monsters[attacker].id;
            assert_ne!(origin.target, Some(id));
            let hp = g.run.as_ref().unwrap().hero.hp;
            enemy_hit(&mut g, attacker, "attack");
            assert!(g.events.iter().any(|e|matches!(e,Ev::Attack {src,dst,hit:true,dmg,..} if *src==id&&*dst==HERO_ID&&*dmg==raw)));
            let applied = raw.min(2);
            assert_eq!(g.run.as_ref().unwrap().hero.hp, hp - (raw - applied));
            assert_eq!(p1_charge(&g, combo).remaining, origin.remaining - 1);
            let (bit, effect) = p1_meta(combo);
            p3_exact(
                &g,
                bit,
                Phase::Consumed,
                effect,
                &[(0, 1, Some(id), Some(origin.expires_t))],
            );
            p3_exact(
                &g,
                bit,
                Phase::Applied,
                effect,
                &[(0, applied, Some(id), None)],
            );
        }
    }
}
#[test]
fn priority3_active_guard_ignores_actual_ranged_hit_and_pet_interception() {
    for combo in [Combo::Oathguard, Combo::Holdfast] {
        let mut g = p3_guard(combo);
        let attacker = foe(&mut g, "goblin", 5, 6);
        g.run.as_mut().unwrap().monsters[attacker].atk = (5, 5);
        let charge = p1_charge(&g, combo);
        let hp = g.run.as_ref().unwrap().hero.hp;
        let mut ranged = g.clone();
        enemy_hit(&mut ranged, attacker, "shoot");
        assert_eq!(ranged.run.as_ref().unwrap().hero.hp, hp - 5);
        assert_eq!(p1_charge(&ranged, combo), charge);
        p2_no_receipt(&ranged, &[p1_meta(combo).0]);
        let c = crate::wire::Companion {
            id: 7000001,
            kind: "goblin".into(),
            name: "Guard".into(),
            level: 1,
            tags: vec![],
            gen: 0,
            rules: crate::rules::RuleSet::default(),
            max_rows: 2,
            hp: 100,
            max_hp: 100,
            life: Default::default(),
        };
        {
            let r = g.run.as_mut().unwrap();
            r.pets.on = true;
            let mut m = crate::engine::companion_monster(500, &c, Pos::new(6, 6));
            m.hp = 1000;
            m.max_hp = 1000;
            r.monsters.push(m);
            r.companions.push(c);
        }
        let pet = g.run.as_ref().unwrap().monsters.len() - 1;
        let g = p2_enemy(&g, attacker, true, true);
        assert_eq!(g.run.as_ref().unwrap().hero.hp, hp);
        assert_eq!(g.run.as_ref().unwrap().monsters[pet].hp, 995);
        assert_eq!(p1_charge(&g, combo), charge);
        p2_no_receipt(&g, &[p1_meta(combo).0]);
    }
}

#[test]
fn priority3_actual_reload_arm_source_precedes_same_tick_followup_action() {
    let mut g = arena(Class::Gunner, &[7]);
    foe(&mut g, "goblin", 6, 5);
    empty_gun(&mut g);
    scheduled(&mut g, "fast_reload");
    let at = g.run.as_ref().unwrap().gun_reload.unwrap().at;
    while g.run.as_ref().unwrap().turn + 1 < at {
        g.tick();
    }
    let actions_before = g.run.as_ref().unwrap().actions;
    g.events.clear();
    g.tick();
    let r = g.run.as_ref().unwrap();
    let c = p1_charge(&g, Combo::ChamberChain);
    assert_eq!(r.turn, at);
    assert_eq!(
        c.source,
        (u64::from(at) << 32) | u64::from(actions_before),
        "actual physical completion occurs before this tick's hero followup"
    );
    assert_eq!(
        r.actions,
        actions_before + 1,
        "real same-tick scheduled Hold"
    );
    p3_exact(
        &g,
        7,
        Phase::Armed,
        Effect::AimSettle,
        &[(at, 1, None, Some(at + 10))],
    );
}
