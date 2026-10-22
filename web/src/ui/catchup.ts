// Owner 2026-10-22 ("cap to one week and have a catch up loader screen · show progress and also announce milestones"; then "the
// return progress screen shouldn't auto close by default · juice up each reveal and have the gold counter spin up · add fx and sfx so
// it's a joy to come back · center the return screen"): the return after an absence. The core plays the time away in slices
// (`App.runOfflineChunked`); this screen stands over the locked page meanwhile — how long he was away against the cap (a week),
// draining as it plays, the porter's gold spinning up, and the crier's milestones revealed one at a time with a sound and a burst.
// When it is done it says welcome back and waits for Continue (or closes itself, if the viewer chose `catch-up · auto`).
import "../screens/catchup.css";
import type { CryLine } from "../engine/types";
import { audio, type CueName } from "../audio";
import { effectsLevel } from "../render/fxpref";
import { h } from "./dom";
import { awayText } from "./report";

export type CatchupSummary = { runs: number; gold: number };
export type Catchup = {
  /** Seconds of the absence played so far. */
  progress(doneS: number): void;
  /** The crier's lines (the core's last few, oldest first); those later than the last heard are announced. */
  cries(lines: CryLine[]): void;
  /** The absence is played: the welcome back, then Continue (or a short hold when auto). Resolves when the screen is gone. */
  finish(s: CatchupSummary): Promise<void>;
  close(): void;
};

const SHOWN = 8;
// owner 2026-10-22 ("make it start slow and speed up over few seconds"): the bar eases after the true progress, slowly at
// first, and the reveals tighten from REVEAL_SLOW_MS to REVEAL_FAST_MS, both over RAMP_MS
const RAMP_MS = 3500;
const REVEAL_SLOW_MS = 700;
const REVEAL_FAST_MS = 140;
const AUTO_KEY = "idlever.catchupAuto";

/** The viewer's choice: the catch-up closes itself when done (off by default — it waits for Continue). */
export function catchupAuto(): boolean {
  try {
    // under automation (the client walks wait for the report) it closes itself unless a test asks it to stay ("0")
    const v = localStorage.getItem(AUTO_KEY);
    return v === "1" || (v === null && navigator.webdriver);
  } catch {
    return false;
  }
}
export function setCatchupAuto(on: boolean): void {
  try {
    localStorage.setItem(AUTO_KEY, on ? "1" : "0");
  } catch {
    /* private mode: this visit only */
  }
}

