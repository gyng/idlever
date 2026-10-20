// Cut281 fixed-cohort diagnostic. Run from the repository root with Node22.
// Raw native chunks stay in target/cut281; the manifest/scalars/report are archived.
import { createHash, randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  chmodSync,
} from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { evaluateClaim } from "../../../tools/stat-bounds.mjs";

const out = "target/cut281";
const evidence = "docs/evidence/cut281";
const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const load = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
mkdirSync(out, { recursive: true });
const base = load("tuning/balance.json");
const profiles = {
  shipping: base,
  weaker: { ...base, scar_pct: 1, scar_cap: 6 },
  stronger: { ...base, scar_pct: 10, scar_cap: 60 },
};
const identity = {
  source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  native: hash("target/fast/examples/stat_probe"),
  analysis: hash(`${evidence}/calibrate.mjs`),
  bounds: hash("tools/stat-bounds.mjs"),
  contract: hash("docs/CUT281_STATISTICAL_CALIBRATION.md"),
  profiles,
  probe: { bots: ["PICKED"], days: 7, until_depth: 23, checkins_per_day: 3 },
  pilotLooks: [8, 16, 32],
  referenceN: 96,
  alpha: 0.05,
  claimCount: 6,
  lookCount: 4,
};
const manifestPath = `${out}/manifest.json`;
let manifest;
if (existsSync(manifestPath)) {
  manifest = load(manifestPath);
  check(
    isDeepStrictEqual(manifest.identity, identity),
    "changed calibration identity; refuse resume",
  );
} else {
  const seeds = new Set();
  while (seeds.size < 128) seeds.add(randomBytes(8).readBigUInt64BE().toString());
  manifest = { identity, seeds: [...seeds], frozenAt: new Date().toISOString() };
  save(manifestPath, manifest);
  copyFileSync("target/fast/examples/stat_probe", `${out}/stat_probe`);
  chmodSync(`${out}/stat_probe`, 0o755);
}
check(hash(`${out}/stat_probe`) === identity.native, "snapshot native hash mismatch");
check(
  manifest.seeds.length === 128 && new Set(manifest.seeds).size === 128,
  "invalid seed schedule",
);
check(
  manifest.seeds.every((s) => /^(0|[1-9][0-9]*)$/.test(s) && BigInt(s) < 2n ** 64n),
  "invalid seed ID",
);
save(`${evidence}/manifest.json`, manifest);
const chunks = [];
for (const [name, profile] of Object.entries(profiles)) {
  for (let i = 0; i < 128; i += 8) {
    chunks.push({
      name,
      profile,
      seeds: manifest.seeds.slice(i, i + 8),
      file: `${out}/${name}-${i}.json`,
    });
  }
}
function validate(chunk) {
  const packet = load(chunk.file);
  const seeds = [...chunk.seeds].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
  check(packet.schema === 1 && packet.kind === "dayplayer-stat-probe", "bad packet type");
  check(isDeepStrictEqual(packet.request, { seeds, ...identity.probe }), "request mismatch");
  check(isDeepStrictEqual(packet.balance, chunk.profile), "profile mismatch");
  check(isDeepStrictEqual(packet.milestones, [8, 13, 18, 23, 28, 29, 33]), "milestone mismatch");
  check(packet.records.length === 8, "record count mismatch");
  const seen = new Set();
  for (const record of packet.records) {
    check(
      seeds.includes(record.seed) && !seen.has(record.seed) && record.bot === "PICKED",
      "seed/bot mismatch",
    );
    seen.add(record.seed);
    check(record.effective_checkins_per_day === 3, "cadence mismatch");
    check(
      Number.isFinite(record.observed_hours) &&
        record.observed_hours > 0 &&
        record.observed_hours <= 168,
      "invalid observed horizon",
    );
    check(Number.isFinite(record.elapsed_seconds) && record.elapsed_seconds >= 0, "invalid timing");
    check(record.seed_out.hours.length === 7, "missing milestone data");
    for (const h of record.seed_out.hours)
      check(
        h === null || (Number.isFinite(h) && h >= 0 && h <= record.observed_hours),
        "invalid arrival",
      );
    check(
      record.stop_reason === "depth" || record.stop_reason === "horizon",
      "invalid stop reason",
    );
    if (record.stop_reason === "depth") {
      check(
        record.best_depth >= 23 && record.depth_reached_hours === record.seed_out.hours[3],
        "inconsistent depth stop",
      );
    } else {
      check(
        record.campaign_complete && record.completed_days === 7 && record.observed_hours === 168,
        "incomplete horizon",
      );
    }
  }
  return packet.records;
}
const started = performance.now();
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith("DP_") && !k.startsWith("IDLEVER_")),
);
let cursor = 0;
let calls = 0;
let reused = 0;
let failed = false;
const active = new Set();
async function worker() {
  while (cursor < chunks.length && !failed) {
    const chunk = chunks[cursor++];
    if (existsSync(chunk.file)) {
      validate(chunk);
      reused++;
      continue;
    }
    await new Promise((resolve, reject) => {
      calls++;
      const child = spawn(
        `${out}/stat_probe`,
        [
          "--seeds",
          chunk.seeds.join(","),
          "--bots",
          "PICKED",
          "--days",
          "7",
          "--until-depth",
          "23",
          "--threads",
          "8",
          "--out",
          chunk.file,
        ],
        {
          env: { ...env, IDLEVER_BALANCE_JSON: JSON.stringify(chunk.profile) },
          stdio: ["ignore", "ignore", "pipe"],
        },
      );
      active.add(child);
      let error = "";
      child.stderr.on("data", (data) => {
        error += data;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        active.delete(child);
        code === 0 ? resolve() : reject(new Error(`${chunk.file}: exit${code}: ${error}`));
      });
    });
    validate(chunk);
    console.log(`completed ${chunk.file}`);
  }
}
try {
  await Promise.all(
    Array.from({ length: 4 }, () =>
      worker().catch((error) => {
        failed = true;
        for (const child of active) child.kill("SIGTERM");
        throw error;
      }),
    ),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 2;
}
if (!failed) {
  check(
    hash(`${evidence}/calibrate.mjs`) === identity.analysis &&
      hash("tools/stat-bounds.mjs") === identity.bounds,
    "analysis changed during collection",
  );
  const records = {};
  for (const chunk of chunks) {
    records[chunk.name] ??= {};
    for (const record of validate(chunk)) records[chunk.name][record.seed] = record;
  }
  const scalarRows = [];
  for (const seed of manifest.seeds) {
    for (const name of Object.keys(profiles)) {
      const record = records[name][seed];
      scalarRows.push({
        seed,
        profile: name,
        cohort: manifest.seeds.indexOf(seed) < 32 ? "pilot" : "reference",
        d18: record.seed_out.hours[2],
        d23: record.seed_out.hours[3],
        observedHours: record.observed_hours,
      });
    }
  }
  save(`${evidence}/observations.json`, scalarRows);
  const claims = [];
  const alpha = (identity.alpha * (1 - 2 ** -38)) / (identity.claimCount * identity.lookCount);
  for (const name of Object.keys(profiles)) {
    for (const field of ["d18", "d23"]) {
      const observations = scalarRows
        .filter((r) => r.profile === name)
        .map((r) => {
          const b = scalarRows.find((s) => s.seed === r.seed && s.profile === "shipping");
          return {
            value: (r[field] ?? 176) - (b[field] ?? 176),
            candidateCensored: r[field] === null,
            baselineCensored: b[field] === null,
          };
        });
      const claim = { estimand: "median", direction: "at-most", threshold: 0 };
      const pilot = identity.pilotLooks.map((n) =>
        evaluateClaim(
          observations.slice(0, n).map((o) => o.value),
          claim,
          alpha,
        ),
      );
      const first = pilot.find((p) => p.status !== "INCONCLUSIVE") ?? pilot.at(-1);
      const reference = evaluateClaim(
        observations.slice(32).map((o) => o.value),
        claim,
        alpha,
      );
      claims.push({
        name,
        field,
        claim,
        pilot,
        firstPilotVerdict: first,
        reference,
        agreement:
          first.status === "INCONCLUSIVE" || reference.status === "INCONCLUSIVE"
            ? "UNRESOLVED"
            : first.status === reference.status
              ? "AGREE"
              : "DISAGREE",
        censoring: Object.fromEntries(
          [
            ["pilot", observations.slice(0, 32)],
            ["reference", observations.slice(32)],
          ].map(([cohort, obs]) => [
            cohort,
            {
              candidate: obs.filter((o) => o.candidateCensored).length,
              baseline: obs.filter((o) => o.baselineCensored).length,
            },
          ]),
        ),
      });
    }
  }
  const report = {
    kind: "cut281-calibration",
    canonicalGateStatus: "NOT_RUN",
    alphaPerInterval: alpha,
    observations: scalarRows.length,
    calls,
    reusedChunks: reused,
    collectionSeconds: (performance.now() - started) / 1000,
    chunks: chunks.map((c) => ({ file: c.file, sha256: hash(c.file) })),
    claims,
    interpretation:
      "Six correlated diagnostic claims, not an empirical accuracy estimate. Reference intervals are uncertain; shipping control is algebraically zero. No parameters adopted.",
  };
  save(
    `${evidence}/report.json`,
    JSON.parse(
      JSON.stringify(report, (_, value) =>
        typeof value === "number" && !Number.isFinite(value) ? String(value) : value,
      ),
    ),
  );
  console.log(JSON.stringify(report, null, 2));
}
