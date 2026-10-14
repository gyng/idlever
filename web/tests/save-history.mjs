// Dev save history (docs/ITERATION_SPEED.md §0i): captures at a purchase and a manual snapshot, restore → the same choice
// reproduces the same next state exactly, branch keeps later entries, the ring is capped and survives a reload (IndexedDB),
// the Shift+T panel restores through its confirm, and the command line turns an entry into a native-loadable save.
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
import { blobOf } from "../../tools/save-history.mjs";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = new URL("../../", import.meta.url);
const shotsIndex = process.argv.indexOf("--shots"),
  shots = shotsIndex >= 0 ? process.argv[shotsIndex + 1] : process.env.IDLEVER_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const browser = await launchBrowser();
let checks = 0;
const ok = (cond, name) => {
  assert.ok(cond, name);
  checks++;
  console.log(`${name} PASS`);
};
const tmp = mkdtempSync(join(tmpdir(), "idlever-save-history-"));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.goto(`${url}?fresh=1&seed=11&runs=0&history=1`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => window.__idlever.history.clear());
  const first = await page.evaluate(async () => {
    const app = window.__idlever,
      h = app.history;
    if (app.kind !== "wasm") throw Error("actual shipping engine");
    // A fixture with gold through the real loader (as debug-export does), then the base snapshot.
    const fixture = JSON.parse(await app.engine.save());
    fixture.lineage.gold = 1000;
    await app.importSave(
      JSON.stringify({ ...JSON.parse(app.exportSave()), engine: JSON.stringify(fixture) }),
    );
    const base = await h.snapshot("base");
    // The choice: build the house (an automatic capture), then a half hour away.
    app.lineage = await app.engine.buildTown("house");
    await h.idle();
    await app.engine.runOfflineQuick(1800);
    const after = await app.engine.save();
    const list = await h.list();
    return { base, after, labels: list.map((e) => e.label), gold: list[1]?.gold };
  });
  ok(first.base && first.base.label === "base", "manual snapshot recorded");
  ok(
    first.labels[0] === "build house" && first.labels[1] === "base",
    "purchase captured automatically",
  );
  ok(first.gold === 1000, "entry labelled with gold");

  const replay = await page.evaluate(async () => {
    const app = window.__idlever,
      h = app.history;
    const restored = await h.restore(1); // base: drops `build house`
    const engineAtBase = await app.engine.save();
    const baseEntry = await h.entry(0);
    app.lineage = await app.engine.buildTown("house");
    await h.idle();
    await app.engine.runOfflineQuick(1800);
    return {
      restored,
      sameAsEntry: engineAtBase === baseEntry.blob.engine,
      after: await app.engine.save(),
      labels: (await h.list()).map((e) => e.label),
      screen: app.screen,
    };
  });
  ok(replay.restored && replay.screen === "camp", "restore loads through the app");
  ok(replay.sameAsEntry, "restored engine state equals the entry exactly");
  ok(
    replay.after === first.after,
    "same choice after restore reproduces the same next state exactly",
  );
  ok(
    JSON.stringify(replay.labels) === JSON.stringify(["build house", "base"]),
    "restore dropped later entries; the replayed purchase captured again",
  );

  const branched = await page.evaluate(async () => {
    const h = window.__idlever.history;
    await h.branch(1);
    return (await h.list()).map((e) => e.label);
  });
  ok(branched.length === 2 && branched[0] === "build house", "branch keeps later entries");

  // The ring is capped per lineage and survives a reload (IndexedDB).
  const capped = await page.evaluate(async () => {
    const h = window.__idlever.history;
    for (let i = 0; i < 32; i++) await h.snapshot(`n${i}`);
    const l = await h.list();
    return { n: l.length, newest: l[0].label, oldest: l[l.length - 1].label };
  });
  ok(
    capped.n === 30 && capped.newest === "n31" && capped.oldest === "n2",
    "ring capped at 30, oldest dropped",
  );
  await page.reload();
  await page.waitForFunction(() => window.__idlever?.booted);
  const persisted = await page.evaluate(async () =>
    (await window.__idlever.history.list()).map((e) => e.label),
  );
  ok(persisted.length === 30 && persisted[0] === "n31", "ring survives a reload");

  // The panel: Shift+T opens it; its restore asks, then loads the entry.
  await page.evaluate(async () => {
    const h = window.__idlever.history;
    await h.clear();
    await h.snapshot("panel base");
    window.__idlever.lineage = await window.__idlever.engine.buildTown("house");
    await h.idle();
  });
  await page
    .locator("body")
    .click({ position: { x: 5, y: 5 } })
    .catch(() => {});
  await page.keyboard.press("Shift+T");
  await page.waitForSelector(".dev-history .dev-history-row");
  const rows = await page.locator(".dev-history-row").count();
  ok(rows === 2, "Shift+T panel lists entries");
  if (shots) await page.screenshot({ path: join(shots, "save-history-panel.png") });
  const baseSave = await page.evaluate(
    async () => (await window.__idlever.history.entry(1)).blob.engine,
  );
  await page.locator('.dev-history-row[data-i="1"] button', { hasText: "restore" }).click();
  await page.waitForFunction(async () => (await window.__idlever.history.list()).length === 1);
  const panelRestored = await page.evaluate(() => window.__idlever.engine.save());
  ok(panelRestored === baseSave, "panel restore (confirmed) loads the entry");
  await page.keyboard.press("Shift+T");
  ok((await page.locator(".dev-history").count()) === 0, "Shift+T closes the panel");

  // Command line: an entry file → the raw engine save the native tools load; a save file → an entry.
  const entry = await page.evaluate(async () => window.__idlever.history.entry(0));
  const file = join(tmp, "entry.json");
  writeFileSync(file, JSON.stringify({ format: "idlever-history", schema: 1, entry }));
  execFileSync(
    "node",
    ["tools/save-history.mjs", "export", file, "--out", join(tmp, "engine.json")],
    {
      cwd: root,
    },
  );
  ok(
    readFileSync(join(tmp, "engine.json"), "utf8") === entry.blob.engine,
    "export writes the raw engine save",
  );
  execFileSync(
    "node",
    ["tools/save-history.mjs", "export", file, "--out", join(tmp, "blob.json"), "--blob"],
    { cwd: root },
  );
  const raw = readFileSync(join(tmp, "engine.json"), "utf8");
  ok(
    blobOf(raw).blob.engine === raw && blobOf(readFileSync(file, "utf8")).blob.engine === raw,
    "import shapes normalize",
  );
  const imported = await page.evaluate(async (text) => {
    const h = window.__idlever.history;
    const m = await h.add(text, "cli import");
    await h.restore(0);
    return { label: m.label, same: (await window.__idlever.engine.save()) === text };
  }, raw);
  ok(
    imported.label === "cli import" && imported.same,
    "raw engine save imports and restores exactly",
  );
  const native = await page.evaluate(async (text) => {
    const pkg = await import("/src/engine/pkg/idlever_wasm.js");
    await pkg.default();
    const g = pkg.Game.fromSave(text);
    const same = g.save() === text;
    g.free();
    return same;
  }, raw);
  ok(native, "exported save round-trips through the shipping engine");
  assert.deepEqual(errors, []);
  checks++;
  await page.close();
} finally {
  rmSync(tmp, { recursive: true, force: true });
  await browser.close();
}
console.log(`save-history: ${checks} checks PASS`);
