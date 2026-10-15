# Cut249 — preserve previous visibility across saves

Contract2026-10-16. Separate correctness boundary after Cut247/248 package
c9fad4700566cc164e290e6d98a21555056d3e6da80ba4d0920ac3edd013107d.
No authored combat/economy values, progression policy, gate bars or UI changes.

The actual earned publicly paid pace8 Session passes tick10energy88, full
watched/absence RunRec, held replay and whole/sliced8h equality on c9fa. Reloading
an unchanged public checkpoint at tick7200 instead drops the next tick's real
`goblin archer last seen D6` provenance event. At tick7201 complete serialized
Run/events still match. Final run remains death/lurker D28/t43450, but provenance
length is40 versus39 and its copies differ in death/exit/report/save. Original
raw failures remain under `docs/evidence/cut248/`; they are not normalization.

`Run.last_visible` is previous-vision history used by `facts::on_vision` to log
which live hostile left sight. It is semantic state despite its old cache comment
and `serde(skip)`. Proposed correction persists it with a default for absent
legacy fields, omitting the empty vector. Do not reconstruct absent history from
post-load monsters or fabricate sightings. Missing legacy fields preserve the
existing empty-history behavior until the next normal vision pass establishes
IDs. Nonempty saved IDs, order and initial MAX sentinel must survive exactly.
The existing sight algorithm, duplicate suppression, floor transitions, hostility/
HP tests and `sim` exclusion remain unchanged.

Numeric acceptance:

1. Preserve the actual public/native red at7200→7201 before runtime mutation.
   Require independent exact goblin_archer/key/depth/tick/text expectations.
2. New-save live/load continuation must match complete Game/Session, events,
   RNG and provenance at7201, then complete8h report and after-save. No omitted
   provenance/trace fields or permissive comparison normalizations.
3. Pin empty/default legacy behavior explicitly. Test nonempty ID order and
   MAX sentinel roundtrip, actual floor transitions, dead/neutral exclusions,
   duplicate-lastseen suppression, and simulations recording no provenance.
   Audit Run-containing capsule/history/other-resident load paths.
4. Combined247/248 regressions remain passing, including real fractional quiet
   spans. Validate earned1/3resident whole/sliced/reloaded public continuations.
5. Run full fast workspace and default workspace/all-target Clippy after focused
   red/green. Coordinate a new WASM package; retain c9fa source/package proofs.
   Compare full old/new settlement packets and saves before any regeneration;
   explain every typed saved-state addition separately from real output changes.
   Run successor public paid/unpaid parity, affected pacing and routine full.
6. Record source/package/input hashes, original failures and dated observations.
   Existing c9fa browser and20weapon continuations remain scoped to c9fa; no
   exhaustive, fun, whole-handoff or replay-control policy acceptance is inferred.

Runtime mutation awaits parent coordination. No old evidence is overwritten.
