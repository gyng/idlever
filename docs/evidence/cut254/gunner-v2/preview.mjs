// Isolated bitmap comparison; not live registry, gameplay or phone acceptance.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../../../tools/browser.mjs";
const out = "docs/evidence/cut254/gunner-v2";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rows = ["gunner_chamber_chain", "gunner_long_watch"].flatMap((id) =>
  [1, 2].map((version) => {
    const path = version === 1 ? `web/public/ui/skills/${id}-v1.webp` : `${out}/${id}-preview.webp`;
    const bytes = readFileSync(path);
    return { id, version, path, sha256: sha(bytes), src: `data:image/webp;base64,${bytes.toString("base64")}` };
  }),
);
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><meta charset="utf-8"><style>body{background:#0d0c14;color:#eadfc5;font:16px Georgia;padding:16px;margin:0}h1{font-size:20px}.row{display:flex;height:125px;align-items:center;gap:40px}.name{width:230px}.cell{display:grid;justify-items:center;gap:6px}img{outline:1px solid #b89448}small{font:12px monospace}</style><h1>Gunner candidates · isolated bitmap pixels at DPR 1</h1><main></main>');
  await page.evaluate((rows) => {
    for (const r of rows) {
      const row = document.createElement("div"); row.className = "row";
      const label = document.createElement("b"); label.className = "name"; label.textContent = `${r.id} V${r.version}`; row.append(label);
      for (const size of [24, 32, 48, 96]) {
        const cell = document.createElement("div"); cell.className = "cell";
        const image = document.createElement("img"); image.src = r.src; image.width = image.height = size; image.alt = `${r.id} V${r.version}`;
        const note = document.createElement("small"); note.textContent = `${size}px`; cell.append(image, note); row.append(cell);
      }
      document.querySelector("main").append(row);
    }
  }, rows);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth === 192));
  const sizes = await page.locator("img").evaluateAll((images) => images.map((i) => ({ width: i.clientWidth, height: i.clientHeight })));
  assert.equal(sizes.length, 16); sizes.forEach((s, i) => assert.equal(s.width, [24, 32, 48, 96][i % 4]));
  await page.screenshot({ path: `${out}/preview-states.png` });
  for (const r of rows) assert.equal(sha(readFileSync(r.path)), r.sha256);
  writeFileSync(`${out}/preview-results.json`, JSON.stringify({ scope: "Isolated old/new bitmap comparison; V2s unselected, no live registry/gameplay/state/fallback claims", scriptSha256: sha(readFileSync(new URL(import.meta.url))), rows: rows.map(({ src, ...r }) => r), sizes, viewport: { width: 1000, height: 600 }, dpr: 1, captureKind: "artwork comparison board", imageSha256: sha(readFileSync(`${out}/preview-states.png`)) }, null, 2) + "\n");
} finally { await browser.close(); }
