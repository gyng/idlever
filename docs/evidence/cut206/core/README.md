# Cut206 controlled core inputs

These fixtures test API boundaries. They do not prove earned progression.
The example `cut206_fixtures` controls the map, cage contents, qualification,
HP and monster setup. It calls real opening, choice, timeout, learn, action and
settlement routines; it never constructs a receipt or event.

Browser inputs are `cage-active.game.json.gz` and `skill-before.game.json.gz`.
Read with Node `gunzipSync(readFileSync(path)).toString()` and pass the result
to the real engine's `load`. Game saves are accepted by Session load.

The cage save is active at turn1 with three choices and50 ticks left. Calling
`choose(901)` takes mail: raw30 becomes7 carried coins with2 raw remainder.
A second `choose(902)` refuses. Real Return settlement changes500 Gold to507
with no Keep prompt. On a fresh load, `setVaultPref("potion")` and `step(50)`
take item902 after the actual grace period: raw12 becomes3 carried coins.
The unknown potion's visible name is `black potion?`, preserving its identity.

The skill save contains publicly learned Warden and Recovery. Fixture setup
qualifies the Fighter at level8/historicalD18, then sets20/40HP and an adjacent
goblin. Calling `step(1)` really heals HP20→35 and emits `second_wind` with
`skill: {id: "fighter_recovery", name: "Recovery"}`. The archive contains the
before/after snapshots and events as a one-tick replay window. That window is
explicitly not a held-run replay capsule: controlled setup happened after send.

`controlled-fixtures.tar.gz` retains every raw save, snapshot and event file.
Each file was read back and SHA256 checked against its original bytes. Exact
API expectations, hashes and limitations are in `fixture-manifest.json`.
