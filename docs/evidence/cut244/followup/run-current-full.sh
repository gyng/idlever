#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export CARGO_BUILD_JOBS=8 GATES_THREADS=8
unset IDLEVER_BALANCE_JSON IDLEVER_BALANCE_FILE
date -u +%FT%TZ > docs/evidence/cut244/followup/full.started
node tools/gates.mjs --full > docs/evidence/cut244/followup/full.log 2>&1
CUT244_CURRENT_FULL_EXIT=$?
printf '%s\n' "$CUT244_CURRENT_FULL_EXIT" > docs/evidence/cut244/followup/full.exit
date -u +%FT%TZ > docs/evidence/cut244/followup/full.finished
exit "$CUT244_CURRENT_FULL_EXIT"
