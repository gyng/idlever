// Actual public worker operations; imported earned fixture is a deterministic starting town.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const earned = readFileSync(new URL("./fixtures/earned-gunner-home.json", import.meta.url), "utf8");
const shots = process.env.IDLEVER_HOME_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launchBrowser({ gpu: process.env.IDLEVER_HOME_GPU === "1" });
try {
  for (const width of [400, 1440]) {
    const p = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: process.env.IDLEVER_HOME_GPU === "1" ? "no-preference" : "reduce",
      hasTouch: width === 400,
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      `${url}?dev=1&fresh=1&seed=194&runs=0${process.env.IDLEVER_HOME_GPU === "1" ? "&juice=1" : ""}`,
    );
    await p.waitForFunction(() => window.__idlever?.booted);
    assert.equal(await p.evaluate(() => window.__idlever.kind), "wasm");
    await p.evaluate(async (engine) => {
      const a = window.__idlever;
      if (
        !(await a.importSave(
          JSON.stringify({ v: 2, engine, loadout: [], last_seen: Date.now(), runs: 0 }),
        ))
      )
        throw Error("Import refused");
      a.runnerOn = false;
      await a.mutate(() => a.engine.setWorker("scout", false));
      await a.mutate(() => a.engine.addBloodline());
      await a.mutate(() => a.engine.addBloodline());
      a.go({ kind: "camp" });
    }, earned);
    const home = await p.evaluate(() =>
      window.__idlever.lineage.hero_slots.filter((s) => s.state !== "live").map((s) => s.id),
    );
    assert.equal(home.length, 3);
    await p.waitForFunction(
      () => window.__town.actors().length === 3 && window.__town.actors().every((a) => a.rect),
    );
    if (process.env.IDLEVER_HOME_GPU === "1") {
      const start = await p.evaluate(() => window.__town.actors()[0]);
      await p.waitForFunction(
        (start) => {
          const now = window.__town.actors().find((a) => a.id === start.id)?.rect;
          return now && (Math.abs(now.x - start.rect.x) > 3 || Math.abs(now.y - start.rect.y) > 3);
        },
        start,
        { timeout: 15000 },
      );
    }
    const aligned = await p.evaluate(() =>
      window.__town.actors().every((actor) => {
        const target = document.querySelector(`[data-home-hero="${actor.id}"]`);
        return (
          actor.rect &&
          Math.abs(
            parseFloat(target.style.left) +
              target.offsetWidth / 2 -
              actor.rect.x -
              actor.rect.w / 2,
          ) <= 1 &&
          Math.abs(
            parseFloat(target.style.top) +
              target.offsetHeight / 2 -
              actor.rect.y -
              actor.rect.h / 2,
          ) <= 1
        );
      }),
    );
    assert.ok(
      aligned,
      JSON.stringify(
        await p.evaluate(() =>
          window.__town.actors().map((actor) => {
            const target = document.querySelector(`[data-home-hero="${actor.id}"]`);
            return {
              actor,
              left: target.style.left,
              top: target.style.top,
              w: target.offsetWidth,
              h: target.offsetHeight,
              hidden: target.hidden,
            };
          }),
        ),
      ),
    );
    // Cut220: home actors open the Hero Hub; its identity names the bloodline (the old .hero-sheet retired in b497aa59).
    for (const id of home) {
      const target = p.locator(`[data-home-hero="${id}"]`);
      await target.waitFor({ state: "visible" });
      const first = await target.boundingBox();
      assert.ok(first.width >= 44 && first.height >= 44);
      await target.focus();
      await p.keyboard.press("Enter");
      await p.waitForFunction(
        (id) =>
          window.__idlever.lineage.selected_bloodline === id &&
          document
            .querySelector(".sheet-wrap:not([hidden]) [data-hero-hub] .hero-hub-identity")
            ?.textContent.includes(`Bloodline ${id}`),
        id,
      );
      assert.equal(await p.evaluate(() => window.__idlever.lineage.selected_bloodline), id);
      assert.match(
        await p
          .locator(".sheet-wrap:not([hidden]) [data-hero-hub] .hero-hub-identity")
          .textContent(),
        new RegExp(`Bloodline ${id}`),
      );
      await p.keyboard.press("Escape");
    }
    for (const id of home) {
      const actor = p.locator(`[data-home-hero="${id}"]`);
      await actor.waitFor({ state: "visible" });
      const hit = await actor.boundingBox();
      if (width === 400) await p.touchscreen.tap(hit.x + hit.width / 2, hit.y + hit.height / 2);
      else await p.mouse.click(hit.x + hit.width / 2, hit.y + hit.height / 2);
      await p.waitForFunction(
        (id) =>
          window.__idlever.lineage.selected_bloodline === id &&
          document
            .querySelector(".sheet-wrap:not([hidden]) [data-hero-hub] .hero-hub-identity")
            ?.textContent.includes(`Bloodline ${id}`),
        id,
      );
      await p.keyboard.press("Escape");
    }
    if (shots) {
      await p.waitForFunction(
        () => !document.querySelector(".sheet-wrap") && !document.querySelector(".sheet-ghost"),
      );
      await p.screenshot({ path: `${shots}/${width}-home-heroes.png` });
    }
    // Send two genuine slots, without synthetic live wire fields.
    await p.evaluate(async () => {
      const a = window.__idlever;
      for (const id of [1, 2]) {
        await a.selectBloodline(id);
        await a.engine.send();
        await a.engine.step(5);
        await a.refresh();
      }
      a.go({ kind: "camp" });
    });
    await p.waitForSelector('[data-delving-hero="1"]');
    assert.equal(await p.locator(".town-delving-hero").count(), 2);
    assert.equal(await p.locator('[data-home-hero="1"]').count(), 0);
    assert.equal(await p.locator('[data-home-hero="2"]').count(), 0);
    assert.equal(await p.locator('[data-home-hero="3"]').count(), 1);
    const ids = await p.evaluate(() =>
      window.__idlever.lineage.hero_slots
        .filter((s) => s.state === "live")
        .map((s) => [s.id, s.live.depth]),
    );
    for (const [id, depth] of ids)
      assert.equal(
        await p.locator(`[data-delving-hero="${id}"] .town-delving-depth`).textContent(),
        `D${depth}`,
      );
    if (shots) {
      await p.waitForFunction(
        () => !document.querySelector(".sheet-wrap") && !document.querySelector(".sheet-ghost"),
      );
      await p.screenshot({ path: `${shots}/${width}-delving-portraits.png` });
    }
    await p.locator('[data-delving-hero="1"]').click();
    await p.waitForFunction(() => window.__idlever.screen === "watch");
    assert.equal(await p.evaluate(() => window.__idlever.lineage.selected_bloodline), 1);
    // Leaving watch refreshes Rust state, then actual offline completion refreshes both slots.
    await p.evaluate(() => window.__idlever.leaveWatch());
    await p.waitForFunction(() => window.__idlever.screen === "camp");
    await p.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.runOfflineQuick(8 * 3600);
      await a.refresh();
      a.go({ kind: "camp" });
    });
    const states = await p.evaluate(() =>
      window.__idlever.lineage.hero_slots.map((s) => [s.id, s.state, s.heir]),
    );
    for (const [id, state, heir] of states) {
      assert.equal(
        await p.locator(`[data-delving-hero="${id}"]`).count(),
        state === "live" ? 1 : 0,
      );
      assert.equal(await p.locator(`[data-home-hero="${id}"]`).count(), state === "live" ? 0 : 1);
      const target = p.locator(
        `[${state === "live" ? "data-delving-hero" : "data-home-hero"}="${id}"]`,
      );
      assert.equal(Number(await target.getAttribute("data-heir")), heir);
    }
    assert.deepEqual(errors, []);
    console.log(
      `${width}: three real home actors, exact selection/details, two actual delves/portraits/watch and offline state reconciliation PASS`,
    );
    await p.close();
  }
} finally {
  await browser.close();
}
