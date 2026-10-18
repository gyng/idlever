//! Cut225 controlled arenas (labelled controlled: not earned progression proof).
use crate::{
    geom::Pos,
    hero::Class,
    item::Item,
    monster::Pending,
    rules::{Row, Verb},
    tiles::Tile,
    tools::*,
    wire::Ev,
    Game,
};

fn arena(class: Class, level: u32) -> Game {
    let mut g = crate::tests::arena();
    g.sim = true;
    crate::tests::rules(&mut g, vec![Row::new(vec![], Verb::new("hold"))]);
    let r = g.run.as_mut().unwrap();
    r.hero.class = class;
    r.hero.level = level;
    r.hero.weapon = Some(Item::new(900, class.starting_weapon())).into();
    r.hero.armour = None.into();
    r.hero.inv.clear();
    r.hero.str_bonus = 0;
    r.hero.gift = Default::default();
    r.hero.hp = 500;
    r.hero.max_hp = 500;
    r.tools = class.earned().then(Default::default);
    r.floor.map.update_vision(r.hero.pos, 8);
    g.events.clear();
    g
}

/// A sturdy goblin (index returned). `still`: stunned so it neither moves nor strikes.
fn foe(g: &mut Game, kind: &str, x: i32, y: i32, still: bool) -> usize {
    crate::tests::add_monster(g, kind, x, y);
    let r = g.run.as_mut().unwrap();
    let m = r.monsters.last_mut().unwrap();
    m.hp = 100;
    m.max_hp = 100;
    if still {
        m.stun = 1000;
    }
    r.monsters.len() - 1
}

fn act(g: &mut Game, verb: &str) -> bool {
    let (r, mut cx) = g.ctx();
    let v = crate::turn::view(r);
    crate::ai::try_verb(r, &mut cx, &Verb::new(verb), &v)
}

fn reason(g: &mut Game, verb: &str) -> &'static str {
    let (r, cx) = g.ctx();
    let v = crate::turn::view(r);
    crate::ai::block_reason(r, &cx, &Verb::new(verb), &v)
}

/// A refused verb returns false, names its Rust reason and changes nothing at all.
fn refused(g: &mut Game, verb: &str, why: &str) {
    let before = g.save();
    assert_eq!(reason(g, verb), why, "{verb}");
    assert!(!act(g, verb), "{verb} refused");
    assert_eq!(g.save(), before, "{verb} refusal is pure");
}

fn tools(g: &Game) -> &Tools {
    g.run.as_ref().unwrap().tools.as_ref().unwrap()
}

fn turn(g: &Game) -> u32 {
    g.run.as_ref().unwrap().turn
}

#[test]
fn original_classes_never_own_tools_and_refuse_purely() {
    for class in Class::ALL {
        let mut g = arena(class, 10);
        foe(&mut g, "goblin", 7, 5, true);
        assert!(g.run.as_ref().unwrap().tools.is_none());
        for verb in CLOWN_VERBS.iter().chain(ENGINEER_VERBS.iter()).chain(["clown_tactic", "engineer_tactic"].iter()) {
            refused(&mut g, verb, "class locked");
        }
        // The original ladders and defaults are untouched by the new enum entries.
        assert!(!crate::hero::class_ladder(class).iter().any(|(v, _)| is_verb(v)));
    }
}

#[test]
fn ladders_gate_each_ability_by_level() {
    let mut g = arena(Class::Clown, 1);
    foe(&mut g, "goblin", 5, 5, true);
    foe(&mut g, "goblin", 8, 5, true);
    for verb in ["turnabout", "false_bow", "curtain", "grand_jape"] {
        refused(&mut g, verb, "class locked");
    }
    let mut g = arena(Class::Engineer, 1);
    foe(&mut g, "goblin", 8, 5, true);
    for verb in ["brace_sentry", "discharge", "relocate", "overdrive"] {
        refused(&mut g, verb, "class locked");
    }
}

