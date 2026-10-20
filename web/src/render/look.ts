// Hero looks: the heir's cosmetic look (`Lineage.look`: male | female | cat). The hero entity draws as `hero_<class>_<look>`; the atlas
// falls back to `hero_<class>`, then the procedural silhouette (art never blocks the game). Module state: the UI sets it from the
// lineage before a viewer loads (`setHeroLook`); a replay or a later floor reads the same look.
export const LOOKS = ["male", "female", "cat"] as const;
export type Look = (typeof LOOKS)[number];
let current = "";
export function setHeroLook(look: string | undefined): void {
  current = (LOOKS as readonly string[]).includes(look ?? "") ? look! : "";
}
export function heroLook(): string {
  return current;
}
// Cut267's existing paintings. Other weapon choices retain the class/look art.
const WEAPON_LOOKS = new Set([
  "fighter:crownsplitter",
  "rogue:crownsplitter",
  "ranger:sword",
  "caster:dagger",
  "caster:bow",
  "gunner:short_gun",
]);
/** A run's actual weapon selects an existing painted variant; old snapshots keep their look. */
export function heroKind(kind: string, look = current, weapon?: string): string {
  const cls = /^hero_([a-z]+)$/.exec(kind)?.[1];
  if (cls && weapon && WEAPON_LOOKS.has(`${cls}:${weapon}`))
    return `${kind}_${look || "male"}_${weapon}`;
  return look && /^hero_[a-z]+$/.test(kind) ? `${kind}_${look}` : kind;
}
/** A painted hero's class silhouette, including weapon variants. */
export function heroBase(kind: string): string | null {
  const m =
    /^(hero_[a-z]+)_(male|female|cat)(?:_(?:sword|dagger|bow|short_gun|crownsplitter))?$/.exec(
      kind,
    );
  return m ? m[1]! : null;
}
/** The same fallback order for GL and Canvas: weapon, class/look, class silhouette. */
export function heroFallbacks(kind: string): string[] {
  const base = heroBase(kind);
  if (!base) return [kind];
  const look = /^(hero_[a-z]+_(?:male|female|cat))/.exec(kind)![1]!;
  return [...new Set([kind, look, base])];
}
