import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze,validatePacket,jobKey,sha,loadRecords } from './analyze-repaired.mjs';
const realSpec=JSON.parse(readFileSync(new URL('./spec.json',import.meta.url)));
const fixtureSpec=()=>({...realSpec,seeds:Array.from({length:32},(_,i)=>(2n**63n+BigInt(i)).toString())});
function packet(spec,role,censorFirst=false) {
 const seeds=spec.seeds.slice(0,16);
 const records=seeds.flatMap((seed,i)=>spec.probe.bots.map(bot=>{
  const censored=censorFirst&&i===0&&bot==='TUNED';
  const h=role==='candidate'&&bot==='TUNED'?32:48;
  return {seed,bot,stop_reason:censored?'horizon':'depth',effective_checkins_per_day:3,
   observed_hours:censored?336:h,best_depth:censored?28:33,depth_reached_hours:censored?null:h,
   seed_out:{seed:`INTEGER_${seed}`,hours:[8,8,16,24,32,censored?null:32,censored?null:h]}};
 }));
 let raw=JSON.stringify({schema:1,kind:'dayplayer-stat-probe',request:{seeds:[...seeds].sort((a,b)=>BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0),bots:spec.probe.bots,days:14,until_depth:33,checkins_per_day:3},balance:spec.expected_balance,milestones:[8,13,18,23,28,29,33],records});
 for(const seed of seeds)raw=raw.replaceAll(JSON.stringify(`INTEGER_${seed}`),seed);
 return raw;
}
test('lossless validation of real prior native packet; not confirmation data',()=>{
 const raw=gunzipSync(readFileSync(new URL('../cut299/control-observations.json.gz',import.meta.url))).toString();
 assert.equal(validatePacket(raw,['1','2'],realSpec).records.size,4);
});
test('full-u64 seed identity survives decoding and detects rounded duplication',()=>{
 const spec=fixtureSpec(),raw=packet(spec,'shipping');
 assert.equal(validatePacket(raw,spec.seeds.slice(0,16),spec).records.size,32);
 const bad=raw.replace(`"seed_out":{"seed":${spec.seeds[1]}`,`"seed_out":{"seed":${Number(spec.seeds[1])}`);
 assert.notEqual(bad,raw);
 assert.throws(()=>validatePacket(bad,spec.seeds.slice(0,16),spec),/lossless/);
});
test('runtime hash and exact seed strings distinguish otherwise equal-profile jobs',()=>{
 const s='9223372036854775808';
 assert.notEqual(jobKey('a',s,'p'),jobKey('b',s,'p'));
 assert.notEqual(jobKey('a',s,'p'),jobKey('a','9223372036854775809','p'));
 assert.notEqual(jobKey('a',s,'p'),jobKey('a',s,'q'));
});
test('declared fixed look accepts four synthetic claims only after all pairs exist',()=>{
 const spec=fixtureSpec(),records=Object.fromEntries(['shipping','candidate'].map(role=>[role,validatePacket(packet(spec,role),spec.seeds.slice(0,16),spec).records]));
 const result=analyze(spec,records,16);
 assert.equal(result.status,'STATISTICALLY_ACCEPTED');assert.equal(result.claims.length,4);assert.equal(result.d33Censored,0);
 assert.ok(result.claims.every(c=>c.status==='PASS'&&c.n===16));
 assert.equal(result.alphaPerClaimLook,(0.05-2**-38)/8);
 assert.throws(()=>analyze(spec,records,8));
 records.shipping.delete(`${spec.seeds[0]}/PICKED`);assert.throws(()=>analyze(spec,records,16),/missing/);
});
test('censored case is capped and blocks adoption even when median claims pass',()=>{
 const spec=fixtureSpec(),records={shipping:validatePacket(packet(spec,'shipping'),spec.seeds.slice(0,16),spec).records,candidate:validatePacket(packet(spec,'candidate',true),spec.seeds.slice(0,16),spec).records};
 const result=analyze(spec,records,16);
 assert.equal(result.status,'ACCEPTED_BUT_CENSORED');assert.equal(result.d33Censored,1);
 assert.equal(result.claims[3].samples[0].value,48/344);assert.equal(result.defaultAdoption,false);
});
test('modified probe request or shipping balance is refused',()=>{
 const spec=fixtureSpec();assert.throws(()=>validatePacket(packet(spec,'shipping').replace('"days":14','"days":13'),spec.seeds.slice(0,16),spec));
 assert.throws(()=>validatePacket(packet(spec,'shipping'),spec.seeds.slice(0,16),{...spec,expected_balance:{}}));
});
test('cached packet cannot cross runtime identities',()=>{
 const out=mkdtempSync(join(tmpdir(),'idlever-cut300-test-'));
 try {
  mkdirSync(join(out,'packets'));const spec=fixtureSpec(),raw=packet(spec,'shipping'),digest='test-spec';
  writeFileSync(join(out,'packets','sample.json'),raw);
  writeFileSync(join(out,'packets','sample.receipt.json'),JSON.stringify({role:'shipping',start:0,end:16,nativeExit:0,runtimeSha256:spec.runtimes.candidate.sha256,specSha256:digest,packet:'sample.json',packetSha256:sha(raw),jobKeys:spec.seeds.slice(0,16).map(s=>jobKey(spec.runtimes.candidate.sha256,s,digest))}));
  assert.throws(()=>loadRecords(spec,digest,out,16),e=>e.actual===spec.runtimes.candidate.sha256&&e.expected===spec.runtimes.shipping.sha256);
 }finally{rmSync(out,{recursive:true,force:true});}
});

test('unsorted caller high-u64 IDs match native numeric canonical order without dropping a seed',()=>{
 const spec=fixtureSpec();spec.seeds.reverse();const raw=packet(spec,'shipping');
 assert.equal(validatePacket(raw,spec.seeds.slice(0,16),spec).records.size,32);
 const wrong=JSON.parse(raw);wrong.request.seeds.pop();assert.throws(()=>validatePacket(JSON.stringify(wrong),spec.seeds.slice(0,16),spec));
});
