// Current native diagnostic launcher; never a progression gate or selected policy.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const args = process.argv.slice(2),
  get = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const out = resolve(get("--out", "target/cut238/idle-first-rank")),
  threads = Number(get("--threads", "4"));
const seeds = get("--seeds", "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16").split(",").map(Number);
assert.ok(threads >= 1 && threads <= 4 && Number.isInteger(threads));
assert.ok(
  seeds.length &&
    new Set(seeds).size === seeds.length &&
    seeds.every((n) => Number.isInteger(n) && n >= 1 && n <= 16),
);
assert.equal(process.env.IDLEVER_BALANCE_JSON, undefined, "no silent profile override");
assert.equal(process.env.IDLEVER_BALANCE_FILE, undefined, "no silent profile override");
assert.ok(!existsSync(out), "new evidence directory required");
mkdirSync(out, { recursive: true });
const binary = resolve("target/fast/examples/legacy_first_rank"),
  sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const sources = execFileSync("rg", ["--files", "crates/idlever-core/src"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .sort();
sources.push(
  "crates/idlever-core/examples/legacy_first_rank.rs",
  "tuning/balance.json",
  "docs/evidence/cut238/run-idle-first-rank.mjs",
  "docs/evidence/cut238/IDLE_FIRST_RANK_PROTOCOL.md",
);
const identity = {
  diagnosticOnly: true,
  protocol:
    "IDLE actions; continuous public Session.advance1000ms; no canonical dayplayer/cadence, PICKED, default policy or acceptance claim",
  startedAt: new Date().toISOString(),
  seeds,
  threads,
  sourceBefore: Object.fromEntries(sources.map((p) => [p, sha(p)])),
  binary: { path: binary, sha256: sha(binary) },
  parameters: {
    acquisitionHours: 48,
    postForkHours: 48,
    arms: ["no-spend", "health1", "damage1", "armour1"],
    oneRankPrice: 15,
    publicHomePurchaseOnly: true,
  },
};
writeFileSync(`${out}/identity.json`, JSON.stringify(identity, null, 2));
const jobs = [],
  queue = [...seeds];
let failure = false;
async function worker() {
  while (queue.length && !failure) {
    const seed = queue.shift(),
      started = Date.now();
    const log = [];
    const code = await new Promise((resolveCode) => {
      const child = spawn(binary, [out, String(seed)], { stdio: ["ignore", "pipe", "pipe"] });
      jobs.push({ seed, pid: child.pid, startedAt: new Date().toISOString() });
      writeFileSync(`${out}/progress.json`, JSON.stringify(jobs, null, 2));
      child.stdout.on("data", (v) => {
        log.push(String(v));
        process.stdout.write(v);
      });
      child.stderr.on("data", (v) => {
        log.push(String(v));
        process.stderr.write(v);
      });
      child.on("error", (e) => {
        log.push(String(e));
        resolveCode(-1);
      });
      child.on("exit", (code, signal) => resolveCode(code ?? signal ?? -1));
    });
    writeFileSync(`${out}/seed-${seed}.log`, log.join(""));
    const job = jobs.find((j) => j.seed === seed);
    Object.assign(job, {
      exitCode: code,
      seconds: (Date.now() - started) / 1000,
      finishedAt: new Date().toISOString(),
    });
    writeFileSync(`${out}/progress.json`, JSON.stringify(jobs, null, 2));
    if (code !== 0) failure = true;
  }
}
await Promise.all(Array.from({ length: Math.min(threads, seeds.length) }, worker));
identity.finishedAt = new Date().toISOString();
identity.sourceAfter = Object.fromEntries(sources.map((p) => [p, sha(p)]));
identity.sourceUnchanged =
  JSON.stringify(identity.sourceBefore) === JSON.stringify(identity.sourceAfter);
identity.binaryUnchanged = sha(binary) === identity.binary.sha256;
identity.complete = jobs.length === seeds.length && jobs.every((j) => j.exitCode === 0);
writeFileSync(`${out}/identity.json`, JSON.stringify(identity, null, 2));
const records = [];
for (const seed of seeds) {
  const path = `${out}/seed-${seed}/results.json`;
  if (existsSync(path)) records.push(JSON.parse(readFileSync(path)));
}
const median = (xs) => {
  const a = [...xs].sort((a, b) => a - b),
    i = Math.floor(a.length / 2);
  return a.length ? (a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2) : null;
};
const comparisons = {};
for (const root of ["health", "damage", "armour"]) {
  const pairs = seeds.map((seed) => {
    const row = records.find((r) => r.seed === seed),
      baseline = row?.arms.find((a) => a.arm === "no-spend"),
      treatment = row?.arms.find((a) => a.arm === root),
      b = baseline?.endpoint?.detail.elapsed_from_fork_s_bracket,
      t = treatment?.endpoint?.detail.elapsed_from_fork_s_bracket;
    const ratio = b && t && b[1] > 0 && t[1] > 0 ? b[1] / t[1] : null;
    return {
      seed,
      baselineElapsedBracket: b ?? null,
      treatmentElapsedBracket: t ?? null,
      baselineCensored: baseline?.censored ?? true,
      treatmentCensored: treatment?.censored ?? true,
      ratio,
      ratioInterval: ratio !== null && t[0] > 0 ? [b[0] / t[1], b[1] / t[0]] : null,
    };
  });
  const finite = pairs.filter((p) => p.ratio !== null).map((p) => p.ratio);
  comparisons[root] = {
    pairs,
    finitePairs: finite.length,
    all16FiniteMedian: seeds.length === 16 && finite.length === 16 ? median(finite) : null,
    finiteSubsetMedianDescriptiveOnly: median(finite),
    note: "Missing/censored endpoints are null, never an infinite successful speedup. No policy/whole-contract gate claim.",
  };
}
writeFileSync(
  `${out}/summary.json`,
  JSON.stringify(
    {
      diagnosticOnly: true,
      identity,
      completedSeeds: records.map((r) => r.seed),
      observations: records.map((r) => ({
        seed: r.seed,
        manualSends: r.manual_sends,
        scout: r.scout?.clock_s ?? null,
        firstDeathActualExitS: r.first_death?.detail.actual_exit.clock_s ?? null,
        firstDeathObservedS: r.first_death?.observed.clock_s ?? null,
        first15ObservedS: r.first_affordable_15?.observed.clock_s ?? null,
        first15Away: r.first_affordable_15?.detail.away ?? null,
        firstHomeObservedS: r.first_home_eligible_after_death?.observed.clock_s ?? null,
        forkObservedS: r.first_eligible_post_intro_home_purchase?.observed.clock_s ?? null,
        unreached: r.unreached_checkpoint,
      })),
      comparisons,
    },
    null,
    2,
  ),
);
assert.ok(
  identity.sourceUnchanged && identity.binaryUnchanged,
  "diagnostic source/runtime changed",
);
if (!identity.complete) process.exitCode = 1;
