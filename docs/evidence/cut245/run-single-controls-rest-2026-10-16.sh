#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export TMPDIR="/home/g/p/riddle/scratchpad/cut245-browser-tmp"
BASE="docs/evidence/cut245"
QUIET="8092,7816,151306,151333,151334,151342,186574,186726,171705,171739,185362"
date -u +%FT%TZ > "$BASE/single-controls-rest-2026-10-16.started"
node "$BASE/cost-single.mjs" --quiet --job-view docs/evidence/cut249/gates-environment-toolchain.json --quiet-pids "$QUIET" --control --cases crypt --widths 400 --out "$BASE/single-control-crypt400-2026-10-16" > "$BASE/single-control-crypt400-2026-10-16.log" 2>&1
CONTROL_EXIT=$?
printf '%s\n' "$CONTROL_EXIT" > "$BASE/single-control-crypt400-2026-10-16.exit"
if [ "$CONTROL_EXIT" -eq 0 ]; then
  node "$BASE/cost-single.mjs" --quiet --job-view docs/evidence/cut249/gates-environment-toolchain.json --quiet-pids "$QUIET" --control --cases fens,foundry --widths 400,1440 --out "$BASE/single-control-fens-foundry-2026-10-16" > "$BASE/single-control-fens-foundry-2026-10-16.log" 2>&1
  CONTROL_EXIT=$?
  printf '%s\n' "$CONTROL_EXIT" > "$BASE/single-control-fens-foundry-2026-10-16.exit"
fi
printf '%s\n' "$CONTROL_EXIT" > "$BASE/single-controls-rest-2026-10-16.exit"
date -u +%FT%TZ > "$BASE/single-controls-rest-2026-10-16.finished"
exit "$CONTROL_EXIT"
