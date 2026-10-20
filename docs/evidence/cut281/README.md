# Cut281 calibration evidence — complete 2026-10-20

Contract: [CUT281_STATISTICAL_CALIBRATION.md](../../CUT281_STATISTICAL_CALIBRATION.md).
Frozen manifest: [manifest.json](manifest.json). No parameter is adopted.
`frozen-contract.md` preserves the exact preregistered contract bytes matching
the manifest hash; the live cut later appends its completion results.
Native executable SHA2563f742aa6cba677a6b62b405185f688b6881237a45ffe9441e3bc47e02f894197.

`calibrate.mjs` is a one-off fixed-cohort evidence collector, not a replacement
for `tools/stat-tune.mjs`. It snapshots the existing native probe and freezes
128 distinct64-bit IDs, complete profiles and source/analysis identities before
running anything. Native chunks stay in `target/cut281/`. Four child processes
run eight native seed workers each; all source gameplay is unchanged.

The shipping-vs-shipping control is algebraically zero and reuses shipping
observations. It does not test native determinism (Cut280's native tests do).
Weaker/stronger scars are sensitivity controls, not recommended game balance.
The32-seed pilot and96-seed reference are disjoint but claims sharing a cohort
are correlated. Reference verdicts are uncertain estimates, not population
truth. Agreement cannot establish an empirical95% accuracy estimate.

Commands from the repository root, with Node22:

```sh
node docs/evidence/cut281/calibrate.mjs > target/cut281-calibration.log 2>&1
# After collection finishes:
node docs/evidence/cut281/verify.mjs
```

The collector refuses a changed HEAD, script, contract, bounds implementation,
native executable or profile. Do not alter frozen collector inputs or commit
while this batch is active. Do not start a second collector while the first is
alive. Native chunks publish without overwriting; resume validates every saved
chunk before reusing it. An invalid chunk is an error, not an omitted sample.
Collection is now finished and the live cut appends its results. Revalidate
archived evidence with `verify.mjs`; a collector resume against the changed
live cut intentionally refuses. Do not start a new collection for a report check.

`verify.mjs` separately reconstructs all24 median intervals from archived
scalars using exact integer binomial counts and rational alpha comparisons.
It does not import the production inference helper or native observation cache.
Its result passes: all24 intervals and six pilot/reference verdicts match.
`native-integrity.txt` separately checks all48 native chunk hashes and all384
scalar observations against the raw packets and frozen source identities.

Initial sandbox launch failed with Node `spawnSync git EPERM`, before the
manifest or native children existed. The host execution launched normally.
All384 observations are complete. The collector and all its native children
finished; `run.txt` preserves its output. No game profile is adopted.

## Results and practical limit

| Comparison | Pilot first conclusive n | Pilot median interval | Reference n96 interval |
|---|---:|---|---|
|Shipping D18|16|[0,0] PASS|[0,0] PASS|
|Shipping D23|16|[0,0] PASS|[0,0] PASS|
|Weaker D18|16|[0,0] PASS|[0,0] PASS|
|Weaker D23|32|[0,0] PASS|[0,0] PASS|
|Stronger D18|32|[0,0] PASS|[0,0] PASS|
|Stronger D23|32|[0,0] PASS|[0,0] PASS|

Intervals are hours of candidate minus shipping arrival; negative is sooner.
All claims ask only for a median at most0h. No sample is censored. With the
six-claim/four-look family allocation, n8 intervals are unbounded; this is a
larger family than the default example, not a universal minimum sample count.

Agreement is6/6 across correlated claims, **not an empirical accuracy estimate**.
Weaker D23 still delays10/96 reference seeds by8h (seven improve;79 tie).
Stronger D23 improves12/96, delays5/96 and ties79. Both median claims pass;
neither permits a claim about every seed or the mean. This calibration shows
real-data inference/reproducibility beyond D8 and the cost of a larger family,
but does not demonstrate power to reject a material regression. D33, daily/away
means, tails and winner-selection quality remain separate work.

Collection took1488.67s,384 observations/48 calls, no reused chunks. Other
project jobs shared the host. Milestone stops avoided54048/64512 simulated
game-hours (83.78%), with10464 actually simulated. This is **game time**, not
CPU time or a wall-time benchmark against complete seven-day campaigns.
The larger corpus is one-off validation, not the default routine tuning budget.
