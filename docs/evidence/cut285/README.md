# Native statistical probe scheduler — measured improvement

Contract: `docs/CUT285_STAT_PROBE_THROUGHPUT.md`; original frozen here. The probe
now shares its requested thread budget between remaining trajectories and their
forecast panels, using the ordinary dayplayer's existing width mechanism. Queued
jobs count as remaining work, preventing early workers from borrowing capacity
reserved for jobs that have not started. Ordinary game logic and whole terminal
check-ins remain intact.

Three sequential pairs, alternating order; same current Cut284 core, default
balance, PICKED/TUNED seeds1/2, D33 or14 days, three check-ins/day,8 threads:

| Pair | Before seconds | After seconds | After/before |
|---|---:|---:|---:|
|1|100.448|44.720|0.4452|
|2 (after first)|75.315|39.098|0.5191|
|3|81.757|37.761|0.4619|

Median paired ratio0.4619: **53.8% lower wall time** on this workload, exceeding
the preregistered10% threshold; no pair regresses. Host load varies (recorded in
`timings.json`), so this is a repeated bounded-workload comparison, not a universal
speedup, confidence interval, full study rerun or extrapolated gate duration.
CPU seconds are recorded too; build/preparation is excluded from these timings.
No owned benchmark/build overlapped; unrelated host work was left running.

All six complete raw JSON documents match exactly after removing only each
observation's elapsed_seconds. That covers **24 measured trajectories**,
repeating the same four trajectories six times. Unique coverage is two seeds ×
two bots, not24 independent seeds. Exact-u64 values, all SeedOut fields, complete
request/profile metadata and endpoints agree. All four reach D33 (PICKED40/48h,
TUNED40/40h). `verify.py` checks archived documents and the numeric timing rule;
`verification.json` records its output. gzip archives contain original raw JSON.

`identity.json` binds source/executable hashes; source snapshots retain before
and after. The after snapshot has rustfmt whitespace normalization performed
after benchmarking; only whitespace changed before test compilation. Local
executables remain in `target/cut285/probe-before` and `probe-after`.
`bench.py` records the exact runner and commands; immutable output names prevent
an accidental repeat from replacing measurements. The initial wrong executable
attempt is preserved separately and supplies no benchmark evidence.

This is diagnostic example code only. No core rule, statistical estimator,
confidence budget, tuning profile, canonical threshold or game default changes.
Cut283's old immutable result remains inconclusive; it is not rerun on this
changed probe. No WASM repin, deployment, full gate or fun acceptance is implied.

Validation: five focused native tests pass (28.47s), scoped rustfmt and diff
checks pass, warnings-denied Clippy passes for both example entry points. Commands:

```sh
CARGO_INCREMENTAL=0 CARGO_TARGET_DIR=target/cut282-native cargo test -q --profile fast -p idlever-core --features dev-balance --example dayplayer stat_probe::tests -- --test-threads=1
CARGO_INCREMENTAL=0 CARGO_TARGET_DIR=target/cut282-native cargo clippy -q --profile fast -p idlever-core --features dev-balance --example stat_probe --example dayplayer -- -D warnings
python3 docs/evidence/cut285/verify.py
```
