# Cut297 — fast WASM target-directory correctness

Cut296 exposed a stale-module hazard: Cargo honored CARGO_TARGET_DIR while
wasm-bindgen read the fixed default target. The fast wrapper now obtains Cargo's
effective target_directory through metadata before packaging and quotes the
artifact path. Existing shipping code already resolves metadata and is unchanged.

`tools/wasm-target.test.mjs` executes the actual shell wrapper in disposable
workspaces with external Cargo/bindgen stubs. Distinct CURRENT/STALE module
contents detect the original bug. Seven cases cover default/relative/absolute
paths (including spaces), Cargo configuration, environment precedence, and build/
metadata failures that must leave the old package untouched. The retained old
script passes two controls and fails five; the fixed script passes all seven.
The tests run in quick verification and Pages CI. Initial sandbox subprocess
failures are retained separately and do not count as red/green implementation
results. Permission to spawn local processes allowed the actual regression runs.

Two actual fast builds (CARGO_TARGET_DIR=target/cut291-native and default) produce
identical five-file packages, captured in package.sha256. The isolated build
also matches native for all three original Cut296 earned branch eight-hour
reports and whole after-save bytes. The existing Cut296 wasm-check.mjs is the
producer; isolated-wasm-results.json records the fresh run. Actual Cargo metadata
resolves a configured path with spaces as recorded in metadata-config.json.

The package remains7111856bytes, SHA
d5dd4c1819e351cdc67fe78bd8ce9f7e9b2b5ec35bd5639a3c14c49b4bde8ecb;
no settlement repin or new gameplay acceptance is needed for identical bytes.
Bash syntax, formatting and lint pass. No fresh timing benchmark, shipping build,
Rust tests, browser suite, balance/full/exhaustive or independent fun claim.
Held Bank/Vat W2, recovery and Guide gap4 unchanged. No deploy. All jobs terminal.

Reproduce with `node --test tools/wasm-target.test.mjs`; set IDLEVER_WASM_SCRIPT
to this directory's wasm-before.sh for the intentionally failing old behavior.
Raw test/build logs and source/evidence hashes are retained here.
