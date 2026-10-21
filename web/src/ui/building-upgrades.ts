import type { App } from "../app";
import type { BuildingUpgrade, UpgradeReceipt } from "../engine/types";
import { h } from "./dom";
import { rows, section } from "../ui-kit/kit";

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
  const now = { label: /* copy:label */ `Level ${roman(row.level)}`, note: row.effect, key: "now" };
  if (!next) {
    const done = section(/* copy:label */ "Upgrades", [
      rows([{ ...now, end: h("span", { class: "dim" }, /* copy:label */ "Fully upgraded") }]),
    ]);
    done.classList.add("building-upgrade");
    done.dataset.upgrade = id;
    done.dataset.upgradeLevel = String(row.level);
    return done;
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
  const el = section(/* copy:label */ "Upgrades", [
    rows([
      now,
      {
        label: /* copy:label */ `Next ${roman(next.level)}`,
        note: next.effect,
        key: "next",
        end: h("div", { class: "building-upgrade-acts" }, toggle ?? "", buy),
      },
    ]),
  ]);
  el.classList.add("building-upgrade");
  el.dataset.upgrade = id;
  el.dataset.upgradeLevel = String(row.level);
  return el;
}
