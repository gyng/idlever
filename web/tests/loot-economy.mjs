// Controlled real-worker pickup/exit fixtures. This is accounting/UI proof, not earned pacing.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";

const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
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
    const { exitExtras, drivenDeath } = await import("/src/ui/death.ts");
    const worker = await workerEngine();
    if (!worker || worker.version === "fake") throw Error("real worker required");
    const e = worker.engine;
    let checks = 0;
    const check = (condition, label) => {
      if (!condition) throw Error(label);
      checks++;
    };
    // Cut244: controlled fake fixtures exercise real pickup/exit code through public step.
    // These are accounting cases, not earned saves or fake/native pricing parity.
    const { FakeEngine, UNLOCKS } = await import("/src/engine/fake.ts");
    check(
      ["quartermaster", "auto_supply", "auto_insure"].every((id) => !(id in UNLOCKS)),
      "fake has no retired automation purchases",
    );
    for (const tier of ["bank", "return", "death"]) {
      const fake = new FakeEngine();
      fake.newLineage(244);
      const L = fake.s.lineage;
      L.gold = 500;
      L.supplies = [];
      L.party = [];
      L.eggs = [];
      L.repeat = true;
      fake.s.rules = {
        rows: [
          { conds: [], verb: { v: "pick_up" } },
          { conds: [{ k: "depth>=", n: 99 }], verb: { v: "tame", a: "leash" } },
        ],
      };
      fake.buySupply("leash");
      const prepared = L.supplies.map((x) => x.id);
      check(L.gold === 500 && prepared.length === 1, `fake ${tier}: current preparation is free`);
      fake.send();
      const run = fake.live;
      run.floor.mons = [];
      run.floor.overlays = [];
      const pick = (item) => {
        run.floor.items = [{ ...item, x: run.hero.x, y: run.hero.y }];
        const result = fake.step(10);
        check(
          result.events.some((event) => event.k === "pickup" && event.id === item.id),
          `fake ${tier}: actual pickup ${item.id}`,
        );
      };
      pick({ id: 9001, kind: "sword", known: true, label: "sword" });
      pick({ id: 9002, kind: "heal", known: false, label: "blue potion?" });
      pick({ id: 9003, kind: "leash", known: true, label: "leash" });
      check(run.loot === 33, `fake ${tier}:20+8+5 enters carry once`);
      pick({ id: 9001, kind: "sword", known: true, label: "sword" });
      pick({ id: prepared[0], kind: "leash", known: true, label: "leash" });
      run.bonesPiles = [{ heir: 99, depth: run.depth, items: 10 }];
      pick({ id: 9004, kind: "bones", known: true, label: "bones ♟99" });
      check(
        run.loot === 33 && run.picked.length === 3,
        `fake ${tier}: repeat/prepared/physical recovery creates no extra value`,
      );
      const gold = L.gold;
      const repeat = tier !== "return";
      fake.setRestock(repeat);
      fake.s.rules = {
        rows: [
          { conds: [], verb: { v: tier === "death" ? "hold" : tier } },
          { conds: [{ k: "depth>=", n: 99 }], verb: { v: "tame", a: "leash" } },
        ],
      };
      if (tier === "death") run.hero.hp = 0;
      const result = fake.step(10);
      const receipt = result.events.find((event) => event.k === "exit")?.line;
      check(
        result.run_over && receipt?.keep_pct === (tier === "death" ? 0 : 100),
        `fake ${tier}: actual current financial share`,
      );
      check(
        receipt.kept === (tier === "death" ? 0 : 33) && L.gold === gold + receipt.kept,
        `fake ${tier}: exit credits only remaining carry`,
      );
      check(
        !receipt.salvaged?.length && !("shelved" in receipt),
        `fake ${tier}: no salvage payment or supply-storage receipt`,
      );
      check(
        L.supplies.length === (repeat ? prepared.length : 0) &&
          L.supplies.every((item) => prepared.includes(item.id) && !item.found),
        `fake ${tier}: found items never become prepared supplies`,
      );
      check(
        ["sword", "heal", "leash"].every((kind) => L.forge[kind]?.salvaged === 1),
        `fake ${tier}: discovery follows each conversion exactly once`,
      );
      const unknown = receipt.finds.find((item) => item.id === 9002);
      check(
        unknown?.kind === "potion" && unknown.label === "blue potion?" && !unknown.known,
        `fake ${tier}: converted find privacy remains`,
      );
      const settledGold = L.gold;
      fake.step(10);
      check(
        L.gold === settledGold && L.forge.sword.salvaged === 1,
        `fake ${tier}: repeated settled step never pays or discovers again`,
      );
    }
    const fallback = drivenDeath(
      { boss: "warlord", title: "Warlord", depth: 8, defence: "armour", lost: 7 },
      1,
    );
    check(
      fallback.line.text === "driven off" && !fallback.line.text.includes("$"),
      "cause-only drive record invents no Gold receipt",
    );
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
        !("vault" in settled.lineage) && !settled.lineage.supplies.length,
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
