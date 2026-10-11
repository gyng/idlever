import {spawn} from 'node:child_process';
import net from 'node:net';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {launchBrowser} from '../../tools/browser.mjs';
const fixtures=JSON.parse(readFileSync(new URL('after.json',import.meta.url))).earned;
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:new URL('../../web/',import.meta.url),stdio:'ignore'});
let browser;
try {
 const url=`http://localhost:${port}`;
 for(let i=0;i<120;i++){if(await fetch(url).then(r=>r.ok,()=>false))break;await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser();const page=await browser.newPage();await page.goto(url);
 const result=await page.evaluate(async fixtures=>{
  const {default:init,Game}=await import('/src/engine/pkg/riddle_wasm.js');await init();
  return fixtures.map(f=>{
   const g=Game.fromSave(f.before);const before=g.save();g.lineage();const query_unchanged=before===g.save();
   g.send();const after=g.save();const r=Game.fromSave(before);r.send();const reloaded_equal=after===r.save();
   const out={source:f.source,after,query_unchanged,reloaded_equal};g.free();r.free();return out;
  });
 },fixtures);
 for(let i=0;i<fixtures.length;i++) {
  const expected=JSON.parse(fixtures[i].after),actual=JSON.parse(result[i].after);
  assert.deepEqual(actual.run.hero,expected.run.hero,`${fixtures[i].source}: complete hero`);
  for(const key of ['gold','gold_carry','supplies','last_supplies','last_supply_origins'])assert.deepEqual(actual.lineage[key],expected.lineage[key],key);
  assert.deepEqual(actual.batch.spent,expected.batch.spent,'purchase count and paid coins');
  assert(result[i].query_unchanged&&result[i].reloaded_equal);
 }
 writeFileSync(new URL('wasm-earned.json',import.meta.url),JSON.stringify({scope:'Four actual earned sends through real WASM from unchanged native snapshots. Complete hero, purchase counts/coins and selected purse/supply fields match native; WASM reload/send byte equality. Full native/WASM Session parity and performance are not claimed.',results:result},null,2));
 console.log('PASS: four actual earned native/WASM sends; complete hero, paid purchases, purse/supply fields; source query unchanged and exact WASM reload/send');
}finally{await browser?.close();server.kill();}
