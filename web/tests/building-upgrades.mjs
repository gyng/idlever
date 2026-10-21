// Cut315: the Bank/Vat upgrades on real WASM — an earned first-ascension town (Bank + Clerk, D34) whose purse is
// moved into Savings (the ledger unchanged, no grant). The Bank sheet's row: level and effect, the Savings toggle
// required for a shortfall, one exact debit; stale payer/level/price refused with the save unchanged; the level
// survives a reload. Vat row in the Vat's panel when the Vat stands. Screenshots with SHOTS=dir.
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
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/earned-first-ascension-clear.json", import.meta.url), "utf8"),
);
// Savings hold all but $1000 of the purse: the first level needs a withdrawal.
const moved = fixture.lineage.gold - 1000;
fixture.lineage.gold = 1000;
fixture.lineage.town.bank += moved;
const source = JSON.stringify(fixture);
const wallet = (L) => L.gold + L.town.bank;
const browser = await launchBrowser();
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
      a.go({ kind: "camp" });
      return a.lineage;
    }, source);
    const bank0 = L0.town.upgrades.find((u) => u.id === "bank");
    assert.equal(bank0.level, 2);
    assert.equal(bank0.next.level, 3);
    assert.equal(bank0.next.price, 3400);
    assert.ok(bank0.next.ready && bank0.next.withdrawal > 0 && bank0.next.affordable_with_savings);
    if (await p.locator(".ending-town").count()) {
      await p.locator(".ending-town").focus();
      await p.keyboard.press("Enter");
      await p.waitForSelector(".camp");
    }
    await p.locator('.town-hit[data-building="bank"]').click();
    const row = p.locator('.bank-sheet .building-upgrade[data-upgrade="bank"]');
    await row.waitFor({ state: "visible" });
    assert.match(await row.textContent(), /Level II.*3 nights.*Next III.*\+2%\/night · 5 nights/s);
    const buy = row.locator(".building-upgrade-buy");
    const toggle = row.locator(".building-upgrade-savings");
    assert.equal(await buy.isDisabled(), true, "a shortfall needs the Savings toggle");
    assert.equal(await toggle.textContent(), `Savings $${bank0.next.withdrawal}`);
    if (shots) await p.screenshot({ path: `${shots}/bank-${viewport.width}-before.png` });
    // Stale requests: wrong payer, wrong level, a lower price, Gold-only — each refused, the save unchanged.
    const before = await p.evaluate(() => window.__idlever.engine.save());
    for (const bad of [
      { payer: bank0.next.payer + 1 },
      { level: 4 },
      { max_price: 3399 },
      { use_savings: false },
    ]) {
      const refused = await p.evaluate(
        async (r) =>
          window.__idlever.engine.upgradeBuilding(r).then(
            () => null,
            (e) => String(e?.message ?? e),
          ),
        {
          id: "bank",
          payer: bank0.next.payer,
          level: 3,
          max_price: 3400,
          use_savings: true,
          ...bad,
        },
      );
      assert.ok(refused, `refused ${JSON.stringify(bad)}`);
      assert.equal(await p.evaluate(() => window.__idlever.engine.save()), before);
    }
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    assert.equal(await buy.isDisabled(), false);
    if (shots) await p.screenshot({ path: `${shots}/bank-${viewport.width}-savings.png` });
    await buy.click();
    await p.waitForSelector(
      '.bank-sheet .building-upgrade[data-upgrade="bank"][data-upgrade-level="3"]',
    );
    const L1 = await p.evaluate(() => window.__idlever.lineage);
    assert.equal(wallet(L1), wallet(L0) - 3400, "one exact debit");
    assert.equal(
      L1.town.bank,
      L0.town.bank - bank0.next.withdrawal,
      "exactly the quoted withdrawal",
    );
    const bank1 = L1.town.upgrades.find((u) => u.id === "bank");
    assert.equal(bank1.effect, "+2%/night · 5 nights");
    assert.equal(bank1.next.price, 43200);
    if (shots) await p.screenshot({ path: `${shots}/bank-${viewport.width}-after.png` });
    // The level is saved: a reload through the real worker keeps it and charges nothing.
    const L2 = await p.evaluate(async () => {
      const a = window.__idlever;
      a.lineage = await a.engine.load(await a.engine.save());
      return a.lineage;
    });
    assert.equal(L2.town.upgrades.find((u) => u.id === "bank").level, 3);
    assert.equal(wallet(L2), wallet(L1));
    // The Vat's row sits in the Vat's panel when the Vat stands.
    const vat = L2.town.upgrades.find((u) => u.id === "device");
    if (vat) {
      await p.keyboard.press("Escape");
      await p.locator('.town-hit[data-building="device"]').click();
      const vrow = p.locator('.building-upgrade[data-upgrade="device"]');
      await vrow.waitFor({ state: "visible" });
      assert.match(await vrow.textContent(), /Level I.*Next II.*−20% clone · −25% hurry/s);
      if (shots) await p.screenshot({ path: `${shots}/vat-${viewport.width}.png` });
    }
    assert.deepEqual(errors, []);
    await p.close();
  }
  console.log("ok building-upgrades");
} finally {
  await browser.close();
}
