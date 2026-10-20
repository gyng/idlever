# Protected guide study — complete, INCONCLUSIVE

Contract: `docs/CUT283_GUIDE_VALIDATION.md`; fixed spec
`tuning/studies/guide-protected.json`. The archived manifest and frozen gap8
winner predate final confirmation. `state.json` is terminal; the collector ended
with exit3 (statistical inconclusive, not an operational failure). No profile
is adopted. Canonical gates were NOT_RUN.

All four claims remained inconclusive at all planned looks8/16/32. Final32:
PICKED D23 median difference0h, interval[-8,8]; PICKED D33 +8h,[0,24];
TUNED D33 +8h,[0,16]; within-gap8 PICKED/TUNED D33 ratio1.1833,[1,1.3333].
Every component was observed: no confirmation censoring. Non-regression and the
required1.15 pen advantage were not established. This does not establish a
statistically certain regression either. Retain Guide gap4; no runner-up retry,
extra samples or targeted adoption check follows this result.

Total3297.489s, preparation0.578s;9 native calls,76 seed/profile observations
(152 bot trajectories), versus88 for unpruned discovery with identical winner
confirmation:13.6% fewer observations. Host contention prevents inferring an
exhaustive-campaign wall-time speedup. The study used the immutable pre-Cut284
runtime, not the current route-packing fix; it cannot authorize current defaults.

`jobs.json.gz` preserves all76 original receipt objects, including complete bot
outputs, string64-bit seed envelopes and runtime/profile/cache hashes. The
legacy numeric `seed_out.seed` can be rounded by JavaScript; use the exact string
envelope for identity. `verify.mjs` imports no production inference helper and
checks all payload and job hashes, exact profile/seed inventory, preregistered
winner/claims, discovery ranking, all12 confirmation intervals via exact rational
binomial tails, and censor counts. Run from the repository root:

```sh
node docs/evidence/cut283/verify.mjs
```

`verification.txt` records the passing reconstruction; `report.json`/`.md` and
`run.txt` preserve the collector results. The verifier's first scaffold assumed
frozen-winner.json was an unwrapped winner; correcting its wrapper access made
the independent check pass. No observation or production report was edited.
