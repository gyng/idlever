import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {launchGpu} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{encoding:'utf8'}).trim();
const checkpoint=JSON.parse(fs.readFileSync('scratchpad/qa_cut179_interactive/browser-state.json','utf8'));
const save=checkpoint.origins[0].localStorage.find(x=>x.name==='riddle.save').value;
const out='scratchpad/cut186/shots';fs.mkdirSync(out,{recursive:true});const browser=await launchGpu(),results=[],errors=[];
try{for(const width of [320,400,1440]){
 const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${url}?fresh=1&seed=223&runs=0`);await p.waitForFunction(()=>window.__riddle?.booted);
 assert.equal(await p.evaluate(save=>window.__riddle.importSave(save),save),true);
 const unchanged=await p.evaluate(()=>window.__riddle.engine.save());
 await p.locator('button.gear').click();await p.locator('.main-menu-button').click();
 const button=p.getByRole('button',{name:'Continue',exact:true});assert.ok((await button.boundingBox()).height>=104);
 await p.waitForFunction(()=>{const img=document.querySelector('.menu-key-art');return img?.complete&&img.naturalWidth>0;});
 await p.screenshot({path:`${out}/continue-${width}.png`});await button.click();
 await p.evaluate(async()=>{const{openHeroClass}=await import('/src/ui/town.ts');openHeroClass(window.__riddle);});
 const active=p.locator('.sheet-wrap:not([hidden])');
 const controls=await active.locator('.class-row > button').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width})));
 assert.ok(controls.every(n=>n.height>=64&&n.width<=n.parent+1));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.screenshot({path:`${out}/classes-${width}.png`});await p.keyboard.press('Escape');
 await p.evaluate(async()=>{const{openHero}=await import('/src/ui/town.ts');openHero(window.__riddle);});
 await p.locator('.sheet-wrap:not([hidden]) .class-tree-panel').evaluate(el=>el.scrollIntoView({block:'start'}));
 const skill=p.locator('.sheet-wrap:not([hidden]) .class-path-choose').first();assert.ok((await skill.boundingBox()).height>=56);
 await p.screenshot({path:`${out}/skills-${width}.png`});
 assert.equal(await p.evaluate(()=>window.__riddle.engine.save()),unchanged);
 results.push({width,continueHeight:(await button.count())?null:104,classControls:controls,skillHeight:(await skill.boundingBox()).height,saveUnchanged:true});await p.close();
}}finally{await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2)+'\n');}
assert.deepEqual(errors,[]);console.log('PASS320/400/1440:Continue104px/classes64px/skills56px; no overflow/errors or save mutation.');
