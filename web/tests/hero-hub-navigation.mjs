// Real child navigation + controlled detached/late-owner response guards.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const root = new URL("../../", import.meta.url);
const raw = gunzipSync(
  readFileSync(new URL("docs/evidence/cut295/navigation-fixture.session.json.gz", root)),
).toString();
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const browser = await launchBrowser();
const result = { checks: 0, errors: [], cases: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => result.errors.push(e.message));
  await page.goto(`${url}?fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  const load = async () => {
    await page.evaluate(async (raw) => {
      const { closeAllSheets } = await import("/src/ui/sheet.ts");
      closeAllSheets();
      const app = window.__idlever;
      if (app.kind !== "wasm") throw Error("real WASM required");
      if (
        !(await app.importSave(
          JSON.stringify({ engine: raw, loadout: [], runs: 0, last_seen: Date.now() }),
        ))
      )
        throw Error("import failed");
    }, raw);
  };
  const details = async () => {
    await page.locator(".hero-details:visible").first().click();
    await page.locator(".hero-hub:visible").waitFor();
  };
  const log = async () => {
    await details();
    await page.locator('[data-hub-action="runs"]:visible').click();
    await page.locator(".runs-sheet:visible").waitFor();
  };
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  await load();
  await details();
  const look = await page.evaluate(() => window.__idlever.lineage.look ?? "male");
  const next = look === "female" ? "cat" : "female";
  const before = JSON.parse(await save());
  await page.locator('[data-hub-action="appearance"]:visible').click();
  await page.locator(`.look-sheet [data-look="${next}"]`).click();
  await page.waitForFunction((next) => window.__idlever.lineage.look === next, next);
  const after = JSON.parse(await save());
  assert.equal(after.lineage.look, next);
  assert.deepEqual(
    [after.lineage.gold, after.lineage.marks, after.lineage.clock_s],
    [before.lineage.gold, before.lineage.marks, before.lineage.clock_s],
  );
  result.checks += 2;
  result.cases.push("real Appearance choice survives parent disposal");
  await load();
  await details();
  await page.locator('[data-hub-action="appearance"]:visible').click();
  const staleLook = await page.locator(`.look-sheet [data-look="${next}"]`).elementHandle();
  await page.keyboard.press("Escape");
  const stable = await save();
  await staleLook.evaluate((node) => node.click());
  await page.waitForTimeout(30);
  assert.equal(await save(), stable);
  result.checks++;
  result.cases.push("detached Appearance control cannot write");
  await load();
  await log();
  const replay = page.locator('.runs-sheet .re-play[data-run="133"]');
  const staleReplay = await replay.elementHandle();
  await page.evaluate(() => {
    const app = window.__idlever,
      orig = app.engine.replay.bind(app.engine);
    window.replayCount = 0;
    app.engine.replay = (...args) => {
      window.replayCount++;
      return orig(...args);
    };
  });
  await page.keyboard.press("Escape");
  await staleReplay.evaluate((node) => node.click());
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(() => window.replayCount), 0);
  assert.equal(await page.locator(".run-replay").count(), 0);
  result.checks += 2;
  result.cases.push("detached Run log control cannot read/open");
  await load();
  await log();
  const normalBefore = await save();
  await page.locator('.runs-sheet .re-play[data-run="133"]').click();
  await page.waitForFunction(
    () => window.__runReplay?.floor >= 0 && document.querySelector(".run-replay"),
  );
  assert.equal(await page.evaluate(() => window.__runReplay.run), 133);
  assert.equal(await save(), normalBefore);
  result.checks += 2;
  result.cases.push("real Run log replay opens after parent disposal");
  await page.keyboard.press("Escape");
  // Delay the actual response unchanged. Client identity perturbations below are
  // controlled race fixtures, not earned hero/engine changes or progression claims.
  for (const change of ["close", "resident", "incarnation", "engine"]) {
    await load();
    await log();
    const stable = await save();
    await page.evaluate(() => {
      const app = window.__idlever,
        original = app.engine.replay.bind(app.engine);
      window.guardReplay = app.engine.replay;
      window.delayedReady = false;
      app.engine.replay = async (...args) => {
        const actual = await original(...args);
        window.delayedReady = true;
        return new Promise((resolve) => {
          window.releaseReplay = () => resolve(actual);
        });
      };
    });
    await page.locator('.runs-sheet .re-play[data-run="133"]').click();
    await page.waitForFunction(() => window.delayedReady);
    await page.evaluate(async (change) => {
      const app = window.__idlever;
      window.restoreGuard = () => {};
      if (change === "close") {
        const { closeAllSheets } = await import("/src/ui/sheet.ts");
        closeAllSheets();
      }
      if (change === "resident") {
        const old = app.lineage.selected_bloodline;
        app.lineage.selected_bloodline = old + 100;
        window.restoreGuard = () => {
          app.lineage.selected_bloodline = old;
        };
      }
      if (change === "incarnation") {
        const old = app.lineage.persistent_hero.incarnation;
        app.lineage.persistent_hero.incarnation = old + 1;
        window.restoreGuard = () => {
          app.lineage.persistent_hero.incarnation = old;
        };
      }
      if (change === "engine") {
        const old = app.engine;
        app.engine = new Proxy(old, {});
        window.restoreGuard = () => {
          app.engine = old;
        };
      }
      window.releaseReplay();
    }, change);
    await page.waitForTimeout(40);
    assert.equal(await page.locator(".run-replay").count(), 0);
    await page.evaluate(() => window.restoreGuard());
    assert.equal(await save(), stable);
    result.checks += 2;
    result.cases.push(`late unchanged replay response ignored after ${change}`);
    // Restore the original method before the next deferred response fixture.
    await page.evaluate(() => {
      const app = window.__idlever;
      app.engine.replay = window.guardReplay;
    });
  }
  assert.deepEqual(result.errors, []);
  result.status = "PASS";
  if (process.env.IDLEVER_HUB_NAV_OUT)
    writeFileSync(process.env.IDLEVER_HUB_NAV_OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
