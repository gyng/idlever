import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {serve} from './public-blind-gateway.mjs';
const dir='/tmp/riddle-public-gateway-check-'+Date.now();fs.mkdirSync(dir);
let forwarded=[];const upstream=http.createServer(async(req,res)=>{let b='';for await(const c of req)b+=c;const op=JSON.parse(b);forwarded.push(op);res.setHeader('content-type','application/json');res.end(JSON.stringify(op.op==='watch'?{end:{screen:'private-engine-screen',text:'Visible report',buttons:['Town'],busy:false}}:{ok:true,text:'Visible game'}));});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
const config={port:0,upstream:`http://127.0.0.1:${upstream.address().port}`,ledger:dir+'/operations.jsonl',allowedUrls:['http://localhost:5999/?dev=1&runs=1&seed=137&fresh=1&menu=1','http://localhost:5999/?dev=1&runs=1&absent=20m','http://localhost:5999/?dev=1&runs=1&absent=4h','http://localhost:5999/?dev=1&runs=1&absent=8h'],reloadUrl:'http://localhost:5999/?dev=1&runs=1'};
const gateway=serve(config);await once(gateway,'listening');const endpoint=`http://127.0.0.1:${gateway.address().port}/`;
const post=async command=>{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});return {status:r.status,body:await r.json()};};
let checks=0;async function rejected(c){const before=forwarded.length;assert.equal((await post(c)).status,400);assert.equal(forwarded.length,before);checks++;}
try{
 for(const c of [{op:'js',body:'return window.__riddle'},{op:'eval',js:'document.title'},{op:'state'},{op:'press',key:'F12'},{op:'press',key:'Control+L'},{op:'press',key:'Control+Shift+J'},{op:'click',label:'Town',force:true},{op:'shot',name:'../../source'},{op:'watch',ms:180000},{op:'goto',url:config.allowedUrls[2]},{op:'goto',url:config.reloadUrl}])await rejected(c);
 assert.equal((await post({op:'goto',url:config.allowedUrls[0]})).status,200);checks++;
 await rejected({op:'goto',url:config.allowedUrls[0]});
 for(const url of config.allowedUrls.slice(1)){assert.equal((await post({op:'goto',url})).status,200);checks++;await rejected({op:'goto',url});}
 for(const c of [{op:'goto',url:config.reloadUrl},{op:'click',label:'Town'},{op:'press',key:'Escape'},{op:'press',key:'Control+A'},{op:'type',text:'my chosen rule'}]){assert.equal((await post(c)).status,200);checks++;}
 const watch=await post({op:'watch',ms:1000,every:250,shots:1});assert.equal(watch.status,200);assert.equal(watch.body.end.text,'Visible report');assert(!Object.hasOwn(watch.body.end,'screen'));checks++;
 const ledger=fs.readFileSync(config.ledger,'utf8').trim().split('\n').map(JSON.parse);assert.equal(ledger.length,checks);assert(ledger.every(x=>x.activeCredit==='none inferred from operation duration'));assert.equal(ledger.at(-1).navigationIndex,4);checks++;
 const evidence={scope:'Mock transport only; no browser, player, asset freeze or instruction-purity certificate',checks,forwarded:forwarded.length,ledgerPath:config.ledger,allPassed:true};fs.writeFileSync('/home/g/p/riddle/scratchpad/cut169/public-gateway-transport-check.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{await Promise.all([new Promise(r=>gateway.close(r)),new Promise(r=>upstream.close(r))]);}
