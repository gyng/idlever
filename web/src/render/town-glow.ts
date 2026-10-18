// Cut272 — a town sprite's own-silhouette highlight: hover/focus, a ready shimmer, the task tap's two pulses. One instanced draw
// over the lit screen (after the light pass, so the gold reads as emitted light, day or night). Each instance is the sprite's
// quad grown by R texels; its fragment reads the sprite's atlas alpha around its texel and paints only outside the silhouette:
// a 1-texel outline (8-neighbour) and a banded, dithered glow out to R texels. The ready sweep is a bright arc travelling around
// the outline by angle from the sprite's centre. The DOM hit target still owns input; the view only learns which id to light.
import * as THREE from "three";
import { BAYER_GLSL } from "./layers";

export const GLOW_R = 3;
export type Glow = {
  /** the hit target's id (rectOf's) */
  id: string;
  /** sprite foot (bottom centre), texels; size; atlas uv rect (u0, v0 bottom, u1, v1 top) */
  x: number;
  y: number;
  w: number;
  h: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  flip: boolean;
  outline: number;
  glow: number;
  sweep: number;
  breathe: number;
  hover: number;
  phase: number;
};

const VERT = /* glsl */ `
attribute vec3 iPos;    // x, -footY, phase
attribute vec4 iSize;   // w, h, flip, hover
attribute vec4 iUV;
attribute vec4 iA;      // outline, glow, sweep, breathe
varying vec2 vWorld;
varying vec2 vOrigin;
varying vec4 vSize;
varying vec4 vUV;
varying vec4 vA;
varying float vPhase;
void main() {
  float R = ${GLOW_R}.0;
  vec2 full = iSize.xy + 2.0 * R;
  vOrigin = vec2(iPos.x - iSize.x * 0.5, iPos.y);
  vSize = iSize;
  vUV = iUV;
  vA = iA;
  vPhase = iPos.z;
  vec2 p = iPos.xy + vec2(uv.x * full.x - full.x * 0.5, uv.y * full.y - R);
  vWorld = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAtlas;
uniform float uTime;
varying vec2 vWorld;
varying vec2 vOrigin;
varying vec4 vSize;
varying vec4 vUV;
varying vec4 vA;
varying float vPhase;
${BAYER_GLSL}
float alphaAt(vec2 t) {
  if (t.x < 0.0 || t.y < 0.0 || t.x >= vSize.x || t.y >= vSize.y) return 0.0;
  float x = vSize.z > 0.5 ? vSize.x - 1.0 - t.x : t.x;
  return step(0.5, texture2D(map, vec2(vUV.x + (x + 0.5) / uAtlas, vUV.y + (t.y + 0.5) / uAtlas)).a);
}
void main() {
  // the town target's own texel grid (the light pass floors device px by k the same way), in the sprite's local texels: the
  // outline lands on the texels beside the drawn edge, never half a texel off on an odd-width sprite
  vec2 t = floor(floor(vWorld) + 0.5 - vOrigin + 0.001);
  if (alphaAt(t) > 0.5) discard;          // the sprite itself stays the art
  float d = 99.0;
  for (int dy = -${GLOW_R}; dy <= ${GLOW_R}; dy++)
    for (int dx = -${GLOW_R}; dx <= ${GLOW_R}; dx++) {
      vec2 o = vec2(float(dx), float(dy));
      if (alphaAt(t + o) > 0.5) d = min(d, length(o));
    }
  if (d > ${GLOW_R}.5) discard;
  // the sweep: a bright arc going round the silhouette (≈ 3.6 s a lap), by angle from the sprite's centre
  vec2 c = t + 0.5 - vSize.xy * vec2(0.5, 0.45);
  float a = atan(c.y, c.x) / 6.2831853 + 0.5;
  float s = fract(a - uTime * 0.28 + vPhase);
  float arc = vA.z * (smoothstep(0.80, 0.97, s) * (1.0 - smoothstep(0.97, 1.0, s)));
  float breath = mix(1.0, 0.62 + 0.38 * sin(uTime * 1.7 + vPhase * 6.2831853), vA.w);
  vec3 gold = mix(vec3(0.91, 0.69, 0.33), vec3(1.0, 0.86, 0.55), vSize.w);
  vec3 col;
  float alpha;
  if (d < 1.5) {
    col = mix(gold, vec3(1.0, 0.97, 0.85), arc);
    alpha = clamp(vA.x * mix(1.0, breath, 0.45) + arc * 0.6, 0.0, 1.0);
  } else {
    // banded, dithered falloff (the light pass's pools read the same way)
    float f = 1.0 - (d - 1.0) / ${GLOW_R}.0;
    f = floor(f * 4.0 + bayer4(t)) / 4.0;
    col = mix(vec3(1.0, 0.78, 0.4), vec3(1.0, 0.93, 0.72), arc);
    alpha = clamp(f * (vA.y * breath + arc * 0.6), 0.0, 0.85);
  }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}`;

export class GlowLayer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private geom: THREE.InstancedBufferGeometry;
  private mat: THREE.ShaderMaterial;
  private pos: THREE.InstancedBufferAttribute;
  private size: THREE.InstancedBufferAttribute;
  private uvr: THREE.InstancedBufferAttribute;
  private par: THREE.InstancedBufferAttribute;
  private mesh: THREE.Mesh;
  static readonly CAP = 16;
  constructor(texture: THREE.Texture, atlasSize: number) {
    const base = new THREE.PlaneGeometry(1, 1);
    base.translate(0.5, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("uv", base.getAttribute("uv"));
    const cap = GlowLayer.CAP;
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.uvr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.par = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    for (const a of [this.pos, this.size, this.uvr, this.par]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iPos", this.pos);
    g.setAttribute("iSize", this.size);
    g.setAttribute("iUV", this.uvr);
    g.setAttribute("iA", this.par);
    g.instanceCount = 0;
    this.geom = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        map: { value: texture },
        uAtlas: { value: atlasSize },
        uTime: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  /** Fill the instances and the camera (world texels → the screen at k device px a texel, as the light pass maps them). False: none. */
  set(
    glows: readonly Glow[],
    view: { x0: number; y0: number; W: number; H: number; k: number },
    time: number,
  ): boolean {
    const n = Math.min(GlowLayer.CAP, glows.length);
    const P = this.pos.array as Float32Array,
      S = this.size.array as Float32Array,
      U = this.uvr.array as Float32Array,
      A = this.par.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const q = glows[i]!;
      P.set([q.x, -q.y, q.phase], i * 3);
      S.set([q.w, q.h, q.flip ? 1 : 0, q.hover], i * 4);
      U.set([q.u0, q.v0, q.u1, q.v1], i * 4);
      A.set([q.outline, q.glow, q.sweep, q.breathe], i * 4);
    }
    this.geom.instanceCount = n;
    if (!n) return false;
    for (const a of [this.pos, this.size, this.uvr, this.par]) a.needsUpdate = true;
    const c = this.camera;
    c.left = view.x0;
    c.right = view.x0 + view.W / view.k;
    c.top = -view.y0;
    c.bottom = -(view.y0 + view.H / view.k);
    c.updateProjectionMatrix();
    this.mat.uniforms.uTime!.value = time;
    return true;
  }
  dispose(): void {
    this.geom.dispose();
    this.mat.dispose();
  }
}
