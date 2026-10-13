// Actual Rust-WASM actions; no progression or resource grants.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
const results = [];
try {
  for (const width of [320, 400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?fresh=1&seed=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    const before = await page.evaluate(async () => {
      const app = window.__idlever;
      app.runnerOn = false;
      if (app.kind !== "wasm") throw Error("real WASM required");
      return { save: await app.engine.save(), journal: app.lineage.journal };
    });
    assert.equal(before.journal.recommended, "house");
    if (!(await page.locator('[data-tile="journal"]:visible').isVisible())) {
      console.log(
        JSON.stringify(
          await page.evaluate(() => {
            const out = [];
            let node = document.querySelector('[data-tile="journal"]');
            while (node) {
              const s = getComputedStyle(node);
              const r = node.getBoundingClientRect();
              out.push({
                tag: node.tagName,
                class: node.className,
                hidden: node.hidden,
                display: s.display,
                visibility: s.visibility,
                width: r.width,
                height: r.height,
              });
              node = node.parentElement;
            }
            return {
              ancestors: out,
              text: document.body.innerText,
              css: [...document.styleSheets].map((s) => s.href),
            };
          }),
        ),
      );
      throw Error("first-town Journal is hidden");
    }
    await page.locator('[data-tile="journal"]:visible').click();
    await page.locator('.journal-step[data-recommended="true"]').waitFor();
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), before.save);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const wrap = document.querySelector(".journal-panel").closest(".sheet-wrap");
      await Promise.all(
        wrap
          .getAnimations({ subtree: true })
          .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
          .map((a) => a.finished.catch(() => {})),
      );
    });
    for (const scale of [1, 2]) {
      await page.evaluate((n) => {
        document.documentElement.style.fontSize = `${16 * n}px`;
      }, scale);
      await page.waitForTimeout(100);
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".journal-panel");
        const sheet = panel.closest(".sheet");
        const r = panel.querySelector('[data-recommended="true"] button').getBoundingClientRect();
        return {
          recommended: panel.querySelectorAll('[data-recommended="true"]').length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          innerOverflow: sheet ? sheet.scrollWidth > sheet.clientWidth + 1 : false,
          button: { width: r.width, height: r.height },
          cageControls: document.querySelectorAll(".cage-tab,.cage-picker,.vault-choice").length,
        };
      });
      console.log(JSON.stringify({ width, scale, ...geometry }));
      assert.equal(geometry.recommended, 1);
      assert.equal(geometry.overflow, false);
      assert.equal(geometry.innerOverflow, false);
      assert.ok(geometry.button.width >= 44 && geometry.button.height >= 44);
      assert.equal(geometry.cageControls, 0);
      results.push({ width, scale, ...geometry });
    }
    await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
    await page.locator('[data-journal-focus="action:house"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__idlever.lineage.journal.recommended === "delve");
    await page.locator('[data-journal-focus="action:delve"]').waitFor();
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.journalFocus),
      "action:delve",
    );
    assert.equal(await page.evaluate(() => window.__idlever.lineage.town.home), true);
    // The actual resident arrival animation keeps the existing Delve guard closed briefly.
    await page.waitForFunction(() => !document.querySelector(".camp .console .gem")?.disabled);
    await page.locator('[data-journal-focus="action:delve"]').click();
    await page.locator(".watch").waitFor();
    assert.equal(
      await page.evaluate(async () => !!JSON.parse(await window.__idlever.engine.save()).run),
      true,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(JSON.stringify({ source: "actual fresh seed1, real House/Delve actions", results }));
} finally {
  await browser.close();
}
