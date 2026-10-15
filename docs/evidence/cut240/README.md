# Cut240 — Canvas town lighting repair

Renderer-only change in `view2d.ts::drawTown2D`; current87de WASM remains
6912832bytes/SHA87de61e9…cdbae. Dungeon Canvas and all `town.ts` source/GL
shaders are byte-identical to this cut's preserved before copies.

## Result

The original earned Canvas night view replaces Forge/House/actor detail with
broad pale-yellow additive halos. The candidate builds a bounded illumination
mask and multiplies the painted image once. Light overlaps restore paint rather
than adding scene RGB toward white. A night-only warm cap preserves orange
local light without lowering the existing ambient floor; unlit pixels do not
change. Existing source positions, color/fade, cap32and sprite/terrain data stay.

Root inspected and accepted the scoped visual direction: restored painted
stone/roof/actor detail and local warm lamps. The GL reference retains its
brighter emissive/dither treatment; no parity or broad art rating is claimed.

## Exact evidence

`after/results.json` contains16phase rows:400/1440 ×GL/Canvas ×local06/12/19/23,
using a fresh no-HMR server/private GPU and the same settled earned three-resident
Session. Each presentation leg preserves the complete save and terrainPaints.
Source/asset/package hashes and prepared saves are retained. Cosmetic poses can
move between separate screenshots.

For each actual TownFrame, a test-only HTTP-response probe calls the preserved
before compositor and the candidate on the same immutable frame/atlas/terrain.
The probe is not a production API or source edit. Lossless town-only PNGs store
before/after/unlit-original/ambient-only pixel buffers, independent of ongoing
non-render UI changes. All16 comparisons pass:

- Alpha changes0; candidate excess above unlit painted channels0 (bar<=1).
- Newly overexposed warm pixels and newly channel-clipped pixels0.
- Outside submitted-light footprints, candidate versus ambient-only changes0.
- Night baseline overexposure3665/5026/3861/6275pixels becomes0; baseline newly
  clipped7292/10907/6810/11054becomes0 (GL-frame400/1440, Canvas-frame400/1440).
  These are before/after Canvas compositors on those actual frames, not GL
  framebuffer exposure measurements.

`diagnostics/results.json` separately verifies:

- Actual Forge atlas texels `[21,29,48]` and `[70,59,56]`, sampled from the
  displayed `town_blacksmith_2`, retain88.0% source local luminance range in a
  strongly lit core (before32.9%; required>=80%). Source atlas rectangles and
  lossless checker images are retained. Separate painted orange swatch remains
  RGB216/138/59. These controlled materials supplement the earned town review.
- Full/Low/Off/reduced on both backends preserve exact saves and terrainPaints;
  no unexpected errors, and context/fallback remains readable.
- The existing walk-in presentation, invoked through the test-only TownView
  hook without sending in Rust, shows3intermediate fade samples per backend.
  GL fade.296/.648/.968 has lamp.5984/.2992/.0272; Canvas fade.084/.466/.820
  has lamp.7786/.4539/.1530. Each is exactly`.85*(1-fade)`, with hand-anchor
  distances<=.38world pixels. No simulation or saved-state mutation occurs.

`edge-events/results.json` records242actual animation-frame observations on a
separately labeled presentation-only construction-arrival diagnostic. The
pending actor becomes visible inside the camera, but neither an active fully
outside carrier nor a clipped body/culling transition was observed. That
arrival attempt does not prove culling; absence before the arrival starts is
not culling evidence. The separate camera diagnostic below closes the specific
NPC edge-path uncertainty.
Diagnostic scene setup can refit/repaint terrain and is not earned construction.
No zero-repaint claim applies to that setup; ordinary phase/preference/fade
legs retain exact counters.

`camera-events/results.json` proves the existing edge path with an actual
earned Forge smith and a test-only camera translation after normal fit. Both
GL and Canvas record fully visible →half clipped →fully outside. Actual view
right edges380/352/310and submitted smith counts1/1/0, own radius23lamp1/1/0
are asserted. All6legs retain exact save and terrainPaints. No production pan
control is added and resident containment is not bypassed; this is diagnostic
camera coverage, not a naturally walking resident event. Initial camera
override failure (normal fit reset it) is preserved in camera-events-first/.

## Checks and provenance

- Final candidate `client-final-clock-ctxloss.log`:2/2groups PASS, clock36and
  context-loss19,96.7s. No gate/assertion reductions.
- `tsc-final.log`, `format-final.log`, `lint-final.log`:PASS/exit0.
- `summary.json` records exact raw counts, materials, fade links, edge limits
  and source invariance; `analyze.mjs` recomputes its assertions.
- `before/` preserves the original compositor/town source;
  `../handoff-lighting/` preserves observed before review. `candidate-first/`
  retains the first neutral mask before the final warm cap; its results are
  not relabeled final acceptance.
- `diagnostics-first/` preserves an initial test-hook failure (public debug
  wrapper has no walkIn). `diagnostics-partial-events/` preserves a completed
  earlier window that missed Canvas fade because scene time advanced slowly.
  Final diagnostics wait on measured scene progress and use per-frame edge
  collection rather than treating an elapsed screenshot wait as an event.
- Every review launches a fresh owned server/port, avoiding no-HMR stale
  transforms. Served test-only town modules, package bodies, source hashes and
  Vite logs remain. Final recorded render-source/asset hashes match workspace.

Milestones: `after/matched-night-{400,1440}.jpg`,
`after/canvas-review-sheet.jpg`, and full original phase images. No FPS, GPU
execution time or quiet frame-cost claim. Four wall-clock phases and existing
clock/resume tests do not prove a continuous dawn/dusk movie. Whole-landscape
mapping and broader retained lighting/fun acceptance remain open.

Reproduction from repo root (preserve existing evidence before repeating):

```sh
node docs/evidence/cut240/review.mjs
node docs/evidence/cut240/diagnostics.mjs
node docs/evidence/cut240/edge-events.mjs
node docs/evidence/cut240/camera-events.mjs
node docs/evidence/cut240/analyze.mjs
```

## Scoped repository curation

`commit-inventory.json` lists the exact scoped commit paths and SHA256/size of
all local Cut240 evidence files. The complete original capture set
remains local, including every superseded candidate, failed attempt, original
phase buffer and duplicate server module. Those marked `in_scoped_commit:false`
are intentionally not shipped in Git; their presence is not implied in a fresh
checkout. No original/failure was deleted during curation.

The curated set keeps lossless `.json.gz` records for all16phase comparisons,
material/effects/fade/arrival/camera observations, prepared earned Session and
initial failures; `.ts.gz` preserves exact before sources. Readers accept the
plain filename or its gzip sibling. `gzip-reader-check.log` verifies analysis
from a temporary curated-only tree with no plaintext source/result duplicates.
Production render/art dependencies are copied at their recorded hashes for
that check; generated Cut236 assets remain outside this Canvas-only commit.

Original-size matched Canvas400/1440night before/after/unlit/ambient buffers,
GL reference scenes, representative fades and all6camera states are retained
in Git. Four-phase/preferences/camera contact sheets aid review. Other original
phase screenshots/buffers remain local with inventory hashes; this curation
makes no claim that every original image is committed. Numeric records retain
all phase checks. `curate.py` deterministically regenerates gzip copies and the
inventory without removing local originals.
