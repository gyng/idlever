#!/usr/bin/env node
// R3 pricing: how often do the *preserved earned chains* meet each scene the six proposed
// pairs need? READ-ONLY over the recorded reconstructions
// (docs/evidence/cut253/earned-{cohorts-v2,continuations-v3}/**/campaign/pair/*/run-*.json).
// These files are pretty-printed, so every needle carries the JSON spacing.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "docs/evidence/cut253/earned-cohorts-v2",
  "docs/evidence/cut253/earned-continuations-v3",
];
// R3's six named scenes first, then every mechanic-adjacent kind the record actually contains.
const MARKERS = {
  "P1 gas overlay": ['"ov": "gas"'],
  "P2 pack: jackal": ['"kind": "jackal"'],
  "P2 pack: eel": ['"kind": "eel"'],
  "P2 pack: ghoul": ['"kind": "ghoul"'],
  "P3 drain: wraith": ['"kind": "wraith"'],
  "P3 drain: lich": ['"kind": "lich"'],
  "P4 summon: skeleton": ['"kind": "skeleton"'],
  "P5 reflect: iron_golem": ['"kind": "iron_golem"'],
  "P5 reflect: warden": ['"kind": "warden"'],
  "P6 support: smith": ['"kind": "smith"'],
  "P6 support: acolyte": ['"kind": "acolyte"'],
  "P6 support: warlord": ['"kind": "warlord"'],
  "bell: bell": ['"kind": "bell"'],
  "control fire overlay": ['"ov": "fire"'],
  "control mirror_shade": ['"kind": "mirror_shade"'],
  "control lurker": ['"kind": "lurker"'],
  "control ogre": ['"kind": "ogre"'],
};

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/run-\d+\.reconstruction\.json$/.test(e.name) && statSync(p).size > 0) out.push(p);
  }
  return out;
};

const chains = new Map();
let files = 0;
for (const root of roots) {
  let cases = [];
  try {
    cases = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    continue;
  }
  for (const c of cases) {
    const filesOfCase = walk(join(root, c.name));
    if (!filesOfCase.length) continue;
    const byMarker = new Map();
    for (const f of filesOfCase) {
      files++;
      const text = readFileSync(f, "utf8");
      for (const [name, needles] of Object.entries(MARKERS)) {
        const row = byMarker.get(name) ?? { runs: 0, hits: 0 };
        row.runs++;
        if (needles.some((n) => text.includes(n))) row.hits++;
        byMarker.set(name, row);
      }
    }
    chains.set(c.name, byMarker);
  }
}

const names = [...chains.keys()].sort();
const markerNames = Object.keys(MARKERS);
console.log(`reconstruction files read: ${files}; chains: ${names.length}\n`);
console.log(["chain".padEnd(16), ...markerNames.map((m) => m.replace(/:.*/, "").padEnd(11))].join(""));
const met = new Map(markerNames.map((m) => [m, 0]));
for (const n of names) {
  const row = [n.padEnd(16)];
  for (const m of markerNames) {
    const r = chains.get(n).get(m);
    const yes = r.hits > 0;
    if (yes) met.set(m, met.get(m) + 1);
    row.push((yes ? String(r.hits) : "-").padEnd(11));
  }
  console.log(row.join(""));
}
console.log(`\nchains meeting each marker (of ${names.length}):`);
for (const [m, n] of met) console.log(`  ${m.padEnd(24)} ${n}/${names.length}`);
