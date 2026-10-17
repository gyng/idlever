import { stateWidths } from "./lib/viewport-cases.mjs";
// Controlled unlock fixtures; real Rust/WASM worker transactions, no earned-play claim.
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
import assert from "node:assert/strict";
/** Sheets open (and re-open when a review closes) with an overshooting j-sheet animation; under a loaded suite Playwright's
 *  two-frame stability check can pass at the apex and the tap lands beside the control (Cut227, the class-tree flake). Tap
 *  only once the control's window has settled. */
async function settledClick(locator) {
  await locator.evaluate((el) =>
    Promise.all(
      (el.closest(".sheet-wrap") ?? document.body)
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  await locator.click();
}
const url = execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim(),
  browser = await launchBrowser();
try {
  for (const width of stateWidths([320, 400, 1440])) {
    const page = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?fresh=1&seed=3&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async () => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error("real WASM required");
      a.runnerOn = false;
      const { openHero } = await import("/src/ui/town.ts");
      openHero(a, undefined, "class");
    });
    assert.equal(await page.locator(".class-style-panel").count(), 0);
    await page.evaluate(async () => {
      const a = window.__idlever,
        s = JSON.parse(await a.engine.save()),
        l = s.lineage;
      l.town.home = true;
      l.class = "fighter";
      l.classes.fighter = { level: 9, xp: 123, next: 0 };
      l.best_depth = 23;
      l.hero_legacy.at(-1).best_depth = 23;
      l.unlocks.push("caster");
      l.classes.caster = { level: 10, xp: 234, next: 0 };
      window.styleFixture = s;
      window.showStyle = async () => {
        a.lineage = await a.engine.load(JSON.stringify(window.styleFixture));
        a.adoptSets();
        await a.afterLineage();
        const { closeAllSheets } = await import("/src/ui/sheet.ts");
        closeAllSheets();
        const { openHero } = await import("/src/ui/town.ts");
        openHero(a, undefined, "class");
      };
      await window.showStyle();
      return a.engine.save();
    });
    assert.ok(await page.locator(".class-style-choose").isDisabled());
    assert.match(await page.locator(".class-style-panel").textContent(), /reach class level 10/);
    await page.keyboard.press("Tab");
    await page.locator(".class-style-title").focus();
    await page.locator("#kw-tip:not([hidden])").waitFor();
    assert.match(await page.locator("#kw-tip").textContent(), /counter 8/);
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
      window.styleFixture.lineage.classes.fighter.level = 10;
      window.styleFixture.lineage.best_depth = 22;
      window.styleFixture.lineage.hero_legacy.at(-1).best_depth = 22;
      await window.showStyle();
    });
    assert.ok(await page.locator(".class-style-choose").isDisabled());
    assert.match(await page.locator(".class-style-panel").textContent(), /reach D23/);
    await page.evaluate(async () => {
      window.styleFixture.lineage.best_depth = 23;
      await window.showStyle();
    });
    const ready = await page.evaluate(() => window.__idlever.engine.save());
    await settledClick(page.locator(".class-style-choose"));
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), ready);
    assert.match(await page.locator(".class-style-review").textContent(), /Automatic tactic/);
    await settledClick(page.locator(".class-style-review button").first());
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), ready);
    // Stale review checks the actual updated parent choice; no engine mutation by confirmation.
    await settledClick(page.locator(".class-style-choose"));
    await page.evaluate(async () => {
      await window.__idlever.setClass("caster");
    });
    const switched = await page.evaluate(() => window.__idlever.engine.save());
    await settledClick(page.locator(".class-style-confirm"));
    assert.equal(await page.locator(".class-style-feedback").textContent(), "Review changed");
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), switched);
    await settledClick(page.locator(".class-style-review button").first());
    await page.evaluate(async () => window.showStyle());
    // Real worker refusal: run starts after review without changing the UI's cached review.
    await settledClick(page.locator(".class-style-choose"));
    // Persistent heroes (a327b8dd): a sent run is still home until its first turn; step one so the hero is away.
    await page.evaluate(async () => {
      const e = window.__idlever.engine;
      await e.send();
      await e.step(1);
    });
    const away = await page.evaluate(() => window.__idlever.engine.save());
    await settledClick(page.locator(".class-style-confirm"));
    await page.waitForFunction(() =>
      document.querySelector(".class-style-feedback")?.textContent.includes("hero away"),
    );
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), away);
    await settledClick(page.locator(".class-style-review button").first());
    await page.evaluate(async () => window.showStyle());
    // Double activation is one actual worker call; adopting the compiled set exposes the named row.
    await page.evaluate(() => {
      const a = window.__idlever,
        call = a.engine.setSpecialization.bind(a.engine);
      window.styleCalls = 0;
      a.engine.setSpecialization = async (id) => {
        window.styleCalls++;
        return call(id);
      };
    });
    await settledClick(page.locator(".class-style-choose"));
    await page.locator(".class-style-confirm").evaluate((el) => {
      el.click();
      el.click();
    });
    await page.waitForFunction(() => window.__idlever.lineage.class_styles.selected === "sentinel");
    assert.equal(await page.evaluate(() => window.styleCalls), 1);
    assert.ok(
      await page.evaluate(() =>
        window.__idlever.rules.rows.some((r) => r.origin === "style:sentinel"),
      ),
    );
    const chosen = await page.evaluate(async () => {
      const a = window.__idlever;
      await a.flush();
      return a.engine.save();
    });
    await page.goto(`${url}?seed=3&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), chosen);
    await page.evaluate(async () => {
      const a = window.__idlever;
      a.runnerOn = false;
      const { openHero } = await import("/src/ui/town.ts");
      openHero(a, undefined, "class");
    });
    assert.match(await page.locator(".class-style-choose").textContent(), /Remove path/);
    await settledClick(page.locator(".class-style-choose"));
    assert.match(await page.locator(".class-style-review").textContent(), /Tactic removed/);
    await settledClick(page.locator(".class-style-confirm"));
    await page.waitForFunction(() => window.__idlever.lineage.class_styles.selected === null);
    assert.ok(
      await page.evaluate(
        () => !window.__idlever.rules.rows.some((r) => r.origin === "style:sentinel"),
      ),
    );
    assert.equal(await page.evaluate(() => window.__idlever.lineage.classes.fighter.xp), 123);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.ok(
      await page.evaluate(() => {
        // Hero Hub (Cut220): the Skills heading carries class + style, as the retired `.hero-line` did.
        const h = document.querySelector(
          '.sheet-wrap:not([hidden]) [data-hub-panel="skills"] .hero-hub-heading',
        );
        return (
          h.scrollWidth <= h.clientWidth &&
          [...h.children].every(
            (c) => c.getBoundingClientRect().right <= h.getBoundingClientRect().right + 1,
          )
        );
      }),
    );
    assert.deepEqual(errors, []);
    console.log(
      width,
      "real-worker gates/tooltip/review/cancel/stale/refusal/one-call/compiled row/reload/remove/XP PASS",
    );
    await page.close();
  }
} finally {
  await browser.close();
}
