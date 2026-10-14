import type { GoldLine, Lineage } from "../engine/types";
import { effectsLevel } from "../render/fxpref";

type GoldState = Pick<Lineage, "gold" | "gold_ledger">;

export type GoldTransfer = {
  delta: number;
  why: string | null;
  bloodlineId?: number;
};

const sameLine = (a: GoldLine, b: GoldLine): boolean =>
  a.t === b.t &&
  a.delta === b.delta &&
  a.why === b.why &&
  (a.bloodline_id ?? 1) === (b.bloodline_id ?? 1) &&
  a.n === b.n &&
  a.lost === b.lost;

/** Receipts at an explicit successful engine transaction boundary, never a read. */
export function goldTransfers(before: GoldState, after: GoldState): GoldTransfer[] {
  const old = before.gold_ledger ?? [],
    next = after.gold_ledger ?? [];
  const net = after.gold - before.gold;
  let overlap = 0;
  for (let n = Math.min(old.length, next.length); n > 0; n--) {
    if (old.slice(old.length - n).every((line, i) => sameLine(line, next[i]))) {
      overlap = n;
      break;
    }
  }
  const fresh = next.slice(overlap);
  const reconciled =
    (old.length === 0 || overlap > 0) && fresh.reduce((sum, line) => sum + line.delta, 0) === net;
  if (!reconciled) return net === 0 ? [] : [{ delta: net, why: null }];
  const grouped = new Map<string, GoldTransfer>();
  for (const line of fresh) {
    if (line.delta === 0) continue;
    const key = JSON.stringify([line.bloodline_id ?? 1, line.why, Math.sign(line.delta)]);
    const existing = grouped.get(key);
    if (existing) existing.delta += line.delta;
    else
      grouped.set(key, {
        delta: line.delta,
        why: line.why,
        bloodlineId: line.bloodline_id ?? 1,
      });
  }
  return [...grouped.values()];
}

/** Bounded visual scale only. Resource values always come from the engine. */
export function goldParticleScale(
  amount: number,
  low = false,
): { count: number; diameter: number } {
  const magnitude = Math.log2(Math.max(1, Math.abs(amount)) + 1);
  return {
    count: Math.min(low ? 5 : 12, Math.max(2, Math.ceil(magnitude * (low ? 0.4 : 0.8)))),
    diameter: Math.min(12, 4 + magnitude * 0.6),
  };
}

type Point = { x: number; y: number };
type Particle = { animation: Animation; element: HTMLElement; timeout: number };

/** Scroll panels can clip a control whose bounds still lie inside the viewport. */
export function visibleGoldPoint(element: HTMLElement): Point | null {
  if (!element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  let left = Math.max(0, rect.left),
    right = Math.min(innerWidth, rect.right),
    top = Math.max(0, rect.top),
    bottom = Math.min(innerHeight, rect.bottom);
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.visibility !== "visible" || Number(style.opacity) === 0) return null;
    if (node === element) continue;
    const bounds = node.getBoundingClientRect();
    if (/^(hidden|clip|auto|scroll)$/.test(style.overflowX)) {
      left = Math.max(left, bounds.left);
      right = Math.min(right, bounds.right);
    }
    if (/^(hidden|clip|auto|scroll)$/.test(style.overflowY)) {
      top = Math.max(top, bounds.top);
      bottom = Math.min(bottom, bounds.bottom);
    }
  }
  if (right <= left || bottom <= top) return null;
  const point = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const covering = document.elementFromPoint(point.x, point.y);
  // The modal backdrop dims the visible header/world outside its opaque panel.
  const backdropAlpha = covering
    ? getComputedStyle(covering).backgroundColor.match(/^rgba\(.+,\s*([\d.]+)\)$/)?.[1]
    : undefined;
  const backdrop = covering?.classList.contains("sheet-wrap") && Number(backdropAlpha) < 1;
  if (covering && !backdrop && !element.contains(covering) && !covering.contains(element))
    return null;
  return point;
}

