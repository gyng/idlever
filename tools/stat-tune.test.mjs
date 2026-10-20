// Black-box CLI and persistence tests. The fake peer speaks the native probe protocol; no Cargo/game simulation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testEnv = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
const cli = join(root, "tools/stat-tune.mjs");
const fake = join(root, "tools/fixtures/stat-probe-fake.mjs");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const calls = (c) =>
  existsSync(c.log)
    ? readFileSync(c.log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)
    : [];
function setup(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "idlever-stat-tune-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "probe");
  copyFileSync(fake, bin);
  chmodSync(bin, 0o755);
  const base = join(dir, "base.json");
  writeFileSync(base, JSON.stringify({ x: 0, mode: "constant" }));
  const spec = {
    base,
    candidates: [2, 4, 6, 8, 10, 12, 14, 16].map((x) => ({ name: `x${x}`, set: { x } })),
    probe: { bots: ["PICKED"], days: 1, checkins: 3 },
    claims: [
      {
        id: "gain",
        metric: { bot: "PICKED", field: "best_day", day: 1 },
        comparison: "difference",
        estimand: "median",
        direction: "at-least",
        threshold: 1,
      },
    ],
    discovery: { stages: [4, 8, 16], keep: 0.5 },
    confirmation: { looks: [8, 16, 32], alpha: 0.05 },
    ...overrides,
  };
  const specFile = join(dir, "spec.json");
  writeFileSync(specFile, JSON.stringify(spec));
  return { dir, bin, base, spec, specFile, out: join(dir, "out"), log: join(dir, "calls.jsonl") };
}
function run(c, env = {}, extra = []) {
  const r = spawnSync(
    process.execPath,
    [
      cli,
      "--name",
      "synthetic",
      "--spec",
      c.specFile,
      "--bin",
      c.bin,
      "--out",
      c.out,
      "--threads",
      "2",
      ...extra,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
      env: {
        ...testEnv,
        STAT_PROBE_LOG: c.log,
        STAT_PROBE_MANIFEST: join(c.out, "manifest.json"),
        ...env,
      },
    },
  );
  assert.ifError(r.error);
  return { ...r, text: r.stdout + r.stderr };
}
function status(r, expected) {
  assert.equal(r.status, expected, r.text);
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
}
function artifacts(c) {
  for (const name of ["manifest.json", "state.json", "report.json", "report.md"])
    assert(existsSync(join(c.out, name)), `missing ${name}`);
  return {
    manifest: read(join(c.out, "manifest.json")),
    state: read(join(c.out, "state.json")),
    report: read(join(c.out, "report.json")),
  };
}

test("legacy recovery cap metadata accepts only the materialized historical default", (t) => {
  const c = setup(t);
  const r = run(c, { STAT_PROBE_FAULT: "recovery-default" });
  status(r, 0);
  assert.equal(artifacts(c).report.status, "STATISTICALLY_ACCEPTED");
  assert(calls(c).length > 0);
});

test("explicit recovery cap metadata stays exact and incompatible omissions are refused", (t) => {
  const explicit = setup(t);
  writeFileSync(
    explicit.base,
    JSON.stringify({ x: 0, mode: "constant", recovery_full_ticks: 3000 }),
  );
  status(run(explicit, { STAT_PROBE_FAULT: "recovery-default" }), 0);
  for (const fault of [
    "recovery-wrong-default",
    "recovery-string-default",
    "recovery-default-wrong-profile",
    "recovery-omitted",
    "explicit-null",
  ]) {
    const c = setup(t);
    if (fault === "recovery-omitted")
      writeFileSync(c.base, JSON.stringify({ x: 0, mode: "constant", recovery_full_ticks: 12000 }));
    if (fault === "explicit-null")
      writeFileSync(c.base, JSON.stringify({ x: 0, mode: "constant", recovery_full_ticks: null }));
    status(run(c, { STAT_PROBE_FAULT: fault === "explicit-null" ? "recovery-default" : fault }), 2);
    assert(calls(c).length > 0);
  }
});

