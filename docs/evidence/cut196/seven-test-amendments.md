# Seven narrow Cut196 test amendments

Scope: endgame.rs, gunner_tests.rs, tests_cut28.rs, tests_cut305.rs,
tests_cut118.rs, tests_cut119.rs, and one prospective projection test in
tests_cut30_pkg.rs. No fixture bytes, runtime APIs, package or UI changed.

- Endgame: atomic ordinary settlement proves no pending Keep and does not
  impersonate a dungeon clear. Live, unfinished-absence, uncleared and invalid
  progress requests still preserve exact saves on refusal. An explicitly
  recorded clear can start its next numbered descent without Keep confirmation.
- Gunner: retains paid-once price/ownership, home-only selection, optional stow,
  restored-run equality and next-send backup. Inspect the actual step Exit
  receipt, prove no kit find/conversion, no repeat spending and exact carry/wake
  income; no obsolete pending-Keep dereference.
- Cage: explicitly claim accepted finds' first value and note their identities
  before adding them. Prove full alive carry, one converted cage-find record,
  preserved original find metadata, one Forge discovery per kind, no duplicate
  vault object and idempotent settlement.
- Guide: a one-Gold Return and timed-out Return are actual income under full
  alive settlement. Expected kept value is independently secured+loot alive,
  secured only on death. Passage still cannot pay twice; every existing cohort
  case retains its sent/paid accounting assertion.
- Historical307dbed fixture: retain its bytes and historical golden evidence.
  Compare independent current-runtime loads and a save/load continuation over
  ten seeded delves, then compare exact final saves. Do not paste the newly
  observed hash into a golden assertion.
- Projection: prove atomic death leaves no Keep transaction, then retain every
  archived-fight/index/prospective baseline/cache invalidation assertion.

Initial seven-case run:4 passed,3 failed. Gunner fixture wrongly read the
consumed last_exit instead of the emitted Exit event; corrected seam rerun is
separate. Both strict historical-fixture roundtrip checks exposed a genuine
serialization defect: town.manual false was omitted by skip_serializing_if,
then defaulted true on reload. Root was notified before any assertion change.
Strict state equality remains. Raw failures: scratchpad/cut196/seven-amendments.log; byte-preserving gzip
archive seven-first.log.gz has raw/compressed hashes and verified decompression
in seven-first-provenance.json.

Root fixed the Town.manual serializer to preserve explicit false while retaining
true as the missing-field default. Final seven-case targeted run passes7/7
(0 ignored) in5.34s; exact current-runtime fixture roundtrip and final-save
comparisons are preserved. Sidearm event-receipt rerun also passes1/1.
No fixed post-pivot golden value was introduced. Runtime/test/fixture source
hashes accompany final proof; no full workspace/queue acceptance is claimed.
