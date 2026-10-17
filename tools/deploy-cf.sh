#!/usr/bin/env bash
# Build a committed ref in a temporary worktree and deploy it to Cloudflare
# (Worker "idlever-dev", static assets only, https://dev.idlever.awoo.party).
#   tools/deploy-cf.sh [REF]            build REF (default HEAD) with IDLEVER_BASE=/ and deploy
#   tools/deploy-cf.sh [REF] --dry-run  build and check only; keeps the worktree and prints its path
# The working tree's uncommitted edits never ship: the build runs in a clean `git worktree`.
# Auth: `wrangler login` (OAuth) or CLOUDFLARE_API_TOKEN in the environment. docs/DEPLOY_CLOUDFLARE.md
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
ref=HEAD dry=0
for a in "$@"; do case "$a" in --dry-run) dry=1 ;; *) ref=$a ;; esac; done
sha=$(git -C "$repo" rev-parse --verify "$ref^{commit}")
short=${sha:0:12}
wt=$(mktemp -d "${TMPDIR:-/tmp}/idlever-cf-XXXXXX")
cleanup() { [ "$dry" = 1 ] || git -C "$repo" worktree remove --force "$wt" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$repo" worktree add -q --detach "$wt" "$sha" >/dev/null
# A persistent, separate target dir: reuses compiled deps across deploys without racing the
# main checkout's own release builds. CARGO_BUILD_JOBS keeps a deploy polite on a busy box.
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-$repo/target/deploy-cf}
export CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-8}
cd "$wt"
pnpm --dir web install --frozen-lockfile --silent
tools/wasm.sh --ship >/dev/null
[ -d web/src/engine/pkg ] && [ ! -L web/src/engine/pkg ] || { echo "deploy-cf: engine pkg missing or a symlink" >&2; exit 2; }
IDLEVER_BASE=/ pnpm --dir web -s build >/dev/null
dist=$wt/web/dist
# Checks: the real shipping engine, root asset paths, a clean build commit.
wasm=$(find "$dist/assets" -name '*.wasm' | head -1)
[ -n "$wasm" ] || { echo "deploy-cf: no .wasm in dist" >&2; exit 2; }
grep -q '"/assets/' "$dist/index.html" || grep -q "src=\"/assets/" "$dist/index.html" || { echo "deploy-cf: index.html assets not rooted at /" >&2; exit 2; }
grep -rqE "[\"\`]$short[\"\`]" "$dist/assets" || { echo "deploy-cf: build commit $short not in bundle (dirty?)" >&2; exit 2; }
grep -q '__VERSION__\|__PRECACHE__' "$dist/sw.js" && { echo "deploy-cf: sw.js precache not injected" >&2; exit 2; }
# Hashed bundle files never change; everything else (index.html, sw.js, manifest) revalidates.
printf '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/sw.js\n  Cache-Control: no-cache\n' > "$dist/_headers"
# html_handling "none" (wrangler.jsonc) serves /index.html as is; "/" is rewritten to it (status 200, no redirect).
printf '/ /index.html 200\n' > "$dist/_redirects"
echo "deploy-cf: built $short, wasm $(sha256sum "$wasm" | cut -c1-16) ($(stat -c %s "$wasm") bytes)"
if [ "$dry" = 1 ]; then echo "deploy-cf: dry run, dist at $dist (remove: git worktree remove --force $wt)"; exit 0; fi
cd "$repo"
wrangler=(npx --yes wrangler@4.151.1)
command -v wrangler >/dev/null && wrangler=(wrangler)
"${wrangler[@]}" deploy --config "$repo/wrangler.jsonc" --assets "$dist" --message "idlever $short"
echo "deploy-cf: $short live at https://dev.idlever.awoo.party/"
