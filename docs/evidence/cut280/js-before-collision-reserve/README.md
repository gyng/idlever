# Cut280 JavaScript CLI evidence — 2026-10-20

Final frozen-source run: Node v22.18.0, **44/44 tests pass**, zero skips, exit0; TAP duration32.80s. Source-before and source-after SHA inventories match exactly (`logs/source-stability.exit.json`: exit0). CLI SHA256: `e362dc15a0209d1b79b3f29190fe84fbb9626a30090ca60793843cbc4042fd94`.

Command, from repository root with Node22 on PATH:

```sh
STAT_TUNE_TEST_EVIDENCE="$PWD/docs/evidence/cut280/js" node --test tools/stat-tune.test.mjs
```

`logs/stat-tune.test.log` preserves the complete output; `synthetic-benchmark.json` records source hashes, actual fake-native calls and the explicit counterfactual. The archived manifest contains the exact preregistered64-bit discovery/confirmation seed strings; the report and calls preserve the synthetic outcomes and identities.

Measured eight-candidate study:19 probe calls and96 seed/bot/profile observations; completed rerun makes zero new calls. Fair unpruned comparison holds confirmation fixed to the same winner, baseline and actual final n8:29 calls and160 observations. This gives **34.48% fewer probe calls and40% fewer observations**. Discovery accounts for80 observations versus144 without pruning; the same16 confirmation observations appear on both sides. The earlier denominator which confirmed every candidate overstated savings; its historical artifacts remain explicitly superseded in `superseded-denominator/`.

Coverage includes immutable/disjoint held-out seeds, one frozen winner with no runner-up retry after rejection, alpha allocation, median and mean outcomes, ratio/day/capped-arrival extraction, DAILY/AWAY cadence, resume/cache identity and corruption, invalid native records/horizons/timing, stale accepted-artifact removal, exclusive live writers, verified-dead lock reclamation and SIGTERM cleanup. Dispatcher checks exercise statistical list/help and an isolated copy of the unchanged shell dispatcher with synthetic Cargo/row-list peers for `--exact --list`; no Cargo build runs.

These are automated synthetic CLI tests, not player observations, game simulations, actual campaign speedup measurements or canonical gate certification. No WASM build, full gate, game balance change, commit or deployment was performed for this test work. Confidence applies to the tested CLI/protocol cases and exact source identities; relevant changes require revalidation.
