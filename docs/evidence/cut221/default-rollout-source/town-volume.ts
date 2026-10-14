// Cut221: code-authored matte surface relief and two coarse ground occluders.
// This never supplies game truth, new art, or a new atlas/render target.
const HERO_KINDS: Record<string, number> = {
  fighter: 2,
  rogue: 5,
  caster: 6,
  ranger: 7,
  gunner: 8,
};
const CAT_KINDS: Record<string, number> = {
  fighter: 15,
  rogue: 16,
  caster: 17,
  ranger: 18,
  gunner: 19,
};
const ASSET_KINDS: Record<string, number> = {
  town_house_1: 9,
  town_house_2: 3,
  town_house_3: 10,
  town_blacksmith_1: 11,
  town_blacksmith_2: 4,
  town_blacksmith_3: 12,
};
for (const cls of Object.keys(HERO_KINDS)) {
  for (const pose of ["hero", "walk"])
    for (const look of ["", "male", "female", "cat"])
      ASSET_KINDS[`${pose}_${cls}${look ? `_${look}` : ""}`] =
        look === "cat" ? CAT_KINDS[cls]! : HERO_KINDS[cls]!;
}
export function volumeKind(id: string | undefined): number {
  if (!id) return 0;
  const seated = id.startsWith("town_seated:");
  const kind = ASSET_KINDS[seated ? id.slice(12) : id] ?? 0;
  return kind && seated ? kind + 32 : kind;
}
export const volumeBuilding = (kind: number): boolean =>
  kind === 3 || kind === 4 || (kind >= 9 && kind <= 12);
export const volumeHero = (kind: number): boolean => kind >= 2 && !volumeBuilding(kind);
/** Preserve selected cosmetics when the atlas has no matching walk painting. */
export function townWalkIds(cls: string, look: string | undefined, idle: string[]): string[] {
  const paintedWalkLook = cls === "rogue" || cls === "ranger" ? "female" : "male";
  return look && look !== paintedWalkLook
    ? [`walk_${cls}_${look}`, ...idle, `walk_${cls}`]
    : [`walk_${cls}`, ...idle];
}

export const VOLUME_GLSL = /* glsl */ `
uniform float uVolumeOn;
uniform vec4 uVolumeBlock[2]; // coarse footprint: centre x/y, half width/depth

float volumeHeight(vec2 p, float kind) {
  bool house = kind==3.0 || kind==9.0 || kind==10.0;
  bool forge = kind==4.0 || kind==11.0 || kind==12.0;
  if (house || forge) {
    float ridge = house ? (kind==9.0 ? 0.59 : kind==10.0 ? 0.50 : 0.54) : (kind==12.0 ? 0.62 : 0.51);
    float roof = house ? (kind==10.0 ? 0.60 : 0.53) : (kind==11.0 ? 0.48 : kind==12.0 ? 0.46 : 0.47);
    // Upper roof, lower timber/masonry wall, and the tier3 secondary gable.
    if (p.y > roof + 0.12 * abs(p.x - ridge))
      return 0.28 + 0.34 * p.y - 0.42 * abs(p.x - ridge);
    if (kind==10.0 && p.y>0.24 && p.y<0.40 && abs(p.x-0.48)<0.22)
      return 0.13 + 0.12*p.y - 0.18*abs(p.x-0.48);
    return 0.08 + 0.10 * p.y + (p.x < ridge ? -0.11 : 0.07) * p.x;
  }
  bool seated=kind>=32.0;
  float body=seated ? kind-32.0 : kind;
  bool cat=body>=15.0;
  if(cat) body=body==15.0 ? 2.0 : body-11.0;
  float centre=body==5.0 ? 0.46 : body==7.0 ? 0.44 : body==8.0 ? 0.52 : 0.49;
  float breadth=body==5.0 ? 2.6 : body==6.0 ? 1.9 : body==7.0 ? 2.45 : 2.2;
  float torso=max(0.0,1.0-abs(p.x-centre)*breadth);
  float headY=seated ? 0.81 : body==6.0 ? 0.80 : 0.85;
  float head=max(0.0,1.0-length((p-vec2(centre,headY))*vec2(cat ? 3.0 : 3.8,6.0)));
  float ears=cat ? max(0.0,1.0-min(length((p-vec2(centre-0.11,0.96))*vec2(12.0,18.0)),length((p-vec2(centre+0.11,0.96))*vec2(12.0,18.0)))) : 0.0;
  // Shallow coat/robe/head volume; silhouette, pigment and ink remain the art.
  return 0.08*torso*smoothstep(0.1,0.45,p.y)+0.065*head+0.025*ears;
}
vec3 volumeNormal(vec2 p, float kind) {
  float e = 0.0125;
  float dx = (volumeHeight(p + vec2(e,0.0),kind) - volumeHeight(p - vec2(e,0.0),kind)) / (2.0*e);
  float dy = (volumeHeight(p + vec2(0.0,e),kind) - volumeHeight(p - vec2(0.0,e),kind)) / (2.0*e);
  return normalize(vec3(clamp(-dx,-0.7,0.7),clamp(-dy,-0.7,0.7),1.0));
}
float volumeVisibility(vec2 receiver, vec2 source) {
  if (uVolumeOn < 0.5) return 1.0;
  float visibility = 1.0;
  for (int j=0;j<2;j++) {
    vec4 b=uVolumeBlock[j];
    if (b.z < 0.5) continue;
    vec2 low=b.xy-b.zw, high=b.xy+b.zw;
    // Receiver on the building or its own interior emitter is not a ground
    // shadow sample. This also avoids self-shadowing painted window flames.
    if (all(greaterThanEqual(receiver,low)) && all(lessThanEqual(receiver,high))) continue;
    if (all(greaterThanEqual(source,low)) && all(lessThanEqual(source,high))) continue;
    vec2 d=source-receiver;
    vec2 safe=mix(vec2(0.0001),d,step(vec2(0.0001),abs(d)));
    vec2 a=(low-receiver)/safe,c=(high-receiver)/safe;
    vec2 near=min(a,c),far=max(a,c);
    float enter=max(near.x,near.y),leave=min(far.x,far.y);
    if (leave>max(enter,0.01) && enter<0.99 && leave>0.0)
      visibility *= 0.35; // soft matte blocking; sky ambient is independent
  }
  return visibility;
}
`;
