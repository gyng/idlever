import ts from '../../../web/node_modules/typescript/lib/typescript.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const js=ts.transpileModule(readFileSync('web/src/render/landmarks.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {planLandmarks}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const replay=JSON.parse(gunzipSync(readFileSync('docs/evidence/handoff-content/run131.replay.json.gz')));
const records=[];
for(const {snapshot:s,events} of replay.floors)for(const p of planLandmarks(s.w,s.h,s.tiles,s.biome)){
 let hx=s.hero.x,hy=s.hero.y;
 for(const e of events){
  if(e.k==='move'&&e.id===s.hero.id){hx=e.x;hy=e.y;}
  if(e.k!=='overlay'&&e.k!=='telegraph')continue;
  records.push({biome:s.biome,depth:s.depth,anchor:{x:p.x,y:p.y},hero:{x:hx,y:hy},event:e,distance:Math.hypot(hx-p.x,hy-p.y),eventDistance:e.k==='overlay'?Math.hypot(e.x-p.x,e.y-p.y):null});
 }
}
const best=[];
for(const biome of ['fens','crypt','foundry'])for(const kind of ['overlay','telegraph']){
const a=records.filter(r=>r.biome===biome&&r.event.k===kind).sort((a,b)=>(Math.max(a.distance,a.eventDistance??0)-Math.max(b.distance,b.eventDistance??0))||a.event.t-b.event.t);
best.push({biome,kind,count:a.length,closest:a[0]??null});
}
writeFileSync('docs/evidence/cut245/nearby-events.json',JSON.stringify({scope:'Actual recorded event/hero-position proximity to every eligible actual floor landmark; no simulated event or visibility claim',best},null,2)+'\n');
console.log(JSON.stringify(best));
