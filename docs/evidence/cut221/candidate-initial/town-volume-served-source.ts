// Cut221: code-authored matte surface relief and two coarse ground occluders.
// This never supplies game truth, new art, or a new atlas/render target.
export function volumeKind(id: string | undefined): number {
  if (id === "town_house_2") return 3;
  if (id === "town_blacksmith_2") return 4;
  if (id === "hero_rogue" || id === "hero_rogue_male" || id === "walk_rogue") return 5;
  return 0;
}

export const VOLUME_GLSL = /* glsl */ `
uniform float uVolumeOn;
uniform vec4 uVolumeBlock[2]; // coarse footprint: centre x/y, half width/depth

float volumeHeight(vec2 p, float kind) {
  // Roof/wall masks are authored from structural planes, never painted luma.
  if (kind > 2.5 && kind < 4.5) {
    float ridge = kind < 3.5 ? 0.54 : 0.51;
    float roof = kind < 3.5 ? 0.53 : 0.47;
    if (p.y > roof + 0.12 * abs(p.x - ridge))
      return 0.28 + 0.34 * p.y - 0.42 * abs(p.x - ridge);
    return 0.08 + 0.10 * p.y + (p.x < ridge ? -0.11 : 0.07) * p.x;
  }
  // Head and cloak volumes stay shallow. Rogue's narrow coat differs from
  // Fighter's shoulder mass; ink/alpha remain authoritative in the caller.
  float rogue = step(4.5, kind);
  float centre = mix(0.49, 0.46, rogue);
  float torso = max(0.0, 1.0 - abs(p.x - centre) * mix(2.2, 2.6, rogue));
  float head = max(0.0, 1.0 - length((p - vec2(centre, 0.85)) * vec2(3.8, 6.0)));
  return 0.08 * torso * smoothstep(0.1, 0.45, p.y) + 0.065 * head;
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
