import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
import {trackPagePackages} from './package-readers.mjs';
const out=process.env.IDLEVER_LIGHTING_OUT,base=process.env.IDLEVER_LIGHTING_URL;
assert(out&&base,'Explicit fresh URL/output required');mkdirSync(out,{recursive:true});
const expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm'),hash=b=>createHash('sha256').update(b).digest('hex');
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={scope:'Normal default URL and explicit flat comparison; real earned residents, no controlled art/unlocks; settings and GL context-loss fallback',rows:[],packages:[],deliveries:[],errors:[]},packets=[];
const browser=await launchBrowser({gpu:true});
try{
 for(const mode of['default','flat'])for(const missing of[false,true])for(const canvas of[false,true]){
  const p=await browser.newPage({viewport:{width:400,height:900}}),reader=trackPagePackages(p,packets);
  p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
  if(missing)await p.route('**/art/atlas.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frames:{},image:'atlas.png'})}));
  await p.goto(`${base}?dev=1&fresh=1&runs=0${mode==='flat'?'&townLight=flat':''}`);await p.waitForFunction(()=>window.__idlever?.booted);
  assert.equal(new URL(p.url()).searchParams.has('townLight'),mode==='flat');
  await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});},raw);
  await p.waitForFunction(()=>window.__town.stats().frames>2);
  if(canvas){await p.evaluate(()=>document.querySelector('.town-gl').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await p.waitForFunction(()=>window.__town.stats().mode==='2d');}
  const saved=await p.evaluate(()=>window.__idlever.engine.save());
  for(const width of[400,1440])for(const pref of['full','low','off','reduced'])for(const hour of[12,23]){
   await p.setViewportSize({width,height:900});await p.emulateMedia({reducedMotion:pref==='reduced'?'reduce':'no-preference'});
   await p.evaluate(async({pref,hour})=>{const m=await import('/src/render/fxpref.ts');m.setEffectsLevel(pref==='reduced'?'full':pref);window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},{pref,hour});
   await p.waitForTimeout(120);const stats=await p.evaluate(()=>window.__town.stats());
   const on=!canvas&&mode==='default'&&pref!=='off';assert.equal(stats.mode,canvas?'2d':'gl');assert.equal(Boolean(stats.dimensionalLight),on);assert.equal(stats.volumeLight,on);assert(stats.lights<=32);
   if(missing)assert.equal(stats.mappedSprites.length,0);else if(on)assert(stats.mappedSprites.some(q=>q.actorId?.startsWith('resident:')));
   assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),saved);
   result.rows.push({mode,missing,canvas,width,pref,hour,stats});
   if(mode==='default'&&!missing&&!canvas&&pref==='full')await p.screenshot({path:`${out}/default-${width}-${hour}.png`});
  }
  result.deliveries.push(await reader.close());writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
 }
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert.equal(result.rows.length,128);assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({states:result.rows.length,packages:result.packages.length,sha256:hash(expected),errors:result.errors}));
}catch(e){result.failure={message:e.message,stack:e.stack};result.packages=await Promise.all(packets);writeFileSync(`${out}/failed.json`,JSON.stringify(result,null,2));throw e;}finally{await browser.close();}
