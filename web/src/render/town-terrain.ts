// Cosmetic cached landscape: approved painted materials, shared by GL/Canvas2D.
type Point = { x: number; y: number };
type Trail = { a: Point; b: Point; r: number };
export type TerrainPlan = {
  width: number; height: number; trails: Trail[]; fire: Point; plaza: boolean;
  aprons: Point[]; shadows: Point[]; hillFoot: (x: number) => number;
};
export type GrassRoot = Point & { h: number; phase: number };
const grassRoots = new WeakMap<HTMLCanvasElement, GrassRoot[]>();
export const townGrassRoots = (terrain: HTMLCanvasElement): readonly GrassRoot[] => grassRoots.get(terrain) ?? [];
const hash = (x: number, y: number, salt = 0): number => {
  let h = Math.imul(x + salt * 97, 374761393) ^ Math.imul(y + salt * 53, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0;
};

type Material = { data: Uint8ClampedArray; width: number; height: number };
const materials: Record<string, Material> = {}, props: Record<string, HTMLImageElement> = {};
let version = 0;
const names = ['grass_0','grass_3','dirt_0','plaza_0','water'];
// Publish once after all independent assets settle. Missing art never blocks town.
void Promise.allSettled([...names, 'bank','boulders','undergrowth','pines'].map(async name => {
  const im = new Image(); im.src = `${import.meta.env.BASE_URL}art/landscape/${name}.png`; await im.decode();
  if (!names.includes(name)) { props[name] = im; return; }
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d')!; g.drawImage(im,0,0);
  materials[name] = { data: g.getImageData(0,0,c.width,c.height).data, width:c.width,height:c.height };
})).then(() => { version++; });
export const terrainMaterialVersion = (): number => version;
const sample = (name: string,x: number,y: number,fallback: number[]): number[] => {
  const m=materials[name]; if (!m) return fallback;
  // Mirrored source paintings join without a bright hard material seam.
  const mirror=(v:number,n:number):number=>{ const a=((v%(n*2))+n*2)%(n*2);return a<n?a:2*n-1-a; };
  const i=(mirror(y,m.height)*m.width+mirror(x,m.width))*4;
  return [m.data[i]!,m.data[i+1]!,m.data[i+2]!];
};
export function paintTownTerrain(p: TerrainPlan): HTMLCanvasElement {
  const c=document.createElement('canvas');c.width=p.width;c.height=p.height;
  const g=c.getContext('2d')!;g.imageSmoothingEnabled=false;
  const image=g.createImageData(p.width,p.height),rgba=image.data;
  const wear = new Float32Array(p.width * p.height); wear.fill(-1000);
  const stamp = (a: Point, b: Point, radius: number): void => {
    const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius - 5));
    const right = Math.min(p.width - 1, Math.ceil(Math.max(a.x, b.x) + radius + 5));
    const top = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius - 5));
    const bottom = Math.min(p.height - 1, Math.ceil(Math.max(a.y, b.y) + radius + 5));
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len)) : 0;
      const d = radius - Math.hypot(x - a.x - t * dx, y - a.y - t * dy), i = y * p.width + x;
      if (d > wear[i]!) wear[i] = d;
    }
  };
  for (const trail of p.trails) stamp(trail.a, trail.b, trail.r);
  stamp(p.fire, p.fire, p.plaza ? 34 : 25);
  for (const a of p.aprons) stamp({ x: a.x - 19, y: a.y - 2 }, { x: a.x + 19, y: a.y - 2 }, 9);

  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
    const i=y*p.width+x;
    const a=sample('grass_0',x,y,[35,45,38]);
    const b=sample('grass_3',x+43,y+61,[32,43,38]);
    const wash=.5+.25*Math.sin(x*.021+y*.008)+.2*Math.sin(y*.029-x*.007);
    let rgb=a.map((v,j)=>v*(1-wash)+b[j]!*wash);
    const foot=p.hillFoot(x/16)*16+Math.sin(x*.039)*2;
    if(y<foot){
      // Same painted pigment, cooled into a weathered mossy hillside. Rock
      // formations are authored cutouts below, rather than flat polygon cells.
      const v=(rgb[0]!*.21+rgb[1]!*.72+rgb[2]!*.07)*(.45+.36*Math.min(1,y/160));
      rgb=[v*.82,v*.98,v*1.08];
    }else{
      const edge=(hash(x>>2,y>>2,7)%7-3)*.35;
      const d=wear[i]!+edge;
      const t=Math.max(0,Math.min(1,(d+2.4)/4.2));
      if(t){
        const soil=sample(p.plaza&&Math.hypot(x-p.fire.x,y-p.fire.y)<28?'plaza_0':'dirt_0',x+17,y+29,[70,76,76]);
        rgb=rgb.map((v,j)=>v*(1-t)+soil[j]!*t);
      }
      const stream=151+Math.sin(y*.014)*8+(hash(0,y>>3,53)%5-2);
      const bank=Math.abs(x-stream);
      if(bank<8)rgb=sample('water',x+33,y+17,[27,43,49]).map(v=>v*.72);
      else if(bank<12)rgb=rgb.map(v=>v*.75);
    }
    const j=i*4;rgba[j]=rgb[0]!;rgba[j+1]=rgb[1]!;rgba[j+2]=rgb[2]!;rgba[j+3]=255;
  }
  g.putImageData(image,0,0);
  // Rooted tufts only on unworn meadow, never paths, aprons, stream or cliff.
  // Cache placement with the painted ground; wind changes only their tiny tips.
  let roots: GrassRoot[] = [];
  for (let gy = 18; gy < p.height - 6; gy += 18) for (let gx = 8; gx < p.width - 6; gx += 18) {
    const n = hash(gx, gy, 83), x = gx + n % 7 - 3, y = gy + (n >>> 8) % 7 - 3;
    const stream = 151 + Math.sin(y * .014) * 8 + (hash(0, y >> 3, 53) % 5 - 2);
    if (y < p.hillFoot(x / 16) * 16 + 8 || Math.abs(x - stream) < 16 || wear[y * p.width + x]! > -5) continue;
    roots.push({ x, y, h: 4 + n % 3, phase: (n % 997) / 997 * Math.PI * 2 });
  }
  const prop=(name:string,x:number,y:number,w:number,h:number,flip=false):void=>{
    roots = roots.filter(p => p.x < x-w/2-3 || p.x > x+w/2+3 || p.y < y-h-3 || p.y > y+5);
    const im=props[name];if(!im)return;
    g.save();g.translate(Math.round(x),Math.round(y));if(flip)g.scale(-1,1);
    g.drawImage(im,Math.round(-w/2),-h,w,h);g.restore();
  };
  // Landscape rises at the forest/hill margin, framing the painted cave. All
  // dressing is baked behind actors and safely off existing walking corridors.
  prop('bank',394,168,112,55);prop('bank',517,172,100,49,true);
  prop('pines',346,167,74,88);prop('pines',563,166,68,81,true);
  prop('boulders',387,223,36,28);prop('undergrowth',511,231,46,26,true);
  prop('undergrowth',392,289,40,23);prop('boulders',543,355,38,29,true);
  prop('undergrowth',354,359,51,29);prop('undergrowth',484,404,38,22,true);
  prop('pines',295,287,76,90);prop('pines',613,338,79,94,true);
  // Ground contact beneath the established forest; no animated decoration.
  g.fillStyle='rgba(10,18,20,.2)';
  for(const t of p.shadows){g.fillRect(Math.round(t.x-5),Math.round(t.y),13,3);}
  grassRoots.set(c, roots);
  return c;
}
