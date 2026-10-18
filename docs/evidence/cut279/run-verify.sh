#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
export GATES_THREADS=24
export CARGO_INCREMENTAL=0
tools/verify.sh --full > docs/evidence/cut279/verify-full.log 2>&1
verify_status=$?
printf '{"exit_code":%s}\n' "$verify_status" > docs/evidence/cut279/verify-full.exit.json
exit "$verify_status"
