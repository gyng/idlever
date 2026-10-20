# Cut283 — protected statistical test of safer starts

Owner: continue the backlog, using statistical tuning by default where suitable.
Cut282's two-seed guide-gap6 result passes both relative rows, but PICKED D33
slows40→72h on seed1 and automated fortnight mean best slips29.93→29.75.
Do not adopt a relative improvement caused by slowing comparison policies.

## Fixed study before fresh observations

`tuning/studies/guide-protected.json` compares the existing shipping profile
(guide gap4) with only gaps6 and8. Ordinary PICKED/TUNED;14-day horizon, stop
each seed/policy at its first normal check-in reaching D33. Uniform distinct64-bit
IDs, paired profiles, discovery4/8 with half retained, exactly one winner frozen
before disjoint confirmation looks8/16/32. Total family alpha0.05 across four
claims/three planned looks, using Cut280's collision reserve.

All four declared population-median claims must pass:

1. Candidate−shipping PICKED capped D23 arrival≤0h.
2. Candidate−shipping PICKED capped D33 arrival≤0h.
3. Candidate−shipping TUNED capped D33 arrival≤0h.
4. Within-candidate PICKED/TUNED capped D33 arrival ratio≥1.15.

Unreached arrivals use the explicit344h cap, never dropped. These are named
finite-horizon statistical estimands, not a silent rewrite of canonical catalog
eligibility. Inspect censor counts: any observed confirmation D33 censoring
prevents default adoption under this cut even if the scalar verdict passes.
No candidate or claim changes after confirmation; no runner-up retry on those
outcomes. Retain rejected/inconclusive results and do not increase the budget
because an outcome is inconvenient. This study has its own confidence budget;
it is not a global95% guarantee across future studies.

## Adoption requires more than the screen

No game change is made to the frozen study runtime. A rejected or inconclusive result
means retain current defaults and investigate a different cause. Statistical
acceptance with no observed D33 censoring permits an explicit targeted16-seed
`tuned-picked,automation-pays` catalog check, preserving both original numeric
bars and the two-seed regression evidence. It does not certify any omitted
canonical row, daily/away mean, rare event or full gate.

Only after those pass, amend the implementation/validation scope before changing
the Rust default and tuning profile together. Cover affected deterministic Guide
semantics, relevant progression/settlement parity, rebuilt WASM and UI-facing
default consistency. No deployment, held W2 upgrade or recovery change is included.

Execution amendment2026-10-20: Cut284 independently fixes a reproduced route
packing defect in the current worktree while this study retains its immutable
old executable, inputs, analysis and claims. Its final verdict still describes
that old runtime only. It cannot authorize profile adoption on the new runtime;
fresh current-runtime evidence is required. The original preregistration is
archived in `evidence/cut283/frozen-contract.md`; no confirmation budget or
winner changes and no runner-up reuse are permitted.
