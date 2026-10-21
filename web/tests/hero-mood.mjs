#!/usr/bin/env node
// Queue 42: the watched hero's portrait reacts to the replay. Part 1 drives the pure mood machine (hero-mood.ts): nothing ahead
// of the cursor, the minimum hold, rank pre-emption, seek back, pause and the slow-replay bound. Part 2 watches a real-WASM run
// at the phone review viewport and the desktop: every mood the portrait showed names an event the picture had already played
// (by the watched hero), lower moods held ≥ MOOD_MIN_MS, pause freezes it, reduced motion has no shake, the art fallback,
// the watched hero's class, and the portrait stays inside the console clear of its controls.
//   node web/tests/hero-mood.mjs [--shots DIR]
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import ts from "../../web/node_modules/typescript/lib/typescript.js";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";

let n = 0;
const ok = (v, what) => {
  assert.ok(v, what);
  n++;
};
const shotsAt = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shotsAt) mkdirSync(shotsAt, { recursive: true });

// ---- part 1: the machine
const src = readFileSync(new URL("../src/ui/hero-mood.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const M = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const { HeroMood, moodOf, MOOD_MIN_MS, MOOD_MAX_MS, MOOD_RANK } = M;
{
  const H = 0;
  ok(moodOf({ k: "attack", t: 1, src: H, dst: 3, dmg: 2, hit: true }, H) === "attack", "attack");
  ok(moodOf({ k: "attack", t: 1, src: 3, dst: H, dmg: 2, hit: true }, H) === null, "foe attack");
  ok(moodOf({ k: "hurt", t: 1, id: H, dmg: 3, hp: 5 }, H) === "hurt", "hurt");
  ok(moodOf({ k: "hurt", t: 1, id: H, dmg: 3, hp: 5 }, H, true) === null, "drain no reaction");
  ok(moodOf({ k: "hurt", t: 1, id: 4, dmg: 3, hp: 5 }, H) === null, "foe hurt");
  ok(moodOf({ k: "heal", t: 1, id: H, amount: 4, src: "potion" }, H) === "heal", "potion heal");
  ok(moodOf({ k: "heal", t: 1, id: H, amount: 1, src: "regen" }, H) === null, "regen quiet");
  ok(moodOf({ k: "die", t: 1, id: H, cause: "x" }, H) === "down", "die");
  ok(moodOf({ k: "exit", t: 1, tier: "bank", loot_kept: 1 }, H) === "win", "bank");
  ok(moodOf({ k: "exit", t: 1, tier: "death", loot_kept: 0 }, H) === "down", "death exit");

  const m = new HeroMood();
  m.note(10, "attack");
  m.note(12, "hurt");
  m.note(40, "heal");
  ok(m.at(9, false, 0).mood === "calm", "nothing ahead of the cursor");
  ok(m.at(10, false, 16).mood === "attack", "attack at its tick");
  ok(m.at(12, false, 32).mood === "hurt", "hurt outranks attack at once");
  ok(m.at(30, false, 100).mood === "hurt", "hurt holds MOOD_MIN_MS past its window");
  ok(m.at(31, false, 32 + MOOD_MIN_MS - 1).mood === "hurt", "still held");
  ok(m.at(32, false, 32 + MOOD_MIN_MS).mood === "calm", "calm after the hold");
  ok(m.at(33, true, 32 + MOOD_MIN_MS + 1).mood === "danger", "low hp: danger (up)");
  ok(m.at(34, false, 32 + MOOD_MIN_MS + 2).mood === "danger", "danger holds");
  // pause: the cursor frozen, wall time passing — the mood and its hold stand still
  const p = new HeroMood();
  p.note(5, "attack");
  p.at(5, false, 0);
  for (let t = 0; t < 5000; t += 100) ok(p.at(5, false, t, true).mood === "attack", "paused");
  ok(p.at(6, false, 5000 + MOOD_MIN_MS - 10).mood === "attack", "the hold resumes, not spent");
  // seek back: reset to the state at the cursor, no hold
  const s = new HeroMood();
  s.note(20, "hurt");
  s.note(50, "down");
  ok(s.at(55, false, 0).mood === "down", "terminal");
  ok(s.at(60, false, 5000).mood === "down", "terminal stays");
  ok(s.at(21, false, 5001).mood === "hurt", "seek back: hurt at 21");
  ok(s.at(10, false, 5002).mood === "calm", "seek back before it: calm");
  // slow replay: a transient never outlives MOOD_MAX_MS on a moving cursor, and does not come back
  const w = new HeroMood();
  w.note(100, "heal");
  let shown = [];
  for (let i = 0, t = 100; i < 200; i++, t += 0.02) shown.push(w.at(t, false, i * 16).mood);
  const healFrames = shown.filter((x) => x === "heal").length;
  ok(healFrames * 16 <= MOOD_MAX_MS + 32, `heal bounded (${healFrames} frames)`);
  ok(shown.lastIndexOf("heal") < shown.indexOf("calm"), "no flicker back after the bound");
  // 8×: alternating blows every tick never flip faster than the hold (a change is up-rank or after MOOD_MIN_MS)
  const f = new HeroMood();
  for (let t = 0; t < 400; t++) f.note(t, t % 2 ? "attack" : "hurt");
  let last = f.at(0, false, 0),
    since = 0;
  for (let i = 1; i < 600; i++) {
    const now = i * 16,
      st = f.at(i * 0.6, false, now);
    if (st.mood !== last.mood) {
      ok(
        MOOD_RANK[st.mood] > MOOD_RANK[last.mood] || now - since >= MOOD_MIN_MS,
        `8× change ${last.mood}→${st.mood} after ${now - since} ms`,
      );
      since = now;
    }
    last = st;
  }
  console.log(`hero-mood machine: ${n} checks PASS`);
}

// ---- part 2: a real-WASM watch
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim();
const b = await launchBrowser();
const errors = [];
const TRANSIENT = new Set(["attack", "hurt", "heal"]);
const fits = (mood, ev, hero) =>
  (mood === "attack" && ev.k === "attack" && ev.src === hero) ||
  (mood === "hurt" && ev.k === "hurt" && ev.id === hero && ev.dmg > 0) ||
  (mood === "heal" && ev.k === "heal" && ev.id === hero && ev.amount > 0) ||
  (mood === "down" &&
    ((ev.k === "die" && ev.id === hero) || (ev.k === "exit" && ev.tier === "death"))) ||
  (mood === "win" && ev.k === "exit" && ev.tier !== "death");
try {
  const cases = [
    { id: "phone", ...phoneReviewViewport() },
    { id: "desktop", width: 1440, height: 900 },
  ];
  for (const vp of cases) {
    const ctx = await b.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.id === "phone",
      reducedMotion: "no-preference",
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(`${vp.id}: ${e.message}`));
    await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=42`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(async () => {
      const a = window.__idlever,
        e = a.engine;
      if (a.kind !== "wasm") throw Error("real WASM required");
      a.runnerOn = false;
      window.__evs = [];
      window.__moodLog = [];
      const step = e.step.bind(e);
      e.step = async (k) => {
        const r = await step(k);
        window.__evs.push(...r.events);
        window.__hero = { id: r.snapshot.hero.id, cls: r.snapshot.hero.class };
        return r;
      };
      if (a.lineage.town?.home === false) await a.engine.buildTown("house");
      if (!a.lineage.live) await e.send();
      await a.refresh?.();
      a.go({ kind: "watch" });
    });
    await p.waitForFunction(() => document.querySelector(".watch")?.dataset.tick);
    const face = ".watch .portrait.hero-mood";
    await p.waitForSelector(face);

    // the watched hero's identity and the art fallback
    await p.waitForFunction(() => window.__hero);
    const id = await p.evaluate(
      (sel) => ({ hero: window.__hero.cls, shown: document.querySelector(sel).dataset.hero }),
      face,
    );
    ok(id.shown === id.hero, `${vp.id}: portrait is the watched hero (${id.shown} = ${id.hero})`);
    await p.waitForFunction((sel) => document.querySelector(sel).dataset.art === "ready", face, {
      timeout: 20_000,
    });
    const fallback = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.dataset.art = "wait";
      const bg = getComputedStyle(el.querySelector(".face"), "::before").backgroundImage;
      el.dataset.art = "ready";
      const none = getComputedStyle(el.querySelector(".face"), "::before").content;
      return { bg, none };
    }, face);
    ok(/radial-gradient/.test(fallback.bg), `${vp.id}: silhouette while art loads`);
    ok(
      fallback.none === "none" || fallback.none === "normal",
      `${vp.id}: no silhouette once ready`,
    );

    // watch until the portrait has reacted to both blows given and taken
    const want = new Set(["attack", "hurt"]);
    await p.waitForFunction(
      (w) => {
        const seen = new Set((window.__moodLog ?? []).map((m) => m.mood));
        return w.every((x) => seen.has(x));
      },
      [...want],
      { timeout: 120_000, polling: 250 },
    );
    // pause on a mood: it stands still while paused, whatever wall time passes
    await p.evaluate(() => document.querySelector(".watch .gem.hud-btn").click());
    await p.waitForFunction((sel) => document.querySelector(sel).dataset.paused === "1", face);
    const before = await p.evaluate(
      (sel) => ({
        mood: document.querySelector(sel).dataset.mood,
        tick: document.querySelector(".watch").dataset.tick,
        log: window.__moodLog.length,
      }),
      face,
    );
    await p.waitForTimeout(2 * MOOD_MAX_MS);
    const after = await p.evaluate(
      (sel) => ({
        mood: document.querySelector(sel).dataset.mood,
        tick: document.querySelector(".watch").dataset.tick,
        log: window.__moodLog.length,
        play: getComputedStyle(document.querySelector(`${sel} .ring`)).animationPlayState,
      }),
      face,
    );
    ok(after.mood === before.mood && after.log === before.log, `${vp.id}: paused mood frozen`);
    ok(after.tick === before.tick, `${vp.id}: paused cursor frozen`);
    ok(after.play === "paused", `${vp.id}: paused reaction paused`);
    if (shotsAt) {
      await p.locator(face).scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shotsAt}/${vp.id}-${before.mood}-paused.png` });
    }

    // the layout: the portrait inside the console, clear of its tiles and gems, inside the viewport
    const lay = await p.evaluate((sel) => {
      const r = (e) => e.getBoundingClientRect();
      const el = document.querySelector(sel),
        pr = r(el),
        con = el.closest(".console"),
        cr = con ? r(con) : null;
      const hit = [...document.querySelectorAll(".watch .tile, .watch .gem, .watch button.hud-btn")]
        .filter((b) => !el.contains(b) && b.offsetParent)
        .map((b) => ({ b: r(b), c: b.className }))
        .filter(
          ({ b }) =>
            Math.min(b.right, pr.right) - Math.max(b.left, pr.left) > 1 &&
            Math.min(b.bottom, pr.bottom) - Math.max(b.top, pr.top) > 1,
        )
        .map(({ c }) => c);
      return {
        pr: [pr.left, pr.top, pr.right, pr.bottom].map(Math.round),
        cr: cr && [cr.left, cr.top, cr.right, cr.bottom].map(Math.round),
        hit,
        vw: innerWidth,
        sw: document.documentElement.scrollWidth,
      };
    }, face);
    ok(lay.cr, `${vp.id}: the portrait is in the console`);
    ok(
      lay.pr[0] >= lay.cr[0] - 1 && lay.pr[2] <= lay.cr[2] + 1 && lay.pr[1] >= lay.cr[1] - 12,
      `${vp.id}: portrait within the console ${JSON.stringify(lay)}`,
    );
    ok(lay.hit.length === 0, `${vp.id}: no control under the portrait ${JSON.stringify(lay.hit)}`);
    ok(lay.sw <= lay.vw, `${vp.id}: no horizontal scroll`);
    await p.evaluate(() => document.querySelector(".watch .gem.hud-btn").click());

    // a little more play, then the log against the events the engine sent
    await p.waitForTimeout(6000);
    const r = await p.evaluate(() => ({
      log: window.__moodLog,
      evs: window.__evs,
      hero: window.__hero,
      href: location.href,
      screen: window.__idlever?.screen?.kind,
    }));
    if (!r.log) throw Error(`${vp.id}: the page lost its log ${JSON.stringify(r)}`);
    let prev = null;
    for (const m of r.log) {
      ok(m.cursor <= m.tick + 1e-6, `${vp.id}: mood cursor ${m.cursor} ≤ picture ${m.tick}`);
      if (TRANSIENT.has(m.mood) || m.mood === "win" || m.mood === "down") {
        ok(m.t <= m.cursor, `${vp.id}: ${m.mood} from t${m.t}, at cursor ${m.cursor}`);
        ok(
          r.evs.some((ev) => ev.t === m.t && fits(m.mood, ev, r.hero.id)),
          `${vp.id}: ${m.mood} at t${m.t} names a played event`,
        );
      }
      if (TRANSIENT.has(m.mood)) {
        const w = { attack: 4, heal: 8, hurt: 6 }[m.mood];
        ok(m.cursor - m.t <= w, `${vp.id}: ${m.mood} within its window`);
      }
      if (prev && MOOD_RANK[m.mood] <= MOOD_RANK[prev.mood])
        ok(
          m.ms - prev.ms >= MOOD_MIN_MS - 2,
          `${vp.id}: ${prev.mood}→${m.mood} held ${m.ms - prev.ms} ms`,
        );
      prev = m;
    }
    console.log(
      `${vp.id} ${vp.width}×${vp.height}: ${r.log.length} moods (${[...new Set(r.log.map((m) => m.mood))].join(", ")}) PASS`,
    );

    // reduced motion: the colour only — no shake, no nudge, no pulse
    for (const rm of ["no-preference", "reduce"]) {
      await p.emulateMedia({ reducedMotion: rm });
      const anim = await p.evaluate((sel) => {
        const el = document.querySelector(sel),
          was = el.dataset.mood,
          out = {};
        for (const mood of ["hurt", "attack", "danger", "heal", "win", "down"]) {
          el.dataset.mood = mood;
          const f = getComputedStyle(el.querySelector(".face")),
            ring = getComputedStyle(el.querySelector(".ring")),
            rim = getComputedStyle(el.querySelector(".rim"));
          out[mood] = {
            anim: `${f.animationName}|${ring.animationName}`,
            look: `${f.filter}|${f.boxShadow}|${rim.boxShadow}|${ring.opacity}`,
          };
        }
        el.dataset.mood = was;
        return out;
      }, face);
      if (rm === "reduce")
        for (const [mood, a] of Object.entries(anim))
          ok(a.anim === "none|none", `${vp.id}: reduced motion ${mood} still (${a.anim})`);
      else {
        ok(/hero-mood-shake/.test(anim.hurt.anim), `${vp.id}: hurt shakes`);
        ok(/hero-mood-lunge/.test(anim.attack.anim), `${vp.id}: attack nudges`);
        ok(/hero-mood-pulse/.test(anim.danger.anim), `${vp.id}: danger pulses`);
      }
      ok(new Set(Object.values(anim).map((a) => a.look)).size === 6, `${vp.id}/${rm}: six looks`);
    }
    if (shotsAt) {
      // a mood sheet: clones of the live well (its art and hp ring), one per mood, at its own size
      await p.emulateMedia({ reducedMotion: "reduce" });
      await p.evaluate((sel) => {
        const el = document.querySelector(sel),
          sheet = document.createElement("div");
        sheet.id = "mood-sheet";
        sheet.style.cssText =
          "position:fixed;left:0;top:0;z-index:99999;display:flex;flex-wrap:wrap;gap:18px;padding:16px;background:var(--k-surface)";
        for (const mood of ["calm", "attack", "hurt", "danger", "heal", "win", "down"]) {
          const c = el.cloneNode(true);
          c.dataset.mood = mood;
          c.style.margin = "0 0 14px";
          sheet.append(c);
        }
        document.body.append(sheet);
      }, face);
      await p.waitForTimeout(400);
      await p.locator("#mood-sheet").screenshot({ path: `${shotsAt}/${vp.id}-moods.png` });
      await p.evaluate(() => document.querySelector("#mood-sheet").remove());
      await p.screenshot({ path: `${shotsAt}/${vp.id}-watch.png` });
    }
    await ctx.close();
  }
  ok(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
  console.log(`hero-mood: ${n} checks PASS`);
} finally {
  await b.close();
}
