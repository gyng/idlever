// Current earned native save is required; no granted state or historical-fixture fallback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
const url=process.env.IDLEVER_RETIRE_URL;
const earned=readFileSync(process.env.IDLEVER_RETIRE_SAVE,'utf8');
const first=readFileSync(process.env.IDLEVER_RETIRE_FIRST_SAVE,'utf8');
const out='docs/evidence/cut201-render';
const b=await launchBrowser({gpu:true});const results=[];
try{for(const canvas of[false,true]){
 const width=canvas?1440:400,p=await b.newPage({viewport:{width,height:900},reducedMotion:'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(canvas)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^(webgl|webgl2|experimental-webgl)$/.test(kind)?null:get.call(this,kind,...args);};});
 await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=201&juice=1&effects=full&townLight=planes`);
 await p.waitForFunction(()=>window.__idlever?.booted&&window.__town?.stats().frames>0);
 assert.equal(await p.evaluate(()=>window.__idlever.kind),'wasm');
 await p.locator('.town-tag[data-next="house"]').click();await p.waitForFunction(()=>window.__idlever.lineage.town.home);
 assert.equal(await p.locator('[data-building="storehouse"],[data-next="storehouse"],[data-building-info="storehouse"]').count(),0);
 const pure=await p.evaluate(async()=>{const {BUILDINGS,PLOTS,houseLook,workerAt,route}=await import('/src/render/town.ts');return{buildings:BUILDINGS,plots:Object.keys(PLOTS),house:[0,1,2,3].map(stage=>houseLook({stage})),retired:['keeper','armourer'].map(id=>workerAt({id,post:'storehouse'})),kennelKeeper:workerAt({id:'kennel_keeper',post:'kennel'}),paths:['tent','smith','bank','kennel'].map(to=>route('mouth',to))};});
 assert.deepEqual(pure.buildings,['blacksmith','kennel','bank']);assert.ok(!pure.plots.includes('storehouse'));assert.deepEqual(pure.house,[1,1,2,3]);assert.deepEqual(pure.retired,[null,null]);assert.ok(pure.kennelKeeper);assert.ok(pure.paths.flat().every(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)));
 const load=async engine=>{await p.evaluate(async engine=>{const a=window.__idlever;if(!await a.importSave(JSON.stringify({v:2,engine,loadout:[],last_seen:Date.now(),runs:0})))throw Error('Earned import refused');a.runnerOn=false;a.go({kind:'camp'});},engine);await p.waitForFunction(()=>window.__town?.stats().frames>0);};
 await load(first);
 assert.equal(await p.evaluate(()=>window.__idlever.lineage.town.next),'blacksmith');
 assert.equal(await p.evaluate(()=>window.__idlever.lineage.town.next_ready),true);
 await p.locator('.town-tag[data-next="blacksmith"]').click();await p.waitForFunction(()=>window.__idlever.lineage.town.buildings.some(x=>x.id==='blacksmith'));
 const before=await p.evaluate(()=>({town:window.__idlever.lineage.town,stats:window.__town.stats()}));
 await load(earned);
 const bank=await p.evaluate(()=>window.__idlever.lineage.town);
 assert.deepEqual(bank.buildings.map(x=>x.id).sort(),['bank','blacksmith','kennel']);
 const absence=JSON.parse(earned).batch; // genuine recorded native8h outcomes, not a synthetic return.
 await p.waitForFunction(()=>window.__town?.stats().frames>0&&window.__town.stats().activeBuilds.length===0);
 const state=await p.evaluate(async report=>{const {townState}=await import('/src/render/town.ts');return townState(window.__idlever.lineage,report);},absence);
 assert.equal(state.stage,3);assert.ok(state.parties.length>0);assert.ok(state.parties.every(x=>x.to==='tent'));assert.ok(!state.workers.some(x=>['keeper','armourer'].includes(x.id)));
 for(const hour of[12,23]){await p.evaluate(hour=>{window.__town.setHour(hour);window.dispatchEvent(new PointerEvent('pointermove'));},hour);await p.waitForTimeout(180);await p.mouse.move(1,1);await p.screenshot({path:`${out}/${width}-${canvas?'canvas':'gl'}-${hour}-earned-town.png`});}
 assert.equal(await p.evaluate(()=>window.__town.stats().mode),canvas?'2d':'gl');assert.equal(await p.locator('[data-building="storehouse"],[data-next="storehouse"],[data-building-info="storehouse"]').count(),0);assert.equal(errors.length,0);
 results.push({canvas,width,pure,before,bank,parties:state.parties,stats:await p.evaluate(()=>window.__town.stats()),errors});await p.close();
}writeFileSync(`${out}/renderer-check.json`,JSON.stringify(results,null,2));console.log('Earned retirement renderer GL/Canvas PASS');}finally{await b.close();}
