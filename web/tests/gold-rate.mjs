// Queue 40: the purse's growth rate on real WASM — an earned first-ascension town away for two hours. The core's
// `gold_rate` (town clock, Bank moves excluded) reaches the Gold sheet as Earned/Spent/Net per hour with the window
// they cover, and the desktop top bar as a signed `/h` figure (phones keep the bar's numbers only). A fresh town
// with no history shows no rate. Screenshots with SHOTS=dir.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
import assert from "node:assert/strict";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim();
const shots = process.env.SHOTS;
const source = readFileSync(
  new URL("./fixtures/earned-first-ascension-clear.json", import.meta.url),
  "utf8",
);
const signed = (n) => {
  const a = Math.abs(n);
  const m =
    a >= 1e6
      ? `$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
      : a >= 1e3
        ? `$${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`
        : `$${a}`;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${m}`;
};
const browser = await launchBrowser();
let checks = 0;
try {
  for (const viewport of [phoneReviewViewport(), { width: 1440, height: 900 }]) {
    const p = await browser.newPage({ viewport, reducedMotion: "reduce" }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?dev=1&fresh=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    assert.equal(await p.evaluate(() => window.__idlever.kind), "wasm");
    const L0 = await p.evaluate(async (s) => {
      const a = window.__idlever;
      a.runnerOn = false;
      a.lineage = await a.engine.load(s);
      return a.lineage;
    }, source);
    assert.equal(L0.gold_rate, undefined, "no history, no rate");
    checks++;
    const L = await p.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.runOffline(2 * 3600);
      a.lineage = await a.engine.lineage();
      a.go({ kind: "camp" });
      return a.lineage;
    });
    const hour = L.gold_rate?.hour;
    assert.ok(hour, "two hours away give an hour's rate");
    assert.equal(hour.window_s, 3600);
    assert.equal(hour.net, hour.earned - hour.spent);
    assert.equal(L.gold_rate.day.window_s, 7200);
    checks += 4;
    if (await p.locator(".ending-town").count()) {
      await p.locator(".ending-town").focus();
      await p.keyboard.press("Enter");
    }
    await p.waitForSelector(".camp");
    const bar = p.locator(".topbar .stat.gold .gold-rate").first();
    if (viewport.width >= 1024) {
      assert.equal(await bar.textContent(), `${signed(hour.net_h)}/h`);
      assert.ok(await bar.isVisible(), "desktop shows the rate");
    } else assert.equal(await bar.isVisible(), false, "a phone's bar keeps its numbers only");
    checks++;
    await p.locator(".topbar button.stat.gold:visible").first().click();
    const tiles = p.locator(".gold-sheet .gold-rates");
    await tiles.waitFor({ state: "visible" });
    const val = (k) => tiles.locator(`[data-stat="${k}"] .k-stat-value`).textContent();
    assert.equal(await val("earned"), signed(hour.earned_h));
    assert.equal(await val("spent"), signed(-hour.spent_h));
    assert.equal(await val("net"), signed(hour.net_h));
    assert.equal(await val("day"), signed(L.gold_rate.day.net));
    assert.match(
      await tiles.locator('[data-stat="earned"] .k-stat-note').textContent(),
      /^last 60 min$/,
    );
    const box = await tiles.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width, "the tiles fit the viewport");
    checks += 6;
    if (shots) await p.screenshot({ path: `${shots}/gold-rate-${viewport.width}.png` });
    assert.deepEqual(errors, []);
    await p.close();
  }
  console.log(`gold-rate: ok (${checks} checks)`);
} finally {
  await browser.close();
}
