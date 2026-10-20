import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = readFileSync(
  process.env.IDLEVER_WASM_SCRIPT ?? new URL("./wasm.sh", import.meta.url),
  "utf8",
);
// Exercise the real shell wrapper in isolation. Stub only external build tools;
// distinguish a freshly compiled artifact from the stale default-directory input.
function runCase({ target, config, failure } = {}) {
  const root = mkdtempSync(join(tmpdir(), "idlever-wasm-target-"));
  try {
    for (const dir of ["tools", "bin", "web/src/engine/pkg", "target/wasm32-unknown-unknown/fast"])
      mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, "tools/wasm.sh"), script);
    writeFileSync(join(root, "Cargo.lock"), 'name = "wasm-bindgen"\nversion = "999.0.0-fixture"\n');
    writeFileSync(join(root, "target/wasm32-unknown-unknown/fast/idlever_wasm.wasm"), "STALE");
    const pkg = join(root, "web/src/engine/pkg/idlever_wasm_bg.wasm");
    writeFileSync(pkg, "UNCHANGED");
    if (config) {
      mkdirSync(join(root, ".cargo"));
      writeFileSync(
        join(root, ".cargo/config.toml"),
        `[build]\ntarget-dir = ${JSON.stringify(config)}\n`,
      );
    }
    writeFileSync(
      join(root, "bin/cargo"),
      `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync('calls.jsonl', JSON.stringify({tool:'cargo', args, debug:process.env.CARGO_PROFILE_FAST_DEBUG})+'\\n');
let configured;
if (fs.existsSync('.cargo/config.toml')) configured = JSON.parse(fs.readFileSync('.cargo/config.toml','utf8').match(/target-dir = (.+)/)[1]);
const target = path.resolve(process.env.CARGO_TARGET_DIR || configured || 'target');
if (args[0] === 'build') {
  if (process.env.IDLEVER_WASM_TEST_FAILURE === 'build') process.exit(7);
  const artifact = path.join(target,'wasm32-unknown-unknown/fast/idlever_wasm.wasm');
  fs.mkdirSync(path.dirname(artifact),{recursive:true}); fs.writeFileSync(artifact,'CURRENT');
} else if (args[0] === 'metadata') {
  if (process.env.IDLEVER_WASM_TEST_FAILURE === 'metadata') process.exit(8);
  console.log(JSON.stringify({target_directory:target}));
} else process.exit(9);
`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(root, "bin/wasm-bindgen"),
      `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === '--version') { console.log('wasm-bindgen 999.0.0-fixture'); process.exit(0); }
fs.appendFileSync('calls.jsonl',JSON.stringify({tool:'bindgen',args})+'\\n');
fs.copyFileSync(args.at(-1),path.join(args[args.indexOf('--out-dir')+1],'idlever_wasm_bg.wasm'));
`,
      { mode: 0o755 },
    );
    const env = { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}` };
    delete env.CARGO_TARGET_DIR;
    delete env.IDLEVER_WASM_TEST_FAILURE;
    if (target)
      env.CARGO_TARGET_DIR = target === "absolute" ? join(root, "absolute target space") : target;
    if (failure) env.IDLEVER_WASM_TEST_FAILURE = failure;
    const result = spawnSync("bash", ["tools/wasm.sh"], { cwd: root, env, encoding: "utf8" });
    assert.ifError(result.error);
    const calls = readFileSync(join(root, "calls.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    if (failure) {
      assert.notEqual(result.status, 0, "failed build/metadata must stop packaging");
      assert.equal(readFileSync(pkg, "utf8"), "UNCHANGED");
      assert.equal(calls.filter((c) => c.tool === "bindgen").length, 0);
    } else {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        readFileSync(pkg, "utf8"),
        "CURRENT",
        "package the fresh artifact, never the stale default",
      );
      const build = calls.find((c) => c.tool === "cargo" && c.args[0] === "build");
      assert.equal(build.debug, "0");
      assert.ok(build.args.includes("fast"));
      const packaged = calls.find((c) => c.tool === "bindgen").args.at(-1);
      assert.ok(packaged.endsWith("wasm32-unknown-unknown/fast/idlever_wasm.wasm"));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("fast WASM packages the default Cargo target", () => runCase());
test("fast WASM packages a relative environment target", () =>
  runCase({ target: "custom target" }));
test("fast WASM packages an absolute environment target with spaces", () =>
  runCase({ target: "absolute" }));
test("fast WASM respects Cargo-configured target directories", () =>
  runCase({ config: "configured target" }));
test("Cargo environment target overrides Cargo configuration", () =>
  runCase({ target: "environment target", config: "configured target" }));
test("failed Cargo metadata preserves the old package", () =>
  runCase({ target: "elsewhere", failure: "metadata" }));
test("failed Cargo build preserves the old package", () =>
  runCase({ target: "elsewhere", failure: "build" }));
