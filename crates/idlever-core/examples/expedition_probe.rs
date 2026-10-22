//! Cut317 §1: what a run is today — per run its start and end depth, length, floor pace and how it ended,
//! and the share of wall time the hero spends in the dungeon. Plays a save for N hours through the open app's
//! clock (`advance`, one second a step), as a player who leaves the tab open. Diagnostic, never a gate.
//!   cargo run -q --profile fast -p idlever-core --example expedition_probe -- SAVE.json [--hours 24]
use idlever_core::Game;

fn main() {
    idlever_core::balance::configure_from_env().expect("IDLEVER_BALANCE_JSON");
    let args: Vec<String> = std::env::args().collect();
    let path = args.get(1).expect("SAVE.json");
    let hours: u64 = args
        .iter()
        .position(|a| a == "--hours")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(24);
    let mut g = Game::load(&std::fs::read_to_string(path).expect("read save")).expect("load save");
    // `--absence H`: time one absence of H hours (the return after idle), then stop
    if let Some(h) = args.iter().position(|a| a == "--absence").and_then(|i| args.get(i + 1)).and_then(|s| s.parse::<u64>().ok()) {
        let t = std::time::Instant::now();
        let r = g.run_offline(h * 3600);
        println!("absence {h} h: {:.2} s native · {} runs · {} ticks", t.elapsed().as_secs_f64(), r.runs, g.lineage.total_turns);
        return;
    }
    let (mut inside, mut total) = (0u64, 0u64);
    let mut cur: Option<(u32, u32, u64, u32)> = None; // run id, start depth, wall second it began, deepest
    let mut purse = g.lineage.gold;
    let mut timed = false;
    let mut why = String::new();
    let mut camps = (0u32, 0i32);
    let mut deep = (0u32, 0u32);
    let counts = |g: &Game| {
        (
            g.lineage.runs_banked,
            g.lineage.runs_returned,
            g.lineage.runs_died,
        )
    };
    let mut before = counts(&g);
    let mut lens: Vec<u64> = Vec::new();
    println!(
        "{:>4} {:>6} {:>5} {:>5} {:>7} {:>9} exit",
        "run", "at_h", "from", "to", "min", "min/floor"
    );
    for s in 0..hours * 3600 {
        g.advance(1000);
        total += 1;
        if let Some(r) = &g.run {
            inside += 1;
            if (s + 1) % 3600 == 0 {
                println!(
                    "       h{:<3} run {} D{} turn {} hp {}/{} carry {} rests {} retreat {}",
                    (s + 1) / 3600,
                    r.id,
                    r.depth,
                    r.turn,
                    r.hero.hp,
                    r.hero.max_hp,
                    r.carried(),
                    r.rests,
                    r.retreat
                );
                println!(
                    "             pos {:?} up {:?} poison {:?} manual {} ring {:?} spent {} at {} foes {}",
                    r.hero.pos,
                    r.floor.stairs_up,
                    r.hero.poison,
                    r.manual,
                    r.verb_ring,
                    r.retreat_spent(),
                    r.retreat_at,
                    r.monsters.iter().filter(|m| m.hp > 0 && m.hostile()).count()
                );
                if std::env::var("PROBE_MAP").is_ok() && r.retreat_spent() {
                    use idlever_core::tiles::Tile;
                    let m = &r.floor.map;
                    for y in 0..m.h {
                        let row: String = (0..m.w)
                            .map(|x| {
                                let p = idlever_core::geom::Pos { x, y };
                                if p == r.hero.pos {
                                    return '@';
                                }
                                if let Some(mo) =
                                    r.monsters.iter().find(|mo| mo.hp > 0 && mo.pos == p)
                                {
                                    return if mo.awake { 'M' } else { 'm' };
                                }
                                match m.get(p) {
                                    Tile::Wall => '#',
                                    Tile::Floor => '.',
                                    Tile::Door => '+',
                                    Tile::StairsUp => '<',
                                    Tile::StairsDown => '>',
                                    Tile::Water => '~',
                                    Tile::Chasm => ' ',
                                    _ => '*',
                                }
                            })
                            .collect();
                        println!("             {row}");
                    }
                    for mo in r
                        .monsters
                        .iter()
                        .filter(|mo| mo.hp > 0 && mo.hostile() && mo.pos.cheb(r.hero.pos) <= 3)
                    {
                        println!(
                            "             near: {} {:?} awake {} dormant {}",
                            mo.kind, mo.pos, mo.awake, mo.dormant
                        );
                    }
                    println!("             why {:?}", r.rows_why);
                    println!(
                        "             hero vanish {} paralysed {} confused {} class {:?}",
                        r.hero.vanish_t, r.hero.paralysed, r.hero.confused, r.hero.class
                    );
                    let before = r.turn;
                    let st = g.step(20);
                    let adv = g.advance(0);
                    for e in st.events.iter().take(40) {
                        println!(
                            "             ev {}",
                            format!("{e:?}").chars().take(160).collect::<String>()
                        );
                    }
                    let r = g.run.as_ref().unwrap();
                    println!(
                        "             +2s turn {} -> {} ended {:?} hp {}",
                        before, r.turn, adv.ended, r.hero.hp
                    );
                    println!(
                        "             hero energy {} speed {} pace {} actions {} awaiting {}",
                        r.hero.energy,
                        r.hero.speed(),
                        r.hero.pace,
                        r.actions,
                        r.awaiting
                    );
                    for mo in r
                        .monsters
                        .iter()
                        .filter(|mo| mo.hp > 0 && mo.pos.cheb(r.hero.pos) <= 1)
                    {
                        println!(
                            "             adj {} energy {} speed {} hp {} ally {}",
                            mo.kind,
                            mo.energy,
                            mo.effective_speed(),
                            mo.hp,
                            mo.ally
                        );
                    }
                    std::process::exit(0);
                }
            }
            match &mut cur {
                Some(c) if c.0 == r.id => {
                    c.3 = c.3.max(r.depth);
                    timed = r.timed_out;
                    camps = (r.camps, r.secured);
                    deep = (r.content_depth(), r.bottoms);
                    if let Some(i) = r.exit_row.or(r.homeward) {
                        let set =
                            &g.lineage.sets[g.lineage.active_set.min(g.lineage.sets.len() - 1)];
                        why = set
                            .rows
                            .get(i.max(0) as usize)
                            .map(|row| format!("row {i}: {row:?}"))
                            .unwrap_or(format!("row {i}"));
                        why.truncate(110);
                    }
                }
                _ => cur = Some((r.id, r.depth, s, r.depth)),
            }
        } else if let Some((id, from, at, to)) = cur.take() {
            let now = counts(&g);
            let exit = if now.2 > before.2 {
                "death"
            } else if now.0 > before.0 {
                "bank"
            } else if now.1 > before.1 {
                "return"
            } else {
                "?"
            };
            before = now;
            if exit == "death" && std::env::var("PROBE_VERDICT").is_ok() {
                let t = std::time::Instant::now();
                let v = g.death(id);
                println!("       verdict {:.2}s ({} ticks run) {}", t.elapsed().as_secs_f64(), s - at, v.is_some());
            }
            let gold = g.lineage.gold - purse;
            purse = g.lineage.gold;
            let secs = s - at;
            lens.push(secs);
            let floors = (to + 1).saturating_sub(from).max(1);
            println!(
                "{id:>4} {:>6.1} {from:>5} {to:>5} {:>7.1} {:>9.1} {exit}{} purse{gold:+} camps {} secured {} content D{} bottoms {}",
                at as f64 / 3600.0,
                secs as f64 / 60.0,
                secs as f64 / 60.0 / f64::from(floors),
                if timed { " (cap)" } else { "" },
                camps.0,
                camps.1,
                deep.0,
                deep.1
            );
            if std::env::var("PROBE_WHY").is_ok() {
                if let Some(x) = &g.last_exit {
                    println!("       exit: {} · cause {:?} · reason {:?}", x.text.chars().take(160).collect::<String>(), x.cause, x.reason);
                }
            }
            if !why.is_empty() {
                println!("       {}", std::mem::take(&mut why));
            }
        }
    }
    lens.sort_unstable();
    let med = lens.get(lens.len() / 2).copied().unwrap_or(0);
    println!(
        "runs {} · median {:.1} min · in dungeon {:.0}% of {} h",
        lens.len(),
        med as f64 / 60.0,
        100.0 * inside as f64 / total.max(1) as f64,
        hours
    );
}
