# R7 equipment doll: dated read-only audit

Observed2026-10-16. No browser, gameplay, compile or production change. Context:
CUT220/current Hero Hub, canonical hero_build.rs/types.ts, current owned catalogue
and historical earned fixtures. Corrected runtime packaging is nowc9fad470…
(6773905bytes); no runtime result on that package is claimed by this audit.
This is source/evidence review, not player feedback or visual acceptance.

## Exact current data and gap

`Lineage.starting_kits.equipment` already provides `actual` and `next`, each with
ordered weapon/helm/armour/boots slots: kind|null, label, origin, damage pair,
defence, speed, ranged, legendary, effect, tradeoff; each view has label/note and
Rust totals hp/max_hp/damage/defence/speed/level/class. `queued` compares actual
away gear against next gear; transient buffs alone are not a queued equipment
choice. Do not resolve Follow/pins, conditional effects or totals in TS.

Current hero-hub.ts `gear()` draws one baked class/look atlas frame (200px maximum
side), then four labeled buttons and canonical Actual/Next text/effects. Its
comment explicitly says no invented equipment layers. There is no separate
Actual/Next figure or slot-to-body mapping. Slot shared/split currently compares
whole rows, so origins alone can split labels even when kinds match; never infer
visually different equipment solely from this text-state flag.

The named `earned-delving-queued` fixture does **not** prove differing gear.
Its recorded canonical wire has `queued:false`; actual and next both sword,
empty helm, Hearthglass armour/boots. Only temperament was changed after send
in `examples/hero_hub_fixtures.rs`. Different origins equipped/class/follow/pin
are not differing items. The ledger's retained R7 gap is therefore real.

## Existing bitmap inventory and honest layering proposal

Use current class/look atlas IDs `hero_<class>[_<look>]` as identity reference,
with primitive class silhouette fallback. These are complete painted characters
with baked weapons/armour, **not neutral wearable bases**: Fighter sword/shield,
Ranger bow and Gunner gun cannot honestly depict arbitrary selected weapons by
placing another item over them. Existing art must not leave two apparent weapons
or show plate after native empty armour.

Existing item paintings: `art/ui/icons/it_{dagger,sword,axe,bow,spear,mace,long_gun,
short_gun,leather,mail,scale,plate}.png`. These are standalone item silhouettes,
not wearable meshes. `art/tiles/env_item_armour.png` is generic dungeon pickup
art. No current per-kind wearable bitmap layer was located for ironcap,
Hearthglass helm/body/boots, or legendary Crownsplitter. Do not assert such assets
exist or substitute a generic sword as exact legendary appearance.

Smallest truthful prototype: one bounded composited figure, no new cards/icons
around it. Use a neutral primitive body, existing class identity/head reference
only where a reviewed crop removes baked equipment, and spatial equipment layers
inside that figure: boots behind body, body armour on torso, head/helm, weapon at
hand in front. Existing item bitmaps can supply weapon/body silhouettes after
reviewed per-kind placement; absent kinds use deliberate role primitives, not
broken images. `kind:null` removes that slot layer. Missing helm/boots art stays
explicitly primitive. A fully painted doll needs aligned neutral class bases and
wearable slot sheets/masks; current painted full-body frames alone cannot deliver
that claim. Preserve all originals; any derived crops/masks need explicit source
rectangles, anchors, alpha/size QC and reviewed pose compatibility.

Use one Actual/Next view switch in the existing figure area if both cannot fit
phone height; retain full canonical labels, selected phase and four existing
legal slot buttons. Actual defaults while away; queued phase must say Next delve.
No blinking differences, colour-only selection, drag/drop or new spending route.
Refresh/switch guards must include engine, resident and incarnation; stale async
atlas loads must not repaint a new owner. Current `current()`/connected checks
are the starting mechanism, not permission to drop per-owner guards.

## Genuine differing fixture: safe public preparation

Use immutable `docs/evidence/handoff-menus/input.game.json.gz` or its canonical
current-runtime Session (earned provenance retained by handoff-content inventory).
It has owned/compatible sword and bow, an actual ready resident and a configured
Hearthglass follow +ironcap pin. Alternatively historical
`cut220/core/fixtures/earned-hybrid-saved-kit.game.json.gz` is an earned source;
load it through corrected current runtime, never relabel it current earned pacing.

On a separate public-API clone:

1. Record original/canonical raw and compressed hashes, current package, resident,
   clock, Gold, native catalogue and full current starting configuration.
2. `setStartingKit` with a copied complete config and weapon sword (only if current
   catalogue accepts); public `setStart(1)` if needed. No purchases or grants.
3. Actual `send()`; record actual sent snapshot/run ID and complete sent save.
   `step(1)` only if needed to establish native away state, recording that tick.
4. While genuinely away, public `setStartingKit` with the copied config changed
   only to owned bow. Record refusal if any; never edit run equipment/save fields.
   Native `actual.weapon.kind` must remain sword; `next.weapon.kind` must become
   bow and `queued` true. Compare Gold, actual actor/events/RNG and selected owner;
   capture complete before/after. This establishes an actual differing fixture,
   not a retrofit of a historical replay's departure.
5. Optional separate public `setStartingKit` with copied config/pins and only
   `pins.helm='none'` from the same immutable away parent proves actual ironcap
   versus queued empty if native acceptance permits. Preserve all other config/pins/supplies and exact refusal saves.

No fixture has been produced by this audit. Ready configuration changes refit the
home actor, so they are not sufficient to demonstrate an Actual/Next difference.
Use actual native slots to decide image layers, not guessed policy consequences.

## Proposed gates and revalidation

Four canonical slot kinds/phases map100% to exact art or documented primitive;
null slots0phantom layers. Two genuine differing cases (weapon, empty armour slot)
and same-kind/different-origin control must render correctly. All three paid
resident IDs, Ready/Away/Recovering, refresh/switch/close and missing atlas/layer
errors preserve exact read-only saves and reject stale callbacks. Existing slot
routes stay≥44px with keyboard/focus/touch access. Inspect typical320×568,
360×640,390×844,412×915 plus1440desktop atnormal/200%, viewport captures, no
horizontal overflow; actual target/item names remain readable. Full/Low/Off/
reduced motion show identical static gear, ordinary essential text≥4.5:1.
Verify both hero looks and all owned weapon/body kinds; do not certify every
unowned future silhouette from one Fighter. Native numbers/effects remain Rust
truth. Observed visual quality and player feedback must be dated separately.
Revalidate after247/248 package replacement, wire/lifecycle/ownership changes,
new class/look/gear art, atlas packing or figure/layout/phase-switch changes.
R7 and broader queue7 remain OPEN; a prototype is not completed painted art.
