// Successor only. Original advancing-clock instrumentation and failed runs remain immutable.
import assert from 'node:assert/strict';
import { instrumentSingleFrame, instrumentIssueTaggedTimer } from './cost-single-instrumentation.mjs';
import { installContentAudit } from './cost-content-audit.mjs';
const once = (body, needle, replacement) => {
  assert.equal(body.split(needle).length, 2, `Exactly one visual-clock site:${needle}`);
  return body.replace(needle, replacement);
};
export function freezeVisualClock(original) {
  let body = once(original, 'function build(now) {', 'function build(now) { now = globalThis.__landmarkVisualClock; if (!Number.isFinite(now)) throw Error("Missing fixed visual clock");');
  body = once(body, 'Math.sin(now * a + i * 1.7)', 'Math.sin(globalThis.__landmarkVisualClock * a + i * 1.7)');
  body = once(body, 'Math.sin(now * b + i * 4.1)', 'Math.sin(globalThis.__landmarkVisualClock * b + i * 4.1)');
  body = once(body, 'u.uTime.value = now / 1e3;', 'u.uTime.value = globalThis.__landmarkVisualClock / 1e3;');
  return body;
}
export function instrumentFrozenVisualFrame(original) {
  let body = freezeVisualClock(instrumentSingleFrame(original));
  body = once(body, 'renderer.setPixelRatio(1);', `renderer.setPixelRatio(1); globalThis.__landmarkContentAudit = (${installContentAudit.toString()})(renderer);`);
  body = once(body, 'function frame(now) {', 'function frame(now) { globalThis.__landmarkActualRaf = now;');
  return body;
}
export function instrumentClockTaggedTimer(original) {
  let body = instrumentIssueTaggedTimer(original);
  body = once(body, 'frame: globalThis.__landmarkSingleFrameId', 'frame: globalThis.__landmarkSingleFrameId, actualRaf: globalThis.__landmarkActualRaf, visualClock: globalThis.__landmarkVisualClock');
  return body;
}
