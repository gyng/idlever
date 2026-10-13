import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";

// Controlled worlds, public learn/open/choose actions, actual Rust events.
// These are interaction/accounting checks, not earned progression or balance.
const fixture = (name) =>
  gunzipSync(
    readFileSync(new URL(`../../docs/evidence/cut206/core/${name}.game.json.gz`, import.meta.url)),
  ).toString();
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const b = await launchBrowser();
const results = [];
try {
  for (const lane of ["choice", "preference", "skill"]) {
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
          const stepped = await e.step(50);
          a.__events.push(...stepped.events);
          a.__result = { snapshot: stepped.snapshot, saved: JSON.parse(await e.save()) };
          return;
        }
        const step = e.step.bind(e);
        e.step = async (n) => {
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
    } else if (lane === "choice") {
      await p
        .locator(".ticker.cage.show")
        .waitFor({ timeout: 10000 })
        .catch(async (error) => {
          console.log(
            JSON.stringify(
              await p.evaluate(async () => ({
                screen: window.__idlever.screen,
                watch: document.querySelector(".watch")?.dataset,
                events: window.__idlever.__events,
                saved: JSON.parse(await window.__idlever.engine.save()).run?.vault_choice,
                text: document.body.innerText.slice(-3000),
              })),
            ),
          );
          throw error;
        });
      await p.locator(".ticker.cage.show").click();
      const sheet = p.locator(".vault-choice");
      await sheet.waitFor();
      assert.match(await sheet.textContent(), /Gold on pickup/);
      assert.doesNotMatch(await sheet.textContent(), /storage|full|sold|Keep/);
      assert.equal(await sheet.locator(".chip.item").count(), 3);
      assert.match(await sheet.textContent(), /black potion\?/);
      await sheet.locator(".chip.item").filter({ hasText: /mail/ }).click();
      await sheet.waitFor({ state: "detached" });
      const receipt = await p.evaluate(async () => {
        const a = window.__idlever;
        // The following direct API settlement is instrumentation, outside the
        // watch controls. Dispose its pump before reading the final receipt.
        a.go({ kind: "camp" });
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
      results.push({ lane, ...receipt });
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
    JSON.stringify({ contract: "Cut206 controlled cage and Cut205 factual live skill", results }),
  );
} finally {
  await b.close();
}
