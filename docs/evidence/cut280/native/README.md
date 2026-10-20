# Cut280 native statistical probe validation — 2026-10-20

Opt-in diagnostic exporter; no game-rule, ordinary policy, gate threshold or WASM change.
Owned source: `examples/stat_probe.rs`, `examples/dayplayer_stat/mod.rs`, and five appended lines after the ordinary dayplayer body.
Exact compiler/source/executable/profile identities and the unchanged ordinary policy/cache-prefix hash are in `identities.json`.
The root statistical workflow owns snapshotting, random seed generation, caching and inference; this exporter supplies raw observations only.

## Checks

- `targeted-tests.log`: five focused tests pass, 18 imported ordinary tests intentionally filtered out; final run31.69s.
  Tests compare complete ordinary SeedOut, identical bounded check-in prefix without invented daily values,
  one-thread/three-thread outcomes including full-width u64 holdout and actual distinct history beyond seed metadata,
  strict bot/seed/metric parsing, and atomic output publication refusing an existing file. Wall time is excluded from deterministic comparisons.
- `clippy.log`: scoped dev-balance Clippy with warnings denied, exit0.
- `build.log`: final feature-enabled fast-profile example build, exit0.
- `cli.log`, `final-cli-smoke.json`: final executable accepts the full default profile via IDLEVER_BALANCE_JSON,
  preserves seed18446744073709551615 as an authoritative decimal string, and publishes a bounded real observation; exit0.
- `holdout-u64max-partial.json`: the earlier same-executable holdout smoke, D8 observed at the first8h check-in,
  bestD13, completed_days0, campaign_completefalse, no invented daily-array values.
- `ordinary-daily-idle-full.json`: one-day DAILY/IDLE campaigns finish at24h; DAILY uses one ordinary check-in,
  IDLE three. Both daily arrays contain exactly one completed day. Full profile equals the supplied default profile.
- `explicit-need2-partial.json`: a separate process with workers.scout.need=2 explicitly configured produces
  scout_sends2. No test changes the process-global balance installation. Earlier direct invocations with
  IDLEVER_SKIP_TWIST or DP_STALLS returned2 before producing a file.

The feature-enabled executable hash is identical for the archived initial CLI smokes and the final smoke; later changes were
confined to cfg(test) assertions. No ordinary job cache is read or written. Outputs are complete JSON documents published atomically
with a no-clobber hard link; output files already present are refused, including publication races.

## Historical failed assertion

An initial five-test run passed four tests and failed an added literal expectation that shipping IDLE seed1 would take exactly
two manual sends before the Scout. The complete exporter-vs-ordinary-Play equality had already passed: both actually report1.
The old Cut30.5 two-send wording is superseded by the Cut260 need-zero Receptionist and first-checkpoint funding; Cut260 itself
records the one-manual-send observation. No product behavior was changed to satisfy that assertion. The literal was removed;
current exact ordinary SeedOut parity still covers the actual manual-send count. The separate explicit need2 profile above verifies
configuration without inventing a new fixed shipping rule.

## Export semantics

`request.seeds` and top-level `records[].seed` are full-width decimal strings. `seed_out.seed` remains the exact native u64 field
of ordinary SeedOut and must not be interpreted as a precise JavaScript Number. Requests and records are canonically sorted;
records sort by bot then numeric seed. `elapsed_seconds` is wall-clock diagnostics, never a gameplay metric.

Depth stops occur after the complete ordinary check-in. `completed_days` counts completed daily aggregates, and
`campaign_complete` distinguishes reaching the full requested horizon. `effective_checkins_per_day` records ordinary DAILY/AWAY
cadence overrides. Missing arrival times remain null; no gate's cap/drop/infinite handling is silently supplied.
Only the ordinary seven milestone depths8/13/18/23/28/29/33 can be requested as depth stops.

No fresh full gate, large campaign, browser run, shipping build, deployment or commit was performed by this task.
