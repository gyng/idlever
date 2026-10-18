// Cut263 (docs/CUT263_ACHIEVEMENTS.md): the honours — one quiet toast at the camp when the core marks honours `new`, and the
// gallery (Menu → Honours). All truth is the core's (`Lineage.honours`); nothing here is required, and nothing here changes
// play. Quiet: one count in the header, groups in the core's order, earned rows lit and the rest dimmed; a secret reads `?`.
import "../honours.css";
import type { App } from "../app";
import type { HonourRow, HonoursWire, Lineage } from "../engine/types";
import { h, toast } from "./dom";
import { openWindow } from "./sheet";
import { icon } from "./skin";

/** The groups' labels, in the gallery's order (the core's `honours::GROUPS`). */
const GROUP_LABEL: Record<string, string> = /* copy:label */ {
  depth: "Depth",
  bosses: "Bosses",
  town: "Town",
  workers: "Workers",
  packages: "Packages",
  pen: "Pen",
  deaths: "Deaths",
  heroes: "Heroes",
  companions: "Companions",
  lore: "Lore",
};
const GLYPH = "✦";

/** The new honours, in list order. */
export const freshHonours = (L: Pick<Lineage, "honours">): HonourRow[] =>
  (L.honours?.rows ?? []).filter((r) => r.new && r.day !== undefined);

/** The toast's words (≤ 3): the honour's name, or the count when several landed together. */
export function honourToastText(fresh: HonourRow[]): string {
  if (!fresh.length) return "";
  if (fresh.length === 1) return `${GLYPH} ${fresh[0].name}`;
  return /* copy:callout */ `${GLYPH} ${fresh.length} honours`;
}

const toasted = new WeakMap<App, Set<string>>();
/** Cut263: at a camp paint, the honours the core marks new toast once (a repaint never repeats them); the next send
 *  tells the core (`seenHonours`, watch.ts) — never mid-edit. */
export function toastHonours(app: App): boolean {
  const fresh = freshHonours(app.lineage);
  const done = toasted.get(app) ?? new Set<string>();
  toasted.set(app, done);
  const unseen = fresh.filter((r) => !done.has(r.id));
  if (!unseen.length) return false;
  for (const r of unseen) done.add(r.id);
  const t = toast(honourToastText(unseen), 2600);
  t?.classList.add("honour-toast");
  app.honoursPending = true;
  return true;
}

/** Cut263: the next send tells the core the camp showed the new honours (the toast and the gallery's dots are spent). */
export async function settleHonours(app: App): Promise<void> {
  if (!app.honoursPending || !app.engine.seenHonours) return;
  app.honoursPending = false;
  try {
    app.lineage = await app.engine.seenHonours();
  } catch {
    /* the dots stay until the next send */
  }
}

function row(r: HonourRow): HTMLElement {
  const earned = r.day !== undefined;
  const hidden = !!r.secret && !earned;
  const right = earned
    ? `day ${r.day}`
    : r.n !== undefined && r.of !== undefined
      ? `${r.n}/${r.of}`
      : "";
  return h(
    "li",
    {
      class: `honour${earned ? " earned" : ""}${hidden ? " secret" : ""}${r.new ? " fresh" : ""}`,
      "data-honour": r.id,
    },
    // Cut268: the cut267 badge art through the skin; the glyph stays as the fallback (`icon`'s data-glyph)
    h(
      "span",
      { class: "honour-mark", "aria-hidden": "true" },
      icon(earned ? "badge_gold" : hidden ? "badge_secret" : "badge_locked", earned ? GLYPH : hidden ? "?" : "·"),
    ),
    h(
      "span",
      { class: "honour-text" },
      h("b", { class: "honour-name" }, hidden ? "?" : r.name),
      hidden ? null : h("small", { class: "honour-goal" }, r.goal),
    ),
    right ? h("span", { class: "honour-n" }, right) : null,
  );
}

/** The gallery's body (exported for the client test and a future Journal tab). */
export function honoursBody(w: HonoursWire): HTMLElement {
  const groups = Object.keys(GROUP_LABEL);
  const seen = new Set<string>();
  const order = [
    ...groups,
    ...w.rows.map((r) => r.group).filter((g) => !groups.includes(g)),
  ].filter((g) => !seen.has(g) && !!seen.add(g));
  return h(
    "div",
    { class: "sheet-body honours-panel" },
    h(
      "h2",
      { class: "honours-head" },
      /* copy:label */ "Honours",
      h("span", { class: "honours-count" }, `${w.earned}/${w.total}`),
    ),
    ...order
      .map((g) => {
        const rows = w.rows.filter((r) => r.group === g);
        if (!rows.length) return null;
        // earned first, then the list's order
        const sorted = [
          ...rows.filter((r) => r.day !== undefined),
          ...rows.filter((r) => r.day === undefined),
        ];
        return h(
          "section",
          { class: "honours-group", "data-group": g },
          h("h3", null, GROUP_LABEL[g] ?? g),
          h("ul", null, ...sorted.map(row)),
        );
      })
      .filter((x): x is HTMLElement => !!x),
  );
}

/** Menu → Honours. */
export function openHonours(app: App, anchor?: HTMLElement | null): void {
  const w = app.lineage.honours;
  if (!w) return;
  openWindow(() => honoursBody(w), { anchor: anchor ?? undefined, material: "journal" });
}
