import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/ready-targets-71ca-settled';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={errors:[],classes:[],samples:[],packages:[]};
const browser=await launchBrowser({gpu:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const packets=[];p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});
 await p.goto('http://localhost:5526/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
 await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});},raw);
 result.geometry=[];
 const before=await p.evaluate(()=>window.__idlever.engine.save());
 for(const width of[320,400,1440])for(const scale of[1,2]){
  await p.setViewportSize({width,height:900});
  await p.evaluate(scale=>{document.documentElement.style.fontSize=`${16*scale}px`;window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));},scale);
  await p.waitForFunction(()=>window.__town.stats().frames>=2&&window.__town.stats().view[2]>10&&[...document.querySelectorAll('[data-home-hero]')].filter(e=>!e.hidden).length===3);
  for(let i=0;i<12;i++){
   await p.waitForTimeout(180);await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove')));
   const row=await p.evaluate(()=>{
    const host=document.querySelector('.town').getBoundingClientRect();
    const rect=e=>{const r=e.getBoundingClientRect();return{id:e.dataset.homeHero||e.dataset.buildingInfo,x:r.x,y:r.y,w:r.width,h:r.height};};
    const actors=[...document.querySelectorAll('[data-home-hero]')].filter(e=>!e.hidden).map(rect);
    const labels=[...document.querySelectorAll('.town-building-info:not([hidden])')].map(rect);
    const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
    const hits=actors.map(a=>({id:a.id,hit:document.elementFromPoint(a.x+a.w/2,a.y+a.h/2)?.closest('[data-home-hero]')?.dataset.homeHero}));
    return{actors,labels,hits,host:{x:host.x,y:host.y,w:host.width,h:host.height},actorOverlaps:actors.flatMap((a,i)=>actors.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.id,b.id])),labelOverlaps:labels.flatMap(a=>actors.filter(b=>overlap(a,b)).map(b=>[a.id,b.id])),stats:window.__town.stats(),overflow:document.documentElement.scrollWidth-innerWidth,slots:window.__idlever.lineage.hero_slots};
   });
   result.geometry.push({width,scale,index:i,...row});writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
   assert.equal(row.actors.length,3);assert.deepEqual(row.actorOverlaps,[]);assert.deepEqual(row.labelOverlaps,[]);assert.equal(row.overflow,0);
   assert(row.slots.every(h=>h.life_state==='ready'&&h.rest_s===0));assert(row.stats.residentStates.every(h=>!h.resting));
   assert(row.hits.every(h=>h.id===h.hit));assert(row.actors.every(a=>a.w>=44&&a.h>=44&&a.x>=row.host.x&&a.y>=row.host.y&&a.x+a.w<=row.host.x+row.host.w&&a.y+a.h<=row.host.y+row.host.h));
  }
  await p.screenshot({path:`${out}/${width}-${scale}-ready.png`});
 }
 assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before);
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.deepEqual(result.errors,[]);
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({geometrySamples:result.geometry.length,errors:result.errors,packages:result.packages}));
}finally{await browser.close();}
