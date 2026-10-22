// Owner 2026-10-22 ("in the live view, show inventory as a text list on a side with hover tooltips … make live view more
// understandable/clearer/observable"): the live pack as a text list. Desktop: a panel in the right rail, under the shaft;
// phone: a closed strip under the map whose summary still reads his intent, the gold at risk and the next camp.
// Every line is the snapshot the HUD shows (the watch's `hudSnap`, at the viewer's playhead), never the engine's latest.
//   head: what he is doing (fighting · exploring · at camp · homeward · by hand)
//   purse: the carry at risk (lost on death) vs the secured gold (kept even on death), the next camp's countdown
//   worn: the equipped weapon/armour/helm/boots · brought: forge kit and town supplies · found: finds, each at its pickup gold
// Each row has a detail tip (what it is, its value, why it is carried or worn).
import "../screens/watch-inventory.css";
import type { InvItem, Snapshot } from "../engine/types";
import { h, replace } from "./dom";
import { itemIcon, itemName } from "./items";
import { detailHost } from "./tips";
import { isWide } from "./frame";

const TICKS_PER_S = 10; // the core's `offline::TICKS_PER_SECOND`; an expedition is watched at 1×

const nice = (s: string): string => s.replace(/_/g, " ");

/** One word for what the snapshot says he is doing. */
export function intentOf(s: Snapshot): { k: string; word: string; tip: string } {
  if (s.manual)
    return {
      k: "hand",
      word: /* copy:label */ "by hand",
      tip: /* copy:tooltip */ "hand control · he waits for orders",
    };
  if (s.camp)
    return {
      k: "camp",
      word: /* copy:label */ "at camp",
      tip: /* copy:tooltip */ "safe rest floor · heals whole",
    };
  if (s.stake?.returning)
    return {
      k: "home",
      word: /* copy:label */ "homeward",
      tip: /* copy:tooltip */ "a return row fired · walking out",
    };
  if (s.meters?.fighting)
    return {
      k: "fight",
      word: /* copy:label */ "fighting",
      tip: /* copy:tooltip */ "foes engaged",
    };
  return {
    k: "explore",
    word: /* copy:label */ "exploring",
    tip: /* copy:tooltip */ "clearing the floor · seeking stairs",
  };
}

/** `4m`, `40s`, `next stairs`: the next camp from `Snapshot.camp_in` (run ticks; the live view plays them at 1×). */
export function campText(ticks: number): string {
  if (ticks <= 0) return /* copy:label */ "next stairs";
  const s = Math.ceil(ticks / TICKS_PER_S);
  return s < 60 ? `${s}s` : `${Math.ceil(s / 60)}m`;
}

type Line = { item: InvItem; n: number; worth: number };
/** Same name and provenance share a line (`heal potion ×3 +$16`). */
function group(inv: InvItem[]): Line[] {
  const out = new Map<string, Line>();
  for (const it of inv) {
    const key = `${it.fate ?? (it.worth ? "found" : "none")}|${it.label}|${it.rarity ?? ""}`;
    const g = out.get(key);
    if (g) {
      g.n++;
      g.worth += it.worth ?? 0;
    } else out.set(key, { item: it, n: 1, worth: it.worth ?? 0 });
  }
  return [...out.values()];
}

const FATE_TIP: Record<string, string> = {
  kit: /* copy:tooltip */ "forge kit · comes home with him",
  supply: /* copy:tooltip */ "town supply · used when needed",
  brought: /* copy:tooltip */ "brought from town",
};

