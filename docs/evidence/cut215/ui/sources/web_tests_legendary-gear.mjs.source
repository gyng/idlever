// Real earned fixture paths only. The input manifest is written after core fixture freeze.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const url = process.env.IDLEVER_TEST_URL;
if (!url) throw Error("fresh no-HMR server required");
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const manifestPath = resolve(
  repoRoot,
  process.env.IDLEVER_LEGENDARY_INPUTS ?? "docs/evidence/cut215/ui-inputs.json",
);
const inputs = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.deepEqual(
  inputs.map((entry) => entry.seed),
  [1, 13],
);
const out = process.env.IDLEVER_LEGENDARY_SHOTS
  ? resolve(repoRoot, process.env.IDLEVER_LEGENDARY_SHOTS)
  : undefined;
if (out) mkdirSync(out, { recursive: true });
const hashes = {};
const fixture = (path) => {
  const bytes = readFileSync(resolve(repoRoot, path));
  hashes[path] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  return (path.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString();
};
const browser = await launchBrowser();
const records = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const deliveries = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      deliveries.push(
        r.body().then((bytes) => ({
          url: r.url(),
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })),
      );
  });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
  });
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  const state = () => page.evaluate(() => window.__idlever.lineage);
  const load = async (path) => {
    const payload = typeof path === "object" ? path : { raw: fixture(path) };
    await page.evaluate(async (payload) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      if (payload.newSeed !== undefined) await a.engine.newLineage(payload.newSeed);
      else await a.engine.load(payload.raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, payload);
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
  };
  const settle = () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      const wrap = document.querySelector(".sheet-wrap:not(.under)");
      if (wrap)
        await Promise.all(
          wrap
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  const open = async (which) => {
    const before = await save();
    await page.evaluate(async (which) => {
      const a = window.__idlever;
      if (which === "forge") (await import("/src/ui/forge.ts")).openForge(a);
      else (await import("/src/ui/town.ts")).openHero(a, null, "loadouts");
    }, which);
    await settle();
    assert.equal(await save(), before, `${which} opening is read-only`);
    checks++;
  };
  const active = () => page.locator(".sheet-wrap:not(.under)");
  async function refuse(config) {
    const result = await page.evaluate(async (config) => {
      const a = window.__idlever,
        before = await a.engine.save();
      let error = "";
      try {
        await a.engine.setStartingKit(JSON.stringify(config));
      } catch (e) {
        error = String(e);
      }
      return { error, unchanged: before === (await a.engine.save()) };
    }, config);
    assert.ok(result.error);
    assert.equal(result.unchanged, true);
    checks += 2;
  }
  for (const entry of inputs) {
    await load(entry.before);
    const first = await page.evaluate(async (steps) => {
      const a = window.__idlever,
        before = (await a.engine.lineage()).legendaries ?? [];
      const result = await a.engine.step(steps);
      await a.refresh();
      return {
        before,
        finds: result.events
          .filter((event) => event.k === "discovery" && event.find.first)
          .map((event) => event.find),
        owned: a.lineage.legendaries,
      };
    }, entry.findSteps);
    assert.equal(first.finds.length, 1);
    assert.equal(first.finds[0].kind, entry.firstKind);
    assert.equal(first.owned.length, first.before.length + 1);
    assert.ok(first.owned.some((row) => row.kind === entry.firstKind));
    checks += 4;
    records.push({ seed: entry.seed, actualSourceKill: first });
    await load(entry.fresh);
    await open("forge");
    assert.equal(await active().locator("[data-legendary-kind]").count(), 0);
    checks++;
    await load(entry.ownedHome);
    await open("forge");
    let l = await state();
    assert.ok(l.legendaries.length > 0);
    assert.notEqual(l.persistent_hero.state, "away");
    checks += 2;
    const row = l.legendaries.find((r) => r.available && r.compatible);
    assert.ok(row, "earned owned compatible shape required");
    checks++;
    const card = active().locator(`[data-legendary-kind="${row.kind}"]`);
    assert.match(
      await card.innerText(),
      new RegExp(row.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.ok((await card.innerText()).includes(row.effect));
    assert.ok((await card.innerText()).includes(row.tradeoff));
    checks += 3;
    const beforeLink = await save();
    await card.locator("button").click();
    await settle();
    const choice = active().locator(`[data-kit-choice="${row.kind}"]`);
    await choice.waitFor();
    assert.equal(await save(), beforeLink, "Forge link never equips or spends");
    assert.equal(await choice.isEnabled(), true);
    checks += 2;
    const kits = l.starting_kits;
    const slot = kits.weapons.some((r) => r.kind === row.kind) ? "weapon" : "armour";
    const old = l.starting_kits.current;
    // Real unbegun preparation pays any normal toll once before free refit checks.
    await page.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.send();
      await a.refresh();
    });
    l = await state();
    const gold = l.gold;
    const prepared = JSON.parse(await save());
    assert.equal(prepared.run.turn, 0);
    checks++;
    await choice.click();
    await page.waitForFunction(
      ({ slot, kind }) => window.__idlever.lineage.starting_kits.current?.[slot] === kind,
      { slot, kind: row.kind },
    );
    l = await state();
    const refitted = JSON.parse(await save());
    assert.equal(refitted.run.id, prepared.run.id, "refit does not spawn a second expedition");
    for (const field of ["rng", "toll", "passage", "pets"])
      assert.deepEqual(refitted.run[field], prepared.run[field], `refit retains actual ${field}`);
    assert.deepEqual(refitted.lineage.rng, prepared.lineage.rng);
    for (const field of ["pos", "hp", "max_hp", "energy", "class"])
      assert.deepEqual(
        refitted.run.hero[field],
        prepared.run.hero[field],
        `prepared actor retains ${field}`,
      );
    checks += 11;
    assert.equal(l.gold, gold);
    assert.equal(
      await active().locator(`[data-kit-choice="${row.kind}"]`).getAttribute("aria-pressed"),
      "true",
    );
    checks += 2;
    await active().locator('[aria-label="Kit name"]').fill(`Legend seed ${entry.seed}`);
    await active().locator(".kit-save button").click();
    await page.waitForFunction(
      (name) => window.__idlever.lineage.starting_kits.saved.some((k) => k.name === name),
      `Legend seed ${entry.seed}`,
    );
    const saved = (await state()).starting_kits.saved.find(
      (k) => k.name === `Legend seed ${entry.seed}`,
    );
    assert.equal(saved.config[slot], row.kind);
    assert.equal((await state()).gold, gold);
    checks += 2;
    await active().locator('[data-kit-reset="1"]').click();
    await page.waitForFunction(() => window.__idlever.lineage.starting_kits.current === null);
    assert.equal((await state()).gold, gold, "default shape switch is free independently");
    checks++;
    await active()
      .locator(`[data-saved-kit="${saved.id}"] button`)
      .filter({ hasText: /^Use$/ })
      .click();
    await page.waitForFunction(
      (id) => window.__idlever.lineage.starting_kits.selected === id,
      saved.id,
    );
    assert.equal((await state()).starting_kits.current[slot], row.kind);
    assert.equal((await state()).gold, gold);
    checks += 2;
    await page.evaluate(async () => {
      const a = window.__idlever,
        raw = await a.engine.save();
      await a.engine.load(raw);
      await a.refresh();
    });
    assert.equal((await state()).starting_kits.current[slot], row.kind);
    assert.equal((await state()).gold, gold);
    checks += 2;
    await refuse({ ...old, weapon: "not-an-owned-shape", armour: null, supplies: [] });
    // The real named ID is unavailable in a fresh town, even through a forged config.
    await load(entry.fresh);
    await refuse({
      weapon: slot === "weapon" ? row.kind : null,
      armour: slot === "armour" ? row.kind : null,
      supplies: [],
    });
    // Return to the untouched earned input before the ownership and geometry boundaries.
    await load(entry.ownedHome);
    await open("loadouts");
    const ownership = await page.evaluate(async () => {
      const a = window.__idlever,
        original = a.lineage.selected_bloodline,
        owned = a.lineage.legendaries.map((r) => r.kind),
        gold = a.lineage.gold,
        price = a.lineage.bloodline_price,
        old = document.querySelector(".legendary-choice [data-kit-choice]");
      await a.engine.addBloodline();
      await a.refresh();
      const second = a.lineage.hero_slots.find((s) => s.id !== original).id;
      await a.engine.selectBloodline(second);
      await a.refresh();
      const before = await a.engine.save();
      const actual = a.engine.setStartingKit;
      let attempts = 0;
      a.engine.setStartingKit = (...args) => {
        attempts++;
        return actual.apply(a.engine, args);
      };
      old.click();
      await new Promise((r) => setTimeout(r, 30));
      a.engine.setStartingKit = actual;
      return {
        owned,
        current: a.lineage.legendaries.map((r) => r.kind),
        unchanged: before === (await a.engine.save()),
        attempts,
        gold,
        price,
        after: a.lineage.gold,
      };
    });
    assert.deepEqual(ownership.current, ownership.owned);
    assert.equal(ownership.unchanged, true);
    assert.equal(ownership.attempts, 0, "old resident's action never reaches the actual engine");
    assert.equal(ownership.after, ownership.gold - ownership.price);
    checks += 4;
    records.push({ seed: entry.seed, row, saved, ownership });
    const stages = [{ name: "owned", path: entry.ownedHome }];
    if (entry.seed === 1)
      stages.push({ name: "fresh", path: entry.fresh }, { name: "away", path: entry.away });
    if (entry.seed === 1 && entry.duplicateHome)
      stages.push({ name: "duplicate", path: entry.duplicateHome });
    for (const stage of stages)
      for (const width of [320, 400, 1440])
        for (const scale of [1, 2])
          for (const view of ["forge", "loadouts"]) {
            await page.setViewportSize({ width, height: 900 });
            await load(stage.path);
            await page.evaluate((scale) => {
              document.documentElement.style.fontSize = `${16 * scale}px`;
            }, scale);
            await open(view);
            await active()
              .locator("details")
              .evaluateAll((nodes) =>
                nodes.forEach((n) => {
                  n.open = true;
                }),
              );
            await settle();
            if (stage.name === "fresh") {
              assert.equal(
                await active().locator("[data-legendary-kind],[data-legendary-choice]").count(),
                0,
              );
              checks++;
            }
            if (stage.name === "away" && view === "loadouts") {
              assert.equal(await active().locator('[data-kit-reset="1"]').isDisabled(), true);
              checks++;
            }
            const geometry = await active().evaluate((el) => {
              const r = el.querySelector(".game-window");
              return {
                overflow: r.scrollWidth - r.clientWidth,
                bad: [...r.querySelectorAll("button,input,summary")]
                  .filter((n) => n.getClientRects().length)
                  .map((n) => ({
                    text: n.textContent,
                    width: n.getBoundingClientRect().width,
                    height: n.getBoundingClientRect().height,
                  }))
                  .filter((b) => b.width < 43.9 || b.height < 43.9),
                claim: [...r.querySelectorAll("button")].some((n) =>
                  /^(claim|keep|reroll)$/i.test(n.textContent.trim()),
                ),
              };
            });
            assert.ok(geometry.overflow <= 1, JSON.stringify({ width, scale, view, geometry }));
            assert.deepEqual(geometry.bad, [], JSON.stringify({ width, scale, view, geometry }));
            assert.equal(geometry.claim, false);
            checks += 3;
            records.push({ seed: entry.seed, stage: stage.name, width, scale, view, geometry });
            if (out && entry.seed === 1 && width === 400 && scale === 1)
              await page.screenshot({ path: `${out}/${stage.name}-${view}-400.png` });
          }
    await load(entry.away);
    await open("loadouts");
    assert.equal(await active().locator('[data-kit-reset="1"]').isDisabled(), true);
    checks++;
    records.push({ seed: entry.seed, away: true, owned: (await state()).legendaries });
  }
  assert.deepEqual(errors, []);
  checks++;
  const deliveredWasm = await Promise.all(deliveries);
  const source = {};
  for (const path of [
    "src/ui/forge.ts",
    "src/ui/starting-kits.ts",
    "src/ui/bloodline-loadouts.ts",
    "src/ui/legendary-gear.ts",
    "src/legendary-gear.css",
    "src/engine/pkg/idlever_wasm_bg.wasm",
  ]) {
    const r = await page.request.get(`${url}${path}`),
      b = await r.body();
    source[path] = { bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") };
    if (out && !path.endsWith(".wasm"))
      writeFileSync(`${out}/${path.replaceAll("/", "_")}.served`, b);
  }
  if (out)
    writeFileSync(
      `${out}/results.json`,
      JSON.stringify({ checks, records, hashes, source, deliveredWasm }, null, 2),
    );
  console.log(JSON.stringify({ checks, result: "PASS", seeds: [1, 13] }));
} catch (e) {
  if (out)
    writeFileSync(
      `${out}/failure.json`,
      JSON.stringify({ error: String(e), checks, records, hashes }, null, 2),
    );
  throw e;
} finally {
  await browser.close();
}
