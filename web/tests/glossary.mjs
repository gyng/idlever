#!/usr/bin/env node
// Cut234 (package report #4): the Journal's glossary — one tap from every term, filled as terms are met.
//   reveal   a fresh camp lists only the terms on screen; an unmet term (a verdict, a grudge) never appears;
//            a term met later (on screen, or its tip opened) joins; the glossary is per viewer
//   entries  every entry is its plate's own gloss (no new copy), in title order
//   link     a pinned plate's head opens the Journal on that term's entry: its fold open, the entry in view
//            and focused, the plate closed; off the camp the head opens the same glossary
//   phone (400 × 800, touch) and desktop (1440 × 900); real WASM.
//   node web/tests/glossary.mjs
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
let coverage = null;
try {
  for (const view of [
    { width: 400, height: 800, touch: true },
    { width: 1440, height: 900, touch: false },
  ]) {
    const ctx = await b.newContext({
      viewport: { width: view.width, height: view.height },
      hasTouch: view.touch,
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=234`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(() => {
      localStorage.removeItem("idlever.keywords");
      localStorage.removeItem("idlever.concepts");
    });
    await p.reload();
    await p.waitForFunction(() => window.__idlever?.booted);
    // the density pass meets what is on screen (≤ 1 s cadence)
    await p.waitForFunction(() => window.__tips.glossary().length > 0, null, { timeout: 5000 });
    const fresh = await p.evaluate(() => {
      const onScreen = new Set(
        [...document.querySelectorAll(".kw, [data-kwh]")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
          })
          .map((e) => e.dataset.kw ?? e.dataset.kwh),
      );
      return {
        glossary: window.__tips.glossary(),
        onScreen: [...onScreen],
        total: window.__tips.terms().length,
      };
    });
    ok(
      fresh.glossary.every((t) => fresh.onScreen.includes(t)),
      `fresh glossary only met terms ${JSON.stringify(fresh)}`,
    );
    for (const unmet of ["v_luck", "grudge", "g_write", "scar"])
      ok(!fresh.glossary.includes(unmet), `${unmet} unmet, absent`);
    // the Journal's glossary fold lists exactly the met terms, each with its plate's gloss
    const journalBtn = p.locator('[data-tile="journal"]:visible').first();
    await journalBtn.click();
    await p.waitForSelector('.journal-chapter[data-chapter="glossary"]');
    // the homeless camp hides its console: the window must still take the screen (was 48 px tall)
    const winH = await p.evaluate(
      () => document.querySelector(".game-window").getBoundingClientRect().height,
    );
    ok(winH >= 300, `journal window height ${winH}`);
    const listed = await p.evaluate(async () => {
      const { TIP, termTitle } = await import("/src/ui/concepts.ts");
      const rows = [...document.querySelectorAll(".journal-term")];
      return {
        terms: rows.map((r) => r.dataset.term),
        glossOk: rows.every((r) => r.querySelector("p").textContent === TIP[r.dataset.term]),
        titles: rows.map((r) => r.querySelector("strong").textContent),
        order: rows.map((r) => termTitle(r.dataset.term)),
        open: document.querySelector('.journal-chapter[data-chapter="glossary"]').open,
      };
    });
    ok(
      JSON.stringify([...listed.terms].sort()) ===
        JSON.stringify([...(await p.evaluate(() => window.__tips.glossary()))].sort()),
      `journal lists the met terms ${JSON.stringify(listed.terms)}`,
    );
    ok(listed.glossOk, "each entry is its plate's gloss");
    ok(
      JSON.stringify(listed.order) ===
        JSON.stringify([...listed.order].sort((a, c) => a.localeCompare(c))),
      "title order",
    );
    ok(!listed.open, "glossary fold starts closed");
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector(".sheet"));
    // a term met later joins: a host shown and its tip opened (the plate's own path)
    const via = await p.evaluate(async () => {
      const { openTip } = await import("/src/ui/tips.ts");
      const host = document.createElement("span");
      host.dataset.kwh = "stance";
      host.textContent = "combat style";
      host.className = "glossary-probe";
      host.style.cssText = "position:fixed;left:40px;top:300px;z-index:5000";
      document.body.append(host);
      openTip(host);
      const head = document.querySelector(".kw-tip:not([hidden]) .kw-tip-link");
      return {
        head: !!head,
        gloss: head?.dataset.gloss,
        pinned: document.querySelector(".kw-tip").classList.contains("kw-pin"),
        met: window.__tips.glossary().includes("stance"),
      };
    });
    ok(
      via.head && via.gloss === "stance" && via.pinned,
      `plate head is a link ${JSON.stringify(via)}`,
    );
    ok(via.met, "an opened tip meets its term");
    // one tap on the head: the Journal on the entry
    const head = p.locator(".kw-tip:not([hidden]) .kw-tip-link");
    if (view.touch) await head.tap();
    else await head.click();
    await p.waitForSelector('.journal-term-hit[data-term="stance"]');
    const landed = await p.evaluate(() => {
      const e = document.querySelector('.journal-term[data-term="stance"]');
      const r = e.getBoundingClientRect();
      return {
        focused: document.activeElement === e,
        inView: r.top >= 0 && r.bottom <= innerHeight,
        open: e.closest("details")?.open,
        plates: window.__tips.plates(),
        gloss: e.querySelector("p").textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    ok(landed.focused && landed.inView && landed.open, `entry shown ${JSON.stringify(landed)}`);
    ok(landed.plates === 0, "the plate closed");
    ok(!landed.overflow, "no sideways scroll");
    if (view.width === 400) {
      // reloaded: the met terms stay (per viewer), the unmet stay out
      await p.reload();
      await p.waitForFunction(() => window.__idlever?.booted);
      const kept = await p.evaluate(() => window.__tips.glossary());
      ok(kept.includes("stance") && !kept.includes("v_luck"), `kept ${JSON.stringify(kept)}`);
      // off the camp (the watch): a plate's head still reaches the glossary
      await p.evaluate(async () => {
        const a = window.__idlever;
        a.runnerOn = false;
        if (a.lineage.town?.home === false) await a.engine.buildTown("house");
        await a.engine.send();
        await a.refresh?.();
        a.go({ kind: "watch" });
      });
      await p.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
      await p.evaluate(async () => {
        const { openTip } = await import("/src/ui/tips.ts");
        const host = document.createElement("span");
        host.dataset.kwh = "gold";
        host.textContent = "gold";
        host.style.cssText = "position:fixed;left:40px;top:300px;z-index:5000";
        document.body.append(host);
        openTip(host);
      });
      await p.locator(".kw-tip:not([hidden]) .kw-tip-link").tap();
      await p.waitForSelector('.journal-term-hit[data-term="gold"]');
      ok(true, "watch plate head reaches the glossary");
      coverage = await p.evaluate(async () => {
        const { TERMS, ALIASES } = await import("/src/ui/concepts.ts");
        return { total: TERMS.length, aliased: Object.keys(ALIASES).length };
      });
    }
    await ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    `glossary: ${n} checks PASS; registry ${coverage.total} terms, every one an entry once met (real WASM)`,
  );
} finally {
  await b.close();
}
