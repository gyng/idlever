import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
const source=gunzipSync(readFileSync(new URL('../../docs/evidence/cut154/source.save.json.gz',import.meta.url))).toString();
const out=process.env.DEATH_FIX_EVIDENCE;if(out)mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),results=[];
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
try{
 for(const width of [400,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${url}?dev=1&fresh=1&seed=155`);
  await page.waitForFunction(()=>window.__riddle?.booted,null,{timeout:90000});
  const before=await page.evaluate(async source=>{
   const a=window.__riddle;if(a.kind!=='wasm')throw Error('real WASM required');
   if(!await a.importSave(JSON.stringify({v:2,engine:source,loadout:JSON.parse(source).loadout,last_seen:Date.now(),runs:0})))throw Error('import failed');
   const {pickFollowsFix}=await import('/src/ui/death.ts');
   const price={depth:28,past_from:0,past_to:0,past_pm:0,death_from:.98,death_to:.98,death_pm:0,sims:50};
   const pick={kind:'tactic',text:'quiet steps',price},fix={gem:true,whole:{price:{...price,past_to:.85,past_pm:.112,death_to:.775}}};
   const yes=pickFollowsFix(pick,[fix]);
   const negatives=[{...pick,pending:true},{...pick,price:undefined},{...pick,price:{...price,depth:33}},
    {...pick,price:{...price,past_from:.2}},{...pick,price:{...price,death_from:.5}},
    {...pick,price:{...price,past_to:.8,past_pm:.1}}, {...pick,price:{...price,past_to:.9}}];
   if(!yes||negatives.some(p=>pickFollowsFix(p,[fix]))||
     pickFollowsFix(pick,[{...fix,gem:false}])||pickFollowsFix(pick,[{...fix,camp_pending:true}])||
     pickFollowsFix(pick,[{...fix,whole:{...fix.whole,harms:true}}])||
     pickFollowsFix(pick,[{...fix,whole:{...fix.whole,trade_off:true}}])||
     pickFollowsFix(pick,[{...fix,whole:{price:{...fix.whole.price,death_to:1}}}]))throw Error('comparison boundaries');
   const state=await a.engine.lineage(),original=a.engine.deathDeltas.bind(a.engine);window.__fixCalls=0;
   a.engine.deathDeltas=async(...args)=>{window.__fixCalls++;window.__fixMeasured=await original(...args);return window.__fixMeasured;};
   a.go({kind:'death',death:await a.engine.death(387),kept:true});
   return{gold:state.gold,heir:state.heir,best:state.best_depth,rules:JSON.stringify(a.rules)};
  },source);
  await page.waitForFunction(()=>document.querySelector('.death .death-pick .lever-price:not(.pending)'),null,{timeout:20000});
  const result=await page.evaluate(async()=>{
   const a=window.__riddle,s=await a.engine.lineage(),patch=document.querySelector('.death button.patch.top'),pick=document.querySelector('.death .death-pick');
   const d=await a.engine.death(387),p=patch?.getBoundingClientRect(),t=pick?.getBoundingClientRect();
   return{calls:window.__fixCalls,buys:patch?.dataset.buys,label:patch?.dataset.short,
    fixFirst:!!p&&!!t&&p.y<t.y,fixPrice:window.__fixMeasured.find(p=>p.gem)?.whole?.price,pickPrice:d.pick?.price,
    state:{gold:s.gold,heir:s.heir,best:s.best_depth,rules:JSON.stringify(a.rules)},
    overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText};
  });
  results.push({width,before,...result,errors});
  if(out){writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));await page.screenshot({path:`${out}/${width}-death.png`});}
  check(result.calls===1,'one shared pricing request');check(result.buys==='silence'&&result.label.includes('$39')&&result.fixFirst,'paid silence fix visibly precedes neutral TRY');
  check(result.fixPrice?.past_to===.85&&result.pickPrice?.past_to===0,'exact Rust wall prices');
  check(JSON.stringify(result.state)===JSON.stringify(before),'no game mutation');check(!result.overflow&&!errors.length,'no overflow/errors');
  // Put the useful compact fix above the fixed console for the checkpoint screenshot.
  await page.locator('.death button.patch.top').scrollIntoViewIfNeeded();
  if(out){writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));await page.screenshot({path:`${out}/${width}-death.png`});}
  await page.close();console.log(width,'13 comparison boundaries / actual paid fix ordering / prices / no mutation PASS');
 }
}finally{await browser.close();}
