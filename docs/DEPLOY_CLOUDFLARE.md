# Cloudflare dev deploy

https://dev.idlever.awoo.party/ is a dev copy of the site on Cloudflare,
separate from the GitHub Pages releases at https://gyng.github.io/idlever/
(docs/CUT187_ALPHA_RELEASE.md). It mirrors the sibling project armee: a
Cloudflare Worker with static assets, attached to the `awoo.party` zone as a
custom domain through `routes` in `wrangler.jsonc`. There is no worker code.

| Item          | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| Worker        | `idlever-dev` (account 3445be9c6a5726f85b6c21f4dca994b8)        |
| Custom domain | https://dev.idlever.awoo.party/                                 |
| Default URL   | https://idlever-dev.gyng.workers.dev/                           |
| Config        | `wrangler.jsonc`                                                |
| Build base    | `/` (`IDLEVER_BASE=/`; Pages uses `/idlever/`)                  |
| Deploy        | `tools/deploy-cf.sh [REF]` by hand; no CI workflow              |

## Redeploy

```sh
tools/deploy-cf.sh            # HEAD
tools/deploy-cf.sh v0.3.0     # any committed ref
tools/deploy-cf.sh --dry-run  # build and check only, keep the worktree
```

The script never ships the working tree. It checks out the ref in a temporary
`git worktree`, installs web dependencies, builds the shipping engine
(`tools/wasm.sh --ship`, release wasm-pack and wasm-opt) and the site with
`IDLEVER_BASE=/`, then checks the build: a `.wasm` is in `dist/assets`,
`index.html` loads `/assets/…`, the bundle carries the clean 12-character
commit (no `-dirty`), and `sw.js` has its precache list. It writes
`dist/_headers` (hashed `/assets/*` immutable for a year; `sw.js` no-cache;
everything else Cloudflare's default `max-age=0, must-revalidate`) and runs
`wrangler deploy --assets <dist> --message "idlever <commit>"`. Cargo builds
go to `target/deploy-cf` so they reuse compiled crates without racing the main
checkout. `CARGO_BUILD_JOBS` defaults to 8. A deploy takes a few minutes, most
of it wasm-opt.

`html_handling` is `none`, so `/index.html` is served directly with status
200, and the script's `dist/_redirects` rewrites `/` to it (status 200, no
redirect). Cloudflare's default would answer `/index.html` with a 307 to `/`.
The service worker would then precache a redirected response, which the
browser rejects for an offline page load. Unknown paths return 404.

Authentication is wrangler's own: `wrangler login` (OAuth, stored in
`~/.config/.wrangler`) or a `CLOUDFLARE_API_TOKEN` environment variable with
Workers edit rights and the `awoo.party` zone, as in armee's CI. Never commit
a token.

## What is live

Run `wrangler deployments list --name idlever-dev`. Each deploy message names
the commit, and the in-game debug export shows the same commit. The site footer
shows the build date.

First deploy, 2026-10-18 (Worker version `31f9d1a2-d302-4c92-9c99-1cc8ad567d57`):
commit `ddabdfd7cfbe`, wasm
`idlever_wasm_bg-bEVCT9Zp.wasm` (sha256 `c6eaee4dcd80d358…`, 5,362,245 bytes).
