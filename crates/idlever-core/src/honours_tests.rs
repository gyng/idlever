//! Cut269 (docs/CUT269_ACHIEVEMENTS_V2.md): the achievements' tests — the list (G1), neutrality (G2), no reward (G3),
//! save migration (G6), the wire's secrets (G7) and one case per check.
use super::*;
use crate::hero::Class;
use crate::specialization::Style;

fn words(s: &str) -> usize {
    s.split_whitespace().filter(|w| w.chars().any(|c| c.is_alphabetic())).count()
}

/// G1: the list — counts, secrets, new entries, unique ids, copy budgets.
#[test]
fn launch_list_meets_g1() {
    assert_eq!(DEFS.len(), 42, "the contract's count");
    let secrets = DEFS.iter().filter(|d| d.secret).count();
    assert_eq!(secrets, 4);
    let ids: BTreeSet<&str> = DEFS.iter().map(|d| d.id).collect();
    assert_eq!(ids.len(), DEFS.len(), "unique ids");
    assert_eq!(NEW_IN_V2.len(), 30);
    for id in NEW_IN_V2 {
        assert!(def(id).is_some(), "{id} listed as new but absent");
    }
    for d in DEFS {
        assert!(words(d.name) <= 3, "{} name over budget", d.id);
        assert!(words(d.goal) <= 5, "{} goal over budget", d.id);
        assert!(!d.name.is_empty() && !d.goal.is_empty(), "{}", d.id);
        for s in [d.name, d.goal] {
            assert!(!s.ends_with(['.', '!', '?']), "{} sentence", d.id);
            for w in s.split_whitespace() {
                let w = w.trim_matches(|c: char| !c.is_alphabetic()).to_lowercase();
                assert!(!["you", "your", "tap", "click"].contains(&w.as_str()), "{} forbidden word", d.id);
            }
        }
        assert!(GROUPS.contains(&d.group), "{} group", d.id);
        assert_eq!(d.secret, d.group == "oddities", "{}: secrets are the oddities", d.id);
    }
}

/// G7: an unearned secret is never sent — no row, no name, no count; the header counts the visible list.
#[test]
fn unearned_secrets_are_absent_from_the_wire() {
    let mut g = Game::new(7);
    let w = wire([&g.lineage]);
    assert_eq!((w.earned, w.secrets), (0, 0));
    assert_eq!(w.total as usize, DEFS.iter().filter(|d| !d.secret).count());
    assert_eq!(w.rows.len(), w.total as usize, "no secret rows");
    let text = serde_json::to_string(&w).unwrap();
    for d in DEFS.iter().filter(|d| d.secret) {
        assert!(!text.contains(d.name) && !text.contains(d.id), "{} leaks", d.id);
    }
    g.lineage.honours.earned.insert("o_gas".into(), 3);
    let w = wire([&g.lineage]);
    assert_eq!((w.earned, w.secrets), (0, 1), "an earned secret counts apart");
    let r = w.rows.iter().find(|r| r.id == "o_gas").unwrap();
    assert!(r.secret && r.name == "Bad Air" && r.day == Some(3) && r.tier == "silver");
    let ways = w.rows.iter().find(|r| r.id == "waystones").unwrap();
    assert_eq!((ways.n, ways.of, ways.tier.as_str()), (Some(0), Some(6), "bronze"));
    assert_eq!(g.lineage.honours.v, VERSION, "a new game is current");
}

#[test]
fn earned_once_new_until_seen_and_union_across_lineages() {
    let mut a = Game::new(3);
    a.lineage.kills.insert("goblin_warlord".into());
    a.lineage.kills.insert("lich".into());
    let new = sweep(&mut a.lineage, 1);
    assert_eq!(new, vec!["boss_warlord", "boss_lich"]);
    assert!(sweep(&mut a.lineage, 1).is_empty(), "earned once");
    let mut b = Game::new(4);
    let w = wire([&b.lineage, &a.lineage]);
    assert_eq!(w.earned, 2, "the union across a session's lineages");
    assert!(w.rows.iter().filter(|r| r.day.is_some()).all(|r| r.new));
    let ids: BTreeSet<String> = a.lineage.honours.earned.keys().cloned().collect();
    mark_seen(&mut b.lineage, &ids);
    let w = wire([&b.lineage, &a.lineage]);
    assert!(w.rows.iter().all(|r| !r.new), "seen on any lineage is seen");
}

