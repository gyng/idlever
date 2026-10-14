# Cut230 early pacing: evidence

Contract: `docs/CUT230_EARLY_PACING.md`. Final source: Scout `need 2`, `price_tenths 4`; `balance.recovery =
[600, 14, 28, 1]`, which means 60 s to D14, a linear rise, and the full 12000 ticks (20 min) from D28. All
dayplayer runs use `GATES_THREADS=24` on a shared host (load 50–150 on 32 cores).

## Ramp search (16 seeds, `gates.mjs --full --rows … [--balance profiles/<r>.json]`)

The shallow value stays 600 ticks. Σ is the total recovery owed over one death on each floor D1–D33, in ticks.
A lower Σ is gentler.

| ramp [shallow, lo, hi, exp] | Σ D1–33 | TUNED/PICKED D33 | PICKED/IDLE D13·D18·D23 | log |
|---|---|---|---|---|
| 600, 12, 28, 1 | 173696 | 1.18 PASS | 1.50 · 2.50 · 3.50 PASS | `ramp-600-12-28-1-*` (source build; all fast rows PASS) |
| **600, 14, 28, 1 (final)** | **162294** | **1.17 PASS** | **1.50 · 2.50 · 3.71 PASS** | `search-r600-14-28-1-tuned16.log`, `final-600-14-28-1-rows16.log` |
| 600, 12, 30, 1 | 162294 | 1.17 PASS | – | `search-r600-12-30-1-tuned16.log` |
| 600, 13, 29, 1 | 162296 | 1.15 PASS (at the bar) | – | `search-r600-13-29-1-tuned16.log` |
| 600, 16, 28, 1 | 150900 | 1.15 PASS (at the bar) | – | `search-r600-16-28-1-tuned16.log` |
| 600, 14, 29, 1 | 156600 | 1.07 FAIL | – | `search-r600-14-29-1-tuned16.log` |
| 600, 14, 30, 1 | 150896 | 1.07 FAIL | 1.50 · 2.50 · 3.71 PASS | `search-r600-14-30-1-rows16.log` |
| 600, 12, 28, 2 (convex) | 143414 | 1.07 FAIL | 1.50 · 2.50 · 3.71 PASS | `search-r600-12-28-2-rows16.log` |
| 600, 10, 28, 2 (convex) | 150997 | 1.07 FAIL | – | `search-r600-10-28-2-tuned16.log` |

TUNED/PICKED depends on the full recovery reaching D28. Every ramp that is not full at D28 fails. A convex ramp
(exponent 2) fails because it lightens the D20–D27 walls. Among the ramps full at D28, 16-28-1 and 13-29-1 pass
at exactly 1.15. The final 14-28-1 is the gentlest that keeps a margin (1.17). It ties 12-30-1 on Σ, but it is
lighter on D13–D20, where the early-game rows are read, and it matches the owner's "full from ~D28". PICKED/IDLE
at D13 reads 1.50 on every ramp. The D13 ratio is set by the Scout change and the shallow 60 s, not by the knees.

## Final rows (16 seeds, `final-600-14-28-1-rows16.log`), all PASS

IDLE D8 16/16 · IDLE D13 day 0.5 · IDLE D23 16/16, day 4.3 · stall 2 d · gold 14/14 · King 0/16 · stance 1 · 6 ·
return pick 672/672 · grew 672/672 · IDLE stages 10 · **PICKED/IDLE 1.50 · 2.50 · 3.71** (main: 1.00 FAIL) ·
outpace 99% · PICKED stages 12 · reach 16/16 · stalls 0.00% (IDLE, PICKED, TUNED) · **TUNED/PICKED 1.17** ·
RANDOM 16/16 · 15/16, +4 · +32 h · nothing required ok · Porter 9.1 · worst 11.1 · **Scout med 4.9 · worst 7.2 min,
2 sends** (main: 8.2 · 19.3 FAIL) · nodes lit 0 · 0 · nodes bought 0 · conserved 0 off · HANDS +0 · −4 · −56 ·
workers pay away 29.32 vs 29.12 · workers daily 30.83 vs 30.68 · IDLE delta +0 h.

Scout traces per send (`DP_SCOUT_TRACE=1`, diagnostic only) are in the scratch files and not kept. The worst seed
is 12, with two slow D6 runs (429 s). Before the dayplayer waited out recovery, seed 6's two pre-Scout deaths each
cost an uncounted run (worst 11.2 min).

## Checks

- `native-tests.log`: 939 passed, 6 ignored (workspace, `--profile fast`). `clippy.log`: clean (`-D warnings`).
- WASM (fast) `web/src/engine/pkg/idlever_wasm_bg.wasm`: 6849963 bytes, sha256
  `b0d10d68c9fffc22fef818ea721b7cf18f945aaad3bf128b23337a205b76cbb4`.
- Gold settlements: `settlements/repin.log` shows `gold_settlement_repin` with Gold, ledger, ExitLine and expected
  unchanged. Three after-saves differ only in `persistent.recovery_ticks`, `recovery_until_tick` and `rest_left`,
  plus one resting hero's `total_turns`. They are regenerated in `settlements/`. Bank-positive is byte-identical.
  The new manifest `settlements-inputs-b0d1.json` is the default. Browser: 564 checks, 24 cases, PASS
  (`client-targeted-rerun.log`).
- Fixtures `fixtures/` come from `examples/recovery_fixtures.rs` and are a first-floor death (600 ticks). The
  Cut227 fixtures stay as older-save, full-recovery coverage (`hero-life-camp` checks both).
- Client targeted (`client-targeted.log`, rerun with `TEST_JOBS=2` in `client-targeted-rerun.log`): hero-life (307),
  hero-life-camp (28), home-resident-phases (25), gold-settlements (564), bloodline-founding, first-plot,
  worker-purchases, journal-earned (326) and home-residents (506) all PASS. The first run's five failures all ended
  at the same 383 s mark under host load and passed on the rerun.
- Client routine `pnpm -s test` (`client-routine.log`): 33/38 under host load 70–90. fights:break, watch-console,
  death-fix-discovery, king-advice-scope and clarity:paint (a timing check, 1439 ms with load 73.9) failed. Rerun
  alone with `TEST_JOBS=1 --failed` (`client-routine-rerun.log`): all five PASS, **38/38**.
- Routine full gate `node tools/gates.mjs --full` (`gates-full.log`): **all PASS** (metrics, qa, dayplayer;
  18 fortnight cases; RANDOM 16/16 · 15/16).
- GPU shots (private Xvfb, `shots.mjs`): `shots/first-session-scout-after-2-sends.png` shows the earned seed-1 save
  after two manual sends, with the Scout lit at $80, $122 in the purse and the gem at "Delve 2/2".
  `shots/camp-shallow-death-recovering-1m.png` shows a first-floor death with the gem at "Recovering 1m" and the hero
  at "Cloning 1m".
