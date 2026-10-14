// tools/sweep.mjs: parsing, ranking and resume against a fake dayplayer (no cargo, no simulation).
//   node tools/sweep.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  expandCandidates,
  numbersOf,
  parseBars,
  parseObjective,
  parseRowList,
  rank,
  verdictOf,
} from "./sweep.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = `dayplayer --rows: \`?\` names no row; the rows:
  picked-idle        PICKED ≥ 1.5× IDLE at D13, D18, D23
  tuned-picked       TUNED beats PICKED by ≥ 15 % at D33
  random-picked      RANDOM slower than PICKED at D13, D23
  nothing-required   Nothing required: TUNED − S
`;
const rowList = parseRowList(LIST);
assert.equal(rowList.length, 4);
assert.deepEqual(rowList[1], { id: "tuned-picked", key: "TUNED beats PICKED by ≥ 15 % at D33" });

// bar tables: padded, overlong (single space), settled early, fail-fast
const pad = (name, value, res) => `${name.padEnd(64)} ${value.padStart(18)}  ${res}`;
const table = [
  "dayplayer: TUNED s1 done in 135s",
  "bar (targeted)                                                                value  result",
  pad("TUNED beats PICKED by ≥ 15 % at D33 (median hours)", "1.17", "PASS"),
  pad("PICKED ≥ 1.5× IDLE at D13, D18, D23", "1.50 · 2.50 · 3.71", "PASS"),
  "RANDOM slower than PICKED at D13, D23 (median seed, ≥ 14/16 seeds) 16/16 · 15/16 · median +4 · +32 h  PASS",
  pad(
    "Nothing required: TUNED − S ≤ IDLE on the median seed (± a check-in), no seed > 48 h behind from day 5",
    "ok",
    "PASS",
  ),
  "dayplayer (targeted: …, 151s): targeted rows PASS — not a gate pass",
].join("\n");
const bars = parseBars(table, rowList);
assert.equal(bars["tuned-picked"].value, "1.17");
assert.deepEqual(bars["tuned-picked"].nums, [1.17]);
assert.deepEqual(bars["picked-idle"].nums, [1.5, 2.5, 3.71]);
assert.equal(bars["random-picked"].value, "16/16 · 15/16 · median +4 · +32 h");
assert.equal(bars["nothing-required"].value, "ok");
const settled = [
  "",
  "fail-fast: `tuned-picked` settled FAIL after TUNED s6 (300s)",
  "  TUNED beats PICKED by ≥ 15 % at D33",
  "  D33 0.93…1.13 with 2 seeds left (s1 1.65)",
  "",
  "bar (targeted, fail-fast)                                                     value  result",
  pad("TUNED beats PICKED by ≥ 15 % at D33", "settled", "FAIL"),
  "    D33 0.93…1.13 with 2 seeds left (s1 1.65)",
  pad("PICKED ≥ 1.5× IDLE at D13, D18, D23", "settled", "open"),
  "    ",
  "dayplayer (targeted: tuned-picked,picked-idle, fail-fast, 300s): FAIL — not a gate pass",
].join("\n");
const sb = parseBars(settled, rowList);
assert.equal(sb["tuned-picked"].result, "FAIL");
assert.deepEqual(sb["tuned-picked"].nums, [1.03]);
assert.deepEqual([sb["tuned-picked"].lo, sb["tuned-picked"].hi], [0.93, 1.13]);
assert.equal(sb["tuned-picked"].approx, true);
assert.equal(sb["picked-idle"].result, "open");
assert.deepEqual(numbersOf("D13 0.9 · D18 1.2").nums, [0.9, 1.2]);
assert.equal(verdictOf(0, table, ""), "PASS");
assert.equal(verdictOf(1, settled, ""), "FAIL");
assert.equal(verdictOf(1, "", "Error: invalid balance bounds or progression ordering"), "INVALID");
assert.equal(verdictOf(101, "", "panicked"), "ERROR");

// grid expansion + paths
const base = { recovery: [600, 14, 28, 1], scar_pct: 5 };
const cands = expandCandidates(
  {
    grid: { "recovery.1": [12, 14], "recovery[2]": [26, 28] },
    candidates: [{ name: "scar", set: { scar_pct: 6 } }],
  },
  base,
);
assert.equal(cands.length, 5);
assert.deepEqual(cands[0].profile.recovery, [600, 12, 26, 1]);
assert.equal(cands[0].name, "recovery.1=12,recovery.2=26");
assert.equal(cands[0].dir, "recovery.1-12_recovery.2-26");
assert.equal(cands[4].profile.scar_pct, 6);
assert.deepEqual(base.recovery, [600, 14, 28, 1], "base untouched");
assert.throws(() => expandCandidates({ grid: { "recovry.1": [1] } }, base), /no recovry.1/);

// ranking: PASS by objective, then FAIL, then INVALID/ERROR
const obj = parseObjective(undefined, ["tuned-picked", "picked-idle"]);
assert.deepEqual(obj, { row: "tuned-picked", index: 0, dir: "max" });
assert.deepEqual(parseObjective("picked-idle@2:min", []), {
  row: "picked-idle",
  index: 2,
  dir: "min",
});
const r = (name, verdict, v) => ({
  name,
  verdict,
  rows: v == null ? {} : { "tuned-picked": { nums: [v] } },
});
const ranked = rank(
  [
    r("a", "FAIL", 1.3),
    r("b", "PASS", 1.16),
    r("c", "INVALID"),
    r("d", "PASS", 1.2),
    r("e", "ERROR"),
    r("f", "PASS"),
  ],
  obj,
);
assert.deepEqual(
  ranked.map((x) => x.name),
  ["d", "b", "f", "a", "c", "e"],
);
assert.deepEqual(
  rank([r("b", "PASS", 1.16), r("d", "PASS", 1.2)], { ...obj, dir: "min" }).map((x) => x.name),
  ["b", "d"],
);

// end to end with a fake dayplayer: value = 1 + (28 - knee_lo)/20 - (knee_hi - 28); FAIL under 1.15;
// recovery[1] >= recovery[2] is rejected like the Rust parser.
const tmp = mkdtempSync(join(os.tmpdir(), "sweep-test-"));
const counter = join(tmp, "calls");
const fake = join(tmp, "dayplayer");
writeFileSync(
  fake,
  `#!/usr/bin/env node
