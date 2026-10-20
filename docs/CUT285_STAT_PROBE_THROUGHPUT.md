# Cut285 — native statistical probe throughput

Owner: continue the backlog and improve tuning iteration speed. Cut283 took
3297s under contention; that is not a controlled performance comparison.

## Contract before implementation

Inspect the ordinary statistical exporter on current Cut284 core. Its flat
seed/bot workers disable forecast parallelism even when only a few trajectories
remain. The ordinary dayplayer already gives spare capacity to forecast panels.
Test whether applying that scheduling mechanism helps the statistical probe.
No game rule, policy, horizon, terminal check-in preparation, statistical claim,
seed schedule, confidence budget or default balance change is authorized here.

1. Preserve every exported observation field exactly except elapsed_seconds.
   Compare old/new real native exports for PICKED/TUNED seeds1/2 through D33 or
   14days, three check-ins/day, budget8 threads. Both runs execute complete
   ordinary check-ins; no removal of terminal preparation work.
2. Record three sequential paired repetitions, alternating old/new order; compare
   whole output documents after stripping elapsed_seconds. Archive source and
   executable hashes, resource measurements, commands, actual outputs and failed
   launcher attempts. No concurrent owned benchmark/build jobs.
3. Keep the scheduling change only if the median paired wall-time ratio new/old
   is ≤0.90 and no repetition is >1.10. Otherwise retain measurements, reject the
   attempted optimization and identify a next measured bottleneck.
4. Relevant native statistical tests and warnings-denied example Clippy pass.
   Preserve full-u64 identity and single/multi-thread determinism. This is example
   tooling only: no core/WASM rebuild, release or balance acceptance is implied.

The initial command accidentally used the dayplayer executable, whose unrelated
CLI ignored these statistical arguments and printed an empty gate table. Its
exit0 is not probe or acceptance evidence; preserve its outputs as a failed
benchmark scaffold. Build and invoke the actual stat_probe example next.

## Measured result

Three paired wall times100.448→44.720s,75.315→39.098s (after first),
81.757→37.761s. Median after/before0.4619,53.8% lower wall time on this bounded
four-trajectory workload; no pair regresses. All six complete raw exports match
exactly except elapsed_seconds. Keep the scheduler change. Five focused native
statistical tests pass (including ordinary-policy parity, exact prefix, full-u64
and single/multithread determinism),28.47s. No broader campaign timing is claimed.
Evidence and independent verifier: [evidence/cut285/README.md](evidence/cut285/README.md).
Warnings-denied Clippy for both example entry points, scoped rustfmt and diff
checks also pass. All owned benchmark/build/test/lint processes are terminal.
