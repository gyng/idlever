#!/usr/bin/env node
// Cut272 — the town's own-silhouette highlight and diegetic collection (owner 2026-10-18), headless, tools/browser.mjs:
//   hover   — hover and keyboard focus light the sprite (render/town-glow.ts); the hit box paints no fill and no box shadow
//   ready   — what can act now (the Guild's lit order) shimmers: sweep at full; still under reduced motion; outline only at low; none
//             at off (hover still outlines, no glow)
//   task    — a task's tap pulses the sprite (`pulse:mouth`), the DOM ring suppressed (`glow-pulse`)
//   lost    — the GL context lost: the 2D view, the hit target's CSS outline (no fill) stands in
//   chest   — (fake engine) before the Porter: the chest's sprite shimmers, its tap collects (the purse's total as the engine's), coins fly
//   porter  — (fake engine) the Porter hired: a haul landing walks him (fetch → carry → return) and floats `+$N`; reduced motion or
//             effects off skip the walk (the `+$N` alone); gold is the engine's either way
//   node web/tests/town-glow.mjs [--part=hover,ready,task,lost,chest,porter]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";

const root = new URL("../../", import.meta.url);
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const parts = (
  process.argv.find((a) => a.startsWith("--part="))?.slice(7) ??
  "hover,ready,task,lost,chest,porter"
).split(",");
const engine = readFileSync(new URL("./fixtures/earned-gunner-home.json", import.meta.url), "utf8");
const out = [],
  errors = [];
let failed = 0;
const check = (ok, what) => {
  out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser();

/** the earned camp (real wasm); `q` extra URL params, `reduced` the media preference */
async function earned(tag, { q = "", reduced = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
  await page.goto(`${url}?fresh=1&seed=52${q}`);
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90_000 });
  await page.evaluate(async (engine) => {
    const a = window.__idlever;
    if (
      !(await a.importSave(
        JSON.stringify({ v: 2, engine, loadout: [], last_seen: Date.now(), runs: 0 }),
      ))
    )
      throw Error("import");
    await a.refresh();
    a.go({ kind: "camp" });
  }, engine);
  await page.waitForFunction(
    () => !!document.querySelector('.camp .town-hit[data-building="guild"]:not([hidden])'),
    null,
    { timeout: 30_000, polling: 250 },
  );
  await sleep(800);
  return page;
}
const glows = (page) => page.evaluate(() => window.__town.stats().glows);
async function until(page, pred, timeout = 8000, arg) {
  const t = Date.now();
  while (Date.now() - t < timeout) {
    const v = await page.evaluate(pred, arg).catch(() => null);
    if (v) return v;
    await sleep(100);
  }
  return null;
}
const box = (page, id) =>
  page.evaluate((id) => {
    const b = document.querySelector(`.camp .town-hit[data-building="${id}"]`);
    const s = getComputedStyle(b);
    return {
      glow: b.classList.contains("glow-sprite"),
      bg: s.backgroundColor,
      shadow: s.boxShadow,
      outline: s.outlineStyle,
    };
  }, id);
const noFill = (s) => /rgba\(0, 0, 0, 0\)|transparent/.test(s.bg) && s.shadow === "none";

