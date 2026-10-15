window.__cut240Inspect = (before) => {
  const modes = ["before", "after", "unlit", "ambient"];
  const captures = modes.map((mode) => {
    const canvas = document.createElement("canvas");
    const frame = mode === "unlit" ? { ...F, amb: [1, 1, 1], lights: [] } : mode === "ambient" ? { ...F, lights: [] } : F;
    (mode === "before" ? before : drawTown2D)(canvas, frame, atlas.canvas);
    return { canvas, pixels: canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data };
  });
  const [old, next, source, ambient] = captures.map((x) => x.pixels);
  let alphaChanges = 0, maxSourceExcess = 0, beforeOverexposed = 0, afterOverexposed = 0, beforeClipped = 0, afterClipped = 0, outsideChanged = 0;
  for (let i = 0; i < next.length; i += 4) {
    if (old[i + 3] !== next[i + 3]) alphaChanges++;
    const excess = Math.max(...[0, 1, 2].map((c) => next[i + c] - source[i + c]));
    maxSourceExcess = Math.max(maxSourceExcess, excess);
    const hot = (a) => a[i] >= 220 && a[i + 1] >= 200 && a[i + 2] >= 150;
    const brighter = (a) => [0, 1, 2].some((c) => a[i + c] > source[i + c] + 1);
    if (hot(old) && brighter(old)) beforeOverexposed++;
    if (hot(next) && brighter(next)) afterOverexposed++;
    if ([0, 1, 2].some((c) => old[i + c] >= 250 && old[i + c] > source[i + c] + 1)) beforeClipped++;
    if ([0, 1, 2].some((c) => next[i + c] >= 250 && next[i + c] > source[i + c] + 1)) afterClipped++;
    if ([0, 1, 2].some((c) => next[i + c] !== ambient[i + c])) {
      const px = i / 4 % F.W, py = Math.floor(i / 4 / F.W);
      const x = F.x0 + (px + .5) / F.k, y = F.y0 + (py + .5) / F.k;
      if (!F.lights.some((l) => Math.hypot(x - l.x, y - l.y) <= l.r + 1 / F.k)) outsideChanged++;
    }
  }
  return { frame: { id: frames, w: F.w, h: F.h, W: F.W, H: F.H, x0: F.x0, y0: F.y0, k: F.k, amb: F.amb, lights: F.lights, night: F.night }, images: Object.fromEntries(modes.map((m, i) => [m, captures[i].canvas.toDataURL()])), pixels: { alphaChanges, maxSourceExcess, beforeOverexposed, afterOverexposed, beforeClipped, afterClipped, outsideChanged } };
};
window.__cut240Frame = () => ({ runtime:{t,hero:hero?{id:hero.id,from:hero.from,to:hero.to,at:walkerAt(hero,t)}:null},night:F.night, view:[F.x0,F.y0,F.w,F.h], lights:F.lights.map(l=>({...l,c:[...l.c]})), actors:F.quads.slice(0,F.n).filter(q=>q.actorId).map(q=>({id:q.actorId,x:q.x,y:q.y,w:q.w,h:q.h,flip:q.flip,fade:q.fade})) });
window.__cut240Material = (before) => {
 const terrain=document.createElement('canvas');terrain.width=32;terrain.height=32;
 const sprite=F.quads.slice(0,F.n).find(q=>q.relief===4);if(!sprite)throw Error('Actual Forge source required');
 const pixels=atlas.canvas.getContext('2d').getImageData(sprite.s.x,sprite.s.y,sprite.s.w,sprite.s.h).data;
 const colours=[];for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>240){const rgb=Array.from(pixels.slice(i,i+3));const lum=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114;if(lum>15&&lum<220)colours.push({rgb,lum});}
 colours.sort((a,b)=>a.lum-b.lum);const selected=[colours[Math.floor(colours.length*.25)].rgb,colours[Math.floor(colours.length*.75)].rgb];
 const c=terrain.getContext('2d');for(let y=0;y<32;y++)for(let x=0;x<32;x++){c.fillStyle=`rgb(${selected[((x>>1)+(y>>1))%2].join(',')})`;c.fillRect(x,y,1,1);}
 const frame={W:32,H:32,w:32,h:32,k:1,x0:0,y0:0,amb:[.27,.34,.58],night:1,lights:[{x:16,y:16,r:512,c:[.85,.544,.255]}],terrain,quads:[],n:0};
 const samples=['before','after','source'].map(mode=>{const out=document.createElement('canvas');(mode==='before'?before:drawTown2D)(out,mode==='source'?{...frame,amb:[1,1,1],lights:[]}:frame,atlas.canvas);return{pixels:out.getContext('2d').getImageData(0,0,32,32).data,image:out.toDataURL()};});
 const lum=(a,i)=>a[i]*.299+a[i+1]*.587+a[i+2]*.114;
 const ranges=samples.map(s=>{const values=[];for(let y=14;y<18;y++)for(let x=14;x<18;x++)values.push(lum(s.pixels,(y*32+x)*4));return Math.max(...values)-Math.min(...values);});
 const orangeCanvas=document.createElement('canvas');orangeCanvas.width=32;orangeCanvas.height=32;orangeCanvas.getContext('2d').fillStyle='#d8a866';orangeCanvas.getContext('2d').fillRect(0,0,32,32);const orangeOut=document.createElement('canvas');drawTown2D(orangeOut,{...frame,terrain:orangeCanvas},atlas.canvas);const color=Array.from(orangeOut.getContext('2d').getImageData(16,16,1,1).data.slice(0,3));
 return{sourceSprite:{asset:sprite.asset,atlasRect:{x:sprite.s.x,y:sprite.s.y,w:sprite.s.w,h:sprite.s.h},colours:selected},rangeBefore:ranges[0],rangeAfter:ranges[1],rangeSource:ranges[2],retainedRatio:ranges[1]/ranges[2],orangeRgb:color,images:samples.map(s=>s.image)};
};
window.__cut240PanRightEdge = (edge) => { window.__cut240RightEdge=edge;layoutDirty=true;poke();start(); };
window.__cut240CameraFrame = () => ({frames,night:F.night,view:[F.x0,F.y0,F.w,F.h],lights:F.lights.map(l=>({...l,c:[...l.c]})),smith:F.quads.slice(0,F.n).filter(q=>q.asset==='town_smith').map(q=>({asset:q.asset,x:q.x,y:q.y,w:q.w,h:q.h,flip:q.flip,fade:q.fade}))});