/// G6: a Cut263 save (v 1) keeps its kept ids, drops the cut ones, earns the new state-derived ones silently.
#[test]
fn a_v1_save_migrates_silently_and_round_trips() {
    let mut g = Game::new(5);
    g.lineage.kills.insert("goblin_warlord".into());
    g.lineage.kills.insert("lich".into());
    g.lineage.honours = Honours { v: 1, ..Default::default() };
    g.lineage.honours.earned.insert("boss_warlord".into(), 1);
    g.lineage.honours.earned.insert("depth_20".into(), 1);
    g.lineage.honours.earned.insert("named".into(), 2);
    g.lineage.honours.seen.insert("boss_warlord".into());
    g.lineage.honours.causes.insert("goblin".into());
    let mut v: serde_json::Value = serde_json::from_str(&g.save()).unwrap();
    // (a v1 save carried its causes; the v2 struct no longer writes them)
    v["lineage"]["honours"]["causes"] = serde_json::json!(["goblin"]);
    let loaded = Game::load(&v.to_string()).unwrap();
    let h = &loaded.lineage.honours;
    assert_eq!(h.v, VERSION);
    assert_eq!(h.earned.get("boss_warlord"), Some(&1), "a kept id keeps its day");
    assert!(!h.earned.contains_key("depth_20") && !h.earned.contains_key("named"), "cut ids drop");
    assert!(h.earned.contains_key("boss_lich"), "a state-derived entry is earned on load");
    assert_eq!(h.seen.len(), h.earned.len(), "nothing toasts after a migration");
    assert!(!loaded.save().contains("\"causes\""));
    let again = Game::load(&loaded.save()).unwrap();
    assert_eq!(again.save(), loaded.save(), "save → load → save is stable");
}

#[test]
fn a_pre_honours_save_migrates_silently() {
    let mut g = Game::new(5);
    g.lineage.kills.insert("goblin_warlord".into());
    g.lineage.honours = Honours::default();
    let text = g.save();
    assert!(!text.contains("\"honours\""));
    let loaded = Game::load(&text).unwrap();
    assert!(loaded.lineage.honours.earned.contains_key("boss_warlord"));
    assert_eq!(loaded.lineage.honours.seen.len(), loaded.lineage.honours.earned.len());
}

#[test]
fn unknown_ids_are_dropped_on_load() {
    let mut g = Game::new(6);
    g.lineage.honours.earned.insert("retired_honour".into(), 2);
    g.lineage.honours.seen.insert("retired_honour".into());
    let loaded = Game::load(&g.save()).unwrap();
    assert!(!loaded.lineage.honours.earned.contains_key("retired_honour"));
    assert!(!loaded.lineage.honours.seen.contains("retired_honour"));
}

fn strip(v: &mut serde_json::Value) {
    match v {
        serde_json::Value::Object(m) => {
            m.remove("honours");
            m.values_mut().for_each(strip);
        }
        serde_json::Value::Array(a) => a.iter_mut().for_each(strip),
        _ => {}
    }
}

fn diff(at: &str, a: &serde_json::Value, b: &serde_json::Value, out: &mut Vec<String>) {
    match (a, b) {
        (serde_json::Value::Object(x), serde_json::Value::Object(y)) => {
            for k in x.keys().chain(y.keys()).collect::<BTreeSet<_>>() {
                match (x.get(k), y.get(k)) {
                    (Some(p), Some(q)) => diff(&format!("{at}.{k}"), p, q, out),
                    _ => out.push(format!("{at}.{k}")),
                }
            }
        }
        (serde_json::Value::Array(x), serde_json::Value::Array(y)) if x.len() == y.len() => {
            for (i, (p, q)) in x.iter().zip(y).enumerate() {
                diff(&format!("{at}[{i}]"), p, q, out);
            }
        }
        _ if a != b => out.push(at.to_string()),
        _ => {}
    }
}

/// G2: the observer is never read back. The same seed played with the observer on, and with it switched off entirely
/// (no marks, no checks), ends in the same game once `honours` is set aside — mid-run saves included.
#[test]
fn achievements_never_change_a_game() {
    let play = |on: bool| -> (String, usize, usize) {
        set_off(!on);
        let mut g = Game::new_resident(9);
        crate::tree::grant(&mut g.lineage, &["porter", "scout"]);
        g.send();
        g.run_offline(10 * 3600);
        if g.run.is_none() {
            g.send(); // (a save with a run in flight)
        }
        let mid = g.run.as_ref().map_or(0, |r| r.honours.kills.len() + usize::from(r.honours.sent));
        set_off(false);
        let earned = g.lineage.honours.earned.len();
        let mut v: serde_json::Value = serde_json::from_str(&g.save()).unwrap();
        strip(&mut v);
        (v.to_string(), earned, mid)
    };
    let (a, earned, mid) = play(true);
    let (b, off_earned, off_mid) = play(false);
    assert!(earned > 0, "a ten-hour game earns something to observe");
    assert!(mid > 0, "the run in flight carries marks");
    assert_eq!((off_earned, off_mid), (0, 0), "switched off, the observer wrote nothing");
    if a != b {
        let (va, vb): (serde_json::Value, serde_json::Value) = (serde_json::from_str(&a).unwrap(), serde_json::from_str(&b).unwrap());
        let mut paths = Vec::new();
        diff("", &va, &vb, &mut paths);
        panic!("the observer changed the game at {:?}", &paths[..paths.len().min(12)]);
    }
}

