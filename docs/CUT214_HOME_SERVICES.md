# Cut214 — a working home for persistent heroes

Give the new hero model physical places in the base: a Guild reception for the
Scout and workers, a recovery pool for real rest, and a reincarnation device
for defeat and deliberate stat rebirth. These are facilities in the grounds
of the manually built Home, not three more construction chores.

Rust publishes when each service is available. Guild appears when a real
worker becomes ready or is hired; Pool follows a completed delve/actual rest;
the device follows a real defeat or available/used rebirth. The empty town must
not expose all these choices. Reading or visiting a facility does not heal,
grant currency, shorten cooldowns or trigger a reset.

Use the established ink/wash pixel art, warm night lanterns, simple grounded
shadows and material shapes. Every facility has a useful44px pointer/keyboard
target, hover/focus/pressed state and an adjacent information control whose
body comes from Rust. Labels, markers and targets do not overlap at320/400/
1440, normal/200%. Keep primitive fallback and GL/Canvas agreement.

Heroes have actual reasons to visit: home/resting heroes can sit by the pool;
the Scout's reception represents actual worker scheduling; reincarnation
animation follows the published phase, and recovery continues automatically.
Cosmetic paths and motes never feed back into simulation. Show each hero's
actual persistent name and home/delving/rest state. Do not invent food/energy
chores or fake needs meters.

Pool/device click opens the actual hero life/rebirth review. Guild opens real
worker hiring/Journal guidance. A device click never confirms Rebirth. Hero
inspection supports name edits and lasting attributes, while free Class and
Loadouts remain reachable. Report/death names keep the actor who actually ran.

Acceptance: actual fresh/first return/worker-ready/ordinary defeat/recovered/
rebirth/two-hero states, one reused paid setup, no resource changes on inspection,
exact60s recovery whole/sliced/reloaded, stale-owner/refund refusals,44px targets
and zero label overlaps/clips/overflow in all six viewport/font combinations.
Post day/night GL and Canvas screenshots. Measure bounded warmed base costs
before/after on matched actual states; do not claim full lighting acceptance
from a prototype.

Core publishes services in Cut211. Renderer owns home props/paths/actual actor
poses; root owns town hit/info targets and routing. Hero-life UI owns the real
menu interactions. Full living-base/lighting/content acceptance stays in scope.

## Renderer scoped contract before implementation

Service plot IDs are `guild`, `pool`, `device`; root uses `rectOf` for real
information/routing. Initial candidates: Guild386402/h42/w63,
Pool356338/h22/w58, Device568318/h36/w44. Verify actual packed neighbouring
boxes,320/400/1440 and normal/200%, rather than trusting feet alone.

Availability follows built Home and each published service.available. Fresh
initial town exposes0 service props. No construction charge, extra ready plot,
automation event or new chore. Each active service adds at most1 cached prop,
1grounded shadow and1small warm night pool. Pool surface has at most2 restrained
ripple marks (Low1; Off/reduced static). Reincarnation feedback animates only
actual published phase. Stay within the existing renderer's light/particle caps.

Actual home residents marked `rests`/positive rest or `recovering` sit by Pool;
actual reincarnating residents use Device when present. Class/gender art derives
from existing hero sprites; standing art stays unchanged. A cached seated pose
keeps the original torso/cloak and bends the lower silhouette. Precise phase
comes only from selected PersistentHero or newly published HeroSlot.life_state.
No guessed health, need, recovery progress, income or gameplay mutation.

Matched baseline uses current6480205-byte real WASM(a1f6777…) and the genuine
native earned24h seed1 budget Game import, not a manually granted town. All3
services are available in Rust; the pre-change renderer lacks their props.
Hero Rook Ash has59s actual ordinary rest.150 warmed day+150 night frames,
zero errors and byte-identical save before/after. Initial harness inspector
assumption (`__town.poke`) was rejected before sampling; final harness dispatches
the renderer's existing pointermove wakeup. Early TSC overlap affects boot,
not the warmed sample; no cold/performance claim. Preserve baseline JSON/hashes.

After implementation, repeat this exact earned state and cosmetic hours,
target CPU p95 increase≤1ms, preserve no-input/hidden-tab frame behavior. Label
new geometry/pose checks separately from whole core recovery accounting and
full living-base/lighting/fun acceptance.

## Scoped renderer result

