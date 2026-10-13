import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from '../../web/node_modules/typescript/lib/typescript.js';
import { launchBrowser } from '../../tools/browser.mjs';
const source=(path)=>ts.transpileModule(readFileSync(path,'utf8').replaceAll('import.meta.env.BASE_URL','"/"'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const code=[source('scratchpad/cut198/town-terrain-before.ts'),source('web/src/render/town-terrain.ts')];
const browser=await launchBrowser();
try{
 const page=await browser.newPage({viewport:{width:400,height:900},reducedMotion:'reduce'});
 await page.goto('http://localhost:5199/?dev=1&fresh=1&runs=0&seed=198');
 await page.waitForFunction(()=>window.__idlever?.booted);
 const result=await page.evaluate(async(code)=>{
  const load=async(src,tag)=>import('data:text/javascript;base64,'+btoa(src+'\n//'+tag));
  const modules=await Promise.all(code.map((src,i)=>load(src,'painted'+i)));
  for(let i=0;i<100&&modules.some(m=>m.terrainMaterialVersion()===0);i++)await new Promise(r=>setTimeout(r,20));
  if(modules.some(m=>m.terrainMaterialVersion()!==1))throw Error('Materials not settled');
  const hash=async(bytes)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const hashN=(...xs)=>{let h=2166136261;for(const x of xs){h^=x|0;h=Math.imul(h,16777619);h^=h>>>13;}return h>>>0;};
  const {PLOTS}=await import('/src/render/town.ts');
  const base={width:896,height:640,fire:PLOTS.fire,plaza:false,aprons:[],shadows:[{x:240,y:290},{x:630,y:360},{x:310,y:470}],hillFoot:x=>10+(Math.abs(x-28)>4&&hashN(x>>1,0,7)%3===0?1:0),trails:[{a:{x:448,y:200},b:PLOTS.fire,r:12},{a:PLOTS.fire,b:PLOTS.house,r:9}]};
  const cases=[base,{...base,aprons:[PLOTS.house]},{...base,plaza:true,aprons:['house','blacksmith','storehouse','kennel','bank'].map(id=>PLOTS[id])}];
  const output=[];
  const check=async(mods,mode)=>{
   for(let i=0;i<cases.length;i++){
    const canvases=mods.map(m=>m.paintTownTerrain(cases[i]));
    const bytes=canvases.map(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data);
    let different=0;for(let n=0;n<bytes[0].length;n++)if(bytes[0][n]!==bytes[1][n])different++;
    const roots=mods.map((m,j)=>m.townGrassRoots(canvases[j]));
    output.push({mode,case:i,width:896,height:640,bytes:bytes[0].length,different,rootCount:roots[0].length,rootsEqual:JSON.stringify(roots[0])===JSON.stringify(roots[1]),beforeHash:await hash(bytes[0]),afterHash:await hash(bytes[1]),rootsHash:await hash(new TextEncoder().encode(JSON.stringify(roots[0])))});
    canvases.forEach(c=>{c.width=1;c.height=1;});
   }
  };
  await check(modules,'painted');
  const decode=Image.prototype.decode;Image.prototype.decode=function(){return Promise.reject(new Error('controlled missing material'));};
  let fallback;
  try{fallback=await Promise.all(code.map((src,i)=>load(src,'fallback'+i)));}finally{Image.prototype.decode=decode;}
  for(let i=0;i<100&&fallback.some(m=>m.terrainMaterialVersion()===0);i++)await new Promise(r=>setTimeout(r,20));
  await check(fallback,'fallback');
  return output;
 },code);
 assert.equal(result.length,6);for(const r of result){assert.equal(r.different,0);assert.equal(r.rootsEqual,true);assert.equal(r.beforeHash,r.afterHash);}
 writeFileSync('scratchpad/cut198/parity.json',JSON.stringify(result,null,2));
 console.log('6/6 exact RGBA byte and grass-root parity: empty/house/plaza, painted and missing-art fallback');
}finally{await browser.close();}
