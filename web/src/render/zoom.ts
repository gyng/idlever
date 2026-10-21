// Queue 39 — scrollwheel scene zoom, shared by the live view (render/index.ts) and the town (render/town.ts).
// A zoom is a level over the scene's framed default: 1× (the default view, unchanged) up to 2.5×. The scale stays whole device
// px per texel (the live view: an even number, so a sprite texel never splits a device pixel), so a step is a crisp jump rather
// than a blurred tween; a level that would round to the scale already shown is skipped, so every notch visibly changes the view.
// Wheel up (or a trackpad's two-finger push away) zooms in. Ctrl/Cmd+wheel (and a trackpad pinch, which arrives as ctrl+wheel)
// is never taken: the browser's own page zoom stands. A wheel the scene cannot use (already at a bound) is not taken either,
// so the page under it still scrolls.

export const ZOOM_LEVELS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5] as const;
export const ZOOM_MAX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!;

/** a level's scale over the default `base` (device px per texel); `even`: whole even steps (the live view's sprites are 2 per texel) */
export function zoomScale(base: number, level: number, even = false): number {
  const z = ZOOM_LEVELS[Math.max(0, Math.min(ZOOM_LEVELS.length - 1, level))]!;
  if (level <= 0) return base;
  if (even && base >= 4) return Math.max(base, 2 * Math.round((base * z) / 2));
  if (base >= 2) return Math.max(base, Math.round(base * z));
  return Math.max(base, Math.floor(base * z * 8) / 8); // a low-density screen's fractional scale, in eighths
}

/** the next level from `level` in `dir` (+1 in, -1 out) whose scale (`scaleAt`) differs from the current one; null at the bound */
export function nextZoomLevel(
  scaleAt: (level: number) => number,
  level: number,
  dir: 1 | -1,
): number | null {
  const now = scaleAt(level);
  for (let l = level + dir; l >= 0 && l < ZOOM_LEVELS.length; l += dir)
    if (scaleAt(l) !== now) return l;
  // out: back to 1× even when a coarse base rounds every level alike
  if (dir < 0 && level > 0) return 0;
  return null;
}

/** a wheel event's delta in notches (+ zooms in): a line-mode wheel's 3 lines, a page, or ~100 pixels make one */
export function wheelNotches(e: Pick<WheelEvent, "deltaY" | "deltaMode">): number {
  const d = -e.deltaY;
  if (e.deltaMode === 1) return d / 3;
  if (e.deltaMode === 2) return d;
  return d / 100;
}

export type WheelZoomOpts = {
  /** whether this event is over the scene itself (not a panel, menu or tooltip standing over it) */
  accept(e: WheelEvent): boolean;
  /** step the zoom one level in `dir` around the client point; false when the scene cannot (a bound, no view) */
  step(dir: 1 | -1, clientX: number, clientY: number): boolean;
  /** whether a step in `dir` is possible now (so a wheel at a bound passes through to the page) */
  can(dir: 1 | -1): boolean;
};

/** Binds wheel zoom on `el`. A discrete wheel notch is one step; a trackpad's small pixel deltas gather to ~a notch's worth. */
export function bindWheelZoom(el: HTMLElement, o: WheelZoomOpts): () => void {
  let acc = 0,
    lastAt = 0;
  const onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || e.metaKey || e.defaultPrevented) return; // the browser's page zoom (and a pinch) stay the browser's
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // a sideways swipe is no zoom
    if (!o.accept(e)) return;
    const n = wheelNotches(e);
    if (!n) return;
    const dir: 1 | -1 = n > 0 ? 1 : -1;
    if (!o.can(dir)) {
      acc = 0;
      return;
    }
    e.preventDefault();
    const now = performance.now();
    if (now - lastAt > 400 || Math.sign(acc) !== dir) acc = 0;
    lastAt = now;
    // a wheel's notch (≥ half a notch in one event) steps at once; a trackpad's stream gathers to 0.6 notch a step
    if (Math.abs(n) >= 0.5) {
      acc = 0;
      o.step(dir, e.clientX, e.clientY);
      return;
    }
    acc += n;
    if (Math.abs(acc) >= 0.6) {
      acc = 0;
      o.step(dir, e.clientX, e.clientY);
    }
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}
