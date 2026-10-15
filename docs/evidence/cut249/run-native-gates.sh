#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export CARGO_BUILD_JOBS=8 GATES_THREADS=8 RUST_BACKTRACE=1
unset IDLEVER_BALANCE_JSON IDLEVER_BALANCE_FILE
date -u +%FT%TZ > docs/evidence/cut249/gates.started
ulimit -a > docs/evidence/cut249/gates-limits.txt
node tools/gates.mjs --pacing > docs/evidence/cut249/pacing.log 2>&1
CUT249_PACING_EXIT=$?
printf '%s\n' "$CUT249_PACING_EXIT" > docs/evidence/cut249/pacing.exit
date -u +%FT%TZ > docs/evidence/cut249/pacing.finished
if [ "$CUT249_PACING_EXIT" -ne 0 ]; then
  date -u +%FT%TZ > docs/evidence/cut249/gates.finished
  exit "$CUT249_PACING_EXIT"
fi
node tools/gates.mjs --full > docs/evidence/cut249/full.log 2>&1
CUT249_FULL_EXIT=$?
printf '%s\n' "$CUT249_FULL_EXIT" > docs/evidence/cut249/full.exit
date -u +%FT%TZ > docs/evidence/cut249/gates.finished
exit "$CUT249_FULL_EXIT"
