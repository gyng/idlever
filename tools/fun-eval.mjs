#!/usr/bin/env node
// fun-eval — the fun-evaluation harness: freeze → brief → rate → collect → score, with the score
// reproducible from the cards alone. See docs/FUN_EVAL_HARNESS.md.
//
// It reuses the existing instruments instead of reimplementing them: eval/score.sh (which wraps
// ../eval-fun/tools/fun-score.mjs), ../eval-fun/tools/fun-reliability.mjs (Krippendorff α),
// eval/RATER_PROMPT.md (the frozen brief), eval/RATING.md + docs/FUN_EVAL_IDLE.md +
// ../eval-fun/docs/FRAMEWORK.md §1–3 + eval/SCORECARD.template.json (the packet's documents),
// vite preview (the server tools/ship.sh uses) and tools/driver.mjs (the raters' browser).
//
//   node tools/fun-eval.mjs freeze  --candidate <name> [--dir <dir>] [--port N] [--no-build] [--package <dist>] [--no-serve] [--force]
//   node tools/fun-eval.mjs serve   --candidate <name> [--port N]
//   node tools/fun-eval.mjs stop    --candidate <name>
//   node tools/fun-eval.mjs verify  --candidate <name>
//   node tools/fun-eval.mjs brief   --candidate <name> --rater <id> [--seed N] [--port N] [--url URL] [--force]
//   node tools/fun-eval.mjs packet-check --candidate <name> [--rater <id>]
//   node tools/fun-eval.mjs collect --candidate <name> --rater <id> [--card <path>] [--date YYYY-MM-DD] [--cards-dir <dir>]
//   node tools/fun-eval.mjs score   --candidate <name> [--cards <dir|file>] [--json]
//   node tools/fun-eval.mjs calibrate [--json]
//   node tools/fun-eval.mjs status  --candidate <name>
//
// Frozen layout (default dir scratchpad/fun-eval/<candidate>/):
//   dist/            the served package, byte for byte
//   manifest.txt     `<sha256>  ./path` for every file in dist (the package identity)
//   identity.json    commit, dirty state, wasm sha256, package manifest sha256, identity sha256,
//                    and the served URL's hash check
//   server.json      the live preview server (port, url, log)
//   packets/<rater>/ the whole blind packet: brief.txt + byte-identical copies of the four briefed
//                    documents + PACKET.json (provenance and exclusions)
//   cards/<candidate>.<rater>.<date>.json   dated receipt of every collected card
//   collected.json   the receipts log
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EVAL_FUN = resolve(ROOT, "../eval-fun");
const CARDS_DIR = join(ROOT, "eval/cards");
const COHORTS_DIR = join(ROOT, "eval/cohorts");
const RATER_PROMPT = join(ROOT, "eval/RATER_PROMPT.md");
const APPENDIX_MARKER = "\n\n--- packet: tools/fun-eval.mjs ---\n";
const SCHEMA = 1;

// The four documents the frozen brief names, and nothing else. `slice` extracts a part verbatim.
const PACKET_DOCS = [
  { name: "RATING.md", source: join(ROOT, "eval/RATING.md") },
  { name: "FUN_EVAL_IDLE.md", source: join(ROOT, "docs/FUN_EVAL_IDLE.md") },
  {
    name: "FRAMEWORK.md",
    source: join(EVAL_FUN, "docs/FRAMEWORK.md"),
    from: "## 1. The fourteen axes",
    to: "## 4. Bot caps, gates and the verdict",
    note: "sections 1–3 of the file, extracted verbatim",
  },
  { name: "SCORECARD.template.json", source: join(ROOT, "eval/SCORECARD.template.json") },
];

const EXCLUDED = [
  "design history: PLAN.md, docs/CUT*.md, docs/HANDOFF*.md, docs/PLATEAU.md, docs/WORK_QUEUE.md, docs/ITERATION_SPEED.md, research/",
  "any other card, cohort acceptance record or reliability report",
  "eval/calibration/ (the re-anchoring titles) and eval/cohorts/",
  "the coordinator's notes, scratchpad/ (including this frozen directory), and any rater's own history",
  "the source code and any commit message",
  "any score the build is meant to reach, and any previous card's total",
];

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const sha256File = (path) => sha256(readFileSync(path));
const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;
const utc = () => new Date().toISOString();

function walk(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, base));
    else if (entry.isFile()) out.push(path.slice(base.length + 1));
  }
  return out;
}

// The package identity: exactly the format the recorded frozen dirs used (`<sha256>  ./path`).
function manifestOf(dir) {
  const entries = walk(dir).map((rel) => {
    const abs = join(dir, rel);
    return {
      path: `./${rel.split("/").join("/")}`,
      bytes: statSync(abs).size,
      sha256: sha256File(abs),
    };
  });
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const text = entries.map((e) => `${e.sha256}  ${e.path}\n`).join("");
  return {
    entries,
    text,
    files: entries.length,
    bytes: entries.reduce((sum, e) => sum + e.bytes, 0),
    sha256: sha256(text),
  };
}

function parseManifest(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const m = /^([0-9a-f]{64}) {2}(.*)$/.exec(line);
      if (!m) throw new Error(`manifest line is not '<sha256>  ./path': ${line}`);
      return { sha256: m[1], path: m[2] };
    });
}

// Repo-relative where possible, `../eval-fun/...` for the framework doc beside the repo.
const sourceLabel = (path) => relative(ROOT, path);

const frozenDirFor = (candidate, dir) =>
  resolve(dir ?? join(ROOT, "scratchpad/fun-eval", candidate));
const identityPath = (frozen) => join(frozen, "identity.json");
const manifestPath = (frozen) => join(frozen, "manifest.txt");

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeAtomic(path, data) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