#[test]
fn bell_lure_places_one_visible_decoy_and_draws_future_movement() {
    let mut g = arena(Class::Clown, 1);
    refused(&mut g, "bell_lure", "no threat");
    let gi = foe(&mut g, "goblin", 10, 5, false);
    let t0 = turn(&g);
    assert!(act(&mut g, "bell_lure"));
    let d = tools(&g).decoy.unwrap();
    let hp = g.run.as_ref().unwrap().hero.pos;
    assert!((2..=LURE_RANGE).contains(&d.pos.cheb(hp)), "within visible range 4");
    assert!(g.run.as_ref().unwrap().floor.map.is_visible(d.pos));
    assert_eq!(d.until, t0 + LURE_TTL);
    assert_eq!(tools(&g).ready[0], t0 + LURE_COOLDOWN);
    assert!(g.events.iter().any(|e| matches!(e, Ev::Tool { kind, state, .. } if kind == "decoy" && state == "placed")));
    refused(&mut g, "bell_lure", "cooldown");
    // The goblin walks to the bell, not to the hero, and stops there.
    let start = g.run.as_ref().unwrap().monsters[gi].pos;
    for _ in 0..12 {
        g.tick();
    }
    let m = &g.run.as_ref().unwrap().monsters[gi];
    assert!(m.pos.cheb(d.pos) <= 1, "drawn to the decoy: {:?} -> {:?} (bell {:?})", start, m.pos, d.pos);
    assert!(m.pos.cheb(hp) > 1, "never reached the hero while lured");
    assert!(tools(&g).stats.lure_steps > 0);
    // Expiry on the exact tick, announced; the goblin then resumes its hunt.
    while turn(&g) < d.until {
        g.tick();
    }
    assert!(tools(&g).decoy.is_none());
    assert!(g.events.iter().any(|e| matches!(e, Ev::Tool { kind, state, t, .. } if kind == "decoy" && state == "expired" && *t == d.until)));
}

#[test]
fn bellkeeper_extends_lure_lifetime_by_five() {
    let mut g = arena(Class::Clown, 3);
    g.run.as_mut().unwrap().hero.class_skills = 1;
    foe(&mut g, "goblin", 10, 5, true);
    let t0 = turn(&g);
    assert!(act(&mut g, "bell_lure"));
    assert_eq!(tools(&g).decoy.unwrap().until, t0 + LURE_TTL + 5);
}

#[test]
fn lures_and_japes_never_erase_a_committed_strike() {
    let mut g = arena(Class::Clown, 9);
    let a = foe(&mut g, "goblin", 9, 5, true);
    let b = foe(&mut g, "goblin", 9, 8, true);
    {
        let r = g.run.as_mut().unwrap();
        r.monsters[a].pending = Some(Pending::HeavyHit);
        r.monsters[a].telegraph = Some("winds up".into());
    }
    assert!(act(&mut g, "bell_lure"));
    assert!(act(&mut g, "grand_jape"));
    let r = g.run.as_ref().unwrap();
    assert_eq!(r.monsters[a].pending, Some(Pending::HeavyHit));
    assert_eq!(r.monsters[a].telegraph.as_deref(), Some("winds up"));
    assert!(r.tools.as_ref().unwrap().japed.iter().any(|h| h.id == r.monsters[b].id));
}

#[test]
fn turnabout_answers_only_a_real_adjacent_melee_miss() {
    let mut g = arena(Class::Clown, 3);
    refused(&mut g, "turnabout", "no threat");
    let gi = foe(&mut g, "goblin", 5, 5, true);
    let def = g.run.as_ref().unwrap().monsters[gi].effective_def();
    let t0 = turn(&g);
    assert!(act(&mut g, "turnabout"));
    assert_eq!(tools(&g).counter_until, t0 + COUNTER_WINDOW);
    assert_eq!(tools(&g).ready[1], t0 + COUNTER_COOLDOWN);
    refused(&mut g, "turnabout", "cooldown");
    // A miss from a foe two tiles away is no adjacent miss.
    {
        let (r, mut cx) = g.ctx();
        r.monsters[gi].pos = Pos::new(6, 5);
        crate::tools::on_miss(r, &mut cx, gi);
        assert_eq!(r.monsters[gi].hp, 100);
        r.monsters[gi].pos = Pos::new(5, 5);
        crate::tools::on_miss(r, &mut cx, gi);
        assert_eq!(r.monsters[gi].hp, 100 - (COUNTER_DAMAGE - def).max(0), "exact counter damage after armour");
        // One punishing blow per real miss, `COUNTER_CHARGES` per window, then disarmed.
        let blow = (COUNTER_DAMAGE - def).max(0);
        for n in 2..=COUNTER_CHARGES as i32 {
            assert!(r.tools.as_ref().unwrap().counter_until > 0, "still armed before charge {n}");
            crate::tools::on_miss(r, &mut cx, gi);
            assert_eq!(r.monsters[gi].hp, 100 - n * blow);
        }
        assert_eq!(r.tools.as_ref().unwrap().counter_until, 0, "spent window disarms");
        crate::tools::on_miss(r, &mut cx, gi);
        assert_eq!(r.monsters[gi].hp, 100 - COUNTER_CHARGES as i32 * blow);
    }
    assert_eq!(tools(&g).stats.counters, COUNTER_CHARGES);
    assert!(g.events.iter().any(|e| matches!(e, Ev::Attack { verb: Some(v), hit: true, .. } if v == "counter")));
    assert!(g.events.iter().any(|e| matches!(e, Ev::Hurt { cause, .. } if cause == "counter")));
}

