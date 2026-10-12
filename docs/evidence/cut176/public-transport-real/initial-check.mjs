import fs from 'node:fs';import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync('scratchpad/cut176-public-transport-config.json','utf8')),records=[];
async function op(command,ok=true){const r=await fetch('http://127.0.0.1:41420/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});const result=await r.json();records.push({command,status:r.status,result});assert.equal(r.ok,ok);if(ok)assert.ok(!result.error,result.error);else assert.ok(result.error);return result;}
await op({op:'goto',url:config.reloadUrl},false);
for(const command of [{op:'state'},{op:'eval',code:'window.__riddle'},{op:'click',label:'New game',force:true},{op:'press',key:'F12'},{op:'press',key:'Control+L'},{op:'shot',name:'../outside'},{op:'watch',ms:2000},{op:'goto',url:'http://example.invalid/'}])await op(command,false);
await op({op:'goto',url:config.allowedUrls[0]});
const text=await op({op:'text'});assert.match(text.text,/New game/);assert.ok(!Object.hasOwn(text,'screen'));
const buttons=await op({op:'buttons'});assert.ok(buttons.buttons.some(b=>b.text==='New game'&&!b.dis&&b.vis));
const shot=await op({op:'shot',name:'transport-menu',full:false});assert.ok(shot.shot);
await op({op:'goto',url:config.allowedUrls[0]},false);await op({op:'goto',url:config.allowedUrls[2]},false);
const ledger=fs.readFileSync(config.ledger,'utf8').trim().split('\n').map(x=>JSON.parse(x));assert.equal(ledger.length,records.length);assert.ok(ledger.every(x=>x.activeCredit==='none inferred from operation duration'));assert.equal(ledger.at(-1).navigationIndex,1);
fs.writeFileSync('scratchpad/cut176-public-transport-check.json',JSON.stringify({scope:'Coordinator preflight on older immutable ade4b12; real browser, public menu only. No player choices, active horizon, accepted new build or score.',requests:records.length,records,ledgerMatches:true,unsafeOperationsRejected:true,noActiveCreditInferred:true},null,2)+'\n');
console.log(`PASS ${records.length} real-browser public transport checks; unsafe/internal operations rejected; no player released`);
