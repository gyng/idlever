#!/usr/bin/env node
// One command after a core change: rebuild the WASM, pin it in a new gold-settlements manifest, switch the default.
//
//   node tools/repin.mjs --dir docs/evidence/cut231 --note "Cut231: …" [--settle [--regen]] [--no-build] [--ship]
//   node tools/repin.mjs --check            hash the current pkg against the default manifest; change nothing
//
// Steps (docs/ITERATION_SPEED.md "Repin, pacing pack, sweep"):
//   1. tools/wasm.sh (fast; `--ship` packages the release build instead; `--no-build` uses the pkg as it is).
//   2. bytes + sha256 of web/src/engine/pkg/idlever_wasm_bg.wasm.
//   3. The default manifest is the literal after `IDLEVER_GOLD_SETTLEMENT_INPUTS ??` in web/tests/gold-settlements.mjs.
//      Same hash as its `wasm` → nothing to pin (no-op; `--force` writes a manifest anyway).
//   4. Otherwise copy it to <dir>/settlements-inputs-<sha 4>.json with `wasm` updated, `repinnedFrom` = the old
//      manifest and `note_<key>` = --note (key: --note-key, else the dir's basename), and make it the default.
//   5. `--settle` replays the immutable pre-exit saves natively exactly as Cut227/Cut230 did
//      (`cargo run --profile fast --example gold_settlement_repin -- IN OUT`; it asserts the original Gold, ledger
//      and ExitLine and exports the current after-saves). It reports Gold/ledger/exit unchanged (or the assertion),
//      whether each entry's `expected` is unchanged, and which after-saves differ (with the differing JSON paths).
//      `--regen` writes the differing after-saves to <dir>/settlements/<id>.after.session.json.gz and updates
//      `afterHome`, `afterRawSha256`, `afterHomeSha256` (and `expected` when it changed) in the new manifest.
//   Settling alone never changes a manifest; a WASM-unchanged run with --settle still reports.
// The browser proof stays `cd web && node tests/run.mjs gold-settlements` (564 checks); this tool does not run it.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const known = new Set([
  "--dir",
  "--note",
  "--note-key",
  "--settle",
  "--regen",
  "--no-build",
  "--ship",
  "--force",
  "--check",
  "--help",
]);
for (let i = 0; i < argv.length; i++) {
  if (!known.has(argv[i])) {
    console.error(`repin: unknown argument ${argv[i]}`);
    process.exit(2);
  }
  if (["--dir", "--note", "--note-key"].includes(argv[i])) i++;
}
if (flag("--help")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\nimport ")[0]);
  process.exit(0);
}
const check = flag("--check");
const settle = flag("--settle");
const regen = flag("--regen");
if (regen && !settle) {
  console.error("repin: --regen needs --settle");
  process.exit(2);
}
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rel = (p) => (p.startsWith(root) ? p.slice(root.length + 1) : p);
const run = (cmd, args, extra = {}) => {
  const started = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...extra });
  return { status: r.status, secs: (Date.now() - started) / 1000, ...r };
};

// 1. build
let buildSecs = 0;
if (!check && !flag("--no-build")) {
  const r = run("bash", ["tools/wasm.sh", ...(flag("--ship") ? ["--ship"] : [])]);
  buildSecs = r.secs;
  if (r.status !== 0) {
    console.error(`repin: tools/wasm.sh failed (exit ${r.status})`);
    process.exit(1);
  }
}
// 2. hash
const wasmPath = join(root, "web/src/engine/pkg/idlever_wasm_bg.wasm");
if (!existsSync(wasmPath)) {
  console.error("repin: no web/src/engine/pkg/idlever_wasm_bg.wasm (run without --no-build)");
  process.exit(1);
}
const wasmBytes = readFileSync(wasmPath);
const wasm = { bytes: wasmBytes.length, sha256: sha(wasmBytes) };
// 3. the default manifest
const testPath = join(root, "web/tests/gold-settlements.mjs");
const testSrc = readFileSync(testPath, "utf8");
const literal = /IDLEVER_GOLD_SETTLEMENT_INPUTS \?\?\s*"([^"]+)"/.exec(testSrc);
if (!literal) {
  console.error(
    "repin: cannot find the default manifest literal in web/tests/gold-settlements.mjs",
  );
  process.exit(1);
}
const oldPath = literal[1];
const oldManifest = JSON.parse(readFileSync(join(root, oldPath), "utf8"));
const same = isDeepStrictEqual(oldManifest.wasm, wasm);
const summary = [
  `wasm ${wasm.bytes} bytes sha256 ${wasm.sha256}${buildSecs ? ` (built in ${buildSecs.toFixed(1)}s)` : ""}`,
  `default manifest ${oldPath} pins ${oldManifest.wasm.sha256.slice(0, 12)}… → ${same ? "UNCHANGED" : "CHANGED"}`,
];
if (check) {
  console.log(summary.join("\n"));
  process.exit(same ? 0 : 1);
}

