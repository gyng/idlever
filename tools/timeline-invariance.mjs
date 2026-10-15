#!/usr/bin/env node
// Cut231 §4: prove the dayplayer's `--timeline` beats are read-only. Two job caches (`target/gates/dp/<key>-…json`,
// one binary key each) must hold the same SeedOut for every configuration × seed once the timeline's own fields
// (`timeline`, `session_m`) are dropped. Diagnostic only. `--all` (Cut233, a pure refactor's proof) keeps every
// field, the timeline too.
//   node tools/timeline-invariance.mjs BASE_KEY NEW_KEY [DIR] [--labels IDLE,IDLE30,PICKED] [--all]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [baseKey, newKey, dirArg] = process.argv
  .slice(2)
  .filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--labels");
const dir = dirArg ?? "target/gates/dp";
const li = process.argv.indexOf("--labels");
const labels = li >= 0 ? process.argv[li + 1].split(",") : null;
const all = process.argv.includes("--all");
if (!baseKey || !newKey) {
  console.error("usage: node tools/timeline-invariance.mjs BASE_KEY NEW_KEY [DIR] [--labels ...]");
  process.exit(2);
}
const files = readdirSync(dir);
const jobs = (key) =>
  new Map(files.filter((f) => f.startsWith(`${key}-`)).map((f) => [f.slice(key.length + 1), f]));
const base = jobs(baseKey);
const next = jobs(newKey);
// a job file is either the bare SeedOut or a cache envelope holding it
const body = (f) => {
  let v = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (typeof v?.body === "string") v = JSON.parse(v.body);
  else if (v?.v) v = v.v;
  if (!all) {
    delete v.timeline;
    delete v.session_m;
    delete v.looks;
  }
  return JSON.stringify(v);
};
let same = 0;
let diff = 0;
for (const [name, f] of base) {
  if (labels && !labels.some((l) => name.startsWith(`${l}-s`))) continue;
  const g = next.get(name);
  if (!g) {
    console.log(`missing in new: ${name}`);
    diff++;
    continue;
  }
  if (body(f) === body(g)) same++;
  else {
    console.log(`DIFFERS: ${name}`);
    diff++;
  }
}
console.log(
  `${all ? "job invariance (every field)" : "timeline invariance"}: ${same} identical, ${diff} differ (${baseKey} vs ${newKey})`,
);
process.exit(diff ? 1 : 0);
