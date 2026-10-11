import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{encoding:'utf8'}).trim(),source=readFileSync('web/tests/fixtures/earned-first-ascension-clear.json','utf8');
const b=await launchBrowser(),result={fixture:'existing earned first clear, real WASM, new tier0 descent through public engine APIs; no grants; diagnostic fold=0 to observe Queen instead of the known-floor skip',rows:[]};
try {for(const width of [400]) {
 const p=await b.newPage({viewport:{width,height:900}}),errors=[],warnings=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text());});
 await p.goto(`${url}?dev=1&fresh=1&runs=0&seed=142&fold=0`);await p.waitForFunction(()=>window.__riddle?.booted);
 const setup=await p.evaluate(async source=>{
  const a=window.__riddle;if(a.runnerOn)throw Error('runs=0 must disable the town runner');
  if(a.kind!=='wasm')throw Error('not WASM');
  if(!await a.importSave(JSON.stringify({v:2,engine:source,loadout:JSON.parse(source).loadout,last_seen:Date.now(),runs:0})))throw Error('import');
  if(a.runnerOn)throw Error('runs=0 must disable the town runner'); a.lineage=await a.engine.beginDescent(0);let startError='';
  try{a.lineage=await a.engine.setStart(24);}catch(e){startError=String(e);}
  let prepared=null,batches=0,attempts=0;
  for(;attempts<4;attempts++) {
   let snap=await a.engine.send();
   for(let n=0;n<150&&snap.depth<28;n++) {
    const r=await a.engine.step(200);batches++;snap=r.snapshot;
    if(r.run_over)break;
   }
   if(snap.depth>=28){prepared={depth:snap.depth,turn:snap.turn,hero:snap.hero.hp};break;}
  }
  if(!prepared)throw Error('No D28 reached within four real runs: '+batches+' batches');
  await a.refresh();a.go({kind:'watch'});return {kind:a.kind,start:a.lineage.start,startError,prepared,batches,attempts};
 },source);
 await p.waitForSelector('.watch');await p.locator('[data-tile=speed]').click();await p.locator('.sheet [data-tile=one]').click();
 const samples=await p.evaluate(()=>new Promise(resolve=>{
  const rows=[],start=performance.now();const id=setInterval(()=>{
   const w=document.querySelector('.watch');rows.push({at:performance.now()-start,screen:window.__riddle.screen,hidden:document.hidden,data:w?{...w.dataset}:null,log:document.querySelector('.combat-log')?.textContent.slice(-600)});
   if(!w||performance.now()-start>=60000){clearInterval(id);resolve(rows);}
  },250);
 }));
 await p.screenshot({path:`scratchpad/cut142/${width}-queen-unfolded.png`});result.rows.push({width,setup,samples,errors,warnings});writeFileSync('scratchpad/cut142/queen-unfolded.json',JSON.stringify(result,null,2));await p.close();
}}finally{await b.close();writeFileSync('scratchpad/cut142/queen-unfolded.json',JSON.stringify(result,null,2));}
console.log(result.rows.map(r=>({width:r.width,start:r.setup.start,samples:r.samples.length,errors:r.errors,warnings:r.warnings}))); 
