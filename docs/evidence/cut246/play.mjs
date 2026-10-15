// Actual public send + one eight-hour absence per configured earned branch.
// Scout remains paused: one manual in-flight run, not a new automation policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const arg=(k,d)=>{const n=process.argv.indexOf(k);return n<0?d:process.argv[n+1];};
const rep=arg('--rep','1');assert(['1','2'].includes(rep));
const out=`docs/evidence/cut246/played-${rep}`;
assert(!existsSync(`${out}/results.json`),'Keep original played attempts');mkdirSync(out,{recursive:true});
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const preparedRaw=readFileSync('docs/evidence/cut246/prepared/results.json'),prepared=JSON.parse(preparedRaw);
assert.equal(prepared.status,'PASS');assert.equal(prepared.cases.length,10);assert.equal(hash(wasm),prepared.wasmSha256);
initSync({module:wasm});
const result={scope:'Actual manual public sends + eight-hour absences from10earned legal preparations; pausedScout preserved; descriptive within-class comparisons only',rep,wasmSha256:hash(wasm),preparedSha256:hash(preparedRaw),scriptSha256:hash(readFileSync(new URL(import.meta.url))),cases:[],errors:[]};
const save=()=>writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
try{
for(const c of prepared.cases){
 const raw=gunzipSync(readFileSync(c.path)).toString();assert.equal(hash(raw),c.saveSha256);
 const g=Game.fromSave(raw);assert.equal(g.save(),raw);
 const before=JSON.parse(g.lineage());assert.equal(before.class,c.id);assert.equal(before.tree.auto_send,false);
 const ready=before.starting_kits.equipment;
 const sent=JSON.parse(g.send()),sentRaw=g.save(),sentState=JSON.parse(sentRaw);
 assert.equal(sent.hero.class,c.id);assert.equal(sent.depth,1);
 assert.equal(sentState.run.hero.weapon.kind,c.weapon,'Actual first-sent weapon must match public configuration');
 const runId=sent.run.id;
 const prefix=`${out}/${c.id}-${c.weapon}`;
 writeFileSync(`${prefix}.sent-snapshot.json.gz`,gzipSync(JSON.stringify(sent)));
 writeFileSync(`${prefix}.sent-session.json.gz`,gzipSync(sentRaw));
 const reportRaw=g.runOfflineQuick(28800),report=JSON.parse(reportRaw),afterRaw=g.save(),after=JSON.parse(g.lineage());
 assert.equal(after.tree.auto_send,false,'No policy switch or extra automatic send');
 const replaySave=g.save(),replayRaw=g.replay(runId),replay=JSON.parse(replayRaw);
 assert.equal(g.save(),replaySave,'Read-only replay cannot mutate Session');
 assert(replay&&replay.run_id===runId,'Actual first-send replay must remain available');
 assert(replay.floors.length>0);assert.equal(replay.floors[0].snapshot.hero.class,c.id);
 writeFileSync(`${prefix}.report.json.gz`,gzipSync(reportRaw));
 writeFileSync(`${prefix}.after.session.json.gz`,gzipSync(afterRaw));
 writeFileSync(`${prefix}.after.lineage.json.gz`,gzipSync(JSON.stringify(after)));
 writeFileSync(`${prefix}.replay.json.gz`,gzipSync(replayRaw));
 const eventKinds={};for(const f of replay.floors)for(const e of f.events)eventKinds[e.k]=(eventKinds[e.k]??0)+1;
 const sampleActions=replay.floors.flatMap(f=>f.events.filter(e=>e.k==='attack'||e.k==='row'||e.k==='exit'||e.k==='reload'||e.k==='callout').slice(0,8).map(e=>({depth:f.snapshot.depth,...e}))).slice(0,80);
 result.cases.push({id:c.id,weapon:c.weapon,input:c.path,inputRawSha256:hash(raw),runId,clockBefore:before.clock_s,clockAfter:after.clock_s,goldBefore:before.gold,goldAfter:after.gold,marksBefore:before.marks,marksAfter:after.marks,classBefore:before.classes[c.id],classAfter:after.classes[c.id],ready,firstSentHero:sent.hero,firstSentWeapon:sentState.run.hero.weapon,replay:{hash:replay.hash,ticks:replay.ticks,floors:replay.floors.map(f=>({depth:f.snapshot.depth,biome:f.snapshot.biome,hero:f.snapshot.hero,events:f.events.length})),eventKinds,sampleActions},outputs:{sentSnapshotSha256:hash(JSON.stringify(sent)),sentSessionSha256:hash(sentRaw),reportSha256:hash(reportRaw),afterSessionSha256:hash(afterRaw),replaySha256:hash(replayRaw)},report});
 assert.equal(hash(gunzipSync(readFileSync(c.path))),c.saveSha256);g.free();save();
 console.log(JSON.stringify({rep,id:c.id,weapon:c.weapon,runId,replayTicks:replay.ticks,maxDepth:Math.max(...replay.floors.map(f=>f.snapshot.depth)),goldAfter:after.gold}));
}
assert.equal(result.cases.length,10);result.status='PASS';save();
}catch(e){result.status='FAIL';result.errors.push(String(e.stack??e));save();throw e;}
