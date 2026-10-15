// web/tests/run.mjs --failed / --resume: two trivial fake groups (one failing until "fixed"),
// identity invalidation through the identity wasm, and a hard kill mid-run. No browser.
//   node --test tools/client-resume.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plan } from "../web/tests/lib/run-state.mjs";

const dir = mkdtempSync(join(tmpdir(), "idlever-client-resume-"));
// Exercise the real Git identity without allowing ongoing development (or this test's
// own evidence files) to change it between successive runner invocations.
const repo = join(dir, "repo"),
  WEB = join(repo, "web");
mkdirSync(join(WEB, "tests/lib"), { recursive: true });
for (const file of [
  "run.mjs",
  "lib/failure-output.mjs",
  "lib/suites.mjs",
  "lib/ui-parts.mjs",
  "lib/run-state.mjs",
])
  copyFileSync(new URL(`../web/tests/${file}`, import.meta.url), join(WEB, "tests", file));
const source = join(repo, "source.txt");
writeFileSync(source, "source v1");
const fixtureGit = (...args) => {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
};
fixtureGit("init", "-q");
fixtureGit("add", ".");
fixtureGit(
  "-c",
  "user.name=Runner fixture",
  "-c",
  "user.email=runner@example.invalid",
  "commit",
  "-qm",
  "Fixture baseline",
);
const groups = join(dir, "groups"),
  stateDir = join(dir, "state"),
  wasm = join(dir, "engine.wasm"),
  ranLog = join(dir, "ran.log"),
  failFlag = join(dir, "fail.flag"),
  hangFlag = join(dir, "hang.flag");
spawnSync("mkdir", ["-p", groups]);
const group = (name, body) =>
  writeFileSync(
    join(groups, `${name}.mjs`),
    `import { appendFileSync, existsSync } from "node:fs";\nappendFileSync(${JSON.stringify(ranLog)}, "${name}\\n");\n${body}\n`,
  );
