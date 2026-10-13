# Cut215 — Forge and Loadouts frontend contract

The Cut211 checkpoint a327b8dd has released this lane for implementation. Shared
effect/tradeoff cards and guarded read-only Loadouts links are implemented;
Forge/catalogue wiring now uses canonical Rust metadata. Final real-WASM client acceptance has passed: 305 assertions through the normal
runner and 103 separately controlled catalogue assertions. Root owns first-discovery Watch/report/camp routing;
core owns items, deterministic drops, permanent town-wide ownership and fees.

Reuse `startingKits` and its actual set/save/select/delete API. Legendary shapes
are choices in the existing weapon/armour disclosures, not another inventory.
Name, effect, tradeoff, ownership, compatibility, reveal state and slot come
from Rust. Do not reconstruct effects from rarity or numeric stat differences.
Keep ordinary owned choices visible so a player can compare the tradeoff.

Forge gains a small discovered-shapes section, with actual effect/tradeoff and
an explicit Free use action routing to the selected resident's existing
Loadouts tab. Existing permanent slot upgrades remain the only upgrade ladder.
Reading Forge, opening a link and selecting a shape are distinct operations;
none may silently buy a rank or equip a choice. Unowned shapes are shown only
when the actual core catalogue reveals them; fresh towns cannot receive a wall
of unavailable legendary cards. Current selected gear uses its actual authored
label rather than a lowercased internal ID.

- Crownsplitter/Hearthglass/Frostmantle effect and tradeoff text must match the
  approved actual Rust definitions, not this UI's assumptions.
- Actual first-find fixtures seeds1/13 produce the owned row without a Claim,
  Keep, fee or inventory cleanup. Duplicates show no second power/ownership
  entry; Gold value is real core settlement and never recomputed by UI.
- Town-wide ownership is visible after actual second-resident selection; its
  own upgrade ranks remain separate. Stale owner/engine/incarnation actions
  cannot change a newly selected resident or imported/new town.
- Actual setStartingKit free use, named-kit save/select/reload, ordinary-shape
  switch and defaults all preserve exact Gold. Compare real saved preparation
  state before/after; do not infer correctness from button text.
- Actual unowned/incompatible/away/invalid ID choice and saved-kit refusals are
  atomic. A prepared actor is refitted through the existing engine API only;
  companions, free supplies, ration, paid toll and RNG remain core-owned.
- Validate fresh/first-find/owned/duplicate/away states and selected/saved kits
  at320/400/1440 normal/200% text: every action44px, zero horizontal overflow,
  readable status and keyboard focus, exact enabled/selected semantics.
- Archive raw failures, fixture and served-module/WASM hashes; post settled
  actual Forge/Loadouts screenshots on the private GPU. Root posts live-drop
  announcement shots and proves its link reads without silently equipping.

Current seams: `ui/forge.ts::openForge` paint() and kitKey(app) refresh;
`ui/starting-kits.ts::startingKits` choices() and current();
`ui/bloodline-loadouts.ts::renderBloodlineLoadouts` wrapper; existing material
styles in forge-branches.css/bloodline-tabs.css/ui-foundations.css. Existing
source fingerprint includes all actual Lineage; it should naturally refresh on
new ownership. A new helper can render shared effect/tradeoff cards without
editing the frozen Hero or frame paths.

Canonical wire is present: named-shape metadata on choices and owned-only
Lineage.legendaries separate ownership/compatibility. Actual selected labels
are resolved from the matching row. Root owns first-unlock metadata glue.
Existing shape/kit APIs suffice; no new bridge mutation was introduced.

Accepted client checkpoint:

- Final canonical earned seed1/13 source kills produce exactly one real first
  discovery and owned row. Normal runner: 305 assertions, 48 layouts, PASS in
  74.8 seconds. Actual free refit, paid-toll/RNG preservation, named-kit
  save/select/reload, unowned/invalid refusal, town-wide ownership after a paid
  second resident and stale-action guards are checked through current Rust.
- Controlled Fighter/Gunner all-three catalogue: 103 assertions, 24 layouts,
  PASS. Actual Gunner incompatibility refuses atomically. These fixtures use
  controlled boss placement/damage and class qualification; they are not an
  earned all-three progression claim.
- Synthetic icon coverage: 126 assertions per width, 378 total, PASS. All normal
  definitions retain packed-image checks; the three named items have correct
  sword/armour primitive fallback. Masterwork preserves the former gold palette
  and sorts below named Legendary.
- The UI disables changes while away. The real engine may allow valid next-run
  configuration while away; acceptance does not invent a blanket API refusal.
- An earned duplicate UI fixture was not supplied. Duplicate settlement and
  effect/balance acceptance remain the core owner's independent proof; the
  optional duplicate fixture branch was not executed.
- Served package is 6,539,458 bytes, SHA256
  `304d9172c430d72c9e9ba24d2db0c475f05071c6b4bc8a2d1521292740429eda`.
  Detailed provenance, failures and screenshots are in
  `docs/evidence/cut215/ui/README.md`. Root owns announcement and receipt glue
  acceptance. This client checkpoint makes no full-balance or fun-rating claim.


Final Forge consistency amendment: owned canonical legendary kinds are omitted
from the ordinary local discovery ladder, preserving all other rows. Actual
seed1/13 focused regression passes16 assertions; refreshed private-GPU frames
and served source hashes are archived in `ui/gpu-consistency-final`.
