#!/usr/bin/env node
// Queue 39 / 41 — scrollwheel scene zoom (town + live view) and the home hero's hover outline, real WASM, headless (tools/browser.mjs):
//   town   — wheel up zooms the town (≤ 2.5×, whole steps), wheel down returns to 1× (the framed default, unchanged); a trackpad's
//            small pixel deltas and a line-mode wheel step too; ctrl+wheel is never taken; a wheel over an open panel does not zoom;
//            the mouse drags a zoomed scene; the zoom resets on a scene change
//   hero   — (three home heroes) hovering one lights his own silhouette (`hover:resident:N`, the one under the pointer), the ring
//            stands down (`glow-sprite`), the pointer gone clears it; keyboard focus lights the focused hero; a click still opens him
//   watch  — the wheel over the live view zooms it (bounded, around the tracked hero); ctrl+wheel untouched; a wheel at 1× going
//            out is not taken (the page scrolls)
//   node web/tests/scene-zoom.mjs [--part=town,hero,watch] [--shots=DIR]
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { launchBrowser } from "../../tools/browser.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const parts = (
  process.argv.find((a) => a.startsWith("--part="))?.slice(7) ?? "town,hero,watch"
).split(",");
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const out = [],
  errors = [];
let failed = 0;
const check = (ok, what) => {
  out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser();
async function until(page, pred, timeout = 8000, arg) {
  const t = Date.now();
  while (Date.now() - t < timeout) {
    const v = await page.evaluate(pred, arg).catch(() => null);
    if (v) return v;
    await sleep(100);
  }
  return null;
}
const three = gunzipSync(
  readFileSync(resolve(root, "docs/evidence/cut218/three-actual.game.json.gz")),
).toString();

/** the three-hero camp (real wasm) at 1440×900 */
async function camp(tag) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  await page.goto(`${url}?dev=1&fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90_000 });
  await page.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
  }, three);
  await page.waitForFunction(
    () => window.__town && document.querySelectorAll(".camp [data-home-hero]:not([hidden])").length,
    null,
    { timeout: 30_000, polling: 250 },
  );
  await sleep(800);
  return page;
}
const townStats = (page) =>
  page.evaluate(() => {
    const s = window.__town?.stats();
    if (!s) throw Error(`no town (screen ${window.__idlever?.view?.kind})`);
    return { zoom: s.zoom, view: s.view, glows: s.glows, kind: window.__idlever.kind };
  });
/** a scene point clear of every target (the canvas itself under it) */
const openGround = (page) =>
  page.evaluate(() => {
    const t = document.querySelector(".camp .town").getBoundingClientRect();
    for (let y = t.top + 20; y < t.bottom - 20; y += 13)
      for (let x = t.left + 20; x < t.right - 20; x += 17) {
        const e = document.elementFromPoint(x, y);
        if (e?.tagName === "CANVAS" && e.parentElement?.classList.contains("town")) return { x, y };
      }
    return null;
  });
/** dispatch `n` synthetic wheels (one task, as a trackpad's stream) on the element under (x, y); whether the page kept its
 *  default (none prevented) */
const wheelAt = (page, x, y, init, n = 1) =>
  page.evaluate(
    ({ x, y, init, n }) => {
      const e = document.elementFromPoint(x, y);
      let kept = true;
      for (let i = 0; i < n; i++)
        kept =
          e.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              ...init,
            }),
          ) && kept;
      return kept;
    },
    { x, y, init, n },
  );

try {
  if (parts.includes("town")) {
    const page = await camp("town");
    const s0 = await townStats(page);
    check(
      s0.kind === "wasm" && s0.zoom === 1,
      `town opens at 1× on the real engine (${s0.kind} ${s0.zoom})`,
    );
    const g = await openGround(page);
    check(!!g, "an open patch of ground to wheel over");
    // ctrl+wheel (the browser's page zoom, a trackpad pinch) is never taken
    const ctrlKept = await wheelAt(page, g.x, g.y, { deltaY: -100, ctrlKey: true });
    const sc = await townStats(page);
    check(
      ctrlKept && sc.zoom === 1,
      `ctrl+wheel passes to the browser (default kept ${ctrlKept}, zoom ${sc.zoom})`,
    );
    // wheel out at 1× is not taken (the well scrolls as before)
    const outKept = await wheelAt(page, g.x, g.y, { deltaY: 100 });
    check(outKept, "wheel out at 1× is not taken");
    // a real mouse notch in: one step, toward the pointer
    await page.mouse.move(g.x, g.y);
    await page.mouse.wheel(0, -100);
    await sleep(250);
    const s1 = await townStats(page);
    check(
      s1.zoom > 1 && s1.zoom <= 1.5,
      `a wheel notch zooms in one step (${s1.zoom}, view ${s1.view})`,
    );
    check(
      s1.view[0] >= s0.view[0] &&
        s1.view[1] >= s0.view[1] &&
        s1.view[0] + s1.view[2] <= s0.view[0] + s0.view[2] &&
        s1.view[1] + s1.view[3] <= s0.view[1] + s0.view[3],
      `the zoomed view stays inside the default (${s0.view} ⊇ ${s1.view})`,
    );
    // trackpad: a stream of small pixel deltas steps too
    const zs = [s1.zoom];
    await wheelAt(page, g.x, g.y, { deltaY: -8, deltaMode: 0 }, 12);
    await sleep(200);
    zs.push((await townStats(page)).zoom);
    // line mode (Firefox's wheel): 3 lines a notch
    await wheelAt(page, g.x, g.y, { deltaY: -3, deltaMode: 1 });
    await sleep(200);
    zs.push((await townStats(page)).zoom);
    check(
      zs[1] > zs[0] && zs[2] > zs[1],
      `trackpad pixels and line-mode wheel step in (${zs.join(" → ")})`,
    );
    // the bound: many notches stop at ≤ 2.5×, and a further notch in is not taken
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
    await sleep(250);
    const sMax = await townStats(page);
    const g2 = (await openGround(page)) ?? g;
    const inKept = await wheelAt(page, g2.x, g2.y, { deltaY: -100 });
    check(
      sMax.zoom >= 2 && sMax.zoom <= 2.5 && inKept,
      `max zoom bounded (${sMax.zoom}×), a wheel past it not taken (${inKept})`,
    );
    if (shots) await page.screenshot({ path: `${shots}/town-zoom-max.png` });
    // the mouse drags the zoomed scene on its open ground
    const before = (await townStats(page)).view;
    await page.mouse.move(g2.x, g2.y);
    await page.mouse.down();
    await page.mouse.move(g2.x + 120, g2.y + 60, { steps: 6 });
    await page.mouse.up();
    await sleep(250);
    const after = (await townStats(page)).view;
    check(
      after[0] !== before[0] || after[1] !== before[1],
      `a drag pans the zoomed town (${before} → ${after})`,
    );
    check(
      after[0] >= s0.view[0] && after[0] + after[2] <= s0.view[0] + s0.view[2],
      "the pan stays inside the default view",
    );
    // the hit targets follow the zoom (they sit over their sprites)
    const tgt = await page.evaluate(() => {
      const b = document.querySelector('.camp .town-hit[data-building="tent"]');
      return b ? { hidden: b.hidden, r: b.getBoundingClientRect().toJSON() } : null;
    });
    check(!!tgt, `the targets stand while zoomed (${JSON.stringify(tgt?.r)})`);
    // all the way out: back to the default view exactly
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 100);
    await sleep(250);
    const sOut = await townStats(page);
    check(
      sOut.zoom === 1 && sOut.view.join() === s0.view.join(),
      `wheel out returns to the default view (${sOut.view} = ${s0.view})`,
    );
    // a wheel over an open panel scrolls it, never the scene
    await page.mouse.wheel(0, -100);
    await sleep(200);
    const zBefore = (await townStats(page)).zoom;
    await page.locator('.camp .town-hit[data-building="tent"]').click({ force: true });
    const panel = await until(page, () => {
      const p = [...document.querySelectorAll(".sheet, [role=dialog], .window")].find(
        (e) => e.getClientRects().length,
      );
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 120) };
    });
    check(!!panel, "a panel opens over the camp");
    if (panel) {
      await page.mouse.move(panel.x, panel.y);
      await page.mouse.wheel(0, -100);
      await page.mouse.wheel(0, 100);
      await sleep(200);
      const z = (await townStats(page)).zoom;
      check(z === zBefore, `a wheel over the panel leaves the zoom (${zBefore} → ${z})`);
    }
    await page.close();
  }

  if (parts.includes("hero")) {
    const page = await camp("hero");
    const heroes = await page.evaluate(() =>
      [...document.querySelectorAll(".camp [data-home-hero]:not([hidden])")].map((b) => ({
        id: Number(b.dataset.homeHero),
        rect: window.__town.actors().find((a) => a.id === Number(b.dataset.homeHero))?.rect,
        town: document.querySelector(".camp .town").getBoundingClientRect().toJSON(),
      })),
    );
    check(heroes.length >= 2, `several home heroes stand (${heroes.length})`);
    const glowHeroes = (gs) => gs.filter((x) => x.startsWith("hover:resident:"));
    let lit = 0;
    for (const h0 of heroes) {
      if (!h0.rect) continue;
      const x = h0.town.x + h0.rect.x + h0.rect.w / 2,
        y = h0.town.y + h0.rect.y + h0.rect.h / 2;
      // the residents walk: re-aim at his drawn body just before the move
      const r = await page.evaluate(
        (id) => window.__town.actors().find((a) => a.id === id)?.rect,
        h0.id,
      );
      const px = r ? h0.town.x + r.x + r.w / 2 : x,
        py = r ? h0.town.y + r.y + r.h / 2 : y;
      await page.mouse.move(px, py);
      await sleep(250);
      const s = await townStats(page);
      const gh = glowHeroes(s.glows);
      if (gh.length === 1 && gh[0] === `hover:resident:${h0.id}`) lit++;
      else out.push(`     (hero ${h0.id} at ${px | 0},${py | 0}: ${s.glows.join(",")})`);
      if (shots && lit === 1 && !(await page.evaluate(() => window.__shotTaken))) {
        await page.evaluate(() => (window.__shotTaken = true));
        await page.screenshot({ path: `${shots}/hero-hover.png` });
        await page.mouse.wheel(0, -100);
        await page.mouse.wheel(0, -100);
        await sleep(300);
        await page.mouse.move(px + 1, py + 1);
        await sleep(300);
        const zr = await page.evaluate(
          (id) => window.__town.actors().find((a) => a.id === id)?.rect,
          h0.id,
        );
        if (zr) await page.mouse.move(h0.town.x + zr.x + zr.w / 2, h0.town.y + zr.y + zr.h / 2);
        await sleep(300);
        await page.screenshot({ path: `${shots}/hero-hover-zoomed.png` });
        const zg = glowHeroes((await townStats(page)).glows);
        check(zg.length === 1, `zoomed, the hovered hero still lights alone (${zg.join(",")})`);
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 100);
        await sleep(200);
      }
    }
    check(
      lit >= Math.min(2, heroes.length),
      `hover lights the hero under the pointer, one at a time (${lit}/${heroes.length})`,
    );
    const cls = await page.evaluate(() =>
      [...document.querySelectorAll(".camp [data-home-hero]:not([hidden])")].every((b) =>
        b.classList.contains("glow-sprite"),
      ),
    );
    check(cls, "the ring stands down where the sprite outline draws (glow-sprite)");
    // night: the outline is drawn after the light pass, the same state at any hour
    await page.evaluate(() => window.__town.setHour(23));
    await sleep(300);
    const night = glowHeroes((await townStats(page)).glows);
    check(night.length <= 1, `night keeps a single lit hero (${night.join(",")})`);
    await page.evaluate(() => window.__town.setHour(null));
    await page.mouse.move(2, 2);
    await sleep(300);
    check(
      glowHeroes((await townStats(page)).glows).length === 0,
      "the pointer gone, the hero's outline goes",
    );
    // keyboard focus lights the focused hero (no hover)
    await page.evaluate(() =>
      document.querySelector(".camp [data-home-hero]:not([hidden])").focus(),
    );
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await sleep(300);
    const f = await page.evaluate(() => ({
      id: document.activeElement?.dataset?.homeHero,
      vis: document.activeElement?.matches(":focus-visible"),
    }));
    const fg = glowHeroes((await townStats(page)).glows);
    check(
      f.vis && fg.includes(`hover:resident:${f.id}`),
      `keyboard focus lights hero ${f.id} (${fg.join(",")})`,
    );
    // a click still opens his details
    await page.keyboard.press("Enter");
    const opened = await until(page, () =>
      [...document.querySelectorAll(".sheet, [role=dialog], .window, .hero-hub")].some(
        (e) => e.getClientRects().length,
      ),
    );
    check(!!opened, "Enter (a click) still opens the hero");
    await page.close();
  }

  if (parts.includes("watch")) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => errors.push(`watch pageerror: ${e.message}`));
    // take-control.mjs's path: a fresh game, the house built if offered, the gem sends, the live view mounts
    await page.goto(`${url}?dev=1&fresh=1&seed=611`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90_000 });
    const house = page.locator(".town-tag[data-next=house]");
    if (await house.count()) {
      await house.first().click();
      await sleep(800);
      const b = page.locator("button", { hasText: /^build|Build/ });
      if (await b.count()) await b.first().click();
      await sleep(4000);
    }
    await page.locator(".camp-gem, .gem").first().click();
    await page.waitForFunction(() => window.__idlever.screen === "watch", null, {
      timeout: 30_000,
    });
    await page.waitForFunction(() => window.__viewer?.stats?.().hero, null, { timeout: 60_000 });
    await sleep(800);
    const kind = await page.evaluate(() => window.__idlever?.kind);
    const c = await page.evaluate(() => {
      const v = document.querySelector("canvas.view").getBoundingClientRect();
      // a point on the picture itself (no HUD over it)
      for (let y = v.top + v.height * 0.3; y < v.bottom - 20; y += 15)
        for (let x = v.left + v.width * 0.3; x < v.right - 20; x += 15)
          if (document.elementFromPoint(x, y)?.matches("canvas.view")) return { x, y };
      return null;
    });
    check(kind === "wasm" && !!c, `the live view stands on the real engine (${kind})`);
    const st = () =>
      page.evaluate(() => {
        const s = window.__viewer.stats();
        return { k: s.k, kMap: s.kMap, zoom: s.zoom ?? 1, frame: s.frame };
      });
    const w0 = await st();
    const outKept = await wheelAt(page, c.x, c.y, { deltaY: 100 });
    const ctrlKept = await wheelAt(page, c.x, c.y, { deltaY: -100, ctrlKey: true });
    const w1 = await st();
    check(
      outKept && ctrlKept && w1.zoom === 1,
      `at 1× a wheel out and ctrl+wheel pass through (zoom ${w1.zoom}, k ${w0.k} → ${w1.k} ${w1.frame})`,
    );
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(0, -100);
    await sleep(250);
    const w2 = await st();
    check(
      w2.k > w0.k && w2.zoom > 1,
      `a wheel notch zooms the live view (k ${w0.k} → ${w2.k}, ${w2.zoom}×)`,
    );
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
    await sleep(300);
    const w3 = await st();
    check(w3.k <= w3.kMap * 2 && w3.k > w2.k, `max zoom bounded (k ${w3.k} ≤ 2 × ${w3.kMap})`);
    const r = await page.evaluate(() => {
      const h = window.__viewer.debugRects().find((q) => q.hero);
      const v = document.querySelector("canvas.view").getBoundingClientRect();
      return h
        ? { in: h.x >= 0 && h.y >= 0 && h.x + h.w <= v.width && h.y + h.h <= v.height }
        : null;
    });
    check(!!r?.in, "zoomed, the tracked hero stays in the picture");
    if (shots) {
      await sleep(1200);
      await page.screenshot({ path: `${shots}/watch-zoom-max.png` });
    }
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 100);
    await sleep(300);
    const w4 = await st();
    check(w4.zoom === 1, `wheel out returns to the default (k ${w4.k}, frame ${w4.frame})`);
    // scene changes: a zoomed live view → the camp (its town at 1×) → the live view again (at 1×)
    await page.mouse.wheel(0, -100);
    await page.mouse.wheel(0, -100);
    await sleep(200);
    const zIn = (await st()).zoom;
    await page.evaluate(() => {
      window.__oldViewer = window.__viewer;
      window.__idlever.go({ kind: "camp" });
    });
    const tz = await until(page, () => window.__town?.stats?.().zoom, 15000);
    check(
      zIn > 1 && tz === 1,
      `the camp after a zoomed live view opens at 1× (${zIn} → town ${tz})`,
    );
    await page.evaluate(() => window.__idlever.go({ kind: "watch" }));
    const wz = await until(
      page,
      () =>
        window.__viewer !== window.__oldViewer &&
        window.__viewer?.stats?.().hero &&
        (window.__viewer.stats().zoom ?? 1),
      15000,
    );
    check(wz === 1, `the live view mounts again at 1× (${wz})`);
    await page.close();
  }
} catch (e) {
  check(false, `threw: ${e.stack ?? e}`);
} finally {
  await browser.close();
}
for (const l of out) console.log(l);
for (const e of errors) console.log(`  ${e}`);
if (errors.length) failed++;
console.log(failed ? `scene-zoom: ${failed} FAIL` : "scene-zoom: PASS");
process.exit(failed ? 1 : 0);
