// Owner 2026-10-10 ("juice up while you were gone screen it's important"): the return opens like a chest. When the absence's sheet
// shows: a parchment unfurl; the three outcome tiles count up (~750 ms each, eased, 120 ms apart; a coin chime as each lands); a NEW BEST
// presses in like the death's wax seal and catches a gilt shimmer (a deeper chime); highlights arrive one by one (~150 ms each; a boss slain or a level
// crossed gets a gilt flourish); then `collect & send` breathes a slow glow. ≤ 2.5 s in all.
// Quiet and never in the way: the action is live from the first frame (a routine return stays ≤ 2 taps), a tap or key anywhere skips to
// the end state, reduced motion (or juice off: the headless gates) shows the end state at once. Every count is a CSS counter drawn over
// the real text (transparent while it counts), so the DOM's text is the truth throughout; sizes never change (opacity and transforms
// only). Actual Gold transfers use the shared receipt feedback in frame.ts.
// `main.report[data-settled="1"]` marks the end state for tests.
import "../report-juice.css";
import { audio } from "../audio";

const juicy = (): boolean =>
  document.documentElement.dataset.juice === "on" &&
  !(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

/** The beats (ms from the sheet's first visible frame). */
const T = {
  tile0: 120,
  stagger: 120,
  count: 760,
  hl0: 500,
  hlGap: 180,
  hlIn: 150,
} as const;

export type ReportJuice = { dispose: () => void; settle: () => void };

/** Reveals the report once visible. Gold transfers are owned by the actual transaction feedback. */
export function reportJuice(main: HTMLElement, sheet: HTMLElement): ReportJuice {
  const timers: number[] = [];
  let observer: MutationObserver | null = null;
  let raf = 0;
  let started = false,
    settled = false;
  const tiles = [
    ...sheet.querySelectorAll<HTMLElement>(".report-summary .report-basics > .tile"),
  ].slice(0, 3);
  const highlights = [...sheet.querySelectorAll<HTMLElement>(":scope > .report-hl")];
  const collect = sheet.querySelector<HTMLElement>(":scope > .collect-send");
  const record = sheet.querySelector<HTMLElement>(".report-basics .tile.is-record .tile-record");
  const at = (ms: number, f: () => void): void => {
    timers.push(
      window.setTimeout(() => {
        if (!settled && main.isConnected) f();
      }, ms),
    );
  };
  const settle = (): void => {
    if (settled) return;
    settled = true;
    for (const t of timers) clearTimeout(t);
    cancelAnimationFrame(raf);
    observer?.disconnect();
    main.classList.remove("rj-run");
    for (const el of main.querySelectorAll(".rj-count")) el.classList.remove("rj-count");
    for (const el of main.querySelectorAll(".rj-wait")) el.classList.remove("rj-wait");
    if (started && collect) collect.classList.add("rj-breathe");
    main.dataset.settled = "1";
    off();
  };
  const skip = (e: Event): void => {
    if (e.type === "keydown" && (e as KeyboardEvent).key === "Tab") return;
    settle();
  };
  const off = (): void => {
    main.removeEventListener("pointerdown", skip, true);
    main.removeEventListener("keydown", skip, true);
  };

  /** a tile's number counts from 0 (a CSS counter over the real text); its prefix/suffix stay (`D`, `+$`) */
  const countTile = (tile: HTMLElement, delay: number): boolean => {
    const b = tile.querySelector<HTMLElement>(":scope > b.num");
    const m = b ? /^(\D*)(\d+)(\D*)$/.exec((b.textContent ?? "").trim()) : null;
    if (!b || !m || Number(m[2]) <= 0) return false;
    if (!b.querySelector(":scope > .rj-real")) {
      const real = document.createElement("span");
      real.className = "rj-real";
      real.append(...b.childNodes);
      b.append(real);
    }
    const css = (s: string): string => JSON.stringify(s);
    b.style.setProperty("--rj-pre", css(m[1]));
    b.style.setProperty("--rj-post", css(m[3]));
    b.style.setProperty("--rj-to", m[2]);
    b.style.setProperty("--rj-delay", `${delay}ms`);
    b.style.setProperty("--rj-ms", `${T.count}ms`);
    b.classList.add("rj-count");
    return true;
  };

  let counted: boolean[] = [];
  const run = (): void => {
    if (started || settled) return;
    started = true;
    observer?.disconnect();
    main.classList.add("rj-run");
    main.dataset.settled = "0";
    audio.cue("unfurl");
    tiles.forEach((tile, i) => {
      const d = T.tile0 + i * T.stagger;
      if (counted[i])
        at(d + T.count + 40, () =>
          tile.querySelector(":scope > b.num")?.classList.remove("rj-count"),
        );
      at(d + (counted[i] ? T.count : 200), () => audio.cue("coin"));
    });
    // NEW BEST: pressed in as the deepest lands
    if (record) {
      const d = T.tile0 + T.stagger + T.count - 60;
      at(d, () => {
        record.classList.remove("rj-wait");
        record.classList.add("rj-stamp");
        audio.cue("chime");
      });
    }
    highlights.forEach((el, i) => {
      el.classList.add("rj-wait");
      const d = T.hl0 + i * T.hlGap;
      at(d, () => {
        el.classList.remove("rj-wait");
        el.classList.add("rj-in");
        const k = el.dataset.hl;
        if (k === "boss" || k === "level") {
          el.classList.add("rj-flourish");
          audio.cue("chime");
        } else if (k === "find") el.classList.add("rj-glint");
      });
    });
    const end =
      Math.max(
        T.tile0 + 2 * T.stagger + T.count,
        T.hl0 + Math.max(0, highlights.length - 1) * T.hlGap + T.hlIn,
      ) + 120;
    at(end, settle);
  };

  if (!juicy()) {
    main.dataset.settled = "1";
    return {
      dispose: () => {
        /* nothing ran */
      },
      settle: () => {
        /* settled */
      },
    };
  }
  main.dataset.settled = "0";
  // from the first frame (never a flash of the end state): the counts wait at 0 (CSS: they start when the sheet first draws), the NEW BEST
  // and the highlights wait unseen, their space held
  counted = tiles.map((tile, i) => countTile(tile, T.tile0 + i * T.stagger));
  for (const el of highlights) el.classList.add("rj-wait");
  record?.classList.add("rj-wait");
  main.classList.add("rj-run");
  main.addEventListener("pointerdown", skip, true);
  main.addEventListener("keydown", skip, true);
  // the run-clear card may stand over the sheet first (runclear.ts): the reveal starts when the sheet shows
  const visible = (): boolean => main.isConnected && !sheet.hidden;
  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      if (visible()) run();
      else if (main.isConnected) {
        observer = new MutationObserver(() => {
          if (visible()) run();
        });
        observer.observe(sheet, { attributes: true, attributeFilter: ["hidden"] });
      }
    });
  });
  return {
    dispose: () => {
      settle();
    },
    settle,
  };
}
