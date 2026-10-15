# Cut245 — recognizable places in existing dungeon layouts

Contract2026-10-16. Continues retained R6, not encounter generation or balance.
Cut242's six themed props are delivered; scattered substitutions alone do not
make a recognizable place. Reuse their existing painted assets and approved
ink/wash direction for three small environmental compositions.

The Fens get a fishing bank along actual water. The Crypt gets a burial alcove
against an actual room wall. The Foundry gets a work bay against an actual room
wall. All are cosmetic: no interaction, blockage, loot, hazard, light benefit,
discovery, extra POI or claim that a worker/enemy performed an action.

## Implementation boundaries

- Derive anchors from the actual floor tiles, not depth intervals or invented
  room coordinates. Leave an actual open aisle beside each composition. No
  placeholder composition is forced into a floor with no eligible footprint.
- A shared deterministic plan serves GL and Canvas. At most3 compositions and
  18 small prop quads per floor. Plans remain fixed during a floor; fog can reveal
  them but cannot move them toward the hero. No per-frame map scan to select them.
- Every drawn prop is on seen floor, inside its declared footprint, behind combatants and below
  items/hazards/telegraphs. Do not dress stairs, doors, chasms, water, mechanical
  shrines/caches/nests or actual item/hazard tiles. Preserve actors and their cues.
- Existing themed art is preferred. Missing atlas/frame art gets a simple
  recognizable primitive for the same prop/composition in both backends.
- No new engine field, save mutation, random draw, event, pathfinding change,
  camera change or new bitmap asset. Preserve all preexisting art provenance.

## Acceptance

1. Inspect at least one naturally eligible actual replay floor per biome and
   retain exact input, anchor, geometry, visibility and event/tick identity.
   Three distinct paused treatments must be recognizable by shape/composition,
   beyond palette differences. Keep unmatched/ineligible floors in the record.
2. Capture matched before/after real replay views at400/1440 in GL and Canvas
   for all3 treatments (24 images), plus nearby real combat/hazard/telegraph
   moments where available. Record visibility limits rather than substitute
   synthetic events. Original historical-to-current replay drift remains explicit.
3. Exercise atlas failure/individual missing frames, seek/reload, floor changes,
   fog and context loss. No unseen prop is drawn; no decoration covers an actual
   item, hazard or mechanical feature. Repeated plan selection is identical and
   input/state/save hashes remain exact. Meaningful selector tests cover these
   invariants on actual saved floor geometry and controlled edge cases.
4. TypeScript, format/lint/copy checks and relevant current renderer/client
   groups pass on the final source/package. No full-game/fun acceptance inferred.
5. Once the candidate is frozen and native load is quiet, separately measure
   cold setup and warm GPU time before/after on the same replay/view/device.
   Median cold setup increment<=10ms and warm GPU p95 increment<=0.20ms across
   the sampled scenes; report raw repetitions, noise and unavailable timer data.
   CPU submission measurements cannot substitute for GPU evidence.

Evidence: docs/evidence/cut245/. This contract claims no implementation or
acceptance yet. Full R3/R4 causal and broad balance/fun requirements stay open.

First visual review: the one-tile Foundry props still read as scattered dressing;
Crypt lacks a clear centerpiece. That candidate is retained as v1, not accepted.
The revised Foundry centerpiece occupies2×2 floor cells; Crypt's tomb occupies
2×1. Both remain inside the same5×2 composition region with the original clear
aisle. All cells under a larger piece must be seen, plain floor and free of
observed hazards/items. This revises the composition method, not the required
three recognizable places or the fog/readability/cost acceptance bars.

Second image-only review identifies the enlarged Foundry anvil as a smithy, but
the Crypt slab remains understated. Revision3 gives that slab2×2 cells and moves
its bone scatter to an unoccupied cell; the same full-footprint safety tests and
unchanged5×2 region/aisle bounds apply. Earlier candidates and reviews remain.
