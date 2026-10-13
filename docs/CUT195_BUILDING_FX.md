# Cut195 — home construction and appearance upgrades

Owner queue38: construction should be visible as a short event in the original
ink/wash style. This cut is presentation only. Current Rust construction is
FREE, gated by milestones. Forge kit purchases and Savings deposits can change
building appearance; these are their real actions, not invented upgrade fees.
House appearance follows actual town stage; Storehouse/Kennel have one current
look. Any economy redesign must preserve truthful source attribution.

## Numeric contract

- New observed house/Forge/Storehouse/Kennel/Bank construction: exactly1 event
  per distinct state transition. Same-state reads/repaints add0. Initial load,
  reload or remount of existing town adds0, regardless of viewer freshness.
- Actual appearance increase produces exactly1 upgrade event; decrease, failed
  construction, insufficient funds and cancelled action produce0 events.
- Assembly/reveal lasts1.2 scene seconds, completion glint ends at2.2. Real
  observed transitions lift the idle cap. Measure GPU wall duration separately;
  software-render timing does not establish GPU performance.
- Full completion dust: at most22 particles per building; Low at most8; Off or
  reduced motion:0. Five simultaneous building IDs bound construction dust at
 110, within the existing220 total-particle cap. Dust life<=0.8 scene seconds.
- Off/reduced completion is static and immediate. Changing effects to Off
  cancels active build effects; returning to Full does not replay them.
- Authoritative building functionality is100% usable immediately after the
  successful Rust state update. No construction timer, cost, delayed unlock,
  extra confirmation or pending claim is introduced. Hero-arrival animation
  no longer delays the Delve control.
- GL and Canvas use the same frame/sprite/reveal/dust stream. Cover both modes
  at400/1440 with Full/Low/Off/reduced states; capture assembly/completion beats.
- Verify one genuine free house construction/refusal/reload path plus real paid
  kit appearance increase and Savings appearance decrease/increase. Controlled
  pure transition cases cover all five IDs; they are not earned pacing proof.
- Re-run home-building-help, home-heroes and39 town-save persistence checks
  against the final frozen real-WASM package. Preserve settled screenshot
  captures; animation ghosts are not evidence of a settled hero/home screen.

## Results

Final frozen real-WASM focused set passes4/4 in48.2s: `building-fx`47.9s,
`home-heroes`43.7s, `home-building-help`23.1s and existing39 `town-save` checks.
These run concurrently; individual durations do not add to the total. Final
raw outputs are `docs/evidence/cut195/client-final.json` and `client-final.log`.
Source/package hashes and four assembly/completion PNGs accompany the evidence.
TSC, scoped default Oxlint and copy-lint pass (88files,2437tagged literals).

The construction harness reuses only TWO browser contexts. GL400 and Canvas1440
exercise Full/Low/Off/reduced, genuine free house construction/refusal/exact-save
checks, repeated authoritative refresh and persisted reload. Every success is
exactly1 event, every refusal/read/reload adds0, Gold stays0 and Delve/help are
usable immediately. Full completion emits22 dust particles; Low<=8; Off/reduced
remain static with0. Twenty-one pure controlled transition cases cover all
five building IDs and supported appearance directions, including house stage
looks. These pure cases prove presentation logic, not earned progression.

A controlled imported earned town starts with low Forge/Savings appearance,
then actual public Forge purchases (3 armour steps) increase Forge appearance;
an actual deposit increases Bank appearance, withdrawal decreases it and
cancels that active animation without a new upgrade event. Effects Off cancels
active FX; returning to Full does not replay them. No paid construction or
invented fee/timer is used. Existing fresh-viewer buildings no longer animate
just because they were not seen; initial/remount state is static.

Final full-build screenshots explicitly use cosmetic hour12 for GL daylight
(`night=0`) and hour23 for Canvas night (`night=1`), without changing Date.now
or game simulation. This covers those two combinations, not the whole day/night
× renderer × width Cartesian matrix. Actor screenshots now wait for genuine
sheet closure AND disappearance of the inert exit-animation ghost; settled
400/1440 home/cave captures are in Cut194's `settled-screenshots/` directory.

Observed frame diagnostics during the shared focused run:

| Build sample | Rolling CPU P50 | Rolling CPU P95 | Frames so far | Completion dust |
|---|---:|---:|---:|---:|
| GL400 daytime |1.1ms|150.6ms|65|22|
| Canvas1440 night |1.6ms|46.0ms|49|22|

These rolling windows include startup/terrain paint and concurrent test load;
they DO NOT certify quiet GPU FPS, pure construction overhead or a frame-cost
performance gate. Full observed wall lifecycle including help/read interactions
was3.688s GL and2.999s Canvas; Low2.611/2.387s. These are not2.2-wall-second
certification. The source/active lifecycle uses1.2/2.2 SCENE seconds and lifts
idle throttling on genuine state transitions. Hidden tabs still render no frames.

Limits: live public success/refusal/look actions and shared-renderer/preference
coverage are verified. All four later buildings are covered by pure transition
cases, not individual earned construction campaigns. Insufficient-funded/cancelled
upgrade UI is not newly exercised here; no authoritative state change means no
FX event. Broad quiet-render benchmarks, full current/exhaustive balance, complete
queued-feature and fun-rating acceptance remain unproven.
