# Frozen paired cost protocol (not a result)

Run only after the actual Cut244 native-gate wrapper3506268 and all owned
browser/test work are terminal. Quiet is an observed process condition, never
inferred from elapsed time or a stale phase file. Keep the source/art/replay
frozen. No CPU-under-load result is substituted for the contract's GPU bar.

Build two isolated source copies from the same current frontend: baseline
restores the five files in renderer-before.tar.gz plus the pre-landmark
fallback.ts from2a4bb2c5, candidate retains final source. Record complete source
SHA inventories, exact old archive hash, unchanged art and actual replay SHA.
Use fresh owned no-HMR servers, the private Xvfb/NVIDIA launcher, same browser
build/device scale/viewport/effects, same actual Fens/Crypt/Foundry floor/tick
and ordinary paused map camera from after-v3/results.json. No engine boot is
needed for the stored renderer input; no current earned-progression claim.

Alternate baseline/candidate order per repetition. At400/1440 in each biome:

- Record7 fresh-viewer initialization repetitions. Measure synchronous viewer
  creation+load+event application+seek and separately time first nonempty actual
  paint, retaining both definitions and raw results. Network/module loading is
  outside synchronous setup, but the first-paint measurement includes real atlas
  readiness/GL compilation. Keep raw outliers. Cold acceptance requires paired
  median setup increment<=10ms; a first-paint regression must be investigated,
  never hidden by the setup definition.
- For3 of those repetitions, warm for240 actual frames then obtain240 resolved
  EXT_disjoint_timer_query_webgl2 samples. Instrument only the existing timer's
  resolved-sample push, identically in both served modules, to collect raw GPU
  results/counts/disjoints. Pin original and instrumented response hashes. This
  instrumentation does not add GPU operations or synchronous readback.
- Stop/report unavailable if the timer cannot resolve or becomes disjoint; no
  CPU submission, rAF interval or readPixels wall time may count as GPU time.
  Retain CPU and cadence diagnostically. Use the paired median of each leg's
  actual-query p95 across3 repetitions; every sampled scene must keep candidate
  increment<=0.20ms. Preserve raw repetitions/noise, not just an aggregate.
- Verify unchanged input JSON and viewport/device/camera/effects after each leg.
  No save mutation or game progression occurs in this read-only viewer probe.

If noise exceeds the required bar, inspect the cause and revise implementation
or state the actual failed/unavailable evidence; do not relax thresholds. This
file prepares the next proof. It is explicitly not measured acceptance.

## Original result and temporal-pairing follow-up

cost-final/ preserves the original A/B failure:3of6GPU margins exceed0.20ms,
while all6synchronous cold setup medians pass. No timer/page errors or missing
queries. cost-control-a/ then runs identical pre-landmark sources on both
sides atFoundry1440; its+0.223232ms margin also fails the unchanged budget.
The exact two source inventories are asserted equal. This demonstrates method
variance exceeding the budget; it does not clear the larger candidate failures.

The next diagnostic uses --interleaved and must first validate an identical-source
control. Both independent production viewers share one page and normal rAF
clock/quality/resize updates. A measurement-only gate immediately before the
production build/render block alternates which viewer submits the GPU work on
each rAF. No GPU operation/pass is changed inside either active frame. Thus
baseline and candidate queries interleave within milliseconds instead of whole
separate context/page sampling windows minutes apart. Module instrumentation and
complete original/source hashes are retained. Actual device/viewport/camera/
effects geometry must agree. No synchronous readback or CPU substitute.

After both viewers paint, warm480rAF callbacks (240active frames each), then
collect>=240resolved GPU queries per leg. Keep3repetitions and the same p95/
0.20ms threshold. Any unavailable/disjoint query fails availability. Cold setup
continues to use7separate fresh-viewer repetitions per leg with its original
10ms bar; first-paint diagnostics remain separate. Never report a passing
control as candidate acceptance or overwrite an original failed result.

## Symmetric driver revision (prepared, not measured acceptance)

The first interleaved A/A control also fails by+0.32256ms. Its fixed production
callback order and permanently topmost candidate canvas are unresolved
confounders. `--interleaved --symmetric-driver` removes both asymmetries in
measurement-only served-module instrumentation. It captures the two ordinary
frame functions instead of starting their independent RAF loops. One shared
RAF driver alternates the active leg, puts its canvas on top, calls the inactive
clock/quality/resize/camera prefix first, then the active complete frame. Both
prefixes still run every display frame; one unchanged complete GPU pipeline
runs per display frame. Twelve recorded samples assert the active canvas is
actually topmost. No production source or GPU pipeline is changed.

First run identical-source Foundry1440 A/A again, preserving a new directory.
An A/A control now requires the absolute GPU difference<=0.20ms and absolute
cold setup difference<=10ms; a large negative discrepancy cannot validate a
method either. Candidate acceptance retains the original signed increment
bars. Three GPU repetitions/240warm active frames/>=240resolved samples per
leg and seven separate cold repetitions remain unchanged. `--quiet-pids`
must include the current owned native/browser handles checked terminal before
launch, in addition to reviewing any remaining owned work. Frozen source and
art inventories are rechecked at completion. This is a method preparation,
not a passing control, candidate result or explanation of earlier failures.
