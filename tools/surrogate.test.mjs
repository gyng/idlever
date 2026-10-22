// tools/surrogate.mjs: the GP / acquisition / design math (no cargo, no simulation).
//   node --test tools/surrogate.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backward,
  cholesky,
  choleskySolve,
  combine,
  decode,
  expectedImprovement,
  fitGP,
  forward,
  latinHypercube,
  matern52,
  mulberry32,
  normalCdf,
  normalizeSpec,
  objectivePosterior,
  predictGP,
  scalar,
  summarize,
  WORST_TIE_BREAK,
} from "./surrogate.mjs";

const close = (a, b, tol, what = "") =>
  assert.ok(Math.abs(a - b) <= tol, `${what} ${a} vs ${b} (tol ${tol})`);

test("cholesky factors a known SPD matrix and solves", () => {
  const A = [
    [4, 12, -16],
    [12, 37, -43],
    [-16, -43, 98],
  ];
  const L = cholesky(A);
  assert.deepEqual(
    L.map((r) => [...r]),
    [
      [2, 0, 0],
      [6, 1, 0],
      [-8, 5, 3],
    ],
  );
  const x = [1, -2, 0.5];
  const b = A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
  [...choleskySolve(L, b)].forEach((v, i) => close(v, x[i], 1e-9, "solve"));
  [...backward(L, forward(L, b))].forEach((v, i) => close(v, x[i], 1e-9, "fwd/back"));
  assert.throws(() =>
    cholesky([
      [1, 2],
      [2, 1],
    ]),
  );
});

test("matern52 is 1 at zero distance, decreasing, ARD-scaled", () => {
  assert.equal(matern52([0.3, 0.4], [0.3, 0.4], [0.2, 0.2], 1), 1);
  const near = matern52([0, 0], [0.1, 0], [0.2, 0.2], 1);
  const far = matern52([0, 0], [0.5, 0], [0.2, 0.2], 1);
  assert.ok(near < 1 && far < near && far > 0);
  // a long lengthscale on dimension 1 makes it nearly irrelevant
  close(matern52([0, 0], [0, 0.5], [0.2, 100], 2), 2, 1e-3, "ARD");
});

test("GP interpolates and predicts a smooth 1-D function out of sample", () => {
  const f = (x) => Math.sin(6 * x) + x;
  const X = Array.from({ length: 12 }, (_, i) => [i / 11]);
  const gp = fitGP(
    X,
    X.map(([x]) => f(x)),
    undefined,
    { seed: 3 },
  );
  for (const x of [0.13, 0.42, 0.77]) {
    const p = predictGP(gp, [x]);
    close(p.mean, f(x), 0.05, `f(${x})`);
    assert.ok(p.variance < 0.01);
  }
  // far from data the posterior is less certain than at a training point
  const atData = predictGP(gp, [0]).variance;
  const gp2 = fitGP([[0], [0.1], [0.2]], [0, 0.1, 0.2], undefined, { seed: 3 });
  assert.ok(predictGP(gp2, [0.9]).variance > atData);
});

test("GP on a 2-D quadratic with noise finds the maximiser region", () => {
  const rng = mulberry32(5);
  const f = ([a, b]) => -((a - 0.7) ** 2) - 2 * (b - 0.3) ** 2;
  const X = latinHypercube(25, 2, 11);
  const y = X.map((x) => f(x) + 0.002 * (rng() - 0.5));
  const gp = fitGP(
    X,
    y,
    X.map(() => 1e-6),
    { seed: 2 },
  );
  let best = null;
  for (const u of latinHypercube(2000, 2, 99, 1)) {
    const m = predictGP(gp, u).mean;
    if (!best || m > best.m) best = { u, m };
  }
  close(best.u[0], 0.7, 0.1, "a*");
  close(best.u[1], 0.3, 0.1, "b*");
});

test("constant data fits without dividing by zero", () => {
  const X = [[0], [0.5], [1]];
  const gp = fitGP(X, [16, 16, 16], [0, 0, 0], { seed: 1 });
  close(predictGP(gp, [0.25]).mean, 16, 1e-6, "flat");
});

