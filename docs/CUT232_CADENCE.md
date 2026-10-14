# Cut232 — first-session cadence: one new decision a report

*Contract, 2026-10-15. Owner decision 2026-10-14 ("fix the first-session cadence"). Base: main 38a05b33 (core as
8a48335d, Cut231 §4 measured). Evidence: `docs/evidence/cut232/`.*

## Problem (Cut231 §4, `cadence30`, PICKED, 16 seeds)

| Measure | Bar | Before (main) |
|---|---|---|
| Most new decisions in one look, first 30 player-min | ≤ 1 every seed | median 3.5 · worst 5 · **0/16** |
| Longest major-beat gap, first 30 player-min | ≤ 6 min every seed | median 6.4 · worst 9.1 · 8/16 |

The pile-ups (research §6a; after: §6d): the first return (chest + "first gold home" + a stance level), the Scout's hire look
(Drillmaster lit + the Kennel plot), "four delves" (Forge plot + reveal + Kennel plot + a package + a level),
"six delves" (temperaments + their reveal + the Legacy offer), the Porter with a level.

## Change: one new decision a report (`crates/idlever-core/src/news.rs`)

A per-report budget, the generalisation of the existing one-reveal-a-report rule (`reveal_left`), so no content
pile-up can recur by chance (a per-trigger retune would not survive the next content change).

- **Decisions that come by themselves always show**: a stance level the marks pay, the first chest, a Legacy upgrade
  the points pay, a worker's rank, the bank's plot. If one became new since the camp the send left
  (`Game::sent_state`; renown marks still to settle count), the report brings nothing else.
- **Everything else waits for a quiet report, one at a time, in this order**: a worker's hire offer
  (`Tree::shown`, tree `v` 2; `tree::offer_next`), the marks the run earned (`LineageState::marks_due`; the level
  they pay is that report's decision), a building plot (the Forge's, then the Kennel's: `town::open_plot`), the
  packages whose stage has come (one shelf: `packages::arrive_report`), then a system reveal
  (`systems::update_news`; still one a report). Each waits a run: a few minutes watched, about a minute of an absence.
- **One reveal is one trigger, and a held reveal is owed.** Under the budget a reveal opens every ready system of
  its trigger (`first gold home`: exits + loadout; `six delves`: heirs + temperaments). A reveal a report the player
  looks at held (a watched run's, an absence's last) is owed (`LineageState::reveal_owed`): it opens at the next quiet
  report without waiting for the one-a-report budget again. Without this the busy first session left a backlog of
  ~7 reveals that trailed the absences one a report: DAILY's `slay Warlord` reveal 24 h → 3–4.5 d and its Herald
  3 d → 5–6.5 d (4-seed probes); with it both are back at 24 h / 3 d.
- **A chore done at camp offers its worker at once** (`tree::did`): the look the tap makes shows it (the Drillmaster
  after two levels by hand). Sends and hauls a run brings home are counted at the report (`tree::did_on_report`), so
  the Scout's hire is that report's news, never a decision met mid-run (the send by hand now counts when the delve
  comes home).
- **Stance levels come with the Scout** (`packages::level_open`): before him the two sends bring the chest and the
  Scout alone. PICKED already levelled only after the Scout; the button is hidden until then (no copy added).
- **The Drillmaster acts at the report** (`tree::drill_act`, also at the send and the hour as before) and costs
  **0.4** forge unit (was 3.0): hired a run after he lights, so later levels are his acts, not decisions.
- An absence settles each run's report at the next run's start, and the last one at the return's end
  (`offline::settle_due`), after shards, night marks and renown land — reload- and slice-independent
  (`Game::news_due`, `Game::news_left`, saved). The pen's group stays outside the budget (blind 1fb7786).
- A harness's literal lineage, a sim and an old (`v` 1) tree are never held.

Not taken (measured): `GUIDE_GAP` 4→3 (starts at the D5 stone from a D8 record) raised the gap to 11/16 at 16 seeds
with every targeted row PASS, but the routine 2-seed TUNED/PICKED fell to 1.10 (FAIL; 1.35 with 4). Reverted.

## Gates (16 seeds; `docs/evidence/cut232/rows16-final.log`)

| Row | Bar | After |
|---|---|---|
| cadence30 decisions | ≤ 1 a look, every seed | **1 · 16/16** (was worst 5, 0/16) |
| cadence30 gap | ≤ 6 min, every seed | median 6.0 · worst 7.4 · **8/16** (was 6.4 · 9.1 · 8/16) — **FAIL, see below** |
| scout | ≤ min 15, ≤ 5 sends | med 4.9 · worst 7.2, 2 sends PASS |
| porter | median ≤ 12, worst ≤ 15 | 8.7 · 11.0 PASS (was 9.1 · 11.1) |
| picked-idle | ≥ 1.5× at D13, D18, D23 | 1.50 · 2.50 · 3.79 PASS (D13 protected) |
| tuned-picked | ≥ 1.15 at D33 | 1.27 PASS (was 1.17) |
| idle-d8 · idle-d13 · idle-d23 · idle-stall · idle-gold · idle-king · idle-stages · idle-delta | unchanged | PASS (+0 h) |
| outpace · picked-stages · reach · random-picked · stalls-* · nothing-required · nodes-required · hands-idle | unchanged | PASS |
| nodes-lit · nodes-bought · conserved · automation-pays · workers-daily · stance · return-pick · grew | unchanged | PASS |

## The gap: why content cannot reach 16/16 (proposal for the lead; the bar is unchanged)

Every remaining gap failure is **one watched run longer than 6 minutes** — there is no look inside a run, so no
beat can land there (`DP_LOOK_TRACE`, `docs/evidence/cut232/long-runs.txt`). They are 13–17k-tick runs from D1 to
the D8 Warlord (re-runs of cleared floors at the wall, or the first D8 push) charged at the flat 4× watch. Options:

1. **Model the watch's fold in the dayplayer clock** (Cut 27 folds floors cleared ≥ 95 % in the client). Diagnostic
   `DP_WATCH_FOLD=1` (a clone measures the folded ticks; 2 s a folded floor): gap ≤ 6 on 11/16, but the faster clock
   brings the Mother (the pen's free reveal) into the window and collides on 4 seeds. It also moves the Scout/Porter
   clocks (4.3 / 7.0 min). Needs the lead's decision: it changes the measurement.
2. **Count the gap across looks only** (a single run is not a gap: the player is watching it). Each of the 8 failing gaps is one run with no look inside it, so this rule would pass them.
3. **Shorten early runs by content** (e.g. `GUIDE_GAP` 3, a D5 start from a D8 record): 11/16, fails routine
   tuned-picked; deeper starts from a D6–D7 record would be a large pacing change.

`cadence30` stays a targeted row (the routine table shows it as `info`) until the gap bar is settled.

## Checks

Native workspace tests, dayplayer example tests, Clippy `-D warnings`, WASM (fast) `05744d70…` (6878380 bytes),
gold-settlements manifest `docs/evidence/cut232/settlements-inputs-0574.json` (`tools/repin.mjs --settle --regen`:
Gold, ledgers and exit lines exact but `packages` where an arrival now waits), client routine and targeted groups,
routine full gate: see `docs/evidence/cut232/README.md`.
