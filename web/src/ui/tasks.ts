// Owner 2026-10-14 ("the tactics order bar takes a lot of space … like the quest stuff, an overlay over the viewport; Journal will have
// history; group tasks and auto remove entries once a group is done"): one quiet tracker over the town's top-left, under the `next` pill.
// Groups: the control ladder (its rungs, doors and tips unchanged), each Journal chapter with work open now, and the quest. A group shows
// only while it has something open; a finished group leaves (its entries stay in the Journal). All truth is the core's Journal.
import "../tasks.css";
import type { App } from "../app";
import type { JournalEntry } from "../engine/types";
import { h, replace } from "./dom";
import { questBar } from "./quest";

const KEY = "idlever.tasks.open";
/** shown entries per chapter (clutter budget); the rest wait in the Journal, counted in the head */
const PER_GROUP = 1;

const storedOpen = (): boolean => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "1" || v === "0") return v === "1";
  } catch {
    /* storage blocked: the default */
  }
  return matchMedia("(min-width: 1024px)").matches;
};
const storeOpen = (open: boolean): void => {
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {
    /* storage blocked: the session keeps it */
  }
};

const isOpenWork = (e: JournalEntry): boolean => e.state === "active" || e.state === "ready";

export function taskTracker(
  app: App,
  ladder: HTMLElement,
  journal: (anchor: HTMLElement) => void,
): { el: HTMLElement; dispose: () => void } {
  const count = h("span", { class: "task-count num" });
  const groups = h("div", { class: "task-groups" });
  const controlGroup = h(
    "section",
    { class: "task-group", "data-task-group": "control" },
    h("h4", { class: "task-head" }, /* copy:label */ "Control"),
    ladder,
  );
  const details = h(
    "details",
    { class: "task-fold", open: storedOpen() },
    h("summary", { class: "task-summary" }, /* copy:label */ "Tasks", count),
    groups,
  );
  details.addEventListener("toggle", () => storeOpen(details.open));
  const el = h("aside", { class: "task-tracker game-control", "data-tasks": "" }, details);
  let last = "";
  const paint = (): void => {
    const J = app.lineage.journal;
    const home = !app.lineage.live && !app.lineage.ended && app.lineage.town?.home !== false;
    const chapters = (J?.chapters ?? [])
      .map((c) => {
        const open = c.entries.filter(isOpenWork);
        open.sort((a, b) => Number(b.id === J?.recommended) - Number(a.id === J?.recommended));
        return {
          id: c.id,
          title: c.title,
          open,
          done: c.entries.filter((e) => e.state === "complete").length,
          total: c.entries.length,
        };
      })
      .filter((c) => c.open.length > 0);
    const quest = J?.quest && !J.quest.done ? J.quest : null;
    const key = JSON.stringify([home, chapters, quest, J?.recommended, ladder.hidden]);
    if (key !== last) {
      last = key;
      const entry = (e: JournalEntry): HTMLElement =>
        h(
          "button",
          {
            class: "task-entry",
            "data-entry-id": e.id,
            "data-state": e.state,
            "data-recommended": String(e.id === J?.recommended),
            onclick: (ev: Event) => journal(ev.currentTarget as HTMLElement),
          },
          h("span", { class: "task-pip", "aria-hidden": "true" }),
          h("span", { class: "task-title" }, e.title),
          e.progress
            ? h("small", { class: "task-prog num" }, `${e.progress.current}/${e.progress.required}`)
            : "",
        );
      replace(
        groups,
        controlGroup,
        ...chapters.map((c) =>
          h(
            "section",
            { class: "task-group", "data-task-group": c.id },
            h(
              "h4",
              { class: "task-head" },
              c.title,
              h(
                "small",
                { class: "num" },
                c.open.length > PER_GROUP ? `+${c.open.length - PER_GROUP} · ` : "",
                `${c.done}/${c.total}`,
              ),
            ),
            ...c.open.slice(0, PER_GROUP).map(entry),
          ),
        ),
        quest
          ? h(
              "section",
              { class: "task-group", "data-task-group": "quest" },
              h("h4", { class: "task-head" }, /* copy:label */ "Quest"),
              h(
                "button",
                {
                  class: "task-entry task-quest",
                  onclick: (ev: Event) => journal(ev.currentTarget as HTMLElement),
                },
                h("span", { class: "task-title" }, quest.goal),
                questBar(quest),
              ),
            )
          : "",
      );
      const n = chapters.reduce((s, c) => s + c.open.length, 0) + (quest ? 1 : 0);
      count.textContent = n ? String(n) : "";
      el.hidden = !home || (!n && ladder.hidden);
    }
  };
  paint();
  // the ladder paints itself on change; read its hidden state after it has
  const off = app.onChange(() => queueMicrotask(paint));
  // phone: the town is taller than the well that scrolls it, so the chip's foot follows the well's visible floor (`--task-floor`)
  let well: HTMLElement | null = null;
  const floor = (): void => {
    if (well) el.style.setProperty("--task-floor", `${well.scrollTop + well.clientHeight}px`);
  };
  const ro = new ResizeObserver(floor);
  queueMicrotask(() => {
    well = el.closest<HTMLElement>(".camp-well");
    if (!well) return;
    ro.observe(well);
    well.addEventListener("scroll", floor, { passive: true });
    floor();
  });
  return {
    el,
    dispose: () => {
      off();
      ro.disconnect();
      well?.removeEventListener("scroll", floor);
    },
  };
}
