import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { resolve } from 'node:path';
import { launchGpu } from '../../../tools/browser.mjs';
const out=resolve('docs/evidence/cut240/edge-events');mkdirSync(out,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const readText=p=>existsSync(p)?readFileSync(p,'utf8'):gunzipSync(readFileSync(p+'.gz')).toString();
const wasm=readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
const fixture=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
const result={scope:'Cut240 matched same-frame preserved-before and candidate Canvas compositors, current earned town phases and GL reference; functional/visual only, no performance claim.',source:Object.fromEntries(['web/src/render/view2d.ts','web/src/render/town.ts','web/public/art/atlas.json','web/public/art/atlas.png','web/src/render/town-volume.ts'].map(p=>[p,sha(readFileSync(p))])),wasm:{bytes:wasm.length,sha256:sha(wasm)},fixture:{path:'docs/evidence/cut218/three-actual.game.json.gz',sha256:sha(fixture)},clockEvidence:'docs/evidence/cut235/resume/client-v3-routine.json: existing town-clock36 checks; not rerun',rows:[],motion:[],diagnostics:[],packages:[],errors:[],limits:[]};
const saveProgress=()=>writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));
const ts=await import('../../../web/node_modules/typescript/lib/typescript.js');
const original=readText('docs/evidence/cut240/before/view2d.ts');
const beforeJs=ts.default.transpileModule(original.slice(original.indexOf('// ---- Cut 30')), {compilerOptions:{target:ts.default.ScriptTarget.ES2022,module:ts.default.ModuleKind.ESNext}}).outputText;
writeFileSync(`${out}/before-compositor.mjs`,beforeJs);
const probe=readFileSync('docs/evidence/cut240/probe.js','utf8');
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const log=createWriteStream(`${out}/vite.log`);
await new Promise((resolve,reject)=>{log.once("open",resolve);log.once("error",reject);});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:resolve('web'),stdio:['ignore',log,log]});
let browser;
try{
 const url=`http://localhost:${port}/`;let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert(ready,'Fresh isolated Vite startup');result.url=url;
 browser=await launchGpu();
 for(const backend of ['gl','canvas']){
  const ctx=await browser.newContext({viewport:{width:400,height:900},timezoneId:'Asia/Singapore',reducedMotion:'no-preference'});
  const p=await ctx.newPage(),packets=[];
  await p.route('**/cut240-before-compositor.mjs',r=>r.fulfill({contentType:'application/javascript',body:beforeJs}));
  await p.route('**/src/render/town.ts',async route=>{const response=await route.fetch(),body=await response.text();const marker='lightingInspector = (pose, withImages = true) => {';assert(body.includes(marker),'Dev-only probe insertion anchor');const instrumented=body.replace(marker,probe+'\n'+marker).replace(/return\s*\{\s*el,\s*setState\(s\)/,'return window.__cut240View = { el, setState(s)');writeFileSync(`${out}/served-town-${backend}.js`,instrumented);await route.fulfill({response,body:instrumented});});
  p.on('pageerror',e=>result.errors.push({backend,message:e.message}));
  p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Error creating WebGL context'))result.errors.push({backend,message:m.text()});});
  p.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))packets.push(r.body().then(b=>({backend,bytes:b.length,sha256:sha(b)})));});
  if(backend==='canvas')await p.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /^(webgl|webgl2|experimental-webgl)$/.test(k)?null:old.call(this,k,...args);};});
  await p.clock.setFixedTime('2026-10-15T22:00:00Z');
  await p.goto(`${url}?dev=1&fresh=1&runs=0`);await p.waitForFunction(()=>window.__idlever?.booted);
  const preparation=await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);for(const id of[2,3,1])await a.engine.selectBloodline(id);await a.refresh();const rest=Math.max(...a.lineage.hero_slots.map(h=>h.rest_s));if(rest>0)await a.engine.advance(Math.ceil(rest*1000)+1000);await a.refresh();a.go({kind:'camp'});return {saved:await a.engine.save(),slots:a.lineage.hero_slots,town:a.lineage.town,kind:a.kind};},fixture);
  assert.equal(preparation.kind,'wasm');
  writeFileSync(`${out}/prepared-${backend}.session.json`,preparation.saved);
  result[`${backend}Preparation`]={sha256:sha(preparation.saved),slots:preparation.slots,town:preparation.town};
  await p.waitForFunction(()=>window.__town?.stats().frames>3&&window.__town.stats().activeBuilds.length===0);
  if(backend==='gl'){
   result.renderer=await p.evaluate(()=>{const gl=document.querySelector('canvas.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});assert.match(result.renderer,/D3D12/);
  }
  const inspect=()=>p.evaluate(async()=>{const s=window.__town.stats();const q=await import('/src/render/town.ts');const proof=s.mode==='gl'?q.inspectTownLightingTiming():null;return {stats:{mode:s.mode,night:s.night,characterLights:s.characterLights,lights:s.lights,terrainPaints:s.terrainPaints,workers:s.workers,view:s.view,residentStates:s.residentStates,mappedSprites:s.mappedSprites},frame:proof?.frame??null};});
  for(const width of[400]){
   await p.setViewportSize({width,height:900});await p.waitForTimeout(350);
   const base=await inspect(),before=await p.evaluate(()=>window.__idlever.engine.save());
   for(const [name,utc,night] of [['night','15:00:00',1]]){
    await p.clock.setFixedTime(`2026-10-15T${utc}Z`);await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove')));
    await p.waitForFunction(n=>Math.abs(window.__town.stats().night-n)<1e-8,night);await p.waitForTimeout(250);
    const row=await inspect();assert.equal(row.stats.mode,backend==='gl'?'gl':'2d');assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before);assert.equal(row.stats.terrainPaints,base.stats.terrainPaints);assert(row.stats.lights<=32);
    const path=`${backend}-${width}-${name}.png`;await p.screenshot({path:`${out}/${path}`});
    const pair=await p.evaluate(async()=>{const {drawTown2D:before}=await import('/cut240-before-compositor.mjs');return window.__cut240Inspect(before);});
    for(const [mode,data] of Object.entries(pair.images))writeFileSync(`${out}/${backend}-${width}-${name}-same-frame-${mode}.png`,Buffer.from(data.split(',')[1],'base64'));
    delete pair.images;assert.equal(pair.pixels.alphaChanges,0);assert(pair.pixels.maxSourceExcess<=1);assert.equal(pair.pixels.afterOverexposed,0);assert.equal(pair.pixels.afterClipped,0);assert.equal(pair.pixels.outsideChanged,0);
    result.rows.push({pair,backend,width,phase:name,clock:'Asia/Singapore local '+({dawn:'06:00',noon:'12:00',dusk:'19:00',night:'23:00'}[name]),path,...row,exactSave:true,noTerrainRepaint:true});saveProgress();
   }
  }
  const beforeSave=await p.evaluate(()=>window.__idlever.engine.save()),paints=(await inspect()).stats.terrainPaints;
  // Diagnostic presentation-only false->true construction transition exercises the existing
  // arrival path from beyond the town camera; it does not build/reset anything in Rust.
  await p.evaluate(async()=>{document.documentElement.dataset.juice='on';(await import('/src/render/fxpref.ts')).setEffectsLevel('full');const {townState}=await import('/src/render/town.ts');const s=townState(window.__idlever.lineage);window.__cut240View.setState({...s,home:false,residents:[]});window.__cut240View.setState(s);});
  result.edgeSamples??=[];
  const stream=await p.evaluate(async()=>{document.documentElement.dataset.juice='on';const start=window.__cut240Frame().runtime.t,deadline=performance.now()+30000,rows=[];while(window.__cut240Frame().runtime.t<start+2.5&&performance.now()<deadline){window.__cut240View.poke();await new Promise(requestAnimationFrame);rows.push(window.__cut240Frame());}return rows;});
  result.edgeSamples.push(...stream.map((r,index)=>({backend,index,...r})));
  await p.screenshot({path:`${out}/${backend}-diagnostic-arrival-completed.png`});
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),beforeSave);
  result.edgeLimits='Scene-only diagnostic construction transition may refit/repaint terrain; no zero-repaint claim for that setup. Original earned phase/fade/preference legs retain exact paint counters.';
  result.packages.push(...await Promise.all(packets));
  await ctx.close();saveProgress();
 }
 for(const p of result.packages)assert.deepEqual({bytes:p.bytes,sha256:p.sha256},result.wasm);
 assert.equal(result.rows.length,2);assert.deepEqual(result.errors,[]);
 result.limits.push('Dev-only harness response injection exposes the actual current TownFrame to both compositors; production source is not instrumented.','GL remains the reference composition and has no production change.','No FPS/frame-cost claims; natural fade/camera-edge remain separate bounded diagnostics.');
 result.status='captured; paired pixel checks pass; visual review pending';saveProgress();console.log(JSON.stringify({rows:result.rows.length,motion:result.motion.length,diagnostics:result.diagnostics.length,errors:result.errors,renderer:result.renderer}));
}catch(e){result.failure=String(e.stack??e);result.status='failed';saveProgress();throw e;}finally{if(browser)await browser.close();vite.kill('SIGTERM');log.end();}