try {
  if (parts.includes("hover")) {
    const page = await earned("hover");
    await page.locator('.camp .town-hit[data-building="blacksmith"]').hover({ force: true });
    await sleep(400);
    const g = await glows(page),
      s = await box(page, "blacksmith");
    check(
      g.includes("hover:blacksmith") && s.glow && noFill(s) && s.outline === "none",
      `hover lights the Forge's silhouette, the box unpainted (${g.join(",")} · ${s.bg} · ${s.shadow} · ${s.outline})`,
    );
    await page.mouse.move(2, 2);
    await sleep(300);
    check(
      !(await glows(page)).some((x) => x.startsWith("hover:")),
      "the pointer gone, the outline goes",
    );
    // keyboard: focus-visible on a hit target lights its sprite (the outline is the focus indicator)
    await page.evaluate(() =>
      document.querySelector(".camp .town-hit[data-building='bank']").blur(),
    );
    await page.locator('.camp .town-hit[data-building="tent"]').focus();
    await page.keyboard.press("Tab");
    await sleep(300);
    const f = await page.evaluate(() => ({
      id: document.activeElement?.dataset?.building,
      vis: document.activeElement?.matches(":focus-visible"),
    }));
    const fg = await glows(page);
    check(
      f.vis && fg.includes(`hover:${f.id}`),
      `keyboard focus lights ${f.id}'s sprite (${fg.join(",")})`,
    );
    await page.close();
  }

  if (parts.includes("ready")) {
    for (const [q, reduced, want, label] of [
      ["", false, (g) => g.includes("ready:guild~"), "full: the sweep and the glow"],
      ["", true, (g) => g.includes("ready:guild"), "reduced motion: steady, no sweep"],
      ["&effects=low", false, (g) => g.includes("ready:guild-"), "low: a static outline, no glow"],
      ["&effects=off", false, (g) => !g.some((x) => x.startsWith("ready:")), "off: no ready glow"],
    ]) {
      const page = await earned(`ready${q}`, { q, reduced });
      const g = await glows(page);
      const markers = await page.evaluate(
        () => document.querySelector('.camp .town-hit[data-building="guild"]').dataset.markers,
      );
      check(
        want(g) && /rune/.test(markers),
        `ready Guild ${label}; the lantern stays (${g.join(",")} · ${markers})`,
      );
      if (q === "&effects=off") {
        await page.locator('.camp .town-hit[data-building="bank"]').hover({ force: true });
        await sleep(300);
        const h = await glows(page);
        check(h.includes("hover:bank-"), `off: hover still outlines, no glow (${h.join(",")})`);
      }
      await page.close();
    }
  }

  if (parts.includes("task")) {
    const page = await earned("task");
    await page.locator('.task-entry[data-entry-id="delve"]').click();
    await sleep(250);
    const r = await page.evaluate(() => {
      const b = document.querySelector('main.camp .town-hit[data-building="mouth"]');
      const s = getComputedStyle(b);
      return {
        point: b.classList.contains("task-point"),
        pulse: b.classList.contains("glow-pulse"),
        outline: s.outlineStyle,
        shadow: s.boxShadow,
        glows: window.__town.stats().glows,
      };
    });
    check(
      r.point &&
        r.pulse &&
        r.outline === "none" &&
        r.shadow === "none" &&
        r.glows.includes("pulse:mouth"),
      `the task's tap pulses the mouth's own sprite, no DOM ring (${JSON.stringify(r)})`,
    );
    await sleep(2700);
    check(!(await glows(page)).some((x) => x.startsWith("pulse:")), "two pulses, then gone");
    await page.close();
  }

  if (parts.includes("lost")) {
    const page = await earned("lost");
    await page.evaluate(() =>
      document
        .querySelector(".town-gl")
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext(),
    );
    await until(page, () => window.__town.stats().mode === "2d");
    await sleep(500);
    await page.locator('.camp .town-hit[data-building="blacksmith"]').hover({ force: true });
    await sleep(300);
    const s = await box(page, "blacksmith");
    check(
      !s.glow && s.outline === "solid" && noFill(s),
      `GL lost: the hit box's CSS outline stands in, never a filled box (${JSON.stringify(s)})`,
    );
    await page.close();
  }

  // ---- fake engine: the chest before the Porter, the Porter's errand after
  const fake = async (tag, { reduced = false, q = "" } = {}) => {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    page.on("pageerror", (e) => errors.push(`${tag} pageerror: ${e.message}`));
    await page.goto(`${url}?dev=1&engine=fake&fresh=1&seed=7&juice=1${q}`, {
      waitUntil: "domcontentloaded",
    });
    await until(
      page,
      () => window.__idlever?.booted && ["camp", "report"].includes(window.__idlever.screen),
      60_000,
    );
    return page;
  };
  const withState = (page, fn) =>
    page.evaluate(async (src) => {
      const r = window.__idlever;
      const e = JSON.parse(await r.engine.save());
      e.st305 ??= {
        hired: ["quartermaster"],
        counts: {},
        chest: 0,
        sent: false,
        paused: [],
        acted: [],
      };
      new Function("e", `(${src})(e)`)(e);
      r.lineage = await r.engine.load(JSON.stringify(e));
      await r.refresh();
      r.go({ kind: "camp" });
    }, String(fn));
  /** cut305's heir-1 lineage with nothing earned and a fresh works tree, then the camp */
  const fresh = (page) =>
    page.evaluate(async () => {
      const r = window.__idlever;
      const e = JSON.parse(await r.engine.save());
      Object.assign(e.lineage, {
        heir: 1,
        chronicle: [],
        unlocks: ["tame"],
        marks: 0,
        gold: 0,
        gold_ledger: [],
        graveyard: [],
        vault: [],
        forge: {},
        party: [],
        kennel: [],
        eggs: [],
        rank: 0,
        renown: 0,
        best_depth: 0,
        trophies: [],
        trait_offer: [],
        class_offer: [],
        supplies: [{ id: 100000, kind: "leash", known: true, label: "leash", free: true }],
      });
      delete e.st305;
      r.lineage = await r.engine.load(JSON.stringify(e));
      await r.refresh();
      r.go({ kind: "camp" });
      for (const k of Object.keys(localStorage))
        if (k.startsWith("idlever.town.")) localStorage.removeItem(k);
    });
  const camp = (page) =>
    until(
      page,
      () =>
        window.__idlever.screen === "camp" &&
        window.__town &&
        document.querySelector(".camp .town-hit:not([hidden])"),
      20_000,
    );

  if (parts.includes("chest")) {
    const page = await fake("chest");
    await fresh(page);
    await camp(page);
    await withState(page, (e) => {
      e.lineage.gold = (e.lineage.gold ?? 0) + 34;
      e.st305.chest = 34;
    });
    await camp(page);
    await sleep(600);
    const g = await glows(page);
    const before = await page.evaluate(() => ({
      gold: window.__idlever.lineage.gold,
      chest: window.__idlever.lineage.tree?.chest,
      count: document.querySelector('.town-hit[data-building="chest"] .town-count')?.textContent,
    }));
    check(
      g.includes("ready:chest~") && before.chest === 34,
      `a waiting haul shimmers on the chest's sprite, its count badge ${before.count} (${g.join(",")})`,
    );
    await page.evaluate(() => {
      window.__coins = 0;
      new MutationObserver((l) => {
        for (const m of l)
          for (const n of m.addedNodes)
            if (n.classList?.contains("coin-flight")) {
              window.__coins++;
              window.__coinAt ??= [parseFloat(n.style.left), parseFloat(n.style.top)];
            }
      }).observe(document.body, { childList: true });
    });
    const chestAt = await page.evaluate(() => {
      const r = document.querySelector('.town-hit[data-building="chest"]').getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    await page.locator('.town-hit[data-building="chest"]').click();
    await until(page, () => window.__idlever.lineage.tree?.chest === 0, 5000);
    await sleep(300);
    const after = await page.evaluate(() => ({
      gold: window.__idlever.lineage.gold,
      engineGold: null,
      coins: window.__coins,
      coinAt: window.__coinAt,
    }));
    const engineGold = await page.evaluate(
      async () => JSON.parse(await window.__idlever.engine.save()).lineage.gold,
    );
    check(
      after.gold === engineGold &&
        after.coins > 0 &&
        Math.hypot(after.coinAt[0] - chestAt[0], after.coinAt[1] - chestAt[1]) < 12,
      `the chest's tap collects (purse $${before.gold} → $${after.gold}, the engine's $${engineGold}); ${after.coins} coins fly from the chest (${after.coinAt} ~ ${chestAt.map(Math.round)}) to the purse`,
    );
    await page.close();
  }

  if (parts.includes("porter")) {
    for (const [tag, opt, walk] of [
      ["walk", {}, true],
      ["reduced", { reduced: true }, false],
      ["off", { q: "&effects=off" }, false],
    ]) {
      const page = await fake(`porter-${tag}`, opt);
      await fresh(page);
      await camp(page);
      await withState(page, (e) => {
        e.st305.hired.push("porter");
        e.lineage.gold_ledger ??= [];
      });
      await camp(page);
      await sleep(600);
      const g0 = await page.evaluate(() => window.__idlever.lineage.gold);
      // a haul lands (the engine's ledger moved: a banked exit) while the camp stands
      await page.evaluate(() => {
        const a = window.__idlever,
          L = a.lineage;
        a.lineage = {
          ...L,
          gold: L.gold + 57,
          gold_ledger: [...(L.gold_ledger ?? []), { t: Date.now(), delta: 57, why: "banked D4" }],
        };
        a.emitChange();
      });
      const seen = [];
      const t0 = Date.now();
      let float = false;
      while (Date.now() - t0 < 40_000) {
        const s = await page.evaluate(() => ({
          h: window.__town.stats().hauling,
          n: window.__town.stats().hauls,
          f: document.querySelector(".town-haul-float")?.textContent ?? null,
        }));
        if (s.h && seen[seen.length - 1] !== s.h) seen.push(s.h);
        if (s.f === "+$57") float = true;
        if (float && !s.h) break;
        await sleep(100);
      }
      const n = await page.evaluate(() => window.__town.stats().hauls);
      const gold = await page.evaluate(() => window.__idlever.lineage.gold);
      if (walk)
        check(
          n === 1 && seen.join(">") === "fetch>carry>return" && float && gold === g0 + 57,
          `porter hired: a haul walks him (${seen.join(" → ")}), \`+$57\` floats; gold $${g0} → $${gold}, the ledger's`,
        );
      else
        check(
          n === 0 && !seen.length && float && gold === g0 + 57,
          `${tag}: no walk (${n} errands), the \`+$57\` alone; gold $${g0} → $${gold}`,
        );
      await page.close();
    }
  }
} catch (e) {
  check(false, `threw: ${e.stack ?? e}`);
} finally {
  await browser.close();
}
for (const e of errors) out.push(`ERR  ${e}`);
console.log(out.join("\n"));
console.log(failed ? `town-glow: ${failed} FAILED` : "town-glow: ok");
process.exit(failed || errors.length ? 1 : 0);
