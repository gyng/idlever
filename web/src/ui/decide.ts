// Cut 270 (docs/CUT270_LIVE_DECISIONS.md): the live view's decision prompt, the boss chest, the flag limiter and the
// milestone log. Rust owns the decision (its options, its default) and the chest (what the kill gave); these only show
// them and send the choice. The prompt's 5 s are wall time at every speed (the world is held there); ⏸ freezes them.
import type { Chest, Decision } from "../engine/types";
import { h, replace } from "./dom";
import { icon } from "./skin";
import { itemIcon } from "./items";
import skin from "./skin.json";
import "../decide.css";

/** The prompt's window (wall ms), the safety cap on a paused prompt, the keys. */
export const DECIDE_MS = 5000;
export const DECIDE_PAUSE_MAX_MS = 120_000;
const TICK_MS = 50;

export type Prompt = {
  el: HTMLElement;
  /** ⏸ / ▶: the countdown stands still while frozen (the prompt stays open, a choice still applies). */
  freeze(on: boolean): void;
  /** A key (`1`–`3`): true when it picked. */
  key(k: string): boolean;
  /** Close it without a pick (the watch went away: the engine applies the default). */
  dispose(): void;
  /** Wall ms the countdown has used (tests). */
  used(): number;
};

/** The prompt strip: the title, a shrinking bar, one button per option (the default marked `auto`). `pick(i, byHand)`
 *  fires once: the option chosen, or the default at the deadline (`byHand` false). */
export function decisionPrompt(
  d: Decision,
  pick: (i: number | null, byHand: boolean) => void,
): Prompt {
  let used = 0,
    frozenFor = 0,
    last = performance.now(),
    frozen = false,
    done = false;
  const fill = h("i", { class: "decide-fill" });
  const bar = h("span", { class: "decide-bar", "aria-hidden": "true" }, fill);
  const buttons = d.options.map((o, i) =>
    h(
      "button",
      {
        type: "button",
        class: `decide-opt tone-${o.tone}${i === d.default ? " is-default" : ""}`,
        "data-i": String(i),
        "aria-keyshortcuts": String(i + 1),
        onclick: () => finish(i, true),
      },
      h("kbd", { class: "decide-key", "aria-hidden": "true" }, String(i + 1)),
      o.item ? itemIcon(o.item, { size: "xs" }) : null,
      h("span", { class: "decide-label" }, o.label),
      i === d.default ? h("small", { class: "decide-auto" }, /* copy:label */ "auto") : null,
    ),
  );
  const el = h(
    "div",
    {
      class: `decide decide-${d.kind}`,
      role: "group",
      "aria-label": d.title,
      "data-decision": d.id,
      "data-kind": d.kind,
    },
    h("div", { class: "decide-head" }, h("span", { class: "decide-title" }, d.title), bar),
    h("div", { class: "decide-opts" }, ...buttons),
  );
  const paint = (): void => {
    const left = Math.max(0, 1 - used / DECIDE_MS);
    fill.style.transform = `scaleX(${left.toFixed(3)})`;
    el.dataset.left = String(Math.max(0, Math.round(DECIDE_MS - used)));
  };
  const timer = window.setInterval(() => {
    const now = performance.now(),
      dt = now - last;
    last = now;
    if (frozen) {
      frozenFor += dt;
      if (frozenFor >= DECIDE_PAUSE_MAX_MS) finish(null, false);
      return;
    }
    used += dt;
    paint();
    if (used >= DECIDE_MS) finish(null, false);
  }, TICK_MS);
  paint();
  function finish(i: number | null, byHand: boolean): void {
    if (done) return;
    done = true;
    clearInterval(timer);
    const chosen = i ?? d.default;
    el.dataset.picked = String(chosen);
    el.dataset.by = byHand ? "hand" : "auto";
    for (const b of buttons) b.disabled = true;
    buttons[chosen]?.classList.add("is-picked");
    el.classList.add("decided");
    pick(i, byHand);
  }
  return {
    el,
    freeze(on: boolean) {
      if (done) return;
      const now = performance.now();
      if (frozen) frozenFor += now - last;
      else used += now - last;
      last = now;
      frozen = on;
      el.classList.toggle("frozen", on);
      paint();
    },
    key(k: string) {
      const i = Number(k) - 1;
      if (done || !Number.isInteger(i) || i < 0 || i >= d.options.length) return false;
      finish(i, true);
      return true;
    },
    dispose() {
      done = true;
      clearInterval(timer);
      el.remove();
    },
    used: () => used,
  };
}

// ---- the boss chest

/** Cut 277 (owner, 2026-10-18): a chest only when the kill dropped something (a pattern or set piece, or gold). A repeat
 *  kill drops a pattern 1 time in 8, so an empty chest was the usual case; no drop now means no chest, and the kill's
 *  beat plays as it always did. */
export function chestHasDrop(c: Chest): boolean {
  return c.items.length > 0 || c.gold > 0;
}

