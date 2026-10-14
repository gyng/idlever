# Sweep ramp-demo

Base `tuning/balance.json` · rows `tuned-picked,picked-idle` · 16 seeds · fail-fast · objective tuned-picked@0 max · binary 60496cc5a50393b1

Wall 1329 s for 3 candidates run (9 resumed) at 3 × 6 threads (cap 18). Σ candidate wall 3967 s · Σ CPU 10287 s · sequential estimate 1125 s (each alone on the cap: max(CPU/cap, longest game)) → 0.85× faster.

Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.

| # | candidate | verdict | tuned-picked | tuned-picked | picked-idle | wall s | CPU s |
|---|---|---|---|---|---|---|---|
| 1 | recovery.1=12,recovery.2=28 | PASS exact | 1.18 | 1.18 PASS | 1.50 · 2.50 · 3.50 PASS | 1323 | 3412 |
| 2 | recovery.1=12,recovery.2=27 | PASS exact | 1.17 | 1.17 PASS | 1.50 · 2.50 · 3.50 PASS | 1315 | 3432 |
| 3 | recovery.1=14,recovery.2=27 | PASS exact | 1.17 | 1.17 PASS | 1.50 · 2.50 · 3.71 PASS | 1329 | 3443 |
| 4 | recovery.1=14,recovery.2=28 | PASS | ~1.165 | ~1.15…1.18 PASS | ~1.5 · 2.5 · 3.71 PASS | 809 | 3215 |
| 5 | recovery.1=12,recovery.2=26 | PASS | ~1.16 | ~1.15…1.17 PASS | ~1.5 · 2.5 · 3.5 PASS | 1261 | 3350 |
| 6 | recovery.1=16,recovery.2=26 | PASS | ~1.16 | ~1.15…1.17 PASS | ~1.5 · 2.5 · 3.71 PASS | 803 | 3227 |
| 7 | recovery.1=16,recovery.2=27 | PASS | ~1.16 | ~1.15…1.17 PASS | ~1.5 · 2.5 · 3.71 PASS | 794 | 3162 |
| 8 | recovery.1=16,recovery.2=28 | PASS | ~1.16 | ~1.15…1.17 PASS | ~1.5 · 2.5 · 3.71 PASS | 736 | 3162 |
| 9 | recovery.1=14,recovery.2=26 | FAIL (tuned-picked) | ~1.035 | ~1…1.07 FAIL | ~1.5…2 PASS | 1269 | 3420 |
