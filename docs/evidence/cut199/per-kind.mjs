import {launchBrowser} from '../../tools/browser.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const out='docs/evidence/cut199';mkdirSync(out,{recursive:true});
const fixture=JSON.parse(readFileSync('web/tests/fixtures/earned-gunner-home.json','utf8'));fixture.lineage.kit={};fixture.lineage.class='fighter';
const browser=await launchBrowser({gpu:true});
const result={errors:[],captures:[],samples:[],coverage:[]};
try{
 const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 await p.goto('http://localhost:5207/?dev=1&fresh=1&runs=0&seed=199&juice=1&effects=full');
 await p.waitForFunction(()=>window.__idlever?.booted&&window.__town?.stats().frames>0);
 await p.evaluate(async engine=>{const a=window.__idlever;assertVoid();function assertVoid(){};if(!await a.importSave(JSON.stringify({v:2,engine,loadout:[],last_seen:Date.now(),runs:0})))throw Error('Import refused');a.runnerOn=false;await a.mutate(()=>a.engine.setClass('fighter'));await a.mutate(()=>a.engine.setWorker('scout',false));a.go({kind:'camp'});},JSON.stringify(fixture));
 await p.waitForFunction(()=>window.__town?.stats().mappedSprites?.some(x=>x.kind===1)&&window.__town.stats().mappedSprites.some(x=>x.kind===2));
 result.lineage=await p.evaluate(()=>({kind:window.__idlever.kind,hero:window.__idlever.lineage.hero_slots,town:window.__idlever.lineage.town}));
 result.renderer=await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 for(const hour of[12,18,23]){
 await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);await p.waitForTimeout(120);
 const proof=await p.evaluate(async()=>{const {inspectTownLighting}=await import('/src/render/town.ts');return inspectTownLighting();});delete proof.images;assert.equal(proof.unmapped,0);assert.equal(proof.alphaChanges,0);assert.ok(proof.changedByKind[1]>0);assert.ok(proof.changedByKind[2]>0);result.coverage.push({hour,proof});
 }
 assert.equal(result.errors.length,0);writeFileSync(`${out}/per-kind-proof.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({coverage:result.coverage,errors:result.errors}));
}finally{await browser.close();}
