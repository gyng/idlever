// Cut 228 (docs/CUT228_ANT_FARM.md): the Forge's present work and the fitted hero, from real Rust state only.
// Fixture: the Cut223 multihero session (earned Gold, three residents). Public actions only: five one-minute
// `advance` steps (heroes 1 and 2 leave, hero 3 rests at home), `selectBloodline(3)`, one `buyKit`.
// Checks: no work → idle smith, no sparks, no fitting; a real step → Rust `forge_work` {step, hero 3}, the smith
// strikes with sparks (Full), hero 3 is fitted, never a delving hero; details read `At Forge · <step>` and
// `Forging <step>`; reduced motion → still pose, zero sparks; viewing never changes the save.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const raw = gunzipSync(
  readFileSync(
    new URL(
      "../../docs/evidence/cut223/core/fixtures-final/multihero-absence.session.json.gz",
      import.meta.url,
    ),
  ),
).toString();
let checks = 0;
const ok = (v, m) => {
  assert.ok(v, m);
  checks++;
};
const browser = await launchBrowser();
const errors = [];
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?dev=1&fresh=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    const setup = await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      await a.engine.load(raw);
      await a.refresh();
      for (let i = 0; i < 5; i++) {
        await a.engine.advance(60_000);
        await a.refresh();
      }
      await a.engine.selectBloodline(3);
      await a.refresh();
      a.go({ kind: "camp" });
      return {
        forge: a.lineage.town?.forge_work ?? null,
        slots: a.lineage.hero_slots.map((h) => ({ id: h.id, life: h.life_state })),
      };
    }, raw);
    ok(setup.forge === null, "an owned Forge alone publishes no work");
    const away = setup.slots.filter((s) => s.life === "away").map((s) => s.id);
    ok(away.includes(1) && away.includes(2), "heroes 1 and 2 are delving");
    await page.waitForFunction(() => window.__town);
    await page.waitForTimeout(1500);
    let stats = await page.evaluate(() => window.__town.stats());
    ok(stats.forge === null, "idle: no forge work drawn");
    // (other sparks may still be in flight from nothing: the idle anvil emits none)
    await page.waitForTimeout(1200);
    stats = await page.evaluate(() => window.__town.stats());
    ok(stats.forge === null, "idle stays idle");
    const bought = await page.evaluate(async () => {
      const a = window.__idlever;
      const kit = (a.lineage.kit ?? [])
        .filter((k) => k.next && ["weapon", "armour", "pack"].includes(k.slot))
        .sort((x, y) => x.next.price - y.next.price)[0];
      const gold = a.lineage.gold;
      await a.engine.buyKit(kit.slot);
      await a.refresh();
      return {
        label: kit.next.label,
        price: kit.next.price,
        gold,
        after: a.lineage.gold,
        forge: a.lineage.town.forge_work,
      };
    });
    ok(
      bought.forge?.step === bought.label,
      `Rust forge_work names the real step (${bought.forge?.step})`,
    );
    ok(bought.forge.hero === 3 && bought.forge.left_s === 45, "for hero 3, 45 s");
    ok(bought.after === bought.gold - bought.price, "the step was paid");
    const save0 = await page.evaluate(() => window.__idlever.engine.save());
    await page.waitForTimeout(8000); // the walk from the bench to the anvil
    stats = await page.evaluate(() => window.__town.stats());
    ok(
      stats.forge?.step === bought.label && stats.forge.hero === 3,
      "the smith works the real step",
    );
    ok(stats.forge.still === reduced, "still pose exactly under reduced motion");
    if (reduced)
      ok(stats.forge.sparks === 0 && stats.forge.bursts === 0, "no sparks under reduced motion");
    else ok(stats.forge.bursts > 0, `sparks fly from real strokes (${stats.forge.bursts} bursts)`);
    ok(JSON.stringify(stats.forge.fitting) === "[3]", "hero 3, at home, is fitted");
    ok(!stats.forge.fitting.some((id) => away.includes(id)), "no delving hero is shown in town");
    const tips = await page.evaluate(async () => {
      const { forgeFitting } = await import("/src/ui/town.ts");
      const { buildingDetails } = await import("/src/ui/building-help.ts");
      const L = window.__idlever.lineage;
      return {
        hero: L.hero_slots.map((s) => [s.id, forgeFitting(L, s) ?? null]),
        forge: buildingDetails(L, "blacksmith")
          .map((n) => n.textContent)
          .join(" | "),
      };
    });
    ok(
      JSON.stringify(tips.hero) ===
        JSON.stringify([
          [1, null],
          [2, null],
          [3, bought.label],
        ]),
      `only hero 3's details give the reason (${JSON.stringify(tips.hero)})`,
    );
    ok(tips.forge.includes(`Forging ${bought.label}`), "the Forge's details read Forging <step>");
    const save1 = await page.evaluate(() => window.__idlever.engine.save());
    ok(save0 === save1, "watching the work never changes the save");
    await page.close();
  }
  ok(errors.length === 0, `no page errors (${errors.join("; ")})`);
  console.log(
    `home-forge-work: ${checks} checks PASS (real WASM, public actions, Full and reduced motion)`,
  );
} finally {
  await browser.close();
}