// 4. new manifest
let manifest = oldManifest;
let newPath = null;
if (!same || flag("--force")) {
  const dir = opt("--dir");
  const note = opt("--note");
  if (!dir || !note) {
    console.error(
      `${summary.join("\n")}\nrepin: the WASM changed; pass --dir docs/evidence/<cut> and --note "<what changed>"`,
    );
    process.exit(2);
  }
  const key = `note_${(opt("--note-key") ?? basename(dir)).replace(/[^A-Za-z0-9_]+/g, "_")}`;
  newPath = join(dir, `settlements-inputs-${wasm.sha256.slice(0, 4)}.json`);
  if (resolve(root, newPath) === resolve(root, oldPath)) {
    console.error(`repin: ${newPath} is the current default; choose another --dir`);
    process.exit(2);
  }
  manifest = structuredClone(oldManifest);
  manifest.wasm = wasm;
  manifest.repinnedFrom = oldPath;
  manifest[key] = note;
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, newPath), JSON.stringify(manifest, null, 2) + "\n");
  const oldShort = `${basename(dirname(oldPath))} ${oldManifest.wasm.sha256.slice(0, 4)}`;
  let next = testSrc.replace(literal[0], literal[0].replace(oldPath, newPath));
  next = next.replace(/Earlier manifests stay as history: /, (m) => `${m}${oldShort}, `);
  writeFileSync(testPath, next);
  summary.push(
    `new manifest ${newPath} (repinnedFrom ${oldPath}; ${key}); default switched (edit its "Current package:" comment by hand)`,
  );
} else summary.push("no new manifest: the default already pins this WASM (--force to write one)");

// 5. settle
let settleOk = true;
if (settle) {
  const tmp = mkdtempSync(join(os.tmpdir(), "idlever-repin-"));
  const input = join(tmp, "in");
  const output = join(tmp, "out");
  mkdirSync(input);
  for (const entry of manifest.entries) {
    const compressed = readFileSync(join(root, entry.home));
    const raw = gunzipSync(compressed);
    if (sha(compressed) !== entry.homeSha256 || sha(raw) !== entry.homeRawSha256) {
      console.error(`repin: ${entry.home} does not match its manifest hashes`);
      process.exit(1);
    }
    writeFileSync(join(input, `${entry.id}.session.json`), raw);
  }
  console.error("repin: native gold_settlement_repin (cargo --profile fast) …");
  const r = run(
    "cargo",
    [
      "run",
      "-q",
      "--profile",
      "fast",
      "-p",
      "idlever-core",
      "--example",
      "gold_settlement_repin",
      "--",
      input,
      output,
    ],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const passed = (r.stdout ?? "").split("\n").filter((l) => l.startsWith("PASS "));
  if (r.status !== 0) {
    settleOk = false;
    summary.push(
      `settle: gold_settlement_repin FAILED (exit ${r.status}) after ${passed.length}/${manifest.entries.length} entries — Gold, ledger or ExitLine changed:\n${(r.stderr ?? "").trim().split("\n").slice(-12).join("\n")}`,
    );
  } else {
    summary.push(
      `settle: Gold, ledger, ExitLine unchanged on ${passed.length}/${manifest.entries.length} entries (${r.secs.toFixed(1)}s)`,
    );
    const paths = (a, b, p = "$", out = []) => {
      if (isDeepStrictEqual(a, b)) return out;
      if (a && b && typeof a === "object" && typeof b === "object")
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
          paths(a[k], b[k], `${p}.${k}`, out);
      else out.push(p);
      return out;
    };
    let regenerated = 0;
    for (const entry of manifest.entries) {
      const after = readFileSync(join(output, `${entry.id}.after.session.json`));
      const expected = JSON.parse(readFileSync(join(output, `${entry.id}.expected.json`), "utf8"));
      const expectedDiff = paths(expected, entry.expected);
      const afterSame = sha(after) === entry.afterRawSha256;
      let line = `  ${entry.id}: expected ${expectedDiff.length ? `DIFFERS (${expectedDiff.slice(0, 6).join(", ")}${expectedDiff.length > 6 ? ", …" : ""})` : "unchanged"}; after-save ${afterSame ? "unchanged" : "DIFFERS"}`;
      if (!afterSame) {
        const old = JSON.parse(gunzipSync(readFileSync(join(root, entry.afterHome))).toString());
        const diff = paths(JSON.parse(after.toString()), old).map((p) =>
          p.replace(/\.\d+(?=\.|$)/g, "[]"),
        );
        const uniq = [...new Set(diff)];
        line += ` in ${uniq.length} path kinds: ${uniq.slice(0, 8).join(", ")}${uniq.length > 8 ? ", …" : ""}`;
      }
      if (regen && newPath && (!afterSame || expectedDiff.length)) {
        if (!afterSame) {
          const gz = gzipSync(after, { level: 9 });
          const home = join(dirname(newPath), "settlements", `${entry.id}.after.session.json.gz`);
          mkdirSync(join(root, dirname(home)), { recursive: true });
          writeFileSync(join(root, home), gz);
          entry.afterHome = home;
          entry.afterRawSha256 = sha(after);
          entry.afterHomeSha256 = sha(gz);
        }
        if (expectedDiff.length) entry.expected = expected;
        regenerated++;
        line += " → regenerated";
      }
      summary.push(line);
    }
    if (regen && newPath) {
      writeFileSync(join(root, newPath), JSON.stringify(manifest, null, 2) + "\n");
      summary.push(`  ${regenerated} entries regenerated into ${newPath}`);
    } else if (regen)
      summary.push(
        "  (--regen with an unchanged WASM writes nothing; --force makes a new manifest)",
      );
    else summary.push("  (report only; --regen writes the differing after-saves)");
  }
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`repin:\n${summary.map((s) => `  ${s}`).join("\n")}`);
if (newPath)
  console.log(
    `next: cd web && node tests/run.mjs gold-settlements   # browser proof against ${rel(resolve(root, newPath))}`,
  );
process.exit(settleOk ? 0 : 1);
