// Public minimal reload provenance red; no grants, state edits or normalized comparisons.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const out='docs/evidence/cut248/reload-provenance-red'; assert(!existsSync(out));mkdirSync(out);
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');assert.equal(sha(wasm),'c9fad4700566cc164e290e6d98a21555056d3e6da80ba4d0920ac3edd013107d');initSync({module:wasm});
const input=readFileSync('docs/evidence/cut248/earned-paid-pace.sent.session.json','utf8');
const live=Game.fromSave(input);live.runOfflineSlice(720,false);const checkpoint=live.save();const loaded=Game.fromSave(checkpoint);assert.equal(loaded.save(),checkpoint);
const artifacts={};const save=(name,raw)=>{const path=`${out}/${name}.json.gz`;writeFileSync(path,gzipSync(raw));artifacts[name]={path,rawSha256:sha(raw)};};save('checkpoint7200',checkpoint);
const before=JSON.parse(checkpoint);let first=null;
for(let tick=7201;tick<=7210;tick++){
 live.step(1);loaded.step(1);const a=JSON.parse(live.save()),b=JSON.parse(loaded.save());
 save(`live-${tick}`,live.save());save(`loaded-${tick}`,loaded.save());
 if(JSON.stringify(a.prov)!==JSON.stringify(b.prov)){first={tick,liveProv:a.prov,loadedProv:b.prov,serializedRunExact:JSON.stringify(a.run)===JSON.stringify(b.run),eventsExact:JSON.stringify(a.events)===JSON.stringify(b.events)};break;}
}
const result={utc:new Date().toISOString(),scope:'Actual earned paid pace8 live-vs-loaded continuation; preserve complete provenance differences.',wasmSha256:sha(wasm),inputSha256:sha(input),checkpointTick:before.run.turn,firstDivergence:first,artifacts,inputUnchanged:sha(readFileSync('docs/evidence/cut248/earned-paid-pace.sent.session.json'))===sha(input)};
writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checkpointTick:result.checkpointTick,firstDivergence:first}));live.free();loaded.free();assert(first,'Expected preserved pre-fix red');
