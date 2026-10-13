import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";

// Earned with three manual delves, paid Scout and actual eight-hour catch-up.
// No Gold, unlock, discovery or receipt is granted by this test.
const engine = execFileSync(
  "tar",
  [
    "-xOzf",
    new URL("../../docs/evidence/cut203/earned-kits.tar.gz", import.meta.url).pathname,
    "earned-wall.json",
  ],
  { encoding: "utf8" },
);
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.IDLEVER_KIT_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launchBrowser({ gpu: process.env.IDLEVER_KIT_GPU === "1" });
const outcomes = [];
try {
  for (const width of [320, 400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?fresh=1&runs=0&seed=203`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async (engine) => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error("real WASM required");
      a.runnerOn = false;
      if (
        !(await a.importSave(
          JSON.stringify({ v: 2, engine, loadout: [], runs: 0, last_seen: Date.now() }),
        ))
      )
        throw Error("earned save import failed");
      (await import("/src/ui/town.ts")).openHero(a, undefined, "loadouts");
    }, engine);
    const panel = page.locator('.sheet-wrap:not(.under) [data-bloodline-panel="loadouts"]');
    const kits = panel.locator("[data-starting-kits]");
    await kits.waitFor();
    const gold = await page.evaluate(() => window.__idlever.lineage.gold);
    assert.equal(gold, 1393);
    assert.equal(await kits.locator('[data-selected-kit="defaults"]').count(), 1);
    assert.ok(await kits.locator('[data-kit-choice="axe"]').isEnabled());
    await kits.locator('[data-starting-gear="weapon"] summary').click();
    await kits.locator('[data-kit-choice="axe"]').click();
    await page.waitForFunction(
      () => window.__idlever.lineage.starting_kits.current?.weapon === "axe",
    );
    assert.ok(
      await kits.locator('[data-starting-gear="weapon"]').evaluate((el) => el.open),
      "choice stays open after refresh",
    );
    await kits.locator('[data-starting-gear="armour"] summary').click();
    await kits.locator('[data-kit-choice="none"]').click();
    await page.waitForFunction(
      () => window.__idlever.lineage.starting_kits.current?.armour === "none",
    );
    await kits.locator('[aria-label="Kit name"]').fill("Heavy strike");
    await kits.locator(".kit-save button").click();
    await page.waitForFunction(() => window.__idlever.lineage.starting_kits.saved.length === 1);
    const id = await page.evaluate(() => window.__idlever.lineage.starting_kits.saved[0].id);
    assert.equal(
      await kits.locator('[data-selected-kit="custom"]').count(),
      1,
      "saving does not silently select",
    );
    await kits.locator(`[data-saved-kit="${id}"] button`).filter({ hasText: /^Use$/ }).click();
    await page.waitForFunction(() => !!window.__idlever.lineage.starting_kits.selected);
    assert.equal(await kits.locator("[data-selected-kit]").textContent(), "Heavy strike");
    await kits.locator('[aria-label="Kit name"]').fill("Heavy revised");
    await kits.locator(".kit-save button").click();
    await page.waitForFunction(
      () => window.__idlever.lineage.starting_kits.saved[0].name === "Heavy revised",
    );
    assert.equal(
      await page.evaluate(() => window.__idlever.lineage.starting_kits.selected),
      null,
      "editing record detaches active identity",
    );
    assert.equal(
      await page.evaluate(() => window.__idlever.lineage.starting_kits.current.weapon),
      "axe",
    );
    await kits.locator(`[data-saved-kit="${id}"] button`).filter({ hasText: /^Use$/ }).click();
    await page.waitForFunction(() => !!window.__idlever.lineage.starting_kits.selected);
    const refused = await page.evaluate(async () => {
      const a = window.__idlever,
        e = a.engine,
        before = await e.save();
      let nameError = "",
        idError = "";
      await e
        .saveStartingKit("", JSON.stringify(a.lineage.starting_kits.current))
        .catch((error) => {
          nameError = error.message;
        });
      const badName = before === (await e.save());
      await e.selectStartingKit("not-an-owned-id").catch((error) => {
        idError = error.message;
      });
      return { badName, badId: before === (await e.save()), nameError, idError };
    });
    assert.deepEqual(refused, {
      badName: true,
      badId: true,
      nameError: "invalid kit name",
      idError: "unknown kit",
    });
    await page.evaluate(async () => {
      const a = window.__idlever;
      const saved = await a.engine.save();
      await a.engine.load(saved);
      await a.refresh();
    });
    assert.equal(await kits.locator("[data-selected-kit]").textContent(), "Heavy revised");
    const geometry = await panel.evaluate((el) => {
      const bad = [...el.querySelectorAll("*")]
        .filter((node) => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1;
        })
        .map((node) => ({
          tag: node.tagName,
          class: node.className,
          extra: node.scrollWidth - node.clientWidth,
        }));
      return { bad, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.equal(geometry.overflow, false);
    assert.deepEqual(geometry.bad, [], `nested overflow at ${width}`);
    if (shots) {
      await page.screenshot({ path: `${shots}/${width}-earned-saved-kit.png` });
      await kits.locator("details").evaluateAll((nodes) =>
        nodes.forEach((node) => {
          node.open = false;
        }),
      );
      await panel.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({ path: `${shots}/${width}-earned-heavy-kit.png` });
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const enlarged = await panel.evaluate((el) => ({
      overflow:
        el.scrollWidth > el.clientWidth + 1 ||
        document.documentElement.scrollWidth > innerWidth + 1,
      small: [
        ...el.querySelectorAll(".starting-kits button,.starting-kits input,.starting-kits summary"),
      ]
        .filter(
          (node) =>
            node.getBoundingClientRect().height > 0 && node.getBoundingClientRect().height < 44,
        )
        .map((node) => node.textContent),
    }));
    assert.equal(enlarged.overflow, false);
    assert.deepEqual(enlarged.small, []);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
    await kits
      .locator(`[data-saved-kit="${id}"] button`)
      .filter({ hasText: /^Delete$/ })
      .click();
    await page.waitForFunction(() => window.__idlever.lineage.starting_kits.saved.length === 0);
    assert.equal(
      await page.evaluate(() => window.__idlever.lineage.starting_kits.current.weapon),
      "axe",
      "deleting record preserves active config",
    );
    await kits.locator("[data-kit-reset]").click();
    await page.waitForFunction(() => window.__idlever.lineage.starting_kits.current === null);
    assert.equal(await kits.locator('[data-selected-kit="defaults"]').count(), 1);
    assert.equal(
      await page.evaluate(() => window.__idlever.lineage.gold),
      gold,
      "all kit actions are free",
    );
    await page.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.send();
      await a.engine.step(1);
      a.lineage = await a.engine.lineage();
      await a.afterLineage();
    });
    assert.ok(await kits.locator("[data-kit-reset]").isDisabled());
    assert.ok(await kits.locator('[aria-label="Kit name"]').isDisabled());
    assert.deepEqual(errors, []);
    outcomes.push({ width, gold, savedId: id, refused, errors });
    await page.close();
  }
  console.log(JSON.stringify({ contract: "Cut203 earned starting kit UI", outcomes }));
} finally {
  await browser.close();
}
