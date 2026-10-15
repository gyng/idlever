// Single-context hot GPU diagnostic only; cold cost remains a separate protocol.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, createWriteStream, readlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import net from 'node:net';
import { launchGpu } from '../../../tools/browser.mjs';
import { assertSixPairCoverage } from './cost-pair-coverage.mjs';
import { instrumentFrozenVisualFrame, instrumentClockTaggedTimer } from './cost-frozen-visual-instrumentation.mjs';
const arg = (k, fallback) => { const i = process.argv.indexOf(k); return i < 0 ? fallback : process.argv[i + 1]; };
assert(process.argv.includes('--quiet'), 'Observe native/browser work terminal first; no measurement under load');
const jobViewPath = arg('--job-view');
assert(jobViewPath, 'Bind process view to a positively observed native job identity');
const jobViewRaw = readFileSync(jobViewPath), jobView = JSON.parse(jobViewRaw);
const pidNamespace = readlinkSync('/proc/self/ns/pid');
assert.equal(pidNamespace, jobView.pidNamespace, 'Same process namespace as the positively observed job');
const pidArg = arg('--quiet-pids', '');
assert(pidArg, 'Explicit previously owned native/browser handles required');
const quietPids = pidArg.split(',').map(Number);
assert(quietPids.includes(jobView.pid), 'Include the positively observed native child handle');
for (const pid of quietPids) {
  assert(Number.isInteger(pid) && pid > 1);
  try { process.kill(pid, 0); throw Error(`Owned process${pid} is live: no GPU measurement`); }
  catch (e) { if (e.code !== 'ESRCH') throw e; }
}
const output = arg('--out');
assert(output && !existsSync(output), 'Preserve prior attempts');
const control = process.argv.includes('--control');
const contentOnly = process.argv.includes('--content-only');
assert(!contentOnly || control, 'Content-only proof uses A/A landmark-off branches');
const widths = arg('--widths', '400,1440').split(',').map(Number);
assert(widths.length && widths.every(w => w === 400 || w === 1440));
const ids = arg('--cases', 'fens,crypt,foundry').split(',');
assert(ids.length && ids.every(x => ['fens', 'crypt', 'foundry'].includes(x)));
const hash = x => createHash('sha256').update(x).digest('hex');
const replayRaw = gunzipSync(readFileSync('docs/evidence/handoff-content/run131.replay.json.gz'));
const replay = JSON.parse(replayRaw);
const cases = JSON.parse(readFileSync('docs/evidence/cut245/after-v3/results.json')).cases.filter(c => ids.includes(c.id)).map(c => ({ ...c, floor: replay.floors.find(f => f.snapshot.depth === c.depth) }));
assert.equal(cases.length, new Set(ids).size);
const paths = readdirSync('web/src/render', { recursive: true }).filter(p => p.endsWith('.ts')).map(p => join('web/src/render', p));
paths.push('web/public/art/atlas.png', 'web/public/art/atlas.json');
mkdirSync(output, { recursive: true });
const result = {
  recordedAtUtc: new Date().toISOString(), control, contentOnly, quietPids,
  pidNamespace, jobViewPath, jobViewSha256: hash(jobViewRaw),
  scope: contentOnly ? 'Actual submitted-content and framebuffer A/A proof only; no GPU timing acceptance.' : control ? 'A/A current-renderer landmark-off GPU method control, one context; no candidate/cold acceptance.' : 'Current-renderer landmark on/off GPU-only diagnostic, one context. Requires an accepted same-scene A/A control and archived-baseline visual equivalence before feature-cost acceptance.',
  protocol: 'cost-frozen-visual-protocol.md', replaySha256: hash(replayRaw),
  harnessSha256: hash(readFileSync(new URL(import.meta.url))),
  instrumentationSha256: hash(readFileSync(new URL('./cost-frozen-visual-instrumentation.mjs', import.meta.url))),
  source: Object.fromEntries(paths.map(p => [p, hash(readFileSync(p))])), contentAuditSha256: hash(readFileSync(new URL('./cost-content-audit.mjs', import.meta.url))), prerequisiteHelperSha256: hash(readFileSync(new URL('./cost-pair-coverage.mjs', import.meta.url))), served: [], rows: [], errors: [],
};
// Mechanical prerequisites are checked before opening any browser/context.
const sameMethod = proof => {
  assert.deepEqual(proof.source, result.source, 'Prerequisite current source/art identity');
  assert.equal(proof.harnessSha256, result.harnessSha256);
  assert.equal(proof.instrumentationSha256, result.instrumentationSha256);
  assert.equal(proof.contentAuditSha256, result.contentAuditSha256);
  assert.equal(proof.prerequisiteHelperSha256, result.prerequisiteHelperSha256);
  assert.equal(proof.replaySha256, result.replaySha256);
};
let prerequisiteBrowser;
if (!contentOnly) {
  const file = arg('--content-proof'); assert(file, 'All-six content proof required before timing');
  const proof = JSON.parse(readFileSync(file)); sameMethod(proof);
  assert(proof.status === 'PASS' && proof.contentOnly && proof.control && proof.rows.length === 18);
  assert.equal(new Set(proof.rows.map(r => `${r.id}:${r.width}:${r.rep}`)).size, 18);
  for (const id of ['fens', 'crypt', 'foundry']) for (const width of [400, 1440]) for (let rep = 0; rep < 3; rep++)
    assert(proof.rows.some(r => r.id === id && r.width === width && r.rep === rep && r.contentValid));
  prerequisiteBrowser = proof.browserVersion;
  result.contentPrerequisite = { file, sha256: hash(readFileSync(file)) };
}
if (!control) {
  const files = arg('--controls', '').split(',').filter(Boolean); assert(files.length, 'All-six matching A/A controls required');
  const controls = files.map(file => { const proof = JSON.parse(readFileSync(file)); sameMethod(proof); assert(proof.status === 'PASS' && proof.control && !proof.contentOnly); assert.equal(proof.browserVersion, prerequisiteBrowser); return proof; });
  const budgets = controls.flatMap(p => p.budgets);
  for (const id of ['fens', 'crypt', 'foundry']) for (const width of [400, 1440])
    assert(budgets.some(b => b.id === id && b.width === width && b.limitMs === 0.20 && b.withinBudget), 'Accepted same-scene A/A control');
  const file = arg('--off-equivalence'); assert(file, 'Current transformed archived-off pixel equivalence required');
  const proof = JSON.parse(readFileSync(file));
  assert(proof.status === 'PASS' && proof.comparisons.every(c => c.differentPixels === 0));
  assertSixPairCoverage(proof.comparisons);
  assert.deepEqual(proof.currentSource, result.source); assert.equal(proof.visualClock, 10000000);
  assert.equal(proof.instrumentationSha256, result.instrumentationSha256); assert.equal(proof.browserVersion, prerequisiteBrowser);
  result.controlPrerequisites = files.map(file => ({ file, sha256: hash(readFileSync(file)) }));
  result.offEquivalencePrerequisite = { file, sha256: hash(readFileSync(file)) };
}
const save = () => writeFileSync(`${output}/results.json`, JSON.stringify(result, null, 2) + '\n');
save();
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const log = createWriteStream(`${output}/vite.log`); await new Promise(r => log.once('open', r));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--config', 'tests/vite.test.config.ts'], { cwd: resolve('web'), stdio: ['ignore', log, log] });
let browser;
const pct = (values, p) => { const xs = [...values].sort((a, b) => a - b); return xs[Math.min(xs.length - 1, Math.floor(xs.length * p))]; };
try {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 150; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await launchGpu(); result.browserVersion = browser.version(); if (prerequisiteBrowser) assert.equal(result.browserVersion, prerequisiteBrowser);
  const context = await browser.newContext({ deviceScaleFactor: 1.5, reducedMotion: 'reduce', serviceWorkers: 'block' });
  for (const width of widths) for (const c of cases) for (let rep = 0; rep < 3; rep++) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: width === 400 ? 640 : 800 });
    page.on('pageerror', e => result.errors.push(String(e)));
    const atlasResponses = [], responseTasks = [];
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (path === '/art/atlas.png' || path === '/art/atlas.json')
        responseTasks.push(response.body().then(body => atlasResponses.push({ path, status: response.status(), sha256: hash(body) })));
    });
    await page.route(url, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>' }));
    for (const [name, instrument] of [['index.ts', instrumentFrozenVisualFrame], ['gputimer.ts', instrumentClockTaggedTimer]]) {
      await page.route(`**/src/render/${name}`, async route => {
        const response = await route.fetch(), original = await response.text();
        const body = instrument(original);
        result.served.push({ path: `/src/render/${name}`, width, id: c.id, rep, originalSha256: hash(original), instrumentedSha256: hash(body) });
        await route.fulfill({ response, body });
      });
    }
    await page.goto(url);
    const row = await page.evaluate(async ({ c, control, rep, contentOnly }) => {
      window.__landmarkVisualClock = 10000000;
      window.__landmarkSingleControl = control;
      window.__landmarkSingleLeg = 'baseline'; window.__landmarkSingleFrameId = -1;
      const renderer = await import('/src/render/index.ts');
      const canvas = document.querySelector('canvas');
      const v = renderer.createViewer(canvas, { baseTexels: 120 });
      const originalInput = JSON.stringify(c.floor);
      v.load(c.floor.snapshot); v.apply(c.floor.events.filter(e => e.k !== 'descend' && e.k !== 'exit')); v.seek(c.target); v.setSpeed(0); v.setFrame('map');
      const g = canvas.getContext('webgl2');
      const gpu = g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
      if (!/D3D12.*NVIDIA/.test(gpu)) throw Error(gpu);
      const raf = () => new Promise(r => requestAnimationFrame(r));
      const states = [], issued = [];
      let index = 0;
      const pattern = rep % 2 ? ['candidate', 'baseline', 'baseline', 'candidate'] : ['baseline', 'candidate', 'candidate', 'baseline'];
      const draw = async (forcedLeg, capture = false) => {
        const now = await raf();
        const leg = forcedLeg ?? pattern[index % 4];
        window.__landmarkSingleLeg = leg; window.__landmarkSingleFrameId = index;
        issued.push({ frame: index++, leg });
        if (typeof window.__landmarkSingleFrame !== 'function') throw Error('No shared frame registered');
        if (capture) window.__landmarkContentAudit.begin();
        window.__landmarkSingleFrame(now);
        let captured = null;
        if (capture) {
          const trace = window.__landmarkContentAudit.end();
          const pixels = new Uint8Array(g.drawingBufferWidth * g.drawingBufferHeight * 4);
          g.readPixels(0, 0, g.drawingBufferWidth, g.drawingBufferHeight, g.RGBA, g.UNSIGNED_BYTE, pixels);
          if (g.getError() !== g.NO_ERROR) throw Error('Framebuffer readback failed');
          if (!pixels.some((x, i) => i % 4 !== 3 && x > 0)) throw Error('Blank content proof framebuffer');
          captured = { leg, actualRaf: now, visualClock: window.__landmarkVisualClock, trace, pixels, png: canvas.toDataURL('image/png') };
        }
        const s = v.stats(), landmarks = v.debugLandmarks();
        states.push({ leg, frame: index - 1, clocks: { actualRaf: now, visualClock: window.__landmarkVisualClock }, landmarks: landmarks.length, allPainted: landmarks.every(p => p.painted), geometry: { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, device: s.device, target: s.target, camera: s.camera, projection: window.__landmarkSingleProjection, fx: s.fx, tick: s.tick, gpuTimer: s.gpuTimer, glLost: s.glLost } });
        return captured;
      };
      // Start the ordinary frame manually, including real atlas readiness/resize.
      for (let i = 0; i < 600; i++) { await draw(); if (v.stats().calls > 0) break; }
      if (!v.stats().calls) throw Error('No first paint');
      for (let i = 0; i < 480; i++) await draw();
      // Audit only non-timed frames. GPU/CPU/query clocks remain real and unmodified.
      window.__landmarkSingleControl = true;
      const captures = [];
      for (const leg of ['baseline', 'candidate', 'baseline', 'candidate']) captures.push(await draw(leg, true));
      const reference = captures[0];
      const comparisons = captures.map(x => ({ traceEqual: JSON.stringify(x.trace) === JSON.stringify(reference.trace), differentPixelBytes: x.pixels.reduce((n, b, i) => n + (b !== reference.pixels[i] ? 1 : 0), 0) }));
      const contentProof = { comparisons, restored: window.__landmarkContentAudit.restored(), frames: [] };
      for (const x of captures) {
        const digest = await crypto.subtle.digest('SHA-256', x.pixels);
        contentProof.frames.push({ leg: x.leg, actualRaf: x.actualRaf, visualClock: x.visualClock, trace: x.trace, pixelSha256: Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join(''), png: x.png });
      }
      window.__landmarkSingleControl = control;
      const contentValid = contentProof.restored && contentProof.comparisons.every(x => x.traceEqual && x.differentPixelBytes === 0);
      if (contentOnly || !contentValid) {
        const decoded = await createImageBitmap(await (await fetch('/art/atlas.png')).blob());
        const decodedAtlas = { width: decoded.width, height: decoded.height }; decoded.close();
        const stats = v.stats(); v.dispose();
        return { gpu, contentProof, contentValid, samples: [], states: [], issued, stats, decodedAtlas, exactInput: originalInput === JSON.stringify(c.floor) };
      }
      // Restore ordinary submission and re-warm after all content hashing/readback.
      for (let i = 0; i < 480; i++) await draw();
      window.__landmarkGPU = [];
      const startFrame = index;
      for (let i = 0; i < 2400; i++) {
        await draw();
        const samples = window.__landmarkGPU.filter(s => s.tag.frame >= startFrame);
        if (['baseline', 'candidate'].every(x => samples.filter(s => s.tag.leg === x).length >= 240)) break;
        if (!v.stats().gpuTimer) throw Error('GPU timer unavailable');
      }
      const samples = window.__landmarkGPU.filter(s => s.tag.frame >= startFrame);
      const stats = v.stats();
      const decoded = await createImageBitmap(await (await fetch('/art/atlas.png')).blob());
      const decodedAtlas = { width: decoded.width, height: decoded.height }; decoded.close();
      v.dispose();
      return { gpu, contentProof, contentValid, samples, states: states.filter(s => s.frame >= startFrame), issued, startFrame, stats, decodedAtlas, exactInput: originalInput === JSON.stringify(c.floor) };
    }, { c, control, rep, contentOnly });
    await Promise.all(responseTasks);
    for (const [i, frame] of row.contentProof.frames.entries()) {
      const prefix = `${c.id}-${width}-rep${rep}-content${i}`;
      const trace = Buffer.from(JSON.stringify(frame.trace));
      writeFileSync(`${output}/${prefix}.json.gz`, gzipSync(trace));
      writeFileSync(`${output}/${prefix}.png`, Buffer.from(frame.png.split(',')[1], 'base64'));
      frame.traceSha256 = hash(trace); frame.traceFile = `${prefix}.json.gz`; frame.framebufferFile = `${prefix}.png`;
      delete frame.trace; delete frame.png;
    }
    if (!row.contentValid) {
      result.rows.push({ width, id: c.id, rep, ...row }); save();
      throw Error('Actual A/A submitted-content or framebuffer mismatch before timing');
    }
    assert.equal(row.contentProof.frames.length, 4);
    assert(row.contentProof.frames.every((x, i, a) => x.visualClock === 10000000 && (i === 0 || x.actualRaf > a[i - 1].actualRaf)), 'Distinct real RAF clocks, fixed cosmetic clock');
    assert(row.decodedAtlas.width > 0 && row.decodedAtlas.height > 0);
    for (const path of ['/art/atlas.png', '/art/atlas.json']) {
      const responses = atlasResponses.filter(r => r.path === path);
      assert(responses.length > 0, `Actual atlas response:${path}`);
      for (const r of responses) { assert.equal(r.status, 200); assert.equal(r.sha256, result.source[`web/public${path}`]); }
    }
    assert(row.exactInput);
    assert.equal(result.errors.length, 0);
    if (contentOnly) { result.rows.push({ width, id: c.id, rep, atlasResponses, ...row }); save(); await page.close(); continue; }
    const issues = new Map(row.issued.map(x => [x.frame, x.leg]));
    const statesByFrame = new Map(row.states.map(s => [s.frame, s]));
    for (const sample of row.samples) {
      assert.equal(sample.tag.leg, issues.get(sample.tag.frame), 'Resolve query against issuing frame');
      assert.equal(sample.tag.leg, statesByFrame.get(sample.tag.frame)?.leg, 'Every sampled issuing frame has full geometry/art metadata');
      assert.equal(sample.tag.actualRaf, statesByFrame.get(sample.tag.frame).clocks.actualRaf);
      assert.equal(sample.tag.visualClock, 10000000);
      assert.equal(sample.disjoint, 0); assert(Number.isFinite(sample.ms));
    }
    for (const s of row.states) {
      assert.equal(s.clocks.visualClock, 10000000); assert(Number.isFinite(s.clocks.actualRaf));
      assert.deepEqual(s.geometry, row.states[0].geometry, 'Same context/viewport/camera/effects');
      assert.deepEqual(s.geometry.viewport, [width, width === 400 ? 640 : 800]);
      assert(s.geometry.projection && s.geometry.projection.frame === 'map', 'Actual snapped camera/projection/UV metadata required');
      assert(Math.abs(s.geometry.dpr - 1.5) < 0.001);
      assert.equal(s.geometry.tick, c.target); assert.equal(s.geometry.gpuTimer, true); assert.equal(s.geometry.glLost, false);
      assert(control || s.leg === 'baseline' ? s.landmarks === 0 : s.landmarks >= 6, 'Branch produces its declared draw plan');
      assert(s.allPainted, 'No fallback landmarks in painted candidate cost');
    }
    const p95 = Object.fromEntries(['baseline', 'candidate'].map(leg => {
      const ms = row.samples.filter(s => s.tag.leg === leg).map(s => s.ms);
      assert(ms.length >= 240, 'Enough actual resolved queries in each leg');
      return [leg, pct(ms, 0.95)];
    }));
    result.rows.push({ width, id: c.id, rep, target: c.target, p95, atlasResponses, ...row }); save(); await page.close();
  }
  result.budgets = contentOnly ? [] : widths.flatMap(width => cases.map(c => {
    const rows = result.rows.filter(r => r.width === width && r.id === c.id);
    const medians = Object.fromEntries(['baseline', 'candidate'].map(leg => [leg, pct(rows.map(r => r.p95[leg]), 0.5)]));
    const delta = medians.candidate - medians.baseline;
    return { width, id: c.id, medians, delta, limitMs: 0.20, withinBudget: (control ? Math.abs(delta) : delta) <= 0.20 };
  }));
  for (const p of paths) assert.equal(hash(readFileSync(p)), result.source[p], 'Frozen render/art source');
  result.status = (contentOnly ? result.rows.length === widths.length * cases.length * 3 : result.budgets.every(x => x.withinBudget)) ? 'PASS' : 'FAIL';
  result.finishedAtUtc = new Date().toISOString(); save();
  console.log(JSON.stringify({ status: result.status, scope: result.scope, budgets: result.budgets }));
  if (result.status !== 'PASS') process.exitCode = 1;
} catch (e) { result.status = 'FAIL'; result.error = String(e.stack ?? e); save(); throw e; }
finally { await browser?.close(); server.kill('SIGTERM'); log.end(); }
