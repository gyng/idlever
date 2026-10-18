// Owner 2026-10-14 ("the tactics order bar takes a lot of space … like the quest stuff, an overlay over the viewport; Journal will have
// history; group tasks and auto remove entries once a group is done"): one quiet tracker over the town's top-left, under the `next` pill.
// Groups: the control ladder's next rung, each Journal chapter with work open now, and the quest. A group shows only while it has
// something open; a finished group leaves (its entries stay in the Journal). Owner 2026-10-14 (a WoW-style quest list for reference):
// frameless text over the scene's right edge — gold titles, indented `- 0/1` objective lines, no panel. All truth is the core's.
import "../tasks.css";
import type { App } from "../app";
import type { JournalEntry } from "../engine/types";
import { h, replace } from "./dom";
import { closeAllSheets } from "./sheet";
import { questBar } from "./quest";
import { ladderRungs } from "./ladder";
import { revealed } from "./reveal";
import { onPackages } from "./packages";
import {
  nextWorkerNode,
  openWorks,
  progressBar,
  progressText,
  workerProgress,
  worksView,
  type WorkerProgress,
} from "./works";

const KEY = "idlever.tasks.open";
/** shown entries per chapter (clutter budget); the rest wait in the Journal, counted in the head */
const PER_GROUP = 1;
// Cut 229: the fold is remembered per layout (tasks.css's phone breakpoint) and only when the player toggles it. The `toggle` event
// also fires for the default `open` a desktop mount sets, which used to pin "open" for later phone layouts, where the open list
// sits over the town's foot-left and covered the house's own hit target (home-residents, 320 px after a 1440 px mount).
const PHONE = "(max-width: 1023px)";
const phone = (): boolean => matchMedia(PHONE).matches;
const layoutKey = (): string => `${KEY}.${phone() ? "phone" : "wide"}`;

const storedOpen = (): boolean => {
  try {
    const v = localStorage.getItem(layoutKey());
    if (v === "1" || v === "0") return v === "1";
  } catch {
    /* storage blocked: the default */
  }
  return !phone();
};
const storeOpen = (open: boolean): void => {
  try {
    localStorage.setItem(layoutKey(), open ? "1" : "0");
  } catch {
    /* storage blocked: the session keeps it */
  }
};

const isOpenWork = (e: JournalEntry): boolean => e.state === "active" || e.state === "ready";

// Cut262 (owner: "task lists should highlight when can be completed. clicking it should highlight the building or item that should be
// clicked"): each open task names the surface that completes it — a town building's hit target (`data-building`) or a camp control —
// read from the core's own `JournalEntry.action` (kind · target). A task's tap points there (a brief gold ring, scrolled into view);
// a task with no surface on screen still opens the Journal.
/** where an `open` action's target lives in the town */
const OPEN_AT: Record<string, string> = {
  workers: "guild",
  orders: "guild",
  companions: "kennel",
  forge: "blacksmith",
  legacy: "tent",
  class: "tent",
  loadouts: "tent",
  hero: "tent",
  rebirth: "tent",
  tactics: "tent",
  watch: "mouth",
  chronicle: ".hero-roster .hero-history",
};
/** a town building's hit id, or a CSS selector (leading `.`), for the surface that completes `e`; null when none is known */
export function taskSurface(app: App, e: Pick<JournalEntry, "id" | "action">): string | null {
  if (e.id === "bloodlines") return ".hero-roster .hero-add";
  const a = e.action;
  if (!a) return null;
  if (a.kind === "delve") return "mouth";
  if (a.kind === "build_town")
    return app.lineage.town?.next === a.target
      ? "staked"
      : a.target === "house"
        ? "tent"
        : a.target;
  if (a.kind === "hire" || a.kind === "build_workplace") return "worker";
  if (a.kind === "open") return OPEN_AT[a.target] ?? null;
  return null;
}
/** the element for a surface id: the town's hit target (`worker` falls back to the Guild reception), else the selector */
export function surfaceEl(id: string): HTMLElement | null {
  const visible = (el: HTMLElement | null): HTMLElement | null =>
    el && !el.hidden && el.getClientRects().length > 0 ? el : null;
  if (id.startsWith(".")) return visible(document.querySelector<HTMLElement>(`main.camp ${id}`));
  const hit = (b: string): HTMLElement | null =>
    visible(document.querySelector<HTMLElement>(`main.camp .town-hit[data-building="${b}"]`));
  return hit(id) ?? (id === "worker" ? hit("guild") : null);
}
/** Whether a task can be completed now: the core marks it `ready` with its action enabled, or (the bloodline founding, an `active`
 *  entry) its own control stands enabled. */
