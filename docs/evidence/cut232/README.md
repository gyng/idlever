# Cut232 — first-session cadence: one new decision a report (evidence, 2026-10-15)

Contract: [docs/CUT232_CADENCE.md](../../CUT232_CADENCE.md). Base origin/main 38a05b33 (core = 8a48335d).

## Cadence (PICKED, 16 seeds, first session)

- `timeline-session-16.json`, `cadence-per-seed.txt` (`cadseed.mjs`): decisions ≤ 1 on **16/16** (was worst 5, 0/16);
  gap median 6.0 · worst 7.4 · ≤ 6 min on **8/16** (was 6.4 · 9.1 · 8/16).
- `looks-session-16.txt` (`DP_LOOK_TRACE=1 DP_SESSION_ONLY=1`), `long-runs.txt` (`longruns.mjs`): every failing gap is
  one watched run > 6 min with no look inside it (D1 → D8 runs, 13–17k ticks).
- `watch-fold-diagnostic.txt` (`DP_WATCH_FOLD=1`, proposal only): the watch's fold modelled — gap ≤ 6 on 11/16, decisions
  ≤ 1 on 12/16 (the Mother's free pen reveal enters the window), Scout/Porter 4.3/7.0 min.
- `rows16-g3.log`: the `GUIDE_GAP` 3 experiment (all targeted rows PASS, cadence gap 11/16) — reverted: the routine
  2-seed TUNED/PICKED read 1.10 (FAIL) with it, 1.35 without.
- `probe1-rows16.log`: an early probe (before the owed reveals and report-time counting); history only.

## Gates

- `rows16-final.log` (`gates.mjs --full --rows …`, 31 rows, 16 seeds): all PASS except `cadence30` (gap). picked-idle
  1.50 · 2.50 · 3.79; tuned-picked 1.27; scout 4.9 · 7.2 min; porter 8.7 · 11.0 min; idle-delta +0 h.
- `pacing16.log` (`gates.mjs --pacing`, main's 24-row pack): all PASS except `cadence30`.
- `gates-full.log` (routine `gates.mjs --full`): **all PASS**, exit 0.
- `native-tests.log`: workspace 939 passed, 6 ignored. `dayplayer-tests.log`: 17 passed. `clippy.log`: clean.

## WASM and gold settlements

- WASM (fast) 6878380 bytes, sha256 `05744d70310cb3da22e8546a8569cc0c119d9408b409ab4a0238544ec896a611`.
- `repin.log` (`tools/repin.mjs --dir docs/evidence/cut232 --settle --regen`): Gold, ledgers and exit lines exact on
  4/4 saved settlements (exit `packages` re-pinned where an arrival now waits: `gold_settlement_repin` strips only that
  field); all 4 after-saves regenerated in `settlements/`; new default manifest `settlements-inputs-0574.json`.

## Client

- `client-routine.log` (`pnpm -s test`): 38/38.
- `client-targeted.log`: gold-settlements (564/24), worker-first-act, first-plot, journal-earned (326), cut305:sheet,rank,
  hero-life (307), hero-life-camp, worker-purchases, home-residents (506), bloodline-founding, home-resident-phases,
  cut120 — 12/12 PASS. The exhaustive-only full `cut305` walk fails its day-0 surface count and manual-chest steps;
  its full-suite subset (`client-cut305-sheet-rank.log`) passes. Not compared against main.

## Timeline (16 × 14, IDLE/PICKED/DAILY/AWAY)

`timeline-16x14.json`, `summary-16x14.md/.json` → research doc §6d.
