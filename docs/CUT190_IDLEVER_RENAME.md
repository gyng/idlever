# Cut190 — Idlever

Owner request: rename the game and repository to Idlever for search visibility;
update references and regenerate the title artwork in the established style.

## Contract

- Public game name, menu title, page title, manifest, README, current developer
  guides and repository metadata say Idlever. Update current GitHub/Pages URLs.
- Generate a transparent IDLEVER wordmark with the built-in imagegen tool, using
  the approved original title as its style reference. Preserve readability,
  palette and flourish margins; record the prompt and asset hashes.
- Add factual page description and canonical/social metadata for the new URL.
- Rename GitHub repository to `gyng/idlever`, update origin and build for `/idlever/`.
  Publish a new alpha through the release-only workflow and verify the live site.
- Owner amendment: backwards compatibility is not required. Rename active
  crates, WASM modules, browser globals, events, storage keys and diagnostic
  markers consistently. Add no legacy aliases or migration code. Keep actual
  local paths valid and preserve immutable historical evidence/prior tags.
- Formatting, lint, types, copy, appropriate core/export checks and focused
  real-WASM menu/save/PWA checks pass. Review screenshots at320/400/1440px.
- Release build/deployment pass; served files match its artifact. New title,
  new-town construction and saved-game reload work at the new public URL.

Content/rating work remains paused. Search rankings are not claimed or measured.
Prior release tags remain immutable. GitHub redirects repository links after
rename; project Pages URLs do not receive the same automatic redirect.

## Results

The repository is renamed to `gyng/idlever`; origin and Pages metadata use
`https://gyng.github.io/idlever/`. The Pages environment still permits `v*` tags.

Local checks pass: 822 Rust tests (6 ignored), 17 dayplayer example tests,
27 tooling tests (1 optional native-profile test skipped), formatter/linter,
types, copy checks and default Clippy. Production real-WASM/PWA checks pass:
scoped assets, offline reload, fresh house/hero and direct saved-game reload.
Private D3D12/NVIDIA screenshots pass at320/400/1440px; primary button104px.

The first full client run passed124/125 in392.6s. Watch-live-edge exceeded its
12s timing limit while the native example test overlapped the browser audit.
An unchanged isolated rerun passed10 checks in26.7s after native completion;
causation of the original failure is not proven. A full repeat is in progress.
Both results are preserved; no timing gate was weakened. A separate obsolete
watch-control mock was updated to use the existing atomic browser API; its
runtime helper is unchanged and all tooling tests pass.

Shipping WASM:4,923,001 bytes, SHA256
`0527ac49dae9fd261e4fdbea67c2ec83b507929d42f605285ef3ad72e24e1529`.
Raw fixture and preset bytes are unchanged. The branding/namespace changes do
not tune gameplay; the full native balance audit was not rerun.
Artwork source and runtime hashes are in `art/menu/idlever-wordmark-v1.json`.
Evidence: `docs/evidence/cut190/`. Alpha.2 deployment and live proof follow.
