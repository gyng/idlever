// Diagnostic only (not acceptance): pin where the cross-owner Locate ring goes.
// Same-owner control + cross-owner case, desktop 1440x900 normal, real ef4b, genuine
// prepared three-resident session. No source/save/engine edits.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from "node:fs";
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import net from "node:net";
import {launchBrowser} from "../../../../tools/browser.mjs";

const out = resolve("docs/evidence/cut255/home-proof", process.argv[2] ?? "locate-probe-1");
mkdirSync(out, {recursive: true});
assert(!readdirSync(out).length);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const prepared = readFileSync("docs/evidence/cut255/home-proof/attempt-3/prepared.session.json", "utf8");
const inventory = () => { const v = {}; const walk = (p) => { for (const x of readdirSync(p, {withFileTypes:true})) { const q = p + "/" + x.name; if (x.isDirectory()) walk(q); else v[q] = sha(readFileSync(q)); } }; walk("web/src"); return v; };
const r = { at: new Date().toISOString(), pid: process.pid, scriptSha256: sha(readFileSync(new URL(import.meta.url))), preparedSha256: sha(prepared), sourceBefore: inventory(), phases: [], errors: [], focusLog: [] };
const save = () => writeFileSync(out + "/results.json", JSON.stringify(r, null, 2) + "\n");
save();

const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const log = createWriteStream(out + "/vite.log");
await new Promise((a) => log.once("open", a));
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--config", "tests/vite.test.config.ts"], { cwd: resolve("web"), stdio: ["ignore", log, log] });
r.vitePid = vite.pid; r.port = port; save();
const url = `http://localhost:${port}/`;
let browser, page;

const PROBE = () => {
  const P = window.__probe = { events: [], rings: [], go: [], select: [], created: [], oldTown: null };
  window.addEventListener("idlever:focus-hero", () => {
    P.events.push({ t: performance.now(), kind: window.__idlever?.view?.kind, townConnected: !!document.querySelector(".town"), heroBtns: document.querySelectorAll(".town [data-home-hero]").length, towns: document.querySelectorAll(".town").length, townIsOld: P.oldTown === document.querySelector(".town"), ringsNow: document.querySelectorAll(".town-hero-focus").length });
  });
  const a = window.__idlever;
  const origGo = a.go.bind(a);
  a.go = (s) => { P.go.push({ t: performance.now(), kind: s.kind, hadTown: !!document.querySelector(".town"), oldConnected: P.oldTown ? P.oldTown.isConnected : null }); return origGo(s); };
  const origSel = a.selectBloodline.bind(a);
  a.selectBloodline = async (id) => { P.select.push({ t: performance.now(), id }); const ok = await origSel(id); P.select.push({ t: performance.now(), id, done: ok }); return ok; };
  const obs = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n instanceof Element) { const e = n.matches?.(".town-hero-focus") ? n : n.querySelector?.(".town-hero-focus"); if (e) P.rings.push({ t: performance.now(), connected: e.isConnected, inDoc: document.contains(e), inOld: P.oldTown ? P.oldTown.contains(e) : null, rect: e.getBoundingClientRect().toJSON(), animation: getComputedStyle(e).animationName }); } } });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  P.obs = obs;
};

const snapshot = () => page.evaluate(() => {
  const old = window.__probe.oldTown;
  const live = document.querySelector(".town");
  return {
    screen: window.__idlever.view.kind,
    selected: window.__idlever.lineage.selected_bloodline,
    hasTown: !!window.__town,
    actors: window.__town ? window.__town.actors().map((x) => ({ id: x.id, rect: x.rect })) : null,
    ringsInDoc: [...document.querySelectorAll(".town-hero-focus")].map((e) => ({ cls: e.className, rect: e.getBoundingClientRect().toJSON() })),
    oldTownConnected: old ? old.isConnected : null,
    oldTownRings: old ? old.querySelectorAll(".town-hero-focus").length : null,
    liveTownIsOld: !!(old && live === old),
    probe: {
      events: window.__probe.events,
      rings: window.__probe.rings,
      go: window.__probe.go,
      select: window.__probe.select,
    },
    slots: (window.__idlever.lineage.hero_slots ?? []).map((s) => ({ id: s.id, state: s.state, life_state: s.life_state, rest_s: s.rest_s, recovery_s: s.recovery_s })),
  };
});

