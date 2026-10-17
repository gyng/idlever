// Cut 120, option B (docs/CUT120_AUTOMATION_FILL.md "Defaults: option C measured, option B taken"): the Legacy and ranks orders
// default `off` for every lineage, so the town offers each one once, quietly, the first time it is useful — Legacy when it can first
// buy an upgrade, ranks when a worker rank is first due. Cut262: the offer is the Guild reception's lantern and a marked row in its
// works sheet (never a chip row over the camp); seeing it settles it for good (per lineage, browser storage). Nothing waits on it:
// `collect & send` walks past it, and the orders sheet keeps both orders settable any time.
import type { App } from "../app";
import type { Lineage, StandingOrders } from "../engine/types";
import { h } from "./dom";
import {
  LEGACY_ORDERS,
  LEGACY_TIP,
  LEGACY_WORD,
  RANKS_ORDERS,
  RANKS_WORD,
  legacyOrderShown,
  manyBloodlines,
  ranksOrderShown,
} from "./orders";

export type OfferKey = "legacy" | "ranks";
const KEY = (L: Pick<Lineage, "seed">): string => /* copy:none */ `idlever.offers.${L.seed ?? 0}`;

function load(L: Pick<Lineage, "seed">): Record<string, boolean> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(L)) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}
/** The offer `k` dismissed for good on this lineage (taken or `not now`). */
export function offerDone(L: Pick<Lineage, "seed">, k: OfferKey): boolean {
  return !!load(L)[k];
}
export function markOffer(L: Pick<Lineage, "seed">, k: OfferKey): void {
  const s = load(L);
  if (s[k]) return;
  s[k] = true;
  try {
    localStorage.setItem(KEY(L), JSON.stringify(s));
  } catch {
    /* private mode: offered again next visit */
  }
}

/** Legacy can buy an upgrade now. */
export const legacyUseful = (L: Lineage): boolean => !!L.legacy_upgrades?.some((u) => u.affordable);
/** A worker rank is due now (on offer: `Works.lit_rank`, or a hired hand whose wait is over). */
export const rankDue = (L: Lineage): boolean =>
  !!L.tree?.lit_rank ||
  !!L.tree?.nodes.some(
    (n) => n.kind === "worker" && n.state === "done" && n.rank_wait_d === 0 && !!n.rank_price,
  );

/** The offer showing now, if any: Legacy first, then ranks; only while the order is still `off`. */
export function pendingOffer(L: Lineage): OfferKey | null {
  const o = L.orders;
  if (!o) return null;
  // an order already set off `off` (the sheet) is a choice made: never offered after
  if (o.legacy && o.legacy !== "off") markOffer(L, "legacy");
  if (o.ranks && o.ranks !== "off") markOffer(L, "ranks");
  if (o.legacy === "off" && !offerDone(L, "legacy") && legacyUseful(L)) return "legacy";
  if (o.ranks === "off" && !offerDone(L, "ranks") && rankDue(L)) return "ranks";
  return null;
}

/** The orders sent on accepting: the order on, shared to every bloodline when the town keeps several (unless already shared). */
export function acceptPatch(L: Lineage, k: OfferKey): StandingOrders {
  const o = L.orders!,
    shared = o.shared ?? [];
  const share = manyBloodlines(L) && !shared.includes(k) ? { shared: [...shared, k] } : {};
  return { ...o, ...(k === "legacy" ? { legacy: "balanced" } : { ranks: "auto" }), ...share };
}

/** Cut262 (owner: "legacy setting control should not be a toast, it should be in a building that lets you handle automation"): the
 *  Legacy and ranks orders live at the Guild reception, beside the workers who carry them out (the works sheet). Nothing rides the camp
 *  well any more (the old chip row pushed the town up as it came and went). An order first useful lights the Guild's lantern
 *  (`guildOfferPending`) and the row it means wears a quiet gold edge in the sheet; seeing the sheet settles the offer. */
export const guildOfferPending = (L: Lineage): OfferKey | null => pendingOffer(L);
/** The Guild's sheet opened: the pending offer, now seen (its lantern goes out); null with none. */
export function takeGuildOffer(L: Lineage): OfferKey | null {
  const k = pendingOffer(L);
  if (k) markOffer(L, k);
  return k;
}

/** `offer`: the order the Guild's lantern announced when the sheet opened (its row keeps the mark while the sheet stands). */
export function guildOrders(
  app: App,
  offer: OfferKey | null,
  more?: (anchor: HTMLElement) => void,
): HTMLElement | null {
  const L = app.lineage,
    o = L.orders;
  if (!o || !app.engine.setOrders) return null;
  const legacy = legacyOrderShown(L),
    ranks = ranksOrderShown(L);
  if (!legacy && !ranks) return null;
  const set = (k: OfferKey, value: string): void => {
    const L0 = app.lineage,
      cur = L0.orders!;
    const patch: StandingOrders =
      offer === k && cur[k] === "off" && value !== "off"
        ? { ...acceptPatch(L0, k), [k]: value }
        : { ...cur, [k]: value };
    markOffer(L0, k);
    void app.mutate(
      () => app.engine.setOrders!(patch),
      k === "legacy" ? /* copy:callout */ "legacy" : /* copy:callout */ "ranks",
    );
  };
  const row = (
    k: OfferKey,
    label: string,
    values: readonly string[],
    word: Record<string, string>,
    tip?: Record<string, string>,
  ): HTMLElement => {
    const cur = o[k] ?? "off";
    return h(
      "div",
      {
        class: `order-row guild-order${offer === k ? " offered" : ""}`,
        "data-order": k,
        ...(offer === k ? { "data-offer": k } : {}),
      },
      h("span", { class: "olab" }, label),
      " ",
      h(
        "span",
        { class: "chips" },
        ...values.map((v) =>
          h(
            "button",
            {
              class: `chip order${cur === v ? " on" : ""}`,
              "aria-pressed": String(cur === v),
              [`data-${k}`]: v,
              title: tip?.[v],
              onclick: () => {
                if (cur !== v) set(k, v);
              },
            },
            word[v] ?? v,
          ),
        ),
      ),
    );
  };
  const link: HTMLButtonElement | null = more
    ? h(
        "button",
        {
          class: "chip guild-orders-more",
          "data-orders-more": "",
          onclick: () => more(link!),
        },
        /* copy:button */ "Run setup",
        h("small", { class: "dim" }, " ▸"),
      )
    : null;
  return h(
    "section",
    { class: "orders-sheet guild-orders", "data-guild-orders": "" },
    h("div", { class: "label row-label" }, /* copy:label */ "Orders"),
    h(
      "div",
      { class: "order-rows" },
      legacy
        ? row("legacy", /* copy:label */ "Legacy spend", LEGACY_ORDERS, LEGACY_WORD, LEGACY_TIP)
        : null,
      ranks ? row("ranks", /* copy:label */ "worker ranks", RANKS_ORDERS, RANKS_WORD) : null,
    ),
    link,
  );
}
