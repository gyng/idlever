import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze, jobKey, validatePacket } from './analyze.mjs';

const milestones=[8,13,18,23,28,29,33];
const seeds=Array.from({length:32},(_,i)=>String(10001+i));
const claims=[
 ...[['PICKED',23],['PICKED',33],['TUNED',23],['TUNED',33]].map(([bot,depth])=>({id:`${bot}-${depth}`,bot,depth,comparison:'difference',estimand:'median',direction:'at-most',threshold:0})),
 {id:'pen',comparison:'candidate-ratio',estimand:'median',direction:'at-least',threshold:1.15}
];
const spec={looks:[32],seeds,claims,family_alpha:0.05,coupling_reserve:2**-38,cap_hours:344,
 probe:{bots:['PICKED','TUNED'],days:14,until_depth:33,checkins_per_day:3},expected_balance:{synthetic:true}};
function record(seed,bot,h=48) {
 const hours=[8,8,16,24,32,40,48].map(v=>Math.min(v,h));
 return {seed,bot,stop_reason:'depth',completed_days:Math.floor(h/24),campaign_complete:false,
  effective_checkins_per_day:3,observed_hours:h,best_depth:33,depth_reached_hours:h,elapsed_seconds:1,
  seed_out:{seed,hours,unconserved:0,king_day:null,sends:1}};
}
function roles() {
 return Object.fromEntries(['shipping','candidate'].map(role=>[role,new Map(seeds.flatMap(seed=>['PICKED','TUNED'].map(bot=>[`${seed}/${bot}`,record(seed,bot,role==='candidate'&&bot==='TUNED'?32:48)])))]));
}
test('mode is part of a job identity even when executable and seed are identical',()=>{
 assert.notEqual(jobKey('binary','original','18446744073709551615','spec'),jobKey('binary','lich-boss-only','18446744073709551615','spec'));
});
test('five protected claims at one fixed look accept a strong synthetic effect',()=>{
 const r=analyze(spec,roles(),32);assert.equal(r.status,'STATISTICALLY_ACCEPTED');
 assert.equal(r.alphaPerClaimLook,(0.05-2**-38)/5);assert.equal(r.claims.length,5);
 assert.equal(r.claims[4].estimate,1.5);assert.deepEqual(r.hardFailures,[]);
 assert.throws(()=>analyze(spec,roles(),16));
});
test('a failed pen requirement rejects; a strong ratio cannot conceal absolute regression',()=>{
 const a=roles();for(const seed of seeds)a.candidate.set(`${seed}/TUNED`,record(seed,'TUNED',48));
 assert.equal(analyze(spec,a,32).status,'STATISTICALLY_REJECTED');
 const b=roles();for(const seed of seeds)b.shipping.set(`${seed}/TUNED`,record(seed,'TUNED',24));
 const r=analyze(spec,b,32);assert.equal(r.claims[4].status,'PASS');assert.equal(r.status,'STATISTICALLY_REJECTED');
});
test('PICKED record parity, early TUNED arrivals, conservation and observed King are hard checks',()=>{
 for(const fault of ['picked','early','gold','king']) {
  const data=roles(),seed=seeds[0];
  if(fault==='picked')data.candidate.get(`${seed}/PICKED`).seed_out.sends++;
  if(fault==='early')data.candidate.get(`${seed}/TUNED`).seed_out.hours[2]=8;
  if(fault==='gold')data.candidate.get(`${seed}/TUNED`).seed_out.unconserved=1;
  if(fault==='king')data.candidate.get(`${seed}/TUNED`).seed_out.king_day=1;
  const r=analyze(spec,data,32);assert.equal(r.status,'HARD_CHECK_FAILED');assert.ok(r.hardFailures.length);
 }
});
test('censored controls remain in the estimand and prevent adoption despite passing intervals',()=>{
 const data=roles();for(const seed of seeds) {
  const row=data.shipping.get(`${seed}/TUNED`);row.seed_out.hours[6]=null;row.depth_reached_hours=null;row.stop_reason='horizon';row.best_depth=32;row.observed_hours=336;row.completed_days=14;row.campaign_complete=true;
 }
 const r=analyze(spec,data,32);assert.equal(r.status,'ACCEPTED_BUT_CENSORED');assert.equal(r.d33Censored,32);
 assert.equal(r.claims[3].baselineCensored,32);
});
test('native numeric seed identity stays exact and request order is numeric; wrong mode is refused',()=>{
 const ids=['18446744073709551615','9007199254740993'];
 const packet={schema:1,kind:'dayplayer-stat-probe',pen_policy:'lich-boss-only',milestones,
  request:{...spec.probe,seeds:[...ids].reverse()},balance:spec.expected_balance,
  records:ids.flatMap(seed=>['PICKED','TUNED'].map(bot=>record(seed,bot)))};
 let raw=JSON.stringify(packet);
 // Only the duplicated SeedOut seed becomes a native JSON integer token.
 for(const seed of ids)raw=raw.replaceAll(`"seed_out":{"seed":"${seed}"`,`"seed_out":{"seed":${seed}`);
 assert.equal(validatePacket(raw,ids,spec,'lich-boss-only').records.size,4);
 assert.throws(()=>validatePacket(raw,ids,spec,'original'));
 packet.request.seeds=ids;assert.throws(()=>validatePacket(JSON.stringify(packet),ids,spec,'lich-boss-only'));
});
