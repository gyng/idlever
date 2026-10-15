# Cut235 — later-worker feats: current validation and preserved experiments

Scoped Cut235 acceptance passed2026-10-15:965 native tests, Clippy, native
settlement replay4/4, full16-seed fortnight hire/cadence comparison, pacing24/24
and routine full gate. PICKED/DAILY maximum days2–7 gap is24h on every seed.
Fresh post-Cut240/241 routine client41/41 passes378.1s (Node22; exact source
identity unchanged). Post-atlas contract groups5/5 pass125.8s; the final actual
worker loop separately passes120checks at320/400/1440 after the cosmetic Fens
selector amendment. Current WASM87de61e9… is unchanged throughout. Contract:
[CUT235_FEATS.md](../../CUT235_FEATS.md). The broader queue remains open.

Final browser reports: `resume/client-joint-v5{,-identity}.json`,
`resume/client-joint-v6-targeted{,-identity}.json` and
`resume/worker-final-three-widths.json`. The v6 wrapper log’s “5/41” banner is
imprecise: JSON correctly records a five-group targeted selection, including
Gold/Journal groups outside the routine subset. It is not another full suite.
The earlier named39 integration failure is preserved in client-joint-v4.json;
its stale recovery fixture, URL bootstrap and real close-callback focus issues
were repaired before the fresh41-group pass. No exhaustive acceptance claim.

The following parked WIP and earlier candidate measurements are historical.
They preserve observed failures and superseded feat definitions; they are not
the current shipping table or final source acceptance.

## Historical parked WIP — 2026-10-15