#[test]
fn turnabout_fires_from_real_ticks_on_misses_and_never_on_hits() {
    let mut g = arena(Class::Clown, 3);
    let gi = foe(&mut g, "goblin", 5, 5, false);
    g.run.as_mut().unwrap().monsters[gi].atk = (1, 1);
    let mut misses = 0;
    for _ in 0..3000 {
        if tools(&g).counter_until <= turn(&g) && tools(&g).ready[1] <= turn(&g) {
            assert!(act(&mut g, "turnabout"));
        }
        // Active while the acting tick is before the window's end.
        let armed = tools(&g).counter_until > turn(&g) + 1;
        let before = tools(&g).stats.counters;
        g.events.clear();
        g.tick();
        let miss = g.events.iter().any(|e| matches!(e, Ev::Attack { dst: crate::engine::HERO_ID, hit: false, .. }));
        let hit_only = g.events.iter().any(|e| matches!(e, Ev::Attack { dst: crate::engine::HERO_ID, hit: true, .. })) && !miss;
        let after = tools(&g).stats.counters;
        if hit_only {
            assert_eq!(after, before, "a hit never triggers the counter");
        }
        if miss && armed {
            misses += 1;
            assert_eq!(after, before + 1, "an armed real miss triggers once");
        }
        if g.run.as_ref().unwrap().monsters.iter().all(|m| m.hp <= 0) || misses >= 2 {
            break;
        }
    }
    assert!(misses >= 1, "a real miss happened in 3000 ticks: {:?} t{}", tools(&g).stats, turn(&g));
}

#[test]
fn false_bow_pauses_movement_with_boss_cap_and_no_chain_lock() {
    let mut g = arena(Class::Clown, 5);
    let gi = foe(&mut g, "goblin", 7, 5, false);
    let t0 = turn(&g);
    assert!(act(&mut g, "false_bow"));
    let id = g.run.as_ref().unwrap().monsters[gi].id;
    assert!(tools(&g).paused.contains(&Hold { id, until: t0 + BOW_PAUSE }));
    let p0 = g.run.as_ref().unwrap().monsters[gi].pos;
    while turn(&g) + 1 < t0 + BOW_PAUSE {
        g.tick();
    }
    assert_eq!(g.run.as_ref().unwrap().monsters[gi].pos, p0, "no movement while paused");
    // A boss: five ticks, then immune for BOSS_GUARD.
    let mut g = arena(Class::Clown, 5);
    let bi = foe(&mut g, "goblin_warlord", 7, 5, true);
    g.run.as_mut().unwrap().monsters[bi].pending = Some(Pending::Rally);
    let t0 = turn(&g);
    assert!(act(&mut g, "false_bow"));
    let r = g.run.as_ref().unwrap();
    let id = r.monsters[bi].id;
    assert!(tools(&g).paused.contains(&Hold { id, until: t0 + BOW_BOSS_PAUSE }));
    assert_eq!(r.monsters[bi].pending, Some(Pending::Rally), "telegraphed strike kept");
    g.run.as_mut().unwrap().tools.as_mut().unwrap().ready[2] = 0;
    g.run.as_mut().unwrap().tools.as_mut().unwrap().paused.clear();
    refused(&mut g, "false_bow", "boss resists");
}

