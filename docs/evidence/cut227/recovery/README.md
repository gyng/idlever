# Cut227 death-recovery search (owner decision 2026-10-14) — WIP, parked

The goal: the shortest `persistent::RECOVERY_TICKS` that restores "TUNED beats PICKED by ≥ 15 % at D33"
(16 seeds) without breaking any other routine gate. GATES_THREADS=16 throughout.

## Bug found and fixed: the carried-rest cap bypassed recovery

`offline::begin_absence` clamps carried rest to `REST_CARRY_TICKS` (6000 ticks, 10 min). Once recovery runs
longer than 10 min, that clamp silently cut the death recovery still owed at each absence boundary. With
the Scout, the hero then left with recovery outstanding. Without the Scout, the absence stalled with
`remaining > 0` and `rest_left == 0`. At 600 ticks this never showed. Fix in `offline.rs`: the clamp now keeps
`max(owed recovery)`. The core test `first_unscouted_defeat_recovers_through_actual_session_wall_clock`
caught it. Every run made before the fix is in `pre-carry-fix/` and is now superseded.

## Post-fix table (current source; files `recovery<V>-*.log`)

| ticks (min) | TUNED/PICKED D33, 16 seeds | automation-pays (routine 2 seeds) | qa 10 seeds (forecast bank vs sends, good set) |
|---|---|---|---|
| 7500 (12.5) | 1.00 FAIL | PASS (29.71 vs 29.07) | PASS |
| 9000 (15) | 1.17 PASS | PASS (30.18 vs 28.71) | FAIL (0.563 vs 0.605 ±0.041) |
| 10500 (17.5) | 1.17 PASS | FAIL (D18 48 vs 36 h; mean best 29.04 vs 29.57) | FAIL (0.580 vs 0.625 ±0.040) |
| 11250 (18.75) | 1.17 PASS | FAIL (29.04 vs 29.04) | PASS |
| 12000 (20) | 1.17 PASS | PASS (29.64 vs 29.39) | PASS |

Pre-fix, fail-fast at 16 seeds: 3000 and 6000 settle at ≤ 1.07, FAIL. Recovery below 10 min is unaffected
by the fix, so those results still stand. The baseline at 600 (pre-fix, unaffected) passes automation-pays
(30.18 vs 29.00) and qa (0.608 vs 0.588).

The qa row and the 2-seed automation-pays row both behave like noise as recovery changes: their binomial
band and their 24 h check-in granularity flip pass/fail with no trend. Neither was weakened. **12000 (20 min,
the old wake) is the only value tested that passes all three.** The source is committed at 12000.

## Done in this WIP commit

- `RECOVERY_TICKS = 12000`. Core tests now derive from the constant instead of literals (persistent,
  legendary, tests.rs `death_keeps_nothing…`, bloodlines unchanged). The journal copy reads minutes
  ("Recovery finishes in N minutes"). Camp/hero-life copy uses `spanOf` ("Recovering 20m").
- Carried-rest recovery bypass fixed (`offline.rs`).
- Routine RANDOM-vs-PICKED on 16 seeds: dayplayer `--random-seeds N`, which plays RANDOM and PICKED on N
  seeds for that row only. Other rows filter to the first `--seeds`. `tools/gates.mjs --full` (not
  exhaustive) passes `--random-seeds 16`, which is part of the cache key. Verified in the pre-fix routine run:
  16/16 · 16/16 · median +4 · +28 h PASS.
- Docs: AGENTS.md owner amendment; DEV_VALIDATION_TIERS.md; CUT211 amendment (**its text still says 10500,
  so update it to 12000**).
- New generator `examples/recovery_fixtures.rs` and fixtures in `fixtures/`. **These were generated at 10500,
  so regenerate them at 12000.** Settlement after-saves in `settlements/` were also generated at 10500 by
  `gold_settlement_repin`, with Gold and ledger unchanged and only the recovery tick fields differing.
  **Regenerate them.**

## Not verified / next steps

1. Update the CUT211 amendment to 12000 and its table (above). Regenerate the fixtures:
   `cargo run -q --profile fast -p idlever-core --example recovery_fixtures -- <three-actual.game.json> docs/evidence/cut227/recovery/fixtures`
   (input: gunzip `docs/evidence/cut218/three-actual.game.json.gz`), then gzip. Fixture names become
   `controlled-reincarnating-12000` and `controlled-recovering-11990`.
2. Web tests still use 10500 values. In `hero-life.mjs` change 1050 → 1200 and the state names. In
   `hero-life-camp.mjs` change the 1050 fixture name and `/Recovering 18m/` → `/Recovering 20m/`. In
   `home-resident-phases.mjs` change advance 1050000 → 1200000.
3. Native tests: last full run (at 10500, before some test fixes) had 7 failures. All were fixed except
   `tests::dice_death_names_an_alternative_below_the_bar`: a 4 h offline window per seed now has far
   fewer deaths, so no telegraphed dice death appears in 24 seeds. Widen its seed chunks or window, and
   leave its assertions as they are. Rerun `cargo test -q --workspace --profile fast` and clippy (clippy
   was clean at 10500).
4. Run the full routine gate `GATES_THREADS=16 node tools/gates.mjs --full` at 12000 on final source.
5. `tools/wasm.sh`. Write a new gold-settlements manifest: copy
   `docs/evidence/cut226/settlements-inputs-fd56.json`, then set the new wasm `{bytes, sha256}` and, for each
   entry, `afterHome` / `afterRawSha256` / `afterHomeSha256` pointing at the regenerated
   `settlements/*.after.session.json.gz`. Switch the default in `web/tests/gold-settlements.mjs`.
6. `(cd web && pnpm -s test)` and `node tests/run.mjs hero-life class-tree class-styles`, plus
   hero-life-camp, home-resident-phases, home-residents and gold-settlements.
