import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const out='docs/evidence/cut221/baseline-earned';mkdirSync(out,{recursive:true});
const expected=readFileSync('/tmp/idlever-cut221-baseline/web/src/engine/pkg/idlever_wasm_bg.wasm');
const hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await launchBrowser({gpu:true});
const result={scope:'Initial actual current-source baseline; natural poses, not the complete48-state contract',errors:[],packages:[],states:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));
 const packets=[];p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({bytes:b.length,sha256:hash(b)})));});
 await p.goto('http://localhost:5520/?dev=1&fresh=1&runs=0&townLight=planes');
 await p.waitForFunction(()=>window.__idlever?.booted);
 const raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
 result.fixtureSha256=hash(Buffer.from(raw));
 result.preparation=await p.evaluate(async raw=>{
  const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);
  for(const id of[2,3,1])await a.engine.selectBloodline(id);
  await a.engine.advance(130000);await a.refresh();a.go({kind:'camp'});
  return {saved:await a.engine.save(),slots:a.lineage.hero_slots,town:a.lineage.town};
 },raw);
 for(const cls of ['fighter','rogue']){
  await p.evaluate(async cls=>{const a=window.__idlever;await a.engine.selectBloodline(1);await a.engine.setClass(cls);await a.refresh();a.go({kind:'camp'});},cls);
  await p.waitForFunction(()=>window.__town?.stats().frames>0);
  const before=await p.evaluate(()=>window.__idlever.engine.save());
  for(const width of[400,1440]){
   await p.setViewportSize({width,height:900});
   for(const hour of[12,18,23]){
    await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);
    await p.waitForTimeout(350);
    const file=`${out}/${cls}-${width}-${hour}.png`;
    await p.screenshot({path:file});
    const stats=await p.evaluate(()=>window.__town.stats());
    result.states.push({cls,width,hour,file,stats});
   }
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before,'Lighting inspection does not change actual save');
 }
 result.packages=await Promise.all(packets);assert(result.packages.length);
 for(const pkg of result.packages)assert.deepEqual(pkg,{bytes:expected.length,sha256:hash(expected)});
 result.renderer=await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify({captures:result.states.length,renderer:result.renderer,packages:result.packages,errors:result.errors}));
}finally{await browser.close();}