const SOUND: Record<string, CueName> = {
  boss: "boss_down",
  record: "unlock",
  bottom: "level",
  death: "exit_death",
  home: "chime",
};
const BIG = new Set(["boss", "record", "bottom"]);
const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/** `totalS` the time to play (the absence, capped), `awayS` the absence itself, `capS` the cap: the bar's full scale. */
export function openCatchup(totalS: number, awayS: number, capS: number): Catchup {
  const fill = h("i", { class: "catchup-fill" });
  const done = h("small", { class: "catchup-done num" });
  const list = h("ul", { class: "catchup-cries", "aria-live": "polite" });
  const bankNum = h("b", { class: "catchup-bank-num num" }, money(0));
  const bank = h(
    "p",
    { class: "catchup-bank", hidden: true },
    /* copy:callout */ "porter banked ",
    bankNum,
  );
  const title = h("h2", { class: "catchup-title" }, /* copy:label */ "Catching up");
  const capped = awayS > totalS;
  const away = h(
    "p",
    { class: "catchup-away num" },
    /* copy:callout */ `away ${awayText(awayS)}`,
    capped
      ? h("small", { class: "catchup-cap" }, /* copy:callout */ ` · capped at ${awayText(capS)}`)
      : "",
  );
  const foot = h("div", { class: "catchup-foot" });
  const panel = h(
    "div",
    { class: "catchup-panel" },
    title,
    away,
    // owner 2026-10-22: the bar's scale is the cap (its end marked); filled to the time away, it drains as it plays
    h(
      "div",
      { class: "catchup-scale" },
      h(
        "div",
        { class: "catchup-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" },
        fill,
      ),
      h("small", { class: "catchup-capmark num" }, awayText(capS)),
    ),
    done,
    bank,
    list,
    foot,
  );
  const el = h("div", { class: "catchup", role: "status", "data-catchup": "1" }, panel);
  document.body.appendChild(el);
  audio.cue("unfurl");
  const bar = el.querySelector<HTMLElement>(".catchup-bar")!;
  const fx = effectsLevel();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const opened = performance.now();
  /** 0 → 1 over the first RAMP_MS, eased in: the catch-up starts slow and speeds up */
  const ramp = (): number =>
    reduced ? 1 : Math.min(1, (performance.now() - opened) / RAMP_MS) ** 2;
  const revealMs = (): number => REVEAL_SLOW_MS - (REVEAL_SLOW_MS - REVEAL_FAST_MS) * ramp();

  // ---- the bar: the shown progress chases the played one, slowly at first
  let target = 0,
    shownS = 0,
    drive = 0;
  const caughtUp = (): boolean => target - shownS <= totalS * 0.001;
  const paint = (): void => {
    const left = Math.max(0, totalS - shownS);
    fill.style.width = `${capS > 0 ? Math.min(100, (100 * left) / capS) : 0}%`;
    bar.setAttribute(
      "aria-valuenow",
      String(totalS > 0 ? Math.round((100 * shownS) / totalS) : 100),
    );
    done.textContent =
      left > 1 ? /* copy:callout */ `${awayText(left)} left` : /* copy:callout */ "done";
  };
  const chase = (): void => {
    shownS = reduced || caughtUp() ? target : shownS + (target - shownS) * (0.012 + 0.2 * ramp());
    paint();
    drive = shownS < target ? requestAnimationFrame(chase) : 0;
  };

  // ---- the porter's gold: a spinning counter (ticks a coin as it climbs)
  let banked = 0,
    shown = 0,
    spin = 0,
    lastCoin = 0;
  const spinTo = (target: number): void => {
    cancelAnimationFrame(spin);
    if (reduced) {
      shown = target;
      bankNum.textContent = money(shown);
      return;
    }
    const from = shown,
      t0 = performance.now(),
      dur = Math.min(1200, 400 + (target - from) / 20);
    bank.classList.remove("bump");
    void bank.offsetWidth;
    bank.classList.add("bump");
    const step = (now: number): void => {
      const k = Math.min(1, (now - t0) / dur);
      shown = from + (target - from) * (1 - (1 - k) ** 3);
      bankNum.textContent = money(shown);
      if (now - lastCoin > 140 && k < 1) {
        lastCoin = now;
        audio.cue("coin");
      }
      if (k < 1) spin = requestAnimationFrame(step);
    };
    spin = requestAnimationFrame(step);
  };

  // ---- a burst of sparks over a big reveal (the viewer's effects level: full · low · off)
  const burst = (at: HTMLElement, n: number, gold: boolean): void => {
    if (fx === "off" || reduced) return;
    const count = fx === "low" ? Math.ceil(n / 3) : n;
    const r = at.getBoundingClientRect(),
      p = panel.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.6,
        d = 30 + Math.random() * 50;
      const s = h("i", { class: `catchup-spark${gold ? " gold" : ""}` });
      s.style.left = `${r.left - p.left + r.width * (0.15 + Math.random() * 0.7)}px`;
      s.style.top = `${r.top - p.top + r.height / 2}px`;
      s.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      s.style.setProperty("--dy", `${Math.sin(a) * d - 20}px`);
      panel.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  };

  // ---- milestones: one at a time, each with its sound and (if big) its burst
  const queue: CryLine[] = [];
  let revealing = 0;
  const reveal = (): void => {
    const c = queue.shift();
    if (!c) {
      revealing = 0;
      return;
    }
    const who = c.who.split(/\s+/)[0] ?? c.who;
    const li = h("li", { class: `catchup-cry k-${c.k}`, "data-k": c.k }, `${who} · ${c.text}`);
    list.prepend(li);
    while (list.children.length > SHOWN) list.lastElementChild?.remove();
    const cue = SOUND[c.k];
    if (cue) audio.cue(cue);
    if (BIG.has(c.k)) burst(li, 14, true);
    if (c.k === "death") burst(li, 8, false);
    revealing = window.setTimeout(reveal, reduced ? 0 : revealMs());
  };

  let lastT = -1,
    records = 0,
    bosses = 0;
  let finished = false;
  return {
    progress(doneS) {
      target = Math.min(totalS, Math.max(target, doneS));
      if (!drive) drive = requestAnimationFrame(chase);
    },
    cries(lines) {
      // the core keeps its last lines only: what is new is what is later than the last heard (`t`), not past an index
      const fresh = lines.filter((c) => c.t > lastT);
      if (!fresh.length) return;
      lastT = Math.max(lastT, ...fresh.map((c) => c.t));
      // the porter's camps are one spinning sum; the list keeps the milestones (records, bosses, deaths, the bottom)
      const add = fresh
        .filter((c) => c.k === "camp")
        .reduce((n, c) => n + Number(/\$(\d+)/.exec(c.text)?.[1] ?? 0), 0);
      if (add > 0) {
        banked += add;
        bank.hidden = false;
        spinTo(banked);
      }
      const milestones = fresh.filter((c) => c.k !== "camp");
      records += milestones.filter((c) => c.k === "record").length;
      bosses += milestones.filter((c) => c.k === "boss").length;
      queue.push(...milestones);
      if (!revealing) reveal();
    },
    finish(s) {
      finished = true;
      return new Promise((resolve) => {
        const end = (): void => {
          clearTimeout(revealing);
          cancelAnimationFrame(spin);
          cancelAnimationFrame(drive);
          el.classList.add("leaving");
          setTimeout(
            () => {
              el.remove();
              resolve();
            },
            reduced ? 0 : 220,
          );
        };
        // let the bar catch up and the queued reveals land, then the welcome back
        const wait = (): void => {
          if (!reduced && (queue.length || !caughtUp())) {
            setTimeout(wait, 120);
            return;
          }
          target = shownS = totalS;
          paint();
          el.classList.add("welcome");
          title.textContent = /* copy:label */ "Welcome back";
          audio.cue("exit_bank");
          setTimeout(() => audio.cue("level"), 260);
          burst(title, 22, true);
          const stat = (n: string, label: string): HTMLElement =>
            h(
              "div",
              { class: "catchup-stat" },
              h("b", { class: "num" }, n),
              h("small", null, label),
            );
          const go = h(
            "button",
            { class: "btn catchup-go", type: "button", onclick: end },
            /* copy:button */ "Continue",
          );
          foot.replaceChildren(
            h(
              "div",
              { class: "catchup-stats" },
              stat(money(s.gold), /* copy:label */ "gold"),
              stat(String(s.runs), /* copy:label */ "runs"),
              stat(String(bosses), /* copy:label */ "bosses"),
              stat(String(records), /* copy:label */ "records"),
            ),
            go,
          );
          go.focus();
          el.addEventListener("keydown", (e) => {
            if (e.key === "Escape" || e.key === "Enter") end();
          });
          if (catchupAuto()) setTimeout(end, 1800);
        };
        wait();
      });
    },
    close() {
      if (finished) return;
      clearTimeout(revealing);
      cancelAnimationFrame(spin);
      cancelAnimationFrame(drive);
      el.remove();
    },
  };
}
