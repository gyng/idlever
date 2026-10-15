import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../../tools/browser.mjs';
const root='docs/evidence/cut220/paper-doll-8879',phase=process.argv[2]||'first';assert(/^[a-z0-9-]+$/.test(phase));const out=resolve(root+'/'+phase);mkdirSync(out);
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=()=>{const files={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else files[f]=hash(readFileSync(f));}};walk('web/src');return files;};
const expectedWasm='8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff';
const fixtures=['weapon-bow','helm-empty'].map(id=>{const path=`docs/evidence/cut220/actual-next-8879/${id}.session.json.gz`,b=readFileSync(path);return{id,path,raw:gunzipSync(b).toString(),gzipSha256:hash(b)};});
const result={at:new Date().toISOString(),scope:'Functional neutral composited doll on actual public earned gear differences, not final painted quality, allR7 or progression/performance acceptance.',expectedWasm,inputs:fixtures.map(({raw,...x})=>({...x,rawSha256:hash(raw)})),sourceBefore:inventory(),served:[],rows:[],errors:[]};
const save=()=>writeFileSync(out+'/results.json',JSON.stringify(result,null,2)+'\n');save();
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const log=createWriteStream(out+'/vite.log');await new Promise(r=>log.once('open',r));const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:resolve('web'),stdio:['ignore',log,log]});let browser;const pending=[];
try{
 const url=`http://localhost:${port}/`;for(let i=0;i<120;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser({gpu:true});
 for(const fixture of fixtures)for(const viewport of [{width:402,height:681},{width:1440,height:900}])for(const scale of [1,2]){
  const p=await browser.newPage({viewport,reducedMotion:'reduce'});p.on('pageerror',e=>result.errors.push(String(e)));
  p.on('response',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/src/')||path.endsWith('.wasm'))pending.push(r.body().then(b=>result.served.push({path,sha256:hash(b),bytes:b.length})).catch(()=>{}));});
  await p.goto(url+'?fresh=1&seed=1&runs=0');await p.waitForFunction(()=>window.__idlever?.booted,null,{timeout:90000});
  await p.evaluate(async({raw,scale})=>{const a=window.__idlever;a.runnerOn=false;a.lineage=await a.engine.load(raw);await a.refresh();a.go({kind:'camp'});document.documentElement.style.fontSize=`${16*scale}px`;},{raw:fixture.raw,scale});
  const before=await p.evaluate(()=>window.__idlever.engine.save());
  await p.locator('.town-hit[data-building=tent]').click();await p.locator('[data-hero-hub]').waitFor();await p.evaluate(()=>document.fonts.ready);
  const canonical=await p.evaluate(()=>window.__idlever.lineage.starting_kits.equipment);assert(canonical.queued);
  const row={fixture:fixture.id,viewport,actualViewport:await p.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),scale,captureKind:'viewport',canonical,phases:[]};
  for(const selected of ['actual','next']){
   const button=p.locator(`[data-doll-phase=${selected}]`);await button.scrollIntoViewIfNeeded();await button.click();
   await p.waitForFunction(()=>[...document.querySelectorAll('.hero-equipment-body image')].every(i=>i.parentElement.dataset.dollArt==='painted'));
   const read=await p.locator('.hero-equipment-figure').evaluate(el=>({phase:el.dataset.hubFigurePhase,layers:[...el.querySelectorAll('[data-doll-slot]')].map(g=>({slot:g.dataset.dollSlot,kind:g.dataset.dollKind,art:g.dataset.dollArt,children:g.children.length,primitives:[...g.querySelectorAll('[data-doll-primitive]')].map(x=>({kind:x.dataset.dollPrimitive,display:x.getAttribute('display')}))})),buttons:[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return{phase:b.dataset.dollPhase,w:r.width,h:r.height,pressed:b.getAttribute('aria-pressed')};}),svg:el.querySelector('svg')?.getAttribute('viewBox'),neutral:el.querySelectorAll('[data-doll-base=neutral]').length,oldBaked:el.querySelectorAll('.hero-hub-sprite').length}));
   assert.equal(read.phase,selected);assert.equal(read.neutral,1);assert.equal(read.oldBaked,0);assert.equal(read.layers.length,4);
   for(const slot of canonical[selected].slots){const layer=read.layers.find(x=>x.slot===slot.slot);assert.equal(layer.kind,slot.kind??'none');if(slot.kind===null)assert.equal(layer.children,0);}
   assert(read.buttons.every(b=>b.w>=44&&b.h>=44));
   const prefix=`${fixture.id}-${viewport.width}-${scale}x-${selected}`;await p.screenshot({path:`${out}/${prefix}.png`,fullPage:false});row.phases.push({...read,prefix,imageSha256:hash(readFileSync(`${out}/${prefix}.png`))});
  }
  await p.evaluate(()=>{const f=document.querySelector('.hero-equipment-figure');for(let i=0;i<100;i++)f.querySelector(`[data-doll-phase=${i%2?'actual':'next'}]`).click();});
  await p.locator('[data-doll-phase=next]').focus();row.refresh=await p.evaluate(async()=>{const a=window.__idlever,records=[];for(let i=0;i<100;i++){await a.refresh();records.push({phase:document.querySelector('.hero-equipment-figure')?.dataset.hubFigurePhase,focus:document.activeElement?.getAttribute('data-doll-phase')});}return records;});
  assert(row.refresh.every(r=>r.phase==='actual'&&r.focus==='next'));
  row.overflow=await p.evaluate(()=>({document:document.documentElement.scrollWidth-innerWidth,panel:[...document.querySelectorAll('[data-hero-hub],.hero-hub-panel,.hero-hub-doll')].map(n=>n.scrollWidth-n.clientWidth)}));assert(row.overflow.document<=1);assert(row.overflow.panel.every(v=>v<=1));
  row.actualAfter=await p.evaluate(()=>window.__idlever.lineage.starting_kits.equipment.actual);assert.deepEqual(row.actualAfter,canonical.actual);
  row.exact=before===await p.evaluate(()=>window.__idlever.engine.save());assert(row.exact);
  row.slotRoutes=[];for(const slot of ['weapon','helm','armour','boots']){await p.locator(`[data-hub-slot=${slot}]`).click();const target=p.locator(`[data-starting-gear=${slot}]`);assert(await target.getAttribute('open')!==null);row.slotRoutes.push(slot);}
  await p.evaluate(()=>window.__oldDollButton=document.querySelector('[data-doll-phase=next]'));
  await p.keyboard.press('Escape');await p.evaluate(()=>window.__oldDollButton.click());row.exactAfterClose=before===await p.evaluate(()=>window.__idlever.engine.save());assert(row.exactAfterClose);
  result.rows.push(row);save();await p.close();
 }
 await Promise.all(pending);assert.equal(result.errors.length,0);const wasm=result.served.filter(x=>x.path.endsWith('.wasm'));assert(wasm.length&&wasm.every(x=>x.sha256===expectedWasm));result.sourceAfter=inventory();result.sourceUnchanged=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert(result.sourceUnchanged);result.status='PASS';save();
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
