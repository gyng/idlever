import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { selectSuite, expand, SMOKE, EXHAUSTIVE_ONLY } from "../web/tests/lib/suites.mjs";
import { stateWidths, responsiveWidths } from "../web/tests/lib/viewport-cases.mjs";
const files = readdirSync(new URL("../web/tests/", import.meta.url))
  .filter((f) => f.endsWith(".mjs") && !["run.mjs", "screen-time.mjs", "town-gpu.mjs"].includes(f))
  .map((f) => f.slice(0, -4));
const all = files.sort().flatMap(expand);
test("state variant compaction preserves exhaustive, smoke, targeted and unfamiliar matrices", () => {
  const original = [320, 400, 1440];
  assert.deepEqual(stateWidths(original, "full"), [400]);
  for (const scope of ["exhaustive", "smoke", "targeted"])
    assert.strictEqual(stateWidths(original, scope), original);
  assert.deepEqual(original, [320, 400, 1440]);
  const other = [360, 1920];
  assert.strictEqual(stateWidths(other, "full"), other);
});
test("full retains all critical, distinct and current failure checks; new files join both audits", () => {
  const augmented = [...all, "future-regression"];
  const current = selectSuite(["--full"], augmented);
  assert.deepEqual(selectSuite([], augmented).names, current.names);
  assert.ok(SMOKE.every((n) => current.names.includes(n)));
  for (const n of [
    "cut26",
    "cut28",
    "cut28d",
    "cut305:sheet,rank",
    "cut12",
    "clarity:core,watch",
    "combat-identity",
    "future-regression",
  ])
    assert.ok(current.names.includes(n), n);
  assert.equal(current.fullCount, current.names.length);
  assert.equal(current.exhaustiveCount, augmented.length);
  assert.ok(current.omitted.includes("fights") && !current.names.includes("fights"));
  const exhaustive = selectSuite(["--exhaustive"], augmented);
  assert.deepEqual(exhaustive.names, augmented);
  assert.equal(exhaustive.suite, "exhaustive");
  assert.ok(EXHAUSTIVE_ONLY.every((n) => exhaustive.names.includes(n)));
});
test("routine list runs existing groups and declares partial coverage", () => {
  const s = selectSuite(["--smoke"], all);
  assert.equal(s.suite, "smoke");
  assert.deepEqual(s.names, SMOKE);
  assert.ok(s.names.length < all.length / 3);
  assert.ok(
    s.names.includes("game-menu") &&
      s.names.includes("exit-keep-close") &&
      s.names.includes("clarity:paint"),
  );
});
test("explicit diagnostic names override routine selection and cannot be labelled full acceptance", () => {
  const s = selectSuite(["--smoke", "ui", "ui:frame", "fights:break"], all);
  assert.equal(s.suite, "targeted");
  assert.equal(s.names.filter((n) => n === "ui:frame").length, 1);
  assert.ok(s.names.includes("ui:keep") && s.names.includes("fights:break"));
  assert.equal(selectSuite(["--full", "game-menu"], all).suite, "targeted");
  assert.equal(
    selectSuite(["--smoke", "--", "--report", "results.json"], all).report,
    "results.json",
  );
});
test("ambiguous flags, missing report paths and unknown groups fail before a browser starts", () => {
  for (const args of [
    ["--smoke", "--full"],
    ["--full", "--exhaustive"],
    ["--smoke", "--exhaustive"],
    ["--report"],
    ["--report", "--list"],
    ["--unknown"],
    ["missing-test"],
  ])
    assert.throws(() => selectSuite(args, all));
});
test("list command reveals exact coverage without starting Vite or Chromium", () => {
  const cwd = new URL("../web/", import.meta.url);
  for (const [flag, suite, count] of [
    ["--smoke", "smoke", SMOKE.length],
    ["--full", "full", selectSuite([], all).names.length],
    ["--exhaustive", "exhaustive", all.length],
  ]) {
    const out = JSON.parse(
      execFileSync(process.execPath, ["tests/run.mjs", flag, "--list"], {
        cwd,
        encoding: "utf8",
        timeout: 5000,
      }),
    );
    assert.equal(out.suite, suite);
    assert.equal(out.names.length, count);
    assert.equal(out.fullCount, selectSuite([], all).names.length);
    assert.equal(out.exhaustiveCount, all.length);
  }
});

test("responsive current triples preserve endpoints and all original variants elsewhere", () => {
  const original = [320, 400, 1440];
  assert.deepEqual(responsiveWidths(original, "full"), [320, 1440]);
  for (const scope of ["exhaustive", "smoke", "targeted", undefined, "future"])
    assert.equal(responsiveWidths(original, scope), original);
  const pair = [400, 1440];
  assert.equal(responsiveWidths(pair, "full"), pair);
  assert.deepEqual(original, [320, 400, 1440]);
});