function gitOut(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout : "";
}

function gitIdentity() {
  const commit = gitOut(["rev-parse", "HEAD"]).trim();
  const porcelain = gitOut(["status", "--porcelain"]);
  const tracked = gitOut(["status", "--porcelain", "--untracked-files=no"]);
  const diff = gitOut(["diff", "HEAD"]);
  const trackedLines = tracked.split("\n").filter(Boolean);
  const untrackedLines = porcelain
    .split("\n")
    .filter(Boolean)
    .filter((l) => l.startsWith("??"));
  return {
    commit,
    commitShort: gitOut(["rev-parse", "--short=12", "HEAD"]).trim(),
    branch: gitOut(["rev-parse", "--abbrev-ref", "HEAD"]).trim(),
    dirty: trackedLines.length > 0,
    untrackedPresent: untrackedLines.length > 0,
    trackedChanges: trackedLines,
    trackedChangeCount: trackedLines.length,
    untrackedCount: untrackedLines.length,
    trackedDiffSha256: sha256(diff),
    porcelainSha256: sha256(porcelain),
  };
}

function wasmIdentity() {
  const pkgDir = join(ROOT, "web/src/engine/pkg");
  const wasm = join(pkgDir, "idlever_wasm_bg.wasm");
  if (!existsSync(wasm)) throw new Error(`no wasm at ${wasm}: run tools/wasm.sh first`);
  return {
    pkgDir: "web/src/engine/pkg",
    wasm: "web/src/engine/pkg/idlever_wasm_bg.wasm",
    bytes: statSync(wasm).size,
    sha256: sha256File(wasm),
    pkgManifestSha256: manifestOf(pkgDir).sha256,
  };
}

// The artifact identity: a pure function of the tree and the package bytes, so two freezes of the
// same source share it however they are labelled. dist.manifestSha256 alone identifies the bytes.
function identitySha256({ git, wasm, distSha256 }) {
  const material = [
    "fun-eval-identity/v1",
    git.commit,
    String(git.dirty),
    git.trackedDiffSha256,
    wasm.sha256,
    distSha256,
  ].join("\n");
  return sha256(material);
}

async function freePort() {
  return await new Promise((res, rej) => {
    const server = net.createServer();
    server.on("error", rej);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => res(port));
    });
  });
}

async function fetchWithTimeout(url) {
  return await fetch(url, {
    headers: { "accept-encoding": "identity" },
    signal: AbortSignal.timeout(30000),
    redirect: "follow",
  });
}

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const r = await fetchWithTimeout(url);
      if (r.ok) return true;
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = e.message;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${url} did not come up in ${timeoutMs}ms (${last})`);
}

// Byte evidence: every manifest entry fetched back over HTTP and hashed.
async function verifyServed(url, entries) {
  const mismatches = [];
  let matched = 0;
  for (const entry of entries) {
    const path = entry.path.replace(/^\.\//, "");
    try {
      const r = await fetchWithTimeout(new URL(path, url));
      if (!r.ok) {
        mismatches.push({ path, reason: `HTTP ${r.status}` });
        continue;
      }
      const got = sha256(Buffer.from(await r.arrayBuffer()));
      if (got !== entry.sha256)
        mismatches.push({ path, reason: `served ${got} != manifest ${entry.sha256}` });
      else matched++;
    } catch (e) {
      mismatches.push({ path, reason: e.message });
    }
  }
  return { matched, total: entries.length, mismatches, checkedUtc: utc() };
}

function startPreview(distDir, port, logPath) {
  rmSync(logPath, { force: true });
  const cmd = `exec setsid nohup pnpm exec vite preview --outDir ${q(distDir)} --port ${port} --strictPort > ${q(logPath)} 2>&1`;
  const child = spawn("bash", ["-c", cmd], {
    cwd: join(ROOT, "web"),
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function stopPreview(distDir) {
  const r = spawnSync("pkill", ["-f", `vite preview --outDir ${distDir}`], { encoding: "utf8" });
  return r.status === 0;
}

// ---------------------------------------------------------------- freeze

function buildPackage(staging, { noBuild, package: packageDir }) {
  if (packageDir) {
    const src = resolve(packageDir);
    if (!existsSync(join(src, "index.html")))
      throw new Error(`${src} has no index.html: not a built package`);
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    for (const rel of walk(src)) {
      const dst = join(staging, rel);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(join(src, rel), dst);
    }
    return { built: false, from: src, buildKind: "existing package" };
  }
  if (noBuild) return { built: false, from: null, buildKind: "reused dist" };
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  exec("tools/wasm.sh", [], ROOT);
  exec("pnpm", ["exec", "vite", "build", "--outDir", staging, "--emptyOutDir"], join(ROOT, "web"));
  return { built: true, from: "web/src/engine/pkg + vite build", buildKind: "preview" };
}

function exec(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited ${r.status}`);
}

