# Cut253 current pacing and routine-full run

Started2026-10-16 from frozen native7be668d57d275910f0080687ca4b50170f79527b,
Node22.18/default balance,16threads, packageef4b58d7fb4ab69056c8101ce8e528087bdbf6fb47fb561b8926645aebb4eb79.
`source-before.json` pins native sources, the gate/runtime-key harness, runtime
presets/cards and exact installed package. Root UI/art changes are outside the
native source identity; no performance claim is made under this workload.

The durable host wrapper isPID/PGID745149. Its first pacing Node child is745163.
`state.json` records current stage/child, command, live30s checkpoints, observed
binary hashes and final result. `wrapper.log` mirrors bounded transitions.
`pacing-terminal.json`/`routine-full-terminal.json` require positive child exit,
expected runner marker and unchanged source; `wrapper-terminal.json` records
the positively ended sequence. A live launcher return or empty log is no pass.

Sequence:

1. `node tools/gates.mjs --pacing --fail-fast`.
2. Only on pacingPASS and unchanged identity: `node tools/gates.mjs --full`.

The pacing pack resolves actual row IDs,16seeds/leave-one-outs/tuned seeds;
it is a targeted check, never the routine gate itself. Routine full retains
18current-player cases,10wire seeds and the required16RANDOM/PICKED seeds for
the RANDOM row. Other routine rows retain their existing bounded seed scope.
Neither run certifies the separate exhaustive audit, all40queue items or fun.

Normal exact-identity caches are allowed (no `--fresh`). Before/after completed
leg inventories and nested job counts are saved. Actual cached keys/hits remain
in runner logs. Cache presence/count alone is not acceptance. Failed/signal
runs remain visible; this wrapper does not tune, weaken or retry-to-green.

Continuation: read state plus the current stage log/terminal file. Check the
reported host process IDs from outside per-command process isolation before
starting any replacement; sandbox-local `ps` can hide a live host job. If the
host wrapper is positively absent without a terminal receipt, preserve this
folder as interrupted. Resume only the exact unfinished command/source/runtime
in a new versioned evidence folder, allowing the gate runner to reuse its
completed matching caches. A genuine terminalFAIL requires investigation,
not an automatic rerun. Never overwrite this run or infer fullPASS from pacing.

The first sandbox-local detachment returnedPID119 but never initialized source,
state or pacing files; the subsequent host process check found no matching
wrapper. Empty originals and that exact check are preserved as launch-v1
diagnostics. The host detachment is the actual gate start, not a gate retry.

Final2026-10-16: pacingPASS24rows (native1546s), followed by routine
fullPASS (metrics8rows, QA10seeds,18current-player cases,16RANDOMcomparison
seeds). All3legs exited0; source/package held exact. Host process absence is
recorded in processes-terminal.json. summary.json and dated observations state
the exact cache/early-settlement limits. Source freeze released only after both
positive terminal receipts; later source changes do not rewrite this result.
