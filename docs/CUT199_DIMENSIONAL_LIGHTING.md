# Cut199 — dimensional light on painted sprites

Owner asks whether the base and general lighting can look more three-dimensional
through mapping. A representative Forge/Fighter prototype is implemented;
whole-scene lighting and production rollout remain pending.

## Existing renderer

Town composes painted ground and sprite quads, then applies radial light pools
and a moonlight grade in `town.ts::BLIT_FRAG`. Existing contact/cast marks ground
objects; their depth value sorts drawing rather than describing roof elevation.
The Canvas fallback uses ambient tint, additive pools and contact shadows.

The live dungeon already uses `normals.ts` at high effects quality: silhouette
bevel and painted brightness derive a relief field. Its normal target is read by
`blit.ts`. Dungeon wall-mask lighting provides occlusion separately. Town does
not use that normal pass. A Three.js normalMap property alone cannot change the
current custom town shader.

## First prototype

Keep the original painted artwork. Start with Forge look1, one animated hero and nearby ground,
using authored roof/front/side surface directions and a restrained sky-light
response. Compare actual directional moonlight and forge/lantern light; state
clearly if the first implementation affects only the sky key.

Owner explicitly includes characters in this first prototype. Give the hero
subtle face, clothing and equipment relief, with a contact shadow anchored at
the feet. Preserve neutral/mono personal lantern light at night. Test stationary,
walking and mirrored poses beside the Forge: animation frames must use matching
normal coverage and flips, without changing lighting direction or flickering
between frames. Evaluate the existing dungeon character normal pass alongside
the town result before choosing a shared implementation. Expand to resident
workers and other character looks after the representative comparison succeeds.

A normal map specifies which way a surface faces. Height/footprint data is a
separate input for projected shadows and occlusion. Neither changes the sprite
silhouette or supplies a new camera perspective. Material response can later
distinguish a small metal highlight from matte stone/cloth, preserving ink/wash.

Avoid treating every dark painted line as a geometric groove. A generic dome
normal can suit a small hero bevel but make buildings look rounded. Analytic
face masks or a matching normal buffer are preferable for structural planes.
Automatic brightness-derived maps are not a complete building geometry model.

## Prototype gates before wider adoption

- One authored Forge look; existing look variants remain neutral until mapped.
  Exactly matched alpha, atlas UVs, resizing and mirrored normals. Missing maps
  preserve existing art and gameplay fallback.
- One animated hero in the first comparison, not a later building-only followup.
  Check idle/walk/turn frames, face and equipment readability, feet/contact shadow,
  night mono lantern response and nearby Forge light at both viewport sizes.
  Preserve ink contours and avoid glossy skin, exaggerated bevels or frame seams.
- Matched400/1440 captures at cosmetic hours12,18,23, plus moving lantern where
  supported. Wall-clock behavior remains. Judge roof/wall separation, grounded
  shadows and preserved ink contours; do not claim real3D geometry.
- Preserve the current32-light cap. Measure baseline/prototype cold paint and
  warmed unique-frame CPU/GPU behavior. Do not erase Cut198's measured gains by
  adding repeated whole-atlas CPU processing.
- Full/Low/Off/reduced settings remain coherent. Canvas may use cached coarse
  face tint/contact shadows; avoid per-frame CPU normal-by32-light pixel loops.
- No save, gameplay, Gold or actor hit-target change. Default rendering stays
  stable while the prototype receives scoreless visual review.

