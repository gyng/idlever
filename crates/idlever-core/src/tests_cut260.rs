//! Cut260 §2 (docs/CUT260_OPENING_FOLLOWUP.md): a watched or open-app run pays its checkpoint gold into the purse the
//! tick it is secured; the exit pays the rest. An absence and a sim settle whole at the exit, as before. The purse
//! after the run is the same either way: no coin is paid twice, none is lost.
use crate::engine::Game;
use crate::offline;

fn fresh(seed: u64) -> Game {
    let mut g = Game::new(seed);
    g.build_town("house").expect("a fresh town builds its house");
    g.try_send().expect("the first send");
    g
}

fn secured_lines(g: &Game) -> i32 {
    g.lineage.gold_ledger.iter().filter(|l| l.why.starts_with("secured D")).map(|l| l.delta).sum()
}

/// Watch the run in flight to its end; the largest purse gain seen before the exit, and the exit's line.
fn watch(g: &mut Game) -> (i32, crate::wire::ExitLine) {
    let gold0 = g.lineage.gold;
    let mut mid = 0;
    for _ in 0..4000 {
        let r = g.step(64);
        if r.run_over {
            let line = r.events.iter().rev().find_map(|e| match e {
                crate::Ev::Exit { line: Some(l), .. } => Some((**l).clone()),
                _ => None,
            });
            return (mid, line.expect("the exit carries its line"));
        }
        mid = mid.max(g.lineage.gold - gold0);
    }
    panic!("the run never ended");
}

#[test]
fn a_watched_runs_checkpoint_gold_reaches_the_purse_mid_run_and_once() {
    for seed in 1..=4 {
        let mut watched = fresh(seed);
        let mut away = watched.clone();
        let gold0 = watched.lineage.gold;
        let (mid, line) = watch(&mut watched);
        // (before the Receptionist an absence finishes the run in flight and no more)
        offline::run_offline_counts(&mut away, 3 * 3600);
        assert_eq!(away.lineage.persistent.completed, 1, "seed {seed}: the absence finished the one run");
        assert_eq!(secured_lines(&away), 0, "seed {seed}: an absence pays at the exit only");
        assert!(mid > 0, "seed {seed}: the checkpoints paid before the exit");
        assert_eq!(secured_lines(&watched), line.credited, "seed {seed}: the ledger's checkpoint lines are the line's credited");
        assert!(line.credited <= line.secured && line.credited <= line.kept, "seed {seed}: {line:?}");
        let exit = watched.lineage.gold_ledger.iter().rev().find(|l| crate::engine::is_exit_why(&l.why)).unwrap();
        assert_eq!(exit.delta, line.kept - line.credited, "seed {seed}: the exit pays the rest");
        assert_eq!(watched.lineage.gold - gold0, away.lineage.gold - gold0, "seed {seed}: the same purse either way");
        assert_eq!(watched.lineage.gold - gold0, line.kept, "seed {seed}: the run's whole kept, once");
    }
}

#[test]
fn an_absence_holds_checkpoint_gold_and_the_open_app_pays_it() {
    let mut g = fresh(1);
    // (an absence's ticks: into the run, past its first checkpoint, not to its end)
    g.lineage.in_absence = true;
    let mut n = 0;
    while g.run.as_ref().is_some_and(|r| r.secured == 0 && r.over.is_none()) {
        g.tick();
        assert_eq!(g.credit_secured(), 0, "an absence never pays mid-run");
        n += 1;
        assert!(n < 40_000, "no checkpoint");
    }
    let run = g.run.as_ref().unwrap();
    assert!(run.over.is_none() && run.credited == 0 && secured_lines(&g) == 0);
    let (secured, gold) = (run.secured, g.lineage.gold);
    // the open app's clock (`advance`) pays what the checkpoints secured, and says so
    let a = offline::advance(&mut g, 100);
    let credited = g.run.as_ref().map_or(0, |r| r.credited);
    assert!(credited >= secured && a.credited == credited, "{a:?} credited {credited} secured {secured}");
    assert_eq!(g.lineage.gold, gold + credited);
    assert_eq!(secured_lines(&g), credited);
}

#[test]
fn a_sim_never_pays_the_purse() {
    let mut g = fresh(2);
    g.sim = true;
    let gold0 = g.lineage.gold;
    for _ in 0..4000 {
        if g.run.as_ref().is_none_or(|r| r.over.is_some()) {
            break;
        }
        g.tick();
        assert_eq!(g.credit_secured(), 0);
    }
    assert_eq!(g.lineage.gold, gold0);
}
