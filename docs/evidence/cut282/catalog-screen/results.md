# Sweep cut282-guide-gap

Base `tuning/balance.json` · rows `tuned-picked,automation-pays` · 2 seeds · exact · objective tuned-picked@0 max · binary 9a45a001d0dbc6ea

Wall 697 s for 3 candidates run (0 resumed) at 2 × 4 threads (cap 8). Σ candidate wall 999 s · Σ CPU 3538 s · sequential estimate 597 s (each alone on the cap: max(CPU/cap, longest game)) → 0.86× faster.

Never a gate pass: a candidate's PASS is the targeted rows only; `~` marks a row fail-fast settled early (its range; ranked by the midpoint); `exact` marks a `--refine` rerun without fail-fast.

| # | candidate | verdict | tuned-picked | tuned-picked | automation-pays | wall s | CPU s |
|---|---|---|---|---|---|---|---|
| 1 | gap6 | PASS | 1.5 | 1.50 PASS | (in every 2–3 days): D18 sooner or a deeper mean best D18 48 vs 24 h · mean best 29.75 vs 29.25 PASS | 303 | 1059 |
| 2 | gap8 | FAIL (tuned-picked) | 1.1 | 1.10 FAIL | (in every 2–3 days): D18 sooner or a deeper mean best D18 48 vs 24 h · mean best 29.89 vs 29.18 PASS | 508 | 1800 |
| 3 | shipping-gap4 | FAIL (tuned-picked) | 1.1 | 1.10 FAIL | (in every 2–3 days): D18 sooner or a deeper mean best D18 48 vs 24 h · mean best 29.93 vs 30.14 FAIL | 188 | 678 |
