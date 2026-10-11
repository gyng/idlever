import {execFileSync} from 'node:child_process';
import {launchBrowser} from '../../tools/browser.mjs';
const url=execFileSync('bash',['tools/dev.sh'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
const b=await launchBrowser();
try {
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${url}?engine=fake&fresh=1&runs=0&seed=142`);await p.waitForFunction(()=>window.__riddle?.booted);
 const checks=await p.evaluate(async()=>{
  const {ReplayState}=await import('/src/render/state.ts'),s=await window.__riddle.engine.send(),r=new ReplayState();r.load(s);
  const checks=[],observed=[];r.onEvent=e=>observed.push(e);const check=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);};
  const event=(t,text)=>({k:'callout',t:s.turn+t,text});
  const play=e=>{r.apply([e]);r.tick(100,performance.now());};
  for(let t=1;t<=20;t++){
   r.callout=null;play(event(t,'rest ✗ not safe'));
   check(t===1?!!r.callout:!r.callout,`unsafe rest display ${t}`);
  }
  check(observed.length===20,'all twenty events still reach observers');
  play(event(21,'near death'));check(r.callout?.text==='near death','urgent warning survives');
  play(event(22,'rest ✗ no use'));check(r.callout?.text==='rest ✗ no use','different failure survives');
  play({k:'rule',t:s.turn+23,row:0,text:'rest',verb:{v:'rest'}});
  play(event(24,'rest ✗ not safe'));check(r.callout?.t===s.turn+24,'successful rest re-arms');
  r.callout=null;play(event(25,'rest ✗ not safe'));check(!r.callout,'repeat after re-arm suppressed');
  r.seek(s.turn+1);check(r.callout?.t===s.turn+1,'seek to first warning restores it');
  r.seek(s.turn+20);check(!r.callout,'seek through repeats keeps them quiet');
  r.seek(s.turn+24);check(r.callout?.t===s.turn+24,'seek reconstructs successful rest reset');
  r.load({...s,depth:s.depth+1});play(event(1,'rest ✗ not safe'));check(!!r.callout,'new floor resets suppression');
  return checks;
 });if(errors.length)throw Error(errors.join('\n'));console.log(checks.length,'rest callout/observer/seek/reset checks PASS');
}finally{await b.close();}
