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

Later owner amendment (Cut202): town personal lanterns become orange EMBER,
superseding this checkpoint's mono requirement. The historical proof below
records its original light colours; it is not evidence for the later colour change.

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

## Current lighting inventory — 2026-10-14

This is a source/evidence audit, not another render acceptance run. Read alongside
Cut202's orange-lantern amendment and Cut218's actual resident-spacing evidence.
The latter does not expand this prototype's relief coverage.

| Surface or actor | Current implementation | Remaining dimensional gap |
| --- | --- | --- |
| Town ground and landscape | Painted/cached terrain, radial pools, banded moonlight variation in `town.ts::BLIT_FRAG` | No ground normal or height field; a ridge cannot occlude a lamp or receive a structural directional shadow |
| Forge look1 | Dev-only analytic roof/front/side masks in `TOWN_RELIEF`; directional sky and capped point response | Default/production stays neutral; no authored height/occluder, projected roof silhouette or metal material mask |
| Other building looks | Painted sprites with cached contact and short daylight cast marks | No relief for House/Bank/Kennel variants; contact blobs are not roof geometry or shadows cast from each lamp |
| Guild/Pool/Device | Code-native painted service art and real roster stations; grounded marks and local light | No mapped service surfaces or occluders; a bright station is not evidence of dimensional shading |
| Town default male Fighter | Representative idle/class-walk relief, mirrored normalX, feet anchored during prototype bob | Female/cat, other classes, workers and their pose variants remain unmapped; animation/look consistency needs its own audit |
| Town other characters | Existing sprites, contact marks and local handheld orange lanterns | Default contact can follow the one-texel body bob; no authored normal/height/material coverage or clothing/face plane proof |
| Dungeon actors | `SpriteNormals` derives silhouette bevel plus0.35 painted-luma share once after atlas versions settle; high FX draws a twin entity normal target | Derived relief is a useful approximation, not authored anatomy; all looks/poses/alpha/flips need current visual parity checks |
| Dungeon walls and ground | Separate light-field wall occlusion and wall-foot shading; entity contact shadows | Not the same pipeline as Town; no demonstrated shared normal/height convention across scenes |

`town.ts::sprite` assigns relief only to decoded `town_blacksmith_1`,
`hero_fighter`, `hero_fighter_male` and `walk_fighter`. The town gate is still
`DEV && townLight=planes && effects!=off`. Its shader uses fixed virtual lamp
height14, not per-building elevation. Draw depth sorts quads; it is not a height
map. `grounding` places cached contact marks and a short fixed daylight offset;
it does not trace blockers. The dungeon's `deriveNormals` is cached, then its
normal target is rendered only when FX level>1. Do not advertise these paths as
full-scene physical3D lighting.

Personal town lanterns now use `[a,a*0.64,a*0.3]`, with people inserted ahead of
decoration within the32-light cap. This is the current warm color requirement;
the original Cut199 achromatic prototype recordings remain historical. Keep
the dungeon magical hero light cool, as the approved art amendment requires.

Evidence boundaries: `evidence/cut199/` proves the original representative
relief; `evidence/cut202/` addresses warm lanterns; `evidence/cut218/` proves
three-resident layout/phase handling, packed and primitive fallback, and a
separate unchanged-renderer warm cost. Its finald695 geometry/phase evidence
does not retest normal maps. None is a full lighting or blind art certificate.

### Which mapping to add next

Keep normals, elevation and occlusion separate. A normal gives a surface's
direction; virtual light height changes how that direction receives light.
Occluder shapes determine blocking/shadows. The official
[Godot2D lighting guide](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html)
documents these as separate inputs, including that directional light height
does not set shadow appearance. This is a reference for our shader design,
not a proposed engine change.

The next useful comparison adds an authored coarse House roof/wall map beside
the Forge, plus one second real animated hero class. Match its idle and walk
look before shading it. Use a small ground-height patch near the two buildings
only if it improves contact and lamp blocking visibly. Prefer a few matte
structural planes over brightness-derived ridges: ink strokes and dark cloth
folds must not become trenches. Keep metal response sparse and bounded; do not
make skin or parchment glossy. Grounding all character looks at true feet is a
separate inexpensive correction before introducing stronger shading.

Add one coarse footprint/elevation model for the selected buildings, independent
of their painted alpha. Compare short moon/lantern cast marks against the old
contacts. Cap this prototype at two occluders and at most one new512×512 RGBA8
target if a buffer is necessary. Skip it if analytic masks suffice. Do not enable
an effect town-wide merely because it is technically implemented.

### Proposed next prototype checks

These gates are design work; no new lighting code or art has been made here.

- Two building looks and two real hero classes, idle/walk and both facings,
  at400/1440 and cosmetic12/18/23:48 matched state captures per baseline/candidate.
  Include original male Fighter as a control and retain wall-clock recovery.
  State any pose unavailable in actual art rather than substituting another look.
- Exact-frame comparison: zero changed alpha, zero changed unmapped RGB pixels,
  no atlas-frame seam, no incorrect normalX after flip. Feet/contact anchor drift
  from body bob is0world texels for all prototype characters.
- Moving lantern exercise:36 fixed sampled positions across the same real route.
  Normal response follows the light; the selected occluder blocks it consistently.
  No whole-town warm tint, false light behind walls, or silhouette mutation.
- Full/Low/Off/reduced, actual GL/Canvas and packed/missing-art fallback keep
  readable stationary poses and truthful identity. Off returns to unchanged
  painted art; Canvas may use cached coarse planes/contact marks instead of
  per-pixel normal loops. Zero page errors and exact engine save equality.
- Keep32 lights; no per-frame CPU atlas derivation. Record cold load/paint
  separately. Quiet private GPU comparison discards150 distinct active warm
  frames and measures150 unique samples per day/night leg: CPU p95 increment
  ≤1ms, terrain cold-paint increment≤5ms. Measure real GPU time only with valid
  timer queries; otherwise leave GPU execution time unclaimed.
- Preserve the approved INK/MIST value separation and local EMBER pools. Two
  independent scoreless reviewers compare grounding, face/equipment readability
  and ink/wash identity at actual48px hero size. Any identity/readability regression
  prevents default rollout even if numerical pixel/performance checks pass.

Only then extend the explicit coverage table to every current building look,
service and character pose. Whole-town coverage, dungeon parity and art review
remain requirements, not inferred from a successful two-building prototype.
