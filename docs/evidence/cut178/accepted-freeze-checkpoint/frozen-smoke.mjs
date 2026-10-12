import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {launchGpu} from '../../tools/browser.mjs';
const base='http://127.0.0.1:41269/',freeze='/tmp/riddle-cut178-3cde6bc-frozen',out='/home/g/p/riddle/scratchpad/cut178/frozen-checkpoint';fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(freeze+'/asset-manifest.json'));const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const file of manifest.files){const response=await fetch(base+file.path.split('/').map(encodeURIComponent).join('/'));assert(response.ok,file.path);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,file.bytes,file.path);assert.equal(sha(bytes),file.sha256,file.path);}
const browser=await launchGpu(),errors=[],wasmReads=[],shots=[];
const onPage=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(new URL(r.url()).pathname.endsWith('.wasm')){const b=await r.body();wasmReads.push({url:r.url(),bytes:b.length,sha256:sha(b)});}});};
try{
 const ctx=await browser.newContext({viewport:{width:400,height:800},deviceScaleFactor:3});const page=await ctx.newPage();onPage(page);
 await page.goto(base+'?dev=1&runs=1&seed=149&fresh=1&menu=1',{waitUntil:'networkidle'});await page.locator('.game-menu').waitFor();
 const menuShot=out+'/menu-phone.png';await page.screenshot({path:menuShot});shots.push({path:menuShot,scope:'Default wall-clock cold main menu,400x800,private GPU'});
 assert.equal(await page.getByRole('button',{name:'Credits',exact:true}).count(),0);
 await page.getByRole('button',{name:'New game',exact:true}).click();await page.waitForFunction(()=>window.__riddle?.booted,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.__riddle.kind),'wasm');await page.locator('.town-tag[data-next="house"]').click();await page.waitForFunction(()=>window.__riddle.lineage.town.home);await page.locator("button.send:not(:disabled)").waitFor({timeout:15000});await page.waitForLoadState("networkidle");
 const identity=await page.evaluate(()=>({seed:window.__riddle.lineage.seed,heroes:window.__riddle.lineage.hero_slots.map(x=>x.id),home:window.__riddle.lineage.town.home,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,hour:new Date().getHours()}));
 const homeShot=out+'/home-phone.png';await page.screenshot({path:homeShot});shots.push({path:homeShot,scope:'Actual earned free house via public build,default wall-clock lighting,400x800,private GPU'});
 await page.goto(base+'?dev=1&runs=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__riddle?.booted,null,{timeout:60000});assert.equal(await page.locator('.game-menu').count(),0);
 const reloaded=await page.evaluate(()=>({seed:window.__riddle.lineage.seed,heroes:window.__riddle.lineage.hero_slots.map(x=>x.id),home:window.__riddle.lineage.town.home}));assert.deepEqual(reloaded,{seed:identity.seed,heroes:identity.heroes,home:identity.home});
 const storage=await ctx.storageState();
 const night=await browser.newContext({viewport:{width:400,height:800},deviceScaleFactor:3,storageState:storage});
 // Cosmetic night preview only: epoch/Date.now and saved progression remain real.
 await night.addInitScript(()=>{Date.prototype.getHours=()=>23;Date.prototype.getMinutes=()=>0;});const np=await night.newPage();onPage(np);await np.goto(base+'?dev=1&runs=1',{waitUntil:'networkidle'});await np.waitForFunction(()=>window.__riddle?.booted);const nightShot=out+'/home-night-preview-phone.png';await np.screenshot({path:nightShot});shots.push({path:nightShot,scope:'Cosmetic23:00 local-hours preview only; Date.now unchanged; same publicly built house save,not evaluation horizon'});
 const wide=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,storageState:storage});const wp=await wide.newPage();onPage(wp);await wp.goto(base+'?dev=1&runs=1&menu=1',{waitUntil:'networkidle'});await wp.locator('.game-menu').waitFor();const ws=out+'/menu-desktop.png';await wp.screenshot({path:ws});shots.push({path:ws,scope:'Saved-town menu at1280x800 on private GPU'});await wp.getByRole('button',{name:'Continue',exact:true}).click();await wp.waitForFunction(()=>window.__riddle?.booted&&!document.querySelector('.game-menu'));const wh=out+'/home-desktop.png';await wp.screenshot({path:wh});shots.push({path:wh,scope:'Same publicly built house save at1280x800 on private GPU'});
 assert(wasmReads.length>0);assert(wasmReads.every(r=>r.sha256===manifest.shippingWasmSha256));assert.deepEqual(errors,[]);
 for(const file of manifest.files)assert.equal(sha(fs.readFileSync(freeze+'/assets/'+file.path)),file.sha256);
 fs.writeFileSync(out+'/smoke.json',JSON.stringify({scope:'Frozen-asset transport/real-WASM cold+saved-reload/GPU milestone smoke only; not full QA,blind horizon or score',commit:manifest.commit,url:base,servedFilesVerified:manifest.files.length,manifestSha256:sha(fs.readFileSync(freeze+'/asset-manifest.json')),identity,reloaded,wasmReads,shots,errors},null,2)+'\n');console.log('PASS262 served hashes,realWASM cold+saved reload,privateGPU screenshots; no QA/score certified.');
}finally{await browser.close();}
