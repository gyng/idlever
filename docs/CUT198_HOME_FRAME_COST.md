# Cut198 — measure and refine home frame cost

Cut195's rolling P95 includes startup, terrain repaint and concurrent checks.
Measure those separately before changing the renderer. Root freezes real WASM;
this work owns only town renderer/terrain runtime files, not town UI or rules.

## Numeric contract

- One private-GPU browser context AT A TIME, real WASM, Full effects, cosmetic daytime. Before/after use sequential fresh contexts so the cold asset/module state matches.
  Record actual WebGL renderer. Screenshots occur outside timed samples.
- Record cold startup/terrain samples separately. After asset settlement and
  at least120 rendered frames, collect at least120 UNIQUE warmed baseline
  frames, then actual house construction/reveal frames, then at least120
  settled-house frames. Record CPU P50/P95, frame intervals/counts and actual
  terrain-paint counter/ms; no duplicate samples from skipped frames.
- Identify incremental build effects separately from the construction-triggered
  cold terrain repaint. Existing CPU sample scope and concurrent host work must
  be stated; source inspection or rolling P95 alone cannot certify quiet FPS.
- Bound the initial measurement campaign to roughly30–60seconds of browser
  work. If expensive terrain is the largest verified cause, optimize that path
  without reducing painted resolution, materials, ground shadows, wind, lights,
  actor geometry, effects or GL/Canvas coverage.
- A renderer/terrain fix must retain identical terrain pixel bytes and grass
  root metadata for representative construction states, including material
  version/fallback. Require repeat baseline measurements and appropriate scoped
  regression checks. Target>=20% improvement in measured cold terrain paint;
  warmed CPU P95 must remain within1ms of baseline at matched scene state.
- Preserve1.2/2.2scene-second construction lifecycle, Full22/Low8/Off0 dust,
  immediate authoritative usability, no initial/remount FX and current exact
  hero targets. No core, package, commit, release or art-generation changes.

## Measured result

Actual renderer: ANGLE Microsoft D3D12, NVIDIA GeForce RTX3080. Real WASM is the
frozen6414194-byte package. Measurements use1440×900, Full effects and cosmetic
hour12. No screenshots occur in timed phases. Three sequential runs used one
private Xvfb/GPU context at a time: baseline, column/row prototype, final scalar
optimization. Raw unique-frame records, exact source snapshot and summary are
in `docs/evidence/cut198/`.

| Phase | Unique frames before/after | CPU P50 before/after | CPU P95 before/after | Max CPU before/after |
|---|---:|---:|---:|---:|
| Cold startup |150/150|0.5/0.5ms|0.8/0.8ms|266.0/205.9ms|
| Warm empty town |150/150|0.4/0.4ms|0.5/0.6ms|1.0/0.8ms|
| House construction |122/123|0.8/0.7ms|8.7/9.0ms|136.3/75.9ms|
| Settled house |150/150|0.7/0.7ms|0.9/0.9ms|8.0/1.4ms|

Cold terrain paint drops131.0→74.5ms (**43.1%**). The construction-triggered
terrain repaint drops108.2→51.3ms (**52.6%**); its peak whole sampled CPU frame
drops136.3→75.9ms (**44.3%**). Warmed P95 stays within the1ms regression bound.
The initial column/row-only prototype achieved27.6% on construction terrain but
only15.2% on startup; its evidence remains preserved. Removing transient RGB
sample/map allocations provides the larger final gain.

This removes repeated per-pixel column-cliff/row-stream calculations and RGB
array allocation while preserving original channel operation order in Float64.
No pixel resolution, painting, material, shadow, light, wind or effect setting
is reduced. The cache is only two width-sized and one height-sized Float64
arrays (19,456bytes at896×640), not a large persistent alternate ground bitmap.

Exact parity:6/6 cases pass for empty/house/plaza terrain with painted materials
and controlled missing-art fallback:13,762,560 RGBA bytes match, as do all grass
root coordinates/heights/phases/order. SHA256s are retained. Tests transpile
baseline/current painter snapshots and compare identical inputs; they do not
assert gameplay progression or substitute screenshots for pixel parity.

Measurement limits: existing `cpuMs` covers fit/frame/GL-or-Canvas drawing and
excludes the subsequent DOM actor-layout callback. Actual frame intervals
include observer/callback load. Warm interval P95 was17.3→17.4ms(empty),
17.4→17.4ms(settled); construction20.6→20.4ms. The virtual private display's
refresh ceiling and sampling overhead apply. Native/UI audits were held during
benchmark windows; tiny UI TSC/lint checks may have overlapped final launch/
early warmup. Cold startup also includes shader/atlas/asset initialization.
These are scoped observed measurements, not a broad quiet-FPS, isolated FX
incremental-overhead or full-device performance certification.

Focused renderer regressions pass2/2 in23.9s: `building-fx` (Full/Low/Off/reduced,
GL/Canvas, authoritative construction/refusal/reload/appearance actions) and
`town-clock` (36 clock/renderer checks). No source behavior changes followed
those passing checks. Scoped TSC, default Oxlint, formatting and diff checks
pass. Performance and parity harnesses live in the evidence folder; to rerun
them, copy them to `scratchpad/cut198/` alongside `terrain-before.txt` renamed
`town-terrain-before.ts`, and use fresh no-HMR test servers at the script URLs.

Only `web/src/render/town-terrain.ts` runtime source changes in this cut. Actor
geometry, construction lifecycle and render preferences remain untouched;
identical pixels/root metadata feed both GL and Canvas. Cold atlas/shader work
still makes startup/first new sprites expensive; the measured steady-state
build effect does not explain Cut195's150ms rolling P95. Further atlas startup
profiling is a separate possible refinement, not silently included here.

Full queue, exhaustive balance and fun rating remain unproven.
