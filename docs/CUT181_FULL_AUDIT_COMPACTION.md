# Cut 181 — compact the full client audit

Owner clarification: clean up the full audit itself, rather than add another
routine tier. The original Cut180 audit took1797.246s and finished164/166;
both failed groups then passed unchanged in a sequential diagnostic. Preserve
those failures and the currently running original full retry.

## Intended result

`test:full` and the no-argument client runner audit current features. An explicit
`test:exhaustive` retains the original historical regression inventory. Future
test files join both automatically unless a named historical group is explicitly
classified. Keep `pnpm test` and `test:full` distinct; do not introduce a new
compact command or silently relabel a targeted run as full.

The reviewed plan retains124 current groups, including all37 critical journeys
and distinct routes/oaths/maxHP/works checks. It moves or replaces43 historical
walks, each mapped to named current checks with extra-case limitations.
Their extra cases remain available in the exhaustive audit; a feature mapping
does not prove equivalence of every assertion. Keep both recent failures in
the current full audit. Do not relax assertions, fixture truth or timing limits.

## Gates

1. Record exact current/exhaustive inventories and reasons for each moved group.
   Full selection must include new future regressions and reject unknown groups.
2. Preserve all original test files and all166 exhaustive groups. Explicit
   names remain targeted; lists start neither Vite nor a browser.
3. Selection/scope tests pass. Reports distinguish current full, exhaustive,
   smoke and targeted runs and name what the full run omits.
4. Time a complete current full run on this host. Target<=359.449s (20% of the
   recorded1797.246s run). Record concurrency and hardware-load differences;
   do not claim measured80% defect detection or assertion coverage.
5. If the target or checks fail, preserve the results and improve consolidation
   or execution; do not shorten timing assertions to pass. Leave the long audit
   explicitly available and update operating documentation with measured scope.

The separate49-group wrapper prototype was discarded after the owner's
clarification; preparation and its checks remain in scratchpad/cut181. Existing
run23909 continues its original166-group inventory on unchanged inputs. Apply
the existing runner/registry changes after it reaches a terminal result.
This work does not change the game, reduce blind-play horizons, certify a fun
score, or authorize deployment.

## First measured run and further consolidation

The cleaned124-group audit passes124/124 in620.778s with jobs7/heavy1. That is
34.5% of the precommitted1797.246s baseline; it misses the359.449s target.
Preserve this result. Do not substitute the slower2447.953s original retry as
the target's denominator.

Before another measurement, consolidate repeated viewport iterations in the34
state-oriented groups listed in scratchpad/cut181/viewport-plan.json. Their
original case data, assertions and time limits remain; current full runs them
at400px. Dedicated responsive/render matrices and explicit width-dependent
branches stay unchanged. Exhaustive, smoke and targeted runs retain every
original variant. Reports must disclose this scope; it is reduced repeated
scenario coverage, not equivalent certification of all old viewport cases.

This follows the owner's20% time/80% validation tradeoff. It does not prove80%
defect detection or meet the runtime target until a complete run is measured.

The second headless run finished123/124 in523.583s; all562 guarded inputs
matched. Preserve the known-enemy fixture failure and unchanged isolated pass.
The controlled engine lineage read now returns the same authored known facts
as its send/step fixture; original all-width assertions pass. Long-job ordering
uses measured take-control/runsui costs too.

A private-GPU trial was stopped with two failures and slower long-test costs;
its partial evidence remains at cut181/gpu-experiment/. It is not acceptance.
Next measure the established headless path with12 normal workers, retaining
heavy width1 and both solo checks. This changes execution concurrency, not
coverage, timing thresholds or the359.449s target.

Prospective chore-fixture correction, if confirmed: the existing test appends
one pick-up event per fake-engine batch and expects four consecutive calls.
`choreCallout` deliberately resets on intervening messages or floor changes,
so unrelated combat can prevent the test from supplying the asserted streak.
Supply an explicit consecutive chore sequence in a controlled batch instead;
keep the existing minimum count, plain-line limit and12-second window. Preserve
the prior failure. This isolates the intended coalescing behavior without
changing game code; other combat/watch assertions remain in this same group.
A focused run and complete current full run must verify it.

The twelve-worker run31422 finished123/124 in370.454s,11.005s over target;
all562 inputs matched. Preserve this failure too. Apply the prospective chore
fixture correction, retaining `best>=4`, `plain<=1` and12seconds. Measured
per-group costs now order the whole current inventory, rather than only a few
long groups. Current full defaults to up to12 workers bounded by CPU count;
smoke stays4, exhaustive/targeted7, with existing overrides. Timing groups stay
isolated and solo checks stay solo. Reports include actual execution settings.
Focused clarity and a fresh complete full audit are required before acceptance.

Prospective speed-read correction: source inspection shows the Normal check
waits for1× in one browser call, then reads mode/rate/lit state in another.
Normal may legitimately reach4× between calls; the same test subsequently
requires that nine-second playback never exceed4×. Capture all badge fields
in the same browser sample that satisfies the original1× readiness condition.
Keep the existing mode/unlit assertion,5000ms limit,nine-second sampling and
maximum4×. This avoids changing test meaning or adding serial execution.
Preserve the complete failed run; require focused and complete validation.

Final-command attempt39492 fails122/124 in386.475s; guard562matches. Preserve
Mother's remaining fixture failure and the Normal badge read race. The known
fixture must also supply its lineage from pending seen-systems bookkeeping.

Prospective final scope refinement: current full retains Cut305's unique
`sheet,rank` parts; its longer legacy chest/porter/scout/walk/toggle/report
combinations remain in whole Cut305 under exhaustive. Current real-WASM
`runsui`, `town-save`, `worker-purchases`, `worker-first-act`, `first-plot`,
`report-reading` cover the current journeys; this is feature coverage, not
equivalence of every legacy assertion. Retain distinct works checks.

For the33 existing three-width responsive groups listed in the final-scope
plan, current full keeps320px and1440px;400px repetition stays in exhaustive,
smoke and targeted. The34 state groups still use400px. This supersedes the
earlier unchanged-dedicated-matrix proposal; endpoint geometry checks and
numeric limits remain, but the intermediate responsive cases are explicitly
omitted. Two-width and broader dedicated render matrices stay unchanged.
No measured80% defect-detection claim. Require updated scope tests, focused
fixture checks and a complete default-command measurement.

Endpoint run3731 finishes123/124 in342.403s, meeting
the time target but failing held-message restoration. It is not acceptance.
The fixture waits rendered frames while the original message has a finite
lifetime; original wait durations were not recorded, so expiry is a supported
hypothesis rather than a proven cause. Schedule boss-beat-quiet as a timing
group, preserving its three held frames, restoration check,1600ms expiration
check and both widths. Require unchanged isolated and complete passes.

## Accepted measurement

Default `pnpm -s test:full`6489 TERMINAL0 passes124/124 in340.043seconds
(5m40s),18.920% of1797.246s baseline,81.080% faster. Target359.449s met.
Headless,12 normal workers on32 available CPUs,heavy1,solo checks isolated.
All562 guarded inputs match. Scope harness7/7; focused corrected fixtures and
unchanged frame-timing group pass. Evidence: cut181/accepted-full-audit/.
No repeated test is needed after this unchanged-source pass.

Full124 includes all37 critical groups,44 moved/replaced historical whole
walks with explicit limitations,Works sheet/rank parts,34 state groups400px,
33 responsive triples320/1440px and other unchanged matrices. Exhaustive
retains all166 original groups and original widths; future files join both.
This is one measured host run, not an80% defect-detection certificate.