const SKIN_FX = new Set<string>((skin as { fx?: string[] }).fx ?? []);
/** A packed fx id's file (the `_px` pixel cut when packed, as the shield's), else null: the code primitive draws it. */
const fxUrlIn =
  (FX: ReadonlySet<string>) =>
  (id: string): string | null =>
    FX.has("chest_boss_open_px") && FX.has(`${id}_px`)
      ? `${import.meta.env.BASE_URL}ui/fx/${id}_px.png`
      : FX.has(id)
        ? `${import.meta.env.BASE_URL}ui/fx/${id}.webp`
        : null;
const RINGS = ["common", "uncommon", "rare", "epic", "legendary"];

/** The chest's frames (wall ms from the reveal): closed, cracked, open; the burst and the reward. `fast` packs them into
 *  the fast beat. */
export function chestTimes(fast: boolean): {
  crack: number;
  open: number;
  reward: number;
  end: number;
} {
  return fast
    ? { crack: 150, open: 300, reward: 350, end: 1000 }
    : { crack: 350, open: 700, reward: 900, end: 2600 };
}

/** The reveal: a chest that cracks and opens by itself, light rays, a coin and sparkle burst, a ring tinted by the reward's
 *  rarity, then the reward (Rust's: the pattern or piece, else its gold). `still` (reduced motion, effects off): the open
 *  chest and the reward, nothing moves. A missing art id draws the code primitive (a box and lid, a ring), as the shield does. */
export function chestReveal(
  c: Chest,
  o: { fast: boolean; still: boolean; ids?: ReadonlySet<string>; posed?: boolean },
): HTMLElement {
  const t = chestTimes(o.fast);
  const fxUrl = fxUrlIn(o.ids ?? SKIN_FX);
  const rarity = RINGS.includes(c.rarity) ? c.rarity : "common";
  const frame = (id: string, cls: string): HTMLElement => {
    const url = fxUrl(id);
    return url
      ? h("img", { class: `chest-frame ${cls}`, src: url, alt: "", draggable: "false" })
      : h(
          "span",
          { class: `chest-frame chest-prim ${cls}` },
          h("b", { class: "lid" }),
          h("b", { class: "box" }),
        );
  };
  const ringUrl = fxUrl(`chest_fx_ring_${rarity}`) ?? fxUrl("chest_fx_ring");
  const raysUrl = fxUrl("chest_fx_rays");
  const sparks = fxUrl("chest_fx_sparks");
  const top = c.items[0];
  const reward = top
    ? h(
        "span",
        { class: "chest-reward-line" },
        itemIcon({ kind: top.kind, label: top.label }, { size: "s" }),
        h("span", { class: "chest-label" }, top.label),
        c.items.length > 1 ? h("small", { class: "num" }, `+${c.items.length - 1}`) : null,
        c.gold > 0 ? h("small", { class: "num chest-gold" }, `+$${c.gold}`) : null,
      )
    : h(
        "span",
        { class: "chest-reward-line" },
        icon("gold", "$"),
        h("span", { class: "num chest-gold" }, `+$${c.gold}`),
      );
  const el = h(
    "div",
    {
      class: `chest-reveal rarity-${rarity}${o.still ? " still" : ""}${o.fast ? " fast" : ""}`,
      role: "status",
      "aria-label": top ? top.label : c.gold > 0 ? `+$${c.gold}` : /* copy:callout */ "no drop",
      "data-chest": c.boss,
      "data-rarity": rarity,
      "data-state": o.still ? "open" : "closed",
      style: `--crack:${t.crack}ms;--open:${t.open}ms;--reward:${t.reward}ms;--end:${t.end}ms`,
    },
    raysUrl
      ? h("img", { class: "chest-rays", src: raysUrl, alt: "" })
      : h("span", { class: "chest-rays chest-prim-rays" }),
    ringUrl
      ? h("img", { class: "chest-ring", src: ringUrl, alt: "" })
      : h("span", { class: "chest-ring chest-prim-ring" }),
    h(
      "span",
      { class: "chest-sparks", "aria-hidden": "true" },
      ...(o.still
        ? []
        : Array.from({ length: 12 }, (_, i) =>
            h("i", {
              class: `spark ${i % 3 ? "coin" : "glint"}${sparks ? "" : " prim"}`,
              style: `--a:${(i * 30) % 360}deg;--d:${48 + (i % 4) * 14}px;--k:${i % 4}${sparks ? `;background-image:url(${sparks})` : ""}`,
            }),
          )),
    ),
    h(
      "span",
      { class: "chest-body" },
      frame("chest_boss_closed", "closed"),
      frame("chest_boss_cracked", "cracked"),
      frame("chest_boss_open", "open"),
    ),
    h("span", { class: "chest-reward" }, reward),
  );
  if (!o.still && !o.posed) {
    window.setTimeout(() => (el.dataset.state = "cracked"), t.crack);
    window.setTimeout(() => (el.dataset.state = "open"), t.open);
  }
  return el;
}

/** A `posed` reveal (in the document) held at `ms` of its sequence: its frame and every animation paused there (evidence
 *  frame sequences; the watch never poses). */