Owner decision2026-10-14/15 (Cut231 §5b; package-eval learning#2). At the park,
core/wire/client/tests were in and earlier pacing/node rows passed; timeline,
full workspace, routine full gate, repin and contract were unfinished.

## What changed

- `balance.json` `workers.<id>.goal`: `"count"` | `"feat"` (default `count`; validated; the porter and the Scout must
  count). The seven later workers ship `feat`; `need` stays for saves from before. Sweepable
  (`{"grid":{"workers.clerk.goal":["feat","count"]}}`).
- `tree.rs`: `feat_name`, `NodeDef::feat`, `goal_met`, `feat_done`, `note_feats` (called at a run's end before the
  report's offer, `engine.rs`), `Tree.feat_base` (the measure at a chore's first time by hand) and `Tree.feats` (kept once
  met). Fresh trees are `v` 3: a feat worker is lit by its feat or its unchanged fallback only; a `v` ≤ 2 tree (a save
  from before) still lights by its count as well (no player regresses). Feats latch.
- Wire: `WorkNode.goal` (`"feat"`), `feat` (≤ 3 words), `feat_done`; a feat node carries no `count`/`need`/`progress`.
  `NextPill.kind` `"feat"` (`text` = `<worker> · <feat>`, no have/need, no bar).
- Client: `works.ts` (`featText`, `workerProgress` feat path, pill `feat` kind with quiet fallback and no bar, works card,
  silhouettes), `tasks.ts` (tracker line without bar, `data-feat-done`), `town.ts` mark, `ladder.ts`, `fake.ts` stand-in,
  `types.ts`.

## Feat table (shipping)

| Worker | Feat (wire) | Check | Needs the chore by hand first | Fallback (unchanged) |
|---|---|---|---|---|
| apprentice | `forged boss kill` | a band boss kind slain after the first forge step by hand | yes | 30 h |
| clerk | `full haul banked` | a Bank exit (not timed out) keeping ≥ the clerk's price, bank built | no (bank: IDLE never builds) | 36 h |
| drillmaster | `levelled new best` | a new record after the first stance level by hand | yes | 36 h |
| kennel_hand | `pet levels up` | a pet of the run's party gains a level on it, kennel built | no (kennel: IDLE never builds) | 40 h |
| herald | `swapped quest kept` | a quest kept after the first swap by hand | yes | 40 h |
| guide | `deep start record` | a new record after a waystone start (> D1) picked by hand | yes | 44 h |
| kennel_keeper | `bred pup fielded` | a run's party holds a bred pup (gen ≥ 1) after a breeding by hand | yes | 48 h |

IDLE does no chore after the Scout and builds nothing, so every feat is unreachable to it and it lights each node by the
fallback exactly as before (idle rows unchanged below).

PICKED node hours, 16 seeds × 3 days (DP_NODES probe, not saved; ready/hired h): apprentice 8–24 (count before: 8–16),
clerk 16–40 (was 40), drillmaster 0.2–0.7 (same), kennel_hand 16–24 (was 40), herald 40 (fallback, as before), guide
40–48 (fallback, as before), kennel_keeper 48 (fallback; no bot breeds). The per-seed "feat hire ≤ count median on ≥
14/16" table is **not yet computed** (`hire-compare.mjs` against `docs/evidence/cut232/timeline-16x14.json`).

## Verified (this worktree, uncommitted core state at commit time)

- `pacing.log`: `node tools/gates.mjs --pacing`, 16 seeds, GATES_THREADS=26 — **24/24 rows PASS** incl. cadence30
  (gap 0.0 · 0.0 · dec 1 · 16/16), picked-idle 1.50 · 2.00 · 3.42, tuned-picked 1.17, idle-delta +0 h, automation-pays
  D18 48 vs 48 h · mean best 29.67 vs 29.27, workers-daily 31.03 vs 30.84.
- `nodes-rows.log`: nodes-lit 0 · 0 PASS; nodes-bought 0 (9 hired by day 14) PASS (16 seeds).
- `cargo test -q --workspace --profile fast`: 938 + new; after fixing `tests_cut120` and adding `tests_cut235` (6 tests)
  the targeted lib tests pass (tests_cut235, tests_cut120, balance: 17/17). A full workspace rerun after those edits was
  not done.
- `cargo clippy --workspace --all-targets -D warnings`: clean.
- Client: fmt:check, lint, tsc, copy-lint (0 violations) pass. Targeted: worker-first-act (feat leg: real wire shows the
  apprentice's feat; pill/tracker/card undone, met ✓, hire flip; 320/400/1440), cut120, worker-purchases, first-plot PASS.
- `client-routine.log` (`pnpm -s test`): 39/40; **glossary FAIL** (journal window height 254 < 300). It fails the same
  way against the main checkout's own dev server (:5219, no Cut235 code), and journal-earned fails its panel-overflow
  assertion there too — pre-existing, not Cut235. `--failed` had no prior state to rerun from.
- WASM (fast build, untracked pkg): `72d4391d…`, 6913734 bytes.
- GPU screenshots (private display) at 400/1440: `feat-undone-*` (real engine played from seed 3 to the apprentice's feat
  goal: `apprentice · forged boss kill · or 28h`), `feat-*-tracker-open-*`, `feat-pill-*`, `feat-tracker-*`, `feat-met-*`
  (met shape overlay), `feat-works-*` (works sheet; drillmaster card shows `levelled new best · or 34h`). Script:
  `shots.mjs`.

## Not done — next steps

1. Timeline: `target/fast/examples/dayplayer --bots idle,picked,daily,away --seeds 16 --days 14 --threads 28 --timeline
   docs/evidence/cut235/timeline-16x14.json`, then `node tools/timeline-summary.mjs …` and
   `node docs/evidence/cut235/hire-compare.mjs docs/evidence/cut232/timeline-16x14.json docs/evidence/cut235/timeline-16x14.json`.
   Report PICKED's days 2–7 major-beat gap (base 48 h; target ≤ 24 h). Expectation: feats light hires earlier (day 1),
   so they are unlikely to close the day 3–4 hole alone; rank days (`tree.rank_days`) are the likely lever.
2. Routine full gate: `GATES_THREADS=26 node tools/gates.mjs --full`.
3. Full `cargo test -q --workspace --profile fast`.
4. `node tools/repin.mjs --dir docs/evidence/cut235 --note "Cut235 feats" --settle [--regen]`, then
   `cd web && node tests/run.mjs gold-settlements`.
5. Write `docs/CUT235_FEATS.md` (contract + gates as above), update HANDOFF and CUT231 §5b status.

## Resumed under the finish-handoff goal (2026-10-15)

The parked results above remain historical. Main integrated the WIP as c6f4ec4a,
then corrected actual-run feat provenance, restored chore-linked Apprentice/Clerk/
Kennel-hand outcomes, and fixed shared Session latches without copying hero-local
provenance. Fifteen focused native tests pass after these corrections. See
CUT235_FEATS.md for the final contract; strict standard-median and cadence
acceptance is now enforced by hire-compare.mjs, not merely printed.

The first4-seed PICKED probe (7days; before Session sharing) showed rank days
[2,4,6] close the40–48h day2–7 gap to24h on4/4. This is exploratory evidence
only; Apprentice and Drillmaster each missed their count-median bar on1/4.
Final16-seed timeline, pacing/full, repin and browser acceptance remain in flight.
Exact profile/binary/probe evidence lives in resume/; failures are retained.

### First16-seed hire result — FAILED, retained

`resume/hires-16x3-comparison.json`: Apprentice14/16; Clerk/Kennel-hand/Herald/
Guide/Kennel-keeper16/16. Drillmaster10/16 against baseline median16.14minutes
(seeds2/6/8/10/12/14 late at19.33/16.66/39.69/22.20/29.02/30.97minutes).
This is a3-day hire diagnostic, not final14-day acceptance. Tune the actual
Drillmaster feat outcome, keeping the acceptance bar fixed; see CUT235_FEATS.md.

The first workspace run on the previous candidate passed953, ignored6, failed1:
`tests_cut120::the_next_worker_shows_progress_and_eta` still expected the old
`forged boss kill` name. Its wire assertion now expects the documented
`forged new best`; no behavioral assertion or gate was removed. The failure
log is retained as resume/workspace-before-drill-tuning.log. Clippy passed
(default all-targets, warnings denied) before the final test-name rerun.
A fresh full workspace run on the tuned Drillmaster source is in flight.

### Floor-clear candidate native workspace — PASS

`CARGO_BUILD_JOBS=16 cargo test -q --workspace --profile fast -- --test-threads=16`:
957 passed,0 failed,6 ignored; library test runtime82.70s. Other workspace/test
commands and doctests complete normally. Exact sources and command are bound in
resume/workspace-v2-identity.json; terminal log resume/workspace-v2.log.
The simulator was rebuilt on this source; its runtime-bound hire and fortnight outputs follow below.

Final-source default Clippy (`cargo clippy --workspace --all-targets -- -D warnings`)
PASS in27.98s; log resume/clippy-v2.log. TypeScript, format/lint and copy-lint
also PASS. Acceptance-harness regression tests execute4/4 outside the sandbox;
inside the sandbox Node's child test runner only reports the file, so that
one-file wrapper result is not counted as execution of the four cases.

### Tuned Drillmaster hire diagnostic — PASS (not fortnight acceptance)

`resume/hires-floor-clear-16x3-comparison.json`: Apprentice14/16, Drillmaster15/16,
all other later workers16/16 versus the unchanged baseline count medians.
Source/binary/CLI binding: hires-floor-clear-16x3-runtime.json. The final16-seed
×14-day IDLE/PICKED/DAILY/AWAY timeline is now live; no final cadence claim yet.

WASM6214dd8a… (6914841bytes). Native immutable settlement replay: Gold, ledger,
ExitLine and expected outcomes unchanged4/4. Two after-saves differ only in
`lineage.tree.feats`/`others[].lineage.tree.feats`, the tested shared/grandfathered
latch migration. Preserve the report-only manifest; a sibling settled manifest
regenerates only those two after-saves. Browser proof remains required.


### Browser Journal regression — corrected

Fresh-server targeted run `resume/client-targeted.json` passed worker-first-act,
cut120, glossary and Gold settlements (564 checks/24 cases), but journal-earned
failed at320px/200% text in the manual3 state. Element-level diagnostics
`resume/journal-elements.json` identified glossary entries expanding the grid
32px; document and window overflow remained0px. The glossary articles now have
`min-width:0` and wrap long headings within the available width, without hiding
or clipping content.

`resume/journal-fixed.json`: journal-earned326 checks PASS across all existing
width/stage/text-scale combinations. The concurrent glossary height read failed
at253.76px. Its geometry check now awaits loaded fonts and finite opening
animations, retaining the300px minimum. `resume/glossary-settled.json` passes32
checks and62 registry terms. The failures remain preserved; final-package
routine acceptance is still required after the temporal feat corrections below.

### Departure provenance review — additional correction required

Read-only review found that Guide/pet feats consulted current manual-action
metadata instead of the sent snapshot. A next-start or pet selection made after
departure could retroactively satisfy the current run's prerequisite, while a
queued change could erase genuine Guide provenance. Fixing these concrete
cases requires new source-bound native, hire, pacing and final-package evidence.
The running `timeline-floor-clear-16x14` snapshot remains prior-candidate
evidence, not final source acceptance.


### Departure and pet identity candidate — native PASS

Focused26/26 PASS, including actual identity, hatch/recovery and resident
isolation boundaries (`resume/focused-v3.md`). Full workspace965 passed,
0failed,6ignored; library90.92s, all other workspace/doctest legs normal.
`resume/workspace-v3-identity.json` confirms source hashes unchanged between
launch and terminal result; terminal log `resume/workspace-v3.log`.
Required default `cargo clippy --workspace --all-targets -- -D warnings` passes
in30.28s (`resume/clippy-v3.log`). Simulator/WASM builds, final hire/timeline,
pacing/full and final-package browser acceptance remain required.

The superseded `timeline-floor-clear-16x14` process was intentionally terminated
with SIGTERM at12:59UTC because of the newly found source defects. Runtime
metadata records why. Completed job caches/checkpoints and logs remain;
no full timeline was written, so no fortnight cadence result is claimed.


### Corrected hire diagnostic and final-package focused browser — PASS

`resume/hires-identity-16x3-comparison.json`: Apprentice14/16, Drillmaster15/16,
Clerk/Kennel-hand/Herald/Guide/Keeper16/16 no later than original count medians.
This uses all16 seeds and standard medians, but3days only: it cannot certify
fortnight cadence. Candidate/runtime hashes are retained with the full capture.
`resume/hire-probe.mjs` explicitly omits cadence and labels this diagnostic.

WASM87de61e9fbf7c76e7db55f74867c8243e24f54074b6eed8089af3b05bd6cdbae,
6912832bytes. Default `final/settlements-inputs-87de.json`; native4/4 Gold,
ledger, ExitLine, expected outcomes and complete after-saves exact; no new
fixture regeneration (`resume/repin-v3.log`). Fresh-server focused browser
5/5 PASS178.2s (`resume/client-v3-targeted.json`): cut12033, glossary32,
journal-earned326, worker-first-act all original widths and Gold564/24.
`IDLEVER_BASE=/idlever/ pnpm --dir web build` PASS1.81s; Vite's large-chunk and
ineffective-dynamic-import warnings remain in `resume/web-v3-build.log`.
Type/format/lint/copy pass. Routine client and full timeline are next, before
16-seed pacing and routine full gate; this cut is still unfinished.


### Routine client — PASS

Fresh routine40/40 PASS390.4s on WASM87de; `resume/client-v3-routine.json`
and `.log` retain the full original selection/results. clarity:paint5 checks
and watch-live-edge10 checks pass unchanged. No owned native simulation ran
until the suite exited0; this is not a quiet-host timing benchmark or the
162-group current/205-group exhaustive audit. The same exec97618 then began
`timeline-identity-16x14` (child3001327), source/runtime metadata beside it.
Full fortnight hire/cadence evaluation, pacing and routine full remain pending.


### Corrected full fortnight timeline — PASS

`resume/timeline-identity-16x14-runtime.json` records terminal exit0 at
2026-10-15T13:54:10Z, exact snapshot f45f26cb… and runtime14048f5d….
The original wrapper interruption and resumed cache/checkpoint inputs remain
preserved. The final full14-day capture contains all16 seeds for each required
IDLE/PICKED/DAILY/AWAY cohort, plus native comparison cohorts.

Strict unchanged comparison against Cut232 passes in
`resume/timeline-identity-16x14-comparison.md`: Apprentice14/16, Drillmaster15/16,
five other later workers16/16 no later than the standard baseline count median.
PICKED and DAILY days2–7 maximum major-beat gap24h on every seed (bars24/48h).
AWAY maximum72h remains diagnostic, with no cadence bar invented for that policy.
Full diagnostic milestone summary: `resume/timeline-identity-16x14-summary.{md,json}`.

The16-seed pacing pack followed by routine full gate is now running detached
(wrapper3050460); `resume/pacing-v3.log`, `resume/full-v3.log` and exit/status
files will record terminal results. This is not yet a pacing/full pass. The
prior40/40 browser result predates Cut240/241 renderer/menu changes; current
integration remains required. No further progression change is authorized by
these partial results.


Additional unchanged-bar checks from the completed current-runtime cases:
`resume/picked-node-availability-16x14.json` records all16 PICKED cases with0
open-chore nodes unlit by48h and0unbought by72h (input cache SHA256 retained).
HANDS has not yet been evaluated by this scoped artifact.
`resume/idle-timeline-baseline-equality.json` binds both full timeline files
and proves all16 IDLE records exactly equal in every field exported by Cut232:
all depth/day, first-session, milestone and event fields. Current-only `looks`
timestamps have no baseline and are explicitly not compared. This proves
exported no-pick progression invariance, not complete internal save equality.


### Final native contract — PASS

`resume/pacing-v3.log` terminal exit0:24/24pacing rows at16seeds,1220s;
TUNED/PICKED D33 ratio1.25; RANDOM comparison15/16 atD13 and16/16 atD23;
IDLE/engagement/automation/current cadence bars unchanged and pass.
`resume/full-v3.log` and `final-gates-v3.status`: routine full allPASS,
metrics198.9s/QA81.2s/dayplayer238.6s. This is the bounded current-game gate,
not the omitted exhaustive balance/migration audit.

Additional targeted16-seed node rows pass22s. `nodes-v3-all-seed-check.json`
binds raw fullstdout leg and exact timeline events: every eligible PICKED/HANDS
node lit by48h on all16seeds, every eligible PICKED node bought by72h on all16.
The source DP_NODES display rounds open times to0.1h; including every rounded
open<=deadline is conservative and cannot exclude an eligible node. All lit
and hire comparisons use full-precision timeline events. These node-targeted
jobs stop at their required deadlines; no new full HANDS fortnight is claimed.

Current UI integration remains required. The combined named39 run used targeted
rather than routine-critical Hub scope and failed3groups (full errors in
client-joint-v4.json): stale legacy reincarnation fixture, malformed double-slash
menu URL, and genuine descent close-callback focus regression. Current Hero Hub
11838/8cases passes after strict public-action fixture repair021b146f; original
legacy input remains and has explicit migration assertions. Root fixes the URL
and modal close lifecycle; original numbered3widths and118menu checks pass.
A fresh full41-group routine runs on CI Node22 as client-joint-v5, with no
exclusions; no whole final browser pass is claimed until its terminal result.
