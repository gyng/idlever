import type { App } from "../app";
import type { ArmourSlot, StartingConfig, StartingGearChoice } from "../engine/types";
import { h } from "./dom";
import { itemIcon } from "./items";
import { legendaryDescription } from "./legendary-gear";
import { armourSets } from "./set-equipment";

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
  const identity = (): string =>
    JSON.stringify([
      app.lineage.selected_bloodline,
      app.lineage.persistent_hero?.id,
      app.lineage.persistent_hero?.incarnation,
    ]);
  const actor = identity();
  const config: StartingConfig = kits.current ?? {
    weapon: null,
    armour: null,
    supplies: (L.supplies ?? []).map((item) => item.kind),
  };
  const feedback = h("div", { role: "status", class: "loadout-feedback" });
  const body = h("section", { class: "starting-kits", "data-starting-kits": "1" });
  let busy = false;
  const current = (): boolean =>
    body.isConnected &&
    app.engine === owner &&
    app.lineage.selected_bloodline === bloodline &&
    identity() === actor;
  const act = (
    fn: () => ReturnType<NonNullable<typeof owner.setStartingKit>>,
    allowAway = false,
    message = /* copy:callout */ "Kit changed",
  ): void => {
    if (
      busy ||
      !current() ||
      (!allowAway && (app.lineage.live || app.lineage.town?.home === false))
    )
      return;
    busy = true;
    body.setAttribute("aria-busy", "true");
    void app
      .mutate(fn, message)
      .then((ok) => {
        if (current() && !ok) feedback.textContent = /* copy:callout */ "Kit refused";
      })
      .finally(() => {
        busy = false;
        body.removeAttribute("aria-busy");
      });
  };
  const choices = (slot: "weapon" | ArmourSlot, rows: StartingGearChoice[]): HTMLElement => {
    const choose = (value: string | null): void =>
      act(() => owner.setStartingKit!(JSON.stringify({ ...config, [slot]: value })));
    return h(
      "details",
      { class: "starting-gear", open: open.has(slot), "data-starting-gear": slot },
      h(
        "summary",
        null,
        slot === "weapon"
          ? /* copy:label */ "Weapon"
          : slot === "armour"
            ? /* copy:label */ "Body"
            : slot === "helm"
              ? /* copy:label */ "Helm"
              : /* copy:label */ "Boots",
      ),
      h("small", {}, /* copy:label */ "Saved fallback"),
      h(
        "button",
        {
          class: "chip",
          disabled: away,
          "data-kit-slot": slot,
          "data-kit-choice": "default",
          "aria-pressed": String(config[slot] == null),
          onclick: () => choose(null),
        },
        /* copy:button */ "Class default",
      ),
      slot !== "weapon"
        ? h(
            "button",
            {
              class: "chip",
              disabled: away,
              "data-kit-slot": slot,
              "data-kit-choice": "none",
              "aria-pressed": String(config[slot] === "none"),
              onclick: () => choose("none"),
            },
            slot === "armour" ? /* copy:button */ "Bare" : /* copy:button */ "Empty",
          )
        : null,
      slot !== "weapon"
        ? h(
            "button",
            {
              class: "chip",
              disabled: away,
              "data-pin-slot": slot,
              "data-pin-choice": "none",
              "data-action": `pin:${slot}:none`,
              "aria-pressed": String(config.pins?.[slot] === "none"),
              onclick: () => {
                const pins = { ...config.pins };
                if (pins[slot] === "none") delete pins[slot];
                else pins[slot] = "none";
                act(() => owner.setStartingKit!(JSON.stringify({ ...config, pins })));
              },
            },
            config.pins?.[slot] === "none"
              ? /* copy:button */ "Unpin empty"
              : /* copy:button */ "Pin empty",
          )
        : null,
      ...rows.map((row) =>
        h(
          "div",
          {
            class: `game-inset starting-gear-row${row.legendary ? " legendary-choice" : ""}`,
            "data-legendary-choice": row.legendary ? row.kind : undefined,
          },
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
            itemIcon(
              { kind: row.kind, label: row.label, rarity: row.legendary ? "legendary" : undefined },
              {
                size: "s",
                equipmentSlot: slot === "weapon" ? undefined : slot === "armour" ? "body" : slot,
              },
            ),
            row.label,
          ),
          h(
            "small",
            { class: "num" },
            slot === "weapon" ? `${row.damage[0]}–${row.damage[1]} damage` : `${row.armour} armour`,
            ` · ${row.speed >= 0 ? "+" : ""}${row.speed} speed`,
            row.ranged ? /* copy:label */ " · Ranged" : "",
          ),
          h("small", { class: "dim" }, row.needs ?? /* copy:label */ "Free"),
          slot !== "weapon"
            ? h(
                "div",
                { class: "set-slot-actions" },
                h(
                  "small",
                  { class: "set-pin-status" },
                  config.pins?.[slot] === row.kind
                    ? /* copy:label */ "Pinned"
                    : config[slot] === row.kind
                      ? /* copy:label */ "Saved fallback"
                      : "",
                ),
                h(
                  "button",
                  {
                    class: "chip",
                    disabled: away || !row.available || !row.compatible,
                    "data-pin-slot": slot,
                    "data-pin-choice": row.kind,
                    "data-action": `pin:${slot}:${row.kind}`,
                    "aria-pressed": String(config.pins?.[slot] === row.kind),
                    onclick: () => {
                      const pins = { ...config.pins };
                      if (pins[slot] === row.kind) delete pins[slot];
                      else pins[slot] = row.kind;
                      act(() => owner.setStartingKit!(JSON.stringify({ ...config, pins })));
                    },
                  },
                  config.pins?.[slot] === row.kind
                    ? /* copy:button */ "Unpin"
                    : /* copy:button */ "Pin",
                ),
              )
            : null,
          row.legendary ? legendaryDescription(row) : null,
        ),
      ),
    );
  };
  const selected = kits.saved.find((kit) => kit.id === kits.selected);
  const weaponLabel =
    kits.weapons.find((row) => row.kind === kits.actual_weapon)?.label ??
    kits.actual_weapon.replace(/_/g, " ");
  const armourLabel = kits.actual_armour
    ? (kits.armours.find((row) => row.kind === kits.actual_armour)?.label ??
      kits.actual_armour.replace(/_/g, " "))
    : /* copy:label */ "Bare";
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
    h("p", { class: "num" }, weaponLabel, " · ", armourLabel),
    h(
      "small",
      { class: "dim" },
      /* copy:diary_line */ "Forge upgrades included. Hero attributes stay separate.",
    ),
    ...[
      armourSets(
        app,
        kits.armour_sets ?? [],
        {
          config,
          disabled: away,
          focusDisabled: !owner.setSetFocus,
          change: (next) => act(() => owner.setStartingKit!(JSON.stringify(next))),
          focus: (family) => {
            if (owner.setSetFocus)
              act(() => owner.setSetFocus!(family), true, /* copy:callout */ "Focus changed");
          },
        },
        open,
      ),
    ].filter((node): node is HTMLElement => node !== null),
    choices("weapon", kits.weapons),
    choices("helm", kits.helms ?? []),
    choices("armour", kits.armours),
    choices("boots", kits.boots ?? []),
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
