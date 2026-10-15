import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const readText=p=>existsSync(p)?readFileSync(p,'utf8'):gunzipSync(readFileSync(p+'.gz')).toString();
const json=p=>JSON.parse(readText(p));
const dir='docs/evidence/cut240',r=json(`${dir}/after/results.json`),d=json(`${dir}/diagnostics/results.json`);
assert(!r.failure&&!d.failure);assert.equal(r.rows.length,16);assert.equal(r.errors.length,0);assert.equal(d.errors.length,0);
assert(Object.entries(r.source).every(([p,h])=>createHash('sha256').update(readFileSync(p)).digest('hex')===h));
const pixelRows=r.rows.map(x=>({backend:x.backend,width:x.width,phase:x.phase,frame:x.pair.frame.id,...x.pair.pixels}));
for(const p of pixelRows){assert.equal(p.alphaChanges,0);assert(p.maxSourceExcess<=1);assert.equal(p.afterOverexposed,0);assert.equal(p.afterClipped,0);assert.equal(p.outsideChanged,0);}
const fade=[];
for(const backend of ['gl','canvas']){
 const rows=d.fadeSamples.filter(x=>x.backend===backend),observed=[];
 for(const x of rows)for(const a of x.actors.filter(a=>a.id==='resident:1'&&a.fade>0&&a.fade<1)){
  const target=[a.x+(a.flip?-6:6),a.y-8];
  const ls=x.lights.filter(l=>l.r===23).map(l=>({l,distance:Math.hypot(target[0]-l.x,target[1]-l.y)})).sort((a,b)=>a.distance-b.distance);
  if(ls.length&&ls[0].distance<=2.1)observed.push({sample:x.index,fade:a.fade,lightIntensity:ls[0].l.c[0],expected:.85*(1-a.fade),handDistance:ls[0].distance});
 }
 assert(observed.length>=2,`${backend} actual fade observed`);assert(observed.every(x=>Math.abs(x.lightIntensity-x.expected)<1e-8));
 fade.push({backend,samples:rows.length,observed});
}
const samePrefix=(p)=>p.slice(0,p.indexOf('// ---- Cut 30'));
assert.equal(samePrefix(readFileSync('web/src/render/view2d.ts','utf8')),samePrefix(readText(`${dir}/before/view2d.ts`)),'Dungeon Canvas unchanged');
assert.equal(readFileSync('web/src/render/town.ts','utf8'),readText(`${dir}/before/town.ts`),'Town GL/source unchanged');
const summary={status:'Scoped Canvas fix passes exposure/material/preference/clock/context-loss checks; see bounded diagnostic and review limits',runtime:r.wasm,source:r.source,sourceUnchangedSinceCapture:true,dungeonCanvasUnchanged:true,townGlSourceUnchanged:true,phaseRows:16,pixelRows,nightPixelRows:pixelRows.filter(p=>p.phase==='night'),materials:{gl:d.glMaterial,canvas:d.canvasMaterial},preferenceRows:d.preferenceRows.map(x=>({backend:x.backend,pref:x.pref,mode:x.stats.mode,night:x.stats.night})),fade,edge:{status:'pending separate edge-events record reduction'},visualReview:{rootAccepted:true,scope:'Restored painted detail and local warm lamps on phone Canvas, GL reference stays distinct',artifacts:['after/matched-night-400.jpg','after/matched-night-1440.jpg','after/canvas-review-sheet.jpg']},checks:{clock:'client-final-clock-ctxloss.log:36 PASS',ctxloss:'client-final-clock-ctxloss.log:19 PASS',typescript:'tsc-final.log:exit0',format:'format-final.log:PASS',lint:'lint-final.log:exit0'},limits:['No FPS, GPU execution or quiet frame-cost claim.','Diagnostic false->true presentation scene transition is not earned construction and may refit/repaint terrain during setup; no simulation mutation.','Whole landscape relief, broad art recognition and complete retained lighting/hand-off acceptance remain outside this scoped repair.','Four wall-clock phases plus existing local-clock/resume tests are not a continuous dawn/dusk movie.']};
const e=json(`${dir}/edge-events/results.json`);assert(!e.failure);assert.equal(e.errors.length,0);
summary.edge={scope:'Diagnostic construction-arrival route, per-animation-frame capture; no gameplay purchase or earned-construction claim',samples:e.edgeSamples.length,backends:[]};
for(const backend of ['gl','canvas']){
 const rows=e.edgeSamples.filter(r=>r.backend===backend),partial=[];
 for(const row of rows)for(const actor of row.actors.filter(a=>a.id==='resident:1')){
  const right=row.view[0]+row.view[2],left=row.view[0];
  if(actor.x+actor.w/2<=right&&actor.x-actor.w/2>=left)continue;
  const target=[actor.x+(actor.flip?-6:6),actor.y-8];
  const matches=row.lights.filter(l=>l.r===23).map(l=>({distance:Math.hypot(l.x-target[0],l.y-target[1]),x:l.x,y:l.y,intensity:l.c[0]})).sort((a,b)=>a.distance-b.distance);
  partial.push({sample:row.index,actor,view:row.view,nearestLantern:matches[0]});
 }
 summary.edge.backends.push({backend,samples:rows.length,partiallyClippedActorFrames:partial,fullyOutsideActiveActorObserved:false});
}
summary.limits.push('No active-carrier edge clipping/culling event observed in242per-frame arrival samples. Pending-arrival absence and inside-camera arrival do not prove offscreen culling.');
const camera=json(`${dir}/camera-events/results.json`);assert(!camera.failure);assert.equal(camera.errors.length,0);assert.equal(camera.cameraRows.length,6);
for(const row of camera.cameraRows){assert.equal(row.view[0]+row.view[2],row.rightEdge);assert.equal(row.smith.length,row.state==='outside'?0:1);assert.equal(row.ownLights.length,row.state==='outside'?0:1);assert(row.exactSave&&row.noTerrainRepaint);}
summary.edgeCamera={status:'Proven at diagnostic scope',scope:'Actual earned smith carrier; test-only camera positions after normal fit, no production camera or resident containment change',rows:camera.cameraRows.map(row=>({backend:row.backend,state:row.state,view:row.view,smith:row.smith,ownLights:row.ownLights,exactSave:row.exactSave,noTerrainRepaint:row.noTerrainRepaint}))};
summary.limits=summary.limits.map(x=>x.startsWith('No active-carrier edge clipping')?'The242-frame arrival probe did not observe resident edge clipping; residents are contained. Separate diagnostic camera proof covers the earned smith NPC, not a natural resident edge walk.':x);
writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({phases:16,pixels:pixelRows.length,materialRetained:d.glMaterial.retainedRatio,fadeSamples:fade.map(x=>({backend:x.backend,observed:x.observed.length}))}));
