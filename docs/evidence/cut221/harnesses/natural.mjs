import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/natural-5ae9';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={errors:[],classes:[],samples:[],packages:[]};
const browser=await launchBrowser({gpu:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const packets=[];p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});
 await p.goto('http://localhost:5523/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
 await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});},raw);
 for(const cls of ['fighter','rogue']){
  const entry=await p.evaluate(async cls=>{const a=window.__idlever;await a.engine.selectBloodline(1);await a.engine.setClass(cls);await a.refresh();a.go({kind:'camp'});return{slots:a.lineage.hero_slots,selected:a.lineage.selected_bloodline,saved:await a.engine.save()};},cls);
  const slot=entry.slots.find(h=>h.id===1);assert.equal(slot.class,cls);assert.equal(slot.look,cls==='fighter'?'male':'female');assert(entry.slots.every(h=>h.rest_s===0&&h.life_state==='ready'));
  await p.waitForFunction(kind=>window.__town.stats().mappedSprites.some(q=>q.kind===kind),cls==='fighter'?2:5,{timeout:30000});
  await p.evaluate(()=>{window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));});await p.waitForFunction(()=>window.__town.stats().night===1&&window.__town.stats().characterLights>0);
  entry.cls=cls;entry.initial=await p.evaluate(()=>window.__town.stats());result.classes.push(entry);
  for(let i=0;i<18;i++){
   await p.waitForTimeout(350);await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove')));
   const sample=await p.evaluate(async()=>{const{inspectTownLighting}=await import('/src/render/town.ts');const proof=inspectTownLighting();delete proof.images;delete proof.screenImages;return{stats:window.__town.stats(),proof,slots:window.__idlever.lineage.hero_slots};});
   assert(sample.stats.characterLights>0);assert(sample.stats.lights<=32);assert.equal(sample.proof.alphaChanges,0);assert.equal(sample.proof.unmapped,0);assert.equal(sample.proof.screen.alphaChanges,0);
   result.samples.push({cls,index:i,...sample});writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),entry.saved);await p.screenshot({path:`${out}/${cls}-natural-night.png`});
 }
 assert.equal(result.samples.length,36);assert(result.samples.some(s=>s.proof.screen.outsideMappedChanged>0));
 for(const cls of['fighter','rogue']){const poses=result.samples.filter(s=>s.cls===cls).flatMap(s=>s.stats.mappedSprites.filter(q=>q.kind===(cls==='fighter'?2:5)));assert(new Set(poses.map(q=>`${q.x},${q.y}`)).size>1,'Actual Ready hero moves naturally');}
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.deepEqual(result.errors,[]);
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({samples:result.samples.length,actualLooks:result.classes.map(c=>c.slots.find(h=>h.id===1).look),errors:result.errors,packages:result.packages}));
}finally{await browser.close();}
