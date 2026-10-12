#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const url = execFileSync("bash", [resolve(root, "tools/dev.sh")], { encoding: "utf8" }).trim();
const browser = await launchBrowser();
let checks = 0;
const zones = [
  [
    "Asia/Singapore",
    [
      ["04:00:00", 0],
      ["11:00:00", 0.5],
      ["15:00:00", 1],
      ["22:00:00", 0.5],
    ],
  ],
  [
    "America/New_York",
    [
      ["04:00:00", 1],
      ["16:00:00", 0],
      ["23:00:00", 0.5],
      ["10:00:00", 0.5],
    ],
  ],
];
try {
  for (const [timezoneId, phases] of zones)
    for (const fallback of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 400, height: 800 },
        timezoneId,
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (fallback)
        await page.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            return kind.startsWith("webgl") ? null : original.call(this, kind, ...args);
          };
        });
      await page.clock.setFixedTime(`2026-10-11T${phases[0][0]}Z`);
      await page.goto(`${url}?dev=1&seed=13317&fresh=1&runs=0`);
      await page.waitForFunction(
        () => window.__riddle?.booted && window.__town?.stats().frames > 1,
      );
      assert.equal(await page.evaluate(() => window.__riddle.kind), "wasm");
      checks++;
      const save = await page.evaluate(() => window.__riddle.engine.save());
      const paints = await page.evaluate(() => window.__town.stats().terrainPaints);
      for (const [utc, expected] of phases) {
        await page.clock.setFixedTime(`2026-10-11T${utc}Z`);
        await page.waitForFunction(
          (expected) => Math.abs(window.__town.stats().night - expected) < 1e-6,
          expected,
        );
        assert.equal(await page.evaluate(() => window.__town.stats().mode), fallback ? "2d" : "gl");
        checks++;
      }
      // Document visibility is controlled solely to exercise the renderer's resume path.
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForFunction(() => !window.__town.stats().running);
      const nightUtc = phases.find(([, night]) => night === 1)[0];
      await page.clock.setFixedTime(`2026-10-11T${nightUtc}Z`);
      await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForFunction(
        () => window.__town.stats().running && window.__town.stats().night === 1,
      );
      checks++;
      assert.equal(await page.evaluate(() => window.__riddle.engine.save()), save);
      checks++;
      assert.equal(await page.evaluate(() => window.__town.stats().terrainPaints), paints);
      checks++;
      assert.deepEqual(errors, []);
      checks++;
      console.log(
        timezoneId,
        fallback ? "Canvas2D" : "GL",
        "local dawn/day/dusk/night, resume/cache/save PASS",
      );
      await page.close();
    }
} finally {
  await browser.close();
}
console.log(`town-clock: PASS (${checks} checks)`);
