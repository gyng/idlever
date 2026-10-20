# Route counter-packing fix — validated 2026-10-20

**Production fix validated.** Controlled fixtures, not
earned play, pacing, UI or fun evidence. `route_counter_probe` exercises all13
valid routes, Mother/fire and Queen/silence, just outside/inside reach, crossing
and skipping the actual boss where a later waystone exists.198 cells compare
the same drilled and pen-authored item requirements. The source/native hashes
are in `identity.json`; that pre-fix runtime is preserved as historical evidence.
Current code fixes the drill route lookup independently of Cut283's old frozen
study. That study cannot authorize a default on this new runtime.

Pre-fix result:32 drilled mismatches,16 missing counter reservations and16 unnecessary
reservations. Every pen counter and every base-route control matches. The
independent Python verifier reconstructs all13 route permutations, boss depths,
cell coverage and reach/skip expectations without trusting the native expected
field. Source/native/contract identities match. Scoped Clippy with warnings
denied and rustfmt pass. Native matrix0.023s; not a performance benchmark.

Examples:

- Mother moved toD8: recordD6/startD1 should reserve fire but does not; at
  recordD33/startD9 the same drill wrongly reserves fire after skipping her.
- Mother moved toD18: recordD15 should not reserve yet, but does; at
  recordD33/startD14 it omits fire for the still-upcoming Mother.
- Equivalent early/late Queen routes wrongly omit or reserve silence.

Cause: the drill branch in `packages::quartermaster` calls the canonical
`descent::boss_depth`; the pen branch calls `l.rules().route().boss_depth`.
The existing Queen reach/skip tests cover only the base route. The scoped fix
and additional actual restock/send/parity gates are in
`docs/CUT284_ROUTE_COUNTER_PACKING.md`. Source-level reasoning alone did not
count as reproduction: all198 measured outcomes are retained in `routes.json`.

An initial **fixture** mistake called base-only `light_waystones` before a
non-base public start. The legal API refused `D5 not lit`, before any matrix
result was written. The corrected fixture uses `light_waystones_on(best, route)`.
`failed-fixture-setup/` and `initial-probe.rs.txt` preserve the failed source,
native hash and output. No game code or expected behavior was weakened.

## Fixed runtime evidence

`fixed/routes.json` measures0/198 mismatches. `archive_after.py` checks exact
cell coverage and confirms only the32 faulty drill cells change;166 other cells
are identical. `fixed/frozen-contract.md` preserves the validation contract's
exact bytes. The original pre-fix matrix and source/native snapshots remain.

`validation/` records three focused regressions passing,1095 workspace tests
passing/6 ignored, all-target Clippy warnings-denied, format/lint/types/copy,
new WASM identity and native settlement4/4 unchanged (including full after-saves).
`gold-settlements/results.json` is the real-WASM browser564-check/24-case result.
These legacy stress widths are functional settlement evidence, not current
phone visual acceptance. The cold builds and browser ran beside other host
jobs; their timings are not a benchmark.

`wasm-bridge/` contains six controlled actual public sends and exact in-flight
reload receipts: moved early/late Mother and Queen plus two base controls.
Counters and at least two heals are physically in each run's inventory. Inputs
and complete after-saves are compressed; hashes and actual routes match.
This is direct module/bridge evidence, not browser-render acceptance or earned
play. WASM7547021 bytes/SHA2561f9206e6…; default settlement manifest
`settlements-inputs-1f92.json` matches it.

Initial checker scaffolding errors are preserved: a nonexistent report field
in the first test build, omitted empty `kit` and `Run.route` serialization
assumptions in the JS fixture, and a browser launcher run outside `web/`.
They were corrected in test setup/checks; no game threshold or expected
counter behavior was weakened. The final archive treats omitted base route as0,
as the actual save schema does.

The fix changes only drilled reach/skip lookup to the active route. Guide gap4,
held upgrades and recovery stay as before. Full-game balance/rare/fun acceptance
and deployment are not claimed; the inherited base-route failures remain open.