const fs = require("fs");
const a = process.argv.slice(2);
if (a[a.indexOf("--rows") + 1] === "?") { process.stderr.write(${JSON.stringify(LIST)}); process.exit(2); }
fs.appendFileSync(${JSON.stringify(counter)}, "x");
const b = JSON.parse(process.env.IDLEVER_BALANCE_JSON);
if (!process.env.IDLEVER_SRC_KEY.includes(":balance:")) process.exit(9);
const [, lo, hi] = b.recovery;
if (lo >= hi) { process.stderr.write("Error: invalid balance bounds or progression ordering\\n"); process.exit(1); }
const v = 1 + (28 - lo) / 20 - (hi - 28);
process.stderr.write("dayplayer: TUNED s1 done in 2s\\n");
const pad = (n, x, r) => n.padEnd(64) + " " + x.padStart(18) + "  " + r;
const ok = v >= 1.15;
if (process.env.FAKE_SETTLE && a.includes("--fail-fast") && ok) {
  console.log("\\nfail-fast: every targeted row settled after PICKED s16 (day 1)\\n\\nbar (targeted, fail-fast)");
  console.log(pad("TUNED beats PICKED by ≥ 15 % at D33", "settled", "PASS"));
  console.log("    D33 1.15…" + (v + 0.1).toFixed(2) + " with 3 seeds left");
} else {
  console.log("\\nbar (targeted)");
  console.log(pad("TUNED beats PICKED by ≥ 15 % at D33 (median hours)", v.toFixed(2), ok ? "PASS" : "FAIL"));
}
console.log(pad("PICKED ≥ 1.5× IDLE at D13, D18, D23", "1.50 · 2.50 · 3.71", "PASS"));
console.log("dayplayer (targeted: x, 1s): " + (ok ? "targeted rows PASS" : "FAIL") + " — not a gate pass");
process.exit(ok ? 0 : 1);
`,
);
chmodSync(fake, 0o755);
const name = `selftest-${process.pid}`;
const out = join(root, "target/sweep", name);
const sweep = (grid) =>
  execFileSync(
    "node",
    [
      join(root, "tools/sweep.mjs"),
      "--name",
      name,
      "--bin",
      fake,
      "--grid",
      JSON.stringify(grid),
      "--rows",
      "tuned-picked,picked-idle",
      "--threads",
      "4",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
const calls = () => (existsSync(counter) ? readFileSync(counter, "utf8").length : 0);
try {
  const grid = {
    grid: { "recovery.1": [12, 14, 16], "recovery.2": [28, 29] },
    candidates: [{ name: "bad", set: { "recovery.1": 30 } }],
  };
  sweep(grid);
  assert.equal(calls(), 7);
  const res = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
  assert.deepEqual(
    res.ranked.map((x) => `${x.name}:${x.verdict}`),
    [
      "recovery.1=12,recovery.2=28:PASS",
      "recovery.1=14,recovery.2=28:PASS",
      "recovery.1=16,recovery.2=28:PASS",
      "recovery.1=12,recovery.2=29:FAIL",
      "recovery.1=14,recovery.2=29:FAIL",
      "recovery.1=16,recovery.2=29:FAIL",
      "bad:INVALID",
    ],
  );
  assert.equal(res.ranked[0].rows["tuned-picked"].nums[0], 1.8);
  assert.equal(res.ranked[3].failedRow, "tuned-picked");
  assert.equal(res.meta.jobs, 1);
  assert.match(
    readFileSync(join(out, "results.md"), "utf8"),
    /\| 1 \| recovery.1=12,recovery.2=28 \| PASS \| 1.8 \|/,
  );
  // resume: nothing reruns; a new candidate alone runs
  sweep(grid);
  assert.equal(calls(), 7, "finished candidates are skipped");
  grid.grid["recovery.1"].push(13);
  sweep(grid);
  assert.equal(calls(), 9, "only the two new candidates run");
  // a changed profile for the same name reruns (profile hash in result.json)
  const r2 = spawnSync(
    "node",
    [
      join(root, "tools/sweep.mjs"),
      "--name",
      name,
      "--bin",
      fake,
      "--grid",
      JSON.stringify(grid),
      "--rows",
      "tuned-picked,picked-idle",
      "--threads",
      "4",
      "--seeds",
      "8",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(calls(), 18, "different seeds rerun every candidate");
  // --refine: settled ranges rank by midpoint; the best K replay exactly, once
  const refineGrid = JSON.stringify({ grid: { "recovery.1": [12, 14, 16], "recovery.2": [28] } });
  const refineRun = () =>
    execFileSync(
      "node",
      [
        join(root, "tools/sweep.mjs"),
        "--name",
        `${name}-refine`,
        "--bin",
        fake,
        "--grid",
        refineGrid,
        "--rows",
        "tuned-picked,picked-idle",
        "--threads",
        "4",
        "--refine",
        "2",
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, FAKE_SETTLE: "1" },
      },
    );
  refineRun();
  assert.equal(calls(), 23, "3 screened + 2 refined");
  const rr = JSON.parse(readFileSync(join(out + "-refine", "results.json"), "utf8")).ranked;
  assert.deepEqual(
    rr.map((x) => [x.name, !!x.refined, x.rows["tuned-picked"].nums[0]]),
    [
      ["recovery.1=12,recovery.2=28", true, 1.8],
      ["recovery.1=14,recovery.2=28", true, 1.7],
      ["recovery.1=16,recovery.2=28", false, 1.425],
    ],
  );
  assert.equal(rr[2].rows["tuned-picked"].approx, true);
  refineRun();
  assert.equal(calls(), 23, "screen and refine results resume");
  console.log("sweep.test: all PASS");
} finally {
  rmSync(out, { recursive: true, force: true });
  rmSync(out + "-refine", { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
}