#[test]
fn curtain_steps_aside_leaves_a_decoy_and_refuses_in_a_sealed_corridor() {
    let mut g = arena(Class::Clown, 7);
    let gi = foe(&mut g, "goblin", 5, 5, true);
    let from = g.run.as_ref().unwrap().hero.pos;
    assert!(act(&mut g, "curtain"));
    let r = g.run.as_ref().unwrap();
    assert_ne!(r.hero.pos, from);
    assert!(!r.hero.pos.adjacent(r.monsters[gi].pos), "stepped out of reach");
    assert!(r.hero.pos.x <= from.x, "never toward the threat");
    assert_eq!(tools(&g).decoy.unwrap().pos, from, "the decoy stays on the vacated tile");
    // A one-tile corridor: walls on both perpendicular sides.
    let mut g = arena(Class::Clown, 7);
    {
        let r = g.run.as_mut().unwrap();
        for x in 2..=6 {
            r.floor.map.set(Pos::new(x, 4), Tile::Wall);
            r.floor.map.set(Pos::new(x, 6), Tile::Wall);
        }
    }
    foe(&mut g, "goblin", 5, 5, true);
    refused(&mut g, "curtain", "no space");
}

#[test]
fn grand_jape_needs_a_decoy_caps_foes_and_bosses() {
    let mut g = arena(Class::Clown, 9);
    for y in [2, 4, 6, 8, 9] {
        foe(&mut g, "goblin", 11, y, true);
    }
    refused(&mut g, "grand_jape", "no decoy");
    assert!(act(&mut g, "bell_lure"));
    assert!(act(&mut g, "grand_jape"));
    assert_eq!(tools(&g).japed.len(), JAPE_FOES, "three foes");
    // Ringmaster: one more.
    let mut g = arena(Class::Clown, 9);
    g.run.as_mut().unwrap().hero.class_skills = 0b111;
    for y in [2, 4, 6, 8, 9] {
        foe(&mut g, "goblin", 11, y, true);
    }
    assert!(act(&mut g, "bell_lure"));
    assert!(act(&mut g, "grand_jape"));
    assert_eq!(tools(&g).japed.len(), JAPE_FOES + 1);
    // A boss is diverted at most five ticks.
    let mut g = arena(Class::Clown, 9);
    let bi = foe(&mut g, "goblin_warlord", 11, 5, true);
    refused(&mut g, "bell_lure", "boss resists");
    foe(&mut g, "goblin", 10, 8, true);
    assert!(act(&mut g, "bell_lure"));
    let t0 = turn(&g);
    assert!(act(&mut g, "grand_jape"));
    let id = g.run.as_ref().unwrap().monsters[bi].id;
    assert!(tools(&g).japed.contains(&Hold { id, until: t0 + JAPE_BOSS_TICKS }));
    assert!(tools(&g).boss_guard.iter().any(|h| h.id == id));
}

#[test]
fn deploy_spends_an_action_shoots_on_schedule_and_expires() {
    let mut g = arena(Class::Engineer, 1);
    refused(&mut g, "deploy", "no threat");
    let gi = foe(&mut g, "goblin", 8, 5, true);
    let def = g.run.as_ref().unwrap().monsters[gi].effective_def();
    let t0 = turn(&g);
    assert!(act(&mut g, "deploy"));
    let s = tools(&g).sentry.unwrap();
    assert_eq!((s.hp, s.until, s.next_shot), (SENTRY_HP, t0 + SENTRY_TTL, t0 + SENTRY_INTERVAL), "no immediate free shot");
    assert!(s.pos.cheb(g.run.as_ref().unwrap().hero.pos) <= DEPLOY_RANGE);
    assert!(g.run.as_ref().unwrap().occupied(s.pos), "the construct holds its tile");
    // One construct at a time (cooldown first, then the cap).
    refused(&mut g, "deploy", "cooldown");
    g.run.as_mut().unwrap().tools.as_mut().unwrap().ready[0] = 0;
    refused(&mut g, "deploy", "construct live");
    let mut shots = Vec::new();
    while turn(&g) < t0 + SENTRY_TTL {
        g.events.clear();
        g.tick();
        if g.events.iter().any(|e| matches!(e, Ev::Attack { verb: Some(v), .. } if v == "sentry")) {
            shots.push(turn(&g));
        }
    }
    assert_eq!(shots.first().copied(), Some(t0 + SENTRY_INTERVAL));
    assert!(shots.windows(2).all(|w| w[1] - w[0] == SENTRY_INTERVAL), "every 10 ticks: {shots:?}");
    let hp = g.run.as_ref().unwrap().monsters[gi].hp;
    assert_eq!(hp, 100 - shots.len() as i32 * (SENTRY_SHOT - def).max(0));
    assert!(tools(&g).sentry.is_none(), "lifetime expired");
    assert_eq!(tools(&g).stats.expired, 1);
}

