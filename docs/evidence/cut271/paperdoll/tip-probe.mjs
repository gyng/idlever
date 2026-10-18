// Cut271: the slot tile's detail tooltip and tile targets at 402×681 (headless).
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../../../tools/browser.mjs";
const url = process.argv[2] ?? "http://localhost:5471/";
const raw = gunzipSync(readFileSync("docs/evidence/cut220/actual-next-8879/weapon-bow.session.json.gz")).toString();
const browser = await launchBrowser();
const out = {};
try {
  const p = await browser.newPage({ viewport: { width: 402, height: 681 }, reducedMotion: "reduce" });
  await p.goto(url + "?fresh=1&seed=1&runs=0");
  await p.waitForFunction(() => window.__idlever?.booted, null, { timeout: 90000 });
  await p.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    a.lineage = await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
    (await import("/src/ui/town.ts")).openHero(a);
  }, raw);
  await p.locator("[data-doll-phase=next]").click();
  const tile = p.locator('[data-doll-slot="weapon"] .hero-equipment-tile');
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  await p.locator("#kw-tip:not([hidden])").waitFor();
  out.tip = await p.locator("#kw-tip").innerText();
  out.tiles = await p.locator(".hero-equipment-tile").evaluateAll((n) =>
    n.map((e) => ({ slot: e.dataset.dollTile, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })),
  );
  out.changed = await p.locator('.hero-equipment-slot[data-doll-change="1"]').evaluateAll((n) => n.map((e) => e.dataset.dollSlot));
  out.art = await p.locator(".hero-equipment-slot").evaluateAll((n) => n.map((e) => [e.dataset.dollSlot, e.dataset.dollArt]));
  await p.screenshot({ path: "docs/evidence/cut271/paperdoll/after/tip-weapon-402-next.png" });
} finally {
  await browser.close();
}
writeFileSync("docs/evidence/cut271/paperdoll/after/tip-probe.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));
