// Cut316: the component kit's builders. Screens compose these; they never invent a new button, panel or stat line.
// Look: ui-kit/kit.css (tokens: ui-kit/tokens.css). Words pass through h() (docs/COPY.md §2) and keep the copy budgets.
import { h } from "../ui/dom";

type Child = Node | string | number | null | undefined | false;
type On = (e: Event) => void;

/** The one button: the hub's filled slab. `tone` primary (gold) / danger; `size` lg; `pressed` makes it a toggle. */
export function slab(
  label: Child | Child[],
  opts: {
    onClick?: On;
    tone?: "primary" | "danger";
    size?: "lg";
    pressed?: boolean;
    disabled?: boolean;
    cls?: string;
    attrs?: Record<string, string | number | boolean | undefined>;
  } = {},
): HTMLButtonElement {
  const cls = [
    "k-slab",
    opts.tone ? `k-${opts.tone}` : "",
    opts.size ? `k-${opts.size}` : "",
    opts.cls ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return h(
    "button",
    {
      class: cls,
      type: "button",
      onclick: opts.onClick,
      disabled: opts.disabled,
      "aria-pressed": opts.pressed === undefined ? undefined : String(opts.pressed),
      ...opts.attrs,
    },
    ...(Array.isArray(label) ? label : [label]),
  );
}
/** An even grid of slabs (the hub's 2–3 column rhythm). */
export const slabs = (...children: Child[]): HTMLElement =>
  h("div", { class: "k-slabs" }, ...children);

/** A framed group with a title plate. `gilt` frames it in gold (the selected / featured group). */
export function section(
  title: Child,
  children: Child[],
  opts: { cls?: string; gilt?: boolean; attrs?: Record<string, string | undefined> } = {},
): HTMLElement {
  return h(
    "section",
    {
      class: `k-section${opts.gilt ? " k-gilt" : ""}${opts.cls ? ` ${opts.cls}` : ""}`,
      ...opts.attrs,
    },
    title ? h("h3", { class: "k-section-title" }, title) : null,
    ...children,
  );
}
/** Art first, then the big serif name, then a small meta line; `aside` sits right (a close stud is the window's). */
export function header(opts: {
  title: Child;
  meta?: Child | Child[];
  art?: string | HTMLElement | null;
  aside?: Child;
  cls?: string;
}): HTMLElement {
  const art =
    typeof opts.art === "string"
      ? h("img", { class: "k-art", src: opts.art, alt: "" })
      : opts.art
        ? (opts.art.classList.add("k-art"), opts.art)
        : null;
  return h(
    "header",
    { class: `k-header${opts.cls ? ` ${opts.cls}` : ""}` },
    art ?? h("span", { hidden: true }),
    h(
      "div",
      { class: "k-header-text" },
      h("h2", { class: "k-title" }, opts.title),
      opts.meta
        ? h("div", { class: "k-meta" }, ...(Array.isArray(opts.meta) ? opts.meta : [opts.meta]))
        : null,
    ),
    opts.aside ?? h("span", { hidden: true }),
  );
}
export type Stat = { label: string; value: Child; note?: Child; gold?: boolean; key?: string };
/** Big numerals in labelled tiles. */
export function stats(items: Stat[], cls = ""): HTMLElement {
  return h(
    "div",
    { class: `k-stats${cls ? ` ${cls}` : ""}` },
    ...items.map((s) =>
      h(
        "div",
        { class: "k-stat", "data-stat": s.key },
        h("span", { class: "k-stat-label" }, s.label),
        h("b", { class: `k-stat-value num${s.gold ? " gold" : ""}` }, s.value),
        s.note ? h("small", { class: "k-stat-note" }, s.note) : null,
      ),
    ),
  );
}
/** Labelled rows: name (+ small note) left, a value or a control right. */
export function rows(
  items: { label: Child; note?: Child; end?: Child; key?: string; cls?: string }[],
): HTMLElement {
  return h(
    "div",
    { class: "k-rows" },
    ...items.map((r) =>
      h(
        "div",
        { class: `k-row${r.cls ? ` ${r.cls}` : ""}`, "data-row": r.key },
        h(
          "div",
          { class: "k-row-label" },
          h("b", {}, r.label),
          r.note ? h("small", {}, r.note) : null,
        ),
        r.end ?? null,
      ),
    ),
  );
}
/** The hub's tab strip: slabs with aria-selected; `pick` repaints. */
export function tabs<T extends string>(
  items: { id: T; label: string }[],
  current: T,
  pick: (id: T) => void,
): HTMLElement {
  return h(
    "div",
    { class: "k-tabs", role: "tablist" },
    ...items.map((t) =>
      h(
        "button",
        {
          class: "k-slab",
          type: "button",
          role: "tab",
          "data-tab": t.id,
          "aria-selected": String(t.id === current),
          onclick: () => pick(t.id),
        },
        t.label,
      ),
    ),
  );
}
/** Icon + label + badge. */
export function tile(opts: {
  icon?: Child;
  label: Child;
  badge?: Child;
  onClick?: On;
  cls?: string;
}): HTMLElement {
  return h(
    opts.onClick ? "button" : "div",
    { class: `k-tile k-bare${opts.cls ? ` ${opts.cls}` : ""}`, onclick: opts.onClick },
    opts.icon ?? null,
    h("span", {}, opts.label),
    opts.badge !== undefined && opts.badge !== null
      ? h("b", { class: "k-badge" }, opts.badge)
      : null,
  );
}
/** The gauge: `share` 0..1. */
export function meter(share: number, opts: { hp?: boolean; label?: string } = {}): HTMLElement {
  const pct = Math.max(0, Math.min(1, share)) * 100;
  return h(
    "div",
    {
      class: `k-meter${opts.hp ? " k-hp" : ""}`,
      role: "meter",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": Math.round(pct),
      "aria-label": opts.label,
    },
    h("i", { style: `width:${pct.toFixed(1)}%` }),
  );
}
