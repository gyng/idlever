# Validation tiers

Owner request, 2026-10-12: aim for 20% of validation time while retaining the most useful routine coverage. This is a risk-based selection, not a measured claim of 80% assertion coverage or defect detection.

## Routine work

Run `tools/verify.sh --quick` for core tests, types and copy checks. Run `(cd web && pnpm -s test)` for the critical client journeys. For a local feature, also run its relevant existing client group: `cd web && node tests/run.mjs <name>`.

The routine client selection spans ten areas: menu/save startup, town/workers, multiple heroes, packages/pen/forecasts, combat/watch/recovery, gold/supplies/gear, death/advice, reports/accounting, classes/endgame, and responsive UI/lighting. Exact names live in `web/tests/lib/suites.mjs`; `node tests/run.mjs --smoke --list` prints the current count and names without launching a browser. Assertions and timing limits are unchanged. Timing-sensitive groups retain isolated execution.

The current full audit adds detailed feature checks. Historical whole walks and repeated viewport cases remain in the exhaustive suite. Run the specific omitted group when changing that feature. This selection does not replace visual GPU checks or native balance validation.

## Complete acceptance

`pnpm -s test:full` runs the current feature groups. The no-argument `node tests/run.mjs` uses the same current full scope. `pnpm -s test:exhaustive` retains the original inventory and original viewport variants. Counts grow as regressions are added; each command prints its exact selected count, and `--list` prints the complete inventory. Future top-level test files join both automatically unless explicitly classified as historical. The 44 historical whole walks moved or replaced are mapped in `docs/evidence/cut181/final-scope/current-mapping.json`; extra-case limitations are explicit. Works retains its unique sheet/rank parts. At the Cut181 checkpoint, full had124 groups:34 state-focused groups at400px and33 responsive triples retaining320px and1440px. Exhaustive retained166 groups. Later feature matrices document their own reductions below. Explicit test names are always labelled targeted, even with `--full`.

Cut219 survivor builds retains all ten genuine fixture cases and all functional
choices, refusals, Gold, private residents, stale controls, actual departures and
confirmed Rebirth checks in full. Geometry reuses mandatory Loadouts/Hero reads,
then adds Journal and six longest-stage boundary pairs:36 views across320/400/
1440px and normal/200% text. Critical mode covers fresh, temperament and queued
stages in nine views. Exhaustive retains the original180-view Cartesian matrix;
`IDLEVER_PROGRESS_GEOMETRY=exhaustive` requests it explicitly. Result JSON lists
the144 geometry combinations omitted from compact full; no functional full case
is omitted. Explicit width/scale/case overrides remain diagnostic and record
their actual scope.

The isolated compact measurement passes664 assertions/36 views in105.3 seconds,
versus the recorded562.2-second180-view phase on the same host:18.7% of that
harness's time. This meets its120-second target. The earlier phase used5ae WASM;
the compact phase uses frozen71ca and also includes proved shared/away fixes, so
this is a recorded phase comparison, not an identical-binary A/B or a measured
runtime for the whole client suite. Evidence:
`docs/evidence/cut219/ui/compact-71ca-first/`. Critical mode passes144 assertions/
nine views in25.1 seconds; Core work had resumed, so this is a descriptive
timing. Full records remain in lossless `results.json.gz` archives with byte/
SHA manifests and small summaries. Survivor builds uses the runner's heavy/timing lane (one worker in
routine/full; existing three-worker heavy cap in exhaustive), rather than
joining twelve ordinary CPU browsers.

The final integrated e846 package subsequently passes805 checks/all ten cases/
36 views in85.6 seconds, including explicit quiet import feedback assertions.
Its preceding116.9-second Game/Gold pass is preserved with an unaccepted fixture
import FX scope; transient reset handling was corrected before the final pass.
These remain measurements of this single group, not the complete155-group full
suite. See `docs/evidence/cut219/ui/compact-e846-second/`.

Use the full client suite before release, a fresh blind rating, and changes spanning several game systems. Use `tools/verify.sh --full` for the existing full native/build acceptance. Content iteration uses targeted `tools/tune.sh <rows>` rather than replaying the entire statistical audit after every edit. The exhaustive audit stays available explicitly; neither this tier nor routine full acceptance certifies omitted exhaustive cases.

