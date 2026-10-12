# Cut 185 — town grounding and landscape depth

Owner request: polish the home base with basic shadows while following the
established moonlit ink and wash direction. Scope is renderer cosmetics only.

Buildings, people, companions, small physical props and forest trunks gain
compact INK contact shadows. A restrained, short daylight cast mark falls on the
same ground plane. At night the cast mark fades; the contact stays readable
beneath the existing moonlight and carried mono lanterns. Foot motion, lighting,
wall-clock sampling, construction, hitboxes and gameplay remain unchanged.
Landscape cutouts gain quiet baked grounding, preserving their original painted
materials and the existing cached ground bitmap. No new assets or screen noise.

Acceptance gates:

- TypeScript compilation passes with no diagnostics.
- Existing town clock/save/lantern/wind checks pass at their original assertions.
- Four before and four after private-Xvfb GPU screenshots: 400 and 1280 CSS px,
  cosmetic renderer hour 12 and 23 on the same original earned town save.
- Zero page errors and unchanged 15730 gold across each diagnostic capture.
- Shadow geometry uses integer town texels, is shared by GL/Canvas2D, and consumes
  no additional light slots. Ground remains cached across time-of-day changes.
- At least 24 simultaneous walkers remain below 8 ms CPU p95 in a bounded private
  GPU diagnostic. This is not a quiet-machine frame-rate certification.

No deployment. Frozen rating builds and running blind players are unaffected.
These captures are diagnostics, not active play or blind evaluation evidence.

Accepted renderer diagnostic result: TypeScript passes. Original targeted
`town-clock`, `town-save`, `cut30town` pass 3/3 in 16.9 s. Four before/four after
private-GPU screenshots pass, zero page errors and identical original gold.
GL and Canvas2D preserve exact core save, single terrain paint across lighting
changes, moving wind and 35 people-light candidates capped at 32 shader lights.
GL context loss/restoration preserves that terrain. Warm GPU diagnostic has
26 walkers with CPU p95 3.9 ms (<8 ms); concurrent development means FPS is not
certified. Evidence and screenshot harness corrections are preserved at
`docs/evidence/cut185/home-renderer/`. No new blind score or deployment.
