import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {launchGpu} from '../../../tools/browser.mjs';
const root = new URL('../../../',import.meta.url);
const out = new URL('./',import.meta.url);
const fixture='docs/evidence/cut220/core/fixtures/earned-delving-queued.game.json.gz';
const input=readFileSync(new URL(fixture,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await launchGpu();
try {
 const page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:1});
 const errors=[],deliveries=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('idlever_wasm_bg.wasm'))deliveries.push(r.body().then(b=>({bytes:b.length,sha256:sha(b)})));});
 await page.goto('http://localhost:5522/?fresh=1&seed=1&runs=0');
 await page.waitForFunction(()=>window.__idlever?.booted);
 await page.evaluate(async raw=>{
  const a=window.__idlever;
  if(a.kind!=='wasm')throw Error('Real WASM required');
  a.runnerOn=false;
  a.lineage=await a.engine.load(raw);
  await a.refresh();
  a.watchMode='one';
  a.go({kind:'watch'});
 },gunzipSync(input).toString());
 await page.waitForSelector('main.watch canvas');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 await page.waitForTimeout(1200);
 const state=await page.evaluate(()=>({screen:window.__idlever.screen,text:window.__idlever.text(),live:window.__idlever.lineage.live,menus:document.querySelectorAll('.sheet-wrap:not([hidden])').length,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}}));
 if(state.screen!=='watch'||state.menus)throw Error(JSON.stringify(state));
 const path=new URL('gameplay-800x500.png',out).pathname;
 await page.screenshot({path});
 const wasm=await Promise.all(deliveries);
 writeFileSync(new URL('gameplay-800x500.json',out),JSON.stringify({capturedAt:new Date().toISOString(),fixture,inputSha256:sha(input),wasm,state,errors},null,2));
 console.log(JSON.stringify({path,state,wasm,errors}));
} finally {await browser.close();}
