# Validation tiers

Owner request, 2026-10-12: aim for 20% of validation time while retaining the most useful routine coverage. This is a risk-based selection, not a measured claim of 80% assertion coverage or defect detection.

## Routine work

Run `tools/verify.sh --quick` for core tests, types and copy checks. Run `(cd web && pnpm -s test)` for the critical client journeys. For a local feature, also run its relevant existing client group: `cd web && node tests/run.mjs <name>`.

Owner2026-10-20: routine balance parameter search/acceptance defaults to
`tools/tune.sh --name N --spec STUDY.json` with paired discovery and independent
statistical confirmation. [Statistical tuning](STATISTICAL_TUNING.md) defines
the supported estimands, confidence budget and cases needing exact/stress
validation. Full campaigns are explicit exceptions rather than an automatic
step after every candidate. Deterministic tests for changed rules still apply;
canonical finite-seed gates retain their original thresholds and verdicts.

The routine client selection spans ten areas: menu/save startup, town/workers, multiple heroes, packages/pen/forecasts, combat/watch/recovery, gold/supplies/gear, death/advice, reports/accounting, classes/endgame, and responsive UI/lighting. Exact names live in `web/tests/lib/suites.mjs`; `node tests/run.mjs --smoke --list` prints the current count and names without launching a browser. Assertions and timing limits are unchanged. Timing-sensitive groups retain isolated execution.

The current full audit adds detailed feature checks. Historical whole walks and repeated viewport cases remain in the exhaustive suite. Run the specific omitted group when changing that feature. This selection does not replace visual GPU checks or native balance validation.

## Mobile visual review (owner amendment2026-10-16)

Use **one primary mobile browser viewport**,402×681 CSSpx, through
`phoneReviewViewport()` / `phoneReviewViewports()` in
`web/tests/lib/viewport-cases.mjs`. Keep normal/200% text coverage. Compact, Max,
landscape and alternative toolbar states are targeted additions only when a
change needs them; do not multiply every routine test into a device matrix.

Provenance checked2026-10-16: the installed Playwright iPhone17Pro profile
provides a402×681 browser viewport versus a402×874 screen at3× scale.
[Apple's current iPhone18Pro specs](https://www.apple.com/iphone-18-pro/specs/)
retain the2622×1206 physical display resolution. Reusing the installed profile's
geometry is an explicit approximation; it is not a measured iPhone18/iOS27 Safari
viewport. [WebKit's viewport guidance](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
explains that usable height changes with browser UI/scrolling. Record actual
inner/visual viewport, DPR, text scale, input/save and source/package. Chromium
geometry captures do not establish WebKit/device performance or Safari behavior.

Primary images show the visible browser viewport. Test scrolling separately for
offscreen content and reachable controls. Full-page/stitched images are optional
scroll inventories, labelled with their capture kind and original viewport.
Legacy320/400×1000 diagnostics remain historical/stress evidence; preserve them
and link replacements instead of presenting them as realistic phone frames.
The one-off four-shape captures made before the owner's smaller-test-matrix
clarification retain their actual scope; they are not the routine default.

## Recovering from a failed or killed client run (2026-10-14)

`web/tests/run.mjs` records every group's result as it ends (name, pass/fail, exit code, own and
end-time seconds, first failure line, finish time) with the source/engine identity it ran under:
git HEAD, the dirty flag, a hash of uncommitted changes (tracked diff and untracked files) and the
sha256 of `web/src/engine/pkg/idlever_wasm_bg.wasm`. The state file is
`target/client-tests/last-<suite>.json` (`smoke`, `full`, `exhaustive` or `targeted`), rewritten
by temp file and rename after every group, so a crash, Ctrl-C or kill keeps every finished group
(`finished: false`).

- `node tests/run.mjs --smoke --failed` reruns only groups that failed or never finished in that
  suite's last run. It refuses (exit 2) when the identity changed; `--force` reruns those groups
  anyway, and the earlier passes are then reported stale and left unrecorded for the new identity.
- `node tests/run.mjs --smoke --resume` skips groups that passed under the identical identity and
  runs the rest; after any identity change it reruns everything and says so.

Reused passes print as `ok*` with their original finish time, and the summary line counts fresh
runs and reused passes separately. A reused pass is evidence from its original run only: an
acceptance claim names how many groups ran fresh. `--report` records `mode`, `identity`,
`reusedCount` and `freshCount`, and marks reused results. `tools/client-resume.test.mjs`
(in `tools/verify.sh --quick`) checks failed-only, resume, identity invalidation and a hard kill
with two fake groups, without a browser.

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

Owner amendment 2026-10-14: the routine native `node tools/gates.mjs --full` dayplayer plays two seeds per bot except the RANDOM-vs-PICKED row, which plays RANDOM and PICKED on 16 seeds (`--random-seeds 16`; its ≥ 14/16 bar no longer demands 2/2). Every other row still reads the first two seeds.

Use the full client suite before release, a fresh blind rating, and changes spanning several game systems. Use `tools/verify.sh --full` for the existing full native/build acceptance. Content iteration uses targeted `tools/tune.sh <rows>` rather than replaying the entire statistical audit after every edit. The exhaustive audit stays available explicitly; neither this tier nor routine full acceptance certifies omitted exhaustive cases.

## Pacing pack, sweeps and repins (2026-10-15)

These are iteration tools. None of them is a gate pass.

- `node tools/gates.mjs --pacing [--fail-fast]` is the content tier between `tools/tune.sh <rows>` and the routine full gate. It runs `--full --rows` over every dayplayer row that has broken at 16 seeds and is cached like `--rows`. Run it after a pacing or economy change, before `tools/verify.sh --full`.
- `node tools/sweep.mjs` searches balance profiles. It is a targeted check of the named rows only. Copy the chosen profile's values into `tuning/balance.json` and `balance::DEFAULT`, then run the pacing pack and the routine full gate on the rebuilt source.
- `node tools/repin.mjs` makes the gold-settlements browser group read the new WASM after a core change. `--settle` replays the saves natively and reports what changed. The browser proof is still `cd web && node tests/run.mjs gold-settlements`.

See docs/ITERATION_SPEED.md, "Repin, pacing pack, sweep".

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
