# Cut212 — live depth map and movement trail

## Audit and contract before implementation

The released Watch HUD tracks replay depth; the engine may be ahead. Lineage
already supplies lit waystones, seen forks and the current bounty. Boss counter
facts have no depth; affixes only identify some route-aware boss floors. A
complete known-boss list therefore requires core metadata, rather than a copied
TS floor table. Root owns the Watch mounting/released-HUD seam and wire changes.

1. A compact physical shaft/map shows100% of the released current depth and
   known landmarks supplied by core;0 invented future boss floors or POIs.
   Unknown floors remain unlabelled. Mark actual starting floor, record, lit
   waystones, seen forks, bounty and known route-aware bosses where supplied.
2. Default collapsed map stays≤80 CSS px wide; expanded details≤240px, at
   400/1440 viewport widths. Every interactive target is≥44×44px. Hover/focus,
   Escape dismissal and accessible actual marker names;0 automatic scrolling
   or viewport jumps. Preserve existing ink/stone/BONE art.
3. Trail records only actual hero-ID Move events leaving a tile, rejects zero
   displacement/fresh placements and jumps>1tile;0 ally/enemy invented paths.
   Full≤6 steps/12 subdued ground quads, Low≤3steps, reduced≤2static steps,
   Off0. Lifetime8 replay ticks,0 wall-time expiration or extra particles/lights.
4. Pause freezes trail; load/new floor/seek/skip clear it. Speed1/4/8 uses the
   replay cursor. GL/direct Canvas/context-loss share the same trail state;
   primitive artwork must not disable it. Never draw through unseen terrain.
5. Use the existing matte cue pass for GL so active trail adds0 extra draw calls
   over that pass; combined cue/trail capacity≤140quads. Bounded private-GPU
   before/after samples target incremental CPU p95≤1ms. Exclude cold uploads
   and screenshot overhead; no quiet-FPS or balance/fun certification.
6. Verify actual earned run/snapshot inputs plus explicitly controlled map and
   movement edge cases,400/1440, Full/Low/Off/reduced, replay controls and known
   POI labels. Capture a meaningful map/trail screenshot milestone. Keep final
   package integration separate if core metadata requires a rebuild.

## Implementation checkpoint

The map exposes a70px stone/ink shaft with grouped floor marks and actual D
labels. Its inspection panel lists every supplied marker with44px buttons;
landmark selection describes that marker and does not pretend to navigate or
change the hero's route. Native details/summary keyboard behavior and Escape
closing work without window scrolling. A depth-only update retains focused
landmark controls. Root mounts the module and supplies the released replay HUD.

The movement controller records vacated tiles only inside ReplayState's actual
hero Move branch. Bulk seek/skip and fresh placements never generate steps.
Floor load, seek and skip clear the controller. Full6steps/12quads,
Low3steps/6quads, reduced2static steps/4quads, Off0; visibility filtering excludes
unseen tiles. GL adds footsteps to the existing matte cue pass (capacity140);
if that pass was empty the trail activates one draw call, never a second pass.
Canvas uses the same state/controller below items/actors. Footsteps neither
light the scene nor emit particles.

First focused model/DOM/state check passes24 assertions on real WASM: zero
movement/jump rejection, caps/expiry/Off, pause, actual ID filtering, seek/skip/
load, accessible map inspection/Escape,44px targets and bounded panel geometry.
An initial fresh fixture correctly refused send before its house; the test now
performs actual manual house construction. No currency/progression grants.

Earned component captures import the actual Cut203 Steady-blade save, send and
step1000 ticks through WASM, then play its actual hero step at t30 on D1. The
map uses real StartD1, WaystoneD5, seen ForkD5, RecordD7 and BountyD8. GL400 and
Canvas1440 both draw2 ground quads, hold them on pause, and clear them on Off.
These captures mount the component beside the real replay renderer; they are
not whole-Watch layout acceptance. Initial shots at t31 put the footprints too
close under the moving hero; final captures use t37 to inspect the vacated tile.
Known-boss metadata and final Watch mounting still require integrated proof.

## Scoped result and remaining integration

Final component captures use t37 (seven ticks after the real step), so the
vacated tile is visible beside the moved hero. GL400 and Canvas1440 both pass
Full/Low/reduced/Off and paused-state checks. Actual GL context loss retains
2footprint quads in Canvas; restore returns the same2quads to GL. Zero page
errors. The final focused model/DOM/state test passes27 assertions. New source
passes TSC, scoped Oxlint and default formatting; copy-lint passes.

Warmed private-GPU before/after replays use unchanged real WASM802c54f2… and
byte-identical actual Cut203 tapes,150 samples per kit. Steady CPU p95
1.4→1.9ms with74 active-trail frames/2quads and max draw calls12→13. Heavy
0.9→1.4ms has0 active-trail frames and cannot certify layer cost. The observed
+0.5ms meets the scoped≤1ms target; it is not assigned entirely to footsteps.
GPU p95 varied0.644→3.426ms and0.396→3.299ms despite the Heavy leg having no
trail. Do not infer a causal GPU regression/improvement or quiet-FPS verdict
from these samples. First paint, cold atlas uploads and screenshot work are
excluded. Parent/core held heavy native/browser launches for the post sample.

The root owns Watch mounting, released-HUD timing and new known-boss wire.
Those changes and the subsequent real-package integration remain pending;
component/renderer correctness does not close whole-Watch layout/POI acceptance.
Renderer/UI module source is frozen and no core truth was duplicated in TS.