The three cached code-native props, contact shadows and warm night lights are
implemented in both GL and the actual context-loss Canvas fallback. Real
rest/recovery residents use a derived seated pose retaining the existing torso;
actual reincarnating residents stand at the device. Ready residents retain their
ordinary walks. Service paths/forest clearings appear only with real availability.
Pool benches persist after rest ends, avoiding camera jumps. Actual packed Home,
Forge, Bank, Kennel, well and cart boxes have zero overlap with the three props;
raw decoded boxes are in `docs/evidence/cut214/packed-bboxes.json`.

Focused current-package home checks pass38 assertions: fresh town has0 service
props/targets; a real completed first delve reveals Pool; earned24h state and
explicitly labelled reincarnating/recovering/ready/away fixtures match the Rust
flags and actual resident state. Information inspections leave the save unchanged.
Actual paid resident creation subtracts the published price and leaves the first
resident resting; selecting the new ready resident retains the unlocked Pool and
Device. This check exposed and then verified the narrow roster-availability core
fix; selected hero need/life remains selected. No frontend availability OR exists.

Final captures include the genuinely earned paid Strength setup and six
actual/labelled phase states,400px GL day/night and1440px Canvas day/night,
zero page errors. These are primitive/code-native props, not new painted raster
assets or acceptance of the full dimensional-lighting/living-base art goal.
Core exact60s recovery, slicing/reload and refunds are the separate Cut211 checks.

Warmed matched earned-singleton CPU p95: day1.4→2.4ms(+1.0),
night1.0→1.8ms(+0.8),150 unique frames/hour. Median1.1→1.5 and0.8→1.3ms.
Terrain paints remain1; zero errors and byte-identical save before/after each run.
This meets the scoped≤1ms boundary, not a quiet-FPS/GPU/cold-paint certificate.
Package baseline6480205/a1f6777 differs from post6485581/0f2e91 due the readonly
roster-availability fix; this singleton's availability/rest metadata is unchanged.
Source hashes, raw samples and exact fixture/harness are archived separately.

The final six-case geometry check found primary action interception by each
building's own information label. Root's label solver now reserves every44px
central action: all7 primary centres are hit-accessible in all6 combinations.
That intermediate check still had one320px/200% House/Revival label collision;
its raw diagnostic is retained separately from final acceptance below.
No source changes or repeated performance samples are needed for label placement.

Owned source passes default formatting, Oxlint and integrated TSC. Existing
real-WASM home-building-help and town-save regressions pass2/2 in12.7s,
including39 persistence checks. Current cosmetic pool/device placement has
two positions: larger simultaneous resting rosters can share a position. The
actual two-hero availability/state check does not certify larger-roster spacing.

Final occupied-edge label candidates fix the ordinary-name label collisions.
The maximum legal32-character rename was also tested through the real API.
It exposes a remaining compact-stage limit:320/200% has5label-label overlaps
and4intercepted primary centres;400/200% has1House/Revival overlap.
320/normal has1Guild centre interception. Other long-name combinations pass.
Ordinary-name layouts have0label-label overlaps/allprimarycentres accessible,
but320/200% Pool grazes the Forge central44px region. Raw positive/edge-case
geometry and screenshots are retained; the broader zero-overlap acceptance
was kept open until the root-owned stage/label adaptation below.

## Final adaptive layout acceptance

Root keeps the persistent header name on one ellipsized line, with the full
actual name/life in its hover title, and gives the phone scene a minimum
max(360px,18rem) height. The existing main scroller handles enlarged content.
Final fresh-server checks pass all12 ordinary-name/actual32-character rename
combinations:320/400/1440 at normal/200%, all7 information labels with zero
label-label or label/central44px overlaps, zero central-target overlaps and
zero document-width overflow/errors. Every primary centre is hit-tested after
its actual DOM target scrolls into view; off-viewport targets are not counted
as intercepted. Raw pre-adaptation failures remain in the before-adaptive JSON
and archived logs. Final geometry uses6485581-byte0f2e91… real WASM.

Actual mouse and Enter-key routes for Pool/Guild/Device pass at320/200% with
the maximum legal name: Pool opens real hero recovery, Guild real Works,
Device real Rebirth review. The save remains byte-identical across all six
inspections; no reset is confirmed. All browsers are closed and renderer source
is frozen. The larger-roster two-position limit and broad living-base/art
acceptance remain open; the compact label/action gate is now closed.

Final clean screenshots after the accepted label/header/stage adaptation are
in `docs/evidence/cut214/final-captures/`: genuinely earned budget,400 GL and
1440 actual context-loss Canvas, cosmetic hours12/23, zero page errors.
The broader six-phase/paid-Strength proof is retained in the parent directory.
The screenshot-only raw logger reused an old six-fixture message; its JSON
records exactly one earned fixture, and the evidence README explains the limit.
