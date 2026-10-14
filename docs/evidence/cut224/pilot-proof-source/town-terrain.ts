// Cosmetic cached landscape: approved painted materials, shared by GL/Canvas2D.
type Point = { x: number; y: number };
type Trail = { a: Point; b: Point; r: number };
export type TerrainPlan = {
  width: number;
  height: number;
  trails: Trail[];
  fire: Point;
  plaza: boolean;
  depth?: boolean;
  aprons: Point[];
  shadows: Point[];
  hillFoot: (x: number) => number;
};
export type GrassRoot = Point & { h: number; phase: number };
const grassRoots = new WeakMap<HTMLCanvasElement, GrassRoot[]>();
export const townGrassRoots = (terrain: HTMLCanvasElement): readonly GrassRoot[] =>
  grassRoots.get(terrain) ?? [];
const hash = (x: number, y: number, salt = 0): number => {
  let h = Math.imul(x + salt * 97, 374761393) ^ Math.imul(y + salt * 53, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

type Material = { data: Uint8ClampedArray; width: number; height: number };
const materials: Record<string, Material> = {},
  props: Record<string, HTMLImageElement> = {};
let version = 0;
const names = ["grass_0", "grass_3", "dirt_0", "plaza_0", "water"];
// Publish once after all independent assets settle. Missing art never blocks town.
void Promise.allSettled(
  [...names, "bank", "boulders", "undergrowth", "pines"].map(async (name) => {
    const im = new Image();
    im.src = `${import.meta.env.BASE_URL}art/landscape/${name}.png`;
    await im.decode();
    if (!names.includes(name)) {
      props[name] = im;
      return;
    }
    const c = document.createElement("canvas");
    c.width = im.width;
    c.height = im.height;
    const g = c.getContext("2d")!;
    g.drawImage(im, 0, 0);
    materials[name] = {
      data: g.getImageData(0, 0, c.width, c.height).data,
      width: c.width,
      height: c.height,
    };
  }),
).then(() => {
  version++;
});
export const terrainMaterialVersion = (): number => version;
const GRASS0_FALLBACK = [35, 45, 38],
  GRASS3_FALLBACK = [32, 43, 38],
  SOIL_FALLBACK = [70, 76, 76],
  WATER_FALLBACK = [27, 43, 49];
const mirror = (v: number, n: number): number => {
  const a = ((v % (n * 2)) + n * 2) % (n * 2);
  return a < n ? a : 2 * n - 1 - a;
};
// Mirror coordinates are separable: cache each exact integer contribution once
// per paint, retaining the original sample index and channel arithmetic.
function materialIndices(
  m: Material | undefined,
  width: number,
  height: number,
  dx = 0,
  dy = 0,
): { x: Uint32Array; y: Uint32Array } {
  const x = new Uint32Array(width),
    y = new Uint32Array(height);
  if (m) {
    for (let i = 0; i < width; i++) x[i] = mirror(i + dx, m.width) * 4;
    for (let i = 0; i < height; i++) y[i] = mirror(i + dy, m.height) * m.width * 4;
  }
  return { x, y };
}
export function paintTownTerrain(p: TerrainPlan): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = p.width;
  c.height = p.height;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const image = g.createImageData(p.width, p.height),
    rgba = image.data;
  const wear = new Float32Array(p.width * p.height);
  wear.fill(-1000);
  // These pigment boundaries depend on one axis only. Keep Float64 precision
  // and the original operation order so cached rows/columns paint identical pixels.
  const hillFeet = new Float64Array(p.width),
    cliffFeet = new Float64Array(p.width);
  for (let x = 0; x < p.width; x++) {
    hillFeet[x] = p.hillFoot(x / 16) * 16;
    cliffFeet[x] = hillFeet[x]! + Math.sin(x * 0.039) * 2;
  }
  const streams = new Float64Array(p.height);
  for (let y = 0; y < p.height; y++)
    streams[y] = 151 + Math.sin(y * 0.014) * 8 + ((hash(0, y >> 3, 53) % 5) - 2);

  const stamp = (a: Point, b: Point, radius: number): void => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = dx * dx + dy * dy;
    const left = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius - 5));
    const right = Math.min(p.width - 1, Math.ceil(Math.max(a.x, b.x) + radius + 5));
    const top = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius - 5));
    const bottom = Math.min(p.height - 1, Math.ceil(Math.max(a.y, b.y) + radius + 5));
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len)) : 0;
        const d = radius - Math.hypot(x - a.x - t * dx, y - a.y - t * dy),
          i = y * p.width + x;
        if (d > wear[i]!) wear[i] = d;
      }
  };
  for (const trail of p.trails) stamp(trail.a, trail.b, trail.r);
  stamp(p.fire, p.fire, p.plaza ? 34 : 25);
  for (const a of p.aprons) stamp({ x: a.x - 19, y: a.y - 2 }, { x: a.x + 19, y: a.y - 2 }, 9);

  // Scalar channels retain the original arithmetic but avoid allocating RGB
  // sample/map arrays for every pixel in the 896×640 painted ground.
  const grass0 = materials.grass_0,
    grass3 = materials.grass_3,
    water = materials.water;
  const grass0Indices = materialIndices(grass0, p.width, p.height),
    grass3Indices = materialIndices(grass3, p.width, p.height, 43, 61),
    dirtIndices = materialIndices(materials.dirt_0, p.width, p.height, 17, 29),
    plazaIndices = materialIndices(materials.plaza_0, p.width, p.height, 17, 29),
    waterIndices = materialIndices(water, p.width, p.height, 33, 17);
  // The soil noise uses x>>2/y>>2. Compute the same scalar once per4×4 block.
  const edgeWidth = Math.ceil(p.width / 4),
    edgeHeight = Math.ceil(p.height / 4);
  const edges = new Float64Array(edgeWidth * edgeHeight);
  for (let y = 0; y < edgeHeight; y++)
    for (let x = 0; x < edgeWidth; x++) edges[y * edgeWidth + x] = ((hash(x, y, 7) % 7) - 3) * 0.35;
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++) {
      const i = y * p.width + x;
      const ai = grass0Indices.x[x]! + grass0Indices.y[y]!,
        bi = grass3Indices.x[x]! + grass3Indices.y[y]!;
      const wash =
        0.5 + 0.25 * Math.sin(x * 0.021 + y * 0.008) + 0.2 * Math.sin(y * 0.029 - x * 0.007);
      let red =
        (grass0?.data[ai] ?? GRASS0_FALLBACK[0]!) * (1 - wash) +
        (grass3?.data[bi] ?? GRASS3_FALLBACK[0]!) * wash;
      let green =
        (grass0?.data[ai + 1] ?? GRASS0_FALLBACK[1]!) * (1 - wash) +
        (grass3?.data[bi + 1] ?? GRASS3_FALLBACK[1]!) * wash;
      let blue =
        (grass0?.data[ai + 2] ?? GRASS0_FALLBACK[2]!) * (1 - wash) +
        (grass3?.data[bi + 2] ?? GRASS3_FALLBACK[2]!) * wash;
      if (y < cliffFeet[x]!) {
        const value =
          (red * 0.21 + green * 0.72 + blue * 0.07) * (0.45 + 0.36 * Math.min(1, y / 160));
        red = value * 0.82;
        green = value * 0.98;
        blue = value * 1.08;
      } else {
        const edge = edges[(y >> 2) * edgeWidth + (x >> 2)]!;
        const d = wear[i]! + edge;
        const blend = Math.max(0, Math.min(1, (d + 2.4) / 4.2));
        if (blend) {
          const plaza = p.plaza && Math.hypot(x - p.fire.x, y - p.fire.y) < 28;
          const soil = materials[plaza ? "plaza_0" : "dirt_0"];
          const indices = plaza ? plazaIndices : dirtIndices;
          const si = indices.x[x]! + indices.y[y]!;
          red = red * (1 - blend) + (soil?.data[si] ?? SOIL_FALLBACK[0]!) * blend;
          green = green * (1 - blend) + (soil?.data[si + 1] ?? SOIL_FALLBACK[1]!) * blend;
          blue = blue * (1 - blend) + (soil?.data[si + 2] ?? SOIL_FALLBACK[2]!) * blend;
        }
        if (p.depth && d > -2.4 && d < 2.1 && y > 0 && y + 1 < p.height) {
          // A few stepped pigment levels suggest the grass lip above worn earth.
          // Use existing cached wear, not another hash/noise pass or animated work.
          const slope = wear[i - p.width]! - wear[i + p.width]!;
          const shade = slope > 0.8 ? 0.95 : slope < -0.8 ? 1.035 : 1;
          red *= shade;
          green *= shade;
          blue *= shade;
        }
        const bank = Math.abs(x - streams[y]!);
        if (bank < 8) {
          const wi = waterIndices.x[x]! + waterIndices.y[y]!;
          red = (water?.data[wi] ?? WATER_FALLBACK[0]!) * 0.72;
          green = (water?.data[wi + 1] ?? WATER_FALLBACK[1]!) * 0.72;
          blue = (water?.data[wi + 2] ?? WATER_FALLBACK[2]!) * 0.72;
        } else if (bank < 12) {
          if (p.depth && x > streams[y]! && bank > 10) {
            red *= 1.035;
            green *= 1.035;
            blue *= 1.035;
          }
          red *= 0.75;
          green *= 0.75;
          blue *= 0.75;
        }
      }
      const j = i * 4;
      rgba[j] = red;
      rgba[j + 1] = green;
      rgba[j + 2] = blue;
      rgba[j + 3] = 255;
    }
  g.putImageData(image, 0, 0);
  // Rooted tufts only on unworn meadow, never paths, aprons, stream or cliff.
  // Cache placement with the painted ground; wind changes only their tiny tips.
  let roots: GrassRoot[] = [];
  for (let gy = 18; gy < p.height - 6; gy += 18)
    for (let gx = 8; gx < p.width - 6; gx += 18) {
      const n = hash(gx, gy, 83),
        x = gx + (n % 7) - 3,
        y = gy + ((n >>> 8) % 7) - 3;
      const stream = streams[y]!;
      if (y < hillFeet[x]! + 8 || Math.abs(x - stream) < 16 || wear[y * p.width + x]! > -5)
        continue;
      roots.push({ x, y, h: 4 + (n % 3), phase: ((n % 997) / 997) * Math.PI * 2 });
    }
  const prop = (name: string, x: number, y: number, w: number, h: number, flip = false): void => {
    roots = roots.filter(
      (p) => p.x < x - w / 2 - 3 || p.x > x + w / 2 + 3 || p.y < y - h - 3 || p.y > y + 5,
    );
    const im = props[name];
    if (!im) return;
    // Ground the painted cutout with quiet stepped ink, not a new hard outline.
    g.fillStyle = "rgba(10,18,24,.10)";
    g.fillRect(Math.round(x - w * 0.32), Math.round(y - 1), Math.round(w * 0.64), 4);
    g.fillStyle = "rgba(10,18,24,.16)";
    g.fillRect(Math.round(x - w * 0.23), Math.round(y), Math.round(w * 0.46), 2);
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    g.drawImage(im, Math.round(-w / 2), -h, w, h);
    g.restore();
  };
  // Landscape rises at the forest/hill margin, framing the painted cave. All
  // dressing is baked behind actors and safely off existing walking corridors.
  prop("bank", 394, 168, 112, 55);
  prop("bank", 517, 172, 100, 49, true);
  prop("pines", 346, 167, 74, 88);
  prop("pines", 563, 166, 68, 81, true);
  prop("boulders", 387, 223, 36, 28);
  prop("undergrowth", 511, 231, 46, 26, true);
  prop("undergrowth", 392, 289, 40, 23);
  prop("boulders", 543, 355, 38, 29, true);
  prop("undergrowth", 354, 359, 51, 29);
  prop("undergrowth", 484, 404, 38, 22, true);
  prop("pines", 295, 287, 76, 90);
  prop("pines", 613, 338, 79, 94, true);
  // Ground contact beneath the established forest; no animated decoration.
  for (const t of p.shadows) {
    const x = Math.round(t.x),
      y = Math.round(t.y);
    g.fillStyle = "rgba(10,18,24,.09)";
    g.fillRect(x - 7, y - 1, 16, 4);
    g.fillStyle = "rgba(10,18,24,.18)";
    g.fillRect(x - 5, y, 12, 2);
    g.fillStyle = "rgba(10,18,24,.24)";
    g.fillRect(x - 2, y, 5, 1);
  }
  grassRoots.set(c, roots);
  return c;
}
