import "../home-menu.css";
import type { App } from "../app";
import { h } from "./dom";
import { closeAllSheets, openWindow } from "./sheet";
import { openSettings } from "./settings";
import { openHonours } from "./honours";

/** Home's non-town utilities share one doorway; their existing panels own all actions. */
export function openHomeMenu(
  app: App,
  journal: () => void,
  anchor: HTMLElement,
  opts: { tasks?: HTMLElement; restoreTasks?: () => void } = {},
): void {
  closeAllSheets();
  anchor.focus({ preventScroll: true });
  const focusHome = (): void => {
    const target = anchor.isConnected
      ? anchor
      : document.querySelector<HTMLElement>(".camp [data-home-menu]");
    target?.focus({ preventScroll: true });
  };
  openWindow(
    (close) =>
      h(
        "div",
        { class: "sheet-body home-menu-panel" },
        h("h2", null, /* copy:label */ "Menu"),
        opts.tasks,
        h(
          "button",
          {
            class: "chip home-menu-journal",
            onclick: () => {
              close();
              focusHome();
              journal();
            },
          },
          /* copy:button */ "Journal",
        ),
        app.lineage.honours
          ? h(
              "button",
              {
                class: "chip home-menu-honours",
                onclick: () => {
                  close();
                  focusHome();
                  openHonours(app, anchor);
                },
              },
              /* copy:button */ "Achievements",
              h(
                "span",
                { class: "home-menu-count" },
                ` ${app.lineage.honours.earned}/${app.lineage.honours.total}`,
              ),
            )
          : null,
        h(
          "button",
          {
            class: "chip home-menu-settings",
            onclick: () => {
              close();
              focusHome();
              openSettings(app);
            },
          },
          /* copy:button */ "Settings",
        ),
      ),
    {
      anchor,
      onClose: () => {
        opts.restoreTasks?.();
        focusHome();
      },
    },
  );
}
