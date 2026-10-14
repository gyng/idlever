import type { Ev } from "./types";
import type { FxLevel } from "./fxpref";

type Kind =
  | "fighter"
  | "rogue"
  | "ranger"
  | "caster"
  | "gunner"
  | "clown"
  | "engineer"
  | "hit"
  | "blocked"
  | "miss"
  | "heal";
export type CueBody = { x: number; y: number; w: number; h: number };
export type CuePixel = {
  x: number;
  y: number;
  w: number;
  h: number;
  c: [number, number, number];
  a: number;
};
type Cue = { kind: Kind; id: number; at: number };
const glyphs: Record<Kind, string[]> = {
  fighter: ["01110", "10001", "10001", "01010", "00100"],
  rogue: ["10001", "01010", "00100", "01010", "10001"],
  ranger: ["00100", "00010", "11111", "00010", "00100"],
  caster: ["00100", "01110", "10101", "01110", "00100"],
  gunner: ["11111", "11110", "00110", "00110", "01100"],
  clown: ["10001", "11011", "01110", "00100", "00100"], // Cut225: the split cap over a bell
  engineer: ["01110", "11011", "01110", "00100", "01010"], // Cut225: a cog on a tripod
  hit: ["00010", "00100", "01000", "10000", "00000"],
  blocked: ["11111", "10001", "10001", "10001", "01110"],
  miss: ["10001", "01010", "00100", "01010", "10001"],
  heal: ["00100", "00100", "11111", "00100", "00100"],
};
const sourceKinds = new Set<Kind>([
  "fighter",
  "rogue",
  "ranger",
  "caster",
  "gunner",
  "clown",
  "engineer",
]);
const BONE: [number, number, number] = [0.918, 0.875, 0.773];
const MIST: [number, number, number] = [0.643, 0.737, 0.839];
const HEAL: [number, number, number] = [0.5, 0.77, 0.58];
/** No wall time, inferred policy/target, random particles or gameplay state. */
export class CombatCues {
  private cues: Cue[] = [];
  readonly pixels: CuePixel[] = [];
  events = 0;
  clear(): void {
    this.cues.length = 0;
    this.pixels.length = 0;
  }
  onEvent(ev: Ev, heroId: number, level: FxLevel): void {
    if (level === "off") {
      this.clear();
      return;
    }
    let kind: Kind | undefined,
      id = heroId;
    if (ev.k === "rule" && ev.row >= 0 && ev.skill) {
      const cls = ev.skill.id.split("_")[0] as Kind;
      if (sourceKinds.has(cls)) kind = cls;
    } else if (ev.k === "attack") {
      kind = !ev.hit ? "miss" : ev.dmg > 0 ? "hit" : ev.dmg === 0 ? "blocked" : undefined;
      id = ev.dst;
    } else if ((ev.k === "heal" && !/rest|regen/.test(ev.src)) || ev.k === "recover") {
      if (ev.amount > 0) {
        kind = "heal";
        id = ev.id;
      }
    }
    if (!kind) return;
    this.events++;
    const old = this.cues.findIndex(
      (c) => c.id === id && sourceKinds.has(c.kind) === sourceKinds.has(kind!),
    );
    if (old >= 0) this.cues.splice(old, 1);
    this.cues.push({ kind, id, at: ev.t });
    while (this.cues.length > 8) this.cues.shift();
  }
  draw(
    clock: number,
    body: (id: number) => CueBody | null,
    level: FxLevel,
    motion: boolean,
  ): readonly CuePixel[] {
    this.pixels.length = 0;
    if (level === "off") {
      this.clear();
      return this.pixels;
    }
    this.cues = this.cues.filter((c) => clock >= c.at && clock - c.at < 6);
    const cap = level === "low" || !motion ? 4 : 8;
    for (const cue of this.cues.slice(-cap)) {
      const e = body(cue.id);
      if (!e) continue;
      const source = sourceKinds.has(cue.kind),
        age = clock - cue.at;
      const x = Math.round(e.x + (source ? -e.w / 2 - 5 : 0)),
        y = Math.round(e.y + (source ? e.h * 0.5 : -4));
      const a = motion && level === "full" ? (age < 3 ? 1 : 0.75) : 1;
      const c =
        cue.kind === "heal" ? HEAL : cue.kind === "blocked" || cue.kind === "miss" ? MIST : BONE;
      if (this.pixels.length >= 128) break;
      this.pixels.push({ x, y: y - 3, w: 7, h: 7, c: [0.051, 0.047, 0.078], a });
      const glyph = glyphs[cue.kind];
      for (let row = 0; row < glyph.length; row++)
        for (let col = 0; col < glyph[row]!.length; col++) {
          if (glyph[row]![col] !== "1" || this.pixels.length >= 128) continue;
          this.pixels.push({ x: x + col - 2, y: y + 2 - row, w: 1, h: 1, c, a });
        }
    }
    return this.pixels;
  }
  stats(): { active: number; quads: number; events: number } {
    return { active: this.cues.length, quads: this.pixels.length, events: this.events };
  }
}
