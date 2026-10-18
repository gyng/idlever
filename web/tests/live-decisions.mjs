#!/usr/bin/env node
// Cut 270 (docs/CUT270_LIVE_DECISIONS.md): the watch's live decisions on the fake engine (`?decide=1`: a boss decision at t30, a
// chest at t50, a cache pick at t80, each run). The prompt opens on its tick with ≤ 3-word options and the default marked; 5 s of
// wall time auto-picks it; ⏸ freezes the countdown with the prompt open; keys 1–3 and ≥ 44 px taps choose; turning back ends the run
// as a return. Each decision, the chest and the run's floors and exit land in the milestone log; flags are rate-limited.
// Cut 277: a kill that dropped nothing (`&nodrop=1`) shows no chest and logs none.
//   node web/tests/live-decisions.mjs [--part=desk,phone,chest,nodrop,flags]
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";

const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const part = (
  process.argv.find((a) => a.startsWith("--part=")) ?? "--part=desk,phone,chest,nodrop,flags"
)
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
const promptOf = (p, kind) =>
  p.waitForSelector(`.decide[data-kind=${kind}]:not(.decided)`, { timeout: 60_000 });
const log = (p) => p.evaluate(() => window.__decideLog ?? []);

try {
  if (part.includes("desk")) {
    const { p, errors } = await open({ width: 1440, height: 900 });
    await promptOf(p, "boss");
    const shape = await p.evaluate(() => {
      const d = document.querySelector(".decide");
      return {
        labels: [...d.querySelectorAll(".decide-label")].map((x) => x.textContent),
        auto: d.querySelector(".is-default .decide-label")?.textContent,
        title: d.querySelector(".decide-title").textContent,
        rate: document.querySelector(".watch").dataset.tick,
      };
    });
    check(
      shape.labels.length === 2 &&
        shape.labels.every((l) => words(l) <= 3) &&
        words(shape.title) <= 3,
      `labels ≤ 3 words (${shape.title}: ${shape.labels.join(" | ")})`,
    );
    check(shape.auto === "Fight", `the default (today's) is marked auto (${shape.auto})`);
    // ⏸ freezes the countdown and keeps the prompt open (a direct click: the gem's actionability wait is not the test)
    const pauseGem = (label) =>
      p.evaluate((l) => document.querySelector(`.console [aria-label='${l}']`).click(), label);
    await pauseGem("Pause watch");
    const left0 = await p.evaluate(() => +document.querySelector(".decide").dataset.left);
    // the picture stands on the decision while it is open
    const t0 = await p.evaluate(() => +document.querySelector(".watch").dataset.tick);
    await p.waitForTimeout(3000);
    const t1 = await p.evaluate(() => +document.querySelector(".watch").dataset.tick);
    check(t1 - t0 <= 2, `the picture waits on the prompt (t${t0} → t${t1})`);
    const frozen = await p.evaluate(() => ({
      left: +document.querySelector(".decide").dataset.left,
      open: !!document.querySelector(".decide:not(.decided)"),
      cls: document.querySelector(".decide").classList.contains("frozen"),
    }));
    check(
      frozen.open && frozen.cls && Math.abs(frozen.left - left0) <= 400,
      `paused 3 s: the prompt stays, its countdown stands (${left0} → ${frozen.left} ms left)`,
    );
    await pauseGem("Resume watch");
    // the deadline: the default, with no hand (5 s of watched time from the open)
    await p.waitForFunction(
      () => (window.__decideLog ?? []).some((x) => x.pick !== undefined),
      null,
      {
        timeout: 12_000,
      },
    );
    const L = await log(p);
    const opened = L.find((x) => x.open !== undefined),
      picked = L.find((x) => x.pick !== undefined);
    const watched = picked.ms - opened.open - 3000;
    check(
      picked.pick === 0 && !picked.byHand && watched >= 4600 && watched <= 5800,
      `auto-pick at the deadline: option ${picked.pick}, ${Math.round(watched)} ms watched (excl. 3 s paused)`,
    );
    // keys: `2` takes the cache's second item
    await promptOf(p, "cache");
    await p.keyboard.press("2");
    await p.waitForFunction(
      () => (window.__decideLog ?? []).filter((x) => x.pick !== undefined).length >= 2,
    );
    const k = (await log(p)).filter((x) => x.pick !== undefined)[1];
    check(k.pick === 1 && k.byHand, `key 2 picks option 2 by hand (${JSON.stringify(k)})`);
    const ms = await p.evaluate(() => window.__msLog.map((m) => `${m.kind}:${m.text}`));
    check(
      ms.includes("decision:auto · Fight") && ms.includes("decision:mail +1"),
      `decisions in the milestone log (${ms.filter((m) => m.startsWith("decision")).join(", ")})`,
    );
    check(
      ms.some((m) => m.startsWith("chest:chest · Crownsplitter")),
      "the chest in the milestone log",
    );
    // the milestone log matches the engine's events: one `floor` a descend (by depth), and the exit
    await p.waitForFunction(() => window.__msLog.some((m) => m.kind === "exit"), null, {
      timeout: 120_000,
    });
    const match = await p.evaluate(() => {
      const desc = window.__evs.filter((e) => e.k === "descend").map((e) => e.depth);
      const floors = window.__msLog.filter((m) => m.kind === "floor").map((m) => m.depth);
      const exit = window.__evs.find((e) => e.k === "exit");
      const mx = window.__msLog.find((m) => m.kind === "exit");
      const lis = [...document.querySelectorAll(".milestones .ms")].length;
      return {
        desc,
        floors,
        tier: exit?.tier,
        kept: exit?.loot_kept,
        mx: mx?.text,
        lis,
        n: window.__msLog.length,
      };
    });
    check(
      JSON.stringify(match.desc) === JSON.stringify(match.floors),
      `a floor entry per descend (${match.desc} vs ${match.floors})`,
    );
    const word = match.tier === "bank" ? "retreat" : match.tier === "return" ? "returned" : "died";
    check(
      match.mx === (match.tier === "death" ? word : `${word} $${match.kept}`),
      `the exit entry is the exit's (${match.mx})`,
    );
    check(match.lis === Math.min(40, match.n), `the log lists them (${match.lis} rows)`);
    check(!errors.length, `no page errors (${errors.join(" | ")})`);
    await p.close();
  }
  if (part.includes("phone")) {
    const { p, errors } = await open({ width: 402, height: 681 }, "fast");
    await promptOf(p, "boss");
    const sizes = await p.evaluate(() =>
      [...document.querySelectorAll(".decide-opt")].map((x) => {
        const r = x.getBoundingClientRect();
        return { h: Math.round(r.height), w: Math.round(r.width), right: r.right };
      }),
    );
    check(
      sizes.every((s) => s.h >= 44 && s.w >= 44 && s.right <= 402),
      `phone taps ≥ 44 px, inside the screen (${JSON.stringify(sizes)})`,
    );
    // tap `Turn back`: the run ends as a return (the engine's bail)
    await p.locator(".decide-opt[data-i='1']").tap();
    await p.waitForFunction(() => window.__msLog?.some((m) => m.kind === "exit"), null, {
      timeout: 60_000,
    });
    const end = await p.evaluate(() => ({
      exit: window.__evs.find((e) => e.k === "exit")?.tier,
      picked: (window.__decideLog ?? []).find((x) => x.pick !== undefined),
    }));
    check(
      end.exit === "return" && end.picked.pick === 1 && end.picked.byHand,
      `a tap on Turn back ends the run as a return (${JSON.stringify(end)})`,
    );
    check(!errors.length, `no page errors (${errors.join(" | ")})`);
    await p.close();
    // the log's fold is closed and fixed: filling it (a decision, the chest) moves nothing on the phone
    const q = await open({ width: 402, height: 681 });
    await promptOf(q.p, "boss");
    const rects = () =>
      q.p.evaluate(() => {
        const r = document.querySelector(".watch .stage").getBoundingClientRect();
        const c = document.querySelector(".watch .console").getBoundingClientRect();
        return { at: [r.top, r.height, c.top], n: window.__msLog?.length ?? 0 };
      });
    const before = await rects();
    await q.p.locator(".decide-opt[data-i='0']").tap();
    await promptOf(q.p, "cache");
    const after = await rects();
    check(
      after.n > before.n && after.at.every((v, i) => Math.abs(v - before.at[i]) < 1),
      `no layout shift as the log fills (${before.n} → ${after.n} entries; ${before.at} → ${after.at})`,
    );
    await q.p.close();
  }
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
    // the cache prompt (t80) comes after the empty kill's record (t50)
    await promptOf(p, "cache");
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({
      seen: window.__chestSeen,
      log: (window.__chestLog ?? []).length,
      ms: window.__msLog.filter((m) => m.kind === "chest").length,
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
