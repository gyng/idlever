//! Opt-in per-seed observations of the ordinary dayplayer; never a gate or its job cache.
//! cargo run --profile fast -p idlever-core --example stat_probe -- \
//!   --seeds 1,17,1001 --bots IDLE,PICKED --days 2 --until-depth 13 --out observations.json
#[allow(dead_code)]
#[path = "dayplayer.rs"]
mod dayplayer;
fn main() {
    if let Some(path)=std::env::var_os("IDLEVER_UPGRADE_PROFILE") {
        let raw=std::fs::read_to_string(path).expect("complete profile file");
        idlever_core::cut306_upgrades::configure_profile(&raw).expect("valid immutable upgrade profile");
    }
    let mode=std::env::var("IDLEVER_TOWN_PLAN").unwrap_or_else(|_|"off".into());
    assert!(["off","town-first"].contains(&mode.as_str()),"invalid experimental policy");
    if mode=="town-first" {
        assert!(std::env::var_os("IDLEVER_UPGRADE_PROFILE").is_some(),"explicit profile required");
        assert!(std::env::var_os("DP_UPGRADE_RECORD_DIR").is_some(),"paid records required");
    }

    if let Err(error) = dayplayer::statistical_probe() {
        eprintln!("stat_probe: {error}");
        std::process::exit(2);
    }
}
