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

Pending. Routine current-game checks do not certify the explicit exhaustive
balance/migration audit or a fun>=80 verdict. Keep those limits in release notes.
