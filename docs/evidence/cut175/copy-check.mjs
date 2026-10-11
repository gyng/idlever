import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const endpoint='http://127.0.0.1:41417/',calls=[];
async function op(command){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});const result=await r.json();calls.push({command,result});assert.ok(!result.error,result.error);return result;}
const read={op:'js',body:'return {url:page.url(),save:await page.evaluate(()=>window.__riddle.engine.save()),local:await page.evaluate(()=>localStorage.getItem("riddle.save"))};'};
const before=(await op(read)).value;
assert.ok(new URL(before.url).searchParams.has('menu'));assert.ok(before.local);
const inspection=await op({op:'sheets',max:0,workers:1,quiet:300});
const after=(await op(read)).value;assert.deepEqual(after,before);assert.equal(inspection.same_screen,true);assert.ok(inspection.controls>2);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
fs.writeFileSync('/home/g/p/riddle/scratchpad/cut175-copy-check.json',JSON.stringify({scope:'Paused coordinator fixture: real-WASM New game/free-house town; copy contains no interaction and adds no active credit. Original menu URL and engine/local save unchanged.',before:{url:before.url,engineSha256:hash(before.save),localSaveSha256:hash(before.local)},inspection,originalUnchanged:true,calls},null,2)+'\n');
console.log('PASS copied saved town matches main screen; original menu URL, exact engine and local saved value unchanged');
