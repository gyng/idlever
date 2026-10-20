# Matched-kit encounter measurements — five eligible scenes, reflection missing

Dated automated observations:2026-10-20. Source/core/native identities are in
identity.json; source HEADc2344e61, game core unchanged. This is native public-API
input and text/event capture; no viewport, screenshot, human player feedback,
agent visual review or blind fun rating. High confidence in these deterministic
saved-parent results; no population or player-generalization claim.

## Search and selection

Original six earned Cut286 prepared parents, two seed identities, starts9/14/19.
Each receives one common eligible fire supply through public buy_supply when
absent. Public preparation waits actual recovery, pauses Scout and retains L3
comparison tactics. Three consecutive baseline sends per seed/start, each next
parent earned from that same baseline's actual terminal camp:18 search departures.
Every baseline and alternative retains full events/floor maps/tick-boundary
positions and exact step(1)/step(100) complete-event/terminal-save parity.

Eligibility uses actual threat events on the identical starting floor, before
alternative outcomes. Counts out of six starts per biome: gas3, pack3, drain4,
conjurer summons1, reflection0, smith support4. Earliest attempt then seed wins;
the second category uses a distinct parent. Frozen selection and quoted events:

| Scene | Seed / start / attempt | Baseline actual event |
|---|---|---|
|Gas|1 /9 /2|t74 gas overlay at18,7 with living gas foe|
|Pack|2 /9 /2|t187 attack from jackal3 while two live pack foes are within6 tiles|
|Drain|1 /14 /2|t50 max_hp −1, cause drain|
|Summoner|1 /14 /1|t850 spectral_blade spawn, living conjurer present|
|Support|2 /19 /1|t790 armours, living smith present|

Reflection remains missing at the budget. Three later Foundry baselines do start
with golems, but already have a learned Master drill containing reflect_read;
none emits a hero reflection attack. This association suggests learned counters
as a follow-up to inspect, not proof that the drill alone caused zero reflection.
No more discovery samples were added, and the baseline was not silently weakened.
The conjurer scene tests the generic summoner-pack contrast from Cut136; it is
explicitly not the historical Lich scene.

## Matched local results and limits

Five selected parents × baseline/two legal alternatives =15 matched send cases.
All15 have identical initial hero including every inventory field, floor,
monsters, run seed/RNG and equipment/stats. No extra-fire confound remains.
There are28 total measured departures (18 baselines +10 selected alternatives),
56 observer continuations and15 separate actual8h continuations. Repeated quanta
are not independent samples. Tick positions are boundaries, not intra-tick attack
coordinates. Later procedural floors can diverge; local claims stop at the
initial floor. Full-run exits/carry/cause and timing remain separately archived.

| Scene | Choice | First-floor hurt damage | Drain max-HP lost | Last first-floor event tick | Next8h net Gold |
|---|---|---:|---:|---:|---:|
|Gas|baseline|9|0|1220|8050|
|Gas|gas_step|15|0|1730|8543|
|Gas|pack_break|16|0|1450|10751|
|Pack|baseline|13|0|1020|8769|
|Pack|gas_step|16|0|1100|9939|
|Pack|pack_break|11|0|1040|8671|
|Drain|baseline|27|4|1840|10597|
|Drain|boss_focus|27|4|1840|11307|
|Drain|corridor_fighting|7|1|1483|11010|
|Summoner|baseline|33|0|1170|11833|
|Summoner|boss_focus|33|0|1170|10921|
|Summoner|corridor_fighting|32|0|1110|10555|
|Support|baseline|35|0|1240|14777|
|Support|reflect_read|35|0|1240|14723|
|Support|corridor_fighting|23|0|1630|14769|

Hurt damage sums actual hero-target hurt event dmg values, not final HP loss
(net HP also includes healing/max-HP changes). Last-event tick is a run-clock
marker, not a human playtime estimate. Next8h uses a common public Scout resume,
then independent baseline/choice; all15 reports reconcile net Gold exactly to
purse deltas. These consequences do not prove encounter-specific superiority.
All15 absences reach deepest28; run counts and actual gold ledgers are retained.

Actual action attribution includes gas_step's t90 rule `gas step bloat` and hero
attack9 against that bloat, and corridor_fighting's t50 `corridor fighting wraith`
with attack9 against the wraith. Those events show behavior, not an invented
ranged retreat: gas step did not reduce gas damage on the selected gas scene
(6 in every arm). On the pack scene pack_break reduces total hurt13→11 and gas
hurt6→3, while its next8h Gold is98 below baseline. On the drain scene corridor
reduces max-HP drain4→1 and hurt27→7; it grants no drain immunity. On support it
reduces hurt35→23 but exposes11 armours callouts versus4 and takes longer.
No metric is quietly substituted for the named threat.

boss_focus does not improve either Crypt initial floor, and reflect_read does
not improve the support floor. Source explanation: ai.rs boss_focus immediately
requires a visible boss; it does not respond to ordinary conjurer summons, even
though meta.rs's descriptive card rows include a summoned selector. This is a
measured limitation and a source-backed explanation, not an implemented fix or
new counter. The claimed six distinct causal counter superiorities remain open.

## Reproduction and retained evidence

frozen-contract.md and frozen-selection.json predate alternative observations;
identity.json binds them and both harness/native versions. trace-harness.rs is
the initial capture executable's source; absence-harness.rs adds the separate
8h mode. No core, policy, profile, threshold, content or WASM change.

capture.tar.xz preserves original raw receipts and per-file hashes in manifest.json.
Identical byte payloads use standard tar hard links; the verifier reconstructs
original files in a private temporary directory under /tmp, verifies hashes,
earned parent chains,18 baseline eligibility calculations, all28 observer pairs,
15 exact matched sends and15 next8h accounting identities. No production analysis
helper is imported. Scripts search.py, scene_selection.py, alternatives.py,
absences.py and summarize.py document exact native commands and extraction.

The initial Python filename select.py shadowed the standard-library select
extension when alternatives.py imported subprocess. Both launches failed before
any native alternative started; logs are retained. Renaming to scene_selection.py
fixed the launcher, with no selected scenes or budget changed. No receipt was
replaced. Original local raw saves remain target/cut287; the archive is portable.

No six-scene/content acceptance, success threshold, representative-phone visual,
whole gate, exhaustive audit, independent fun acceptance, release or deployment.
Next: investigate the missing reflection contrast and the observed gas/summoner
response gaps before choosing and contracting any new formation or counter change.
