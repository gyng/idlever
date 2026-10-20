// Independent reconstruction from archived scalar data, with exact rational tails.
// Does not import the production inference helper or read native chunk caches.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = "docs/evidence/cut281";
const load = (name) => JSON.parse(readFileSync(`${root}/${name}.json`, "utf8"));
const manifest = load("manifest");
const rows = load("observations");
const report = load("report");
assert.equal(
  createHash("sha256")
    .update(readFileSync(`${root}/frozen-contract.md`))
    .digest("hex"),
  manifest.identity.contract,
);
assert.equal(manifest.seeds.length, 128);
assert.equal(new Set(manifest.seeds).size, 128);
assert.equal(rows.length, 384);
assert.equal(new Set(rows.map((r) => `${r.profile}/${r.seed}`)).size, 384);
assert.equal(report.canonicalGateStatus, "NOT_RUN");
const expectedAlpha = (0.05 * (1 - 2 ** -38)) / 24;
assert.equal(report.alphaPerInterval, expectedAlpha);

function bounds(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let count = 0n,
    choose = 1n,
    rank = 0;
  // alpha/2 = (2^38-1)/(960 * 2^38), exactly.
  for (let j = 0; j < Math.ceil(n / 2); j++) {
    count += choose;
    if (count * 960n * 2n ** 38n > (2n ** 38n - 1n) * 2n ** BigInt(n)) break;
    rank = j + 1;
    choose = (choose * BigInt(n - j)) / BigInt(j + 1);
  }
  const lower = rank ? sorted[rank - 1] : "-Infinity";
  const upper = rank ? sorted[n - rank] : "Infinity";
  return {
    n,
    estimate: (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    lower,
    upper,
    alpha: expectedAlpha,
    rank,
    status:
      typeof upper === "number" && upper <= 0
        ? "PASS"
        : typeof lower === "number" && lower > 0
          ? "FAIL"
          : "INCONCLUSIVE",
  };
}

for (const name of ["shipping", "weaker", "stronger"]) {
  for (const field of ["d18", "d23"]) {
    const values = manifest.seeds.map((seed, i) => {
      const a = rows.find((r) => r.seed === seed && r.profile === name);
      const b = rows.find((r) => r.seed === seed && r.profile === "shipping");
      assert.ok(a && b);
      assert.equal(a.cohort, i < 32 ? "pilot" : "reference");
      for (const row of [a, b]) {
        assert.ok(
          Number.isFinite(row.observedHours) && row.observedHours > 0 && row.observedHours <= 168,
        );
        assert.ok(
          row[field] === null ||
            (Number.isFinite(row[field]) && row[field] >= 0 && row[field] <= row.observedHours),
        );
      }
      return (a[field] ?? 176) - (b[field] ?? 176);
    });
    const actual = report.claims.find((c) => c.name === name && c.field === field);
    const pilot = [8, 16, 32].map((n) => bounds(values.slice(0, n)));
    const reference = bounds(values.slice(32));
    assert.deepEqual(actual.pilot, pilot);
    assert.deepEqual(actual.reference, reference);
    const first = pilot.find((p) => p.status !== "INCONCLUSIVE") ?? pilot.at(-1);
    assert.deepEqual(actual.firstPilotVerdict, first);
    assert.equal(
      actual.agreement,
      first.status === "INCONCLUSIVE" || reference.status === "INCONCLUSIVE"
        ? "UNRESOLVED"
        : first.status === reference.status
          ? "AGREE"
          : "DISAGREE",
    );
    for (const [cohort, seeds] of [
      ["pilot", manifest.seeds.slice(0, 32)],
      ["reference", manifest.seeds.slice(32)],
    ]) {
      assert.deepEqual(actual.censoring[cohort], {
        candidate: rows.filter(
          (r) => seeds.includes(r.seed) && r.profile === name && r[field] === null,
        ).length,
        baseline: rows.filter(
          (r) => seeds.includes(r.seed) && r.profile === "shipping" && r[field] === null,
        ).length,
      });
    }
  }
}
assert.equal(report.claims.length, 6);
console.log(
  "PASS: all six pilot/reference reports, censor counts and 24 intervals independently reconstructed using exact rational binomial tails",
);
