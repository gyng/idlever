# Cut 260 — the opening follow-up

Status: **contract and result, 2026-10-18.** Two owner-approved follow-ups recorded in
`docs/CUT258_ROUGH_START.md` §4b ("Next" 1 and 2). Base: f0e095a2 (Cut258 §4b, repin 958a).

## Why

Cut258 landed the opening's levers and left three measured deviations, each with an owner decision
(2026-10-18):

1. **`picked-stages` 9.0 against its bar ≥ 10** (pacing pack 23/24). Bisection pinned it on the
   forge-first ordering and the Receptionist's need 0 together: PICKED's stages move earlier and
   days 9–14 rest on bank-look stages alone. Owner: refill PICKED's stage progression on days 9–14
   with content or tuning; never edit the bar or the bot.
2. **G2 / G4 of the opening probe fail** (G2 28.9 · 38.2 min, G4 9.8 · 16.2 min): gold arrives only
   at a run's exit, and early runs last 15–25 min at 1×. Owner: a cut on run length or mid-run
   income — shorter early runs, or banking part of the haul at checkpoints during a run.

## Hard invariants (AGENTS.md, unchanged)

- Cut196 economy: an alive Bank/Return credits 100 % of the remaining carry; a death credits the
  secured Gold (and named protection) alone; converted value is never paid twice; no new Keep
  decision and no exit salvage payment.
- A record checkpoint secures the carry permanently, even on death.
- No gate edited; the pacing pack's bars, bots and rows unchanged.

## 1. `picked-stages` (content: worker rank cadence)

Diagnosis (16 seeds, `DP_STAGES=1`, `dayplayer --rows picked-stages`): PICKED opens a stage on
days 1–8 on 16/16 seeds. On days 9–14 it opens one on 1, 3, 12, 1, 2 and 4 seeds. Days 5–8 are carried
by the worker ranks (`tree.rank_days` `[2, 4, 6]` after each hire: the first four workers are hired on
day 1, the rest on day 2, so rank IV lands on days 7 and 8). Day 7 also carries `King drilled` on most
seeds; day 8 has the second group's rank IV alone.

Lever: `tree.rank_days` `[2, 4, 6]` → `[2, 4, 8]` (`tuning/balance.json` and `balance::DEFAULT`).
Rank IV moves to days 9 and 10, which were empty on most seeds. Ranks are bought only by PICKED and
TUNED (`dayplayer` arm 2); IDLE's rows do not read them. Days 1–6 are unchanged. A replay of the log
predicted a median of 10.0 (15/16 seeds ≥ 10). `[2, 4, 7]` also predicted 10.0, with 3 seeds at 9.

| Gate | Bar | Before (f0e095a2) | After |
|---|---|---|---|
| A1 `picked-stages` (16 seeds) | median ≥ 10 (unchanged) | 9.0 FAIL | **10.0 PASS** (per seed 9×4, 10×8, 11×4) |
| A2 pacing pack, 24 rows | all PASS | 23/24 | **24/24 PASS** |
| A3 rows near their bar | not below their bar | picked-idle D13 1.50, tuned-picked 1.17, porter worst 13.6, picked-l-king median 14.0 / earliest day 10 | picked-idle 1.50 · 2.75 · 3.30, tuned-picked 1.17, porter 8.4 · 13.6, scout 2.6 · 4.5 (all unchanged); picked-l-king 13.5 · earliest day 9 (10/16 slain; bar median ≥ day 7, never before day 4) PASS, picked-l-purse 98 % PASS |

## 2. Mid-run income (rule: checkpoint gold paid when secured)

Smallest rule change: the gold a record checkpoint secures (`Run.secured`, already safe whatever the
exit) is paid into the purse on the tick it is secured, on a **watched** run (`Game::step`, `Game::fold`)
and on the **open app's** run (`offline::advance`, the camp's live clock at 1×). The exit pays the
rest: `kept − credited` (`finish_run`). An absence (`in_absence`) and a sim (`sim`) are unchanged:
they settle the whole at the exit.

- `Run.credited` (serde default 0, skipped when 0): the part of `secured` already paid.
- The ledger line is `secured D<n>`, a haul (`tree::is_haul`), so the porter's rank bonus, the
  apprentice's share and the chest treat it as they treat the exit's pay. It sets
  `persistent.exit_gold_credit` like an exit's pay.
- `ExitLine.credited` (skipped when 0) names it on the exit's line; the exit's ledger line is
  `kept − credited`, and the client's run filter (`gold.ts` `runRange`) matches that.
- `Advance.credited` (skipped when 0): the client reads the purse again when the open app's run paid
  a checkpoint, so the bar's gold rises (and the existing gold-transfer receipt plays from the
  `secured D<n>` ledger line).
- The watch's existing secured chest already flashes on a checkpoint; its tooltip now reads
  `secured · in the purse · kept even on death`.

Invariant check: a death keeps `secured` (unchanged `kept`); the purse after the run is identical
whether the run was watched or away (`tests_cut260`); `secured` never decreases, so nothing is clawed
back; no new decision.

