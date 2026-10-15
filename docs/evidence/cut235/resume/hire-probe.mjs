// Short all-seed diagnostic only. Full fortnight cadence acceptance stays in hire-compare.mjs.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { median, paired, hire } from "../hire-compare.mjs";

const [baselinePath, candidatePath, outputPath] = process.argv.slice(2);
assert(outputPath, "usage: hire-probe.mjs BASELINE CANDIDATE OUTPUT");
const load = (path) => {
  const bytes = readFileSync(path);
  return {
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    data: JSON.parse(bytes),
  };
};
const baseline = load(baselinePath),
  candidate = load(candidatePath);
assert.equal(baseline.data.seeds, 16);
assert.equal(candidate.data.seeds, 16);
assert(baseline.data.days >= 14);
assert(candidate.data.days >= 3);
const pairs = paired(baseline.data.runs, candidate.data.runs, "PICKED");
const rows = [
  "apprentice",
  "clerk",
  "drillmaster",
  "kennel_hand",
  "herald",
  "guide",
  "kennel_keeper",
].map((worker) => {
  const countMedianHours = median(pairs.map(([before]) => hire(before, worker)));
  assert(Number.isFinite(countMedianHours), `${worker}: baseline median missing`);
  const times = pairs.map(([, after]) => {
    const hours = hire(after, worker);
    return {
      seed: after.seed,
      hours: Number.isFinite(hours) ? hours : null,
      pass: Number.isFinite(hours) && hours <= countMedianHours + 1e-9,
    };
  });
  const value = median(pairs.map(([, after]) => hire(after, worker)));
  return {
    worker,
    countMedianHours,
    featMedianHours: Number.isFinite(value) ? value : null,
    pass: times.filter((time) => time.pass).length,
    times,
  };
});
const result = {
  scope: `16-seed hire diagnostic, ${candidate.data.days}days only; never full fortnight/cadence acceptance`,
  baseline: { path: baseline.path, sha256: baseline.sha256 },
  candidate: { path: candidate.path, sha256: candidate.sha256 },
  rows,
  hireBarsPass: rows.every((row) => row.pass >= 14),
};
writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
for (const row of rows)
  console.log(`${row.worker}: ${row.pass}/16 <= count median ${row.countMedianHours.toFixed(4)}h`);
console.log(
  `${result.hireBarsPass ? "PASS" : "FAIL"}: short hire diagnostic only; full timeline, pacing and gate remain required`,
);
if (!result.hireBarsPass) process.exitCode = 1;
