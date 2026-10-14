import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
import {trackPagePackages} from './package-readers.mjs';
const out='docs/evidence/cut221/package-lifecycle';mkdirSync(out,{recursive:true});
const expected=readFileSync('/tmp/idlever-cut221-expanded-final-cost/web/src/engine/pkg/idlever_wasm_bg.wasm'),hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await launchBrowser(),result={scope:'Headless network lifecycle only, no renderer/gameplay/timing acceptance; actual frozen71ca server bytes, deliberately delayed already-started second request',rows:[]};
try{
 for(const mode of['old-snapshot','tracked-drain'])for(let i=0;i<5;i++){
  const p=await browser.newPage(),packets=[];let started=0,active=0,failed=0;
  p.on('request',r=>{if(r.url().includes('idlever_wasm_bg.wasm')){started++;active++;}});p.on('requestfinished',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))active--;});p.on('requestfailed',r=>{if(r.url().includes('idlever_wasm_bg.wasm')){active--;failed++;}});
  const tracker=mode==='tracked-drain'?trackPagePackages(p,packets):null;
  if(!tracker)p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})).catch(e=>({packetError:e.message})));});
  await p.route('**/lifecycle-proof.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await p.route('**/idlever_wasm_bg.wasm*',async r=>{if(r.request().url().includes('late=1'))await new Promise(resolve=>setTimeout(resolve,250));try{await r.continue();}catch{/* The old-snapshot control intentionally closes an active request. */}});
  await p.goto('http://localhost:5533/lifecycle-proof.html');await p.evaluate(async()=>{const r=await fetch('/src/engine/pkg/idlever_wasm_bg.wasm');await r.arrayBuffer();});
  const requested=p.waitForRequest(r=>r.url().includes('late=1'));await p.evaluate(()=>{void fetch('/src/engine/pkg/idlever_wasm_bg.wasm?late=1').then(r=>r.arrayBuffer()).catch(()=>{});});await requested;
  assert.equal(started,2);const before={started,active,packets:packets.length};
  if(tracker){const closed=await tracker.close();const records=await Promise.all(packets);assert.equal(records.length,2);for(const r of records)assert.deepEqual(r,{bytes:expected.length,sha256:hash(expected)});assert.equal(failed,0);result.rows.push({mode,index:i,before,closed,records,failed});}
  else{await Promise.all(packets);assert(active>0,'Original Promise.all snapshot misses a known active request');await p.close();result.rows.push({mode,index:i,before,after:{started,active,failed},records:await Promise.all(packets)});}
 }
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({oldControls:5,drainedCases:5,allDrainedBodies:10,sha256:hash(expected)}));
}catch(e){result.failure={message:e.message,stack:e.stack};writeFileSync(`${out}/failed.json`,JSON.stringify(result,null,2));throw e;}finally{await browser.close();}