async function boot() {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  page.on("pageerror", (e) => r.errors.push(String(e)));
  page.on("console", (m) => { if (m.text().startsWith("focusHero ")) r.focusLog.push({ at: Date.now(), text: m.text() }); });
  await page.goto(url + "?fresh=1&seed=1&runs=0");
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  await page.evaluate(() => { window.__idlever.runnerOn = false; });
}
async function load() {
  await page.evaluate(async (text) => { const a = window.__idlever; a.runnerOn = false; const { closeAllSheets } = await import("/src/ui/sheet.ts"); closeAllSheets(); a.lineage = await a.engine.load(text); a.adoptSets(); await a.refresh(); a.go({ kind: "camp" }); }, prepared);
  await page.waitForFunction(() => window.__town?.actors().length === 3 && window.__town.actors().every((x) => x.rect));
  await page.waitForTimeout(300);
}
async function selected(id) {
  await page.evaluate(async (id) => { const a = window.__idlever; await a.selectBloodline(id); a.go({ kind: "camp" }); }, id);
  await page.waitForTimeout(200);
}
async function openAndLocate(slot) {
  await page.evaluate(PROBE_STR);
  await page.evaluate(() => { window.__probe.oldTown = document.querySelector(".town"); window.__probe.obs.observe(window.__probe.oldTown, { childList: true, subtree: true }); });
  await page.locator('[data-tile="heroes"]').click();
  await page.waitForTimeout(200);
  const before = await snapshot();
  const started = Date.now();
  await page.locator(`.heroes-sheet [data-slot="${slot}"] .hero-jump`).click();
  const clickMs = Date.now() - started;
  const immediate = await snapshot();
  let sawInDoc = false;
  for (let i = 0; i < 60 && !sawInDoc; i++) { await page.waitForTimeout(50); sawInDoc = await page.evaluate(() => !!document.querySelector(".town-hero-focus")); }
  const settled = await snapshot();
  // Readiness retries: is the new scene able to locate at all, and from when?
  const retries = [];
  let waited = 0;
  for (const at of [250, 750, 2000]) {
    await page.waitForTimeout(at - waited);
    waited = at;
    const before = await page.evaluate(() => window.__probe.rings.length);
    const state = await page.evaluate(() => ({ town: !!document.querySelector(".town"), heroBtns: document.querySelectorAll(".town [data-home-hero]").length, townIsOld: window.__probe.oldTown === document.querySelector(".town") }));
    await page.evaluate(() => window.dispatchEvent(new Event("idlever:focus-hero")));
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => ({ rings: window.__probe.rings.length, inDoc: document.querySelectorAll(".town-hero-focus").length }));
    retries.push({ at, ...state, added: after.rings - before, inDoc: after.inDoc, focusLog: r.focusLog.length });
  }
  const afterRetries = await snapshot();
  return { before, immediate, settled, afterRetries, retries, clickMs, sawInDoc };
}

const PROBE_STR = `(${PROBE.toString()})()`;
try {
  for (let n = 0; n < 120; n++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise((a) => setTimeout(a, 250)); }
  browser = await launchBrowser();

  // control: same-owner (already selected 2, click 2)
  await boot(); await load(); await selected(2);
  r.phases.push({ phase: "same-owner-2", ...(await openAndLocate(2)) });
  save(); await page.close();

  // cross-owner: selected 1, click 2
  await boot(); await load(); await selected(1);
  r.phases.push({ phase: "cross-owner-1->2", ...(await openAndLocate(2)) });
  save(); await page.close();

  r.sourceAfter = inventory();
  assert.deepEqual(r.sourceAfter, r.sourceBefore);
  r.status = "PROBED";
} catch (e) { r.status = "FAIL"; r.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); vite.kill("SIGTERM"); await new Promise((a) => { if (vite.exitCode !== null) a(); else vite.once("exit", a); }); log.end(); r.closedUtc = new Date().toISOString(); save(); }
