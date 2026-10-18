//! Cut264's explicit PICKED+H diagnostic. Ordinary dayplayer policies remain unchanged.
//! cargo run --profile fast -p idlever-core --example picked_hurry -- --seeds 16 --threads 4 --out DIR
#[allow(dead_code)]
#[path = "dayplayer.rs"]
mod dayplayer;
fn main() { dayplayer::picked_hurry_diagnostic(); }
