import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/upgrade-footprints-71ca';mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=readFileSync('/tmp/idlever-cut221-all-art/web/src/engine/pkg/idlever_wasm_bg.wasm');
const frames=JSON.parse(readFileSync('web/public/art/atlas.json')).frames;
const idles=Object.keys(frames).filter(k=>/^hero_(fighter|rogue|caster|ranger|gunner)(?:_(male|female|cat))?$/.test(k)).sort();
const walks=Object.keys(frames).filter(k=>/^walk_(fighter|rogue|caster|ranger|gunner)$/.test(k)).sort();
const buildings=Object.keys(frames).filter(k=>/^town_(house|blacksmith)_[123]$/.test(k)).sort();
const assets=[...idles,...idles.map(k=>`town_seated:${k}`),...walks,...buildings];
const browser=await launchBrowser({gpu:true}),packets=[];
const result={scope:'Eight controlled old/new House/Forge tier overlaps from actual Frame; presentation footprint family invariants only, not actual paid construction',inventory:{idles,walks,buildings,assets,missing:['hero_gunner_female','hero_gunner_cat','walk_gunner','all look-specific walk paintings']},errors:[],packages:[],rows:[],states:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})).catch(e=>({packetError:e.message})));});
 await p.goto('http://localhost:5532/?dev=1&fresh=1&runs=0&townLight=volume');await p.waitForFunction(()=>window.__idlever?.booted);
 const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
 result.preparation=await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();await a.engine.advance(Math.ceil(Math.max(...a.lineage.hero_slots.map(h=>h.rest_s))*1000)+1000);await a.refresh();a.go({kind:'camp'});return{slots:a.lineage.hero_slots,town:a.lineage.town,saved:await a.engine.save()};},raw);
 for(const family of['house','blacksmith'])for(const tier of[1,2])for(const flip of[false,true]){
  await p.evaluate(()=>{window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));});
  await p.waitForFunction(()=>window.__town.stats().frames>2&&window.__town.stats().mappedSprites.some(q=>q.kind===3)&&window.__town.stats().mappedSprites.some(q=>q.kind===4));
  const pose={asset:`town_${family}_${tier}`,overlayAsset:`town_${family}_${tier+1}`,flip};
  const proof=await p.evaluate(async pose=>{const m=await import('/src/render/town.ts');return m.inspectTownLighting(pose,false);},pose);
  result.rows.push({pose,proof});writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));assert(proof&&!proof.unavailable);assert.equal(proof.alphaChanges,0);assert.equal(proof.unmapped,0);assert.equal(proof.screen.alphaChanges,0);assert.equal(proof.footprints.length,2);assert(proof.footprints.every(b=>b.halfW>0&&b.halfH>0));assert.deepEqual(proof.footprints.map(b=>b.family),['house','forge']);
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),result.preparation.saved);
 }
 result.packages=await Promise.all(packets);for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});assert(result.packages.length);assert.equal(result.rows.length,8);assert.deepEqual(result.errors,[]);
 result.renderer=await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({comparisons:result.rows.length,assets:assets.length,renderer:result.renderer,errors:result.errors,packages:result.packages}));
}catch(e){result.failure={message:e.message,stack:e.stack};result.packages=await Promise.all(packets);writeFileSync(`${out}/failed.json`,JSON.stringify(result,null,2));throw e;}finally{await browser.close();}
