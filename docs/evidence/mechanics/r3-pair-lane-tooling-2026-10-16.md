# R3's pair lane: what the tooling needs before a pair can be run (2026-10-16)

The R3 review (`r3-biome-review-2026-10-16.md` §4.4/§5) says the six paired compositions
are legal and names the exact commands, and that the one missing piece is a **scene-level
harness** (a thin wrapper over `choice_check`'s JSON — "small, not a new system"). Two
concrete blockers were found by trying the lane on today's tree:

1. **The legality runner is pinned to a superseded engine.**
   `node docs/evidence/handoff-content/departure-readiness.mjs` aborts immediately:
   it asserts `web/src/engine/pkg/idlever_wasm_bg.wasm` equals
   `e62c0867b3b68c2546ba316f90d901e45547f9c80e229e86c7d6d145c62df71c`
   (`departure-readiness.mjs:12`) and today's engine is
   `51d041d0f88433e9df7ca4b7511589ab3c091df80c7131f5aac702fbdf62e191`. The pin is
   **intentional** — the script writes `departure-readiness-e62c/` and the epoch label is
   tied to that build — so a current run must be a **new epoch**
   (`departure-readiness-51d0/`), not an edit that rewrites the old one. The choice is a
   copy with a refreshed pin (duplicates 48 lines) or an identity parameter that keeps the
   old epoch's outputs intact. Owner call, small either way.
2. **The scene-level wrapper does not exist yet**, as the review states. Until it does, the
   outcomes a pair can cite are `choice_check`'s per-case `ReturnReport` (command B), i.e.
   carry/return/death and depth, not the named scene's own event.

Also from the pricing finding (`r3-scene-encounter-pricing-2026-10-16.md`): key the
reflect pair on a **common** reflector, not the iron golem (3/13 chains), or it cannot be
met often enough to compare.

Commands for the lane are in the review §4.4 (A legality, B `choice_check` paired absence,
F `gunner_trace` for the full attack verbs including `reflect`, C `builds` for a paired
panel over seeds). No sends, sims or gates were run for this note — it is the state of the
tooling, not an R3 result.
