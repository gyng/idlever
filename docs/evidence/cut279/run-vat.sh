#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
export IDLEVER_BROWSER=headed
export IDLEVER_TEST_URL=http://localhost:5522/
export IDLEVER_CAPTURE_DIR=docs/evidence/cut279/gpu-screens
node web/tests/vat.mjs > docs/evidence/cut279/vat.log 2>&1
run_status=$?
printf '{"exit_code":%s}\n' "$run_status" > docs/evidence/cut279/vat.exit.json
exit "$run_status"
