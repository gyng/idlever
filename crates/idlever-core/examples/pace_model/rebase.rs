//! Library states are saved under the calibration's structure (stretch 3 at shipping). A profile of another
//! stretch reads them in its own floors: the record and the floor-keyed fields are mapped through content depth
//! (a record keeps the content it has finished). `PACE_FROM_STRETCH`/`PACE_FROM_LAPS` name the saves' structure.
use idlever_core::Game;

pub fn rebase(g: &mut Game) {
    let from = std::env::var("PACE_FROM_STRETCH").ok().and_then(|s| s.parse::<u32>().ok()).unwrap_or(3).max(1);
    let from_laps = std::env::var("PACE_FROM_LAPS").map(|s| s != "0").unwrap_or(true);
    let to = idlever_core::balance::get().expedition.stretch.max(1);
    if from == to {
        return;
    }
    let reach = |f: u32| -> u32 {
        if from_laps && f > 33 * from {
            33
        } else {
            f / from
        }
    };
    let map = |f: u32| -> u32 { (reach(f) * to).max(1) };
    let l = &mut g.lineage;
    l.best_depth = map(l.best_depth);
    l.heir_best = if l.heir_best > 0 { map(l.heir_best) } else { 0 };
    l.banked_depths = l.banked_depths.iter().map(|f| map(*f)).collect();
    l.start = 1;
}
