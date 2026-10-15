/** Modal keyboard ownership, independent of material/layout. Anchored pickers retain pointer pass-through;
 * modeless tools deliberately allow focus to leave. A dismissed chain restores its actual external opener. */
type SheetEntry = {
  wrap: HTMLElement;
  panel: HTMLElement;
  modeless: boolean;
  blocksRoot: boolean;
  focus(): void;
};
const entries: SheetEntry[] = [];
let rootBefore: { root: HTMLElement; inert: boolean } | undefined;
const top = (): SheetEntry | undefined =>
  [...entries].reverse().find((entry) => entry.wrap.isConnected && !entry.wrap.hidden);
const visible = (el: HTMLElement): boolean =>
  el.isConnected &&
  !el.closest("[hidden],[inert]") &&
  !!el.getClientRects().length &&
  getComputedStyle(el).visibility !== "hidden";
const targets = (panel: HTMLElement): HTMLElement[] =>
  [
    ...panel.querySelectorAll<HTMLElement>(
      'button,input,select,textarea,a[href],summary,[tabindex],[contenteditable="true"]',
    ),
  ].filter((el) => !el.matches(":disabled") && visible(el));
const controls = (panel: HTMLElement): HTMLElement[] =>
  targets(panel).filter((el) => el.tabIndex >= 0);
function syncRoot(): void {
  const blocked = entries.some((entry) => entry.wrap.isConnected && entry.blocksRoot);
  if (blocked) {
    const root = document.getElementById("app");
    if (root && !rootBefore) rootBefore = { root, inert: root.inert };
    if (rootBefore) rootBefore.root.inert = true;
  } else if (rootBefore) {
    // The main menu owns inertness after a settings→menu transition.
    if (!document.body.classList.contains("menu-open")) rootBefore.root.inert = rootBefore.inert;
    rootBefore = undefined;
  }
}
function key(el: HTMLElement): string {
  if (el.id) return JSON.stringify(["id", el.id]);
  const owner = el.closest<HTMLElement>(
    "[data-node],[data-journal-focus],[data-hub-tab],[data-order],[data-slot],.srow,.order-row",
  );
  const identity = (node: HTMLElement | null): string =>
    node
      ? [...node.attributes]
          .filter((a) =>
            /^(id|data-(node|journal-focus|hub-tab|order|slot|action|section|id))$/.test(a.name),
          )
          .map((a) => `${a.name}=${a.value}`)
          .join("|")
      : "";
  const label = el.getAttribute("aria-label") ?? "";
  const classes = [...el.classList].filter(
    (c) => !["on", "selected", "busy", "pending", "chosen"].includes(c),
  );
  const row = owner?.querySelector(".label,.olab")?.textContent?.trim() ?? "";
  return JSON.stringify([
    el.tagName,
    identity(el),
    identity(owner),
    label,
    classes,
    row,
    owner || label || el.id ? "" : el.textContent?.trim(),
  ]);
}
window.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const entry = top();
  if (!entry || entry.modeless) return;
  const options = controls(entry.panel);
  const current = options.indexOf(document.activeElement as HTMLElement);
  if (!options.length) {
    event.preventDefault();
    entry.focus();
  } else if (
    current < 0 ||
    (!event.shiftKey && current === options.length - 1) ||
    (event.shiftKey && current === 0)
  ) {
    event.preventDefault();
    options[event.shiftKey ? options.length - 1 : 0]!.focus({ preventScroll: true });
  }
});
window.addEventListener("focusin", (event) => {
  const entry = top();
  if (
    entry &&
    !entry.modeless &&
    event.target instanceof Node &&
    !entry.panel.contains(event.target)
  )
    entry.focus();
});

export function ownSheetFocus(
  wrap: HTMLElement,
  panel: HTMLElement,
  opts: { modeless?: boolean; anchor?: HTMLElement | null; center?: boolean },
  opener: HTMLElement | null,
): () => void {
  let remembered: { element: HTMLElement; key: string; index: number } | undefined;
  const focus = (): void => {
    // Journal/Hub, inputs and disclosures may already have made an explicit focus request.
    if (panel.contains(document.activeElement) && visible(document.activeElement as HTMLElement))
      return;
    const options = controls(panel);
    const explicit = panel.querySelector<HTMLElement>("[autofocus],[data-sheet-initial-focus]");
    const target = explicit && visible(explicit) ? explicit : options[0];
    if (target) target.focus({ preventScroll: true });
    else {
      panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
    }
  };
  const entry = {
    wrap,
    panel,
    modeless: !!opts.modeless,
    blocksRoot: !opts.modeless && (!!opts.center || !opts.anchor),
    focus,
  };
  entries.push(entry);
  if (!opts.modeless) panel.setAttribute("aria-modal", "true");
  const remember = (event: FocusEvent): void => {
    if (!(event.target instanceof HTMLElement) || !panel.contains(event.target)) return;
    remembered = {
      element: event.target,
      key: key(event.target),
      index: controls(panel).indexOf(event.target),
    };
  };
  panel.addEventListener("focusin", remember);
  const observer = new MutationObserver(() => {
    if (top() !== entry || entry.modeless || !remembered) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      panel.contains(active) &&
      visible(active) &&
      !active.matches(":disabled")
    )
      return;
    if (visible(remembered.element) && !remembered.element.matches(":disabled")) return;
    const options = controls(panel);
    // Prefer the same logical action after a repaint. If it disappeared, use its successor in the tab order.
    const successor =
      targets(panel).find((el) => key(el) === remembered!.key) ??
      options[Math.max(0, Math.min(remembered.index, options.length - 1))];
    if (successor) {
      successor.focus({ preventScroll: true });
      successor.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else focus();
  });
  observer.observe(panel, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["disabled", "hidden", "inert"],
  });
  syncRoot();
  const initial = requestAnimationFrame(() => {
    if (top() === entry && !entry.modeless) focus();
  });
  return () => {
    cancelAnimationFrame(initial);
    observer.disconnect();
    panel.removeEventListener("focusin", remember);
    const index = entries.indexOf(entry);
    if (index >= 0) entries.splice(index, 1);
    syncRoot();
    const parent = top();
    // Closing a modeless inspector must not steal focus from a control the player already chose underneath it.
    const preserveModeless =
      entry.modeless &&
      document.activeElement !== document.body &&
      !panel.contains(document.activeElement);
    requestAnimationFrame(() => {
      if (preserveModeless) return;
      if (top() !== parent || document.body.classList.contains("menu-open")) return;
      if (parent?.panel.contains(document.activeElement)) return;
      if (opener && visible(opener) && (!parent || parent.panel.contains(opener)))
        opener.focus({ preventScroll: true });
      else if (parent && !parent.modeless) parent.focus();
      else if (!parent) {
        const root = document.getElementById("app");
        if (root && !root.inert) {
          root.tabIndex = -1;
          root.focus({ preventScroll: true });
        }
      }
    });
  };
}
