// Cut 228 capture: the Cut223 multihero fixture (three residents, real earned Gold), five real one-minute `advance` steps
// (heroes 1 and 2 leave on delves, hero 3 comes home to rest), the real public `selectBloodline(3)` and one real public
// `buyKit` (the cheapest Forge step, paid from the purse) — no client-set phase; then the town at day (12h) and night (23h), phone 400 and desktop 1440, on the private-Xvfb GPU browser.
// Usage: node docs/evidence/cut228/capture.mjs URL OUTDIR [--reduced] [--before]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { launchGpu } from "../../../tools/browser.mjs";
const [url, out] = process.argv.slice(2);
const reduced = process.argv.includes("--reduced");
const before = process.argv.includes("--before"); // no purchase: the idle smith
const tag = `${before ? "before" : "forge"}${reduced ? "-reduced" : ""}`;
mkdirSync(out, { recursive: true });
const raw = gunzipSync(
  readFileSync(new URL("../cut223/core/fixtures-final/multihero-absence.session.json.gz", import.meta.url)),
).toString();
const browser = await launchGpu();
const report = { url, reduced, before, shots: [], errors: [], wasm: [], info: [] };
try {
  for (const [w, hgt] of [
    [400, 860],
    [1440, 900],
  ]) {
    const page = await browser.newPage({
      viewport: { width: w, height: hgt },
      deviceScaleFactor: w < 600 ? 3 : 2,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("idlever_wasm_bg.wasm"))
        r.body().then((b) =>
          report.wasm.push({
            bytes: b.length,
            sha256: createHash("sha256").update(b).digest("hex"),
          }),
        );
    });
    await page.goto(`${url}?dev=1&fresh=1&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    const info = await page.evaluate(
      async ({ raw, before }) => {
        const a = window.__idlever;
        a.runnerOn = false;
        await a.engine.load(raw);
        await a.refresh();
        const gold0 = a.lineage.gold;
        let forge = null;
        const cheapest = () =>
          (a.lineage.kit ?? [])
            .filter((k) => k.next && ["weapon", "armour", "pack"].includes(k.slot))
            .sort((x, y) => x.next.price - y.next.price)[0];
        for (let i = 0; i < 5; i++) {
          await a.engine.advance(60_000);
          await a.refresh();
        }
        await a.engine.selectBloodline(3);
        await a.refresh();
        if (!before) {
          const slot = cheapest().slot;
          await a.engine.buyKit(slot);
          await a.refresh();
          forge = a.lineage.town?.forge_work ?? null;
        }
        a.go({ kind: "camp" });
        return {
          kind: a.kind,
          gold0,
          gold1: a.lineage.gold,
          forge,
          slots: a.lineage.hero_slots.map((h) => [h.id, h.life_state, h.rest_s]),
        };
      },
      { raw, before },
    );
    report.info.push({ width: w, ...info });
    await page.waitForFunction(() => window.__town);
    // a view preference only (localStorage): fold the task tracker so it does not cover the Forge
    await page.evaluate(() => {
      const d = document.querySelector(".task-fold");
      if (d && d.open) d.open = false;
    });
    for (const hour of [12, 23]) {
      await page.evaluate((h) => window.__town.setHour(h), hour);
      await page.waitForTimeout(hour === 12 ? 9000 : 1500); // the fitted hero's walk from the bench to the anvil
      const stats = await page.evaluate(() => {
        const t = window.__town;
        const s = t.stats?.() ?? t.view?.stats?.();
        return s ? { forge: s.forge, residentStates: s.residentStates } : null;
      });
      const el = await page.$(".town");
      const file = `${out}/${tag}-${w}-${hour === 12 ? "day" : "night"}.png`;
      await (el ?? page).screenshot({ path: file });
      // the Forge close up (the same frame's pixels, cropped around the building and the fitted hero)
      const forge = await page.evaluate(() =>
        window.__town.targets().find((x) => x.id === "blacksmith"),
      );
      let crop = null;
      if (forge) {
        crop = file.replace(/\.png$/, "-forge.png");
        const pad = Math.max(forge.w, forge.h) * 0.9;
        await page.screenshot({
          path: crop,
          clip: {
            x: Math.max(0, forge.x - pad * 0.7),
            y: Math.max(0, forge.y - pad * 0.3),
            width: forge.w + pad * 1.6,
            height: forge.h + pad * 1.1,
          },
        });
      }
      const tip = await page.evaluate(() => {
        const b = document.querySelector("[data-home-hero]");
        return b ? b.getAttribute("title") : null;
      });
      report.shots.push({ file, crop, tip, stats });
    }
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/${tag}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1).slice(0, 4000));
}
