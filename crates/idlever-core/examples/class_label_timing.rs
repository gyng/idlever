//! Cold/warm immutable canonical-label diagnostic; elapsed times are not a balance gate.
use std::time::Instant;
fn main() {
    let first=Instant::now();
    assert_eq!(idlever_core::class_tree::label("path:fighter_recovery").as_deref(),Some("Recovery"));
    let cold_ns=first.elapsed().as_nanos();
    let warm=Instant::now();
    for _ in 0..10000 { std::hint::black_box(idlever_core::class_tree::label("path:fighter_recovery")); }
    let warm_total_ns=warm.elapsed().as_nanos();
    println!("{}",serde_json::json!({"cold_ns":cold_ns,"warm_calls":10000,"warm_total_ns":warm_total_ns,
        "warm_mean_ns":warm_total_ns as f64/10000.0,"note":"fresh-process diagnostic; host timing, no pass threshold"}));
}
