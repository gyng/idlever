import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchGpu } from "../../../tools/browser.mjs";
import { phoneReviewViewport } from "../../../web/tests/lib/viewport-cases.mjs";
const out = process.env.IDLEVER_REPLAY_FLOW_OUT ?? "docs/evidence/cut295/capture";
assert.equal(existsSync(out), false);
mkdirSync(out, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const cases = JSON.parse(readFileSync("docs/evidence/cut295/selection.json")).cases;
const pilot = process.argv.includes("--pilot");
const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
const result = {
  startedAt: new Date().toISOString(),
  mode: pilot ? "pilot" : "full",
  wasmSha256: sha(wasm),
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  selectionSha256: sha(readFileSync("docs/evidence/cut295/selection.json")),
  rows: [],
  errors: [],
  served: [],
};
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
save();
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--port",
    String(port),
    "--strictPort",
    "--config",
    "tests/vite.test.config.ts",
  ],
  { cwd: resolve("web"), stdio: "ignore" },
);
let browser;
try {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await launchGpu();
  for (const viewport of pilot
    ? [{ width: 1440, height: 900 }]
    : [phoneReviewViewport(), { width: 1440, height: 900 }])
    for (const backend of pilot ? ["gl"] : ["gl", "canvas"]) {
      const page = await browser.newPage({
        viewport,
        deviceScaleFactor: 1.5,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const packets = [];
      page.on("pageerror", (e) => {
        result.errors.push({ viewport, backend, error: e.message });
        save();
      });
      page.on("response", (r) => {
        if (r.url().includes("idlever_wasm_bg.wasm"))
          packets.push(
            r.body().then((b) => {
              assert.equal(sha(b), result.wasmSha256);
              return sha(b);
            }),
          );
      });
      await page.goto(`${url}?fresh=1&runs=0${backend === "canvas" ? "&view=2d" : ""}`);
      await page.waitForFunction(() => window.__idlever?.booted);
      const gpu = await page.evaluate(() => {
        const g = document.createElement("canvas").getContext("webgl2");
        return g.getParameter(g.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
      });
      assert.match(gpu, /D3D12.*NVIDIA/);
      result.gpu = gpu;
      await page.evaluate(async () => {
        const { ReplayState } = await import("/src/render/state.ts");
        const load = ReplayState.prototype.load,
          apply = ReplayState.prototype.apply;
        ReplayState.prototype.load = function (snap) {
          const value = load.call(this, snap);
          if (window.flowProbe && document.querySelector(".run-replay")) {
            window.flowProbe.state = this;
            window.flowProbe.loads.push({ snapshot: structuredClone(snap), kind: this.hero?.kind });
          }
          return value;
        };
        ReplayState.prototype.apply = function (events) {
          if (window.flowProbe && document.querySelector(".run-replay"))
            window.flowProbe.applied.push(structuredClone(events));
          return apply.call(this, events);
        };
        const engine = window.__idlever.engine;
        const original = engine.replay.bind(engine);
        engine.replay = async (...args) => {
          const rep = await original(...args);
          if (window.flowProbe) {
            window.flowProbe.replay = structuredClone(rep);
            window.flowProbe.replayCalls.push(args);
          }
          return rep;
        };
      });
      for (const c of pilot ? cases.slice(0, 1) : cases) {
        const input = readFileSync(c.inputPath, "utf8");
        assert.equal(sha(input), c.inputSha256);
        const receipt = await page.evaluate(
          async ({ input, c }) => {
            const app = window.__idlever;
            if (app.kind !== "wasm") throw Error("real WASM required");
            const { closeAllSheets } = await import("/src/ui/sheet.ts");
            closeAllSheets();
            window.flowProbe = null;
            if (
              !(await app.importSave(
                JSON.stringify({ engine: input, loadout: [], runs: 0, last_seen: Date.now() }),
              ))
            )
              throw Error("import failed");
            const before = JSON.parse(await app.engine.save());
            if (c.class === "gunner")
              await app.mutate(() => app.engine.buyKit(c.nextWeapon), undefined, true);
            else {
              const config = structuredClone(before.lineage.starting_config);
              config.weapon = c.nextWeapon;
              await app.mutate(
                () => app.engine.setStartingKit(JSON.stringify(config)),
                undefined,
                true,
              );
            }
            const after = await app.engine.save();
            const state = JSON.parse(after);
            window.flowProbe = {
              loads: [],
              applied: [],
              replayCalls: [],
              replay: null,
              state: null,
            };
            return {
              before: {
                gold: before.lineage.gold,
                marks: before.lineage.marks,
                clock: before.lineage.clock_s,
              },
              after: {
                gold: state.lineage.gold,
                marks: state.lineage.marks,
                clock: state.lineage.clock_s,
              },
              afterChoice: after,
              selected:
                c.class === "gunner"
                  ? state.lineage.kit.gun_choice === 1
                    ? "short_gun"
                    : "long_gun"
                  : state.lineage.starting_config.weapon,
            };
          },
          { input, c },
        );
        assert.deepEqual(receipt.before, receipt.after);
        assert.equal(receipt.selected, c.nextWeapon);
        if (!(await page.locator(".hero-details:visible").count()))
          await page.locator(".home-heroes-command:visible").click();
        await page.locator(".hero-details:visible").first().click();
        await page.locator('[data-hub-action="runs"]:visible').click();
        const replayButton = page.locator(`.runs-sheet .re-play[data-run="${c.runId}"]`);
        await replayButton.waitFor();
        await replayButton.click();
        await page.waitForFunction(
          () =>
            !!document.querySelector(".run-replay") &&
            window.__runReplay?.floor >= 0 &&
            window.flowProbe?.state,
        );
        const floorIndex = c.moment.floor.snapshot.depth;
        await page
          .locator(".rr-floors button")
          .filter({ hasText: new RegExp(`^D${floorIndex}$`) })
          .click();
        await page.waitForFunction(
          (depth) => Number(document.querySelector(".run-replay")?.dataset.floor) === depth,
          floorIndex,
        );
        const rendered = await page.evaluate(
          ({ target, depth }) => {
            const probe = window.flowProbe,
              st = probe.state;
            if (st.depth !== depth) throw Error("wrong actual UI ReplayState");
            st.speed = 0;
            st.seek(target);
            st.speed = 0;
            const snap = structuredClone(probe.loads.at(-1));
            const events = structuredClone(probe.applied.at(-1));
            return {
              loaded: snap,
              applied: events,
              run: structuredClone(window.__runReplay),
              replay: probe.replay,
              calls: probe.replayCalls,
              kind: st.hero.kind,
              tick: st.tickNow(),
              weapon: st.snap.hero.weapon,
              diagnosticSeek: true,
            };
          },
          { target: c.moment.target, depth: floorIndex },
        );
        assert.deepEqual(rendered.replay, JSON.parse(readFileSync(c.replayPath, "utf8")));
        assert.deepEqual(rendered.loaded.snapshot, c.moment.floor.snapshot);
        assert.deepEqual(
          rendered.applied,
          c.moment.floor.events.filter((e) => e.k !== "descend" && e.k !== "exit"),
        );
        assert.equal(rendered.weapon, c.weapon);
        assert.equal(rendered.run.run, c.runId);
        assert.equal(rendered.run.hash, c.nativeReplayHash);
        const combos = new Set([
          "fighter:crownsplitter",
          "rogue:crownsplitter",
          "ranger:sword",
          "caster:dagger",
          "caster:bow",
          "gunner:short_gun",
        ]);
        const look = await page.evaluate(() => window.__idlever.lineage.look ?? "");
        const kind = combos.has(`${c.class}:${c.weapon}`)
          ? `hero_${c.class}_${look || "male"}_${c.weapon}`
          : `hero_${c.class}${look ? "_" + look : ""}`;
        assert.equal(rendered.kind, kind);
        await page.waitForTimeout(250);
        const ui = await page.evaluate(() => {
          const panel = document.querySelector(".run-replay"),
            canvas = panel.querySelector("canvas"),
            r = canvas.getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            panel: panel.innerText,
            canvas: { x: r.x, y: r.y, w: r.width, h: r.height },
            backend: canvas.getContext("webgl2")
              ? "gl"
              : canvas.getContext("2d")
                ? "canvas"
                : "none",
            stateKind: window.flowProbe.state.hero.kind,
            tick: window.flowProbe.state.tickNow(),
          };
        });
        assert.equal(ui.backend, backend);
        assert.equal(ui.overflow, false);
        assert.equal(ui.stateKind, kind);
        assert.equal(ui.tick, c.moment.target);
        assert.ok(
          ui.canvas.w > 0 &&
            ui.canvas.h > 0 &&
            ui.canvas.x < viewport.width &&
            ui.canvas.y < viewport.height,
        );
        const afterView = await page.evaluate(() => window.__idlever.engine.save());
        assert.equal(afterView, receipt.afterChoice);
        const file = `${c.id}-${backend}-${viewport.width}.png`;
        await page.screenshot({ path: `${out}/${file}` });
        const saveFile = `${c.id}-after-choice.json.gz`,
          replayFile = `${c.id}-wasm-replay.json.gz`;
        if (!existsSync(`${out}/${saveFile}`)) {
          writeFileSync(`${out}/${saveFile}`, gzipSync(receipt.afterChoice));
          writeFileSync(`${out}/${replayFile}`, gzipSync(JSON.stringify(rendered.replay)));
        }
        result.rows.push({
          id: c.id,
          backend,
          viewport,
          textScale: 1,
          inputSha256: c.inputSha256,
          nextWeapon: c.nextWeapon,
          recordedWeapon: c.weapon,
          cost: receipt.before,
          afterCost: receipt.after,
          afterChoiceSha256: sha(receipt.afterChoice),
          afterViewSha256: sha(afterView),
          nativeReplayHash: c.nativeReplayHash,
          loadedSnapshotSha256: sha(JSON.stringify(rendered.loaded.snapshot)),
          appliedEventsSha256: sha(JSON.stringify(rendered.applied)),
          replayCalls: rendered.calls,
          kind,
          ui,
          diagnosticSeek: true,
          target: c.moment.target,
          saveFile,
          replayFile,
          file,
          frameSha256: sha(readFileSync(`${out}/${file}`)),
        });
        save();
        console.log(`${result.rows.length} ${c.id} ${backend} ${viewport.width}`);
      }
      result.served.push(...(await Promise.all(packets)));
      await page.close();
    }
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, pilot ? 1 : 56);
  result.status = "PASS";
  save();
} catch (error) {
  result.failure = String(error);
  save();
  throw error;
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
}
