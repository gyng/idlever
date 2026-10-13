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
 await p.goto('http://localhost:5206/?dev=1&fresh=1&runs=0&seed=199&juice=1&effects=full');
 await p.waitForFunction(()=>window.__idlever?.booted&&window.__town?.stats().frames>0);
 await p.evaluate(async engine=>{const a=window.__idlever;assertVoid();function assertVoid(){};if(!await a.importSave(JSON.stringify({v:2,engine,loadout:[],last_seen:Date.now(),runs:0})))throw Error('Import refused');a.runnerOn=false;await a.mutate(()=>a.engine.setClass('fighter'));await a.mutate(()=>a.engine.setWorker('scout',false));a.go({kind:'camp'});},JSON.stringify(fixture));
 await p.waitForFunction(()=>window.__town?.stats().mappedSprites?.some(x=>x.kind===1)&&window.__town.stats().mappedSprites.some(x=>x.kind===2));
 result.lineage=await p.evaluate(()=>({kind:window.__idlever.kind,hero:window.__idlever.lineage.hero_slots,town:window.__idlever.lineage.town}));
 result.renderer=await p.evaluate(()=>{const gl=document.querySelector('.town-gl').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 const toggle=async enabled=>{await p.evaluate(enabled=>{const u=new URL(location.href);u.searchParams.set('townLight',enabled?'planes':'off');history.replaceState(null,'',u);window.dispatchEvent(new PointerEvent('pointermove'));},enabled);await p.waitForFunction(enabled=>window.__town.stats().dimensionalLight===enabled,enabled);};
 const sample=async()=>await p.evaluate(async()=>{const samples=[];let prev=window.__town.stats().frames,last=performance.now();return await new Promise(resolve=>{const read=()=>{const s=window.__town.stats();if(s.frames!==prev){const now=performance.now();samples.push({cpu:s.cpuMs,interval:now-last});prev=s.frames;last=now;}if(samples.length>=150)resolve({stats:window.__town.stats(),frames:samples});else requestAnimationFrame(read);};requestAnimationFrame(read);});});
 await p.evaluate(()=>window.__town.setHour(23));
 await toggle(false);await sample();result.samples.push({mode:'baseline',...await sample()});
 await toggle(true);result.samples.push({mode:'prototype',...await sample()});
 await toggle(false);result.samples.push({mode:'baseline-repeat',...await sample()});
 await p.mouse.move(1,1);
 for(const width of[400,1440]){await p.setViewportSize({width,height:900});
 for(const hour of[12,18,23]){await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);await p.waitForTimeout(180);
 for(const enabled of[false,true]){await toggle(enabled);await p.mouse.move(1,1);const file=`${out}/${width}-${hour}-${enabled?'prototype':'baseline'}.png`;await p.screenshot({path:file});result.captures.push({file,stats:await p.evaluate(()=>window.__town.stats()),actors:await p.evaluate(()=>window.__town.actors())});}
 const proof=await p.evaluate(async()=>{const {inspectTownLighting}=await import('/src/render/town.ts');return inspectTownLighting();});assert.equal(proof.shaderPatched,true);assert.equal(proof.unmapped,0);assert.equal(proof.alphaChanges,0);assert.ok(proof.changed>0);for(let i=0;i<2;i++)writeFileSync(`${out}/${width}-${hour}-identical-${i?'prototype':'baseline'}.png`,Buffer.from(proof.images[i].split(',')[1],'base64'));delete proof.images;result.coverage.push({width,hour,proof});
 }}
 for(const pref of['low','off','reduced','full']){await p.emulateMedia({reducedMotion:pref==='reduced'?'reduce':'no-preference'});await p.evaluate(async pref=>{const{setEffectsLevel}=await import('/src/render/fxpref.ts');setEffectsLevel(pref==='reduced'?'full':pref);window.dispatchEvent(new PointerEvent('pointermove'));},pref);await p.waitForTimeout(100);const s=await p.evaluate(()=>window.__town.stats());assert.equal(s.dimensionalLight,pref!=='off');result.coverage.push({pref,stats:s});}
 // Observe actual seeded route; no forced game/actor position or movement clock.
 await p.evaluate(()=>{window.poseCoverage=[];window.poseDone=false;let seen=0;const read=()=>{const s=window.__town.stats();if(s.frames!==seen){seen=s.frames;for(const a of s.mappedSprites.filter(x=>x.kind===2)){window.poseCoverage.push(a);}}if(!window.poseDone)requestAnimationFrame(read);};requestAnimationFrame(read);});
 await p.waitForTimeout(14000);result.poses=await p.evaluate(()=>{window.poseDone=true;return window.poseCoverage;});
 assert.equal(result.errors.length,0);writeFileSync(`${out}/gpu-check.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({renderer:result.renderer,captures:result.captures.length,samples:result.samples.map(x=>[x.mode,x.frames.length]),facing:[...new Set(result.poses.map(x=>x.flip))],errors:result.errors}));
}finally{await browser.close();}
