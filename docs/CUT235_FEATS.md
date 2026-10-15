# Cut235 — later-worker feats and week-one cadence

Owner order: Cut231 §5b, then the second hero, then the first Legacy payoff.
Scoped acceptance passed on2026-10-15; source-bound evidence is recorded below.
The full handoff/acceptance ledger remains in scope beyond this cut.

## Required behavior

Porter and Scout keep their existing counts. Each later worker lights through
one named outcome of its chore or its unchanged time fallback. Feats stay
earned across save/load; v1/v2 trees keep their old count eligibility as well.
Each feat is visible, at most three words, and enters the existing one-decision
report queue. Simulations and forecasts must not earn feats in the real save.

| Worker | Feat | Outcome | Fallback |
|---|---|---|---|
| Apprentice | forged new best | Actual record run using a permanent kit step bought by hand before departure | 30h |
| Clerk | interest paid | Positive bank interest after a successful manual deposit | 36h |
| Drillmaster | levelled floor clears | Actual floor clear wearing a package manually levelled before departure | 36h |
| Kennel hand | pet levels up | The exact successfully hand-selected pet gains a level on a run departing after that selection | 40h |
| Herald | swapped quest kept | Quest completion after a manual swap | 40h |
| Guide | deep start record | Actual record run from the manually selected lit waystone; a D1 fallback never qualifies | 44h |
| Kennel keeper | bred pup fielded | The exact pup from a successful manual breeding participates in a later actual run | 48h |

The original §5b table was a candidate design. A cleared floor after levelling instead of a specific recorded wall, pet growth instead of attributed killing blows, and quest
completion after a swap use the existing facts without adding artificial
chores or new save fields for combat attribution. A requested start or a
Bank exit alone is insufficient evidence for the Guide/Clerk chore.

Run-bound manual prerequisites come from the departure snapshot. Changes to
the next send cannot retroactively qualify or disqualify a run already away.
Manual pet identity remains hero-local, survives save/load, and follows the
actual egg→pup and loss-egg→recovered-pet lifecycle. An unrelated pet, an
automatic selection/breeding, or nonexistent IDs cannot borrow that provenance.

## Acceptance

1. Native workspace tests and Clippy pass, including actual-run provenance,
   false-positive refusal, feat latching and legacy-tree roundtrips.
2. `nodes-lit` <=48h on all16 seeds. IDLE fallbacks and no-pick progression
   remain unchanged within a check-in. No fallback age is reduced.
3. PICKED feat-triggered hires occur no later than the baseline count median
   on >=14/16 seeds **for every later worker**. Use the standard even-sample
   median and reject missing or duplicated seeds. Paired per-seed comparison
   is reported separately and does not replace the median bar.
4. Actual PICKED days2–7 max major-beat gap <=24h for every seed; DAILY <=48h.
   Worker rank service ages may be tuned to fill the gap. Definitions and
   clock remain those in `tools/timeline-summary.mjs`; no artificial beats.
5. Record a 16-seed ×14-day timeline for IDLE/PICKED/DAILY/AWAY, compare with
   `docs/evidence/cut232/timeline-16x14.json` using `hire-compare.mjs`, then pass
   the full16-seed pacing pack and routine full gate without weakening bars.
6. Rebuild WASM and repin actual settlement inputs. Native settlement replay
   and the gold-settlements browser group pass on the same final package.
7. Worker-first-act shows unfinished/met/hire states at320/400/1440; glossary
   and journal-earned run against a fresh server. Routine client suite passes.

## Evidence

The parked WIP is commit `be26fbef`, integrated as `c6f4ec4a` after the art
checkpoint `ddcac657`. Its historical results are preserved in
`docs/evidence/cut235/README.md`; they do not certify subsequent corrections.
New experiment/failure and terminal results will be recorded alongside them.

The acceptance script itself now rejects the WIP's lower-middle median,
missing/duplicate seeds and an unchanged spread whose median bar fails.
Its in-session synthetic checks passed; real candidate results remain required.

## Historical candidate measurements (not final acceptance)

The corrected feat predicates passed11 focused native tests, then the Session
sharing/legacy-gate corrections passed15. The first4-seed ×7-day PICKED probe
showed existing rank days[4,8,12] gaps[48,48,40,48]h and candidate[2,4,6]
gaps[24,24,24,24]h. Candidate hire times were unchanged by rank timing; Apprentice
and Drillmaster each missed the count-median bar on1/4, so all16 seeds remain
necessary. Profiles, exact binary identity and full exploratory outputs are
in `evidence/cut235/resume/`. Rank days[2,4,6] subsequently passed the final acceptance below.

The first16-seed hire probe (3days; source/binary bound in hires-16x3-runtime.json)
measured Apprentice14/16 and all other later workers16/16 except Drillmaster10/16.
Drillmaster's new-record trigger waited19–40minutes on six seeds versus the
16.14minute count median. That failed candidate is retained. The replacement
`levelled floor clears` is content tuning: require a real floor clear with a
manually levelled package actually worn at departure. No median, seed-count,
fallback or final cadence bar changes. New provenance tests and measurements
remain required before acceptance.


## Current corrected-source evidence — 2026-10-15

- Focused26/26 and full workspace965/0failed/6ignored pass; default all-targets
  Clippy passes. Source/terminal binding: `evidence/cut235/resume/workspace-v3-identity.json`.
- Full16-seed ×14-day capture exits0 on snapshot f45f26cb…/runtime14048f5d….
  `timeline-identity-16x14-comparison.md` passes all seven PICKED hire bars
  (14/15/16seeds), PICKED24h and DAILY24h maximum days2–7 gaps on all16seeds.
  Full milestone summaries and the interrupted attempt remain preserved.
- Real WASM87de61e9…/6912832bytes; native settlements4/4 exact including full
  after-saves, fresh browser Gold564/24 and targeted5/5 pass. Routine40/40
  passes before the parallel Cut240/241 renderer/menu changes. No new settlement
  regeneration was needed on this package.
- Final16-seed pacing24/24 PASS1220s; routine full metrics/QA/dayplayer all exit0.
  Additional targeted16-seed node evidence proves all eligible PICKED/HANDS lit48h
  and all eligible PICKED bought72h on every seed, using exact timeline events.
  Fresh client integration after Cut240/241 passes41/41 routine groups in378.1s
  on CI Node22, with launch/terminal source hashes unchanged. See
  `resume/client-joint-v5{-identity,}.json` under this cut’s evidence directory.
- After the Cut242 atlas integration, all five worker/Gold/Journal contract
  groups pass125.8s with unchanged launch/terminal source hashes; Gold564/24
  checks the same87de package. This targeted run predates the final cosmetic
  Fens selector change, whose replay/context-loss proof belongs to Cut242.
- The actual worker progress/feat loop now explicitly includes320 as well as
  400/1440; its fresh final-source run passes120checks, including unfinished,
  met and hire states at each width (`resume/worker-final-three-widths.json`).

All seven scoped acceptance requirements above are satisfied. Historical
failures are retained. This does not close second-hero, Legacy-payoff, broad
163-group current/206-group exhaustive client audits, or whole-handoff acceptance.
