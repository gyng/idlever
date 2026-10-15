// Visual-only current-runtime reconstruction review; no game progression/performance claims.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import { launchGpu } from "../../../tools/browser.mjs";
const primitive=process.argv.includes("--primitive");
const out=resolve(primitive?"docs/evidence/cut242/fallback-review":"docs/evidence/cut242/replay-after");
const hash=(b)=>createHash("sha256").update(b).digest("hex");
const replay=JSON.parse(gunzipSync(readFileSync("docs/evidence/cut242/run131.replay.json.gz")));
const cases=[
  ["fens-gas",10,e=>e.k==="overlay"&&e.ov==="gas"],
  ["fens-water-pack",13,e=>e.k==="attack"&&e.src===125],
  ["crypt-drain",14,e=>e.k==="max_hp"&&e.cause==="drain"],
  ["crypt-summons",17,e=>e.k==="spawn"&&e.e?.kind==="spectral_blade"],
  ["foundry-reflect",21,e=>e.k==="attack"&&e.verb==="reflect"],
  ["foundry-support",20,e=>e.k==="callout"&&e.text==="armours"&&e.t===21960],
].map(([id,depth,predicate])=>{
 const floor=replay.floors.find(f=>f.snapshot.depth===depth);assert(floor);
 const event=floor.events.find(predicate);assert(event,`${id} actual event`);
 return {id,depth,floor,event,target:event.t+2};
});
const result={scope:"Current87de replay reconstruction from existing earned capsule131; historical tick mismatch retained; no new choices or progression, no performance claim",diagnosticAtlasFailure:primitive,source:{},servedModules:[],rows:[],errors:[]};
const onlyArg=process.argv.find(a=>a.startsWith("--cases="));
const only=onlyArg?.slice(8).split(",");
if(only){const previous=JSON.parse(readFileSync(`${out}/capture.json`));result.rows=previous.rows.filter(r=>!only.includes(r.id));result.retainedPriorCaptureRows=result.rows.length;}
for(const path of ["web/src/render/index.ts","web/src/render/view2d.ts","web/src/render/atlas.ts","web/src/render/fallback.ts","web/src/render/state.ts","web/public/art/atlas.json","web/public/art/atlas.png"])
 result.source[path]=hash(readFileSync(path));
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>r(p));});});
const log=createWriteStream(`${out}/capture-vite.log`);await new Promise(r=>log.once("open",r));
const vite=spawn(process.execPath,["node_modules/vite/bin/vite.js","--port",String(port),"--strictPort","--config","tests/vite.test.config.ts"],{cwd:resolve("web"),stdio:["ignore",log,log]});
let browser;
try{
 const url=`http://localhost:${port}/`;
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await launchGpu();const page=await browser.newPage();
 page.on("pageerror",e=>result.errors.push(String(e)));
 if(primitive)await page.route("**/art/atlas.json",r=>r.fulfill({status:404,body:"Cut242 diagnostic: unavailable atlas"}));
 await page.route(url,r=>r.fulfill({contentType:"text/html",body:'<!doctype html><style>html,body{margin:0;background:#151311}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>'}));
 const pending=[];page.on("response",r=>{if(r.url().includes("/src/render/"))pending.push(r.body().then(b=>result.servedModules.push({url:new URL(r.url()).pathname,sha256:hash(b)})).catch(()=>{}));});
 for(const width of (primitive?[400]:[400,1440])){
  await page.setViewportSize({width,height:width===400?640:800});
  await page.goto(url);
  await page.evaluate(async()=>{
    const {Atlas}=await import("/src/render/atlas.ts");
    const {QuadLayer}=await import("/src/render/layers.ts");
    window.propSlots=new Map();window.propLayers=new Set();
    const lookup=Atlas.prototype.envTile;
    Atlas.prototype.envTile=function(b,n){const slot=lookup.call(this,b,n);if(slot&&["fens","crypt","foundry"].includes(b)&&["barrel","crate"].includes(n))window.propSlots.set([slot.u0,slot.v0,slot.u1,slot.v1].join(","),`${b}_env_${n}`);return slot;};
    const begin=QuadLayer.prototype.begin,push=QuadLayer.prototype.push;
    QuadLayer.prototype.begin=function(){this.cut242Props=[];window.propLayers.add(this);if(!this.cut242Hook){this.cut242Hook=true;const previous=this.mesh.onBeforeRender;this.mesh.onBeforeRender=function(r,s,c,...args){previous?.call(this,r,s,c,...args);this.cut242Camera={left:c.position.x+c.left/c.zoom,right:c.position.x+c.right/c.zoom,bottom:c.position.y+c.bottom/c.zoom,top:c.position.y+c.top/c.zoom};};}return begin.call(this);};
    QuadLayer.prototype.push=function(...a){const key=window.propSlots.get(a.slice(5,9).join(","));if(key)this.cut242Props.push({key,x:a[0],y:a[1],w:a[3],h:a[4],dim:a[9]??1});return push.apply(this,a);};
    window.catalogueRenderer=await import("/src/render/index.ts");
  });
  result.gpu??=await page.evaluate(()=>{const gl=document.createElement("canvas").getContext("webgl2");const ext=gl.getExtension("WEBGL_debug_renderer_info");return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);});
  assert(/D3D12.*NVIDIA/.test(result.gpu),result.gpu);
  for(const backend of ["gl","canvas"]){
   for(const c of cases){
    if(primitive&&!["fens-gas","crypt-drain","foundry-reflect"].includes(c.id))continue;
    if(only&&!only.includes(c.id))continue;
    await page.evaluate(({c,backend,width})=>{
     window.catalogueViewer?.dispose();window.propLayers.clear();window.propSlots.clear();const old=document.querySelector("canvas");old?.remove();const canvas=document.createElement("canvas");document.body.append(canvas);
     const m=window.catalogueRenderer;
     const v=backend==="gl"?m.createViewer(canvas,{baseTexels:width===400?100:72}):m.createFallbackViewer(canvas);
     v.load(c.floor.snapshot);v.apply(c.floor.events.filter(e=>e.k!=="descend"&&e.k!=="exit"));v.seek(c.target);v.setSpeed(0);v.setFrame("fight");window.catalogueViewer=v;
    },{c,backend,width});
    await page.waitForTimeout(550);
    const stats=await page.evaluate(()=>{const s=window.catalogueViewer.stats();return Object.fromEntries(["tick","hero","camera","ents","drawn","device","frame","glLost","fade"].map(k=>[k,s[k]]));});
    const naturalProps=await page.evaluate(()=>[...window.propLayers].flatMap(l=>(l.cut242Props??[]).map(p=>{const c=l.mesh.cut242Camera;if(!c)return {...p,camera:null,visible:false};return {...p,camera:c,visible:p.x+p.w/2>c.left&&p.x-p.w/2<c.right&&p.y+p.h>c.bottom&&p.y<c.top,fullyVisible:p.x-p.w/2>=c.left&&p.x+p.w/2<=c.right&&p.y>=c.bottom&&p.y+p.h<=c.top};})));
    const file=`replay-${c.id}-${backend}-${width}.png`;await page.screenshot({path:`${out}/${file}`});
    result.rows.push({id:c.id,depth:c.depth,biome:c.floor.snapshot.biome,backend,width,target:c.target,actualEvent:c.event,file,stats,naturalProps});
   }
  }
 }
 await Promise.all(pending);
 assert.equal(result.errors.length,0,"No page errors in replay/fallback review");
 result.status="captured";result.limit="Still frames of current-runtime reconstruction; no claim of historical bit identity, counter superiority, natural choice adoption, full visibility coverage or measured cost.";
 writeFileSync(`${out}/capture.json`,JSON.stringify(result,null,2)+"\n");
 console.log(JSON.stringify({status:result.status,frames:result.rows.length,gpu:result.gpu}));
}catch(e){result.status="failed";result.error=String(e.stack??e);writeFileSync(`${out}/capture.json`,JSON.stringify(result,null,2)+"\n");throw e;}
finally{await browser?.close();vite.kill("SIGTERM");log.end();}
