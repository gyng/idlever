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

## Completed — 2026-10-20

All384 observations (128 seeds ×3 profiles),48 native calls,24m48.67s on a host
with other concurrent workloads. All samples reached both milestones; no
censoring. Stopping at D23 simulated10464 game-hours versus64512 for complete
seven-day horizons, avoiding54048 hours (83.78%); this is game time, not a
measured wall-time speedup. No full seven-day comparison was run.

All six first-conclusive pilot verdicts agree with the separate96-seed reference:
three settle at16 seeds and three at32. All reference medians and intervals are
0h. Independent exact-rational binomial reconstruction reproduces all24
intervals; native chunk digests and all384 extracted scalar observations match.

**Limited sensitivity:** the reference controls have77–82/96 zero paired D18
changes and79/96 zero D23 changes. Weaker scars still delay10/96 D23 seeds by8h;
the median no-regression claim passes because it does not constrain that tail.
Neither an empirical95% accuracy estimate nor the ability to reject a meaningful
regression is demonstrated. No parameter is adopted. Later D33, mean/tail and
search-quality calibration remain open; the inherited balance failures remain.
Evidence: `docs/evidence/cut281/`.
