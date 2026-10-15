# Choice-check current-cost diagnostic tests

Baseline `CARGO_BUILD_JOBS=4 cargo test --profile fast -p idlever-core --example choice_check`
failed2/3 tests: fixtures still funded the former three-rank54-point tree.
The failure log is preserved in `choice-check-tests-before.log`.

Only the example's test module and explanatory developer docs changed.
Production path preparation still completes requested roots to the cap and
refuses an unaffordable full path before playing any case. It is not an
all-affordable partial-spend policy. Current reference totals are20,265 for
one root and60,795 for all three. Real pre-purchases reduce the remainder;
independent residents, Gold and the original source remain unchanged.
Funded away refusal asserts the named reason rather than accidentally passing
because points were insufficient.

The same test command now passes3/3 (compile6.19s, tests0.08s), retained in
`choice-check-tests-after.log`. Default `cargo clippy --workspace --all-targets
-- -D warnings` passes after the edit (`choice-check-clippy.log`).

The main/upgrade_path prefix is byte-identical to the prior committed version.
SHA256: 3b71b07ecbaf311288b5caebc4b881293a6026b009c9fd8a8058275911cd342a.
No gameplay, balance, WASM, dayplayer or output-format change. Historical30-case
native/WASM comparison evidence retains its original scope and was not rerun.
