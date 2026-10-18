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

## Validation

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
