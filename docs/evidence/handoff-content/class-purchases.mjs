// Legal paid class preparations from one earned camp; not outcome/causality acceptance.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const input='docs/evidence/handoff-content/departure-readiness-e62c/baseline.session.json.gz';
const source=gunzipSync(readFileSync(input)).toString(),wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
assert.equal(hash(wasm),'e62c0867b3b68c2546ba316f90d901e45547f9c80e229e86c7d6d145c62df71c');
initSync({module:wasm});
const out='docs/evidence/handoff-content/class-purchases-e62c';mkdirSync(out,{recursive:true});
const result={scope:'Five public lawful class preparations from one untouched earned camp; three exact paid mark unlocks, no funds/levels/items grants, zero sends or outcome/causality/R4 acceptance',input,inputRawSha256:hash(source),wasmSha256:hash(wasm),cases:[]};
for(const id of ['fighter','rogue','ranger','caster','gunner']){
 const g=Game.fromSave(source),before=JSON.parse(g.lineage()),beforeSave=g.save();
 assert.equal(beforeSave,source);
 const catalogue=JSON.parse(g.unlocks()),quote=catalogue.find(x=>x.id===id);
 const owned=id==='fighter'||before.unlocks.includes(id);
 const actions=[];
 if(!owned){assert(quote?.available&&!quote.owned);assert(before.marks>=quote.cost);g.buy(id);actions.push({method:'buy',id,cost:quote.cost,currency:'marks'});}
 g.setClass(id);actions.push({method:'setClass',id});
 const after=JSON.parse(g.lineage()),saved=g.save();
 assert.equal(after.class,id);assert.equal(after.clock_s,before.clock_s);assert.equal(after.gold,before.gold);assert.equal(after.marks,before.marks-(owned?0:quote.cost));assert.deepEqual(after.bloodline,before.bloodline);
 const path=`${out}/${id}.session.json.gz`;writeFileSync(path,gzipSync(saved));
 result.cases.push({id,ownedBefore:owned,quote,actions,goldBefore:before.gold,goldAfter:after.gold,marksBefore:before.marks,marksAfter:after.marks,clockBefore:before.clock_s,clockAfter:after.clock_s,path,saveSha256:hash(saved),lineage:after});g.free();
}
assert.equal(hash(gunzipSync(readFileSync(input))),result.inputRawSha256);result.exactSourceFile=true;result.status='PASS';
writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,cases:result.cases.map(({id,marksBefore,marksAfter,goldAfter})=>({id,marksBefore,marksAfter,goldAfter}))}));
