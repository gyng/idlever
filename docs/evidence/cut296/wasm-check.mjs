// Public transport parity for the three actual earned branches; no state grants.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import init, { Game } from '../../../web/src/engine/pkg/idlever_wasm.js';
const sha = b => createHash('sha256').update(b).digest('hex');
const wasm = readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
await init({ module_or_path: wasm });
const cases = [];
for (const label of ['no-selection', 'parent-only', 'selected']) {
  const root = `target/cut296/candidate/pair/${label}`;
  const raw = readFileSync(`${root}/prepared.session.json`, 'utf8');
  const game = Game.fromSave(raw);
  const canonical = game.save();
  // Native reloading of prepared input is implicit in this parity assertion: the
  // actual native campaign output is the immutable full-transport reference.
  let report;
  for (let slice = 1; slice <= 480; slice++) report = JSON.parse(game.runOfflineSlice(60, slice === 480));
  assert.deepEqual(report, JSON.parse(readFileSync(`${root}/report.json`, 'utf8')));
  const after = game.save();
  assert.equal(after, readFileSync(`${root}/after.session.json`, 'utf8'));
  const lineage = JSON.parse(after).lineage;
  cases.push({ label, inputSha256: sha(raw), canonicalInputSha256: sha(canonical), afterSha256: sha(after), nativeWasmReportExact: true, nativeWasmWholeSaveBytesExact: true, gold: lineage.gold });
  game.free();
}
writeFileSync('docs/evidence/cut296/wasm-results.json', JSON.stringify({ status: 'PASS', wasm: { bytes: wasm.length, sha256: sha(wasm) }, transport: '480 public runOfflineSlice(60,last) calls per actual earned branch', cases }, null, 2) + '\n');
console.log('PASS three earned native/WASM reports and complete after-save bytes');
