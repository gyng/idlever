// Disposable Git repositories; no browser or shared checkout changes.
import { test } from "node:test";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { identity, sameIdentity, plan } from "../web/tests/lib/run-state.mjs";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "idlever-identity-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, "repo");
  mkdirSync(root);
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  writeFileSync(join(root, ".gitignore"), "/target/\n/ignored/\n");
  writeFileSync(join(root, "tracked"), "tracked");
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-qm",
    "baseline",
  );
  const wasm = join(dir, "engine.wasm");
  writeFileSync(wasm, "engine");
  const cache = join(root, "target/client-tests/identity-cache-v1.json");
  return {
    root,
    dir,
    git,
    wasm,
    cache,
    id: (stats = {}, options = {}) => identity(wasm, { root, stats, ...options }),
  };
}
test("unchanged cold/warm identity is equal; warm reads no untracked content", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, "new"), "source");
  const a = {},
    b = {};
  const first = f.id(a),
    warm = f.id(b);
  assert.deepEqual(warm, first);
  assert.equal(a.filesRead, 1);
  assert.equal(b.filesRead, 0);
  assert.equal(b.contentBytesRead, 0);
  assert.equal(b.cacheHits, 1);
  assert.equal(
    sameIdentity({ ...first, format: undefined }, first),
    false,
    "legacy format cannot reuse v2 passes",
  );
});
test("same-size small and large edits with restored mtime invalidate cached identity", (t) => {
  const f = fixture(t);
  for (const n of [9, 33 << 20]) {
    const p = join(f.root, "source"),
      bytes = Buffer.alloc(n, 1);
    writeFileSync(p, bytes);
    const old = f.id();
    const before = statSync(p);
    bytes[n - 1] = 2;
    writeFileSync(p, bytes);
    utimesSync(p, before.atime, before.mtime);
    const stats = {},
      changed = f.id(stats);
    assert.notEqual(changed.dirtyHash, old.dirtyHash);
    assert.equal(stats.filesRead, 1);
    assert.equal(stats.contentBytesRead, n);
    const prev = { identity: old, results: { a: { ok: true, identity: old } } };
    assert.equal(plan({ mode: "failed", names: ["a"], prev, current: changed }).refused, true);
    assert.deepEqual(plan({ mode: "resume", names: ["a"], prev, current: changed }).run, ["a"]);
  }
});
test("rename/add/delete, tracked edits, HEAD and WASM changes invalidate", (t) => {
  const f = fixture(t);
  const base = f.id();
  writeFileSync(join(f.root, "a"), "a");
  const added = f.id();
  assert.notDeepEqual(added, base);
  renameSync(join(f.root, "a"), join(f.root, "b"));
  const moved = f.id();
  assert.notEqual(moved.dirtyHash, added.dirtyHash);
  rmSync(join(f.root, "b"));
  assert.deepEqual(f.id(), base);
  writeFileSync(join(f.root, "tracked"), "new");
  const tracked = f.id();
  assert.notDeepEqual(tracked, base);
  f.git("add", "tracked");
  f.git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-qm",
    "changed",
  );
  assert.notEqual(f.id().head, base.head);
  const before = f.id();
  writeFileSync(f.wasm, "engin2");
  assert.notEqual(f.id().wasmSha256, before.wasmSha256);
  rmSync(f.wasm);
  assert.equal(f.id().wasmSha256, null);
});
test("symlink target content is followed and ignored content stays outside identity", (t) => {
  const f = fixture(t);
  const target = join(f.dir, "target");
  writeFileSync(target, "one");
  symlinkSync(target, join(f.root, "link"));
  const a = f.id();
  writeFileSync(target, "two");
  const b = f.id();
  assert.notEqual(a.dirtyHash, b.dirtyHash);
  mkdirSync(join(f.root, "ignored"));
  writeFileSync(join(f.root, "ignored/item"), "ignored");
  assert.deepEqual(f.id(), b);
  rmSync(target);
  assert.throws(() => f.id(), /ENOENT/);
});
test("directory symlinks hash link text without traversing dependency trees", (t) => {
  const f = fixture(t);
  const a = join(f.dir, "deps-a"),
    b = join(f.dir, "deps-b");
  mkdirSync(a);
  mkdirSync(b);
  const link = join(f.root, "deps");
  symlinkSync(a, link);
  const first = f.id();
  writeFileSync(join(a, "ignored-tree"), "not Git-listed source");
  assert.deepEqual(f.id(), first);
  const stats = {};
  f.id(stats);
  assert.equal(stats.contentBytesRead, 0);
  assert.equal(stats.cacheHits, 1);
  rmSync(link);
  symlinkSync(b, link);
  assert.notEqual(f.id().dirtyHash, first.dirtyHash);
});

