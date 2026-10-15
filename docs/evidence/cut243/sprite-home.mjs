// Actual earned read-only sprite-primary Home review; fresh owned no-HMR server.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
const phase = process.argv.includes("--final") ? "sprite-primary-final" : "sprite-primary";
const out = resolve(`docs/evidence/cut243/${phase}`);
mkdirSync(out, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = "docs/evidence/handoff-menus/input.game.json.gz";
const input = gunzipSync(readFileSync(inputPath)).toString();
const result = {
  scope:
    "Actual earned Home sprite targets, presentation only; no performance or full menu acceptance claim",
  inputPath,
  inputSha256: hash(input),
  rows: [],
  checks: [],
  served: [],
  errors: [],
};
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const log = createWriteStream(`${out}/vite.log`);
await new Promise((r) => log.once("open", r));
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--port",
    String(port),
    "--strictPort",
    "--config",
    "tests/vite.test.config.ts",
  ],
  { cwd: resolve("web"), stdio: ["ignore", log, log] },
);
let browser;
const pending = [];
try {
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await launchBrowser({ gpu: true });
  for (const width of [320, 400, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => {
      result.errors.push(String(e));
      save();
    });
    page.on("response", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/src/") || path.endsWith(".wasm"))
        pending.push(
          r
            .body()
            .then((b) => result.served.push({ path, bytes: b.length, sha256: hash(b) }))
            .catch(() => {}),
        );
    });
    await page.goto(`${url}?fresh=1&seed=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.lineage = await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
      (await import("/src/render/fxpref.ts")).setEffectsLevel("off");
    }, input);
    await page.waitForTimeout(1200);
    for (const scale of [1, 2]) {
      await page.evaluate((s) => (document.documentElement.style.fontSize = `${16 * s}px`), scale);
      await page.mouse.move(width - 1, 999);
      await page.keyboard.press("Escape");
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForFunction(
        () => !document.querySelector(".toast,.class-unlock,#kw-tip:not([hidden])"),
        null,
        { timeout: 30000 },
      );
      const before = await page.evaluate(() => window.__idlever.engine.save());
      const geometry = await page.evaluate(() => ({
        duplicates: document.querySelectorAll(
          ".console .tile[data-tile=forge],.console .tile[data-tile=party],.console .tile[data-tile=bank]",
        ).length,
        helpButtons: document.querySelectorAll("[data-building-info]").length,
        targets: [...document.querySelectorAll(".town-hit:not([hidden])")].map((e) => {
          const r = e.getBoundingClientRect();
          return {
            id: e.dataset.building,
            label: e.getAttribute("aria-label"),
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
          };
        }),
        dots: [...document.querySelectorAll(".town-marker")].map((e) => ({
          kind: e.dataset.marker,
          text: e.textContent,
          events: getComputedStyle(e).pointerEvents,
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      if (
        geometry.duplicates ||
        geometry.helpButtons ||
        geometry.overflow > 1 ||
        geometry.targets.some((t) => t.w < 44 || t.h < 44)
      )
        throw Error(JSON.stringify(geometry));
      const filename = `home-${width}-${scale}x.png`;
      await page.screenshot({ path: `${out}/${filename}` });
      result.rows.push({
        width,
        scale,
        filename,
        frameSha256: hash(readFileSync(`${out}/${filename}`)),
        ...geometry,
        exactSave: before === (await page.evaluate(() => window.__idlever.engine.save())),
        saveSha256: hash(before),
      });
      save();
    }
    // Real trusted hover and touch inspect the same Forge sprite; both must spend nothing.
    const target = page.locator(".town-hit[data-building=blacksmith]");
    const before = await page.evaluate(() => window.__idlever.engine.save());
    await target.hover();
    await page.locator("#kw-tip:not([hidden])").waitFor();
    const tip = await page.locator("#kw-tip").textContent();
    if (!/Forge/.test(tip)) throw Error("missing Forge detail");
    await page.screenshot({ path: `${out}/forge-hover-${width}.png` });
    await page.keyboard.press("Escape");
    await page.mouse.move(width - 1, 999);
    const r = await target.boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }],
    });
    await page.waitForTimeout(600);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(150);
    const touched = await page.locator("#kw-tip:not([hidden])").isVisible();
    const unchanged = before === (await page.evaluate(() => window.__idlever.engine.save()));
    if (!touched || !unchanged) throw Error(`touch detail ${touched}, exact save ${unchanged}`);
    result.checks.push({
      width,
      hoverTip: tip,
      touchDetail: touched,
      exactInspectionSave: unchanged,
    });
    save();
    await page.keyboard.press("Escape");
    await target.click();
    await page.locator(".forge").waitFor();
    const openedSave = before === (await page.evaluate(() => window.__idlever.engine.save()));
    if (!openedSave) throw Error("opening Forge spent");
    result.checks.push({ width, normalSpriteTapOpensForge: true, exactOpeningSave: openedSave });
    save();
    await page.close();
  }
  await Promise.all(pending);
  result.status = "PASS";
  save();
} catch (e) {
  result.status = "FAIL";
  result.error = String(e.stack ?? e);
  save();
  throw e;
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
  log.end();
}
