#!/usr/bin/env bash
set -u
cd /home/g/p/riddle || exit 1
export PATH="/home/g/.nvm/versions/node/v22.18.0/bin:$PATH"
export CARGO_BUILD_JOBS=8 IDLEVER_THREADS=4
date -u +%FT%TZ > docs/evidence/cut247/native-checks.started
cargo test -q --workspace --profile fast -- --test-threads=4 > docs/evidence/cut247/workspace-fast.log 2>&1
CUT247_WORKSPACE_EXIT=$?
printf '%s\n' "$CUT247_WORKSPACE_EXIT" > docs/evidence/cut247/workspace-fast.exit
if [ "$CUT247_WORKSPACE_EXIT" -ne 0 ]; then exit "$CUT247_WORKSPACE_EXIT"; fi
cargo clippy --workspace --all-targets -- -D warnings > docs/evidence/cut247/clippy.log 2>&1
CUT247_CLIPPY_EXIT=$?
printf '%s\n' "$CUT247_CLIPPY_EXIT" > docs/evidence/cut247/clippy.exit
date -u +%FT%TZ > docs/evidence/cut247/native-checks.finished
exit "$CUT247_CLIPPY_EXIT"
