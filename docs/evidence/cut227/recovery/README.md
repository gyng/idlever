# Cut227 death recovery (owner decision 2026-10-14)

Final: `persistent::RECOVERY_TICKS = 12000` (20 game minutes, the old wake; was 600). Package L5 needs 200 runs
(`LEVEL_RUNS`; was 220). A carried-rest recovery bypass is fixed. The routine full gate plays RANDOM vs PICKED
on 16 seeds. GATES_THREADS 16–24.

## Bug fixed: the carried-rest cap bypassed recovery

`offline::begin_absence` clamps carried rest to `REST_CARRY_TICKS` (6000 ticks, 10 min). Once recovery ran
past 10 minutes, the clamp also cut the death recovery still owed at each absence boundary. With the Scout, the
hero left with recovery outstanding. Without it, the absence stalled. The cap now keeps the owed recovery
(`offline.rs`). Every run made before the fix is in `pre-carry-fix/` and is superseded.

## Search after the fix (`recovery<V>-*.log`)

| ticks (min) | TUNED/PICKED D33, 16 seeds | Workers pay the away player (routine 2) | qa forecast bank vs sends (10) |
|---|---|---|---|
| 7500 (12.5) | 1.00 FAIL | PASS | PASS |
| 9000 (15) | 1.17 PASS | PASS | FAIL (0.563 vs 0.605 ±0.041) |
| 10500 (17.5) | 1.17 PASS | FAIL (29.04 vs 29.57) | FAIL (0.580 vs 0.625) |
| 11250 (18.75) | 1.17 PASS | FAIL (29.04 vs 29.04) | PASS |
| 12000 (20) | 1.17 PASS | PASS (29.64 vs 29.39) | PASS |

Before the fix, fail-fast: 3000 and 6000 settle at ≤ 1.07 (FAIL). Recovery under 10 minutes is unaffected by the
fix. 12000 is the shortest tested value that passes all three rows. No gate was weakened.

## Stance L5: content tuned, gate unchanged

At 12000 the first full routine run (`gates-full-12000.log`) failed one row alone: "Stance L5 by day 7"
(IDLE median 8 over 2 seeds; 7 over 16). Fewer runs fit a day. Package L5 went 220 → 200 runs
(balance-profile probe, then source). After that, at 16 seeds (`final-l5-200-rows16.log`): stance 2 · 7,
TUNED/PICKED 1.17, workers 29.46 vs 29.21, all PASS.

## Final checks (source ee97ffc8 and later)

- `gates-full-12000-l5-200.log`: routine `node tools/gates.mjs --full` **all PASS**. Metrics all PASS, qa all PASS
  (10 seeds), every dayplayer bar PASS. TUNED/PICKED D33 (routine 2 seeds) 1.40. RANDOM vs PICKED 16/16 · 16/16,
  median +4 · +24 h. Stance 2 · 6.
- `native-tests.log`: 936 passed, 6 ignored. `clippy.log`: clean (-D warnings).
- WASM (fast) `web/src/engine/pkg/idlever_wasm_bg.wasm`: 6850347 bytes, sha256
  `13e8c281701f1b85b38211818de56bec2150c7277e1f7b21a289fcea7a7ee6ba`.
- Gold settlements: `gold_settlement_repin` leaves Gold, ledger, ExitLine and expected unchanged; after-saves differ
  only in recovery tick fields (`settlements/`). New manifest `../settlements-inputs-13e8.json` is now the default.
  Browser run: 564 checks, 24 cases, PASS.
- Fixtures `fixtures/` come from `examples/recovery_fixtures.rs` at 12000.
- Client logs: `client-routine.log` (36/38 under host load 60–190 on 32 cores; clarity:paint timing, watch-console
  passed on rerun `client-watch-console.log`), `client-targeted*.log`.
- Targeted client groups (`client-targeted.log`, rerun with TEST_JOBS=1 `client-targeted-rerun.log`): hero-life (307 checks),
  hero-life-camp, home-resident-phases, home-services, hero-presence, class-tree, class-styles, cut120 and gold-settlements
  all PASS. home-heroes and home-residents FAIL, and they fail the same way on the baseline fd56 package. Baseline was
  checked with origin/main's untouched pkg and the original cut218 fixture (`hh-fd56.log`, `hr-all-fd56.log`): home-heroes
  times out at line 105, and home-residents' "tent centre routes to its own action" fails in the all-fixture order. So both
  failures predate this cut. home-residents passes per part on 13e8 (`hr-rest.log`, `hr-reincarnating.log`).
- GPU shots (private display): `shots/camp-recovering-20m.png` and `shots/hero-panel-recovering.png`
  (`shots.mjs`).
