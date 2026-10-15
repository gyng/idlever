// Small actual-Hub fit preview; separate from the final frozen-asset acceptance matrix.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,createWriteStream,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../../tools/browser.mjs';
const phase=process.argv[2];assert(phase&&/^[a-z0-9-]+$/.test(phase));
const out=resolve('docs/evidence/cut220/painted-8879/'+phase);mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const input='docs/evidence/cut220/actual-next-8879/weapon-bow.session.json.gz', raw=gunzipSync(readFileSync(input)).toString();
const source={};for(const p of ['web/src/ui/hero-equipment-figure.ts','web/src/ui/hero-hub.ts','web/src/hero-hub.css','web/src/engine/pkg/idlever_wasm_bg.wasm'])source[p]=sha(readFileSync(p));
const assets={};for(const name of readdirSync('web/public/ui/equipment'))assets[name]=sha(readFileSync('web/public/ui/equipment/'+name));
const result={at:new Date().toISOString(),scope:'Small actual earned Hub look/fit preview, not frozen final matrix, motion, performance or full R7.',input,inputSha256:sha(raw),source,assets,served:[],rows:[],errors:[]};
const save=()=>writeFileSync(out+'/results.json',JSON.stringify(result,null,2)+'\n');save();
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const log=createWriteStream(out+'/vite.log');await new Promise(r=>log.once('open',r));const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:resolve('web'),stdio:['ignore',log,log]});let browser;const pending=[];
try{
 const url=`http://localhost:${port}/`;for(let i=0;i<120;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser({gpu:true});
 const p=await browser.newPage({viewport:{width:402,height:681},reducedMotion:'reduce'});p.on('pageerror',e=>result.errors.push(String(e)));p.on('response',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/src/')||path.startsWith('/ui/equipment/'))pending.push(r.body().then(b=>result.served.push({path,status:r.status(),sha256:sha(b),bytes:b.length})).catch(()=>{}));});
 await p.goto(url+'?fresh=1&seed=1&runs=0');await p.waitForFunction(()=>window.__idlever?.booted,null,{timeout:90000});
 await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;a.lineage=await a.engine.load(raw);await a.refresh();a.go({kind:'camp'});},raw);
 for(const look of ['male','female','cat']){
  await p.evaluate(async look=>{const a=window.__idlever;await a.setLook(look);},look);
  await p.locator('.town-hit[data-building=tent]').click();await p.locator('[data-hero-hub]').waitFor();
  await p.waitForFunction(()=>document.querySelector('[data-doll-base]')?.dataset.dollArt==='painted');
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>!document.querySelector('.toast,.class-unlock'),null,{timeout:30000});
  const before=await p.evaluate(()=>window.__idlever.engine.save());
  for(const phase of ['actual','next']){
   await p.locator(`[data-doll-phase=${phase}]`).click();await p.waitForFunction(()=>document.querySelector('[data-doll-base]')?.dataset.dollArt==='painted');await p.waitForTimeout(250);
   await p.locator('.hero-equipment-painting').scrollIntoViewIfNeeded();await p.mouse.move(2,2);
   const row=await p.evaluate(()=>{const a=window.__idlever,f=document.querySelector('.hero-equipment-figure');return{look:a.lineage.look,drawnLook:f.dataset.dollLook,phase:f.dataset.hubFigurePhase,base:f.querySelector('[data-doll-base]').dataset.dollArt,layers:[...f.querySelectorAll('[data-doll-slot]')].map(g=>({slot:g.dataset.dollSlot,kind:g.dataset.dollKind,art:g.dataset.dollArt,href:g.querySelector('image')?.getAttribute('href')}))};});assert.equal(row.look,look);assert.equal(row.drawnLook,look);
   const file=`${look}-${phase}.png`;await p.locator('.hero-equipment-painting').screenshot({path:out+'/'+file});row.file=file;row.sha256=sha(readFileSync(out+'/'+file));row.exactSave=before===await p.evaluate(()=>window.__idlever.engine.save());assert(row.exactSave);result.rows.push(row);save();
  }
  await p.keyboard.press('Escape');
 }
 await Promise.all(pending);assert.equal(result.errors.length,0);const wasm=result.served.filter(r=>r.path.endsWith('.wasm'));assert(wasm.length&&wasm.every(r=>r.sha256===source['web/src/engine/pkg/idlever_wasm_bg.wasm']));result.status='PASS';save();
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
