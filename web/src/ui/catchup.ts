// Owner 2026-10-22 ("cap to one week and have a catch up loader screen · show progress and also announce milestones"): the
// return after an absence. The core plays the time away in slices (`App.runOfflineChunked`); this screen stands over the locked
// page meanwhile — how long he was away (a week counts at most), the share played, and the crier's lines as they happen.
import "../screens/catchup.css";
import type { CryLine } from "../engine/types";
import { h } from "./dom";
import { awayText } from "./report";

export type Catchup = {
  /** Seconds of the absence played so far. */
  progress(doneS: number): void;
  /** The crier's lines (the core's last few, oldest first); those later than the last heard are announced. */
  cries(lines: CryLine[]): void;
  close(): void;
};

const SHOWN = 8;

export function openCatchup(totalS: number, awayS: number): Catchup {
  const fill = h("i", { class: "catchup-fill" });
  const done = h("small", { class: "catchup-done num" });
  const list = h("ul", { class: "catchup-cries", "aria-live": "polite" });
  const bank = h("p", { class: "catchup-bank num", hidden: true });
  const capped = awayS > totalS;
  const el = h(
    "div",
    { class: "catchup", role: "status", "data-catchup": "1" },
    h(
      "div",
      { class: "catchup-panel" },
      h("h2", { class: "catchup-title" }, /* copy:label */ "Catching up"),
      h(
        "p",
        { class: "catchup-away num" },
        /* copy:callout */ `away ${awayText(awayS)}`,
        capped ? h("small", { class: "catchup-cap" }, /* copy:callout */ " · a week counts") : "",
      ),
      h(
        "div",
        { class: "catchup-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" },
        fill,
      ),
      done,
      bank,
      list,
    ),
  );
  document.body.appendChild(el);
  const bar = el.querySelector<HTMLElement>(".catchup-bar")!;
  let lastT = -1,
    banked = 0;
  return {
    progress(doneS) {
      const pct = totalS > 0 ? Math.min(100, Math.round((100 * doneS) / totalS)) : 100;
      fill.style.width = `${pct}%`;
      bar.setAttribute("aria-valuenow", String(pct));
      done.textContent = /* copy:callout */ `${awayText(doneS)} of ${awayText(totalS)}`;
    },
    cries(lines) {
      // the core keeps its last lines only: what is new is what is later than the last heard (`t`), not past an index
      const fresh = lines.filter((c) => c.t > lastT);
      if (!fresh.length) return;
      lastT = Math.max(lastT, ...fresh.map((c) => c.t));
      // the porter's camps are one running sum; the list keeps the milestones (records, bosses, deaths, the bottom)
      banked += fresh
        .filter((c) => c.k === "camp")
        .reduce((n, c) => n + Number(/\$(\d+)/.exec(c.text)?.[1] ?? 0), 0);
      bank.hidden = banked <= 0;
      bank.textContent = /* copy:callout */ `porter banked $${banked.toLocaleString("en-US")}`;
      for (const c of fresh.filter((c) => c.k !== "camp")) {
        const who = c.who.split(/\s+/)[0] ?? c.who;
        list.prepend(
          h("li", { class: `catchup-cry k-${c.k}`, "data-k": c.k }, `${who} · ${c.text}`),
        );
      }
      while (list.children.length > SHOWN) list.lastElementChild?.remove();
    },
    close() {
      el.remove();
    },
  };
}
