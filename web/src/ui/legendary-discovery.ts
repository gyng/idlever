import type { App } from "../app";
import type { LegendaryDiscovery } from "../engine/types";
import { h } from "./dom";
import { itemIcon } from "./items";
import { legendaryDescription, openLegendaryLoadout } from "./legendary-gear";
import { openWindow } from "./sheet";
import "../legendary-discovery.css";

/** Actual first-find receipts only; inspection never claims or equips an item. */
export function discoveryCard(
  app: App,
  find: LegendaryDiscovery,
  viewGear: (anchor: HTMLElement) => void = (anchor) => {
    void openLegendaryLoadout(app, find.kind, anchor);
  },
): HTMLElement {
  return h(
    "article",
    { class: "legendary-discovery", "data-discovery-kind": find.kind },
    h(
      "h3",
      {},
      itemIcon({ kind: find.kind, label: find.label, rarity: find.rarity }, { size: "s" }),
      find.label,
    ),
    h("small", { class: "discovery-place" }, `${find.hero_name} · D${find.depth}`),
    h("small", {}, /* copy:callout */ "Free Forge choice"),
    legendaryDescription(find),
    h("small", {}, find.source.replaceAll("_", " ")),
    h(
      "button",
      {
        class: "chip",
        "data-discovery-gear": find.kind,
        onclick: (e: Event) => viewGear(e.currentTarget as HTMLElement),
      },
      /* copy:button */ "View gear",
    ),
  );
}

/** A replay receipt stays historical; the optional destination reads the current town. */
export function openDiscovery(app: App, find: LegendaryDiscovery, anchor?: HTMLElement): void {
  const engine = app.engine,
    view = app.view;
  let active = true;
  openWindow(
    (close) =>
      h(
        "div",
        { class: "sheet-body" },
        h(
          "h2",
          {},
          find.rarity === "legendary"
            ? /* copy:callout */ "Legendary found"
            : /* copy:callout */ "Pattern found",
        ),
        discoveryCard(app, find, () => {
          const selected = app.lineage.selected_bloodline;
          void engine
            .lineage()
            .then((L) => {
              if (
                !active ||
                engine !== app.engine ||
                app.view !== view ||
                selected !== app.lineage.selected_bloodline ||
                L.selected_bloodline !== selected
              )
                return;
              app.lineage = L;
              close();
              void openLegendaryLoadout(app, find.kind, anchor?.isConnected ? anchor : undefined);
            })
            .catch(() => {
              // A failed read leaves the factual find card available for inspection.
            });
        }),
      ),
    {
      material: "forge",
      anchor,
      onClose: () => {
        active = false;
      },
    },
  );
}
