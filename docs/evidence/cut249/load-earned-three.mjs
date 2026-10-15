// Ordinary public load/save of a pre-retirement earned Session; never edits fields.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const input='docs/evidence/cut247/earned-three.prepared.session.json';
const out='docs/evidence/cut249/earned-three.loaded.session.json';assert(!existsSync(out));
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');assert.equal(sha(wasm),'8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff');initSync({module:wasm});
const bytes=readFileSync(input);const g=Game.fromSave(bytes.toString());const loaded=g.save();writeFileSync(out,loaded);g.free();
assert.equal(sha(readFileSync(input)),sha(bytes));
assert.equal(loaded,readFileSync('target/cut249-earned-three/loaded.session.json','utf8'),'Public WASM load exact native current load');
writeFileSync('docs/evidence/cut249/earned-three-load-provenance.json',JSON.stringify({utc:new Date().toISOString(),scope:'Actual public Game.fromSave/save, no grants/direct edits. Legacy Cut244 input drops8 retired empty batch.shelved fields, independently exact to archived c9fa load. No current continuation comparison normalized.',wasmSha256:sha(wasm),input,inputRawSha256:sha(bytes),output:out,outputRawSha256:sha(loaded),nativeLoadExact:true,inputUnchanged:true},null,2)+'\n');