/** The panel; `wide` (the desktop frame, as `wideCols` decides it at mount) opens it in the rail. */
export function watchInventory(o: { wide: boolean } = { wide: isWide() }): {
  el: HTMLDetailsElement;
  paint(s: Snapshot, porter: boolean): void;
} {
  const intentEl = h("span", { class: "wi-intent" });
  const riskSum = h("span", { class: "wi-sum-risk num" });
  const campSum = h("span", { class: "wi-sum-camp num" });
  const summary = h(
    "summary",
    { class: "wi-head" },
    h("span", { class: "wi-title" }, /* copy:label */ "Pack"),
    intentEl,
    h("span", { class: "wi-sum" }, riskSum, campSum),
  );
  const purse = h("ul", { class: "wi-purse" });
  const list = h("div", { class: "wi-list" });
  const el = h(
    "details",
    { class: `watch-inv${o.wide ? " wide" : ""}`, "data-testid": "watch-inv" },
    summary,
    purse,
    list,
  );
  el.open = o.wide;

  // tips read these, so a tip held open follows the playhead
  let riskTip = "",
    campTip = "";

  const row = (
    left: (Node | string)[],
    right: string,
    tip: () => string,
    cls: string,
  ): HTMLElement =>
    detailHost(
      h(
        "li",
        { class: cls },
        h("span", { class: "wi-k" }, ...left),
        h("span", { class: "wi-v num" }, right),
      ),
      () => [h("p", null, tip())],
    );
  const riskV = h("span", { class: "wi-v num" }),
    keptV = h("span", { class: "wi-v num" }),
    campV = h("span", { class: "wi-v num" });
  const riskLi = detailHost(
    h("li", { class: "wi-risk" }, h("span", { class: "wi-k" }, /* copy:label */ "at risk"), riskV),
    () => [h("p", null, riskTip)],
  );
  const keptLi = detailHost(
    h("li", { class: "wi-kept" }, h("span", { class: "wi-k" }, /* copy:label */ "secured"), keptV),
    () => [h("p", null, /* copy:tooltip */ "secured gold · kept even on death")],
  );
  const campLi = detailHost(
    h(
      "li",
      { class: "wi-camp" },
      h("span", { class: "wi-k" }, /* copy:label */ "next camp"),
      campV,
    ),
    () => [h("p", null, campTip)],
  );
  purse.append(riskLi, keptLi, campLi);

  let listKey = "";
  function paintList(s: Snapshot): void {
    const hero = s.hero,
      gun = hero.gun;
    const worn: [string, string | undefined, "helm" | "body" | "boots" | undefined][] = [
      [/* copy:label */ "weapon", hero.weapon, undefined],
      [/* copy:label */ "armour", hero.armour, "body"],
      [/* copy:label */ "helm", hero.helm, "helm"],
      [/* copy:label */ "boots", hero.boots, "boots"],
    ];
    const key = JSON.stringify([
      worn.map((w) => w[1]),
      gun ? [gun.kind, gun.damage] : null,
      hero.inv.map((i) => [i.id, i.label, i.worth, i.fate, i.rarity]),
    ]);
    if (key === listKey) return;
    listKey = key;
    const wornRows = worn
      .filter((w): w is [string, string, (typeof w)[2]] => !!w[1])
      .map(([slot, kind, eq]) => {
        const name = nice(kind);
        const gunTip =
          slot === "weapon" && gun && gun.kind === kind
            ? ` · ${gun.capacity} shots · ${gun.damage[0]}–${gun.damage[1]} dmg`
            : "";
        return row(
          [
            itemIcon({ kind, label: name }, { size: "xs", equipmentSlot: eq }),
            itemName({ kind, label: name }),
          ],
          slot,
          () => /* copy:tooltip */ `${name} · worn ${slot}${gunTip}`,
          "wi-worn",
        );
      });
    const lines = group(hero.inv);
    const label = (l: Line): (Node | string)[] => {
      const name = nice(l.item.label);
      return [
        itemIcon(l.item, { size: "xs" }),
        itemName(l.item, name),
        l.n > 1 ? h("small", { class: "num wi-n" }, `×${l.n}`) : "",
      ];
    };
    const brought = lines
      .filter((l) => l.item.fate)
      .map((l) =>
        row(
          label(l),
          l.item.fate === "kit" ? /* copy:label */ "kit" : /* copy:label */ "supply",
          () => `${nice(l.item.label)} · ${FATE_TIP[l.item.fate!] ?? FATE_TIP.brought}`,
          `wi-brought fate-${l.item.fate}`,
        ),
      );
    const found = lines
      .filter((l) => !l.item.fate)
      .sort((a, b) => b.worth - a.worth)
      .map((l) =>
        row(
          label(l),
          l.worth ? `+$${l.worth}` : "—",
          () =>
            l.worth
              ? /* copy:tooltip */ `${nice(l.item.label)} · found · +$${l.worth} into the carry`
              : /* copy:tooltip */ `${nice(l.item.label)} · found · no gold`,
          "wi-found",
        ),
      );
    const section = (title: string, rows: HTMLElement[]): HTMLElement | null =>
      rows.length
        ? h(
            "section",
            { class: "wi-sec" },
            h("h4", { class: "wi-sec-h" }, title),
            h("ul", null, ...rows),
          )
        : null;
    replace(
      list,
      section(/* copy:label */ "worn", wornRows),
      section(/* copy:label */ "brought", brought),
      section(/* copy:label */ "found", found),
    );
    el.dataset.items = String(hero.inv.length);
  }

  let intentKey = "";
  return {
    el,
    paint(s, porter) {
      const it = intentOf(s);
      if (it.k !== intentKey) {
        intentKey = it.k;
        intentEl.textContent = it.word;
        intentEl.title = it.tip;
        el.dataset.intent = it.k;
      }
      const st = s.stake;
      const risk = Math.max(0, st?.loot ?? 0),
        kept = st?.death_keep ?? 0;
      riskV.textContent = `$${risk}`;
      keptV.textContent = `$${kept}`;
      riskSum.textContent = /* copy:label */ `$${risk} at risk`;
      riskTip =
        s.expedition && porter
          ? /* copy:tooltip */ "lost on death · secured at camp or return"
          : /* copy:tooltip */ "lost on death · banked on return";
      riskLi.dataset.v = String(risk);
      keptLi.dataset.v = String(kept);
      // the camp: a countdown on an expedition; a classic run has none
      // (at a camp the head already reads `at camp`)
      const ci = s.camp_in;
      campLi.hidden = ci === undefined;
      const ct = ci !== undefined ? campText(ci) : "";
      campV.textContent = ct;
      campSum.textContent = ct ? /* copy:label */ `camp ${ct}` : "";
      campSum.hidden = !ct;
      campTip = porter
        ? /* copy:tooltip */ "rest floor · heals him · porter secures the carry"
        : /* copy:tooltip */ "rest floor · heals him · a porter would secure carry";
      if (ci !== undefined) campLi.dataset.v = String(ci);
      paintList(s);
    },
  };
}
