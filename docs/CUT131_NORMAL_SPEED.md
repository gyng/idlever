# Cut 131 — Normal applies its chosen rate immediately

Combined terrain/menu acceptance exposed a watch regression: choosing Normal
from Fights only retained the previous rate while automatic fall easing settled.
The original Cut25 speed assertion failed with `1.9 1`; an unchanged isolated
run also failed with `dead 1.3 1`. The original failed frame sequence is unavailable.

An explicit selection of Normal applies the new target rate immediately. Its
return from quiet/dead stretches also lands at the live1× clock immediately.
Consecutive passive browser-frame observations reproduce three non-dead Normal
frames above1× (`1.7,1.1,1.1`). Keep other automatic rise/fall easing and existing
quiet/dead-stretch acceleration. No Rust,
simulation clock, mode persistence or menu/terrain changes.

Acceptance:

- Original Cut25 speed checks pass unchanged: picker offers all three modes,
  every live non-dead sampled rate is exactly1, and Normal survives camp/reload.
- Cut25 full, automatic speed-reason and fight playback regressions pass;
  TypeScript/copy lint and combined production build pass.
- New settled complete157-group client suite passes before fresh blind release.
- Preserve both failed logs and the old combined freeze; no blind score or
  deployment claim from a focused pass.

Focused validation: unchanged Cut25 speed3checks plus watch-speed-rate PASS2/2,36.6s. The complete new candidate suite remains pending; this is not whole acceptance.
