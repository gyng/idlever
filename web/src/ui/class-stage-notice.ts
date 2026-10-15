import type { App } from "../app";
import { classIcon } from "./class-icons";
import { h } from "./dom";

const KEY = "idlever.class-stages";
const stages = { advanced: 1, advanced_second: 2, capstone: 3, mastery: 4 } as const;
const session = new Map<string, number>();

function heard(key: string): number {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const value = saved[key];
    return Math.max(session.get(key) ?? 0, typeof value === "number" ? value : 0);
  } catch {
    return session.get(key) ?? 0;
  }
}
function remember(key: string, rank: number): void {
  session.set(key, rank);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
    saved[key] = rank;
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Per-viewer acknowledgement only; engine state is never changed here.
  }
}

/** Display only a recorded native transition, once per resident/class/stage.
 * Reads cannot invent an unlock; restored earlier stages cannot reannounce it.
 */
export function createClassStageNotice(app: App, owner: HTMLElement) {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let plate: HTMLElement | undefined;
  let active: string | undefined;
  const read = () => {
    const L = app.lineage;
    const tree = L.class_tree;
    const notice = tree?.earned_stage;
    if (
      !tree ||
      !notice ||
      L.town?.home === false ||
      tree.class.toLowerCase() !== L.class.toLowerCase()
    )
      return;
    const rank = stages[notice.stage];
    if (!rank) return;
    return {
      key: JSON.stringify([L.seed, L.selected_bloodline, tree.class]),
      cls: tree.class,
      rank,
      notice,
    };
  };
  const paint = () => {
    const asked = read();
    const identity = asked ? JSON.stringify([asked.key, asked.rank]) : undefined;
    if (active !== identity) {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      plate?.remove();
      plate = undefined;
      active = undefined;
    }
    if (disposed || timer !== undefined || !asked || heard(asked.key) >= asked.rank) return;
    active = identity;
    // Camp construction precedes mounting. Wait one task before touching chrome.
    const show = () => {
      timer = undefined;
      const current = read();
      if (
        disposed ||
        !owner.isConnected ||
        !current ||
        current.key !== asked.key ||
        current.rank !== asked.rank ||
        heard(current.key) >= current.rank
      )
        return;
      if (document.querySelector(".class-unlock")) {
        timer = setTimeout(show, 4250);
        return;
      }
      remember(current.key, current.rank);
      const cls = current.cls.charAt(0).toUpperCase() + current.cls.slice(1);
      plate = h(
        "div",
        {
          class: "class-unlock",
          role: "status",
          "aria-live": "polite",
          "data-class-stage": current.notice.stage,
        },
        classIcon(current.cls),
        h("span", null, /* copy:callout */ `${cls} paths`),
        h("small", { class: "num" }, /* copy:callout */ `${current.notice.picks} total picks`),
      );
      document.body.append(plate);
      timer = setTimeout(() => {
        plate?.remove();
        plate = undefined;
        timer = undefined;
      }, 4200);
    };
    timer = setTimeout(show, 0);
  };
  return {
    paint,
    dispose: () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      plate?.remove();
      plate = undefined;
      active = undefined;
    },
  };
}
