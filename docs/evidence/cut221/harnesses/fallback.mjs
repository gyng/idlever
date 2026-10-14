import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/fallback-5ae9';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const browser=await launchBrowser({gpu:true}),result={errors:[],rows:[],packages:[]},packets=[];
try{
 for(const missing of[false,true])for(const canvas of[false,true]){
  const p=await browser.newPage({viewport:{width:400,height:900},reducedMotion:'no-preference'});
  p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
  p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});
  if(missing)await p.route('**/art/atlas.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frames:{},image:'atlas.png'})}));
  await p.goto('http://localhost:5523/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
  await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});},raw);
  for(const cls of['fighter','rogue']){
   const saved=await p.evaluate(async cls=>{const a=window.__idlever;await a.engine.selectBloodline(1);await a.engine.setClass(cls);await a.refresh();a.go({kind:'camp'});return a.engine.save();},cls);
   if(canvas){await p.evaluate(()=>document.querySelector('.town-gl').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await p.waitForFunction(()=>window.__town.stats().mode==='2d');}
   for(const width of[400,1440])for(const pref of['full','low','off','reduced']){
    await p.setViewportSize({width,height:900});await p.emulateMedia({reducedMotion:pref==='reduced'?'reduce':'no-preference'});
    await p.evaluate(async pref=>{const{setEffectsLevel}=await import('/src/render/fxpref.ts');setEffectsLevel(pref==='reduced'?'full':pref);window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));},pref);
    await p.waitForFunction(()=>window.__town.stats().night===1);await p.waitForTimeout(400);
    const row=await p.evaluate(()=>({stats:window.__town.stats(),slots:window.__idlever.lineage.hero_slots}));
    assert.equal(row.stats.mode,canvas?'2d':'gl');assert.equal(row.stats.dimensionalLight,!canvas&&pref!=='off');assert(row.stats.lights<=32);assert(row.slots.every(h=>h.life_state==='ready'&&h.rest_s===0));
    if(missing)assert.equal(row.stats.mappedSprites.length,0,'Missing packed art does not acquire fake relief');
    assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),saved,'Settings and visual fallback do not mutate game save');
    result.rows.push({missing,canvas,cls,width,pref,...row});writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
    if(width===400&&pref==='full')await p.screenshot({path:`${out}/${missing?'primitive':'packed'}-${canvas?'canvas':'gl'}-${cls}-night.png`});
   }
  }
  await p.close();
 }
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.deepEqual(result.errors,[]);assert.equal(result.rows.length,64);
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({states:result.rows.length,errors:result.errors,packages:result.packages}));
}finally{await browser.close();}
