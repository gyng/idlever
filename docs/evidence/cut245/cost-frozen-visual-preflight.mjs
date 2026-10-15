// CPU-only transformed-source and independent delayed-query/content-capture oracles.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { transformWithOxc } from '../../../web/node_modules/vite/dist/node/index.js';
import { instrumentFrozenVisualFrame, instrumentClockTaggedTimer, freezeVisualClock } from './cost-frozen-visual-instrumentation.mjs';
import { assertSixPairCoverage } from './cost-pair-coverage.mjs';
import { installContentAudit } from './cost-content-audit.mjs';
const [out] = process.argv.slice(2); assert(out && !existsSync(out));
const sha = x => createHash('sha256').update(x).digest('hex');
const rows = []; let timerModule;
for (const [path, instrument] of [['web/src/render/index.ts', instrumentFrozenVisualFrame], ['web/src/render/gputimer.ts', instrumentClockTaggedTimer]]) {
  const raw = readFileSync(path, 'utf8');
  const { code } = await transformWithOxc(raw, path, { lang: 'ts' });
  const body = instrument(code); await transformWithOxc(body, 'instrumented.js', { lang: 'js' });
  if (path.endsWith('index.ts')) {
    for (const s of ['const dt = Math.max(0, Math.min(250, now - last));', 'last = now;', 'quality.sample(dt, stats.cpuMs, now);', 'st.tick(dt * juice.timeScale(effectNow), now);', 'const t0 = performance.now();', 'const t1 = performance.now();', 'const t2 = performance.now();', 'gpu.begin();', 'gpu.end();']) assert(body.includes(s), `Original clock/site:${s}`);
    assert(body.includes('function frame(now) { globalThis.__landmarkActualRaf = now;'));
    assert(!body.includes('Math.sin(now * a') && !body.includes('Math.sin(now * b'));
    assert(body.includes('u.uTime.value = globalThis.__landmarkVisualClock / 1e3;'));
    assert(body.includes('function build(now) { now = globalThis.__landmarkVisualClock;'));
    assert(!body.includes('raf = requestAnimationFrame(frame);'));
    assert.equal(body.split('globalThis.__landmarkSingleFrame = frame;').length, 2);
    assert(!body.includes('performance.now ='));
  } else timerModule = body;
  rows.push({ path, sourceSha256: sha(raw), originalSha256: sha(code), instrumentedSha256: sha(body) });
}
const archived = execFileSync('tar', ['xOf', 'docs/evidence/cut245/renderer-before.tar.gz', 'web/src/render/index.ts'], { encoding: 'utf8' });
const archivedCode = (await transformWithOxc(archived, 'archived.ts', { lang: 'ts' })).code;
const archivedFrozen = freezeVisualClock(archivedCode); await transformWithOxc(archivedFrozen, 'archived-frozen.js', { lang: 'js' });
rows.push({ path: 'archived pre-landmark index.ts', sourceSha256: sha(archived), originalSha256: sha(archivedCode), instrumentedSha256: sha(archivedFrozen) });
const { GpuTimer } = await import(`data:text/javascript;base64,${Buffer.from(timerModule).toString('base64')}`);
let frame = 0, active = null, disjoint = false, next = 0;
const gl = { QUERY_RESULT_AVAILABLE: 'available', QUERY_RESULT: 'result', getExtension: () => ({ TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 }), isContextLost: () => false, getParameter: () => disjoint,
  createQuery: () => ({ id: next++ }), deleteQuery() {}, beginQuery(_, q) { assert.equal(active, null); active = q; q.frame = frame; }, endQuery() { assert(active); active = null; }, getQueryParameter(q, k) { return k === 'available' ? frame >= q.frame + 3 : (q.frame + 1) * 1e6; } };
