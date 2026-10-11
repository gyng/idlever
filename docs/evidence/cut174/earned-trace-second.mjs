import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {launchGpu} from '../tools/browser.mjs';
const dir='/home/g/p/riddle/scratchpad/cut174-earned-trace';fs.mkdirSync(dir,{recursive:true});
const original=fs.readFileSync('/home/g/p/riddle/docs/evidence/cut173/transcript-terminal-storage.json');
const storage=JSON.parse(original).value,target='http://127.0.0.1:40504';
for(const origin of storage.origins){origin.origin=target;for(const entry of origin.localStorage)if(entry.name==='riddle.save'){const save=JSON.parse(entry.value);save.last_seen=Date.now();entry.value=JSON.stringify(save);}}
const browser=await launchGpu();
const results=[];
try{for(const width of [400,1440]){
 const ctx=await browser.newContext({viewport:{width,height:width===400?800:900},deviceScaleFactor:width===400?3:1,storageState:storage});const page=await ctx.newPage(),wasm=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().endsWith('.wasm'))wasm.push(r);});
 await page.goto(`${target}/?dev=1&runs=0`);await page.waitForFunction(()=>window.__riddle?.booted&&window.__riddle.screen==='camp');
 const before=await page.evaluate(async()=>{const a=window.__riddle;const d=await a.engine.death(2);const save=await a.engine.save();const pen=a.lineage.packages.pen_open;const gold=a.lineage.gold;a.go({kind:'death',death:d,kept:true});return{save,pen,gold,depth:d.depth,cause:d.cause,trace:d.trace,hero:d.hero};});
 assert.equal(before.pen,false);assert.equal(before.depth,5);assert.match(before.cause,/archer/);assert.ok(before.trace.turns.length>0);
 await page.locator('.death .death-more').click();await page.locator('.early-death-trace .trace').waitFor();
 const text=await page.locator('.early-death-trace').innerText();fs.writeFileSync(`${dir}/trace-${width}.txt`,text+'\n');
 const readOnly=await page.evaluate(()=>({pen:window.__riddle.lineage.packages.pen_open,authoring:document.querySelectorAll('.early-death-trace .row-edit,.early-death-trace button.patch,.early-death-trace input,.early-death-trace textarea').length}));
 assert.equal(readOnly.pen,false);assert.equal(readOnly.authoring,0);assert.match(text,/goblin archer/);
 await page.screenshot({path:`${dir}/trace-${width}.png`,fullPage:false});await page.keyboard.press('Escape');await page.locator('.early-death-trace').waitFor({state:'detached'});assert.equal(await page.locator('.early-death-trace').count(),0);
 assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),before.save);
 await page.locator('.death .cause-btn').click();await page.locator('.early-death-trace .trace').waitFor();await page.keyboard.press('Escape');await page.locator('.early-death-trace').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),before.save);assert.equal(errors.length,0);
 const hashes=await Promise.all(wasm.map(async r=>crypto.createHash('sha256').update(await r.body()).digest('hex')));assert.ok(hashes.length);assert.ok(hashes.every(x=>x==='e8596a72faeb2302e85d5a4f1b45bde1e336e3d2fac9f261dda46615ca059239'));
 results.push({width,depth:before.depth,cause:before.cause,gold:before.gold,hero:before.hero,trace:before.trace,text,readOnly,exactEngineSaveUnchanged:true,wasmHashes:hashes,errors});await ctx.close();
}}finally{await browser.close();}
fs.writeFileSync(`${dir}/results.json`,JSON.stringify({scope:'Coordinator diagnostic on genuine earned seed149 save. Storage origin retargeted and last_seen stamped current to avoid added absence; runs=0 intentionally pauses this rendering check. Historical death selected through coordinator API; Details and cause exercised by public pointer controls. Not player QA coverage, active horizon, or score.',originalStorageSha256:crypto.createHash('sha256').update(original).digest('hex'),results},null,2)+'\n');
console.log('PASS real earned D5 death: read-only trace, public Details/cause, exact-save/Pen unchanged, exact shipping WASM, phone+desktop');