Normal/specular mapping and separate occluders are standard2D lighting tools;
[Godot's illustrated explanation](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html#normal-and-specular-maps)
is a useful reference. This proposes work in our existing renderer, not an
engine migration. Mapping all11 currently active building looks and all remaining
character looks/frames is later scope, after the first comparison succeeds.

## Status

Representative dev-only prototype implemented and measured. Broad visual acceptance and rollout remain open.

## Implementation contract (representative prototype)

- Dev-only `townLight=planes` opts in; default and production remain unchanged pending visual review. Exactly Forge1 and default male Fighter idle/class-walk use relief; every other painted look stays neutral.
- Zero new atlas textures, render targets, per-frame CPU pixel passes, or terrain changes. Existing32-light cap and one object pass remain. Sky modulation is bounded to±18%; point response to±12%, ink protection fades modulation below luminance0.12. No specular gloss.
- Coverage uses unchanged alpha threshold and UVs; mirrored normals invert X. Contact remains at actual feet; visual body bob never moves the contact anchor. No gameplay/save/actor target changes.
- Matched baseline/prototype at400/1440 and cosmetic12/18/23; inspect Forge roof/front/side, both Fighter poses/facings and monochrome personal pool. Test Full/Low/Off/reduced and Canvas fallback, recording any omitted combinations.
- Warm unique-frame CPU p95 increase target≤1ms in the same GPU context; terrain paint remains the Cut198 scalar path. Diagnostic frame intervals and cold paint are recorded separately; no GPU-time claim without timer queries.

## Checkpoint evidence and limits

`web/src/render/town.ts` adds analytic surface directions to the existing object
shader. These are code-native roof/front/side approximations and small head/cloth
volumes, not authored raster normal maps or actual3D geometry. The two light
inputs are the directional day/moon sky key and the existing bounded point pools.
Colour/alpha/UVs stay authoritative; dark ink receives less modulation. The
personal lantern remains achromatic (`c=[a,a,a]`), while Forge fire stays warm.

The wire normalizes the default Fighter to `hero_fighter_male`; that idle pose
and `walk_fighter` are the representative pair. Female/cat and other classes are
not mapped. Their existing class-walk appearance mismatch remains outside this
prototype. Fighter contact shadows now stay at actual feet during body bob when
the prototype is enabled. There is **no new projected Forge shadow, light
occluder, silhouette change, or perspective change**. Canvas retains its existing
colour/pool/contact fallback. Full/Low retain static relief, Off bypasses it;
reduced motion adds no new moving effect. Production/default remain neutral.

One private Xvfb GPU context on D3D12/NVIDIA RTX3080 captured the final warmed
baseline/prototype/baseline-repeat windows after150 warm-up frames. Each window
contains150 unique rendered frames; screenshot/readback work is outside them.
CPU median/p95 were1.2/1.8ms,1.2/1.6ms,1.1/1.7ms. Observed frame-interval p95
was17.7/17.8/18.0ms. This meets the scoped≤1ms CPU-p95 increase bound; it does
not establish a speedup or GPU execution time. CPU stats omit subsequent DOM
actor layout; polling adds observer cost. Terrain paint was50.7ms throughout,
and the Cut198 scalar terrain path is untouched. An earlier successful sample
still contained initial warm-up spikes and was superseded, not counted as a
performance win.

`inspectTownLighting()` is an explicit dev-only diagnostic outside the animation
loop. It renders the identical TownFrame twice with only relief off/on, reads the
low-resolution target, and verifies shader string replacement. Six size/hour
comparisons changed2795–3254 mapped RGB pixels, with maximum channel delta26–30
and mean changed-pixel maximum-channel delta4.37–5.72 on the0–255 scale. All six
had **zero changed alpha and zero changed unmapped pixels**. Separate character
proof at12/18/23 changed228/181/201 Fighter pixels and3032/2996/2636 Forge pixels;
idle16×24 and walk18×24 poses were both observed. The actual seeded route also
showed both facing directions. This is representative coverage, not every pose
× facing × hour combination. Full/Low/Off/reduced settings and a separate real-WASM
headless Canvas fallback passed with zero browser errors. TSC, scoped Oxlint,
default formatting and diff-whitespace checks passed.

Evidence is in `docs/evidence/cut199/`:12 clean UI screenshots,12 exact-frame
renderer-only PNGs, raw samples, per-kind proof, Canvas fallback, source/package
hashes and reproduction harnesses. UI screenshots use a controlled late fixture
(empty kit for Forge1; actual imported resident switched to Fighter). They show
legacy UI labels and `build undefined` from the minimal development server and
**do not certify current whole-UI or economy acceptance**. Normal UI captures
match size/hour/state, but actors/fire/wind continue moving between captures;
the renderer-only pairs supply the exact pixel comparison. The frozen baseline
WASM was not rebuilt for renderer work.

First coverage attempt expected an unmigrated base Fighter pose; the normalized
male look required correcting that assumption. A harness attempt then called
unexposed `__town.poke`; existing pointermove input replaced it. Both stopped
before timed windows, closed their private browsers, and produced no pass claim.

Wider building/character mapping, true occlusion/cast silhouettes, all variants,
all widths, live-dungeon visual parity and blind art/fun review remain open. This
checkpoint preserves the art and demonstrates a restrained response; it does
not authorize enabling it by default.