| Gate | Bar (Cut258 §1) | Before (f0e095a2) | After |
|---|---|---|---|
| G2 longest gap between upgrades 0–60 | median ≤ 6, every seed ≤ 10 | 28.9 · 38.2 FAIL | 28.9 · 38.2 FAIL (deviation, §4) |
| G4 Receptionist affordable | ≤ 10 min, every seed | 9.8 · 16.2 FAIL | **2.6 · 4.9 PASS** |
| G1, G3, G6 | as Cut258 | PASS | 0.0 · 0.0 / 6 · 5 / 0.0 · 1.0 PASS |

## 3. Instrument

`examples/opening.rs` gains `--watch-x N` (diagnostic, never the gate): a watched run's ticks cost
1/N of their wall time. The bars are read at the default 1×, which is the open app's camp clock
(`offline::advance`, 100 ms a tick). The dayplayer's first-session model reads the watch screen's
default `fights` mode as an effective 4× (`WATCH_X`, CUT30_5 §4). The 4× reading shows how much of
G2 is run length.

## 4. Result (2026-10-18)

Evidence: `docs/evidence/cut260/` (probe before/after/4×, scout-first probe, pacing pack, repin, client runs,
observations). Values are median · worst over 16 seeds.

Opening probe (60 min at 1×):

| Gate | Bar | Before (f0e095a2) | After | |
|---|---|---|---|---|
| G1 first upgrade affordable | ≤ 3, every seed | 0.0 · 0.0 | 0.0 · 0.0 | PASS |
| G2 longest gap 0–60 | med ≤ 6, every ≤ 10 | 28.9 · 38.2 | 28.9 · 38.2 | FAIL (deviation) |
| G3 upgrades 0–30 | med ≥ 6 | 6 · 5 | 6 · 5 | PASS |
| G4 Receptionist affordable | ≤ 10, every seed | 9.8 · 16.2 | **2.6 · 4.9** | PASS |
| G6 longest forced wait 0–30 | ≤ 5, every seed | 0.0 · 1.0 | 0.0 · 1.0 | PASS |

Diagnostic `--watch-x 4` (after): G2 17.1 · 28.9 FAIL, G3 10 · 8, G4 0.7 · 1.2, forge built 16/16 by minute 60.

**Deviation G2 (measured).** Mid-run income closes G4, but G2 does not move. G2 is not a money-timing gap.
On every seed the longest gap runs from the stance levels L2–L4 (17–30 min) to the forge's first steps
(the plot is offered at the 4th delve, 37–58 min). In that window the purse holds $200–500 and nothing
else is on offer. After the Receptionist, the next gold buy is the forge (owner: `unlocks.forge_delves`
stays 4). The Legacy and marks prices are out of reach (L12/L36 against +1–3 a run; ◆5 against ~1 a
run). Paying gold sooner cannot shorten a gap with nothing to buy. Even at the 4× watch model, the gap
moves past the forge's first steps (step 2 ≥ $600). G2 ≤ 10 needs an offer in the 20–50 min window:
a cheaper or earlier forge plot, or a gold sink. That is an owner pricing call and out of this cut's
scope (run length / mid-run income).

**Receptionist before Porter in `tree::NODES` (evaluated, not applied).** The swap was measured with
everything else as above. The probe was identical on every gate (`opening-swap-scout-first.txt`). The
day-1 pacing rows were identical: porter 8.4 · 13.6, scout 2.6 · 4.5 min with 1 hand send, cadence30
16/16. With need 0 and gold from the first checkpoint, the Receptionist is lit and bought before the
Porter's two hauls are met on every seed. The order no longer decides anything in the opening. Swapping
would still reorder the works tree's trunk display and the rank-offer order (`lit_rank`), for no
measured gain. Kept as is.

`picked-l-king` (not in the pack; targeted 16 seeds): median 13.5, earliest day 9 (Cut258: 14.0, day 10), PASS against
its bar (median no sooner than day 7, never before day 4); `picked-l-purse` 98 % PASS.

Checks: `cargo test --workspace --profile fast` 1063 pass (3 new in `tests_cut260.rs`); clippy `-D warnings` clean;
`verify.sh --quick`: tests, fmt, tsc, copy-lint and tool tests pass, while lint fails on
`web/tests/legible.mjs:168` (prefer-string-starts-ends-with). That line came in with 98c26fc0, another
agent's commit, and is outside this cut. Client routine `pnpm -s test`: see
`docs/evidence/cut260/observations-2026-10-18.md` §4.

Pacing pack (`gates.mjs --pacing`, 24 rows at 16 seeds): **24/24 PASS**; the temporary `picked-stages`
deviation of Cut258 §4b is removed.

Settlements (`repin.mjs --settle`): new manifest `docs/evidence/cut260/settlements-inputs-a47a.json`;
Gold, ledger, ExitLine, `expected` and after-saves unchanged on 4/4. A first repin attempt failed on
`multihero-absence`, which showed a real defect: a multi-slot absence steps its slots through
`Session::advance`, so the absence paid `secured D<n>` lines mid-run. The totals were unchanged (25 and
75 Gold), but the ledger shape was not, and an absence must settle at its exit. Fixed: `offline::advance`
credits only when `offline_absence` is none.
