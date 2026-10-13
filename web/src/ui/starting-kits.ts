import type { App } from "../app";
import type { StartingConfig, StartingGearChoice } from "../engine/types";
import { h } from "./dom";
import { itemIcon } from "./items";

/** Permanent gear shapes and saved configurations, entirely selected by Rust. */
export function startingKits(app: App, open: ReadonlySet<string> = new Set()): HTMLElement | null {
  const L = app.lineage,
    kits = L.starting_kits,
    owner = app.engine,
    bloodline = L.selected_bloodline;
  if (
    !kits ||
    !owner.setStartingKit ||
    !owner.saveStartingKit ||
    !owner.selectStartingKit ||
    !owner.deleteStartingKit
  )
    return null;
  const away = !!L.live || L.town?.home === false;
  const config: StartingConfig = kits.current ?? {
    weapon: null,
    armour: null,
    supplies: (L.supplies ?? []).map((item) => item.kind),
  };
  const feedback = h("div", { role: "status", class: "loadout-feedback" });
  const body = h("section", { class: "starting-kits", "data-starting-kits": "1" });
  let busy = false;
  const current = (): boolean =>
    body.isConnected && app.engine === owner && app.lineage.selected_bloodline === bloodline;
  const act = (fn: () => ReturnType<NonNullable<typeof owner.setStartingKit>>): void => {
    if (busy || !current() || app.lineage.live || app.lineage.town?.home === false) return;
    busy = true;
    body.setAttribute("aria-busy", "true");
    void app
      .mutate(fn, /* copy:callout */ "Kit changed")
      .then((ok) => {
        if (current() && !ok) feedback.textContent = /* copy:callout */ "Kit refused";
      })
      .finally(() => {
        busy = false;
        body.removeAttribute("aria-busy");
      });
  };
  const choices = (slot: "weapon" | "armour", rows: StartingGearChoice[]): HTMLElement => {
    const choose = (value: string | null): void =>
      act(() => owner.setStartingKit!(JSON.stringify({ ...config, [slot]: value })));
    return h(
      "details",
      { class: "starting-gear", open: open.has(slot), "data-starting-gear": slot },
      h("summary", null, slot === "weapon" ? /* copy:label */ "Weapon" : /* copy:label */ "Armour"),
      h(
        "button",
        {
          class: "chip",
          disabled: away,
          "data-kit-slot": slot,
          "data-kit-choice": "default",
          "aria-pressed": String(config[slot] === null),
          onclick: () => choose(null),
        },
        /* copy:button */ "Class default",
      ),
      slot === "armour"
        ? h(
            "button",
            {
              class: "chip",
              disabled: away,
              "data-kit-slot": slot,
              "data-kit-choice": "none",
              "aria-pressed": String(config.armour === "none"),
              onclick: () => choose("none"),
            },
            /* copy:button */ "Bare",
          )
        : null,
      ...rows.map((row) =>
        h(
          "div",
          { class: "game-inset starting-gear-row" },
          h(
            "button",
            {
              class: "chip",
              disabled: away || !row.available || !row.compatible,
              "data-kit-slot": slot,
              "data-kit-choice": row.kind,
              "aria-pressed": String(config[slot] === row.kind),
              onclick: () => choose(row.kind),
            },
            itemIcon({ kind: row.kind, label: row.label }, { size: "s" }),
            row.label,
          ),
          h(
            "small",
            { class: "num" },
            slot === "weapon"
              ? `${row.damage[0]}–${row.damage[1]} base damage`
              : `${row.armour} base armour`,
            ` · ${row.speed >= 0 ? "+" : ""}${row.speed} speed`,
            row.ranged ? /* copy:label */ " · Ranged" : "",
          ),
          h("small", { class: "dim" }, row.needs ?? /* copy:label */ "Free"),
        ),
      ),
    );
  };
  const selected = kits.saved.find((kit) => kit.id === kits.selected);
  const name = h("input", {
    type: "text",
    maxlength: 32,
    value: selected?.name ?? "",
    "aria-label": /* copy:label */ "Kit name",
    placeholder: /* copy:label */ "Kit name",
    disabled: away,
  });
  body.append(
    h("h3", null, /* copy:label */ "Starting gear"),
    h(
      "p",
      { class: "num" },
      kits.actual_weapon.replace(/_/g, " "),
      " · ",
      kits.actual_armour?.replace(/_/g, " ") ?? /* copy:label */ "Bare",
    ),
    h(
      "small",
      { class: "dim" },
      /* copy:diary_line */ "Base values. Forge upgrades apply to each kit.",
    ),
    choices("weapon", kits.weapons),
    choices("armour", kits.armours),
    h("h4", null, /* copy:label */ "Saved kits"),
    h(
      "div",
      {
        class: "num",
        "data-selected-kit": kits.selected ?? (kits.current ? "custom" : "defaults"),
      },
      selected?.name ??
        (kits.current ? /* copy:label */ "Custom" : /* copy:label */ "Class default"),
    ),
    ...kits.saved.map((kit) =>
      h(
        "div",
        { class: "game-inset saved-kit", "data-saved-kit": kit.id },
        h("b", null, kit.name),
        h(
          "button",
          {
            class: "chip",
            disabled: away,
            "aria-pressed": String(kits.selected === kit.id),
            onclick: () => act(() => owner.selectStartingKit!(kit.id)),
          },
          /* copy:button */ "Use",
        ),
        h(
          "button",
          {
            class: "chip",
            disabled: away,
            onclick: () => act(() => owner.deleteStartingKit!(kit.id)),
          },
          /* copy:button */ "Delete",
        ),
      ),
    ),
    h(
      "form",
      {
        class: "kit-save",
        onsubmit: (event: Event) => {
          event.preventDefault();
          if (!name.value.trim()) {
            feedback.textContent = /* copy:callout */ "Name kit";
            return;
          }
          act(() =>
            owner.saveStartingKit!(
              name.value.trim(),
              JSON.stringify(config),
              kits.selected ?? undefined,
            ),
          );
        },
      },
      name,
      h(
        "button",
        { class: "chip", type: "submit", disabled: away },
        selected ? /* copy:button */ "Update kit" : /* copy:button */ "Save kit",
      ),
    ),
    h(
      "button",
      {
        class: "chip",
        disabled: away,
        "data-kit-reset": "1",
        onclick: () => act(() => owner.setStartingKit!("null")),
      },
      /* copy:button */ "Use defaults",
    ),
    feedback,
  );
  return body;
}
