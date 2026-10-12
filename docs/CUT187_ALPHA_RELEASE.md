# Cut187 — first alpha release

Owner request, 2026-10-12: repair GitHub Pages, deploy from releases instead of
main, and publish the first alpha. This authorizes publication; the broader
content and fun-rating work remains paused.

## Contract

- Publish `v0.1.0-alpha.1` as a prerelease from the tested commit.
- Release publication builds its exact tag and deploys that artifact. Stable
  releases and prereleases use the same path.
- Main pushes, pull requests and manual runs validate without deployment.
- Pages permits version tags. Production deployments serialize and do not
  cancel each other; unrelated branch checks cannot cancel a release.
- Release CI passes engine tests, dayplayer tests, clippy, copy lint and the
  production frontend build with real shipping WASM at `/riddle/`.
- Verify the published site loads its tagged JavaScript and WASM. Record the
  actual release, workflow and validation results below.

## Failure diagnosis

Run38067703624 failed during the frontend build: report.ts referenced `earned`
and `spent_by_workers` on a type that lacked them. Later commits already fixed
this mismatch, with successful builds. Its deploy job never started.
The current workflow separately required manual main deployment; the Pages
environment allowed only main. Both must change for tagged releases.

## Validation

Published prerelease: [v0.1.0-alpha.1](https://github.com/gyng/riddle/releases/tag/v0.1.0-alpha.1),
source `29752da931cd21ba7fab1b8ae90b44b10cbc6a54`.
Release deployment run: [38270161875](https://github.com/gyng/riddle/actions/runs/38270161875).
Build and deployment pass. The live HTML, service worker, JavaScript, CSS and
WASM match the release artifact byte-for-byte (seven production files checked).
All262 files in the release artifact also match the successful main CI build.
Private D3D12/NVIDIA browser smoke passes: title art,104px primary control,
new house/hero, real WASM, exact saved-game reload and direct return to play;
zero page errors or failed HTTP responses. Live screenshots and smoke record
are under evidence/cut187/live/.

Local final verification passes (822 Rust tests, 14 tooling tests, formatter,
Oxlint, types, copy, Clippy, shipping WASM, build and native current-game
regression). Full client repeat passes 125/125 in 371.1s, default 12-browser
pool, with all 840 recorded inputs unchanged. An earlier full run failed
124/125 with a class-tree confirm-click timeout; the unchanged isolated test
and complete repeat pass, but the initial cause remains unproven.

Raw records: [evidence/cut187](evidence/cut187). Routine current-game checks do
not certify the explicit exhaustive balance/migration audit or a fun>=80
verdict. Those limits are recorded in release notes.
