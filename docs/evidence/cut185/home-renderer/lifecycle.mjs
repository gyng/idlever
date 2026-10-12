import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {launchGpu} from '../../tools/browser.mjs';
const checkpoint=JSON.parse(readFileSync('scratchpad/qa_cut179_interactive/browser-state.json'));
const save=checkpoint.origins[0].localStorage.find(x=>x.name==='riddle.save').value;
const b=await launchGpu(),records=[],errors=[];
try{for(const fallback of [false,true]){
 const p=await b.newPage({viewport:{width:400,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.routeWebSocket('**',ws=>ws.close());
 if(fallback)await p.addInitScript(()=>{const f=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /^webgl/.test(k)?null:f.call(this,k,...args)};});
 await p.goto('http://127.0.0.1:53741/?dev=1&runs=0&fresh=1&seed=223');await p.waitForFunction(()=>window.__riddle?.booted);
 assert.equal(await p.evaluate(save=>window.__riddle.importSave(save),save),true);await p.waitForFunction(()=>window.__town?.stats().frames>5);
 await p.evaluate(()=>window.__town.setHour(12));await p.waitForTimeout(800);
 const before=await p.evaluate(()=>({save:window.__riddle.engine.save(),stats:window.__town.stats()}));before.save=await p.evaluate(()=>window.__riddle.engine.save());
 assert.equal(before.stats.mode,fallback?'2d':'gl');assert.equal(before.stats.characterLights,0);
 const paint=before.stats.terrainPaints;
 await p.evaluate(()=>{window.__town.setHour(23);window.__town.stress(24)});await p.waitForTimeout(1000);
 const night=await p.evaluate(()=>window.__town.stats());assert.ok(night.characterLights>=24);assert.equal(night.lights,32);
 assert.equal(night.terrainPaints,paint);assert.equal(await p.evaluate(()=>window.__riddle.engine.save()),before.save);
 await p.screenshot({path:`scratchpad/cut185-home/after/stress-${fallback?'2d':'gl'}-night.png`});
 await p.evaluate(()=>window.__town.setHour(12));await p.waitForTimeout(350);
 const wind1=await p.evaluate(()=>window.__town.stats());await p.waitForTimeout(650);const wind2=await p.evaluate(()=>window.__town.stats());
 assert.ok(wind2.windTufts>0);assert.notEqual(wind1.windSignature,wind2.windSignature);assert.equal(wind2.terrainPaints,paint);
 if(!fallback){
  await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2');window.__shadowLoss=gl.getExtension('WEBGL_lose_context');window.__shadowLoss.loseContext();});
  await p.waitForFunction(()=>window.__town.stats().mode==='2d');assert.equal(await p.evaluate(()=>window.__town.stats().terrainPaints),paint);
  await p.evaluate(()=>window.__shadowLoss.restoreContext());await p.waitForFunction(()=>window.__town.stats().mode==='gl');
  // Warm beyond the renderer's 120-frame CPU history before measuring.
  const startFrames=await p.evaluate(()=>window.__town.stats().frames);
  for(let i=0;i<40;i++){await p.mouse.move(40+i%20*10,350+i%3);await p.waitForTimeout(100);}
  await p.waitForFunction(f=>window.__town.stats().frames>f+125,startFrames);
  const busy=await p.evaluate(()=>window.__town.stats());assert.ok(busy.walkers>=24);assert.ok(busy.cpuP95<8,JSON.stringify(busy));records.push({busy,scope:'Bounded warm CPU check, not quiet-machine FPS certification'});
 }
 assert.equal(await p.evaluate(()=>window.__riddle.engine.save()),before.save);records.push({fallback,before:before.stats,night,wind1,wind2});await p.close();
}assert.deepEqual(errors,[]);
}finally{await b.close();writeFileSync('scratchpad/cut185-home/lifecycle.json',JSON.stringify({records,errors},null,2)+'\n');}
console.log('PASS GL/Canvas shadow rendering, 24 night lanterns, light cap32, wind animation, exact save/cache, context loss/restore and warm CPU p95<8ms.');
