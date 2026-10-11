import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchGpu} from '/home/g/p/riddle/tools/browser.mjs';
if(!process.argv.includes('--cohort-released')) throw new Error('Run only after both independent playtest browsers release the GPU.');
const out='/tmp/riddle-menu-polish/scratchpad/grass-wind/gpu';
await mkdir(out,{recursive:true});
const browser=await launchGpu();
const evidence={status:'running',fixture:'real WASM cold town, diagnostic midnight, 24 cosmetic stress walkers',rows:[]};
try {
 for(const width of [400,1440]) {
  const p=await browser.newPage({viewport:{width,height:width===400?800:900},reducedMotion:'no-preference'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5273/?dev=1&fresh=1&seed=13817&runs=0');
  await p.waitForFunction(()=>window.__riddle?.booted&&window.__town?.stats().windTufts>5);
  const renderer=await p.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';});
  assert.match(renderer,/D3D12.*NVIDIA/i);
  assert.equal(await p.evaluate(()=>window.__riddle.kind),'wasm');
  const save=await p.evaluate(()=>window.__riddle.engine.save());
  await p.evaluate(()=>{window.__town.setHour(23);window.__town.stress(24);window.dispatchEvent(new Event("pointermove"));});
  await p.waitForTimeout(3500);
  const before=await p.evaluate(()=>window.__town.stats());
  const sample=await p.evaluate(()=>new Promise(resolve=>{
   const initial=window.__town.stats(),start=performance.now();let displayFrames=0;
   const input=setInterval(()=>window.dispatchEvent(new Event("pointermove")),150);
   const step=()=>{displayFrames++;const elapsed=performance.now()-start;if(elapsed<6000)requestAnimationFrame(step);else {clearInterval(input);resolve({elapsedMs:elapsed,displayFrames,townFrames:window.__town.stats().frames-initial.frames,stats:window.__town.stats()});}};requestAnimationFrame(step);
  }));
  const ratio=sample.townFrames/sample.displayFrames;
  evidence.rows.push({width,renderer,before,sample,displayRateRatio:ratio,errors});
  assert.ok(ratio>=0.95,`Town/display frame ratio ${ratio}`);
  assert.ok(sample.stats.cpuP95<8,`Warm CPU p95 ${sample.stats.cpuP95}ms`);
  assert.equal(sample.stats.mode,'gl');assert.ok(sample.stats.walkers>=24);
  assert.notEqual(before.windSignature,sample.stats.windSignature);
  assert.equal(before.terrainPaints,sample.stats.terrainPaints);
  assert.equal(await p.evaluate(()=>window.__riddle.engine.save()),save);
  assert.deepEqual(errors,[]);
  await p.screenshot({path:`${out}/${width}-night.png`});
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForFunction(()=>!window.__town.stats().running);
  const hiddenStart=await p.evaluate(()=>window.__town.stats().frames);
  await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(()=>window.__town.stats().frames),hiddenStart);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForFunction(()=>window.__town.stats().running);
  await p.close();
 }
 evidence.status='pass';
} catch(error) {evidence.status='fail';evidence.error=String(error);throw error;}
finally {await writeFile(`${out}/checks.json`,JSON.stringify(evidence,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(evidence));
