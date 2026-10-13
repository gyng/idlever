# Cut201 — retire storage chores

Implementation checkpoint of Cut196. Active progression, scene and menu
retirement are delivered with scoped evidence; complete backend/API cleanup
and full product-queue acceptance remain pending.

## Chosen direction

Retire Storehouse, keeper and armourer without replacement chores. Found items
already convert once at pickup and settle without Keep. Quartermaster prepares
eligible reusable supplies; apprentice buys permanent forge upgrades. Those
existing roles cover preparation and progression without a storage facility.

Gold funds permanent capabilities. Bloodline Loadouts selects eligible reusable
choices. Existing `loadout(itemIds)` selects vault instances and must not be
presented as a permanent named-kit API. Deeper saved kits remain separate work.

Remaining buildings require manual construction. Remaining workers retain their
names, real actions and first-act announcements. Preserve dungeon cage selection
and single-value bones provenance; neither is home storage.

## Dependency map

| Area | Required integration |
| --- | --- |
| Town | Remove Storehouse from `town.rs::BUILDINGS`, `triggered`, stages and `grew`. `TownWire.next` currently chooses the first unbuilt building, so an obsolete plot can obstruct later building guidance. Retain manual construction for remaining buildings. |
| Workers | Remove keeper/armourer from `tree.rs::NODES`, posts, perks and report wording. Remove `armourer_plan`, `pack_armourer`, its send callback and storage gates. Core worker eligibility is independent; there is no prerequisite requiring armourer before apprentice. |
| Forecast | Remove armourer projection from `forecast.rs::sim_game` and its cache-key input. Preserve authored preparation, package projection and deterministic forecasts. |
| Unlocks | Remove `vault2`–`vault5` from `meta.rs` and client offers/prerequisite labels. No other unlock depends on that storage chain. |
| UI | Remove Storehouse scene/tile/help targets and the stored-gear panel in `camp.ts`; remove vault navigation in `town.ts`, `systems.ts` and `concepts.ts`. Remove armourer from `works.ts::TRUNK` and both retired worker descriptions. Update complete home-building tooltip coverage. |
| Renderer | Remove active Storehouse placement and retired worker posts from `render/town.ts`. Coordinate walkers and chest destinations. Historical art assets may remain unused; do not modify historical evidence to erase their former role. |
| APIs/wire | Retire Keep preferences, vault instance selection/selling and paid insurance surfaces across Rust, WASM, proxy and types. Preserve cage `choose` and `vault_pref`: they select dungeon encounters, not home storage. |

Affected saved state: `LineageState.vault`, `keep_pref`, `insured`;
`Game.loadout`, `pending_exit`; `Tree.worn` and the armourer's `sends` counter;
retired worker entries in hired/done/paused/acts/ranks/perks; Storehouse entries
in town/system reveals; and `StandingOrders.keep/insure`.
`next_vault_id` also allocates prepared supply IDs: retain or rename it rather
than deleting it with storage.

The owner requires no backwards compatibility or migration. Removing visible
offers/workers is the first integration; obsolete API/save cleanup must be
explicitly tracked and completed before claiming full retirement. Do not leave
paid offers, unreachable chores or accessible storage panels behind a UI filter.

## Open disposition

`bones_only` currently means no vault. Once everyone has no home storage, that
ascension choice has no distinct effect. Remove its current offer, or write a
separate meaningful variant contract before replacing it. Do not retain a
meaningless choice or invent an upkeep chore to justify its name.

Decide the final public API removal scope before implementation, including
manual Keep receipts, insurance orders and old vault-based `loadout` calls.
Historical raw saves/tests are evidence, not a requirement to retain player
storage. Preserve unrelated accounting, privacy, replay and absence invariants.

## Numeric acceptance

1. New towns expose0 Storehouse plots, storage upgrades, keeper/armourer hire or
   rank offers, and insurance/Keep controls.
2. Routine delves require0 storage decisions or visits. Removing/replenishing
   an unlocked kit still changes Gold by0.
3. Every remaining optional worker branch is reachable without a retired
   worker. Remaining first-act announcements name the worker's actual action.
4. All remaining buildings require an actual manual construction action;
   retirement does not silently build plots or facilities.
5. Cage selection and claimed bones recovery preserve single lifetime item
   valuation, true quantities and unknown-name privacy.
6. Earned Scout access remains within the existing15min/5-manual-delve bounds
   on the specified baseline seeds, unless a further explicit owner/design
   amendment changes that contract. Report failures rather than altering gates.

## Earned pacing baseline

Use seeds1,3,5,7,11,13,17,29. Start with genuine `Game::new` towns; build the
house through the public action; play actual delves. Construct only ready
buildings and hire Scout only when genuinely eligible and affordable. Do not
grant Gold, discoveries, worker flags or milestones to manufacture progression.

