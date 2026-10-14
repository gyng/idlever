import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {launchBrowser} from '../../tools/browser.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const out='docs/evidence/cut224/sparse-pixels';mkdirSync(out,{recursive:true});
const browser=await launchBrowser(),result={scope:'Exact deterministic painter pixels and rooted grass; synthetic cosmetic plans only, no timing/gameplay acceptance',rows:[],errors:[]};
try{
 for(const art of['packed','missing'])for(const size of[[896,640],[257,193]])for(const plaza of[false,true])for(const depth of[false,true]){
  const entries=[];
  for(const [leg,port]of[['original224',5546],['sparse224',5547]]){
   const p=await browser.newPage();p.on('pageerror',e=>result.errors.push(e.message));
   await p.route('**/cut221-pixel-proof.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   if(art==='missing')await p.route('**/art/landscape/*.png',r=>r.abort());
   await p.goto(`http://localhost:${port}/cut221-pixel-proof.html`);
   await p.evaluate(async()=>{window.__painter=await import('/src/render/town-terrain.ts');});
   await p.waitForFunction(()=>window.__painter.terrainMaterialVersion()===1);
   const entry=await p.evaluate(({size,plaza,depth})=>{
    const m=window.__painter;
    const c=m.paintTownTerrain({width:size[0],height:size[1],plaza,depth,fire:{x:224,y:250},trails:[{a:{x:20,y:120},b:{x:600,y:420},r:12},{a:{x:224,y:250},b:{x:350,y:160},r:8}],aprons:[{x:224,y:235},{x:370,y:300}],shadows:[{x:43,y:113},{x:580,y:290}],hillFoot:x=>7+Math.sin(x*.15)*2});
    const rgba=Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
    return{rgba,roots:m.townGrassRoots(c)};
   },{size,plaza,depth});
   const bytes=Buffer.from(entry.rgba);entries.push({leg,pixels:hash(bytes),bytes:bytes.length,roots:hash(JSON.stringify(entry.roots))});await p.close();
  }
  result.rows.push({art,size,plaza,depth,entries});writeFileSync(`${out}/progress.json`,JSON.stringify(result,null,2));assert.equal(entries[0].pixels,entries[1].pixels);assert.equal(entries[0].roots,entries[1].roots);
 }
 assert.deepEqual(result.errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({pairs:result.rows.length,errors:result.errors}));
}finally{await browser.close();}