#[test]
fn brace_cuts_each_hit_and_sentry_can_be_destroyed() {
    let mut g = arena(Class::Engineer, 3);
    foe(&mut g, "goblin", 9, 5, true);
    refused(&mut g, "brace_sentry", "no construct");
    assert!(act(&mut g, "deploy"));
    assert!(act(&mut g, "brace_sentry"));
    refused(&mut g, "brace_sentry", "cooldown");
    {
        let (r, mut cx) = g.ctx();
        let _ = &mut cx;
        // Direct hits through the construct's own damage path.
        let hp0 = r.tools.as_ref().unwrap().sentry.unwrap().hp;
        let s = r.tools.as_ref().unwrap().sentry.unwrap();
        let bi = r.monsters.len();
        let id = r.new_id();
        let mut m = crate::monster::Monster::spawn(id, "goblin", Pos::new(s.pos.x, s.pos.y + 1), 1);
        m.awake = true;
        m.atk = (5, 5);
        r.monsters.push(m);
        // force a sure hit by retrying the deterministic roll until one lands
        let mut landed = false;
        for _ in 0..50 {
            let before = r.tools.as_ref().unwrap().sentry.map(|s| s.hp).unwrap_or(0);
            super::attack_sentry(r, &mut cx, bi);
            let after = r.tools.as_ref().unwrap().sentry.map(|s| s.hp).unwrap_or(0);
            if after < before {
                assert_eq!(before - after, 5 - BRACE_REDUCTION, "brace takes 2 per hit");
                landed = true;
                break;
            }
        }
        assert!(landed);
        assert!(r.tools.as_ref().unwrap().sentry.unwrap().hp < hp0);
    }
}

#[test]
fn discharge_spends_the_construct_and_reflection_hits_the_construct() {
    let mut g = arena(Class::Engineer, 5);
    let gi = foe(&mut g, "goblin", 7, 5, true);
    assert!(act(&mut g, "deploy"));
    let def = g.run.as_ref().unwrap().monsters[gi].effective_def();
    assert!(act(&mut g, "discharge"));
    assert!(tools(&g).sentry.is_none());
    assert_eq!(g.run.as_ref().unwrap().monsters[gi].hp, 100 - (DISCHARGE_DAMAGE - def).max(0));
    refused(&mut g, "discharge", "cooldown");
    // A reflecting foe sends the shot back into the construct.
    let mut g = arena(Class::Engineer, 5);
    let li = foe(&mut g, "lich", 7, 5, true);
    assert!(act(&mut g, "deploy"));
    let before = g.run.as_ref().unwrap().monsters[li].hp;
    let shp = tools(&g).sentry.unwrap().hp;
    {
        let (r, mut cx) = g.ctx();
        let s = r.tools.as_ref().unwrap().sentry.unwrap();
        super::sentry_shot(r, &mut cx, &s, li, SENTRY_SHOT, "sentry");
    }
    assert_eq!(g.run.as_ref().unwrap().monsters[li].hp, before);
    assert_eq!(tools(&g).sentry.unwrap().hp, shp - SENTRY_SHOT);
}

#[test]
fn relocate_moves_without_heal_lifetime_or_free_shot() {
    let mut g = arena(Class::Engineer, 7);
    foe(&mut g, "goblin", 11, 5, true);
    assert!(act(&mut g, "deploy"));
    {
        let s = g.run.as_mut().unwrap().tools.as_mut().unwrap().sentry.as_mut().unwrap();
        s.hp = 5;
    }
    let s0 = tools(&g).sentry.unwrap();
    g.run.as_mut().unwrap().hero.pos = Pos::new(8, 5);
    g.run.as_mut().unwrap().floor.map.update_vision(Pos::new(8, 5), 8);
    assert!(act(&mut g, "relocate"));
    let s1 = tools(&g).sentry.unwrap();
    assert_ne!(s1.pos, s0.pos);
    assert_eq!((s1.hp, s1.until, s1.next_shot, s1.id), (s0.hp, s0.until, s0.next_shot, s0.id));
    refused(&mut g, "relocate", "cooldown");
}

#[test]
fn overdrive_halves_the_interval_for_its_window_only() {
    let mut g = arena(Class::Engineer, 9);
    foe(&mut g, "goblin", 7, 5, true);
    assert!(act(&mut g, "deploy"));
    let until = tools(&g).sentry.unwrap().until;
    assert!(act(&mut g, "overdrive"));
    let t0 = turn(&g);
    let mut shots = Vec::new();
    while turn(&g) < t0 + OVERDRIVE_TICKS {
        g.events.clear();
        g.tick();
        if g.events.iter().any(|e| matches!(e, Ev::Attack { verb: Some(v), .. } if v == "sentry")) {
            shots.push(turn(&g));
        }
    }
    assert!(shots.windows(2).all(|w| w[1] - w[0] == OVERDRIVE_INTERVAL), "{shots:?}");
    assert!(shots.len() >= 3);
    assert_eq!(tools(&g).sentry.unwrap().until, until, "lifetime unchanged");
}

