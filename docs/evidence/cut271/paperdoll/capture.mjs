// Cut271 paper-doll captures: node docs/evidence/cut271/paperdoll/capture.mjs <before|after> [url]
// Headless; loads the Cut220 Actual/Next fixtures, sets each cosmetic look (in-page only, never saved to disk),
// opens the Hero Hub's Gear section, and captures the visible viewport for Actual and Next.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { launchBrowser } from "../../../../tools/browser.mjs";
const label = process.argv[2];
assert.ok(["before", "after"].includes(label));
const url = (process.argv[3] ?? "http://localhost:5471/").replace(/\/+$/, "") + "/";
const out = resolve("docs/evidence/cut271/paperdoll", label);
mkdirSync(out, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const cases = [
  ...["male", "female", "cat"].map((look) => ({ fixture: "weapon-bow", look })),
  { fixture: "helm-empty", look: "male" },
];
const viewports = [
  { width: 402, height: 681 },
  { width: 1440, height: 900 },
];
const rows = [];
const browser = await launchBrowser();
try {
  for (const c of cases)
    for (const viewport of viewports) {
      const raw = gunzipSync(
        readFileSync(`docs/evidence/cut220/actual-next-8879/${c.fixture}.session.json.gz`),
      ).toString();
      const p = await browser.newPage({ viewport, reducedMotion: "reduce" });
      const errors = [];
      p.on("pageerror", (e) => errors.push(String(e)));
      await p.goto(url + "?fresh=1&seed=1&runs=0");
      await p.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
      await p.evaluate(
        async ({ raw, look }) => {
          const a = window.__idlever;
          a.runnerOn = false;
          if (a.kind !== "wasm") throw Error("real WASM required");
          a.lineage = await a.engine.load(raw);
          await a.refresh();
          a.go({ kind: "camp" });
          await a.setLook(look);
          a.go({ kind: "camp" });
          (await import("/src/ui/town.ts")).openHero(a);
        },
        { raw, look: c.look },
      );
      await p.locator("[data-hero-hub] .hero-equipment-figure").waitFor();
      const equipment = await p.evaluate(() => window.__idlever.lineage.starting_kits.equipment);
      const look = await p.evaluate(() => window.__idlever.lineage.look);
      for (const phase of ["actual", "next"]) {
        const button = p.locator(`[data-doll-phase=${phase}]`);
        await button.scrollIntoViewIfNeeded();
        await button.click();
        await p.waitForLoadState("networkidle");
        await p.evaluate(async () => {
          await document.fonts.ready;
          const imgs = [...document.querySelectorAll(".hero-equipment-figure img, .hero-equipment-figure image")];
          await Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
          await new Promise((r) => setTimeout(r, 300));
        });
        await p.locator(".hero-hub-doll").evaluate((el) => el.scrollIntoView({ block: "start" }));
        await p.mouse.move(2, 2);
        const name = `${c.fixture}-${c.look}-${viewport.width}-${phase}.png`;
        await p.screenshot({ path: `${out}/${name}`, fullPage: false });
        const geo = await p.locator(".hero-hub-doll").evaluate((el) => {
          const hub = el.closest("[data-hero-hub]");
          return {
            doll: el.getBoundingClientRect().toJSON(),
            hubWidth: hub.clientWidth,
            hubScrollWidth: hub.scrollWidth,
          };
        });
        rows.push({
          ...c,
          look,
          viewport,
          phase,
          captureKind: "viewport",
          file: name,
          sha256: hash(readFileSync(`${out}/${name}`)),
          slots: equipment[phase].slots.map((s) => [s.slot, s.kind, s.label]),
          geo,
        });
      }
      assert.deepEqual(errors, []);
      await p.close();
    }
} finally {
  await browser.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify({ label, url, at: new Date().toISOString(), rows }, null, 2) + "\n");
console.log(`${rows.length} captures → ${out}`);
