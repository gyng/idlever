# Earned encounter discovery — first bounded screen

**Instrumentation and18 candidate departures captured; six controlled scene
contrasts remain NOT_ESTABLISHED.** This is fresh automated measurement on current
core from historical earned inputs, not historical replay identity, owner/player
feedback, visual review, population balance or fun acceptance.

Inputs are Cut282 `AWAY-nodes-s{1,2}-d4-c0.json.gz`. Both were loaded on current
core, continued for one ordinary24h absence, and earned pack_break without grants.
Original/unmodified, normalized and after saves plus reports are archived.
Each seed then supplies three independent prepared parents at legal starts9/14/19.
The Scout is paused publicly, actual recovery is waited out if needed, and the
two relevant tactics are bought toL3 using earned marks (10 marks per parent).
Live choices use the public automatic/default setting consistently. Baseline
retains the earned Guarded stance and empty tactics; variants equip one tactic
in slot0. Exact actions, prices, levels, facts, kit, RNG, route and sends survive.

| Start / biome (all route0) | Baseline and two alternatives |
|---|---|
|9 / Fens|baseline, gas_step L3, pack_break L3|
|14 / Crypt|baseline, boss_focus L3, corridor_fighting L3|
|19 / Foundry|baseline, reflect_read L3, corridor_fighting L3|

Six prepared parents,18 departures,36 traced continuations (two observer quanta
per departure). All18 have exact full event-stream and complete terminal-save
parity for step(1) versus step(100). The tick observer supplies floor maps and
before/after tick positions when events occurred, including overlays, armour
buffs and hunger/gas counters. **Positions are tick boundaries, not exact
intra-tick attack coordinates**; do not use them to assert a precise intermediate
flank or corridor step without additional attribution.

## What the measurements changed

1. **Later floor matching is absent.** Every variant starts with identical floor,
   monsters, run seed/RNG and equipment/stats (inventory exception below). Choices
   can consume random draws differently, causing later generated floors to differ.
   Same-parent full runs measure the total departure choice, but cannot prove
   superiority against an identical later composition. No comparisons equip into
   a historical fight, and no later outcome is sold as a matched scene result.
2. **Four sends have different consumables.** boss_focus at start14 and reflect_read
   at start19 pack an additional known fire potion on both seeds. All other hero
   fields match baseline at send. This is legitimate automatic package preparation,
   but a confound for a pure behavior comparison under Cut136's matched-kit rule.
   Next: use the public supply command to prepare a common eligible fire potion
   before all forks, and verify exact sent inventory rather than assume matching.
3. **First-floor threats are insufficient.** No baseline starting floor produces
   a hero reflection attack or max-HP drain event. Seed2 start19 has four actual
   `armours` callouts (first at tick790), and seed2 start9 has gas overlays and6 gas
   damage. Gas overlays on Crypt starts are not proof of the intended Crypt drain/
   summoner contrast. Later drain/reflection events remain discovery leads.
   `spawn skeleton` counts are explicitly unattributed; ordinary skeleton spawns
   are not evidence that the Lich summoned one.
4. **Outcomes vary and losing cases are retained.** Seed1 Fens baseline dies atD13,
   gas_step banks atD21, pack_break banks atD18. Seed1 Crypt boss_focus dies atD23
   while baseline/corridor reachD28 and die. Seed2 Foundry reflect_read dies atD27
   while baseline/corridor bank atD23. These are actual full-run outcomes, not
   scene-specific causal wins, and do not identify a universally superior counter.

`discovery.json` gives every case's first/later event counts, quoted raw events,
hero damage by named cause and actual last-run record. Complete exit lines remain
in raw streams, including carried/secured/kept settlement and action attribution.
No next8h choice-check has run: select valid matched scenes first, then measure
absence consequences separately under a common Scout-resume action.

## Evidence and checks

`capture.tar.xz` contains279 original JSON/text receipts, including all failed/
losing search attempts, inputs, preparation, send saves, full events/frames/maps,
and both terminal saves. `manifest.json` binds every raw file's hash and size,
source HEAD/core tree, native executable and harness hashes. Compression preserves
original bytes. Temporary raw copies remain in target/cut286. No package or seed
was granted or edited. Independent `verify.py` streams and checks archive hashes,
public-choice parent invariants,18 same initial scene/RNG/equipment states,
complete event/frame consistency and observer save parity, and explicitly records
four inventory differences. Run it from repo root; writes temporary files under
/tmp and cleans them up. `verification.json` records its result.

Warnings-denied example Clippy and scoped rustfmt pass. No product/core rule,
content, WASM, profile, threshold, held upgrade or recovery change; no deployment.
The initial analysis scaffold assumed an explicit serialized zero route field;
using the omitted-default form corrected that analysis without altering evidence.
The first gzip verifier passed but repeatedly sought through a large archive;
final verifier uses one forward pass and temporary files. XZ avoids repeatedly
storing the same large historical save sections in compressed evidence.

Next bounded discovery needs an explicit search budget for new earned sends,
first-floor threat eligibility before choices, common legal inventory, and actual
counter action attribution. Do not add formations or pin success thresholds from
these unmatched later scenes. Cut136/R3 and its next8h/visual/content stages remain
open; this checkpoint closes neither the six-scene requirement nor broader balance.
