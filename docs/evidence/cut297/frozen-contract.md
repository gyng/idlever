# Cut297 — package the WASM Cargo actually built

2026-10-21. Cut296 reproduced fast WASM compiling under CARGO_TARGET_DIR while
wasm-bindgen read the older fixed target/wasm32-unknown-unknown artifact.

Contract: resolve Cargo's effective target directory through its metadata, as
the shipping cache already does, and quote the resulting input path. Preserve
fast profile/debug settings and shipping behavior. Support default, relative
and absolute environment overrides (including spaces), and Cargo configuration.
Metadata/build failure must stop packaging and preserve existing output.

Verification: behavioral wrapper regression in a disposable directory with
separately marked current/stale artifacts must fail on the old script, then
pass on the fix. Include failure paths. Also run actual fast builds in the
existing isolated target and default target; compare packaged WASM and public
earned native/WASM checks. Syntax/format/lint checks pass. No game truth changes,
new balance acceptance, full/exhaustive claim or deployment.
