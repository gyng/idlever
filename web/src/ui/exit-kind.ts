import type { ExitLine } from "../engine/types";

/** Currency share does not identify an outcome: both alive exits now retain100%. */
export function exitKind(x: ExitLine): "bank" | "return" | "death" | null {
  if (x.tier === "bank" || x.tier === "return" || x.tier === "death") return x.tier;
  // Hand-authored diagnostic rows can carry the outcome in their display text.
  const lead = /^(banked|returned|died|stalled|lost thread|driven)\b/.exec(x.text)?.[1];
  return lead === "banked" ? "bank" : lead === "died" ? "death" : lead ? "return" : null;
}