## Historical routine measurements (before Cut181)

The prior complete client run took 1688.0 seconds (28.1 minutes), with 165/166 passing and a forecast timing failure preserved separately. The routine target is at most 337.6 seconds (5.6 minutes). The completed revalidation took 1770.4 seconds (29.5 minutes), with 163/166 passing. The routine suite passed 37/37 in 205.7 seconds (3.4 minutes): 11.6% of the revalidation runtime, or an 88.4% reduction. It also uses 12.2% of the original 1688-second baseline, meeting the target against both. This is one same-host run using the current fast WASM, not a shipping-WASM acceptance or a statistical runtime guarantee. Those historical full failures (Cut12 locator timeout, take-control availability, watch playback timing) were not cleared by the routine pass. Raw logs, JSON results and harness checks are archived in `docs/evidence/validation-tiers/`.

Pass `--report PATH` to save the suite scope, elapsed seconds, selected results, failures and complete individual test output as JSON. The report makes slow groups visible without rerunning them. Default routine concurrency is four; default current full concurrency is up to twelve workers (bounded by available CPUs), with timing-sensitive groups isolated (heavy width one). Exhaustive keeps its previous heavy width three. `TEST_JOBS` and `TEST_HEAVY_WIDTH` still allow explicit host constraints. Host load and timing failures must be recorded rather than hidden by relaxed limits.

Cut166 follow-up: with watch-live-edge isolated and the dead-stretch continuation fix, the routine tier passed 37/37 in 215.0 seconds (3m35s), still 12.1% of the complete 1770.4-second baseline. The preceding isolated run failed at 12.2 seconds of Normal dead picture and is preserved; the corrected focused run measured 8.8 seconds. See `docs/evidence/cut166/`. Complete shipping acceptance was pending at that historical checkpoint.

## Full audit cleanup (Cut181)

The owner requested compacting the full audit itself, rather than another tier.
The fixed target is 359.449 seconds, 20% of the recorded 1797.246-second Cut180
run. The first cleaned full audit passed 124/124 in 620.778 seconds with seven
jobs and heavy width one: 34.5% of baseline, missing the target. The viewport-cleaned run finished 123/124 in 523.583 seconds; its controlled enemy fixture was corrected and verified at all original widths. A twelve-worker run then finished 123/124 in 370.454 seconds, missing the target by 11 seconds. Its chore fixture now supplies an explicit consecutive streak, retaining the required count and original timeout; measured longest-first ordering is applied to all current groups. Final complete measurement passes124/124 in340.043seconds (5m40s),18.920% of baseline, meeting the359.449-second target. No
assertion or timing threshold was weakened. Neither this selection nor its
feature mapping proves 80% defect detection. See `docs/CUT181_FULL_AUDIT_COMPACTION.md`
and preserved evidence in `docs/evidence/cut181/`.

The subsequent original Cut180 acceptance passed all 166 groups in 2447.953
seconds. It clears the earlier failures on that unchanged source; this slower
retry is not used as the cleanup target's denominator. Earlier failures and
measurement records above remain historical evidence.

Final scope refinement retains Works sheet/rank checks while whole legacy
Cut305 remains exhaustive. Responsive triples use both endpoints; state checks
keep the main phone width. The final default-command measurement passes124/124 in340.043seconds (5m40s),81.080% faster than1797.246seconds. Twelve normal workers/one timing group,32 available CPUs; all562 guarded inputs match.
The preceding default run failed122/124 in386.475seconds. Its remaining
controlled enemy bookkeeping read is now consistent, and Normal badge
readiness/state are captured atomically. Existing all-width focused checks
pass3/3; scope tests pass7/7. Numeric limits remain unchanged.

The held-message frame/lifetime group retains both widths and all original
assertions, and now runs as an isolated timing group. Its prior full failure
and unchanged isolated pass remain preserved. The successful complete default
run is archived in `docs/evidence/cut181/accepted-full-audit/`. Runtime is one
same-host measurement; selection does not prove80% defect detection.
