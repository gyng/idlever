// Cosmetic, fixed world terrain. Painted once per construction state, shared by
// the GL and context-loss views. No atlas, assets, timers or simulation inputs.
type Point = { x: number; y: number };
type Trail = { a: Point; b: Point; r: number };
export type TerrainPlan = {
  width: number; height: number; trails: Trail[]; fire: Point; plaza: boolean;
  aprons: Point[]; shadows: Point[]; hillFoot: (x: number) => number;
};
const hash = (x: number, y: number, salt = 0): number => {
  let h = Math.imul(x + salt * 97, 374761393) ^ Math.imul(y + salt * 53, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0;
};
const GRASS = [[35, 53, 37], [40, 59, 40], [46, 65, 44], [51, 70, 47], [56, 74, 50]];
const SOIL = [[83, 68, 45], [89, 73, 48], [95, 79, 52], [101, 84, 56]];
/** A broad field with no tile boundaries: dark moss under trees, warm clearings. */
const meadow = (x: number, y: number): number => Math.max(0, Math.min(4,
  2 + Math.sin(x * .026 + Math.sin(y * .017)) * .9 + Math.cos(y * .033 - x * .009) * .8));
export function paintTownTerrain(p: TerrainPlan): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = p.width; c.height = p.height;
  const g = c.getContext('2d')!;
  const image = g.createImageData(p.width, p.height), rgba = image.data;
  // A signed trail field costs only each trail's bounding box, never all trails
  // at every map pixel. Its rounded junctions follow the existing walking graph.
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
  const rockFoot = (x: number): number => p.hillFoot(x / 16) * 16 + Math.round(Math.sin(x * .043) * 3 + Math.sin(x * .117) * 2);
  const terrain = new Uint8Array(p.width * p.height);
  const shadeW = Math.ceil(p.width / 8) + 1, shadeH = Math.ceil(p.height / 8) + 1;
  const shades = new Float32Array(shadeW * shadeH);
  for (let y = 0; y < shadeH; y++) for (let x = 0; x < shadeW; x++) shades[y * shadeW + x] = meadow(x * 8, y * 8);
  const shadeAt = (x: number, y: number): number => {
    const i = (y >> 3) * shadeW + (x >> 3), fx = (x & 7) / 8, fy = (y & 7) / 8;
    return Math.round((shades[i]! * (1 - fx) + shades[i + 1]! * fx) * (1 - fy) +
      (shades[i + shadeW]! * (1 - fx) + shades[i + shadeW + 1]! * fx) * fy);
  };
  const stoneW = Math.ceil(p.width / 28) + 2, stoneH = Math.ceil(p.height / 23) + 2;
  const stones: { x: number; y: number; seed: number }[] = [];
  for (let y = -1; y < stoneH - 1; y++) for (let x = -1; x < stoneW - 1; x++) {
    const seed = hash(x, y, 3); stones.push({ x: x * 28 + 5 + seed % 19, y: y * 23 + 3 + (seed >>> 9) % 17, seed });
  }
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const i = y * p.width + x, h = hash(x, y), foot = rockFoot(x);
    let rgb = GRASS[shadeAt(x, y)]!, kind = 0;
    if (y < foot) {
      kind = 2;
      // Irregular natural slabs: jittered cell centres give angular fractures
      // with no horizontal courses, tile boundaries or regular block outlines.
      const gx = Math.floor(x / 28), gy = Math.floor(y / 23);
      let first = Infinity, second = Infinity, cx = 0, cy = 0, facet = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const stone = stones[(gy + oy + 1) * stoneW + gx + ox + 1]!;
        const { x: px, y: py, seed } = stone;
        const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < first) { second = first; first = d; cx = px; cy = py; facet = seed; }
        else if (d < second) second = d;
      }
      const fracture = second - first < 22;
      const level = .42 + .58 * Math.min(1, (y + 20) / 175);
      // Unequal planes catch light on the upper left; short seams are recessed.
      const plane = y - cy < (x - cx) * -.3 ? 7 : x - cx > 6 ? -6 : 0;
      const grain = (hash(x >> 1, y >> 1, 17) % 7 - 3) * .55;
      const glint = !fracture && second - first < 100 && y < cy && hash(x >> 2, y >> 2, 23) % 4 === 0 ? 4 : 0;
      const v = (fracture ? 43 + facet % 3 : 48 + facet % 15 + plane + grain + glint) * level;
      rgb = [v * .94, v * 1.03, v * 1.05];
      if (foot - y < 4 && h % 4 !== 0) rgb = [30, 43, 33];
      if (!fracture && facet % 7 === 0 && first < 90 && y > cy - 3) rgb = [v * .8, v * 1.08, v * .83];
    } else {
      // Uneven compacted shoulders: two-pixel clods plus single-pixel erosion,
      // then sparse grass fingers. Nothing repeats on the old 16px tile grid.
      const edge = (hash(x >> 2, y >> 2, 7) % 7 - 3) * .45;
      const d = wear[i]! + edge;
      if (d > 1.4 || d > -2.5 && h % 9 < Math.round((d + 2.5) * 2)) {
        kind = 1; rgb = SOIL[Math.floor((Math.sin(x * .041 + y * .025) + 1) * 1.5)]!;
        if (d < 2) rgb = [70, 64, 39];
        else if (h % 39 === 0) rgb = [110, 94, 66];
        else if (h % 29 === 0) rgb = [77, 64, 43];
      } else if (d > -5) rgb = GRASS[Math.max(0, shadeAt(x, y) - 1)]!;
      // The far stream stays outside the camp crop; banks break its ruled edge.
      const stream = 151 + Math.sin(y * .014) * 8 + Math.sin(y * .04) * 2;
      if (Math.abs(x - stream) < 12) {
        kind = 3; const bank = Math.abs(x - stream) > 8;
        rgb = bank ? [48, 60, 41] : hash(x >> 2, y >> 3) % 5 === 0 ? [55, 78, 79] : [38, 59, 64];
      }
      // The mature camp has irregular flagstones, dirt visible in their joints.
      if (p.plaza && Math.hypot(x - p.fire.x, y - p.fire.y) < 28 + edge) {
        kind = 1; const row = Math.floor(y / 9), sx = (x + (row % 2) * 6) % 13;
        rgb = y % 9 === 0 || sx === 0 ? [64, 63, 48] : [91 + hash(x >> 4, row) % 7, 88, 69];
      }
    }
    if (kind === 0) {
      const patch = hash(x >> 4, y >> 4, 37);
      const px = (x >> 4) * 16 + patch % 15, py = (y >> 4) * 16 + (patch >>> 7) % 15;
      const moss = patch % 3 === 0 && (x - px) ** 2 + (y - py) ** 2 < 32 + patch % 48;
      const grain = hash(x >> 1, y >> 1, 41);
      const tone = moss ? -3 - grain % 3 : grain % 13 === 0 ? 2 : 0;
      rgb = [rgb[0]! + tone, rgb[1]! + tone, rgb[2]! + tone];
    }
    terrain[i] = kind;
    const j = i * 4; rgba[j] = rgb[0]!; rgba[j + 1] = rgb[1]!; rgba[j + 2] = rgb[2]!; rgba[j + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  // Quiet contact shadows tie the forest edge to the meadow. Stepped rows keep
  // the pixel silhouette, and sprites/markers always paint above this bitmap.
  g.fillStyle = 'rgba(15,30,19,.25)';
  for (const t of p.shadows) {
    for (let row = -3; row <= 3; row++) {
      const w = 13 - Math.abs(row) * 2;
      g.fillRect(Math.round(t.x - w / 2 + 3), Math.round(t.y + row), w, 1);
    }
  }
  // Low, clustered botanical marks: quiet enough that workers stay the focal
  // points. Drawn below every sprite, with no extra geometry each frame.
  for (let y = 176; y < p.height - 5; y += 7) for (let x = 4; x < p.width - 6; x += 7) {
    const h = hash(x, y, 19), xx = x + h % 7, yy = y + (h >>> 6) % 7;
    // Tufts gather in banks of growth, leaving open moss between the clumps.
    const clump = hash(x >> 5, y >> 5, 43) % 5;
    if (terrain[yy * p.width + xx] !== 0 || wear[yy * p.width + xx]! > -5 || h % 8 > (clump === 0 ? 5 : clump === 1 ? 2 : 0)) continue;
    const light = meadow(xx, yy), tall = h % 4 === 0, lean = h % 2 ? 1 : -1;
    g.fillStyle = light > 2 ? '#627950' : '#4e6948';
    g.fillRect(xx, yy - (tall ? 3 : 1), 1, tall ? 4 : 2);
    if (h % 3) g.fillRect(xx + lean * 2, yy - 1, 1, 2);
    if (tall) g.fillRect(xx + lean, yy - 3, 1, 1);
    if (h % 5 === 0) g.fillRect(xx - lean, yy, 3, 1);
    g.fillStyle = '#283f30'; g.fillRect(xx - 1, yy + 1, tall ? 4 : 2, 1);
    if (h % 97 === 0) { g.fillStyle = '#828568'; g.fillRect(xx + 2, yy - 2, 1, 1); }
  }
  // Small embedded stones collect beside the approach, never on plot controls.
  for (let y = 179; y < p.height - 4; y += 11) for (let x = 6; x < p.width - 5; x += 13) {
    const h = hash(x, y, 29); if (h % 5 || terrain[y * p.width + x] !== 0 || wear[y * p.width + x]! < -13) continue;
    g.fillStyle = '#343f2e'; g.fillRect(x - 1, y + 1, 5, 2);
    g.fillStyle = '#727766'; g.fillRect(x, y, 3, 2);
    g.fillStyle = '#91917a'; g.fillRect(x, y, 2, 1);
  }
  return c;
}
