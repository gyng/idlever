#!/usr/bin/env node
// Surrogate search: Gaussian-process models of claim metrics + Bayesian optimisation over numeric profile
// parameters, from short native probe runs. Exploratory only: it proposes ONE candidate for the held-out
// statistical confirmation (tools/tune.sh); it never claims acceptance itself.
//
//   node tools/surrogate.mjs --name NAME --spec tuning/studies/surrogate-example.json [--threads 12]
//        [--out DIR] [--bin PATH] [--list]
//
// Spec: {base, params: [{path, min, max, integer?}], probe: {bots, days, untilDepth?, checkins?},
//   claims: [stat-tune claims], budget: {initial, iterations, batch?, seedsPerPoint, holdout?, candidates?},
//   objective?: "worst-margin" (default) | "mean-margin" | {"claim": ID}, seeds?: [u64 strings]}.
// Observations are cached per (executable, profile, probe, seed) under target/surrogate/NAME/jobs/, so a
// rerun resumes and a changed spec reuses every matching observation. Every design point uses the same seeds
// (common random numbers). Outputs: report.md, report.json, confirm-spec.json in the study directory.
// Docs: docs/STATISTICAL_TUNING.md "Surrogate search".
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setPath } from "./sweep.mjs";
import { median } from "./stat-bounds.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MILESTONES = [8, 13, 18, 23, 28, 29, 33];
const MAX_THREADS = 12;
export const WORST_TIE_BREAK = 0.01;

// ---------------------------------------------------------------- pure math (tools/surrogate.test.mjs)

/** Deterministic PRNG in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const seedOf = (text) => createHash("sha256").update(String(text)).digest().readUInt32BE(0);

/** Standard normal draws (Box–Muller) from a uniform PRNG. */
export function gaussian(rng) {
  const u = Math.max(rng(), 1e-300);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** One Latin hypercube of n points in [0,1]^d. */
function lhsOnce(n, d, rng) {
  const cols = Array.from({ length: d }, () => {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    return perm.map((p) => (p + rng()) / n);
  });
  return Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
}
function minDistance(points) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      best = Math.min(best, Math.hypot(...points[i].map((v, k) => v - points[j][k])));
  return best;
}
/** Maximin Latin hypercube: the best of `tries` random hypercubes; deterministic for a seed. */
export function latinHypercube(n, d, seed, tries = 64) {
  const rng = mulberry32(seed);
  let best = null,
    score = -1;
  for (let t = 0; t < tries; t++) {
    const pts = lhsOnce(n, d, rng);
    const s = n > 1 ? minDistance(pts) : 0;
    if (s > score) [best, score] = [pts, s];
  }
  return best;
}

