// Cut220 refined phone Actual/Next + desktop slot cards + compact tabs: private-GPU frames with
// actual-material contrast (ordinary 4.5:1, inactive control text 3:1). Read-only; genuine fixtures.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchGpu} from '../../tools/browser.mjs';
const url=process.env.IDLEVER_TEST_URL,out=process.env.IDLEVER_HUB_GPU_OUT;
assert.ok(url&&out);mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync('docs/evidence/cut220/ui-inputs.json'));
const digest=b=>({bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});
const local=digest(readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm'));
const browser=await launchGpu(),deliveries=[],jobs=[],records=[],errors=[];let page,failure;
const shots=[
 // [entry, section, width, scale, focus, name]
 ['earned-delving-queued','gear',320,1,'.hero-hub-doll','320-away-gear'],
 ['earned-delving-queued','gear',320,2,'[data-hub-slot="weapon"]','320-200-away-gear'],
 ['earned-delving-queued','gear',400,1,'.hero-hub-doll','400-away-gear'],
 ['earned-delving-queued','gear',400,2,'[data-hub-slot="weapon"]','400-200-away-gear'],
 ['earned-delving-queued','gear',400,2,null,'400-200-away-tabs'],
 ['earned-ready','gear',400,1,null,'400-ready-tabs'],
 ['earned-delving-queued','gear',1440,1,'.hero-hub-doll','1440-away-gear'],
 ['earned-ready','gear',1440,1,'.hero-hub-doll','1440-ready-gear'],
 ['earned-delving-queued','attributes',400,2,'.legacy-upgrade.locked','400-200-away-legacy'],
 ['earned-ready','skills',400,1,'.class-path-choose','400-ready-skills'],
];
try {
page=await browser.newPage({viewport:{width:400,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))jobs.push(r.body().then(b=>deliveries.push(digest(b))));});
await page.goto(url+'?fresh=1&seed=1&runs=0');await page.waitForFunction(()=>window.__idlever?.booted);
const renderer=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);});assert.match(renderer,/D3D12.*NVIDIA/);
async function settle(){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));const w=document.querySelector('.sheet-wrap:not(.under)');if(w)await Promise.all(w.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
for(const [id,section,width,scale,focus,name] of shots){
 const entry=manifest.entries.find(e=>e.id===id),bytes=readFileSync(entry.home);assert.equal(digest(bytes).sha256,entry.sha256);const raw=gunzipSync(bytes).toString();
 await page.setViewportSize({width,height:900});await page.evaluate(s=>document.documentElement.style.fontSize=`${16*s}px`,scale);
 await page.evaluate(async raw=>{const a=window.__idlever;a.runnerOn=false;if(a.kind!=='wasm')throw Error('real WASM required');a.go({kind:'camp'});a.lineage=await a.engine.load(raw);a.resetGoldFeedback();await a.refresh();a.go({kind:'camp'});},raw);
 await page.waitForFunction(()=>!document.querySelector('.sheet-ghost'));
 const before=await page.evaluate(()=>window.__idlever.engine.save());
 await page.evaluate(async()=>{(await import('/src/ui/town.ts')).openHero(window.__idlever);});await settle();
 await page.locator(`.sheet-wrap:not(.under) [data-hub-tab="${section}"]`).click();await page.mouse.move(0,0);await settle();
 if(focus)await page.locator('.sheet-wrap:not(.under) '+focus).first().evaluate(n=>n.scrollIntoView({block:'start'}));
 await settle();await page.screenshot({path:`${out}/${name}.png`});
 const samples=await page.evaluate(()=>{const root=document.querySelector('.sheet-wrap:not(.under) [data-hero-hub]'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),samples=[];
  while(walker.nextNode()){const node=walker.currentNode,el=node.parentElement;if(!node.textContent.trim()||!el||getComputedStyle(el).visibility!=='visible')continue;const range=document.createRange();range.selectNode(node);const style=getComputedStyle(el);let opacity=1;for(let p=el;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);
   for(const r of range.getClientRects()){if(r.width<=2||r.height<=2||r.x<0||r.right>innerWidth||r.y<0||r.bottom>innerHeight)continue;let clipped=false;for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)&&(r.y<b.y+p.clientTop||r.bottom>b.y+p.clientTop+p.clientHeight))clipped=true;if(/auto|scroll|hidden|clip/.test(s.overflowX)&&(r.x<b.x+p.clientLeft||r.right>b.x+p.clientLeft+p.clientWidth))clipped=true;}if(clipped)continue;const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!hit||!(el===hit||el.contains(hit)))continue;samples.push({text:node.textContent.trim(),color:style.color,opacity,rect:{x:r.x,y:r.y,w:r.width,h:r.height},inactive:!!el.closest(':disabled,[aria-disabled="true"],.off,.class-node-blocked,.class-map-locked')});}}
  return samples;});
 assert.ok(samples.length);writeFileSync(`${out}/${name}-contrast.json`,JSON.stringify({width,samples},null,2));
 const hidden=await page.addStyleTag({content:'.sheet-wrap:not(.under) [data-hero-hub] * {color:transparent!important;text-shadow:none!important;}'});await page.screenshot({path:`${out}/${name}-background.png`});await hidden.evaluate(n=>n.remove());
 assert.equal(await page.evaluate(()=>window.__idlever.engine.save()),before,'GPU inspection is read-only');
 records.push({name,entry:id,section,width,scale,input:digest(bytes),readOnly:true});
 await page.keyboard.press('Escape');await settle();
}
await drain();for(const d of deliveries)assert.deepEqual(d,local);assert.ok(deliveries.length);assert.deepEqual(errors,[]);
const source={};for(const p of ['src/ui/hero-hub.ts','src/hero-hub.css','src/hero-progression.css','src/ui/legacy.ts','src/legacy.css','src/class-tree.css','src/engine/pkg/idlever_wasm_bg.wasm']){const r=await page.request.get(url+p);assert.ok(r.ok(),p);const b=await r.body();source[p]=digest(b);if(!p.endsWith('.wasm'))writeFileSync(out+'/'+p.replaceAll('/','_')+'.served',b);}
assert.deepEqual(source['src/engine/pkg/idlever_wasm_bg.wasm'],local);
writeFileSync(out+'/results.json',JSON.stringify({result:'PASS',renderer,records,deliveries,source,errors,performanceClaim:false},null,2));
console.log(JSON.stringify({result:'PASS',renderer,screenshots:records.length}));
}catch(error){failure=error;writeFileSync(out+'/failure.json',JSON.stringify({result:'FAIL',error:String(error.stack??error),records,deliveries,errors},null,2));}
finally{try{await drain();}catch(error){failure??=error;}try{await browser.close();}catch(error){failure??=error;}}
async function drain(){if(!page||page.isClosed())return;await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});let count;do{count=jobs.length;await Promise.all(jobs);await page.waitForTimeout(50);}while(count!==jobs.length);}
if(failure)throw failure;
