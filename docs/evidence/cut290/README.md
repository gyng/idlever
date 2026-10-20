# Earned gas loadouts and Throw permission — 2026-10-20

Automated native public-command measurements on the TWO fixed Cut287 earned
parents (gas s1/D9/a2, pack s2/D9/a2). No seed search, class/resource grant,
historical replay claim, human feedback, browser/viewport or fun review.
Game core/AI/defaults remain unchanged; the rejected Cut289 AI stays rejected.
Confidence is high for these verified deterministic parent comparisons and
limited for generalizing to other seeds/builds; frontend usability is not tested.

## Fixed grid:24 departures, eight loadout parents

Public set_starting selects an actually available/compatible sword or bow and
exactly heal/heal/fire or heal/heal/fire/fire/fire. All eight configurations are
legal, known, within actual capacity and free to reuse; Gold, marks, clock, RNG,
Legacy, party, kit upgrades and forge ownership remain unchanged by selection.
Within each loadout compare empty tactics, gas_step L3 variant0 (primary), and
variant1 (wade in), using public equip/set_tactic_variant. All three sends retain
exact initial hero INCLUDING inventory, floor, monsters and run RNG. The world
also remains identical between loadouts on each scene; gear/stock differ openly.

Each table entry is first-floor hurt / named gas hurt; final floor event tick.
Hurt sums hero-target hurt event amounts, not net HP loss (healing may intervene).

| Scene | Weapon/fire stock | Baseline | Primary | Wade in |
|---|---|---|---|---|
|Gas|sword/1|9/6;1220|15/6;1730|14/9;1330|
|Gas|sword/3|9/6;1220|15/6;1730|14/9;1330|
|Gas|bow/1|0/0;850|0/0;1740|0/0;1740|
|Gas|bow/3|0/0;870|0/0;1740|0/0;1740|
|Pack|sword/1|13/6;1020|16/9;1100|13/6;1020|
|Pack|sword/3|13/6;1010|14/6;1220|13/6;1010|
|Pack|bow/1|3/3;990|0/0;1030|3/3;990|
|Pack|bow/3|0/0;830|0/0;830|0/0;830|

All12 tested bow cases meet the TWO DAMAGE-ONLY targets<=9 hurt/<=3 gas. That
is not the entire Cut289 acceptance contract (for example primary's gas-floor
t1740 exceeds its old1730 time bound), and a changed loadout never accepts that
rejected AI. No sword case meets those damage-only targets on the gas scene.
Primary removes the one-fire bow pack baseline's3 gas hurt but is much slower
than bow baseline on the gas scene. This is a real local tradeoff, not a universal
best build. More stock can alter pickup/pathing decisions even if not consumed;
there are ZERO first-floor fire uses in the original24 grid. Do not describe
stock differences as fire attacks that never occurred.

## Fixed8h subset: eight actual absences

Chosen explicitly after the local grid and before absence outcomes: sword/one
fire versus bow/one fire, baseline/primary on both scenes. Common public Scout
resume per parent; no runner-up variant/three-fire absent search.

| Parent | Baseline net Gold / runs | Primary net Gold / runs |
|---|---|---|
|Gas sword|8050 /10|8543 /7|
|Gas bow|8319 /10|8523 /8|
|Pack sword|8769 /9|9939 /9|
|Pack bow|10824 /8|11153 /8|

All eight reach deepest28 with0 stalls, actual elapsed28800s, and exact Gold
ledger/net-purse reconciliation. Locally safer bow/primary is not automatically
better currency than sword/primary on the gas parent (8523 versus8543). Later
procedural floors may differ; absence totals are separate from local attribution.

## Paid Throw follow-up: four departures, no grants

Source inspection explains why the compiled variant1 throw row never uses its
known fire: both heroes are Fighters without Rogue Throw or the general throw
unlock. ai.rs::try_verb requires one of those permissions for explicit throw rows.
The slot is present and the gas tag is known; additional stock alone is not enough.
This is a permission dependency, not a proof that throwing or potions are broken.

A separately pinned follow-up attempts one actual public buy("throw") on each
sword/three-fire parent. Both offered purchases succeed at EXACTLY3 earned marks,
0 Gold, with no class change or borrowed resource. Baseline versus wade-in then
shares the purchased parent; four additional matched sends, no automatic8h run.

| Scene, sword/3fires/Throw owned | Baseline hurt/gas | Wade-in hurt/gas | Wade-in fire uses | Last floor tick |
|---|---|---|---:|---:|
|Gas|9/6|6/3|3|840|
|Pack|13/6|7/0|3|960|

Actual gas-scene fire uses are t20/30/80; pack uses t730/740/800. This is an
existing legal preparation route that meets the damage targets at these scenes
without the rejected AI. It does not establish population balance or all-runtime
safety; natural later exits include deaths and are preserved. No counter outcome
is justified only by a label. Full send/trace/exit/action/carry data and per-case
quotes are in the raw archive and results.json / throw-results.json.

The dependency deserves a product follow-up: throw execution correctly rejects
missing permission, but its block_reason currently falls through to "no line"
when item and foe exist. Reproduce that specific diagnostic before changing it;
preserve the class/permission lock and actual behavior. R4's broader class-build
review and package/ability dependency presentation remain open. No class-verb
implementation was inferred merely from a card name.

## Checks and evidence

28 departures,56 observer continuations: every full event stream and entire
terminal save matches at step(1)/step(100). Eight public loadouts, two real Throw
purchases,28 matched initial-state cases and eight8h ledgers independently check.
Warnings-denied Clippy passes for both helper revisions; scoped rustfmt/diff pass.
No product AI/core/default, held upgrade/recovery, WASM, release or deployment.

identity.json binds both native/harness revisions and the three staged contracts.
Original grid/absence executable is target/cut290/encounter-catalogue; purchase
follow-up is encounter-purchase. They use the same unchanged core. harness.rs is
the grid source, purchase-harness.rs adds purchase handling. Public refusal paths
retain their receipts; no purchase was refused in this bounded run.

capture.tar.zst contains517 ORIGINAL raw JSON/text receipts:1235669385 bytes,
704654533 unique bytes after standard tar hard links,6384059 compressed bytes.
Long-window zstd archive generation took2.291s on this run, excluding simulation
and verification. That is an observed archive cost, not a matched codec benchmark
or a full playtest speedup. Old XZ evidence is preserved. verify.py requires the
already-installed zstd executable and Python stdlib; it streams one forward pass,
validates every hash/link, reconstructs files in private /tmp storage and cleans
up. It independently reconstructs all first-floor metrics and public-cost/input/
variant/inventory/observer/clock/Gold invariants, with no production analysis import.

Run from repo root: `python3 docs/evidence/cut290/verify.py`.
Local raw copies remain target/cut290. Full gates, exhaustive/visual/fun acceptance
and six distinct counter-superiority claims remain unestablished. This grid
answers bounded preparation questions and identifies the next diagnostic task.
