// Cut227 recovery: two private-display GPU shots — the camp's "Recovering 20m" send gem and the
// hero panel — from the actual controlled Core defeat fixture at RECOVERY_TICKS 12000.
// node docs/evidence/cut227/recovery/shots.mjs URL OUT_DIR
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchGpu } from "../../../../tools/browser.mjs";
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const raw = gunzipSync(
  readFileSync(new URL("./fixtures/controlled-reincarnating-12000.game.json.gz", import.meta.url)),
).toString();
const browser = await launchGpu();
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  const info = await page.evaluate(async (raw) => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
    await a.engine.load(raw);
    await a.refresh();
    a.go({ kind: "camp" });
    await new Promise((r) => setTimeout(r, 1500));
    return {
      gem: document.querySelector(".gem.send")?.textContent,
      recovery_s: a.lineage.persistent_hero.recovery_s,
      state: a.lineage.persistent_hero.state,
    };
  }, raw);
  console.log(JSON.stringify(info));
  await page.screenshot({ path: `${out}/camp-recovering-20m.png` });
  await page.evaluate(async () => {
    (await import("/src/ui/hero-life.ts")).openHeroLife(window.__idlever, null, "hero");
  });
  await page.locator(".hero-life-panel").waitFor();
  await page.waitForTimeout(800);
  console.log(
    JSON.stringify({ panel: await page.locator(".hero-life-state").first().textContent() }),
  );
  await page.screenshot({ path: `${out}/hero-panel-recovering.png` });
} finally {
  await browser.close();
}