#[test]
fn descent_expires_decoy_and_construct() {
    let mut g = arena(Class::Engineer, 1);
    foe(&mut g, "goblin", 8, 5, true);
    assert!(act(&mut g, "deploy"));
    g.descend_to(2);
    let t = g.run.as_ref().unwrap().tools.as_ref().unwrap();
    assert!(t.sentry.is_none() && t.decoy.is_none());
    assert_eq!(t.stats.expired, 1);
    let mut g = arena(Class::Clown, 1);
    foe(&mut g, "goblin", 10, 5, true);
    assert!(act(&mut g, "bell_lure"));
    g.descend_to(2);
    assert!(g.run.as_ref().unwrap().tools.as_ref().unwrap().decoy.is_none());
}

#[test]
fn live_tools_reload_and_replay_exactly() {
    for class in Class::EARNED {
        let mut g = arena(class, 9);
        crate::tests::rules(&mut g, vec![Row::new(vec![], Verb::new(if class == Class::Clown { "clown_tactic" } else { "engineer_tactic" })), Row::new(vec![], Verb::arg("attack", "nearest"))]);
        foe(&mut g, "goblin", 9, 5, false);
        foe(&mut g, "goblin", 10, 8, false);
        for _ in 0..3 {
            g.tick();
        }
        let saved = g.save();
        let mut a = Game::load(&saved).unwrap();
        let mut b = Game::load(&saved).unwrap();
        assert_eq!(a.save(), saved, "inspection preserves the save");
        let _ = a.snapshot();
        assert_eq!(a.save(), saved, "a snapshot read preserves the save");
        for _ in 0..60 {
            a.tick();
            b.tick();
        }
        let mut c = Game::load(&saved).unwrap();
        for _ in 0..30 {
            c.tick();
        }
        let mut c = Game::load(&c.save()).unwrap();
        for _ in 0..30 {
            c.tick();
        }
        assert_eq!(a.save(), b.save(), "{class:?} replay");
        assert_eq!(a.save(), c.save(), "{class:?} split/reload");
        g.tick();
    }
}

#[test]
fn earned_gate_reasons_are_rust_owned_and_selection_is_free() {
    let mut g = Game::new_resident(5);
    let before = g.save();
    assert_eq!(crate::meta::class_gate(&g.lineage, Class::Clown).as_deref(), Some("Build Guildhouse"));
    assert!(g.set_class("clown").is_err());
    assert_eq!(g.save(), before, "a refused class choice changes nothing");
    let _ = g.lineage();
    assert_eq!(g.save(), before, "reading availability changes nothing");
    assert!(!g.lineage.classes.contains_key("clown"), "no eager XP record");
    crate::test_stage::traits(&mut g.lineage, 11, 13);
    assert_eq!(crate::meta::class_gate(&g.lineage, Class::Clown).as_deref(), Some("Complete 1 more delves"));
    crate::test_stage::traits(&mut g.lineage, 12, 12);
    assert_eq!(crate::meta::class_gate(&g.lineage, Class::Clown).as_deref(), Some("Reach D13"));
    crate::test_stage::traits(&mut g.lineage, 12, 13);
    assert_eq!(crate::meta::class_gate(&g.lineage, Class::Clown), None);
    assert_eq!(crate::meta::class_gate(&g.lineage, Class::Engineer).as_deref(), Some("Complete 8 more delves"));
    let gold = g.lineage.gold;
    g.set_class("clown").unwrap();
    assert_eq!(g.lineage.gold, gold, "no purchase");
    assert_eq!(g.lineage.class, Class::Clown);
    assert!(g.lineage.classes.contains_key("clown"));
    assert!(g.lineage.rules().rows.iter().any(|r| r.origin.as_deref() == Some("class:clown")));
    let wire = g.lineage();
    assert!(wire.earned_classes.iter().any(|c| c.class == "clown" && c.available));
    assert!(wire.earned_classes.iter().any(|c| c.class == "engineer" && !c.available && c.needs.as_deref() == Some("Complete 8 more delves")));
    g.set_class("fighter").unwrap();
    assert!(!g.lineage.rules().rows.iter().any(|r| r.origin.as_deref() == Some("class:clown")));
}

