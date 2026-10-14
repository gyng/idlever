// Cut225: the Clown's decoy and the Engineer's sentry in the replay. Their primitive sprites (8×8 env texels, ink and metal, a
// different silhouette each) and the cues around them: setup (the bell's chime ring, the sentry's closing brackets), the target
// line of each act the core reported (`attack` from the tool: a sentry shot, a discharge, a grand jape), the remaining life
// (`tool.until` against the replay clock), brace / overdrive marks and the end (expired · destroyed · discharged). Everything is
// read off ReplayState.tools, which only the core's `tool` / `attack` events move — nothing is inferred from a rule firing.
// Reduced motion keeps every cue, still: rings at full size, no blink.
import type { FxLevel } from "./fxpref";
import type { CueBody, CuePixel } from "./combat-cues";
import { TOOL_END_T, TOOL_MODE_T, TOOL_SETUP_T, type ReplayState, type ToolState } from "./state";

type Rgb = [number, number, number];
const INK: Rgb = [0.051, 0.047, 0.078];
const GILT: Rgb = [0.79, 0.64, 0.29];
const MIST: Rgb = [0.643, 0.737, 0.839];
const BONE: Rgb = [0.918, 0.875, 0.773];
const BLOOD: Rgb = [0.6, 0.18, 0.18];

const SHIELD = ["11111", "10001", "10001", "01010", "00100"];
const OVERDRIVE = ["00100", "01010", "10001", "00100", "01010"];
const BROKEN = ["10001", "01010", "00000", "01010", "10001"];

/** A tool's world anchor: the bottom centre of its tile (texels, y up), as an entity's feet. */
export function toolFeet(t: Pick<ToolState, "px" | "py">): [number, number] {
  return [t.px * 8 + 4, -(t.py + 1) * 8];
}

/** The tool's dissolve (0 solid … 1 gone) while it ends. */
export function toolFade(t: ToolState, clock: number): number {
  return t.ended ? Math.min(1, Math.max(0, (clock - t.ended.t0) / TOOL_END_T)) : 0;
}

/** The cue pixels for every tool on a visible tile (world texels, bottom-centre anchored, as CombatCues). */
export function toolCuePixels(
  st: ReplayState,
  body: (id: number) => CueBody | null,
  level: FxLevel,
  motion: boolean,
  out: CuePixel[] = [],
): CuePixel[] {
  out.length = 0;
  const clock = st.clock;
  // what a tool is doing is the run's state, not juice: effects off keeps every cue, held still as reduced motion does
  motion &&= level !== "off";
  const put = (x: number, y: number, c: Rgb, a = 1, w = 1, h = 1): void => {
    if (out.length < 192) out.push({ x, y, w, h, c, a });
  };
  const glyph = (rows: string[], x: number, y: number, c: Rgb): void => {
    put(x, y - 1, INK, 1, 7, 7);
    for (let r = 0; r < rows.length; r++)
      for (let k = 0; k < rows[r]!.length; k++)
        if (rows[r]![k] === "1") put(x + k - 2, y + 4 - r, c);
  };
  // a square ring of single pixels, radius r texels about (cx, cy)
  const ring = (cx: number, cy: number, r: number, c: Rgb, a: number): void => {
    const n = Math.max(4, Math.round(r));
    for (let i = -n; i <= n; i += 2) {
      put(cx + i, cy + r, c, a);
      put(cx + i, cy - r, c, a);
      if (Math.abs(i) < n) {
        put(cx + r, cy + i, c, a);
        put(cx - r, cy + i, c, a);
      }
    }
  };
  for (const t of st.tools.values()) {
    const i = t.y * st.w + t.x;
    if (!st.visible[i] && !st.seen[i]) continue;
    const [fx, fy] = toolFeet(t),
      cy = fy + 4;
    const fade = toolFade(t, clock);
    // setup: the bell chimes out (a widening ring), the sentry's brackets close on its tile
    const age = clock - t.placed;
    if (!t.ended && age >= 0 && age < TOOL_SETUP_T) {
      const p = motion ? age / TOOL_SETUP_T : 1;
      if (t.kind === "decoy") ring(fx, cy, Math.round(5 + 6 * p), GILT, motion ? 1 - p * 0.4 : 1);
      else {
        const r = Math.round(9 - 4 * p);
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          put(fx + sx * r, cy + sy * r, MIST);
          put(fx + sx * (r - 1), cy + sy * r, MIST);
          put(fx + sx * r, cy + sy * (r - 1), MIST);
        }
      }
    }
    // the target line: dots from the tool to whom its act struck, for three ticks
    for (const aim of t.aims) {
      const ago = clock - aim.t;
      if (ago < 0 || ago >= 3) continue;
      const b = body(aim.dst);
      if (!b) continue;
      const tx = b.x,
        ty = b.y + b.h * 0.45;
      const n = Math.max(1, Math.round(Math.hypot(tx - fx, ty - cy) / 2));
      for (let s = 1; s < n; s++)
        put(
          Math.round(fx + ((tx - fx) * s) / n),
          Math.round(cy + ((ty - cy) * s) / n),
          t.kind === "decoy" ? GILT : MIST,
          ago < 2 ? 0.95 : 0.7,
        );
      if (t.kind === "decoy" && ago < 2) ring(fx, cy, 6, GILT, 0.9); // grand jape: the bell rings again
      if (t.kind === "sentry" && ago < 2) put(fx + 4, fy + 5, BONE, 1, 2, 1); // muzzle
    }
    if (!t.ended) {
      // remaining life: a 6-texel bar under the tile; its last fifth blinks (still: turns red)
      const left = Math.max(0, t.until - clock),
        f = Math.min(1, left / t.span),
        low = f <= 0.2;
      const lit = !low || !motion || Math.floor(clock) % 2 === 0;
      put(fx, fy - 2, INK, 1, 8, 2);
      const w = Math.max(1, Math.round(6 * f));
      if (lit)
        put(
          fx - 3 + w / 2,
          fy - 1.5,
          low && !motion ? BLOOD : t.kind === "decoy" ? GILT : MIST,
          1,
          w,
          1,
        );
      // brace / overdrive / relocation marks over it
      if (t.mode && clock - t.mode.t0 >= 0 && clock - t.mode.t0 < TOOL_MODE_T) {
        if (t.mode.state === "braced") glyph(SHIELD, fx, fy + 10, BONE);
        else if (t.mode.state === "overdrive") glyph(OVERDRIVE, fx, fy + 10, GILT);
      }
    } else if (t.ended.how === "destroyed") glyph(BROKEN, fx, fy + 10, BLOOD);
    else if (t.ended.how === "discharged")
      ring(fx, cy, Math.round(4 + 6 * (motion ? fade : 1)), BONE, 1 - fade * 0.5);
  }
  return out;
}
