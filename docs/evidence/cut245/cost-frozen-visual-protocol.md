# R6 successor method — visual clock isolation,2026-10-16

Original single-context controls remain FAIL:5/6pass, Foundry400 absolute
median-p95-branch difference0.249856ms exceeds0.20. All18repetitions/8640resolved
queries pass issue-tag/geometry/source checks. Rep differences change sign;
there is no feature-cost attribution or retry of that unchanged method.
See single-controls-audit-2026-10-16.json. Previous cold/control failures remain.

This amendment changes measurement-only served responses, never production
renderer/native/art. Freeze **only** visual time to10000000ms: the local parameter
of build(now) (prop/torch/overlay/bones/ghost poses, bob, visual title expiry), the
two frame-local light-flicker sin inputs, and blit uTime. Keep original realRAF
argument, frame dt, quality.sample, st.tick, CPU performance.now, query begin/end/
resolution and browser scheduling untouched. No global clock override. Every
issued query records realRAFstamp, visualClock and issue-frame/branch identity.
Fail source-conformance checks if exact transformation sites change.

Before ANY new timing: for all6scene/width pairs and each fresh repetition,
prove A/A exact draw-content equality at different realRAFstamps, both branches
landmarks off. A temporary renderer.render audit captures each actually submitted
object via onBeforeRender: ordered pass/target/viewport/scissor/clear state,
camera/model matrices, full active geometry/index/instance arrays, shader and
material settings/uniforms, textures and source-content digest. Exclude internal
version counters only where identical source pixels are independently hashed.
Framebuffer readPixels must be exactly equal between branches (zero differing
RGBA bytes). Record full trace and pixel digests/raw frame evidence. Unexpected
missing hooks/draws/material/input data is failure. The audit wrapper is restored
before timing, and480ordinary warm frames follow it; no content hashing/readback
occurs inside measured query intervals. Keep source and actual atlas bytes pinned.

Static tests must accept real Vite/Oxc transformed modules; prove all visual
rewrite sites, unchanged scheduler/quality/simulation/CPU clock expressions,
issue-time clock-tag identity under delayed ring reuse/disjoint invalidation,
and capture behavior for visible/multi-material instanced draws and uniforms.
This preparation is not actual content-equality or GPU proof.

Then same quiet process namespace/native8092guard and privateNVIDIA GPU:
all6A/Acontrols first,3fresh repetitions/scene, ABBA/BAAB schedules,≥240resolved
queries/branch/repetition. Preserve the same **difference of branch median p95s**
and absolute≤0.20ms A/A bar; candidate signed increment≤0.20ms. No switch to
median-of-differences, outlier removal, budget change or retry-to-green.
Only after allcontrols pass, revalidate current-off vs archived baseline all6
pairs with the SAME visual-clock transformation and exact framebuffer equality.
Only then candidate all6. Raw query metadata must retain real and visual clocks,
full device/projection/tick/quality/geometry/painted-art checks and issue tags.
Candidate is blocked by any missing/failed control or off-equivalence.

Cold7-repetition setup/first-paint scope remains independent. This successor is
not guaranteed to pass, and cannot explain the previous control variance without
new evidence. No broader R6/fun acceptance follows from static preparation.

Guard refinement: off-equivalence must contain exactly the six UNIQUE original
(id,width) pairs. Duplicate/missing pairs fail before a browser opens. Current
source uses no custom object/material render/compile callbacks or InstancedMesh;
these, skin/morph inputs, interleaved attributes, uniform groups and clipping
fail closed until an explicit adapter and proof exists. CPU negative fixtures
verify rejection/restoration. Source/harness/helper SHA bindings are retained.
