#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export CARGO_BUILD_JOBS=8 GATES_THREADS=8 RUST_BACKTRACE=1
unset IDLEVER_BALANCE_JSON IDLEVER_BALANCE_FILE RUST_MIN_STACK
ulimit -c unlimited
date -u +%FT%TZ > docs/evidence/cut244/followup/full-resume.started
node tools/gates.mjs --full > docs/evidence/cut244/followup/full-resume.log 2>&1
CUT244_FULL_RESUME_EXIT=$?
printf '%s\n' "$CUT244_FULL_RESUME_EXIT" > docs/evidence/cut244/followup/full-resume.exit
date -u +%FT%TZ > docs/evidence/cut244/followup/full-resume.finished
exit "$CUT244_FULL_RESUME_EXIT"
