#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
tools/deploy-cf.sh 423fe45a --dry-run > docs/evidence/cut279/deploy-build.log 2>&1
run_status=$?
printf '{"exit_code":%s}\n' "$run_status" > docs/evidence/cut279/deploy-build.exit.json
exit "$run_status"
