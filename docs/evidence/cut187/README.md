# First alpha validation

Tested source: `29752da931cd21ba7fab1b8ae90b44b10cbc6a54`.
Release: `v0.1.0-alpha.1`. Content and rating work remains paused.

- `native-fresh.log`: fresh current-game native regression passes; full
  verification including shipping WASM took942s.
- `final-verify.log`: final checks after default formatting/lint fixes pass;
  native simulation caches reuse the unchanged compiled game/harness.
- `client-first-failed.log`:124/125; class-tree confirmation timeout.
- `class-tree-isolated.log`: unchanged class-tree test passes alone.
- `client-repeat.log` and `client-repeat.json`: complete unchanged125/125
  pass,371.1s, default12-browser pool. Raw output retained for every group.
- `validation-inputs.json`:840 source/asset/WASM inputs, compared unchanged
  before/after the complete audit. Initial timeout cause remains unproven.

`release-ci.json` records successful tagged build/deployment; `main-ci.json`
records successful main validation with deployment skipped. `live-files.json`
verifies seven served production files against the release artifact.
`artifact-comparison.json` verifies all262 main/release artifact files match.
`live/` contains the actual deployed-site screenshots and passing browser smoke.
The exhaustive balance/migration audit and fun>=80 goal are not certified.
