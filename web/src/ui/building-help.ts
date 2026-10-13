import type { Lineage } from "../engine/types";
import { h } from "./dom";

/** Purpose belongs to the building; availability is always read from Rust's town wire. */
export const HOME_BUILDINGS = /* copy:none */ ["house", "blacksmith", "kennel", "bank"] as const;
export type HomeBuilding = (typeof HOME_BUILDINGS)[number];
/* copy:tooltip */
const PURPOSE: Record<HomeBuilding, { name: string; purpose: string; action: string }> = {
  house: {
    name: "House",
    purpose: /* copy:tooltip */ "Hero residence between delves",
    action: /* copy:tooltip */ "Hero details · class · run history",
  },
  blacksmith: {
    name: "Forge",
    purpose: /* copy:tooltip */ "Starting gear upgrades for future delves",
    action: /* copy:tooltip */ "Inspect available upgrades and prices",
  },
  kennel: {
    name: "Kennel",
    purpose: /* copy:tooltip */ "Home for tamed companions",
    action: /* copy:tooltip */ "Choose companions to join the hero",
  },
  bank: {
    name: "Bank",
    purpose: /* copy:tooltip */ "Savings earn interest · separate from spendable gold",
    action: /* copy:tooltip */ "Inspect savings and capacity · deposit or withdraw",
  },
};
export function buildingName(id: HomeBuilding): string {
  return PURPOSE[id].name;
}
export function buildingDetails(L: Lineage, id: HomeBuilding): Node[] {
  const town = L.town,
    building = town?.buildings.find((b) => b.id === id);
  const standing = id === "house" ? !!town?.home : !!building;
  const next = town?.next === id;
  const status = standing
    ? /* copy:tooltip */ "Built"
    : next && town?.next_ready
      ? /* copy:tooltip */ "Ready to build · Free"
      : /* copy:tooltip */ "Locked";
  const requirement = !standing && next ? town?.next_trigger : undefined;
  return [
    h("div", { class: "kw-tip-head" }, h("b", null, PURPOSE[id].name)),
    h("div", { class: "kw-tip-gloss" }, PURPOSE[id].purpose),
    h(
      "div",
      { class: "building-help-state num" },
      status,
      standing && building ? ` · Level ${building.level}` : "",
    ),
    requirement
      ? h("div", { class: "kw-tip-gloss" }, /* copy:tooltip */ `Requires: ${requirement}`)
      : null,
    h(
      "div",
      { class: "kw-tip-gloss" },
      standing
        ? PURPOSE[id].action
        : next && town?.next_ready
          ? /* copy:tooltip */ "Construct with Build · opening help spends nothing"
          : /* copy:tooltip */ "Meet the requirement to unlock construction",
    ),
  ].filter((n): n is HTMLDivElement => !!n);
}
