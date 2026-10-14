import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/all-art-backends-71ca';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),expected=readFileSync('/tmp/idlever-cut221-all-art/web/src/engine/pkg/idlever_wasm_bg.wasm');
const f=JSON.parse(readFileSync('web/public/art/atlas.json')).frames;
const idles=Object.keys(f).filter(k=>/^hero_(fighter|rogue|caster|ranger|gunner)(?:_(male|female|cat))?$/.test(k)).sort();
const assets=[...idles,...idles.map(k=>`town_seated:${k}`),...Object.keys(f).filter(k=>/^(walk_(fighter|rogue|ranger|caster)|town_(house|blacksmith)_[123])$/.test(k)).sort()];
const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={scope:'1472 controlled art deliveries across all46 existing hero/derived-seated/walk/building assets, two widths, four preferences, packed/primitive and GL/Canvas. Actual class ownership is not changed. Canvas remains its ordinary2D fallback, not normal-map parity.',rows:[],errors:[],packages:[]};
const browser=await launchBrowser({gpu:true}),packets=[];
try{
 for(const missing of[false,true])for(const canvas of[false,true]){
  const p=await browser.newPage({viewport:{width:400,height:900},reducedMotion:'no-preference'});
  p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
  p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})).catch(e=>({packetError:e.message})));});
  if(missing)await p.route('**/art/atlas.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({frames:{},image:'atlas.png'})}));
  await p.goto('http://localhost:5531/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
  await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});window.__town.setHour(23);},raw);
  await p.waitForFunction(()=>window.__town.stats().frames>2);
  if(canvas){await p.evaluate(()=>document.querySelector('.town-gl').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await p.waitForFunction(()=>window.__town.stats().mode==='2d');}
  const saved=await p.evaluate(()=>window.__idlever.engine.save());
  for(const width of[400,1440])for(const pref of['full','low','off','reduced']){
   await p.setViewportSize({width,height:900});await p.emulateMedia({reducedMotion:pref==='reduced'?'reduce':'no-preference'});
   await p.evaluate(async pref=>{const m=await import('/src/render/fxpref.ts');m.setEffectsLevel(pref==='reduced'?'full':pref);window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));},pref);
   await p.waitForFunction(({canvas,pref})=>window.__town.stats().night===1&&window.__town.stats().dimensionalLight===(!canvas&&pref!=='off'),{canvas,pref});await p.waitForTimeout(200);
   for(const asset of assets){
    const proof=await p.evaluate(async pose=>{const m=await import('/src/render/town.ts');return m.inspectTownArtPose(pose);},{asset,flip:false});
    result.rows.push({missing,canvas,width,pref,asset,proof});
    assert(proof&&!proof.unavailable,JSON.stringify(proof));assert.equal(proof.specimen.asset,asset);assert.equal(proof.specimen.controlled,true);assert.equal(proof.specimen.decoded,!missing);assert.equal(proof.backend,canvas?'2d':'gl');assert.equal(proof.dimensionalLight,!canvas&&pref!=='off');assert.equal(proof.reducedMotion,pref==='reduced');assert(proof.pixelBytes>0&&proof.opaquePixels>0&&proof.checksum!==0);
   }
   const stats=await p.evaluate(()=>window.__town.stats());assert(stats.lights<=32);if(missing)assert.equal(stats.mappedSprites.length,0);
   assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),saved);writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
  }
  await Promise.all(packets);await p.close();
 }
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.equal(result.rows.length,1472);assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({deliveries:result.rows.length,errors:result.errors,packages:result.packages}));
}catch(e){result.failure={message:e.message,stack:e.stack};result.packages=await Promise.all(packets);writeFileSync(`${out}/failed.json`,JSON.stringify(result,null,2));throw e;}finally{await browser.close();}
