/** Explicit semantic material inventory for secondary windows. Established Forge/Hub/Journal options take priority.
 * These identify actual opener content, never its displayed text or a hidden parent's incidental colors. */
export type MenuMaterial = "forge" | "bloodlines" | "journal";
const windows: ReadonlyArray<readonly [string, MenuMaterial, string]> = [
  [".works-sheet", "forge", "works"],
  [".settings,.watch-options", "forge", "settings"],
  [".bank-sheet,.plot-preview", "forge", "town"],
  [
    ".pkg-panel,.pkg-pen-needs,.companion-rules,.row-sheet,.card-rows,.drop-sheet",
    "bloodlines",
    "build",
  ],
  [
    ".look-sheet,.heroes-sheet,.bloodline-founding,.hero-life-panel,.class-picker",
    "bloodlines",
    "hero",
  ],
  [".class-path-review,.class-style-review,.oath-sheet,.unlock-sheet", "bloodlines", "choices"],
  [
    ".saved-setup-name,.orders-sheet,.start-picker,.route-picker,.preparation-build,.return-pick",
    "bloodlines",
    "setup",
  ],
  [".ascension-review,.descent-review", "bloodlines", "choices"],
  [
    ".gold-sheet,.ledger,.runs-sheet,.run-card-sheet,.chronicle-sheet,.graveyard-sheet",
    "journal",
    "records",
  ],
  [
    ".outcome-explanation,.early-death-trace,.trace-sheet,.row-why,.morgue,.depth-reference,.tactic-detail",
    "journal",
    "evidence",
  ],
  [".crier-scroll,.discovery-sheet,.seek-sheet", "journal", "records"],
  [".replay", "journal", "replay"],
];
export function menuMaterial(
  content: Element,
): { material: MenuMaterial; purpose: string } | undefined {
  for (const [selector, material, purpose] of windows) {
    if (content.matches(selector)) return { material, purpose };
  }
  // The current Class opener belongs to town.ts; recognize its explicit class grid without modifying town ownership.
  if (content.matches(".sheet-body") && content.querySelector(":scope > .classes"))
    return { material: "bloodlines", purpose: "hero" };
  return undefined;
}
