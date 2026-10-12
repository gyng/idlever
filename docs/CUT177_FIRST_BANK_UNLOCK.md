# Cut177 — first bank unlocks Rogue immediately

Fresh cca75f9 interactive QA saw `1/1 FULL HAUL` followed by a disabled Rogue
captioned `first full haul`. Core settlement currently grants free vocabulary
before recording the first bank. Investigate and preserve the failing result.

Contract: immediately after a genuine non-timeout Bank settlement, Rogue is
owned and selectable before another send; a Return or timed-out Bank cannot
satisfy this gate. Existing gold, marks, bank depth and exit semantics remain.
No evaluation state grants, changed gate threshold, or client ownership guess.

Acceptance: meaningful first-settlement regression (all three exit cases),
fast workspace checks, current native routine regression, rebuilt real WASM,
complete shipping client acceptance and immutable bridge/UI verification.
Preserve current QA against unchanged cca75f9; those horizons cannot certify
changed runtime. No deployment or blind release before accepted current QA.
