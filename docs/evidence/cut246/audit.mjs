// Independent stricter audit: actual reported history vs reconstructed replay;
// determinism of both complete experiment repetitions does not imply their equivalence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const reps=['1','2'].map(n=>read(`docs/evidence/cut246/played-${n}/results.json`));
assert(reps.every(r=>r.status==='PASS'&&r.cases.length===10));
assert.equal(reps[0].wasmSha256,reps[1].wasmSha256);assert.equal(reps[0].preparedSha256,reps[1].preparedSha256);assert.equal(reps[0].scriptSha256,reps[1].scriptSha256);
const rows=[];
for(let i=0;i<10;i++){
 const a=reps[0].cases[i],b=reps[1].cases[i];
 assert.equal(a.id,b.id);assert.equal(a.weapon,b.weapon);assert.equal(a.inputRawSha256,b.inputRawSha256);
 const deterministic=JSON.stringify(a.outputs)===JSON.stringify(b.outputs);
 const l=read(`docs/evidence/cut246/played-1/${a.id}-${a.weapon}.after.lineage.json.gz`),actual=l.runs.find(r=>r.id===a.runId);
 assert(actual);const maxReplayDepth=Math.max(...a.replay.floors.map(f=>f.depth));
 assert.equal(a.report.runs,1,'Paused Scout permits only the explicitly sent run');
 assert.equal(a.report.deepest,actual.depth);
 rows.push({id:a.id,weapon:a.weapon,runId:a.runId,repeatOutputsExact:deterministic,actual:{depth:actual.depth,turns:actual.turns,exit:actual.tier,reason:actual.reason,gold:actual.gold},replay:{depth:maxReplayDepth,ticks:a.replay.ticks,hash:a.replay.hash},replayEquivalent:actual.depth===maxReplayDepth&&actual.turns===a.replay.ticks,economy:{goldBefore:a.goldBefore,goldAfter:a.goldAfter,earned:a.report.gold.earned,credited:a.report.gold.home,lost:a.report.gold.lost,spent:a.report.gold.spent_by_workers},firstSentWeapon:a.firstSentWeapon,firstSentHero:a.firstSentHero,actualActions:a.report.exits.map(e=>({exit:e.tier,reason:e.reason,end:e.end,reached:e.reached,carried:e.carried,kept:e.kept,trace:e.trace,meters:e.meters}))});
}
const result={scope:'Exact reproducibility plus stricter actual-history/replay equivalence audit. Actual report traces remain distinct from reconstructed events.',wasmSha256:reps[0].wasmSha256,preparedSha256:reps[0].preparedSha256,repeatExact:rows.every(r=>r.repeatOutputsExact),replayEquivalent:rows.every(r=>r.replayEquivalent),rows};
writeFileSync('docs/evidence/cut246/audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({repeatExact:result.repeatExact,replayEquivalent:result.replayEquivalent,mismatchedReplays:rows.filter(r=>!r.replayEquivalent).length,outcomes:rows.map(({id,weapon,actual})=>({id,weapon,...actual}))}));
if(!result.repeatExact||!result.replayEquivalent)process.exitCode=1;
