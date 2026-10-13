import type { App } from "../app";
import type { ArmourBonus, ArmourEquipment, ArmourSet, StartingConfig } from "../engine/types";
import { h } from "./dom";
import { itemIcon } from "./items";
import { openSetLoadout } from "./legendary-gear";
import "../set-equipment.css";

type Actions = {
  config: StartingConfig;
  disabled: boolean;
  focusDisabled: boolean;
  change: (config: StartingConfig) => void;
  focus: (family: string | null) => void;
};
const slotLabel = (slot: ArmourEquipment["slot"]): string =>
  slot === "armour"
    ? /* copy:label */ "Body"
    : slot === "helm"
      ? /* copy:label */ "Helm"
      : /* copy:label */ "Boots";
const originLabel = (origin: ArmourEquipment["origin"]): string =>
  ({
    pin: /* copy:label */ "Pinned",
    follow: /* copy:label */ "Following",
    fallback: /* copy:label */ "Fallback",
    default: /* copy:label */ "Class default",
    equipped: /* copy:label */ "Equipped",
  })[origin];
function bonuses(rows: readonly ArmourBonus[], phase: "current" | "next"): HTMLElement {
  return h(
    "div",
    { class: "set-bonuses", "data-set-bonuses": phase },
    ...rows.map((row) =>
      h(
        "div",
        { class: "set-bonus", "data-active": String(row.active), "data-required": row.required },
        h("b", {}, `${row.required}/3 · ${row.label}`),
        h(
          "span",
          { class: "set-bonus-status" },
          row.active ? /* copy:label */ "Active" : /* copy:label */ "Inactive",
        ),
        h("p", {}, row.effect),
      ),
    ),
  );
}
function equipment(rows: readonly ArmourEquipment[], phase: "current" | "next"): HTMLElement {
  return h(
    "div",
    { class: "set-equipment-slots", "data-set-equipment": phase },
    ...rows.map((row) =>
      h(
        "div",
        { class: "set-equipment-line", "data-set-slot": row.slot, "data-origin": row.origin },
        h("b", {}, slotLabel(row.slot)),
        h("span", {}, row.label),
        h("small", {}, originLabel(row.origin)),
      ),
    ),
  );
}

/** Every count, effect, activation and source state is read from Rust. */
export function armourSets(
  app: App,
  rows: readonly ArmourSet[],
  actions?: Actions,
  open: ReadonlySet<string> = new Set(),
): HTMLElement | null {
  if (!rows.length) return null;
  const engine = app.engine;
  const identity = JSON.stringify([
    app.lineage.selected_bloodline,
    app.lineage.persistent_hero?.id,
    app.lineage.persistent_hero?.incarnation,
  ]);
  const current = (): boolean =>
    engine === app.engine &&
    identity ===
      JSON.stringify([
        app.lineage.selected_bloodline,
        app.lineage.persistent_hero?.id,
        app.lineage.persistent_hero?.incarnation,
      ]);
  return h(
    "section",
    { class: "set-collection", "data-set-collection": "1" },
    h("h3", {}, /* copy:label */ "Armour sets"),
    ...rows.map((set) => {
      const followed = actions?.config.follow_set === set.id;
      return h(
        "article",
        { class: "set-family", "data-set-family": set.id, tabindex: -1 },
        h("h3", {}, set.label),
        h(
          "div",
          { class: "set-counts" },
          h(
            "span",
            { "data-set-count": "current" },
            /* copy:label */ "Current",
            ` ${set.actual_count}/3`,
          ),
          h(
            "span",
            { "data-set-count": "next" },
            /* copy:label */ "Next delve",
            ` ${set.next_count}/3`,
          ),
        ),
        actions
          ? h(
              "div",
              { class: "set-intent" },
              h(
                "button",
                {
                  class: "chip set-follow-choice",
                  disabled: actions.disabled,
                  "data-follow-set": set.id,
                  "data-action": `follow:${set.id}`,
                  "aria-pressed": String(followed),
                  onclick: () =>
                    actions.change({ ...actions.config, follow_set: followed ? null : set.id }),
                },
                followed ? /* copy:button */ "Stop following" : /* copy:button */ "Follow set",
              ),
              h("p", {}, /* copy:diary_line */ "Owned pieces apply next delve. Pins stay fixed."),
              h(
                "div",
                { class: "set-source-focus", "data-set-focus": set.id },
                h("b", {}, set.focus.label),
                h("p", { role: "status" }, set.focus.status),
                set.focus.source
                  ? h(
                      "small",
                      {},
                      set.focus.source,
                      set.focus.depth === null ? "" : ` · D${set.focus.depth}`,
                    )
                  : null,
                set.focus.blocked ? h("small", {}, set.focus.blocked) : null,
                h(
                  "button",
                  {
                    class: "chip",
                    disabled: actions.focusDisabled || (!set.focus.active && !set.focus.available),
                    "data-source-focus": set.id,
                    "data-action": `focus:${set.id}`,
                    "aria-pressed": String(set.focus.active),
                    onclick: () => actions.focus(set.focus.active ? null : set.id),
                  },
                  set.focus.active
                    ? /* copy:button */ "Stop focus"
                    : /* copy:button */ "Find piece",
                ),
              ),
            )
          : h(
              "button",
              {
                class: "btn",
                "data-set-link": set.id,
                onclick: (event) => {
                  if (current())
                    void openSetLoadout(app, set.id, event.currentTarget as HTMLElement);
                },
              },
              /* copy:button */ "Loadouts",
            ),
        h(
          "details",
          {
            class: "set-current",
            "data-starting-gear": `set:${set.id}:current`,
            open: open.has(`set:${set.id}:current`),
          },
          h("summary", {}, /* copy:label */ "Current gear"),
          equipment(set.actual, "current"),
          bonuses(set.actual_bonuses, "current"),
        ),
        h(
          "details",
          {
            class: "set-next",
            "data-starting-gear": `set:${set.id}:next`,
            open: open.has(`set:${set.id}:next`),
          },
          h("summary", {}, /* copy:label */ "Next gear"),
          equipment(set.next, "next"),
          bonuses(set.next_bonuses, "next"),
        ),
        h(
          "div",
          { class: "set-pieces" },
          ...set.pieces.map((piece) =>
            h(
              "div",
              {
                class: "set-piece",
                "data-set-piece": piece.kind,
                "data-owned": String(piece.owned),
              },
              h(
                "b",
                {},
                itemIcon(
                  { kind: piece.kind, label: piece.label, rarity: "legendary" },
                  { size: "s", equipmentSlot: piece.slot === "armour" ? "body" : piece.slot },
                ),
                piece.label,
              ),
              h(
                "span",
                {},
                slotLabel(piece.slot),
                " · ",
                piece.owned ? /* copy:label */ "Owned" : /* copy:label */ "Undiscovered",
              ),
              piece.blocked ? h("small", {}, piece.blocked) : null,
              h("small", {}, piece.source),
              !piece.owned
                ? h(
                    "small",
                    { class: "num", "data-source-protection": piece.kind },
                    /* copy:label */ "Eligible wins",
                    ` ${piece.victories}/${piece.guaranteed_by}`,
                  )
                : null,
            ),
          ),
        ),
      );
    }),
  );
}