test("prunes substantial native work, freezes one held-out winner, and completed resume makes zero probe calls", (t) => {
  const c = setup(t);
  status(run(c), 0);
  const a = artifacts(c),
    originalManifest = readFileSync(join(c.out, "manifest.json"), "utf8");
  const observed = calls(c).reduce((sum, call) => sum + call.seeds.length * call.bots.length, 0);
  const full = (c.spec.candidates.length + 1) * 16 + 2 * a.report.confirmation.at(-1).n;
  assert(observed <= full * 0.75, `only ${100 * (1 - observed / full)}% observations saved`);
  assert(observed > 0);
  const before = calls(c).length;
  status(run(c), 0);
  assert.equal(calls(c).length, before);
  assert.equal(
    readFileSync(join(c.out, "manifest.json"), "utf8"),
    originalManifest,
    "preregistered manifest mutated",
  );
  assert.deepEqual(artifacts(c).manifest, a.manifest);
  assert.equal(a.manifest.format, "idlever-stat-study-v1");
  assert.equal(a.report.status, "STATISTICALLY_ACCEPTED");
  assert.equal(
    a.report.canonicalGateStatus,
    "NOT_RUN",
    "statistical evidence must never impersonate the canonical gate",
  );
  assert.equal(a.state.winner.name, "x16");
  assert.equal(a.report.winner, a.state.winner.name);
  assert.equal(a.state.phase, "complete");
  const { discovery, confirmation } = a.manifest.seeds;
  assert.equal(
    new Set([...discovery, ...confirmation]).size,
    discovery.length + confirmation.length,
  );
  for (const seed of [...discovery, ...confirmation]) {
    assert.equal(typeof seed, "string");
    assert.match(seed, /^[0-9]+$/);
    assert(BigInt(seed) >= 0n && BigInt(seed) <= 0xffffffffffffffffn);
  }
  const confirm = new Set(confirmation),
    discover = new Set(discovery);
  const confirmCalls = calls(c).filter((call) => call.seeds.some((seed) => confirm.has(seed)));
  assert(confirmCalls.length > 0);
  assert(
    confirmCalls.every((call) =>
      call.seeds.every((seed) => confirm.has(seed) && !discover.has(seed)),
    ),
    "phase seed mixing",
  );
  assert.deepEqual(
    [...new Set(confirmCalls.map((call) => call.profile.x))].sort((x, y) => x - y),
    [0, 16],
    "confirmation retried an alternate candidate",
  );
  assert(a.report.discovery.some((stage) => stage.dropped.length > 0));
  assert(a.report.work.savedPct >= 25);
  assert.equal(a.report.work.uniqueSeedProfiles, observed);
  assert.equal(a.report.confirmation.at(-1).claims[0].estimate, 16);
  const maxDraws = a.manifest.seeds.discovery.length + a.manifest.seeds.confirmation.length;
  assert(a.report.collisionReserve >= (maxDraws * (maxDraws - 1)) / (2 * 2 ** 64));
  assert.equal(a.report.collisionReserve, 2 ** -38);
  assert.equal(a.report.inferenceAlpha, 0.05 * (1 - a.report.collisionReserve));
  const alpha = a.report.inferenceAlpha / c.spec.confirmation.looks.length / c.spec.claims.length;
  for (const look of a.report.confirmation) assert.equal(look.alphaPerClaim, alpha);
  if (process.env.STAT_TUNE_TEST_EVIDENCE) {
    const evidence = resolve(process.env.STAT_TUNE_TEST_EVIDENCE);
    mkdirSync(evidence, { recursive: true });
    const paths = [
      "tools/stat-tune.mjs",
      "tools/stat-bounds.mjs",
      "tools/stat-tune.test.mjs",
      "tools/fixtures/stat-probe-fake.mjs",
      "tools/tune.sh",
    ];
    const sourceSha256 = Object.fromEntries(
      paths.map((path) => [
        path,
        createHash("sha256")
          .update(readFileSync(join(root, path)))
          .digest("hex"),
      ]),
    );
    const fullCalls =
      (c.spec.candidates.length + 1) * c.spec.discovery.stages.length +
      2 * a.report.confirmation.length;
    const repeatedObservations =
      (c.spec.candidates.length + 1) * c.spec.discovery.stages.reduce((a, b) => a + b, 0) +
      2 * a.report.confirmation.reduce((sum, look) => sum + look.n, 0);
    writeFileSync(
      join(evidence, "synthetic-benchmark.json"),
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          kind: "synthetic-native-protocol-cli-test",
          node: process.version,
          sourceSha256,
          candidates: c.spec.candidates.length,
          discoveryStages: c.spec.discovery.stages,
          confirmationLooks: c.spec.confirmation.looks,
          measured: {
            probeCalls: before,
            seedBotProfileObservations: observed,
            completedResumeNewProbeCalls: calls(c).length - before,
            winner: a.report.winner,
          },
          counterfactual: {
            scope:
              "all candidates plus shared baseline complete discovery; only the same winner and baseline receive the actual observed confirmation looks; incremental seed-cache reuse",
            probeCalls: fullCalls,
            distinctSeedBotProfileObservations: full,
            uncachedRepeatedStageObservations: repeatedObservations,
          },
          savings: {
            probeCallPct: 100 * (1 - before / fullCalls),
            uniqueObservationPct: 100 * (1 - observed / full),
          },
          reportWork: a.report.work,
          note: "Synthetic fake-probe counts only. No actual campaign runtime, gameplay speedup, or canonical-gate certification measured.",
        },
        null,
        2,
      ) + "\n",
    );
    writeFileSync(
      join(evidence, "synthetic-manifest.json"),
      JSON.stringify(a.manifest, null, 2) + "\n",
    );
    writeFileSync(
      join(evidence, "synthetic-report.json"),
      JSON.stringify(a.report, null, 2) + "\n",
    );
    writeFileSync(join(evidence, "synthetic-calls.json"), JSON.stringify(calls(c), null, 2) + "\n");
  }
});

