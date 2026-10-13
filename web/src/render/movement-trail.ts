import type { FxLevel } from "./fxpref";
export type TrailPixel = { x: number; y: number; w: number; h: number; a: number };
type Step = { x: number; y: number; dx: number; dy: number; t: number };
/** Factual vacated hero tiles, never inferred from interpolated/camera positions. */
export class MovementTrail {
  private steps: Step[] = [];
  readonly pixels: TrailPixel[] = [];
  clear(): void {
    this.steps.length = 0;
    this.pixels.length = 0;
  }
  move(t: number, x: number, y: number, nextX: number, nextY: number): void {
    const dx = nextX - x,
      dy = nextY - y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) return;
    this.steps.push({ x, y, dx, dy, t });
    if (this.steps.length > 6) this.steps.shift();
  }
  draw(
    clock: number,
    visible: (x: number, y: number) => boolean,
    level: FxLevel,
    motion: boolean,
  ): readonly TrailPixel[] {
    this.pixels.length = 0;
    if (level === "off") {
      this.clear();
      return this.pixels;
    }
    this.steps = this.steps.filter((s) => clock >= s.t && clock - s.t < 8);
    const cap = !motion ? 2 : level === "low" ? 3 : 6;
    for (const s of this.steps.slice(-cap)) {
      if (!visible(s.x, s.y)) continue;
      const a = motion ? 0.28 + 0.28 * (1 - (clock - s.t) / 8) : 0.48;
      for (const side of [-1, 1])
        this.pixels.push({
          x: (s.x + 0.5) * 8 - side * s.dy,
          y: -(s.y + 0.75) * 8 + side * s.dx,
          w: s.dx ? 2 : 1,
          h: s.dx ? 1 : 2,
          a,
        });
    }
    return this.pixels;
  }
  stats(): { steps: number; quads: number } {
    return { steps: this.steps.length, quads: this.pixels.length };
  }
}
