# Cut233 — cadence30 between looks; content tunables in balance.json (evidence, 2026-10-15)

Owner decisions 2026-10-15. Base origin/main 9d3a2400 (Cut232 merged). Contract amendment:
[docs/CUT232_CADENCE.md](../../CUT232_CADENCE.md) ("Owner amendment 2026-10-15"); inventory:
[docs/ITERATION_SPEED.md](../../ITERATION_SPEED.md) ("Content tunables in `tuning/balance.json`").

## 1. cadence30 counts gaps between looks only

- `dayplayer.rs`: `SeedOut::looks` (each first-session camp arrival); `cadence` skips a stretch with no arrival
  strictly inside it (one watched run). The ≤ 1 decision a look bar is unchanged. The longest single run is printed
  beside the value, never gated. Unit test `cadence_tests::gap_counts_between_looks_only`.
- `cadence30-16.log` (`gates.mjs --full --rows cadence30`, 16 seeds, ~2 min): **gap med 0.0 · worst 0.0 min · dec 1 ·
  16/16 (run ≤ 7.5) PASS**. Every first-30-min look of every PICKED seed brings a major beat.
- Now a bar in the routine table (no extra play). Routine full gate: `2/2 (run ≤ 6.6) PASS`.
- Unlock order: owner: keep, review in play (CUT232).

## 2. Content tunables into balance.json (pure refactor)

Sections `workers`, `tree`, `rest`, `gold`, `kit`, `unlocks`, `stance`, `marks`, `monsters` (`balance.rs`;
`tuning/balance.json`). Each is `deny_unknown_fields`, bound-checked (`check_sections`), and optional as a whole (a
pre-Cut233 profile loads at shipping values; `balance::tests::shipping_template_and_bounds`).

Invariance (shipping defaults = the old constants):
- `invariance.log`: `node tools/timeline-invariance.mjs srcf93fbe7244d647a2 srcbc2c616aeef776fe --all` — **64/64 jobs
  identical, every field (timeline too)**: IDLE, IDLE30, PICKED, TUNED × 16 seeds × 14 days, base = the cadence commit
  a2b77634's dayplayer, new = the refactor's (`IDLEVER_SRC_KEY` cut233base / cut233new, `IDLEVER_CACHE_FRESH=1`).
- `invariance-base-table.txt` vs `invariance-new-table.txt`: the printed tables differ only in the wall time line
  (`invariance-table.diff`).
- `native-tests.log`: workspace 939 passed, 6 ignored (as Cut232). `dayplayer-tests.log`: 18 passed (17 + the cadence
  test). `clippy.log`: `-D warnings` clean.
- `repin.log` (`tools/repin.mjs --dir docs/evidence/cut233 --note … --settle`): WASM (fast) 6883918 bytes, sha256
  `d161212ba1b44b52689ba8ab872c2c6b9a99815f51cedac49a161070f7adfdff` (code layout; was 05744d70…). Gold, ledger and
  ExitLine unchanged on 4/4 settlements; `expected` and every after-save unchanged (no `--regen`). New default manifest
  `settlements-inputs-d161.json`.

## 3. Sweep demo (new keys, no recompile)

`tools/sweep.mjs --rows scout,porter,cadence30 --seeds 16 --no-fail-fast`, 4 candidates × 8 threads, ~2.5 min each run:
- `sweep-drillmaster-results.md` (`workers.drillmaster.price_tenths` 4 · 10 · 20 · 30): all PASS, rows unchanged
  (scout 4.9 · 7.2, porter 8.7 · 11.0, cadence 16/16) — the Drillmaster is hired after the Scout and the Porter and
  his price does not move the first 30 minutes' decisions (longest run 7.4 at 30).
- `sweep-scout-results.md` (`workers.scout.price_tenths` 2 · 4 · 10 · 20): 2 and 4 (shipping) identical; 10 → scout
  med 8.2 · worst 13.1 min, 5 sends (PASS, porter 8.4 · 10.7); 20 → scout 13.7 · 21.0 min, 7 sends **FAIL**, cadence
  15/16 (a 7.3 min look gap).

## 4. Gates and client

- `pacing.log` (`gates.mjs --pacing`, 24 rows, 16 seeds): **24/24 PASS**, values as Cut232 (picked-idle 1.50 · 2.50 ·
  3.79, tuned-picked 1.27, scout 4.9 · 7.2, porter 8.7 · 11.0, idle-delta +0 h, workers-daily 31.08 vs 30.92,
  automation-pays 48 vs 48 h · 30.07 vs 29.48), cadence30 16/16.
- `gates-full.log` (routine `gates.mjs --full`): **all PASS**, exit 0.
- `client-routine.log` (`pnpm -s test`): 38/38. `client-gold-settlements.log`: 564 checks, 24 cases, PASS on d161.
