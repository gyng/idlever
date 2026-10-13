// Run-clear (the owner, 2026-10-02: "include item rarity colours + icons"): an item drawn wherever the client shows one — its icon
// (the packed `it_<kind>`, else a primitive glyph by its family: art never blocks the game) as a clear silhouette with its rarity, its name tinted
// the same, and one-time arrivals for finds. The rarity is the core's (`InvItem.rarity`, `item::rarity`); the colours are
// docs/ART_DIRECTION.md's rarity row (items.css).
import "../items.css";
import type { InvItem, Rarity } from "../engine/types";
import { h } from "./dom";
import { hasIcon } from "./skin";
import { kwHost } from "./tips";

export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "masterwork", "legendary"];
export const rarityRank = (r?: Rarity): number => RARITIES.indexOf(r ?? "common");
/** The rarest of a list (common for none). */
export const bestRarity = (xs: { rarity?: Rarity }[]): Rarity =>
  RARITIES[Math.max(0, ...xs.map((x) => rarityRank(x.rarity)))];

/** The family an item kind is drawn as when its own icon is not packed (display only: which picture, never what it does). */
const FAMILY: [RegExp, string, string][] = /* copy:none */ [
  [/^(dagger|sword|axe|bow|spear|mace|crownsplitter)$/, "weapon", "⚔"],
  [/^(leather|mail|plate|scale|hearthglass|frostmantle)$/, "armour", "⛨"],
  [/^(ironcap|hearthglass_hood)$/, "helm", ""],
  [/^(trailboots|hearthglass_boots)$/, "boots", ""],
  [
    /^(potion|heal|strength|speed|invisibility|poison|caustic|confusion|fire|regen|resist_fire|clarity)$/,
    "potion",
    "⚗",
  ],
  [
    /^(scroll|teleport|blink|fear|mapping|identify|enchant|darkness|summon_ally|aggravate|recall|silence|earthquake|mirror)$/,
    "scroll",
    "§",
  ],
  [/^gold$/, "gold", "$"],
  [/^bones$/, "bones", "☠"],
  [/^trap$/, "trap", "⚙"],
];
const iconKind = (kind: string): string =>
  kind
    .toLowerCase()
    .replace(/\s*\(\d+\)$/, "")
    .replace(/\s*\+\d+$/, "")
    .replace(/\?$/, "")
    .trim()
    .replace(/ /g, "_")
    .replace(/^pack_\d+$/, "pack");
const familyOf = (kind: string): [string, string] => {
  const k = iconKind(kind);
  if (/(?:^|_)potion$/.test(k)) return ["potion", "⚗"];
  if (/(?:^|_)scroll$/.test(k)) return ["scroll", "§"];
  if (k === "pack") return ["pack", "▤"];
  const f = FAMILY.find(([re]) => re.test(k));
  return f ? [f[1], f[2]] : ["misc", "◇"];
};
/** The kind an icon is drawn for: the item's own (`sword`), a potion or scroll by its family (their icons are the flask and the roll). */
export function iconId(kind: string): string | null {
  const k = iconKind(kind);
  if (k === "pack" && hasIcon("loadout")) return "loadout";
  if (hasIcon(`it_${k}`)) return `it_${k}`;
  if (k === "gold" && hasIcon("gold")) return "gold";
  const [fam] = familyOf(k);
  return (fam === "potion" || fam === "scroll") && hasIcon(`it_${fam}`) ? `it_${fam}` : null;
}

type ItemLike = Pick<InvItem, "kind" | "label"> & { rarity?: Rarity };

