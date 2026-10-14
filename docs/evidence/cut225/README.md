# Cut225 evidence

Source: base `b497aa59`, core `bda3a479`, client `ff4a4fe5`. See the
implementation record at the end of `docs/CUT225_CLOWN_ENGINEER.md`.

## Invariance (IDLE/PICKED, 16 seeds × 14 days)

Command, run from the worktree root with each binary:

```sh
target/fast/examples/dayplayer --seeds 16 --days 14 --bots idle,picked --routine --threads 12
```

- `dayplayer-base-b497aa59.log`: pristine binary (job key `b746f911b19f5fc3`),
  built before any Cut225 edit; 1188 s on a shared machine.
- `dayplayer-final-bda3a479.log`: committed core (job key `e9dc6bd27f41e82c`).
- `dayplayer-interim.log`: an interim core (key `7ed6db76015f167a`).
- `dayplayer/base-*/` and `dayplayer/final-*/`: the 32 per-seed job results.
  All 32 are byte-identical between base and final (and interim); the bar
  tables are identical, including the pre-existing `Scout bought ≤ min 15`
  FAIL row (worst 15.6 min), present before any edit.

Comparison used: `cmp` on each `<key>-<BOT>-s<N>-d14-c3.json` pair and `diff`
of the table section after the `bar` header.

## Native and client checks

- `native-tests.log`: `cargo test -q --workspace --profile fast` (936 passed,
  6 ignored).
- `client-smoke.log`: `pnpm -s test` (38/38) on the fast WASM of `bda3a479`.
- `class-tree` and `class-styles` (not in the smoke suite) fail with the
  same assertion/timeout on this branch and on a pristine `b497aa59` WASM
  (6688669 bytes, the Cut222 size) with pristine client sources:
  pre-existing, not caused here.

## Class comparison (diagnostic only)

`classes.log`, `classes/results.json`, `classes-summary.txt`; camps
`classes/seed{1,3,5}-{clown,engineer}-camp.json` and the earning receipts
`classes/seed*-earning.json`. Command:

```sh
target/fast/examples/cut225_classes docs/evidence/cut225/classes --seeds 1,3,5 --checkins 9
```

Every camp is derived from a fresh town through public actions; no grants.
The per-build start/after saves (≈120 MB) were deleted after the run; the
example regenerates them deterministically.

Earlier measurements of the same camps (not kept as files):

1. First default policy (bell on any visible non-adjacent foe, counter
   whenever adjacent, unconditioned tree rows): Clown base D19/19/23, Misdirector
   D18/19/16, Counterplayer D18/20/17 at 72 h; 75–91 wasted bells per run (about
   half of all bells drew nobody) and ~70 counters armed per run at 0.27
   conversion. Engineer rows identical to the final table.
2. Policy only while engaged/joining (counter at two adjacent foes, bell on
   awake joining foes): Clown base D23/19/19 (final table), wasted bells
   11–13 per run; paths still used unconditioned rows (Misdirector D25/16/21).
3. Conditioned Clown tree rows: the final table (Misdirector D22/22/23,
   Counterplayer D24/23/21). No ability number changed at any step.

## Owner tuning 2026-10-14

See `clown-tuning/` and the contract section "Owner tuning 2026-10-14". Base
main 8bee3697.

- `dayplayer-base-8bee3697.log` and `dayplayer-final.log`: the IDLE/PICKED
  logs. `dayplayer/base-ea45b8fbe95df509/` and `dayplayer/final-394b3281829a4e14/`
  hold the 32 per-seed results each; all 32 are byte-identical.
- `classes-before*` and `classes-after*`: the 10-seed class comparison logs,
  results, earning receipts and summaries (`summarize.py`). The per-build saves
  were deleted; the example regenerates them.
- `sweep.txt`: the candidate sets tried on the earlier cut227-recovery-wip base.
- `settlements-inputs-5844.json` and `gold-settlements-5844*`: the repinned
  manifest and a passing run (564/24).
- `native-tests.log`, `clippy.log` and `client-class-*.log`: the checks.
