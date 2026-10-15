// Functional pixel equivalence under a fixed presentation clock; no timing result.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, cpSync, symlinkSync, createWriteStream } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import net from 'node:net';
import { launchGpu } from '../../../tools/browser.mjs';
import { instrumentFrozenVisualFrame, freezeVisualClock } from './cost-frozen-visual-instrumentation.mjs';
const [output] = process.argv.slice(2);
assert(output && !existsSync(output), 'Keep every comparison attempt');
mkdirSync(output, { recursive: true });
const sha = x => createHash('sha256').update(x).digest('hex');
const raw = gunzipSync(readFileSync('docs/evidence/handoff-content/run131.replay.json.gz'));
const replay = JSON.parse(raw);
const cases = JSON.parse(readFileSync('docs/evidence/cut245/after-v3/results.json')).cases.map(c => ({ ...c, floor: replay.floors.find(f => f.snapshot.depth === c.depth) }));
const result = {
  recordedAtUtc: new Date().toISOString(),
  scope: 'Archived pre-landmark vs current landmark-off functional pixels; same isolated visual-clock transformation, real RAF/dt/quality clocks. No timing acceptance.',
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  instrumentationSha256: sha(readFileSync(new URL('./cost-frozen-visual-instrumentation.mjs', import.meta.url))),
  archiveSha256: sha(readFileSync('docs/evidence/cut245/renderer-before.tar.gz')),
  replaySha256: sha(raw), visualClock: 10000000, currentSource: Object.fromEntries([...readdirSync('web/src/render', { recursive: true }).filter(p => p.endsWith('.ts')).map(p => join('web/src/render', p)), 'web/public/art/atlas.png', 'web/public/art/atlas.json'].map(p => [p, sha(readFileSync(p))])), source: {}, served: [], rows: [], errors: [],
};
const save = () => writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2) + '\n');
const servers = [], logs = [];
let browser;
async function server(leg) {
  const project = resolve('scratchpad', `cut245-equiv-${output.split('/').pop()}`, leg);
  assert(!existsSync(project), 'Fresh isolated source copy');
  const web = join(project, 'web'); mkdirSync(web, { recursive: true });
  cpSync('web/src', join(web, 'src'), { recursive: true });
  if (leg === 'baseline') {
    execFileSync('tar', ['xzf', resolve('docs/evidence/cut245/renderer-before.tar.gz'), '-C', project]);
    writeFileSync(join(web, 'src/render/fallback.ts'), execFileSync('git', ['show', '2a4bb2c5:web/src/render/fallback.ts']));
    for (const [p, digest] of Object.entries(JSON.parse(readFileSync('docs/evidence/cut245/before-identity.json')).files))
      assert.equal(sha(readFileSync(join(project, p))), digest, `Archived source:${p}`);
  }
  result.source[leg] = Object.fromEntries(['index.ts', 'atlas.ts', 'state.ts', 'view2d.ts', 'types.ts', 'fallback.ts'].map(p => [p, sha(readFileSync(join(web, 'src/render', p)))]));
  symlinkSync(resolve('web/node_modules'), join(web, 'node_modules'), 'dir');
  symlinkSync(resolve('web/public'), join(web, 'public'), 'dir');
  writeFileSync(join(web, 'index.html'), '<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
  writeFileSync(join(web, 'vite.config.mjs'), `export default {server:{hmr:false,watch:null,fs:{allow:[${JSON.stringify(resolve('.'))}]}}};`);
  const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  const log = createWriteStream(`${output}/${leg}-vite.log`); logs.push(log); await new Promise(r => log.once('open', r));
  const child = spawn(process.execPath, [resolve('web/node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: web, stdio: ['ignore', log, log] }); servers.push(child);
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 150; i++) { try { if ((await fetch(url)).ok) return url; } catch {} await new Promise(r => setTimeout(r, 100)); }
  throw Error('No local equivalence server');
}
try {
  const urls = { baseline: await server('baseline'), candidate: await server('candidate') }; save();
  browser = await launchGpu(); result.browserVersion = browser.version();
  for (const width of [400, 1440]) for (const c of cases) for (const leg of ['baseline', 'candidate']) {
    const page = await browser.newPage({ viewport: { width, height: width === 400 ? 640 : 800 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce', serviceWorkers: 'block' });
    page.on('pageerror', e => result.errors.push(String(e)));
    await page.route('**/src/render/index.ts', async route => {
      const response = await route.fetch(), original = await response.text();
      let body;
      if (leg === 'candidate') body = instrumentFrozenVisualFrame(original);
      else {
        const needle = 'raf = requestAnimationFrame(frame);';
        assert.equal(original.split(needle).length, 3);
        body = freezeVisualClock(original.replace(needle, '').replace(needle, 'globalThis.__landmarkSingleFrame = frame;'));
      }
      result.served.push({ leg, width, id: c.id, originalSha256: sha(original), instrumentedSha256: sha(body) });
      await route.fulfill({ response, body });
    });
    await page.goto(urls[leg]);
    const state = await page.evaluate(async ({ c }) => {
      window.__landmarkSingleLeg = 'baseline'; window.__landmarkSingleControl = false; window.__landmarkVisualClock = 10000000;
      const m = await import('/src/render/index.ts');
      const canvas = document.querySelector('canvas'), v = m.createViewer(canvas, { baseTexels: 120 });
      const before = JSON.stringify(c.floor);
      v.load(c.floor.snapshot); v.apply(c.floor.events.filter(e => e.k !== 'descend' && e.k !== 'exit')); v.seek(c.target); v.setSpeed(0); v.setFrame('map');
      const paint = async () => { const now = await new Promise(r => requestAnimationFrame(r)); window.__landmarkSingleFrame(now); };
      for (let i = 0; i < 120; i++) await paint();
      const s = v.stats();
      const gl = canvas.getContext('webgl2');
      const gpu = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
      window.equivalenceViewer = v;
      return { gpu, exactInput: before === JSON.stringify(c.floor), geometry: { device: s.device, target: s.target, camera: s.camera, fx: s.fx, tick: s.tick }, landmarks: v.debugLandmarks?.().length ?? 0, calls: s.calls };
    }, { c });
    assert(/D3D12.*NVIDIA/.test(state.gpu)); assert(state.exactInput); assert(state.calls > 0); assert.equal(state.landmarks, 0);
    const file = `${c.id}-${width}-${leg}.png`; await page.screenshot({ path: `${output}/${file}` });
    result.rows.push({ width, id: c.id, leg, file, frameSha256: sha(readFileSync(`${output}/${file}`)), ...state }); save();
    await page.evaluate(() => window.equivalenceViewer.dispose()); await page.close();
  }
  result.comparisons = [];
  for (const width of [400, 1440]) for (const c of cases) {
    const rows = result.rows.filter(r => r.width === width && r.id === c.id);
    assert.deepEqual(rows[0].geometry, rows[1].geometry, 'Fixed clock/device/camera/effects');
    const compared = JSON.parse(execFileSync('python3', ['-c', 'import sys,json;from PIL import Image,ImageChops;a=Image.open(sys.argv[1]).convert("RGBA");b=Image.open(sys.argv[2]).convert("RGBA");assert a.size==b.size;d=ImageChops.difference(a,b);print(json.dumps({"size":a.size,"differentPixels":sum(any(p) for p in d.getdata()),"maxChannelDifference":max(x[1] for x in d.getextrema())}))', ...rows.map(r => `${output}/${r.file}`)], { encoding: 'utf8' }));
    result.comparisons.push({ width, id: c.id, ...compared }); save();
  }
  assert.equal(result.errors.length, 0);
  for (const [path, digest] of Object.entries(result.currentSource)) assert.equal(sha(readFileSync(path)), digest, 'Frozen current source/art');
  result.status = result.comparisons.every(c => c.differentPixels === 0) ? 'PASS' : 'FAIL';
  result.finishedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: result.status, comparisons: result.comparisons }));
  if (result.status !== 'PASS') process.exitCode = 1;
} catch (e) { result.status = 'FAIL'; result.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); for (const s of servers) s.kill('SIGTERM'); for (const l of logs) l.end(); }