globalThis.__landmarkGPU = []; const timer = new GpuTimer(gl);
const issue = () => { globalThis.__landmarkSingleLeg = frame % 2 ? 'candidate' : 'baseline'; globalThis.__landmarkSingleFrameId = frame; globalThis.__landmarkActualRaf = 100 + frame * 16.5; globalThis.__landmarkVisualClock = 10000000; timer.begin(); timer.end(); };
for (frame = 0; frame < 100; frame++) issue();
const before = globalThis.__landmarkGPU.length; assert(before >= 90);
for (const s of globalThis.__landmarkGPU) { assert.equal(s.ms, s.tag.frame + 1); assert.equal(s.tag.actualRaf, 100 + s.tag.frame * 16.5); assert.equal(s.tag.visualClock, 10000000); assert.equal(s.tag.leg, s.tag.frame % 2 ? 'candidate' : 'baseline'); assert.equal(s.disjoint, 0); }
disjoint = true; issue(); disjoint = false; const dropped = timer.disjoint; assert(dropped > 0);
for (frame = 101; frame < 107; frame++) issue();
for (const s of globalThis.__landmarkGPU.slice(before)) assert(s.tag.frame >= 100);
timer.dispose(); assert.equal(active, null);
const pairs = ['fens', 'crypt', 'foundry'].flatMap(id => [400, 1440].map(width => ({ id, width })));
assertSixPairCoverage(pairs);
assert.throws(() => assertSixPairCoverage([...pairs.slice(0, 5), pairs[0]]), /duplicate/);
assert.throws(() => assertSixPairCoverage([...pairs.slice(0, 5), { id: 'other', width: 400 }]), /Required original pair/);
// Independent mock actual-draw submission: multi-material groups, instance truncation,
// texture contents/uniform changes and restoration, rather than renderer source mirroring.
const mat = { type: 'ShaderMaterial', isShaderMaterial: true, vertexShader: 'vertex', fragmentShader: 'fragment', uniforms: { time: { value: 7 }, map: { value: { isTexture: true, image: { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 255]) }, matrix: { elements: [1, 0, 0, 0, 1, 0, 0, 0, 1] } } } } };
const geom = { isInstancedBufferGeometry: true, instanceCount: 2, drawRange: { start: 0, count: Infinity }, groups: [], attributes: { position: { count: 3, itemSize: 2, normalized: false, array: new Float32Array([0, 0, 1, 0, 0, 1]) }, uv: { isInstancedBufferAttribute: true, meshPerAttribute: 1, count: 4, itemSize: 2, normalized: false, array: new Float32Array([1, 2, 3, 4, 91, 92, 93, 94]) } } };
const camera = { matrixWorldInverse: { elements: [1, 2, 3] }, projectionMatrix: { elements: [4, 5, 6] } };
const object = { isMesh: true, type: 'Mesh', renderOrder: 1, matrixWorld: { elements: [7, 8, 9] }, onBeforeRender() {} };
const scene = { traverseVisible(fn) { fn(object); } };
const renderer = { getRenderTarget: () => null, getCurrentViewport(v) { return v.copy({ x: 0, y: 0, z: 10, w: 20 }); }, getScissor(v) { return v.copy({ x: 0, y: 0, z: 10, w: 20 }); }, getScissorTest: () => false, getClearColor(c) { return c.copy({ r: 0, g: 0, b: 0 }); }, getClearAlpha: () => 1,
  clear() {}, render(s, c) { for (const [g, m] of [[{ start: 0, count: 3 }, mat], [{ start: 3, count: 3 }, { ...mat, uniforms: { shade: { value: [0.2, 0.4, 0.6] } } }]]) object.onBeforeRender(this, s, c, geom, m, g); } };
const render = renderer.render, clear = renderer.clear, callback = object.onBeforeRender;
const audit = installContentAudit(renderer);
const capture = () => { audit.begin(); renderer.clear(true, true, false); renderer.render(scene, camera); const x = audit.end(); assert(audit.restored() && renderer.render === render && renderer.clear === clear && object.onBeforeRender === callback); return x; };
const a = capture(), b = capture(); assert.deepEqual(a, b); assert.equal(a.events.filter(x => x.kind === 'draw').length, 2); assert.deepEqual(a.events.find(x => x.kind === 'draw').geometry.attributes.uv.values, [1, 2, 3, 4]);
mat.uniforms.time.value = 8; assert.notDeepEqual(capture(), a); mat.uniforms.time.value = 7;
mat.uniforms.map.value.image.data[0] = 9; assert.notDeepEqual(capture(), a);
assert.notDeepEqual(a.events.filter(x => x.kind === 'draw')[0].material.uniforms, a.events.filter(x => x.kind === 'draw')[1].material.uniforms);
geom.attributes.position.isInterleavedBufferAttribute = true;
audit.begin(); assert.throws(() => renderer.render(scene, camera), /Interleaved attribute/);
assert.equal(object.onBeforeRender, callback); assert.throws(() => audit.end(), /No actual draws/); assert(audit.restored());
delete geom.attributes.position.isInterleavedBufferAttribute;
object.isInstancedMesh = true;
audit.begin(); assert.throws(() => renderer.render(scene, camera), /Instanced/); assert.throws(() => audit.end(), /No actual draws/); assert(audit.restored());
delete object.isInstancedMesh; object.onBeforeRender = function () { mat.uniforms.time.value++; };
audit.begin(); assert.throws(() => renderer.render(scene, camera), /Unsupported nonempty callback/); assert.throws(() => audit.end(), /No actual draws/); assert(audit.restored()); object.onBeforeRender = callback;
mat.onBeforeCompile = function () { mat.uniforms.time.value++; };
audit.begin(); assert.throws(() => renderer.render(scene, camera), /Unsupported nonempty callback/); assert.throws(() => audit.end(), /No actual draws/); assert(audit.restored());
writeFileSync(out, JSON.stringify({ recordedAtUtc: new Date().toISOString(), status: 'PASS CPU-only preparation', rows, delayedSamples: before, disjointDropped: dropped, contentMock: ['two actual submitted groups with distinct material uniforms', 'unsupported input rejects and restores callbacks', 'full active instance/vertex arrays', 'uniform change rejected', 'texture byte change rejected', 'original render/clear/callback restored', 'InstancedMesh/custom object/material callbacks fail closed', 'duplicate/missing off-equivalence pairs rejected'], sources: Object.fromEntries(['cost-frozen-visual-instrumentation.mjs', 'cost-content-audit.mjs', 'cost-frozen-visual-preflight.mjs', 'cost-pair-coverage.mjs'].map(p => [p, sha(readFileSync(new URL(p, import.meta.url)))])), scope: 'No actual GPU/content/framebuffer/control/candidate result' }, null, 2) + '\n');
console.log(`PASS CPU-only: real transformed modules; ${before} clock-tagged delayed samples; disjoint${dropped}; actual-draw mock input equality/restoration`);
