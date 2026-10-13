import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
let checks = 0;
try {
  for (const width of [320, 400, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(async () => {
      const a = window.__idlever;
      if (a.kind !== "wasm") throw Error("real WASM required");
      await a.mutate(() => a.engine.buildTown("house"));
      (await import("/src/ui/town.ts")).openHero(a);
    });
    const active = p.locator(".sheet-wrap:not(.under)");
    const tabs = active.locator("[role=tab]");
    await tabs.first().waitFor();
    assert.deepEqual(await tabs.allTextContents(), ["Loadouts", "Class", "Legacy"]);
    assert.equal(await active.locator("[role=tabpanel]:visible").count(), 1);
    assert.equal(await active.locator("[role=tab][aria-selected=true]").textContent(), "Loadouts");
    checks += 3;
    const beforeGold = await p.evaluate(() => window.__idlever.lineage.gold);
    assert.equal(beforeGold, 0, "fresh hero prepares at zero gold");
    const leash = active.locator('[data-prepare-kind="leash"]');
    await leash.waitFor();
    await leash.click();
    await p.waitForFunction(
      () => window.__idlever.lineage.supplies.filter((s) => s.kind === "leash").length === 2,
    );
    assert.equal(await p.evaluate(() => window.__idlever.lineage.gold), beforeGold);
    await leash.click();
    await p.waitForFunction(
      () => window.__idlever.lineage.supplies.length === window.__idlever.lineage.supply_cap,
    );
    assert.ok(await leash.isDisabled(), "Rust slot cap disables free preparation");
    await active.locator("[data-drop-id]").last().click();
    await p.waitForFunction(() => window.__idlever.lineage.supplies.length === 2);
    await active.locator("[data-drop-id]").last().click();
    await p.waitForFunction(
      () => window.__idlever.lineage.supplies.filter((s) => s.kind === "leash").length === 1,
    );
    assert.equal(await p.evaluate(() => window.__idlever.lineage.gold), beforeGold);
    await active.locator(".bloodline-reuse").click();
    await p.waitForFunction(() => window.__idlever.lineage.repeat === false);
    assert.equal(await active.locator(".bloodline-reuse").getAttribute("aria-pressed"), "false");
    checks += 4;
    await tabs.first().focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await active.locator("[role=tab][aria-selected=true]").textContent(), "Class");
    assert.match(
      await active.locator('[data-bloodline-panel="class"]').textContent(),
      /Class skills.*L3.*D8/,
    );
    assert.equal(await active.locator(".class-path-node:visible").count(), 0);
    await p.evaluate(async () => {
      const a = window.__idlever;
      await a.mutate(() => a.engine.buySupply("leash"));
    });
    assert.equal(await active.locator("[role=tab][aria-selected=true]").textContent(), "Class");
    assert.equal(await p.evaluate(() => document.activeElement.dataset.bloodlineTab), "class");
    checks += 5;
    await p.keyboard.press("End");
    assert.equal(await active.locator("[role=tab][aria-selected=true]").textContent(), "Legacy");
    const geometry = await active.locator('[data-bloodline-panel="legacy"]').evaluate((el) => {
      el.scrollTop = 50;
      return { scroll: el.scrollTop, overflow: el.scrollWidth > el.clientWidth + 1 };
    });
    await p.evaluate(async () => {
      const a = window.__idlever;
      await a.dropSupply(a.lineage.supplies.filter((s) => s.kind === "leash").at(-1).id);
    });
    const after = await active
      .locator('[data-bloodline-panel="legacy"]')
      .evaluate((el) => ({ scroll: el.scrollTop, overflow: el.scrollWidth > el.clientWidth + 1 }));
    assert.ok(Math.abs(after.scroll - geometry.scroll) <= 2);
    assert.equal(after.overflow, false);
    assert.equal(await p.evaluate(() => document.activeElement.dataset.bloodlineTab), "legacy");
    await active.locator('[data-bloodline-panel="legacy"]').evaluate((el) => {
      window.focusedPanel = el;
      el.focus({ preventScroll: true });
    });
    await p.evaluate(async () => {
      const a = window.__idlever;
      await a.mutate(() => a.engine.setRestock(true));
    });
    assert.equal(
      await p.evaluate(() => document.activeElement === window.focusedPanel),
      true,
      "tabpanel root keeps keyboard focus through actual state refresh",
    );
    assert.equal(
      await active
        .locator('[data-bloodline-panel="legacy"]')
        .evaluate((el) => el === window.focusedPanel),
      true,
      "refresh reuses the exact focused panel DOM node",
    );
    checks += 2;
    await active.locator('[data-bloodline-tab="legacy"]').focus();
    await p.keyboard.press("Home");
    assert.equal(await active.locator("[role=tab][aria-selected=true]").textContent(), "Loadouts");
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    checks += 6;
    await p.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.send();
      await a.engine.step(1);
      a.lineage = await a.engine.lineage();
      await a.afterLineage();
    });
    assert.ok(await active.locator(".bloodline-reuse").isDisabled());
    assert.ok(await active.locator('[data-prepare-kind="leash"]').isDisabled());
    assert.match(
      await active.locator('[data-bloodline-panel="loadouts"]').textContent(),
      /Change at home/,
    );
    if (width === 1440) {
      const asyncChecks = await p.evaluate(async () => {
        const a = window.__idlever;
        const { renderBloodlineLoadouts } = await import("/src/ui/bloodline-loadouts.ts");
        const host = document.createElement("div");
        document.body.append(host);
        let release;
        const shim = {
          lineage: a.lineage,
          engine: {
            supplyCatalogue: () =>
              new Promise((r) => {
                release = r;
              }),
          },
        };
        host.append(renderBloodlineLoadouts(shim));
        await new Promise((r) => setTimeout(r, 0));
        shim.lineage = { ...shim.lineage, selected_bloodline: 999 };
        release([{ kind: "heal", price: 0, label: "STALE CHOICE" }]);
        await new Promise((r) => setTimeout(r, 0));
        if (host.querySelector(".bloodline-prepare"))
          throw Error("stale catalogue crossed bloodlines");
        shim.lineage = a.lineage;
        shim.engine = { supplyCatalogue: () => Promise.reject(Error("catalogue fixture")) };
        host.replaceChildren(renderBloodlineLoadouts(shim));
        await new Promise((r) => setTimeout(r, 0));
        const retry = host.querySelector("button");
        const retryButton = [...host.querySelectorAll("button")].find(
          (b) => b.textContent === "Retry",
        );
        if (!retry || !retryButton) throw Error("failed catalogue missing retry");
        shim.engine.supplyCatalogue = () => a.engine.supplyCatalogue();
        retryButton.click();
        for (let i = 0; i < 50 && !host.querySelector(".bloodline-prepare"); i++)
          await new Promise((r) => setTimeout(r, 10));
        if (!host.querySelector(".bloodline-prepare"))
          throw Error("retry did not restore real choices");
        host.remove();
        return 2;
      });
      checks += asyncChecks;
    }
    assert.deepEqual(errors, []);
    checks += 4;
    await p.close();
  }
  console.log(`bloodline-tabs ${checks} real-WASM checks PASS`);
} finally {
  await browser.close();
}
