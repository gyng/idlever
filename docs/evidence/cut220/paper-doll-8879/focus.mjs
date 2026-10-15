import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../../tools/browser.mjs';
import {auditContrast} from '../../cut243-states/contrast.mjs';
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

 const p=await browser.newPage({viewport:{width:402,height:681},reducedMotion:'reduce'});p.on('pageerror',e=>result.errors.push(String(e)));
 p.on('response',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/src/')||path.endsWith('.wasm'))pending.push(r.body().then(b=>result.served.push({path,sha256:hash(b),bytes:b.length})).catch(()=>{}));});
 await p.goto(url+'?fresh=1&seed=1&runs=0');await p.waitForFunction(()=>window.__idlever?.booted,null,{timeout:90000});
 const open=async(raw,scale=1,viewport={width:402,height:681})=>{
  await p.keyboard.press('Escape');await p.setViewportSize(viewport);
  await p.evaluate(async({raw,scale})=>{const a=window.__idlever;a.runnerOn=false;a.lineage=await a.engine.load(raw);await a.refresh();a.go({kind:'camp'});document.documentElement.style.fontSize=`${16*scale}px`;},{raw,scale});
 };
 const hub=async()=>{await p.locator('.town-hit[data-building=tent]').click();await p.locator('[data-hero-hub]').waitFor();await p.evaluate(()=>document.fonts.ready);};
 const settled=()=>p.waitForFunction(()=>!document.querySelector('.class-unlock,.toast'),null,{timeout:30000});
 const readyArt=()=>p.waitForFunction(()=>[...document.querySelectorAll('.hero-equipment-body image')].every(i=>i.parentElement.dataset.dollArt==='painted'));
 const snapshot=()=>p.locator('.hero-equipment-figure').evaluate(el=>({phase:el.dataset.hubFigurePhase,layers:[...el.querySelectorAll('[data-doll-slot]')].map(g=>({slot:g.dataset.dollSlot,kind:g.dataset.dollKind,art:g.dataset.dollArt,children:g.children.length})),neutral:el.querySelectorAll('[data-doll-base=neutral]').length}));
 const bodyVisible=async()=>{await p.locator('.hero-equipment-body').scrollIntoViewIfNeeded();const r=await p.locator('.hero-equipment-body').evaluate(e=>{const r=e.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth;for(let a=e.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(s.overflowY!=='visible'){top=Math.max(top,q.top);bottom=Math.min(bottom,q.bottom);}if(s.overflowX!=='visible'){left=Math.max(left,q.left);right=Math.min(right,q.right);}}return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},clip:{top,bottom,left,right},fullyVisible:r.top>=top-1&&r.bottom<=bottom+1&&r.left>=left-1&&r.right<=right+1};});assert(r.fullyVisible);return r;};

 for(const fixture of fixtures)for(const scale of [1,2]){
  await open(fixture.raw,scale);await hub();await settled();const before=await p.evaluate(()=>window.__idlever.engine.save());const target=p.locator('[data-doll-phase=next]');await target.click();await readyArt();await target.scrollIntoViewIfNeeded();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');assert(await target.evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));
  const prefix=`focus-${fixture.id}-${scale}x`,textPrefix=`text-${fixture.id}-${scale}x`;
  const info=await target.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset,focusVisible:e.matches(':focus-visible')};});
  await p.screenshot({path:`${out}/${prefix}-focused.png`,fullPage:false});const probe=await p.addStyleTag({content:'[data-doll-phase=next]{outline-color:transparent!important}'});await p.screenshot({path:`${out}/${prefix}-background.png`,fullPage:false});await probe.evaluate(e=>e.remove());
  const exact=before===await p.evaluate(()=>window.__idlever.engine.save());assert(exact);result.rows.push({fixture:fixture.id,width:402,height:681,scale,captureKind:'viewport',textPrefix,focus:[{...info,prefix}],exact});save();
 }
 await p.close();
 await Promise.all(pending);assert.equal(result.errors.length,0);const wasm=result.served.filter(x=>x.path.endsWith('.wasm'));assert(wasm.length&&wasm.every(x=>x.sha256===expectedWasm));result.sourceAfter=inventory();result.sourceUnchanged=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert(result.sourceUnchanged);result.status='PASS';save();
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
