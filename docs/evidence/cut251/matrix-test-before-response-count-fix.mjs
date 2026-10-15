// Cut251: actual public worker switches; inspect real atlas requests, never simulation grants.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../tools/browser.mjs";
const root = new URL("../../", import.meta.url);
const rawPath = "docs/evidence/cut248/earned-paid-pace.sent.session.json";
const raw = readFileSync(new URL(rawPath, root), "utf8");
const out = process.env.IDLEVER_WORKER_PROOF;
const sha = (x) => createHash("sha256").update(x).digest("hex");
const sourcePaths = ["web/src/render/town.ts", "web/tests/worker-pause.mjs"];
const sourceBefore = Object.fromEntries(
  sourcePaths.map((p) => [p, sha(readFileSync(new URL(p, root)))]),
);
const url = (process.env.IDLEVER_TEST_URL ?? "http://localhost:5397").replace(/\/+$/, "");
const browser = await launchBrowser();
const results = [];
const errors = [];
const servedWasm = [];
const pendingResponses = [];
let checks = 0;
const check = (v, reason) => {
  assert.ok(v, reason);
  checks++;
};
try {
  for (const [width, height] of [
    [402, 681],
    [1440, 900],
  ]) {
    for (const mode of ["full", "low", "off", "reduced"]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
      });
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.url().includes("idlever_wasm_bg.wasm"))
          pendingResponses.push(
            r
              .body()
              .then((bytes) =>
                servedWasm.push({ url: r.url(), sha256: sha(bytes), bytes: bytes.length }),
              ),
          );
      });
      await page.goto(`${url}/?fresh=1&runs=0&workerPause=1`);
      await page.waitForFunction(() => window.__idlever?.booted);
      const setup = await page.evaluate(
        async ({ raw, mode }) => {
          const a = window.__idlever;
          a.runnerOn = false;
          // Controlled presentation cadence: headless juice-off caps at2fps and dt caps100ms.
          // Lift that cosmetic cap, then require40 actual worker draws as well as3.2s.
          document.documentElement.dataset.juice = "on";
          await a.engine.load(raw);
          await a.refresh();
          const { setEffectsLevel } = await import("/src/render/fxpref.ts");
          setEffectsLevel(mode === "reduced" ? "full" : mode);
          a.go({ kind: "camp" });
          const { TownAtlas } = await import("/src/render/town.ts");
          const original = TownAtlas.prototype.get;
          window.workerFrames = [];
          TownAtlas.prototype.get = function (ids, h) {
            const first = Array.isArray(ids) ? ids[0] : ids;
            if (first === "town_worker_scout" || first === "town_worker_scout_1")
              window.workerFrames.push(first);
            return original.call(this, ids, h);
          };
          return { kind: a.kind, workers: a.lineage.town.workers };
        },
        { raw, mode },
      );
      check(setup.kind === "wasm", "actual WASM engine");
      check(
        setup.workers.some((w) => w.id === "scout" && !w.lit),
        "earned Scout hired",
      );
      await page.waitForFunction(() => window.__town);
      for (const paused of [true, false, true, false]) {
        const before = await page.evaluate(async (paused) => {
          const a = window.__idlever;
          await a.engine.setWorker("scout", !paused);
          await a.refresh();
          return {
            save: await a.engine.save(),
            worker: a.lineage.town.workers.find((w) => w.id === "scout"),
          };
        }, paused);
        check(
          !!before.worker.paused === paused,
          "native paused flag matches successful public switch",
        );
        await page.evaluate(() => {
          window.workerFrames = [];
        });
        await page.waitForTimeout(3200);
        await page.waitForFunction(() => window.workerFrames.length >= 40, { timeout: 30_000 });
        const observed = await page.evaluate(async () => ({
          frames: window.workerFrames,
          save: await window.__idlever.engine.save(),
          workers: window.__town.stats().workers,
        }));
        const frames = [...new Set(observed.frames)];
        const record = {
          width,
          height,
          mode,
          paused,
          frames,
          samples: observed.frames.length,
          saveBeforeSha: sha(before.save),
          saveAfterSha: sha(observed.save),
        };
        results.push(record);
        check(observed.save === before.save, "observation preserves exact save bytes");
        check(
          observed.workers.includes(`scout${paused ? "(off)" : ""}`),
          "worker remains present with correct paused identity",
        );
        check(observed.frames.length >= 40, "actual renderer sampled across time");
        const still = paused || mode === "off" || mode === "reduced";
        check(
          still
            ? frames.length === 1 && frames[0] === "town_worker_scout"
            : frames.includes("town_worker_scout") && frames.includes("town_worker_scout_1"),
          `${width}/${mode}/${paused ? "paused" : "active"}: ${still ? "stationary base frame" : "both ambient idle frames"}; got ${frames}`,
        );
        if (process.env.IDLEVER_WORKER_RED) break;
      }
      if (!process.env.IDLEVER_WORKER_RED) {
        const same = await page.evaluate(async () => {
          const a = window.__idlever,
            before = await a.engine.save();
          for (let i = 0; i < 100; i++) await a.refresh();
          return before === (await a.engine.save());
        });
        check(same, "100 read-only refreshes preserve exact save");
      }
      await page.close();
      if (process.env.IDLEVER_WORKER_RED) break;
    }
    if (process.env.IDLEVER_WORKER_RED) break;
  }
  await Promise.all(pendingResponses);
  check(
    servedWasm.length === 8 &&
      servedWasm.every(
        (r) =>
          r.sha256 === sha(readFileSync(new URL("web/src/engine/pkg/idlever_wasm_bg.wasm", root))),
      ),
    "eight actual served WASM responses match pinned package",
  );
  check(errors.length === 0, `zero page errors: ${errors}`);
} finally {
  const sourceAfter = Object.fromEntries(
    sourcePaths.map((p) => [p, sha(readFileSync(new URL(p, root)))]),
  );
  const packageBytes = readFileSync(new URL("web/src/engine/pkg/idlever_wasm_bg.wasm", root));
  const proof = {
    recordedAtUtc: new Date().toISOString(),
    sourceBefore,
    sourceAfter,
    sourceUnchanged: JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter),
    servedWasm,
    wasmSha: sha(packageBytes),
    input: rawPath,
    inputSha: sha(raw),
    checks,
    results,
    errors,
    scope:
      "Headless real-renderer atlas-request/public-WASM state proof; no painted quality or GPU performance claim",
  };
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/results.json`, JSON.stringify(proof, null, 2) + "\n");
  }
  await browser.close();
}
console.log(`worker-pause ${checks} checks PASS`);