/// A sent run on a resident lineage, its marks taken (the base every check case edits).
fn sent_game() -> Game {
    let mut g = Game::new_resident(11);
    crate::tree::grant(&mut g.lineage, &["porter", "scout"]);
    g.send();
    assert!(g.run.as_ref().unwrap().honours.sent, "a real send takes its marks");
    g
}

fn boss(kind: &str, by: &str) -> Kill {
    Kill { kind: kind.into(), depth: 18, by: by.into(), hp: 30, max_hp: 40, untouched: false, drinks: 2, melee: true, revived: false, allies: 1 }
}

/// The new entries a run (edited by `f`) earns on a fresh copy of the lineage.
fn earns(g: &Game, f: impl FnOnce(&mut Run, &mut LineageState)) -> BTreeSet<&'static str> {
    let mut run = g.run.clone().unwrap();
    let mut l = g.lineage.clone();
    l.honours = Honours::current();
    run.honours.kills.clear();
    run.honours.party = 1;
    run.honours.met = BAND.iter().map(|s| s.to_string()).collect();
    run.packed = vec!["heal".to_string()].into();
    f(&mut run, &mut l);
    settle(&mut l, &run, ExitTier::Bank, 1).into_iter().filter(|id| NEW_IN_V2.contains(id)).collect()
}

fn only(set: BTreeSet<&'static str>, id: &str) {
    assert!(set.contains(id), "{id} not earned: {set:?}");
}

