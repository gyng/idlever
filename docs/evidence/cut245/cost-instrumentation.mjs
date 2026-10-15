// Measurement-only served-module transformation, shared with the static preflight.
import assert from 'node:assert/strict';
export function instrumentFrame(original,leg,symmetric) {
 assert(['baseline','candidate'].includes(leg));
 const needle='const t0 = performance.now();';
 assert.equal(original.split(needle).length,2,'Exactly one production build/render entry required');
 let body=original.replace(needle,`if(globalThis.__landmarkCostLeg!==${JSON.stringify(leg)}) return; ${needle}`);
 if(symmetric) {
  const raf='raf = requestAnimationFrame(frame);';
  assert.equal(body.split(raf).length,3,'Exactly two production RAF scheduling sites required');
  // Preserve both ordinary frame functions; only the shared harness schedules them.
  body=body.replace(raf,'').replace(raf,`globalThis.__landmarkCostFrames[${JSON.stringify(leg)}] = frame;`);
 }
 return body;
}
