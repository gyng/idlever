import type { App } from "../app";
import type { BuildingUpgrade, UpgradeReceipt } from "../engine/types";
import { h } from "./dom";
import "../building-upgrades.css";

const ROMAN = ["", "I", "II", "III", "IV", "V"];
const roman = (level: number): string => ROMAN[level] ?? String(level);

/** Cut315: a building's upgrade row — its level and effect now, the next level's effect and price. Rust owns the
 *  level, gate, price, effect and funding; the request echoes the shown quote (payer, level, price), so a change of
 *  hero or price between look and tap is refused by the core. The purse pays by default; a Savings shortfall needs
 *  the explicit `Use Savings` toggle. */
export function buildingUpgradeRow(
  app: App,
  id: BuildingUpgrade["id"],
  done: (receipt: UpgradeReceipt) => void,
): HTMLElement | null {
  const row = app.lineage.town?.upgrades?.find((u) => u.id === id);
  if (!row) return null;
  const engine = app.engine;
  const next = row.next;
  const el = h(
    "section",
    { class: "building-upgrade", "data-upgrade": id, "data-upgrade-level": row.level },
    h(
      "div",
      { class: "building-upgrade-now" },
      h("b", { class: "num" }, /* copy:label */ `Level ${roman(row.level)}`),
      h("span", { class: "dim num" }, row.effect),
    ),
  );
  if (!next) {
    el.append(h("span", { class: "dim building-upgrade-max" }, /* copy:label */ "Fully upgraded"));
    return el;
  }
  const atHome = app.lineage.town?.home !== false;
  const needsSavings = next.withdrawal > 0;
  let useSavings = false;
  let busy = false;
  const toggle = needsSavings
    ? h(
        "button",
        {
          class: "chip building-upgrade-savings num",
          "aria-pressed": "false",
          "data-withdrawal": next.withdrawal,
          disabled: !next.ready || !next.affordable_with_savings || !atHome,
          onclick: () => {
            useSavings = !useSavings;
            toggle!.setAttribute("aria-pressed", String(useSavings));
            sync();
          },
        },
        /* copy:button */ `Savings $${next.withdrawal}`,
      )
    : null;
  const buy = h(
    "button",
    {
      class: "btn num building-upgrade-buy",
      "data-upgrade-price": next.price,
      onclick: async () => {
        if (buy.disabled || busy || app.engine !== engine || !engine.upgradeBuilding) return;
        busy = true;
        sync();
        let receipt: UpgradeReceipt | undefined;
        const ok = await app.mutate(async () => {
          const r = await engine.upgradeBuilding!({
            id,
            payer: next.payer,
            level: next.level,
            max_price: next.price,
            use_savings: useSavings,
          });
          receipt = r.receipt;
          return r.lineage;
        }, /* copy:callout */ "upgrade");
        busy = false;
        if (ok && receipt) done(receipt);
        else if (el.isConnected) sync();
      },
    },
    next.ready
      ? /* copy:button */ `Upgrade $${next.price}`
      : /* copy:button */ `D${next.gate_depth} needed`,
  );
  const sync = (): void => {
    buy.disabled =
      busy ||
      !engine.upgradeBuilding ||
      !atHome ||
      !next.ready ||
      (needsSavings && (!useSavings || !next.affordable_with_savings));
  };
  sync();
  el.append(
    h(
      "div",
      { class: "building-upgrade-next" },
      h("span", { class: "num" }, /* copy:label */ `Next ${roman(next.level)}`),
      h("span", { class: "dim num" }, next.effect),
    ),
    h("div", { class: "building-upgrade-acts" }, toggle ?? "", buy),
  );
  return el;
}
