# Cut280 — statistical tuning as the routine iteration workflow

Owner2026-10-20: resume and finish statistical tuning to improve iteration
speed. Earlier owner direction prefers statistical acceptance when sufficient,
with full campaigns exceptional. Scope is native tooling and workflow; game
rules, shipping WASM, numeric canonical gates and held upgrades do not change.

## Contract

`tools/tune.sh --name NAME --spec FILE` runs a statistical study by default.
The immutable specification declares baseline, fixed candidate grid, native
probe horizon/bots, numeric claims, discovery stages and confirmation looks.
Discovery ranks/prunes candidates using paired seed observations; it makes no
population acceptance claim. Exactly one winner is frozen before independent
confirmation. Failed/inconclusive confirmation never switches to another winner
on the same held-out seeds. Full canonical gates remain explicit, separate
evidence; routine statistical acceptance does not invoke them automatically.

Each observation is one whole uniformly sampled seed, paired across
baseline/candidate. Check-ins, deaths, runs and reused cache entries never
increase sample size. Persist uniform64-bit seed IDs once, with disjoint search
and confirmation sets. Source/runtime/probe/profile/analysis/spec identities
bind immutable cached observations and study state; mismatched resumes refuse.
No deterministic seed1..16 catalog is called a population sample.

Supported claims are explicit scalar population medians or bounded means:
absolute candidate values or paired candidate−baseline differences. Metrics
include milestone arrival hours with explicit finite-horizon censoring, daily
depth/gold and ratios of those scalar metrics. Native observations preserve
censor flags. No automatic translation of canonical rows is permitted: median
of ratios, ratio of medians and median paired change are different estimands.
Daily observations require a complete requested day; milestone-only probes
cannot quietly supply partial daily data. Unreached arrival is capped at the
declared horizon plus one check-in and labelled as such, rather than dropped.

Median inference uses exact distribution-free binomial/order-statistic bounds;
bounded means use Hoeffding with an a-priori supplied range and out-of-range
observations rejected. Distinct64-bit seed sampling reserves2^-38 of the error
budget proportionally (more than the collision probability for the maximum8192
draws): inferenceAlpha=alpha×(1−2^-38). Conditioning IID draws on no collision
then preserves the declared study-family coverage. At each preregistered
confirmation look use inferenceAlpha/(claims×looks), split across two tails.
The union bound provides
study-family coverage through all planned looks; alpha is not reset on resume.
The winner and claims cannot change after held-out observations begin.

Statuses distinguish SCREENED/DROPPED, STATISTICALLY_ACCEPTED,
STATISTICALLY_REJECTED, INCONCLUSIVE and operational ERROR. Reports always say
canonical gates NOT RUN; statistical acceptance certifies only the declared
population claims. Rare-event/universal/worst-seed promises require explicit
stress/catalog validation and are unsupported statistical claims here.

## Numeric and operational acceptance

- Unit math tests: four favorable seeds do not give95% median acceptance;
  known binomial tails/order bounds and ties pass; planned-look null false
  classification probability stays within the allocated family budget.
- Native probe results equal ordinary Play/Ask for the same inputs; arbitrary
  seed IDs retain full64-bit precision and parallel results are deterministic.
- CLI integration tests cover pruning, exactly one frozen winner, disjoint
  paired seeds, corrupt/missing/duplicate observations, invalid ranges,
  source/profile/spec invalidation, interrupted resume and no repeated samples.
- A real native study completes using at least two candidate profiles and
  reports actual calls/seeds/timing. Compare a deterministic synthetic screening
  benchmark with exhaustive search+confirmation: at least25% fewer native
  observations on that benchmark, comparing the same single-winner confirmation
  sample count; this is not a universal wall-time claim.
- Replaying a completed identical study performs zero new probe executions.
- Existing sweep/runtime/cache helper checks, scoped formatting/lint and
  relevant Rust example tests pass. No full fortnight gate, WASM rebuild,
  browser campaign, release or deployment is needed for this tooling change.

Primary statistical references: [Howard et al.2021](https://arxiv.org/abs/1810.08240)
for sequential coverage, [NIST exact binomial intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm),
and [Hoeffding1963](https://doi.org/10.1080/01621459.1963.10500830).
This implementation uses a finite preregistered union bound, not an unbounded
confidence-sequence claim, a normal approximation or bootstrap peeking.

## Completed — 2026-10-20

Native probe5 focused tests, Clippy and dev-balance build pass; ordinary
policy/cache prefix and shipping WASM are unchanged. Statistical bounds11 tests
and final CLI44 tests pass, including collision-budget allocation, cancellation,
single-writer/stale-lock handling, no stale acceptance after errors, malformed
packets and zero-work resume. Existing sweep/runtime helper and gate-cache
regressions, global formatter/linter and shell syntax checks pass.

Real study `cut280-scout-final` completes in10.73s total (warm native
build/preparation0.32s, study10.33s; external time includes wrapper overhead).
It uses40 seed/profile observations versus64 for unpruned discovery with
identical single-winner confirmation (37.5% fewer). Confirmation uses8 actual
held-out seed pairs; both declared capped-D8 median claims pass. Discovery
measurements tie; `price12` wins by deterministic name order. **No Scout-price
or game-default change is adopted.** This is workflow/early-metric evidence,
not an improvement claim or late-game pacing acceptance.

Completed replay takes0.36s, makes0 new probe calls, reads40 cached observations,
and preserves the exact manifest, winner and confirmation intervals. Synthetic
benchmark uses96 observations/19 calls versus160/29 for fair unpruned search
with identical confirmation:40% fewer observations,34.48% fewer calls. This is
not a measured wall-time comparison against an exhaustive game campaign.

Evidence: `docs/evidence/cut280/`. Earlier unfair all-candidates-confirmed budget
reports are retained under explicitly superseded directories. The inherited
TUNED/PICKED and worker-away canonical failures remain open; no full campaign,
frontend/WASM rebuild, deployment or player/fun acceptance was performed.
