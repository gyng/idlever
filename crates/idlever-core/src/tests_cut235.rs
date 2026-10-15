//! Cut235 (docs/CUT235_FEATS.md; Cut231 §5b): the later workers are lit by a visible feat — one real outcome of their chore
//! — or by the time fallback, untouched; never by a repetition count (a tree from before Cut235 keeps its count as well).
use crate::engine::{ExitTier, Game};
use crate::tree;
use crate::wire::Companion;

fn camp(seed: u64) -> Game {
    let mut g = Game::new_resident(seed);
    tree::grant(&mut g.lineage, &["porter", "scout"]);
    g.lineage.best_depth = 6;
    g
}

fn node(g: &Game, id: &str) -> tree::WorkNodeWire {
    tree::wire(&g.lineage, false).nodes.into_iter().find(|n| n.id == id).unwrap()
}

fn met(g: &Game, id: &str) -> bool {
    tree::trigger_met(&g.lineage, tree::def(id).unwrap())
}

fn a_boss() -> &'static str {
    crate::defs::MONSTERS.iter().find(|m| m.boss && !m.kind.starts_with("spectral_")).unwrap().kind
}

fn pup(id: u32, level: u32, gen: u32) -> Companion {
    let kind = "rat";
    let def = crate::defs::monster_def(kind);
    let tags: Vec<String> = def.tags.iter().map(|t| t.to_string()).collect();
    Companion { id, kind: kind.into(), name: "Pip".into(), level, tags: tags.clone(), gen, rules: crate::probes::default_companion_rules(&tags, level), max_rows: 2, hp: def.hp, max_hp: def.hp, life: Default::default() }
}

/// Every later worker has a feat (≤ 3 words); the porter and the Scout keep their counts.
#[test]
fn every_later_worker_has_a_feat_of_three_words() {
    for n in tree::NODES {
        let f = n.feat();
        if ["quartermaster", "porter", "scout"].contains(&n.id) {
            assert!(f.is_none(), "{} counts", n.id);
        } else {
            let f = f.unwrap_or_else(|| panic!("{} has a feat", n.id));
            assert!(f.split_whitespace().count() <= 3, "{f}");
            assert!(n.fallback_h() > 0, "{}: the fallback stays", n.id);
        }
    }
}

/// The apprentice: three forge steps by hand no longer light him; a band boss slain after a step by hand does. The wire
/// names the feat, then marks it met; the hire is offered at the next quiet report.
#[test]
fn the_forged_boss_kill_lights_the_apprentice_and_the_count_does_not() {
    let mut g = camp(3);
    g.lineage.town.built.push(("blacksmith".into(), 0));
    let before = node(&g, "apprentice");
    assert_eq!((before.goal.as_deref(), before.feat.as_deref(), before.feat_done), (Some("feat"), Some("forged boss kill"), Some(false)));
    assert_eq!((before.count, before.need, before.progress), (None, None, None), "a feat node carries no count");
    // a boss slain before any step by hand is no feat
    g.lineage.kills.insert(a_boss().into());
    for _ in 0..5 {
        tree::did(&mut g.lineage, "forge");
    }
    assert!(!met(&g, "apprentice"), "five steps by hand: no count lights him");
    let next = tree::next_pill(&g.lineage, false);
    assert_eq!((next.kind.as_str(), next.text.as_str(), next.have, next.need), ("feat", "apprentice · forged boss kill", None, None));
    // a new band boss after the steps
    let other = crate::defs::MONSTERS.iter().find(|m| m.boss && !m.kind.starts_with("spectral_") && !g.lineage.kills.contains(m.kind)).unwrap().kind;
    g.lineage.kills.insert(other.into());
    assert!(met(&g, "apprentice"));
    assert_eq!(node(&g, "apprentice").feat_done, Some(true));
    assert_eq!(tree::offer_next(&mut g.lineage), Some("apprentice"));
    assert_eq!(tree::lit(&g.lineage).map(|n| n.id), Some("apprentice"));
}