function recordIdentity(candidate, dist, buildInfo, identityOld) {
  const git = gitIdentity();
  const wasm = wasmIdentity();
  const identity = {
    tool: "tools/fun-eval.mjs",
    schema: SCHEMA,
    candidate,
    frozenUtc: identityOld?.frozenUtc ?? utc(),
    recordedUtc: utc(),
    git,
    wasm,
    dist: {
      dir: "dist",
      files: dist.files,
      bytes: dist.bytes,
      manifest: "manifest.txt",
      manifestSha256: dist.sha256,
      buildKind: buildInfo.buildKind,
      builtFrom: buildInfo.from,
      wasmAssets: dist.entries
        .filter((e) => e.path.endsWith(".wasm"))
        .map((e) => ({ path: e.path.replace(/^\.\//, ""), bytes: e.bytes, sha256: e.sha256 })),
    },
    served: identityOld?.served ?? null,
  };
  identity.identitySha256 = identitySha256({ git, wasm, distSha256: dist.sha256 });
  return identity;
}

async function cmdFreeze(opts) {
  const candidate = opts.candidate;
  const frozen = frozenDirFor(candidate, opts.dir);
  const distDir = join(frozen, "dist");
  const staging = join(frozen, ".staging-dist");
  const old = readJson(identityPath(frozen));

  mkdirSync(frozen, { recursive: true });
  const buildInfo = buildPackage(staging, opts);
  const built = buildInfo.built || Boolean(opts.package);
  if (!built && !existsSync(join(distDir, "index.html")))
    throw new Error(`nothing frozen at ${distDir}: drop --no-build`);
  const staged = built ? manifestOf(staging) : manifestOf(distDir);
  if (built && !existsSync(join(staging, "index.html")))
    throw new Error("the built package has no index.html: the build did not produce a site");
  if (!staged.entries.some((e) => e.path.endsWith(".wasm"))) {
    throw new Error(
      "the package has no .wasm: a production engine is missing (run tools/wasm.sh first)",
    );
  }

  if (old && old.dist?.manifestSha256 && old.dist.manifestSha256 !== staged.sha256 && !opts.force) {
    console.error(`fun-eval freeze: REFUSING to reuse the frozen artifact at ${frozen}`);
    console.error(
      `  frozen  manifest sha256 ${old.dist.manifestSha256} (${old.dist.files} files, ${old.candidate})`,
    );
    console.error(`  package manifest sha256 ${staged.sha256} (${staged.files} files, this run)`);
    console.error(
      "  a different package is already frozen under this candidate. Freeze the new package under",
    );
    console.error("  its own --dir, or pass --force to replace this candidate's frozen record.");
    process.exit(2);
  }

  const identical = Boolean(old && old.dist?.manifestSha256 === staged.sha256);
  // A produced package always replaces dist/: the frozen record must be the bytes this build
  // produces, never a tampered copy on disk that happens to be named the same.
  if (built) {
    rmSync(distDir, { recursive: true, force: true });
    renameSync(staging, distDir);
  }
  rmSync(staging, { recursive: true, force: true });
  const dist = manifestOf(distDir);

  writeAtomic(manifestPath(frozen), dist.text);
  const identity = recordIdentity(candidate, dist, buildInfo, old);
  writeAtomic(identityPath(frozen), `${JSON.stringify(identity, null, 2)}\n`);

  console.log(
    `fun-eval freeze: ${identical ? "already frozen, identical bytes" : "frozen"} ${frozen}`,
  );
  printIdentity(identity);

  if (!opts.noServe) await cmdServe({ candidate, dir: opts.dir, port: opts.port });
}

function printIdentity(identity) {
  const g = identity.git;
  console.log(`  candidate   ${identity.candidate}`);
  console.log(
    `  commit      ${g.commit} (${g.commitShort})${g.dirty ? " DIRTY (tracked changes)" : " clean"}${g.untrackedPresent ? " + untracked files" : ""}`,
  );
  if (g.trackedChanges.length)
    console.log(
      `  tracked     ${g.trackedChanges.slice(0, 8).join(" · ")}${g.trackedChanges.length > 8 ? ` … ${g.trackedChanges.length} total` : ""}`,
    );
  console.log(
    `  wasm        ${identity.wasm.sha256} (${identity.wasm.bytes} bytes, ${identity.wasm.wasm})`,
  );
  console.log(
    `  package     ${identity.dist.manifestSha256} (${identity.dist.files} files, ${identity.dist.bytes} bytes)`,
  );
  for (const a of identity.dist.wasmAssets)
    console.log(`  wasm asset  ${a.sha256} (${a.bytes} bytes, ${a.path})`);
  console.log(`  identity    ${identity.identitySha256}`);
  if (identity.served)
    console.log(`  served      ${identity.served.url} · ${identity.served.hashes}`);
}

// ---------------------------------------------------------------- serve / stop / verify

async function cmdServe(opts) {
  const candidate = opts.candidate;
  const frozen = frozenDirFor(candidate, opts.dir);
  const identity = readJson(identityPath(frozen));
  const distDir = join(frozen, "dist");
  if (!existsSync(join(distDir, "index.html")))
    throw new Error(`nothing frozen at ${frozen}: run freeze first`);
  const entries = parseManifest(readFileSync(manifestPath(frozen), "utf8"));
  stopPreview(distDir);
  const port = opts.port ? Number(opts.port) : await freePort();
  const url = `http://127.0.0.1:${port}/`;
  const log = `/tmp/fun-eval-preview-${candidate}-${port}.log`;
  startPreview(distDir, port, log);
  await waitForUrl(url);
  const check = await verifyServed(url, entries);
  const server = {
    candidate,
    port,
    url,
    log,
    startedUtc: utc(),
    dist: distDir,
    manifestSha256: sha256(readFileSync(manifestPath(frozen))),
  };
  writeAtomic(join(frozen, "server.json"), `${JSON.stringify(server, null, 2)}\n`);
  if (identity) {
    identity.served = {
      url,
      port,
      log,
      hashes: `${check.matched}/${check.total} match`,
      checkedUtc: check.checkedUtc,
      mismatches: check.mismatches,
    };
    writeAtomic(identityPath(frozen), `${JSON.stringify(identity, null, 2)}\n`);
  }
  console.log(`fun-eval serve: ${url} (isolated port ${port}, vite preview on ${distDir})`);
  console.log(
    `  served bytes ${check.matched}/${check.total} match manifest.txt (${sha256(readFileSync(manifestPath(frozen)))})`,
  );
  if (check.mismatches.length) {
    for (const m of check.mismatches.slice(0, 20))
      console.error(`  MISMATCH ${m.path}: ${m.reason}`);
    process.exit(2);
  }
  return server;
}

function cmdStop(opts) {
  const frozen = frozenDirFor(opts.candidate, opts.dir);
  const server = readJson(join(frozen, "server.json"));
  const distDir = server?.dist ?? join(frozen, "dist");
  const killed = stopPreview(distDir);
  if (server) rmSync(join(frozen, "server.json"), { force: true });
  console.log(`fun-eval stop: ${killed ? "stopped" : "nothing running for"} ${distDir}`);
}

async function cmdVerify(opts) {
  const candidate = opts.candidate;
  const frozen = frozenDirFor(candidate, opts.dir);
  const server = readJson(join(frozen, "server.json"));
  if (!server) throw new Error(`no server.json in ${frozen}: run serve first`);
  const entries = parseManifest(readFileSync(manifestPath(frozen), "utf8"));
  const check = await verifyServed(server.url, entries);
  console.log(
    `fun-eval verify: ${server.url} → ${check.matched}/${check.total} match ${sha256(readFileSync(manifestPath(frozen)))}`,
  );
  for (const m of check.mismatches) console.error(`  MISMATCH ${m.path}: ${m.reason}`);
  if (check.mismatches.length) process.exit(2);
}

// ---------------------------------------------------------------- packet

function docText(doc) {
  const source = readFileSync(doc.source, "utf8");
  if (!doc.from) return source;
  const from = source.indexOf(doc.from);
  const to = source.indexOf(doc.to);
  if (from < 0 || to < 0 || to <= from)
    throw new Error(`${doc.source}: cannot slice ${doc.from} … ${doc.to}`);
  return source.slice(from, to);
}

function renderBrief({ url, rater, port, seed, candidate, manifest, wasm }) {
  const source = readFileSync(RATER_PROMPT, "utf8");
  const substitutions = [];
  const step = (from, to) => substitutions.push({ from, to });
  step("{URL}", url);
  step("{RATER}", rater);
  step("{PORT}", String(port));
  step("{SEED}", String(seed));
  step("{BUILD}", candidate);
  step(`eval/cards/${candidate}.${rater}.rules.json`, `card/${candidate}.${rater}.rules.json`);
  step(`eval/cards/${candidate}.${rater}.json`, `card/${candidate}.${rater}.json`);
  let text = source;
  for (const s of substitutions) text = text.split(s.from).join(s.to);
  const appendix = [
    "",
    "",
    "--- packet: tools/fun-eval.mjs ---",
    "Everything above is the frozen brief, rendered with this packet's URL, rater, driver port, seed and",
    "build. This directory is the whole packet. It holds byte-identical copies of the four documents the",
    "brief names (see PACKET.json for the source path and sha256 of each):",
    ...PACKET_DOCS.map((d) => `  ${d.name}${d.note ? ` — ${d.note}` : ""}`),
    "Read them here, not in the repository.",
    "",
    "Not in this packet, by construction:",
    ...EXCLUDED.map((e) => `  ${e}`),
    "",
    `Write the finished card to this directory as card/${candidate}.${rater}.json and the rule export as`,
    `card/${candidate}.${rater}.rules.json. Do not write into the repository's card directory. The`,
    `coordinator lands the card with: node tools/fun-eval.mjs collect --candidate ${candidate} --rater ${rater}`,
    "",
    `Frozen identity: candidate ${candidate} · package manifest sha256 ${manifest} · wasm sha256 ${wasm} ·`,
    `driver port ${port} · seed ${seed} · URL ${url}`,
  ].join("\n");
  return { text: text + appendix + "\n", source, substitutions };
}

async function cmdBrief(opts) {
  const candidate = opts.candidate;
  if (!opts.rater) throw new Error("brief needs --rater <id>");
  const frozen = frozenDirFor(candidate, opts.dir);
  const identity = readJson(identityPath(frozen));
  if (!identity) throw new Error(`no frozen identity at ${frozen}: run freeze first`);
  const server = readJson(join(frozen, "server.json"));
  const url = opts.url ?? server?.url;
  if (!url) throw new Error("no served URL on record: run serve, or pass --url");
  const seed = opts.seed
    ? Number(opts.seed)
    : 100 + Number(BigInt(`0x${sha256(`${candidate}/${opts.rater}`).slice(0, 8)}`) % 900n);
  const port = opts.port ? Number(opts.port) : await freePort();
  const packet = join(frozen, "packets", opts.rater);
  if (existsSync(join(packet, "PACKET.json")) && !opts.force) {
    console.error(
      `fun-eval brief: REFUSING to overwrite the packet at ${packet} (--force to replace)`,
    );
    process.exit(2);
  }
  const brief = renderBrief({
    url,
    rater: opts.rater,
    port,
    seed,
    candidate,
    manifest: identity.dist.manifestSha256,
    wasm: identity.wasm.sha256,
  });
  const body = brief.text.slice(0, brief.text.indexOf(APPENDIX_MARKER));
  if (/\{URL\}|\{RATER\}|\{PORT\}|\{SEED\}|\{BUILD\}/.test(body))
    throw new Error("brief.txt still holds a placeholder");
  if (body.includes("eval/cards/"))
    throw new Error("brief.txt still points the card at eval/cards/");
  const docs = PACKET_DOCS.map((doc) => ({ doc, text: docText(doc) }));
  mkdirSync(packet, { recursive: true });
  const files = [];
  for (const { doc, text } of docs) {
    writeFileSync(join(packet, doc.name), text);
    files.push({
      name: doc.name,
      source: sourceLabel(doc.source),
      sourceSha256: sha256(readFileSync(doc.source)),
      sha256: sha256(text),
      bytes: Buffer.byteLength(text),
      note: doc.note ?? "whole file, verbatim",
    });
  }
  writeFileSync(join(packet, "brief.txt"), brief.text);
  mkdirSync(join(packet, "card"), { recursive: true });
  const record = {
    tool: "tools/fun-eval.mjs",
    schema: SCHEMA,
    candidate,
    rater: opts.rater,
    seed,
    url,
    driverPort: port,
    createdUtc: utc(),
    brief: {
      source: "eval/RATER_PROMPT.md",
      sourceSha256: sha256(brief.source),
      sha256: sha256(brief.text),
      bytes: Buffer.byteLength(brief.text),
      substitutions: brief.substitutions,
    },
    identity: {
      commit: identity.git.commit,
      commitShort: identity.git.commitShort,
      dirty: identity.git.dirty,
      wasmSha256: identity.wasm.sha256,
      distManifestSha256: identity.dist.manifestSha256,
      identitySha256: identity.identitySha256,
    },
    documents: files,
    card: { dir: "card", expected: `card/${candidate}.${opts.rater}.json` },
    excluded: EXCLUDED,
  };
  writeAtomic(join(packet, "PACKET.json"), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`fun-eval brief: packet written to ${packet}`);
  console.log(
    `  brief.txt   ${record.brief.sha256} (from eval/RATER_PROMPT.md ${record.brief.sourceSha256})`,
  );
  for (const f of files) console.log(`  ${f.name.padEnd(24)} ${f.sha256} (${f.bytes} bytes)`);
  console.log(`  url ${url} · driver port ${port} · seed ${seed}`);
  console.log(`  hand the rater exactly this directory; the card goes to ${join(packet, "card")}`);
}

function packetCheck(candidate, rater, { dir } = {}) {
  const frozen = frozenDirFor(candidate, dir);
  const root = join(frozen, "packets");
  const raters = rater ? [rater] : existsSync(root) ? readdirSync(root).sort() : [];
  const problems = [];
  const report = [];
  for (const r of raters) {
    const packet = join(root, r);
    const record = readJson(join(packet, "PACKET.json"));
    if (!record) {
      problems.push(`${r}: no PACKET.json`);
      continue;
    }
    // 1. the file set is exactly the whitelist + brief.txt + PACKET.json (+ the empty card/ dir)
    const names = readdirSync(packet)
      .filter((n) => !n.startsWith("."))
      .sort();
    const allowed = [...PACKET_DOCS.map((d) => d.name), "brief.txt", "PACKET.json", "card"].sort();
    for (const n of names)
      if (!allowed.includes(n)) problems.push(`${r}: unexpected file in the packet: ${n}`);
    for (const n of allowed) if (!names.includes(n)) problems.push(`${r}: packet is missing ${n}`);
    // 2. every document is byte-identical to its recorded source (so nothing was edited to inject a score)
    for (const doc of record.documents ?? []) {
      const inPacket = join(packet, doc.name);
      if (!existsSync(inPacket)) {
        problems.push(`${r}: ${doc.name} missing`);
        continue;
      }
      if (sha256File(inPacket) !== doc.sha256)
        problems.push(`${r}: ${doc.name} does not match PACKET.json`);
      const source = resolve(ROOT, doc.source);
      const sourceText = readFileSync(source, "utf8");
      const packetText = readFileSync(inPacket, "utf8");
      if (!sourceText.includes(packetText))
        problems.push(`${r}: ${doc.name} is not a verbatim copy of ${doc.source}`);
      if (sha256File(source) !== doc.sourceSha256)
        problems.push(`${r}: ${doc.source} changed since the packet was frozen`);
      if (doc.name === "FRAMEWORK.md" && packetText.trim() !== docText(PACKET_DOCS[2]).trim())
        problems.push(`${r}: FRAMEWORK.md slice changed`);
    }
    // 3. brief.txt is the existing brief plus the appendix, provably
    const briefText = readFileSync(join(packet, "brief.txt"), "utf8");
    if (sha256(briefText) !== record.brief.sha256)
      problems.push(`${r}: brief.txt does not match PACKET.json`);
    const provenance = briefProvenance(briefText, record);
    if (provenance !== true)
      problems.push(`${r}: brief.txt provenance check failed: ${provenance}`);
    // 4. no target score anywhere the harness authored (the documents stay as they are)
    const authored = [
      record.brief.substitutions.map((s) => s.to).join(" "),
      briefText.slice(briefText.indexOf(APPENDIX_MARKER)),
      JSON.stringify({
        candidate: record.candidate,
        rater: record.rater,
        seed: record.seed,
        url: record.url,
      }),
    ].join("\n");
    for (const bad of [
      /\bdesired score\b/i,
      /\btarget score\b/i,
      /\bexpected score\b/i,
      /fun\s*(?:≥|>=)\s*\d/,
      /(?:score|goal|target)\s*(?:of|is|≥|>=)?\s*\d\d/i,
    ]) {
      const m = bad.exec(authored);
      if (m) problems.push(`${r}: harness-authored text names a score target: ${m[0]}`);
    }
    report.push({
      rater: r,
      seed: record.seed,
      url: record.url,
      documents: record.documents.length,
      brief: record.brief.sha256,
    });
  }
  return { problems, report };
}

// Rebuild the brief body from the source and the recorded substitutions, forward and exactly:
// anything the harness did not do, or any later edit, shows up as a byte difference.
function briefProvenance(briefText, record) {
  const cut = briefText.indexOf(APPENDIX_MARKER);
  if (cut < 0) return "no appendix marker";
  const body = briefText.slice(0, cut);
  if (sha256(readFileSync(RATER_PROMPT)) !== record.brief.sourceSha256)
    return "eval/RATER_PROMPT.md changed since the packet was frozen";
  let expected = readFileSync(RATER_PROMPT, "utf8");
  for (const s of record.brief.substitutions) expected = expected.split(s.from).join(s.to);
  if (body !== expected)
    return "the brief body is not eval/RATER_PROMPT.md with the recorded substitutions (it was edited after the packet was frozen)";
  return true;
}

function cmdPacketCheck(opts) {
  const { problems, report } = packetCheck(opts.candidate, opts.rater, opts);
  for (const r of report)
    console.log(
      `fun-eval packet-check: ${r.rater} · ${r.documents} documents · brief ${r.brief} · ${r.url}`,
    );
  if (problems.length) {
    for (const p of problems) console.error(`  PROBLEM ${p}`);
    process.exit(2);
  }
  console.log(
    "  packet contains only the frozen brief and the four briefed documents (byte-identical); nothing else",
  );
}

// ---------------------------------------------------------------- collect

function cmdCollect(opts) {
  const candidate = opts.candidate;
  if (!opts.rater) throw new Error("collect needs --rater <id>");
  const frozen = frozenDirFor(candidate, opts.dir);
  const identity = readJson(identityPath(frozen));
  const date = opts.date ?? utc().slice(0, 10);
  const source = resolve(
    opts.card ?? join(frozen, "packets", opts.rater, "card", `${candidate}.${opts.rater}.json`),
  );
  if (!existsSync(source)) throw new Error(`no card at ${source}`);
  const card = readJson(source);
  if (!card || typeof card !== "object") throw new Error(`${source} is not JSON`);
  if (!Array.isArray(card.axes) || card.axes.length < 16)
    throw new Error(`${source} has ${card.axes?.length ?? 0} axes: not a rater card`);
  if (card.build) {
    // A card's `build` is the rater's claim about what it played, and the brief asks for the
    // identity, so the filed cards write "<commit> (wasm sha256 …; dist manifest sha256 …)".
    // Accept any claim that names this candidate or this commit; refuse one that names neither.
    const named = String(card.build);
    const namesThisBuild =
      named.startsWith(candidate) ||
      candidate.startsWith(named) ||
      (identity &&
        (named.includes(identity.git.commit) || named.includes(identity.git.commitShort)));
    if (!namesThisBuild)
      throw new Error(
        `${source} says build ${named}, but this frozen candidate is ${candidate}` +
          (identity ? ` (commit ${identity.git.commitShort})` : ""),
      );
  }
  const canonicalDir = resolve(opts.cardsDir ?? CARDS_DIR);
  const canonical = join(canonicalDir, `${candidate}.${opts.rater}.json`);
  const dated = join(frozen, "cards", `${candidate}.${opts.rater}.${date}.json`);
  const taken = [canonical, dated].filter((p) => existsSync(p));
  if (taken.length) {
    console.error(`fun-eval collect: REFUSING to overwrite an existing card`);
    for (const p of taken) console.error(`  exists: ${p}`);
    console.error(
      "  nothing overwrites a card; use a new --rater id, or accept the dated receipt already on file.",
    );
    process.exit(2);
  }
  mkdirSync(dirname(canonical), { recursive: true });
  mkdirSync(dirname(dated), { recursive: true });
  const text = `${JSON.stringify(card, null, 2)}\n`;
  for (const p of [canonical, dated]) writeFileSync(p, text, { flag: "wx" });
  const total = scoreCard(canonical);
  const entry = {
    candidate,
    rater: opts.rater,
    date,
    at: utc(),
    card: canonical,
    receipt: dated,
    sha256: sha256(text),
    total: total?.total ?? null,
    verdict: total?.verdict ?? null,
    identitySha256: identity?.identitySha256 ?? null,
  };
  const log = readJson(join(frozen, "collected.json"), []);
  const entries = Array.isArray(log) ? log : [log];
  entries.push(entry);
  writeAtomic(join(frozen, "collected.json"), `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`fun-eval collect: ${opts.rater} landed (${date})`);
  console.log(`  ${canonical}  ${entry.sha256}`);
  console.log(`  ${dated}`);
  console.log(`  total ${entry.total} → ${entry.verdict}`);
}

// ---------------------------------------------------------------- score

function scoreCard(cardPath) {
  const r = spawnSync(join(ROOT, "eval/score.sh"), [cardPath, "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw new Error(
      `eval/score.sh ${cardPath} exited ${r.status}: ${(r.stderr || r.stdout).trim()}`,
    );
  return JSON.parse(r.stdout);
}

function reliability(cardPaths) {
  const r = spawnSync(
    "node",
    [join(EVAL_FUN, "tools/fun-reliability.mjs"), ...cardPaths, "--json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (r.status !== 0)
    return { alpha: null, error: (r.stderr || r.stdout).trim().split("\n").slice(-1)[0] };
  const out = JSON.parse(r.stdout);
  return {
    alpha: out.alpha,
    interpretation: out.interpretation,
    disagreements: out.disagreements,
    commonAxisCount: out.commonAxisCount,
    excludedAxes: out.excludedAxes,
  };
}

function cardPathsFor(candidate, cards) {
  if (cards) {
    const p = resolve(cards);
    if (existsSync(join(p, "index.html"))) throw new Error(`${p} is not a card`);
    if (statSync(p).isDirectory()) {
      return readdirSync(p)
        .filter((n) => n.endsWith(".json") && !n.endsWith(".rules.json"))
        .sort()
        .map((n) => join(p, n));
    }
    return [p];
  }
  if (!existsSync(CARDS_DIR)) return [];
  const prefix = `${candidate}.`;
  return readdirSync(CARDS_DIR)
    .filter((n) => n.startsWith(prefix) && n.endsWith(".json") && !n.endsWith(".rules.json"))
    .sort()
    .map((n) => join(CARDS_DIR, n));
}

function scoreSummary(candidate, cards, { dir } = {}) {
  const identity = readJson(identityPath(frozenDirFor(candidate, dir)));
  const rows = cards.map((p) => {
    const result = scoreCard(p);
    const name = p.slice(CARDS_DIR.length + 1).replace(/\.json$/, "");
    return {
      card: p.slice(ROOT.length + 1),
      rater: name.slice(candidate.length + 1),
      total: result.total,
      verdict: result.verdict,
      gateFails: result.gateFails,
      preset: result.preset,
      profile: result.profile,
      axes: result.rows.length,
    };
  });
  const totals = rows.map((r) => r.total);
  const mean = totals.reduce((s, t) => s + t, 0) / (totals.length || 1);
  const sd =
    totals.length > 1
      ? Math.sqrt(totals.reduce((s, t) => s + (t - mean) ** 2, 0) / (totals.length - 1))
      : null;
  const rel =
    cards.length > 1
      ? reliability(cards)
      : {
          alpha: null,
          note: "a single card: reliability needs at least two raters on the same immutable build",
        };
  return {
    candidate,
    identity: identity
      ? {
          commit: identity.git.commit,
          commitShort: identity.git.commitShort,
          dirty: identity.git.dirty,
          wasmSha256: identity.wasm.sha256,
          distManifestSha256: identity.dist.manifestSha256,
          files: identity.dist.files,
          identitySha256: identity.identitySha256,
          served: identity.served?.url ?? null,
          servedHashes: identity.served?.hashes ?? null,
        }
      : null,
    cards: rows,
    mean: Number(mean.toFixed(2)),
    sd: sd === null ? null : Number(sd.toFixed(2)),
    alpha: rel.alpha ?? null,
    interpretation: rel.interpretation ?? rel.note ?? null,
    disagreements: rel.disagreements ?? null,
  };
}

function cmdScore(opts) {
  const cards = cardPathsFor(opts.candidate, opts.cards);
  if (!cards.length) throw new Error(`no cards for ${opts.candidate} in eval/cards/`);
  const out = scoreSummary(opts.candidate, cards, opts);
  if (opts.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`fun-eval score — candidate ${opts.candidate}`);
  if (out.identity) {
    console.log(
      `  identity    commit ${out.identity.commitShort}${out.identity.dirty ? " (dirty)" : ""} · wasm ${out.identity.wasmSha256} · package ${out.identity.distManifestSha256} (${out.identity.files} files) · ${out.identity.identitySha256}`,
    );
    if (out.identity.served)
      console.log(`  served      ${out.identity.served} · ${out.identity.servedHashes}`);
  } else {
    console.log(
      `  identity    NOT ON RECORD — no frozen identity.json for ${opts.candidate}; the numbers below are the cards alone`,
    );
  }
  for (const r of out.cards)
    console.log(
      `  ${r.rater.padEnd(12)} ${String(r.total).padStart(6)}  ${r.verdict}${r.gateFails?.length ? ` (gates: ${r.gateFails.join(", ")})` : ""}  [${r.preset}]`,
    );
  console.log(
    `  mean ${out.mean}${out.sd === null ? "" : ` · sd ${out.sd}`}${out.alpha === null ? "" : ` · α ${out.alpha} (${out.interpretation})`}`,
  );
  console.log(
    "  computed from the cards alone by eval/score.sh + eval-fun fun-reliability.mjs; bot caps stay na until the coordinator applies them",
  );
}

// ---------------------------------------------------------------- calibrate

function discoverCohorts() {
  const builds = new Map();
  for (const name of existsSync(CARDS_DIR) ? readdirSync(CARDS_DIR).sort() : []) {
    if (!name.endsWith(".json") || name.endsWith(".rules.json")) continue;
    const build = name.split(".")[0];
    if (!builds.has(build)) builds.set(build, []);
    builds.get(build).push(join(CARDS_DIR, name));
  }
  return [...builds.entries()]
    .filter(([, cards]) => cards.length > 1)
    .map(([build, cards]) => ({ build, cards }));
}

function acceptanceFor(build) {
  const path = join(COHORTS_DIR, `${build}.acceptance.json`);
  const record = readJson(path);
  if (!record) return null;
  const score = record.score ?? {};
  return {
    path: path.slice(ROOT.length + 1),
    status: record.status ?? "",
    totals: Object.fromEntries(
      Object.entries(score)
        .filter(([, v]) => v && typeof v === "object" && "total" in v)
        .map(([k, v]) => [k, v.total]),
    ),
    mean: typeof score.mean === "number" ? score.mean : null,
    alpha: typeof score.alpha === "number" ? score.alpha : null,
  };
}

function cmdCalibrate(opts) {
  const cohorts = discoverCohorts();
  const rows = [];
  for (const { build, cards } of cohorts) {
    const out = scoreSummary(build, cards);
    const recorded = acceptanceFor(build);
    const diffs = [];
    if (recorded) {
      for (const [rater, total] of Object.entries(recorded.totals)) {
        const mine = out.cards.find((c) => c.rater === rater);
        if (!mine) diffs.push(`${rater}: not recomputed`);
        else if (Math.abs(mine.total - total) > 0.05)
          diffs.push(`${rater}: ${mine.total} vs ${total}`);
      }
      if (recorded.mean !== null && Math.abs(out.mean - recorded.mean) > 0.05)
        diffs.push(`mean: ${out.mean} vs ${recorded.mean}`);
      if (
        recorded.alpha !== null &&
        out.alpha !== null &&
        Math.abs(out.alpha - recorded.alpha) > 0.005
      )
        diffs.push(`α: ${out.alpha} vs ${recorded.alpha}`);
      if (Object.keys(recorded.totals).length === 0)
        diffs.push(`no locked total recorded (${recorded.status.slice(0, 60)})`);
    }
    rows.push({
      build,
      cards: out.cards,
      mean: out.mean,
      sd: out.sd,
      alpha: out.alpha,
      recorded,
      diffs,
      comparable: Boolean(recorded && Object.keys(recorded.totals).length),
    });
  }
  if (opts.json) {
    console.log(JSON.stringify({ candidateCount: rows.length, rows }, null, 2));
    return;
  }
  console.log(
    `fun-eval calibrate — ${rows.length} builds with at least two cards on record, re-scored by this harness`,
  );
  console.log(
    "  build      cards                 mean  sd    α       recorded (acceptance)         agreement",
  );
  for (const r of rows) {
    const cards = r.cards.map((c) => `${c.rater} ${c.total}`).join(" · ");
    const rec = r.recorded
      ? Object.entries(r.recorded.totals)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ") +
        (r.recorded.mean !== null ? ` · mean ${r.recorded.mean}` : "") +
        (r.recorded.alpha !== null ? ` · α ${r.recorded.alpha}` : "")
      : "—";
    const agree = !r.recorded
      ? "no acceptance record"
      : !r.comparable
        ? "not comparable (see below)"
        : r.diffs.length
          ? `DIFFERS: ${r.diffs.join("; ")}`
          : "match";
    console.log(
      `  ${r.build.padEnd(10)} ${cards.padEnd(21)} ${String(r.mean).padStart(5)} ${String(r.sd ?? "-").padStart(5)} ${String(r.alpha ?? "-").padStart(7)} ${rec.padEnd(29)} ${agree}`,
    );
  }
  console.log(
    "  re-scored with each card's own genre/presets via eval/score.sh; α from eval-fun fun-reliability.mjs over the common human axes",
  );
  console.log(
    "  builds with cards but no acceptance file are the pre-pivot series: their recorded means live in docs/PLATEAU.md prose",
  );
}

// ---------------------------------------------------------------- status

function cmdStatus(opts) {
  const candidate = opts.candidate;
  const frozen = frozenDirFor(candidate, opts.dir);
  const identity = readJson(identityPath(frozen));
  const server = readJson(join(frozen, "server.json"));
  const collected = readJson(join(frozen, "collected.json"), []);
  console.log(`fun-eval status — ${candidate} at ${frozen}`);
  if (!identity) {
    console.log("  not frozen");
    return;
  }
  printIdentity(identity);
  console.log(
    `  server      ${server ? `${server.url} (port ${server.port}, log ${server.log})` : "not running"}`,
  );
  const packets = existsSync(join(frozen, "packets"))
    ? readdirSync(join(frozen, "packets")).sort()
    : [];
  for (const r of packets) {
    const record = readJson(join(frozen, "packets", r, "PACKET.json"));
    const card = join(frozen, "packets", r, "card", `${candidate}.${r}.json`);
    console.log(
      `  packet ${r.padEnd(10)} seed ${record?.seed ?? "?"} port ${record?.driverPort ?? "?"} · card ${existsSync(card) ? "filed" : "not filed yet"}`,
    );
  }
  for (const entry of Array.isArray(collected) ? collected : [])
    console.log(`  collected   ${entry.rater} ${entry.date} total ${entry.total} ${entry.sha256}`);
}

// ---------------------------------------------------------------- cli

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      opts._.push(a);
      continue;
    }
    const [rawKey, inline] = a.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inline !== undefined) opts[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) opts[key] = argv[++i];
    else opts[key] = true;
  }
  return opts;
}

async function main() {
  const argv = process.argv.slice(2);
  const help = argv.includes("--help") || argv.includes("-h");
  const [cmd, ...rest] = help ? [] : argv;
  const opts = parse(rest);
  if (help || !cmd) {
    console.log(
      readFileSync(fileURLToPath(import.meta.url), "utf8")
        .split("\n")
        .slice(1, 22)
        .join("\n")
        .replace(/^\/\/ ?/gm, ""),
    );
    process.exit(help ? 0 : 2);
  }
  if (!opts.candidate && cmd !== "calibrate" && cmd !== "help") {
    console.error(
      `fun-eval ${cmd}: --candidate <name> is required (or --candidate auto for this checkout's short commit)`,
    );
    process.exit(2);
  }
  if (opts.candidate === "auto") {
    opts.candidate = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).stdout.trim();
    console.log(`fun-eval: candidate auto → ${opts.candidate}`);
  }
  switch (cmd) {
    case "freeze":
      await cmdFreeze(opts);
      break;
    case "serve":
      await cmdServe(opts);
      break;
    case "stop":
      cmdStop(opts);
      break;
    case "verify":
      await cmdVerify(opts);
      break;
    case "brief":
      await cmdBrief(opts);
      break;
    case "packet-check":
      cmdPacketCheck(opts);
      break;
    case "collect":
      cmdCollect(opts);
      break;
    case "score":
      cmdScore(opts);
      break;
    case "calibrate":
      cmdCalibrate(opts);
      break;
    case "status":
      cmdStatus(opts);
      break;
    default:
      console.error(
        `fun-eval: unknown command '${cmd}' (freeze · serve · stop · verify · brief · packet-check · collect · score · calibrate · status)`,
      );
      process.exit(2);
  }
}

export {
  APPENDIX_MARKER,
  EXCLUDED,
  PACKET_DOCS,
  briefProvenance,
  cardPathsFor,
  docText,
  frozenDirFor,
  manifestOf,
  packetCheck,
  parseManifest,
  renderBrief,
  scoreSummary,
  sha256,
  sha256File,
  walk,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
