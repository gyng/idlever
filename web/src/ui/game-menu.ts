import "../game-menu.css";
import { start, type App, type DevOptions } from "../app";
import { clearBlob, readBlob } from "../store";
import { audio } from "../audio";
import { h, replace } from "./dom";
import { closeEverything } from "./sheet";
import { applySkin } from "./skin";
import { openSettings, preferenceRows } from "./settings";
import { effectsLevel } from "../render/fxpref";

/** Title only on a genuinely new visit; saved towns keep the normal boot/catch-up. */
export function bootWithMenu(dev: DevOptions | null): void {
  applySkin();
  audio.arm();
  // A confirmed restart boots a clean App/worker; pagehide may flush the old
  // session, so clearing happens on the receiving page, after that flush.
  let restarting = false;
  try { restarting = sessionStorage.getItem("riddle.newGame") === "1"; sessionStorage.removeItem("riddle.newGame"); } catch { /* storage unavailable */ }
  if (restarting) { clearBlob(); if (dev) dev = { ...dev, fresh: true, seed: undefined, absent: undefined, rules: undefined, autosend: undefined }; }
  const saved = !dev?.fresh && !!readBlob();
  let app: App | undefined;
  let menu: HTMLElement | null = null;
  let pane = "main", busy = false;
  let returnFocus: HTMLElement | null = null;
  const root = document.getElementById("app")!;
  const syncAtmosphere = (): void => {
    if (!menu) return;
    menu.dataset.effects = effectsLevel();
    menu.dataset.hidden = String(document.hidden);
  };
  window.addEventListener("riddle:effects", syncAtmosphere);
  window.addEventListener("storage", syncAtmosphere);
  document.addEventListener("visibilitychange", syncAtmosphere);
  const play = (): void => {
    closeEverything();
    menu?.remove(); menu = null;
    root.inert = false; root.removeAttribute("aria-hidden"); root.style.visibility = "";
    document.body.classList.remove("menu-open");
    if (!app) app = start(dev);
    if (returnFocus?.isConnected) returnFocus.focus();
    else { root.tabIndex = -1; root.focus({ preventScroll: true }); }
  };
  const show = (): void => {
    if (menu) {
      closeEverything(); menu.inert = false; menu.removeAttribute("aria-hidden"); render("main"); return;
    }
    if (app && !app.booted) return;
    closeEverything();
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.inert = true; root.setAttribute("aria-hidden", "true"); root.style.visibility = "hidden";
    document.body.classList.add("menu-open");
    menu = h("section", { class: "game-menu", role: "dialog", "aria-modal": "true", "aria-label": /* copy:label */ "Main menu" });
    document.body.append(menu); render("main");
  };
  const action = (label: string, act: () => void, cls = ""): HTMLButtonElement =>
    h("button", { class: `menu-action ${cls}`, onclick: act }, label);
  const render = (next: string): void => {
    if (!menu) return;
    pane = next;
    const heading = next === "settings" ? /* copy:label */ "Settings" : next === "credits" ? /* copy:label */ "Credits" : next === "new" ? /* copy:label */ "Replace save" : /* copy:label */ "Riddle";
    const title = h("h1", { class: "menu-title", id: "menu-title" }, heading);
    menu.setAttribute("aria-labelledby", "menu-title");
    const content = h("div", { class: "menu-panel" }, title);
    if (next === "main") {
      content.append(h("div", { class: "menu-kicker" }, /* copy:label */ "Idle roguelike"));
      if (app || saved) content.append(action(/* copy:button */ "Continue", play, "primary"));
      content.append(action(/* copy:button */ "New game", () => app || saved ? render("new") : play(), app || saved ? "" : "primary"),
        action(/* copy:button */ "Settings", () => render("settings")), action(/* copy:button */ "Credits", () => render("credits")));
      if (app) content.append(h("div", { class: "menu-note" }, /* copy:label */ "Runs continue"));
    } else if (next === "settings") {
      content.append(h("div", { class: "settings menu-preferences" }, ...preferenceRows(app)));
      if (app) content.append(action(/* copy:button */ "Save & data", () => {
        const owner = menu!; owner.inert = true; owner.setAttribute("aria-hidden", "true");
        openSettings(app!);
        const observer = new MutationObserver(() => {
          if (document.querySelector(".sheet-wrap")) return;
          observer.disconnect(); owner.inert = false; owner.removeAttribute("aria-hidden");
          if (menu === owner) owner.querySelector<HTMLButtonElement>("button")?.focus();
        });
        observer.observe(document.body, { childList: true });
      }));
      content.append(action(/* copy:button */ "Back", () => render("main")));
    } else if (next === "credits") {
      content.append(h("div", { class: "menu-credit" }, /* copy:label */ "Game", h("span", null, /* copy:label */ "Riddle")),
        h("div", { class: "menu-credit" }, /* copy:label */ "Typography", h("span", null, /* copy:label */ "Grenze"), h("span", null, /* copy:label */ "Fira Sans")),
        action(/* copy:button */ "Back", () => render("main")));
    } else {
      content.append(h("div", { class: "menu-note" }, /* copy:callout */ "Current town erased"),
        action(/* copy:button */ "Cancel", () => render("main")), action(/* copy:button */ "Start over", () => {
          if (busy) return;
          if (!app) { clearBlob(); play(); return; }
          if (app.engineBusy) { replace(content.querySelector(".menu-note")!, /* copy:callout */ "Still loading"); return; }
          busy = true;
          for (const b of menu!.querySelectorAll<HTMLButtonElement>("button")) b.disabled = true;
          const status = h("div", { class: "menu-note", role: "status" }, /* copy:label */ "Starting…"); content.append(status);
          try {
            sessionStorage.setItem("riddle.newGame", "1");
            location.reload();
            return;
          } catch { /* private storage: use the existing live reset */ }
          app.go({ kind: "camp" });
          void app.resetLineage().then(play).catch(() => {
            replace(status, /* copy:label */ "Start failed");
            for (const b of menu?.querySelectorAll<HTMLButtonElement>("button") ?? []) b.disabled = false;
          }).finally(() => { busy = false; });
        }, "danger"));
    }
    const scene = h("div", { class: "menu-scene", "aria-hidden": "true" },
      h("img", { class: "menu-key-art", src: `${import.meta.env.BASE_URL}art/title.png`, alt: "", draggable: "false", decoding: "async" }),
      h("div", { class: "menu-moonlight" }), h("div", { class: "menu-mist" }),
      ...Array.from({ length: 16 }, (_, i) => h("span", { class: "menu-mote",
        style: `--x:${12 + (i * 37 % 79)}%;--y:${8 + (i * 23 % 73)}%;--drift:${(i % 3 - 1) * 18}px;--duration:${14 + i % 7 * 3}s;--delay:-${i * 2.7}s;--size:${i % 4 === 0 ? 2 : 1}px` })));
    menu.dataset.pane = next;
    replace(menu, scene, h("div", { class: "menu-ornament", "aria-hidden": "true" }), content,
      h("div", { class: "menu-footer" }, /* copy:label */ "Alpha"));
    syncAtmosphere();
    menu.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  };
  document.addEventListener("keydown", (e) => {
    if (!menu || document.querySelector(".sheet-wrap") || busy) return;
    if (e.key === "Escape") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (pane !== "main") render("main"); else if (app || saved) play();
    } else if (e.key === "Tab") {
      const buttons = [...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      const first = buttons[0], last = buttons.at(-1);
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if ((!e.shiftKey && document.activeElement === last) || !menu.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }, true);
  window.addEventListener("riddle:menu", show);
  const forceTitle = new URLSearchParams(location.search).get("menu") === "1";
  const fixture = dev && (dev.fresh || dev.seed !== undefined || dev.absent || dev.rules || dev.autosend || new URLSearchParams(location.search).get("engine") === "fake");
  if (restarting || (!forceTitle && (saved || fixture))) app = start(dev);
  else show();
}
