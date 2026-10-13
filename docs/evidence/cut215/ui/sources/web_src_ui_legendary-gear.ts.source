import type { App } from "../app";
import type { LegendaryShape } from "../engine/types";
import { h } from "./dom";
import { itemIcon } from "./items";
import "../legendary-gear.css";

/** Shared presentation only. Rust supplies both the benefit and its limitation. */
export function legendaryDescription(row: {
  effect?: string;
  tradeoff?: string;
}): HTMLElement | null {
  if (!row.effect && !row.tradeoff) return null;
  return h(
    "div",
    { class: "legendary-description" },
    row.effect ? h("p", {}, h("b", {}, /* copy:label */ "Effect"), " · ", row.effect) : null,
    row.tradeoff ? h("p", {}, h("b", {}, /* copy:label */ "Tradeoff"), " · ", row.tradeoff) : null,
  );
}

/** Read-only destination for real discovery links; never selects or equips a shape. */
export async function openLegendaryLoadout(
  app: App,
  kind: string,
  anchor?: HTMLElement | null,
): Promise<void> {
  const engine = app.engine;
  const identity = (): string =>
    JSON.stringify([
      app.lineage.selected_bloodline,
      app.lineage.persistent_hero?.id,
      app.lineage.persistent_hero?.incarnation,
    ]);
  const key = identity();
  const { openHero } = await import("./town");
  if (engine !== app.engine || key !== identity()) return;
  openHero(app, anchor, "loadouts");
  queueMicrotask(() => {
    if (engine !== app.engine || key !== identity()) return;
    const choice = document.querySelector<HTMLButtonElement>(
      `.sheet-wrap:not(.under) [data-kit-choice="${CSS.escape(kind)}"]`,
    );
    if (!choice) return;
    const details = choice.closest("details");
    if (details) details.open = true;
    const target = choice.disabled ? choice.closest<HTMLElement>(".starting-gear-row") : choice;
    if (target) {
      if (target !== choice) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest" });
    }
  });
}

/** UI subset of the canonical owned collection; no hidden catalogue reconstruction. */
export function legendaryCollection(app: App, rows: readonly LegendaryShape[]): HTMLElement | null {
  if (!rows.length) return null;
  const engine = app.engine;
  const actor = app.lineage.persistent_hero;
  const slot = app.lineage.selected_bloodline;
  return h(
    "section",
    { class: "legendary-collection", "data-legendary-collection": "1" },
    h("h3", {}, /* copy:label */ "Discovered gear"),
    h("small", {}, /* copy:diary_line */ "Uses this hero's Forge upgrades."),
    ...rows.map((row) =>
      h(
        "article",
        { class: "legendary-card", "data-legendary-kind": row.kind },
        h(
          "h3",
          {},
          itemIcon({ kind: row.kind, label: row.label, rarity: "legendary" }, { size: "s" }),
          row.label,
        ),
        legendaryDescription(row),
        h("small", {}, /* copy:label */ "Free use"),
        row.blocked ? h("p", { role: "status" }, row.blocked) : null,
        row.source ? h("small", {}, row.source) : null,
        h(
          "button",
          {
            class: "btn",
            "data-legendary-link": row.kind,
            onclick: (event: Event) => {
              if (
                engine !== app.engine ||
                slot !== app.lineage.selected_bloodline ||
                actor?.id !== app.lineage.persistent_hero?.id ||
                actor?.incarnation !== app.lineage.persistent_hero?.incarnation
              )
                return;
              void openLegendaryLoadout(app, row.kind, event.currentTarget as HTMLElement);
            },
          },
          /* copy:button */ "Loadouts",
        ),
      ),
    ),
  );
}
