#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export PATH=/home/g/.nvm/versions/node/v22.18.0/bin:$PATH
export CARGO_INCREMENTAL=0
/usr/bin/time -f 'wall_seconds=%e user_seconds=%U system_seconds=%S' -o docs/evidence/cut280/real-study.time tools/tune.sh --name cut280-scout-final --spec tuning/studies/scout-example.json --threads 16 > docs/evidence/cut280/real-study.log 2> docs/evidence/cut280/real-study.stderr
study_status=$?
printf '{"exit_code":%s}\n' "$study_status" > docs/evidence/cut280/real-study.exit.json
exit "$study_status"