/** Code-native equipment silhouettes; display metadata never determines item rules. */
function equipmentPrimitive(slot: "helm" | "body" | "boots"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", `item-pic equipment-primitive slot-${slot}`);
  svg.setAttribute("aria-hidden", "true");
  const shapes: Record<typeof slot, string> = /* copy:none */ {
    helm: "M5 15V10L8 5H16L19 10V15H15V20H9V15ZM5 11H19M12 5V15",
    body: "M8 4L12 6L16 4L21 8L18 12L16 10V20H8V10L6 12L3 8ZM8 10H16M12 6V20",
    boots: "M5 4H11V14L14 17V20H3V17L5 14ZM14 4H20V14L22 17V20H16V17L14 14Z",
  };
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", shapes[slot]);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linejoin", "miter");
  svg.append(path);
  return svg;
}

/** The item's unframed silhouette (`.item-ico.r-rare`): the packed picture, else the family glyph. */
export function itemIcon(
  it: ItemLike,
  o: {
    size?: "xs" | "s" | "m" | "l";
    delay?: number;
    equipmentSlot?: "helm" | "body" | "boots";
  } = {},
): HTMLElement {
  const r = it.rarity ?? "common";
  const id = iconId(it.kind);
  const [fam, glyph] = familyOf(it.kind.replace(/ /g, "_"));
  const primitiveSlot =
    o.equipmentSlot ?? (fam === "helm" ? "helm" : fam === "boots" ? "boots" : undefined);
  const fallback = (): HTMLElement | SVGSVGElement =>
    primitiveSlot
      ? equipmentPrimitive(primitiveSlot)
      : h("span", {
          class: `item-pic glyph fam-${fam}`,
          "data-glyph": glyph,
          "aria-hidden": "true",
        });
  const pic = id
    ? h("img", {
        class: "item-pic",
        src: `${import.meta.env.BASE_URL}ui/icons/${id}.png`,
        alt: "",
        draggable: "false",
        "aria-hidden": "true",
        onerror: (e: Event) => (e.currentTarget as HTMLElement).replaceWith(fallback()),
      })
    : fallback();
  const el = h(
    "span",
    {
      class: `item-ico r-${r} sz-${o.size ?? "m"}${rarityRank(r) >= 2 ? " glint" : ""}`,
      "data-rarity": r,
      "data-kind": it.kind,
      title: it.label,
    },
    pic,
  );
  if (o.delay !== undefined) el.style.setProperty("--pop-delay", `${o.delay}ms`);
  return el;
}

/** The item's name tinted by its rarity. */
export const itemName = (it: ItemLike, text = it.label): HTMLElement =>
  h(
    "span",
    { class: `item-name r-${it.rarity ?? "common"}`, "data-rarity": it.rarity ?? "common" },
    text,
  );

/** An item as one chip: icon and tinted name. */
export const itemChip = (it: ItemLike, text = it.label, cls = ""): HTMLElement =>
  h(
    "span",
    {
      class: `item-chip r-${it.rarity ?? "common"}${cls ? ` ${cls}` : ""}`,
      "data-rarity": it.rarity ?? "common",
    },
    itemIcon(it, { size: "s" }),
    itemName(it, text),
  );

/** A row of item icons, rarest first (the core sends them so), its rarity tooltip on the row (docs/TOOLTIPS.md: `rarity`). */
export function itemRow(
  xs: ItemLike[],
  o: { size?: "xs" | "s" | "m" | "l"; pop?: boolean; max?: number } = {},
): HTMLElement | null {
  if (!xs.length) return null;
  const shown = xs.slice(0, o.max ?? 6);
  // finds pop in by rarity: the commonest first, the rarest last (the beat lands on the best)
  const order = [...shown]
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rarityRank(a.x.rarity) - rarityRank(b.x.rarity) || b.i - a.i);
  const delayOf = new Map(order.map((o2, k) => [o2.i, 380 + 160 * k]));
  const row = h(
    "div",
    { class: `item-row${o.pop ? " pop" : ""}` },
    ...shown.map((x, i) =>
      itemIcon(x, { size: o.size, delay: o.pop ? delayOf.get(i) : undefined }),
    ),
  );
  return kwHost(row, "rarity");
}
