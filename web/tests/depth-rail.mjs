#!/usr/bin/env node
// Cut234 (package report #6): the watch's depth rail at phone width. Below 1024 px it starts as a slim
// strip (floor ticks, the hero's dot, the next boss); a tap or Enter widens it to the desk rail, its
// slim tab narrows it again, and the choice survives a reload (per viewer, localStorage). The desk
// rail is unchanged. Gates: the strip's share of the watch canvas, its labels, the 44 px targets.
//   node web/tests/depth-rail.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";

const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
let n = 0;
const ok = (v, what) => {
  assert.ok(v, what);
  n++;
};
const b = await launchBrowser();
const errors = [];
/** Canvas coverage of the rail (and its tab), in the page. */
const COVER = () => {
  const c = document.querySelector(".watch canvas").getBoundingClientRect();
  let cov = 0;
  for (const s of [".watch-depth-map", ".depth-map-fold"]) {
    const e = document.querySelector(s);
    if (!e || e.hidden) continue;
    const d = e.getBoundingClientRect();
    cov +=
      Math.max(0, Math.min(c.right, d.right) - Math.max(c.left, d.left)) *
      Math.max(0, Math.min(c.bottom, d.bottom) - Math.max(c.top, d.top));
  }
  const m = document.querySelector(".watch-depth-map");
  const summary = m.querySelector("summary");
  return {
    share: cov / (c.width * c.height),
    width: m.getBoundingClientRect().width,
    slim: m.classList.contains("depth-map-slim"),
    fold: !document.querySelector(".depth-map-fold").hidden,
    label: summary.getAttribute("aria-label"),
    expanded: summary.getAttribute("aria-expanded"),
    open: m.open,
    stored: localStorage.getItem("idlever.depthRail"),
    summary: [summary.getBoundingClientRect().width, summary.getBoundingClientRect().height],
  };
};
async function watch(p, width, fresh = true) {
  await p.setViewportSize({ width, height: 800 });
  await p.goto(`${url}?dev=1${fresh ? "&fresh=1" : ""}&runs=0&seed=234`);
  await p.waitForFunction(() => window.__idlever?.booted);
  await p.evaluate(async () => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.lineage.town?.home === false) await a.engine.buildTown("house");
    if (!a.lineage.live) await a.engine.send();
    await a.refresh?.();
    a.go({ kind: "watch" });
  });
  await p.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
  await p.waitForFunction(() =>
    /D\d+/.test(document.querySelector(".depth-map-current").textContent),
  );
}
try {
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  const record = {};
  for (const width of [320, 400, 768, 1440]) {
    await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=234`);
    await p.evaluate(() => localStorage.removeItem("idlever.depthRail"));
    await watch(p, width);
    const r = await p.evaluate(COVER);
    record[width] = +(100 * (1 - r.share)).toFixed(1);
    ok(/^Depth map: D\d+/.test(r.label), `${width}: label ${r.label}`);
    if (width < 1024) {
      ok(r.slim && !r.fold && r.width <= 32, `${width}: slim ${JSON.stringify(r)}`);
      ok(r.share <= 0.035, `${width}: strip covers ${(100 * r.share).toFixed(1)}%`);
      ok(r.summary[1] >= 44 && r.expanded === "false", `${width}: strip target`);
    } else {
      ok(!r.slim && !r.fold && r.width === 80, `${width}: desk rail unchanged`);
      ok(r.share <= 0.03, `${width}: desk share`);
    }
  }
  // tap widens; the slim tab narrows; the choice persists through a reload
  await watch(p, 400);
  await p.evaluate(() => localStorage.removeItem("idlever.depthRail"));
  await watch(p, 400);
  await p.locator(".watch-depth-map summary").tap();
  let r = await p.evaluate(COVER);
  ok(!r.slim && r.fold && !r.open && r.width === 80 && r.stored === "full", "tap widens");
  const tab = await p.locator(".depth-map-fold").boundingBox();
  ok(tab.width >= 24 && tab.height >= 44, `slim tab target ${tab.width}×${tab.height}`);
  ok(
    (await p.locator(".depth-map-fold").getAttribute("aria-label")) === "Slim map",
    "tab is labelled",
  );
  await p.reload();
  await watch(p, 400, false);
  r = await p.evaluate(COVER);
  ok(!r.slim && r.fold && r.stored === "full", "wide survives reload");
  // the wide rail still opens its inspection list; Escape closes it
  await p.locator(".watch-depth-map summary").tap();
  r = await p.evaluate(COVER);
  ok(r.open && r.expanded === "true", "wide rail opens the list");
  ok(!(await p.locator(".depth-map-fold").isVisible()), "tab yields to the list");
  await p.keyboard.press("Escape");
  ok(!(await p.evaluate(COVER)).open, "Escape closes the list");
  await p.locator(".depth-map-fold").tap();
  r = await p.evaluate(COVER);
  ok(r.slim && !r.fold && r.stored === "slim", "tab narrows");
  ok(
    await p.evaluate(() => document.activeElement?.matches(".watch-depth-map summary")),
    "focus returns to the strip",
  );
  // keyboard: Enter on the focused strip widens it
  await p.keyboard.press("Enter");
  r = await p.evaluate(COVER);
  ok(!r.slim && r.stored === "full" && !r.open, "Enter widens");
  // crossing the desk width: the desk rail never shows the tab, the phone keeps the choice
  await p.setViewportSize({ width: 1440, height: 800 });
  await p.waitForFunction(() => matchMedia("(min-width: 1024px)").matches);
  r = await p.evaluate(COVER);
  ok(!r.slim && !r.fold, "desk ignores the phone choice");
  await p.evaluate(() => localStorage.setItem("idlever.depthRail", "slim"));
  await p.setViewportSize({ width: 400, height: 800 });
  await p
    .waitForFunction(
      () => document.querySelector(".watch-depth-map").classList.contains("depth-map-slim"),
      null,
      { timeout: 3000 },
    )
    .catch(() => {});
  r = await p.evaluate(COVER);
  ok(r.slim, "phone width re-reads the choice");
  // controlled marks: the next boss keeps its notch on the strip; every stop stays in the list
  const marks = await p.evaluate(async () => {
    const { createDepthMap } = await import("/src/ui/depth-map.ts");
    localStorage.setItem("idlever.depthRail", "slim");
    const m = createDepthMap();
    document.body.append(m.el, m.fold);
    m.update({
      depth: 7,
      biome: "warrens",
      markers: [
        { depth: 1, kind: "start", label: "Start" },
        { depth: 5, kind: "boss", label: "Ogre" },
        { depth: 6, kind: "waystone", label: "Waystone" },
        { depth: 8, kind: "boss", label: "Warlord" },
        { depth: 9, kind: "bounty", label: "Bounty" },
        { depth: 30, kind: "boss", label: "King" },
      ],
    });
    const next = m.el.querySelector(".depth-map-next");
    const out = {
      slim: m.el.classList.contains("depth-map-slim"),
      next: next?.title,
      nextColor: next && getComputedStyle(next).color,
      labels: [...m.el.querySelectorAll(".depth-map-notch small")].map(
        (x) => getComputedStyle(x).display,
      ),
      dot: !!m.el.querySelector(".depth-map-position"),
      rows: m.el.querySelectorAll(".depth-map-stop").length,
    };
    m.dispose();
    return out;
  });
  ok(marks.slim && marks.next === "D8 Warlord", `next boss ${JSON.stringify(marks)}`);
  ok(marks.labels.every((d) => d === "none") && marks.dot, "strip: glyphs and the dot only");
  ok(marks.rows === 6, "every stop in the list");
  // storage refused: the strip still works (slim default, a tap widens for the session)
  const q = await ctx.newPage();
  q.on("pageerror", (e) => errors.push(e.message));
  await q.goto(`${url}?dev=1&runs=0&seed=234`);
  await q.waitForFunction(() => window.__idlever?.booted);
  const blocked = await q.evaluate(async () => {
    const { createDepthMap } = await import("/src/ui/depth-map.ts");
    const S = Storage.prototype,
      get = S.getItem,
      set = S.setItem;
    S.getItem = function (k) {
      if (k === "idlever.depthRail") throw new DOMException("denied", "SecurityError");
      return get.call(this, k);
    };
    S.setItem = function (k, v) {
      if (k === "idlever.depthRail") throw new DOMException("denied", "SecurityError");
      return set.call(this, k, v);
    };
    try {
      const m = createDepthMap();
      document.body.append(m.el, m.fold);
      m.update({ depth: 3, biome: "warrens", markers: [] });
      const before = m.el.classList.contains("depth-map-slim");
      m.el.querySelector("summary").click();
      const after = m.el.classList.contains("depth-map-slim");
      m.dispose();
      return { before, after };
    } finally {
      S.getItem = get;
      S.setItem = set;
    }
  });
  ok(
    blocked.before && !blocked.after,
    `refused storage: slim default, a tap widens ${JSON.stringify(blocked)}`,
  );
  console.log(
    `depth-rail: ${n} checks PASS; unobscured watch % ${JSON.stringify(record)} (real WASM)`,
  );
  assert.deepEqual(errors, []);
} finally {
  await b.close();
}
