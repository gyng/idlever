import { test } from "node:test";
import assert from "node:assert/strict";
import { median, evaluateClaim } from "./stat-bounds.mjs";

const claim = { estimand: "median", direction: "at-least", threshold: 0.5 };
const meanClaim = { ...claim, estimand: "mean", range: [0, 1] };

test("descriptive median handles odd/even values without mutating inputs", () => {
  const values = [9, 1, 4, 2];
  assert.equal(median(values), 3);
  assert.deepEqual(values, [9, 1, 4, 2]);
  assert.equal(median([9, 1, 4]), 4);
  assert.equal(median([]), null);
  assert.equal(median([-Number.MAX_VALUE, Number.MAX_VALUE]), 0);
  assert.equal(median([Number.MIN_VALUE, Number.MIN_VALUE]), Number.MIN_VALUE);
});

test("zero observations are unbounded and inconclusive for either estimand", () => {
  for (const c of [claim, meanClaim]) {
    assert.deepEqual(evaluateClaim([], c, 0.05), {
      status: "INCONCLUSIVE",
      n: 0,
      estimate: null,
      lower: -Infinity,
      upper: Infinity,
      alpha: 0.05,
      rank: null,
    });
  }
});

test("four favorable seeds cannot certify a median at 95 percent", () => {
  const result = evaluateClaim([1, 1, 1, 1], claim, 0.05);
  assert.equal(result.status, "INCONCLUSIVE");
  assert.equal(result.lower, -Infinity);
  assert.equal(result.upper, Infinity);
  assert.equal(result.estimate, 1);
});

test("eight seeds use the total two-sided budget and include exact tail equality", () => {
  const all = Array(8).fill(1);
  assert.equal(evaluateClaim(all, claim, 0.01).status, "PASS");
  // Each tail needs 1/256, hence the total budget needs 2/256.
  assert.equal(evaluateClaim(all, claim, 2 / 256).status, "PASS");
  assert.equal(evaluateClaim(all, claim, 1 / 256).status, "INCONCLUSIVE");
  assert.equal(evaluateClaim([0, ...Array(7).fill(1)], claim, 0.01).status, "INCONCLUSIVE");
});

test("sixteen-seed interval agrees with exact binomial tails", () => {
  // P(Bin(16,1/2)<=3)=697/65536; <=4 is 2517/65536.
  const values = Array.from({ length: 16 }, (_, i) => i);
  const result = evaluateClaim(values, { ...claim, threshold: 3 }, 0.05);
  assert.equal(result.rank, 4);
  assert.equal(result.lower, 3);
  assert.equal(result.upper, 12);
  assert.equal(result.status, "PASS");
  assert.equal(evaluateClaim(values, { ...claim, threshold: 13 }, 0.05).status, "FAIL");
  assert.equal(evaluateClaim(values, { ...claim, threshold: 12 }, 0.05).status, "INCONCLUSIVE");
  assert.equal(evaluateClaim(values, claim, (2 * 697) / 65536).rank, 4);
  assert.equal(evaluateClaim(values, claim, (2 * 696) / 65536).rank, 3);
});

test("ties and threshold equality keep inclusive PASS and strict FAIL semantics", () => {
  for (const direction of ["at-least", "at-most"]) {
    assert.equal(evaluateClaim(Array(16).fill(0.5), { ...claim, direction }, 0.05).status, "PASS");
  }
  const values = Array.from({ length: 16 }, (_, i) => i);
  assert.equal(
    evaluateClaim(values, { ...claim, direction: "at-most", threshold: 12 }, 0.05).status,
    "PASS",
  );
  assert.equal(
    evaluateClaim(values, { ...claim, direction: "at-most", threshold: 3 }, 0.05).status,
    "INCONCLUSIVE",
  );
  assert.equal(
    evaluateClaim(values, { ...claim, direction: "at-most", threshold: 2 }, 0.05).status,
    "FAIL",
  );
});

