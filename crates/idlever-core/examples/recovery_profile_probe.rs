//! Process-level recovery-profile/timer compatibility check. No tuning acceptance.
use idlever_core::{balance, persistent, Game};

fn main() {
    balance::configure_from_env().expect("valid immutable balance profile");
    let cap = u64::from(balance::get().recovery_full_ticks);
    let mut g = Game::new_literal(1);
    persistent::recover_at(&mut g.lineage, 28);
    assert_eq!(persistent::remaining(&g.lineage), cap);
    assert_eq!(persistent::recovery_total(&g.lineage), cap);
    assert_eq!(u64::from(g.lineage.rest_left), cap);
    let saved = g.save();
    let mut whole = Game::load(&saved).unwrap();
    let mut sliced = Game::load(&saved).unwrap();
    whole.rest_tick(cap as u32);
    let first = (cap / 3) as u32;
    sliced.rest_tick(first);
    sliced = Game::load(&sliced.save()).unwrap();
    sliced.rest_tick(cap as u32 - first);
    assert_eq!(
        whole.save(),
        sliced.save(),
        "whole/sliced/reloaded recovery"
    );
    assert_eq!(persistent::remaining(&whole.lineage), 0);
    persistent::recover(&mut whole.lineage);
    assert_eq!(
        persistent::remaining(&whole.lineage),
        cap,
        "confirmed reclone cap"
    );

    // A timer saved under the historical profile survives a different process profile.
    g.lineage.persistent.recovery_ticks = persistent::RECOVERY_TICKS;
    g.lineage.persistent.recovery_until_tick = g.lineage.total_turns + persistent::RECOVERY_TICKS;
    g.lineage.rest_left = persistent::RECOVERY_TICKS as u32;
    let loaded = Game::load(&g.save()).unwrap();
    assert_eq!(
        persistent::remaining(&loaded.lineage),
        persistent::RECOVERY_TICKS
    );
    assert_eq!(
        persistent::recovery_total(&loaded.lineage),
        persistent::RECOVERY_TICKS
    );
    assert_eq!(loaded.lineage.rest_left, persistent::RECOVERY_TICKS as u32);
    g.lineage.persistent.recovery_ticks = 0;
    let legacy = Game::load(&g.save()).unwrap();
    assert_eq!(
        persistent::recovery_total(&legacy.lineage),
        persistent::RECOVERY_TICKS
    );
    println!(
        "{}",
        serde_json::json!({"status":"PASS", "profile":balance::get(),
        "curve_ticks":(0..=40).map(persistent::recovery_ticks).collect::<Vec<_>>() })
    );
}
