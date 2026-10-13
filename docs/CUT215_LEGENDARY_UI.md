# Cut215 — Forge and Loadouts frontend contract

This lane is proposal/inventory until the Cut211 checkpoint commits and Rust's
actual legendary wire is frozen. No runtime change or legendary acceptance has
landed here. Root owns first-discovery Watch/report/camp announcement routing;
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

Pending wire requirements sent to core: actual named-shape metadata on choices
and actual selected labels; ownership versus compatibility/reveal distinctions;
first-unlock announcement metadata for root. No new bridge method is needed
unless the actual existing shape API cannot represent the Rust definition.

Read-only core wire proposal received: existing StartingGearChoice gains optional
legendary/effect/tradeoff; owned-only Lineage.legendaries rows carry
kind/label/effect/tradeoff/compatible/available/blocked/source. First actual
pickup emits one discovery announcement and typed loadouts link metadata,
subject to root's final event-size review. These are proposals, not present
fields or accepted implementation yet. The UI can reuse the canonical row
metadata and look up actual selected gear labels without inventing another API.

Client fixture/test plan (not yet executable acceptance):
1. Load actual pre-find earned save, open Forge/Loadouts and compare exact save;
   catalogue exposes no unknown named cards. Forge/configure an unowned ID and
   invalid/incompatible ID through actual API; refusal must preserve full save.
2. Advance bounded real pickup ticks supplied by the core fixture manifest;
   read actual ownership and ordinary ledger settlement. First notice/link is
   root's separate glue check. Opening the owned Forge row reads without equip.
3. Select owned shape through the actual row, compare Gold and RNG before/after,
   inspect prepared actor/config, save a named kit, choose ordinary gear, select
   saved kit again, reload. Gold remains exact for every use/save/select step.
4. Pay actual earned resident price, switch owner, verify shared owned catalogue
   and independent upgrade ranks. Retained old action cannot configure new actor.
5. Actual Send: choice controls disable, direct refused away changes preserve
   full save. Any next-run allowance must be the real current Rust contract;
   do not impose a stronger restriction based on old expectations alone.
6. Fresh/owned/away/duplicate views, all3 widths and2 text scales. Open disclosures
   to inspect every row/44px control; settle fonts/images/sheet animations. Root
   proves notification uniqueness and live-drop screenshot separately. Archive
   exact served scripts/package and input fixtures; no repeated broad audit.
