#!/usr/bin/env node
// Routine native balance studies: cheap discovery, one frozen winner, independent statistical confirmation.
// tools/tune.sh --name ramp --spec tuning/studies/ramp.json [--threads N] [--out DIR]
// Full/canonical gates are separate explicit audits; this command never invokes them.
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
import { availableParallelism, hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expandCandidates } from "./sweep.mjs";
import { runtimeKey } from "./runtime-key.mjs";
import { evaluateClaim } from "./stat-bounds.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MILESTONES = [8, 13, 18, 23, 28, 29, 33];
const FORMAT = "idlever-stat-study-v1";
// At most 4096 discovery +4096 confirmation draws from 2^64 IDs. Reserving
// more than their birthday-collision bound transfers IID coverage to sampling
// distinct IDs, including the adaptively selected discovery winner.
const COLLISION_RESERVE = 2 ** -38;
const hash = (x) => createHash("sha256").update(x).digest("hex");
const analysisIdentity = () =>
  hash(
    ["tools/stat-tune.mjs", "tools/stat-bounds.mjs", "tools/sweep.mjs", "tools/runtime-key.mjs"]
      .map((p) => readFileSync(join(root, p)))
      .join("\0"),
  );
// Bind the code loaded by this invocation, rather than newer files edited during a cold build.
const loadedAnalysisKey = analysisIdentity();
const canonical = (x) =>
  JSON.stringify(x, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
const same = (a, b) => canonical(a) === canonical(b);
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const nonce = () => randomBytes(16).toString("hex");
function save(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(
    temp,
    JSON.stringify(
      value,
      (_, v) => (v === Infinity ? "+Infinity" : v === -Infinity ? "-Infinity" : v),
      2,
    ) + "\n",
  );
  renameSync(temp, path);
}
function requireThat(condition, message) {
  if (!condition) throw Error(`stat-tune: ${message}`);
}
function pidIsDead(owner) {
  requireThat(
    owner?.hostname === hostname() &&
      Number.isSafeInteger(owner.pid) &&
      owner.pid > 0 &&
      typeof owner.token === "string",
    "writer lock owner cannot be verified on this host",
  );
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    if (error.code === "ESRCH") return true;
    throw Error("stat-tune: writer PID status cannot be verified");
  }
}
function acquireWriter(out) {
  const path = join(out, ".writer-lock");
  const ownerPath = join(path, "owner.json");
  const owner = {
    pid: process.pid,
    hostname: hostname(),
    token: nonce(),
    startedAt: new Date().toISOString(),
  };
  try {
    mkdirSync(path);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const prior = read(ownerPath);
    requireThat(
      pidIsDead(prior),
      `study already has a live writer (PID ${prior.pid}, host ${prior.hostname})`,
    );
    // Only one reclaimer can inspect/rename a stale directory. A contender must
    // never rename a newly acquired live lock after a check/rename race.
    const reclaim = join(path, "reclaim");
    mkdirSync(reclaim);
    try {
      requireThat(
        same(read(ownerPath), prior) && pidIsDead(prior),
        "writer lock changed during reclaim",
      );
      renameSync(path, `${path}.stale-${nonce()}`);
    } catch (reclaimError) {
      rmSync(reclaim, { recursive: true, force: true });
      throw reclaimError;
    }
    mkdirSync(path);
  }
  try {
    save(ownerPath, owner);
  } catch (error) {
    rmSync(path, { recursive: true, force: true });
    throw error;
  }
  return () => {
    if (existsSync(ownerPath) && same(read(ownerPath), owner)) rmSync(path, { recursive: true });
  };
}
function archiveReports(out) {
  for (const ext of ["json", "md"]) {
    const current = join(out, `report.${ext}`),
      previous = join(out, `previous-report.${ext}`);
    if (!existsSync(current)) continue;
    if (existsSync(previous)) renameSync(previous, join(out, `previous-report-${nonce()}.${ext}`));
    renameSync(current, previous);
  }
}
function killChildren(children) {
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}
function operationalReport(out, attempt, status, error) {
  const report = {
    format: FORMAT,
    ...attempt,
    status,
    canonicalGateStatus: "NOT_RUN",
    updatedAt: new Date().toISOString(),
    ...(error ? { error: error.message } : {}),
  };
  save(join(out, "report.json"), report);
  save(join(out, "last-run.json"), report);
  writeFileSync(
    join(out, "report.md"),
    `# Statistical tuning: ${attempt.name ?? "unknown"}\n\n**${status}** · canonical gates **NOT RUN**\n\n${error?.message ?? "Current invocation is in progress; prior reports are archived as previous-report files."}\n`,
  );
}
const boundConfig = ({ estimand, direction, threshold, range }) => ({
  estimand,
  direction,
  threshold,
  ...(range === undefined ? {} : { range }),
});
function keys(object, allowed, what) {
  requireThat(
    object && typeof object === "object" && !Array.isArray(object),
    `${what} must be an object`,
  );
  for (const key of Object.keys(object))
    requireThat(allowed.includes(key), `unknown ${what} field ${key}`);
}
function stages(values, what) {
  requireThat(
    Array.isArray(values) && values.length && values.length <= 20,
    `${what} needs planned sample counts`,
  );
  requireThat(
    values.every(
      (n, i) => Number.isSafeInteger(n) && n > 0 && n <= 4096 && (!i || n > values[i - 1]),
    ),
    `${what} must increase from 1 through 4096`,
  );
  return values;
}
function checkMetric(metric, probe, level = 0) {
  requireThat(level < 5, "metric nesting is too deep");
  if (metric?.ratio) {
    keys(metric, ["ratio"], "ratio metric");
    requireThat(
      Array.isArray(metric.ratio) && metric.ratio.length === 2,
      "ratio needs numerator and denominator metrics",
    );
    metric.ratio.forEach((m) => checkMetric(m, probe, level + 1));
    return;
  }
  keys(metric, ["bot", "field", "depth", "day"], "metric");
  requireThat(probe.bots.includes(metric.bot), `metric bot ${metric.bot} is not in probe.bots`);
  if (metric.field === "arrival_hours") {
    requireThat(
      MILESTONES.includes(metric.depth) && metric.day === undefined,
      "arrival_hours needs a milestone depth",
    );
    requireThat(
      probe.untilDepth === undefined || probe.untilDepth >= metric.depth,
      "probe stops before the requested arrival depth",
    );
  } else {
    requireThat(
      ["best_day", "gold_day"].includes(metric.field),
      `unsupported metric ${metric.field}`,
    );
    requireThat(
      Number.isSafeInteger(metric.day) &&
        metric.day >= 1 &&
        metric.day <= probe.days &&
        metric.depth === undefined,
      "daily metric needs a day within the horizon",
    );
    requireThat(
      probe.untilDepth === undefined,
      "daily metrics need completed days; omit untilDepth",
    );
  }
}
export function normalizeSpec(input, base) {
  keys(
    input,
    ["base", "grid", "candidates", "probe", "claims", "discovery", "confirmation"],
    "study",
  );
  const probe = { checkins: 3, ...input.probe };
  keys(probe, ["bots", "days", "untilDepth", "checkins"], "probe");
  requireThat(
    Array.isArray(probe.bots) &&
      probe.bots.length &&
      new Set(probe.bots).size === probe.bots.length &&
      probe.bots.every((b) => typeof b === "string" && /^[A-Z][A-Z0-9+]*(?:-[a-z_]+)?$/.test(b)),
    "probe.bots must contain unique policy labels",
  );
  requireThat(
    Number.isSafeInteger(probe.days) && probe.days >= 1 && probe.days <= 365,
    "probe.days must be 1..365",
  );
  requireThat(
    Number.isSafeInteger(probe.checkins) &&
      probe.checkins >= 1 &&
      probe.checkins <= 24 &&
      24 % probe.checkins === 0,
    "probe.checkins must divide 24",
  );
  requireThat(
    probe.untilDepth === undefined || MILESTONES.includes(probe.untilDepth),
    "untilDepth must be a recorded milestone",
  );
  const discovery = { stages: [4, 8, 16], keep: 0.5, ...input.discovery };
  keys(discovery, ["stages", "keep"], "discovery");
  stages(discovery.stages, "discovery.stages");
  requireThat(discovery.keep > 0 && discovery.keep < 1, "discovery.keep must be between 0 and 1");
  const confirmation = { looks: [8, 16, 32], alpha: 0.05, ...input.confirmation };
  keys(confirmation, ["looks", "alpha"], "confirmation");
  stages(confirmation.looks, "confirmation.looks");
  requireThat(
    Number.isFinite(confirmation.alpha) && confirmation.alpha > 0 && confirmation.alpha < 1,
    "confirmation.alpha must be between 0 and 1",
  );
  requireThat(
    Array.isArray(input.claims) && input.claims.length && input.claims.length <= 32,
    "declare 1..32 scalar claims",
  );
  const ids = new Set();
  const claims = input.claims.map((claim) => {
    keys(
      claim,
      ["id", "metric", "comparison", "estimand", "direction", "threshold", "range", "rankingScale"],
      "claim",
    );
    requireThat(
      typeof claim.id === "string" && /^[a-zA-Z0-9_-]+$/.test(claim.id) && !ids.has(claim.id),
      "claims need unique plain IDs",
    );
    ids.add(claim.id);
    checkMetric(claim.metric, probe);
    const c = { comparison: "absolute", rankingScale: 1, ...claim };
    requireThat(
      ["absolute", "difference"].includes(c.comparison),
      "comparison must be absolute or difference",
    );
    requireThat(
      Number.isFinite(c.rankingScale) && c.rankingScale > 0,
      "claim rankingScale must be positive",
    );
    evaluateClaim(
      [],
      boundConfig(c),
      confirmation.alpha / input.claims.length / confirmation.looks.length,
    );
    return c;
  });
  const candidates = expandCandidates(input, base);
  requireThat(
    candidates.length <= 256 && candidates.every((c) => c.name.length <= 160),
    "at most 256 candidates with names up to160 characters",
  );
  return {
    probe,
    claims,
    discovery,
    confirmation,
    candidates: candidates.map(({ name, set, profile }) => ({ name, set, profile })),
  };
}
function scalar(records, metric, probe) {
  if (metric.ratio) {
    const a = scalar(records, metric.ratio[0], probe),
      b = scalar(records, metric.ratio[1], probe);
    requireThat(b.value > 0, "ratio denominator must be positive");
    return { value: a.value / b.value, censored: a.censored || b.censored };
  }
  const record = records.find((r) => r.bot === metric.bot);
  requireThat(record, `missing bot ${metric.bot}`);
  if (metric.field === "arrival_hours") {
    const hour = record.seed_out.hours[MILESTONES.indexOf(metric.depth)];
    return {
      value: hour ?? probe.days * 24 + 24 / record.effective_checkins_per_day,
      censored: hour === null,
    };
  }
  requireThat(
    record.completed_days >= metric.day,
    "partial daily observations cannot satisfy a claim",
  );
  return { value: record.seed_out[metric.field][metric.day - 1], censored: false };
}
function sample(candidate, baseline, claim, probe) {
  const a = scalar(candidate, claim.metric, probe);
  const b = scalar(baseline, claim.metric, probe);
  const value = claim.comparison === "difference" ? a.value - b.value : a.value;
  requireThat(Number.isFinite(value), "nonfinite metric observation");
  if (claim.estimand === "mean")
    requireThat(
      value >= claim.range[0] && value <= claim.range[1],
      `claim ${claim.id} is outside its a-priori range`,
    );
  return { value, candidateCensored: a.censored, baselineCensored: b.censored };
}
function normalizedSeeds(values) {
  requireThat(
    Array.isArray(values) &&
      values.every(
        (s) =>
          typeof s === "string" &&
          /^(?:0|[1-9][0-9]*)$/.test(s) &&
          BigInt(s) <= 18446744073709551615n,
      ),
    "seed IDs must be canonical u64 strings",
  );
  requireThat(new Set(values).size === values.length, "duplicate seed IDs");
  return [...values].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
}
function validatePacket(packet, seeds, profile, probe) {
  requireThat(
    packet?.schema === 1 && packet.kind === "dayplayer-stat-probe",
    "invalid native probe schema",
  );
  const request = packet.request;
  requireThat(
    request &&
      same(normalizedSeeds(request.seeds), normalizedSeeds(seeds)) &&
      same([...request.bots].sort(), [...probe.bots].sort()) &&
      request.days === probe.days &&
      request.checkins_per_day === probe.checkins &&
      (request.until_depth ?? null) === (probe.untilDepth ?? null),
    "native request/horizon identity mismatch",
  );
  // Cut309 profiles may omit this optional field; Rust then emits its historical default.
  // Every explicit value and every other field still has to match exactly.
  const expectedProfile =
    Object.hasOwn(packet.balance ?? {}, "recovery_full_ticks") &&
    !Object.hasOwn(profile, "recovery_full_ticks")
      ? { ...profile, recovery_full_ticks: 12000 }
      : profile;
  requireThat(
    same(packet.balance, expectedProfile) && same(packet.milestones, MILESTONES),
    "native balance or milestone identity mismatch",
  );
  requireThat(
    Array.isArray(packet.records) && packet.records.length === seeds.length * probe.bots.length,
    "missing native records",
  );
  const seen = new Set();
  for (const r of packet.records) {
    const key = `${r.seed}:${r.bot}`;
    requireThat(
      seeds.includes(r.seed) && probe.bots.includes(r.bot) && !seen.has(key),
      "duplicate or wrong native seed/bot",
    );
    seen.add(key);
    const effective = /^(?:DAILY|AWAY)(?:-|$)/.test(r.bot) ? 1 : probe.checkins;
    requireThat(
      Number.isSafeInteger(r.completed_days) &&
        r.completed_days >= 0 &&
        r.completed_days <= probe.days &&
        typeof r.campaign_complete === "boolean" &&
        Number.isSafeInteger(r.effective_checkins_per_day) &&
        r.effective_checkins_per_day === effective,
      "invalid native completion metadata",
    );
    requireThat(
      Number.isFinite(r.observed_hours) &&
        r.observed_hours >= r.completed_days * 24 &&
        r.observed_hours <= probe.days * 24 &&
        (r.campaign_complete
          ? r.observed_hours === probe.days * 24
          : r.observed_hours < (r.completed_days + 1) * 24) &&
        Number.isFinite(r.elapsed_seconds) &&
        r.elapsed_seconds >= 0 &&
        Number.isSafeInteger(r.best_depth) &&
        r.best_depth >= 0,
      "invalid native observed horizon/timing/depth",
    );
    requireThat(
      ["depth", "horizon"].includes(r.stop_reason) &&
        r.campaign_complete === (r.completed_days === probe.days) &&
        (r.stop_reason === "depth" ? probe.untilDepth !== undefined : r.campaign_complete),
      "native stopping metadata mismatch",
    );
    requireThat(
      Array.isArray(r.seed_out?.hours) &&
        r.seed_out.hours.length === 7 &&
        r.seed_out.hours.every(
          (h) => h === null || (Number.isFinite(h) && h >= 0 && h <= r.observed_hours),
        ),
      "invalid native milestone hours",
    );
    for (const field of ["best_day", "gold_day"])
      requireThat(
        Array.isArray(r.seed_out[field]) &&
          r.seed_out[field].length === r.completed_days &&
          r.seed_out[field].every(
            (v) => Number.isSafeInteger(v) && (field !== "best_day" || v >= 0),
          ),
        `invalid completed ${field}`,
      );
    if (r.stop_reason === "depth")
      requireThat(
        r.seed_out.hours[MILESTONES.indexOf(probe.untilDepth)] !== null,
        "depth stop without the milestone",
      );
  }
  return packet;
}
function randomSeeds(count, used) {
  return Array.from({ length: count }, () => {
    let seed;
    do {
      seed = randomBytes(8).readBigUInt64BE().toString();
    } while (used.has(seed));
    used.add(seed);
    return seed;
  });
}
function validateSchedule(schedule, spec) {
  requireThat(
    schedule?.discovery?.length === spec.discovery.stages.at(-1) &&
      schedule?.confirmation?.length === spec.confirmation.looks.at(-1),
    "invalid persisted seed schedule",
  );
  normalizedSeeds([...schedule.discovery, ...schedule.confirmation]);
}
async function buildProbe(out, supplied) {
  let binary = supplied && resolve(supplied),
    coreKey = "fixture";
  if (!binary) {
    const build = spawnSync(
      "cargo",
      [
        "build",
        "-q",
        "--message-format=json",
        "--profile",
        "fast",
        "-p",
        "idlever-core",
        "--features",
        "dev-balance",
        "--example",
        "stat_probe",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 },
    );
    if (build.stderr) process.stderr.write(build.stderr);
    requireThat(build.status === 0, "native probe build failed");
    const artifact = build.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .find(
        (m) =>
          m.reason === "compiler-artifact" &&
          m.target.name === "idlever_core" &&
          m.target.kind.includes("lib") &&
          !m.profile.test,
      );
    coreKey = runtimeKey(artifact, root, spawnSync("rustc", ["-vV"], { encoding: "utf8" }).stdout);
    binary = join(root, "target/fast/examples/stat_probe");
  }
  const digest = hash(readFileSync(binary));
  const snapshot = join(out, `probe-${digest.slice(0, 16)}`);
  if (!existsSync(snapshot)) {
    copyFileSync(binary, snapshot);
    chmodSync(snapshot, 0o755);
  }
  requireThat(hash(readFileSync(snapshot)) === digest, "corrupt probe snapshot");
  return { binary: snapshot, digest, coreKey };
}
async function parallel(items, limit, fn, onError) {
  const queue = [...items];
  let failure;
  await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (queue.length && !failure) {
        try {
          await fn(queue.shift());
        } catch (error) {
          failure ??= error;
          onError();
        }
      }
    }),
  );
  if (failure) throw failure;
}
function metricUnits(metric) {
  if (metric.ratio) return `(${metricUnits(metric.ratio[0])}) / (${metricUnits(metric.ratio[1])})`;
  return { arrival_hours: "hours", best_day: "floors", gold_day: "gold/day" }[metric.field];
}
function reportMarkdown(report) {
  const lines = [
    `# Statistical tuning: ${report.name}`,
    "",
    `**${report.status}** · winner ${report.winner} · canonical gates **NOT RUN**`,
    "",
    "Discovery is exploratory. Confirmation covers only the declared population estimands at the planned looks.",
    "",
    `Study-family alpha ${report.familyAlpha}; inference alpha ${report.inferenceAlpha} after collision reserve ${report.collisionReserve}; total two-sided alpha per claim/look ${report.alphaPerClaim}, divided equally between tails. This budget applies within this immutable study, not repeated new studies.`,
    "",
    report.missingPolicy,
    "Censor counts below count seeds with any capped metric component; capped observations are retained, never dropped.",
    "",
    `Total ${report.timing.totalSeconds.toFixed(2)} s; native build/preparation ${report.timing.preparationSeconds.toFixed(2)} s; study ${report.wallSeconds.toFixed(2)} s.`,
    `New probe calls ${report.work.probeCalls}; new seed/profile observations ${report.work.newSeedProfiles}; unique observations ${report.work.uniqueSeedProfiles}; unpruned search with identical winner-confirmation work ${report.work.exhaustiveSeedProfiles}; ${report.work.savedPct.toFixed(1)}% fewer observations on this study. This is an observation-count comparison, not measured wall time of an exhaustive campaign.`,
    "",
    "| claim | metric / comparison | estimand / threshold | estimate | interval | capped candidate / baseline | status |",
    "|---|---|---|---:|---|---|---|",
  ];
  for (const c of report.confirmation.at(-1).claims)
    lines.push(
      `| ${c.id} | \`${JSON.stringify(c.metric)}\`; ${c.comparison === "difference" ? "paired candidate minus baseline" : "absolute candidate"} | ${c.estimand} ${c.direction === "at-least" ? "≥" : "≤"} ${c.threshold} ${c.units} | ${c.estimate} | [${c.lower}, ${c.upper}] | ${c.candidateCensored}/${c.n} / ${c.baselineCensored}/${c.n} | ${c.status} |`,
    );
  return lines.join("\n") + "\n";
}
async function run(argv, context) {
  const opt = (name) => {
    const at = argv.indexOf(name);
    return at < 0 ? undefined : argv[at + 1];
  };
  const allowed = new Set(["--name", "--spec", "--threads", "--out", "--bin", "--list", "--help"]);
  for (let i = 0; i < argv.length; i++) {
    requireThat(allowed.has(argv[i]), `unknown option ${argv[i]}`);
    if (!["--help", "--list"].includes(argv[i])) {
      requireThat(argv[i + 1] && !argv[i + 1].startsWith("--"), `missing value for ${argv[i]}`);
      i++;
    }
  }
  if (argv.includes("--help")) {
    console.log(
      "tools/tune.sh --name NAME --spec STUDY.json [--threads N] [--out DIR] [--list]\nDefault: statistical discovery + independent confirmation. Exact catalogs: tools/tune.sh --exact ROWS.",
    );
    return 0;
  }
  const name = opt("--name"),
    specFile = opt("--spec");
  requireThat(name && /^[a-zA-Z0-9_-]+$/.test(name) && specFile, "use --name NAME --spec FILE");
  const input = read(resolve(specFile));
  const base = read(resolve(root, input.base ?? "tuning/balance.json"));
  const spec = normalizeSpec(input, base);
  if (argv.includes("--list")) {
    console.log(JSON.stringify(spec, null, 2));
    return 0;
  }
  const threads = Number(opt("--threads") ?? process.env.GATES_THREADS ?? availableParallelism());
  requireThat(
    Number.isSafeInteger(threads) && threads > 0 && threads <= 4096,
    "threads must be 1..4096",
  );
  const out = resolve(opt("--out") ?? join(root, "target/stat-tune", name));
  mkdirSync(out, { recursive: true });
  mkdirSync(join(out, "jobs"), { recursive: true });
  const native = await buildProbe(out, opt("--bin"));
  const analysisKey = loadedAnalysisKey;
  requireThat(
    analysisIdentity() === analysisKey,
    "analysis source changed during build; rerun with a new study name",
  );
  const configurationIdentity = hash(
    canonical({
      name,
      spec,
      base,
      native: { digest: native.digest, coreKey: native.coreKey },
      analysisKey,
    }),
  );
  const manifestPath = join(out, "manifest.json"),
    statePath = join(out, "state.json");
  let manifest;
  if (existsSync(manifestPath)) {
    manifest = read(manifestPath);
    requireThat(
      manifest.format === FORMAT &&
        manifest.configurationIdentity === configurationIdentity &&
        same(manifest.spec, spec),
      "study identity changed (spec/profile/source/probe/analysis); use a new study name",
    );
  } else {
    requireThat(!existsSync(statePath), "state exists without its immutable manifest");
    const used = new Set();
    const seeds = {
      discovery: randomSeeds(spec.discovery.stages.at(-1), used),
      confirmation: randomSeeds(spec.confirmation.looks.at(-1), used),
    };
    manifest = {
      format: FORMAT,
      configurationIdentity,
      identity: hash(canonical({ configurationIdentity, seeds })),
      name,
      createdAt: new Date().toISOString(),
      native,
      analysisKey,
      spec,
      seeds,
    };
    save(manifestPath, manifest);
  }
  validateSchedule(manifest.seeds, spec);
  requireThat(
    manifest.identity === hash(canonical({ configurationIdentity, seeds: manifest.seeds })),
    "persisted seed schedule identity changed",
  );
  const identity = manifest.identity;
  let state = existsSync(statePath)
    ? read(statePath)
    : { identity, phase: "discovery", winner: null };
  requireThat(
    state.identity === identity && ["discovery", "confirmation", "complete"].includes(state.phase),
    "invalid state identity/phase",
  );
  requireThat(
    state.phase === "discovery" || state.winner,
    "confirmation state has no frozen winner",
  );
  const started = Date.now(),
    work = { probeCalls: 0, newSeedProfiles: 0, cacheHits: 0, invalidated: 0 };
  const usedJobs = new Set(),
    cachedJobs = new Set(),
    children = context.children;
  const baseline = { name: "BASELINE", profile: base };
  const profiles = new Map(
    [baseline, ...spec.candidates].map((p) => [hash(canonical(p.profile)), p]),
  );
  const jobs = Math.min(profiles.size, Math.max(1, Math.floor(threads / 2)));
  const threadsPer = Math.max(1, Math.floor(threads / jobs));
  const records = new Map();
  const jobKey = (p, seed) =>
    hash(canonical({ binary: native.digest, profile: p.profile, probe: spec.probe, seed }));
  const ensure = async (selected, seeds) => {
    const unique = [...new Map(selected.map((p) => [hash(canonical(p.profile)), p])).values()];
    await parallel(
      unique,
      jobs,
      async (p) => {
        const missing = [];
        for (const seed of seeds) {
          const key = jobKey(p, seed);
          usedJobs.add(key);
          if (records.has(key)) continue;
          const path = join(out, "jobs", `${key}.json`);
          if (existsSync(path)) {
            try {
              const kept = read(path);
              requireThat(
                kept.key === key && kept.payloadSha === hash(canonical(kept.packet)),
                "cached observation hash mismatch",
              );
              validatePacket(kept.packet, [seed], p.profile, spec.probe);
              records.set(key, kept.packet.records);
              cachedJobs.add(key);
              continue;
            } catch {
              renameSync(path, `${path}.corrupt-${Date.now()}`);
              work.invalidated++;
            }
          }
          missing.push(seed);
        }
        if (!missing.length) return;
        const packetPath = join(out, `.probe-${process.pid}-${nonce()}.json`);
        const stderrPath = `${packetPath}.stderr`;
        const env = Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => !key.startsWith("DP_") && !key.startsWith("IDLEVER_"),
          ),
        );
        env.IDLEVER_BALANCE_JSON = JSON.stringify(p.profile);
        const args = [
          "--seeds",
          missing.join(","),
          "--bots",
          spec.probe.bots.join(","),
          "--days",
          String(spec.probe.days),
          "--checkins",
          String(spec.probe.checkins),
          "--threads",
          String(threadsPer),
          "--out",
          packetPath,
          ...(spec.probe.untilDepth ? ["--until-depth", String(spec.probe.untilDepth)] : []),
        ];
        work.probeCalls++;
        console.error(`stat-tune: ${state.phase} ${p.name}: ${missing.length} new paired seeds`);
        await new Promise((done, reject) => {
          const child = spawn(native.binary, args, {
            cwd: root,
            env,
            detached: true,
            stdio: ["ignore", "ignore", "pipe"],
          });
          children.add(child);
          let stderr = "";
          child.stderr.on("data", (data) => {
            stderr = (stderr + data).slice(-1000000);
          });
          child.on("error", reject);
          child.on("close", (code, signal) => {
            children.delete(child);
            writeFileSync(stderrPath, stderr);
            if (code === 0) done();
            else reject(Error(`stat-tune: probe failed ${code ?? signal}: ${stderr.slice(-1500)}`));
          });
        });
        const packet = validatePacket(read(packetPath), missing, p.profile, spec.probe);
        for (const seed of missing) {
          const key = jobKey(p, seed);
          const single = {
            ...packet,
            request: { ...packet.request, seeds: [seed] },
            records: packet.records.filter((r) => r.seed === seed),
          };
          save(join(out, "jobs", `${key}.json`), {
            key,
            payloadSha: hash(canonical(single)),
            packet: single,
          });
          records.set(key, single.records);
          work.newSeedProfiles++;
        }
      },
      () => killChildren(children),
    );
  };
  const values = (p, seeds, c) =>
    seeds.map((seed) =>
      sample(records.get(jobKey(p, seed)), records.get(jobKey(baseline, seed)), c, spec.probe),
    );
  const discovery = [];
  let active = [...spec.candidates];
  for (const [stage, n] of spec.discovery.stages.entries()) {
    const seeds = manifest.seeds.discovery.slice(0, n);
    await ensure([baseline, ...active], seeds);
    const ranked = active
      .map((p) => {
        const claims = spec.claims.map((c) => {
          const v = values(p, seeds, c).map((s) => s.value);
          const estimate = evaluateClaim(v, boundConfig(c), spec.confirmation.alpha).estimate;
          return {
            id: c.id,
            estimate,
            margin:
              ((estimate - c.threshold) * (c.direction === "at-least" ? 1 : -1)) / c.rankingScale,
          };
        });
        return { name: p.name, score: Math.min(...claims.map((c) => c.margin)), claims };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const keep =
      stage === spec.discovery.stages.length - 1
        ? 1
        : Math.max(1, Math.ceil(active.length * spec.discovery.keep));
    const promoted = ranked.slice(0, keep).map((p) => p.name),
      dropped = ranked.slice(keep).map((p) => p.name);
    discovery.push({ stage, n, ranked, promoted, dropped });
    active = active.filter((p) => promoted.includes(p.name));
    console.error(
      `stat-tune: discovery n=${n}; promoted ${promoted.join(", ")}; dropped ${dropped.join(", ") || "none"}`,
    );
    if (active.length === 1) break;
  }
  const winner = active[0],
    frozen = {
      name: winner.name,
      profileSha: hash(canonical(winner.profile)),
      claimsSha: hash(canonical(spec.claims)),
    };
  const discoverySeedProfiles = usedJobs.size;
  requireThat(analysisIdentity() === analysisKey, "analysis source changed during discovery");
  requireThat(
    !state.winner || same(state.winner, frozen),
    "frozen winner changed; held-out data cannot select a replacement",
  );
  state = { ...state, phase: "confirmation", winner: frozen };
  save(statePath, state);
  const confirmation = [],
    inferenceAlpha = spec.confirmation.alpha * (1 - COLLISION_RESERVE),
    alphaPerClaim = inferenceAlpha / spec.claims.length / spec.confirmation.looks.length;
  let status = "INCONCLUSIVE";
  for (const n of spec.confirmation.looks) {
    const seeds = manifest.seeds.confirmation.slice(0, n);
    await ensure([baseline, winner], seeds);
    const claims = spec.claims.map((c) => {
      const observations = values(winner, seeds, c);
      return {
        id: c.id,
        metric: c.metric,
        units: metricUnits(c.metric),
        comparison: c.comparison,
        estimand: c.estimand,
        direction: c.direction,
        threshold: c.threshold,
        ...evaluateClaim(
          observations.map((s) => s.value),
          boundConfig(c),
          alphaPerClaim,
        ),
        candidateCensored: observations.filter((s) => s.candidateCensored).length,
        baselineCensored: observations.filter((s) => s.baselineCensored).length,
      };
    });
    confirmation.push({ n, alphaPerClaim, claims });
    console.error(
      `stat-tune: confirmation n=${n}: ${claims.map((c) => `${c.id} ${c.status}`).join("; ")}`,
    );
    if (claims.every((c) => c.status === "PASS")) {
      status = "STATISTICALLY_ACCEPTED";
      break;
    }
    if (claims.some((c) => c.status === "FAIL")) {
      status = "STATISTICALLY_REJECTED";
      break;
    }
  }
  requireThat(analysisIdentity() === analysisKey, "analysis source changed during confirmation");
  state = { ...state, phase: "complete", status };
  save(statePath, state);
  const confirmationProfiles = new Set([base, winner.profile].map((p) => hash(canonical(p)))).size;
  const exhaustiveDiscoverySeedProfiles = profiles.size * spec.discovery.stages.at(-1);
  const exhaustiveSeedProfiles =
    exhaustiveDiscoverySeedProfiles + confirmationProfiles * confirmation.at(-1).n;
  const report = {
    format: FORMAT,
    name,
    identity,
    status,
    winner: winner.name,
    canonicalGateStatus: "NOT_RUN",
    estimandScope:
      "Declared finite-horizon population metrics only; no universal/rare-event/canonical-catalog certification",
    missingPolicy: `Unreached arrival is imputed as horizon (${spec.probe.days} days × 24 hours) plus one effective check-in (24 / effective_checkins_per_day hours for each bot). Ratios and paired differences use these finite imputed values; they do not estimate uncensored arrival times or reproduce canonical ratio missing-value rules.`,
    familyAlpha: spec.confirmation.alpha,
    inferenceAlpha,
    collisionReserve: COLLISION_RESERVE,
    alphaPerClaim,
    discovery,
    confirmation,
    work: {
      ...work,
      cacheHits: cachedJobs.size,
      uniqueSeedProfiles: usedJobs.size,
      discoverySeedProfiles,
      confirmationSeedProfiles: usedJobs.size - discoverySeedProfiles,
      exhaustiveDiscoverySeedProfiles,
      exhaustiveSeedProfiles,
      savedPct: 100 * (1 - usedJobs.size / exhaustiveSeedProfiles),
    },
    wallSeconds: (Date.now() - started) / 1000,
    timing: {
      totalSeconds: (Date.now() - Date.parse(context.attempt.startedAt)) / 1000,
      preparationSeconds: (started - Date.parse(context.attempt.startedAt)) / 1000,
    },
  };
  save(join(out, "report.json"), report);
  writeFileSync(
    join(out, "report.md"),
    reportMarkdown(JSON.parse(readFileSync(join(out, "report.json"), "utf8"))),
  );
  process.stdout.write(readFileSync(join(out, "report.md"), "utf8"));
  save(join(out, "last-run.json"), {
    ...context.attempt,
    identity,
    status,
    finishedAt: new Date().toISOString(),
  });
  return status === "STATISTICALLY_ACCEPTED" ? 0 : status === "STATISTICALLY_REJECTED" ? 1 : 3;
}
export async function main(argv) {
  if (argv.includes("--list") || argv.includes("--help")) return run(argv, { children: new Set() });
  const option = (flag) => {
    const index = argv.indexOf(flag);
    return index < 0 ? undefined : argv[index + 1];
  };
  const name = option("--name");
  const requestedOut = option("--out");
  const out =
    requestedOut && !requestedOut.startsWith("--")
      ? resolve(requestedOut)
      : name && /^[a-zA-Z0-9_-]+$/.test(name)
        ? join(root, "target/stat-tune", name)
        : null;
  if (!out) return run(argv, { children: new Set() });
  mkdirSync(out, { recursive: true });
  // A rejected contender must not archive or overwrite the active owner's reports.
  const release = acquireWriter(out);
  const context = {
    children: new Set(),
    attempt: { name, attemptId: nonce(), startedAt: new Date().toISOString() },
  };
  const stop = () => {
    killChildren(context.children);
    try {
      operationalReport(
        out,
        context.attempt,
        "ERROR",
        Error("Interrupted by signal; resume this same immutable study."),
      );
    } finally {
      release();
      process.exit(130);
    }
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    archiveReports(out);
    operationalReport(out, context.attempt, "IN_PROGRESS");
    const statePath = join(out, "state.json");
    if (existsSync(statePath)) {
      const state = read(statePath);
      if (state.phase === "complete")
        save(statePath, {
          ...state,
          phase: state.winner ? "confirmation" : "discovery",
          status: "IN_PROGRESS",
        });
    }
    return await run(argv, context);
  } catch (error) {
    killChildren(context.children);
    operationalReport(out, context.attempt, "ERROR", error);
    throw error;
  } finally {
    killChildren(context.children);
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    release();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
