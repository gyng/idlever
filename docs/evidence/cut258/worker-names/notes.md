# Worker names: visual review (2026-10-17)

- Build: working tree on 8f3f6d2f plus the worker-name change (fake engine, so no wasm identity applies); test Vite server, `?engine=fake&seed=7&fresh=1`.
- Viewport: 402×681 CSS px (`phoneReviewViewport()`), DPR 2, headless Chromium (SwiftShader); visible viewport only.
- Input: script opened the Workers sheet (`openWorks`) on the fake demo lineage (quartermaster, porter, scout hired).
- Saw (`works-402x681.png`): silhouette `Apprentice` (unmet: role only); card `Thors · Drillmaster` on one line, state
  under it; rank card `LILI ·` / `PORTER II` wraps between name and role beside the promote button; done row
  `Aletta given · Lili · Arina` (hover title `Lili · porter · hauls home · while away`).
- Measured: no `.wn-name`, `.wd` or `.wnode` overflow (scrollWidth ≤ clientWidth); no horizontal page scroll.
- Interpretation: no clipping. The first capture (before `flex-wrap` and the whole-segment `nowrap`) broke
  `Thors · / Drillmaster` and `LILI · / PORTER / II`; fixed in works.css. Confidence: medium (one state, fake engine).
