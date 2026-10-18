// Cut263/Cut269 (docs/CUT269_ACHIEVEMENTS_V2.md): the achievements (internal id `honours`) — one quiet toast at the camp
// when the core marks entries `new`, and the gallery (Menu → Achievements). All truth is the core's (`Lineage.honours`);
// nothing here is required, and nothing here changes play (pure cosmetic). Quiet: one count in the header, groups in the
// core's order, earned rows lit and the rest dimmed. An unearned secret is never sent, so it never shows: no `?`.
import "../honours.css";
import type { App } from "../app";
import type { HonourRow, HonoursWire, Lineage } from "../engine/types";
import { h, toast } from "./dom";
import { openWindow } from "./sheet";
import { icon } from "./skin";

/** The groups' labels, in the gallery's order (the core's `honours::GROUPS`). */
const GROUP_LABEL: Record<string, string> = /* copy:label */ {
  journey: "Journey",
  mastery: "Mastery",
  challenges: "Challenges",
  builds: "Builds",
  moments: "Moments",
  oddities: "Oddities",
};
/** A group's badge tier when a row carries none (the core's `honours::tier`). */
const GROUP_TIER: Record<string, string> = {
  mastery: "gold",
  challenges: "silver",
  builds: "silver",
  oddities: "silver",
};
const GLYPH = "✦";

/** The new achievements, in list order. */
export const freshHonours = (L: Pick<Lineage, "honours">): HonourRow[] =>
  (L.honours?.rows ?? []).filter((r) => r.new && r.day !== undefined);

/** The toast's words (≤ 3): the achievement's name, or the count when several landed together. */
export function honourToastText(fresh: HonourRow[]): string {
  if (!fresh.length) return "";
  if (fresh.length === 1) return `${GLYPH} ${fresh[0].name}`;
  return /* copy:callout */ `${GLYPH} ${fresh.length} achievements`;
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

const tierOf = (r: HonourRow): string => r.tier ?? GROUP_TIER[r.group] ?? "bronze";

function row(r: HonourRow): HTMLElement {
  const earned = r.day !== undefined;
  const right = earned
    ? `day ${r.day}`
    : r.n !== undefined && r.of !== undefined
      ? `${r.n}/${r.of}`
      : "";
  // Cut268/Cut269: the cut267 badge art through the skin (tier medals, the secret's only once earned); the glyph stays
  // as the fallback (`icon`'s data-glyph)
  const badge = !earned ? "badge_locked" : r.secret ? "badge_secret" : `badge_${tierOf(r)}`;
  return h(
    "li",
    {
      class: `honour${earned ? " earned" : ""}${r.secret ? " secret" : ""}${r.new ? " fresh" : ""}`,
      "data-honour": r.id,
      "data-tier": tierOf(r),
    },
    h("span", { class: "honour-mark", "aria-hidden": "true" }, icon(badge, earned ? GLYPH : "·")),
    h(
      "span",
      { class: "honour-text" },
      h("b", { class: "honour-name" }, r.name),
      h("small", { class: "honour-goal" }, r.goal),
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
      /* copy:label */ "Achievements",
      h(
        "span",
        { class: "honours-count" },
        `${w.earned}/${w.total}`,
        // earned secrets count apart: how many exist is never shown
        w.secrets ? h("span", { class: "honours-secrets" }, ` +${w.secrets}`) : null,
      ),
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
          h(
            "h3",
            null,
            h(
              "span",
              { class: "honours-frame", "aria-hidden": "true" },
              icon(`badge_frame_${GROUP_TIER[g] ?? "bronze"}`, ""),
            ),
            GROUP_LABEL[g] ?? g,
          ),
          h("ul", null, ...sorted.map(row)),
        );
      })
      .filter((x): x is HTMLElement => !!x),
  );
}

/** Menu → Achievements. */
export function openHonours(app: App, anchor?: HTMLElement | null): void {
  const w = app.lineage.honours;
  if (!w) return;
  openWindow(() => honoursBody(w), { anchor: anchor ?? undefined, material: "journal" });
}