/** One screen's decorative transfer layer; disposal cancels motion on navigation. */
export function createGoldTransferFx(): {
  play(
    transfers: GoldTransfer[],
    counter: HTMLElement,
    endpoint: (transfer: GoldTransfer) => HTMLElement | null,
  ): number;
  clear(): void;
  dispose(): void;
} {
  const active = new Set<Particle>();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let previousLevel = effectsLevel();
  let disposed = false;
  const remove = (particle: Particle): void => {
    if (!active.delete(particle)) return;
    clearTimeout(particle.timeout);
    particle.animation.cancel();
    particle.element.remove();
  };
  const clear = (): void => {
    for (const particle of active) remove(particle);
  };
  const preferences = (): void => {
    const level = effectsLevel();
    if (reduced.matches || level === "off" || level !== previousLevel) clear();
    previousLevel = level;
  };
  const visibility = (): void => {
    if (document.hidden) clear();
  };
  reduced.addEventListener("change", preferences);
  window.addEventListener("idlever:effects", preferences);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("idlever:gold-reset", clear);
  return {
    play(transfers, counter, endpoint) {
      if (
        disposed ||
        document.hidden ||
        reduced.matches ||
        effectsLevel() === "off" ||
        document.documentElement.dataset.juice === "off" ||
        typeof Element.prototype.animate !== "function"
      )
        return 0;
      const purse = visibleGoldPoint(counter);
      if (!purse) return 0;
      let created = 0;
      for (const transfer of transfers) {
        if (!Number.isFinite(transfer.delta) || transfer.delta === 0) continue;
        const anchor = endpoint(transfer);
        const other = anchor ? visibleGoldPoint(anchor) : null;
        const local = { x: purse.x, y: Math.min(innerHeight - 4, purse.y + 32) };
        const from = transfer.delta > 0 ? (other ?? local) : purse;
        const to = transfer.delta > 0 ? purse : (other ?? local);
        const scale = goldParticleScale(transfer.delta, effectsLevel() === "low");
        for (let i = 0; i < scale.count && created < 48; i++) {
          while (active.size >= 48) remove(active.values().next().value!);
          const coin = document.createElement("i");
          coin.className = "coin-flight";
          coin.setAttribute("aria-hidden", "true");
          coin.dataset.goldDelta = String(transfer.delta);
          if (transfer.why) coin.dataset.goldReason = transfer.why;
          if (transfer.bloodlineId !== undefined)
            coin.dataset.goldBloodline = String(transfer.bloodlineId);
          Object.assign(coin.style, {
            left: `${from.x}px`,
            top: `${from.y}px`,
            width: `${scale.diameter}px`,
            height: `${scale.diameter}px`,
          });
          document.body.appendChild(coin);
          const dx = to.x - from.x,
            dy = to.y - from.y;
          const fan = (i - (scale.count - 1) / 2) * 5;
          const animation = coin.animate(
            [
              { transform: "translate(-50%,-50%) scale(.6)", opacity: 0 },
              {
                offset: 0.35,
                transform: `translate(calc(-50% + ${dx * 0.35 + fan}px),calc(-50% + ${dy * 0.35 - 24}px)) scale(1)`,
                opacity: 1,
              },
              {
                transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.6)`,
                opacity: 0,
              },
            ],
            { duration: 600, delay: i * 25, easing: "cubic-bezier(.2,.7,.3,1)" },
          );
          const particle: Particle = { element: coin, animation, timeout: 0 };
          active.add(particle);
          particle.timeout = window.setTimeout(() => remove(particle), 1000);
          void animation.finished.catch(() => undefined).finally(() => remove(particle));
          created++;
        }
      }
      return created;
    },
    clear,
    dispose() {
      disposed = true;
      clear();
      reduced.removeEventListener("change", preferences);
      window.removeEventListener("idlever:effects", preferences);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("idlever:gold-reset", clear);
    },
  };
}

/** Only point at a visible place actually named by the engine's receipt. */
export function goldTransferEndpoint(transfer: GoldTransfer): HTMLElement | null {
  const why = transfer.why ?? "";
  const selectors = /^forge\b/.test(why)
    ? [".forge .forge-action", '[data-building="blacksmith"]', '[data-tile="forge"]']
    : /^bank (deposit|withdraw)\b/.test(why)
      ? [".bank-sheet .bank-line", '[data-building="bank"]']
      : /^hire\b/.test(why)
        ? [".works .hire-btn", '[data-building="guild"]']
        : /^bloodline\b/.test(why)
          ? [".hero-add", ".hero-roster"]
          : /^(banked|returned|driven|stalled|lost thread|died|slain|wake pay|porter bonus|fetched by)\b/.test(
                why,
              )
            ? [".report-basics .tile:last-child", ".run-clear", '[data-building="mouth"]']
            : [];
  for (const selector of selectors)
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      if (visibleGoldPoint(element)) return element;
    }
  return null;
}
