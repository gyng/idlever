import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
const earned=readFileSync('scratchpad/cut201/earned-plots/seed-1-final.json','utf8');
const source=readFileSync('web/src/render/town.ts','utf8');
assert.match(source,/r: 23, c: \[a, a \* 0\.64, a \* 0\.3\]/);
assert.match(source,/const a = strength \* 0\.85/);
assert.match(source,/lx = x \+ \(flip \? -6 : 6\)/);
assert.match(source,/ly = y - 8/);
assert.match(source,/#e8923a.*2, 1, 1, 3/);
const out='docs/evidence/cut202',b=await launchBrowser({gpu:true}),result=[];
try{for(const canvas of[false,true]){
 const width=canvas?1440:400,p=await b.newPage({viewport:{width,height:900},reducedMotion:'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(canvas)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^(webgl|webgl2|experimental-webgl)$/.test(kind)?null:get.call(this,kind,...args);};});
 await p.goto('http://localhost:5209/?dev=1&fresh=1&runs=0&seed=202&juice=1&effects=full&townLight=planes');
 await p.waitForFunction(()=>window.__idlever?.booted&&window.__town?.stats().frames>0);
 await p.evaluate(async engine=>{const a=window.__idlever;if(!await a.importSave(JSON.stringify({v:2,engine,loadout:[],last_seen:Date.now(),runs:0})))throw Error('Earned import refused');a.runnerOn=false;a.go({kind:'camp'});},earned);
 await p.waitForFunction(()=>window.__town?.stats().frames>20&&window.__town.stats().activeBuilds.length===0&&!document.querySelector('.sheet-wrap')&&!document.querySelector('.sheet-ghost'));
 await p.evaluate(()=>{window.__town.setHour(23);window.dispatchEvent(new PointerEvent('pointermove'));});await p.mouse.move(1,1);
 await p.waitForFunction(()=>window.__town.stats().night===1&&window.__town.stats().frames>30);
 await p.waitForTimeout(350);
 const stats=await p.evaluate(()=>window.__town.stats());assert.equal(await p.evaluate(()=>window.__idlever.kind),'wasm');assert.equal(stats.mode,canvas?'2d':'gl');assert.equal(stats.characterLights,7);assert.equal(stats.lights,32);assert.equal(stats.walkers,2);const expected=canvas?errors.filter(e=>e.includes('Error creating WebGL context')):[];assert.equal(errors.filter(e=>!expected.includes(e)).length,0);
 const renderer=canvas?'Canvas2D':await p.evaluate(()=>{const g=document.querySelector('.town-gl').getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 const file=`${out}/${width}-${canvas?'canvas':'gl'}-night-warm-lanterns.png`;await p.screenshot({path:file});result.push({file,renderer,stats,errors,expectedFallbackMessages:expected});await p.close();
}writeFileSync(`${out}/checks.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result.map(x=>({file:x.file,renderer:x.renderer,characterLights:x.stats.characterLights,lights:x.stats.lights,walkers:x.stats.walkers,errors:x.errors}))));}finally{await b.close();}
