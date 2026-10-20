# Cut282 inherited balance diagnosis — diagnostics complete, targeted exploration active

Contract: [CUT282_BALANCE_DIAGNOSIS.md](../../CUT282_BALANCE_DIAGNOSIS.md).
No game rule, parameter, canonical bar or held branch is changed.

The initial default-feature dayplayer build reused a stale core library from the
shared `target/` and failed to resolve `persistent::hurry_price` and
`Game::hurry_clone`. Both definitions are present in current source; the exact
failure is retained in `shared-target-build-failure.txt`. A separate build in
`target/cut282-native` passed. Do not alter game APIs to accommodate an
old artifact. AGENTS.md now records the separate-target rule for baseline
worktrees.

The ordinary diagnostic has completed; do not launch another copy.
Its command is `python3 docs/evidence/cut282/run.py`.
It refuses to overwrite an existing diagnostic identity, binds the compiler,
executable, Cargo files and every core Rust source file, clears all policy
environment overrides, and runs ordinary AWAY/AWAY-nodes seeds1/2 through four
days. Verbose output and pre-absence camps are diagnostic exports only.
`DP_NODES` prints hire timings; `DP_SAVE_DIR` writes saves. Neither changes
choices. Artifacts go to `target/cut282/` for analysis and selective archival.

Fresh four-day reproduction and16 same-camp interventions are complete and
independently checked. Read [findings-2026-10-20.md](findings-2026-10-20.md),
`verification.txt` and `comparison-verification.txt`. Exact raw camps and
prepared/final comparison saves are compressed without changing their bytes.
`dayplayer.txt` removes trailing whitespace from the diagnostic text log only;
the raw log remains in target. Game-save bytes and outcome text are preserved.
The comparison's original preregistered contract is preserved byte-for-byte in
`worker-contract-frozen.md`, matching its frozen SHA before the later catalog
exploration amendment was appended to the live cut.

The separate three-profile guide-gap screen is active in
`target/sweep/cut282-guide-gap/`, log `target/cut282-guide-sweep.log`; fixed grid
`guide-gap-grid.json`. It checks the existing two regression seeds/rows, not a
population sample or whole gate. No profile is adopted. The original
fourteen-day failures remain open.
