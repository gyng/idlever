// Original earned QA town adopted by new skill engine; diagnostic, not new play credit.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {launchGpu} from '../../tools/browser.mjs';
const checkpoint=JSON.parse(fs.readFileSync('scratchpad/qa_cut179_interactive/browser-state.json','utf8'));
const save=checkpoint.origins[0].localStorage.find(x=>x.name==='riddle.save').value;
const out='scratchpad/cut185/tree-shots';fs.mkdirSync(out,{recursive:true});
const browser=await launchGpu(),results=[],errors=[];
try{for(const width of [320,400,1440]){
 const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));await page.routeWebSocket('**',ws=>ws.close());
 await page.goto('http://127.0.0.1:53741/?dev=1&runs=0&fresh=1&seed=223');await page.waitForFunction(()=>window.__riddle?.booted);
 await page.evaluate(entries=>{for(const item of entries)localStorage.setItem(item.name,item.value);},checkpoint.origins[0].localStorage.filter(x=>x.name.startsWith('riddle.town.')));
 assert.equal(await page.evaluate(save=>window.__riddle.importSave(save),save),true);
 const before=await page.evaluate(()=>({gold:window.__riddle.lineage.gold,xp:window.__riddle.lineage.classes.fighter.xp,level:window.__riddle.lineage.classes.fighter.level}));
 const learned=await page.evaluate(async()=>{const a=window.__riddle;for(const id of ['fighter_warden','fighter_reaver','fighter_boss_guard']){await a.mutate(()=>a.engine.learnClassSkill(id),'Learned',true);}const{openHero}=await import('/src/ui/town.ts');openHero(a);return a.lineage.class_tree;});
 assert.equal(learned.spent,3);assert.equal(learned.points,0);assert.equal(learned.level,5);
 await page.locator('[data-class-path=fighter_boss_guard] .class-skill-rules summary').click();
 await page.locator('.sheet-wrap:not([hidden]) .class-tree-panel').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.waitForTimeout(250);await page.screenshot({path:`${out}/earned-tree-${width}.png`});
 const after=await page.evaluate(()=>({gold:window.__riddle.lineage.gold,xp:window.__riddle.lineage.classes.fighter.xp,level:window.__riddle.lineage.classes.fighter.level}));assert.deepEqual(after,before);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({width,before,after,tree:learned,scope:'Original earned L5/D22 save, three normally affordable cumulative skill picks; no new XP, gold, absence or play credit.'});await page.close();
}}finally{await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2)+'\n');}
assert.deepEqual(errors,[]);console.log('PASS earned class tree320/400/1440; three legitimate skill picks, gold/XP unchanged.');
