// Client runner state (owner request 2026-10-14: cheap failure recovery). Every group's result is
// written, atomically after each group, to target/client-tests/last-<suite>.json with the source
// and engine identity it ran under. `--failed` reruns what failed or never finished; `--resume`
// reruns everything except identical-identity passes. Reused passes are labelled, never fresh.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const STATE_DIR = process.env.IDLEVER_CLIENT_STATE_DIR ?? join(ROOT, "target/client-tests");
export const WASM =
  process.env.IDLEVER_IDENTITY_WASM ?? join(ROOT, "web/src/engine/pkg/idlever_wasm_bg.wasm");
export const statePath = (suite, dir = STATE_DIR) => join(dir, `last-${suite}.json`);

const git = (args) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "buffer", maxBuffer: 1 << 30 });
  } catch {
    return null;
  }
};
const sha = (b) => createHash("sha256").update(b).digest("hex");

/** HEAD, the dirty flag, a hash of the uncommitted changes (tracked diff and untracked files)
 *  and the served wasm's sha256. Any field changing invalidates earlier results. */
export function identity(wasm = WASM) {
  const head = git(["rev-parse", "HEAD"])?.toString().trim() ?? "unknown";
  const status = git(["status", "--porcelain", "--untracked-files=all"])?.toString() ?? "";
  let dirtyHash = null;
  if (status.trim()) {
    const h = createHash("sha256");
    h.update(git(["diff", "HEAD", "--binary"]) ?? "");
    const untracked = (git(["ls-files", "--others", "--exclude-standard", "-z"])?.toString() ?? "")
      .split("\0")
      .filter(Boolean)
      .sort();
    for (const f of untracked) {
      h.update(`\0${f}\0`);
      try {
        const p = join(ROOT, f);
        h.update(statSync(p).size < 32 << 20 ? readFileSync(p) : `size:${statSync(p).size}`);
      } catch {
        h.update("unreadable");
      }
    }
    dirtyHash = h.digest("hex");
  }
  let wasmSha256 = null;
  try {
    wasmSha256 = sha(readFileSync(wasm));
  } catch {
    // no built engine: recorded as null, and still compared
  }
  return { head, dirty: !!status.trim(), dirtyHash, wasmSha256 };
}

export const sameIdentity = (a, b) =>
  !!a &&
  !!b &&
  a.head === b.head &&
  a.dirty === b.dirty &&
  a.dirtyHash === b.dirtyHash &&
  a.wasmSha256 === b.wasmSha256;

export const describeIdentity = (i) =>
  `${i.head.slice(0, 10)}${i.dirty ? `+dirty:${(i.dirtyHash ?? "").slice(0, 8)}` : ""} wasm:${(i.wasmSha256 ?? "none").slice(0, 12)}`;

export function identityDiff(a, b) {
  return ["head", "dirty", "dirtyHash", "wasmSha256"].filter((k) => a?.[k] !== b?.[k]);
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