/** Lower-triangular L with A = L Lᵀ; throws if A is not (numerically) positive definite. */
export function cholesky(A) {
  const n = A.length;
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0)) throw Error("surrogate: matrix not positive definite");
        L[i][i] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
  return L;
}
/** Solve L x = b (forward substitution). */
export function forward(L, b) {
  const x = new Float64Array(b.length);
  for (let i = 0; i < b.length; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}
/** Solve Lᵀ x = b (back substitution). */
export function backward(L, b) {
  const n = b.length,
    x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}
/** Solve (L Lᵀ) x = b. */
export const choleskySolve = (L, b) => backward(L, forward(L, b));

/** Matérn-5/2 kernel with per-dimension lengthscales (ARD). */
export function matern52(a, b, lengthscales, variance) {
  let r2 = 0;
  for (let i = 0; i < a.length; i++) r2 += ((a[i] - b[i]) / lengthscales[i]) ** 2;
  const r = Math.sqrt(5 * r2);
  return variance * (1 + r + (5 * r2) / 3) * Math.exp(-r);
}

/** Exact GP posterior on standardized targets with fixed hyperparameters; null if singular. */
export function gpCondition(X, y, noise, hyper) {
  const n = X.length;
  const mu = y.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(y.reduce((a, b) => a + (b - mu) ** 2, 0) / n) || 1;
  const ys = y.map((v) => (v - mu) / sd);
  const K = X.map((a, i) =>
    X.map(
      (b, j) =>
        matern52(a, b, hyper.lengthscales, hyper.variance) +
        (i === j ? ((hyper.noiseScale ?? 1) * noise[i]) / sd ** 2 + hyper.nugget : 0),
    ),
  );
  let L;
  try {
    L = cholesky(K);
  } catch {
    return null;
  }
  const alpha = choleskySolve(L, ys);
  let logDet = 0;
  for (let i = 0; i < n; i++) logDet += Math.log(L[i][i]);
  const fit = ys.reduce((a, v, i) => a + v * alpha[i], 0);
  const logLik = -0.5 * fit - logDet - 0.5 * n * Math.log(2 * Math.PI) - n * Math.log(sd);
  return { X, y, noise, hyper, mu, sd, L, alpha, logLik };
}

/**
 * Maximum-marginal-likelihood GP: deterministic random search over lengthscales, variance, nugget and a
 * multiplier on the supplied per-point noise (few-seed variance estimates are themselves noisy).
 */
export function fitGP(X, y, noise = X.map(() => 0), { seed = 1, samples = 300 } = {}) {
  const d = X[0].length;
  const rng = mulberry32(seed);
  const logU = (lo, hi) => Math.exp(Math.log(lo) + rng() * (Math.log(hi) - Math.log(lo)));
  const tries = [{ lengthscales: Array(d).fill(0.3), variance: 1, nugget: 1e-4, noiseScale: 1 }];
  for (let s = 0; s < samples; s++)
    tries.push({
      lengthscales: Array.from({ length: d }, () => logU(0.05, 3)),
      variance: logU(0.1, 10),
      nugget: logU(1e-6, 1),
      noiseScale: logU(0.5, 8),
    });
  let best = null;
  for (const hyper of tries) {
    const gp = gpCondition(X, y, noise, hyper);
    if (gp && (!best || gp.logLik > best.logLik)) best = gp;
  }
  if (!best) throw Error("surrogate: no GP hyperparameters fit the data");
  return best;
}

/** Posterior mean and latent (noise-free) variance at x. */
export function predictGP(gp, x) {
  const k = gp.X.map((a) => matern52(a, x, gp.hyper.lengthscales, gp.hyper.variance));
  const mean = k.reduce((a, v, i) => a + v * gp.alpha[i], 0);
  const v = forward(gp.L, k);
  const latent = Math.max(gp.hyper.variance - v.reduce((a, b) => a + b * b, 0), 1e-12);
  return { mean: gp.mu + gp.sd * mean, variance: latent * gp.sd ** 2 };
}

export const normalPdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf; |error| < 1.5e-7). */
export function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
/** Expected improvement over `best` for a maximised normal N(mean, sigma²). */
export function expectedImprovement(mean, sigma, best) {
  if (!(sigma > 1e-12)) return Math.max(0, mean - best);
  const z = (mean - best) / sigma;
  return (mean - best) * normalCdf(z) + sigma * normalPdf(z);
}

/** Combine per-claim margins into the objective (maximised). */
export function combine(margins, objective, claimIds) {
  if (objective === "mean-margin") return margins.reduce((a, b) => a + b, 0) / margins.length;
  if (objective && typeof objective === "object") return margins[claimIds.indexOf(objective.claim)];
  // A claim flat at its own margin would tie every point; a small mean term breaks those ties.
  return (
    Math.min(...margins) + WORST_TIE_BREAK * (margins.reduce((a, b) => a + b, 0) / margins.length)
  );
}
/**
 * Objective posterior from independent per-claim normal posteriors, by common-random-number Monte Carlo
 * (exact for a single claim/mean-margin, a smooth estimate for the worst margin). Returns {mean, sd, ei}.
 */
export function objectivePosterior(preds, objective, claimIds, draws, best) {
  const values = draws.map((z) =>
    combine(
      preds.map((p, k) => p.mean + Math.sqrt(p.variance) * z[k]),
      objective,
      claimIds,
    ),
  );
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  const ei =
    best === undefined ? 0 : values.reduce((a, v) => a + Math.max(0, v - best), 0) / values.length;
  return {
    mean,
    sd,
    ei,
    plugin: combine(
      preds.map((p) => p.mean),
      objective,
      claimIds,
    ),
  };
}

// ---------------------------------------------------------------- spec, profiles, metrics

