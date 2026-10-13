// Actual earned hero rename; historical presenter boundaries deliberately supplied as opts.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../tools/browser.mjs";
const url = process.env.IDLEVER_TEST_URL,
  out = process.env.IDLEVER_HERO_FRAME_SHOTS;
if (!url) throw Error("fresh no-HMR server required");
if (out) mkdirSync(out, { recursive: true });
const raw = gunzipSync(
  readFileSync(
    new URL(
      "../../docs/evidence/cut211/fixtures/earned-seed-1-balanced.game.json.gz",
      import.meta.url,
    ),
  ),
).toString();
const browser = await launchBrowser();
const records = [];
try {
  const page = await browser.newPage();
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
    await a.engine.load(raw);
    await a.engine.renameHero("Mara of the Lantern Vale");
    await a.refresh();
    a.go({ kind: "camp" });
  }, raw);
  for (const width of [320, 400, 1440])
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(async (scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
        await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, scale);
      const proof = await page.evaluate(() => {
        const header = document.querySelector(".topbar"),
          name = header.querySelector(".hero-name"),
          r = name.getBoundingClientRect(),
          hr = header.getBoundingClientRect();
        return {
          name: name.textContent,
          title: name.title,
          fontSize: parseFloat(getComputedStyle(name).fontSize),
          overflow: header.scrollWidth - header.clientWidth,
          bounds: { left: r.left, right: r.right, bottom: r.bottom, headerBottom: hr.bottom },
          statOverlap: [...header.querySelectorAll(".stat,.gear")].some((n) => {
            const b = n.getBoundingClientRect();
            return (
              Math.min(r.right, b.right) > Math.max(r.left, b.left) + 1 &&
              Math.min(r.bottom, b.bottom) > Math.max(r.top, b.top) + 1
            );
          }),
        };
      });
      assert.equal(proof.name, "Mara of the Lantern Vale");
      assert.match(proof.title, /^Mara of the Lantern Vale · Life \d+$/);
      assert.equal(proof.fontSize, 15 * scale, "actual name scales with200% root text");
      assert.ok(proof.overflow <= 1, JSON.stringify({ width, scale, proof }));
      assert.ok(
        proof.bounds.left >= 0 &&
          proof.bounds.right <= width + 1 &&
          proof.bounds.bottom <= proof.bounds.headerBottom + 1,
        JSON.stringify({ width, scale, proof }),
      );
      assert.equal(proof.statOverlap, false, JSON.stringify({ width, scale, proof }));
      records.push({ width, scale, proof });
      if (out) await page.screenshot({ path: `${out}/current-name-${width}-${scale}.png` });
    }
  const historical = await page.evaluate(async () => {
    const a = window.__idlever,
      { renderBar } = await import("/src/ui/frame.ts");
    const before = await a.engine.save();
    const same = renderBar(a, { heir: a.lineage.heir }),
      past = renderBar(a, { heir: a.lineage.heir - 1 }),
      captured = renderBar(a, { heir: a.lineage.heir, heroName: "Captured Mara" });
    const result = {
      sameName: same.el.querySelector(".hero-name")?.textContent ?? null,
      pastName: past.el.querySelector(".hero-name")?.textContent ?? null,
      sameOrdinal: same.el.querySelector(".heir-ordinal").textContent,
      pastOrdinal: past.el.querySelector(".heir-ordinal").textContent,
      unchanged: before === (await a.engine.save()),
    };
    await a.engine.renameHero("A later name");
    await a.refresh();
    captured.paint();
    result.capturedName = captured.el.querySelector(".hero-name").textContent;
    result.capturedCurrent = captured.el.querySelector("[data-current-hero]") !== null;
    result.actualRenamed = a.lineage.persistent_hero.name;
    same.dispose();
    past.dispose();
    captured.dispose();
    return result;
  });
  assert.equal(historical.sameName, null);
  assert.equal(historical.pastName, null);
  assert.match(historical.sameOrdinal, /heir/);
  assert.match(historical.pastOrdinal, /heir/);
  assert.equal(historical.unchanged, true);
  assert.equal(historical.capturedName, "Captured Mara");
  assert.equal(historical.capturedCurrent, false);
  assert.equal(historical.actualRenamed, "A later name");
  const sources = {};
  for (const path of [
    "src/ui/frame.ts",
    "src/hero-life.css",
    "src/engine/pkg/idlever_wasm_bg.wasm",
  ]) {
    const r = await page.request.get(`${url}${path}`),
      b = await r.body();
    sources[path] = { sha256: createHash("sha256").update(b).digest("hex"), bytes: b.length };
    if (out && !path.endsWith(".wasm"))
      writeFileSync(`${out}/${path.replaceAll("/", "_")}.served`, b);
  }
  if (out)
    writeFileSync(`${out}/results.json`, JSON.stringify({ records, historical, sources }, null, 2));
  console.log("44 actual current-name geometry/historical-captured identity checks PASS");
} catch (e) {
  if (out)
    writeFileSync(`${out}/failure.json`, JSON.stringify({ error: String(e), records }, null, 2));
  throw e;
} finally {
  await browser.close();
}