/// The base case (a Fighter, a full set with exit rows, a party, supplies, a hurt melee kill) earns no new entry; each
/// case's single change earns its entry.
#[test]
fn every_new_check_has_a_case() {
    let g = sent_game();
    assert!(g.run.as_ref().unwrap().honours.exit_rows, "the shipped stance holds exit rows");
    let base = earns(&g, |r, _| r.honours.kills.push(boss("lich", "hero")));
    assert!(base.is_empty(), "the base earns {base:?}");
    let mut covered: BTreeSet<&str> = BTreeSet::new();
    let mut case = |id: &'static str, f: &dyn Fn(&mut Run, &mut LineageState)| {
        let got = earns(&g, |r, l| f(r, l));
        only(got, id);
        covered.insert(id);
    };
    case("m_fighter", &|r, _| {
        r.hero.specialization = Some(Style::Sentinel);
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("m_rogue", &|r, _| {
        r.hero.class = Class::Rogue;
        r.honours.kills.push(boss("lich", "hero"));
    });
    case("m_ranger", &|r, _| {
        r.hero.class = Class::Ranger;
        r.honours.kills.push(Kill { melee: false, ..boss("bloat_mother", "ranged") });
    });
    case("m_caster", &|r, _| {
        r.hero.class = Class::Caster;
        r.hero.specialization = Some(Style::Hexbinder);
        r.honours.kills.push(boss("goblin_warlord", "ranged"));
    });
    case("m_gunner", &|r, _| {
        r.hero.class = Class::Gunner;
        r.honours.kills.push(boss("lich", "ranged"));
    });
    case("m_clown", &|r, _| {
        r.hero.class = Class::Clown;
        r.honours.kills.push(boss("lich", "hero"));
    });
    case("m_engineer", &|r, _| r.honours.kills.push(boss("goblin_warlord", "sentry")));
    case("m_every", &|r, l| {
        for c in Class::EVERY.iter().filter(|c| **c != Class::Engineer) {
            l.honours.class_bosses.insert(c.name().into());
        }
        r.hero.class = Class::Engineer;
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("c_dry", &|r, _| r.honours.kills.push(Kill { drinks: 0, ..boss("lurker_queen", "hero") }));
    case("c_empty", &|r, _| {
        r.packed = Vec::new().into();
        r.prepared_supplies.clear();
        r.honours.kills.push(boss("lich", "hero"));
    });
    case("c_lone", &|r, _| {
        r.honours.party = 0;
        r.tamed.clear();
        r.honours.kills.push(Kill { allies: 0, ..boss("foundry_master", "hero") });
    });
    case("c_bare", &|r, l| {
        l.forge.clear();
        l.kit.clear();
        r.honours.kills.push(boss("foundry_master", "hero"));
    });
    case("c_walk", &|r, _| {
        r.start = 1;
        r.max_depth = 28;
    });
    case("c_noexit", &|r, _| {
        r.honours.exit_rows = false;
        r.best_at_send = Some(18);
        r.max_depth = 19;
    });
    case("c_first", &|r, _| {
        r.honours.met.retain(|m| m != "lurker_queen");
        r.honours.kills.push(boss("lurker_queen", "hero"));
    });
    case("c_flawless", &|r, _| r.honours.kills.push(Kill { untouched: true, ..boss("mirror_king", "hero") }));
    case("c_three", &|r, _| {
        r.honours.rows = 3;
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("c_desc3", &|_, l| l.endgame = Some(crate::endgame::Progress { tier: 0, unlocked: 4, cleared: Some(3) }));
    case("c_vows", &|r, l| {
        l.honours.oaths.extend(["bold".to_string(), "lean".to_string()]);
        let mut o = l.oaths.first().cloned().unwrap_or_else(|| crate::oath::OathState {
            id: "o".into(),
            kind: "fire".into(),
            depth: 18,
            boss: None,
            seen: Vec::new(),
            n: 0,
            reward: crate::wire::OathReward { kind: "title".into(), id: "t".into(), label: "t".into() },
            price: 0,
        });
        o.kind = "fire".into();
        r.oath = Some(o);
        r.oath_said = Some((true, String::new()));
    });
    case("b_seven", &|r, l| {
        for s in &crate::packages::SYNERGIES[1..] {
            l.honours.builds.insert(s.id.into());
        }
        r.honours.builds = 1;
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("b_kennel", &|r, l| {
        for s in &crate::pets::PET_SYNERGIES[1..] {
            l.honours.pet_builds.insert(s.id.into());
        }
        r.pets.syn = 1;
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("b_stance", &|r, _| {
        r.honours.custom = true;
        r.honours.kills.push(boss("lich", "hero"));
    });
    case("b_route", &|r, _| {
        r.route = crate::descent::Route(1);
        r.honours.kills.push(boss("goblin_warlord", "hero"));
    });
    case("x_thread", &|r, _| r.honours.kills.push(Kill { hp: 2, max_hp: 40, ..boss("lich", "hero") }));
    case("x_wind", &|r, _| r.honours.kills.push(Kill { revived: true, ..boss("goblin_warlord", "hero") }));
    case("x_dog", &|r, _| r.honours.kills.push(boss("foundry_master", "pet")));
    case("x_fire", &|r, _| r.honours.kills.push(boss("lich", "fire")));
    case("o_gas", &|r, _| r.honours.kills.push(boss("bloat_mother", "gas")));
    case("o_turncoat", &|r, _| r.honours.kills.push(boss("lich", "ally")));
    case("o_pratfall", &|r, _| r.honours.kills.push(boss("goblin_warlord", "counter")));
    let missing: Vec<&str> = NEW_IN_V2.iter().copied().filter(|id| !covered.contains(id)).collect();
    assert!(missing.is_empty(), "no case for {missing:?}");
}

/// The near misses: each restriction's boundary holds.
#[test]
fn near_misses_earn_nothing() {
    let g = sent_game();
    let none = |f: &dyn Fn(&mut Run, &mut LineageState), id: &str| {
        let got = earns(&g, |r, l| f(r, l));
        assert!(!got.contains(id), "{id} earned on a near miss");
    };
    none(&|r, _| r.honours.kills.push(Kill { drinks: 1, ..boss("lurker_queen", "hero") }), "c_dry");
    none(&|r, _| r.honours.kills.push(Kill { drinks: 0, ..boss("lich", "hero") }), "c_dry");
    none(&|r, _| r.honours.kills.push(Kill { untouched: true, ..boss("foundry_master", "hero") }), "c_flawless");
    none(&|r, _| r.honours.kills.push(Kill { hp: 3, max_hp: 40, ..boss("lich", "hero") }), "x_thread");
    none(&|r, _| r.honours.kills.push(Kill { hp: 1, max_hp: 40, ..boss("bloat_mother", "hero") }), "x_thread");
    none(&|r, _| r.honours.kills.push(boss("goblin_warlord", "pet")), "x_dog");
    none(&|r, _| r.honours.kills.push(boss("bloat_mother", "fire")), "x_fire");
    none(&|r, _| {
        r.honours.met.retain(|m| m != "lich");
        r.honours.kills.push(boss("lich", "hero"));
    }, "c_first");
    none(&|r, _| {
        r.start = 1;
        r.max_depth = 27;
    }, "c_walk");
    none(&|r, _| {
        r.hero.class = Class::Ranger;
        r.honours.kills.push(boss("lich", "ranged"));
    }, "m_ranger");
    none(&|r, _| {
        r.honours.rows = 4;
        r.honours.kills.push(boss("lich", "hero"));
    }, "c_three");
    none(&|r, _| {
        r.honours.exit_rows = false;
        r.best_at_send = Some(20);
        r.max_depth = 20;
    }, "c_noexit");
    none(&|r, _| {
        r.start = 9;
        r.max_depth = 30;
    }, "c_walk");
    none(&|r, _| {
        r.honours.party = 0;
        r.tamed.clear();
        r.honours.kills.push(Kill { allies: 1, ..boss("foundry_master", "hero") });
    }, "c_lone");
    // (a run with no send marks — an old save's run in flight — never meets a send-time check)
    none(&|r, _| {
        r.honours.sent = false;
        r.honours.rows = 1;
        r.honours.kills.push(boss("lich", "hero"));
    }, "c_three");
}

/// G3: achievements pay nothing. Earning every entry the case table reaches leaves the lineage — marks, gold, unlocks,
/// trophies, the rule sets — exactly as it was, `honours` aside.
#[test]
fn achievements_pay_nothing() {
    let g = sent_game();
    let mut run = g.run.clone().unwrap();
    let mut l = g.lineage.clone();
    run.hero.class = Class::Clown;
    run.hero.specialization = Some(Style::Sentinel);
    run.honours.rows = 2;
    run.honours.custom = true;
    run.honours.exit_rows = false;
    run.honours.met.clear();
    run.start = 1;
    run.max_depth = 30;
    run.best_at_send = Some(20);
    for by in ["sentry", "pet", "fire", "gas", "ally", "counter"] {
        run.honours.kills.push(Kill { untouched: true, drinks: 0, melee: false, revived: true, allies: 0, hp: 1, ..boss("lich", by) });
    }
    l.forge.clear();
    l.kit.clear();
    let before = {
        let mut v: serde_json::Value = serde_json::to_value(&l).unwrap();
        strip(&mut v);
        v
    };
    let new = settle(&mut l, &run, ExitTier::Death, 4);
    assert!(new.len() >= 15, "the case earns most of the list: {new:?}");
    let mut after: serde_json::Value = serde_json::to_value(&l).unwrap();
    strip(&mut after);
    assert_eq!(before, after, "an achievement changed the lineage");
}

/// The killing blow's source as the observer names it.
#[test]
fn blow_sources_are_named() {
    use crate::turn::Src;
    let g = sent_game();
    let mut run = g.run.clone().unwrap();
    assert_eq!(blow_by(&run, &Src::Hero { ranged: false }), "hero");
    assert_eq!(blow_by(&run, &Src::Hero { ranged: true }), "ranged");
    assert_eq!(blow_by(&run, &Src::Fire), "fire");
    assert_eq!(blow_by(&run, &Src::Burst), "gas");
    assert_eq!(blow_by(&run, &Src::Gas), "gas");
    assert_eq!(blow_by(&run, &Src::Tool(crate::tools::Tool::Counter)), "counter");
    assert_eq!(blow_by(&run, &Src::Tool(crate::tools::Tool::Sentry)), "sentry");
    if let Some(i) = run.monsters.iter().position(|m| !m.ally) {
        assert_eq!(blow_by(&run, &Src::Mon(i)), "other");
        run.monsters[i].ally = true;
        assert_eq!(blow_by(&run, &Src::Mon(i)), "ally");
        run.monsters[i].cid = Some(1);
        assert_eq!(blow_by(&run, &Src::Mon(i)), "pet");
    }
    // a recorded fall carries the hero's state at the blow
    run.hero.hp = 1;
    run.drinks = 0;
    on_boss_kill(&mut run, "lich", &Src::Fire);
    let k = run.honours.kills.last().unwrap();
    assert_eq!((k.kind.as_str(), k.by.as_str(), k.hp, k.drinks), ("lich", "fire", 1, 0));
}
