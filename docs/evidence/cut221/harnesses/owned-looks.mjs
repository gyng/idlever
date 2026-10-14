import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/owned-looks-71ca';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),expected=readFileSync('/tmp/idlever-cut221-all-art/web/src/engine/pkg/idlever_wasm_bg.wasm');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const browser=await launchBrowser({gpu:true}),packets=[],result={scope:'Actual public selected Fighter/Rogue ×male/female/cat, real movement/night lanterns and exact resolved art identities; owned classes only',entries:[],errors:[],packages:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})).catch(e=>({packetError:e.message})));});
 await p.goto('http://localhost:5531/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
 await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});},raw);
 for(const cls of['fighter','rogue'])for(const look of['male','female','cat']){
  const entry=await p.evaluate(async({cls,look})=>{const a=window.__idlever;await a.engine.setClass(cls);await a.engine.setLook(look);await a.refresh();a.go({kind:'camp'});window.__town.setHour(23);return{slots:a.lineage.hero_slots,saved:await a.engine.save()};},{cls,look});
  const slot=entry.slots.find(h=>h.id===1);assert.equal(slot.class,cls);assert.equal(slot.look,look);assert(entry.slots.every(h=>h.life_state==='ready'&&h.rest_s===0));entry.cls=cls;entry.look=look;entry.samples=[];
  await p.waitForFunction(()=>window.__town.stats().frames>2&&window.__town.stats().mappedSprites.some(q=>q.actorId==='resident:1'));
  for(let i=0;i<24;i++){
   await p.waitForTimeout(300);await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove')));
   const stats=await p.evaluate(()=>window.__town.stats()),pose=stats.mappedSprites.find(q=>q.actorId==='resident:1');
   assert(pose);const allowed=[`hero_${cls}_${look}`];if(look===(cls==='fighter'?'male':'female'))allowed.push(`walk_${cls}`);assert(allowed.includes(pose.asset),`Selected ${cls}/${look} retained while moving: ${pose.asset}`);assert(stats.characterLights>0);assert(stats.lights<=32);entry.samples.push({pose,lights:stats.characterLights,frames:stats.frames});
  }
  assert(new Set(entry.samples.map(s=>`${s.pose.x},${s.pose.y}`)).size>1,'Actual hero roams, not controlled movement');
  for(const width of[400,1440])for(const hour of[12,23]){
   await p.setViewportSize({width,height:900});await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);await p.waitForTimeout(300);await p.screenshot({path:`${out}/${cls}-${look}-${width}-${hour}.png`});
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),entry.saved);result.entries.push(entry);writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
 }
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({actualLooks:result.entries.length,samples:result.entries.reduce((n,e)=>n+e.samples.length,0),errors:result.errors,packages:result.packages}));
}catch(e){result.failure={message:e.message,stack:e.stack};result.packages=await Promise.all(packets);writeFileSync(`${out}/failed.json`,JSON.stringify(result,null,2));throw e;}finally{await browser.close();}
