import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
const source=readFileSync(new URL('../legacy-campaign-cut70-focus-fireward/fighter5-renewal-venom-fireward-after.json',import.meta.url),'utf8');
const out=new URL('../../docs/evidence/cut145/browser/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
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
  results.push({width,death,text:await p.locator('body').innerText(),errors});
  await p.screenshot({path:`${out}/${width}-king-advice.png`});writeFileSync(`${out}/observations.json`,JSON.stringify(results,null,2));
  if(errors.length)throw Error(errors.join('\n'));await p.close();
 }
}finally{await browser.close();}
