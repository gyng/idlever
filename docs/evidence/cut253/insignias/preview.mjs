// Presentation-only draft art QC. No game Session, unlock or ownership claim.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { launchBrowser } from '../../../../tools/browser.mjs';

const out = process.argv[2];
assert(out && !existsSync(out), 'Preserve earlier art reviews');
mkdirSync(out, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['web/src/ui/advanced-skill-marks.ts', 'web/src/skill-icons.css'];
const source = Object.fromEntries(files.map(p => [p, hash(readFileSync(p))]));
const log = createWriteStream(`${out}/vite.log`); await new Promise(r => log.once('open', r));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5295', '--strictPort', '--config', 'tests/vite.test.config.ts'], { cwd: resolve('web'), stdio: ['ignore', log, log] });
let browser;
try {
  const url = 'http://127.0.0.1:5295/';
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(url)).ok; } catch {}
    if (ready) break;
    await new Promise(r => setTimeout(r, 100));
  }
  assert(ready);
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(url, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.goto(url);
  const result = await page.evaluate(async () => {
    const { ADVANCED_SKILL_MARKS } = await import('/src/ui/advanced-skill-marks.ts');
    await import('/src/skill-icons.css');
    const style = document.createElement('style');
    style.textContent = `
      html,body{margin:0;background:#0d0c14;color:#eadfc5;font:14px Georgia,serif}
      main{padding:16px;box-sizing:border-box}h1{font-size:20px;margin:0 0 6px}
      p{margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
      article{background:#232232;border:1px solid #55647f;padding:6px;box-sizing:border-box}
      article b{display:block;font-size:14px;margin-bottom:6px}.row{display:flex;align-items:center;justify-content:space-around;gap:4px;margin:2px 0}
      .size{font:12px monospace;width:18px}.paper{background:#c7b798;color:#171520}.paper article{background:#e0d2b9}
    `;
    document.head.append(style);
    const root = document.createElement('main');
    root.innerHTML = '<h1>Advanced path insignias — unregistered art draft</h1><p>Each row: Locked · Available · Learned. Sizes24/32/48. No game state or native mechanics.</p>';
    const grid = document.createElement('div'); grid.className = 'grid'; root.append(grid);
    let cells = 0;
    const ids = Object.keys(ADVANCED_SKILL_MARKS), unique = new Set();
    for (const [id, marks] of Object.entries(ADVANCED_SKILL_MARKS)) {
      const card = document.createElement('article');
      const label = document.createElement('b'); label.textContent = id.replaceAll('_', ' '); card.append(label);
      unique.add(JSON.stringify(marks));
      for (const size of [24, 32, 48]) {
        const row = document.createElement('div'); row.className = 'row';
        const at = document.createElement('small'); at.className = 'size'; at.textContent = size; row.append(at);
        for (const state of ['locked', 'available', 'learned']) {
          const icon = document.createElement('span'); icon.className = 'skill-icon'; icon.dataset.state = state; icon.dataset.size = size;
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 32 32');
          for (const mark of marks) {
            const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', mark.d); path.setAttribute('fill-rule', 'evenodd');
            path.setAttribute('class', `skill-mark${mark.tone ? ` ${mark.tone}` : ''}${mark.line ? ' line' : ''}`); svg.append(path);
          }
          icon.append(svg); row.append(icon); cells++;
        }
        card.append(row);
      }
      grid.append(card);
    }
    document.body.append(root);
    const rectangles = [...document.querySelectorAll('.skill-icon')].map(n => ({ size: Number(n.dataset.size), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height }));
    const emptyPaths = [...document.querySelectorAll('svg path')].filter(p => { const b = p.getBBox(); return !(b.width > 0 || b.height > 0); }).length;
    return { ids, unique: unique.size, cells, rectangles, emptyPaths, overflow: document.documentElement.scrollWidth - innerWidth, boardHeight: root.getBoundingClientRect().height };
  });
  writeFileSync(`${out}/raw-results.json`, JSON.stringify({ source, result, errors }, null, 2) + '\n');
  assert.equal(result.ids.length, 30); assert.equal(result.unique, 30); assert.equal(result.cells, 270); assert.equal(result.emptyPaths, 0);
  assert(result.rectangles.every(r => r.size === r.width && r.size === r.height)); assert(result.overflow <= 1); assert(result.boardHeight <= 900);
  for (const theme of ['dark', 'paper']) {
    await page.evaluate(t => document.body.className = t, theme);
    await page.screenshot({ path: `${out}/${theme}.png`, fullPage: false });
  }
  assert.equal(errors.length, 0);
  for (const p of files) assert.equal(hash(readFileSync(p)), source[p]);
  writeFileSync(`${out}/results.json`, JSON.stringify({ scope: 'Presentation-only unregistered insignia draft; no earned state, mechanics or live integration claim', status: 'PASS', scriptSha256: hash(readFileSync(new URL(import.meta.url))), source, result, errors }, null, 2) + '\n');
  console.log(`PASS30distinct drafts/270size-state cells; headless SVG layout only`);
} finally { await browser?.close(); server.kill('SIGTERM'); log.end(); }
