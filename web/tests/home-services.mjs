import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const fixtures = new URL("../../docs/evidence/cut211/fixtures-final/", import.meta.url);
const input = (name) =>
  gunzipSync(readFileSync(new URL(`${name}.game.json.gz`, fixtures))).toString();
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  }).trim();
const b = await launchBrowser();
let checks = 0;
const eq = (a, b) => {
    assert.deepEqual(a, b);
    checks++;
  },
  ok = (v) => {
    assert.ok(v);
    checks++;
  };
const errors = [],
  out = [];
try {
  const p = await b.newPage({ viewport: { width: 400, height: 900 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=214`);
  await p.waitForFunction(() => window.__idlever?.booted);
  const fresh = await p.evaluate(async () => {
    const a = window.__idlever;
    a.runnerOn = false;
    const { townState } = await import("/src/render/town.ts");
    return {
      services: townState(a.lineage).services,
      visible: window.__town.targets().filter((x) => ["guild", "pool", "device"].includes(x.id)),
    };
  });
  eq(fresh.services, []);
  eq(fresh.visible, []);
  const firstDelve = await p.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.buildTown("house");
    await a.engine.send();
    let ended = false;
    for (let i = 0; i < 12; i++) {
      const step = await a.engine.step(1000);
      if (step.run_over) {
        ended = true;
        break;
      }
    }
    await a.refresh();
    a.runnerOn = false;
    const { townState } = await import("/src/render/town.ts");
    return { ended, life: a.lineage.persistent_hero, state: townState(a.lineage) };
  });
  ok(firstDelve.ended);
  ok(firstDelve.life.pool.available);
  ok(firstDelve.state.services.includes("pool"));

  for (const name of [
    "earned-seed-1-budget",
    "controlled-reincarnating-600",
    "controlled-recovering-590",
    "controlled-ready-0",
    "controlled-away",
  ]) {
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      if (
        !(await a.importSave(
          JSON.stringify({ v: 2, engine: raw, loadout: [], last_seen: Date.now(), runs: 0 }),
        ))
      )
        throw Error("Fixture refused");
      a.runnerOn = false;
    }, input(name));
    await p.waitForTimeout(80);
    const result = await p.evaluate(async () => {
      const a = window.__idlever,
        { townState, SERVICE_PLOTS } = await import("/src/render/town.ts");
      const s = townState(a.lineage),
        life = a.lineage.persistent_hero;
      const actual = Object.keys(SERVICE_PLOTS).filter((k) => life[k].available && s.home);
      const drawn = window.__town.stats();
      const before = await a.engine.save();
      for (const info of document.querySelectorAll(".town-building-info")) {
        if (["guild", "pool", "device"].includes(info.dataset.buildingInfo)) info.click();
      }
      const after = await a.engine.save();
      return { engine: a.kind, actual, s, drawn, sameSave: before === after, life: life.state };
    });
    eq(result.engine, "wasm");
    eq(result.s.services, result.actual);
    eq(result.drawn.services, result.actual);
    ok(result.sameSave);
    ok(result.s.residents.every((h) => h.phase !== "away"));
    out.push({ name, ...result });
  }
  const two = await p.evaluate(async (raw) => {
    const a = window.__idlever;
    await a.importSave(
      JSON.stringify({ v: 2, engine: raw, loadout: [], last_seen: Date.now(), runs: 0 }),
    );
    a.runnerOn = false;
    const before = a.lineage;
    await a.engine.addBloodline();
    await a.refresh();
    const slots = a.lineage.hero_slots;
    const source = a.lineage;
    const other = slots.find((s) => s.id !== source.selected_bloodline);
    await a.engine.selectBloodline(other.id);
    await a.refresh();
    return {
      beforeGold: before.gold,
      afterGold: a.lineage.gold,
      price: before.bloodline_price,
      slots: a.lineage.hero_slots,
      first: source.persistent_hero,
      second: a.lineage.persistent_hero,
    };
  }, input("earned-seed-1-budget"));
  eq(two.afterGold, two.beforeGold - two.price);
  eq(two.slots.length, 2);
  ok(two.slots.some((h) => h.rest_s > 0));
  eq(two.second.pool.available, true);
  eq(two.second.device.available, true);
  eq(two.second.state, "ready");
  eq(two.second.need, "none");
  eq(errors, []);
  console.log(
    `home-services: ${checks} checks PASS (real WASM; earned + labelled recovery fixtures)`,
  );
} finally {
  await b.close();
}
