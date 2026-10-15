// Ten lawful weapon comparisons. Preparation only; no sends, simulation, or grant.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
assert.equal(hash(wasm),'e62c0867b3b68c2546ba316f90d901e45547f9c80e229e86c7d6d145c62df71c');
initSync({module:wasm});
const out='docs/evidence/cut246/prepared';
assert(!existsSync(`${out}/results.json`),'Keep original preparation results; use a separate version for revisions');
mkdirSync(out,{recursive:true});
const result={scope:'Legal earned preparation only; no outcomes/identity superiority/R4 completion claim',wasmSha256:hash(wasm),scriptSha256:hash(readFileSync(new URL(import.meta.url))),parents:[],cases:[],errors:[]};
const save=()=>writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
const wire=(g)=>JSON.parse(g.lineage());
try {
for(const [id,weapons] of Object.entries({fighter:['sword','crownsplitter'],rogue:['dagger','crownsplitter'],ranger:['bow','sword'],caster:['dagger','bow'],gunner:['long_gun','short_gun']})){
 const input=`docs/evidence/handoff-content/class-purchases-e62c/${id}.session.json.gz`;
 const bytes=readFileSync(input),raw=gunzipSync(bytes).toString(),g=Game.fromSave(raw);
 assert.equal(g.save(),raw,'Canonical class parent must load exactly');
 const before=wire(g),actions=[];
 assert.equal(before.class,id);
 const start=JSON.parse(g.setStart(1));actions.push({method:'setStart',depth:1});
 assert.equal(start.start,1);assert.equal(start.gold,before.gold);assert.equal(start.clock_s,before.clock_s);
 if(id==='gunner'){
  const quote=start.guns.find(x=>x.kind==='short_gun');assert(quote.available&&before.gold>=quote.price);
  const paid=JSON.parse(g.buyKit('short_gun'));actions.push({method:'buyKit',slot:'short_gun',quote,goldBefore:start.gold,goldAfter:paid.gold});
  assert.equal(paid.gold,start.gold-quote.price);
 }
 const parent=wire(g),parentSave=g.save(),parentPath=`${out}/${id}-common.session.json.gz`;
 writeFileSync(parentPath,gzipSync(parentSave));
 result.parents.push({id,input,inputGzipSha256:hash(bytes),inputRawSha256:hash(raw),actions,parentPath,parentSaveSha256:hash(parentSave),clock:parent.clock_s,gold:parent.gold,marks:parent.marks});
 writeFileSync(`${out}/${id}-common.lineage.json.gz`,gzipSync(JSON.stringify(parent)));
 for(const weapon of weapons){
  const branch=Game.fromSave(parentSave);let after,choice;
  if(id==='gunner'){
   choice=parent.guns.find(x=>x.kind===weapon);assert(choice.available&&choice.owned&&choice.price===0);
   after=JSON.parse(branch.buyKit(weapon));
  }else{
   choice=parent.starting_kits.weapons.find(x=>x.kind===weapon);assert(choice?.available&&choice.compatible,`${id}/${weapon} must be genuinely owned and compatible`);
   const config={...parent.starting_kits.current,weapon};
   after=JSON.parse(branch.setStartingKit(JSON.stringify(config)));
  }
  assert.equal(after.gold,parent.gold);assert.equal(after.marks,parent.marks);assert.equal(after.clock_s,parent.clock_s);
  assert.deepEqual(after.bloodline,parent.bloodline);assert.deepEqual(after.party,parent.party);
  assert.deepEqual(after.tree,parent.tree);assert.deepEqual(after.packages,parent.packages);
  const expected=after.starting_kits.equipment.next.slots.find(x=>x.slot==='weapon');assert.equal(expected.kind,weapon);
  const configured=branch.save(),path=`${out}/${id}-${weapon}.session.json.gz`;
  writeFileSync(path,gzipSync(configured));
  writeFileSync(`${out}/${id}-${weapon}.lineage.json.gz`,gzipSync(JSON.stringify(after)));
  result.cases.push({id,weapon,path,saveSha256:hash(configured),parentSaveSha256:hash(parentSave),choice,clock:after.clock_s,gold:after.gold,marks:after.marks,equipment:after.starting_kits.equipment,config:after.starting_kits.current,classProgress:after.classes[id],sourceInput:input,selectionCost:0});
  assert.equal(g.save(),parentSave,'Branch cannot mutate common parent');branch.free();save();
 }
 assert.equal(hash(readFileSync(input)),hash(bytes));g.free();
}
assert.equal(result.cases.length,10);result.status='PASS';save();
console.log(JSON.stringify({status:result.status,cases:result.cases.map(({id,weapon,gold,marks})=>({id,weapon,gold,marks}))}));
}catch(e){result.status='FAIL';result.errors.push(String(e.stack??e));save();throw e;}
