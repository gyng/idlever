// Cut225 client evidence: the class unlock announcement, the Hub abilities and the decoy / sentry in the real-WASM watch.
// node shots.mjs [--headless] — GPU (private Xvfb) unless --headless.
import { readFileSync, mkdirSync } from "node:fs";
const W = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const OUT = `${W}/docs/evidence/cut225/client`;
mkdirSync(OUT, { recursive: true });
const { launchBrowser, launchGpu } = await import(`${W}/tools/browser.mjs`);
const headless = process.argv.includes("--headless");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const b = headless ? await launchBrowser() : await launchGpu();
const URL = process.env.URL ?? `http://localhost:${process.env.IDLEVER_PORT ?? 5219}/`;
const log = (...a) => console.log(...a);

async function page(width = 1280, height = 800, extra = "") {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => log("pageerror", e.message));
  await p.goto(`${URL}?dev=1&fresh=1&runs=0&seed=1${extra}`);
  await p.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  return p;
}
async function loadCamp(p, cls) {
  const save = readFileSync(`${W}/docs/evidence/cut225/classes/seed1-${cls}-camp.json`, "utf8");
  await p.evaluate(async (save) => {
    const a = window.__idlever;
    a.runnerOn = false;
    a.go({ kind: "camp" });
    await a.engine.load(save);
    await a.refresh();
    a.go({ kind: "camp" });
  }, save);
}

for (const cls of ["clown", "engineer"]) {
  if (only && only !== cls) continue;
  let p = await page();
  await loadCamp(p, cls);
  // 1. the announcement (the clown camp has Clown open; the engineer camp both)
  const plate = p.locator(".class-unlock");
  await plate.waitFor({ timeout: 10000 });
  const said = await plate.innerText();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${cls}-camp-unlock-announcement.png` });
  log(cls, "announced", said);
  // 2. choose the class, the Hub's Skills
  await p.evaluate(async (cls) => {
    const a = window.__idlever;
    await a.setClass(cls);
    const { openHeroHub } = await import("/src/ui/hero-hub.ts");
    openHeroHub(a, null, "skills");
  }, cls);
  await p.locator("[data-hub-abilities]").waitFor({ timeout: 10000 });
  await p.locator(".class-unlock").waitFor({ state: "detached", timeout: 10000 });
  await p
    .locator("[data-hub-abilities]")
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${cls}-hub-abilities.png` });
  log(cls, "hub", JSON.stringify(await p.locator("[data-hub-abilities]").innerText()));
  // 3. find the first placement tick, then replay the same send up to just before it and watch
  const T = await p.evaluate(async () => {
    const a = window.__idlever;
    window.__s0 = await a.engine.save();
    await a.engine.send();
    for (let i = 0; i < 400; i++) {
      const s = await a.engine.step(50);
      const e = s.events.find((x) => x.k === "tool" && x.state === "placed");
      if (e) return e.t;
      if (s.run_over) return -1;
    }
    return -1;
  });
  log(cls, "first placement tick", T);
  const s0 = await p.evaluate(() => window.__s0);
  await p.context().close();
  const q = await page(1280, 800, cls === "engineer" ? "&speed=1" : "");
  const at = await q.evaluate(
    async ({ T, s0 }) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.go({ kind: "camp" });
      await a.engine.load(s0);
      await a.refresh();
      await a.engine.send();
      let turn = 0;
      for (let i = 0; i < 4000 && turn < T - 40; i++) turn = (await a.engine.step(10)).snapshot.turn;
      await a.refresh();
      a.go({ kind: "watch" });
      return turn;
    },
    { T, s0 },
  );
  p = q;
  log(cls, "watch from", at);
  // pause the replay the frame a tool is drawn with its setup cue, then shoot
  const got = await p.evaluate(
    () =>
      new Promise((res) => {
        const t0 = performance.now();
        const poll = () => {
          const v = window.__viewer;
          const st = v?.stats?.();
          if (st?.tools?.live?.length && st.tools.cues > 4) {
            (window.__orig = { setSpeed: v.setSpeed, skipToEvent: v.skipToEvent, seek: v.seek, load: v.load }), v.setSpeed(0), Object.assign(v, { setSpeed() {}, skipToEvent() {}, seek() {}, load() {} });
            return res(st.tools);
          }
          if (performance.now() - t0 > 120000) return res(null);
          requestAnimationFrame(poll);
        };
        poll();
      }),
  );
  log(cls, "tools drawn", JSON.stringify(got));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${cls}-watch-${cls === "clown" ? "decoy" : "sentry"}.png` });
  // a later frame: the construct clear of the hero's sprite (not on the tile just above him), acting if it can
  await p.evaluate(() => { const v = window.__viewer; Object.assign(v, window.__orig); v.setSpeed(1); });
  const later = await p.evaluate(
    (cls) =>
      new Promise((res) => {
        const t0 = performance.now();
        let fallback = null;
        const poll = () => {
          const v = window.__viewer;
          const st = v?.stats?.();
          const m = /@(\d+),(\d+)$/.exec(st?.tools?.live?.[0] ?? "");
          if (m) {
            const [x, y] = [Number(m[1]), Number(m[2])],
              [hx, hy] = st.hero;
            const clear = !(Math.abs(hx - x) < 1 && hy > y && hy - y < 2.2);
            const acting = st.tools.cues > (cls === "clown" ? 2 : 4);
            if (clear && acting) {
              v.setSpeed(0), Object.assign(v, { setSpeed() {}, skipToEvent() {}, seek() {}, load() {} });
              return res({ ...st.tools, hero: st.hero });
            }
            if (clear && !fallback && performance.now() - t0 > 30000) {
              v.setSpeed(0), Object.assign(v, { setSpeed() {}, skipToEvent() {}, seek() {}, load() {} });
              return res({ ...st.tools, hero: st.hero, fallback: true });
            }
          }
          if (performance.now() - t0 > 150000) return res(null);
          requestAnimationFrame(poll);
        };
        poll();
      }),
    cls,
  );
  log(cls, "later pick", JSON.stringify(later));
  await p.waitForTimeout(300);
  log(cls, "later", JSON.stringify(await p.evaluate(() => window.__viewer.stats().tools)));
  await p.screenshot({ path: `${OUT}/${cls}-watch-${cls === "clown" ? "decoy" : "sentry"}-later.png` });
  await p.context().close();
}
await b.close();
