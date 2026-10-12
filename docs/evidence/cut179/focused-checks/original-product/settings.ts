// Settings sheet: save export/import, rules export/import, engine badge, reset lineage (double tap).
// Cut 10 §4: `sound` row with a `mute` toggle (persisted in localStorage; no cue and no drone while muted).
// docs/UI.md §7: `auto continue` row — `on` / `off` (localStorage `riddle.autoContinue`).
// Cut 14: `slowdowns` row — `on` / `off` (`app.slowdowns`, persisted): the watch's fight / near / scene holds, or the flat rate.
import type { App } from "../app";
import { h, copyText, replace } from "./dom";
import { closeEverything, openWindow as openSheet } from "./sheet";
import { audio } from "../audio";
import { workerNodes } from "./works";
import { autoOn, setAutoOn } from "./autodismiss";
import { captureDebug, debugFilename, downloadDebug, debugNote } from "../debug";
import { effectsLevel, nextEffectsLevel, setEffectsLevel, type FxLevel } from "../render/fxpref";

/** Shared preferences: title settings and the live game use the same controls. */
export function preferenceRows(app?: App): HTMLElement[] {
  const row = (label: string, ...buttons: HTMLElement[]): HTMLElement => h("div", { class: "srow" }, h("span", { class: "label" }, label), ...buttons);
  let slow = true;
  try { slow = localStorage.getItem("riddle.slowdowns") !== "0"; } catch { /* session default */ }
  const slowdowns = (): boolean => app ? app.slowdowns : slow;
  const setSlowdowns = (on: boolean): void => {
    if (app) app.setSlowdowns(on);
    else { slow = on; try { localStorage.setItem("riddle.slowdowns", on ? "1" : "0"); } catch { /* session only */ } }
  };
  const mute = h("button", { class: `btn mute${audio.muted ? " on" : ""}`, "aria-pressed": audio.muted ? "true" : "false", onclick: () => {
    audio.unlock(); audio.setMuted(!audio.muted); mute.classList.toggle("on", audio.muted); mute.setAttribute("aria-pressed", audio.muted ? "true" : "false");
  } }, /* copy:button */ "mute");

  const slowButton = h("button", { class: `btn slowdowns${slowdowns() ? " on" : ""}`, "aria-pressed": slowdowns() ? "true" : "false", onclick: () => {
    setSlowdowns(!slowdowns()); slowButton.classList.toggle("on", slowdowns()); slowButton.setAttribute("aria-pressed", slowdowns() ? "true" : "false"); replace(slowButton, slowdowns() ? /* copy:button */ "on" : /* copy:button */ "off");
  } }, slowdowns() ? /* copy:button */ "on" : /* copy:button */ "off");

  // combat fx pass (2026-10-10): `effects` — full · low · off (render/fxpref.ts: blood, splats, shake, hit-stop); a client pref
  const fxWord = (l: FxLevel): string => l === "full" ? /* copy:button */ "full" : l === "low" ? /* copy:button */ "low" : /* copy:button */ "off";
  const effects = h("button", { class: "btn effects-level", "data-level": effectsLevel(), onclick: () => {
    const l = nextEffectsLevel(); setEffectsLevel(l); effects.dataset.level = l; replace(effects, fxWord(l));
  } }, fxWord(effectsLevel()));
  // docs/UI.md §7: the report, the death screen and open panels continue on their own (on by default)
  const auto = h("button", { class: `btn auto-continue${autoOn() ? " on" : ""}`, "aria-pressed": String(autoOn()), onclick: () => {
    setAutoOn(!autoOn()); auto.classList.toggle("on", autoOn()); auto.setAttribute("aria-pressed", String(autoOn())); replace(auto, autoOn() ? /* copy:button */ "on" : /* copy:button */ "off");
  } }, autoOn() ? /* copy:button */ "on" : /* copy:button */ "off");

  return [row(/* copy:label */ "sound", mute), row(/* copy:label */ "slowdowns", slowButton),
    row(/* copy:label */ "effects", effects), row(/* copy:label */ "auto continue", auto)];
}

