// Historical command name retained in suite inventory; current contract is Cut206:
// actual Bank/Return/Death reaches its destination without a Keep sheet or second payout.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
const outcomes = [];
try {
  for (const tier of ["bank", "return", "death"]) {
    const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}?dev=1&fresh=1&seed=206&runs=0&speed=4`);
    await page.waitForFunction(() => window.__idlever?.booted);
    await page.evaluate(async (tier) => {
      const app = window.__idlever,
        e = app.engine;
      if (app.kind !== "wasm") throw Error("real engine required");
      app.runnerOn = false;
      await e.newLineage(206);
      await e.buildTown("house");
      const game = JSON.parse(await e.save());
      game.lineage.gold = 500;
      game.lineage.supplies = [];
      game.lineage.last_supplies = [];
      game.lineage.last_supply_origins = [];
      game.lineage.restock_off = true;
      game.lineage.kennel_declined = true;
      game.lineage.pkg.literal = true;
      game.lineage.sets[game.lineage.active_set] = {
        rows: [{ conds: [], verb: { v: "pick_up" } }],
      };
      await e.load(JSON.stringify(game));
      await app.refresh();
      app.__settlement = { tier, keepCalls: 0, sheets: 0, receipt: null, picked: false };
      const qa = app.__settlement;
      const observer = new MutationObserver(() => {
        if (document.querySelector(".keep-legend")) qa.sheets++;
      });
      observer.observe(document.body, { subtree: true, childList: true });
      for (const key of ["keep", "autoKeep"])
        if (typeof e[key] === "function") {
          const original = e[key].bind(e);
          e[key] = (...args) => {
            qa.keepCalls++;
            return original(...args);
          };
        }
      const send = e.send.bind(e),
        step = e.step.bind(e);
      e.send = async () => {
        const snapshot = await send();
        const active = JSON.parse(await e.save());
        const item = {
          ...active.run.hero.weapon,
          id: 9001,
          kind: "leash",
          amount: 3,
          enchant: 0,
          known: true,
          free: false,
          found: false,
          paid: 0,
          auto_packed: false,
          value_claimed: false,
        };
        delete item.firearm;
        delete item.forged;
        active.run.items = [{ pos: active.run.hero.pos, item }];
        active.run.monsters = [];
        active.run.loot = 0;
        active.run.loot_raw = 0;
        active.run.secured = 8;
        await e.load(JSON.stringify(active));
        return snapshot;
      };
      e.step = async (ticks) => {
        const result = await step(ticks);
        if (
          !qa.picked &&
          result.events.some((event) => event.k === "pickup" && event.item === "leash")
        ) {
          qa.picked = true;
          if (tier === "return") await e.bail();
          else {
            const active = JSON.parse(await e.save());
            if (tier === "death") {
              active.run.hero.hp = 1;
              active.run.hero.poison = [99, 512];
            } else
              active.lineage.sets[active.lineage.active_set].rows = [
                { conds: [], verb: { v: "bank" } },
              ];
            await e.load(JSON.stringify(active));
          }
        }
        for (const event of result.events) if (event.k === "exit") qa.receipt = event.line;
        return result;
      };
      app.go({ kind: "watch" });
    }, tier);
    await page.waitForFunction(() => window.__idlever?.screen === "watch");
    await page.waitForFunction(() => window.__idlever.__settlement?.receipt, null, {
      timeout: 30000,
    });
    // Follow the real final-frame/exit flow, including the primary report/verdict control.
    for (let n = 0; n < 80; n++) {
      if (await page.evaluate(() => !["watch", "exit"].includes(window.__idlever.screen))) break;
      await page.locator(".next-gem").evaluateAll((nodes) => nodes.forEach((node) => node.click()));
      await page.waitForTimeout(150);
    }
    const result = await page.evaluate(async () => ({
      ...window.__idlever.__settlement,
      screen: window.__idlever.screen,
      gold: window.__idlever.lineage.gold,
      saved: JSON.parse(await window.__idlever.engine.save()),
    }));
    assert.equal(result.picked, true);
    assert.equal(result.receipt.tier, tier);
    assert.equal(result.receipt.kept, tier === "death" ? 8 : 12);
    assert.equal(result.gold, tier === "death" ? 508 : 512);
    assert.equal(result.keepCalls, 0);
    assert.equal(result.sheets, 0);
    assert.equal(result.saved.pending_exit ?? null, null);
    assert.ok(!["watch", "exit"].includes(result.screen), `${tier}: exit flow stalled`);
    assert.deepEqual(errors, []);
    outcomes.push({ tier, screen: result.screen, gold: result.gold, keepCalls: result.keepCalls });
    await page.close();
  }
  console.log(JSON.stringify({ contract: "Cut206 controlled actual pickup/exit", outcomes }));
} finally {
  await browser.close();
}
