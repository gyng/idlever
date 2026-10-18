#!/usr/bin/env node
// Cut262 — town UX (owner 2026-10-18), headless, real wasm (the earned fixture), tools/browser.mjs:
//   legacy — the Legacy (and ranks) order lives at the Guild reception, the building whose workers carry it out: no camp chip row; the
//            Guild's lantern and a ≤ 3-word toast announce it; its works sheet marks the order's row and a chip there sets it.
//   tasks  — a task that can be completed now is marked (`data-can`); its tap rings the building or control that completes it
//            (`.task-point`) instead of opening the Journal; at 402×681 the Menu's list closes onto the ring.
//   shift  — desktop camp remounts never place a town hit target at the scene's corner first (a layout shift per remount).
//   titles — owner "i'm getting native tooltips in addition to html tooltips": while the HTML plate answers a hover, no element under
//            the pointer keeps a `title` (the browser's own popup); the titles return when the pointer leaves.
//   node web/tests/town-ux.mjs [--part=legacy,tasks,shift,titles]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";

const root = new URL("../../", import.meta.url);
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const parts = (
  process.argv.find((a) => a.startsWith("--part="))?.slice(7) ?? "legacy,tasks,shift,titles"
).split(",");
const engine = readFileSync(new URL("./fixtures/earned-gunner-home.json", import.meta.url), "utf8");
const out = [],
  errors = [];
let failed = 0;
const check = (ok, what) => {
  out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};
const browser = await launchBrowser();

