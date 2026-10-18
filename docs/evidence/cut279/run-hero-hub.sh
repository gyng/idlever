#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
export IDLEVER_TEST_URL=http://localhost:5522
export IDLEVER_BROWSER=headed
export IDLEVER_HUB_OUT=docs/evidence/cut279/hero-hub
node --version > docs/evidence/cut279/hero-hub/node-version.txt
sha256sum web/src/engine/pkg/idlever_wasm_bg.wasm web/src/hero-hub.css web/src/ui/sheet.ts > docs/evidence/cut279/hero-hub/start-hashes.txt
git rev-parse HEAD > docs/evidence/cut279/hero-hub/start-head.txt
date -Iseconds > docs/evidence/cut279/hero-hub/started.txt
node web/tests/hero-hub.mjs > docs/evidence/cut279/hero-hub/audit.log 2>&1
hub_status=$?
printf '{"exit_code":%s}\n' "$hub_status" > docs/evidence/cut279/hero-hub/exit.json
exit "$hub_status"
