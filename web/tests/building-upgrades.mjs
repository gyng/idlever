// Controlled real-engine town: effect levels spend the displayed price once and change Rust's capacity/hurry.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  }).trim();
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
raw.lineage.gold = 100000;
raw.lineage.best_depth = 23;
raw.lineage.last_night_net = 1000;
raw.lineage.town.built.push(["bank", 0]);
raw.lineage.tree.hired.push(["clerk", 0]);
const browser = await launchBrowser();
let checks = 0;
const ok = (value, message) => {
  assert.ok(value, message);
  checks++;
};
try {
  for (const viewport of [phoneReviewViewport(), { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?fresh=1&seed=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async (raw) => {
      const app = window.__idlever;
      app.runnerOn = false;
      await app.engine.load(JSON.stringify(raw));
      await app.refresh();
      app.go({ kind: "camp" });
    }, raw);
    const baseline = await page.evaluate(() => ({
      gold: window.__idlever.lineage.gold,
      cap: window.__idlever.lineage.town.bank_cap,
      hurry: window.__idlever.lineage.persistent_hero.hurry_price,
      kind: window.__idlever.kind,
    }));
    ok(baseline.kind === "wasm", "real engine");
    // Core refuses a stale displayed price without changing the town or purse.
    const refused = await page.evaluate(async () => {
      const app = window.__idlever;
      const before = await app.engine.save();
      const offer = app.lineage.town.upgrades.find((row) => row.id === "bank").next;
      let message = "";
      try {
        await app.engine.upgradeBuilding("bank", offer.price - 1);
      } catch (error) {
        message = String(error.message ?? error);
      }
      return { message, same: before === (await app.engine.save()) };
    });
    ok(
      /price changed/.test(refused.message) && refused.same,
      "stale price refuses without mutation",
    );
    await page.locator('.town-hit[data-building="bank"]').waitFor({ state: "visible" });
    await page.locator('.town-hit[data-building="bank"]').click({ force: true });
    const bank = page.locator('[data-upgrade="bank"]');
    await bank.waitFor();
    if (process.env.IDLEVER_CAPTURE_DIR) {
      await bank.scrollIntoViewIfNeeded();
      mkdirSync(process.env.IDLEVER_CAPTURE_DIR, { recursive: true });
      await page.screenshot({
        path: `${process.env.IDLEVER_CAPTURE_DIR}/bank-${viewport.width}.png`,
      });
    }
    let spent = 0;
    for (const level of [3, 4]) {
      const button = bank.locator("button");
      const price = Number(await button.getAttribute("data-upgrade-price"));
      ok(price > 0 && (await button.isEnabled()), `Bank ${level} offered`);
      const rect = await button.boundingBox();
      ok(
        rect.height >= 44 && rect.x >= 0 && rect.x + rect.width <= viewport.width,
        "upgrade tap fits viewport",
      );
      await button.click();
      spent += price;
      await page.waitForFunction(
        (level) =>
          window.__idlever.lineage.town.upgrades.find((row) => row.id === "bank").level === level,
        level,
      );
    }
    ok((await bank.locator("button").count()) === 0, "Bank max level has no purchase");
    const bankAfter = await page.evaluate(() => ({
      gold: window.__idlever.lineage.gold,
      cap: window.__idlever.lineage.town.bank_cap,
      drop: document.querySelector(".gold-drop")?.textContent,
    }));
    ok(/upgrade/.test(bankAfter.drop ?? ""), `purse names upgrade: ${bankAfter.drop}`);
    ok(bankAfter.gold === baseline.gold - spent, "Bank debited once per level");
    ok(bankAfter.cap > baseline.cap, "Bank capacity grows");
    await page.keyboard.press("Escape");
    await page.locator('.town-hit[data-building="device"]').click({ force: true });
    const vat = page.locator('[data-upgrade="device"]');
    await vat.waitFor();
    if (process.env.IDLEVER_CAPTURE_DIR) {
      await vat.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${process.env.IDLEVER_CAPTURE_DIR}/vat-upgrades-${viewport.width}.png`,
      });
    }
    for (const level of [2, 3]) {
      const button = vat.locator("button");
      const price = Number(await button.getAttribute("data-upgrade-price"));
      await button.click();
      spent += price;
      await page.waitForFunction(
        (level) =>
          window.__idlever.lineage.town.upgrades.find((row) => row.id === "device").level === level,
        level,
      );
    }
    const after = await page.evaluate(() => ({
      gold: window.__idlever.lineage.gold,
      hurry: window.__idlever.lineage.persistent_hero.hurry_price,
    }));
    ok(after.gold === baseline.gold - spent, "Vat debited once per level");
    ok(after.hurry < baseline.hurry && after.hurry > 0, "Vat discounts the live hurry price");
    ok((await vat.locator("button").count()) === 0, "Vat max level has no purchase");
    ok(errors.length === 0, errors.join("\n"));
    await page.close();
  }
  console.log(`building-upgrades: ${checks} checks PASS (real WASM; phone/desktop)`);
} finally {
  await browser.close();
}