async function earned(tag, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput)
          window.__shifts.push({
            v: e.value,
            src: (e.sources ?? []).map((s) => s.node?.className?.toString?.() ?? ""),
          });
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${url}?fresh=1&seed=52`);
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90_000 });
  await page.evaluate(async (engine) => {
    const a = window.__idlever;
    for (const k of Object.keys(localStorage))
      if (k.startsWith("idlever.offers.")) localStorage.removeItem(k);
    if (
      !(await a.importSave(
        JSON.stringify({ v: 2, engine, loadout: [], last_seen: Date.now(), runs: 0 }),
      ))
    )
      throw Error("import");
    await a.refresh();
    a.go({ kind: "camp" });
  }, engine);
  // (polled on a timer: a busy headless page can starve the rAF polling of a visibility wait)
  await page.waitForFunction(
    () => !!document.querySelector('.camp .town-hit[data-building="guild"]:not([hidden])'),
    null,
    { timeout: 30_000, polling: 250 },
  );
  await page.waitForTimeout(600);
  return page;
}
const closeSheets = async (page) => {
  for (let i = 0; i < 4 && (await page.locator(".sheet-wrap").count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
};

try {
  if (parts.includes("legacy")) {
    const page = await earned("legacy");
    const s = await page.evaluate(() => {
      const g = document.querySelector('.camp .town-hit[data-building="guild"]');
      return {
        row: document.querySelectorAll(".order-offer").length,
        legacy: window.__idlever.lineage.orders?.legacy,
        offer: g?.dataset.offer,
        markers: g?.dataset.markers,
        label: g?.getAttribute("aria-label"),
        toast: document.body.dataset.toast,
      };
    });
    check(s.row === 0, `no Legacy chip row over the camp (${s.row})`);
    check(
      s.legacy === "off" && s.offer === "legacy" && /rune/.test(s.markers ?? ""),
      `the Guild reception's lantern announces the Legacy order (${s.offer} · ${s.markers} · "${s.label}")`,
    );
    check(
      s.toast === "Legacy · Guild" && s.toast.split(/\s+/).filter((w) => /\w/.test(w)).length <= 3,
      `at most a ≤ 3-word toast points to the building ("${s.toast}")`,
    );
    await page.locator('.camp .town-hit[data-building="guild"]').click({ force: true });
    await page.waitForSelector(".works-sheet .guild-orders", {
      state: "attached",
      timeout: 20_000,
    });
    const sheet = await page.evaluate(() => ({
      row: !!document.querySelector(
        '.works-sheet .guild-order[data-order="legacy"][data-offer="legacy"]',
      ),
      chips: [...document.querySelectorAll('.guild-order[data-order="legacy"] [data-legacy]')].map(
        (b) => b.dataset.legacy,
      ),
      more: !!document.querySelector(".guild-orders [data-orders-more]"),
    }));
    check(
      sheet.row && sheet.chips.join(",") === "balanced,health,damage,armour,off" && sheet.more,
      `the Guild's works sheet holds the marked Legacy row (${sheet.chips.join(",")}) and Run setup`,
    );
    await page.locator('.guild-order[data-order="legacy"] [data-legacy="health"]').click();
    await page
      .waitForFunction(() => window.__idlever.lineage.orders?.legacy === "health", null, {
        timeout: 5000,
      })
      .catch(() => {});
    const after = await page.evaluate(() => ({
      legacy: window.__idlever.lineage.orders?.legacy,
      pressed: document
        .querySelector('.guild-order[data-order="legacy"] [data-legacy="health"]')
        ?.getAttribute("aria-pressed"),
    }));
    check(
      after.legacy === "health" && after.pressed === "true",
      `a chip there sets the order (${after.legacy} · pressed ${after.pressed})`,
    );
    await closeSheets(page);
    const lantern = await page.evaluate(
      () => document.querySelector('.camp .town-hit[data-building="guild"]')?.dataset.offer,
    );
    check(lantern !== "legacy", `the lantern goes out once seen (${lantern || "none"})`);
    await page.close();
  }

  if (parts.includes("tasks")) {
    const page = await earned("tasks");
    const list = () =>
      page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll(".task-entry[data-entry-id]")].map((e) => [
            e.dataset.entryId,
            { can: e.dataset.can, surface: e.dataset.surface },
          ]),
        ),
      );
    let t = await list();
    check(
      t.bloodlines?.can === "true" && t.bloodlines?.surface === ".hero-roster .hero-add",
      `an affordable task is marked completable (${JSON.stringify(t.bloodlines)})`,
    );
    check(
      t.delve?.can === "true" && t.delve?.surface === "mouth",
      `a ready task names its building (${JSON.stringify(t.delve)})`,
    );
    const style = await page.evaluate(() => {
      const e = document.querySelector('.task-entry[data-can="true"] .task-pip');
      return e ? getComputedStyle(e).backgroundColor : "";
    });
    check(!!style && style !== "rgba(0, 0, 0, 0)", `its pip fills (${style})`);
    // not affordable: the mark goes (the gold read from the wire, repainted on change)
    await page.evaluate(() => {
      const a = window.__idlever;
      a.lineage.gold = 0;
      a.emitChange();
    });
    await page.waitForTimeout(300);
    const poor = await page.evaluate(
      () => document.querySelector('.task-entry[data-entry-id="bloodlines"]')?.dataset.can,
    );
    check(poor === "false", `an unaffordable task is not marked (${poor})`);
    await page.evaluate(() => window.__idlever.refresh());
    await page.waitForTimeout(300);
    for (const [id, sel] of [
      ["delve", '.town-hit[data-building="mouth"]'],
      ["bloodlines", ".hero-roster .hero-add"],
    ]) {
      await page.locator(`.task-entry[data-entry-id="${id}"]`).click();
      const r = await page.evaluate(
        (sel) => ({
          ring: !!document.querySelector(`main.camp ${sel}.task-point`),
          n: document.querySelectorAll(".task-point").length,
          sheet: document.querySelectorAll(".sheet-wrap").length,
          screen: window.__idlever.screen,
        }),
        sel,
      );
      check(
        r.ring && r.n === 1 && r.sheet === 0 && r.screen === "camp",
        `tapping "${id}" rings ${sel} and opens nothing (${JSON.stringify(r)})`,
      );
    }
    await page.close();

    // phone (402×681): the list lives in the Menu; a tap closes it onto the ring
    const phone = await earned("tasks-phone", phoneReviewViewport());
    await phone.locator('[aria-label="Menu"]').first().click();
    await phone.waitForTimeout(600);
    const summary = phone.locator(".home-menu-panel .task-summary");
    if (await summary.count()) {
      const open = await phone.evaluate(
        () => document.querySelector(".home-menu-panel .task-fold")?.open,
      );
      if (!open) await summary.first().click();
      await phone.waitForTimeout(300);
    }
    const entry = phone.locator('.home-menu-panel .task-entry[data-entry-id="delve"]');
    if (await entry.count()) {
      await entry.first().click();
      const r = await phone.evaluate(() => ({
        ring: !!document.querySelector('main.camp .town-hit[data-building="mouth"].task-point'),
        sheet: document.querySelectorAll(".sheet-wrap").length,
      }));
      check(
        r.ring && r.sheet === 0,
        `402×681: the Menu closes onto the ring (${JSON.stringify(r)})`,
      );
    } else check(false, "402×681: the Menu lists the Delve task");
    await phone.close();
  }

  if (parts.includes("shift")) {
    const page = await earned("shift");
    await page.evaluate(() => {
      window.__shifts = [];
      const a = window.__idlever;
      a.go({ kind: "watch" });
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__shifts = [];
      window.__idlever.go({ kind: "camp" });
    });
    await page.waitForTimeout(2500);
    const hits = await page.evaluate(() =>
      window.__shifts
        .filter((s) => s.src.some((c) => /town-hit/.test(c)))
        .reduce((n, s) => n + s.v, 0),
    );
    check(hits === 0, `a camp remount places its hit targets without a layout shift (${hits})`);
    await page.close();
  }
  if (parts.includes("titles")) {
    const page = await earned("titles");
    const hosts = await page.evaluate(() =>
      [...document.querySelectorAll("main.camp [title]")]
        .filter(
          (e) =>
            e.closest("[data-detail-tip], .kw, [data-kwh]") &&
            e.getClientRects().length &&
            !e.hidden,
        )
        .slice(0, 4)
        .map((e, i) => {
          e.dataset.titleProbe = String(i);
          return { i, title: e.getAttribute("title") };
        }),
    );
    check(hosts.length > 0, `titled tip hosts on the camp (${hosts.length})`);
    for (const { i, title } of hosts) {
      const box = await page.locator(`[data-title-probe="${i}"]`).boundingBox();
      if (!box) continue;
      await page.mouse.move(1, 1);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const opened = await page
        .waitForFunction(() => !!document.querySelector("#kw-tip:not([hidden])"), null, {
          timeout: 8000,
          polling: 100,
        })
        .then(() => true)
        .catch(() => false);
      const during = await page.evaluate((i) => {
        const at = document.querySelector(`[data-title-probe="${i}"]`);
        const titled = [];
        for (let e = at; e && e !== document.body; e = e.parentElement)
          if (e.hasAttribute("title")) titled.push(e.tagName);
        return titled;
      }, i);
      await page.mouse.move(1, 1);
      await page.waitForTimeout(200);
      const back = await page.evaluate(
        (i) => document.querySelector(`[data-title-probe="${i}"]`)?.getAttribute("title"),
        i,
      );
      check(
        opened && during.length === 0 && back === title,
        `"${title}": the plate shows with no native title under the pointer; it returns after (${opened} · ${during.join(",") || "none"} · ${back})`,
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
}
for (const l of out) console.log(l);
for (const e of errors) console.log(`FAIL ${e}`);
if (failed || errors.length) {
  console.log(`town-ux: ${failed + errors.length} failed`);
  process.exit(1);
}
console.log(`town-ux: ${out.length} checks PASS`);
