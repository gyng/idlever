// Identical hauls from different bloodlines must open their own ledger interval.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(new URL("../web/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../web/src/ui/gold.ts", import.meta.url), "utf8");
const functions = source
  .slice(source.indexOf("const tierWord ="), source.indexOf("/** Two exits"))
  .replace("export function", "function");
const exitSource = readFileSync(new URL("../web/src/ui/exit-kind.ts", import.meta.url), "utf8")
  .replace(/^import type[^\n]*\n/gm, "")
  .replace("export function", "function");
const runRange = runInNewContext(ts.transpile(exitSource + "\n" + functions) + "\nrunRange");
test("shared wallet matches equal-valued exits by bloodline and retains intervening movements", () => {
  const g = (bloodline_id, delta, why, t) => ({ bloodline_id, delta, why, t });
  const ledger = [
    g(1, -20, "supplies", 0),
    g(2, -15, "supplies", 0),
    g(1, 40, "banked D5", 1),
    g(1, 5, "salvage", 1),
    g(2, 40, "banked D5", 2),
    g(2, 6, "salvage", 2),
    g(1, -10, "supplies", 3),
    g(1, 20, "banked D3", 4),
  ];
  const x = (id) => ({ bloodline_id: id, kept: 40, keep_pct: 100, text: "banked $40" });
  assert.deepEqual([...runRange(ledger, x(1))], [0, 3]);
  assert.deepEqual([...runRange(ledger, x(2))], [0, 7]);
  assert.equal(runRange(ledger, x(3)), undefined);
  const old = ledger
    .filter((g) => g.bloodline_id === 1)
    .map(({ bloodline_id: _bloodlineId, ...g }) => g);
  assert.deepEqual([...runRange(old, { kept: 40, keep_pct: 100, text: "banked $40" })], [0, 2]);
});

test("pet-fetched Gold remains with its death after later shared-wallet exits", () => {
  const ledger = [
    { bloodline_id: 1, delta: 0, why: "died D1", t: 1 },
    { bloodline_id: 1, delta: 9, why: "fetched by Greth", t: 1 },
    { bloodline_id: 1, delta: -20, why: "forge sword", t: 2 },
    { bloodline_id: 2, delta: 25, why: "banked D3", t: 2 },
    { bloodline_id: 1, delta: 75, why: "banked D4", t: 3 },
  ];
  assert.deepEqual(
    [...runRange(ledger, { bloodline_id: 1, tier: "death", kept: 0, text: "died D1" })],
    [0, 1],
  );
  assert.deepEqual(
    [...runRange(ledger, { bloodline_id: 1, tier: "bank", kept: 75, text: "banked D4" })],
    [2, 4],
  );
});
