// Client runner state (owner request 2026-10-14: cheap failure recovery). Every group's result is
// written, atomically after each group, to target/client-tests/last-<suite>.json with the source
// and engine identity it ran under. `--failed` reruns what failed or never finished; `--resume`
// reruns everything except identical-identity passes. Reused passes are labelled, never fresh.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  lstatSync,
  readlinkSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const STATE_DIR = process.env.IDLEVER_CLIENT_STATE_DIR ?? join(ROOT, "target/client-tests");
export const WASM =
  process.env.IDLEVER_IDENTITY_WASM ?? join(ROOT, "web/src/engine/pkg/idlever_wasm_bg.wasm");
export const statePath = (suite, dir = STATE_DIR) => join(dir, `last-${suite}.json`);

const sha = (b) => createHash("sha256").update(b).digest("hex");
const FORMAT = "idlever-client-identity-v2";
const fingerprint = (s) => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].join(":");
const git = (root, args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "buffer", maxBuffer: 1 << 30 });
  } catch (cause) {
    throw new Error(`Cannot determine client identity: git ${args[0]} failed`, { cause });
  }
};

function readCache(path, root) {
  try {
    const c = JSON.parse(readFileSync(path, "utf8"));
    if (
      c.version === 1 &&
      c.root === root &&
      c.entries &&
      c.checksum === sha(JSON.stringify(c.entries))
    )
      return c.entries;
  } catch {
    /* An optional cache never replaces missing content evidence. */
  }
  return {};
}

/** Full content, bounded memory, and no reuse across a replacement or concurrent edit. */
function contentDigest(path, stats, cached, next, name) {
  const before = statSync(path, { bigint: true });
  if (!before.isFile()) {
    const link = lstatSync(path, { bigint: true });
    if (!before.isDirectory() || !link.isSymbolicLink())
      throw Error(`Cannot determine client identity: not a regular file: ${path}`);
    // Git lists the directory link itself, not its dependency tree. The old reader
    // swallowed EISDIR here; record the link text instead of omitting its identity.
    const key = `directory-link:${fingerprint(link)}`;
    const cachedLink = Object.hasOwn(cached, name) ? cached[name] : null;
    if (cachedLink?.key === key && /^[a-f0-9]{64}$/.test(cachedLink.digest)) {
      stats.cacheHits++;
      next[name] = cachedLink;
      return cachedLink.digest;
    }
    const text = readlinkSync(path);
    if (fingerprint(lstatSync(path, { bigint: true })) !== fingerprint(link))
      throw Error(`Identity source changed: ${path}`);
    const digest = sha(`directory-link:${text}`);
    stats.filesRead++;
    stats.contentBytesRead += Buffer.byteLength(text);
    next[name] = { key, digest };
    return digest;
  }
  const key = fingerprint(before);
  const entry = Object.hasOwn(cached, name) ? cached[name] : null;
  if (entry?.key === key && /^[a-f0-9]{64}$/.test(entry.digest)) {
    stats.cacheHits++;
    next[name] = entry;
    return entry.digest;
  }
  const fd = openSync(path, "r");
  try {
    if (fingerprint(fstatSync(fd, { bigint: true })) !== key)
      throw Error(`Identity source changed: ${path}`);
    const h = createHash("sha256");
    const buffer = Buffer.allocUnsafe(Math.max(1, Math.min(Number(before.size), 1 << 20)));
    let n;
    while ((n = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      h.update(buffer.subarray(0, n));
      stats.contentBytesRead += n;
    }
    if (
      fingerprint(fstatSync(fd, { bigint: true })) !== key ||
      fingerprint(statSync(path, { bigint: true })) !== key
    )
      throw Error(`Identity source changed: ${path}`);
    const digest = h.digest("hex");
    stats.filesRead++;
    next[name] = { key, digest };
    return digest;
  } finally {
    closeSync(fd);
  }
}

function publishCache(path, root, entries) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      temp,
      JSON.stringify({ version: 1, root, entries, checksum: sha(JSON.stringify(entries)) }),
      { flag: "wx" },
    );
    renameSync(temp, path);
  } catch {
    /* Cache I/O cannot invalidate an otherwise complete content identity. */
  } finally {
    try {
      rmSync(temp, { force: true });
    } catch {
      /* An unwritable cache may also forbid cleanup. */
    }
  }
}

/** All tracked changes, every untracked content byte, and fresh WASM content.
 * Cache hits rely on normal filesystem ctime/mtime behavior, not a security boundary.
 * root/cachePath/stats allow disposable-repository regressions and measured diagnostics. */
