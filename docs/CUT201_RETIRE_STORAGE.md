# Cut201 — retire storage chores

Proposed next dependency of Cut196. This is a read-only audit and implementation
contract, not delivered behavior or acceptance of the full work queue.

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

Audit and proposed contract complete. Implementation, earned baseline,
retirement-specific validation and API/variant disposition remain pending.
Runtime and UI source are unchanged by this document. Coordinate implementation
with the agents owning town rendering and camp/town UI before editing them.

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
