import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {launchGpu} from '../../tools/browser.mjs';
const checkpoint=JSON.parse(readFileSync('scratchpad/qa_cut179_interactive/browser-state.json','utf8'));
const save=checkpoint.origins[0].localStorage.find(x=>x.name==='riddle.save').value;
mkdirSync('scratchpad/cut182/shots',{recursive:true});
const b=await launchGpu();const results=[];
try{for(const width of [320,400,1440]){
 const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await p.goto('http://127.0.0.1:53631/?dev=1&runs=0&fresh=1&seed=223');await p.waitForFunction(()=>window.__riddle?.booted);
 await p.evaluate(entries=>{for(const x of entries)localStorage.setItem(x.name,x.value);},checkpoint.origins[0].localStorage.filter(x=>x.name.startsWith('riddle.town.')));
 const loaded=await p.evaluate(async save=>{const a=window.__riddle;const ok=await a.importSave(save);return {ok,kind:a.kind,gold:a.lineage.gold,best:a.lineage.best_depth};},save);
 assert.equal(loaded.ok,true);assert.equal(loaded.kind,'wasm');assert.equal(loaded.gold,15730);assert.equal(loaded.best,22);
 console.log(JSON.stringify(await p.evaluate(()=>({next:window.__riddle.lineage.tree?.next_worker,nodes:window.__riddle.lineage.tree?.nodes.filter(n=>n.id==='clerk'),town:window.__riddle.lineage.town,markers:[...document.querySelectorAll('.town-marker')].map(e=>({text:e.textContent,id:e.dataset.node})),screen:window.__riddle.screen}))));
 await p.screenshot({path:`scratchpad/cut182/shots/diagnostic-before-${width}.png`});
 await p.locator('.town-marker.mk-next[data-node=clerk]').waitFor();
 const box=await p.locator('.town-marker.mk-next[data-node=clerk]').evaluate(e=>{const outer=e.getBoundingClientRect(),text=e.querySelector('b').getBoundingClientRect();return {text:e.textContent,contained:text.bottom<=outer.bottom&&text.top>=outer.top&&text.left>=outer.left&&text.right<=outer.right,outer:{x:outer.x,y:outer.y,w:outer.width,h:outer.height}}});
 assert.ok(box.contained,JSON.stringify(box));assert.match(box.text,/deposit.*0\/3.*19h/);
 await p.screenshot({path:`scratchpad/cut182/shots/earned-town-${width}.png`});
 results.push({width,loaded,badge:box,scope:'Original earned save imported through existing import API; open-app clock disabled, no absence simulation. Diagnostic layout review, not additional QA play.'});await p.close();
}}finally{await b.close();writeFileSync('scratchpad/cut182/gpu-earned-results.json',JSON.stringify(results,null,2)+'\n');}
console.log('All3 earned-town badge cases PASS');
