// Static transformation + delayed mock-query oracle only. No GPU performance evidence.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { transformWithOxc } from '../../../web/node_modules/vite/dist/node/index.js';
import { instrumentSingleFrame, instrumentIssueTaggedTimer } from './cost-single-instrumentation.mjs';
const [out] = process.argv.slice(2);
assert(out && !existsSync(out), 'Preserve each preflight result');
const sha = s => createHash('sha256').update(s).digest('hex');
const rows = [];
let timerModule;
for (const [path, instrument] of [
  ['web/src/render/index.ts', instrumentSingleFrame],
  ['web/src/render/gputimer.ts', instrumentIssueTaggedTimer],
]) {
  const raw = readFileSync(path, 'utf8');
  const { code } = await transformWithOxc(raw, path, { lang: 'ts' });
  const body = instrument(code);
  if (path.endsWith('index.ts')) {
    assert(!body.includes('raf = requestAnimationFrame(frame);'));
    assert.equal(body.split('globalThis.__landmarkSingleFrame = frame;').length, 2);
  } else timerModule = body;
  // Vite/Oxc must still accept the complete instrumented JavaScript module.
  await transformWithOxc(body, 'instrumented.js', { lang: 'js' });
  rows.push({ path, sourceSha256: sha(raw), originalSha256: sha(code), instrumentedSha256: sha(body) });
}
const { GpuTimer } = await import(`data:text/javascript;base64,${Buffer.from(timerModule).toString('base64')}`);
let frame = 0, active = null, nextId = 0, disjoint = false;
const gl = {
  QUERY_RESULT_AVAILABLE: 'available', QUERY_RESULT: 'result',
  getExtension: () => ({ TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 }),
  isContextLost: () => false,
  getParameter: () => disjoint,
  createQuery: () => ({ id: nextId++ }), deleteQuery: () => {},
  beginQuery: (_, q) => { assert.equal(active, null); active = q; q.issuedAt = frame; q.result = (frame + 1) * 1e6; },
  endQuery: () => { assert(active); active = null; },
  getQueryParameter: (q, key) => key === 'available' ? frame >= q.issuedAt + 3 : q.result,
};
globalThis.__landmarkGPU = [];
const timer = new GpuTimer(gl);
for (frame = 0; frame < 100; frame++) {
  globalThis.__landmarkSingleLeg = frame % 2 ? 'candidate' : 'baseline';
  globalThis.__landmarkSingleFrameId = frame;
  timer.begin(); timer.end();
}
assert(globalThis.__landmarkGPU.length >= 90, 'Delayed queries resolve through ring reuse');
for (const sample of globalThis.__landmarkGPU) {
  assert.equal(sample.ms, sample.tag.frame + 1, 'Sample bound to issuing frame, not resolving frame');
  assert.equal(sample.tag.leg, sample.tag.frame % 2 ? 'candidate' : 'baseline');
  assert.equal(sample.disjoint, 0);
}
const resolvedBeforeDisjoint = globalThis.__landmarkGPU.length;
disjoint = true; timer.begin(); timer.end(); disjoint = false;
const dropped = timer.disjoint;
assert(dropped > 0, 'Disjoint invalidates pending queries');
for (frame = 101; frame < 107; frame++) {
  globalThis.__landmarkSingleLeg = 'baseline'; globalThis.__landmarkSingleFrameId = frame;
  timer.begin(); timer.end();
}
for (const s of globalThis.__landmarkGPU.slice(resolvedBeforeDisjoint)) {
  assert(s.tag.frame >= 100, 'No pre-disjoint pending query survives');
  assert.equal(s.ms, s.tag.frame + 1);
}
timer.dispose(); assert.equal(active, null);
writeFileSync(out, JSON.stringify({
  recordedAtUtc: new Date().toISOString(),
  scope: 'Static transformed-module conformance and100 delayed mock GPU query/ring/issue-tag checks plus disjoint invalidation. No actual GPU, A/A, cost acceptance or baseline visual-equivalence result.',
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  instrumentationSha256: sha(readFileSync(new URL('./cost-single-instrumentation.mjs', import.meta.url))),
  rows, resolvedBeforeDisjoint, dropped, status: 'PASS',
}, null, 2) + '\n');
console.log(`PASS: transformed modules; ${resolvedBeforeDisjoint} issue-tagged delayed mock samples; disjoint dropped ${dropped}`);
