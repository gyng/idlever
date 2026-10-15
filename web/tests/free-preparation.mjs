// Controlled unlocked fixtures, not earned progression evidence. All preparation,
// consumption and settlement calls cross the actual browser WASM worker boundary.
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
  await page.goto(`${url}?dev=1&fresh=1&seed=193&lanes=0`);
  await page.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  const result = await page.evaluate(async () => {
    const { workerEngine } = await import("/src/engine/proxy.ts");
    const worker = await workerEngine();
    if (!worker || worker.version === "fake") throw Error("real WASM worker required");
    const engine = worker.engine;
    let checks = 0;
    const check = (ok, label) => {
      if (!ok) throw Error(label);
      checks++;
    };
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const saved = async () => JSON.parse(await engine.save());
    const reject = async (action, expected) => {
      try {
        await action();
      } catch (error) {
        check(error.message.includes(expected), `expected refusal ${expected}: ${error.message}`);
        return;
      }
      throw Error(`missing refusal: ${expected}`);
    };
    await engine.newLineage(193);
    const fixture = await saved();
    fixture.lineage.town.home = true;
    fixture.lineage.town.built = [["blacksmith", 0]]; // The current permanent leash is unlocked by the built Forge.
    fixture.lineage.gold = 0;
    fixture.lineage.supplies = [];
    fixture.lineage.last_supplies = [];
    fixture.lineage.last_supply_origins = [];
    fixture.lineage.forge = Object.fromEntries(
      ["heal", "mapping", "sword"].map((kind) => [
        kind,
        { salvaged: 5, craftable: true, tier: 0, next: { need: 15, label: "tier 1" } },
      ]),
    );
    const automaticFixture = structuredClone(fixture);
    fixture.lineage.pkg.literal = true;
    fixture.lineage.sets[fixture.lineage.active_set] = {
      rows: [
        { conds: [{ k: "hp<", n: 90 }], verb: { v: "drink", a: "heal" } },
        { conds: [], verb: { v: "attack", a: "nearest" } },
      ],
    };
    await engine.load(JSON.stringify(fixture));
    const catalogue = await engine.supplyCatalogue();
    for (const kind of ["heal", "mapping", "leash", "sword"]) {
      check(catalogue.find((entry) => entry.kind === kind)?.price === 0, `${kind}: free catalogue`);
      const before = await saved();
      const lineage = await engine.buySupply(kind);
      const item = lineage.supplies.at(-1);
      check(item.kind === kind, `${kind}: prepared through worker`);
      const after = await saved();
      check(after.lineage.gold === 0, `${kind}: no use charge`);
      check(
        equal(after.lineage.gold_ledger, before.lineage.gold_ledger),
        `${kind}: no spending ledger`,
      );
      check(
        after.lineage.supplies.at(-1).paid === 0 || !after.lineage.supplies.at(-1).paid,
        `${kind}: zero paid`,
      );
      await engine.dropSupply(item.id);
      const removed = await saved();
      check(removed.lineage.gold === 0, `${kind}: removal cannot mint Gold`);
      check(
        equal(removed.lineage.gold_ledger, before.lineage.gold_ledger),
        `${kind}: removal ledger unchanged`,
      );
    }
    const lockedBefore = await engine.save();
    await reject(() => engine.buySupply("long_gun"), "not unlocked");
    check((await engine.save()) === lockedBefore, "locked refusal changes no state");
    await engine.buySupply("heal");
    await engine.buySupply("mapping");
    await engine.clearSupplies();
    const cleared = await saved();
    check(
      cleared.lineage.supplies.length === 0 && cleared.lineage.gold === 0,
      "clear has no refund",
    );
    check(
      equal(cleared.lineage.gold_ledger, fixture.lineage.gold_ledger),
      "clear creates no ledger transaction",
    );

    for (const [level, heals] of [
      [1, 1],
      [5, 2],
    ]) {
      const prepared = structuredClone(automaticFixture);
      prepared.lineage.restock_off = true;
      prepared.lineage.repeat_quote = { heal: 1000000 };
      prepared.lineage.pkg.runs.steady = level === 5 ? 200 : 0;
      await engine.load(JSON.stringify(prepared));
      await engine.buySupply("heal");
      await engine.clearSupplies(); // Preparing by name teaches the kind to the stance.
      for (let refill = 0; refill < 3; refill++) {
        await engine.setRestock(true);
        const automatic = await saved();
        check(
          automatic.lineage.supplies.filter((item) => item.kind === "heal").length === heals,
          `Steady L${level}: automatic sustain refills ${heals} unlocked slots`,
        );
        check(
          automatic.lineage.supplies
            .filter((item) => item.kind === "heal")
            .every((item) => item.auto_packed && !item.free),
          "automatic refill retains ownership",
        );
        check(
          automatic.lineage.gold === 0 && !Object.keys(automatic.batch.spent).length,
          "automatic refill is free with a stale quote",
        );
        await engine.setRestock(false);
      }
    }
    await engine.load(JSON.stringify(fixture));

    // Three real drink actions and exits. HP is the only injected combat state;
    // do not fabricate consumption or replace engine step/settlement methods.
    await engine.buySupply("heal");
    const delves = [];
    for (let run = 0; run < 3; run++) {
      await engine.send();
      const active = await saved();
      check(
        active.run.hero.inv.filter((item) => item.kind === "heal").length === 1,
        "authored heal enters delve",
      );
      active.run.hero.hp = 1;
      await engine.load(JSON.stringify(active));
      let consumed;
      for (let tick = 0; tick < 64; tick++) {
        consumed = await engine.step(1);
        if (consumed.events.some((event) => event.k === "use" && event.item?.includes("heal")))
          break;
      }
      check(
        consumed.events.some((event) => event.k === "use" && event.item?.includes("heal")),
        "actual healing action emitted",
      );
      check(
        !(await saved()).run.hero.inv.some((item) => item.kind === "heal"),
        "actual action consumes heal",
      );
      await engine.bail();
      const ended = await engine.step(64);
      check(ended.run_over, "delve finishes through actual retreat");
      check(!ended.exit_pending, "retreat settles without a Keep decision or follow-up action");
      const returned = await saved();
      check(
        returned.lineage.supplies.filter((item) => item.kind === "heal").length === 1,
        "authored heal refills free",
      );
      check(
        returned.lineage.supplies
          .filter((item) => item.kind === "heal")
          .every((item) => !item.auto_packed && !item.free),
        "authored refill retains ownership",
      );
      check(returned.lineage.gold === 0, "repeat costs zero Gold");
      check(!Object.values(returned.batch.spent).length, "repeat has no fake spending row");
      const roundTrip = await engine.save();
      await engine.load(roundTrip);
      check((await engine.save()) === roundTrip, "save/load retains settled free loadout");
      delves.push({ run: run + 1, gold: returned.lineage.gold, heals: 1 });
    }

    // Permanent upgrades keep their actual positive prices.
    await engine.load(JSON.stringify(fixture));
    await reject(() => engine.buyKit("weapon"), "not enough gold");
    const beforeForge = await engine.lineage();
    const price = beforeForge.kit.find((ladder) => ladder.slot === "weapon").next.price;
    check(price > 0, "permanent forge upgrade remains paid");
    const funded = await saved();
    funded.lineage.gold = price;
    await engine.load(JSON.stringify(funded));
    const upgraded = await engine.buyKit("weapon");
    check(upgraded.gold === 0, "permanent upgrade pays exact price");
    check(
      upgraded.kit.find((ladder) => ladder.slot === "weapon").owned === 1,
      "permanent upgrade granted once",
    );
    check(
      (await saved()).lineage.gold_ledger.at(-1).delta === -price,
      "permanent upgrade has genuine spending ledger",
    );
    return {
      fixture: "controlled unlocked loadout",
      version: worker.version,
      checks,
      delves,
      forgePrice: price,
    };
  });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
