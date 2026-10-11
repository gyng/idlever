// Synthetic completed-exit presentation over real Rust classification/settlement.
// Only Send's preview and the exit notification are supplied by this fixture;
// no simulated earned-run or real death-eligibility claim.
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
import {isDeepStrictEqual} from 'node:util';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
const fixtures=JSON.parse(readFileSync(new URL('../../docs/evidence/cut156/presentation-fixtures.json',import.meta.url))).presentation;
const expected=JSON.parse(readFileSync(new URL('../../docs/evidence/cut156/final-fixtures.json',import.meta.url))).cases;
const out=process.env.KEEP_EVIDENCE;if(out)mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),results=[];
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
try{
 for(const width of [400,1440])for(const name of ['same_kind_excess','same_kind_upgrade','distinct_kind','none']){
  const fixture=fixtures.find(f=>f.case===name),page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${url}?dev=1&fresh=1&seed=156`);await page.waitForFunction(()=>window.__riddle?.booted,null,{timeout:90000});
  await page.evaluate(async fixture=>{
   const a=window.__riddle;if(a.kind!=='wasm')throw Error('real WASM required');
   if(!await a.importSave(JSON.stringify({v:2,engine:fixture.save,last_seen:Date.now(),runs:0,loadout:[]})))throw Error('fixture import refused');
   const step=a.engine.step.bind(a.engine),auto=a.engine.autoKeep.bind(a.engine),keep=a.engine.keep.bind(a.engine);
   window.__keepAuto=0;window.__keepManual=0;window.__keepSheets=0;
   new MutationObserver(()=>{if(document.querySelector('.sheet-wrap .keep-legend'))window.__keepSheets++;}).observe(document.body,{childList:true,subtree:true});
   a.engine.send=async()=>fixture.snapshot;
   a.engine.step=async()=>{const r=await step(0);r.events=[{k:'exit',t:r.snapshot.turn,tier:r.exit_pending.tier,loot_kept:0}];return r;};
   a.engine.autoKeep=async()=>{window.__keepAuto++;return auto();};
   a.engine.keep=async ids=>{window.__keepManual++;return keep(ids);};
   a.go({kind:'watch'});
  },fixture);
  if(name==='distinct_kind'){
   await page.locator('.sheet-wrap .keep-legend').waitFor({timeout:20000});
   check(await page.locator('.sheet-wrap .chips .chip.item').count()===1,'alternative remains selectable');
   await page.locator('.sheet-wrap button.btn.primary.wide').click();
  }
  await page.waitForFunction(()=>window.__riddle.screen==='report',null,{timeout:25000});
  await page.getByRole('button',{name:'details',exact:true}).click();
  const result=await page.evaluate(async()=>{
   const a=window.__riddle,saved=JSON.parse(await a.engine.save());
   return{auto:window.__keepAuto,manual:window.__keepManual,sheets:window.__keepSheets,
    gold:saved.lineage.gold,carry:saved.lineage.gold_carry,vault:saved.lineage.vault,pending:saved.pending_exit,
    text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth};
  });results.push({width,name,synthetic:true,...result,errors});
  if(out){writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));await page.screenshot({path:`${out}/${width}-${name}.png`});}
  if(name!=='distinct_kind'){
   const e=expected.find(e=>e.case===name&&e.tier==='bank').settled;
   check(result.auto===1&&result.manual===0&&result.sheets===0,'no routine sheet or manual settlement');
   check(result.gold===e.gold&&result.carry===e.fractional_carry&&isDeepStrictEqual(result.vault,e.vault),'exact Rust automatic gold/carry/storage');
   check(result.text.includes('dagger')&&/salvaged/i.test(result.text),'retained and actual salvage visible in report details');
   if(name==='none')check(result.text.includes('heal')&&!result.text.includes('oily potion?'),'known salvage keeps its name');
  }else check(result.manual===1&&result.auto===0&&result.sheets>0,'manual conflict still resolves');
  check(!result.pending&&!result.overflow&&!errors.length,'settled/no overflow/errors');
  await page.close();console.log(width,name,'real-WASM fixture flow PASS');
 }
}finally{await browser.close();}
