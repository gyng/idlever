import { launchBrowser } from '../../tools/browser.mjs';
import { writeFileSync } from 'node:fs';
const url=process.env.IDLEVER_MEASURE_URL??'http://localhost:5219/';
const browser=await launchBrowser({gpu:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.frameSamples=[];let seen=0,last=0;const read=()=>{const s=window.__town?.stats();if(s&&s.frames!==seen){const now=performance.now();window.frameSamples.push({...s,observedAt:now,interval:last?now-last:0});seen=s.frames;last=now;}requestAnimationFrame(read);};requestAnimationFrame(read);});
 await page.goto(`${url}?dev=1&fresh=1&runs=0&juice=1&effects=full&seed=198`);
 await page.waitForFunction(()=>window.__idlever?.booted&&window.__town?.stats().frames>0);
 await page.evaluate(()=>{window.__idlever.runnerOn=false;window.__town.setHour(12);});
 const renderer=await page.evaluate(()=>{const c=document.querySelector('.town-gl'),gl=c.getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 await page.waitForFunction(()=>window.__town.stats().frames>=150);
 await page.mouse.move(1,1);
 const start=await page.evaluate(()=>({index:window.frameSamples.length,stats:window.__town.stats()}));
 await page.waitForFunction((start)=>window.frameSamples.length>=start.index+150,start);
 const before=await page.evaluate(()=>({index:window.frameSamples.length,stats:window.__town.stats()}));
 await page.locator('.town-tag[data-next="house"]').click();
 await page.waitForFunction(()=>window.__idlever.lineage.town.home&&window.__town.stats().buildEvents===1);
 await page.mouse.move(1,1);
 await page.waitForFunction(()=>window.__town.stats().activeBuilds.length===0&&window.__town.stats().buildDust===0);
 const end=await page.evaluate(()=>({index:window.frameSamples.length,stats:window.__town.stats()}));
 await page.mouse.move(1,1);
 await page.waitForFunction((end)=>window.frameSamples.length>=end.index+150,end);
 const result=await page.evaluate(([start,before,end,renderer])=>({kind:window.__idlever.kind,renderer,errors:[],start,before,end,cold:window.frameSamples.slice(0,start.index),baseline:window.frameSamples.slice(start.index,before.index),construction:window.frameSamples.slice(before.index,end.index),settled:window.frameSamples.slice(end.index)}),[start,before,end,renderer]);
 result.errors=errors;
 writeFileSync(process.env.IDLEVER_MEASURE_OUT??'scratchpad/cut198/baseline.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({kind:result.kind,renderer,counts:[result.cold.length,result.baseline.length,result.construction.length,result.settled.length],errors}));
}finally{await browser.close();}