test("list expands a real grid without running a probe", (t) => {
  const c = setup(t, { candidates: undefined, grid: { x: [1, 2, 3] } });
  status(run(c, {}, ["--list"]), 0);
  assert.equal(calls(c).length, 0);
});

test("mean claim at its threshold remains inconclusive rather than manufacturing acceptance", (t) => {
  const c = setup(t, {
    candidates: [{ name: "boundary", set: { x: 0 } }],
    claims: [
      {
        id: "boundary",
        metric: { bot: "PICKED", field: "best_day", day: 1 },
        comparison: "absolute",
        estimand: "mean",
        direction: "at-least",
        threshold: 10,
        range: [0, 20],
      },
    ],
  });
  status(run(c), 3);
  artifacts(c);
});

test("clear contrary observations reject", (t) => {
  const c = setup(t, {
    candidates: [{ name: "bad", set: { x: 0 } }],
    claims: [
      {
        id: "fails",
        metric: { bot: "PICKED", field: "best_day", day: 1 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-least",
        threshold: 20,
      },
    ],
  });
  status(run(c), 1);
  artifacts(c);
});

for (const fault of [
  "missing",
  "duplicate",
  "wrong-seed",
  "wrong-bot",
  "wrong-horizon",
  "short-horizon",
  "wrong-profile",
  "wrong-request-seed",
  "nonfinite-metric",
  "invalid-json",
  "observed-negative",
  "observed-too-large",
  "observed-before-arrival",
  "elapsed-negative",
  "elapsed-null",
  "wrong-effective-cadence",
  "gold-fractional",
  "best-negative",
  "depth-fractional",
]) {
  test(`native ${fault} output is a hard error, never acceptance`, (t) => {
    const c = setup(
      t,
      fault === "observed-before-arrival"
        ? {
            probe: { bots: ["PICKED"], days: 1, checkins: 3, untilDepth: 8 },
            claims: [
              {
                id: "arrival",
                metric: { bot: "PICKED", field: "arrival_hours", depth: 8 },
                comparison: "absolute",
                estimand: "median",
                direction: "at-most",
                threshold: 13,
              },
            ],
          }
        : {},
    );
    const r = run(c, { STAT_PROBE_FAULT: fault });
    status(r, 2);
    assert(calls(c).length > 0, "fresh malformed probe must actually execute");
    assert(
      !existsSync(join(c.out, "report.json")) ||
        !/"status"\s*:\s*"STATISTICALLY_ACCEPTED"/.test(
          readFileSync(join(c.out, "report.json"), "utf8"),
        ),
    );
  });
}

test("interrupted work resumes completed native jobs and preserves held-out preregistration", (t) => {
  const c = setup(t);
  status(run(c, { STAT_PROBE_STOP_AFTER: "3" }), 2);
  const manifest = readFileSync(join(c.out, "manifest.json"), "utf8");
  const first = calls(c);
  assert(first.length > 0);
  status(run(c), 0);
  artifacts(c);
  assert.equal(readFileSync(join(c.out, "manifest.json"), "utf8"), manifest);
  // Successful initial invocations must not be repeated; the intentionally failed invocation may be.
  for (const saved of first.slice(0, 2))
    assert.equal(calls(c).filter((x) => JSON.stringify(x) === JSON.stringify(saved)).length, 1);
});

test("spec, base profile and executable changes invalidate resume instead of reusing a false PASS", (t) => {
  for (const mutation of ["spec", "profile", "bin"]) {
    const c = setup(t);
    status(run(c), 0);
    const before = calls(c).length;
    if (mutation === "spec") {
      c.spec.claims[0].threshold = 100;
      writeFileSync(c.specFile, JSON.stringify(c.spec));
    }
    if (mutation === "profile") writeFileSync(c.base, JSON.stringify({ x: 0, mode: "seeded" }));
    if (mutation === "bin")
      writeFileSync(c.bin, readFileSync(c.bin, "utf8") + "\n// changed executable identity\n");
    const r = run(c);
    assert(
      r.status === 2 || calls(c).length > before,
      `${mutation} reused completed PASS without identity validation: ${r.text}`,
    );
    if (mutation === "spec") assert.notEqual(r.status, 0, r.text);
  }
});

test("corrupt cached jobs are rejected or recomputed, with zero false acceptance from corruption", (t) => {
  const c = setup(t);
  status(run(c), 0);
  const before = calls(c).length;
  const jobs = files(join(c.out, "jobs")).filter((f) => f.endsWith(".json"));
  assert(jobs.length > 0);
  for (const f of jobs) writeFileSync(f, "{truncated");
  const r = run(c);
  assert(
    r.status === 2 || calls(c).length > before,
    `corrupt jobs silently reused old acceptance: ${r.text}`,
  );
  if (r.status !== 2) status(r, 0);
});

test("mutating preregistered seeds cannot contaminate held-out confirmation", (t) => {
  const c = setup(t);
  status(run(c), 0);
  const manifest = read(join(c.out, "manifest.json"));
  manifest.seeds.confirmation[0] = manifest.seeds.discovery[0];
  writeFileSync(join(c.out, "manifest.json"), JSON.stringify(manifest));
  const before = calls(c).length;
  status(run(c), 2);
  assert.equal(calls(c).length, before);
});

test("corrupt completed caches plus malformed replacement probes cannot retain a stale PASS", (t) => {
  const c = setup(t);
  status(run(c), 0);
  const jobs = files(join(c.out, "jobs")).filter((f) => f.endsWith(".json"));
  assert(jobs.length > 0);
  for (const file of jobs) writeFileSync(file, "{truncated");
  status(run(c, { STAT_PROBE_FAULT: "missing" }), 2);
  assertNoCurrentAcceptance(c);
});

test("ratio units survive ranking normalization, and missing arrivals are explicitly capped", (t) => {
  const ratio = setup(t, {
    candidates: [{ name: "gain", set: { x: 10 } }],
    claims: [
      {
        id: "ratio",
        metric: {
          ratio: [
            { bot: "PICKED", field: "gold_day", day: 1 },
            { bot: "PICKED", field: "best_day", day: 1 },
          ],
        },
        comparison: "absolute",
        estimand: "median",
        direction: "at-most",
        threshold: 6,
        rankingScale: 10,
      },
    ],
  });
  status(run(ratio), 0);
  assert.equal(artifacts(ratio).report.confirmation.at(-1).claims[0].estimate, 5.5);
  const missing = setup(t, {
    candidates: [{ name: "missing", set: { mode: "missing-arrival" } }],
    claims: [
      {
        id: "arrival",
        metric: { bot: "PICKED", field: "arrival_hours", depth: 8 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-most",
        threshold: 33,
      },
    ],
  });
  status(run(missing), 0);
  const report = artifacts(missing).report;
  assert.equal(
    report.confirmation.at(-1).claims[0].estimate,
    32,
    "missing arrival is capped at horizon plus one check-in",
  );
  assert.equal(
    report.confirmation.at(-1).claims[0].candidateCensored,
    report.confirmation.at(-1).n,
  );
});

test("native early-depth stop extracts arrival time without requiring a fabricated complete day", (t) => {
  const c = setup(t, {
    candidates: [{ name: "fast", set: { x: 4 } }],
    probe: { bots: ["PICKED"], days: 1, checkins: 3, untilDepth: 8 },
    claims: [
      {
        id: "arrival",
        metric: { bot: "PICKED", field: "arrival_hours", depth: 8 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-most",
        threshold: 9,
      },
    ],
  });
  status(run(c), 0);
  assert.equal(artifacts(c).report.confirmation.at(-1).claims[0].estimate, 8);
});

test("day-indexed metrics read the specified day rather than an array default", (t) => {
  const c = setup(t, {
    candidates: [{ name: "day2", set: { x: 2 } }],
    probe: { bots: ["PICKED"], days: 2, checkins: 3 },
    claims: [
      {
        id: "day2",
        metric: { bot: "PICKED", field: "gold_day", day: 2 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-least",
        threshold: 102.5,
      },
    ],
  });
  status(run(c), 0);
  assert.equal(artifacts(c).report.confirmation.at(-1).claims[0].estimate, 103);
});

test("a failed held-out winner is rejected without retrying the runner-up", (t) => {
  const c = setup(t, {
    candidates: [
      { name: "optimistic", set: { x: 16, mode: "confirmation-loss" } },
      { name: "runner-up", set: { x: 14 } },
    ],
  });
  status(run(c), 1);
  const { report, state, manifest } = artifacts(c);
  assert.equal(report.status, "STATISTICALLY_REJECTED");
  assert.equal(state.winner.name, "optimistic");
  const heldout = new Set(manifest.seeds.confirmation);
  const confirmationCalls = calls(c).filter((call) => call.seeds.some((seed) => heldout.has(seed)));
  assert.deepEqual(
    [...new Set(confirmationCalls.map((call) => call.profile.x))].sort((a, b) => a - b),
    [0, 16],
  );
  assert.equal(report.confirmation.at(-1).claims[0].estimate, 0);
});

test("cross-bot ratios preserve requested bot identity", (t) => {
  const c = setup(t, {
    candidates: [{ name: "cross-bot", set: { x: 10, mode: "bot-values" } }],
    probe: { bots: ["IDLE", "PICKED"], days: 1, checkins: 3 },
    claims: [
      {
        id: "ratio",
        metric: {
          ratio: [
            { bot: "PICKED", field: "best_day", day: 1 },
            { bot: "IDLE", field: "best_day", day: 1 },
          ],
        },
        comparison: "absolute",
        estimand: "median",
        direction: "at-least",
        threshold: 3.5,
      },
    ],
  });
  status(run(c), 0);
  assert.equal(artifacts(c).report.confirmation.at(-1).claims[0].estimate, 4);
});

test("a persisted frozen winner cannot be replaced on resume", (t) => {
  const c = setup(t);
  status(run(c), 0);
  const state = read(join(c.out, "state.json"));
  state.winner.name = "runner-up";
  writeFileSync(join(c.out, "state.json"), JSON.stringify(state));
  status(run(c), 2);
});

function assertNoCurrentAcceptance(c) {
  const markdown = join(c.out, "report.md");
  if (existsSync(markdown))
    assert.doesNotMatch(
      readFileSync(markdown, "utf8"),
      /\*\*STATISTICALLY_ACCEPTED\*\*/,
      "failed invocation left current accepted Markdown",
    );
  const file = join(c.out, "report.json");
  if (existsSync(file))
    assert.notEqual(
      read(file).status,
      "STATISTICALLY_ACCEPTED",
      "failed current invocation left a current accepted report",
    );
}
for (const failure of ["spec-json", "spec-identity", "base-json", "binary-missing"]) {
  test(`after accepted run, ${failure} error cannot leave a current accepted report`, (t) => {
    const c = setup(t);
    status(run(c), 0);
    if (failure === "spec-json") writeFileSync(c.specFile, "{broken");
    if (failure === "spec-identity") {
      c.spec.claims[0].threshold = 100;
      writeFileSync(c.specFile, JSON.stringify(c.spec));
    }
    if (failure === "base-json") writeFileSync(c.base, "{broken");
    if (failure === "binary-missing") rmSync(c.bin);
    status(run(c), 2);
    assertNoCurrentAcceptance(c);
  });
}

test("two simultaneous same-output invocations have one exclusive writer and one immutable manifest", async (t) => {
  const c = setup(t, { candidates: [{ name: "winner", set: { x: 16 } }] });
  const owner = spawn(
    process.execPath,
    [
      cli,
      "--name",
      "synthetic",
      "--spec",
      c.specFile,
      "--bin",
      c.bin,
      "--out",
      c.out,
      "--threads",
      "2",
    ],
    {
      cwd: root,
      env: {
        ...testEnv,
        STAT_PROBE_LOG: c.log,
        STAT_PROBE_MANIFEST: join(c.out, "manifest.json"),
        STAT_PROBE_DELAY_MS: "300",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  owner.stdout.on("data", (d) => (output += d));
  owner.stderr.on("data", (d) => (output += d));
  const done = new Promise((resolve, reject) => {
    owner.on("error", reject);
    owner.on("close", (code) => resolve(code));
  });
  t.after(() => {
    if (owner.exitCode === null && !owner.killed) owner.kill("SIGTERM");
  });
  const deadline = Date.now() + 5000;
  while (calls(c).length === 0 && Date.now() < deadline && owner.exitCode === null)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert(calls(c).length > 0, `owner did not begin probing: ${output}`);
  const manifest = readFileSync(join(c.out, "manifest.json"), "utf8");
  const contender = run(c);
  status(contender, 2);
  assert.match(
    contender.text,
    /lock|running|writer|busy/i,
    "contender should explain exclusive ownership",
  );
  assert.equal(
    readFileSync(join(c.out, "manifest.json"), "utf8"),
    manifest,
    "contender overwrote preregistered seeds",
  );
  assert.equal(await done, 0, output);
  assert.equal(readFileSync(join(c.out, "manifest.json"), "utf8"), manifest);
  assert.equal(artifacts(c).report.status, "STATISTICALLY_ACCEPTED");
});

test("a lock with a proven dead same-host PID can resume safely", (t) => {
  const c = setup(t, { candidates: [{ name: "winner", set: { x: 16 } }] });
  const dead = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
  assert.equal(dead.status, 0);
  const lock = join(c.out, ".writer-lock");
  mkdirSync(lock, { recursive: true });
  writeFileSync(
    join(lock, "owner.json"),
    JSON.stringify({
      pid: dead.pid,
      hostname: hostname(),
      token: "known-dead-test",
      startedAt: new Date().toISOString(),
    }),
  );
  status(run(c), 0);
  assert(!existsSync(lock));
  assert.equal(artifacts(c).report.status, "STATISTICALLY_ACCEPTED");
});

test("SIGTERM releases writer ownership and preserves the immutable study for resume", async (t) => {
  const c = setup(t, { candidates: [{ name: "winner", set: { x: 16 } }] });
  const owner = spawn(
    process.execPath,
    [
      cli,
      "--name",
      "synthetic",
      "--spec",
      c.specFile,
      "--bin",
      c.bin,
      "--out",
      c.out,
      "--threads",
      "2",
    ],
    {
      cwd: root,
      env: {
        ...testEnv,
        STAT_PROBE_LOG: c.log,
        STAT_PROBE_MANIFEST: join(c.out, "manifest.json"),
        STAT_PROBE_DELAY_MS: "500",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  owner.stdout.on("data", (d) => (output += d));
  owner.stderr.on("data", (d) => (output += d));
  const done = new Promise((resolve, reject) => {
    owner.on("error", reject);
    owner.on("close", (code) => resolve(code));
  });
  t.after(() => {
    if (owner.exitCode === null && !owner.killed) owner.kill("SIGKILL");
  });
  const deadline = Date.now() + 5000;
  while (calls(c).length === 0 && Date.now() < deadline && owner.exitCode === null)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert(calls(c).length > 0, output);
  const manifest = readFileSync(join(c.out, "manifest.json"), "utf8");
  owner.kill("SIGTERM");
  assert.equal(await done, 130, output);
  assert(!existsSync(join(c.out, ".writer-lock")));
  assertNoCurrentAcceptance(c);
  status(run(c), 0);
  assert.equal(readFileSync(join(c.out, "manifest.json"), "utf8"), manifest);
});

test("DAILY and AWAY missing-arrival caps use their actual one-check-in cadence", (t) => {
  const c = setup(t, {
    candidates: [{ name: "daily", set: { mode: "missing-arrival" } }],
    probe: { bots: ["DAILY", "AWAY"], days: 1, checkins: 3 },
    claims: [
      {
        id: "daily",
        metric: { bot: "DAILY", field: "arrival_hours", depth: 8 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-most",
        threshold: 49,
      },
      {
        id: "away",
        metric: { bot: "AWAY", field: "arrival_hours", depth: 8 },
        comparison: "absolute",
        estimand: "median",
        direction: "at-most",
        threshold: 49,
      },
    ],
  });
  status(run(c), 0);
  for (const claim of artifacts(c).report.confirmation.at(-1).claims)
    assert.equal(claim.estimate, 48);
});

test("tune.sh dispatches statistical list/help without native work", (t) => {
  const c = setup(t);
  const args = [
    "--name",
    "synthetic",
    "--spec",
    c.specFile,
    "--bin",
    c.bin,
    "--out",
    c.out,
    "--list",
  ];
  const list = spawnSync("bash", [join(root, "tools/tune.sh"), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...testEnv, STAT_PROBE_LOG: c.log },
    timeout: 30000,
  });
  assert.ifError(list.error);
  status({ ...list, text: list.stdout + list.stderr }, 0);
  assert.match(list.stdout, /x16/);
  assert.equal(calls(c).length, 0);
  const help = spawnSync("bash", [join(root, "tools/tune.sh"), "--help"], {
    cwd: root,
    encoding: "utf8",
    env: testEnv,
    timeout: 30000,
  });
  assert.ifError(help.error);
  status({ ...help, text: help.stdout + help.stderr }, 0);
  assert.match(help.stdout + help.stderr, /stat|spec|study/i);
  assert.equal(calls(c).length, 0);
});

test("tune.sh --exact --list retains legacy row dispatch without building Cargo", (t) => {
  const c = setup(t);
  const tools = join(c.dir, "tools"),
    bin = join(c.dir, "bin"),
    examples = join(c.dir, "target/fast/examples");
  for (const path of [tools, bin, examples]) mkdirSync(path, { recursive: true });
  copyFileSync(join(root, "tools/tune.sh"), join(tools, "tune.sh"));
  const build = join(bin, "cargo");
  writeFileSync(build, '#!/bin/sh\nprintf "cargo stub: %s\\n" "$*"\nexit 0\n');
  chmodSync(build, 0o755);
  for (const name of ["dayplayer", "opening"]) {
    const file = join(examples, name);
    writeFileSync(file, `#!/bin/sh\nprintf '${name} legacy rows: %s\\n' "$*"\nexit 2\n`);
    chmodSync(file, 0o755);
  }
  const r = spawnSync("bash", [join(tools, "tune.sh"), "--exact", "--list"], {
    cwd: c.dir,
    encoding: "utf8",
    env: { ...testEnv, PATH: `${bin}:${testEnv.PATH}` },
    timeout: 10000,
  });
  assert.ifError(r.error);
  status({ ...r, text: r.stdout + r.stderr }, 0);
  assert.match(r.stdout, /dayplayer legacy rows: --rows \?/);
  assert.match(r.stdout, /opening legacy rows: --rows \?/);
});
