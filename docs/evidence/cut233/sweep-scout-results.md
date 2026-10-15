# Sweep cut233-scout

Base `tuning/balance.json` · rows `scout,porter,cadence30` · 16 seeds · exact · objective scout@0 max · binary 2b46b0d49868b5ca

Wall 162 s for 4 candidates run (0 resumed) at 4 × 8 threads (cap 32). Σ candidate wall 625 s · Σ CPU 3321 s · sequential estimate 404 s (each alone on the cap: max(CPU/cap, longest game)) → 2.50× faster.

Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.

| # | candidate | verdict | scout | scout | porter | cadence30 | wall s | CPU s |
|---|---|---|---|---|---|---|---|---|
| 1 | workers.scout.price_tenths=10 | PASS | 8.2 | med 8.2 · worst 13.1 min, 5 sends PASS | 8.4 · worst 10.7 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.4) PASS | 162 | 871 |
| 2 | workers.scout.price_tenths=2 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.5) PASS | 162 | 863 |
| 3 | workers.scout.price_tenths=4 | PASS | 4.9 | med 4.9 · worst 7.2 min, 2 sends PASS | 8.7 · worst 11.0 PASS | gap med 0.0 · worst 0.0 min · dec 1 · 16/16 (run ≤ 7.5) PASS | 157 | 834 |
| 4 | workers.scout.price_tenths=20 | FAIL (scout) | 13.7 | med 13.7 · worst 21.0 min, 7 sends FAIL | 8.7 · worst 13.2 PASS | gap med 0.0 · worst 7.3 min · dec 1 · 15/16 (run ≤ 7.6) FAIL | 144 | 754 |
