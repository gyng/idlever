import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchGpu } from "../../../tools/browser.mjs";
import { phoneReviewViewport } from "../../../web/tests/lib/viewport-cases.mjs";
const phase = process.argv[2];
assert.ok(["before", "after"].includes(phase));
const out = `docs/evidence/cut294/${phase}`;
assert.equal(existsSync(out), false);
mkdirSync(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const combinations = new Set([
  "fighter:crownsplitter",
  "rogue:crownsplitter",
  "ranger:sword",
  "caster:dagger",
  "caster:bow",
  "gunner:short_gun",
]);
const all = JSON.parse(readFileSync("docs/evidence/cut294/moments.json")).cases;
const cases =
  phase === "after"
    ? all
    : all.filter(
        (c) =>
          c.id.endsWith("baseline") &&
          combinations.has(`${c.floor.snapshot.hero.class}:${c.actual_weapon}`),
      );
const sources = [
  "web/src/render/look.ts",
  "web/src/render/state.ts",
  "web/src/render/atlas.ts",
  "web/src/render/view2d.ts",
  "web/src/render/index.ts",
  "web/src/render/fallback.ts",
  "web/public/art/atlas.json",
  "web/public/art/atlas.png",
];
const result = {
  phase,
  recordedAt: new Date().toISOString(),
  source: Object.fromEntries(sources.map((p) => [p, sha(readFileSync(p))])),
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  momentsSha256: sha(readFileSync("docs/evidence/cut294/moments.json")),
  rows: [],
  errors: [],
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
  const page = await browser.newPage({
    deviceScaleFactor: 1.5,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  page.on("pageerror", (e) => {
    result.errors.push(String(e));
    save();
  });
  await page.route(url, (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>",
    }),
  );
  for (const viewport of phase === "before"
    ? [phoneReviewViewport()]
    : [phoneReviewViewport(), { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.evaluate(async () => {
      window.mods = {
        render: await import("/src/render/index.ts"),
        state: await import("/src/render/state.ts"),
        look: await import("/src/render/look.ts"),
      };
    });
    result.gpu ??= await page.evaluate(() => {
      const g = document.createElement("canvas").getContext("webgl2");
      return g.getParameter(g.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL);
    });
    assert.match(result.gpu, /D3D12.*NVIDIA/);
    for (const backend of ["gl", "canvas"])
      for (const c of cases) {
        const model = await page.evaluate(
          ({ c, backend }) => {
            window.viewer?.dispose();
            document.querySelector("canvas")?.remove();
            const canvas = document.createElement("canvas");
            document.body.append(canvas);
            window.mods.look.setHeroLook(c.look);
            const shared = new window.mods.state.ReplayState();
            shared.load(c.floor.snapshot);
            const kind = shared.hero.kind;
            const v =
              backend === "gl"
                ? window.mods.render.createViewer(canvas, { baseTexels: 100 })
                : window.mods.render.createFallbackViewer(canvas);
            const before = JSON.stringify(c.floor);
            v.load(c.floor.snapshot);
            v.apply(c.floor.events.filter((e) => e.k !== "descend" && e.k !== "exit"));
            v.seek(c.target);
            v.setSpeed(0);
            v.setFrame("fight");
            window.viewer = v;
            if (before !== JSON.stringify(c.floor)) throw Error("viewer mutated input");
            return { kind, immutableInput: true };
          },
          { c, backend },
        );
        await page.waitForTimeout(500);
        const actual = await page.evaluate(() => {
          const s = window.viewer.stats();
          return {
            tick: s.tick,
            heroKind: s.heroKind ?? null,
            hero: s.hero,
            device: s.device,
            fade: s.fade,
            glLost: s.glLost,
            heroRect: window.viewer.debugRects?.().find((e) => e.hero) ?? null,
          };
        });
        const cls = c.floor.snapshot.hero.class,
          look = c.look || "male";
        const expected = combinations.has(`${cls}:${c.actual_weapon}`)
          ? `hero_${cls}_${look}_${c.actual_weapon}`
          : c.look
            ? `hero_${cls}_${c.look}`
            : `hero_${cls}`;
        if (phase === "after") {
          assert.equal(model.kind, expected);
          assert.equal(actual.heroKind, expected);
          if (backend === "gl") assert.equal(actual.heroRect?.kind, expected);
        }
        const file = `${c.id}-${backend}-${viewport.width}.png`;
        await page.screenshot({ path: `${out}/${file}` });
        result.rows.push({
          id: c.id,
          backend,
          viewport,
          textScale: 1,
          captureKind: "visible viewport, standalone production viewer",
          sourceReplaySha256: c.source_sha256,
          target: c.target,
          event: c.event,
          actualWeapon: c.actual_weapon,
          model,
          actual,
          expected,
          matches: model.kind === expected,
          file,
          frameSha256: sha(readFileSync(`${out}/${file}`)),
        });
        save();
      }
  }
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, phase === "after" ? 56 : 12);
  for (const p of sources) assert.equal(sha(readFileSync(p)), result.source[p]);
  result.status = phase === "after" ? "PASS" : "REPRODUCED";
  save();
  console.log(
    `${result.status}: ${result.rows.length} captures; ${result.rows.filter((x) => !x.matches).length} mismatches`,
  );
} finally {
  await browser?.close();
  vite.kill("SIGTERM");
}