export function identity(wasm = WASM, options = {}) {
  const root = resolve(options.root ?? ROOT);
  const cachePath = resolve(
    options.cachePath ?? join(root, "target/client-tests/identity-cache-v1.json"),
  );
  const stats = options.stats ?? {};
  Object.assign(stats, {
    cacheHits: 0,
    filesRead: 0,
    contentBytesRead: 0,
    untrackedFiles: 0,
    wasmBytesRead: 0,
  });
  const head = git(root, ["rev-parse", "HEAD"]).toString().trim();
  const status = git(root, ["status", "--porcelain", "--untracked-files=all"]).toString();
  const rel = relative(root, cachePath);
  let cacheAllowed =
    rel === ".." ||
    rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(rel);
  if (!cacheAllowed) {
    try {
      execFileSync("git", ["check-ignore", "-q", "--", rel], { cwd: root, stdio: "ignore" });
      cacheAllowed = true;
    } catch {
      /* A source-visible cache would change the identity itself: do not write it. */
    }
  }
  const cached = cacheAllowed ? readCache(cachePath, root) : {};
  const next = Object.create(null);
  let dirtyHash = null;
  if (status.trim()) {
    const h = createHash("sha256");
    h.update(FORMAT);
    h.update(git(root, ["diff", "HEAD", "--binary", "--no-ext-diff", "--no-textconv"]));
    const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"])
      .toString()
      .split("\0")
      .filter(Boolean)
      .sort();
    stats.untrackedFiles = untracked.length;
    for (const f of untracked) {
      h.update(`\0${f}\0`);
      h.update(contentDigest(join(root, f), stats, cached, next, f));
    }
    dirtyHash = h.digest("hex");
  }
  let wasmSha256 = null;
  const wasmStats = { cacheHits: 0, filesRead: 0, contentBytesRead: 0 };
  try {
    wasmSha256 = contentDigest(wasm, wasmStats, {}, {}, "wasm");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    // Missing built engine remains explicit, and differs from every present engine.
  }
  stats.wasmBytesRead = wasmStats.contentBytesRead;
  if (cacheAllowed) publishCache(cachePath, root, next);
  return { format: FORMAT, head, dirty: !!status.trim(), dirtyHash, wasmSha256 };
}

export const sameIdentity = (a, b) =>
  !!a &&
  !!b &&
  a.format === b.format &&
  a.head === b.head &&
  a.dirty === b.dirty &&
  a.dirtyHash === b.dirtyHash &&
  a.wasmSha256 === b.wasmSha256;

export const describeIdentity = (i) =>
  `${i.head.slice(0, 10)}${i.dirty ? `+dirty:${(i.dirtyHash ?? "").slice(0, 8)}` : ""} wasm:${(i.wasmSha256 ?? "none").slice(0, 12)}`;

export function identityDiff(a, b) {
  return ["format", "head", "dirty", "dirtyHash", "wasmSha256"].filter((k) => a?.[k] !== b?.[k]);
}

export function loadState(suite, dir = STATE_DIR) {
  const p = statePath(suite, dir);
  if (!existsSync(p)) return null;
  try {
    const s = JSON.parse(readFileSync(p, "utf8"));
    return s && s.format === "idlever-client-run" && s.results ? s : null;
  } catch {
    return null;
  }
}

/** temp + rename: a crash or kill at any point leaves the previous complete file or the new one. */
export function writeState(state, dir = STATE_DIR) {
  mkdirSync(dir, { recursive: true });
  const p = statePath(state.suite, dir),
    tmp = `${p}.${process.pid}.tmp`;
  state.updatedAt = new Date().toISOString();
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, p);
}

/** Which selected names run and which earlier passes are carried, for a mode
 *  ("all" | "resume" | "failed"). Returns { run, reused, refused, reason, stale }. */
export function plan({ mode, names, prev, current, force = false }) {
  if (mode === "all") return { run: [...names], reused: [] };
  if (!prev)
    return mode === "failed"
      ? { run: [], reused: [], refused: true, reason: "no earlier state for this suite" }
      : { run: [...names], reused: [], reason: "no earlier state for this suite; running all" };
  const same = sameIdentity(prev.identity, current);
  const passed = (n) =>
    prev.results[n]?.ok === true && sameIdentity(prev.results[n].identity, current);
  if (mode === "resume") {
    if (!same)
      return {
        run: [...names],
        reused: [],
        stale: true,
        reason: `identity changed (${identityDiff(prev.identity, current).join(", ")}); no pass reused`,
      };
    const reused = names.filter(passed);
    return { run: names.filter((n) => !reused.includes(n)), reused };
  }
  // failed: what failed or never finished in the last run of this suite
  const unfinished = (n) => prev.results[n]?.ok !== true;
  const run = names.filter(unfinished);
  if (!same) {
    const why = `identity changed since the last run (${identityDiff(prev.identity, current).join(", ")})`;
    if (!force)
      return {
        run: [],
        reused: [],
        refused: true,
        reason: `${why}; pass --force to rerun the failed groups anyway`,
      };
    // forced: rerun the failures; earlier passes are stale and never counted as current evidence
    return {
      run,
      reused: [],
      stale: true,
      staleNames: names.filter((n) => !unfinished(n)),
      reason: why,
    };
  }
  return { run, reused: names.filter(passed) };
}

/** The first actionable line of a failure for the state file. */
export function firstFailure(out, failureOutput) {
  const lines = failureOutput(out);
  return (lines[0] ?? out.trim().split("\n").at(-1) ?? "").trim().slice(0, 300);
}