test("missing/corrupt/checksum-tampered/unwritable cache falls back to full content", (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, "source"), "source");
  const baseline = f.id();
  for (const bad of [
    null,
    "{",
    JSON.stringify({
      version: 1,
      root: f.root,
      entries: { source: { key: "bad", digest: "0".repeat(64) } },
      checksum: "invalid",
    }),
  ]) {
    if (bad === null) rmSync(f.cache);
    else writeFileSync(f.cache, bad);
    const stats = {};
    assert.deepEqual(f.id(stats), baseline);
    assert.equal(stats.filesRead, 1);
  }
  const blocker = join(f.root, "target/block");
  writeFileSync(blocker, "not a directory");
  assert.deepEqual(f.id({}, { cachePath: join(blocker, "cache") }), baseline);
  const visible = join(f.root, "visible-cache.json");
  const stats = {};
  assert.deepEqual(f.id(stats, { cachePath: visible }), baseline);
  assert.equal(existsSync(visible), false);
  assert.equal(stats.filesRead, 1);
});
test("Git failure and unreadable source fail closed", (t) => {
  const f = fixture(t);
  assert.throws(() => identity(f.wasm, { root: f.dir }), /Cannot determine client identity: git/);
  const p = join(f.root, "secret");
  writeFileSync(p, "one");
  f.id();
  chmodSync(p, 0);
  try {
    assert.throws(() => f.id(), /EACCES/);
  } finally {
    chmodSync(p, 0o600);
  }
});
test("a source changed during hashing refuses identity and publishes no cache", (t) => {
  const f = fixture(t);
  const path = join(f.root, "source");
  writeFileSync(path, Buffer.alloc(2 << 20, 1));
  const original = fs.readSync;
  let changed = false;
  fs.readSync = (...args) => {
    const n = original(...args);
    if (n > 0 && !changed) {
      changed = true;
      writeFileSync(path, Buffer.alloc(2 << 20, 2));
    }
    return n;
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => f.id(), /Identity source changed/);
    assert.equal(changed, true);
    assert.equal(existsSync(f.cache), false);
  } finally {
    fs.readSync = original;
    syncBuiltinESMExports();
  }
});

test("concurrent independent writers publish a usable complete cache", async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, "source"), Buffer.alloc(2 << 20, 1));
  const module = new URL("../web/tests/lib/run-state.mjs", import.meta.url).href;
  const code = `import {identity} from ${JSON.stringify(module)};console.log(JSON.stringify(identity(${JSON.stringify(f.wasm)},{root:${JSON.stringify(f.root)}})));`;
  const values = await Promise.all(
    Array.from(
      { length: 3 },
      () =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, ["--input-type=module", "-e", code], {
            stdio: ["ignore", "pipe", "pipe"],
          });
          let out = "",
            err = "";
          child.stdout.on("data", (b) => (out += b));
          child.stderr.on("data", (b) => (err += b));
          child.on("error", reject);
          child.on("exit", (n) => (n === 0 ? resolve(JSON.parse(out)) : reject(Error(err))));
        }),
    ),
  );
  values.forEach((v) => assert.deepEqual(v, values[0]));
  const stats = {};
  assert.deepEqual(f.id(stats), values[0]);
  assert.equal(stats.cacheHits, 1);
  assert.doesNotThrow(() => JSON.parse(readFileSync(f.cache, "utf8")));
});