export function taskCan(app: App, e: JournalEntry): boolean {
  if (e.id === "bloodlines") {
    const L = app.lineage;
    return (
      !!app.engine.addBloodline &&
      L.town?.home !== false &&
      (L.hero_slots?.length ?? 0) < (L.bloodline_cap ?? 1) &&
      L.gold >= (L.bloodline_price ?? 250)
    );
  }
  return e.state === "ready" && e.action?.enabled !== false;
}
let pointTimer = 0;
/** The tap's answer: a quiet gold ring on the surface (≈2.4 s), brought into view. False when nothing to point at stands. */
export function pointAt(id: string | null): boolean {
  if (!id) return false;
  // phone: the Menu holds the list over the town — it closes onto the ring
  if (document.querySelector(".sheet-wrap .task-tracker")) closeAllSheets();
  const el = surfaceEl(id);
  if (!el) return false;
  for (const old of document.querySelectorAll(".task-point")) old.classList.remove("task-point");
  clearTimeout(pointTimer);
  // restart the ring's animation on a repeat tap
  void el.offsetWidth;
  el.classList.add("task-point");
  // Cut272: a town target answers with its sprite's own two pulses (ui/town.ts), the ring then only its fallback
  el.dispatchEvent(new CustomEvent("idlever:point"));
  el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  pointTimer = window.setTimeout(() => el.classList.remove("task-point"), 2600);
  return true;
}

