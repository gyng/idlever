// Isolated artwork review. No game saves, catalogue grants or native mechanics.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchBrowser } from '../../../../tools/browser.mjs';

const out = process.argv[2];
assert(out && !existsSync(out));
mkdirSync(out, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const manifestBytes = readFileSync('art/advanced-skills.json');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.assets.length, 30);
assert.equal(manifest.missing.length, 0);
assert.equal(manifest.invalid.length, 0);
assert.equal(new Set(manifest.assets.map(a => a.output_sha256)).size, 30);
const assets = manifest.assets.map(a => {
  const bytes = readFileSync(a.output);
  assert.equal(sha(bytes), a.output_sha256);
  return { ...a, src: `data:image/webp;base64,${bytes.toString('base64')}` };
});
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1008, height: 960 }, deviceScaleFactor: 1 });
  const captures = [];
  for (const group of ['overview', 'fighter', 'rogue', 'ranger', 'caster', 'gunner']) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;background:#0d0c14;color:#eadfc5;font:16px Georgia}
      main{padding:20px}h1{font-size:20px;margin:0 0 14px}p{font:12px monospace;color:#a4bcd6}
      .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
      .card{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}
      .card b{font-size:12px;text-align:center;overflow-wrap:anywhere;width:auto}
      .grid>h1,.grid>p{grid-column:1/-1}
      .row{display:flex;align-items:center;gap:36px;height:130px}.name{width:210px}
      .cell{display:flex;flex-direction:column;align-items:center;gap:6px}
      img{display:block;object-fit:contain;outline:1px solid #b89448}
      small{font:12px monospace;color:#a4bcd6}
    </style></head><body><main><h1>Painted ability candidates · ${group}</h1>
      <p>Art review only · image pixels at DPR 1 · no live integration or mechanics claim</p></main></body></html>`);
    await page.evaluate(({ assets, group }) => {
      const main = document.querySelector('main');
      if (group === 'overview') main.className = 'grid';
      for (const a of assets.filter(a => group === 'overview' || a.id.startsWith(`${group}_`))) {
        const row = document.createElement('div');
        row.className = group === 'overview' ? 'card' : 'row';
        const title = document.createElement('b'); title.className = 'name';
        title.textContent = a.id.replaceAll('_', ' ');
        if (group !== 'overview') row.append(title);
        for (const size of group === 'overview' ? [128] : [24, 32, 48, 96]) {
          const cell = document.createElement('div'); cell.className = 'cell';
          const img = document.createElement('img'); img.src = a.src; img.alt = a.id;
          img.width = img.height = size; img.dataset.expected = String(size); cell.append(img);
          if (group !== 'overview') { const label = document.createElement('small'); label.textContent = `${size}px`; cell.append(label); }
          row.append(cell);
        }
        if (group === 'overview') row.append(title);
        main.append(row);
      }
    }, { assets, group });
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth === 192));
    const geometry = await page.locator('img').evaluateAll(imgs => imgs.map(i => ({ id: i.alt, width: i.clientWidth, height: i.clientHeight, expected: Number(i.dataset.expected) })));
    for (const g of geometry) { assert.equal(g.width, g.expected); assert.equal(g.height, g.expected); }
    const image = `${out}/${group}.png`; await page.screenshot({ path: image, fullPage: true });
    captures.push({ group, geometry, image, sha256: sha(readFileSync(image)) });
  }
  for (const a of assets) assert.equal(sha(readFileSync(a.output)), a.output_sha256);
  writeFileSync(`${out}/results.json`, JSON.stringify({ scope: 'Thirty painted candidates at actual image pixel sizes; no live state/fallback/accessibility or mechanics acceptance', manifestSha256: sha(manifestBytes), dpr: 1, viewport: [1008, 960], source: assets.map(({ src, ...a }) => a), captures }, null, 2) + '\n');
} finally {
  await browser.close();
}