test("mean uses paired-value magnitudes rather than only signs", () => {
  const c = { estimand: "mean", direction: "at-least", threshold: 0, range: [-100, 100] };
  const values = [...Array(15).fill(1), -100];
  const result = evaluateClaim(values, c, 0.05);
  assert.ok(Math.abs(result.estimate - -85 / 16) < 1e-12);
  assert.equal(result.status, "INCONCLUSIVE");
  const medianResult = evaluateClaim(values, { ...claim, threshold: 0 }, 0.05);
  assert.equal(medianResult.status, "PASS");
  const all = evaluateClaim(Array(16).fill(1), meanClaim, 0.05);
  const radius = Math.sqrt(Math.log(40) / 32);
  assert.ok(Math.abs(all.lower - (1 - radius)) < 1e-15);
  assert.equal(all.upper, 1);
  assert.equal(all.status, "PASS");
  assert.equal(evaluateClaim(Array(16).fill(0), meanClaim, 0.05).status, "FAIL");
});

test("fixed range permits constant data and stable extreme finite estimates", () => {
  const constant = evaluateClaim([7], { ...meanClaim, range: [7, 7], threshold: 7 }, 0.05);
  assert.equal(constant.lower, 7);
  assert.equal(constant.upper, 7);
  assert.equal(constant.status, "PASS");
  const extremes = evaluateClaim(
    [-Number.MAX_VALUE, Number.MAX_VALUE],
    {
      ...meanClaim,
      range: [-Number.MAX_VALUE, Number.MAX_VALUE],
      threshold: 0,
    },
    0.05,
  );
  assert.equal(extremes.estimate, 0);
  assert.equal(extremes.lower, -Number.MAX_VALUE);
  assert.equal(extremes.upper, Number.MAX_VALUE);
});

test("large-n median tails do not underflow into invented certainty", () => {
  const result = evaluateClaim(
    Array.from({ length: 2048 }, (_, i) => i),
    { ...claim, threshold: 1000 },
    0.05,
  );
  assert.ok(result.rank > 900 && result.rank < 1024);
  assert.equal(result.lower, result.rank - 1);
  assert.equal(result.upper, 2048 - result.rank);
  assert.equal(evaluateClaim(Array(16).fill(1), claim, Number.MIN_VALUE).status, "INCONCLUSIVE");
});

test("invalid observations and claims fail closed", () => {
  for (const values of [null, {}, [NaN], [Infinity], [-Infinity], ["1"], Array(3)]) {
    assert.throws(() => evaluateClaim(values, claim, 0.05));
    assert.throws(() => median(values));
  }
  for (const alpha of [0, 1, -0.1, 2, NaN, Infinity, "0.05", undefined])
    assert.throws(() => evaluateClaim([0], claim, alpha));
  for (const c of [
    null,
    [],
    {},
    { ...claim, estimand: "ratio" },
    { ...claim, direction: "greater" },
    { ...claim, threshold: NaN },
    { ...claim, threshold: Infinity },
    { ...claim, threshold: "0" },
    { ...claim, typo: 1 },
    { ...meanClaim, range: undefined },
    { ...meanClaim, range: [1, 0] },
    { ...meanClaim, range: [0, Infinity] },
    { ...meanClaim, range: [0] },
    { ...meanClaim, range: [0, "1"] },
  ])
    assert.throws(() => evaluateClaim([0], c, 0.05));
  assert.throws(() => evaluateClaim([2], meanClaim, 0.05), /outside/);
  assert.throws(() => evaluateClaim([-1], meanClaim, 0.05), /outside/);
});

test("all 2^16 null paths respect the family budget at preregistered looks", () => {
  const stages = [4, 8, 16];
  const weights = [0.2, 0.3, 0.5];
  const familyAlpha = 0.05;
  // Signs under the null are fair independent bits. Compute each stage/count
  // decision once, then enumerate all paths, including paths stopped early.
  for (const estimand of ["median", "mean"]) {
    const decisions = stages.map((n, look) =>
      Array.from({ length: n + 1 }, (_, k) => {
        const values = [...Array(k).fill(1), ...Array(n - k).fill(0)];
        return (
          evaluateClaim(
            values,
            estimand === "median" ? claim : meanClaim,
            familyAlpha * weights[look],
          ).status !== "INCONCLUSIVE"
        );
      }),
    );
    let crossed = 0;
    for (let path = 0; path < 2 ** 16; path++) {
      let k = 0;
      let look = 0;
      for (let n = 1; n <= 16; n++) {
        k += (path >>> (n - 1)) & 1;
        if (n === stages[look]) {
          if (decisions[look][k]) {
            crossed++;
            break;
          }
          look++;
        }
      }
    }
    assert.ok(crossed / 2 ** 16 <= familyAlpha, `${estimand}: ${crossed}/65536`);
  }
});
