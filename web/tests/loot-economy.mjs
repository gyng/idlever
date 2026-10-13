// Controlled real-worker pickup/exit fixtures. This is accounting/UI proof, not earned pacing.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";

const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${url}?dev=1&fresh=1&seed=196&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  const result = await page.evaluate(async () => {
    const { workerEngine } = await import("/src/engine/proxy.ts");
    const { exitKind } = await import("/src/ui/exit-kind.ts");
    const { exitLead } = await import("/src/ui/report.ts");
    const { runRange } = await import("/src/ui/gold.ts");
    const { exitExtras } = await import("/src/ui/death.ts");
    const worker = await workerEngine();
    if (!worker || worker.version === "fake") throw Error("real worker required");
    const e = worker.engine;
    let checks = 0;
    const check = (condition, label) => {
      if (!condition) throw Error(label);
      checks++;
    };
    const outcomes = [];
    for (const tier of ["bank", "return", "death"]) {
      await e.newLineage(196);
      await e.buildTown("house");
      const fixture = JSON.parse(await e.save());
      fixture.lineage.gold = 500;
      fixture.lineage.supplies = [];
      fixture.lineage.last_supplies = [];
      fixture.lineage.last_supply_origins = [];
      fixture.lineage.restock_off = true;
      fixture.lineage.kennel_declined = true;
      fixture.lineage.pkg.literal = true;
      fixture.lineage.sets[fixture.lineage.active_set] = {
        rows: [{ conds: [], verb: { v: "pick_up" } }],
      };
      await e.load(JSON.stringify(fixture));
      await e.send();
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
      let picked = false;
      for (let tick = 0; tick < 64 && !picked; tick++) {
        const step = await e.step(1);
        picked = step.events.some((event) => event.k === "pickup" && event.item === "leash");
      }
      check(picked, `${tier}: actual pickup event`);
      const carried = JSON.parse(await e.save());
      check(
        carried.run.loot_raw === 18 && carried.run.loot === 4,
        `${tier}: three genuine units valued once`,
      );
      check(carried.run.converted_units.length === 3, `${tier}: exact discovery units`);
      if (tier === "return") await e.bail();
      else {
        if (tier === "death") {
          carried.run.hero.hp = 1;
          carried.run.hero.poison = [99, 512]; // Last through the real periodic damage tick.
        } else
          carried.lineage.sets[carried.lineage.active_set].rows = [
            { conds: [], verb: { v: "bank" } },
          ];
        await e.load(JSON.stringify(carried));
      }
      let receipt;
      for (let tick = 0; tick < 512 && !receipt; tick++) {
        const step = await e.step(1);
        receipt = step.events.find((event) => event.k === "exit")?.line;
        if (step.run_over) check(step.exit_pending == null, `${tier}: no Keep interruption`);
      }
      check(!!receipt, `${tier}: actual settled exit receipt`);
      check(receipt.tier === tier && exitKind(receipt) === tier, `${tier}: explicit Rust outcome`);
      const expected = tier === "death" ? 8 : 12;
      check(receipt.kept === expected, `${tier}: one income value`);
      check(receipt.keep_pct === (tier === "death" ? 0 : 100), `${tier}: financial share`);
      check(
        !receipt.salvaged?.length && receipt.spent === 0,
        `${tier}: no extra salvage or packing bill`,
      );
      if (tier !== "death")
        check(
          receipt.found.some((row) => row.fate === "converted" && row.n === 3),
          `${tier}: converted provenance`,
        );
      const settled = JSON.parse(await e.save());
      check(settled.lineage.gold === 500 + expected, `${tier}: exact spendable balance`);
      check(settled.pending_exit == null, `${tier}: no deferred settlement`);
      check(
        !settled.lineage.vault.length && !settled.lineage.supplies.length,
        `${tier}: no Keep/shelf chore`,
      );
      check(settled.lineage.forge.leash.salvaged === 3, `${tier}: once-only forge discovery`);
      const range = runRange(settled.lineage.gold_ledger, receipt);
      check(!!range, `${tier}: receipt finds its real ledger movement`);
      check(
        settled.lineage.gold_ledger
          .slice(range[0], range[1] + 1)
          .some((entry) => entry.delta === expected),
        `${tier}: reconciled ledger`,
      );
      if (tier === "return")
        check(exitLead(receipt) === "returned $12", "full return is never labelled banked");
      if (tier !== "death")
        check(
          exitExtras(receipt).includes("discovered: leash ×3"),
          `${tier}: visible discovery quantity`,
        );
      if (tier === "death")
        check(exitLead(receipt) === "died $8", "secured death is never labelled alive");
      const saved = await e.save();
      await e.load(saved);
      check((await e.save()) === saved, `${tier}: exact settled save/reload`);
      outcomes.push({ tier, kept: receipt.kept, gold: settled.lineage.gold });
    }
    return { checks, outcomes, version: worker.version };
  });
  assert.deepEqual(errors, []);
  assert.equal(result.outcomes.length, 3);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
