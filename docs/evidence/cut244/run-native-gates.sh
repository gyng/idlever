#!/usr/bin/env bash
# Detached, bounded-concurrency current-game validation; no tuning/profile override.
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export CARGO_BUILD_JOBS=8
export GATES_THREADS=8
unset IDLEVER_BALANCE_JSON IDLEVER_BALANCE_FILE
date -u +%FT%TZ > docs/evidence/cut244/native-gates.started
printf 'pacing\n' > docs/evidence/cut244/native-gates.phase
node tools/gates.mjs --pacing > docs/evidence/cut244/pacing.log 2>&1
CUT244_PACING_EXIT=$?
printf '%s\n' "$CUT244_PACING_EXIT" > docs/evidence/cut244/pacing.exit
if [ "$CUT244_PACING_EXIT" -ne 0 ]; then
  printf 'pacing-failed\n' > docs/evidence/cut244/native-gates.phase
  date -u +%FT%TZ > docs/evidence/cut244/native-gates.finished
  exit "$CUT244_PACING_EXIT"
fi
printf 'routine-full\n' > docs/evidence/cut244/native-gates.phase
node tools/gates.mjs --full > docs/evidence/cut244/full.log 2>&1
CUT244_FULL_EXIT=$?
printf '%s\n' "$CUT244_FULL_EXIT" > docs/evidence/cut244/full.exit
printf 'terminal\n' > docs/evidence/cut244/native-gates.phase
date -u +%FT%TZ > docs/evidence/cut244/native-gates.finished
exit "$CUT244_FULL_EXIT"
