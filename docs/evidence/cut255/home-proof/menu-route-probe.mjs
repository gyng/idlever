// Diagnostic only (not acceptance): what the mobile Menu -> Tasks entry route leaves open.
// 402x681 normal, real ef4b, genuine prepared three-resident session.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from "node:fs";
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import net from "node:net";
import {launchBrowser} from "../../../../tools/browser.mjs";

const out = resolve("docs/evidence/cut255/home-proof", process.argv[2] ?? "menu-route-probe-1");
mkdirSync(out, {recursive: true});
assert(!readdirSync(out).length);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const prepared = readFileSync("docs/evidence/cut255/home-proof/attempt-4/prepared.session.json", "utf8");
const r = { at: new Date().toISOString(), scriptSha256: sha(readFileSync(new URL(import.meta.url))), preparedSha256: sha(prepared), steps: [], errors: [] };
const save = () => writeFileSync(out + "/results.json", JSON.stringify(r, null, 2) + "\n");
save();
const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const log = createWriteStream(out + "/vite.log");
await new Promise((a) => log.once("open", a));
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--config", "tests/vite.test.config.ts"], { cwd: resolve("web"), stdio: ["ignore", log, log] });
r.vitePid = vite.pid; r.port = port; save();
const url = `http://localhost:${port}/`;
let browser, page;

const dump = () => page.evaluate(() => ({
  sheets: [...document.querySelectorAll(".sheet-wrap")].map((w) => ({
    cls: w.className,
    hidden: w.hidden,
    rects: w.getClientRects().length,
    back: !!w.querySelector(".sheet-back"),
    material: w.querySelector(".sheet")?.dataset.material ?? null,
    title: w.querySelector("h2, .sheet-title")?.textContent?.slice(0, 40) ?? null,
    visible: !!(w.getClientRects().length && !w.hidden),
  })),
  active: (() => { const e = document.activeElement; return e ? { tag: e.tagName, cls: e.className, inCamp: !!e.closest?.(".camp"), connected: e.isConnected } : null; })(),
  journal: !!document.querySelector(".journal-panel"),
  inMovie: window.__idlever.view.kind,
}));

async function boot() {
  page = await browser.newPage({ viewport: { width: 402, height: 681 }, hasTouch: true, reducedMotion: "reduce" });
  page.on("pageerror", (e) => r.errors.push(String(e)));
  await page.goto(url + "?fresh=1&seed=1&runs=0");
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  await page.evaluate(async (text) => { const a = window.__idlever; a.runnerOn = false; const { closeAllSheets } = await import("/src/ui/sheet.ts"); closeAllSheets(); a.lineage = await a.engine.load(text); a.adoptSets(); await a.refresh(); a.go({ kind: "camp" }); }, prepared);
  await page.waitForFunction(() => window.__town?.actors().length === 3 && window.__town.actors().every((x) => x.rect));
  await page.waitForTimeout(300);
}
const tap = async (sel) => { const b = await page.locator(sel).boundingBox(); assert(b); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(250); };

try {
  for (let n = 0; n < 120; n++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise((a) => setTimeout(a, 250)); }
  browser = await launchBrowser();
  await boot();
  await tap("[data-home-menu]");
  r.steps.push({ step: "menu-open", ...(await dump()) });
  await page.locator(".home-menu-panel .task-summary").press("Enter");
  await page.waitForTimeout(250);
  r.steps.push({ step: "tasks-open", ...(await dump()) });
  await tap('.home-menu-panel .task-entry[data-entry-id="scout"]');
  r.steps.push({ step: "task-entry-clicked", ...(await dump()) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  r.steps.push({ step: "escape-1", ...(await dump()) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  r.steps.push({ step: "escape-2", ...(await dump()) });
  r.status = "PROBED";
} catch (e) { r.status = "FAIL"; r.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); vite.kill("SIGTERM"); await new Promise((a) => { if (vite.exitCode !== null) a(); else vite.once("exit", a); }); log.end(); r.closedUtc = new Date().toISOString(); save(); }