After each actual return record elapsed time, manual delve count, returned Gold,
first affordable permanent forge upgrade, building offers, ready worker offers
and new meaningful choices. Preserve saves and events. Run the same script
before and after retirement; compare first-session decisions and time to
autonomy. Separately verify continued automatic delves after hiring Scout.

Measure corrected accounting before setting further pacing changes. Do not add
arbitrary elapsed-time delays to hide early clutter. A candidate coherent forge
trigger is when its first permanent purchase becomes affordable, rather than
first returned Gold; this is a proposal requiring baseline evidence, not an
approved runtime change. Set additional numeric staging targets from that
evidence before tuning.

## Status

Active Storehouse plots/progression, keeper/armourer workers and callbacks,
paid storage offers, storage menus and Keep/insurance controls are retired.
The redundant bones_only offer is removed. Remaining manual buildings, workers,
cage preferences and free preparation remain. A genuine ready-Bank label/hero
hit collision was found in an earned town and fixed without moving scene geometry.

Eight earned before/after seed cases retain3 manual delves to Scout, unchanged
first-kit affordability and15–17 autonomous8h runs. The single removed building
tap saves5 modeled seconds; times use the documented dayplayer4x model, not a
browser wall-time claim. Native841 pass with6 existing ignored; Clippy passes.
New real WASM6354127bytes passes loot/free-preparation/Bloodlines groups3/3 in
8.6s; earned seed1/3 building/menu checks cover400/1440. Earned GL400/Canvas1440
and17-case construction regressions pass. Web build/lint/copy pass.

Evidence: docs/evidence/cut201 and docs/evidence/cut201-render. Raw pacing saves,
events and first native failure are preserved with byte-verified archive hashes.
Inactive storage API/save fields and old watch handlers remain pending coordinated
cleanup. This is not complete API retirement, exhaustive balance or fun acceptance.

## Renderer lane contract

The earned eight-seed core baseline was recorded before renderer edits. Active
facility IDs are now blacksmith, kennel and bank, plus the separate house;
worker IDs retain `kennel_keeper` while exact `keeper` and `armourer` retire.

- Zero active Storehouse plots, route destinations, spurs, workers or fallback
  role routines. Historical packed art/light metadata may remain unused.
- Preserve all existing coordinates and main path edges for the house, Forge,
  Bank, Kennel, cave, fire and actual remaining worker posts. Returning loot
  carriers route to existing home/tent, never storage.
- The remaining three-facility maximum reaches the existing final cosmetic
  house/plaza/south-lamp/carter dressing. No gameplay milestone, construction
  action or automatic building is added by cosmetic staging.
- All four real manual constructions remain usable immediately; GL and Canvas
  expose zero retired click targets, and remaining building geometry and hero
  target alignment stay within the existing1CSSpx bound.
- Preserve Cut198's terrain arithmetic/cache and Cut199's opt-in Forge/Fighter
  shader. Verify a genuinely earned current snapshot after the core package is
  rebuilt; old saved fixtures do not prove current first-session progression.

## Renderer checkpoint (current package)

The renderer lane is implemented and source frozen. Active Storehouse placement,
its store-only route spur, returning-chest destination, and exact keeper/armourer
posts/role routines are removed. Kennel_keeper retains the existing Kennel-post
fallback; remaining plot coordinates and main routes are unchanged. The final
house/plaza/south-lamp/carter dressing now arrives with all three facilities.
Historical packed Storehouse art/light metadata remain unused; terrain arithmetic
and the opt-in Cut199 shader are unchanged.

Current real WASM (6354127bytes) passed one private-GPU journey at400px GL and
1440px forced Canvas. Actual House/Forge browser controls and genuine native-earned
three-facility state verify zero retired plots/targets/workers, finite remaining
routes, final-house staging `[1,1,2,3]`, and five recorded returning parties routing
home. Native records supply actual Kennel/Bank construction provenance; those two
browser build actions are not repeated by this renderer journey. Noon/night shots,
raw checks and exact source/package/save hashes are in `docs/evidence/cut201-render`.
The existing construction test now verifies17 active transitions, then passes
Full/Low/Off/reduced lifecycle on both GL and Canvas. TSC, scoped Oxlint, default
format and diff checks pass. These are correctness checks under concurrent native
load, not a new performance certification.

An independent earned first-session UI check found a Bank ready-tag intercepting
a House target at400px; the UI owner is correcting that collision while scene
coordinates stay frozen. The all-built renderer snapshots do not certify every
intermediate label layout. Wider earned pacing, API retirement and complete UI
acceptance remain the owning lanes' responsibilities.
