// GPU capture for the package eval: private-display headed Chromium (tools/browser.mjs launchGpu),
// phone 400x800 at 3x. Measures rAF frame intervals during a 1x watch, takes watch shots.
// usage: node gpu-capture.mjs <worktree> <url> <outdir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , wt, url, out] = process.argv;
const { launchGpu } = await import(join(wt, "tools/browser.mjs"));
mkdirSync(out, { recursive: true });
const b = await launchGpu();
const page = await b.newPage({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 3 });
const log = [];
page.on("console", (m) => m.type() === "error" && log.push(m.text()));
const renderer = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const d = gl.getExtension("WEBGL_debug_renderer_info");
  return gl.getParameter(d.UNMASKED_RENDERER_WEBGL);
});
const state = () => page.evaluate(() => window.__idlever?.state?.() ?? { screen: document.querySelector("main")?.className });
async function frames(ms) {
  return page.evaluate(
    (ms) =>
      new Promise((res) => {
        const t = [];
        const t0 = performance.now();
        const f = (now) => {
          t.push(now);
          if (now - t0 < ms) requestAnimationFrame(f);
          else {
            const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
            const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))];
            res({ n: d.length, fps: +(d.length / (ms / 1000)).toFixed(1), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +d[d.length - 1].toFixed(2), over33: d.filter((x) => x > 33.4).length });
          }
        };
        requestAnimationFrame(f);
      }),
    ms,
  );
}
const result = { renderer, url, runs: [] };
async function session(label, q, shots) {
  const t0 = Date.now();
  await page.goto(`${url}?${q}`);
  await page.waitForFunction(() => document.querySelector("main.camp, main.report, main.death"), null, { timeout: 120000 });
  result.runs.push({ label, bootMs: Date.now() - t0 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, `${label}-camp.png`) });
  if (await page.locator("main.report").count()) {
    await page.screenshot({ path: join(out, `${label}-report.png`) });
    const town = page.locator("main.report .gem").first();
    if (await town.count()) await town.click();
    await page.waitForTimeout(1000);
  }
  const house = page.locator('.town-tag[data-next="house"]');
  if (await house.isVisible().catch(() => false)) {
    await house.click();
    await page.waitForTimeout(1500);
  }
  const send = page.locator("button.send").first();
  await send.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("button.send")?.disabled, null, { timeout: 60000 }).catch(() => {});
  await send.click().catch(() => {});
  await page.waitForSelector("main.watch", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const r = result.runs[result.runs.length - 1];
  r.frames = await frames(8000);
  for (let i = 0; i < shots; i++) {
    await page.screenshot({ path: join(out, `${label}-watch-${i + 1}.png`) });
    await page.waitForTimeout(2500);
  }
  r.frames2 = await frames(5000);
  r.viewer = await page.evaluate(() => { try { return window.__viewer?.stats?.(); } catch (e) { return String(e); } });
  r.load = (await import("node:os")).loadavg();
}
try {
  await session("fresh", "fresh=1&seed=7&speed=1", 3);
  await session("deep", "absent=8h&speed=1", 3);
} catch (e) {
  result.error = String(e);
}
result.consoleErrors = log;
writeFileSync(join(out, "gpu-capture.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await b.close();
