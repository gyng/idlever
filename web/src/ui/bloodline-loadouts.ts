import type { App } from "../app";
import type { SupplyEntry } from "../engine/types";
import { h, replace } from "./dom";
import { itemIcon, itemName } from "./items";
import { startingKits } from "./starting-kits";

/** Existing prepared copies only; permanent unlocks remain in Forge. */
export function renderBloodlineLoadouts(app: App, open?: ReadonlySet<string>): HTMLElement {
  const L = app.lineage;
  const owner = app.engine;
  const slot = L.selected_bloodline;
  const picks = L.supplies ?? [];
  const cap = L.supply_cap;
  const away = !!L.live || L.town?.home === false;
  const full = cap === undefined || picks.length >= cap;
  const feedback = h("div", { role: "status", class: "loadout-feedback" });
  const catalogue = h("div", { class: "bloodline-catalogue" });
  const current = (): boolean =>
    catalogue.isConnected && app.engine === owner && app.lineage.selected_bloodline === slot;
  const authored = L.starting_kits?.current;
  const paint = (rows: SupplyEntry[]): void => {
    if (!current()) return;
    replace(
      catalogue,
      ...rows.map((e) =>
        h(
          "button",
          {
            class: "btn bloodline-prepare",
            "data-prepare-kind": e.kind,
            disabled: away || full || !!e.needs || e.price !== 0,
            title: away
              ? /* copy:tooltip */ "Hero away — change the next kit at home"
              : full
                ? cap === undefined
                  ? /* copy:tooltip */ "Slot information unavailable"
                  : /* copy:tooltip */ "Prepared slots full"
                : e.needs || /* copy:tooltip */ "Free unlocked preparation",
            onclick: () => {
              if (!current() || app.lineage.live || app.lineage.town?.home === false) return;
              void app.mutate(
                () =>
                  authored && owner.setStartingKit
                    ? owner.setStartingKit(
                        JSON.stringify({ ...authored, supplies: [...authored.supplies, e.kind] }),
                      )
                    : owner.buySupply(e.kind),
                /* copy:callout */ "Prepared",
              );
            },
          },
          itemIcon({ kind: e.kind, label: e.label }, { size: "s" }),
          e.label,
          h("small", { class: "dim" }, e.needs || /* copy:label */ "Free"),
        ),
      ),
    );
  };
  let request = 0;
  const fetch = (): void => {
    if (!current()) return;
    const asked = ++request;
    feedback.textContent = /* copy:label */ "Loading choices";
    void owner
      .supplyCatalogue()
      .then((rows) => {
        if (!current() || asked !== request) return;
        feedback.textContent = "";
        paint(rows);
      })
      .catch(() => {
        if (!current() || asked !== request) return;
        feedback.textContent = /* copy:callout */ "Choices unavailable";
        replace(
          catalogue,
          h("button", { class: "btn", onclick: fetch }, /* copy:button */ "Retry"),
        );
      });
  };
  const body = h(
    "section",
    { class: "bloodline-loadouts" },
    startingKits(app, open),
    h(
      "div",
      { class: "label row-label" },
      /* copy:label */ "Prepared kit",
      h("span", { class: "num" }, `${picks.length}/${cap ?? "—"}`),
    ),
    h("p", null, /* copy:diary_line */ "Unlocked items are free to prepare and reuse."),
    away ? h("div", { class: "dim", role: "status" }, /* copy:callout */ "Change at home") : null,
    h(
      "div",
      { class: "bloodline-prepared" },
      ...picks.map((p) =>
        h(
          "div",
          { class: "game-inset loadout-copy", "data-prepared-id": p.id },
          itemIcon(p, { size: "s" }),
          itemName(p),
          h(
            "button",
            {
              class: "chip",
              disabled: away,
              "aria-label": /* copy:button */ "Remove item",
              "data-drop-id": p.id,
              onclick: () => {
                if (current() && !app.lineage.live && app.lineage.town?.home !== false)
                  if (
                    authored &&
                    owner.setStartingKit &&
                    !p.free &&
                    authored.supplies.includes(p.kind)
                  ) {
                    const supplies = [...authored.supplies];
                    supplies.splice(supplies.indexOf(p.kind), 1);
                    void app.mutate(
                      () => owner.setStartingKit!(JSON.stringify({ ...authored, supplies })),
                      /* copy:callout */ "Kit changed",
                    );
                  } else void app.dropSupply(p.id);
              },
            },
            /* copy:button */ "Remove",
          ),
        ),
      ),
    ),
    !picks.length ? h("div", { class: "dim" }, /* copy:label */ "No preparations") : null,
    h(
      "button",
      {
        class: "btn bloodline-reuse",
        "aria-pressed": String(L.repeat !== false),
        disabled: away || !owner.setRestock,
        onclick: () => {
          if (current() && !app.lineage.live && app.lineage.town?.home !== false)
            void app.mutate(
              () => owner.setRestock!(app.lineage.repeat === false),
              /* copy:callout */ "Reuse changed",
            );
        },
      },
      L.repeat !== false ? /* copy:button */ "Reuse on" : /* copy:button */ "Reuse off",
    ),
    catalogue,
    feedback,
  );
  queueMicrotask(fetch);
  return body;
}
