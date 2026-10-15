// Paired production-viewer cost; run only under the quiet protocol in cost-protocol.md.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,symlinkSync,existsSync,readdirSync} from 'node:fs';
import {resolve,relative,join,basename} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import net from 'node:net';
import {launchGpu} from '../../../tools/browser.mjs';
import {instrumentFrame} from './cost-instrumentation.mjs';
assert(process.argv.includes('--quiet'), 'First verify all native gates and other browser jobs terminal; see cost-protocol.md');
try { process.kill(3506268,0); throw Error('Original native gate wrapper is still live: no cost run'); }
catch(e) { if(e.code!=='ESRCH') throw e; }
const outArg=process.argv.indexOf('--out');
const control=process.argv.includes('--baseline-control');
const interleaved=process.argv.includes('--interleaved');
const symmetric=process.argv.includes('--symmetric-driver');
assert(!symmetric||interleaved,'Symmetric driver requires interleaved sampling');
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const quietPids=arg('--quiet-pids','').split(',').filter(Boolean).map(Number);
assert(quietPids.every(p=>Number.isInteger(p)&&p>1),'Quiet handles must be positive process IDs');
for(const pid of quietPids){
 try{process.kill(pid,0);throw Error(`Owned job ${pid} is still live: no cost run`);}
 catch(e){if(e.code!=='ESRCH')throw e;}
}
const widths=arg('--widths','400,1440').split(',').map(Number);
const requestedCases=arg('--cases','fens,crypt,foundry').split(',');
const root=resolve('.'), out=resolve(outArg<0?'docs/evidence/cut245/cost-final':process.argv[outArg+1]);
assert(!existsSync(join(out,'results.json')), 'Keep original attempts; select a new output directory for a new run');
mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const replayRaw=gunzipSync(readFileSync('docs/evidence/handoff-content/run131.replay.json.gz'));
const replay=JSON.parse(replayRaw);
const cases=JSON.parse(readFileSync('docs/evidence/cut245/after-v3/results.json')).cases.filter(c=>requestedCases.includes(c.id)).map(c=>({...c,floor:replay.floors.find(f=>f.snapshot.depth===c.depth)}));
assert(cases.length===new Set(requestedCases).size&&cases.length>0,'Every requested actual case must exist');
assert(widths.length&&widths.every(w=>w===400||w===1440),'Explicit400/1440viewports required');
const result={harnessSha256:hash(readFileSync(new URL(import.meta.url))),instrumentationSha256:hash(readFileSync(new URL('./cost-instrumentation.mjs',import.meta.url))),art:Object.fromEntries(['web/public/art/atlas.json','web/public/art/atlas.png'].map(p=>[p,hash(readFileSync(p))])),scope:control?'Diagnostic A/A identical pre-landmark renderer; no candidate cost acceptance':'Quiet paired stored-replay renderer cost only; no earned-progression/full-game claim',control,interleaved,symmetric,quietPids,protocol:'cost-protocol.md',source:{},served:[],rows:[],errors:[],replaySha256:hash(replayRaw),archiveSha256:hash(readFileSync('docs/evidence/cut245/renderer-before.tar.gz'))};
const save=()=>writeFileSync(join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
const servers=[];
let browser;
const manifests={};
function inventory(dir) {
 const entries={};
 function visit(p) { for(const e of readdirSync(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())visit(f);else if(e.isFile())entries[relative(dir,f)]=hash(readFileSync(f));} }
 visit(dir);return entries;
}
async function server(leg) {
 const project=resolve('scratchpad',`cut245-${basename(out)}-isolated`,leg), web=join(project,'web');
 mkdirSync(web,{recursive:true});
 cpSync(control&&leg==='candidate'?resolve('scratchpad',`cut245-${basename(out)}-isolated`,'baseline/web/src'):'web/src',join(web,'src'),{recursive:true});
 if(leg==='baseline'||control) {
  execFileSync('tar',['xzf',resolve('docs/evidence/cut245/renderer-before.tar.gz'),'-C',project]);
  writeFileSync(join(web,'src/render/fallback.ts'),execFileSync('git',['show','2a4bb2c5:web/src/render/fallback.ts']));
 }
 if(leg==='baseline'||control) {
  const before=JSON.parse(readFileSync('docs/evidence/cut245/before-identity.json')).files;
  for(const [path,sha] of Object.entries(before))assert.equal(hash(readFileSync(join(project,path))),sha,`baseline archive mismatch: ${path}`);
 }
 manifests[leg]=inventory(join(web,'src'));
 result.source[leg]=manifests[leg];
 symlinkSync(resolve('web/node_modules'),join(web,'node_modules'),'dir');
 symlinkSync(resolve('web/public'),join(web,'public'),'dir');
 writeFileSync(join(web,'index.html'),'<!doctype html><style>html,body{margin:0;background:#0d0c14}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>');
 writeFileSync(join(web,'vite.config.mjs'),`export default {server:{hmr:false,watch:null,fs:{allow:[${JSON.stringify(root)}]}}};`);
 const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
 const child=spawn(process.execPath,[resolve('web/node_modules/vite/bin/vite.js'),'--port',String(port),'--strictPort'],{cwd:web,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>writeFileSync(join(out,`${leg}-server.log`),b,{flag:'a'}));
 child.stderr.on('data',b=>writeFileSync(join(out,`${leg}-server.log`),b,{flag:'a'}));
 servers.push(child);
 const url=`http://127.0.0.1:${port}/`;
 for(let i=0;i<150;i++){try{if((await fetch(url)).ok)return url;}catch{}await new Promise(r=>setTimeout(r,100));}
 throw Error(`${leg} server did not start`);
}
const percentile=(values,p)=>{const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))]??null;};
try {
 const urls={baseline:await server('baseline'),candidate:await server('candidate')};
 if(control)assert.deepEqual(manifests.baseline,manifests.candidate,'A/A source copies must be identical');
 save();
 browser=await launchGpu();
 result.browserVersion=browser.version();save();
 const context=await browser.newContext({deviceScaleFactor:1.5,reducedMotion:'reduce',serviceWorkers:'block'});
 for(let rep=0;rep<7;rep++)for(const width of widths)for(const c of cases)for(const leg of rep%2?['candidate','baseline']:['baseline','candidate']) {
  const p=await context.newPage();
  await p.setViewportSize({width,height:width===400?640:800});
  p.on('pageerror',e=>result.errors.push({leg,message:String(e)}));
  // Capture actual resolved GPU queries, identically in both legs; no GPU operation added.
  await p.route('**/src/render/gputimer.ts',async route=>{
   const response=await route.fetch(), original=await response.text();
   const needle='this.samples.push(this.ms);';
   assert(original.includes(needle),'Resolved-query instrumentation point missing');
   const body=original.replace(needle,needle+' globalThis.__landmarkGPU?.push({ms:this.ms,resolved:this.resolved+1,disjoint:this.disjoint});');
   result.served.push({leg,path:'/src/render/gputimer.ts',originalSha256:hash(original),instrumentedSha256:hash(body)});
   await route.fulfill({response,body});
  });
  await p.goto(urls[leg]);
  await p.evaluate(async()=>{window.renderModule=await import('/src/render/index.ts');});
  const row=await p.evaluate(async({c,warm})=>{
   const canvas=document.querySelector('canvas');
   const gl=document.createElement('canvas').getContext('webgl2'), ext=gl.getExtension('WEBGL_debug_renderer_info');
   const gpu=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
   if(!/D3D12.*NVIDIA/.test(gpu))throw Error(gpu);
   const input=JSON.stringify(c.floor);
   const start=performance.now();
   const v=window.renderModule.createViewer(canvas,{baseTexels:120});
   v.load(c.floor.snapshot);v.apply(c.floor.events.filter(e=>e.k!=='descend'&&e.k!=='exit'));v.seek(c.target);v.setSpeed(0);v.setFrame('map');
   const setupMs=performance.now()-start;
   const frame=()=>new Promise(r=>requestAnimationFrame(r));
   let firstPaintMs=null;
   for(let i=0;i<600;i++){await frame();if(v.stats().calls>0){firstPaintMs=performance.now()-start;break;}}
   if(firstPaintMs===null)throw Error('No first painted frame');
   let samples=[],unavailable=null;
   if(warm){
    for(let i=0;i<240;i++)await frame();
    window.__landmarkGPU=[];
    for(let i=0;i<1200;i++){
     await frame();
     if(window.__landmarkGPU.length>=240)break;
     if(!v.stats().gpuTimer){unavailable='timer unavailable or stopped resolving';break;}
    }
    samples=window.__landmarkGPU.slice();
    if(samples.some(s=>s.disjoint>0||!Number.isFinite(s.ms)))unavailable='disjoint or nonfinite GPU query';
    if(samples.length<240)unavailable??='fewer than240resolved queries in1200frames';
   }
   const stats=v.stats();
   const geometry={dpr:devicePixelRatio,viewport:{w:innerWidth,h:innerHeight},device:stats.device,target:stats.target,camera:stats.camera,fx:stats.fx};
   const exactInput=input===JSON.stringify(c.floor);
   v.dispose();
   return {setupMs,firstPaintMs,gpu,geometry,stats,samples,unavailable,exactInput};
  },{c,warm:!interleaved&&rep<3});
  assert(row.exactInput,'cost probe mutated actual replay input');
  const paired=result.rows.find(r=>r.rep===rep&&r.width===width&&r.id===c.id);
  if(paired)assert.deepEqual(row.geometry,paired.geometry,'paired viewport/device/camera/effects must match');
  result.rows.push({leg,rep,width,id:c.id,depth:c.depth,target:c.target,...row,gpuP95:percentile(row.samples.map(s=>s.ms),.95)});
  save();await p.close();
 }

 if(interleaved) {
  result.gpuRows=[];
  for(let rep=0;rep<3;rep++)for(const width of widths)for(const c of cases) {
   const p=await context.newPage();
   await p.setViewportSize({width,height:width===400?640:800});
   p.on('pageerror',e=>result.errors.push({mode:'interleaved',message:String(e)}));
   await p.route('**/src/render/index.ts',async route=>{
    const response=await route.fetch(), original=await response.text();
    const leg=route.request().url().startsWith(urls.baseline)?'baseline':'candidate';
    const body=instrumentFrame(original,leg,symmetric);
    result.served.push({leg,path:'/src/render/index.ts',mode:symmetric?'symmetric-single-driver':'interleaved-frame-gate',originalSha256:hash(original),instrumentedSha256:hash(body)});
    await route.fulfill({response,body});
   });
   await p.route('**/src/render/gputimer.ts',async route=>{
    const response=await route.fetch(), original=await response.text();
    const leg=route.request().url().startsWith(urls.baseline)?'baseline':'candidate';
    const needle='this.samples.push(this.ms);';
    assert.equal(original.split(needle).length,2,'Exactly one resolved GPU query push required');
    const body=original.replace(needle,needle+` globalThis.__landmarkGPUByLeg?.[${JSON.stringify(leg)}]?.push({ms:this.ms,resolved:this.resolved+1,disjoint:this.disjoint,observedAt:performance.now()});`);
    result.served.push({leg,path:'/src/render/gputimer.ts',mode:'interleaved-resolved-query',originalSha256:hash(original),instrumentedSha256:hash(body)});
    await route.fulfill({response,body});
   });
   await p.goto(urls.baseline);
   const pair=await p.evaluate(async({c,urls,rep,symmetric})=>{
    const modules={baseline:await import(urls.baseline+'src/render/index.ts'),candidate:await import(urls.candidate+'src/render/index.ts')};
    document.body.replaceChildren();
    window.__landmarkGPUByLeg={baseline:[],candidate:[]};
    let ordinal=rep;
    let toggle=0;
    const viewers={},canvases={};
    window.__landmarkCostFrames={};
    const driverRows=[];
    const choose=(now)=>{
     const active=(ordinal++%2)?'candidate':'baseline';
     window.__landmarkCostLeg=active;
     if(symmetric) {
      const inactive=active==='baseline'?'candidate':'baseline';
      canvases[active].style.zIndex='1';canvases[inactive].style.zIndex='0';
      window.__landmarkCostFrames[inactive](now);
      window.__landmarkCostFrames[active](now);
      if(driverRows.length<12)driverRows.push({active,order:[inactive,active],top:document.elementFromPoint(innerWidth/2,innerHeight/2)===canvases[active]});
     }
     toggle=requestAnimationFrame(choose);
    };
    if(!symmetric)choose();
    const before=JSON.stringify(c.floor);
    for(const leg of ['baseline','candidate']){
     const canvas=document.createElement('canvas');
     canvas.style.cssText='position:absolute;inset:0;width:100vw;height:100vh';
     document.body.append(canvas);canvases[leg]=canvas;
     const v=modules[leg].createViewer(canvas,{baseTexels:120});
     v.load(c.floor.snapshot);v.apply(c.floor.events.filter(e=>e.k!=='descend'&&e.k!=='exit'));v.seek(c.target);v.setSpeed(0);v.setFrame('map');
     viewers[leg]=v;
    }
    if(symmetric)toggle=requestAnimationFrame(choose);
    const frame=()=>new Promise(r=>requestAnimationFrame(r));
    for(let i=0;i<600;i++){
     await frame();
     if(Object.values(viewers).every(v=>v.stats().calls>0))break;
     if(i===599)throw Error('Paired viewers must both paint before warmup');
    }
    for(let i=0;i<480;i++)await frame();
    window.__landmarkGPUByLeg={baseline:[],candidate:[]};
    const start=performance.now();
    let unavailable=null;
    for(let i=0;i<2400;i++){
     await frame();
     if(Object.values(window.__landmarkGPUByLeg).every(a=>a.length>=240))break;
     if(Object.values(viewers).some(v=>!v.stats().gpuTimer)){unavailable='one paired GPU timer unavailable or stopped resolving';break;}
     if(i===2399)unavailable='fewer than240queries per leg in2400rAF frames';
    }
    const result={};
    for(const leg of ['baseline','candidate']){
     const stats=viewers[leg].stats(), samples=window.__landmarkGPUByLeg[leg].slice();
     let missing=unavailable;
     if(samples.some(s=>s.disjoint>0||!Number.isFinite(s.ms)))missing='disjoint or nonfinite paired GPU query';
     result[leg]={samples,stats,driverRows,unavailable:missing,samplingMs:performance.now()-start,geometry:{dpr:devicePixelRatio,viewport:{w:innerWidth,h:innerHeight},device:stats.device,target:stats.target,camera:stats.camera,fx:stats.fx}};
     viewers[leg].dispose();
    }
    cancelAnimationFrame(toggle);
    if(JSON.stringify(c.floor)!==before)throw Error('Paired viewers mutated input');
    return result;
   },{c,urls,rep,symmetric});
   if(symmetric)assert(pair.baseline.driverRows.length===12&&pair.baseline.driverRows.every(r=>r.top),'Every active viewer must be the unoccluded top canvas');
   assert.deepEqual(pair.baseline.geometry,pair.candidate.geometry,'interleaved viewport/device/camera/effects must match');
   for(const leg of ['baseline','candidate'])result.gpuRows.push({leg,rep,width,id:c.id,...pair[leg],gpuP95:percentile(pair[leg].samples.map(s=>s.ms),.95)});
   save();await p.close();
  }
 }
 for(const leg of ['baseline','candidate']) {
  const dir=resolve('scratchpad',`cut245-${basename(out)}-isolated`,leg,'web/src');
  assert.deepEqual(inventory(dir),manifests[leg],`Frozen ${leg} source changed during run`);
 }
 result.artAfter=Object.fromEntries(Object.keys(result.art).map(p=>[p,hash(readFileSync(p))]));
 assert.deepEqual(result.artAfter,result.art,'Art changed during run');
 assert.equal(result.errors.length,0,'page errors');
 result.comparisons=[];
 for(const width of widths)for(const c of cases){
  const legs={};
  for(const leg of ['baseline','candidate']){
   const rows=result.rows.filter(r=>r.leg===leg&&r.width===width&&r.id===c.id);
   const gpuRows=(interleaved?result.gpuRows:result.rows).filter(r=>r.leg===leg&&r.width===width&&r.id===c.id&&r.rep<3);
   legs[leg]={setupMedian:percentile(rows.map(r=>r.setupMs),.5),firstPaintMedian:percentile(rows.map(r=>r.firstPaintMs),.5),gpuP95Median:percentile(gpuRows.filter(r=>!r.unavailable).map(r=>r.gpuP95),.5),unavailable:gpuRows.filter(r=>r.unavailable).map(r=>r.unavailable)};
  }
  const coldIncrement=legs.candidate.setupMedian-legs.baseline.setupMedian;
  const firstPaintIncrement=legs.candidate.firstPaintMedian-legs.baseline.firstPaintMedian;
  const gpuUnavailable=legs.baseline.unavailable.length>0||legs.candidate.unavailable.length>0;
  const gpuIncrement=gpuUnavailable?null:legs.candidate.gpuP95Median-legs.baseline.gpuP95Median;
  result.comparisons.push({width,id:c.id,legs,coldIncrement,firstPaintIncrement,gpuIncrement,pass:!gpuUnavailable&&(control?Math.abs(coldIncrement)<=10&&Math.abs(gpuIncrement)<=.20:coldIncrement<=10&&gpuIncrement<=.20)});
 }
 result.status=result.comparisons.every(r=>r.pass)?'pass':'failed-or-unavailable';save();
 console.log(JSON.stringify({status:result.status,comparisons:result.comparisons}));
 if(result.status!=='pass')process.exitCode=1;
} catch(e){result.status='failed';result.error=String(e.stack??e);save();throw e;}
finally {await browser?.close();for(const child of servers)child.kill('SIGTERM');}
