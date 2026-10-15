// Public actual earned Session parity. No grants, direct edits or normalized save/report checks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {Game,initSync} from '../../../web/src/engine/pkg/idlever_wasm.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const arg=n=>{const i=process.argv.indexOf(n);assert(i>=0&&process.argv[i+1],`Required ${n}`);return process.argv[i+1];};
const out=arg('--out'),expectedWasm=arg('--wasm-sha');
assert(out.startsWith('docs/evidence/cut249/'));assert(!existsSync(out),'Preserve earlier attempts');
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');assert.equal(sha(wasm),expectedWasm);initSync({module:wasm});mkdirSync(out,{recursive:true});
const result={utc:new Date().toISOString(),scope:'Immutable earned paid/unpaid one-resident and three-resident Sessions; exact public whole/sliced/reloaded8h reports/saves. Paid case also checks tick10energy88, complete watched RunRec and full held replay. No progression-policy, canonical pacing or fun claim.',wasmSha256:expectedWasm,scriptSha256:sha(readFileSync(new URL(import.meta.url))),cases:[]};
const outcome=({via,absence,clock_s,...rest})=>rest; // Only public-path annotations differ; originals retained.
for(const c of [
 {id:'paid-pace',path:'docs/evidence/cut248/earned-paid-pace.sent.session.json',residents:1},
 {id:'earned-one',path:'docs/evidence/cut247/earned-fighter-sword.sent.session.json',residents:1},
 {id:'earned-three',path:'docs/evidence/cut247/earned-three.prepared.session.json',residents:3},
]){
 const games=[];const entry={...c,checks:{},artifacts:{}};result.cases.push(entry);
 const artifact=(name,raw)=>{const path=`${out}/${c.id}.${name}.json.gz`;writeFileSync(path,gzipSync(raw));entry.artifacts[name]={path,rawSha256:sha(raw)};};
 const from=raw=>{const g=Game.fromSave(raw);games.push(g);return g;};
 try{
  const input=readFileSync(c.path,'utf8');entry.inputRawSha256=sha(input);const g=from(input);assert.equal(g.save(),input,'Legacy earned inputs load without rewrite');
  const sent=JSON.parse(input);assert.equal(1+Object.keys(sent.others??{}).length,c.residents);const runId=sent.run.id;
  if(c.id==='paid-pace'){
   assert.equal(sent.run.hero.pace,8);assert.equal(sent.lineage.gold,3021);
   const a=from(input),b=from(input);a.step(10);b.runOfflineSlice(1,false);
   const ar=JSON.parse(a.save()).run,br=JSON.parse(b.save()).run;assert.equal(ar.hero.energy,88);assert.equal(br.hero.energy,88);assert.deepEqual(ar,br);entry.checks.tenTicks=true;
   artifact('single10',a.save());artifact('batch10',b.save());
   const live=from(input);live.runOfflineSlice(720,false);const checkpoint=live.save();const loaded=from(checkpoint);assert.equal(loaded.save(),checkpoint);live.step(1);loaded.step(1);const seen=JSON.parse(live.save()).prov.find(p=>p.key==='seen:goblin_archer');assert.deepEqual([seen.t,seen.depth,seen.text],[7201,6,'goblin archer last seen D6']);assert.equal(loaded.save(),live.save(),'Every saved field exact at first old divergence');artifact('checkpoint7200',checkpoint);artifact('live7201',live.save());artifact('reloaded7201',loaded.save());entry.checks.firstLoss7201=true;
  }
  const reportRaw=g.runOfflineQuick(28800),after=g.save(),report=JSON.parse(reportRaw);assert.equal(report.runs,c.residents);
  artifact('report',reportRaw);artifact('after',after);
  for(const reload of [false,true]){
   let sliced=from(input),remaining=28800,i=0,raw;
   while(remaining>0){const seconds=Math.min(remaining,[1,719,3600][i++%3]);remaining-=seconds;raw=sliced.runOfflineSlice(seconds,remaining===0);if(reload&&remaining>0)sliced=from(sliced.save());}
   const label=reload?'reloaded':'sliced';artifact(label,sliced.save());artifact(`${label}-report`,raw);assert.equal(raw,reportRaw,'Entire report exact');assert.equal(sliced.save(),after,'Entire saved Session exact');entry.checks[label]=true;
  }
  if(c.residents===1){
   const actual=JSON.parse(g.lineage()).runs.find(r=>r.id===runId);assert(actual);entry.actual=actual;
   const replayRaw=g.replay(runId);assert.equal(g.save(),after,'Held replay is read-only');const replay=JSON.parse(replayRaw);assert.equal(replay.ticks,actual.turns);assert.equal(Math.max(...replay.floors.map(f=>f.snapshot.depth)),actual.depth);artifact('replay',replayRaw);entry.checks.actualReplay=true;
   const watched=from(input);let calls=0;while(!JSON.parse(watched.step(100)).run_over)assert(++calls<=1201);const rec=JSON.parse(watched.lineage()).runs.find(r=>r.id===runId);assert.deepEqual(outcome(rec),outcome(actual));assert.deepEqual(JSON.parse(watched.replay(runId)),replay,'Complete held replay exact');artifact('watched',watched.save());entry.watched=rec;entry.checks.actualWatched=true;entry.checks.completeReplay=true;
  }
  assert.equal(sha(readFileSync(c.path)),entry.inputRawSha256);entry.checks.inputUnchanged=true;entry.status='PASS';
 }catch(e){entry.status='FAIL';entry.error=String(e.stack??e);}
 finally{for(const g of games)g.free();}
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({id:c.id,status:entry.status,checks:entry.checks,error:entry.error}));
}
result.status=result.cases.every(c=>c.status==='PASS')?'PASS':'FAIL';result.finishedUtc=new Date().toISOString();writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');if(result.status!=='PASS')process.exitCode=1;
