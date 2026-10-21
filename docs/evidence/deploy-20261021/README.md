# Idlever release checkpoint — 2026-10-21

Owner instruction: get completed work merged, pushed and deployed. Source
`510bd647c137447ca19c7ffcb9664c1dd340aeec`, prerelease `v0.1.0-alpha.3`.

All43local branches were audited. Completed menu/terrain/worker changes on
non-ancestor branches have equivalent patches in main. The remaining distinct
Bank/Vat branch is the rejected historical implementation, already preserved
and superseded by the isolated redesign; it is not restored. Old dirty
worktrees and unrelated untracked art/evidence were left intact. Main pushed
successfully; no pending PR was returned by the read-only PR query.

Cloudflare publishes the exact clean committed build. Its disposable worktree
was removed only after preserving394artifact files and their hashes, and
checking seven live files byte for byte. Metadata, preview, real-WASM startup,
new town, exact hero/seed reload and zero page/network/HTTP errors are verified
on the public custom domain. See observations.md for browser geometry, scope,
resource failure/correction and settled visual review.

GitHub Pages is published by the prerelease's exact-tag workflow. The deployment
status and final public artifact verification are recorded in deployment.json.
A receipt/documentation commit may follow the deployed source; it changes no
product source. It must not be described as the deployed product commit.

Validation:1104native tests pass/6ignored;108tooling tests and cache checks pass;
format/lint/type/copy checks pass. Main CI passes on exact source. The initial
local tooling run used the ambient Node26inside the sandbox and failed child
spawns with EPERM; documented Node22with approved child-process permissions
passes. Original logs are retained. No game source changed to obtain a pass.

The current175group client audit is NOT certified green. Final state and
per-group failure summaries are retained:144/175pass,31fail;169fresh groups
(138pass/31fail) plus6same-identity reused passes. A /tmp-full initial run was stopped
and its exact-identity failed/unfinished groups resumed at pool3after cleanup;
reused passes remain labelled. Independent six-save current native/deployed
WASM24h parity confirms the wish-retirement failure uses an old full-save
reference, without weakening that test. Other UI/copy/interaction/timing
failures remain open. Release notes disclose the limitation. No complete
client/exhaustive balance/fun acceptance or upgrade-redesign adoption is claimed.
