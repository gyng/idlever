#!/usr/bin/env bash
# Cut257 gate 4: one fresh earned continuation for each class whose capstone had zero
# receipts in the preserved campaigns (Ranger moving_line, Caster conduct, seed 1).
# Mirrors docs/evidence/cut253/earned-continuations-v3/run.py's construction: resume the
# genuine parent chain with its exact remaining requested seconds, no grants, no policy edits.
set -euo pipefail
cd /home/g/p/riddle
BIN=target/fast/examples/advanced_campaign
OUT=docs/evidence/cut257/earned
mkdir -p "$OUT"
RUST_MIN_STACK=33554432 CARGO_BUILD_JOBS=12 cargo build -q --profile fast -p idlever-core --example advanced_campaign
for case in ranger-seed1 caster-seed1; do
  cls=${case%%-*}
  seed=${case##*seed}
  parent=docs/evidence/cut253/earned-cohorts-v2/$case
  save=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$parent/campaign/state.json','utf8')).save)")
  requested=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$parent/campaign/state.json','utf8')).requested_s)")
  remaining=$((336*3600 - requested))
  echo "=== $case: resume from $save, remaining ${remaining}s"
  rm -rf "$OUT/$case"
  mkdir -p "$OUT/$case"
  start=$(date +%s)
  "$BIN" "$OUT/$case/campaign" "$seed" "$cls" --from "$parent/campaign/$save" --seconds "$remaining" \
    > "$OUT/$case/run.log" 2>&1 || echo "EXIT=$? for $case"
  echo "wall_s=$(( $(date +%s) - start ))"
done
echo "=== receipt counts per skill (bit path) ==="
node -e '
const fs=require("fs"),path=require("path");
const root="docs/evidence/cut257/earned";
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
for(const f of walk(root).filter(f=>f.endsWith("receipts.json"))){
  const j=JSON.parse(fs.readFileSync(f,"utf8"));
  const by={};
  for(const entry of j) for(const it of (entry.interactions??[])){
    const k=`${it.source??it.path??"?"} ${it.phase??"?"}`; by[k]=(by[k]??0)+1;}
  console.log(f.replace(root+"/",""));
  console.log("   ",JSON.stringify(by));
}'
