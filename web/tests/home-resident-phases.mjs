import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const out = process.env.IDLEVER_RESIDENT_PHASE_OUT
  ? resolve(root, process.env.IDLEVER_RESIDENT_PHASE_OUT)
  : undefined;
if (out) mkdirSync(out, { recursive: true });
const expectedWasm = readFileSync(resolve(root, "web/src/engine/pkg/idlever_wasm_bg.wasm"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectedPackage = { bytes: expectedWasm.length, sha256: hash(expectedWasm) };
const deliveries = [],
  rows = [];
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  }).trim();
const browser = await launchBrowser();
let checks = 0;
const eq = (a, b, m) => {
  assert.deepEqual(a, b, m ?? "exact phase/identity values");
  checks++;
};
try {
  const p = await browser.newPage({
      viewport: { width: 400, height: 900 },
      reducedMotion: "reduce",
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      deliveries.push(r.body().then((bytes) => ({ bytes: bytes.length, sha256: hash(bytes) })));
  });
  const entry = new URL(url);
  for (const [key, value] of Object.entries({ dev: "1", fresh: "1", runs: "0" }))
    entry.searchParams.set(key, value);
  if (process.env.IDLEVER_TOWN_DEPTH === "pilot") entry.searchParams.set("townDepth", "pilot");
  await p.goto(entry.toString());
  await p.waitForFunction(() => window.__idlever?.booted);
  const raw = gunzipSync(
    readFileSync(
      new URL(
        "../../docs/evidence/cut227/recovery/fixtures/three-controlled-reincarnating.game.json.gz",
        import.meta.url,
      ),
    ),
  ).toString();
  await p.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
  }, raw);
  const state = async () => {
    await p.evaluate(() => {
      window.__town.setHour(12);
      window.dispatchEvent(new Event("pointermove"));
    });
    await p.waitForFunction(
      () => {
        const expected = window.__idlever.lineage.hero_slots
          .filter((h) => h.life_state !== "away")
          .map((h) => h.id)
          .sort();
        const visible = [...document.querySelectorAll("[data-home-hero]")]
          .filter((e) => !e.hidden)
          .map((e) => Number(e.dataset.homeHero))
          .sort();
        return JSON.stringify(expected) === JSON.stringify(visible);
      },
      undefined,
      { timeout: 10000 },
    );
    const result = await p.evaluate(() => ({
      phase: window.__idlever.lineage.hero_slots.map((h) => h.life_state),
      ids: [...document.querySelectorAll("[data-home-hero]")]
        .filter((e) => !e.hidden)
        .map((e) => Number(e.dataset.homeHero))
        .sort(),
      render: window.__town.stats().residentStates.map((h) => h.phase),
      seated: window.__town.stats().residentStates.map((h) => h.resting),
      services: window.__town.stats().services,
      persistent: window.__idlever.lineage.persistent_hero,
      targets: [...document.querySelectorAll("[data-home-hero]")].map((e) => ({
        id: e.dataset.homeHero,
        hidden: e.hidden,
      })),
    }));
    rows.push(result);
    if (out)
      writeFileSync(resolve(out, "phase-progress.json"), JSON.stringify({ rows, errors }, null, 2));
    return result;
  };
  let s = await state();
  eq(s.phase, ["reincarnating", "reincarnating", "reincarnating"]);
  eq(s.ids, [1, 2, 3]);
  eq(s.render, s.phase);
  eq(s.seated, [true, true, true], "actual reincarnation residents stay at their stations");
  assert(s.services.includes("device"));
  checks++;
  await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.advance(2000);
    await a.refresh();
  });
  s = await state();
  eq(s.phase, ["recovering", "recovering", "recovering"]);
  eq(s.ids, [1, 2, 3]);
  eq(s.render, s.phase);
  eq(s.seated, [true, true, true], "actual recovery residents remain resting");
  await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.advance(1200000); // the 2026-10-14 recovery: 12000 ticks
    await a.refresh();
  });
  s = await state();
  eq(s.phase, ["ready", "ready", "ready"]);
  eq(s.ids, [1, 2, 3]);
  eq(s.render, s.phase);
  eq(s.seated, [false, false, false], "ready/rest0 residents leave their recovery seats");
  const sent = await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.selectBloodline(2);
    await a.engine.send();
    await a.refresh();
    return a.lineage.hero_slots.map((h) => ({ id: h.id, phase: h.life_state }));
  });
  eq(sent.find((h) => h.id === 2).phase, "ready", "prepared turn0 is factually home");
  s = await state();
  eq(s.ids, [1, 2, 3]);
  eq(s.seated, [false, false, false], "prepared turn0 remains an actual ready home resident");
  await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.step(1);
    await a.refresh();
  });
  s = await state();
  eq(s.phase[1], "away");
  eq(s.ids, [1, 3], "only actually delving resident leaves home");
  eq(s.seated, [false, false], "remaining ready residents do not acquire fake rest");
  eq(errors, []);
  const packages = await Promise.all(deliveries);
  assert(packages.length > 0, "actual WASM response captured");
  checks++;
  for (const pkg of packages) eq(pkg, expectedPackage, "served package matches final runtime");
  if (out)
    writeFileSync(
      resolve(out, "results.json"),
      JSON.stringify(
        {
          checks,
          fixtureSha256: hash(Buffer.from(raw)),
          expectedPackage,
          packages,
          rows,
          errors,
        },
        null,
        2,
      ),
    );
  console.log(
    `home-resident-phases: ${checks} PASS; controlled real Core deaths/recovery and actual prepared/away transition; no fake phase injection`,
  );
} finally {
  await browser.close();
}
