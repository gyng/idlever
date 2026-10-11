# Cut 129 — home terrain

Owner request: improve the basic home-base terrain graphics. Presentation only;
plot positions, camera framing, walking graph, controls and Rust truth stay fixed.

The ground becomes one cached, code-painted world bitmap: broad moss/meadow
patches and sparse grass tufts, ragged compacted paths with pebble shoulders,
building door aprons, a rocky entrance slope with irregular slate facets and lichen,
and dirt-jointed flagstones in the mature town. The forest keeps clear plots.
Nearest sampling and integer marks preserve the existing pixel-art register.

Acceptance:

- Honest same-state before/after images at 1440×900 and 400×800, plus a 320px
  phone check; first camp and four-building town inspected in day/night.
- Terrain geometry and pixels identical in GL and Canvas2D fallback. Both views
  use the same canvas; existing lighting remains view-specific. Atlas failure
  cannot remove terrain because its drawing has no asset dependencies.
- One 896×640 ground bitmap (2.19MiB RGBA), one GL ground quad, no per-frame
  terrain painting, fetching or random generation. Terrain rebuilds only on
  home/building changes, not resizing, atlas readiness or time of day.
- Existing town/controls checks, TypeScript and copy lint pass. No new console
  errors or horizontal overflow at 320/400/1440. Actual town GPU CPU-p95 stays
  below 8ms on the established private-display GPU harness after warmup.
- No game-state mutations in terrain code; screenshots are diagnostic, not
  scored play. Frozen candidate and existing acceptance suite remain immutable.

Validation complete, 2026-10-11 (isolated branch `terrain/cut129`, baseline
`b0b5d4a`; frozen preview and main source untouched):

- TypeScript and web production build pass; copy lint 2326 literals, zero
  violations; diff whitespace check passes. Existing chunk-size warning remains.
- Existing serialized client groups `cut30town`, `ctxloss`, `town-save` pass
  3/3 in 66.8s, including 19 context-loss and 39 construction-persistence checks.
- Private-display D3D12/NVIDIA RTX3080 diagnostic passes exact core-save equality,
  one terrain paint across resize/hour changes and loss/restoration, populated
  Canvas2D fallback (3362 sampled colors), restored GL and zero page errors.
- Warm actual GPU town with 25 visible walkers: 60.00fps, CPU-p95 0.90ms. The
  single initial 896×640 terrain paint took 157.1ms; it is outside the steady
  frame-time measurement. Reduced-motion screenshots keep the existing 2fps
  cosmetic cap; their initial CPU-p95 values are not performance evidence.
- Both isolated servers explicitly verified `kind=wasm`, version0.1.0. Baseline
  uses the same existing shipping-WASM package; no Rust rebuild or changes.
- Real seed8291 cold and publicly built first house captured at 320/400/1440;
  four-building views load one identical diagnostic save into both versions.
  These constructed fixtures are not earned progression or scored play. Day12h
  and night23h keep existing lighting. All sizes have zero horizontal overflow
  and capture console/page errors. Quiet final 400/1440 populated comparisons
  wait for the actual building-arrival announcements to expire.

Evidence (untracked, preserve separately when integrating):
`/tmp/riddle-home-terrain/scratchpad/qa-terrain/`: `before-*` / `after-*` PNGs,
`capture.json`, `engine-proof.json`, `lifecycle.json`, and capture/lifecycle/probe
scripts. Earlier visual iterations remain under `iteration1/` and `iteration2/`.
Logs: `/tmp/riddle-terrain-lifecycle-final.log`,
`/tmp/riddle-terrain-capture-quiet.log`, `/tmp/riddle-terrain-web-build.log`.

The GL view now uploads a separate nearest-filtered terrain texture and one
world quad. Canvas2D draws that exact bitmap at the same world origin before
sprites. Sprite atlas fallback is unchanged; terrain no longer depends on it.
Context restoration requests a fresh terrain upload; disposal releases its
texture. The existing view-specific day/night light passes remain intact.
