// Actual earned read-only sprite-primary Home review; fresh owned no-HMR server.
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchBrowser } from "../../../tools/browser.mjs";
import { phoneReviewViewports } from "../../../web/tests/lib/viewport-cases.mjs";
const phaseArg = process.argv.indexOf("--phase");
const phase = phaseArg >= 0 ? process.argv[phaseArg + 1] : process.argv.includes("--final") ? "sprite-primary-final" : "sprite-primary";
const out = resolve(`docs/evidence/cut243/${phase}`);
if (existsSync(out)) throw Error("Preserve previous evidence; select a new --phase");
mkdirSync(out, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = "docs/evidence/handoff-menus/input.game.json.gz";
const input = gunzipSync(readFileSync(inputPath)).toString();
const expectedWasm = hash(readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm"));
const result = {
  harnessSha256: hash(readFileSync(new URL(import.meta.url))),
  viewportHelperSha256: hash(readFileSync("web/tests/lib/viewport-cases.mjs")),
  recordedAtUtc: new Date().toISOString(),
  expectedWasm,
  phoneViewports: phoneReviewViewports(),
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
  for (const viewport of [...phoneReviewViewports(), { id: "desktop", width: 1440, height: 900 }]) {
    const { width, height, id: preset } = viewport;
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => {
      result.errors.push(String(e));
      save();
    });
    page.on("response", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/src/") || path.endsWith(".wasm") || path.endsWith("town_readiness_lantern.webp"))
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
    if (process.argv.includes("--art-check")) {
      await page.waitForFunction(() => {
        const lamps = [...document.querySelectorAll(".town-marker:not(.mk-next)")];
        return lamps.length && lamps.every((e) => e.classList.contains("town-marker-painted") && e.querySelector("img")?.naturalWidth > 0);
      });
    }
    for (const scale of [1, 2]) {
      await page.evaluate((s) => (document.documentElement.style.fontSize = `${16 * s}px`), scale);
      await page.mouse.move(width - 1, height - 1);
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
          painted: e.classList.contains("town-marker-painted"),
          image: e.querySelector("img")?.currentSrc,
          naturalWidth: e.querySelector("img")?.naturalWidth,
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
        header: (() => {
          const bar = document.querySelector(".topbar"), r = bar.getBoundingClientRect();
          return { height: r.height, y: r.y, controls: [...bar.querySelectorAll("button")].map((e) => {
            const q = e.getBoundingClientRect();
            return { label: e.getAttribute("aria-label") || e.textContent, x: q.x, y: q.y, w: q.width, h: q.height };
          }), stats: [...bar.querySelectorAll(".stat")].map((e) => { const q = e.getBoundingClientRect(); return { text: e.textContent, fontSize: getComputedStyle(e).fontSize, x: q.x, y: q.y, w: q.width, h: q.height }; }) };
        })(),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      if (
        geometry.duplicates ||
        geometry.helpButtons ||
        geometry.overflow > 1 ||
        geometry.targets.some((t) => t.w < 44 || t.h < 44)
      )
        throw Error(JSON.stringify(geometry));
      if (process.argv.includes("--header-check")) {
        if (width <= 600 && scale === 1 && geometry.header.height > 112) throw Error(`mobile header too tall: ${JSON.stringify(geometry.header)}`);
        if (geometry.header.controls.some((c) => c.w < 44 || c.h < 44 || c.x < 0 || c.x + c.w > width + 1)) throw Error(`header controls clipped/undersized: ${JSON.stringify(geometry.header)}`);
      }
      const filename = `home-${width}-${scale}x.png`;
      await page.screenshot({ path: `${out}/${filename}` });
      result.rows.push({
        width, height, preset, captureKind: "viewport", actualViewport: page.viewportSize(),
        scale,
        filename,
        frameSha256: hash(readFileSync(`${out}/${filename}`)),
        ...geometry,
        exactSave: before === (await page.evaluate(() => window.__idlever.engine.save())),
        saveSha256: hash(before),
      });
      save();
    }
    if (process.argv.includes("--motion-check")) {
      const saved = await page.evaluate(() => window.__idlever.engine.save());
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const samples = [];
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(550);
        samples.push(await page.locator(".town-marker").first().evaluate((el) => {
          const s = getComputedStyle(el), r = el.closest(".town-hit").getBoundingClientRect();
          return { animation: s.animationName, transform: s.transform, shadow: s.boxShadow, background: s.backgroundImage, pointerEvents: s.pointerEvents, target: { x: r.x, y: r.y, w: r.width, h: r.height } };
        }));
      }
      if (new Set(samples.map((s) => s.transform)).size < 2 || new Set(samples.map((s) => s.shadow)).size < 2)
        throw Error("availability lantern must actually bob and pulse");
      if (samples.some((s) => s.pointerEvents !== "none" || JSON.stringify(s.target) !== JSON.stringify(samples[0].target)))
        throw Error("indicator motion must preserve the building hit target");
      const continuity = await page.locator(".town-marker").first().evaluate(async (el) => {
        const clocks = el.getAnimations().map((a) => a.startTime);
        for (let i = 0; i < 50; i++) await window.__idlever.refresh();
        return { connected: el.isConnected, clocks, after: el.getAnimations().map((a) => a.startTime), refreshes: 50 };
      });
      if (!continuity.connected || JSON.stringify(continuity.clocks) !== JSON.stringify(continuity.after))
        throw Error(`Home refresh restarted marker animation: ${JSON.stringify(continuity)}`);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(100);
      const reduced = await page.locator(".town-marker").first().evaluate((el) => {
        const s = getComputedStyle(el);
        return { animation: s.animationName, transform: s.transform, filter: s.filter };
      });
      if (reduced.animation !== "none" || reduced.transform !== "none" || reduced.filter !== "none")
        throw Error(`reduced motion must stay steady: ${JSON.stringify(reduced)}`);
      if (saved !== await page.evaluate(() => window.__idlever.engine.save())) throw Error("motion changed saved game");
      (result.motion ??= []).push({ width, samples, continuity, reduced, exactSave: true });
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
    await page.mouse.move(width - 1, height - 1);
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
    if (process.argv.includes("--art-check")) {
      await page.route("**/ui/deco/town_readiness_lantern.webp", (route) => route.abort());
      await page.reload();
      await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
      await page.evaluate(async (raw) => {
        const a = window.__idlever;
        a.runnerOn = false;
        a.lineage = await a.engine.load(raw);
        await a.refresh();
        a.go({ kind: "camp" });
        (await import("/src/render/fxpref.ts")).setEffectsLevel("off");
      }, input);
      await page.waitForFunction(() => {
        const lamps = [...document.querySelectorAll(".town-marker:not(.mk-next)")];
        return lamps.length && lamps.every((e) => !e.querySelector("img") && !e.classList.contains("town-marker-painted"));
      });
      const fallback = await page.locator(".town-marker:not(.mk-next)").first().evaluate((el) => ({
        background: getComputedStyle(el).backgroundImage,
        handle: getComputedStyle(el, "::before").content,
        pointerEvents: getComputedStyle(el).pointerEvents,
      }));
      if (!fallback.background.includes("linear-gradient") || fallback.handle === "none" || fallback.pointerEvents !== "none")
        throw Error(`missing-art fallback failed: ${JSON.stringify(fallback)}`);
      const beforeFallback = await page.evaluate(() => window.__idlever.engine.save());
      await page.screenshot({ path: `${out}/missing-art-${width}.png` });
      const exactSave = beforeFallback === await page.evaluate(() => window.__idlever.engine.save());
      if (!exactSave) throw Error("fallback changed save");
      (result.artFallback ??= []).push({ width, ...fallback, exactSave });
      save();
    }
    await page.close();
  }
  await Promise.all(pending);
  const wasm = result.served.filter((r) => r.path.endsWith(".wasm"));
  if (!wasm.length || wasm.some((r) => r.sha256 !== expectedWasm)) throw Error("Unexpected served WASM");
  if (hash(readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm")) !== expectedWasm) throw Error("Package changed during capture");
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
