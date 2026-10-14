import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out=process.env.IDLEVER_VOLUME_OUT ?? 'docs/evidence/cut221/coverage-first';mkdirSync(out,{recursive:true});
const expected=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await launchBrowser({gpu:true});
const result={scope:'48 controlled decoded-art pose/facing comparisons on an actual earned town; no fabricated gameplay pose',errors:[],packages:[],states:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 const packets=[];p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});
 await p.goto('http://localhost:5523/?dev=1&fresh=1&runs=0&townLight=volume');
 await p.waitForFunction(()=>window.__idlever?.booted);
 const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
 result.fixtureSha256=hash(Buffer.from(raw));
 result.preparation=await p.evaluate(async raw=>{
  const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);
  for(const id of[2,3,1])await a.engine.selectBloodline(id);
  await a.refresh();const restingSeconds=Math.max(...a.lineage.hero_slots.map(h=>h.rest_s));
  await a.engine.advance(Math.ceil(restingSeconds*1000)+1000);await a.refresh();a.go({kind:'camp'});
  if(a.lineage.hero_slots.some(h=>h.rest_s>0))throw Error('Actual rest did not complete');
  return {saved:await a.engine.save(),slots:a.lineage.hero_slots,town:a.lineage.town};
 },raw);
 writeFileSync(`${out}/preparation.json`,JSON.stringify(result.preparation,null,2));
 for(const cls of ['fighter','rogue']){
  await p.evaluate(async cls=>{const a=window.__idlever;await a.engine.selectBloodline(1);await a.engine.setClass(cls);await a.refresh();a.go({kind:'camp'});},cls);
  await p.waitForFunction(()=>window.__town?.stats().frames>0);
  await p.waitForFunction(cls=>window.__town.stats().mappedSprites.some(q=>q.kind===(cls==='fighter'?2:5)),cls,{timeout:60000});
  const before=await p.evaluate(()=>window.__idlever.engine.save());
  for(const width of[400,1440]){
   await p.setViewportSize({width,height:900});
   for(const hour of[12,18,23]){
    await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);
    await p.waitForFunction(() => window.__town.stats().mappedSprites.some(q=>q.kind===3)&&window.__town.stats().mappedSprites.some(q=>q.kind===4));
    await p.waitForTimeout(350);
    const file=`${out}/${cls}-${width}-${hour}.png`;
    await p.screenshot({path:file});
    const stats=await p.evaluate(()=>window.__town.stats());
    result.states.push({cls,width,hour,file,stats});writeFileSync(`${out}/state-progress.json`,JSON.stringify(result,null,2));
    const assets=cls==='fighter'?['hero_fighter_male','walk_fighter']:['hero_rogue_female','walk_rogue'];
    for(const asset of assets)for(const flip of[false,true]){
      const proof=await p.evaluate(async pose=>{const{inspectTownLighting}=await import('/src/render/town.ts');return inspectTownLighting(pose);},{asset,flip});
      writeFileSync(`${out}/last-proof.json`,JSON.stringify({...proof,images:undefined,screenImages:undefined},null,2));
      assert(proof && !proof.unavailable,JSON.stringify(proof));
      assert.equal(proof.shaderPatched,true);assert.equal(proof.alphaChanges,0);assert.equal(proof.unmapped,0);
      assert(proof.changedByKind[3]>0,'House2 relief actually changes pixels');
      assert(proof.changedByKind[4]>0,'Forge2 relief actually changes pixels');
      assert(proof.changedByKind[cls==='fighter'?2:5]>0,'Actual decoded hero relief changes pixels');
      for(let i=0;i<2;i++)writeFileSync(`${out}/${asset}-${flip?'left':'right'}-${width}-${hour}-${i?'volume':'neutral'}.png`,Buffer.from(proof.images[i].split(',')[1],'base64'));
      assert.equal(proof.screen.alphaChanges,0);
      assert(proof.screen.changed>0,'Full composite actually responds');
      for(let i=0;i<2;i++)writeFileSync(`${out}/${asset}-${flip?'left':'right'}-${width}-${hour}-screen-${i?'volume':'neutral'}.png`,Buffer.from(proof.screenImages[i].split(',')[1],'base64'));
      delete proof.images;delete proof.screenImages;result.coverage??=[];result.coverage.push({cls,width,hour,asset,flip,proof});
      writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));
    }
   }
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before,'Lighting inspection does not change actual save');
 }
 result.packages=await Promise.all(packets);assert(result.packages.length);
 for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});
 result.renderer=await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 assert.equal(result.coverage.length,48);assert(result.coverage.some(r=>r.hour===23&&r.proof.screen.outsideMappedChanged>0),'Declared ground occlusion is visible at night');assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({captures:result.states.length,controlledComparisons:result.coverage.length,renderer:result.renderer,packages:result.packages,errors:result.errors}));
}finally{await browser.close();}
