# Cut216 — equipment and set UI contract

Owner resumed2026-10-14. This lane owns Forge, Loadouts, canonical set
presentation, slot icons and focused client acceptance. Core owns all equipment
resolution, ownership, bonuses, source eligibility and automation. Root owns
frame/Watch/topbar and integrated packaging. Cut215 evidence remains immutable.

## Wire boundary

Agree the canonical Rust types before dependent controls. Three slot choices
(helm/body/boots), weapon separately, must be published with actual compatibility
and ownership. Actual equipment and queued next-departure equipment/counts are
distinct. Per-hero Follow set, pins and fallbacks persist through named-kit CRUD;
the UI submits intent without resolving it. Scout source focus has actual
availability, blocked reason, current status and stop explanation. No local
loot tables, random selection, equipment resolver or proc calculations.

## Player presentation

Forge keeps its iron material. Owned set pieces reveal a family card with
canonical current/next counts and partial/full effects explicitly active or
inactive. Collection count never substitutes for equipped count. Normal and
standalone owned choices remain visible; fresh towns show no unavailable set
catalogue. Canonical set/legendary ownership excludes obsolete local find-count
Forge ladders. Source focus is optional and never presented as paid collection.

Loadouts keeps ink/gilt. Three slot disclosures expose real owned choices,
compatible defaults and blocked reasons. Follow set is a deliberate single
choice; per-slot pins allow a stable hybrid, and saved fallbacks remain explicit.
Newly found pieces change queued intent only, according to Rust's safe boundary.
Turning Follow set off uses the returned Rust state. Named kits save the full
real intent; reading does not configure, equip, resolve or spend.

## Numeric acceptance

-320/400/1440 CSS widths × normal/200% text: zero horizontal overflow (>1px
 fails), every visible action/input/summary at least44×44 CSS px.
- Keyboard controls have visible focus; button hover, pressed and selected
 states are distinct. Text contrast≥4.5:1, non-text control boundaries/focus≥3:1
 against their actual surface; record sampled material colors and state scope.
- Each real supported slot has a choice and canonical selected/queued status.
 Partial and full bonus lines match wire text/count/activation exactly.
- Read-only Forge/Loadouts opening and links preserve exact engine save.
 Free choice/follow/pin/fallback/named-kit CRUD preserve exact Gold. Prepared
 refit retains actual RNG/toll/companions/supplies and does not spawn again.
- Actual paid second resident, shared ownership and distinct intent; retained
 old actions make zero mutation calls after owner/engine/incarnation changes.
- Actual earned piece fixtures prove discovery→ownership→queued/prepared use;
 controlled all-piece/class/incompatible/fallback matrices are labeled and do
 not certify earned timelines. Away state follows actual API refusals.
- Fresh no-HMR current-WASM checks pin fixture, package and served-source SHA.
 Tests write artifacts only with explicit output paths, never frozen defaults.
 Raw failures stay archived; settled milestone PNGs use the private GPU display.

## Owned files and integration

Existing `ui/forge.ts`, `ui/starting-kits.ts`, `ui/bloodline-loadouts.ts`,
`ui/legendary-gear.ts`, `legendary-gear.css`, `ui/items.ts`, `items.css` as needed;
new set-equipment helper/styles and focused tests. No town/camp/watch/frame or
core/type/bridge edits in this lane. Exact wire names and mutations await core
agreement. Implementation/validation remain pending; this is the numeric plan,
not accepted evidence.

## Coordinated wire proposal, not yet landed

Core proposes optional `helm`, `boots`, `follow_set` and
`pins:{helm?,armour?,boots?}` on the existing StartingConfig; `armour` remains
the body key. Exact configured gear doubles as saved fallback. Existing named
kit mutation methods remain unchanged. StartingKits adds helm/boot catalogue
rows and canonical `armour_sets` with actual/next counts, bonus activation,
slot resolution origin and focus availability. A new `setSetFocus(family|null)`
mutator will choose the actual current known eligible missing-piece source.
Do not implement these tentative names until canonical types are approved.

Preparation landed: unimported material/geometry set CSS and presentation-only
`itemIcon(...,{equipmentSlot})` primitives for helm/body/boots. Existing item
calls stay unchanged. Scoped formatting/lint and current TSC pass. This is
implementation preparation only; no set controls or accepted screenshots yet.

## Implemented source checkpoint, awaiting current package

Canonical ArmourSlot/ArmourSet declarations have landed. `armour` remains the
body key. New `ui/set-equipment.ts` shows Rust current/next slots and origin,
actual/next equipped counts and each canonical bonus's active/inactive state.
Forge set links are guarded read-only destinations. Owned canonical set pieces
are omitted from ordinary local find-count ladders. Loadouts exposes helm/body/
boots disclosures, Saved fallback labels, separate Pin/Unpin actions (including
pinned empty), Follow/Stop following, focus status/source/blocked reasons and
Find piece/Stop focus. Existing named CRUD submits the complete intent.

Core confirmed fallback edits never secretly pin. Follow off is resolved/frozen
by Rust; the client only clears `follow_set`. Source focus may start/end while
away, affecting future plans; it uses a guarded action path that permits that
actual contract. Equipment and kit CRUD retain their home-only presentation.
Stable `data-action` restores keyboard focus after toggle labels change; normal
text-based restoration remains the generic fallback. Current/next disclosure
keys reuse the existing town wrapper's captured open-state contract.

Production package and actual earned/controlled fixtures are not frozen yet.
Current TSC/format/lint/copy checks are source checks only. No new-package
browser acceptance, geometry/contrast acceptance or GPU milestones claimed.

Actual client harness is now authored at `web/tests/armour-sets.mjs`, pending
fixture map and final package. It checks wire-exact counts/slot labels/origins/
bonus activation, empty fresh catalogue, read-only destinations, explicit
follow/pinned empty keyboard focus, full-intent saved-kit save/select/delete/
reload and atomic unknown-piece refusal. Manifest flags enable actual prepared
refit provenance, genuinely paid second resident/stale action, source-find replay
and away focus preservation. Every supplied case runs12 geometry views. Earned
versus controlled provenance remains in each record. Artifact output requires
an explicit environment path; routine runs cannot overwrite frozen proof.
