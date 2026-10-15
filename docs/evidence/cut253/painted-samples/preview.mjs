// Art review only: three generated candidates at actual icon sizes, no game state.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { launchBrowser } from '../../../../tools/browser.mjs';
const out = process.argv[2]; assert(out && !existsSync(out)); mkdirSync(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const assets = ['fighter_rally', 'rogue_afterimage', 'caster_storm_cell'];
const source = Object.fromEntries(assets.map(id => { const p = `web/public/ui/skills/${id}-v1.webp`; return [p, hash(readFileSync(p))]; }));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5295', '--strictPort', '--config', 'tests/vite.test.config.ts'], { cwd: resolve('web'), stdio: 'ignore' });
let browser;
try {
  const url = 'http://localhost:5295/'; let ready = false;
  for (let i = 0; i < 100; i++) { try { ready = (await fetch(url)).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 100)); }
  assert(ready); browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 900, height: 500 }, deviceScaleFactor: 1 });
  await page.route(url, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><style>html,body{margin:0;background:#0d0c14;color:#eadfc5;font:16px Georgia}main{padding:20px}h1{font-size:20px;margin:0 0 12px}.row{display:flex;align-items:center;gap:36px;height:136px}.name{width:180px}.cell{display:flex;flex-direction:column;align-items:center;gap:8px}.frame{border:1px solid #b89448;box-sizing:border-box;display:flex;overflow:hidden}.frame img{width:100%;height:100%;object-fit:cover;display:block}small{font:12px monospace;color:#a4bcd6}</style><main><h1>Painted ability candidates · actual pixel sizes</h1></main>' }));
  await page.goto(url);
  await page.evaluate(ids => {
    for (const id of ids) {
      const row = document.createElement('div'); row.className = 'row';
      const title = document.createElement('b'); title.className = 'name'; title.textContent = id.replaceAll('_', ' '); row.append(title);
      for (const size of [24, 32, 48, 96]) {
        const cell = document.createElement('div'); cell.className = 'cell';
        const frame = document.createElement('span'); frame.className = 'frame'; frame.style.width = frame.style.height = `${size}px`;
        const img = document.createElement('img'); img.src = `/ui/skills/${id}-v1.webp`; img.alt = id; frame.append(img);
        const label = document.createElement('small'); label.textContent = `${size}px`; cell.append(frame, label); row.append(cell);
      }
      document.querySelector('main').append(row);
    }
  }, assets);
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth === 192));
  await page.screenshot({ path: `${out}/actual-sizes.png`, fullPage: false });
  const geometry = await page.locator('.frame').evaluateAll(nodes => nodes.map(n => ({ width: n.clientWidth, height: n.clientHeight, outerWidth: n.getBoundingClientRect().width, outerHeight: n.getBoundingClientRect().height })));
  for (const p of Object.keys(source)) assert.equal(hash(readFileSync(p)), source[p]);
  writeFileSync(`${out}/results.json`, JSON.stringify({ scope: 'Generated candidate artwork at24/32/48/96px frames; not live icon integration or mechanics acceptance', source, dpr: 1, viewport: [900, 500], geometry, pngSha256: hash(readFileSync(`${out}/actual-sizes.png`)) }, null, 2) + '\n');
} finally { await browser?.close(); server.kill('SIGTERM'); }
