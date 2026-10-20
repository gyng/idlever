# Cut280 validation — 2026-10-20

Scope: statistical tuning tooling, native-only ordinary dayplayer probes,
confidence bounds, cache/resume and default iteration workflow. No game default,
shipping WASM, deployment or fixed canonical gate was changed. This contains
automated evidence and agent interpretation, not owner/player feedback.

Sources/contract: `docs/CUT280_STATISTICAL_TUNING.md`,
`docs/STATISTICAL_TUNING.md`; exact file hashes in `identity.json`.
Node22.18.0, rustc1.96.0, Linux/WSL shared32-core machine. Concurrent box load
limits interpretation of wall times; no performance extrapolation is made.

- `native/`:5 focused Rust tests; exact ordinary Play/Ask observation parity,
  bounded prefixes, full-u64 IDs, multithread determinism, immutable publication,
  profile CLI/build/Clippy evidence. A stale historical two-send assertion was
  corrected to ordinary-policy parity; no game rule was changed.
- `js/`:44 final black-box tests; `helper-regressions.log` includes11 statistical
  bounds tests plus existing sweep/runtime identity checks. The bounds suite
  enumerates65536 null paths across its planned looks. `gate-cache-regression`
  verifies the existing cache harness with fake children, not game simulations.
- `real/`: real profiles and randomly preregistered distinct seed schedule,
  frozen winner, initial/resume reports and external timings. Initial total
 10.73s,40 seed/profile observations,8 calls; fair unpruned comparison64
  observations with identical confirmation sample count (37.5% fewer).
  Confirmation sample size is8 whole paired seeds, not40 independent samples.
- Completed replay0.36s,0 new calls/observations,40 cache hits. Exact manifest,
  identity, winner and confirmation results remain equal. No new evidence is
  inferred from repeated reads. Assertions are recorded in the handoff and
  replay JSON/time artifacts.
- Synthetic benchmark96 observations/19 calls versus160/29 with the same
  confirmation work:40% fewer observations and34.48% fewer calls. It exercises
  scheduling/pruning only; its data is explicitly synthetic, not gameplay.
- `final-static` and helper exits are0. Shell syntax and diff checks pass.

Interpretation: the real example's all-D8 arrival values equal8h and its paired
differences equal0, with no censoring. Both declared finite-horizon median
claims pass at the planned n8 confirmation. All discovery candidates tie, so
price12 is chosen by name order. No balance profile is promoted to shipping;
this metric cannot establish which Scout price feels better or improves pacing.
Confidence is high for the tested tooling properties, limited for savings on
larger/late-game grids. Rare events, worst-seed promises, UI/player experience,
the inherited canonical failures and fun≥80 are not certified.

Historical directories `preliminary-budget-report`,
`js-before-collision-reserve` and nested superseded-denominator reports preserve
earlier runs. They are not the final confidence/speed evidence. Final reports
compare unpruned discovery and one winner's identical confirmation workload.
The tiny collision reserve transfers IID inference coverage to the distinct-ID
sampling schedule; final CLI tests verify the allocated budget.
