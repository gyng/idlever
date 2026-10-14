import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function trackPagePackages(page,packets){
 const active=new Set(),pending=new Set(),records=[],failures=[];
 let activity=Date.now(),started=0,responses=0,closed=false;
 const isWasm=r=>r.url().includes('idlever_wasm_bg.wasm');
 page.on('request',r=>{if(isWasm(r)){active.add(r);started++;activity=Date.now();}});
 page.on('requestfinished',r=>{if(isWasm(r)){active.delete(r);activity=Date.now();}});
 page.on('requestfailed',r=>{if(isWasm(r)){active.delete(r);activity=Date.now();const record={requestError:r.failure()?.errorText,url:r.url(),afterClose:closed};failures.push(record);packets.push(Promise.resolve(record));}});
 page.on('response',r=>{
  if(!isWasm(r))return;
  responses++;activity=Date.now();
  const reader=r.body().then(b=>({bytes:b.length,sha256:hash(b)})).catch(e=>({packetError:e.message,url:r.url(),afterClose:closed}));
  const tracked=reader.then(record=>{records.push(record);activity=Date.now();return record;}).finally(()=>pending.delete(tracked));
  pending.add(tracked);packets.push(tracked);
 });
 const summary=()=>({started,responses,records:records.length,activeRequests:active.size,pendingReaders:pending.size,failures:[...failures,...records.filter(r=>r.packetError)]});
 return{summary,async close(){
  const deadline=Date.now()+15000;
  for(;;){
   await Promise.all([...pending]);
   await page.waitForLoadState('networkidle',{timeout:15000});
   const remaining=750-(Date.now()-activity);
   if(remaining>0)await page.waitForTimeout(remaining);
   // Flush protocol callbacks that can append a new response reader after an
   // earlier Promise.all snapshot. A known request must finish before closure.
   await page.evaluate(()=>0);
   if(!active.size&&!pending.size&&Date.now()-activity>=750)break;
   assert(Date.now()<deadline,`WASM delivery did not settle: ${JSON.stringify(summary())}`);
  }
  assert.equal(started,responses,'Every started WASM request has a response before closing');
  assert.equal(responses,records.length,'Every response body is finalized before closing');
  assert.deepEqual(failures,[]);
  closed=true;await page.close();await Promise.all([...pending]);
  const state=summary();assert.equal(state.activeRequests,0);assert.equal(state.pendingReaders,0);assert.deepEqual(state.failures,[]);return state;
 }};
}
