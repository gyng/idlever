# Sweep cut265-prices-diagnostic

Base `scratchpad/cut265-price-search/base.json` · rows `upgrades-sink` · 1 seeds · exact · objective upgrades-sink@0 max · binary fake6571b093b5fc

Wall 971 s for 8 candidates run (0 resumed) at 4 × 2 threads (cap 8). Σ candidate wall 3664 s · Σ CPU 3067 s · sequential estimate 3662 s (each alone on the cap: max(CPU/cap, longest game)) → 3.77× faster.

Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.

| # | candidate | verdict | upgrades-sink | upgrades-sink | wall s | CPU s |
|---|---|---|---|---|---|---|
| 1 | p16-40 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 399 | 381 |
| 2 | p24-40 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 407 | 368 |
| 3 | p32-20 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 397 | 383 |
| 4 | p36-22 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 469 | 374 |
| 5 | p37-23 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 500 | 375 |
| 6 | p40-20 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 520 | 379 |
| 7 | p48-24 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 525 | 384 |
| 8 | p8-20 | FAIL (upgrades-sink) | 0 | 0.00% FAIL | 447 | 424 |
