import type { App } from "../app";
import { h } from "./dom";
import "../building-upgrades.css";

/** Rust owns the level, gate, price and effect; this row submits the displayed price cap. */
export function buildingUpgradeRow(app: App, id: string, refresh: () => void): HTMLElement | null {
  const offer = app.lineage.town?.upgrades?.find((row) => row.id === id);
  if (!offer) return null;
  const next = offer.next;
  const effect = next?.effect.replace(/^(\d+)% hurry$/, "hurry cost −$1%");
  const engine = app.engine;
  const selected = app.lineage.selected_bloodline;
  const atHome = app.lineage.persistent_hero?.state !== "away";
  const roman = (level: number): string => ["", "I", "II", "III", "IV"][level] ?? String(level);
  const row = h("section", { class: "building-upgrade", "data-upgrade": id });
  row.append(
    h("b", { class: "num" }, /* copy:label */ `Level ${roman(offer.level)}`),
    h("span", { class: "dim" }, next ? `Next · ${effect}` : /* copy:label */ "Fully upgraded"),
  );
  if (next) {
    const button = h(
      "button",
      {
        class: "btn num",
        "data-upgrade-price": next.price,
        disabled: !next.ready || !next.affordable || !atHome || !engine.upgradeBuilding,
        onclick: async () => {
          if (
            button.disabled ||
            app.engine !== engine ||
            app.lineage.selected_bloodline !== selected
          )
            return;
          button.disabled = true;
          await app.mutate(async () => {
            if (app.engine !== engine || app.lineage.selected_bloodline !== selected)
              throw Error(/* copy:callout */ "Hero changed");
            return engine.upgradeBuilding!(id, next.price);
          }, /* copy:callout */ "Upgraded");
          if (row.isConnected) refresh();
        },
      },
      next.ready
        ? /* copy:button */ `Upgrade $${next.price}`
        : /* copy:button */ `D${next.gate_depth} needed`,
    );
    row.append(button);
  }
  return row;
}
