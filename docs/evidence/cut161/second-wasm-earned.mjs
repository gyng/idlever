import {spawn} from 'node:child_process';
import net from 'node:net';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {launchBrowser} from '../../tools/browser.mjs';
const fixture=JSON.parse(readFileSync(new URL('earned-upgrade.json',import.meta.url)));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:new URL('../../web/',import.meta.url),stdio:'ignore'});
let browser;
try {
 const url=`http://localhost:${port}`;
 for(let i=0;i<120;i++){if(await fetch(url).then(r=>r.ok,()=>false))break;await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser();const page=await browser.newPage();await page.goto(url);
 const result=await page.evaluate(async fixture=>{
  const {default:init,Game}=await import('/src/engine/pkg/riddle_wasm.js');await init();
  const g=new Game(161);g.load(fixture.before);
  const prior=g.save();
  const probe=new Game(161);probe.load(prior);const preview=JSON.parse(probe.step(0)).exit_pending;probe.free();
  g.autoKeep();const after=g.save();g.autoKeep();const repeated=g.save();
  const r=new Game(161);r.load(prior);r.autoKeep();const restored=r.save();
  const manual=new Game(161);manual.load(prior);manual.keep('[100004]');
  const result={preview,after:JSON.parse(after),idempotent:after===repeated,reloaded_equal:after===restored,manual:JSON.parse(manual.save())};
  g.free();r.free();manual.free();return result;
 },fixture);
 const expected=JSON.parse(fixture.after);
 for(const key of ['vault','gold','gold_carry','forge','next_vault_id']) assert.deepEqual(result.after.lineage[key],expected.lineage[key],key);
 for(const key of ['salvaged','salvaged_coins','salvage_gold','found'])assert.deepEqual(result.after.batch[key],expected.batch[key],key);
 assert.deepEqual(result.preview.auto_keep,[94]);assert.equal(result.after.pending_exit,null);
 assert(result.idempotent&&result.reloaded_equal);assert.equal(result.manual.lineage.vault[0].kind,'axe');
 writeFileSync(new URL('wasm-earned.json',import.meta.url),JSON.stringify(result,null,2));
 console.log('PASS: actual earned pending exit, native/WASM vault/currency/fates, manual selection, reload and idempotence. Transport clock metadata excluded from native comparison.');
}finally{await browser?.close();server.kill();}
