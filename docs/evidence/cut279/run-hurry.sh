#!/usr/bin/env bash
set -u
cd /home/g/p/riddle
export CARGO_INCREMENTAL=0
cargo run -q --profile fast -p idlever-core --example picked_hurry -- --seeds 16 --threads 8 --out docs/evidence/cut279/hurry > docs/evidence/cut279/hurry.log 2>&1
run_status=$?
printf '{"exit_code":%s}\n' "$run_status" > docs/evidence/cut279/hurry.exit.json
exit "$run_status"
