#!/usr/bin/env node
// Cut 270 (docs/CUT270_LIVE_DECISIONS.md): the watch's boss chest on the fake engine (`?decide=1`: a chest at t50 each
// run). Owner 2026-10-22: no live decision is asked any more (the cache, the boss, the hurt record), so the prompt parts are
// gone; the chest reveals and lands in the milestone log, and flags are rate-limited.
// Cut 277: a kill that dropped nothing (`&nodrop=1`) shows no chest and logs none.
//   node web/tests/live-decisions.mjs [--part=chest,nodrop,flags]
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";

const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const part = (process.argv.find((a) => a.startsWith("--part=")) ?? "--part=chest,nodrop,flags")
  .slice(7)
  .split(",");
const out = [];
let failed = 0;
const check = (ok, what) => {
  out.push(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed++;
};
const words = (s) => s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
const b = await launchBrowser();

async function open(viewport, mode = "one", media, extra = "") {
  const p = await b.newPage({ viewport, hasTouch: viewport.width < 600 });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  if (media) await p.emulateMedia(media);
  await p.goto(`${url}?engine=fake&fresh=1&runs=0&seed=3330&decide=1${extra}`);
  await p.waitForFunction(() => window.__idlever?.booted);
  await p.evaluate((m) => {
    const a = window.__idlever;
    // record the engine's events, as the log should read them
    window.__evs = [];
    const step = a.engine.step.bind(a.engine);
    a.engine.step = async (n) => {
      const r = await step(n);
      window.__evs.push(...r.events);
      return r;
    };
    a.watchMode = m;
    a.go({ kind: "watch" });
  }, mode);
  await p.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
  return { p, errors };
}

try {
  if (part.includes("chest")) {
    // the reveal auto-opens: closed → cracked → open, the reward Rust's (the fake's Crownsplitter)
    const { p, errors } = await open({ width: 1440, height: 900 });
    const states = await p.evaluate(
      () =>
        new Promise((res) => {
          const seen = [];
          const t0 = performance.now();
          const tick = () => {
            const c = document.querySelector(".chest-reveal");
            if (c && seen.at(-1) !== c.dataset.state) seen.push(c.dataset.state);
            if (performance.now() - t0 > 60_000 || seen.includes("open"))
              res({
                seen,
                reward: c?.querySelector(".chest-label")?.textContent,
                rarity: c?.dataset.rarity,
              });
            else requestAnimationFrame(tick);
          };
          tick();
        }),
    );
    check(
      states.seen.join(">") === "closed>cracked>open" &&
        states.reward === "Crownsplitter" &&
        states.rarity === "legendary",
      `the chest opens by itself (${states.seen.join(">")} · ${states.reward} · ${states.rarity})`,
    );
    const life = await p.evaluate(
      () =>
        new Promise((res) => {
          const t0 = performance.now();
          const w = () =>
            document.querySelector(".chest-reveal")
              ? requestAnimationFrame(w)
              : res(performance.now() - t0);
          w();
        }),
    );
    check(life <= 3000, `gone inside the kill's beat (${Math.round(life)} ms after open)`);
    // fallback: no art ids → the code primitive (box, lid, ring)
    const prim = await p.evaluate(async () => {
      const m = await import("/src/ui/decide.ts");
      const el = m.chestReveal(
        { t: 1, boss: "lich", title: "Lich", rarity: "rare", items: [], gold: 12 },
        { fast: false, still: false, ids: new Set() },
      );
      return {
        prim: el.querySelectorAll(".chest-prim").length,
        ring: !!el.querySelector(".chest-prim-ring"),
        img: [...el.querySelectorAll("img")].filter((i) => !i.closest(".chest-reward")).length,
        reward: el.querySelector(".chest-reward-line")?.textContent,
      };
    });
    check(
      prim.prim === 3 && prim.ring && prim.img === 0 && prim.reward?.endsWith("+$12"),
      `missing art draws the primitive (${JSON.stringify(prim)})`,
    );
    check(!errors.length, `no page errors (${errors.join(" | ")})`);
    await p.close();
    // reduced motion: the static open chest and the reward at once
    const r = await open({ width: 402, height: 681 }, "one", { reducedMotion: "reduce" });
    await r.p.waitForSelector(".chest-reveal", { timeout: 60_000 });
    const still = await r.p.evaluate(() => {
      const c = document.querySelector(".chest-reveal");
      return {
        still: c.classList.contains("still"),
        state: c.dataset.state,
        sparks: c.querySelectorAll(".spark").length,
        reward: getComputedStyle(c.querySelector(".chest-reward")).opacity,
      };
    });
    check(
      still.still && still.state === "open" && still.sparks === 0 && +still.reward === 1,
      `reduced motion: a still, open chest and its reward (${JSON.stringify(still)})`,
    );
    await r.p.close();
  }
  if (part.includes("nodrop")) {
    // Cut 277 (owner): a boss kill that dropped nothing shows no chest; the run goes on to the next moment
    const { p, errors } = await open({ width: 1440, height: 900 }, "one", undefined, "&nodrop=1");
    await p.evaluate(() => {
      window.__chestSeen = 0;
      new MutationObserver(() => {
        if (document.querySelector(".chest-reveal")) window.__chestSeen++;
      }).observe(document.body, { childList: true, subtree: true });
    });
    // past the empty kill's record (t50)
    await p.waitForFunction(() => +document.querySelector(".watch").dataset.tick >= 60, null, {
      timeout: 60_000,
    });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({
      seen: window.__chestSeen,
      log: (window.__chestLog ?? []).length,
      ms: (window.__msLog ?? []).filter((m) => m.kind === "chest").length,
      tick: +document.querySelector(".watch").dataset.tick,
      boss: document.querySelector(".watch").dataset.chest ?? null,
    }));
    check(
      r.seen === 0 && r.log === 0 && r.ms === 0 && r.boss === null && r.tick >= 50,
      `no drop, no chest (${JSON.stringify(r)})`,
    );
    check(!errors.length, `no page errors (${errors.join(" | ")})`);
    await p.close();
  }
  if (part.includes("flags")) {
    const p = await b.newPage({ viewport: { width: 800, height: 600 } });
    await p.goto(`${url}?engine=fake&fresh=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    const r = await p.evaluate(async () => {
      const m = await import("/src/ui/decide.ts");
      let now = 0;
      const gate = m.flagGate(() => now);
      const shown = [];
      // a burst: every kind every 400 ms for two minutes
      const kinds = ["low", "close", "rare", "decision", "record", "chest", "boss"];
      for (let i = 0; i < 300; i++) {
        now = i * 400;
        const k = kinds[i % kinds.length];
        if (gate(k)) shown.push({ t: now, k });
      }
      // (a boss may cut into the gap over a lower flag)
      const gaps = shown
        .slice(1)
        .filter((s) => s.k !== "boss")
        .map((s) => s.t - shown[shown.indexOf(s) - 1].t);
      let perMin = 0;
      for (const s of shown)
        perMin = Math.max(perMin, shown.filter((x) => x.t >= s.t && x.t < s.t + 60_000).length);
      // a higher kind inside the gap replaces a lower one
      let t = 0;
      const g2 = m.flagGate(() => t);
      const a = g2("low");
      t = 500;
      const bss = g2("boss");
      t = 900;
      const again = g2("low");
      const looks = Object.values(m.FLAG_LOOK).every((l) => l.icon && l.glyph && l.tone);
      return { n: shown.length, minGap: Math.min(...gaps), perMin, a, bss, again, looks };
    });
    check(r.perMin <= 6, `≤ 6 flags a minute in a burst (${r.perMin})`);
    check(
      r.minGap >= 2500 || r.n <= 1,
      `≥ 2.5 s between flags unless a boss cuts in (${r.minGap} ms)`,
    );
    check(
      r.a && r.bss && !r.again,
      `a boss replaces a low-hp flag inside the gap; the lower one waits (${JSON.stringify(r)})`,
    );
    check(r.looks, "every flag kind has an icon, a glyph and a tint");
    // the watch's own flags: ≤ 3 words each
    const { p: w } = await open({ width: 1440, height: 900 });
    await w.waitForFunction(() => (window.__flagLog ?? []).length >= 2, null, { timeout: 60_000 });
    const fl = await w.evaluate(() => window.__flagLog.map((f) => f.text));
    check(
      fl.every((t) => words(t) <= 3),
      `flags ≤ 3 words (${fl.join(" | ")})`,
    );
    await w.close();
    await p.close();
  }
} catch (e) {
  check(false, `threw: ${e.stack ?? e}`);
} finally {
  await b.close();
}
console.log(out.join("\n"));
console.log(failed ? `live-decisions: ${failed} FAILED` : "live-decisions: ok");
process.exit(failed ? 1 : 0);
