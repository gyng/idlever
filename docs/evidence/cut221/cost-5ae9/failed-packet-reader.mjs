import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/cost-5ae9';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={errors:[],warm:[],cold:[],packages:[],scope:'CPU submission and real shared actor/label callbacks; not GPU execution/FPS; same actual Frame/time0 for each pair'};
const browser=await launchBrowser({gpu:true}),packets=[];
const wire=p=>{p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});};
const prep=async(p,url)=>{await p.goto(`${url}?dev=1&fresh=1&runs=0&townLight=volume&effects=full`);await p.waitForFunction(()=>window.__idlever?.booted);await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});const e=document.querySelector('.town');for(const k of['width','min-width','max-width'])e.style.setProperty(k,'800px','important');for(const k of['height','min-height','max-height'])e.style.setProperty(k,'500px','important');e.style.setProperty('flex','none','important');},raw);};
const quant=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*q)];
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});wire(p);await prep(p,'http://localhost:5524/');
 for(const cls of['fighter','rogue']){
  await p.evaluate(async cls=>{const a=window.__idlever;await a.engine.setClass(cls);await a.refresh();a.go({kind:'camp'});const e=document.querySelector('.town');for(const k of['width','min-width','max-width'])e.style.setProperty(k,'800px','important');for(const k of['height','min-height','max-height'])e.style.setProperty(k,'500px','important');e.style.setProperty('flex','none','important');},cls);
  await p.waitForFunction(kind=>window.__town.stats().mappedSprites.some(q=>q.kind===kind),cls==='fighter'?2:5,{timeout:30000});
  const before=await p.evaluate(()=>window.__idlever.engine.save());
  for(const hour of[12,23]){
   const rows=await p.evaluate(async hour=>{const m=await import('/src/render/town.ts');window.__town.setHour(hour);let last=-1,count=0;const rows=[];return new Promise(resolve=>{const read=()=>{window.dispatchEvent(new PointerEvent('pointermove'));const stats=window.__town.stats();if(stats.frames!==last){last=stats.frames;count++;const pair=m.inspectTownLightingTiming(count%2===0);if(count>150)rows.push(pair);}if(rows.length===150)resolve(rows);else requestAnimationFrame(read);};requestAnimationFrame(read);});},hour);
   assert.equal(new Set(rows.map(r=>r.frame.id)).size,150);assert(rows.every(r=>r.frame.mapped.some(q=>q.kind===(cls==='fighter'?2:5))));
   const offP95=quant(rows.map(r=>r.offWithUiMs),.95),onP95=quant(rows.map(r=>r.onWithUiMs),.95);
   const record={cls,hour,warmUniqueFrames:150,sampleUniqueFrames:150,rows,offP95,onP95,deltaP95:onP95-offP95,animatedObservedP95:quant(rows.map(r=>r.observedAnimatedCpuWithUiMs),.95)};
   result.warm.push(record);writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));assert(record.deltaP95<=1,'Incremental submission+sharedUI CPU p95≤1ms');
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before);
 }
 await p.close();
 for(let i=0;i<3;i++)for(const leg of['baseline','candidate']){
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});wire(p);
  await p.addInitScript(()=>{window.__terrainCanvases=[];const original=document.createElement.bind(document);document.createElement=function(name,...args){const e=original(name,...args);if(name.toLowerCase()==='canvas')window.__terrainCanvases.push(e);return e;};});
  await prep(p,leg==='baseline'?'http://localhost:5525/':'http://localhost:5524/');await p.waitForFunction(()=>window.__town.stats().terrainPaints>0);
  const row=await p.evaluate(()=>{const c=window.__terrainCanvases.filter(c=>c.width===896&&c.height===640).at(-1),r=document.querySelector('.town').getBoundingClientRect();return{stats:window.__town.stats(),png:c.toDataURL(),dimensions:{w:r.width,h:r.height},slots:window.__idlever.lineage.hero_slots};});
  const png=Buffer.from(row.png.split(',')[1],'base64');delete row.png;result.cold.push({leg,index:i,terrainPngSha256:hash(png),...row});writeFileSync(`${out}/${leg}-${i}-terrain.png`,png);writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));await p.close();
 }
 const base=result.cold.filter(r=>r.leg==='baseline'),candidate=result.cold.filter(r=>r.leg==='candidate');assert.equal(new Set(result.cold.map(r=>r.terrainPngSha256)).size,1,'Actual cold terrain input/output remains identical');
 result.coldDeltaMedian=quant(candidate.map(r=>r.stats.terrainPaintMs),.5)-quant(base.map(r=>r.stats.terrainPaintMs),.5);assert(result.coldDeltaMedian<=5,'Cold terrain median increase≤5ms');
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.deepEqual(result.errors,[]);
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({warm:result.warm.map(({cls,hour,offP95,onP95,deltaP95,animatedObservedP95})=>({cls,hour,offP95,onP95,deltaP95,animatedObservedP95})),cold:result.cold.map(r=>({leg:r.leg,index:r.index,ms:r.stats.terrainPaintMs,png:r.terrainPngSha256})),coldDeltaMedian:result.coldDeltaMedian,errors:result.errors}));
}finally{await browser.close();}
