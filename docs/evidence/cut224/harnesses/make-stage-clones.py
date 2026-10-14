from pathlib import Path
import shutil,json,hashlib
jobs=[('baseline','/tmp/idlever-cut224-baseline',5548),('dense','/tmp/idlever-cut224-medieval',5549),('sparse','/tmp/idlever-cut224-sparse',5550)]
manifest=[]
for label,src,port in jobs:
 dst=Path('/tmp/idlever-cut224-stage-'+label)
 shutil.copytree(src,dst,symlinks=True,dirs_exist_ok=True)
 p=dst/'web/src/render/town-terrain.ts';s=p.read_text()
 s='''type TerrainStage = { name: string; ms: number };
const terrainStages = new WeakMap<HTMLCanvasElement, TerrainStage[]>();
export const townTerrainStages = (c: HTMLCanvasElement | null): readonly TerrainStage[] => c ? terrainStages.get(c) ?? [] : [];
'''+s
 s=s.replace('export function paintTownTerrain(p: TerrainPlan): HTMLCanvasElement {','''export function paintTownTerrain(p: TerrainPlan): HTMLCanvasElement {
  const stages: TerrainStage[] = [];
  let stageAt = performance.now();
  const mark = (name: string): void => { const now = performance.now(); stages.push({ name, ms: now-stageAt }); stageAt=now; };
''')
 s=s.replace('  const wear = new Float32Array', '  mark("canvas/image setup");\n  const wear = new Float32Array')
 s=s.replace('  for (const trail of p.trails)', '  mark("wear/axes/stream prep");\n  for (const trail of p.trails)')
 s=s.replace('  // Scalar channels retain', '  mark("trail/apron stamps");\n  // Scalar channels retain')
 token='  for (let y = 0; y < p.height; y++)\n    for (let x = 0; x < p.width; x++) {\n      const i = y * p.width + x;'
 assert token in s,label
 s=s.replace(token,'  mark("material indices/hash prep");\n'+token)
 if label=='sparse':
  s=s.replace('  if (p.depth)\n    applyTerrainDepth', '  mark("dense pigment");\n  if (p.depth)\n    applyTerrainDepth')
  s=s.replace('  g.putImageData(image, 0, 0);', '  mark("sparse correction");\n  g.putImageData(image, 0, 0);')
 else:s=s.replace('  g.putImageData(image, 0, 0);', '  mark("dense pigment including cues" );\n  g.putImageData(image, 0, 0);')
 s=s.replace('  let roots: GrassRoot[]', '  mark("canvas upload");\n  let roots: GrassRoot[]')
 s=s.replace('  const prop = (', '  mark("grass root generation");\n  const prop = (')
 s=s.replace('  grassRoots.set(c, roots);', '  mark("dressing/contact/root filtering");\n  terrainStages.set(c, stages);\n  grassRoots.set(c, roots);')
 p.write_text(s)
 p=dst/'web/src/render/town.ts';s=p.read_text().replace('paintTownTerrain, terrainMaterialVersion, townGrassRoots', 'paintTownTerrain, terrainMaterialVersion, townGrassRoots, townTerrainStages')
 s=s.replace('        terrainPaintMs,', '        terrainPaintMs,\n        terrainStageProfile: townTerrainStages(F.terrain),\n        serviceArtProfile,')
 s=s.replace('export class TownAtlas {', 'const serviceArtProfile: { id: string; generated: boolean; ms: number }[] = [];\nexport class TownAtlas {')
 old='    else if (!paintHomeService(this.ctx, id, x, y, w, h, townBaseDepth()))\n      drawPrimitive(this.ctx, id, x, y, w, h);'
 if old not in s:
  old='    else if (!paintHomeService(this.ctx, id, x, y, w, h)) drawPrimitive(this.ctx, id, x, y, w, h);'
 assert old in s,label
 call='paintHomeService(this.ctx, id, x, y, w, h'+(', townBaseDepth()' if label!='baseline' else '')+')'
 s=s.replace(old,'''    else {
      const start = performance.now();
      const generated = '''+call+''';
      const ms = performance.now()-start;
      if (id.startsWith("town_service_")) serviceArtProfile.push({id,generated,ms});
      if (!generated) drawPrimitive(this.ctx,id,x,y,w,h);
    }''')
 p.write_text(s)
 files=[]
 for name in ['town.ts','town-terrain.ts','town-volume.ts','home-service-art.ts']:
  q=dst/'web/src/render'/name;b=q.read_bytes();files.append({'path':str(q),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 manifest.append({'leg':label,'port':port,'files':files})
Path('docs/evidence/cut224/diagnostic-stage-source-manifest.json').write_text(json.dumps({'scope':'Diagnostic-only timestamp marks, whole existing outer paint timer unchanged; no gate acceptance or production source edits','legs':manifest},indent=2)+'\n')
