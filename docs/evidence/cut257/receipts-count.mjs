#!/usr/bin/env node
// Cut257 gate 4: name the earned receipts per branch, per skill, per phase.
// Usage: node docs/evidence/cut257/receipts-count.mjs <caseDirRoot>
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "docs/evidence/cut257/earned";
const row = (it) => {
  const skill = it.skill?.id ?? it.path ?? it.id ?? it.skill ?? "?";
  return `${skill}|${it.phase ?? "?"}|${it.effect ?? "?"}|${it.amount ?? "?"}`;
};
for (const caseDir of readdirSync(root).sort()) {
  const pair = join(root, caseDir, "campaign/pair");
  if (!existsSync(pair)) continue;
  for (const branch of ["no-selection", "parent-only", "selected"]) {
    const rp = join(pair, branch, "receipts.json");
    if (!existsSync(rp)) continue;
    const all = JSON.parse(readFileSync(rp, "utf8")).flatMap((r) => r.interactions ?? []);
    const prep = JSON.parse(readFileSync(join(pair, branch, "prepared.session.json"), "utf8"));
    const L = prep.lineage ?? prep;
    const paths = L.class_paths ?? prep.class_paths ?? null;
    const counts = new Map();
    for (const it of all) counts.set(row(it), (counts.get(row(it)) ?? 0) + 1);
    console.log(`=== ${caseDir}/${branch}: ${all.length} interactions; class_paths ${JSON.stringify(paths)}`);
    for (const [k, n] of [...counts].sort()) console.log(`    ${n}  ${k}`);
    if (all.length) console.log("    sample:", JSON.stringify(all[0]));
  }
}
