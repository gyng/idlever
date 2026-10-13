import {launchBrowser} from '../../tools/browser.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const b=await launchBrowser({gpu:true}),out=[],errors=[],raw=gunzipSync(readFileSync('docs/evidence/cut218/three-actual.game.json.gz')).toString();
try{
 const context=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 for(const [leg,url] of [['baseline',process.env.IDLEVER_BASELINE_URL],['candidate',process.env.IDLEVER_TEST_URL]]){
 for(const fixture of ['three-actual.game.json.gz','controlled/three-controlled-reincarnating.game.json.gz']){
 const raw=gunzipSync(readFileSync(`docs/evidence/cut218/${fixture}`)).toString();
  const p=await context.newPage();p.on('pageerror',e=>errors.push({leg,message:e.message}));
  await p.goto(`${url}?dev=1&fresh=1&runs=0&juice=1&effects=full`);await p.waitForFunction(()=>window.__idlever?.booted);
  await p.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;await a.engine.load(raw);await a.refresh();a.go({kind:'camp'});const e=document.querySelector('.town');e.style.setProperty('width','800px','important');e.style.setProperty('min-width','800px','important');e.style.setProperty('max-width','800px','important');e.style.setProperty('height','500px','important');e.style.setProperty('min-height','500px','important');e.style.setProperty('max-height','500px','important');e.style.setProperty('flex','none','important');},raw);
  await p.waitForTimeout(500);
  const before=await p.evaluate(async()=>({saved:await window.__idlever.engine.save(),kind:window.__idlever.kind,slots:window.__idlever.lineage.hero_slots}));
  const wasm=await p.evaluate(async()=>Array.from(new Uint8Array(await (await fetch('/src/engine/pkg/idlever_wasm_bg.wasm')).arrayBuffer())));
  const packageIdentity={bytes:wasm.length,sha256:createHash('sha256').update(Buffer.from(wasm)).digest('hex')};
  for(const hour of[12,23]){
   const rows=await p.evaluate(hour=>new Promise(resolve=>{window.__town.setHour(hour);let last=-1,count=0;const rows=[];function read(){window.dispatchEvent(new Event('pointermove'));const s=window.__town.stats();if(s.frames!==last){last=s.frames;count++;if(count>150)rows.push(s);}if(rows.length===150)resolve(rows);else requestAnimationFrame(read);}requestAnimationFrame(read);}),hour);
   const dims=await p.evaluate(()=>{const r=document.querySelector('.town').getBoundingClientRect();return{css:{w:r.width,h:r.height},dpr:devicePixelRatio,canvas:[...document.querySelectorAll('.town canvas')].map(e=>({w:e.width,h:e.height})),renderer:window.__town.stats().view};});
   const sorted=rows.map(x=>x.cpuMs).sort((a,b)=>a-b);out.push({leg,fixture,hour,packageIdentity,dims,rows,p50:sorted[74],p95:sorted[142],warmUniqueFrames:150,sampleUniqueFrames:150});
  }
  const after=await p.evaluate(async()=>await window.__idlever.engine.save());if(before.saved!==after)throw Error(`${leg} mutated save`);await p.close();
 }
 }
 writeFileSync('docs/evidence/cut218/paired-cost.json',JSON.stringify({out,errors},null,2));if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify(out.map(({leg,fixture,hour,p50,p95,dims,packageIdentity})=>({leg,fixture,hour,p50,p95,dims,packageIdentity}))));
}finally{await b.close()}