function need(condition, message) {
  if (!condition) throw Error(`surrogate: ${message}`);
}
const canonical = (x) =>
  JSON.stringify(x, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
const sha = (x) => createHash("sha256").update(x).digest("hex");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
function save(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
  renameSync(temp, path);
}

function checkMetric(metric, probe) {
  if (metric?.ratio) {
    need(Array.isArray(metric.ratio) && metric.ratio.length === 2, "ratio needs two metrics");
    return metric.ratio.forEach((m) => checkMetric(m, probe));
  }
  need(probe.bots.includes(metric?.bot), `metric bot ${metric?.bot} is not in probe.bots`);
  if (metric.field === "arrival_hours") {
    need(MILESTONES.includes(metric.depth), "arrival_hours needs a milestone depth");
    need(
      probe.untilDepth === undefined || probe.untilDepth >= metric.depth,
      "probe stops before the requested arrival depth",
    );
  } else {
    need(["best_day", "gold_day"].includes(metric.field), `unsupported metric ${metric.field}`);
    need(
      Number.isSafeInteger(metric.day) && metric.day >= 1 && metric.day <= probe.days,
      "daily metric needs a day within the horizon",
    );
    need(probe.untilDepth === undefined, "daily metrics need completed days; omit untilDepth");
  }
}

export function normalizeSpec(input, base) {
  const allowed = ["base", "params", "probe", "claims", "budget", "objective", "seeds", "confirm"];
  for (const k of Object.keys(input)) need(allowed.includes(k), `unknown spec field ${k}`);
  need(Array.isArray(input.params) && input.params.length >= 1, "declare params");
  const params = input.params.map((p) => {
    need(typeof p.path === "string" && p.min < p.max, `param ${p.path} needs min < max`);
    const probeProfile = structuredClone(base);
    setPath(probeProfile, p.path, p.min); // throws if the path is not in the base profile
    return { path: p.path, min: p.min, max: p.max, integer: Boolean(p.integer) };
  });
  need(new Set(params.map((p) => p.path)).size === params.length, "duplicate param paths");
  const probe = { checkins: 3, ...input.probe };
  need(Array.isArray(probe.bots) && probe.bots.length, "probe.bots must list policies");
  need(Number.isSafeInteger(probe.days) && probe.days >= 1, "probe.days must be positive");
  need(
    probe.untilDepth === undefined || MILESTONES.includes(probe.untilDepth),
    "untilDepth must be a recorded milestone",
  );
  need(Array.isArray(input.claims) && input.claims.length, "declare claims");
  const ids = new Set();
  const claims = input.claims.map((c) => {
    need(typeof c.id === "string" && !ids.has(c.id), "claims need unique ids");
    ids.add(c.id);
    checkMetric(c.metric, probe);
    need(["median", "mean"].includes(c.estimand), `claim ${c.id}: estimand median|mean`);
    need(["at-least", "at-most"].includes(c.direction), `claim ${c.id}: direction`);
    need(Number.isFinite(c.threshold), `claim ${c.id}: finite threshold`);
    need(
      (c.comparison ?? "absolute") === "absolute",
      `claim ${c.id}: surrogate search models absolute claims only`,
    );
    const rankingScale = c.rankingScale ?? 1;
    need(rankingScale > 0, `claim ${c.id}: rankingScale must be positive`);
    return { ...c, rankingScale };
  });
  const budget = { initial: 10, iterations: 10, seedsPerPoint: 4, holdout: 3, ...input.budget };
  for (const k of ["initial", "iterations", "seedsPerPoint", "holdout"])
    need(Number.isSafeInteger(budget[k]) && budget[k] >= 0, `budget.${k} must be an integer`);
  need(budget.initial >= 3 && budget.seedsPerPoint >= 1, "budget needs ≥3 initial points, ≥1 seed");
  const objective = input.objective ?? "worst-margin";
  need(
    objective === "worst-margin" ||
      objective === "mean-margin" ||
      (typeof objective === "object" && ids.has(objective.claim)),
    'objective must be "worst-margin", "mean-margin" or {"claim": ID}',
  );
  if (input.seeds)
    need(
      Array.isArray(input.seeds) &&
        input.seeds.length === budget.seedsPerPoint &&
        input.seeds.every((s) => /^(?:0|[1-9][0-9]*)$/.test(String(s))),
      "seeds must list seedsPerPoint u64 strings",
    );
  return { params, probe, claims, budget, objective, seeds: input.seeds?.map(String) };
}

/** Unit-cube point → parameter values (integers rounded), and the snapped unit point actually modelled. */
export function decode(params, u) {
  const values = params.map((p, i) => {
    const v = p.min + Math.min(1, Math.max(0, u[i])) * (p.max - p.min);
    return p.integer ? Math.round(v) : Number(v.toPrecision(6));
  });
  return {
    values,
    unit: values.map((v, i) => (v - params[i].min) / (params[i].max - params[i].min)),
  };
}
export function profileFor(base, params, values) {
  const profile = structuredClone(base);
  params.forEach((p, i) => setPath(profile, p.path, values[i]));
  return profile;
}

/** One seed's scalar claim metric from its native records (stat-tune's definitions). */
export function scalar(records, metric, probe) {
  if (metric.ratio) {
    const a = scalar(records, metric.ratio[0], probe),
      b = scalar(records, metric.ratio[1], probe);
    need(b.value > 0, "ratio denominator must be positive");
    return { value: a.value / b.value, censored: a.censored || b.censored };
  }
  const record = records.find((r) => r.bot === metric.bot);
  need(record, `missing bot ${metric.bot}`);
  if (metric.field === "arrival_hours") {
    const hour = record.seed_out.hours[MILESTONES.indexOf(metric.depth)];
    return {
      value: hour ?? probe.days * 24 + 24 / record.effective_checkins_per_day,
      censored: hour === null,
    };
  }
  need(record.completed_days >= metric.day, "partial daily observations cannot satisfy a claim");
  return { value: record.seed_out[metric.field][metric.day - 1], censored: false };
}
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const variance = (v) =>
  v.length < 2 ? 0 : v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / (v.length - 1);

/** Per-claim point estimate, its normalised margin and the margin estimator's variance. */
export function summarize(perSeed, claim) {
  const values = perSeed.map((s) => s.value);
  const estimate = claim.estimand === "median" ? median(values) : mean(values);
  const sign = claim.direction === "at-least" ? 1 : -1;
  const margin = ((estimate - claim.threshold) * sign) / claim.rankingScale;
  // Var(mean) = s²/n; the median's large-sample efficiency is 2/π of the mean's.
  const factor = claim.estimand === "median" ? Math.PI / 2 : 1;
  const noise = (factor * variance(values)) / values.length / claim.rankingScale ** 2;
  return {
    estimate,
    margin,
    noise,
    censored: perSeed.filter((s) => s.censored).length,
    n: values.length,
  };
}

// ---------------------------------------------------------------- native probe

function validatePacket(packet, seeds, profile, probe) {
  need(packet?.schema === 1 && packet.kind === "dayplayer-stat-probe", "invalid probe schema");
  const r = packet.request;
  need(
    canonical([...r.seeds].sort()) === canonical([...seeds].sort()) &&
      canonical([...r.bots].sort()) === canonical([...probe.bots].sort()) &&
      r.days === probe.days &&
      r.checkins_per_day === probe.checkins &&
      (r.until_depth ?? null) === (probe.untilDepth ?? null),
    "native request identity mismatch",
  );
  const expected =
    Object.hasOwn(packet.balance ?? {}, "recovery_full_ticks") &&
    !Object.hasOwn(profile, "recovery_full_ticks")
      ? { ...profile, recovery_full_ticks: 12000 }
      : profile;
  need(canonical(packet.balance) === canonical(expected), "native balance identity mismatch");
  need(canonical(packet.milestones) === canonical(MILESTONES), "milestone mismatch");
  need(packet.records?.length === seeds.length * probe.bots.length, "missing native records");
  for (const rec of packet.records)
    need(
      seeds.includes(rec.seed) && probe.bots.includes(rec.bot) && rec.seed_out?.hours?.length === 7,
      "bad native record",
    );
  return packet;
}
function buildProbe(out, supplied) {
  let binary = supplied && resolve(supplied);
  if (!binary) {
    const build = spawnSync(
      "cargo",
      [
        "build",
        "-q",
        "--profile",
        "fast",
        "-p",
        "idlever-core",
        "--features",
        "dev-balance",
        "--example",
        "stat_probe",
      ],
      { cwd: root, stdio: ["ignore", "inherit", "inherit"] },
    );
    need(build.status === 0, "native probe build failed");
    binary = join(root, "target/fast/examples/stat_probe");
  }
  const digest = sha(readFileSync(binary));
  const snapshot = join(out, `probe-${digest.slice(0, 16)}`);
  if (!existsSync(snapshot)) {
    copyFileSync(binary, snapshot);
    chmodSync(snapshot, 0o755);
  }
  return { binary: snapshot, digest };
}
async function pool(items, limit, fn) {
  const queue = [...items];
  let failure;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (queue.length && !failure) {
        try {
          await fn(queue.shift());
        } catch (error) {
          failure ??= error;
        }
      }
    }),
  );
  if (failure) throw failure;
}

