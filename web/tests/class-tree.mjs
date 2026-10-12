// Controlled progression fixtures; real Rust worker learning, never earned-play evidence.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
async function installFixture(page){
 await page.evaluate(async()=>{
  const a=window.__riddle;if(a.kind!=='wasm')throw Error('real WASM required');a.runnerOn=false;
  window.skillFixture=JSON.parse(await a.engine.save());
  window.showSkill=async(level,depth,cls='fighter')=>{
   const s=structuredClone(window.skillFixture),l=s.lineage;l.town.home=true;l.class=cls;l.class_paths={};
   l.classes[cls]={level,xp:123,next:0};l.best_depth=depth;l.hero_legacy.at(-1).best_depth=depth;
   for(const id of ['rogue',cls])if(id!=='fighter'&&!l.unlocks.includes(id))l.unlocks.push(id);
   a.lineage=await a.engine.load(JSON.stringify(s));a.adoptSets();await a.afterLineage();
   const{closeAllSheets}=await import('/src/ui/sheet.ts');closeAllSheets();const{openHero}=await import('/src/ui/town.ts');openHero(a);
  };
 });
}
const browser=await launchBrowser();
try{for(const width of [320,400,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${url}?fresh=1&seed=185&runs=0`);await page.waitForFunction(()=>window.__riddle?.booted);
 await installFixture(page);await page.evaluate(()=>window.showSkill(1,1));
 assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-panel,.class-tree-soon').count(),0);
 await page.evaluate(()=>window.showSkill(2,8));assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-panel').count(),0);
 assert.match(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-soon').textContent(),/L3.*D8/);
 await page.locator('.sheet-wrap:not([hidden])').locator('.hero-class').click();const fighter=page.locator('.sheet-wrap:not([hidden])').locator('.class-row').filter({has:page.getByRole('button',{name:/fighter L/})});
 assert.equal(await fighter.locator('.rung:visible').count(),2);await fighter.locator('.class-skills-later summary').click();assert.equal(await fighter.locator('.rung:visible').count(),5);await page.keyboard.press('Escape');
 await page.evaluate(()=>window.showSkill(3,7));assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-current .class-path-choose').count(),2);assert.ok(await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-choose').first().isDisabled());
 await page.evaluate(()=>window.showSkill(3,8));const untouched=await page.evaluate(()=>window.__riddle.engine.save());
 const choose=page.locator('.sheet-wrap:not([hidden])').locator('[data-class-path=fighter_warden] .class-path-choose');
 await choose.click();assert.match(await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-review').textContent(),/Automatic tactic/);assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),untouched);
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-review button').first().click();assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),untouched);
 await choose.click();await page.evaluate(async()=>window.__riddle.setClass('rogue'));
 const switched=await page.evaluate(()=>window.__riddle.engine.save());await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').click();assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-feedback').textContent(),'Review changed');assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),switched);
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-review button').first().click();await page.evaluate(()=>window.showSkill(3,8));
 await choose.click();await page.evaluate(async()=>window.__riddle.engine.send());const away=await page.evaluate(()=>window.__riddle.engine.save());
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').click();await page.waitForFunction(()=>document.querySelector('.class-path-feedback')?.textContent.includes('hero away'));assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),away);
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-review button').first().click();await page.evaluate(()=>window.showSkill(3,8));
 await page.evaluate(()=>{const a=window.__riddle,call=a.engine.learnClassSkill.bind(a.engine);window.skillCalls=0;a.engine.learnClassSkill=async id=>{window.skillCalls++;return call(id);};});
 await choose.click();await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').evaluate(el=>{el.click();el.click();});await page.waitForFunction(()=>window.__riddle.lineage.class_tree.spent===1);await page.waitForFunction(()=>!document.querySelector('.sheet-wrap:not([hidden]) .class-path-review'));
 assert.equal(await page.evaluate(()=>window.skillCalls),1);assert.equal(await page.evaluate(()=>window.__riddle.lineage.class_tree.points),0);
 assert.match(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-panel').textContent(),/Next pick L4/);assert.ok(await page.locator('.sheet-wrap:not([hidden])').locator('[data-class-path=fighter_reaver] .class-path-choose').isDisabled());
 assert.ok(await page.evaluate(()=>window.__riddle.rules.rows.some(r=>r.origin==='class:path:fighter_warden')));
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-map summary').click();await page.evaluate(()=>window.__riddle.emitChange());assert.ok(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-map').evaluate(el=>el.open));
 const learned=await page.evaluate(async()=>{await window.__riddle.flush();return window.__riddle.engine.save();});await page.reload();await page.waitForFunction(()=>window.__riddle?.booted);assert.equal(await page.evaluate(()=>window.__riddle.engine.save()),learned);await installFixture(page);
 await page.evaluate(async()=>{const{openHero}=await import('/src/ui/town.ts');openHero(window.__riddle);});await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-remove').click();assert.match(await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-review').textContent(),/Refund 1/);
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').click();await page.waitForFunction(()=>window.__riddle.lineage.class_tree.spent===0);await page.waitForFunction(()=>!document.querySelector('.sheet-wrap:not([hidden]) .class-path-review'));assert.equal(await page.evaluate(()=>window.__riddle.lineage.class_tree.points),1);assert.ok(await page.evaluate(()=>!window.__riddle.rules.rows.some(r=>r.origin?.startsWith('class:path:'))));
 // Every class can accumulate BOTH branches and ALL children, with no lost skills/resources.
 for(const cls of ['fighter','rogue','ranger','caster','gunner']){
  await page.evaluate(cls=>window.showSkill(8,18,cls),cls);
  const tree=await page.evaluate(()=>window.__riddle.lineage.class_tree),before=await page.evaluate(()=>({gold:window.__riddle.lineage.gold,xp:window.__riddle.lineage.classes[window.__riddle.lineage.class].xp}));
  const ordered=tree.nodes.filter(n=>!n.parent).flatMap(root=>[root,...tree.nodes.filter(n=>n.parent===root.id)]);
  for(const [i,node] of ordered.entries()){
   await page.locator('.sheet-wrap:not([hidden])').locator(`[data-class-path="${node.id}"] .class-path-choose`).click();await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').click();await page.waitForFunction(spent=>window.__riddle.lineage.class_tree.spent===spent,i+1);await page.waitForFunction(()=>!document.querySelector('.sheet-wrap:not([hidden]) .class-path-review'));
   assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-current .class-path-owned').count(),i+1);
   assert.equal(await page.evaluate(()=>window.__riddle.lineage.class_tree.points),5-i);
  }
  assert.deepEqual(await page.evaluate(()=>({gold:window.__riddle.lineage.gold,xp:window.__riddle.lineage.classes[window.__riddle.lineage.class].xp})),before);
  assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-choose').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 // Early middle tier shows one child and one later milestone; full map exposes all future nodes.
 await page.evaluate(()=>window.showSkill(5,13));await choose.click();await page.locator('.sheet-wrap:not([hidden])').locator('.class-path-confirm').click();await page.waitForFunction(()=>window.__riddle.lineage.class_tree.spent===1);await page.waitForFunction(()=>!document.querySelector('.sheet-wrap:not([hidden]) .class-path-review'));
 assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-current .class-path-choose').count(),2); // other root + first child
 assert.match(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-current').textContent(),/Next L7.*D18/);
 await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-map summary').click();assert.equal(await page.locator('.sheet-wrap:not([hidden])').locator('.class-tree-future:visible').count(),4);
 assert.deepEqual(errors,[]);console.log(width,'cumulative skills/all classes/pick budget/staged disclosure/cancel/stale/refusal/single transaction/exact reload/free reset/resources PASS');await page.close();
}}finally{await browser.close();}
