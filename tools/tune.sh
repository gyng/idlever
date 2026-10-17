#!/usr/bin/env bash
# Focused content iteration. Defaults to the full seed counts, stops settled failures early.
# tools/tune.sh idle-d8,random-picked [--fresh] [--seeds 8 ...]
# tools/tune.sh --list
# This is a targeted check; final acceptance is tools/verify.sh --full.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--list" ]; then
  cargo build -q --profile fast -p idlever-core --example dayplayer --example opening
  # The harness uses usage status 2 for its row listing.
  target/fast/examples/dayplayer --rows '?' || [ "$?" -eq 2 ]
  # Cut258: the opening probe's rows (the first hour of a fresh town; `tools/tune.sh opening`)
  target/fast/examples/opening --rows '?' || [ "$?" -eq 2 ]
  exit 0
fi
if [ -z "${1:-}" ] || [[ "$1" == -* ]]; then
  echo 'usage: tools/tune.sh <row ids or substrings> [--fresh] [dayplayer args]; --list shows rows' >&2
  exit 2
fi
rows=$1
shift
exec node tools/gates.mjs --full --rows "$rows" --fail-fast "$@"
