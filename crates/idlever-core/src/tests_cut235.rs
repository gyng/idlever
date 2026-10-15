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

fn finish_at(g: &mut Game, depth: u32) {
    let (run, mut cx) = g.ctx();
    run.depth = depth;
    run.max_depth = depth;
    crate::turn::end_run(run, &mut cx, ExitTier::Return);
    g.finish_run();
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

/// A forge purchase counts only when the forged kit actually goes on a record-setting run. Repeated chores alone
/// cannot light the apprentice; the wire names the outcome and the report can offer it after settlement.
#[test]
fn the_forged_new_best_lights_the_apprentice_and_the_count_does_not() {
    let mut g = camp(3);
    g.lineage.town.built.push(("blacksmith".into(), 0));
    let before = node(&g, "apprentice");
    assert_eq!((before.goal.as_deref(), before.feat.as_deref(), before.feat_done), (Some("feat"), Some("forged new best"), Some(false)));
    assert_eq!((before.count, before.need, before.progress), (None, None, None), "a feat node carries no count");
    g.lineage.gold_move(10000, "test grant");
    crate::kit::buy(&mut g, "weapon").unwrap();
    for _ in 0..5 {
        tree::did(&mut g.lineage, "forge");
    }
    assert!(!met(&g, "apprentice"), "the count alone never lights him");
    let next = tree::next_pill(&g.lineage, false);
    assert_eq!((next.kind.as_str(), next.text.as_str(), next.have, next.need), ("feat", "apprentice · forged new best", None, None));
    g.start_run(None);
    finish_at(&mut g, 6);
    assert!(!met(&g, "apprentice"), "forged kit without a record is no feat");
    g.start_run(None);
    finish_at(&mut g, 7);
    assert!(met(&g, "apprentice"));
    assert_eq!(node(&g, "apprentice").feat_done, Some(true));
    tree::offer_next(&mut g.lineage);
    assert_eq!(tree::lit(&g.lineage).map(|n| n.id), Some("apprentice"));
}

/// A purchase made after a send cannot claim that run's record. The next genuinely forged send can earn the feat.
#[test]
fn the_apprentice_requires_a_hand_forged_kit_at_send() {
    let mut g = camp(23);
    g.lineage.town.built.push(("blacksmith".into(), 0));
    g.lineage.gold_move(10000, "test grant");
    g.start_run(None);
    crate::kit::buy(&mut g, "weapon").unwrap();
    finish_at(&mut g, 7);
    assert!(!met(&g, "apprentice"), "the record's kit was sent before the hand purchase");
    g.start_run(None);
    finish_at(&mut g, 8);
    assert!(met(&g, "apprentice"));
}

/// Interest before a hand deposit is no feat, and a successful deposit still waits for actual positive interest.
#[test]
fn the_clerk_requires_interest_after_a_hand_deposit() {
    let mut g = camp(29);
    g.lineage.town.built.push(("bank".into(), 0));
    g.lineage.town.bank = 100;
    assert!(crate::town::night(&mut g.lineage) > 0);
    assert!(!met(&g, "clerk"), "old interest without a deposit by hand is no feat");
    g.lineage.gold_move(100, "test grant");
    g.bank_withdraw(100).unwrap();
    assert!(g.bank_deposit(50).unwrap() > 0);
    assert!(!met(&g, "clerk"), "the deposit alone is no interest");
    assert!(crate::town::night(&mut g.lineage) > 0);
    assert!(met(&g, "clerk"));
    let loaded = Game::load(&g.save()).unwrap();
    assert!(met(&loaded, "clerk"), "load retains the deposited baseline and earned interest");
}

/// The herald's quest outcome needs a hand swap first.
#[test]
fn the_state_feats_need_their_chore_by_hand_first() {
    let mut g = camp(5);
    for s in ["quests", "start"] {
        g.lineage.systems.insert(s.into());
    }
    g.lineage.town.quests_done += 1;
    assert!(!met(&g, "herald"));
    tree::did(&mut g.lineage, "swap");
    assert!(!met(&g, "herald"));
    g.lineage.town.quests_done += 1;
    assert!(met(&g, "herald"), "swapped quest kept");
}

/// The kennel-hand needs a hand fielding followed by actual pet growth; the keeper needs a bred pup fielded after
/// breeding by hand. Run outcomes latch once earned, and simulation probes never earn them.
#[test]
fn the_run_feats_are_kept_at_the_runs_end() {
    let mut g = camp(7);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.start_run(None);
    let mut run = g.run.clone().unwrap();
    // the kennel-hand: a pet of the run's party one level up at its end
    run.companions = vec![pup(901, 1, 0)];
    g.lineage.party = vec![pup(901, 1, 0)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_hand"));
    g.lineage.party = vec![pup(901, 2, 0)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_hand"), "growth without hand fielding is no feat");
    g.set_party(vec![901]).unwrap();
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_hand"), "a hand field after departure cannot credit that run");
    g.start_run(None);
    run = g.run.clone().unwrap();
    g.lineage.party[0].level += 1;
    let mut sim = g.clone();
    sim.sim = true;
    tree::note_feats(&mut sim, &run, ExitTier::Return);
    assert!(!met(&sim, "kennel_hand"), "a sim never earns a feat");
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(met(&g, "kennel_hand"), "pet levels up after hand fielding");
    g.lineage.party.clear();
    assert!(met(&g, "kennel_hand"), "earned run feats stay latched");

    // the kennel keeper: a bred pup on a run, after a breeding by hand
    run.companions = vec![pup(902, 1, 1)];
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_keeper"), "no breeding by hand yet");
    tree::did(&mut g.lineage, "breed");
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_keeper"), "a breeding after departure cannot credit that run");
    g.lineage.party = vec![pup(902, 1, 1)];
    g.start_run(None);
    run = g.run.clone().unwrap();
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!met(&g, "kennel_keeper"), "an unrelated bred generation is no proof of this hero's manual breeding");
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
    let loaded = Game::load(&g.save()).unwrap();
    assert_eq!(loaded.lineage.tree.v, 2);
    assert!(met(&loaded, "apprentice"), "load preserves the old count trigger");
    assert!(tree::Tree::fresh().v >= 3);
}

/// A requested deep start cannot earn the guide's feat when the send actually falls back to D1. Conversely a real
/// hand-selected deep start that sets a record earns it at settlement, and later selections/load do not erase it.
#[test]
fn the_guide_needs_an_actual_hand_selected_deep_start_record() {
    for (seed, fallback) in [(13, true), (17, false)] {
        let mut g = camp(seed);
        g.lineage.systems.insert("start".into());
        g.lineage.waystones = vec![5];
        g.set_start(5).unwrap();
        if fallback {
            // A selected stone that is no longer lit sends from D1.
            g.lineage.waystones.clear();
        }
        g.start_run(None);
        let run = g.run.as_ref().unwrap();
        assert_eq!(run.start, if fallback { 1 } else { 5 });
        assert_eq!(run.start_short, fallback.then_some(5));
        {
            let (run, mut cx) = g.ctx();
            run.depth = 7;
            run.max_depth = 7;
            crate::turn::end_run(run, &mut cx, ExitTier::Return);
        }
        g.finish_run();
        assert!(g.last_exit.as_ref().unwrap().new_best, "the run really set a record");
        assert_eq!(tree::feat_done(&g.lineage, "guide"), !fallback);
        assert_eq!(g.lineage.tree.feats.contains("guide"), !fallback);
        g.set_start(1).unwrap();
        let loaded = Game::load(&g.save()).unwrap();
        assert_eq!(tree::feat_done(&loaded.lineage, "guide"), !fallback, "load preserves the earned feat only");
    }
}

/// A different deep stone or a repeat of an already reached record does not meet the selected start's feat.
#[test]
fn the_guide_rejects_a_different_start_and_an_old_record() {
    let mut g = camp(19);
    g.lineage.systems.insert("start".into());
    g.lineage.waystones = vec![5, 9];
    g.set_start(5).unwrap();
    g.start_run(None);
    let mut run = g.run.clone().unwrap();
    run.start = 9;
    run.max_depth = 10;
    g.lineage.best_depth = 10;
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!tree::feat_done(&g.lineage, "guide"), "a different actual start is not the hand-selected stone");
    run.start = 5;
    run.best_at_send = Some(10);
    tree::note_feats(&mut g, &run, ExitTier::Return);
    assert!(!tree::feat_done(&g.lineage, "guide"), "revisiting an old record is no new best");
}

/// Public hand fielding plus the real pet settlement's XP growth earns the kennel-hand.
#[test]
fn hand_fielded_pet_growth_earns_the_kennel_hand_at_settlement() {
    let mut g = camp(31);
    g.lineage.town.built.push(("kennel".into(), 0));
    let mut c = pup(903, 1, 0);
    c.life.xp = crate::pets::LEVEL_XP[1] - 7;
    g.lineage.kennel.push(c);
    g.set_party(vec![903]).unwrap();
    assert!(!met(&g, "kennel_hand"));
    g.start_run(None);
    finish_at(&mut g, 7);
    assert!(g.lineage.all_companions().any(|c| c.id == 903 && c.level == 2));
    assert!(met(&g, "kennel_hand"));
}

fn town_session(seed: u64) -> crate::bloodlines::Session {
    let mut s = crate::bloodlines::Session::new(seed);
    s.active = camp(seed);
    s.active.lineage.gold_move(10000, "test grant");
    s.active.lineage.town.built.push(("blacksmith".into(), 0));
    s.active.lineage.town.built.push(("bank".into(), 0));
    s.add_bloodline().unwrap();
    s
}

/// Town interest progress follows a selection, while record/start provenance stays with its author. Once earned,
/// worker feats and their already shown hire remain visible from either resident and after a Session load.
#[test]
fn session_shares_town_worker_feats_without_sharing_hero_provenance() {
    let mut s = town_session(37);
    s.active.lineage.systems.insert("start".into());
    s.active.lineage.waystones = vec![5];
    s.set_start(5).unwrap();
    crate::kit::buy(&mut s.active, "weapon").unwrap();
    s.bank_deposit(50).unwrap();
    let first_base = s.active.lineage.tree.feat_base.clone();
    s.select_bloodline(2).unwrap();
    assert_eq!(s.active.lineage.tree.feat_base.get("clerk"), first_base.get("clerk"));
    for id in ["apprentice", "guide", "drillmaster", "kennel_hand", "kennel_keeper"] {
        assert!(!s.active.lineage.tree.feat_base.contains_key(id), "{id}: another hero's hand action is no provenance");
    }
    assert!(s.active.lineage.tree.start_by_hand.is_none());
    s.active.start_run(None);
    finish_at(&mut s.active, 7);
    assert!(!tree::feat_done(&s.active.lineage, "guide"), "another hero's hand selection cannot earn this run's guide feat");
    assert!(!tree::feat_done(&s.active.lineage, "apprentice"), "another hero's hand purchase cannot earn this run's forge feat");
    assert!(crate::town::night(&mut s.active.lineage) > 0);
    assert!(met(&s.active, "clerk"));
    s.select_bloodline(1).unwrap();
    assert!(s.active.lineage.tree.feats.contains("clerk"), "the live interest result is latched for the town");
    assert_eq!(s.active.lineage.tree.start_by_hand, Some((5, 6)));
    s.active.start_run(None);
    finish_at(&mut s.active, 7);
    assert!(met(&s.active, "apprentice") && met(&s.active, "guide"));
    tree::offer_next(&mut s.active.lineage);
    assert!(s.active.lineage.tree.shown.contains("apprentice"));
    s.select_bloodline(2).unwrap();
    assert!(met(&s.active, "apprentice") && met(&s.active, "guide"));
    assert!(tree::ready(&s.active.lineage, tree::def("apprentice").unwrap()), "a shown town hire stays shown");
    assert!(s.active.lineage.tree.start_by_hand.is_none());
    let mut loaded = crate::bloodlines::Session::load(&s.save()).unwrap();
    assert!(met(&loaded.active, "apprentice") && met(&loaded.active, "guide") && met(&loaded.active, "clerk"));
    loaded.select_bloodline(1).unwrap();
    assert_eq!(loaded.active.lineage.tree.start_by_hand, Some((5, 6)));
}

/// Background settlement of the forging hero earns a town feat even when another resident is selected.
#[test]
fn a_background_residents_record_shares_its_worker_feat_after_offline_settlement() {
    let mut s = town_session(41);
    s.select_bloodline(2).unwrap();
    crate::kit::buy(&mut s.active, "weapon").unwrap();
    s.active.start_run(None);
    {
        let (run, mut cx) = s.active.ctx();
        run.depth = 7;
        run.max_depth = 7;
        crate::turn::end_run(run, &mut cx, ExitTier::Return);
    }
    s.select_bloodline(1).unwrap();
    assert!(!s.active.lineage.tree.feat_base.contains_key("apprentice"));
    assert!(!met(&s.active, "apprentice"));
    s.run_offline_slice(1, true);
    assert!(s.active.lineage.tree.feats.contains("apprentice"), "the background record earned the town worker");
    let mut loaded = crate::bloodlines::Session::load(&s.save()).unwrap();
    assert!(met(&loaded.active, "apprentice"));
    loaded.select_bloodline(2).unwrap();
    assert!(met(&loaded.active, "apprentice"));
}

/// Loading an older Cut235 session recovers unselected latches, and a grandfathered old count remains a town hire on
/// fresh v3 residents. Neither path invents a forge/record baseline for another hero.
#[test]
fn session_load_recovers_unselected_feats_and_grandfathers_old_count_hires() {
    let mut s = town_session(43);
    s.others.get_mut(&2).unwrap().lineage.tree.feats.insert("guide".into());
    let mut loaded = crate::bloodlines::Session::load(&s.save()).unwrap();
    assert!(loaded.active.lineage.tree.feats.contains("guide"));
    loaded.select_bloodline(2).unwrap();
    assert!(loaded.active.lineage.tree.feats.contains("guide"));
    assert!(loaded.active.lineage.tree.start_by_hand.is_none());

    let mut old = town_session(47);
    old.active.lineage.tree.v = 2;
    for _ in 0..3 { tree::did(&mut old.active.lineage, "forge"); }
    assert!(tree::ready(&old.active.lineage, tree::def("apprentice").unwrap()));
    old.select_bloodline(2).unwrap();
    assert_eq!(old.active.lineage.tree.v, 3);
    assert!(tree::ready(&old.active.lineage, tree::def("apprentice").unwrap()), "eligible count hire survives the new resident's v3 tree");
    assert!(!old.active.lineage.tree.feat_base.contains_key("apprentice"));
    let loaded = crate::bloodlines::Session::load(&old.save()).unwrap();
    assert!(tree::ready(&loaded.active.lineage, tree::def("apprentice").unwrap()));
}

/// A proven town feat survives a resident's closed local gate; unearned fallbacks and count workers still obey their
/// original trigger rules, even if malformed old metadata contains an unrelated latch.
#[test]
fn only_a_configured_earned_feat_bypasses_a_residents_chore_gate() {
    let mut g = camp(53);
    g.lineage.clock_s = tree::def("guide").unwrap().fallback_h() as u64 * 3600;
    assert!(!tree::chore_open(&g.lineage, tree::def("guide").unwrap()));
    assert!(!met(&g, "guide"), "an unearned fallback cannot bypass the resident's closed gate");
    g.lineage.tree.feats.insert("guide".into());
    assert!(met(&g, "guide"), "a valid town outcome remains eligible");
    g.lineage.tree.feats.insert("scout".into());
    assert!(!met(&g, "scout"), "the Scout still requires its send count");
}

/// A manually levelled package must be worn at departure, and that run must clear a floor. Revisiting a cleared floor
/// still counts: the outcome demonstrates the levelled package without requiring a new best.
#[test]
fn the_drillmaster_needs_a_hand_levelled_worn_package_to_clear_a_floor() {
    let mut g = camp(59);
    g.lineage.pkg.owned.insert("guarded".into());
    assert!(g.spend_level("guarded").is_err(), "an unaffordable level spend is refused");
    assert!(g.lineage.tree.levelled_by_hand.is_empty(), "a refusal adds no provenance");
    g.lineage.marks = 100;
    let lv = g.spend_level("guarded").unwrap();
    assert_eq!(g.lineage.tree.levelled_by_hand.get("guarded"), Some(&lv));
    g.start_run(None);
    assert_eq!(g.sent_state.as_ref().unwrap().lineage.pkg.stance, "steady");
    finish_at(&mut g, 2);
    assert!(!met(&g, "drillmaster"), "levelling an unworn package cannot credit another package's clear");
    g.equip_package("guarded", 0).unwrap();
    g.start_run(None);
    let start = g.run.as_ref().unwrap().start;
    finish_at(&mut g, start);
    assert!(!met(&g, "drillmaster"), "departure alone clears no floor");
    g.start_run(None);
    let start = g.run.as_ref().unwrap().start;
    finish_at(&mut g, start + 1);
    assert!(!g.last_exit.as_ref().unwrap().new_best, "this deliberately revisits an already cleared floor");
    assert!(met(&g, "drillmaster"));
    assert_eq!(node(&g, "drillmaster").feat.as_deref(), Some("levelled floor clears"));
    let loaded = Game::load(&g.save()).unwrap();
    assert!(met(&loaded, "drillmaster"));
    assert_eq!(loaded.lineage.tree.levelled_by_hand, g.lineage.tree.levelled_by_hand);
}

/// An in-run purchase changes the next send, while the current run retains its departure's package level provenance.
#[test]
fn the_drillmaster_does_not_credit_an_in_run_level_purchase() {
    let mut g = camp(61);
    g.lineage.marks = 100;
    g.start_run(None);
    g.spend_level("steady").unwrap();
    finish_at(&mut g, 2);
    assert!(!met(&g, "drillmaster"), "the hand spend happened after departure");
    g.start_run(None);
    finish_at(&mut g, 2);
    assert!(met(&g, "drillmaster"), "the next departure wore the manually bought level");
}

/// A manual level belongs to its resident. Sharing town counters cannot let another resident earn the feat from an
/// unrelated package; only the earned outcome is shared after the author actually clears a floor.
#[test]
fn hand_level_provenance_stays_local_until_the_run_outcome_is_earned() {
    let mut s = town_session(67);
    s.active.lineage.marks = 100;
    s.spend_level("steady").unwrap();
    s.select_bloodline(2).unwrap();
    assert!(s.active.lineage.tree.levelled_by_hand.is_empty());
    s.active.start_run(None);
    finish_at(&mut s.active, 2);
    assert!(!met(&s.active, "drillmaster"));
    s.select_bloodline(1).unwrap();
    assert!(!s.active.lineage.tree.levelled_by_hand.is_empty());
    s.active.start_run(None);
    finish_at(&mut s.active, 2);
    assert!(met(&s.active, "drillmaster"));
    s.select_bloodline(2).unwrap();
    assert!(met(&s.active, "drillmaster"), "the earned town outcome is shared");
}

/// A deep-start run keeps its departure choice even if the player changes the next send. A choice first made during
/// the run cannot retroactively turn an automatic/legacy deep start into the hand-start feat.
#[test]
fn the_guide_uses_the_hand_selection_at_departure() {
    for (seed, selected_before) in [(71, true), (73, false)] {
        let mut g = camp(seed);
        g.lineage.systems.insert("start".into());
        g.lineage.waystones = vec![5];
        if selected_before { g.set_start(5).unwrap(); }
        else { g.lineage.set_start(5).unwrap(); }
        g.start_run(None);
        assert_eq!(g.run.as_ref().unwrap().start, 5);
        assert_eq!(g.sent_state.as_ref().unwrap().lineage.tree.start_by_hand.is_some(), selected_before);
        g.set_start(if selected_before { 1 } else { 5 }).unwrap();
        finish_at(&mut g, 7);
        assert_eq!(met(&g, "guide"), selected_before, "the next send's selection cannot rewrite this departure");
    }
}

/// Fielding while a pet's expedition is already underway changes later sends. Only a departure after the hand action
/// can earn the worker from that pet's actual settlement growth.
#[test]
fn hand_fielding_after_departure_cannot_retroactively_earn_the_kennel_hand() {
    let mut g = camp(79);
    g.lineage.town.built.push(("kennel".into(), 0));
    let mut c = pup(1901, 1, 0);
    c.life.xp = crate::pets::LEVEL_XP[1] - 7;
    g.lineage.party.push(c);
    g.start_run(None);
    g.set_party(vec![1901]).unwrap();
    finish_at(&mut g, 7);
    assert!(g.lineage.all_companions().any(|c| c.id == 1901 && c.level == 2));
    assert!(!met(&g, "kennel_hand"), "the growth belonged to a run sent before hand fielding");
    g.lineage.party.iter_mut().find(|c| c.id == 1901).unwrap().life.xp = crate::pets::LEVEL_XP[2] - 7;
    g.start_run(None);
    finish_at(&mut g, 7);
    assert!(g.lineage.all_companions().any(|c| c.id == 1901 && c.level == 3));
    assert!(met(&g, "kennel_hand"), "a subsequent hand-fielded departure earned its own growth");
}

/// Successful breeding during an expedition cannot credit a pup that was already on that expedition.
#[test]
fn breeding_after_departure_cannot_retroactively_earn_the_keeper() {
    let mut g = camp(83);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.lineage.party.push(pup(1910, 1, 1));
    g.lineage.kennel.extend([pup(1911, 2, 0), pup(1912, 2, 0)]);
    g.start_run(None);
    g.breed(1911, 1912).unwrap();
    assert!(g.lineage.tree.feat_base.contains_key("kennel_keeper"));
    finish_at(&mut g, 1);
    assert!(!met(&g, "kennel_keeper"), "this pup departed before the manual breeding");
}

/// A real manual breeding produces an egg, actual settlements hatch it, and the resulting pup earns the keeper only
/// when it is subsequently sent out.
#[test]
fn a_manually_bred_pup_earns_the_keeper_on_its_later_departure() {
    let mut g = camp(89);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.lineage.kennel.extend([pup(1921, 2, 0), pup(1922, 2, 0)]);
    g.breed(1921, 1922).unwrap();
    let egg = g.lineage.eggs[0].id;
    assert!(g.lineage.tree.bred_by_hand.contains(&egg));
    g = Game::load(&g.save()).unwrap();
    assert!(g.lineage.tree.bred_by_hand.contains(&egg));
    for _ in 0..g.lineage.egg_rests() {
        g.start_run(None);
        finish_at(&mut g, 1);
        assert!(!met(&g, "kennel_keeper"), "an egg is not a fielded pup");
        }
    let child = g.lineage.kennel.iter().find(|c| c.gen == 1).unwrap().id;
    assert_ne!(child, egg);
    assert!(!g.lineage.tree.bred_by_hand.contains(&egg));
    assert!(g.lineage.tree.bred_by_hand.contains(&child));
    g = Game::load(&g.save()).unwrap();
    g.set_party(vec![child]).unwrap();
    g.start_run(None);
    finish_at(&mut g, 1);
    assert!(met(&g, "kennel_keeper"));
}

/// Only identities successfully selected by hand may earn the fielding feat. Neither nonexistent IDs nor a different
/// automatically selected pet can borrow the first pet's hand action.
#[test]
fn the_kennel_hand_requires_the_actual_successfully_hand_selected_pet() {
    let mut g = camp(97);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.lineage.kennel.extend([pup(2101, 1, 0), pup(2102, 1, 0)]);
    g.set_party(vec![999999]).unwrap();
    assert_eq!(tree::count(&g.lineage, "kennel_hand"), 0);
    assert!(!g.lineage.tree.feat_base.contains_key("kennel_hand"));
    assert!(g.lineage.tree.fielded_by_hand.is_empty());
    g.set_party(vec![2101]).unwrap();
    assert!(g.lineage.tree.fielded_by_hand.contains(&2101));
    assert!(!g.lineage.tree.fielded_by_hand.contains(&2102));
    g.set_party_by(vec![2102], false).unwrap();
    g.lineage.party[0].life.xp = crate::pets::LEVEL_XP[1] - 7;
    g.start_run(None);
    finish_at(&mut g, 7);
    assert!(g.lineage.all_companions().any(|c| c.id == 2102 && c.level == 2));
    assert!(!met(&g, "kennel_hand"), "an unrelated pet's growth cannot borrow the selected pet's identity");
    g.set_party(vec![2101]).unwrap();
    g.lineage.party[0].life.xp = crate::pets::LEVEL_XP[1] - 7;
    let mut loaded = Game::load(&g.save()).unwrap();
    assert!(loaded.lineage.tree.fielded_by_hand.contains(&2101));
    loaded.start_run(None);
    finish_at(&mut loaded, 7);
    assert!(met(&loaded, "kennel_hand"));
}

/// A new hand breeding does not prove that an already owned generation-one pet came from that breeding.
#[test]
fn the_keeper_rejects_an_unrelated_bred_pet_after_a_hand_breeding() {
    let mut g = camp(101);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.lineage.party.push(pup(2110, 1, 1));
    g.lineage.kennel.extend([pup(2111, 2, 0), pup(2112, 2, 0)]);
    g.breed(2111, 2112).unwrap();
    let egg = g.lineage.eggs[0].id;
    assert!(g.lineage.tree.bred_by_hand.contains(&egg));
    assert!(!g.lineage.tree.bred_by_hand.contains(&2110));
    g.start_run(None);
    finish_at(&mut g, 1);
    assert!(!met(&g, "kennel_keeper"), "the manual breeding's own pup has not hatched or been fielded");
}

/// Manual pet provenance stays local even when another resident happens to use the same local companion identity.
#[test]
fn pet_identity_provenance_survives_load_without_crossing_residents() {
    let mut s = town_session(103);
    s.active.lineage.town.built.push(("kennel".into(), 0));
    s.active.lineage.kennel.extend([pup(2120, 1, 0), pup(2121, 2, 0), pup(2122, 2, 0)]);
    s.set_party(vec![2120]).unwrap();
    s.breed(2121, 2122).unwrap();
    let egg = s.active.lineage.eggs[0].id;
    s.select_bloodline(2).unwrap();
    assert!(s.active.lineage.tree.fielded_by_hand.is_empty());
    assert!(s.active.lineage.tree.bred_by_hand.is_empty());
    let mut unrelated = pup(2120, 1, 1);
    unrelated.life.xp = crate::pets::LEVEL_XP[1] - 7;
    s.active.lineage.party.push(unrelated);
    s.active.start_run(None);
    finish_at(&mut s.active, 7);
    assert!(!met(&s.active, "kennel_hand") && !met(&s.active, "kennel_keeper"));
    let mut loaded = crate::bloodlines::Session::load(&s.save()).unwrap();
    assert!(loaded.active.lineage.tree.fielded_by_hand.is_empty());
    assert!(loaded.active.lineage.tree.bred_by_hand.is_empty());
    loaded.select_bloodline(1).unwrap();
    assert!(loaded.active.lineage.tree.fielded_by_hand.contains(&2120));
    assert!(loaded.active.lineage.tree.bred_by_hand.contains(&egg));
}

/// A manually bred pet's identity follows its actual recovery egg and new hatch ID. An unrelated recovery egg with
/// the same generation never acquires that provenance merely by being hatched in the same town.
#[test]
fn hand_bred_identity_follows_the_actual_loss_egg_and_recovered_pet() {
    let mut g = camp(107);
    g.lineage.town.built.push(("kennel".into(), 0));
    g.lineage.gold_move(1000, "test grant");
    g.lineage.kennel.extend([pup(2201, 2, 0), pup(2202, 2, 0)]);
    g.breed(2201, 2202).unwrap();
    for _ in 0..g.lineage.egg_rests() {
        g.start_run(None);
        finish_at(&mut g, 1);
        }
    let child = g.lineage.kennel.iter().find(|c| c.gen == 1).unwrap().id;
    assert!(g.lineage.tree.bred_by_hand.contains(&child));
    g.set_party(vec![child]).unwrap();
    g.lineage.party[0].life.falls = crate::pets::GONE_FALLS - 1;
    g.start_run(None);
    for m in g.run.as_mut().unwrap().monsters.iter_mut().filter(|m| m.is_companion()) { m.hp = 0; }
    finish_at(&mut g, 1);
    let recovery = g.lineage.eggs.iter().find(|e| e.from_loss && e.gen == 1).unwrap().id;
    assert!(!g.lineage.tree.bred_by_hand.contains(&child));
    assert!(g.lineage.tree.bred_by_hand.contains(&recovery));
    g = Game::load(&g.save()).unwrap();
    g.hatch(recovery).unwrap();
    let recovered = g.lineage.kennel.iter().find(|c| c.gen == 1).unwrap().id;
    assert_ne!(recovered, child);
    assert!(!g.lineage.tree.bred_by_hand.contains(&recovery));
    assert!(g.lineage.tree.bred_by_hand.contains(&recovered));

    let unrelated = g.lineage.new_comp_id();
    g.lineage.eggs.push(crate::wire::Egg { id: unrelated, kind: "rat".into(), tags: vec![], gen: 1, hatch_in: 3, from_loss: true, sire: String::new() });
    g.hatch(unrelated).unwrap();
    let other = g.lineage.kennel.iter().find(|c| c.id != recovered && c.gen == 1).unwrap().id;
    assert!(!g.lineage.tree.bred_by_hand.contains(&other), "a matching generation is not a matching lineage");
    let loaded = Game::load(&g.save()).unwrap();
    assert!(loaded.lineage.tree.bred_by_hand.contains(&recovered));
    assert!(!loaded.lineage.tree.bred_by_hand.contains(&other));
}