#[test]
fn new_trees_have_three_tier_chains_and_keep_six_bits() {
    for class in Class::EARNED {
        let mut l = crate::engine::LineageState::new(1);
        l.class = class;
        let t = crate::class_tree::offers(&l, false);
        assert_eq!(t.nodes.len(), 6);
        let n = &t.nodes;
        assert_eq!((n[0].parent.as_deref(), n[0].required_level, n[0].required_depth), (None, 3, 8));
        assert_eq!((n[1].parent.as_deref(), n[1].required_level, n[1].required_depth), (Some(n[0].id.as_str()), 5, 13));
        assert_eq!((n[2].parent.as_deref(), n[2].required_level, n[2].required_depth), (Some(n[1].id.as_str()), 7, 18));
        assert_eq!(n[3].parent, None);
        assert_eq!(n[4].parent.as_deref(), Some(n[3].id.as_str()));
        assert_eq!(n[5].parent.as_deref(), Some(n[4].id.as_str()));
        assert!(n.iter().all(|x| x.id.starts_with(class.name())));
        assert!(n.iter().all(|x| crate::class_tree::label(&format!("path:{}", x.id)).is_some()));
    }
}

#[test]
fn a_sentry_loses_its_value_when_the_lane_empties_and_relocation_restores_it() {
    let mut g = arena(Class::Engineer, 7);
    let gi = foe(&mut g, "goblin", 8, 5, true);
    assert!(act(&mut g, "deploy"));
    let s = tools(&g).sentry.unwrap();
    // The foe leaves the lane: out of the construct's range.
    g.run.as_mut().unwrap().monsters[gi].pos = Pos::new(s.pos.x + SENTRY_RANGE + 3, 5);
    let t0 = turn(&g);
    while turn(&g) < t0 + 30 {
        g.tick();
    }
    assert_eq!(tools(&g).stats.shots, 0, "no target, no value");
    assert!(tools(&g).stats.idle_ticks > 0);
    // The hero walks toward it and moves the construct into the new lane.
    let fp = g.run.as_ref().unwrap().monsters[gi].pos;
    {
        let r = g.run.as_mut().unwrap();
        r.hero.pos = Pos::new(fp.x - 3, 5);
        r.floor.map.update_vision(r.hero.pos, 8);
    }
    assert!(act(&mut g, "relocate"));
    let t1 = turn(&g);
    while turn(&g) < t1 + 12 {
        g.tick();
    }
    assert!(tools(&g).stats.shots >= 1, "back in the lane");
}

