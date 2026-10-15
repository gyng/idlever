# Sweep cut233-drillmaster

Base `tuning/balance.json` · rows `scout,porter,cadence30` · 16 seeds · exact · objective scout@0 max · binary 2b46b0d49868b5ca

Wall 157 s for 4 candidates run (0 resumed) at 4 × 8 threads (cap 32). Σ candidate wall 615 s · Σ CPU 3275 s · sequential estimate 422 s (each alone on the cap: max(CPU/cap, longest game)) → 2.68× faster.

Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.

| # | candidate | verdict | scout | scout | porter | cadence30 | wall s | CPU s |
|---|---|---|---|---|---|---|---|---|
| 1 | workers.drillmaster.price_tenths=10 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.5) PASS | 156 | 827 |
| 2 | workers.drillmaster.price_tenths=20 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.5) PASS | 147 | 763 |
| 3 | workers.drillmaster.price_tenths=30 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.4) PASS | 157 | 840 |
| 4 | workers.drillmaster.price_tenths=4 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.5) PASS | 155 | 845 |
