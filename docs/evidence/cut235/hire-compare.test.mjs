import assert from 'node:assert/strict';
import test from 'node:test';
import {median,paired,compare,laterGap} from './hire-compare.mjs';
const workers=['apprentice','clerk','drillmaster','kennel_hand','herald','guide','kennel_keeper'];
const base=()=>Array.from({length:16},(_,i)=>({bot:'PICKED',seed:i+1,timeline:[...workers.map(w=>({k:`hire:${w}`,m:60*(i+1)})),...[24,48,72,96,120,144,168].map(h=>({k:`rank:${h}`,m:h*60}))]}));
test('even-sized standard median and strict count-median bar',()=>{
 assert.equal(median([1,2,3,9]),2.5);
 const rows=base();assert.equal(compare(rows,rows,['PICKED']).failures.length,7,'paired equality cannot replace14/16 below the baseline median');
});
test('missing or duplicated seeds cannot pass',()=>{
 const rows=base();assert.throws(()=>paired(rows,rows.slice(1),'PICKED'),/exactly seeds/);
 assert.throws(()=>paired(rows,[...rows.slice(0,15),rows[0]],'PICKED'),/exactly seeds/);
 assert.throws(()=>paired([],[],'PICKED'),/exactly seeds/);
});
test('real hire events are required and all worker bars are independent',()=>{
 const rows=base(),early=rows.map(r=>({...r,timeline:r.timeline.map(b=>b.k.startsWith('hire:')?{...b,m:1}:b)}));
 assert.deepEqual(compare(rows,early,['PICKED']).failures,[]);
 const missing=early.map(r=>({...r,timeline:r.timeline.filter(b=>b.k!=='hire:clerk')}));
 assert.equal(compare(rows,missing,['PICKED']).failures.length,1);
});
test('later cadence includes both interval boundaries and excludes minor beats',()=>{
 assert.equal(laterGap({timeline:[]}),144);
 assert.equal(laterGap({timeline:[{k:'minor',m:48*60,minor:true}]}),144);
 assert.equal(laterGap(base()[0]),24);
});