export function openSettings(app: App): void {
  closeEverything();   // QA 23ed91f (L: the settings sheet opened over the open UNLOCKS panel — two studs): one at a time
  openSheet((close) => {
    const body = h("div", { class: "sheet-body settings" });
    const area = h("textarea", { class: "ta", rows: 6, spellcheck: false });
    const debugStatus = h("div", { class: "dim debug-status", role: "status" });
    const debugCopy = h("button", { class: "btn debug-copy", hidden: true, onclick: async () => { stamp(debugCopy, await copyText(area.value)); } }, /* copy:button */ "Copy dump");
    const debugOut = h("button", { class: "btn debug-export", onclick: async () => {
      debugOut.disabled = true; debugCopy.hidden = true;
      replace(debugStatus, /* copy:label */ "Capturing state…");
      try {
        const bundle = await captureDebug(app); area.value = JSON.stringify(bundle, null, 2);
        debugCopy.hidden = false;
        try { downloadDebug(area.value, debugFilename(bundle)); replace(debugStatus, /* copy:label */ "Dump ready"); }
        catch { replace(debugStatus, /* copy:label */ "Copy dump"); }
      } catch (e) { debugNote("export-error", e instanceof Error ? e.message : String(e)); area.value = ""; replace(debugStatus, /* copy:label */ "Export failed"); }
      finally { debugOut.disabled = false; }
    } }, /* copy:button */ "Debug export");
    const row = (label: string, ...btns: HTMLElement[]): HTMLElement => h("div", { class: "srow" }, h("span", { class: "label" }, label), ...btns);
    const stamp = (b: HTMLElement, ok: boolean): void => { const t = b.textContent; b.textContent = ok ? "✓" : "×"; setTimeout(() => { b.textContent = t; }, 900); };

    const clearDebug = (): void => { debugCopy.hidden = true; replace(debugStatus); };
    const saveOut = h("button", { class: "btn", onclick: async () => { clearDebug(); const s = app.exportSave(); area.value = s; stamp(saveOut, await copyText(s)); } }, /* copy:button */ "export");
    const saveIn = h("button", { class: "btn", onclick: async () => { const ok = await app.importSave(area.value.trim()); stamp(saveIn, ok); if (ok) close(); } }, /* copy:button */ "import");
    const rulesOut = h("button", { class: "btn", onclick: async () => { clearDebug(); const s = await app.engine.exportRules(); area.value = s; stamp(rulesOut, await copyText(s)); } }, /* copy:button */ "export");
    const rulesIn = h("button", { class: "btn", onclick: async () => { const t = area.value.trim(); if (!t) { stamp(rulesIn, false); return; } try { await app.setRulesText(t); stamp(rulesIn, true); close(); } catch { stamp(rulesIn, false); } } }, /* copy:button */ "import");

    let armed = 0;
    const reset = h("button", { class: "btn danger", onclick: () => {
      if (Date.now() - armed < 2500) { close(); void app.resetLineage(); return; }
      armed = Date.now(); replace(reset, /* copy:button */ "again"); setTimeout(() => replace(reset, /* copy:button */ "reset"), 2500);
    } }, /* copy:button */ "reset");

    // Cut 30.5: each hired worker a switch (on: his standing order; off: the chore by hand again) — `setWorker`
    const W = app.lineage.tree;
    const hired = W && app.engine.setWorker ? workerNodes(W).filter((n) => n.state === "done" && n.chore) : [];
    const workerChip = (id: string, name: string, on: boolean): HTMLButtonElement => {
      const b: HTMLButtonElement = h("button", { class: `chip worker-switch${on ? " on" : ""}`, role: "switch", "aria-checked": on ? "true" : "false", "data-worker": id, onclick: async () => {
        const now = b.getAttribute("aria-checked") === "true";
        if (await app.mutate(() => app.engine.setWorker!(id, !now))) { const n = app.lineage.tree?.nodes.find((x) => x.id === id); b.replaceWith(workerChip(id, name, !n?.paused)); }
      } }, name, h("small", { class: "dim" }, on ? /* copy:label */ " on" : /* copy:label */ " off"));
      return b;
    };

    body.append(
      h("div", { class: "label row-label" }, /* copy:label */ "Settings"),
      row(/* copy:label */ "menu", h("button", { class: "btn main-menu-button", onclick: () => { close(); window.dispatchEvent(new Event("riddle:menu")); } }, /* copy:button */ "Main menu")),
      hired.length ? h("div", { class: "srow workers-row" }, h("span", { class: "label" }, /* copy:label */ "workers"), h("span", { class: "chips" }, ...hired.map((n) => workerChip(n.id, n.name, !n.paused)))) : "",
      ...preferenceRows(app),
      row(/* copy:label */ "save", saveOut, saveIn),
      row(/* copy:label */ "rules", rulesOut, rulesIn),
      row(/* copy:label */ "debug", debugOut, debugCopy),
      debugStatus,
      area,
      row(/* copy:label */ "engine", h("span", { class: "badge num" }, app.kind === "wasm" ? `wasm ${app.version}` : app.kind)),
      // the seed in decimal (both QA players on 952e306 decoded `#d3` as 211 in hex)
      row(/* copy:label */ "lineage", h("span", { class: "num dim" }, /* copy:label */ `seed ${app.lineage.seed}`), reset),
    );
    return body;
  }, { stay: true });
}
