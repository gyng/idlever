// Cut 5 §2: the lineage chronicle — one line per ended heir, from the core (`Lineage.chronicle`, cap 40),
// newest first, core text preserved beside historical identity art. A core without the field shows an empty sheet.
// Cut 9 §7: a line whose heir's grave carries `death_id` (the core keeps the last 5 deaths' traces) is a button that opens
// that death (trace + patches, `engine.death(id)`); every other line stays plain text.
import type { App } from "../app";
import type { Lineage } from "../engine/types";
import { h } from "./dom";
import { unitLabel } from "./unit-icon";
import { closeAllSheets, openWindow as openSheet } from "./sheet";

/** The kept death behind a chronicle line: the line's `♟N` names the heir, the newest grave of that heir carries the id. */
export function keptDeath(L: Lineage, line: string): number | undefined {
  const heir = Number(/^♟(\d+)/.exec(line)?.[1]);
  if (!heir) return undefined;
  const grave = [...(L.graveyard ?? [])].reverse().find((g) => g.heir === heir);
  return grave?.death_id;
}

/** Older records carry the class in their own header; never use the live heir. */
function heroLabel(
  line: string,
  hero?: NonNullable<Lineage["hero_legacy"]>[number],
): Node | string {
  const text = hero?.name ? `${hero.name} · ${line}` : line;
  const cls = hero?.class || /^♟\d+ the \S+ ([a-z_]+) ·/.exec(line)?.[1];
  return cls ? unitLabel(cls, text, { hero: true, px: 32 }) : text;
}

/** An empty archive describes its real scope and offers useful current navigation. */
export function chronicleEmpty(app: App): HTMLElement {
  const L = app.lineage;
  const slot = L.hero_slots?.find((s) => s.id === L.selected_bloodline);
  const hero = slot?.hero_name || L.hero_legacy?.find((h) => h.heir === L.heir)?.name;
  const identity = [slot?.name, hero].filter(Boolean).join(" · ");
  return h(
    "section",
    { class: "chronicle-empty game-inset", "data-bloodline": L.selected_bloodline ?? 1 },
    h("b", null, /* copy:label */ "No records"),
    identity ? h("div", { class: "chronicle-identity" }, identity) : "",
    h(
      "p",
      null,
      /* copy:diary_line */ "This book records ended heirs.",
      " ",
      /* copy:diary_line */ "Completed delves appear in Runs.",
    ),
    h(
      "div",
      { class: "chips" },
      h(
        "button",
        {
          class: "btn",
          onclick: () => {
            closeAllSheets();
            void import("./town").then(({ openHero }) => openHero(app));
          },
        },
        /* copy:button */ "Current hero",
      ),
      h(
        "button",
        {
          class: "btn",
          onclick: () => {
            closeAllSheets();
            void import("./runs").then(({ openRuns }) => openRuns(app, { tab: "runs" }));
          },
        },
        /* copy:button */ "Runs",
      ),
    ),
  );
}

export function openChronicle(app: App): void {
  openSheet(() => {
    const L = app.lineage;
    const others = (L.hero_slots ?? []).filter(
      (s) => s.id !== L.selected_bloodline && (s.chronicle?.length ?? 0) > 0,
    );
    const lines = [...(L.chronicle ?? [])].reverse();
    return h(
      "div",
      { class: "sheet-body" },
      h("div", { class: "label" }, /* copy:label */ "chronicle"),
      h(
        "div",
        { class: "chronicle" },
        ...(lines.length ? [] : [chronicleEmpty(app)]),
        ...others.map((s) =>
          h(
            "section",
            null,
            h("b", null, s.name),
            ...(s.chronicle ?? [])
              .slice()
              .reverse()
              .map((line) =>
                h(
                  "button",
                  {
                    class: "cline game-inset",
                    onclick: () =>
                      void app.selectBloodline(s.id).then((ok) => {
                        if (ok) openChronicle(app);
                      }),
                  },
                  heroLabel(line),
                ),
              ),
          ),
        ),
        ...lines.map((line) => {
          const heir = Number(/^♟(\d+)/.exec(line)?.[1]);
          const text = heroLabel(
            line,
            L.hero_legacy?.find((h) => h.heir === heir),
          );
          const id = keptDeath(L, line);
          if (id === undefined) return h("div", { class: "cline" }, text);
          return h(
            "button",
            {
              class: "cline kept game-inset",
              onclick: () => {
                void app
                  .busy(/* copy:label */ "verdict", () => app.engine.death(id))
                  .then((death) => {
                    closeAllSheets();
                    app.go({ kind: "death", death, kept: true });
                  })
                  .catch((e) => console.warn("kept death", e));
              },
            },
            text,
            h("small", { class: "dim" }, " ▸"),
          );
        }),
      ),
    );
  });
}
