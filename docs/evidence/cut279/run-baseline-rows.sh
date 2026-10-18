#!/usr/bin/env bash
set -eu
root=/home/g/p/riddle
baseline_dir=$(cat "$root/docs/evidence/cut279/baseline-worktree.txt")
cd "$baseline_dir"
[ "$(git rev-parse HEAD)" = "$(git rev-parse 37d8b63f)" ]
export CARGO_INCREMENTAL=0
export CARGO_TARGET_DIR="$root/target"
set +e
cargo build -q --profile fast -p idlever-core --example dayplayer > "$root/docs/evidence/cut279/baseline-build.log" 2>&1
build_status=$?
if [ "$build_status" != 0 ]; then
  printf '{"build_exit_code":%s}\n' "$build_status" > "$root/docs/evidence/cut279/baseline-rows.exit.json"
  exit "$build_status"
fi
"$CARGO_TARGET_DIR/fast/examples/dayplayer" --routine --no-share --rows tuned-picked,automation-pays --seeds 2 --tuned-seeds 2 --threads 8 > "$root/docs/evidence/cut279/baseline-rows.log" 2>&1
run_status=$?
printf '{"build_exit_code":0,"row_exit_code":%s}\n' "$run_status" > "$root/docs/evidence/cut279/baseline-rows.exit.json"
exit "$run_status"
