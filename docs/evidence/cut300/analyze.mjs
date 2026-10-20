import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { evaluateClaim } from '../../../tools/stat-bounds.mjs';
import { parseExactJSON } from '../../../tools/exact-json.mjs';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_k,v) => v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
export const jobKey = (runtime, seed, specDigest) => sha(`${runtime}\0${seed}\0${specDigest}`);
const integerString = v => Number.isSafeInteger(v) ? String(v) : v?.$integer;
export function validatePacket(raw, seeds, spec) {
 const p = parseExactJSON(raw);
 assert.equal(p.kind,'dayplayer-stat-probe'); assert.equal(p.schema,1);
 assert.equal(canonical(p.request),canonical({seeds,bots:spec.probe.bots,days:spec.probe.days,until_depth:spec.probe.until_depth,checkins_per_day:spec.probe.checkins_per_day}));
 assert.equal(canonical(p.balance),canonical(spec.expected_balance));
 assert.equal(p.records.length,seeds.length*2);
 assert.equal(canonical(p.milestones),canonical([8,13,18,23,28,29,33]));
 const records = new Map();
 for(const r of p.records) {
  assert.ok(seeds.includes(r.seed)); assert.ok(spec.probe.bots.includes(r.bot));
  assert.equal(integerString(r.seed_out.seed),r.seed,'lossless duplicated u64 identity');
  const k=`${r.seed}/${r.bot}`; assert.ok(!records.has(k));
  assert.equal(r.effective_checkins_per_day,3);
  assert.ok(Number.isFinite(r.observed_hours) && r.observed_hours>0 && r.observed_hours<=336);
  assert.equal(r.seed_out.hours.length,p.milestones.length);
  for(const [i,h]of r.seed_out.hours.entries()) {
   assert.ok(h===null || Number.isFinite(h) && h>0 && h<=r.observed_hours && h%8===0);
   assert.equal(h===null,r.best_depth<p.milestones[i],'milestone/record depth consistency');
  }
  assert.equal(r.depth_reached_hours,r.seed_out.hours[p.milestones.indexOf(33)]);
  if(r.stop_reason==='depth') { assert.ok(r.best_depth>=33); assert.equal(r.depth_reached_hours,r.observed_hours); }
  else { assert.equal(r.stop_reason,'horizon'); assert.equal(r.depth_reached_hours,null); assert.equal(r.observed_hours,336); assert.ok(r.best_depth<33); }
  records.set(k,r);
 }
 assert.equal(records.size,seeds.length*2);
 return { packet:p,records };
}
export function analyze(spec, roleRecords, n) {
 assert.ok(spec.looks.includes(n));
 const alpha = (spec.family_alpha-spec.coupling_reserve)/spec.claims.length/spec.looks.length;
 const seeds=spec.seeds.slice(0,n);
 const arrival=(role,seed,bot,depth) => {
  const record=roleRecords[role].get(`${seed}/${bot}`); assert.ok(record,'missing paired observation');
  const h=record.seed_out.hours[[8,13,18,23,28,29,33].indexOf(depth)];
  return {value:h??spec.cap_hours,censored:h===null};
 };
 const claims=spec.claims.map(claim=> {
  const samples=seeds.map(seed=> {
   if(claim.comparison==='candidate-ratio') {
    const a=arrival('candidate',seed,'PICKED',33),b=arrival('candidate',seed,'TUNED',33);
    return {seed,value:a.value/b.value,candidateCensored:a.censored||b.censored,baselineCensored:false};
   }
   const a=arrival('candidate',seed,claim.bot,claim.depth),b=arrival('shipping',seed,claim.bot,claim.depth);
   return {seed,value:a.value-b.value,candidateCensored:a.censored,baselineCensored:b.censored};
  });
  const config={estimand:claim.estimand,direction:claim.direction,threshold:claim.threshold};
  return {...claim,...evaluateClaim(samples.map(x=>x.value),config,alpha),samples,candidateCensored:samples.filter(x=>x.candidateCensored).length,baselineCensored:samples.filter(x=>x.baselineCensored).length};
 });
 const d33Censored=Object.values(roleRecords).reduce((sum,map)=>sum+seeds.reduce((s,seed)=>s+spec.probe.bots.filter(bot=>map.get(`${seed}/${bot}`).depth_reached_hours===null).length,0),0);
 let status='INCONCLUSIVE';
 if(claims.some(c=>c.status==='FAIL')) status='STATISTICALLY_REJECTED';
 else if(claims.every(c=>c.status==='PASS')) status=d33Censored?'ACCEPTED_BUT_CENSORED':'STATISTICALLY_ACCEPTED';
 return {n,status,d33Censored,alphaPerClaimLook:alpha,familyAlpha:spec.family_alpha,couplingReserve:spec.coupling_reserve,claims,canonicalGateStatus:'NOT_RUN',defaultAdoption:false};
}
export function loadRecords(spec, specDigest, out, n) {
 const records={shipping:new Map(),candidate:new Map()}; const receipts=[];
 for(const name of readdirSync(join(out,'packets')).filter(n=>n.endsWith('.receipt.json')).sort()) {
  const receipt=JSON.parse(readFileSync(join(out,'packets',name),'utf8'));
  if(receipt.end>n) continue;
  assert.ok(receipt.start===0&&receipt.end===16 || receipt.start===16&&receipt.end===32);
  assert.equal(receipt.nativeExit,0);
  const runtime=spec.runtimes[receipt.role]; assert.ok(runtime);
  assert.equal(receipt.runtimeSha256,runtime.sha256); assert.equal(receipt.specSha256,specDigest);
  const raw=readFileSync(join(out,'packets',receipt.packet));assert.equal(sha(raw),receipt.packetSha256);
  const seeds=spec.seeds.slice(receipt.start,receipt.end);
  assert.deepEqual(receipt.jobKeys,seeds.map(seed=>jobKey(runtime.sha256,seed,specDigest)));
  const validated=validatePacket(raw.toString(),seeds,spec);
  for(const [k,v]of validated.records) {assert.ok(!records[receipt.role].has(k),'overlapping batches');records[receipt.role].set(k,v);}
  receipts.push(receipt);
 }
 for(const role of Object.keys(records)) assert.equal(records[role].size,n*2,'incomplete fixed look');
 return {records,receipts};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [specFile,out,nText]=process.argv.slice(2),raw=readFileSync(specFile),spec=JSON.parse(raw);
 const n=Number(nText); const {records,receipts}=loadRecords(spec,sha(raw),out,n);
 const report={...analyze(spec,records,n),receipts};
 const serialized=JSON.stringify(report,(_k,v)=>v===Infinity?'Infinity':v===-Infinity?'-Infinity':v,2)+'\n';
 const reportPath=join(out,`look-${n}.json`);
 if(existsSync(reportPath)) assert.equal(readFileSync(reportPath,'utf8'),serialized,'cached analysis differs from raw receipts');
 else writeFileSync(reportPath,serialized,{flag:'wx'});
 console.log(JSON.stringify({n,status:report.status,d33Censored:report.d33Censored,claims:report.claims.map(({id,status,estimate,lower,upper})=>({id,status,estimate,lower,upper}))}));
}
