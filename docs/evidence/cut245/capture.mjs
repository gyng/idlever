// Paused production viewers, actual stored replay geometry and ordinary camera.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import ts from "../../../web/node_modules/typescript/lib/typescript.js";
import { launchGpu } from "../../../tools/browser.mjs";
const arg = (key, fallback) => {
  const i = process.argv.indexOf(key);
  return i < 0 ? fallback : process.argv[i + 1];
};
const phase = arg("--phase", "before");
const assets = arg("--assets", "normal");
const hazards = process.argv.includes("--hazards");
const combat = process.argv.includes("--combat") || hazards;
const out = resolve(`docs/evidence/cut245/${phase}`);
mkdirSync(out, { recursive: true });
const hash = (data) => createHash("sha256").update(data).digest("hex");
const raw = gunzipSync(readFileSync("docs/evidence/handoff-content/run131.replay.json.gz"));
const replay = JSON.parse(raw);
const js = ts.transpileModule(readFileSync("web/src/render/landmarks.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { planLandmarks } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const candidates = [];
for (const floor of replay.floors) {
  const s = floor.snapshot;
  for (const place of planLandmarks(s.w, s.h, s.tiles, s.biome)) {
    let moves = [
      { t: s.turn, x: s.hero.x, y: s.hero.y, k: "loaded snapshot" },
      ...floor.events.filter((e) => e.k === "move" && e.id === s.hero.id),
    ];
    if (combat) {
      let x = s.hero.x, y = s.hero.y;
      moves = [];
      for (const e of floor.events) {
        if (e.k === "move" && e.id === s.hero.id) { x = e.x; y = e.y; }
        if (hazards && e.k !== "overlay") continue;
        if ((e.k === "attack" && (e.src === s.hero.id || e.dst === s.hero.id)) || e.k === "telegraph" || e.k === "overlay")
          moves.push({ ...e, x, y, ...(hazards ? { hazard: { x: e.x, y: e.y, ov: e.ov, ttl: e.ttl } } : {}) });
      }
      if (!moves.length) continue;
    }
    const event = moves.filter((e) => !hazards || (Math.hypot(e.x - place.x, e.y - place.y) <= 8 && Math.hypot(e.hazard.x - place.x, e.hazard.y - place.y) <= 8)).sort((a, b) =>
      (a.x - place.x) ** 2 + (a.y - place.y) ** 2 -
      ((b.x - place.x) ** 2 + (b.y - place.y) ** 2) || a.t - b.t,
    )[0];
    if (!event) continue;
    candidates.push({
      id: s.biome,
      depth: s.depth,
      place,
      event,
      distance: Math.hypot(event.x - place.x, event.y - place.y),
      ...(hazards ? { eventDistance: Math.hypot(event.hazard.x - place.x, event.hazard.y - place.y) } : {}),
      target: event.t + 2,
      floor,
    });
  }
}
const requestedBiomes = arg("--cases", "fens,crypt,foundry").split(",");
assert(requestedBiomes.every((b) => ["fens", "crypt", "foundry"].includes(b)));
const cases = requestedBiomes.map((biome) => {
  const choices = candidates.filter((c) => c.id === biome).sort((a, b) => a.distance - b.distance || a.depth - b.depth);
  assert(choices.length, `${biome}: naturally eligible floor required`);
  assert(choices[0].distance <= (hazards ? 8 : combat ? 6 : 3), `${biome}: actual hero must pass the place`);
  return choices[0];
});
const result = {
  scope: "Paired paused production-renderer views of the pinned87de reconstruction; original historical replay drift retained; no new gameplay or performance claim",
  phase,
  assets,
  combat,
  hazards,
  replaySha256: hash(raw),
  source: {},
  served: [],
  cases: cases.map(({ floor, ...c }) => c),
  rows: [],
  lifecycle: [],
  errors: [],
};
for (const path of ["web/src/render/index.ts", "web/src/render/atlas.ts", "web/src/render/state.ts", "web/src/render/view2d.ts", "web/src/render/landmarks.ts", "web/public/art/atlas.json", "web/public/art/atlas.png"])
  result.source[path] = hash(readFileSync(path));
const save = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + "\n");
save();
const port = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const log = createWriteStream(`${out}/server.log`);
await new Promise((r) => log.once("open", r));
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--config", "tests/vite.test.config.ts"], {
  cwd: resolve("web"), stdio: ["ignore", log, log],
});
let browser;
try {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await launchGpu();
  const page = await browser.newPage({ deviceScaleFactor: 1.5, reducedMotion: "reduce", serviceWorkers: "block" });
  const pending = [];
  page.on("pageerror", (e) => { result.errors.push(String(e)); save(); });
  page.on("response", (r) => {
    if (r.url().includes("/src/render/"))
      pending.push(r.body().then((body) => result.served.push({ path: new URL(r.url()).pathname, sha256: hash(body) })).catch(() => {}));
  });
  await page.route(url, (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>" }));
  if (assets !== "normal") {
    const missing = ["fens_env_crate", "crypt_env_barrel", "foundry_env_barrel"];
    result.suppressedFrames = assets === "missing" ? missing : "all atlas frames (HTTP404)";
    await page.route("**/art/atlas.json", (route) => {
      if (assets === "none") return route.fulfill({ status: 404, body: "controlled atlas failure" });
      assert.equal(assets, "missing");
      const atlas = JSON.parse(readFileSync("web/public/art/atlas.json", "utf8"));
      for (const id of missing) delete atlas.frames[id];
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(atlas) });
    });
  }
  for (const width of arg("--widths", "400,1440").split(",").map(Number)) {
    await page.setViewportSize({ width, height: width === 400 ? 640 : 800 });
    await page.goto(url);
    await page.evaluate(async () => { window.renderModule = await import("/src/render/index.ts"); });
    result.gpu ??= await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl2");
      return g.getParameter(g.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
    });
    assert(/D3D12.*NVIDIA/.test(result.gpu), result.gpu);
    for (const backend of ["gl", "canvas"])
      for (const c of cases) {
        const state = await page.evaluate(({ c, backend }) => {
          window.viewer?.dispose();
          document.querySelector("canvas")?.remove();
          const canvas = document.createElement("canvas");
          document.body.append(canvas);
          const v = backend === "gl" ? window.renderModule.createViewer(canvas, { baseTexels: 120 }) : window.renderModule.createFallbackViewer(canvas);
          const before = JSON.stringify(c.floor);
          v.load(c.floor.snapshot);
          v.apply(c.floor.events.filter((e) => e.k !== "descend" && e.k !== "exit"));
          v.seek(c.target);
          v.setSpeed(0);
          v.setFrame("map");
          window.viewer = v;
          return { unchangedInput: before === JSON.stringify(c.floor) };
        }, { c, backend });
        assert(state.unchangedInput, "viewer must not mutate replay input");
        await page.waitForTimeout(800);
        const details = await page.evaluate(() => ({ stats: window.viewer.stats(), landmarks: window.viewer.debugLandmarks?.() ?? null }));
        if (phase !== "before") {
          assert(details.landmarks?.length >= (combat ? 1 : 6), `${c.id}/${backend}: actual drawn landmark`);
          if (assets === "normal") assert(details.landmarks.every((piece) => piece.painted), "normal painted assets loaded");
          else if (assets === "none") assert(details.landmarks.every((piece) => !piece.painted), "full primitive fallback drawn");
          else assert(details.landmarks.some((piece) => !piece.painted) && details.landmarks.some((piece) => piece.painted), "individual missing-frame fallback drawn alongside painted art");
        }
        const file = `${c.id}-${backend}-${width}.png`;
        await page.screenshot({ path: `${out}/${file}` });
        result.rows.push({ id: c.id, depth: c.depth, backend, width, target: c.target, file, ...state, ...details });
        save();
        if (process.argv.includes("--lifecycle")) {
          const next = cases[(cases.indexOf(c) + 1) % cases.length];
          const transitions = await page.evaluate(async ({ c, next }) => {
            const v = window.viewer;
            const paint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const pieces = () => v.debugLandmarks().map(({ rect, ...piece }) => piece).sort((a, b) => a.y - b.y || a.x - b.x);
            const original = JSON.stringify(pieces());
            v.seek(c.floor.snapshot.turn);
            await paint();
            const initialCount = pieces().length;
            v.seek(c.target);
            await paint();
            if (JSON.stringify(pieces()) !== original) throw Error("seek changed landmark plan");
            const load = async (which) => {
              v.load(which.floor.snapshot);
              v.apply(which.floor.events.filter((e) => e.k !== "descend" && e.k !== "exit"));
              v.seek(which.target);
              v.setSpeed(0);
              await paint();
            };
            await load(next);
            if (v.debugBiome() !== next.id || pieces().length < 6) throw Error("floor change did not replace landmarks");
            const nextCount = pieces().length;
            await load(c);
            if (JSON.stringify(pieces()) !== original) throw Error("reload changed landmark plan");
            return { initialCount, nextBiome: next.id, nextCount, seekExact: true, reloadExact: true, pieces: pieces() };
          }, { c, next });
          if (backend === "gl") {
            await page.evaluate(() => {
              window.lose = document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context");
              if (!window.lose) throw Error("context-loss extension required");
              window.lose.loseContext();
            });
            await page.waitForFunction(() => window.viewer.stats().glLost && window.viewer.debugLandmarks().length >= 6);
            // A newly mounted Canvas viewer uses primitives while its independent atlas decodes.
            transitions.contextLossFirstFrame = await page.evaluate(() => window.viewer.debugLandmarks());
            if (assets === "normal")
              await page.waitForFunction(() => window.viewer.debugLandmarks().every((p) => p.painted));
            // GL submits in tile traversal order; Canvas submits composition order.
            const lost = await page.evaluate(() => ({ stats: window.viewer.stats(), pieces: window.viewer.debugLandmarks().map(({ rect, ...piece }) => piece).sort((a, b) => a.y - b.y || a.x - b.x) }));
            assert.deepEqual(lost.pieces, transitions.pieces, "context-loss Canvas composition matches GL");
            await page.screenshot({ path: `${out}/${c.id}-context-lost-${width}.png` });
            await page.evaluate(() => window.lose.restoreContext());
            await page.waitForFunction(() => !window.viewer.stats().glLost && window.viewer.stats().calls > 0);
            const restored = await page.evaluate(() => window.viewer.debugLandmarks().map(({ rect, ...piece }) => piece).sort((a, b) => a.y - b.y || a.x - b.x));
            assert.deepEqual(restored, transitions.pieces, "restored GL composition matches original");
            transitions.contextLossExact = true;
          }
          result.lifecycle.push({ id: c.id, backend, width, ...transitions });
          save();
        }
      }
  }
  await Promise.all(pending);
  assert.equal(result.errors.length, 0);
  result.status = "captured";
  save();
  console.log(JSON.stringify({ phase, rows: result.rows.length, gpu: result.gpu, cases: result.cases.map((c) => ({ id: c.id, depth: c.depth, distance: c.distance, target: c.target })) }));
} catch (e) {
  result.status = "failed";
  result.error = String(e.stack ?? e);
  save();
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  log.end();
}
