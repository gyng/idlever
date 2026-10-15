import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {resolve} from 'node:path';
const out=resolve('docs/evidence/cut250/heroes-regression-8879');
const sha=b=>createHash('sha256').update(b).digest('hex');
const inventory=()=>{const files={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())walk(f);else files[f]=sha(readFileSync(f));}};walk('web/src');walk('web/tests');return files;};
const expected='8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff';
const result={at:new Date().toISOString(),scope:'Two existing unchanged substantive Heroes journey groups, serial headless, original widths retained. Not new primary viewport review, performance or full-client acceptance.',node:process.version,expectedWasm:expected,sourceBefore:inventory(),served:[],groups:['runsui:heroes','bloodline-founding']};
const save=()=>writeFileSync(out+'/identity.json',JSON.stringify(result,null,2)+'\n');save();
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:resolve('web'),stdio:'ignore'});
try{
 const url=`http://localhost:${port}`;result.url=url;
 for(let i=0;i<120;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const served=async phase=>{for(const path of ['/src/engine/pkg/idlever_wasm_bg.wasm','/src/ui/heroes.ts','/src/ui/camp.ts','/src/heroes-compact.css','/src/desktop-dock.css']){const r=await fetch(url+path);if(!r.ok)throw Error(path+' HTTP'+r.status);const b=Buffer.from(await r.arrayBuffer());const h=sha(b);result.served.push({phase,path,bytes:b.length,sha256:h});if(path.endsWith('.wasm')&&h!==expected)throw Error('Served WASM mismatch');}save();};
 await served('before');
 const child=spawn(process.execPath,['tests/run.mjs',...result.groups],{cwd:resolve('web'),env:{...process.env,IDLEVER_PORT:String(port),IDLEVER_CLIENT_STATE_DIR:out+'/state',TEST_JOBS:'1',IDLEVER_BROWSER:'headless'},stdio:['ignore','pipe','pipe']});
 let log='';for(const s of [child.stdout,child.stderr])s.on('data',b=>{log+=b;writeFileSync(out+'/run.log',log);});
 result.exitCode=await new Promise(r=>child.on('close',r));await served('after');result.sourceAfter=inventory();result.sourceUnchanged=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.status=result.exitCode===0&&result.sourceUnchanged?'PASS':'FAIL';save();process.exitCode=result.status==='PASS'?0:1;
}catch(e){result.error=String(e.stack??e);result.status='FAIL';save();throw e;}finally{vite.kill('SIGTERM');}
