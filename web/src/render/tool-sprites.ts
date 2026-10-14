// Cut225: the decoy's and the sentry's primitive sprites — the fallback the atlas draws for `env_tool_<kind>` art, and what the 2D
// view draws when the sheet has none. Art never blocks: these always exist.
export type ToolKind = "decoy" | "sentry";
/** The primitive sprites, row 0 on top: k ink, g gilt, s steel, m mist, r blood, b bone. The atlas draws them as the fallback for
 *  `env_tool_<kind>` art (atlas.ts `envSlot("tool:…")`); the 2D view draws the same rows. */
export const TOOL_SPRITE: Record<ToolKind, string[]> = {
  // a gilt bell hung from a steel post, the fool's split pennant red at its top
  decoy: [
    ".sssss..",
    ".s..k.rr",
    ".s.kgkr.",
    ".skgggk.",
    ".skgmgk.",
    ".skkkkk.",
    ".s..g...",
    "kkk.....",
  ],
  // a squat turret on a tripod, its barrel to the right, one cold lens and a gilt collar
  sentry: [
    "........",
    "..kkkk..",
    ".kssskkk",
    ".ksmsk..",
    ".ksssk..",
    "..kggk..",
    "..k..k..",
    ".k....k.",
  ],
};
export const TOOL_COLOURS: Record<string, string> = {
  k: "#0d0c14",
  g: "#c9a24a",
  s: "#5c6272",
  m: "#a4bcd6",
  r: "#99302e",
  b: "#eadfc5",
};
