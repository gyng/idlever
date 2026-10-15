# Single-context A/A controls — terminal audit,2026-10-16

All6scene/width controls completed on the same current render/art/harness/
instrumentation/browser bytes. Matching launch PID namespace4026532214 and
previous native8092 absence were verified. Quiet private NVIDIA GPU; no other
owned browser/native work. No candidate or successor off-equivalence was run.

| Scene | signed difference of branch median p95s,ms | abs≤0.20 |
| --- | ---: | --- |
| Crypt400 | −0.040960 | PASS |
| Crypt1440 | +0.040960 | PASS |
| Fens400 | +0.003072 | PASS |
| Fens1440 | −0.001024 | PASS |
| Foundry400 | −0.249856 | **FAIL** |
| Foundry1440 | −0.072704 | PASS |

The method control is FAIL. Foundry400 branch p95s across3reps:
`2.192384→2.320384`, `2.920448→3.510272`, `2.570240→2.160640`ms.
Declared aggregation gives2.570240→2.320384, difference−0.249856ms. Do not
substitute median of paired differences or discard a repetition to pass.

Read-only raw audit verifies18reps/8640resolvedqueries:240/branch/rep,0disjoint,
unique correct issuing-frame/branch tags, unchanged viewport/DPR/device/snapped
projection/UV/tick/effects, decoded pinned atlas and0landmarks for both A/A
branches. No wrong-tag or begin/end/ring-overwrite defect was found. Foundry400
final draw plans are13calls/1210triangles. Query values have0.000032ms greatest-
common quantization step, far smaller than the failed margin. Last-frame draw
counts do not establish every frame's exact texture/light content.

Concrete control gap: advancing realRAF now still selects cosmetic prop/torch/
overlay/bones frames, ghost/gas positions, flicker strength and shader uTime
although replay tick is paused. The previous metadata records tick/geometry but
not every visual input or RAFstamp. The two A/A labels therefore do not prove
identical timed imagery. Changing rep signs also shows variable tails; neither
observation proves the cause of the failed0.249856ms. It is a real method-control
failure, not measured landmark feature cost. Preserve all original results.

A versioned successor is prepared under cost-frozen-visual-protocol.md. It freezes
only visual consumers and requires actual draw-input plus framebuffer equality
at distinct realRAFtimestamps before any timing. All unchanged6A/Acontrols and
same-transform archived-off equivalence must pass before candidate measurements.
CPU preflight is not GPU proof. No retry of the unchanged method is authorized.
Broader R6, independent cold requirements and fun acceptance remain open.