// ---------------------------------------------------------------- the search

function fmt(x, digits = 3) {
  return Number.isFinite(x) ? Number(x.toPrecision(digits)).toString() : String(x);
}

async function run(argv) {
  const opt = (flag) => {
    const i = argv.indexOf(flag);
    return i < 0 ? undefined : argv[i + 1];
  };
  if (argv.includes("--help")) {
    console.log(
      "node tools/surrogate.mjs --name NAME --spec SPEC.json [--threads 12] [--out DIR] [--bin PATH] [--list]",
    );
    return 0;
  }
  const name = opt("--name"),
    specFile = opt("--spec");
  need(name && /^[a-zA-Z0-9_-]+$/.test(name) && specFile, "use --name NAME --spec FILE");
  const input = read(resolve(specFile));
  const basePath = input.base ?? "tuning/balance.json";
  const base = read(resolve(root, basePath));
  const spec = normalizeSpec(input, base);
  const { params, probe, claims, budget, objective } = spec;
  const d = params.length;
  const threads = Math.min(
    MAX_THREADS,
    Number(opt("--threads") ?? process.env.GATES_THREADS ?? availableParallelism()),
  );
  need(Number.isSafeInteger(threads) && threads >= 1, "threads must be a positive integer");
  const batch = budget.batch ?? Math.max(1, Math.floor(threads / budget.seedsPerPoint));
  const nCandidates = budget.candidates ?? 4096;
  // Depends on the spec alone, so a renamed or re-run study reuses the same design and its cached runs.
  const studySeed = seedOf(canonical(spec));

  const initial = latinHypercube(budget.initial, d, studySeed).map((u) => decode(params, u));
  const holdout = budget.holdout
    ? latinHypercube(budget.holdout, d, studySeed ^ 0x5bd1e995).map((u) => decode(params, u))
    : [];
  if (argv.includes("--list")) {
    console.log(JSON.stringify({ spec, threads, batch, initial, holdout }, null, 2));
    return 0;
  }

  const out = resolve(opt("--out") ?? join(root, "target/surrogate", name));
  mkdirSync(join(out, "jobs"), { recursive: true });
  const native = buildProbe(out, opt("--bin"));
  const seedsPath = join(out, "seeds.json");
  let seeds = spec.seeds;
  if (!seeds) {
    const kept = existsSync(seedsPath) ? read(seedsPath) : null;
    seeds =
      kept?.length === budget.seedsPerPoint
        ? kept
        : Array.from({ length: budget.seedsPerPoint }, () =>
            randomBytes(8).readBigUInt64BE().toString(),
          );
  }
  need(new Set(seeds).size === seeds.length, "duplicate seeds");
  save(seedsPath, seeds);

  const started = Date.now();
  const work = { newSeedRuns: 0, cachedSeedRuns: 0, probeCalls: 0, simSeconds: 0 };
  const children = new Set();
  const stop = () => {
    for (const c of children)
      try {
        process.kill(-c.pid, "SIGKILL");
      } catch {
        c.kill("SIGKILL");
      }
    process.exit(130);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const jobKey = (profile, seed) => sha(canonical({ binary: native.digest, profile, probe, seed }));
  const perPoint = Math.max(1, Math.floor(threads / Math.max(1, Math.min(batch, threads))));

  /** Observe points (all seeds each); returns point records with per-claim summaries. */
  const observe = async (points, role) => {
    const results = [];
    await pool(points, Math.max(1, Math.floor(threads / perPoint)), async (pt) => {
      const profile = profileFor(base, params, pt.values);
      const records = new Map();
      const missing = [];
      for (const seed of seeds) {
        const path = join(out, "jobs", `${jobKey(profile, seed)}.json`);
        if (existsSync(path)) {
          try {
            const kept = read(path);
            validatePacket(kept, [seed], profile, probe);
            records.set(seed, kept.records);
            work.cachedSeedRuns++;
            continue;
          } catch {
            renameSync(path, `${path}.corrupt-${Date.now()}`);
          }
        }
        missing.push(seed);
      }
      if (missing.length) {
        const packetPath = join(
          out,
          `.probe-${process.pid}-${randomBytes(6).toString("hex")}.json`,
        );
        const env = Object.fromEntries(
          Object.entries(process.env).filter(
            ([k]) => !k.startsWith("DP_") && !k.startsWith("IDLEVER_"),
          ),
        );
        env.IDLEVER_BALANCE_JSON = JSON.stringify(profile);
        const args = [
          ["--seeds", missing.join(",")],
          ["--bots", probe.bots.join(",")],
          ["--days", String(probe.days)],
          ["--checkins", String(probe.checkins)],
          ["--threads", String(perPoint)],
          ["--out", packetPath],
          ...(probe.untilDepth ? [["--until-depth", String(probe.untilDepth)]] : []),
        ].flat();
        work.probeCalls++;
        console.error(
          `surrogate: ${role} ${params.map((p, i) => `${p.path}=${pt.values[i]}`).join(" ")}: ${missing.length} seeds`,
        );
        await new Promise((done, reject) => {
          const child = spawn(native.binary, args, {
            cwd: root,
            env,
            detached: true,
            stdio: ["ignore", "ignore", "pipe"],
          });
          children.add(child);
          let stderr = "";
          child.stderr.on("data", (x) => (stderr = (stderr + x).slice(-20000)));
          child.on("error", reject);
          child.on("close", (code) => {
            children.delete(child);
            if (code === 0) done();
            else reject(Error(`surrogate: probe failed (${code}): ${stderr.slice(-1500)}`));
          });
        });
        const packet = validatePacket(read(packetPath), missing, profile, probe);
        rmSync(packetPath, { force: true });
        for (const seed of missing) {
          const single = {
            ...packet,
            request: { ...packet.request, seeds: [seed] },
            records: packet.records.filter((r) => r.seed === seed),
          };
          save(join(out, "jobs", `${jobKey(profile, seed)}.json`), single);
          records.set(seed, single.records);
          work.newSeedRuns++;
          work.simSeconds += single.records.reduce((a, r) => a + r.elapsed_seconds, 0);
        }
      }
      const summaries = claims.map((c) =>
        summarize(
          seeds.map((s) => scalar(records.get(s), c.metric, probe)),
          c,
        ),
      );
      results.push({
        ...pt,
        role,
        claims: summaries,
        objective: combine(
          summaries.map((s) => s.margin),
          objective,
          claims.map((c) => c.id),
        ),
      });
    });
    // Pool order is completion order; keep the proposal order for reproducible fits.
    return points.map((pt) => results.find((r) => r.unit.every((u, i) => u === pt.unit[i])));
  };

  const ids = claims.map((c) => c.id);
  const zRng = mulberry32(studySeed ^ 0x9e3779b9);
  const draws = Array.from({ length: 256 }, () => claims.map(() => gaussian(zRng)));
  /** Per-claim GPs on margins; heteroscedastic noise = per-point estimator variance shrunk to the pool. */
  const fitAll = (points, fitSeed) =>
    claims.map((_, k) => {
      const raw = points.map((p) => p.claims[k].noise);
      const pooled = mean(raw);
      return fitGP(
        points.map((p) => p.unit),
        points.map((p) => p.claims[k].margin),
        raw.map((v) => (v + pooled) / 2),
        { seed: fitSeed + k },
      );
    });
  const posterior = (gps, unit, best) =>
    objectivePosterior(
      gps.map((gp) => predictGP(gp, unit)),
      objective,
      ids,
      draws,
      best,
    );

  const evaluated = await observe(initial, "initial");
  const history = [];
  for (let it = 0; it < budget.iterations; it++) {
    let gps = fitAll(evaluated, studySeed + 1000 * it);
    // Noisy EI: improvement over the best posterior mean among evaluated points.
    const best = Math.max(...evaluated.map((p) => posterior(gps, p.unit).mean));
    const rng = mulberry32(studySeed + 7919 * (it + 1));
    const incumbent = evaluated.reduce((a, p) =>
      posterior(gps, p.unit).mean > posterior(gps, a.unit).mean ? p : a,
    );
    const pool_ = [
      ...latinHypercube(nCandidates, d, studySeed + 31 * (it + 1), 1),
      ...Array.from({ length: 256 }, () =>
        incumbent.unit.map((u) => Math.min(1, Math.max(0, u + 0.08 * gaussian(rng)))),
      ),
    ];
    const taken = new Set(evaluated.map((p) => canonical(p.values)));
    const proposals = [];
    // Kriging believer: fantasize each chosen point at its predicted margins, keep the hyperparameters.
    const fantasy = [...evaluated];
    for (let q = 0; q < batch; q++) {
      let choice = null;
      for (const u of pool_) {
        const pt = decode(params, u);
        const key = canonical(pt.values);
        if (taken.has(key)) continue;
        const post = posterior(gps, pt.unit, best);
        if (!choice || post.ei > choice.post.ei) choice = { pt, key, post };
      }
      if (!choice) break;
      taken.add(choice.key);
      proposals.push({ ...choice.pt, acquisition: choice.post.ei, predicted: choice.post.mean });
      fantasy.push({
        ...choice.pt,
        claims: gps.map((gp, k) => {
          const p = predictGP(gp, choice.pt.unit);
          return { margin: p.mean, noise: fantasy.at(-1).claims[k].noise };
        }),
      });
      gps = gps.map((gp, k) =>
        gpCondition(
          fantasy.map((p) => p.unit),
          fantasy.map((p) => p.claims[k].margin),
          [...gp.noise, gp.noise.reduce((a, b) => a + b, 0) / gp.noise.length],
          gp.hyper,
        ),
      );
      if (gps.some((gp) => !gp)) break;
    }
    if (!proposals.length) break;
    const observed = await observe(proposals, `iteration ${it + 1}`);
    observed.forEach((p, i) => Object.assign(p, { acquisition: proposals[i].acquisition }));
    history.push({
      iteration: it + 1,
      incumbent: incumbent.values,
      proposals: observed.map((p) => ({
        values: p.values,
        ei: p.acquisition,
        predicted: proposals.find((q) => q.unit.every((u, i) => u === p.unit[i])).predicted,
        observed: p.objective,
      })),
    });
    evaluated.push(...observed);
  }

  // Final model, its predicted best, and an out-of-sample check on held-out points never used in fitting.
  const gps = fitAll(evaluated, studySeed + 999983);
  const finalPool = [
    ...evaluated.map((p) => p.unit),
    ...latinHypercube(nCandidates, d, studySeed + 104729, 1),
  ];
  let bestPred = null;
  for (const u of finalPool) {
    const pt = decode(params, u);
    const post = posterior(gps, pt.unit);
    if (!bestPred || post.mean > bestPred.post.mean) bestPred = { pt, post };
  }
  const bestClaims = claims.map((c, k) => {
    const p = predictGP(gps[k], bestPred.pt.unit);
    return { id: c.id, margin: p.mean, sd: Math.sqrt(p.variance) };
  });
  const bestObserved = evaluated.reduce((a, p) => (p.objective > a.objective ? p : a));
  const held = holdout.length ? await observe(holdout, "holdout") : [];
  const validation = held.map((p) => ({
    values: p.values,
    claims: claims.map((c, k) => {
      const pred = predictGP(gps[k], p.unit);
      const sd = Math.sqrt(pred.variance + p.claims[k].noise);
      return {
        id: c.id,
        predicted: pred.mean,
        observed: p.claims[k].margin,
        error: p.claims[k].margin - pred.mean,
        z: sd > 0 ? (p.claims[k].margin - pred.mean) / sd : 0,
      };
    }),
    objectivePredicted: posterior(gps, p.unit).mean,
    objectiveObserved: p.objective,
  }));
  const rmse = claims.map((c, k) => ({
    id: c.id,
    rmse: held.length ? Math.sqrt(mean(validation.map((v) => v.claims[k].error ** 2))) : null,
    trainingMarginRange: [
      Math.min(...evaluated.map((p) => p.claims[k].margin)),
      Math.max(...evaluated.map((p) => p.claims[k].margin)),
    ],
  }));

  const set = Object.fromEntries(params.map((p, i) => [p.path, bestPred.pt.values[i]]));
  const confirmSpec = {
    base: basePath,
    candidates: [{ name: `surrogate-${name}`, set }],
    probe: input.probe,
    claims: input.claims,
    discovery: { stages: [budget.seedsPerPoint] },
    confirmation: input.confirm ?? { looks: [8, 16, 32], alpha: 0.05 },
  };
  const confirmPath = join(out, "confirm-spec.json");
  save(confirmPath, confirmSpec);
  let confirmCheck = "validated by stat-tune normalizeSpec";
  try {
    const { normalizeSpec: statTuneSpec } = await import("./stat-tune.mjs");
    statTuneSpec(confirmSpec, base);
  } catch (error) {
    confirmCheck = `NOT validated: ${error.message}`;
  }
  const command = `tools/tune.sh --name surrogate-${name}-confirm --spec ${relative(root, confirmPath)} --threads ${threads}`;
  const seedRuns = evaluated.length * seeds.length;
  const report = {
    format: "idlever-surrogate-v1",
    name,
    status: "EXPLORATORY_ONLY",
    note: "Surrogate search ranks candidates; it is not statistical acceptance. Confirm with tools/tune.sh.",
    spec,
    seeds,
    native: native.digest,
    threads,
    batch,
    points: [...evaluated, ...held].map((p) => ({
      role: p.role,
      values: Object.fromEntries(params.map((q, i) => [q.path, p.values[i]])),
      objective: p.objective,
      claims: Object.fromEntries(ids.map((id, k) => [id, p.claims[k]])),
    })),
    history,
    model: claims.map((c, k) => ({
      id: c.id,
      lengthscales: gps[k].hyper.lengthscales,
      variance: gps[k].hyper.variance,
      nugget: gps[k].hyper.nugget,
      noiseScale: gps[k].hyper.noiseScale,
      logLik: gps[k].logLik,
    })),
    predictedBest: {
      values: set,
      objective: bestPred.post.mean,
      objectiveSd: bestPred.post.sd,
      claims: bestClaims,
    },
    bestObserved: {
      values: Object.fromEntries(params.map((q, i) => [q.path, bestObserved.values[i]])),
      objective: bestObserved.objective,
    },
    validation,
    rmse,
    work: {
      ...work,
      searchSeedRuns: seedRuns,
      holdoutSeedRuns: held.length * seeds.length,
      wallSeconds: (Date.now() - started) / 1000,
    },
    confirm: { spec: relative(root, confirmPath), command, check: confirmCheck },
  };
  save(join(out, "report.json"), report);
  writeFileSync(join(out, "report.md"), markdown(report, params, claims));
  process.stdout.write(markdown(report, params, claims));
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
  return 0;
}

function markdown(r, params, claims) {
  const head = `| role | ${params.map((p) => p.path).join(" | ")} | objective | ${claims.map((c) => `${c.id} est (margin; censored)`).join(" | ")} |`;
  const lines = [
    `# Surrogate search: ${r.name}`,
    "",
    `**${r.status}** — ${r.note}`,
    "",
    `Objective: ${typeof r.spec.objective === "string" ? r.spec.objective : `claim ${r.spec.objective.claim}`} of normalised margins ((estimate − threshold) × direction / rankingScale; positive passes). Seeds per point ${r.seeds.length} (common to every point), batch ${r.batch}, threads ${r.threads}.`,
    "",
    `Work: ${r.points.length} points; ${r.work.searchSeedRuns} search + ${r.work.holdoutSeedRuns} held-out seed-runs; ${r.work.newSeedRuns} new this invocation (${fmt(r.work.simSeconds, 4)} simulated-thread s), ${r.work.cachedSeedRuns} cached; wall ${fmt(r.work.wallSeconds, 4)} s.`,
    "",
    "## Predicted best (final GP)",
    "",
    `\`${JSON.stringify(r.predictedBest.values)}\` — objective ${fmt(r.predictedBest.objective)} ± ${fmt(r.predictedBest.objectiveSd)}`,
    "",
    "| claim | predicted margin ± sd |",
    "|---|---|",
    ...r.predictedBest.claims.map((c) => `| ${c.id} | ${fmt(c.margin)} ± ${fmt(c.sd)} |`),
    "",
    `Best observed point: \`${JSON.stringify(r.bestObserved.values)}\` objective ${fmt(r.bestObserved.objective)}.`,
    "",
    "## Held-out check (points never used to fit)",
    "",
    "| point | " +
      claims.map((c) => `${c.id} pred → obs (z)`).join(" | ") +
      " | objective pred → obs |",
    "|---|" + claims.map(() => "---|").join("") + "---|",
    ...r.validation.map(
      (v) =>
        `| ${v.values.join(", ")} | ${v.claims.map((c) => `${fmt(c.predicted)} → ${fmt(c.observed)} (${fmt(c.z, 2)})`).join(" | ")} | ${fmt(v.objectivePredicted)} → ${fmt(v.objectiveObserved)} |`,
    ),
    "",
    "| claim | held-out RMSE (margin units) | training margin range |",
    "|---|---|---|",
    ...r.rmse.map(
      (x) =>
        `| ${x.id} | ${x.rmse === null ? "—" : fmt(x.rmse)} | ${fmt(x.trainingMarginRange[0])} … ${fmt(x.trainingMarginRange[1])} |`,
    ),
    "",
    "## Every evaluated point",
    "",
    head,
    "|---|" + params.map(() => "---:|").join("") + "---:|" + claims.map(() => "---|").join(""),
    ...r.points.map(
      (p) =>
        `| ${p.role} | ${params.map((q) => p.values[q.path]).join(" | ")} | ${fmt(p.objective)} | ${claims
          .map((c) => {
            const s = p.claims[c.id];
            return `${fmt(s.estimate)} (${fmt(s.margin)}; ${s.censored}/${s.n})`;
          })
          .join(" | ")} |`,
    ),
    "",
    "## Confirm (held-out statistical verdict)",
    "",
    `Spec: \`${r.confirm.spec}\` (${r.confirm.check})`,
    "",
    "```sh",
    r.confirm.command,
    "```",
    "",
  ];
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await run(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
