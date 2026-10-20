# Route counter-packing reproduction — 2026-10-20

**Confirmed mechanic bug; production fix pending.** Controlled fixtures, not
earned play, pacing, UI or fun evidence. `route_counter_probe` exercises all13
valid routes, Mother/fire and Queen/silence, just outside/inside reach, crossing
and skipping the actual boss where a later waystone exists.198 cells compare
the same drilled and pen-authored item requirements. The source/native hashes
are in `identity.json`; the runtime's core sources are unchanged from the
current game. Game rules have not been patched while Cut283's study runs.

Result:32 drilled mismatches,16 missing counter reservations and16 unnecessary
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
