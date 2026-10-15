# Cut240 — readable Canvas town light

*Contract, 2026-10-15. Root authorized this observed renderer-only refinement.
No implementation or measured acceptance is claimed by the contract alone.*

## Observed problem

Current earned87de captures in `evidence/handoff-lighting/` show Canvas night
pools becoming broad pale-yellow additive washes over the Forge/House and
nearby actors. GL retains more painted detail and orange local light. Cut202
already noted stronger fallback additive halos; this is an observed refinement,
not an established new regression. Preserve that complete before evidence.

`drawTown2D` multiplies ambient over painted materials, then uses `lighter` to
add up to32gradient pools directly onto the image. Overlapping colors replace
texture with bright near-white/yellow. Scope the change to Canvas town light in
`web/src/render/view2d.ts`; dungeon Canvas, GL shaders, art, Rust, WASM and
simulation defaults remain unchanged.

## Change and invariants

Use a bounded local illumination multiplier over the original painted town,
retaining existing warm source positions/colors, radius/fade, visible carriers,
light cap32and local-clock behavior. Keep cool ambient night away from lamps.
Do not solve the wash by a blanket scene darkening or remove the existing
painted windows/lanterns. Original ink/material variation must survive inside
light pools. Canvas remains a readable fallback, not a claim of normal-map parity.

Reading/rendering/preferences/context loss preserve exact Session saves and RNG.
Clock-only lighting changes do not repaint terrain. Reduced motion/Full/Low/Off,
missing art and context-loss fallback retain their existing behavior. No
unlearned facts, cosmetic rewards, new gameplay, or additional user decisions.

## Acceptance

1. Repeat earned settled three-resident400/1440×GL/Canvas×local06/12/19/23:
   16after captures with matching before phase/state. Use wall-clock control,
   a fresh server and private GPU; compare complete saves and terrainPaints per
   presentation leg.0unexpected page/console errors; served WASM remains87de.
2. For every captured actual TownFrame, replay the preserved before compositor
   and candidate compositor against the same atlas/terrain/quads/lights. Store
   original pixel buffers/images and frame identity.0alpha changes, dimensions
   unchanged. GL production source/shaders unchanged. Cosmetic motion between
   separate screenshots is not called a same-frame pixel comparison.
3. Exposure checks on each matched Canvas phase/frame: candidate per-channel
   pixel values never exceed the same unlit painted pixel by more than1rounding
   unit (bounded illumination preserves material instead of additive white).
   Among pixels changed by lighting, count near-white warm pixels
   (`R>=220,G>=200,B>=150`), channel-clipped pixels (`R/G/B>=250`) and local
   luminance contrast. At night, require>=75% reduction of newly overexposed
   pixels relative to the unlit material in the before compositor. If the
   baseline has0such pixels, retain counts and mark that case non-discriminating.
   Check ordinary dark/unlit regions against ambient-only composition:0changes
   outside the union of submitted light footprints. No full-scene dimming.
4. Controlled real-atlas painted checker/material samples under actual warm
   lights retain>=80% of their source local luminance range in a fully lit core;
   preserve RGB ordering for an orange painted lamp sample. These bounded pixel
   checks supplement visual review, not an independent art rating.
5. Inspect original-scale400/1440night/dawn/noon/dusk scenes and matched crops
   for Forge/House, carrier faces/lanterns, ghost worker and pool overlap. The
   approved GL composition is a reference, not a pixel-equality target. Record
   remaining dark/overbright or obscured details; do not declare art acceptance
   merely from reduced bright-pixel counts.
6. Run existing town-clock36checks and relevant context-loss/effects fallback
   journeys against the candidate; TypeScript, scoped format/lint. Reuse broader
   current QA only at its actual source identity. No quiet frame-cost/FPS claim
   while concurrent native work is live.

Investigate actual actor fade and camera-edge events with a bounded diagnostic
session after the fix. Presentation-only stress must be labeled, and absence
of an observed event remains unproved; do not substitute a source guard for
runtime proof. Keep the earlier hand-attachment/ghost positional evidence at
its original scope.

Evidence: `evidence/cut240/` for immutable before compositor, harnesses,
raw matched buffers/pixel summaries, before/after captures, saved state/runtime
hashes and test logs. `evidence/handoff-lighting/` remains unchanged as the
observed before review. No new release or performance acceptance is inferred.

## Scoped implementation result

Canvas town light now uses the bounded warm material mask. Final16same-frame
comparisons pass: alpha/source-excess/outside-footprint changes0, newly
saturated/overexposed pixels0; real Forge texels retain88.0% luminance range.
Root accepted the paired phone visual direction. Full/Low/Off/reduced exact
saves/cache and actual actor/light fade links pass on both backends. Final
clock36/context-loss19, TypeScript and scoped format/lint pass. Core/WASM,
GL/town source and dungeon Canvas remain unchanged. Evidence: `evidence/cut240/`.

The242frame resident-arrival attempt did not observe an edge event. A separate
presentation-only camera probe now proves actual earned smith sprite/light
counts1→1→0through visible/clipped/outside positions on both backends, with
actual view bounds, exact saves and zero terrain repaints. It does not prove a
natural resident edge walk or bypass resident containment. No FPS/cost,
continuous transition movie or complete retained-lighting acceptance is claimed.
