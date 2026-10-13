// Public free construction + actual appearance actions; pure fixtures cover all supported IDs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.IDLEVER_BUILD_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launchBrowser({ gpu: process.env.IDLEVER_HOME_GPU === "1" });
const engine = readFileSync(new URL("./fixtures/earned-gunner-home.json", import.meta.url), "utf8");
try {
  for (const canvas of [false, true]) {
    const width = canvas ? 1440 : 400;
    const p = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "no-preference",
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    if (canvas)
      await p.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return /^(webgl|webgl2|experimental-webgl)$/.test(kind)
            ? null
            : get.call(this, kind, ...args);
        };
      });
    await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=195&juice=1&effects=full`);
    await p.waitForFunction(() => window.__idlever?.booted && window.__town?.stats().frames > 0);
    for (const level of ["full", "low", "off", "reduced"]) {
      if (level !== "full") {
        await p.emulateMedia({ reducedMotion: level === "reduced" ? "reduce" : "no-preference" });
        await p.evaluate(async (level) => {
          const { setEffectsLevel } = await import("/src/render/fxpref.ts");
          setEffectsLevel(level === "reduced" ? "full" : level);
          const a = window.__idlever;
          await a.mutate(() =>
            a.engine.newLineage(195 + ["full", "low", "off", "reduced"].indexOf(level)),
          );
          a.runnerOn = false;
          a.go({ kind: "camp" });
          history.replaceState(
            null,
            "",
            `/?dev=1&runs=0&juice=1&effects=${level === "reduced" ? "full" : level}`,
          );
        }, level);
        await p.waitForFunction(() => window.__town?.stats().frames > 0);
      }
      await p.evaluate((canvas) => window.__town.setHour(canvas ? 23 : 12), canvas);
      assert.equal(await p.evaluate(() => window.__idlever.kind), "wasm");
      assert.equal(await p.evaluate(() => window.__town.stats().mode), canvas ? "2d" : "gl");
      assert.deepEqual(await p.evaluate(() => window.__town.stats().activeBuilds), []);
      assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 0);
      const before = await p.evaluate(() => window.__idlever.engine.save());
      const refused = await p.evaluate(async () =>
        window.__idlever.mutate(() => window.__idlever.engine.buildTown("blacksmith")),
      );
      assert.equal(refused, false);
      assert.equal(await p.evaluate(() => window.__idlever.engine.save()), before);
      assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 0);
      const start = Date.now();
      await p.locator('.town-tag[data-next="house"]').click();
      await p.waitForFunction(
        () => window.__idlever.lineage.town.home && window.__town.stats().buildEvents === 1,
      );
      assert.equal(await p.locator("button.send").isDisabled(), false);
      assert.equal(await p.evaluate(() => window.__idlever.lineage.gold), 0);
      const animated = level === "full" || level === "low";
      if (animated) {
        assert.deepEqual(await p.evaluate(() => window.__town.stats().activeBuilds), ["house"]);
        if (shots && level === "full")
          await p.screenshot({
            path: `${shots}/${width}-${canvas ? "canvas" : "gl"}-assembly.png`,
          });
      } else {
        assert.deepEqual(await p.evaluate(() => window.__town.stats().activeBuilds), []);
        assert.equal(await p.evaluate(() => window.__town.stats().buildDust), 0);
      }
      // Read-only help and repeated authoritative refresh remain usable and add no event.
      await p.locator('[data-building-info="tent"]').click();
      assert.match(await p.locator("#kw-tip").textContent(), /House.*Built/s);
      await p.keyboard.press("Escape");
      await p.mouse.move(1, 1);
      await p.evaluate(async () => {
        await window.__idlever.refresh();
        await window.__idlever.refresh();
      });
      assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 1);
      if (animated) {
        await p.waitForFunction(() => window.__town.stats().buildDust > 0, null, {
          timeout: 15000,
        });
        const dust = await p.evaluate(() => window.__town.stats().buildDust);
        assert.ok(dust > 0 && dust <= (level === "full" ? 22 : 8));
        if (shots && level === "full")
          await p.screenshot({
            path: `${shots}/${width}-${canvas ? "canvas" : "gl"}-completion.png`,
          });
        if (level === "full")
          console.log(
            "construction-frame-diagnostic " +
              JSON.stringify(
                await p.evaluate(() => {
                  const s = window.__town.stats();
                  return {
                    mode: s.mode,
                    night: s.night,
                    cpuP50: s.cpuP50,
                    cpuP95: s.cpuP95,
                    frames: s.frames,
                    fps: s.fps,
                    buildDust: s.buildDust,
                    activeBuilds: s.activeBuilds,
                    note: "shared focused-check load; rolling window includes startup, not quiet FPS certification",
                  };
                }),
              ),
          );
        await p.waitForFunction(
          () =>
            window.__town.stats().activeBuilds.length === 0 &&
            window.__town.stats().buildDust === 0,
          null,
          { timeout: 15000 },
        );
      }
      const duration = Date.now() - start;
      await p.evaluate(() =>
        history.replaceState(
          null,
          "",
          `/?dev=1&runs=0&juice=1&effects=${new URLSearchParams(location.search).get("effects")}`,
        ),
      );
      await p.reload();
      await p.waitForFunction(() => window.__idlever?.booted && window.__town?.stats().frames > 0);
      assert.equal(await p.evaluate(() => window.__idlever.lineage.town.home), true);
      assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 0);
      assert.deepEqual(await p.evaluate(() => window.__town.stats().activeBuilds), []);
      if (!canvas && level === "full") {
        const cases = await p.evaluate(async () => {
          const { constructionChanges, townState } = await import("/src/render/town.ts");
          const base = townState(window.__idlever.lineage);
          let n = 0;
          const check = (actual, expected) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected))
              throw Error(JSON.stringify({ actual, expected }));
            n++;
          };
          check(
            constructionChanges(null, {
              ...base,
              buildings: [{ id: "blacksmith", look: 1, fresh: true }],
            }),
            [],
          );
          check(constructionChanges(base, base), []);
          for (const id of ["blacksmith", "kennel", "bank"]) {
            const empty = { ...base, stage: 0, buildings: [] },
              one = { ...empty, stage: 1, buildings: [{ id, look: 1, fresh: true }] };
            check(constructionChanges(empty, one), [{ id }]);
            const upgraded = { ...one, buildings: [{ id, look: 2, fresh: false }] };
            check(constructionChanges(one, upgraded), [{ id, fromLook: 1 }]);
            check(constructionChanges(upgraded, one), []);
            check(
              constructionChanges(one, { ...one, buildings: [{ id, look: 1, fresh: true }] }),
              [],
            );
          }
          check(constructionChanges({ ...base, home: false }, base), [{ id: "house" }]);
          check(constructionChanges({ ...base, stage: 1 }, { ...base, stage: 2 }), [
            { id: "house", fromLook: 1 },
          ]);
          check(constructionChanges({ ...base, stage: 2 }, { ...base, stage: 3 }), [
            { id: "house", fromLook: 2 },
          ]);
          return n;
        });
        assert.equal(cases, 17);
        // Controlled starting appearance, followed by genuine permanent Forge steps/Savings transactions.
        await p.evaluate(async (engine) => {
          const saved = JSON.parse(engine);
          saved.lineage.kit = {};
          saved.lineage.town.bank = 0;
          saved.lineage.last_night_net = 100;
          saved.lineage.last_day_net = 400;
          const a = window.__idlever;
          await a.importSave(
            JSON.stringify({
              v: 2,
              engine: JSON.stringify(saved),
              loadout: [],
              last_seen: Date.now(),
              runs: 0,
            }),
          );
          a.runnerOn = false;
          await a.mutate(() => a.engine.setWorker("scout", false));
          a.go({ kind: "camp" });
        }, engine);
        assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 0);
        await p.evaluate(async () => {
          const a = window.__idlever;
          for (let i = 0; i < 3; i++)
            if (!(await a.mutate(() => a.engine.buyKit("armour"))))
              throw Error("Forge purchase refused");
        });
        assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 1);
        assert.ok(
          (await p.evaluate(() => window.__town.stats().activeBuilds)).includes("blacksmith"),
        );
        await p.evaluate(async () => {
          const a = window.__idlever;
          await a.mutate(() => a.engine.bankDeposit(a.lineage.town.bank_cap));
        });
        assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 2);
        await p.evaluate(async () => {
          const a = window.__idlever;
          await a.mutate(() => a.engine.bankWithdraw(a.lineage.town.bank));
        });
        assert.equal(await p.evaluate(() => window.__town.stats().buildEvents), 2);
        assert.ok(!(await p.evaluate(() => window.__town.stats().activeBuilds)).includes("bank"));
        await p.evaluate(async () => {
          const { setEffectsLevel } = await import("/src/render/fxpref.ts");
          setEffectsLevel("off");
        });
        await p.waitForFunction(
          () =>
            window.__town.stats().activeBuilds.length === 0 &&
            window.__town.stats().buildDust === 0,
        );
        await p.evaluate(async () => {
          const { setEffectsLevel } = await import("/src/render/fxpref.ts");
          setEffectsLevel("full");
        });
        assert.deepEqual(await p.evaluate(() => window.__town.stats().activeBuilds), []);
      }
      assert.deepEqual(errors, []);
      console.log(
        `${width} ${canvas ? "Canvas" : "GL"} ${level}: exact free construction/refusal/refresh/reload and immediate use PASS (${duration}ms lifecycle wall; not a performance gate)`,
      );
    }
    await p.close();
  }
} finally {
  await browser.close();
}
