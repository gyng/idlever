// Genuine paid-history fixtures; no replacement rewards or client game formulas.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const inputs = process.env.IDLEVER_WISH_INPUTS ?? "docs/evidence/cut222/wish-inputs.json";
const manifest = JSON.parse(readFileSync(resolve(root, inputs)));
const out = process.env.IDLEVER_WISH_OUT;
if (out) mkdirSync(resolve(root, out), { recursive: true });
const digest = (b) => ({ bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") });
const pkg = resolve(root, "web/src/engine/pkg");
assert.ok(lstatSync(pkg).isDirectory());
const local = digest(readFileSync(resolve(pkg, "idlever_wasm_bg.wasm")));
const expected = process.env.IDLEVER_WISH_INPUTS ? manifest.wasm : local;
const nativeChecks = JSON.parse(
  readFileSync(resolve(root, "docs/evidence/cut222/core/retirement-checks-final.json")),
);
const records = [],
  deliveries = [],
  readers = [],
  errors = [];
let checks = 0,
  layouts = 0,
  failure,
  result;
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 400, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.url().includes("idlever_wasm_bg.wasm"))
    readers.push(r.body().then((b) => deliveries.push(digest(b))));
});
async function drain() {
  await page.waitForLoadState("networkidle", { timeout: 15000 });
  let n;
  do {
    n = readers.length;
    await Promise.all(readers);
    await page.waitForTimeout(50);
  } while (n !== readers.length);
}
const save = () => page.evaluate(() => window.__idlever.engine.save());
const state = () => page.evaluate(() => window.__idlever.engine.lineage());
async function adopt(raw) {
  await page.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    a.go({ kind: "camp" });
    a.lineage = await a.engine.load(raw);
    a.resetGoldFeedback();
    await a.refresh();
    a.go({ kind: "camp" });
  }, raw);
  await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
}
async function settle() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}
async function noWish() {
  const s = await state();
  assert.equal(Object.hasOwn(s.feats ?? {}, "wish"), false);
  assert.equal(await page.evaluate(() => typeof window.__idlever.engine.grantWish), "undefined");
  assert.equal(await page.locator(".wish-chip,[data-wish]").count(), 0);
  checks += 3;
}
try {
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  checks++;
  assert.equal(
    await page.evaluate(async () => {
      const m = await import("/src/engine/pkg/idlever_wasm.js");
      await m.default();
      return typeof m.Game.prototype.grantWish;
    }),
    "undefined",
  );
  checks++;
  for (const entry of manifest.entries) {
    const bytes = readFileSync(resolve(root, entry.home)),
      raw = gunzipSync(bytes).toString();
    assert.equal(digest(bytes).sha256, entry.homeSha256);
    assert.equal(digest(Buffer.from(raw)).sha256, entry.rawSha256);
    checks += 2;
    await adopt(raw);
    const canonical = await save(),
      original = JSON.parse(raw),
      loaded = JSON.parse(canonical),
      s = await state();
    assert.equal(s.gold, entry.gold);
    assert.deepEqual(s.gold_ledger, entry.ledger);
    checks += 2;
    assert.deepEqual(loaded.lineage.hero_legacy, original.lineage.hero_legacy);
    assert.deepEqual(loaded.lineage.feats, original.lineage.feats);
    assert.deepEqual(loaded.lineage.rng, original.lineage.rng);
    checks += 3;
    for (let i = 0; i < 20; i++) await state();
    assert.equal(await save(), canonical);
    checks++;
    await noWish();
    const remaining = await page.evaluate(() => {
      const a = window.__idlever,
        f = a.lineage.feats;
      return {
        home: !a.lineage.live && !a.lineage.ended && a.lineage.town?.home !== false,
        seek: (f?.tokens.length ?? 0) > 0,
        trial: f?.trials.some((t) => t.open && !t.cleared) ?? false,
      };
    });
    assert.equal(
      await page.locator(".camp .seek-chip").count(),
      Number(remaining.home && remaining.seek),
    );
    assert.equal(
      await page.locator(".camp .trial-card").count(),
      Number(remaining.home && remaining.trial),
    );
    checks += 2;
    for (const route of ["journal", "hero"]) {
      await page.evaluate(async (route) => {
        const a = window.__idlever;
        if (route === "journal") (await import("/src/ui/quest.ts")).openQuest(a);
        else (await import("/src/ui/town.ts")).openHero(a);
      }, route);
      await settle();
      assert.equal(await save(), canonical);
      checks++;
      await page.evaluate(async () => (await import("/src/ui/sheet.ts")).closeAllSheets());
    }
    if (entry.id === "waiting-song")
      for (const width of [320, 400, 1440])
        for (const scale of [1, 2]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${16 * scale}px`;
          }, scale);
          await settle();
          await noWish();
          const geometry = await page.locator(".camp").evaluate((el) => ({
            width: el.clientWidth,
            scrollWidth: el.scrollWidth,
            emptyWishPlaceholder: [...el.querySelectorAll("[data-feats]")].some(
              (n) => !n.hidden && n.dataset.feats === "",
            ),
          }));
          assert.ok(geometry.scrollWidth <= geometry.width + 1);
          assert.equal(geometry.emptyWishPlaceholder, false);
          assert.equal(await save(), canonical);
          checks += 3;
          layouts++;
          const control = page.locator(".camp button:visible:enabled").first();
          await control.focus();
          assert.equal(await control.evaluate((node) => document.activeElement === node), true);
          checks++;
          records.push({ entry: entry.id, layout: { width, scale, ...geometry }, saveEqual: true });
        }
    await page.evaluate(() => {
      document.documentElement.style.removeProperty("font-size");
    });
    const modes = {};
    let wholeReport;
    for (const mode of ["whole", "sliced", "reloaded"]) {
      await adopt(raw);
      const run = await page.evaluate(async (mode) => {
        const e = window.__idlever.engine,
          reports = [];
        const chunks = mode === "whole" ? [86400] : [28800, 28800, 28800];
        for (const [index, seconds] of chunks.entries()) {
          const last = index === chunks.length - 1;
          reports.push(await e.runOfflineSlice(seconds, last));
          if (mode === "reloaded" && !last) await e.load(await e.save());
        }
        return { save: await e.save(), lineage: await e.lineage(), reports };
      }, mode);
      if (mode === "whole") wholeReport = run.reports.at(-1);
      modes[mode] = {
        save: digest(Buffer.from(run.save)),
        wishNews: run.reports.flatMap((r) => r.feats ?? []).filter((f) => f.k === "wish"),
        gold: run.lineage.gold,
      };
      assert.equal(Object.hasOwn(run.lineage.feats ?? {}, "wish"), false);
      const finished = JSON.parse(run.save);
      assert.equal(finished.lineage.feats.wishes ?? 0, entry.historicalWishes);
      assert.equal(finished.lineage.feats.wish_at, entry.wishAt);
      checks += 3;
      assert.deepEqual(modes[mode].wishNews, entry.news);
      checks++;
      if (out) writeFileSync(resolve(root, out, `${entry.id}-${mode}.save.json`), run.save);
    }
    assert.deepEqual(modes.whole.save, modes.sliced.save);
    assert.deepEqual(modes.whole.save, modes.reloaded.save);
    checks += 2;
    const native = nativeChecks.entries.find((e) => e.id === entry.id);
    assert.ok(native, "matching actual native24h record required");
    const nativeBytes = readFileSync(resolve(root, native.after24h)),
      nativeRaw = gunzipSync(nativeBytes);
    assert.equal(digest(nativeBytes).sha256, native.after24hGzSha256);
    assert.equal(digest(nativeRaw).sha256, native.after24hRawSha256);
    assert.deepEqual(modes.whole.save, digest(nativeRaw), "WASM/native settled full-save equality");
    checks += 4;
    const histories = { report: wholeReport, gold: modes.whole.gold };
    assert.equal(histories.gold, entry.gold);
    checks++;
    for (const news of entry.news)
      assert.ok((histories.report.feats ?? []).some((f) => isDeepStrictEqual(f, news)));
    checks += entry.news.length;
    const presentation = await page.evaluate(async (report) => {
      const a = window.__idlever,
        before = await a.engine.save(),
        { featLines } = await import("/src/ui/feats.ts"),
        { cries } = await import("/src/ui/crier.ts");
      const fold = featLines(report, a.lineage),
        host = document.createElement("section");
      for (const el of [fold.progress, fold.pet, ...Object.values(fold.rest)])
        if (el) host.append(el);
      document.body.append(host);
      const lines = [...host.querySelectorAll('[data-k="wish"]')].map((n) => n.textContent),
        historical = cries(report, a.lineage).filter((c) => c.k === "wish");
      host.remove();
      return { lines, historical, before, after: await a.engine.save() };
    }, histories.report);
    assert.equal(presentation.after, presentation.before);
    checks++;
    for (const news of entry.news) {
      const meaningful = `Legacy purchase · ${news.text.replace(/^granted /, "")}`;
      assert.ok(presentation.lines.includes(meaningful));
      assert.ok(
        presentation.historical.some((c) => c.short === "Legacy purchase" && c.long === meaningful),
      );
      checks += 2;
    }
    records.push({
      entry: entry.id,
      input: digest(bytes),
      repeatedReads: 20,
      histories: { sourceNews: entry.news, presentation: presentation.lines },
      modes,
      native: {
        after24h: native.after24h,
        exactSettledSave: true,
        sha256: native.after24hRawSha256,
      },
    });
  }
  await drain();
  assert.ok(deliveries.length);
  for (const d of deliveries) assert.deepEqual(d, expected);
  assert.deepEqual(errors, []);
  result = {
    result: "PASS",
    checks,
    layouts,
    cases: manifest.entries.length,
    expected,
    fixtureHistoricalPackage: manifest.historical_wasm ?? manifest.wasm,
    records,
    deliveries,
    errors,
  };
} catch (error) {
  failure = error;
  result = {
    result: "FAIL",
    error: String(error.stack ?? error),
    checks,
    layouts,
    records,
    deliveries,
    errors,
  };
} finally {
  try {
    await drain();
  } catch (error) {
    failure ??= error;
  }
  try {
    await browser.close();
  } catch (error) {
    failure ??= error;
  }
}
if (failure && result?.result === "PASS")
  result = { ...result, result: "FAIL", error: String(failure.stack ?? failure) };
if (out) writeFileSync(resolve(root, out, "results.json"), JSON.stringify(result, null, 2));
if (failure) throw failure;
console.log(JSON.stringify({ result: "PASS", checks, layouts, cases: manifest.entries.length }));
