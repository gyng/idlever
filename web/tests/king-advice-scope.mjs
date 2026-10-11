import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
const source=gunzipSync(readFileSync(new URL('../../docs/evidence/cut145/source.save.json.gz',import.meta.url))).toString('utf8');
const out=process.env.KING_ADVICE_EVIDENCE;if(out)mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),results=[];
try{
 for(const width of [400,1440]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=145`);await p.waitForFunction(()=>window.__riddle?.booted,null,{timeout:90000});
  const death=await p.evaluate(async source=>{
   const a=window.__riddle;if(a.kind!=='wasm')throw Error('real WASM required');
   if(!await a.importSave(JSON.stringify({v:2,engine:source,loadout:JSON.parse(source).loadout,last_seen:Date.now(),runs:0})))throw Error('save import refused');
   const d=await a.engine.death(237);a.go({kind:'death',death:d,kept:true});return{baseline:d.baseline,nothing:d.nothing_beats_base,cause:d.cause};
  },source);
  await p.locator('.death .death-more').click();
  if(await p.locator('.death .patches-more').count())await p.locator('.death .patches-more').click();
  await p.waitForFunction(()=>[...document.querySelectorAll('.death .patch .delta')].some(e=>e.textContent.includes('D33')&&!e.classList.contains('pending')),{timeout:15000});
  await p.locator('.death .patch').first().scrollIntoViewIfNeeded();
  const checks=await p.evaluate(()=>{
   const head=document.querySelector('.patches-head').textContent,patches=[...document.querySelectorAll('.death button.patch')];
   return {head,lines:patches.map(p=>p.querySelector('.surv')?.textContent),dim:patches.every(p=>p.classList.contains('below')),gain:document.querySelector('.death .patch .delta')?.textContent,gem:document.querySelector('.death .console .gem')?.textContent.trim(),positiveColours:document.querySelectorAll('.death .patch .delta.up').length};
  });
  if(death.baseline!==0||!death.nothing||death.cause!=='mirror_king'||checks.head!=='Last moments · 0/12 survived · no replay gain'||!checks.dim||checks.lines[0]!=='no replay gain'||!checks.gain.includes('reach D33 0→89%')||!/^town$/i.test(checks.gem)||checks.positiveColours)throw Error(JSON.stringify({width,death,checks}));
  results.push({width,death,checks,text:await p.locator('body').innerText(),errors});
  if(out){await p.screenshot({path:`${out}/${width}-king-advice.png`});writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));}
  if(errors.length)throw Error(errors.join('\n'));await p.close();console.log(width,'King replay scope/count/price/eligibility checks PASS');
 }
}finally{await browser.close();}
