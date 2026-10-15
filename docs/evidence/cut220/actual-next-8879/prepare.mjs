// Earned public-API preparation only; no grants, raw state edits or retrospective replay changes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../../web/src/engine/pkg/idlever_wasm.js';
const out='docs/evidence/cut220/actual-next-8879';
const sha=b=>createHash('sha256').update(b).digest('hex');
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
assert.equal(sha(wasm),'8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff');initSync({module:wasm});
const input='docs/evidence/handoff-menus/input.game.json.gz',compressed=readFileSync(input),raw=gunzipSync(compressed).toString();
const result={at:new Date().toISOString(),scope:'Two independent actual-away equipment intent changes from unchanged earned input/current8879. No grants, purchases, simulation absence, old replay rewrite or paper-doll visual acceptance.',wasm:{sha256:sha(wasm),bytes:wasm.length},input:{path:input,gzipSha256:sha(compressed),rawSha256:sha(raw)},files:[],cases:[],refusals:[]};
const emit=(name,value)=>{const text=typeof value==='string'?value:JSON.stringify(value,null,2)+'\n';const bytes=gzipSync(text,{mtime:0});const path=`${out}/${name}.json.gz`;writeFileSync(path,bytes,{flag:'wx'});result.files.push({path,gzipSha256:sha(bytes),rawSha256:sha(text),bytes:bytes.length});};
const save=()=>writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
try{
 const g=Game.fromSave(raw),canonical=g.save(),before=JSON.parse(g.lineage());emit('canonical-parent.session',canonical);emit('canonical-parent.lineage',before);
 assert.equal(before.persistent_hero.state,'ready');
 for(const kind of ['sword','bow'])assert(before.starting_kits.weapons.some(w=>w.kind===kind&&w.available&&w.compatible));
 const config=structuredClone(before.starting_kits.current);assert(config);assert.equal(config.pins.helm,'ironcap');config.weapon='sword';
 g.setStartingKit(JSON.stringify(config));g.setStart(1);const ready=JSON.parse(g.lineage());assert.equal(ready.gold,before.gold);emit('ready-sword.session',g.save());emit('ready-sword.lineage',ready);
 const snapshot=JSON.parse(g.send());emit('actual-sent.snapshot',snapshot);emit('actual-sent.session',g.save());
 g.step(1);const awaySave=g.save(),away=JSON.parse(g.lineage()),run=JSON.parse(awaySave).run;assert.equal(away.persistent_hero.state,'away');assert.equal(away.starting_kits.equipment.actual.slots.find(s=>s.slot==='weapon').kind,'sword');assert.equal(away.starting_kits.equipment.actual.slots.find(s=>s.slot==='helm').kind,'ironcap');emit('actual-away.session',awaySave);emit('actual-away.lineage',away);
 result.actions=[{method:'setStartingKit',config},{method:'setStart',depth:1},{method:'send',runId:run.id,depth:snapshot.depth},{method:'step',ticks:1}];result.preparation={goldBefore:before.gold,goldReady:ready.gold,goldAfterSend:away.gold,owner:away.selected_bloodline,clock:away.clock_s,runId:run.id};
 for(const [id,mutate]of [['weapon-bow',c=>c.weapon='bow'],['helm-empty',c=>c.pins.helm='none']]){
  const fork=Game.fromSave(awaySave),cfg=structuredClone(config);mutate(cfg);const beforeFork=fork.save();assert.equal(beforeFork,awaySave);
  try{fork.setStartingKit(JSON.stringify(cfg));}catch(e){result.refusals.push({id,error:String(e),exactSave:fork.save()===beforeFork});save();throw e;}
  const after=JSON.parse(fork.lineage()),saved=fork.save(),equipment=after.starting_kits.equipment;
  assert.equal(after.gold,away.gold);assert.equal(after.clock_s,away.clock_s);assert.equal(after.selected_bloodline,away.selected_bloodline);assert.deepEqual(JSON.parse(saved).run,run);assert.deepEqual(equipment.actual,away.starting_kits.equipment.actual);assert(equipment.queued);
  const target=id==='weapon-bow'?'weapon':'helm',next=id==='weapon-bow'?'bow':null;
  assert.equal(equipment.next.slots.find(s=>s.slot===target).kind,next);
  emit(id+'.session',saved);emit(id+'.lineage',after);result.cases.push({id,action:{method:'setStartingKit',config:cfg},gold:after.gold,owner:after.selected_bloodline,clock:after.clock_s,queued:equipment.queued,actual:equipment.actual,next:equipment.next,exactActualActor:true});fork.free();
 }
 assert.equal(g.save(),awaySave);assert.equal(sha(readFileSync(input)),result.input.gzipSha256);assert.equal(sha(readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm')),result.wasm.sha256);g.free();result.status='PASS';save();console.log(JSON.stringify({status:result.status,cases:result.cases.map(x=>({id:x.id,queued:x.queued,gold:x.gold,owner:x.owner})),files:result.files.length}));
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}
