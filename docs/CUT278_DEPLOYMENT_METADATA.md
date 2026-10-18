# Cut278 — deployment metadata

Owner request, 2026-10-18: implement the `meta.json` contract from
`/home/g/p/games-index/README.md` for Idlever's published builds.

## Contract

- Each deployment artifact contains one `meta.json` at its public base: `/` on
  Cloudflare and `/idlever/` on GitHub Pages. Schema version is integer 1.
- `updatedAt` is generated once when preparing that deployment artifact, in
  exact UTC `YYYY-MM-DDTHH:mm:ssZ` format. Requests never regenerate it. A
  rollback prepared for redeployment gets a new timestamp and the restored SHA.
- `commit` is the full checked-out Git SHA. Only a known release tag supplies
  optional `version`; the web package's placeholder version is never used.
- Cloudflare serves JSON with `Access-Control-Allow-Origin: *` and
  `Cache-Control: no-cache`. Keep the existing asset/SW headers.
- Metadata is never precached or served/stored by the service worker, including
  URLs with query strings and direct navigation. Old cached metadata is bypassed.
- Focused artifact/identity/header and service-worker tests pass. No deployment,
  gameplay, save, or UI changes are part of this cut.

## Hosting limits

GitHub Pages serves static JSON with its own response headers. This workflow
does not configure a Pages cache override; Cloudflare `_headers` only applies
on Cloudflare. This change does not certify Pages cache policy;
its live headers require verification after a future release. The index already
uses a revalidating fetch and gracefully omits unavailable metadata.

## Initial publisher validation — 2026-10-18

Seven focused Node tests pass, including a real CLI invocation, both bases,
header preservation, and the current/older-worker bypass. Shell syntax, scoped
formatter/linter and real Vite artifact checks are recorded by the implementing
agent. Real Vite builds at `/` and `/idlever/` each have 18 precache entries,
include real WASM, exclude metadata, and accept the generated deployment JSON,
headers and worker guard. Seven tests also pass on CI-matching Node22.18.0.
Existing unrelated large-chunk/dynamic-import warnings remain. Deployment and
live metadata header acceptance are explicitly out of scope.

Read-only hosting observation, 2026-10-18T15:12:05Z: a HEAD request to
`https://gyng.github.io/idlever/art/atlas.json` with Origin
`https://games.awoo.party` returned HTTP200, JSON content type, public CORS,
and `Cache-Control: max-age=600`. This measures an existing JSON asset, not
the future metadata endpoint. The Pages no-cache contract remains a host limit;
this cut does not claim to override it.


## Additive spec update — 2026-10-19

Source: `/home/g/p/games-index/README.md` at `1768dbf`. Schema remains integer
**1**; no schema version bump is introduced. New optional public fields are
`changelogUrl` and `previewImage: { url, alt }`. Links must be nonempty HTTPS
or relative URLs, resolved against the configured metadata URL, with no embedded
credentials. Preview descriptions are nonempty plain text. A preview must show
representative gameplay and load/decode before replacing the index fallback.

The Idlever deploy CLI now publishes its public release-list URL as
`changelogUrl` and copies an owned WebP screenshot into the deployment artifact
before referencing it as `preview-<content-sha256-prefix>.webp`. The relative
filename resolves correctly at both supported bases. The helper validates optional
fields before stamping metadata, while callers may still omit them. Replacing
the owned image bytes changes the published filename automatically.

No metadata headers, deployment hooks, SW bypass or precache contract changes
are needed for these optional fields. Cloudflare retains JSON/CORS*/no-cache;
the Pages hosting limitation above remains. The existing image response uses its
`.webp` content type and has no new embedding restrictions.

Focused validation on Node22.18.0: publisher **9/9**, existing games-index
consumer **14/14**, and a direct publisher-to-current-consumer artifact check
passes at `/` and `/idlever/`. The consumer already supports independent date,
preview and changelog validation, metadata-relative URLs, index override
precedence, five-second decode timeout, bundled-image fallback and reserved date
rows; its concurrently maintained checkout is unchanged by this update.
The public release-list URL returned HTTP200 without credentials. Scoped
formatter/linter, shell syntax and diff checks pass. No new app build, WASM,
package mutation, deployment, or gameplay/UI acceptance run was performed.

The final preview replaces the staged historical index image with
[evidence/cut279/gameplay-800x500.png](evidence/cut279/gameplay-800x500.png),
captured at `2026-10-18T16:47:40.472Z` (2026-10-19 Singapore), 800×500 CSSpx,
DPR1, private-Xvfb GPU Chromium. It shows Rook Ash exploring/picking up loot
beside a rat on D1, run133; no menus or loading screen. Actual shipping WASM
`97afc855272bd3900fad9e937dad265ea40d661602d6f9886ec5a1e8ea880ccf`
was delivered identically three times with no page errors. Exact fixture/input
identity and live state are preserved in
[the capture record](evidence/cut279/gameplay-800x500.json).

`tools/assets/idlever-preview.webp` is a lossless WebP conversion, verified to
match the source's decoded RGBA pixels at 800×500. Its updated alt describes
the fighter, pickup and rat in the first-floor corridor. This asset is ready for
publication; the capture supports this preview's subject and provenance, not
broader gameplay, mobile-browser or UI acceptance. The prior screenshot remains
historical in the games-index checkout. Publisher nine-test/scoped checks were
rerun after replacement; no app rebuild, commit or deployment was performed.
