#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
export CARGO_INCREMENTAL=0
node tools/repin.mjs --no-build --dir docs/evidence/cut279 --note "Cut279 retained600 recovery, clone vat and Hero Hub close row; shipping milestone" --settle --regen > docs/evidence/cut279/repin.log 2>&1
run_status=$?
if [ "$run_status" = 0 ]; then
  cd web
  IDLEVER_PORT=5522 node tests/run.mjs gold-settlements > ../docs/evidence/cut279/gold-settlements.log 2>&1
  run_status=$?
fi
printf '{"exit_code":%s}\n' "$run_status" > /home/g/p/riddle/docs/evidence/cut279/settlements.exit.json
exit "$run_status"
