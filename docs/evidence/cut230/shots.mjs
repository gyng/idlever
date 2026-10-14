// Cut230 early pacing: two private-display GPU shots.
// 1. The first session after two sends by hand: the actual earned seed-1 save after its second manual send
//    (docs/evidence/cut208/earned-final, recorded under the old 3-send rule) loads on current source with the
//    Scout lit and affordable.
// 2. A shallow-death camp: the actual controlled first-floor Core defeat (cut230/fixtures, 600 ticks), the send gem
//    reading "Recovering 1m".
// node docs/evidence/cut230/shots.mjs URL OUT_DIR
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchGpu } from "../../../tools/browser.mjs";
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const read = (path) => gunzipSync(readFileSync(new URL(path, import.meta.url))).toString();
const shots = [
  { name: "first-session-scout-after-2-sends", raw: read("../cut208/earned-final/seed-1-manual2.game.json.gz") },
  { name: "camp-shallow-death-recovering-1m", raw: read("./fixtures/controlled-reincarnating-600.game.json.gz") },
];
const browser = await launchGpu();
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  for (const { name, raw } of shots) {
    const info = await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.runnerOn = false;
      if (a.kind !== "wasm") throw Error("real WASM required");
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
      await new Promise((r) => setTimeout(r, 1500));
      const scout = a.lineage.tree.nodes.find((n) => n.id === "scout");
      return {
        gem: document.querySelector(".gem.send")?.textContent,
        recovery_s: a.lineage.persistent_hero?.recovery_s,
        state: a.lineage.persistent_hero?.state,
        scout: { state: scout.state, price: scout.price },
        gold: a.lineage.gold,
        recommended: a.lineage.journal?.recommended,
      };
    }, raw);
    console.log(name, JSON.stringify(info));
    await page.screenshot({ path: `${out}/${name}.png` });
  }
} finally {
  await browser.close();
}
