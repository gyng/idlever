import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {launchGpu} from '../../tools/browser.mjs';
const base=process.argv[3]??'http://127.0.0.1:53741/';
const phase=process.argv[2]??'before',out=`scratchpad/cut185-home/${phase}`;mkdirSync(out,{recursive:true});
const checkpoint=JSON.parse(readFileSync('scratchpad/qa_cut179_interactive/browser-state.json','utf8'));
const save=checkpoint.origins[0].localStorage.find(x=>x.name==='riddle.save').value;
const b=await launchGpu(),results=[],errors=[];
try{for(const width of [400,1280]){
 const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.routeWebSocket('**',ws=>ws.close());
 await p.goto(base+'?dev=1&runs=0&fresh=1&seed=223');await p.waitForFunction(()=>window.__riddle?.booted);
 await p.evaluate(entries=>{for(const x of entries)localStorage.setItem(x.name,x.value);},checkpoint.origins[0].localStorage.filter(x=>x.name.startsWith('riddle.town.')));
 assert.equal(await p.evaluate(async save=>window.__riddle.importSave(save),save),true);
 await p.waitForFunction(()=>window.__town?.stats().frames>2);
 for(const hour of [12,23]){
  await p.evaluate(hour=>{window.__town.setHour(hour);},hour);
  await p.waitForFunction(hour=>window.__town.stats().night===(hour===12?0:1),hour);await p.waitForTimeout(350);
  await p.mouse.move(2,898);await p.screenshot({path:`${out}/home-${width}-${hour}.png`});
  results.push({width,hour,stats:await p.evaluate(()=>window.__town.stats()),scope:'Cosmetic hour override via existing renderer API; original earned town save, no absence or play credit.'});
 }
 assert.equal(await p.evaluate(()=>window.__riddle.lineage.gold),15730);await p.close();
}
assert.deepEqual(errors,[]);
}finally{await b.close();writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2)+'\n');}
console.log(`PASS ${phase}: four private-GPU earned-town shots; no page errors, no gold mutation.`);
