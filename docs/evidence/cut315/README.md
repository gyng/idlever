# Cut315 — evidence

Contract: [CUT315](../../CUT315_BANK_VAT_ADOPTION.md). Base `0a45061f` plus the
uncommitted Cut315 working tree, 2026-10-21. Native gates ran on the fast
profile; the browser journey ran on real fast WASM (headless). Viewports were
402×681 and 1440×900.

## Routine full gate (`node tools/gates.mjs --full`)

`gates-full.log`, and the full dayplayer table in `dayplayer-full.json`.
Metrics: 8/8 PASS; QA invariants PASS. Dayplayer has 2 FAILs, both inherited
and unchanged:

| bar | before (HANDOFF, Cut282–312) | Cut315 |
| --- | --- | --- |
| TUNED beats PICKED by ≥ 15 % at D33 | 1.10 FAIL (PICKED 40/48 h, TUNED 40/40 h) | 1.10 FAIL (identical hours) |
| Workers pay the away player | D18 48 vs 24 h · mean best 29.93 vs 30.14 FAIL | D18 48 vs 24 h · mean best 29.93 vs 30.32 FAIL |

New bar: **PICKED Bank/Vat upgrades ≥ 10 % of days 3–14 income — 10.9 %
(2/2 seeds buying), PASS.**

Selected unchanged passes:

- PICKED is ≥ 1.5× faster than IDLE (1.50 · 2.50 · 6.25).
- RANDOM is slower than PICKED on 16/16 seeds.
- IDLE reaches D8 on day 1 and D23 by day 12.
- Gold is conserved for every bot at every check-in.
- Stalls stay ≤ 1 %.
- Workers never cost the daily player a floor (30.82 vs 31.39).
- No IDLE King.

The workers row's by-hand comparator rose by 0.18 floors. The AWAY bot's own
results (D18 at 48 h, mean best 29.93) are exactly as before.

Routine coverage does not include the TUNED system-removal arms (the new
`buildings` system's leave-one-out clause). Those need `--exhaustive`, which
was not run.

## Other checks

- `tests_cut315` (5 tests): 12 whole-byte refusals, 2- and 3-resident payments,
  shared levels, reload, whole/sliced background play, future death 7800 ticks
  / Rest 780 s, reclone 12000, chest not funding, Gold-only path, no-level
  defaults, 150-tick shallow curve. PASS.
- Workspace fast tests: 1107/1109 on the first run. The two failures were
  Cut264 tests pinning the old 600-tick curve; they were updated to 150 ticks.
  The hurry example was kept at 6000 ticks left (1565 Gold), and the
  shallow-clone hurry is now not offered (15 s is below the 30 s minimum).
- The dayplayer example's tests pass 26/26, including the plan test (waits, pays
  93200, restores the order).
- Clippy `--workspace --all-targets -D warnings`: clean. Web fmt:check, oxlint,
  tsc and copy-lint (0 violations) pass.
- Real-WASM `web/tests/building-upgrades.mjs`: `ok` at both widths. Screenshots
  are in `shots/`.

The final rerun of the native suite and the routine client subset after the
"no discount" wording change is recorded in HANDOFF.

## Final rerun after the wording change

- Workspace fast tests: 1109 pass, 6 ignored, 0 failed.
- Routine client subset (`pnpm test`): 43/45.
  - `worker-first-act` fails with the identical first failure recorded in the
    alpha.3 audit (`deploy-20261021/client-final-summary.json`, pre-existing).
  - `clarity:paint` failed a paint-timing bar at load 28.9 on 32 cores (1421 ms
    against 1.2 s). Rerun alone, it passed 5/5.
