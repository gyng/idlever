import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "../../web/node_modules/typescript/lib/typescript.js";
import { launchBrowser } from "../../tools/browser.mjs";
const js = ts.transpileModule(
  readFileSync(new URL("../src/render/movement-trail.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } },
).outputText;
const { MovementTrail } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
let n = 0;
const eq = (a, b) => {
    assert.deepEqual(a, b);
    n++;
  },
  ok = (a) => {
    assert.ok(a);
    n++;
  };
const m = new MovementTrail();
m.move(1, 2, 2, 2, 2);
m.move(2, 2, 2, 5, 2);
eq(m.stats().steps, 0);
for (let i = 0; i < 20; i++) m.move(i, 2 + i, 2, 3 + i, 2);
eq(m.stats().steps, 6);
const full = m.draw(19, () => true, "full", true);
eq(full.length, 12);
const held = JSON.stringify(full);
eq(JSON.stringify(m.draw(19, () => true, "full", true)), held);
eq(m.draw(19, () => true, "low", true).length, 6);
eq(m.draw(19, () => true, "full", false).length, 4);
eq(m.draw(19, () => false, "full", true).length, 0);
eq(m.draw(27, () => true, "full", true).length, 0);
m.move(30, 2, 2, 3, 2);
eq(m.draw(30, () => true, "off", true).length, 0);
eq(m.draw(30, () => true, "full", true).length, 0);
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const b = await launchBrowser();
const errors = [];
try {
  const p = await b.newPage({
    viewport: { width: 400, height: 800 },
    reducedMotion: "no-preference",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=212`);
  await p.waitForFunction(() => window.__idlever?.booted);
  const facts = await p.evaluate(async () => {
    const a = window.__idlever;
    a.runnerOn = false;
    const { createDepthMap, knownDepthMarks } = await import("/src/ui/depth-map.ts");
    const { ReplayState } = await import("/src/render/state.ts");
    const marks = knownDepthMarks(a.lineage, 1);
    const map = createDepthMap();
    document.body.append(map.el);
    map.update({
      depth: 7,
      biome: "warrens",
      markers: [
        { depth: 1, kind: "start", label: "Start" },
        { depth: 5, kind: "waystone", label: "Waystone" },
        { depth: 8, kind: "boss", label: "Warlord" },
      ],
    });
    const label = map.el.querySelector("summary").getAttribute("aria-label");
    map.el.open = true;
    const buttons = [...map.el.querySelectorAll("button")].map((x) => ({
      w: x.getBoundingClientRect().width,
      h: x.getBoundingClientRect().height,
      label: x.getAttribute("aria-label"),
    }));
    const detail = map.el.querySelector(".depth-map-details").getBoundingClientRect();
    map.el.querySelector("button:last-child").click();
    const inspection = map.el.querySelector("p").textContent;
    map.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const closed = !map.el.open;
    const rail = map.el.querySelector(".depth-map-position");
    const position = getComputedStyle(rail).top;
    map.dispose();
    if (a.lineage.town?.home === false) await a.engine.buildTown("house");
    const snap = await a.engine.send();
    if (!snap) throw Error("No real send");
    const st = new ReplayState();
    st.load(snap);
    const h = snap.hero;
    st.apply([
      { k: "move", t: snap.turn + 1, id: h.id, x: h.x + 1, y: h.y },
      { k: "move", t: snap.turn + 2, id: 987654, x: h.x + 2, y: h.y },
      { k: "rule", t: snap.turn + 100, row: -2, verb: { v: "rest" }, text: "rest" },
    ]);
    st.tick(200, performance.now());
    const steps = st.trail.stats().steps;
    st.speed = 0;
    st.tick(500, performance.now());
    const paused = st.trail.stats().steps;
    st.seek(snap.turn + 2);
    const seek = st.trail.stats().steps;
    st.load(snap);
    st.apply([{ k: "move", t: snap.turn + 1, id: h.id, x: h.x + 1, y: h.y }]);
    st.skipToEvent();
    const skip = st.trail.stats().steps;
    st.load(snap);
    const load = st.trail.stats().steps;
    const speeds = [];
    for (const speed of [1, 4, 8]) {
      st.load(snap);
      st.apply([
        { k: "move", t: snap.turn + 1, id: h.id, x: h.x + 1, y: h.y },
        { k: "rule", t: snap.turn + 100, row: -2, verb: { v: "rest" }, text: "rest" },
      ]);
      st.speed = speed;
      st.tick(100, performance.now());
      const quads = st.trail.draw(st.clock, () => true, "full", true).length;
      st.speed = 0;
      st.tick(300, performance.now());
      const held = st.trail.draw(st.clock, () => true, "full", true).length;
      speeds.push({ speed, clock: st.clock - snap.turn, quads, held });
    }
    return {
      speeds,
      marks,
      label,
      buttons,
      detail: { x: detail.x, right: detail.right, width: detail.width },
      inspection,
      closed,
      position,
      steps,
      paused,
      seek,
      skip,
      load,
      engine: a.kind,
    };
  });
  eq(facts.engine, "wasm");
  ok(!facts.marks.some((m) => m.kind === "boss"));
  eq(
    facts.speeds.map((s) => s.clock),
    [1, 4, 8],
  );
  ok(facts.speeds.every((s) => s.quads === 2 && s.held === 2));
  ok(facts.marks.every((m) => m.depth > 0));
  eq(facts.label, "Depth map: D7, warrens");
  ok(facts.buttons.every((b) => b.w >= 44 && b.h >= 44));
  ok(facts.detail.x >= 0 && facts.detail.right <= 400 && facts.detail.width <= 240);
  eq(facts.inspection, "D8 · Warlord");
  ok(facts.closed);
  ok(facts.position !== "auto");
  eq(facts.steps, 1);
  eq(facts.paused, 1);
  eq(facts.seek, 0);
  eq(facts.skip, 0);
  eq(facts.load, 0);
  for (const width of [320, 400, 1440])
    for (const scale of [1, 2]) {
      await p.setViewportSize({ width, height: 900 });
      const layout = await p.evaluate(
        async ({ scale }) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
          const { createDepthMap } = await import("/src/ui/depth-map.ts");
          const m = createDepthMap();
          document.body.append(m.el);
          m.update({
            depth: 33,
            biome: "burrows",
            markers: Array.from({ length: 17 }, (_, i) => ({
              id: `controlled_layout_${i}`,
              depth: i * 2 + 1,
              kind: "boss",
              label: "Goblin Warlord",
            })),
          });
          const r = m.el.getBoundingClientRect(),
            current = m.el.querySelector("strong"),
            notches = [...m.el.querySelectorAll(".depth-map-notch")].map((x) =>
              x.getBoundingClientRect(),
            );
          const overlaps = notches.some((a, i) =>
            notches
              .slice(i + 1)
              .some(
                (b) => a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right,
              ),
          );
          m.el.open = true;
          const pane = m.el.querySelector(".depth-map-details").getBoundingClientRect(),
            rows = [...m.el.querySelectorAll("button")],
            allLabels = rows.length;
          const clipped = rows.some((row) => row.scrollWidth > row.clientWidth + 1),
            min = Math.min(...rows.map((row) => row.getBoundingClientRect().height));
          const out = {
            right: r.right,
            width: r.width,
            overlaps,
            currentClipped: current.scrollWidth > current.clientWidth + 1,
            pane: { left: pane.left, right: pane.right, bottom: pane.bottom, width: pane.width },
            clipped,
            min,
            allLabels,
          };
          m.dispose();
          return out;
        },
        { scale },
      );
      ok(layout.right <= width && layout.width <= 80);
      ok(!layout.overlaps);
      assert.ok(!layout.currentClipped, JSON.stringify({ width, scale, ...layout }));
      n++;
      ok(
        layout.pane.left >= 0 &&
          layout.pane.right <= width &&
          layout.pane.bottom <= 900 &&
          layout.pane.width <= 240,
      );
      ok(!layout.clipped && layout.min >= 44);
      eq(layout.allLabels, 17);
    }
  eq(errors, []);
  console.log(`live-depth-map: ${n} checks PASS (real WASM, controlled map labels and movement)`);
} finally {
  await b.close();
}
