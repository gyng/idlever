// Isolated artwork board, not a phone/gameplay capture or live registry proof.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { launchBrowser } from '../../../tools/browser.mjs';
const out=process.argv[2];assert(out&&!existsSync(out));mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const assets=["fighter_warden", "fighter_recovery", "fighter_boss_guard", "fighter_reaver", "fighter_crowd_breaker", "fighter_boss_breaker"].map(id=>{const path=`web/public/ui/skills/${id}-v1.webp`;const bytes=readFileSync(path);return{id,path,sha256:sha(bytes),src:`data:image/webp;base64,${bytes.toString('base64')}`};});
const browser=await launchBrowser();
try{
 const p=await browser.newPage({viewport:{width:900,height:925},deviceScaleFactor:1});
 await p.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#0d0c14;color:#eadfc5;font:16px Georgia}h1{font-size:20px}.row{height:135px;display:flex;align-items:center;gap:36px}.name{width:190px}.cell{display:flex;flex-direction:column;align-items:center;gap:8px}img{outline:1px solid #b89448}small{font:12px monospace;color:#a4bcd6}</style><h1>Early-path painted candidates · image pixels at DPR 1</h1><main></main>');
 await p.evaluate(assets=>{for(const a of assets){const row=document.createElement('div');row.className='row';const title=document.createElement('b');title.className='name';title.textContent=a.id.replaceAll('_',' ');row.append(title);for(const size of[24,32,48,96]){const cell=document.createElement('div');cell.className='cell';const img=document.createElement('img');img.src=a.src;img.width=img.height=size;img.dataset.expected=String(size);img.alt=a.id;const label=document.createElement('small');label.textContent=`${size}px`;cell.append(img,label);row.append(cell);}document.querySelector('main').append(row);}},assets);
 await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth===192));
 const geometry=await p.locator('img').evaluateAll(imgs=>imgs.map(i=>({id:i.alt,width:i.clientWidth,height:i.clientHeight,expected:Number(i.dataset.expected)})));for(const g of geometry){assert.equal(g.width,g.expected);assert.equal(g.height,g.expected);}assert.equal(geometry.length,24);
 const image=`${out}/actual-sizes.png`;await p.screenshot({path:image});
 for(const a of assets)assert.equal(sha(readFileSync(a.path)),a.sha256);
 writeFileSync(`${out}/results.json`,JSON.stringify({scope:'Six fighter early-path painted candidates, isolated image-size review only; no registry/gameplay/final-art acceptance',protocolSha256:sha(readFileSync(new URL(import.meta.url))),assets:assets.map(({src,...a})=>a),viewport:{width:900,height:925},captureKind:'artwork board',dpr:1,geometry,imageSha256:sha(readFileSync(image))},null,2)+'\n');
}finally{await browser.close();}
