// Settled private-GPU camp captures of the genuine waiting-song save (Cut222 acceptance 5).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { launchGpu } from "../../../../../tools/browser.mjs";
const root = new URL("../../../../../", import.meta.url).pathname;
const out = new URL("./", import.meta.url).pathname;
const url = execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const raw = gunzipSync(readFileSync(root + "docs/evidence/cut222/core/baseline-news-final-gz/waiting-song.session.json.gz")).toString();
const sha = (b) => createHash("sha256").update(b).digest("hex");
const wasm = sha(readFileSync(root + "web/src/engine/pkg/idlever_wasm_bg.wasm"));
const browser = await launchGpu();
const rows = [];
try {
  for (const width of [320, 400, 1440])
    for (const scale of [1, 2]) {
      const page = await browser.newPage({ viewport: { width, height: width > 1000 ? 900 : 860 } });
      const served = [];
      page.on("response", (r) => { if (r.url().includes("idlever_wasm_bg.wasm")) served.push(r.body().then(sha)); });
      await page.goto(`${url}?fresh=1&seed=1&runs=0`);
      await page.waitForFunction(() => window.__idlever?.booted);
      const r = await page.evaluate(async ({ raw, scale }) => {
        const a = window.__idlever;
        a.runnerOn = false;
        a.lineage = await a.engine.load(raw);
        await a.refresh();
        a.go({ kind: "camp" });
        document.documentElement.style.fontSize = `${16 * scale}px`;
        await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 1200));
        const before = await a.engine.save();
        return {
          kind: a.kind,
          wishControls: document.querySelectorAll(".wish-chip,[data-wish]").length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          grantWish: typeof a.engine.grantWish,
          saveStable: before === (await a.engine.save()),
        };
      }, { raw, scale });
      const file = `camp-${width}-${scale}x.png`;
      await page.screenshot({ path: out + file });
      rows.push({ width, scale, file, ...r, served: await Promise.all(served) });
      await page.close();
    }
} finally {
  await browser.close();
}
const ok = rows.every((r) => r.kind === "wasm" && !r.wishControls && !r.overflow && r.grantWish === "undefined" && r.saveStable && r.served.every((s) => s === wasm));
writeFileSync(out + "results.json", JSON.stringify({ result: ok ? "PASS" : "FAIL", wasm, rows }, null, 2));
console.log(ok ? "PASS" : "FAIL", JSON.stringify(rows.map((r) => [r.width, r.scale, r.wishControls, r.overflow, r.saveStable])));