export function taskTracker(
  app: App,
  journal: (anchor: HTMLElement) => void,
  doors: Partial<Record<string, () => void>> = {},
): { el: HTMLElement; dispose: () => void } {
  const count = h("span", { class: "task-count num" });
  const groups = h("div", { class: "task-groups" });
  // only a player's own toggle is a preference (a click on the summary, which Enter/Space also fire)
  let asked = false;
  const details = h(
    "details",
    { class: "task-fold", open: storedOpen() },
    h(
      "summary",
      {
        class: "task-summary",
        onclick: () => {
          asked = true;
        },
      },
      /* copy:label */ "Tasks",
      count,
    ),
    groups,
  );
  details.addEventListener("toggle", () => {
    if (asked) storeOpen(details.open);
    asked = false;
  });
  // crossing the phone breakpoint applies that layout's own fold
  const layout = matchMedia(PHONE);
  const relayout = (): void => {
    asked = false;
    details.open = storedOpen();
  };
  layout.addEventListener("change", relayout);
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
    // the control ladder's first dark rung (ladder.ts: shown once packages and a depth exist, gone once every rung is lit)
    const L = app.lineage,
      R = revealed(app);
    const rung =
      onPackages(L) && L.best_depth > 0
        ? ladderRungs(L, (s) => R.has(s as Parameters<typeof R.has>[0])).find((r) => !r.lit)
        : undefined;
    const control = rung ? { id: rung.id, label: rung.label, cond: rung.cond } : null;
    // Cut 120 §8: a lit rung with a door (orders, workers) stays one tap away, as a gold link under the next rung
    const lit = rung
      ? ladderRungs(L, (s) => R.has(s as Parameters<typeof R.has>[0]))
          .filter((r) => r.lit && doors[r.id])
          .map((r) => ({ id: r.id, label: r.label }))
      : [];
    // Cut231 §5: live progress toward the next worker on its trigger (`2/3 sends`, a thin bar, `or 6h` quietly). The dark workers
    // rung carries its focus's; once that rung is lit the next counting worker rides the Town group as one more line — never
    // twice (a Town entry for the same worker, which carries its own count, wins).
    const ctlProg =
      control?.id === "workers" && L.tree ? workerProgress(worksView(L.tree).focus) : null;
    const townShown = chapters.find((c) => c.id === "town")?.open[0]?.id;
    const nwProg = workerProgress(nextWorkerNode(L.tree));
    const worker = nwProg && control?.id !== "workers" && townShown !== nwProg.id ? nwProg : null;
    const key = JSON.stringify([
      home,
      chapters,
      quest,
      J?.recommended,
      control,
      lit,
      ctlProg,
      worker,
      // Cut262: what each entry can do now and where it points (gold, the next plot) repaint its mark
      chapters.map((c) =>
        c.open.slice(0, PER_GROUP).map((e) => [taskCan(app, e), taskSurface(app, e)]),
      ),
    ]);
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
            "data-can": String(taskCan(app, e)),
            "data-surface": taskSurface(app, e) ?? "",
            onclick: (ev: Event) => {
              if (!pointAt(taskSurface(app, e))) journal(ev.currentTarget as HTMLElement);
            },
          },
          h("span", { class: "task-pip", "aria-hidden": "true" }),
          h("span", { class: "task-title" }, e.title),
          e.progress
            ? h(
                "small",
                { class: "task-obj num" },
                `${e.progress.current}/${e.progress.required} ${e.progress.unit}`,
              )
            : e.requirements[0] || e.reason
              ? h("small", { class: "task-obj" }, e.requirements[0] || e.reason)
              : "",
        );
      const eta = (p: WorkerProgress | null): HTMLElement | string =>
        p?.eta ? h("small", { class: "task-eta" }, ` · ${p.eta}`) : "";
      const workerEntry = (p: WorkerProgress): HTMLElement =>
        h(
          "button",
          {
            class: "task-entry task-worker",
            "data-worker": p.id,
            "data-state": "active",
            "data-can": String(!!p.done),
            "data-surface": "worker",
            ...(p.feat ? { "data-feat-done": String(!!p.done) } : {}),
            onclick: (ev: Event) => {
              if (!pointAt("worker")) openWorks(app, p.id, ev.currentTarget as HTMLElement);
            },
          },
          h("span", { class: "task-pip", "aria-hidden": "true" }),
          h("span", { class: "task-title" }, p.name.charAt(0).toUpperCase() + p.name.slice(1)),
          h(
            "small",
            { class: `task-obj${p.feat ? " task-feat" : " num"}` },
            progressText(p),
            eta(p),
          ),
          // (Cut235: a feat has no count to fill — no bar)
          p.feat ? "" : progressBar("task-bar", p.frac),
        );
      const town = chapters.some((c) => c.id === "town");
      replace(
        groups,
        control
          ? h(
              "section",
              { class: "task-group", "data-task-group": "control" },
              h("h4", { class: "task-head" }, /* copy:label */ "Control"),
              h(
                "button",
                {
                  class: "task-entry",
                  "data-rung": control.id,
                  "data-state": "later",
                  "data-surface": control.id === "workers" ? "guild" : "",
                  onclick: (ev: Event) => {
                    if (control.id !== "workers" || !pointAt("guild"))
                      journal(ev.currentTarget as HTMLElement);
                  },
                },
                h("span", { class: "task-pip", "aria-hidden": "true" }),
                h(
                  "span",
                  { class: "task-title" },
                  control.label.charAt(0).toUpperCase() + control.label.slice(1),
                ),
                h(
                  "small",
                  { class: `task-obj${ctlProg ? " num" : ""}`, "data-worker": ctlProg?.id ?? "" },
                  control.cond,
                  eta(ctlProg),
                ),
                ctlProg && !ctlProg.feat ? progressBar("task-bar", ctlProg.frac) : "",
              ),
              lit.length
                ? h(
                    "div",
                    { class: "task-doors" },
                    ...lit.map((d) =>
                      h(
                        "button",
                        {
                          class: "task-door",
                          "data-door": d.id,
                          onclick: (ev: Event) => {
                            ev.stopPropagation();
                            doors[d.id]?.();
                          },
                        },
                        d.label,
                      ),
                    ),
                  )
                : "",
            )
          : "",
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
            c.id === "town" && worker ? workerEntry(worker) : "",
          ),
        ),
        worker && !town
          ? h(
              "section",
              { class: "task-group", "data-task-group": "town" },
              h("h4", { class: "task-head" }, /* copy:label */ "Town"),
              workerEntry(worker),
            )
          : "",
        quest
          ? h(
              "section",
              { class: "task-group", "data-task-group": "quest" },
              h("h4", { class: "task-head" }, /* copy:label */ "Quest"),
              h(
                "button",
                {
                  class: "task-entry task-quest",
                  "data-can": String(quest.progress >= 1),
                  "data-surface": "board",
                  onclick: (ev: Event) => {
                    if (!pointAt("board")) journal(ev.currentTarget as HTMLElement);
                  },
                },
                h("span", { class: "task-title" }, quest.goal),
                questBar(quest),
              ),
            )
          : "",
      );
      const n =
        chapters.reduce((s, c) => s + c.open.length, 0) +
        (quest ? 1 : 0) +
        (control ? 1 : 0) +
        (worker ? 1 : 0);
      count.textContent = n ? String(n) : "";
      el.hidden = !home || !n;
    }
  };
  paint();
  const off = app.onChange(paint);
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
      layout.removeEventListener("change", relayout);
      ro.disconnect();
      well?.removeEventListener("scroll", floor);
    },
  };
}
