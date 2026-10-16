// Diagnostic only: where the Hub header's height goes at normal and 200% root text.
// 402x681 and 1440x900, real ef4b, genuine prepared three-resident session.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from "node:fs";
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import net from "node:net";
import {launchBrowser} from "../../../tools/browser.mjs";

const out = resolve("docs/evidence/cut255", process.argv[2] ?? "hub-header-probe-1");
mkdirSync(out, {recursive: true});
assert(!readdirSync(out).length);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const prepared = readFileSync("docs/evidence/cut255/home-proof/attempt-5/prepared.session.json", "utf8");
const r = { at: new Date().toISOString(), scriptSha256: sha(readFileSync(new URL(import.meta.url))), preparedSha256: sha(prepared), cases: [], errors: [] };
const save = () => writeFileSync(out + "/results.json", JSON.stringify(r, null, 2) + "\n");
save();
const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const log = createWriteStream(out + "/vite.log");
await new Promise((a) => log.once("open", a));
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--config", "tests/vite.test.config.ts"], { cwd: resolve("web"), stdio: ["ignore", log, log] });
r.vitePid = vite.pid; r.port = port; save();
const url = `http://localhost:${port}/`;
let browser, page;

const PARTS = [
  [".hero-hub-header", "header"],
  [".hero-hub-face", "face"],
  [".hero-hub-identity", "identity"],
  [".hero-hub-identity h2", "identity/name"],
  [".hero-hub-identity > span", "identity/class"],
  ["[data-hub-hero-progress]", "identity/progress"],
  ["[data-hub-life-state]", "identity/life"],
  [".hero-hub-identity > small:not([data-hub-hero-progress])", "identity/bloodline"],
  ["[data-hub-training]", "identity/training"],
  ["[data-hub-training] > summary", "identity/training-summary"],
  ["[data-hub-secondary]", "secondary"],
  [".hero-hub-secondary button", "secondary/button"],
  [".hero-hub-residents", "residents"],
  [".hero-hub-residents button", "residents/button"],
  [".hero-hub-tabs", "tabs"],
  ["[data-hub-tab]", "tabs/tab"],
  [".hero-hub-content", "content"],
  [".hero-hub-content button, .hero-hub-content summary", "content/first-action"],
];

const measure = () => page.evaluate((parts) => {
  const out = [];
  for (const [sel, label] of parts) {
    for (const e of document.querySelectorAll(sel)) {
      const q = e.getBoundingClientRect(), s = getComputedStyle(e);
      out.push({
        label, sel,
        text: (e.textContent ?? "").trim().slice(0, 30),
        rect: { x: +q.x.toFixed(1), y: +q.y.toFixed(1), w: +q.width.toFixed(1), h: +q.height.toFixed(1) },
        font: s.fontSize, line: s.lineHeight, pad: s.padding, minH: s.minBlockSize, display: s.display,
      });
      if (label === "residents/button" || label === "tabs/tab") { if (out.filter((x) => x.label === label).length >= 3) break; }
      if (label === "secondary/button") break;
      if (label === "content/first-action") break;
    }
  }
  const hub = document.querySelector(".hero-hub");
  const hr = hub.getBoundingClientRect();
  const offenders = [...hub.querySelectorAll("*")]
    .filter((e) => e.getClientRects().length)
    .map((e) => { const q = e.getBoundingClientRect(); return { e, q }; })
    .filter(({ q }) => q.right > hr.right + 1 || q.left < hr.left - 1 || q.width > hr.width + 1)
    .slice(0, 14)
    .map(({ e, q }) => ({ tag: e.tagName, cls: String(e.className).slice(0, 60), text: (e.textContent ?? "").trim().slice(0, 30), x: +q.x.toFixed(1), w: +q.width.toFixed(1), right: +q.right.toFixed(1) }));
  return {
    parts: out,
    docOverflow: document.documentElement.scrollWidth - innerWidth,
    hubScroll: { clientH: hub.clientHeight, scrollH: hub.scrollHeight, scrollTop: hub.scrollTop, clientW: hub.clientWidth, scrollW: hub.scrollWidth },
    hubRect: { x: +hr.x.toFixed(1), w: +hr.width.toFixed(1), right: +hr.right.toFixed(1) },
    offenders,
    windowH: innerHeight,
    trainingOpen: document.querySelector("[data-hub-training]")?.open ?? null,
  };
}, PARTS);

async function case_(viewport, scale, openTraining) {
  page = await browser.newPage({ viewport, hasTouch: viewport.width === 402, reducedMotion: "reduce" });
  page.on("pageerror", (e) => r.errors.push(String(e)));
  await page.goto(url + "?fresh=1&seed=1&runs=0");
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  await page.evaluate(async (text) => { const a = window.__idlever; a.runnerOn = false; const { closeAllSheets } = await import("/src/ui/sheet.ts"); closeAllSheets(); a.lineage = await a.engine.load(text); a.adoptSets(); await a.refresh(); await a.selectBloodline(2); a.go({ kind: "camp" }); }, prepared);
  await page.waitForFunction(() => window.__town?.actors().length === 3 && window.__town.actors().every((x) => x.rect));
  await page.evaluate((s) => { document.documentElement.style.fontSize = `${16 * s}px`; }, scale);
  await page.waitForTimeout(200);
  const tile = await page.locator('[data-building="tent"]').boundingBox();
  assert(tile);
  if (viewport.width === 402) await page.touchscreen.tap(tile.x + tile.width / 2, tile.y + tile.height / 2);
  else await page.mouse.click(tile.x + tile.width / 2, tile.y + tile.height / 2);
  await page.waitForFunction(() => document.querySelector("[data-hero-hub] .hero-hub-identity"));
  await page.waitForTimeout(200);
  const closed = await measure();
  if (openTraining) {
    await page.locator("[data-hub-training] > summary").click();
    await page.waitForTimeout(200);
  }
  const shot = await measure();
  await page.screenshot({ path: `${out}/${viewport.width}-${scale}x-${openTraining ? "training-open" : "default"}.png` });
  await page.close();
  return { viewport, scale, openTraining, closedInInitialView: closed, captured: shot };
}

try {
  for (let n = 0; n < 120; n++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise((a) => setTimeout(a, 250)); }
  browser = await launchBrowser();
  for (const viewport of [{ width: 402, height: 681 }, { width: 1440, height: 900 }]) {
    for (const scale of [1, 2]) {
      r.cases.push(await case_(viewport, scale, false));
    }
  }
  // the hero-hub geometry gate's own widths (1000-tall) at 200% root text
  for (const width of [320, 400]) r.cases.push(await case_({ width, height: 1000 }, 2, false));
  r.cases.push(await case_({ width: 402, height: 681 }, 2, true));
  r.status = "PROBED";
} catch (e) { r.status = "FAIL"; r.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); vite.kill("SIGTERM"); await new Promise((a) => { if (vite.exitCode !== null) a(); else vite.once("exit", a); }); log.end(); r.closedUtc = new Date().toISOString(); save(); }
