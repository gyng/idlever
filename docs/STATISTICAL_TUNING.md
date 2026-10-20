# Statistical tuning

Routine parameter search uses native, compile-free profiles, staged discovery
and independent statistical confirmation. Start from the checked-in example:

```sh
CARGO_INCREMENTAL=0 tools/tune.sh --name scout --spec tuning/studies/scout-example.json --threads 16
# A JSON positional argument is shorthand for a study with the file's basename:
tools/tune.sh tuning/studies/scout-example.json --threads 16
```

The example measures only early IDLE arrival at D8. It compares three Scout
prices and includes the shipping profile as a control; it does not change any
game defaults or accept late-game economy, worker upgrades or full progression.
Reports and immutable observations live in `target/stat-tune/NAME/`. Repeat the
same command to resume; cached observations never count as additional seeds.
Use a new study name when profiles, claims, probe code or analysis change.
`--list` with a specification validates/expands it without compiling/simulating.
`--help` describes the CLI. `--out DIR` selects a different artifact directory.

## What runs

1. Build and snapshot one `stat_probe` native executable with `dev-balance`.
2. Draw/persist uniformly sampled distinct64-bit seed IDs, with disjoint discovery and
   confirmation sets. Baseline and candidates use exactly the same seeds.
3. Run4 discovery seeds by default. Rank candidates by their worst normalized
   claim margin and keep the best half. Expand survivors to8 then16 only as
   needed. Discovery is exploratory ranking, with no confidence verdict.
4. Freeze exactly one winner and its claims before reading any confirmation
   outcomes. Run8 independent confirmation seeds, expanding to16/32 only when
   inconclusive. Never try a runner-up on the same confirmation outcomes.

Fewer exploratory simulations can miss a useful candidate. That affects search
quality, not the held-out confidence guarantee. Flat early metrics can tie;
check the report and select a horizon/claim sensitive to the system being tuned.
The runner does not invent a search objective or automatically adopt a winner.

Native observations are cached per executable/profile/probe/seed; baseline work
is shared across candidates. Extra check-ins, deaths, repeated files and resume
reads are never independent observations. Simulation environment overrides are
cleared; profile changes are supplied only through the frozen balance JSON.
Parallelism is bounded by `--threads`; there is no browser or WASM packaging in
the tuning loop. Study directories have exclusive writer ownership.

## Specification

`base` names a JSON balance profile, default `tuning/balance.json`. `grid` and
`candidates` have the same path/value syntax as `tools/sweep.mjs`; candidates
must be fixed before discovery. `probe` declares policy `bots`, `days`, optional
`untilDepth` and `checkins` (default3). The exporter uses ordinary dayplayer
choices, first session and check-ins. DAILY/AWAY retain their ordinary effective
cadence. `untilDepth` stops after an actual check-in reaching a recorded
milestone; it never supplies fabricated remaining daily observations.

Every claim has a unique `id`, scalar `metric`, `estimand` (`median` or `mean`),
`direction` (`at-least` or `at-most`) and finite `threshold`. Optional
`comparison: "difference"` measures candidate−baseline within each seed;
the default `absolute` measures the candidate itself. `rankingScale`, default1,
normalizes margins only for discovery ranking; it does not change observations,
units, thresholds or confidence bounds. A bounded `mean` requires an a-priori
`range: [lower, upper]` in the final claim's units, including paired differences.
Values outside a declared range are errors, never clipped or discarded.

Metrics:

| metric | interpretation |
|---|---|
| `{"bot":"IDLE","field":"arrival_hours","depth":8}` | Arrival hours at a recorded milestone; unreached means declared horizon hours plus one effective check-in, with censor counts reported. |
| `{"bot":"PICKED","field":"best_day","day":2}` | Best depth at the end of a completed day. Requires a full-day probe without `untilDepth`. |
| `{"bot":"PICKED","field":"gold_day","day":2}` | Net Gold in a completed day, not lifetime income or total wealth. |
| `{"ratio":[NUMERATOR_METRIC,DENOMINATOR_METRIC]}` | Per-seed scalar ratio; denominator must be positive. Supports explicit within-seed PICKED/TUNED ratios. |

Arrival metrics certify the declared **capped finite-horizon** quantity. They
do not certify uncensored eventual arrival. A loose cap can satisfy a threshold
even when every seed misses the milestone; always read censor counts. Ratio
claims inherit both sides' censoring. This avoids outcome-dependent dropped
seeds, but differs from canonical `tuned-picked` eligibility/infinite-ratio rules.

## Statistical verdicts

Median intervals use exact binomial/order-statistic bounds, conservative with
ties. Mean intervals use Hoeffding bounds and fixed known ranges. Four favorable
seeds cannot establish a distribution-free95% median claim. Small effects or
broad mean ranges may remain inconclusive even at the final budget.

`confirmation.alpha` defaults0.05. Distinct-ID sampling uses a small collision
reserve: inferenceAlpha=alpha×(1−2^-38), then allocates inferenceAlpha/(number of
claims×number of planned looks) at each look, half per tail. With at most8192
draws from2^64 IDs, the reserve exceeds their collision-probability bound.
Unique uniform schedules have the IID-draw distribution conditioned on no
collision, so this correction transfers the IID coverage to the distinct-ID
schedule, including discovery-based winner selection.
A union bound preserves at least95% simultaneous interval coverage for
the planned confirmation within that study. Discovery needs no multiplicity
allocation because one winner and its claims are frozen before independent
confirmation outcomes are exposed. New studies/repeated searches after failed
confirmation incur new error budgets; this is not a global guarantee over
arbitrarily repeated studies. A manifest hash catches accidental identity edits,
not deliberate fabrication of both observations and integrity hashes.

- `STATISTICALLY_ACCEPTED` (exit0): all declared claims pass at a planned look.
- `STATISTICALLY_REJECTED` (exit1): at least one claim clearly fails.
- `INCONCLUSIVE` (exit3): budget exhausted with unresolved claims.
- Operational errors (exit2) never retain a current accepted verdict. Prior
  reports are labelled historical; corrupt observations are recomputed or fail
  visibly. Missing/duplicate/mismatched fresh native packets are hard errors.

`canonicalGateStatus` stays `NOT_RUN`. Numerical canonical thresholds are
unchanged, and a statistical population statement is not a finite16-seed catalog
pass. Universal/every-seed, conservation, rare-event and worst-seed claims need
explicit exact/stress validation. Difference of marginal medians, median paired
differences and difference of means are distinct estimands; no canonical row is
translated automatically. Existing inherited gate failures remain open.

## When to run more

Use statistical acceptance by default for declared routine balance claims.
Request exact targeted checks when a contract requires the catalog:

```sh
tools/tune.sh --exact tuned-picked,automation-pays --seeds 16
```

Legacy bare row IDs still run those exact checks. Full campaigns are exceptional
for major system changes, unmeasured interactions, rare/worst-case risk,
inconclusive targeted evidence, or a specifically required release audit.
Deterministic tests for the changed mechanics still apply. Simulation statistics
do not establish UI clarity, fun or player preference; retain focused playtests
and dated observations for those questions.

Contract: [Cut280](CUT280_STATISTICAL_TUNING.md). Primary references:
[NIST binomial intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm),
[Howard et al.](https://arxiv.org/abs/1810.08240),
[Hoeffding](https://doi.org/10.1080/01621459.1963.10500830).
