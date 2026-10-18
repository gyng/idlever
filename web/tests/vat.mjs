// Cut264 (docs/CUT264_CLONE_VAT.md §4–5): the clone vat on the real WASM — growing (time-left badge, progress ring, growth
// stage, the one-time `Clone growing` callout), the gold hurry (its live price, a refused changed price, the tap), ready (the
// `Clone ready` lantern, the ready sprite, the ready shimmer, the hero stepping out; a tap clears it) and the cool night light.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  }).trim();
// An actual Core defeat (Cut230 controlled fixture: 60 s of recovery left), the purse raised so the hurry is affordable.
const raw = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL(
        "../../docs/evidence/cut230/fixtures/controlled-reincarnating-600.game.json.gz",
        import.meta.url,
      ),
    ),
  ).toString(),
);
raw.lineage.gold = 50000;
const browser = await launchBrowser();
const capture = async (page, name) => {
  if (!process.env.IDLEVER_CAPTURE_DIR) return;
  mkdirSync(process.env.IDLEVER_CAPTURE_DIR, { recursive: true });
  for (const viewport of [
    { width: 402, height: 681 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `${process.env.IDLEVER_CAPTURE_DIR}/${name}-${viewport.width}.png`,
    });
  }
};
let checks = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  checks++;
};
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${url}?fresh=1&seed=1&runs=0`);
  await p.waitForFunction(() => window.__idlever?.booted);
  ok(await p.evaluate(() => window.__idlever.kind === "wasm"), "real WASM");
  const load = (r) =>
    p.evaluate(async (r) => {
      const a = window.__idlever;
      a.runnerOn = false;
      await a.engine.load(JSON.stringify(r));
      await a.refresh();
    }, r);
  await p.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("idlever.town.")) localStorage.removeItem(k);
  });
  await load(raw);
  const vat = '.town-hit[data-building="device"]';
  await p.waitForSelector(`${vat}[data-clone="growing"]`, { state: "attached", timeout: 15000 });
  await p.evaluate(() => window.__town.setHour(23));
  await p.waitForFunction(() => window.__town.stats().night > 0.95);
  await p.waitForTimeout(400);
  await p.waitForFunction(() =>
    /^town_service_device_grow_[0-2]$/.test(window.__town.stats().vat?.art ?? ""),
  );
  // growing: the badge, the ring, the stage, the callout once, the budget
  const grow = await p.evaluate((vat) => {
    const b = document.querySelector(vat);
    const s = window.__town.stats();
    return {
      count: b.querySelector(".town-count")?.textContent,
      ring: b.querySelector(".town-ring")?.dataset.progress,
      ringStyle: b.querySelector(".town-ring")?.style.getPropertyValue("--p"),
      label: b.getAttribute("aria-label"),
      callout: document.querySelector(".town-clone-callout")?.textContent,
      calloutShown: document.querySelector(".town-clone-callout")?.classList.contains("show"),
      vat: s.vat,
      markers: s.markers,
      hero: window.__idlever.lineage.persistent_hero,
      store: Object.entries(localStorage).find(([k]) => k.startsWith("idlever.town."))?.[1],
    };
  }, vat);
  ok(grow.hero.state === "reincarnating", `cloning: ${grow.hero.state}`);
  ok(grow.hero.recovery_total_s >= grow.hero.recovery_s, "total ≥ left");
  ok(/^\d+[sm]$/.test(grow.count ?? ""), `time-left badge: ${grow.count}`);
  ok(grow.ring !== undefined && grow.ringStyle.endsWith("deg"), `progress ring: ${grow.ring}`);
  ok(/Cloning \d+[sm]/.test(grow.label), `vat label: ${grow.label}`);
  ok(grow.callout === "Clone growing" && grow.calloutShown, `callout: ${grow.callout}`);
  ok(JSON.parse(grow.store).seen.includes("clone"), "callout recorded in the viewer's seen store");
  ok(grow.vat?.clone === "growing", "the scene draws the clone growing");
  ok(/^town_service_device_grow_[0-2]$/.test(grow.vat.art), `growth stage art: ${grow.vat.art}`);
  ok(grow.markers.length <= 2, `the badge takes a marker's place: ${grow.markers}`);
  ok(grow.vat.color === "#a4bcd6", "cool mist light");
  await capture(p, "vat-growing-night");
  await p.evaluate(() => window.__town.setHour(12));
  await p.waitForFunction(() => window.__town.stats().night < 0.05);
  await capture(p, "vat-growing-day");
  await p.evaluate(() => window.__town.setHour(23));
  await p.waitForFunction(() => window.__town.stats().night > 0.95);
  const growingLight = grow.vat.light;
  ok(growingLight >= (0.2 + 0.6 * 0.95) * 0.85 - 0.01, `growing light at night: ${growingLight}`);
  // the callout is once: a second clone shows the badge only
  await p.waitForFunction(
    () => !document.querySelector(".town-clone-callout")?.classList.contains("show"),
    undefined,
    { timeout: 8000 },
  );
  await load(raw);
  await p.waitForSelector(`${vat}[data-clone="growing"]`, { state: "attached" });
  await p.waitForTimeout(300);
  ok(
    !(await p.evaluate(() =>
      document.querySelector(".town-clone-callout")?.classList.contains("show"),
    )),
    "no callout at a later clone",
  );
  // the hurry: the vat panel's clone header and its live price
  await p.locator(vat).click({ force: true });
  const hurry = p.locator('.hero-clone [data-life-focus="hurry"]');
  await hurry.waitFor();
  const offer = await p.evaluate(() => ({
    price: window.__idlever.lineage.persistent_hero.hurry_price,
    shown: document.querySelector('.hero-clone [data-life-focus="hurry"]').textContent,
    attr: Number(document.querySelector(".hero-clone [data-hurry-price]").dataset.hurryPrice),
    timer: document.querySelector(".hero-clone-timer").textContent,
    gold: window.__idlever.lineage.gold,
  }));
  ok(offer.price > 0 && offer.shown === `Hurry $${offer.price}`, `button: ${offer.shown}`);
  ok(offer.attr === offer.price, "button carries the live price");
  ok(/^Cloning \d+[sm]$/.test(offer.timer), `timer: ${offer.timer}`);
  // a price above the cap is refused by the core and changes nothing
  const refused = await p.evaluate(async (price) => {
    const a = window.__idlever;
    const before = a.lineage.gold;
    let error = "";
    try {
      await a.engine.hurryClone(price - 1);
    } catch (e) {
      error = String(e?.message ?? e);
    }
    await a.refresh();
    return { error, gold: a.lineage.gold, before, state: a.lineage.persistent_hero.state };
  }, offer.price);
  ok(/price changed/.test(refused.error), `refusal: ${refused.error}`);
  ok(refused.gold === refused.before && refused.state === "reincarnating", "refusal is free");
  // the panel's path: a refused tap says so and keeps the clone
  await p.evaluate(() => {
    const e = window.__idlever.engine;
    const real = e.hurryClone.bind(e);
    e.hurryClone = async () => {
      e.hurryClone = real;
      throw Error("price changed");
    };
  });
  await hurry.click();
  await p.waitForFunction(() =>
    /price changed/.test(document.querySelector(".hero-life-feedback")?.textContent ?? ""),
  );
  ok(
    (await p.evaluate(() => window.__idlever.lineage.persistent_hero.state)) === "reincarnating",
    "a refused tap leaves the clone growing",
  );
  // the tap: paid once, the clone ready at once
  const price = await p.evaluate(() => window.__idlever.lineage.persistent_hero.hurry_price);
  await p.locator('.hero-clone [data-life-focus="hurry"]').click();
  await p.waitForFunction(() => window.__idlever.lineage.persistent_hero.state === "ready");
  const paid = await p.evaluate(() => ({
    gold: window.__idlever.lineage.gold,
    line: window.__idlever.lineage.gold_ledger?.at(-1),
    feedback: document.querySelector(".hero-life-feedback")?.textContent,
    header: !!document.querySelector(".hero-clone"),
  }));
  ok(paid.gold === offer.gold - price, `paid ${offer.gold} → ${paid.gold} ($${price})`);
  ok(paid.line?.why === "hurry clone" && paid.line.delta === -price, "ledger: hurry clone");
  ok(paid.feedback === "Clone ready" && !paid.header, "the panel says so; no clone header");
  // ready: the lantern, the ready sprite, the shimmer, the hero stepping out
  await p.keyboard.press("Escape");
  await p.mouse.move(1, 1); // hover has its own stronger outline; inspect the unread-ready outline without it
  await p.evaluate(() => document.activeElement?.blur());

  await p.waitForSelector(`${vat}[data-clone="ready"]`, { state: "attached" });
  await p.waitForTimeout(400);
  const ready = await p.evaluate((vat) => {
    const b = document.querySelector(vat);
    const s = window.__town.stats();
    return {
      markers: b.dataset.markers,
      lantern: !!b.querySelector(".town-marker.mk-clone"),
      title: b.title,
      count: b.querySelector(".town-count")?.textContent ?? null,
      ring: !!b.querySelector(".town-ring"),
      vat: s.vat,
      glows: s.glows,
      scene: s.markers,
    };
  }, vat);
  ok(ready.lantern && ready.markers.split(" ").includes("clone"), "Clone ready lantern");
  ok(/Clone ready/.test(ready.title), `its name: ${ready.title}`);
  ok(ready.count === null && !ready.ring, "the badge and ring go");
  ok(ready.vat.clone === "ready" && ready.vat.art === "town_service_device_ready", ready.vat.art);
  ok(ready.scene[0] === "clone@device", `ready leads the budget: ${ready.scene}`);
  ok(
    ready.glows.some((g) => g.startsWith("ready:device")),
    `ready shimmer: ${ready.glows}`,
  );
  ok(ready.vat.emerged >= 1, "the hero steps out of the vat");
  await capture(p, "vat-ready-night");
  await p.evaluate(() => window.__town.setHour(12));
  await p.waitForFunction(() => window.__town.stats().night < 0.05);
  await capture(p, "vat-ready-day");
  await p.evaluate(() => window.__town.setHour(23));
  await p.waitForFunction(() => window.__town.stats().night > 0.95);
  // a tap on the vat reads it: the lantern goes, the vat idles under its dim night mist
  await p.locator(vat).click({ force: true });
  await p.keyboard.press("Escape");
  await p.waitForSelector(`${vat}:not([data-clone="ready"])`, { state: "attached" });
  await p.waitForTimeout(1800);
  const idle = await p.evaluate((vat) => {
    const b = document.querySelector(vat);
    return { markers: b.dataset.markers, vat: window.__town.stats().vat };
  }, vat);
  ok(!idle.markers.split(" ").includes("clone") && idle.vat.clone === null, "tap clears ready");
  ok(idle.vat.art === "town_service_device", `idle art: ${idle.vat.art}`);
  ok(idle.vat.light > 0 && idle.vat.light < growingLight, `night: idle ${idle.vat.light}`);
  await p.evaluate(() => window.__town.setHour(12));
  await p.waitForFunction(() => window.__town.stats().night < 0.05);
  await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__town.stats().vat.light)) < 0.05, "no vat light by day");
  // Three real saved residents finish independently. One resident leaving must not erase another's unread readiness.
  const multi = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          "../../docs/evidence/cut230/fixtures/three-controlled-reincarnating.game.json.gz",
          import.meta.url,
        ),
      ),
    ).toString(),
  );
  for (const [i, game] of [multi, ...Object.values(multi.others)].entries()) {
    game.lineage.persistent.recovery_ticks = 600 + i * 300;
    game.lineage.persistent.recovery_until_tick = game.lineage.total_turns + 600 + i * 300;
    game.lineage.rest_left = 600 + i * 300;
  }
  await p.emulateMedia({ reducedMotion: "reduce" });
  await load(multi);
  const emergedBefore = await p.evaluate(() => window.__town.stats().vat.emerged);
  await p.evaluate(() => window.__town.setHour(23));
  await p.waitForFunction(() => window.__town.stats().night > 0.95);
  const advance = async (ms) => {
    await p.evaluate(async (ms) => {
      const a = window.__idlever;
      await a.engine.advance(ms);
      await a.refresh();
    }, ms);
    await p.waitForTimeout(100);
  };
  await advance(60000);
  let mixed = await p.evaluate(
    (vat) => ({
      phases: window.__idlever.lineage.hero_slots.map((h) => h.life_state),
      lantern: !!document.querySelector(`${vat} .mk-clone`),
      badge: !!document.querySelector(`${vat} .town-count`),
      markers: window.__town.stats().markers,
      light: window.__town.stats().vat.light,
      emerged: window.__town.stats().vat.emerged,
    }),
    vat,
  );
  ok(
    JSON.stringify(mixed.phases) === JSON.stringify(["ready", "reincarnating", "reincarnating"]),
    "one clone ready, two growing",
  );
  ok(mixed.lantern && mixed.badge, "ready lantern and growth badge coexist");
  ok(
    mixed.markers.length <= 2 && mixed.markers[0] === "clone@device",
    "ready lantern plus badge stay within three markers",
  );
  ok(mixed.emerged === emergedBefore, "reduced motion adds no emergence animation");
  await p.waitForTimeout(350);
  ok(
    (await p.evaluate(() => window.__town.stats().vat.light)) === mixed.light,
    "reduced motion keeps the vat light steady",
  );
  await advance(30000);
  await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.selectBloodline(2);
    await a.engine.send();
    await a.engine.step(1);
    await a.refresh();
  });
  await p.waitForTimeout(100);
  mixed = await p.evaluate(
    (vat) => ({
      phases: window.__idlever.lineage.hero_slots.map((h) => ({ id: h.id, phase: h.life_state })),
      lantern: !!document.querySelector(`${vat} .mk-clone`),
      badge: !!document.querySelector(`${vat} .town-count`),
    }),
    vat,
  );
  ok(mixed.phases.find((h) => h.id === 2).phase === "away", "second ready resident departs");
  ok(mixed.lantern && mixed.badge, "first ready resident retains lantern while third grows");
  await p.locator(vat).click({ force: true });
  await p.keyboard.press("Escape");
  ok(!(await p.locator(`${vat} .mk-clone`).count()), "vat tap clears all readied residents");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(`vat: ${checks} checks PASS (real WASM; growing · hurry · ready · night light)`);
} finally {
  await browser.close();
}
