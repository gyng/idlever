import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";

// Controlled saved worlds, automatic loot and real factual skill events.
// These are interaction/accounting checks, not earned progression or balance.
const fixture = (name) =>
  gunzipSync(
    readFileSync(new URL(`../../docs/evidence/cut206/core/${name}.game.json.gz`, import.meta.url)),
  ).toString();
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim();
const b = await launchBrowser();
const results = [];
try {
  for (const lane of ["automatic", "preference", "skill"]) {
    const p = await b.newPage({ viewport: { width: 400, height: 900 } });
    const errors = [];
    p.on("pageerror", (error) => errors.push(error.message));
    await p.goto(`${url}?fresh=1&seed=206&runs=0&speed=4`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(
      async ({ raw, lane }) => {
        const a = window.__idlever,
          e = a.engine;
        if (a.kind !== "wasm") throw Error("real WASM required");
        a.runnerOn = false;
        await e.load(raw);
        await a.refresh();
        a.__events = [];
        if (lane === "preference") {
          await e.setVaultPref("potion");
          const stepped = await e.step(1);
          a.__events.push(...stepped.events);
          a.__result = { snapshot: stepped.snapshot, saved: JSON.parse(await e.save()) };
          return;
        }
        if (lane === "automatic") await e.setVaultPref("armour");
        a.__stepRequests = [];
        const step = e.step.bind(e);
        e.step = async (n) => {
          a.__stepRequests.push(n);
          const stepped = await step(n);
          a.__events.push(...stepped.events);
          return stepped;
        };
        a.watchMode = "fast";
        a.go({ kind: "watch" });
      },
      { lane, raw: fixture(lane === "skill" ? "skill-before" : "cage-active") },
    );
    if (lane === "preference") {
      const result = await p.evaluate(() => window.__idlever.__result);
      assert.equal(result.snapshot.vault_choice ?? null, null);
      assert.equal(result.saved.run.loot_raw, 12);
      assert.equal(result.saved.run.loot, 3);
      assert.ok(
        await p.evaluate(() =>
          window.__idlever.__events.some((ev) => ev.k === "pickup" && ev.item === "black potion?"),
        ),
      );
      results.push({ lane, raw: 12, carry: 3 });
    } else if (lane === "automatic") {
      await p.waitForFunction(() =>
        window.__idlever.__events.some((event) => event.k === "pickup" && /mail/.test(event.item)),
      );
      const automatic = await p.evaluate(async () => {
        const a = window.__idlever;
        a.__pickupSave = await a.engine.save();
        const saved = JSON.parse(a.__pickupSave);
        return {
          selected: a.__events.filter((event) => event.k === "pickup" && /mail/.test(event.item))
            .length,
          pendingChoice: saved.run?.vault_choice ?? null,
          cageSheet: !!document.querySelector(".vault-choice"),
          cageTicker: !!document.querySelector(".ticker.cage"),
          cageState: document.querySelector(".watch")?.dataset.cage ?? null,
          firstBatch: a.__stepRequests[0],
          rawAtPickup: saved.run.loot_raw,
          carryAtPickup: saved.run.loot,
          goldAtPickup: saved.lineage.gold,
        };
      });
      assert.equal(automatic.selected, 1);
      assert.equal(automatic.rawAtPickup, 30);
      assert.equal(automatic.carryAtPickup, 7);
      assert.equal(automatic.goldAtPickup, 500);
      assert.equal(automatic.pendingChoice, null);
      assert.equal(automatic.cageSheet, false);
      assert.equal(automatic.cageTicker, false);
      assert.equal(automatic.cageState, null);
      assert.ok(automatic.firstBatch >= 10, "ordinary pump batch is not capped to eight near loot");
      if (process.env.IDLEVER_CACHE_SHOTS) {
        mkdirSync(process.env.IDLEVER_CACHE_SHOTS, { recursive: true });
        await p.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
        });
        await p.screenshot({
          path: `${process.env.IDLEVER_CACHE_SHOTS}/automatic-loot-watch-400.png`,
        });
      }
      const receipt = await p.evaluate(async () => {
        const a = window.__idlever;
        // Isolate accounting from GPU screenshot wall time using the actual
        // save captured after the watched pickup. No authored state changes.
        // The visual run remains free to continue; dispose its pump, restore
        // that genuine boundary, then settle once through the real API.
        a.go({ kind: "camp" });
        await a.engine.load(a.__pickupSave);
        await a.refresh();
        const active = JSON.parse(await a.engine.save());
        await a.engine.bail();
        // bail queues the next hero action, rather than an immediate payout.
        let exit = null;
        for (let n = 0; n < 30 && !exit; n++) {
          const stepped = await a.engine.step(1);
          exit = stepped.events.find((event) => event.k === "exit")?.tier ?? null;
        }
        await a.refresh();
        const saved = JSON.parse(await a.engine.save());
        return {
          raw: active.run.loot_raw,
          carry: active.run.loot,
          gold: a.lineage.gold,
          engineGold: saved.lineage.gold,
          exit,
          pending: saved.pending_exit ?? null,
        };
      });
      assert.deepEqual(receipt, {
        raw: 30,
        carry: 7,
        gold: 507,
        engineGold: 507,
        exit: "return",
        pending: null,
      });
      assert.equal(await p.locator(".keep-legend").count(), 0);
      results.push({ lane, automatic, ...receipt });
    } else {
      await p.waitForFunction(() =>
        window.__idlever.__events.some(
          (ev) => ev.k === "rule" && ev.skill?.id === "fighter_recovery",
        ),
      );
      await p
        .locator('.combat-lines .skill-icon[data-skill-icon="fighter_recovery"]')
        .waitFor({ timeout: 10000 });
      const row = p
        .locator(".combat-lines li")
        .filter({ has: p.locator('.skill-icon[data-skill-icon="fighter_recovery"]') })
        .first();
      assert.match(await row.textContent(), /Recovery.*second_wind/);
      const event = await p.evaluate(() =>
        window.__idlever.__events.find(
          (ev) => ev.k === "rule" && ev.skill?.id === "fighter_recovery",
        ),
      );
      assert.deepEqual(event.skill, { id: "fighter_recovery", name: "Recovery" });
      const filtered = await p.evaluate(async (event) => {
        const { combatLogEvents } = await import("/src/ui/combat-log.ts");
        const untagged = { ...event };
        delete untagged.skill;
        return {
          tagged: combatLogEvents([event], 1, new Map(), () => true).length,
          ordinary: combatLogEvents(
            [{ ...untagged, verb: { v: "attack" } }],
            1,
            new Map(),
            () => true,
          ).length,
        };
      }, event);
      assert.equal(filtered.tagged, 1);
      assert.equal(filtered.ordinary, 0);
      results.push({ lane, skill: event.skill, filtered });
    }
    assert.deepEqual(errors, []);
    await p.close();
  }
  console.log(
    JSON.stringify({
      contract: "Cut210 controlled automatic loot and Cut205 factual live skill",
      results,
    }),
  );
} finally {
  await b.close();
}
