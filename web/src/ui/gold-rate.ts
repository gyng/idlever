// Queue 40: the purse's growth rate (Rust `rates`, on the town clock) — compact money, a signed per-hour figure and its window.
import type { GoldRateWindow } from "../engine/types";

/** `$340` · `$1.2k` · `$48k` · `$1.5M` */
export function money(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `$${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `$${a}`;
}
/** `+$1.2k` · `−$80` · `$0` */
export const signed = (n: number): string => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(n)}`;
/** `+$1.2k/h` */
export const perHour = (n: number): string => /* copy:callout */ `${signed(n)}/h`;
/** The window a figure covers: `last 60 min` · `last 7 h` · `last 24 h`. */
export function windowWord(w: GoldRateWindow): string {
  const m = Math.round(w.window_s / 60);
  return m < 90
    ? /* copy:callout */ `last ${m} min`
    : /* copy:callout */ `last ${Math.round(m / 60)} h`;
}