#[test]
fn every_new_node_applies_its_authored_number() {
    // Clown: bit → (verb, measured quantity with / without the bit).
    let clown = |bits: u32| {
        let mut g = arena(Class::Clown, 9);
        g.run.as_mut().unwrap().hero.class_skills = bits;
        let gi = foe(&mut g, "goblin", 5, 5, true);
        foe(&mut g, "goblin", 10, 8, true);
        let t0 = turn(&g);
        assert!(act(&mut g, "turnabout"));
        let t = tools(&g).clone();
        let def = g.run.as_ref().unwrap().monsters[gi].effective_def();
        {
            let (r, mut cx) = g.ctx();
            crate::tools::on_miss(r, &mut cx, gi);
        }
        let dealt = 100 - g.run.as_ref().unwrap().monsters[gi].hp;
        assert!(act(&mut g, "curtain"));
        let curtain = tools(&g).ready[3] - t0;
        (t.counter_until - t0, t.ready[1] - t0, dealt + def, curtain)
    };
    let base = clown(0);
    assert_eq!(base, (COUNTER_WINDOW, COUNTER_COOLDOWN, COUNTER_DAMAGE, CURTAIN_COOLDOWN));
    assert_eq!(clown(1 << 1).3, CURTAIN_COOLDOWN - 10, "False exit");
    assert_eq!(clown(1 << 3).2, COUNTER_DAMAGE + 1, "Turncoat");
    assert_eq!(clown(1 << 4).0, COUNTER_WINDOW + 5, "Cruel joke");
    assert_eq!(clown(1 << 5).1, COUNTER_COOLDOWN - 10, "Last laugh");
    // Engineer.
    let engineer = |bits: u32| {
        let mut g = arena(Class::Engineer, 9);
        g.run.as_mut().unwrap().hero.class_skills = bits;
        foe(&mut g, "goblin", 7, 5, true);
        let t0 = turn(&g);
        assert!(act(&mut g, "deploy"));
        let s = tools(&g).sentry.unwrap();
        let deploy_cd = tools(&g).ready[0] - t0;
        let reach = s.pos.cheb(g.run.as_ref().unwrap().hero.pos);
        assert!(act(&mut g, "overdrive"));
        let od = tools(&g).sentry.unwrap().overdrive_until - t0;
        assert!(act(&mut g, "relocate"));
        let reloc = tools(&g).ready[3] - t0;
        assert!(act(&mut g, "brace_sentry"));
        {
            let (r, mut cx) = g.ctx();
            super::hurt_sentry(r, &mut cx, 6);
        }
        let after = tools(&g).sentry.map_or(0, |s| s.hp);
        (s.max_hp, deploy_cd, od, reloc, s.max_hp - after, reach)
    };
    let base = engineer(0);
    assert_eq!(base.0, SENTRY_HP);
    assert_eq!((base.1, base.2, base.3, base.4), (DEPLOY_COOLDOWN, OVERDRIVE_TICKS, RELOCATE_COOLDOWN, 6 - BRACE_REDUCTION));
    assert!(base.5 <= DEPLOY_RANGE);
    assert_eq!(engineer(1).0, SENTRY_HP + 4, "Watchmaker");
    assert_eq!(engineer(1 << 1).4, 6 - BRACE_REDUCTION - 1, "Bastion");
    assert_eq!(engineer(1 << 2).2, OVERDRIVE_TICKS + 5, "Artificer");
    assert!(engineer(1 << 3).5 <= DEPLOY_RANGE + 1, "Surveyor reach");
    assert_eq!(engineer(1 << 4).3, RELOCATE_COOLDOWN - 10, "Mobile works");
    assert_eq!(engineer(1 << 5).1, DEPLOY_COOLDOWN - 10, "Relay");
}

#[test]
fn eight_hours_whole_split_and_reload_match_with_a_live_tool() {
    for class in Class::EARNED {
        let mut g = Game::new_resident(7);
        // Controlled staging of the earned records (Scout, delves, depth) — not progression proof.
        crate::test_stage::traits(&mut g.lineage, 20, 18);
        g.set_class(class.name()).unwrap();
        g.try_send().unwrap();
        let mut live = false;
        for _ in 0..20_000 {
            g.tick();
            let t = g.run.as_ref().and_then(|r| r.tools.as_ref());
            if t.is_some_and(|t| t.decoy.is_some() || t.sentry.is_some()) {
                live = true;
                break;
            }
            if g.run.as_ref().is_none_or(|r| r.over.is_some()) {
                break;
            }
        }
        assert!(live, "{class:?} placed a tool in a real run");
        let start = Game::load(&g.save()).unwrap();
        assert_eq!(Game::load(&start.save()).unwrap().save(), start.save());
        let mut whole = start.clone();
        let mut sliced = Game::load(&start.save()).unwrap();
        crate::offline::run_offline_slice(&mut whole, 28_800, true);
        crate::offline::run_offline_slice(&mut sliced, 14_400, false);
        let mut sliced = Game::load(&sliced.save()).unwrap();
        crate::offline::run_offline_slice(&mut sliced, 14_400, true);
        assert_eq!(whole.save(), sliced.save(), "{class:?} 8 h whole = split + reload");
        let gold = whole.lineage.gold;
        let _ = whole.lineage();
        assert_eq!(whole.lineage.gold, gold);
    }
}

#[test]
fn engineer_melee_is_lighter_than_the_same_mace_for_anyone_else() {
    // Owner tuning 2026-10-14: the mace 4–8 hits 2–6 for an Engineer; a Fighter's is unchanged.
    let eng = arena(Class::Engineer, 1);
    let mut fig = arena(Class::Fighter, 1);
    fig.run.as_mut().unwrap().hero.weapon = Some(Item::new(900, "mace")).into();
    assert_eq!(fig.run.as_ref().unwrap().hero.atk(), (4, 8));
    assert_eq!(eng.run.as_ref().unwrap().hero.atk(), (4 - ENGINEER_MELEE, 8 - ENGINEER_MELEE));
    assert!(eng.run.as_ref().unwrap().hero.atk().1 < 7, "below the sword's 3–7 top");
}
