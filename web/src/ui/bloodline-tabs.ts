import { h, replace } from "./dom";
import "../bloodline-tabs.css";
export type BloodlineTab = "loadouts" | "class" | "legacy";
const KEYS: BloodlineTab[] = ["loadouts", "class", "legacy"];
/* copy:label */ const NAMES = { loadouts: "Loadouts", class: "Class", legacy: "Legacy" };
let windows = 0;

/** Stable tab controls; refreshed content retains its reading/focus state. */
export function bloodlineTabs(initial: BloodlineTab) {
  const prefix = `bloodline-${++windows}`;
  let selected = initial;
  const panels = new Map<BloodlineTab, HTMLElement>();
  const fingerprints = new Map<BloodlineTab, string>();
  const scroll = new Map<BloodlineTab, number>();
  let focus:
    | { tag: string; text: string; tab?: BloodlineTab; panel?: BloodlineTab; action?: string }
    | undefined;
  const select = (key: BloodlineTab, remember = true): void => {
    const old = panels.get(selected);
    if (old && remember) scroll.set(selected, old.scrollTop);
    selected = key;
    for (const [k, panel] of panels) {
      panel.hidden = k !== key;
      if (k === key) panel.scrollTop = scroll.get(k) ?? 0;
    }
    for (const [k, button] of buttons) {
      button.setAttribute("aria-selected", String(k === key));
      button.tabIndex = k === key ? 0 : -1;
    }
  };
  const buttons = new Map(
    KEYS.map((key) => [
      key,
      h(
        "button",
        {
          class: "btn bloodline-tab",
          role: "tab",
          id: `${prefix}-${key}-tab`,
          "aria-controls": `${prefix}-${key}-panel`,
          "aria-selected": String(key === selected),
          tabindex: key === selected ? 0 : -1,
          "data-bloodline-tab": key,
          onclick: () => select(key),
          onkeydown: (event: Event) => {
            const e = event as KeyboardEvent;
            const i = KEYS.indexOf(key);
            const next =
              e.key === "ArrowRight"
                ? KEYS[(i + 1) % 3]
                : e.key === "ArrowLeft"
                  ? KEYS[(i + 2) % 3]
                  : e.key === "Home"
                    ? KEYS[0]
                    : e.key === "End"
                      ? KEYS[2]
                      : undefined;
            if (next) {
              e.preventDefault();
              select(next);
              buttons.get(next)!.focus({ preventScroll: true });
            }
          },
        },
        NAMES[key],
      ),
    ]),
  );
  const el = h(
    "div",
    {
      class: "bloodline-tabs",
      role: "tablist",
      "aria-label": /* copy:label */ "Bloodline sections",
    },
    ...buttons.values(),
  );
  return {
    el,
    capture(): void {
      for (const [key, panel] of panels) if (!panel.hidden) scroll.set(key, panel.scrollTop);
      const active = document.activeElement as HTMLElement | null;
      focus =
        active && (el.contains(active) || [...panels.values()].some((p) => p.contains(active)))
          ? {
              tag: active.tagName,
              text: active.textContent ?? "",
              action: active.dataset.action,
              tab: active.dataset.bloodlineTab as BloodlineTab | undefined,
              panel: [...panels].find(([, panel]) => panel === active)?.[0],
            }
          : undefined;
    },
    panel(
      key: BloodlineTab,
      fingerprint: string,
      ...content: (Node | null | string)[]
    ): HTMLElement {
      const existing = panels.get(key);
      if (existing) {
        if (fingerprints.get(key) !== fingerprint) replace(existing, ...content);
        fingerprints.set(key, fingerprint);
        return existing;
      }
      const panel = h(
        "section",
        {
          class: "bloodline-panel",
          role: "tabpanel",
          id: `${prefix}-${key}-panel`,
          "aria-labelledby": `${prefix}-${key}-tab`,
          "data-bloodline-panel": key,
          hidden: selected !== key,
          tabindex: 0,
        },
        ...content,
      );
      panels.set(key, panel);
      fingerprints.set(key, fingerprint);
      return panel;
    },
    restore(): void {
      select(selected, false);
      if (!focus) return;
      const actionTarget = focus.action
        ? panels
            .get(selected)
            ?.querySelector<HTMLElement>(`[data-action="${CSS.escape(focus.action)}"]`)
        : undefined;
      const target = focus.panel
        ? panels.get(focus.panel)
        : focus.tab
          ? buttons.get(focus.tab)
          : (actionTarget ??
            [
              ...(panels
                .get(selected)
                ?.querySelectorAll<HTMLElement>("button, summary, input, [tabindex]") ?? []),
            ].find((e) => e.tagName === focus!.tag && e.textContent === focus!.text));
      (target && !(target as HTMLButtonElement).disabled ? target : buttons.get(selected))?.focus({
        preventScroll: true,
      });
    },
  };
}
