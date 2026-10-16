# R3's pair lane: what the tooling needs before a pair can be run (2026-10-16)

The R3 review (`r3-biome-review-2026-10-16.md` §4.4/§5) says the six paired compositions
are legal and names the exact commands, and that the one missing piece is a **scene-level
harness** (a thin wrapper over `choice_check`'s JSON — "small, not a new system"). Two
concrete blockers were found by trying the lane on today's tree:

1. **The legality runner is pinned to a superseded engine — resolved 2026-10-17.**
   It asserted `web/src/engine/pkg/idlever_wasm_bg.wasm` equals `e62c0867…` while today's
   engine is `51d041d0…`, so it refused to run (the R3 pair lane hit exactly that). The
   script now derives its epoch directory from the engine's own identity
   (`departure-readiness-${sha.slice(0,4)}`), so it runs on any build, **can never mix two
   builds in one directory**, and left the `-e62c` outputs where they are; the identity is
   still recorded in `results.json` and re-checked after the run.

   **The current epoch is recorded** (`departure-readiness-51d0/results.json`, status
   PASS): all **six tactic packages are legal and free** on this earned camp — `gas_step`,
   `pack_break`, `corridor_fighting`, `reflect_read`, `boss_focus`, `hunter`, each leaving
   gold exactly `12021` — which is the ground truth R3's §5 pairs assumed. The class swaps
   are constrained: `fighter` and `rogue` are legal, while `ranger`, `caster` and `gunner`
   are **not unlocked** on this camp, so any class-based composition needs an unlocked
   class first.
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