/// The drillmaster: a new record after a stance level by hand; the herald: a quest kept after a swap by hand; the guide: a
/// record from a waystone picked by hand. None of them before its chore by hand.
#[test]
fn the_state_feats_need_their_chore_by_hand_first() {
    let mut g = camp(5);
    g.lineage.best_depth += 1;
    assert!(!met(&g, "drillmaster"), "a record without a level by hand");
    tree::did(&mut g.lineage, "level");
    assert!(!met(&g, "drillmaster"));
    g.lineage.best_depth += 1;
    assert!(met(&g, "drillmaster"), "levelled new best");

    for s in ["quests", "start"] {
        g.lineage.systems.insert(s.into());
    }
    g.lineage.town.quests_done += 1;
    assert!(!met(&g, "herald"));
    tree::did(&mut g.lineage, "swap");
    assert!(!met(&g, "herald"));
    g.lineage.town.quests_done += 1;
    assert!(met(&g, "herald"), "swapped quest kept");

    let best = g.lineage.best_depth;
    g.lineage.tree.start_by_hand = Some((1, best));
    tree::did(&mut g.lineage, "start");
    g.lineage.best_depth += 1;
    assert!(!met(&g, "guide"), "a record from the first floor is no deep start");
    g.lineage.tree.start_by_hand = Some((5, g.lineage.best_depth));
    assert!(!met(&g, "guide"));
    g.lineage.best_depth += 1;
    assert!(met(&g, "guide"), "deep start record");
}

/// The run's feats (`note_feats`): a Bank exit carrying the clerk's price; a pet that levelled on the run, the kennel built;
/// a pup bred by hand on the run. Kept once met. A death or a short haul is no feat; a sim's run never notes one.
#[test]
fn the_run_feats_are_kept_at_the_runs_end() {
    let mut g = camp(7);
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.town.built.push(("kennel".into(), 0));
    g.start_run(None);
    let mut run = g.run.clone().unwrap();
    let price = tree::price(&g.lineage, tree::def("clerk").unwrap());
    run.secured = 0;
    run.loot = price - 1;
    tree::note_feats(&mut g, &run, ExitTier::Bank);
    assert!(!g.lineage.tree.feats.contains("clerk"), "short of the price");
    run.loot = price;
    tree::note_feats(&mut g, &run, ExitTier::Death);
    assert!(!g.lineage.tree.feats.contains("clerk"), "a death banks nothing");
    let mut sim = g.clone();
    sim.sim = true;
    tree::note_feats(&mut sim, &run, ExitTier::Bank);
    assert!(!sim.lineage.tree.feats.contains("clerk"), "a sim never meets a feat");
    tree::note_feats(&mut g, &run, ExitTier::Bank);
    assert!(g.lineage.tree.feats.contains("clerk") && met(&g, "clerk"), "full haul banked");
    run.loot = 0;
    tree::note_feats(&mut g, &run, ExitTier::Death);
    assert!(met(&g, "clerk"), "kept once met");

    // the kennel-hand: a pet of the run's party one level up at its end
    run.companions = vec![pup(901, 1, 0)];
    g.lineage.party = vec![pup(901, 1, 0)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_hand"));
    g.lineage.party = vec![pup(901, 2, 0)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(met(&g, "kennel_hand"), "pet levels up");

    // the kennel keeper: a bred pup on a run, after a breeding by hand
    run.companions = vec![pup(902, 1, 1)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_keeper"), "no breeding by hand yet");
    tree::did(&mut g.lineage, "breed");
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(met(&g, "kennel_keeper"), "bred pup fielded");
}

/// Nothing is required: with no chore by hand (the idle player), each later worker lights at its fallback age, exactly as
/// before Cut235.
#[test]
fn the_fallback_lights_every_feat_worker_untouched() {
    let mut g = camp(9);
    for b in ["blacksmith", "bank", "kennel"] {
        g.lineage.town.built.push((b.into(), 0));
    }
    for s in ["quests", "start"] {
        g.lineage.systems.insert(s.into());
    }
    for n in tree::NODES.iter().filter(|n| n.feat().is_some()) {
        g.lineage.clock_s = (n.fallback_h() as u64 - 1) * 3600;
        assert!(!met(&g, n.id), "{} before its fallback", n.id);
        assert_eq!(node(&g, n.id).eta_h, Some(1));
        g.lineage.clock_s = n.fallback_h() as u64 * 3600;
        assert!(met(&g, n.id), "{} at its fallback", n.id);
        assert_eq!(node(&g, n.id).feat_done, Some(false), "the fallback lights it, the feat stays undone");
    }
}

/// A save from before Cut235 (a tree of `v` 2) keeps its count as well as the feat: no player regresses.
#[test]
fn a_tree_from_before_keeps_its_count() {
    let mut g = camp(11);
    g.lineage.town.built.push(("blacksmith".into(), 0));
    g.lineage.tree.v = 2;
    for _ in 0..3 {
        tree::did(&mut g.lineage, "forge");
    }
    assert!(met(&g, "apprentice"));
    assert!(tree::Tree::fresh().v >= 3);
}