export function chestPose(el: HTMLElement, ms: number, fast = false): void {
  const t = chestTimes(fast);
  el.dataset.state = ms < t.crack ? "closed" : ms < t.open ? "cracked" : "open";
  const since = ms < t.crack ? ms : ms < t.open ? ms - t.crack : ms - t.open;
  for (const a of el.getAnimations({ subtree: true })) {
    a.pause();
    const name = (a as CSSAnimation).animationName ?? "";
    a.currentTime = name === "chest-fade" || name === "chest-reward" ? ms : since;
  }
}

// ---- flagged moments

export type FlagKind =
  | "death"
  | "boss"
  | "chest"
  | "record"
  | "decision"
  | "rare"
  | "low"
  | "close";
const FLAG_RANK: Record<FlagKind, number> = {
  death: 7,
  boss: 6,
  chest: 5,
  record: 4,
  decision: 3,
  rare: 2,
  low: 1,
  close: 0,
};
export const FLAG_GAP_MS = 2500;
export const FLAG_PER_MIN = 6;

/** The flag lane's limiter: at most one flag per FLAG_GAP_MS and FLAG_PER_MIN a minute; inside the gap only a boss or a death
 *  takes the lane from a lower flag (it is replaced); anything else is dropped. */
export function flagGate(now: () => number = () => performance.now()) {
  const shown: number[] = [];
  let lastAt = -Infinity,
    lastRank = -1;
  return (kind: FlagKind): boolean => {
    const t = now(),
      r = FLAG_RANK[kind];
    while (shown.length && t - shown[0] >= 60_000) shown.shift();
    const inGap = t - lastAt < FLAG_GAP_MS;
    // inside the gap only a boss or a death cuts in, and only over a lower flag
    if (inGap && (r <= lastRank || r < FLAG_RANK.boss)) return false;
    if (shown.length >= FLAG_PER_MIN && kind !== "death") return false;
    shown.push(t);
    lastAt = t;
    lastRank = r;
    return true;
  };
}

/** Each kind's icon (the skin's, else a glyph) and tint. */
export const FLAG_LOOK: Record<FlagKind, { icon: string; glyph: string; tone: string }> = {
  death: { icon: "skull", glyph: "☠", tone: "danger" },
  boss: { icon: "boss", glyph: "♛", tone: "danger" },
  chest: { icon: "vault", glyph: "▣", tone: "gold" },
  record: { icon: "depth", glyph: "▼", tone: "gold" },
  decision: { icon: "fork", glyph: "⑂", tone: "calm" },
  rare: { icon: "gem", glyph: "◆", tone: "rare" },
  low: { icon: "hp", glyph: "♥", tone: "danger" },
  close: { icon: "hp", glyph: "♥", tone: "calm" },
};

// ---- the milestone log

export type Milestone = {
  t: number;
  depth: number;
  kind:
    | "floor"
    | "best"
    | "secured"
    | "boss"
    | "slain"
    | "decision"
    | "chest"
    | "rare"
    | "close"
    | "exit";
  text: string;
  tip?: string;
  tone?: string;
};
const MS_GLYPH: Record<Milestone["kind"], string> = {
  floor: "▾",
  best: "★",
  secured: "▣",
  boss: "♛",
  slain: "⚔",
  decision: "⑂",
  chest: "✦",
  rare: "◆",
  close: "♥",
  exit: "⌂",
};

/** The compact milestone list (one line each: `D7 ▣ secured $42`), newest last, beside the detailed log. On a phone it is
 *  a fold under the map: closed by default, its height fixed, so filling it moves nothing. */
export function milestoneLog(): {
  el: HTMLDetailsElement;
  add(m: Milestone): void;
  entries(): Milestone[];
} {
  const list = h("ol", { class: "milestones", "aria-label": /* copy:label */ "Milestones" });
  const count = h("small", { class: "num ms-count" }, "0");
  const summary = h("summary", { class: "ms-head" }, /* copy:label */ "Milestones", " ", count);
  const el = h("details", { class: "milestone-log" }, summary, list);
  const all: Milestone[] = [];
  return {
    el,
    add(m: Milestone) {
      const last = all[all.length - 1];
      if (last && last.kind === m.kind && last.text === m.text && last.depth === m.depth) return;
      all.push(m);
      const li = h(
        "li",
        {
          class: `ms ms-${m.kind}${m.tone ? ` tone-${m.tone}` : ""}`,
          "data-tick": String(m.t),
          "data-kind": m.kind,
          title: m.tip ?? `t${m.t}`,
          tabindex: "0",
        },
        h("small", { class: "num ms-depth" }, `D${m.depth}`),
        h("span", { class: "ms-ico", "aria-hidden": "true" }, MS_GLYPH[m.kind]),
        h("span", { class: "ms-text" }, m.text),
      );
      list.appendChild(li);
      while (list.childElementCount > 40) list.firstElementChild!.remove();
      replace(count, String(all.length));
      list.scrollTop = list.scrollHeight;
    },
    entries: () => [...all],
  };
}
