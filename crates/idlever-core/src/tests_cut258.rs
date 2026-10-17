//! Cut258 (docs/CUT258_ROUGH_START.md §4b): the opening's levers — the Receptionist offered from the first look, a
//! Legacy rank before any delve, the Legacy shop no longer report news after its first rank, the forge's plot ahead
//! of a worker's hire.
use crate::engine::Game;
use crate::{legacy, news, town, tree};

#[test]
fn receptionist_is_offered_from_the_first_look_at_a_tenth_of_a_unit() {
    let g = Game::new_resident(1);
    let scout = tree::def("scout").unwrap();
    assert_eq!(scout.need(), 0);
    assert_eq!(tree::lit(&g.lineage).map(|n| n.id), Some("scout"), "lit before any send");
    assert_eq!(tree::price(&g.lineage, scout), (crate::kit::unit_of(&g.lineage) as i32 + 5) / 10);
    // (offered by the state itself, so a report never holds it)
    assert_ne!(news::offered(&g.lineage, 0) & (1 << tree::NODES.iter().position(|n| n.id == "scout").unwrap()), 0);
}

#[test]
fn a_fresh_bloodline_buys_its_first_legacy_rank_before_any_delve() {
    let mut g = Game::new_resident(2);
    let start = crate::balance::get().marks.legacy_start;
    assert!(start >= legacy::root_price(0));
    assert_eq!(legacy::current(&g.lineage).unwrap().points, start);
    assert!(legacy::offers(&g.lineage, false).iter().any(|u| u.affordable));
    legacy::buy(&mut g, "armour").unwrap();
    assert_eq!(legacy::current(&g.lineage).unwrap().points, start - legacy::root_price(0));
}

#[test]
fn legacy_is_report_news_only_until_its_first_rank() {
    let mut g = Game::new_resident(3);
    let bit = 1u64 << (tree::NODES.len() + 2);
    assert_ne!(news::offered(&g.lineage, 0) & bit, 0, "the first offer is news");
    legacy::buy(&mut g, "armour").unwrap();
    g.lineage.bloodline.as_mut().unwrap().points += 100;
    assert!(legacy::offers(&g.lineage, false).iter().any(|u| u.affordable));
    assert_eq!(news::offered(&g.lineage, 0) & bit, 0, "a later rank the points pay holds no report");
}

#[test]
fn the_forge_plot_comes_before_a_workers_hire_at_a_quiet_report() {
    let mut g = Game::new_resident(4);
    tree::grant(&mut g.lineage, &["scout"]);
    g.lineage.persistent.completed = crate::balance::get().unlocks.forge_delves;
    g.lineage.persistent.exit_gold_credit = true;
    // (the porter's hauls are met: both wait for this quiet report)
    g.lineage.tree.done.insert("porter".into(), tree::def("porter").unwrap().need());
    assert!(town::forge_qualified(&g.lineage) && !g.lineage.town.forge_eligible);
    let before = news::offered(&g.lineage, 0);
    assert_eq!(news::settle(&mut g, before, 0), Some(0));
    assert!(g.lineage.town.forge_eligible, "the forge's plot is this report's news");
    assert!(!g.lineage.tree.shown.contains("porter"), "the porter waits a report");
    let quiet = news::offered(&g.lineage, 0);
    assert_eq!(news::settle(&mut g, quiet, 0), Some(0));
    assert!(g.lineage.tree.shown.contains("porter"));
}
