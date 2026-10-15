// Actual current-run weapon moments in production GL/Canvas; no performance claim.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { resolve } from 'node:path';
import { launchGpu } from '../../../tools/browser.mjs';
import { phoneReviewViewport } from '../../../web/tests/lib/viewport-cases.mjs';
const [input, output] = process.argv.slice(2);
assert(input && output && !existsSync(output), 'Use a pinned action inventory and a new output');
const sha = b => createHash('sha256').update(b).digest('hex');
const inventoryRaw = readFileSync(input), inventory = JSON.parse(inventoryRaw);
assert.equal(inventory.status, 'PASS');
const cases = inventory.rows.map(row => {
  const raw = gunzipSync(readFileSync(row.sources.replay.path));
  assert.equal(sha(raw), row.sources.replay.rawSha256);
  const replay = JSON.parse(raw);
  let selected;
  for (const floor of replay.floors) {
    const dies = new Set(floor.events.filter(e => e.k === 'die').map(e => `${e.t}:${e.id}`));
    const event = floor.events.find(e => e.k === 'attack' && e.src === floor.snapshot.hero.id && e.hit && !dies.has(`${e.t}:${e.dst}`));
    if (event) { selected = { floor, event }; break; }
  }
  assert(selected, `${row.id}/${row.weapon}: actual nonfatal attack required`);
  return { id: `${row.id}-${row.weapon}`, ...selected, target: selected.event.t + 2, replaySha256: sha(raw) };
});
mkdirSync(output, { recursive: true });
const sources = [
  'web/src/render/index.ts', 'web/src/render/state.ts', 'web/src/render/view2d.ts',
  'web/src/render/atlas.ts', 'web/src/render/fallback.ts',
  'web/public/art/atlas.json', 'web/public/art/atlas.png',
];
const result = {
  recordedAtUtc: new Date().toISOString(), input, inputSha256: sha(inventoryRaw),
  wasmUsedToGenerateReplay: inventory.wasmSha256,
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  scope: 'First actual landed hero weapon attack per branch whose target does not die on that tick, in production paused replay viewers. Earlier first-attack captures retain mostly dead targets. No live UI, progression, performance, broad class identity or fun verdict.',
  source: Object.fromEntries(sources.map(p => [p, sha(readFileSync(p))])),
  served: [], rows: [], errors: [],
};
const save = () => writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2) + '\n');
save();
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const log = createWriteStream(`${output}/vite.log`);
await new Promise(r => log.once('open', r));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--config', 'tests/vite.test.config.ts'], { cwd: resolve('web'), stdio: ['ignore', log, log] });
let browser;
try {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await launchGpu();
  const page = await browser.newPage({ deviceScaleFactor: 1.5, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const pending = [];
  page.on('pageerror', e => { result.errors.push(String(e)); save(); });
  page.on('response', r => { if (r.url().includes('/src/render/')) pending.push(r.body().then(b => result.served.push({ path: new URL(r.url()).pathname, sha256: sha(b) })).catch(() => {})); });
  await page.route(url, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>' }));
  for (const viewport of [phoneReviewViewport(), { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.evaluate(async () => { window.renderModule = await import('/src/render/index.ts'); });
    result.gpu ??= await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); return g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
    assert(/D3D12.*NVIDIA/.test(result.gpu), result.gpu);
    for (const backend of ['gl', 'canvas']) for (const c of cases) {
      await page.evaluate(({ c, backend }) => {
        window.viewer?.dispose(); document.querySelector('canvas')?.remove();
        const canvas = document.createElement('canvas'); document.body.append(canvas);
        const v = backend === 'gl' ? window.renderModule.createViewer(canvas, { baseTexels: 100 }) : window.renderModule.createFallbackViewer(canvas);
        const before = JSON.stringify(c.floor);
        v.load(c.floor.snapshot); v.apply(c.floor.events.filter(e => e.k !== 'descend' && e.k !== 'exit'));
        v.seek(c.target); v.setSpeed(0); v.setFrame('fight'); window.viewer = v;
        if (before !== JSON.stringify(c.floor)) throw Error('viewer mutated replay input');
      }, { c, backend });
      await page.waitForTimeout(650);
      const stats = await page.evaluate(() => {
        const s = window.viewer.stats();
        return Object.fromEntries(['tick', 'hero', 'camera', 'ents', 'drawn', 'device', 'frame', 'glLost', 'fade'].map(k => [k, s[k]]));
      });
      const file = `${c.id}-${backend}-${viewport.width}.png`;
      await page.screenshot({ path: `${output}/${file}` });
      result.rows.push({ id: c.id, backend, viewport, actualViewport: page.viewportSize(), target: c.target, event: c.event, replaySha256: c.replaySha256, stats, file, frameSha256: sha(readFileSync(`${output}/${file}`)) }); save();
    }
  }
  await Promise.all(pending);
  for (const p of sources) assert.equal(sha(readFileSync(p)), result.source[p], 'source stays frozen');
  assert.equal(result.errors.length, 0); assert.equal(result.rows.length, 40);
  result.status = 'PASS'; result.finishedAtUtc = new Date().toISOString(); save();
  console.log('PASS: 40 production-renderer actual weapon frames; visual review still required');
} catch (e) { result.status = 'FAIL'; result.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); vite.kill('SIGTERM'); log.end(); }
