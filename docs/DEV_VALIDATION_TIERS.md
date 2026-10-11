# Validation tiers

Owner request, 2026-10-12: aim for 20% of validation time while retaining the most useful routine coverage. This is a risk-based selection, not a measured claim of 80% assertion coverage or defect detection.

## Routine work

Run `tools/verify.sh --quick` for core tests, types and copy checks. Run `(cd web && pnpm -s test)` for the critical client journeys. For a local feature, also run its relevant existing client group: `cd web && node tests/run.mjs <name>`.

The routine client selection has 37 existing groups across ten areas: menu/save startup, town/workers, multiple heroes, packages/pen/forecasts, combat/watch/recovery, gold/supplies/gear, death/advice, reports/accounting, classes/endgame, and responsive UI/lighting. Exact names live in `web/tests/lib/suites.mjs`; `node tests/run.mjs --smoke --list` prints them without launching a browser. Assertions and timing limits are unchanged. Timing-sensitive groups retain isolated execution.

Repeated viewport matrices, historical cut regressions, extended watch cases, and detailed feature edge cases remain in the full suite. Run the specific omitted group when changing that feature. This selection does not replace visual GPU checks or native balance validation.

## Complete acceptance

`pnpm -s test:full` runs all 166 currently discovered client groups, including future top-level test files. The no-argument `node tests/run.mjs` also remains full for compatibility with acceptance scripts. Explicit test names are always labelled targeted, even with `--full`.

Use the full client suite before release, a fresh blind rating, and changes spanning several game systems. Use `tools/verify.sh --full` for the existing full native/build acceptance. Content iteration uses targeted `tools/tune.sh <rows>` rather than replaying the entire statistical audit after every edit. The exhaustive audit stays available explicitly; neither this tier nor routine full acceptance certifies omitted exhaustive cases.

## Measurement contract

The prior complete client run took 1688.0 seconds (28.1 minutes), with 165/166 passing and a forecast timing failure preserved separately. The routine target is at most 337.6 seconds (5.6 minutes). The completed revalidation took 1770.4 seconds (29.5 minutes), with 163/166 passing. The routine suite passed 37/37 in 205.7 seconds (3.4 minutes): 11.6% of the revalidation runtime, or an 88.4% reduction. It also uses 12.2% of the original 1688-second baseline, meeting the target against both. This is one same-host run using the current fast WASM, not a shipping-WASM acceptance or a statistical runtime guarantee. The full failures (Cut12 locator timeout, take-control availability, watch playback timing) remain open; the routine pass does not clear them. Raw logs, JSON results and harness checks are archived in `docs/evidence/validation-tiers/`.

Pass `--report PATH` to save the suite scope, elapsed seconds, selected results, failures and complete individual test output as JSON. The report makes slow groups visible without rerunning them. Default routine concurrency is four; default full concurrency remains seven. `TEST_JOBS` and `TEST_HEAVY_WIDTH` still allow explicit host constraints. Host load and timing failures must be recorded rather than hidden by relaxed limits.

Cut166 follow-up: with watch-live-edge isolated and the dead-stretch continuation fix, the routine tier passed 37/37 in 215.0 seconds (3m35s), still 12.1% of the complete 1770.4-second baseline. The preceding isolated run failed at 12.2 seconds of Normal dead picture and is preserved; the corrected focused run measured 8.8 seconds. See `docs/evidence/cut166/`. Complete shipping acceptance is pending.
