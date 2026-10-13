import {launchBrowser} from '../../tools/browser.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const b=await launchBrowser({gpu:true}), rows=[], errors=[];
try {
 const p=await b.newPage({viewport:{width:400,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5239/?dev=1&fresh=1&runs=0&juice=1');await p.waitForFunction(()=>window.__idlever?.booted);
 for(const name of ['earned-seed-1-budget']){
  const raw=gunzipSync(readFileSync(`docs/evidence/cut211/fixtures-final/${name}.game.json.gz`)).toString();
  await p.evaluate(async raw=>{const a=window.__idlever;if(!await a.importSave(JSON.stringify({v:2,engine:raw,loadout:[],last_seen:Date.now(),runs:0})))throw Error('import refused');a.runnerOn=false;window.__town.setHour(12);window.dispatchEvent(new Event('pointermove'));},raw);
  await p.waitForTimeout(600);
  const r=await p.evaluate(async()=>({name:window.__idlever.lineage.hero_name,life:window.__idlever.lineage.persistent_hero,stats:window.__town.stats(),saved:await window.__idlever.engine.save()}));
  rows.push({fixture:name,...r});await p.screenshot({path:`docs/evidence/cut214/final-captures/400-gl-${name}-day.png`});
  if(name==='earned-seed-1-budget'){await p.evaluate(()=>window.__town.setHour(23));await p.waitForTimeout(500);await p.screenshot({path:'docs/evidence/cut214/final-captures/400-gl-earned-night.png'});}
 }
 const raw=gunzipSync(readFileSync('docs/evidence/cut211/fixtures-final/earned-seed-1-budget.game.json.gz')).toString();
 await p.evaluate(async raw=>{const a=window.__idlever;await a.importSave(JSON.stringify({v:2,engine:raw,loadout:[],last_seen:Date.now(),runs:0}));a.runnerOn=false;const c=document.querySelector('.town-gl');c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();},raw);
 await p.setViewportSize({width:1440,height:900});await p.waitForFunction(()=>window.__town.stats().mode==='2d');
 for(const hour of[12,23]){await p.evaluate(hour=>window.__town.setHour(hour),hour);await p.waitForTimeout(500);await p.screenshot({path:`docs/evidence/cut214/final-captures/1440-canvas-earned-${hour}.png`});rows.push({canvasHour:hour,stats:await p.evaluate(()=>window.__town.stats())});}
 writeFileSync('docs/evidence/cut214/final-captures/phases.json',JSON.stringify({rows,errors},null,2));if(errors.length)throw Error(errors.join('\n'));console.log('PASS actual earned budget final GL400/Canvas1440 day+night captures; zero page errors');
}finally{await b.close()}
