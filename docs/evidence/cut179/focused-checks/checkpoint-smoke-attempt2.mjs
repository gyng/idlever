import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const out='/home/g/p/riddle/scratchpad/cut179/checkpoint-smoke-attempt2',url='http://127.0.0.1:41269/';fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const children=[];
async function start(port,dir,restore){
 fs.mkdirSync(dir,{recursive:true});const log=fs.openSync(dir+'/driver.log','w');const args=['tools/driver.mjs','--dir',dir,'--port',String(port),'--headless','--checkpoint',...(restore?['--restore',restore]:[])];
 const child=spawn(process.execPath,args,{cwd:'/home/g/p/riddle',stdio:['ignore',log,log]});children.push(child);fs.closeSync(log);
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('driver exited '+child.exitCode);try{await fetch(`http://127.0.0.1:${port}/`,{method:'POST',body:'{"op":"log"}'});return;}catch{await new Promise(r=>setTimeout(r,100));}}
 throw Error('driver startup timeout');
}
async function op(port,body){const r=await fetch(`http://127.0.0.1:${port}/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();assert(!result.checkpointError,result.checkpointError);return result;}
const a=41431,b=41432,da=out+'/original',db=out+'/restored';
try{
 await start(a,da);await op(a,{op:'goto',url:url+'?dev=1&runs=1&seed=149&fresh=1'});
 await op(a,{op:'act',selector:'.town-tag[data-next="house"]'});
 const before=(await op(a,{op:'eval',js:'({kind:window.__riddle.kind,seed:window.__riddle.lineage.seed,home:window.__riddle.lineage.town.home,gold:window.__riddle.lineage.gold,hero:window.__riddle.lineage.hero_slots.map(x=>x.id)})'})).value;
 assert.equal(before.kind,'wasm');assert.equal(before.home,true);
 const checkpoint=da+'/browser-state.json';let saved=fs.readFileSync(checkpoint);const parsed=JSON.parse(saved);assert.equal(parsed.cookies.length,0);assert.equal(parsed.origins.length,1);assert(parsed.origins[0].localStorage.every(x=>x.name.startsWith('riddle.')));
 fs.copyFileSync(checkpoint,out+'/earned-before-close.json');const checkpointSha=sha(saved);
 await op(a,{op:'js',body:'await browser.close(); return {closed:true};'});
 const failure=await op(a,{op:'text'});assert.match(failure.error,/closed/i);assert.equal(sha(fs.readFileSync(checkpoint)),checkpointSha,'failure overwrote earned snapshot');
 await op(a,{op:'quit'});await start(b,db,checkpoint);
 await op(b,{op:'goto',url:url+'?dev=1&runs=1&seed=149'});
 const after=(await op(b,{op:'eval',js:'({kind:window.__riddle.kind,seed:window.__riddle.lineage.seed,home:window.__riddle.lineage.town.home,gold:window.__riddle.lineage.gold,hero:window.__riddle.lineage.hero_slots.map(x=>x.id)})'})).value;
 assert.deepEqual(after,before);const text=await op(b,{op:'text'});assert(!text.error);await op(b,{op:'quit'});
 fs.writeFileSync(out+'/result.json',JSON.stringify({scope:'Driver committed browser-storage preservation and genuine same-save recovery after deliberate browser closure; not QA horizon or score',before,after,checkpointSha,originalFailure:failure,result:'PASS'},null,2)+'\n');
 console.log('PASS real-WASM earned house save survives deliberate browser closure and exact-state restore; cookies0/game-only keys; no reset/grants/forced save');
}finally{for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');}
