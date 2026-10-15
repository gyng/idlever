import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../../tools/browser.mjs';
const root='docs/evidence/cut220/painted-8879',phase=process.argv[2]||'first';assert(/^[a-z0-9-]+$/.test(phase));const out=resolve(root+'/'+phase);mkdirSync(out);
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=()=>{const files={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else files[f]=hash(readFileSync(f));}};walk('web/src');return files;};
const expectedWasm='8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff';
const fixtures=['weapon-bow','helm-empty'].map(id=>{const path=`docs/evidence/cut220/actual-next-8879/${id}.session.json.gz`,b=readFileSync(path);return{id,path,raw:gunzipSync(b).toString(),gzipSha256:hash(b)};});
const assetsBefore=Object.fromEntries(readdirSync('web/public/ui/equipment').sort().map(n=>[n,hash(readFileSync('web/public/ui/equipment/'+n))]));
for(const a of JSON.parse(readFileSync('art/equipment.json','utf8')).assets)assert.equal(hash(readFileSync(a.output)),a.output_sha256);
const result={scriptSha256:hash(readFileSync(new URL(import.meta.url))),assetsBefore,artManifestSha256:hash(readFileSync('art/equipment.json')),at:new Date().toISOString(),scope:'Supplemental strict painted/base/registry adoption in8earned layout cases; no repeat100refreshstress, not fullR7.',expectedWasm,inputs:fixtures.map(({raw,...x})=>({...x,rawSha256:hash(raw)})),sourceBefore:inventory(),served:[],rows:[],errors:[]};
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
   const read=await p.locator('.hero-equipment-figure').evaluate(el=>({phase:el.dataset.hubFigurePhase,layers:[...el.querySelectorAll('[data-doll-slot]')].map(g=>({slot:g.dataset.dollSlot,kind:g.dataset.dollKind,art:g.dataset.dollArt,href:g.querySelector('image')?.getAttribute('href'),images:g.querySelectorAll('image').length,children:g.children.length,primitives:[...g.querySelectorAll('[data-doll-primitive]')].map(x=>({kind:x.dataset.dollPrimitive,display:x.getAttribute('display')}))})),buttons:[...el.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return{phase:b.dataset.dollPhase,w:r.width,h:r.height,pressed:b.getAttribute('aria-pressed')};}),svg:el.querySelector('svg')?.getAttribute('viewBox'),base:{art:el.querySelector('[data-doll-base]').dataset.dollArt,href:el.querySelector('[data-doll-base] image')?.getAttribute('href'),images:el.querySelector('[data-doll-base]').querySelectorAll('image').length},look:el.dataset.dollLook,neutral:el.querySelectorAll('[data-doll-base=neutral]').length,oldBaked:el.querySelectorAll('.hero-hub-sprite').length}));
   assert.equal(read.phase,selected);assert.equal(read.neutral,1);assert.equal(read.oldBaked,0);assert.equal(read.layers.length,4);
   assert.equal(read.base.art,'painted');assert.equal(read.base.images,1);const nativeLook=await p.evaluate(()=>window.__idlever.lineage.look);assert.equal(read.look,['female','cat'].includes(nativeLook)?nativeLook:'male');assert.equal(read.base.href,`/ui/equipment/base-${read.look}.webp`);
   const wearables=['crownsplitter','hearthglass','frostmantle','ironcap','hearthglass_hood','trailboots','hearthglass_boots'];
   for(const slot of canonical[selected].slots){const layer=read.layers.find(x=>x.slot===slot.slot);assert.equal(layer.kind,slot.kind??'none');if(slot.kind===null){assert.equal(layer.children,0);assert.equal(layer.images,0);assert.equal(layer.art,'empty');}else{assert.equal(layer.art,'painted');assert.equal(layer.images,1);assert.equal(layer.href,wearables.includes(slot.kind)?`/ui/equipment/${slot.kind}.webp`:`/ui/icons/it_${slot.kind}.png`);assert(layer.primitives.every(g=>g.display==='none'));}}
   assert(read.buttons.every(b=>b.w>=44&&b.h>=44));
   const prefix=`${fixture.id}-${viewport.width}-${scale}x-${selected}`;await p.screenshot({path:`${out}/${prefix}-controls.png`,fullPage:false});
   await p.locator('.hero-equipment-body').scrollIntoViewIfNeeded();
   const bodyVisible=await p.locator('.hero-equipment-body').evaluate(e=>{const r=e.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth;for(let a=e.parentElement;a;a=a.parentElement){const style=getComputedStyle(a),q=a.getBoundingClientRect();if(style.overflowY!=='visible'){top=Math.max(top,q.top);bottom=Math.min(bottom,q.bottom);}if(style.overflowX!=='visible'){left=Math.max(left,q.left);right=Math.min(right,q.right);}}return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},clip:{top,bottom,left,right},fullyVisible:r.top>=top-1&&r.bottom<=bottom+1&&r.left>=left-1&&r.right<=right+1};});assert(bodyVisible.fullyVisible);
   await p.mouse.move(2,2);await p.screenshot({path:`${out}/${prefix}-body.png`,fullPage:false});row.phases.push({...read,prefix,captureKind:'viewport',bodyVisible,controlsSha256:hash(readFileSync(`${out}/${prefix}-controls.png`)),bodySha256:hash(readFileSync(`${out}/${prefix}-body.png`))});
  }
  row.exact=before===await p.evaluate(()=>window.__idlever.engine.save());assert(row.exact);
  result.rows.push(row);save();await p.close();
 }
 await Promise.all(pending);assert.equal(result.errors.length,0);const wasm=result.served.filter(x=>x.path.endsWith('.wasm'));assert(wasm.length&&wasm.every(x=>x.sha256===expectedWasm));result.assetsAfter=Object.fromEntries(readdirSync('web/public/ui/equipment').sort().map(n=>[n,hash(readFileSync('web/public/ui/equipment/'+n))]));assert.deepEqual(result.assetsAfter,result.assetsBefore);result.sourceAfter=inventory();result.sourceUnchanged=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert(result.sourceUnchanged);result.status='PASS';save();
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
