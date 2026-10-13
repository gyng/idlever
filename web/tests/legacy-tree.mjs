import { responsiveWidths } from "./lib/viewport-cases.mjs";
// UI transaction/lifecycle fixtures. Core purchase/effect truth has separate Rust gates.
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
import assert from "node:assert/strict";
const url =
    process.env.IDLEVER_TEST_URL ??
    execFileSync("bash", ["tools/dev.sh"], {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
    }).trim(),
  browser = await launchBrowser();
try {
  for (const width of responsiveWidths([320, 400, 1440])) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?engine=fake&fresh=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async () => {
      const app = window.__idlever;
      app.runnerOn = false;
      window.legacyCalls = { buy: 0, rebirth: 0 };
      const nodes = [
        ["health", "Health", "Recovery", null, 0],
        ["damage", "Damage", "Control", null, 0],
        ["armour", "Armour", "Warding", null, 0],
        ["restoration", "Restoration", "Recovery", "health", 8],
        ["control", "Control", "Control", "damage", 8],
        ["clear_lungs", "Clear lungs", "Warding", "armour", 8],
        ["mending", "Mending", "Recovery", "restoration", 18],
        ["renewal", "Renewal", "Recovery", "restoration", 18],
        ["venom", "Venom", "Control", "control", 18],
        ["debilitate", "Debilitate", "Control", "control", 18],
        ["fireward", "Fireward", "Warding", "clear_lungs", 18],
        ["brace", "Brace", "Warding", "clear_lungs", 18],
      ];
      window.fixtureRebirthReady = true;
      const wire = () => {
        const b = app.lineage.bloodline;
        const rebirths = app.lineage.persistent_hero?.rebirths ?? 0;
        app.lineage.persistent_hero = {
          id: `fixture:${app.lineage.selected_bloodline}`,
          name: "Fixture hero",
          incarnation: app.lineage.heir,
          rebirths,
          state: app.lineage.live ? "away" : "ready",
          recovery_s: 0,
          rest_s: 0,
          need: "none",
          attributes: [],
          guild: { id: "guild", name: "Guild", available: true, body: "Lifecycle fixture" },
          pool: { id: "recovery", name: "Pool", available: true, body: "Lifecycle fixture" },
          device: {
            id: "reincarnation",
            name: "Device",
            available: true,
            body: "Lifecycle fixture",
          },
          rebirth: {
            refund: b.spent,
            available: b.spent > 0 && !app.lineage.live && window.fixtureRebirthReady,
            blocked:
              b.spent === 0
                ? "No attribute commitments"
                : app.lineage.live
                  ? "Hero away"
                  : window.fixtureRebirthReady
                    ? null
                    : "Complete 8 more delves",
            points_after: b.points + b.spent,
            required_depth: 8,
            delves_remaining: window.fixtureRebirthReady ? 0 : 8,
            seconds_remaining: 0,
            resets: ["Legacy attributes and branches"],
            retains: ["Name and identity", "Class XP and learned skills"],
            token: JSON.stringify([app.lineage.selected_bloodline, app.lineage.heir, b]),
          },
        };
        return nodes.map(([id, name, branch, parent, min_depth]) => {
          const rank = b.upgrades[id] ?? 0;
          const fork = id === "renewal" && app.lineage.bloodline.upgrades.mending;
          const blocked =
            rank >= (parent ? 1 : 3)
              ? "Complete"
              : fork
                ? "Chosen Mending"
                : parent && !b.upgrades[parent]
                  ? `Buy ${parent}`
                  : undefined;
          return {
            id,
            name,
            branch,
            parent,
            min_depth,
            rank,
            cap: parent ? 1 : 3,
            price: parent ? (min_depth === 8 ? 18 : 36) : 3 * (rank + 1),
            effect: id === "health" ? "+3 HP" : "+1 effect",
            affordable: !blocked,
            blocked,
          };
        });
      };
      app.lineage = {
        ...app.lineage,
        live: null,
        selected_bloodline: 1,
        town: { ...app.lineage.town, home: true },
        bloodline: { points: 100, spent: 0, upgrades: {} },
      };
      app.lineage.legacy_upgrades = wire();
      app.engine.lineage = async () => app.lineage;
      app.engine.upgradeHero = async (id) => {
        window.legacyCalls.buy++;
        const row = app.lineage.legacy_upgrades.find((u) => u.id === id);
        app.lineage = {
          ...app.lineage,
          bloodline: {
            points: app.lineage.bloodline.points - row.price,
            spent: app.lineage.bloodline.spent + row.price,
            upgrades: { ...app.lineage.bloodline.upgrades, [id]: row.rank + 1 },
          },
        };
        app.lineage.legacy_upgrades = wire();
        return app.lineage;
      };
      window.installRebirth = (deferred = false) => {
        app.engine.rebirthHero = async (token) => {
          if (
            token !== app.lineage.persistent_hero.rebirth.token ||
            !app.lineage.persistent_hero.rebirth.available
          )
            throw Error("preview refused");
          window.legacyCalls.rebirth++;
          if (deferred) await new Promise((resolve) => (window.releaseRebirth = resolve));
          app.lineage = {
            ...app.lineage,
            heir: app.lineage.heir + 1,
            persistent_hero: {
              ...app.lineage.persistent_hero,
              rebirths: app.lineage.persistent_hero.rebirths + 1,
            },
            bloodline: {
              points: app.lineage.bloodline.points + app.lineage.bloodline.spent,
              spent: 0,
              upgrades: {},
            },
          };
          window.fixtureRebirthReady = false;
          app.lineage.legacy_upgrades = wire();
          return app.lineage;
        };
      };
      window.legacyFixtureWire = wire;
      window.installRebirth();
      const { openHero } = await import("/src/ui/town.ts");
      openHero(app, undefined, "legacy");
    });
    assert.equal(await page.locator(".legacy-branch").count(), 3);
    assert.equal(await page.locator(".legacy-upgrade").count(), 12);
    assert.equal(await page.locator(".legacy-icon img").count(), 12);
    assert.equal(await page.evaluate(() => window.legacyCalls.buy), 0);
    const buy = (id) => page.locator(`button.legacy-buy[data-upgrade="${id}"]`);
    assert.ok(await buy("restoration").isDisabled());
    assert.ok(await buy("mending").isDisabled());
    await page.locator(".legacy-rebirth").click();
    assert.ok(await page.locator('.hero-life-panel [data-life-focus="confirm"]').isDisabled());
    await page.locator('.hero-life-panel [data-life-focus="cancel"]').click();
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    if (width < 900) {
      assert.equal(await page.locator(".legacy-path[open]").count(), 0);
      await page.locator('[data-legacy-branch="Recovery"] summary').click();
    }
    await buy("health").click();
    await page.waitForFunction(() => window.__idlever.lineage.bloodline.spent === 3);
    await buy("restoration").click();
    await page.waitForFunction(() => window.__idlever.lineage.bloodline.spent === 21);
    await buy("mending").click();
    await page.waitForFunction(() => window.__idlever.lineage.bloodline.spent === 57);
    assert.equal(await page.evaluate(() => window.legacyCalls.buy), 3);
    assert.ok(await buy("renewal").isDisabled());
    assert.equal(
      await page.locator('section[data-upgrade="mending"] .legacy-buy').textContent(),
      "Chosen",
    );
    await page.keyboard.press("Tab");
    await page.locator('section[data-upgrade="mending"] .legacy-node-name').focus();
    await page.locator("#kw-tip:not([hidden])").waitFor();
    assert.match(await page.locator("#kw-tip").textContent(), /Requires Restoration/);
    assert.match(await page.locator("#kw-tip").textContent(), /Reach D18/);
    await page.keyboard.press("Escape");
    const review = page.locator(".sheet-wrap:not([hidden]) .hero-life-panel");
    const rebirth = page.locator(".legacy-rebirth");
    await rebirth.click();
    assert.match(await review.textContent(), /57 Legacy refunded/);
    assert.equal(await page.evaluate(() => window.legacyCalls.rebirth), 0);
    await review.locator('[data-life-focus="cancel"]').click();
    assert.equal(await page.evaluate(() => window.__idlever.lineage.bloodline.spent), 57);
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    await rebirth.click();
    await page.evaluate(() => {
      window.__idlever.engine.rebirthHero = async () => {
        throw Error("fixture refusal");
      };
    });
    await review.locator('[data-life-focus="confirm"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector(".sheet-wrap:not([hidden]) .hero-life-feedback")
        ?.textContent.includes("fixture refusal"),
    );
    assert.equal(await page.evaluate(() => window.__idlever.lineage.bloodline.spent), 57);
    await review.locator('[data-life-focus="cancel"]').click();
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    await page.evaluate(() => window.installRebirth(true));
    await rebirth.click();
    await review.locator('[data-life-focus="confirm"]').evaluate((el) => {
      el.click();
      el.click();
    });
    await page.waitForFunction(() => typeof window.releaseRebirth === "function");
    assert.equal(await page.evaluate(() => window.legacyCalls.rebirth), 1);
    assert.ok(await review.locator('[data-life-focus="confirm"]').isDisabled());
    await page.evaluate(() => window.releaseRebirth());
    await page.waitForFunction(() => window.__idlever.lineage.bloodline.spent === 0);
    assert.deepEqual(await page.evaluate(() => window.__idlever.lineage.bloodline), {
      points: 100,
      spent: 0,
      upgrades: {},
    });
    await review.locator('[data-life-focus="review"]').click();
    assert.ok(
      await review.locator('[data-life-focus="confirm"]').isDisabled(),
      "new eligibility required after Rebirth",
    );
    await review.locator('[data-life-focus="cancel"]').click();
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    await buy("health").click();
    await page.waitForFunction(() => window.__idlever.lineage.bloodline.spent === 3);
    // Explicit synthetic eligible boundary, not eight earned delves.
    await page.evaluate(async () => {
      window.fixtureRebirthReady = true;
      const a = window.__idlever;
      a.lineage.legacy_upgrades = window.legacyFixtureWire();
      await a.afterLineage();
    });
    await rebirth.click();
    await page.evaluate(async () => {
      window.oldRebirthConfirm = document.querySelector(
        '.sheet-wrap:not([hidden]) [data-life-focus="confirm"]',
      );
      const a = window.__idlever;
      a.lineage.selected_bloodline = 2;
      a.lineage.legacy_upgrades = window.legacyFixtureWire();
      await a.afterLineage();
      window.oldRebirthConfirm.click();
    });
    assert.equal(await page.evaluate(() => window.legacyCalls.rebirth), 1);
    assert.equal(
      await review.locator('[data-life-focus="confirm"]').count(),
      0,
      "changed owner requires a new Review",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    await page.evaluate(async () => {
      const a = window.__idlever;
      a.lineage = { ...a.lineage, live: { depth: 1, turn: 1 } };
      a.lineage.legacy_upgrades = window
        .legacyFixtureWire()
        .map((u) => ({ ...u, affordable: false }));
      await a.afterLineage();
    });
    await rebirth.click();
    assert.ok(await review.locator('[data-life-focus="confirm"]').isDisabled());
    await review.locator('[data-life-focus="cancel"]').click();
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    for (const button of await page.locator(".legacy-buy").all())
      assert.ok(await button.isDisabled());
    // blind b58b431 (A: Legacy 146 unspendable while the scout kept him away): away, an upgrade the points buy is bought for the next run
    await page.evaluate(async () => {
      const a = window.__idlever;
      window.legacyCalls.next = [];
      a.engine.upgradeHeroNext = async (id) => {
        window.legacyCalls.next.push(id);
        return a.lineage;
      };
      a.lineage = {
        ...a.lineage,
        legacy_upgrades: a.lineage.legacy_upgrades.map((u) =>
          u.id === "damage" ? { ...u, next_run: true, blocked: "Hero away" } : u,
        ),
      };
      await a.afterLineage();
    });
    const next = buy("damage");
    assert.ok(!(await next.isDisabled()), "away, the next-run upgrade is offered");
    assert.match(await next.textContent(), /next run/);
    assert.ok(await buy("armour").isDisabled());
    const bought = await page.evaluate(() => window.legacyCalls.buy);
    await next.click();
    await page.waitForFunction(() => window.legacyCalls.next.length === 1);
    assert.deepEqual(await page.evaluate(() => window.legacyCalls.next), ["damage"]);
    assert.equal(
      await page.evaluate(() => window.legacyCalls.buy),
      bought,
      "the away purchase is the next-run call",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      width,
      "12 nodes/icons, mobile fold, purchase/fork/tooltips, cancel/refusal/one-call/stale/away/refund PASS",
    );
    await page.close();
  }
} finally {
  await browser.close();
}
