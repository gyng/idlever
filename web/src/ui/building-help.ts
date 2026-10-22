import type { Lineage } from "../engine/types";
import { h } from "./dom";
import { workerWithAside } from "./works";

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
    purpose: /* copy:tooltip */ "Permanent gear upgrades · unlocked gear is free to reuse",
    action: /* copy:tooltip */ "Inspect gear and prices · building unlocks free leashes",
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
  // Owner 2026-10-22: an unbuilt building's tip reads `Build Forge` · its purpose · who it later houses (`Later hires an apprentice (…)`);
  // the staff and their roles are the wire's (`Town.workplaces`, `Works.nodes`)
  const staffId = standing ? undefined : town?.workplaces?.find((w) => w.id === id)?.staff?.[0];
  const staff = staffId ? L.tree?.nodes.find((n) => n.id === staffId) : undefined;
  const later = standing
    ? null
    : staff
      ? /* copy:tooltip */ `Later hires ${workerWithAside(staff)}`
      : id === "house"
        ? /* copy:tooltip */ "A resident moves in"
        : null;
  return [
    h(
      "div",
      { class: "kw-tip-head" },
      h("b", null, standing ? PURPOSE[id].name : /* copy:tooltip */ `Build ${PURPOSE[id].name}`),
    ),
    h("div", { class: "kw-tip-gloss" }, PURPOSE[id].purpose),
    later ? h("div", { class: "kw-tip-gloss" }, later) : null,
    h(
      "div",
      { class: "building-help-state num" },
      status,
      standing && building ? ` · Level ${building.level}` : "",
    ),
    requirement
      ? h("div", { class: "kw-tip-gloss" }, /* copy:tooltip */ `Requires: ${requirement}`)
      : null,
    // Cut 228: the Forge's present work, read from Rust (`Town.forge_work`)
    id === "blacksmith" && standing && town?.forge_work
      ? h(
          "div",
          { class: "kw-tip-gloss", "data-forge-work": town.forge_work.step },
          /* copy:callout */ `Forging ${town.forge_work.step}`,
        )
      : null,
    // (an unbuilt plot's status and requirement say what raises it; its old how-to line would be a fourth gloss)
    standing ? h("div", { class: "kw-tip-gloss" }, PURPOSE[id].action) : null,
  ].filter((n): n is HTMLDivElement => !!n);
}
