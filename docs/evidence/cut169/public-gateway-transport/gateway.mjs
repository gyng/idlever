// Coordinator-owned prospective interface. Does not certify player isolation or active time.
import http from 'node:http';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const fields={text:[],buttons:[],shot:['name','full'],click:['label','selector','nth','wait'],act:['label','selector','nth','timeout','shot'],tap:['x','y','wait'],type:['text'],press:['key'],fill:['selector','text'],watch:['ms','every','shots','name'],goto:['url','wait']};
export function validate(command,config){
 if(!command||typeof command!=='object'||Array.isArray(command))throw Error('Expected an operation object');
 const allowed=Object.hasOwn(fields,command.op)?fields[command.op]:undefined;if(!allowed)throw Error('Operation not available in public player interface');
 for(const key of Object.keys(command))if(key!=='op'&&!allowed.includes(key))throw Error(`Unsupported field: ${key}`);
 for(const key of ['name','shot'])if(command[key]!==undefined&&!/^[a-zA-Z0-9_-]{1,80}$/.test(command[key]))throw Error('Screenshot names must be plain names');
 for(const key of ['wait','timeout','ms','every','shots','nth','x','y'])if(command[key]!==undefined&&(!Number.isFinite(command[key])||command[key]<0))throw Error(`Invalid numeric field: ${key}`);
 if(command.op==='press'&&!(typeof command.key==='string'&&(/^[a-zA-Z0-9 .>]$/.test(command.key)||['Escape','Enter','Tab','Backspace','Delete','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Space','Control+A','Control+Z','Control+Y','Shift+Tab','Shift+ArrowUp','Shift+ArrowDown','Shift+ArrowLeft','Shift+ArrowRight'].includes(command.key))))throw Error('Only game and text-editing keys are available');
 if(command.wait>1500||command.timeout>15000)throw Error('Excessive blocked wait');
 if(command.op==='watch'&&(!(command.ms>=1&&command.ms<=1000)||command.every!==undefined&&command.every>1000||command.shots>1))throw Error('Watch observations are bounded to one second; buffered time is not active credit');
 if(command.op==='goto'){
  if(!config.allowedUrls.includes(command.url)&&command.url!==config.reloadUrl)throw Error('Only prescribed cohort navigation is available');
 }
 return command;
}
export function publicResult(result){
 if(result&&typeof result==='object'&&result.end){const {screen,...visible}=result.end;return {...result,end:visible};}
 return result;
}
export function serve(config){
 const ledger=config.ledger;
 if(!Array.isArray(config.allowedUrls)||!config.allowedUrls.length||new Set(config.allowedUrls).size!==config.allowedUrls.length)throw Error('Prescribed navigation sequence must be nonempty and unique');
 if(config.reloadUrl){const u=new URL(config.reloadUrl);if(['fresh','menu','absent'].some(k=>u.searchParams.has(k)))throw Error('Reload must retain the current saved game');}
 let sequence=0,working=false,navigationIndex=0;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.method!=='POST'||req.url!=='/'){res.statusCode=404;res.end(JSON.stringify({error:'POST operations to /'}));return;}
  if(working){res.statusCode=409;res.end(JSON.stringify({error:'Previous operation still running'}));return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>16000){res.statusCode=413;res.end('{}');return;}}
  const started=Date.now();let command,result,request;working=true;
  try{request=JSON.parse(body);command=validate(request,config);if(command.op==='goto'){if(command.url===config.reloadUrl){if(!navigationIndex)throw Error('Begin with the prescribed first visit');}else{if(command.url!==config.allowedUrls[navigationIndex])throw Error('Use each prescribed visit once, in order');navigationIndex++;}}const response=await fetch(config.upstream,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});result=publicResult(await response.json());}
  catch(error){result={error:String(error.message)};res.statusCode=400;}
  finally{working=false;}
  fs.appendFileSync(ledger,JSON.stringify({sequence:++sequence,startedUtc:new Date(started).toISOString(),finishedUtc:new Date().toISOString(),blockedMilliseconds:Date.now()-started,navigationIndex,requested:request??null,command:command??null,result,activeCredit:'none inferred from operation duration'})+'\n');
  res.end(JSON.stringify(result));
 });
 server.listen(config.port,'127.0.0.1');return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 serve(config);console.log('Public-only cohort gateway ready');
}
