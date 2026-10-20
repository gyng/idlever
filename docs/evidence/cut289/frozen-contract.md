# Cut289 — gas step uses a packed safe ranged answer

Owner: continue backlog. Cut287's matched gas scene has gas_step L3 waiting for
an approaching bloat, then melee-popping it at t90 while a known fire potion is
packed:15 hurt/6 gas damage versus baseline9/6. The card's range-oriented promise
has an unused existing answer. No new formation is needed to test this gap.

## Fixed implementation and numeric acceptance before core edits

Only gas_step's tactic routine may change: after escaping current hazards, a
melee-equipped hero may throw a known packed fire potion at an actual visible
gas foe at distance2..THROW_RANGE, with line of sight, on dry ground, without
ranged reflection. Existing ranged weapon behavior, healing guard precedence,
unknown potion safety, adjacent fallback and unreachable-foe escape remain.
Use existing throw mechanics/events/consumption/identification, not new damage,
rewards, potion supply grants or RNG sources. No auto-pack/default/price change.

1. Public-engine controlled tests prove exactly one safe known throw/consumption,
   no unsafe adjacent/unknown/wet/reflected/blocked throw, existing bow behavior
   retained, and useful progress with no throwable. Fixtures are diagnostic.
2. Replay the TWO fixed earned Cut287 gas_step parents, Fens gas s1/D9/a2 and pack
   s2/D9/a2, with their real equal common fire preparations. On the gas scene,
   gas hurt≤3 (old6), total hurt≤9 (old15), initial-floor event tick≤1730. On the
   pack scene, total hurt≤16 and gas hurt≤9 (its old gas_step values). Both actual
   runs finish within the existing200000-tick cap. If any fail, keep the receipt
   and reject/revise the candidate; never weaken these bars to accept it.
3. Recheck all six ordinary catalogue entries on the candidate runtime. Their
   16 non-gas_step selected cases must retain exact events and complete after-save
   equality to archived counterparts; gas_step cases retain exact observer quantum
   parity and repeated/saved in-flight determinism. Explicit inherited failures
   are not relabelled fixed by these controls.
4. Two actual next8h gas_step continuations still reach deepest≥28, have no more
   stalled runs than their old reports, and reconcile Gold/clock. Retain all Gold
   and run-count deltas, not just the pass thresholds. This is two saved camps,
   not a population balance claim or new statistical confidence budget.
5. Appropriate focused/native workspace tests, warnings-denied Clippy, formatting
   and current WASM/settlement/bridge checks after the core change. Target any
   relevant existing stalled-policy gates before broad shipping claims; no full/
   exhaustive/fun acceptance or deployment is inferred. Rebuild/repin WASM only
   after the bounded native candidate checks pass.

Held Bank/Vat W2, recovery, Guide4, all unchanged canonical thresholds, existing
route/placement rules and optional pen remain outside this cut. Preserve all
failed attempts and baseline/native/source identities. No new enemy or formation
is implemented here; Cut136's formation-selection contract remains separate.