group("alpha", `console.log("alpha PASS");`);
group(
  "beta",
  `if (existsSync(${JSON.stringify(failFlag)})) { console.log("Error: beta broke at step 3"); process.exit(1); }\nconsole.log("beta PASS");`,
);
group(
  "hang",
  `if (existsSync(${JSON.stringify(hangFlag)})) await new Promise((r) => setTimeout(r, 600000));\nconsole.log("hang PASS");`,
);
writeFileSync(wasm, "engine v1");
const env = {
  ...process.env,
  IDLEVER_PORT: "1", // no dev server: the fake groups never open a page
  IDLEVER_CLIENT_TESTS_DIR: groups,
  IDLEVER_CLIENT_STATE_DIR: stateDir,
  IDLEVER_IDENTITY_WASM: wasm,
};
const ran = () => {
  const r = existsSync(ranLog)
    ? readFileSync(ranLog, "utf8").trim().split("\n").filter(Boolean)
    : [];
  rmSync(ranLog, { force: true });
  return r.sort();
};
const run = (...args) => {
  const r = spawnSync(process.execPath, ["tests/run.mjs", ...args], {
    cwd: WEB,
    env,
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr, ran: ran() };
};
const state = () => JSON.parse(readFileSync(join(stateDir, "last-targeted.json"), "utf8"));

test("plan: failed refuses without earlier state; resume runs everything", () => {
  const cur = { head: "h", dirty: false, dirtyHash: null, wasmSha256: "w" };
  assert.equal(plan({ mode: "failed", names: ["a"], prev: null, current: cur }).refused, true);
  assert.deepEqual(plan({ mode: "resume", names: ["a"], prev: null, current: cur }).run, ["a"]);
});

test("--failed and --resume rerun only what needs it, and identity changes invalidate", () => {
  writeFileSync(failFlag, "");
  let r = run("alpha", "beta");
  assert.equal(r.code, 1);
  assert.deepEqual(r.ran, ["alpha", "beta"]);
  let s = state();
  assert.equal(s.finished, true);
  assert.equal(s.results.alpha.ok, true);
  assert.equal(s.results.beta.ok, false);
  assert.match(s.results.beta.firstFailure, /beta broke at step 3/);
  assert.match(s.identity.wasmSha256, /^[0-9a-f]{64}$/);
  assert.match(s.identity.head, /^[0-9a-f]{40,64}$/);
  assert.equal(s.identity.dirty, false);

  r = run("alpha", "beta", "--failed");
  assert.equal(r.code, 1, r.out);
  assert.deepEqual(r.ran, ["beta"], "only the failure reruns");
  assert.match(r.out, /ok\* alpha +reused/);

  rmSync(failFlag); // the fix
  r = run("alpha", "beta", "--resume");
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.ran, ["beta"]);
  assert.match(r.out, /ran fresh 1 \(1 ok, 0 failed\); reused 1 earlier passes/);
  s = state();
  assert.equal(s.results.alpha.reused, true);
  assert.notEqual(s.results.beta.reused, true);

  r = run("alpha", "beta", "--resume");
  assert.equal(r.code, 0);
  assert.deepEqual(r.ran, [], "everything reused");
  assert.match(r.out, /ok: 2\/2 .*ran fresh 0 .*reused 2/);

  // Source edits invalidate passes independently of engine edits. Restore the
  // committed bytes afterward so the following checks isolate the WASM identity.
  writeFileSync(source, "source v2");
  r = run("alpha", "beta", "--failed");
  assert.equal(r.code, 2, r.out);
  assert.deepEqual(r.ran, []);
  assert.match(r.out, /REFUSED: identity changed since the last run \(dirty, dirtyHash\)/);
  writeFileSync(source, "source v1");

  // a different engine: no pass is reused and --failed refuses
  writeFileSync(wasm, "engine v2");
  writeFileSync(failFlag, "");
  r = run("alpha", "beta", "--failed");
  assert.equal(r.code, 2, r.out);
  assert.deepEqual(r.ran, []);
  assert.match(r.out, /REFUSED: identity changed since the last run \(wasmSha256\)/);
  r = run("alpha", "beta", "--resume");
  assert.equal(r.code, 1);
  assert.deepEqual(r.ran, ["alpha", "beta"], "nothing reused across identities");
  assert.match(r.out, /WARNING: identity changed \(wasmSha256\); no pass reused/);

  // forced --failed after another engine change: only the failure, passes stale and unrecorded
  writeFileSync(wasm, "engine v3");
  r = run("alpha", "beta", "--failed", "--force");
  assert.equal(r.code, 1);
  assert.deepEqual(r.ran, ["beta"]);
  assert.match(r.out, /1 earlier passes were under another identity: not reused, not evidence/);
  assert.equal(state().results.alpha, undefined);
});

test("a hard kill mid-run leaves a valid state; --failed runs only the unfinished", async () => {
  rmSync(failFlag, { force: true });
  rmSync(join(stateDir, "last-targeted.json"), { force: true });
  ran();
  writeFileSync(hangFlag, "");
  const child = spawn(process.execPath, ["tests/run.mjs", "alpha", "hang"], {
    cwd: WEB,
    env: { ...env, TEST_JOBS: "1" },
    stdio: "ignore",
    detached: true,
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      if (state().results.alpha?.ok && readFileSync(ranLog, "utf8").includes("hang\n")) break;
    } catch {
      // not written yet
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  process.kill(-child.pid, "SIGKILL"); // the runner and its groups, no handler runs
  await new Promise((r) => child.on("exit", r));
  const s = state();
  assert.equal(s.finished, false);
  assert.equal(s.results.alpha.ok, true);
  assert.equal(s.results.hang, undefined);
  ran();
  rmSync(hangFlag);
  const r = run("alpha", "hang", "--failed");
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.ran, ["hang"]);
  rmSync(dir, { recursive: true, force: true });
});
