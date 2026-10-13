import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.UI_CLARITY_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launchBrowser();
let checks = 0;
try {
  for (const width of [320, 400, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?engine=fake&fresh=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(async () => {
      const a = window.__idlever;
      a.lineage.chronicle = [];
      a.lineage.selected_bloodline = 1;
      a.lineage.hero_slots = [
        {
          id: 1,
          name: "Ash bloodline",
          hero_name: "Maren",
          heir: 7,
          class: "fighter",
          level: 1,
          xp: 0,
          next: 100,
          state: "waits",
          rest_s: 0,
          notice: false,
          legacy: { points: 0, spent: 0, upgrades: {} },
        },
        {
          id: 2,
          name: "Other bloodline",
          hero_name: "Lark",
          heir: 8,
          class: "caster",
          level: 2,
          xp: 100,
          next: 300,
          state: "waits",
          rest_s: 0,
          notice: false,
          legacy: { points: 0, spent: 0, upgrades: {} },
          chronicle: ["♟7 the patient caster · best D14"],
        },
      ];
      (await import("/src/ui/chronicle.ts")).openChronicle(a);
    });
    await p.locator(".sheet-wrap:not(.under) .chronicle-empty").waitFor();
    assert.match(
      await p.locator(".sheet-wrap:not(.under) .chronicle-empty").textContent(),
      /Ash bloodline · Maren/,
    );
    assert.match(
      await p.locator(".sheet-wrap:not(.under) .chronicle-empty").textContent(),
      /ended heirs.*Completed delves appear in Runs/,
    );
    assert.equal(await p.locator(".sheet-wrap:not(.under) .chronicle .cline").count(), 1);
    checks += 3;
    if (shots) await p.screenshot({ path: `${shots}/chronicle-empty-${width}.png` });
    await p
      .locator(".sheet-wrap:not(.under) .chronicle-empty button")
      .filter({ hasText: /^Runs$/ })
      .click();
    await p.locator(".runs-sheet[data-tab=runs]").waitFor();
    await p.locator(".log-tab[data-tab=heirs]").click();
    assert.match(
      await p.locator(".sheet-wrap:not(.under) .chronicle-empty").textContent(),
      /Maren/,
    );
    checks++;
    await p
      .locator(".sheet-wrap:not(.under) .chronicle-empty button")
      .filter({ hasText: "Current hero" })
      .click();
    await p.locator(".sheet-wrap:not(.under) .hero-actions").waitFor();
    checks++;
    await p.evaluate(async () => {
      const a = window.__idlever;
      (await import("/src/ui/sheet.ts")).closeAllSheets();
      a.lineage.chronicle = ["♟1 the steady fighter · best D8"];
      (await import("/src/ui/chronicle.ts")).openChronicle(a);
    });
    assert.equal(await p.locator(".sheet-wrap:not(.under) .chronicle-empty").count(), 0);
    assert.equal(await p.locator(".sheet-wrap:not(.under) .chronicle .cline").count(), 2);
    checks += 2;
    await p.evaluate(async () => {
      const a = window.__idlever;
      (await import("/src/ui/sheet.ts")).closeAllSheets();
      a.lineage.runs = [
        { id: 1, depth: 4, gold: 10, turns: 600, tier: "return", via: "watched", clock_s: 60 },
      ];
      const side = { hero: 20, pets: 0, foes: 20 };
      a.lineage.meters = {
        runs: [
          {
            seconds: 60,
            dealt: side,
            taken: side,
            dps_dealt: side,
            dps_taken: side,
            healed: [],
            hps: 0,
            time: { fight: 20, travel: 40, chores: 0, rest: 0 },
            time_s: { fight: 20, travel: 40, chores: 0, rest: 0 },
            rows: [],
            actions: 5,
            supplies: {},
            gold: 10,
            gold_per_min: 10,
            hits_hero: 2,
            hits_pets: 0,
            fights: 1,
          },
        ],
      };
      a.go({ kind: "camp" });
      document.documentElement.dataset.juice = "on";
      await document.fonts.ready;
    });
    const sheen = await p.evaluate(() =>
      [".topbar", ".console"].map((s) => {
        const e = document.querySelector(s);
        return getComputedStyle(e, "::after").animationName;
      }),
    );
    assert.ok(
      sheen.every((n) => n === "none"),
      JSON.stringify(sheen),
    );
    checks++;
    const summary = p.locator(".camp-run-details > summary");
    if (width < 1024) {
      assert.equal(await summary.isVisible(), false, "desktop diagnostics hidden on phone");
      assert.deepEqual(errors, []);
      checks += 2;
      await p.close();
      continue;
    }
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    const read = () =>
      p.evaluate(() => {
        const r = document.querySelector(".camp-run-details > summary").getBoundingClientRect();
        const vista = document.querySelector(".town").getBoundingClientRect();
        return {
          y: r.y,
          scroll: scrollY,
          sceneHeight: vista.height,
          sceneY: vista.y,
          focused: document.activeElement.matches(".camp-run-details > summary"),
        };
      });
    const before = await read();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(150);
    const after = await read();
    if (shots) await p.screenshot({ path: `${shots}/run-details-expanded-${width}.png` });
    assert.ok(
      Math.abs(after.y - before.y) <= 2,
      `summary moved ${JSON.stringify({ before, after })}`,
    );
    assert.ok(Math.abs(after.scroll - before.scroll) <= 2, "viewport scrolled on expansion");
    assert.ok(after.focused, "disclosure lost keyboard focus");
    if (width === 1440) {
      assert.ok(Math.abs(after.sceneHeight - before.sceneHeight) <= 2, "town scene resized");
      assert.ok(Math.abs(after.sceneY - before.sceneY) <= 2, "town scene moved");
    }
    await p.keyboard.press("Enter");
    await p.waitForTimeout(150);
    const collapsed = await read();
    assert.ok(Math.abs(collapsed.y - before.y) <= 2, "collapse moved summary");
    assert.deepEqual(errors, []);
    checks += 5;
    await p.close();
  }
  console.log(`ui-clarity: ${checks} checks PASS`);
} finally {
  await browser.close();
}
