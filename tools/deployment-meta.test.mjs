import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeDeploymentMetadata } from "./deployment-meta.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";
const restored = "a".repeat(40);
const originalWorker = await readFile(new URL("../web/public/sw.js", import.meta.url), "utf8");
const previousHeaders =
  "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/sw.js\n  Cache-Control: no-cache\n";

async function artifact(t, worker = originalWorker) {
  const directory = await mkdtemp(join(tmpdir(), "idlever-meta-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "sw.js"), worker);
  await writeFile(join(directory, "_headers"), previousHeaders);
  return directory;
}

function workerHarness(source, base) {
  const listeners = new Map();
  const cacheReads = [];
  runInNewContext(source.replace("__PRECACHE__", JSON.stringify([base, `${base}index.html`])), {
    self: {
      registration: { scope: `https://example.test${base}` },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(listener);
      },
    },
    URL,
    caches: {
      async match(request) {
        cacheReads.push(request.url);
        return "cached application asset";
      },
    },
  });
  return {
    cacheReads,
    async fetch(path, mode = "cors") {
      let stopped = false;
      let response;
      const event = {
        request: { url: `https://example.test${path}`, method: "GET", mode },
        stopImmediatePropagation() {
          stopped = true;
        },
        respondWith(value) {
          response = value;
        },
      };
      for (const listener of listeners.get("fetch")) {
        listener(event);
        if (stopped) break;
      }
      return response === undefined ? undefined : await response;
    },
  };
}

test("artifact identity is stable JSON with full SHA, exact UTC deployment time, and optional real version", async (t) => {
  const directory = await artifact(t);
  const now = new Date("2026-10-18T14:30:00.987Z");
  const result = await writeDeploymentMetadata({ directory, commit, now });
  assert.deepEqual(result, { schemaVersion: 1, updatedAt: "2026-10-18T14:30:00Z", commit });
  const first = await readFile(join(directory, "meta.json"), "utf8");
  assert.deepEqual(JSON.parse(first), result);
  assert.equal(await readFile(join(directory, "meta.json"), "utf8"), first);
  const rollback = await writeDeploymentMetadata({
    directory,
    commit: restored,
    now: new Date("2026-10-19T01:02:03Z"),
    version: "v0.3.0-alpha.1",
  });
  assert.equal(rollback.updatedAt, "2026-10-19T01:02:03Z");
  assert.equal(rollback.commit, restored);
  assert.equal(rollback.version, "v0.3.0-alpha.1");
});

test("rejects missing, short or decorated identities, invalid versions, and invalid base paths", async (t) => {
  const directory = await artifact(t);
  for (const bad of [undefined, "unknown", "0123456789ab", `${commit}-dirty`, "g".repeat(40)]) {
    await assert.rejects(writeDeploymentMetadata({ directory, commit: bad }), /full Git SHA/);
  }
  for (const version of ["", "  ", 1]) {
    await assert.rejects(writeDeploymentMetadata({ directory, commit, version }), /nonempty/);
  }
  await assert.rejects(writeDeploymentMetadata({ directory, commit, base: "../bad" }), /base path/);
});

test("headers preserve asset policy and configure JSON, public CORS and revalidation at both bases", async (t) => {
  for (const base of ["/", "/idlever/"]) {
    const directory = await artifact(t);
    await writeDeploymentMetadata({ directory, commit, base });
    await writeDeploymentMetadata({ directory, commit, base });
    const headers = await readFile(join(directory, "_headers"), "utf8");
    assert.equal(
      headers,
      `${previousHeaders}${base}meta.json\n  Content-Type: application/json\n  Access-Control-Allow-Origin: *\n  Cache-Control: no-cache\n`,
    );
  }
});

test("source worker bypasses metadata, including navigations and queries, while assets retain caching", async () => {
  for (const base of ["/", "/idlever/"]) {
    const worker = workerHarness(originalWorker, base);
    assert.equal(await worker.fetch(`${base}meta.json`), undefined);
    assert.equal(await worker.fetch(`${base}meta.json?check=1`, "navigate"), undefined);
    assert.equal(worker.cacheReads.length, 0);
    assert.equal(await worker.fetch(`${base}assets/game.js`), "cached application asset");
    assert.equal(worker.cacheReads.length, 1);
  }
});

test("artifact guard bypasses older rollback workers and preserves their non-metadata fetches", async (t) => {
  const oldWorker =
    'self.addEventListener("fetch", (e) => { e.respondWith(Promise.resolve("old cached response")); });';
  const directory = await artifact(t, oldWorker);
  await writeDeploymentMetadata({ directory, commit });
  const source = await readFile(join(directory, "sw.js"), "utf8");
  await writeDeploymentMetadata({ directory, commit });
  assert.equal(await readFile(join(directory, "sw.js"), "utf8"), source);
  for (const base of ["/", "/idlever/"]) {
    const worker = workerHarness(source, base);
    assert.equal(await worker.fetch(`${base}meta.json`), undefined);
    assert.equal(await worker.fetch(`${base}meta.json?check=1`, "navigate"), undefined);
    assert.equal(await worker.fetch(`${base}assets/game.js`), "old cached response");
    assert.equal(await worker.fetch(`${base}subdir/meta.json`), "old cached response");
  }
});

test("CLI stamps the artifact with the provided full source SHA and release version", async (t) => {
  const directory = await artifact(t);
  execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("./deployment-meta.mjs", import.meta.url)),
      directory,
      commit,
      "/idlever/",
      "v0.3.0",
    ],
    { stdio: "pipe" },
  );
  const metadata = JSON.parse(await readFile(join(directory, "meta.json"), "utf8"));
  assert.equal(metadata.commit, commit);
  assert.equal(metadata.version, "v0.3.0");
  assert.match(metadata.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test("pipelines stamp checked-out identities after build and before upload; precache excludes metadata", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/pages.yml", import.meta.url),
    "utf8",
  );
  assert.ok(workflow.indexOf("Stamp deployment metadata") > workflow.indexOf("name: Build site"));
  assert.ok(
    workflow.indexOf("Stamp deployment metadata") <
      workflow.indexOf("actions/upload-pages-artifact"),
  );
  assert.match(workflow, /deployment-meta\.mjs web\/dist "\$\(git rev-parse HEAD\)" \/idlever\//);
  const cloudflare = await readFile(new URL("./deploy-cf.sh", import.meta.url), "utf8");
  assert.match(cloudflare, /node "\$repo\/tools\/deployment-meta\.mjs" "\$dist" "\$sha"/);
  assert.ok(
    cloudflare.indexOf('node "$repo/tools/deployment-meta.mjs"') <
      cloudflare.indexOf('"${wrangler[@]}" deploy'),
  );
  const vite = await readFile(new URL("../web/vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /f !== "meta\.json"/);
});
