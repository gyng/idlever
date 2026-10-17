//! Cut232 (docs/CUT232_CADENCE.md, the owner 2026-10-14: "never two decisions at once"): one new decision a
//! report. A run's report brings at most one new thing to decide. Some decisions come by themselves — a worker
//! ready to hire, a stance level the marks pay, the first chest, a Legacy upgrade the points pay, a worker's rank,
//! the bank's plot — and those always show. The rest wait for a quiet report, one at a time, in this order: a
//! building plot (the forge's, then the kennel's), the packages whose stage has come (one shelf), a system's reveal
//! (`systems::update_news`, still one a report). A report that brought anything else holds them for the next one.
//! Nothing is lost by waiting: each waits a run (a few minutes watched; a minute of an absence).
//! A harness's literal lineage and a sim are never held.
use crate::engine::{Game, LineageState};

/// The decisions the state offers by itself, as bits: each worker ready and unhired, the worn stance's level the
/// marks pay (`pending` marks a rank still to settle adds), the first chest, the first Legacy upgrade the points pay,
/// a worker's rank on offer, the bank's plot.
pub fn offered(l: &LineageState, pending: u32) -> u64 {
    let mut bits = 0u64;
    let nodes = crate::tree::NODES;
    for (i, n) in nodes.iter().enumerate() {
        if !crate::tree::hired(l, n.id) && crate::tree::ready(l, n) {
            bits |= 1 << i;
        }
    }
    let b = nodes.len();
    let marks = l.marks + pending;
    if crate::packages::level_price(l, &l.pkg.stance).is_some_and(|p| p <= marks) {
        bits |= 1 << b;
    }
    if l.tree.chest > 0 || crate::tree::count(l, "porter") > 0 {
        bits |= 1 << (b + 1);
    }
    // (Cut258: the Legacy offer is news until a rank is bought — afterwards the points paying another rank is the
    // known shop, never a decision that holds the report's worker, marks or plot)
    if crate::legacy::current(l).is_none_or(|h| h.spent == 0) && crate::legacy::offers(l, false).iter().any(|u| u.affordable) {
        bits |= 1 << (b + 2);
    }
    if crate::tree::lit_rank(l).is_some() {
        bits |= 1 << (b + 3);
    }
    if crate::town::build_ready(l, "bank") {
        bits |= 1 << (b + 4);
    }
    bits
}

/// The marks the renown still to settle will add (`Game::settle_renown`: a mark a rank).
pub fn pending_marks(g: &Game) -> u32 {
    let l = &g.lineage;
    let renown = l.renown + g.batch.best_score;
    let mut r = l.rank;
    while renown >= 100 * (r + 1) * (r + 1) {
        r += 1;
    }
    r - l.rank
}

/// Whether this game's reports are held to one decision (a player's lineage, never a sim's or a harness's).
pub fn gated(g: &Game) -> bool {
    !g.sim && !g.lineage.pkg.literal
}

/// The end of a run's report: the decisions that came by themselves since the camp this send left (`before`,
/// `Game::sent_state`'s), then — on a quiet report — the one waiting decision it brings, in order: a worker's hire,
/// the marks the run earned (a level they pay), a building plot, the packages whose stage has come. Returns the
/// budget left for the report's last reveal pass (`Some(0)`: none).
pub fn settle(g: &mut Game, before: u64, run_id: u32) -> Option<u32> {
    // (with the drillmaster at work the marks land at once: he spends them before the player looks)
    if crate::tree::on(&g.lineage, "drillmaster") {
        land_marks(g);
    }
    crate::tree::drill_act(g);
    let now = offered(&g.lineage, pending_marks(g));
    if now & !before != 0 {
        return Some(0);
    }
    // (Cut258: the forge's plot comes before a worker's hire — gold had nothing to buy while it waited)
    if crate::town::open_forge(&mut g.lineage) {
        return Some(0);
    }
    if crate::tree::offer_next(&mut g.lineage).is_some() {
        return Some(0);
    }
    // (the marks land; a level they pay is this report's decision)
    if g.lineage.marks_due > 0 {
        land_marks(g);
        if offered(&g.lineage, pending_marks(g)) & !before != 0 {
            return Some(0);
        }
    }
    if crate::town::open_plot(&mut g.lineage).is_some() {
        return Some(0);
    }
    let lines = crate::packages::arrive_report(&mut g.lineage);
    if !lines.is_empty() {
        let beats = crate::packages::beats(&lines);
        if let Some(line) = g.last_exit.as_mut().filter(|l| l.run_id == run_id) {
            line.packages.extend(beats.iter().cloned());
        }
        if let Some(line) = g.batch.exits.iter_mut().rev().find(|l| l.run_id == run_id) {
            line.packages.extend(beats.iter().cloned());
        }
        if let Some(line) = g.deaths.get_mut(&run_id).and_then(|r| r.death.line.as_mut()) {
            line.packages.extend(beats);
        }
        g.batch.pkg_lines.extend(lines);
        return Some(0);
    }
    Some(1)
}

fn land_marks(g: &mut Game) {
    let due = std::mem::take(&mut g.lineage.marks_due);
    g.lineage.marks += due;
}
