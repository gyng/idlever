#!/usr/bin/env bash
# Routine balance iteration: statistical discovery + independent confirmation.
# tools/tune.sh --name scout --spec tuning/studies/scout-example.json [--threads N]
# tools/tune.sh --exact idle-d8,random-picked [--fresh] [--seeds 8 ...]
# tools/tune.sh --list
# Legacy bare row IDs retain their exact finite-catalog checks. Canonical audits remain explicit.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--exact" ]; then
  shift
elif [ "${1:-}" != "--list" ] && [[ "${1:-}" == --* ]]; then
  exec node tools/stat-tune.mjs "$@"
elif [[ "${1:-}" == *.json ]]; then
  study=$1
  shift
  study_name=$(basename "$study" .json)
  exec node tools/stat-tune.mjs --name "$study_name" --spec "$study" "$@"
fi
if [ "${1:-}" = "--list" ]; then
  cargo build -q --profile fast -p idlever-core --example dayplayer --example opening
  # The harness uses usage status 2 for its row listing.
  target/fast/examples/dayplayer --rows '?' || [ "$?" -eq 2 ]
  # Cut258: the opening probe's rows (the first hour of a fresh town; `tools/tune.sh opening`)
  target/fast/examples/opening --rows '?' || [ "$?" -eq 2 ]
  exit 0
fi
if [ -z "${1:-}" ] || [[ "$1" == -* ]]; then
  echo 'usage: tools/tune.sh --name NAME --spec STUDY.json; --exact ROWS runs catalog checks; --list shows rows' >&2
  exit 2
fi
rows=$1
shift
exec node tools/gates.mjs --full --rows "$rows" --fail-fast "$@"
