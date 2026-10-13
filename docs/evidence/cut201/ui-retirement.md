# Cut201 UI retirement checkpoint

Implemented: Storehouse target/tile/help and stored-gear panel retired; storage
reveal, paid slot labels/prerequisites/effect projections removed. Retired
armourer trunk and keeper/armourer descriptions removed. Run setup no longer
exposes Keep or insurance controls. Cage preference remains a dungeon choice;
kennel_keeper and all independent workers remain core-owned. Loadouts/Class/
Legacy remain available through the hero window. No core, wire or package edits
were made in this lane, and no UI filter hides obsolete worker/catalogue entries.

Focused headless checks passed at 400×900 and 1440×900 against each independently
earned current seed 1 and seed 3 final snapshot: four width/seed combinations.
Controlled building fixtures additionally cover all four remaining help controls
(House, Forge, Kennel, Bank), ready/locked construction help, viewport bounds,
hover/focus access and no accidental construction. Those fixtures prove complete
presentation coverage, not earned progression. Earned snapshots separately prove
real Workers and run-setup menus, absence of retired offers/panels and retained
Bloodline tabs. Logs: [seed 1](ui-home-seed1-collision-retry.log),
[seed 3](ui-home-seed3-final.log). Input hashes: [manifest](ui-inputs.json).

The first earned-state test found the ready Bank build sign intercepting the
hero target center. `ui/town.ts::placeTag` now scores nearby bounded label
placements against 44px center regions of remaining targets. Renderer geometry
and plot coordinates remain unchanged; no forced click or disabled pointer
handler was used. The regression verifies actual element-from-point access to
both hero and build-sign centers, then clicks the hero normally.

Raw failures are retained: `ui-home-seed1.log` is sandbox server-start failure;
`ui-home-seed1-retry.log` records the genuine pointer interception;
`ui-home-seed1-final.log` records an unsettled/offscreen hit-measurement failure.
The final test waits for sheet removal and scrolls the town into view before
measuring hit access. TSC, targeted Oxfmt and Oxlint passed after source changes.
No performance, new screenshot or exhaustive audit claim is made here.

Pending coordinated cleanup: retained backend/save fields and old watch storage
handlers. `ui/unlocks.ts::vaultSlots` remains only because `ui/watch.ts` still
imports it for the old storage-full/pending-keep paths (currently around 4960,
5136 and 5205). Remove that helper with those handlers and API/wire cleanup.
Cage `vault_pref` must remain. This checkpoint does not claim complete storage
retirement across every backend and historical helper.
