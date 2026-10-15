#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export TMPDIR="/home/g/p/riddle/scratchpad/cut245-browser-tmp"
BASE="docs/evidence/cut245"
date -u +%FT%TZ > "$BASE/frozen-visual-aa-2026-10-16.started"
node "$BASE/cost-frozen-visual.mjs" --quiet --job-view docs/evidence/cut249/gates-environment-toolchain.json --quiet-pids 8092,7816,151306,151333,151334,151342,186574,186726,222318,222340,224265,278033,278035,278185,304633,304645,304665,309569,309600,309619 --control --content-proof "$BASE/frozen-visual-content-2026-10-16/results.json" --cases fens,crypt,foundry --widths 400,1440 --out "$BASE/frozen-visual-aa-2026-10-16" > "$BASE/frozen-visual-aa-2026-10-16.log" 2>&1
AA_EXIT=$?
printf '%s\n' "$AA_EXIT" > "$BASE/frozen-visual-aa-2026-10-16.exit"
date -u +%FT%TZ > "$BASE/frozen-visual-aa-2026-10-16.finished"
exit "$AA_EXIT"
