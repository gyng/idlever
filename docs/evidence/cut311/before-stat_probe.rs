//! Opt-in per-seed observations of the ordinary dayplayer; never a gate or its job cache.
//! cargo run --profile fast -p idlever-core --example stat_probe -- \
//!   --seeds 1,17,1001 --bots IDLE,PICKED --days 2 --until-depth 13 --out observations.json
#[allow(dead_code)]
#[path = "dayplayer.rs"]
mod dayplayer;
fn main() {
    if let Err(error) = dayplayer::statistical_probe() {
        eprintln!("stat_probe: {error}");
        std::process::exit(2);
    }
}
