# Cut281 — mid-game statistical calibration

Owner2026-10-20: continue the backlog. First extend Cut280's real-data evidence
beyond the tied early-D8 example. This is a diagnostic calibration, with no
parameter adoption, game-rule change, WASM build or deployment.

## Frozen design

Before observing outcomes, persist128 uniform distinct64-bit seeds: the first32
are pilot observations and the other96 an independent larger reference cohort.
Every profile uses the same seeds. Native ordinary PICKED policy,3 check-ins/day,
7-day horizon, stop at the first ordinary check-in reaching D23. D18 and D23
unreached arrivals are explicitly capped at176h (168h +8h check-in).

Three fixed profiles: shipping; weaker scars1%/cap6%; stronger scars10%/cap60%.
Shipping scars are5%/cap30%. Zero scars are outside the balance schema, so use
the valid weakened profile. These are sensitivity controls, not proposed balance
defaults. The unchanged comparison reuses shipping observations algebraically;
it is a pipeline sanity check, not an independent determinism test.

For each profile and each milestone, measure the population median of paired
candidate minus shipping capped arrival hours. Claim: at most0h (no regression).
Six fixed claims; pilot looks8/16/32 and reference look96. Use total family
alpha0.05 allocated across6×4 intervals, with Cut280's2^-38 collision reserve.
Pilot studies stop on their first conclusive per-claim verdict; display later
prefix intervals as diagnostics only. Reference results are a separate cohort,
not appended samples. Reference intervals are uncertain estimates, never ground
truth or canonical finite-catalog gate results. No outcomes select a candidate.

## Acceptance and interpretation

- Manifest freezes seeds, profiles, source revision, native executable and
  analysis hashes before simulation; refuse changed resume identity.
- Collect all128 seeds on all3 actual profiles; validate exact decimal seed IDs,
  request/profile identity, record completeness, finite horizons and milestones.
  Resume only exact frozen chunks; no missing/censored sample is dropped.
- Publish paired scalar observations, censor counts, confidence intervals,
  first conclusive pilot look, pilot/reference agreement or disagreement, and
  inconclusive counts. Do not turn agreement across six correlated claims into
  an empirical95% accuracy estimate.
- Report elapsed time, observations and exact work saved by stopping at D23;
  no extrapolated wall-time or full-campaign speedup claim.
- Recompute the report independently from archived scalar observations and
  check native identity. Record failures and limitations in the handoff.

Later D33, daily/away workers, rare events and search-winner quality remain
separate work. This calibration cannot close the two inherited canonical
balance failures. Statistical tuning stays the default for suitable routine
claims, with explicit exact audits where their contracts require them.
