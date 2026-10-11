import {spawn} from 'node:child_process';import net from 'node:net';import{readFileSync,writeFileSync}from'node:fs';import{launchBrowser}from'../../tools/browser.mjs';
const save=readFileSync(new URL('camps/AWAY-s1-d3-c0.json',import.meta.url),'utf8');
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port',String(port),'--strictPort','--config','tests/vite.test.config.ts'],{cwd:new URL('../../web/',import.meta.url),stdio:'ignore'});let browser;
try{const url=`http://localhost:${port}`;for(let i=0;i<120;i++){if(await fetch(url).then(r=>r.ok,()=>false))break;await new Promise(r=>setTimeout(r,250));}
 browser=await launchBrowser();const page=await browser.newPage({viewport:{width:400,height:900},reducedMotion:'reduce'});
 await page.goto(`${url}?dev=1&fresh=1&seed=162`);await page.waitForFunction(()=>window.__riddle?.booted);
 await page.evaluate(async save=>{const a=window.__riddle;if(a.kind!=='wasm')throw Error('real WASM required');if(!await a.importSave(JSON.stringify({v:2,engine:save,last_seen:Date.now(),runs:0,loadout:[]})))throw Error('import refused');},save);
 await page.waitForFunction(()=>window.__riddle.screen==='camp');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:new URL('earned-camp-400.png',import.meta.url).pathname});
 writeFileSync(new URL('camp-shot-scope.json',import.meta.url),JSON.stringify({source:'AWAY-s1-d3-c0.json',scope:'Actual earned source imported through public real-WASM UI. Headless screenshot only; no GPU performance, score or full-save parity claim.',text:await page.locator('body').innerText()},null,2));console.log('PASS: earned worker camp imported through public real-WASM UI; 400px screenshot');
}finally{await browser?.close();server.kill();}
