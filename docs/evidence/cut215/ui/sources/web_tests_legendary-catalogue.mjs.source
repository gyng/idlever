// Controlled natural boss placement/damage and Gunner qualification; actual Core drops/return/wire.
// This certifies UI semantics, not earned class or all-three ownership progression.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url = process.env.IDLEVER_TEST_URL;
if (!url) throw Error("fresh no-HMR server required");
const out = process.env.IDLEVER_LEGENDARY_CATALOGUE_SHOTS
  ? resolve(root, process.env.IDLEVER_LEGENDARY_CATALOGUE_SHOTS)
  : null;
if (out) mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const records = [],
  inputs = {};
let checks = 0;
try {
  const page = await browser.newPage();
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
  });
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  async function load(cls) {
    const path = `docs/evidence/cut215/ui-inputs-final/controlled/${cls}-all3-home.game.json.gz`,
      bytes = readFileSync(resolve(root, path));
    inputs[path] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, gunzipSync(bytes).toString());
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
  }
  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const w = document.querySelector(".sheet-wrap:not(.under)");
      if (w)
        await Promise.all(
          w
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  }
  const active = () => page.locator(".sheet-wrap:not(.under)");
  async function open(view) {
    const before = await save();
    await page.evaluate(async (view) => {
      const a = window.__idlever;
      if (view === "forge") (await import("/src/ui/forge.ts")).openForge(a);
      else (await import("/src/ui/town.ts")).openHero(a, null, "loadouts");
    }, view);
    await settle();
    assert.equal(await save(), before);
    checks++;
  }
  for (const cls of ["fighter", "gunner"]) {
    await load(cls);
    await open("forge");
    const rows = await page.evaluate(() => window.__idlever.lineage.legendaries);
    assert.equal(rows.length, 3);
    assert.equal(new Set(rows.map((r) => r.kind)).size, 3);
    checks += 2;
    for (const row of rows) {
      const text = await active().locator(`[data-legendary-kind="${row.kind}"]`).innerText();
      assert.ok(text.includes(row.effect));
      assert.ok(text.includes(row.tradeoff));
      checks += 2;
    }
    const beforeLink = await save();
    await active().locator('[data-legendary-link="crownsplitter"]').click();
    await settle();
    assert.equal(await save(), beforeLink);
    checks++;
    const crown = active().locator('[data-kit-choice="crownsplitter"]');
    assert.equal(await crown.isDisabled(), cls === "gunner");
    checks++;
    if (cls === "gunner") {
      const refusal = await page.evaluate(async () => {
        const a = window.__idlever,
          before = await a.engine.save();
        let error = "";
        try {
          await a.engine.setStartingKit(
            JSON.stringify({ weapon: "crownsplitter", armour: null, supplies: [] }),
          );
        } catch (e) {
          error = String(e);
        }
        return {
          error,
          unchanged: before === (await a.engine.save()),
          focus: document.activeElement.className,
          blocked: document.querySelector('[data-legendary-choice="crownsplitter"]').textContent,
        };
      });
      assert.ok(refusal.error);
      assert.equal(refusal.unchanged, true);
      assert.match(refusal.blocked, /Gunner uses firearms/);
      assert.match(refusal.focus, /starting-gear-row/);
      checks += 4;
    }
    for (const row of rows.filter((r) => r.compatible && r.available)) {
      const slot = await page.evaluate(
        (kind) =>
          window.__idlever.lineage.starting_kits.weapons.some((r) => r.kind === kind)
            ? "weapon"
            : "armour",
        row.kind,
      );
      await active()
        .locator(`[data-starting-gear="${slot}"]`)
        .evaluate((n) => {
          n.open = true;
        });
      const gold = await page.evaluate(() => window.__idlever.lineage.gold);
      await active().locator(`[data-kit-choice="${row.kind}"]`).click();
      await page.waitForFunction(
        ({ kind, slot }) => window.__idlever.lineage.starting_kits.current?.[slot] === kind,
        { kind: row.kind, slot },
      );
      assert.equal(await page.evaluate(() => window.__idlever.lineage.gold), gold);
      checks++;
    }
    for (const width of [320, 400, 1440])
      for (const scale of [1, 2])
        for (const view of ["forge", "loadouts"]) {
          await page.setViewportSize({ width, height: 900 });
          await load(cls);
          await page.evaluate((s) => {
            document.documentElement.style.fontSize = `${16 * s}px`;
          }, scale);
          await open(view);
          await active()
            .locator("details")
            .evaluateAll((ns) =>
              ns.forEach((n) => {
                n.open = true;
              }),
            );
          await settle();
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
            };
          });
          assert.ok(geometry.overflow <= 1, JSON.stringify({ cls, width, scale, view, geometry }));
          assert.deepEqual(geometry.bad, [], JSON.stringify({ cls, width, scale, view, geometry }));
          checks += 2;
          records.push({ controlled: true, earned: false, cls, width, scale, view, geometry });
          if (out && width === 400 && scale === 1)
            await page.screenshot({ path: `${out}/controlled-${cls}-${view}-400.png` });
        }
  }
  const source = {};
  for (const path of [
    "src/ui/forge.ts",
    "src/ui/starting-kits.ts",
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
      JSON.stringify({ controlled: true, earned: false, checks, inputs, records, source }, null, 2),
    );
  console.log(
    JSON.stringify({ checks, controlled: true, earned: false, layouts: 24, result: "PASS" }),
  );
} catch (e) {
  if (out)
    writeFileSync(
      `${out}/failure.json`,
      JSON.stringify({ error: String(e), checks, records, inputs }, null, 2),
    );
  throw e;
} finally {
  await browser.close();
}
