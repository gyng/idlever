#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export CARGO_INCREMENTAL=0
cargo build -q --profile fast -p idlever-core --example dayplayer > docs/evidence/cut279/restore-native.log 2>&1
run_status=$?
printf '{"exit_code":%s}\n' "$run_status" > docs/evidence/cut279/restore-native.exit.json
exit "$run_status"
