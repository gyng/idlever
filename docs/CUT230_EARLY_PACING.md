# Cut230 — early pacing: an earlier Scout and depth-scaled death recovery

*Contract, 2026-10-14. Owner decision ("Both"). Base: main 947cbeb7 (Cut229).*

## Problem

The 16-seed targeted rows on main (`docs/evidence/cut229/rows-pacing-main.log`) fail two hard rows that the
routine 2-seed gate misses:

| row | main 947cbeb7 (16 seeds) |
|---|---|
| PICKED ≥ 1.5× IDLE at D13, D18, D23 | 1.00 · 2.00 · 3.00 **FAIL** (D13) |
| Scout bought ≤ min 15, ≤ 5 sends by hand (every seed, every bot) | med 8.2 · worst 19.3 min **FAIL** |

The flat 20-minute death recovery (Cut227, `RECOVERY_TICKS = 12000`) keeps TUNED ≥ 1.15× PICKED at D33, but it
charges a first-floor death the same 20 minutes as a death at the King's door. Before the Scout nothing is
automated, so an early death stalls the first session.

## Changes

1. **Earlier first automation.** The Scout lights after **2** sends by hand (was 3) and costs **0.4** forge unit
   (was 0.5): about $70 at the first floors, which the two runs pay on every measured seed (`tree::NODES`).
2. **Depth-scaled death recovery.** `persistent::recovery_ticks(depth)` gives the recovery owed after a death. The
   depth is the run's deepest floor (`Run::max_depth`). That is the floor he fell on, or the deepest floor he
   reached before falling back, so a guide start deep in the dungeon still counts as deep. It is the same quantity
   the hero's Legacy earns on (`finish_run`) and the record (`best_depth`) follows. The shape is
   `balance.recovery = [shallow ticks, last shallow floor, first full floor, exponent]`. The recovery is flat at the
   shallow value down to the last shallow floor. From the first full floor on it is the full `RECOVERY_TICKS`
   (12000 ticks, 20 minutes). Between the two it follows `((d − lo)/(hi − lo))^exponent`. The length is stored
   per death (`persistent.recovery_ticks`), so the `reincarnating` phase is the first 10 ticks of each recovery. An
   older save has no stored length and keeps the full value. A confirmed reclone keeps the full recovery. The
   Cut227 carried-rest fix (`offline.rs`, owed recovery outlasts `REST_CARRY_TICKS`) is unchanged.
3. **Harness fidelity (dayplayer).** Before the Scout, the client refuses SEND while the hero recovers
   (`Game::try_send`). The bot used `Game::send`, which started an uncounted run during recovery and drained the
   recovery with it. Before the Scout the bot now waits out the recovery owed, at its full length in the session's
   seconds, then sends (`wait_recovery`). After the hire the bot is unchanged (see Limits).

## Gates (16 seeds; `node tools/gates.mjs --full --rows …`)

No existing bar is loosened.

| row | bar | measured goal (this cut) |
|---|---|---|
| scout | Scout ≤ min 15, ≤ 5 sends, every seed, every bot | median ≈ 4 min (≤ 5), worst ≤ 8 min, 2 sends (measured 4.9 · 7.2, 2) |
| picked-idle | PICKED ≥ 1.5× IDLE at D13, D18, D23 | PASS |
| tuned-picked | TUNED ≥ 1.15× PICKED at D33 | PASS |
| outpace, picked-stages, reach, porter, random-picked, hands-idle | unchanged | PASS |
| idle-d8, idle-d13, idle-d23, idle-stall, idle-gold, idle-king, idle-stages, idle-delta | unchanged | PASS |
| stalls-idle, stalls-picked, stalls-tuned | unchanged | PASS |
| nothing-required, automation-pays, workers-daily | unchanged | PASS |
| routine `node tools/gates.mjs --full` | all rows | PASS |

IDLE's early delta (AGENTS.md: "IDLE taps only until the scout is hired … its early delta from Cut 30 is
bounded") is read by `idle-delta` and must stay within a check-in.

## Ramp search and the chosen ramp

The search keeps the shallow value at 600 ticks (60 s) and moves the knees and the exponent. "Gentler" means less
total recovery owed over D1–D33. The gentlest ramp that passes `tuned-picked`, `picked-idle` and `outpace` at 16
seeds is then run on every row above (`docs/evidence/cut230/README.md`).

| ramp | TUNED/PICKED D33 (16) |
|---|---|
| 600, 12, 28, 1 | 1.18 PASS |
| **600, 14, 28, 1 (chosen)** | **1.17 PASS** |
| 600, 12, 30, 1 | 1.17 PASS |
| 600, 13, 29, 1 / 600, 16, 28, 1 | 1.15 PASS, exactly at the bar |
| 600, 14, 29, 1 / 600, 14, 30, 1 / 600, 12, 28, 2 / 600, 10, 28, 2 | 1.07 FAIL |

**Chosen: `[600, 14, 28, 1]`.** That is 60 s through D14, then linear (D20 ≈ 9 min, D24 ≈ 14 min), and the full
20 minutes from D28. Any ramp short of full at D28, and any convex ramp, fails TUNED/PICKED. Of the ramps full
at D28, 16-28-1 passes with no margin, so the chosen ramp is the gentlest with margin.

## Results (16 seeds, `docs/evidence/cut230/final-600-14-28-1-rows16.log`)

All 29 targeted rows PASS. PICKED/IDLE reads 1.50 · 2.50 · 3.71 (main: 1.00 FAIL). The Scout reads med 4.9 ·
worst 7.2 min, 2 sends (main: 8.2 · 19.3 FAIL). TUNED/PICKED reads 1.17. The IDLE delta is +0 h. The worst-seed
goal (≤ 8 min) is met. The median (4.9 min) sits just above the ≈ 4 min aim: the two sends' run time is the
floor (two D4–D6 runs at the 4× watch plus the camp taps), and no recovery is left in it.

## Copy

Recovery copy shows the time actually left: `Recovering 1m` after a shallow death, `Recovering 20m` after a deep
one. `spanOf` rounds whole minutes up and shows seconds under a minute (`Recovering 40s`). The Journal's Scout
entry reads its count from the node (`2 manual delves; $N Gold`). The works sheet and the gem counter read
`n/2`.

## Limits

- After the Scout, the dayplayer's engaged first session still calls `Game::send` while recovering, as before
  this cut. That models the Scout's own departure after recovery only approximately. It is unchanged, so the
  PICKED/TUNED rows compare like with like.
- The routine 2-seed gate still cannot see either row. Both stay 16-seed targeted checks.
