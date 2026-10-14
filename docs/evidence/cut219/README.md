# Cut219 evidence in progress

`checkpoint-e0bf9efb-ci-failure.log` is the exact `gh run view 38449617555
--log-failed` output for pushed e0bf9efb. It records a clean893-pass native
workspace run and the separate obsolete dayplayer example failure; subsequent
shipping steps did not run.

`dayplayer-free-preparation-focused.log` preserves the complete nonempty stdout
chunk of Root's terminal67995 focused check. Command:

```sh
cargo test -q -p idlever-core --example dayplayer --profile fast patch_consumer_full_preparation_applies_nothing_and_free_success_carries_supply
```

This candidate-source test verifies full preparation refuses atomically, a
historical quote cannot charge unlocked heal reuse at zero Gold, and repeating
an already-written patch changes nothing. It does not certify the whole
dayplayer suite or staged progression/balance. Full candidate source identity
and acceptance evidence will be added after the current source freezes.

`dayplayer-patch-consumers.log` records all six related patch-consumer checks
passing, with eleven unrelated example checks filtered out. Command:

```sh
cargo test -q -p idlever-core --example dayplayer --profile fast patch_consumer_tests::
```

This covers authored priority, insertion/removal/replacement, landed fixes and
the free-preparation regression. It is still not the full example suite.

Root's controlled causal-fixture investigation retains its failed attempts:

- `causal-death-notes.log`: original cause filtering assertions pass after
  explicitly supplying the fixture's legal Forge/leash setup.
- `causal-forecast-and-slot-xp.log`: two forecast/theft cases pass unchanged;
  XP attribution still fails. The forecast gain bar and zero-gain historical
  root assertions were not reduced.
- `slot-xp-public-class.log`: public class refit alone does not make the Rogue
  survive; retain this failed experiment.
- `slot-xp-actual-returns.log`: explicit controlled pen access and short actual
  Return rules give both classes alive completions. The original positive XP,
  absent-slot zero XP, class attribution, save/wire and later absence assertions
  pass without XP grants. This is attribution proof, not class balance proof.

The later clean full-native run includes all four corrected cases. Engine and
UI pacing acceptance remains separate; a fortnight stall check currently fails.

The full candidate dayplayer example run is preserved in
`dayplayer-all-first.log`:16 pass/1 failure in121.43s. The reserve test's old
fixture attempts to build Forge before its new eligibility gate, so its failure
is `not ready` before the reserve assertions run. The controlled fixture now
explicitly supplies an eligible plot and still constructs through the public
operation. All original spending, reserve, disabled-system and automated-work
assertions remain. `dayplayer-forge-before.log` retains the focused failure;
`dayplayer-forge-after.log` passes the amended case. The subsequent clean full
rerun is terminal PASS:17 passed,0 failed in `dayplayer-all-final.log`.
This is example correctness evidence, not acceptance of the failing fortnight
pacing requirement.
