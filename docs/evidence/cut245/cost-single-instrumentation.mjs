// Measurement-only transformations. Never shipped with the product.
import assert from 'node:assert/strict';
const replaceOnce = (body, needle, replacement) => {
  assert.equal(body.split(needle).length, 2, `Exactly one instrumentation point: ${needle}`);
  return body.replace(needle, replacement);
};
export function instrumentSingleFrame(original) {
  const raf = 'raf = requestAnimationFrame(frame);';
  assert.equal(original.split(raf).length, 3, 'Two ordinary frame scheduling sites');
  let body = original.replace(raf, '').replace(raf, 'globalThis.__landmarkSingleFrame = frame;');
  const plan = /visibleLandmarkPieces\(\s*st\.landmarks,/g;
  assert.equal([...body.matchAll(plan)].length, 1, 'One landmark plan draw');
  body = body.replace(plan, 'visibleLandmarkPieces(globalThis.__landmarkSingleLeg === "candidate" && !globalThis.__landmarkSingleControl ? st.landmarks : [],');
  body = replaceOnce(body, '!st.landmarkArea.has(i)', '(globalThis.__landmarkSingleLeg !== "candidate" || globalThis.__landmarkSingleControl || !st.landmarkArea.has(i))');
  body = replaceOnce(body, 'stats.camera = [cam.tx, cam.ty];',
    'stats.camera = [cam.tx, cam.ty]; globalThis.__landmarkSingleProjection = { snapped:[camSX,camSY], position:camera.position.toArray(), projection:camera.projectionMatrix.toArray(), k, dpr, frame:mode, uv:[(1 + fx) / W,(1 + fy) / H] };');
  return body;
}
export function instrumentIssueTaggedTimer(original) {
  let body = replaceOnce(original, 'this.available = this.ext !== null;', 'this.available = this.ext !== null; this.__landmarkCostTags = [];');
  body = replaceOnce(body, 'this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);',
    'this.__landmarkCostTags[slot] = { leg: globalThis.__landmarkSingleLeg, frame: globalThis.__landmarkSingleFrameId }; this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);');
  body = replaceOnce(body, 'this.samples.push(this.ms);',
    'this.samples.push(this.ms); globalThis.__landmarkGPU?.push({ms:this.ms, tag:this.__landmarkCostTags[this.tail % RING], disjoint:this.disjoint});');
  body = replaceOnce(body, 'this.ring = [];', 'this.ring = []; this.__landmarkCostTags = [];');
  return body;
}