test("Latin hypercube is deterministic, stratified and in range", () => {
  const a = latinHypercube(10, 3, 42);
  assert.deepEqual(a, latinHypercube(10, 3, 42));
  assert.notDeepEqual(a, latinHypercube(10, 3, 43));
  for (let k = 0; k < 3; k++) {
    const strata = a.map((p) => Math.floor(p[k] * 10)).sort((x, y) => x - y);
    assert.deepEqual(strata, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  assert.ok(a.flat().every((v) => v >= 0 && v < 1));
});

test("normal CDF and expected improvement", () => {
  close(normalCdf(0), 0.5, 1e-7);
  close(normalCdf(1.959964), 0.975, 1e-6);
  close(normalCdf(-1.959964), 0.025, 1e-6);
  // EI(mean=best, sigma=1) = φ(0)
  close(expectedImprovement(0, 1, 0), 1 / Math.sqrt(2 * Math.PI), 1e-12);
  assert.equal(expectedImprovement(2, 0, 1), 1);
  assert.equal(expectedImprovement(0, 0, 1), 0);
  assert.ok(expectedImprovement(0, 2, 0) > expectedImprovement(0, 1, 0));
  assert.ok(expectedImprovement(1, 1, 0) > expectedImprovement(0, 1, 0));
});

test("objective combination and its Monte Carlo posterior", () => {
  close(
    combine([3, -1, 2], "worst-margin", ["a", "b", "c"]),
    -1 + WORST_TIE_BREAK * (4 / 3),
    1e-12,
  );
  // ties on the worst claim break toward the better mean
  assert.ok(
    combine([0.5, 0.9], "worst-margin", ["a", "b"]) >
      combine([0.5, 0.6], "worst-margin", ["a", "b"]),
  );
  assert.equal(combine([3, -1, 1], "mean-margin", ["a", "b", "c"]), 1);
  assert.equal(combine([3, -1, 2], { claim: "c" }, ["a", "b", "c"]), 2);
  const rng = mulberry32(9);
  const draws = Array.from({ length: 20000 }, () => [
    Math.sqrt(-2 * Math.log(rng() || 1e-12)) * Math.cos(2 * Math.PI * rng()),
  ]);
  // a single claim: MC EI ≈ closed-form EI
  const post = objectivePosterior([{ mean: 0.5, variance: 1 }], { claim: "a" }, ["a"], draws, 0.2);
  close(post.ei, expectedImprovement(0.5, 1, 0.2), 0.02, "MC EI");
  close(post.mean, 0.5, 0.03, "MC mean");
});

test("spec, decode and claim summaries follow stat-tune semantics", () => {
  const base = { marks: { xp_late: 100 }, rest: { cap_ticks: 3000 } };
  const spec = normalizeSpec(
    {
      params: [
        { path: "marks.xp_late", min: 100, max: 400, integer: true },
        { path: "rest.cap_ticks", min: 1500, max: 6000, integer: true },
      ],
      probe: { bots: ["IDLE"], days: 12, untilDepth: 23 },
      claims: [
        {
          id: "d13",
          metric: { bot: "IDLE", field: "arrival_hours", depth: 13 },
          estimand: "median",
          direction: "at-most",
          threshold: 96,
        },
      ],
      budget: { initial: 4, iterations: 1, seedsPerPoint: 2 },
    },
    base,
  );
  assert.equal(spec.probe.checkins, 3);
  assert.throws(() => normalizeSpec({ ...spec, params: [{ path: "nope", min: 0, max: 1 }] }, base));
  const { values, unit } = decode(spec.params, [0.5, 1]);
  assert.deepEqual(values, [250, 6000]);
  assert.deepEqual(unit, [0.5, 1]);
  // unreached arrival imputes horizon + one check-in, as stat-tune does
  const rec = (h) => [
    { bot: "IDLE", effective_checkins_per_day: 3, seed_out: { hours: [8, h, null, null] } },
  ];
  const metric = spec.claims[0].metric;
  assert.deepEqual(scalar(rec(null), metric, spec.probe), { value: 296, censored: true });
  const s = summarize(
    [40, 56, 72, 296].map((h) => scalar(rec(h === 296 ? null : h), metric, spec.probe)),
    spec.claims[0],
  );
  assert.equal(s.estimate, 64);
  assert.equal(s.margin, 32);
  assert.equal(s.censored, 1);
  assert.ok(s.noise > 0);
});
