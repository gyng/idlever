# Learned-counter attribution and sixth ordinary scene — 2026-10-20

Automated native public-command measurements; no human feedback, browser,
viewport/visual review or fun rating. Source/parents/core/native/harness hashes
are in identity.json. Game core is unchanged from Cut287. Raw original events,
saves/maps and tick-boundary positions survive in capture.tar.xz (183 files,
414970868 raw bytes;2386648 compressed; identical payloads are tar hard links).
No grants, seed replacement, retro-equipment or hidden drill changes.

## Interpretation correction

Cut287's summoner baseline already has a learned Lich drill and attacks both
spectral blades at t860/t870 using row0, origin drill:lich. L3 boss_focus also
compiles a generic summoned-selector extra row. ai.rs's card routine requiring
a boss therefore cannot establish that the whole L3 package lacks a conjurer
response. The old tied damage/time observations remain correct; the previously
inferred missing response was unsupported. The old README/contract/handoff are
explicitly corrected, with original raw data and prior git history preserved.

## Fixed public intervention

Two existing earned parents, no new random search: Cut287's selected summoner
and earliest golem-containing Foundry parent (s1/D19/attempt2). Four initial arms
per scene: enabled learned drill; publicly revoke only that drill; revoked plus
boss_focus/reflect_read L3; revoked plus corridor_fighting L3. Source calls and
exact action logs survive. Enabled/revoked prepared saves differ ONLY in the
named revoked flag and removal of that drill's two generated rows. All10 final
departures start with exact same initial hero/inventory/floor/monsters/run RNG
within their scene; public revocation persists after each run.

| Scene / drill | Arm | First-floor hurt | Hero reflection attacks | Last floor event tick |
|---|---|---:|---:|---:|
|Summoner / Lich|enabled baseline|33|0|1170|
|Summoner / Lich|revoked baseline|33|0|1170|
|Summoner / Lich|revoked + boss_focus|33|0|1170|
|Summoner / Lich|revoked + corridor|32|0|1110|
|Reflection / Master|enabled baseline|26|0|2420|
|Reflection / Master|revoked baseline|26|7|2240|
|Reflection / Master|revoked + reflect_read|26|0|2420|
|Reflection / Master|revoked + corridor|120|22|2230|
|Reflection / Master|enabled + reflect_read|26|0|2420|
|Reflection / Master|enabled + corridor|31|0|3120|

Eight initial departures plus exactly two enabled-choice follow-ups (scope pinned
before those outcomes),20 fine/coarse continuations. Every complete event stream
and terminal save matches at step(1)/step(100). The revoked arms are deliberate
DIAGNOSTIC ABLATIONS, not an ordinary baseline or a rewrite of Cut287's search.
No new content or success thresholds are accepted here.

Summoner enabled/revoked/revoked+boss_focus have identical combat/movement event
streams for the exact declared event-kind subset in analyze.py. Actual fired
origins differ: learned Lich row versus generic stance targeting versus explicit
L3 boss_focus extra row. That is existing response redundancy on one scene,
not a missing generic response or evidence of overall card ineffectiveness.
Non-rule event streams need not be identical: policy-dependent passage credits
at send differ ($376/$377/$379 respectively). Before-send gold/clock/marks/RNG
match, and initial combat state matches; the automatic economic consequence is
retained rather than normalized away. No wallet grant is used to equalize it.

Reflection reveals a real existing counter: enabled Master gives0 reflection
attacks, revoking gives7, revoked+mirror gives0. The explicit card and learned
counter have identical local combat/movement streams. Hurt totals stay26 across
those three, so do not advertise an overall survival or total-damage advantage.
Counter behavior changes what attacks occur and where damage comes from. For
example the revoked baseline takes22 hurt labelled iron_golem (including returned
blows), while revoked+mirror takes4 iron_golem hurt and20 slag_crawler hurt.
The corridor arm has22 returned attacks and120 total hurt but later banks atD23;
local harm is not silently collapsed into run survival or net currency.

## Sixth ordinary catalogue entry

The enabled Master baseline is the ordinary current state. Two additional legal
enabled choices provide its baseline/mirror/corridor comparison without weakening
that baseline. This supplements Cut287's five scenes; it does NOT pass that old
search's missing-reflection criterion or change its0/6 denominator. Threat and
response attribution comes from the separately declared public ablation above.

Three actual next8h branches share that enabled parent and a common public Scout
resume: baseline/mirror/corridor each play12 runs, deepest28; net Gold10492 /
10492 /14030. Each ledger reconciles exactly to purse delta and elapsed28800s.
Mirror's redundancy and corridor's local/away tradeoff are recorded, not scored
into an invented universal winner. Full natural-run exits/carry/cause remain in
raw events; later generated floors may differ and are not matched scene evidence.

catalogue-six-scenes.json joins the FIVE ordinary Cut287 entries and this ONE
ordinary entry: six scenes,18 matched send cases and18 separate next8h outcomes,
from only two original seed identities. These are bounded measurements, not18
independent seeds, six distinct counter superiorities or a balance certificate.
Tick boundaries do not certify exact intermediate attack coordinates. The
implementation/placement/visual/gate/fun requirements of Cut136 remain open.

## Checks and next action

Independent verify.py streams and reconstructs the archive, checks all hashes,
source/contract identities and original Cut287 archive binding, exact public
revocation scope/persistence,10 same initial states, all10 event/save observer
pairs, actual fired-row origins/combat hashes and3 next8h ledgers. It reads only
archived data and standard-library helpers; no production inference imports.
Warnings-denied example Clippy, scoped rustfmt and diff checks pass. All native
jobs are terminal. Local raw copies remain target/cut288. No core/WASM/default,
held upgrade/recovery, push/release/deployment or global gate change.

Next product decision should use this corrected six-scene evidence. The observed
gas-step case remains a candidate: it melee-hits a bloat, takes the same gas harm
and more overall hurt than baseline despite its range-oriented description.
Inspect the actual available ranged/throwable response and L3 row reachability,
then pin numeric behavior/regression gates before editing core. Do not invent a
summoner-response fix from the now-corrected tie, or force six superiority claims.
