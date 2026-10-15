import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,createWriteStream} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../../tools/browser.mjs';
import {auditContrast} from '../../cut243-states/contrast.mjs';
const root='docs/evidence/cut220/paper-doll-8879',phase=process.argv[2]||'first';assert(/^[a-z0-9-]+$/.test(phase));const out=resolve(root+'/'+phase);mkdirSync(out);
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=()=>{const files={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else files[f]=hash(readFileSync(f));}};walk('web/src');return files;};
const expectedWasm='8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff';
const fixtures=['weapon-bow','helm-empty'].map(id=>{const path=`docs/evidence/cut220/actual-next-8879/${id}.session.json.gz`,b=readFileSync(path);return{id,path,raw:gunzipSync(b).toString(),gzipSha256:hash(b)};});
const result={at:new Date().toISOString(),scope:'Functional neutral composited doll on actual public earned gear differences, not final painted quality, allR7 or progression/performance acceptance.',expectedWasm,inputs:fixtures.map(({raw,...x})=>({...x,rawSha256:hash(raw)})),sourceBefore:inventory(),served:[],rows:[],errors:[]};
const save=()=>writeFileSync(out+'/results.json',JSON.stringify(result,null,2)+'\n');save();
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const log=createWriteStream(out+'/vite.log');await new Promise(r=>log.once('open',r));const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:resolve('web'),stdio:['ignore',log,log]});let browser;const pending=[];
try{
 const url=`http://localhost:${port}/`;for(let i=0;i<120;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser({gpu:true});

 const p=await browser.newPage({viewport:{width:402,height:681},reducedMotion:'reduce'});p.on('pageerror',e=>result.errors.push(String(e)));
 p.on('response',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/src/')||path.endsWith('.wasm'))pending.push(r.body().then(b=>result.served.push({path,sha256:hash(b),bytes:b.length})).catch(()=>{}));});
 await p.goto(url+'?fresh=1&seed=1&runs=0');await p.waitForFunction(()=>window.__idlever?.booted,null,{timeout:90000});
 const open=async(raw,scale=1,viewport={width:402,height:681})=>{
  await p.keyboard.press('Escape');await p.setViewportSize(viewport);
  await p.evaluate(async({raw,scale})=>{const a=window.__idlever;a.runnerOn=false;a.lineage=await a.engine.load(raw);await a.refresh();a.go({kind:'camp'});document.documentElement.style.fontSize=`${16*scale}px`;},{raw,scale});
 };
 const hub=async()=>{await p.locator('.town-hit[data-building=tent]').click();await p.locator('[data-hero-hub]').waitFor();await p.evaluate(()=>document.fonts.ready);};
 const settled=()=>p.waitForFunction(()=>!document.querySelector('.class-unlock,.toast'),null,{timeout:30000});
 const readyArt=()=>p.waitForFunction(()=>[...document.querySelectorAll('.hero-equipment-body image')].every(i=>i.parentElement.dataset.dollArt==='painted'));
 const snapshot=()=>p.locator('.hero-equipment-figure').evaluate(el=>({phase:el.dataset.hubFigurePhase,layers:[...el.querySelectorAll('[data-doll-slot]')].map(g=>({slot:g.dataset.dollSlot,kind:g.dataset.dollKind,art:g.dataset.dollArt,children:g.children.length})),neutral:el.querySelectorAll('[data-doll-base=neutral]').length}));
 const bodyVisible=async()=>{await p.locator('.hero-equipment-body').scrollIntoViewIfNeeded();const r=await p.locator('.hero-equipment-body').evaluate(e=>{const r=e.getBoundingClientRect();let top=0,bottom=innerHeight,left=0,right=innerWidth;for(let a=e.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(s.overflowY!=='visible'){top=Math.max(top,q.top);bottom=Math.min(bottom,q.bottom);}if(s.overflowX!=='visible'){left=Math.max(left,q.left);right=Math.min(right,q.right);}}return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},clip:{top,bottom,left,right},fullyVisible:r.top>=top-1&&r.bottom<=bottom+1&&r.left>=left-1&&r.right<=right+1};});assert(r.fullyVisible);return r;};
 result.owned=[];const homeRaw=gunzipSync(readFileSync('docs/evidence/handoff-menus/input.game.json.gz')).toString();await open(homeRaw);
 const catalogue=await p.evaluate(()=>window.__idlever.lineage.starting_kits);
 for(const [slot,list]of [['weapon',catalogue.weapons],['armour',catalogue.armours],['helm',catalogue.helms],['boots',catalogue.boots]])for(const choice of list.filter(x=>x.available&&x.compatible!==false)){
  await open(homeRaw);const before=await p.evaluate(()=>window.__idlever.lineage.gold);
  const native=await p.evaluate(async({slot,kind})=>{const a=window.__idlever,c=structuredClone(a.lineage.starting_kits.current);if(slot==='weapon')c.weapon=kind;else{c.pins={...c.pins,[slot]:kind};}await a.engine.setStartingKit(JSON.stringify(c));await a.refresh();return{config:c,gold:a.lineage.gold,equipment:a.lineage.starting_kits.equipment};},{slot,kind:choice.kind});assert.equal(native.gold,before);assert.equal(native.equipment.actual.slots.find(x=>x.slot===slot).kind,choice.kind);
  await hub();await readyArt();await settled();const drawn=await snapshot();assert.equal(drawn.layers.find(x=>x.slot===slot).kind,choice.kind);const visible=await bodyVisible();const prefix=`owned-${slot}-${choice.kind}`;await p.screenshot({path:`${out}/${prefix}.png`,fullPage:false});result.owned.push({slot,kind:choice.kind,native,drawn,visible,prefix});save();
 }
 assert.equal(result.owned.length,15);
 const pixels=out+'/pixels';mkdirSync(pixels);const focusRows=[];
 for(const fixture of fixtures)for(const viewport of [{width:402,height:681},{width:1440,height:900}])for(const scale of [1,2]){
  await open(fixture.raw,scale,viewport);await hub();await settled();const before=await p.evaluate(()=>window.__idlever.engine.save());const row={fixture:fixture.id,viewport,scale,captureKind:'viewport',phases:[]};
  for(const selected of ['actual','next']){await p.locator(`[data-doll-phase=${selected}]`).click();await readyArt();const visible=await bodyVisible(),drawn=await snapshot(),prefix=`settled-${fixture.id}-${viewport.width}-${scale}x-${selected}`;await p.screenshot({path:`${out}/${prefix}.png`,fullPage:false});row.phases.push({prefix,drawn,visible});}
  if(viewport.width===402){const target=p.locator('[data-doll-phase=next]');await target.scrollIntoViewIfNeeded();await target.focus();const prefix=`${fixture.id}-${scale}x-phase`;await auditContrast(p,pixels,prefix);
   const info=await target.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{rect:{x:r.x,y:r.y,w:r.width,h:r.height},outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset,focusVisible:e.matches(':focus-visible')};});await p.screenshot({path:`${pixels}/${prefix}-focused.png`,fullPage:false});const probe=await p.addStyleTag({content:'[data-doll-phase=next]{outline-color:transparent!important}'});await p.screenshot({path:`${pixels}/${prefix}-background.png`,fullPage:false});await probe.evaluate(e=>e.remove());focusRows.push({width:viewport.width,focus:[{...info,prefix}]});
  }
  assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before);result.rows.push(row);save();
 }
 writeFileSync(pixels+'/results.json',JSON.stringify({rows:focusRows},null,2)+'\n');
 // Actual three-resident ownership changes, with stale old UI nodes retained only as diagnostics.
 const familyPath='docs/evidence/cut220/core/fixtures/earned-three-residents.game.json.gz',familyBytes=readFileSync(familyPath);result.familyInput={path:familyPath,sha256:hash(familyBytes)};await open(gunzipSync(familyBytes).toString());await hub();result.ownerSwitches=[];
 for(const owner of [2,3,1]){await p.locator('[data-doll-phase=next]').click();await p.evaluate(()=>{window.__oldDoll=document.querySelector('[data-doll-phase=next]');window.__oldImage=document.querySelector('.hero-equipment-body image');});await p.locator(`[data-hub-resident="${owner}"]`).click();await p.waitForFunction(owner=>window.__idlever.lineage.selected_bloodline===owner&&document.querySelector('.hero-equipment-figure')?.dataset.hubFigurePhase==='actual',owner);const before=await p.evaluate(()=>window.__idlever.engine.save());await p.evaluate(()=>{window.__oldDoll.click();window.__oldImage?.dispatchEvent(new Event('load'));});assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),before);const drawn=await snapshot();assert.equal(drawn.phase,'actual');result.ownerSwitches.push({owner,drawn,staleExact:true});save();}
 // Missing paint produces a deliberate primitive; no lost slot or engine mutation.
 await p.route('**/ui/icons/it_sword.png',r=>r.abort());await open(fixtures[0].raw);await hub();await p.waitForFunction(()=>document.querySelector('[data-doll-slot=weapon]')?.dataset.dollArt==='primitive'&&!document.querySelector('[data-doll-slot=weapon] image'));const beforeMissing=await p.evaluate(()=>window.__idlever.engine.save());result.missingImage=await snapshot();assert.equal(result.missingImage.layers.find(x=>x.slot==='weapon').kind,'sword');await bodyVisible();await settled();await p.screenshot({path:out+'/missing-sword-primitive.png',fullPage:false});assert.equal(await p.evaluate(()=>window.__idlever.engine.save()),beforeMissing);
 await p.unroute('**/ui/icons/it_sword.png');result.preferences=[];
 for(const reducedMotion of ['reduce','no-preference'])for(const effects of ['full','low','off']){await p.emulateMedia({reducedMotion});await p.evaluate(async effects=>(await import('/src/render/fxpref.ts')).setEffectsLevel(effects),effects);result.preferences.push({reducedMotion,effects,drawn:await snapshot(),exact:(await p.evaluate(()=>window.__idlever.engine.save()))===beforeMissing});assert(result.preferences.at(-1).exact);}
 await p.close();
 await Promise.all(pending);assert.equal(result.errors.length,0);const wasm=result.served.filter(x=>x.path.endsWith('.wasm'));assert(wasm.length&&wasm.every(x=>x.sha256===expectedWasm));result.sourceAfter=inventory();result.sourceUnchanged=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert(result.sourceUnchanged);result.status='PASS';save();
}catch(e){result.status='FAIL';result.error=String(e.stack??e);save();throw e;}finally{await browser?.close();vite.kill('SIGTERM');log.end();}
