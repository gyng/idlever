#!/usr/bin/env bash
set -u
cd /home/g/p/riddle/web || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export TEST_JOBS=1 TMPDIR=/home/g/p/riddle/target/cut244/followup-tmp
date -u +%FT%TZ > ../docs/evidence/cut244/followup/client-v2.started
node tests/run.mjs loot-economy item-icons > ../docs/evidence/cut244/followup/client-v2.log 2>&1
CUT244_CLIENT_EXIT=$?
printf '%s\n' "$CUT244_CLIENT_EXIT" > ../docs/evidence/cut244/followup/client-v2.exit
cp ../target/client-tests/last-targeted.json ../docs/evidence/cut244/followup/client-v2-state.json
date -u +%FT%TZ > ../docs/evidence/cut244/followup/client-v2.finished
exit "$CUT244_CLIENT_EXIT"
