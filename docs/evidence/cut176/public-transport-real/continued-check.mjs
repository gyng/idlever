import fs from 'node:fs';import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync('scratchpad/cut176-public-transport-config.json','utf8')),records=[];
async function op(command,ok=true){const r=await fetch('http://127.0.0.1:41420/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});const result=await r.json();records.push({command,status:r.status,result});assert.equal(r.ok,ok);if(ok)assert.ok(!result.error,result.error);else assert.ok(result.error);return result;}
const prior=fs.readFileSync(config.ledger,'utf8').trim().split('\n').map(JSON.parse);assert.equal(prior.length,13);assert.equal(prior.at(-1).navigationIndex,1);
assert.equal(prior.at(-1).result.path,'/home/g/p/riddle/scratchpad/cut176-transport-driver/shots/transport-menu.png');assert.ok(fs.existsSync(prior.at(-1).result.path));
// Continue the same real browser and consumed first visit; never retry/reset it.
const text=await op({op:'text'});assert.match(text.text,/New game/);assert.ok(!Object.hasOwn(text,'screen'));
const buttons=await op({op:'buttons'});assert.ok(buttons.buttons.some(b=>b.text==='New game'&&!b.dis&&b.vis));
const shot=await op({op:'shot',name:'transport-menu-confirmed',full:false});assert.equal(shot.path,'/home/g/p/riddle/scratchpad/cut176-transport-driver/shots/transport-menu-confirmed.png');assert.ok(fs.existsSync(shot.path));
await op({op:'goto',url:config.allowedUrls[0]},false);await op({op:'goto',url:config.allowedUrls[2]},false);
const ledger=fs.readFileSync(config.ledger,'utf8').trim().split('\n').map(JSON.parse);assert.equal(ledger.length,prior.length+records.length);assert.ok(ledger.every(x=>x.activeCredit==='none inferred from operation duration'));assert.equal(ledger.at(-1).navigationIndex,1);
fs.writeFileSync('scratchpad/cut176-public-transport-check.json',JSON.stringify({scope:'Coordinator real-browser preflight on older immutable ade4b12; public menu only. No player, choices, active horizon, accepted new build or score.',initialAttempt:'Failed only because check expected shot.shot; actual documented driver response is shot.path. All original requests preserved. Continued same browser/nav sequence without reset.',requests:ledger.length,continuationRecords:records,ledgerMatches:true,unsafeOperationsRejected:true,noActiveCreditInferred:true},null,2)+'\n');
console.log('PASS real-browser public text/buttons/shot.path and unsafe-operation/order checks; same browser preserved, no player released');
