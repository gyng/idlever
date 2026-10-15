// Paired real WASM read: public constructor/free house or exact immutable earned Session load.
// No grants, purchases, time advance, policy selection or direct state editing.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { Game, initSync } from '../../../../web/src/engine/pkg/idlever_wasm.js';
const hash = b => createHash('sha256').update(b).digest('hex');
const wasm = readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
initSync({ module: wasm });
const read = f => f.endsWith('.gz') ? gunzipSync(readFileSync(f)) : readFileSync(f);
const parse = x => typeof x === 'string' ? JSON.parse(x) : x;
const cases = [
  { id: 'fresh1', seed: 1 },
  { id: 'fresh16', seed: 16 },
  { id: 'earned-one-prepared', input: 'docs/evidence/cut244/baseline/final-one/prepared.session.json.gz' },
  { id: 'earned-three-prepared', input: 'docs/evidence/cut244/baseline/final-three/prepared.session.json.gz' },
  { id: 'earned-three-after8h', input: 'docs/evidence/cut244/baseline/final-three/whole.session.json.gz' },
];
const results = [];
for (const spec of cases) {
  const g = new Game(spec.seed ?? 244);
  let inputHash;
  if (spec.input) { const b = read(spec.input); inputHash = hash(b); g.load(b.toString()); }
  else g.buildTown('house');
  results.push({ ...spec, sourceInputRawSha256: inputHash, publicActions: spec.input ? ['load exact Session'] : ['constructor', 'buildTown house'], catalogue: parse(g.unlocks()), lineage: parse(g.lineage()) });
  if (spec.input && hash(read(spec.input)) !== inputHash) throw Error('Input changed');
  g.free();
}
writeFileSync(process.argv[2], JSON.stringify({ wasm: { bytes: wasm.length, sha256: hash(wasm) }, cases: results }, null, 2) + '\n');
console.log(JSON.stringify({ wasmSha256: hash(wasm), cases: results.map(x => ({ id: x.id, catalogue: x.catalogue.length })) }));
