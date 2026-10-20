import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../../tools/browser.mjs";
import { phoneReviewViewport } from "../../../web/tests/lib/viewport-cases.mjs";
const root = new URL("../../../", import.meta.url);
const out = new URL("browser/", import.meta.url);
mkdirSync(out, { recursive: true });
const source = gunzipSync(
  readFileSync(new URL("docs/evidence/cut291/wasm/gas-locked-input.json.gz", root)),
).toString();
const wasm = readFileSync(new URL("web/src/engine/pkg/idlever_wasm_bg.wasm", root));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const browser = await launchBrowser();
const cases = [],
  errors = [],
  packets = [];
try {
  for (const [name, viewport] of [
    ["phone", phoneReviewViewport()],
    ["desktop", { width: 1440, height: 900 }],
  ]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("idlever_wasm_bg.wasm")) packets.push(r.body().then(sha));
    });
    await page.goto(`${process.env.IDLEVER_TEST_URL ?? "http://localhost:5452/"}?fresh=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    const initial = await page.evaluate(async (raw) => {
      const app = window.__idlever;
      if (app.kind !== "wasm") throw Error("real WASM required");
      await app.importSave(
        JSON.stringify({ engine: raw, loadout: [], runs: 0, last_seen: Date.now() }),
      );
      await app.mutate(() => app.engine.equipPackage("gas_step", 0), undefined, true);
      await app.mutate(() => app.engine.setTacticVariant("gas_step", 0), undefined, true);
      const { closeAllSheets } = await import("/src/ui/sheet.ts");
      closeAllSheets();
      const { openPackages } = await import("/src/ui/packages.ts");
      openPackages(app);
      return {
        marks: app.lineage.marks,
        selected: app.lineage.packages.all.find((p) => p.id === "gas_step").variant,
      };
    }, source);
    const variant = page.locator('.pkg-slot[data-kind="tactic"] .pkg-variant[data-variant="1"]');
    await variant.waitFor();
    assert.equal(await variant.locator(".pkg-variant-needs").textContent(), "Learn Throw");
    assert.equal(await variant.isEnabled(), true);
    await variant.click();
    await page.waitForFunction(
      () =>
        document.querySelector('.pkg-variant[data-variant="1"]')?.getAttribute("aria-pressed") ===
        "true",
    );
    const locked = await page.evaluate(() => ({
      marks: window.__idlever.lineage.marks,
      owned: window.__idlever.lineage.unlocks.includes("throw"),
    }));
    assert.equal(locked.marks, initial.marks);
    assert.equal(locked.owned, false);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    await page.screenshot({ path: new URL(`${name}-locked.png`, out).pathname });
    const purchase = await page.evaluate(async () => {
      const app = window.__idlever;
      const before = app.lineage.marks;
      await app.mutate(() => app.engine.buy("throw"), undefined, true);
      return {
        before,
        after: app.lineage.marks,
        owned: app.lineage.unlocks.includes("throw"),
        variant: app.lineage.packages.all.find((p) => p.id === "gas_step").variant,
      };
    });
    assert.equal(purchase.before - purchase.after, 3);
    assert.equal(purchase.owned, true);
    assert.equal(purchase.variant, 1);
    await page.waitForFunction(() => !document.querySelector(".pkg-variant-needs"));
    await page.screenshot({ path: new URL(`${name}-learned.png`, out).pathname });
    cases.push({
      name,
      viewport,
      textScale: 1,
      captureKind: "visible viewport",
      initial,
      locked,
      purchase,
      horizontalOverflow: overflow,
    });
    await page.close();
  }
  const served = await Promise.all(packets);
  assert.ok(served.length >= 2);
  assert.ok(served.every((x) => x === sha(wasm)));
  assert.deepEqual(errors, []);
  writeFileSync(
    new URL("results.json", out),
    JSON.stringify(
      { status: "PASS", sourceSha256: sha(source), wasmSha256: sha(wasm), cases, served, errors },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "PASS real-WASM missing/purchased Throw hints, free variant changes, phone/desktop screenshots\n",
  );
} finally {
  await browser.close();
}
