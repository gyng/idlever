import { classIcon } from "./class-icons";
import type { BloodlineTab } from "./bloodline-tabs";
import { openHeroHub, heroHubOwner, type HeroHubSection } from "./hero-hub";
import { heroPresence, heroAway } from "./hero-presence";
// Home's actual sprites are the primary surfaces (≥44px, full accessible names).
// Existing native availability lights eave lanterns; hover/focus/long-press shows
// details and a normal tap opens the existing panel. Purchases remain inside it.
import "../town.css";
import "../legible.css";
import type { App } from "../app";
import type { HeroService, HeroSlot, Lineage, ReturnReport } from "../engine/types";
import {
  createTownView,
  inspectTownGlowTiming,
  townState,
  BUILDINGS,
  type BuildingId,
  type PlotId,
  type TownState,
  type TownView,
} from "../render/town";
import { h, replace, spanOf, toast } from "./dom";
import { guildOfferPending } from "./order-offer";
import { decorationSrc, icon } from "./skin";
import { kitAffordable } from "./forge";
import { openWindow as openSheet, closeAllSheets } from "./sheet";
import { tile, paintFace } from "./frame";
import { audio } from "../audio";
import { effectsLevel } from "../render/fxpref";
import { createGoldTransferFx, goldTransfers, visibleGoldPoint } from "./gold-transfers";
import { questShown } from "./quest";
import {
  buildLabel,
  buildNode,
  featText,
  nextPill,
  nodeIcon,
  openWorks,
  workerTitle,
} from "./works";
import { townGraveyard } from "./feats"; // Cut 118 (owner amendment §4): the graveyard's stones
import { townCrier } from "./crier"; // Cut 118 §8: the town crier   // Cut 30.5: the `next` pill, the works sheet
import { openHeroLife } from "./hero-life";
import { openCampOrders } from "./camp";
import { classList, classUnlockReason } from "./unlocks";
import { CLASS_VERBS } from "../engine/classes";
import { classSkillLadder } from "./class-skills";
import { kwHost, detailHost, closeTip } from "./tips";
import { HOME_BUILDINGS, buildingDetails, type HomeBuilding } from "./building-help";
import { buildingUpgradeRow } from "./building-upgrades";
import type { Term } from "./concepts";
/** docs/TOOLTIPS.md: a building's tip (long-press / hover; its tap stays its panel) */
const HIT_TERM: Record<string, Term> = /* copy:none */ {
  crate: "pack",
  blacksmith: "forge",
  kennel: "kennel",
  bank: "bank",
  board: "quest",
  chest: "chest",
  worker: "worker",
};

/** what a target opens (the camp wires each to its panel or sheet) */
export type TownHooks = {
  resident?(ms: number): void;
  send(): void;
  hero(anchor: HTMLElement): void;
  open(what: "loadout" | "party", anchor: HTMLElement): void;
  forge(anchor: HTMLElement): void;
  quest(anchor: HTMLElement): void;
};
/* copy:label */
const LABEL: Record<string, string> = {
  guild: "Guild reception",
  pool: "Recovery pool",
  device: "Clone vat",
  mouth: "Delve",
  tent: "hero",
  crate: "Loadouts",
  blacksmith: "forge",
  kennel: "Pets",
  bank: "savings",
  staked: "next plot",
  board: "quest board",
  chest: "chest",
  worker: "next worker",
};
/* copy:label */
const BUILD_NAME: Record<string, string> = {
  house: "house",
  blacksmith: "forge",
  kennel: "kennel",
  bank: "bank",
};
/** a building's tile on the bar: its id (the old console ids, kept: tests and badges key on them), icon and word */
/* copy:button */
export const BUILDING_TILE: Record<
  BuildingId,
  { id: string; icon: string; label: string; glyph: string }
> = {
  blacksmith: { id: "forge", icon: "forge", label: "forge", glyph: "⚒" },
  kennel: { id: "party", icon: "party", label: "Pets", glyph: "🐾" },
  bank: { id: "bank", icon: "gold", label: "savings", glyph: "$" },
};
/** the buildings standing, in build order (null: a lineage with no town on the wire — the old console reveal stands) */
export const townBuilt = (L: Lineage): BuildingId[] | null =>
  L.town
    ? L.town.buildings
        .map((b) => b.id)
        .filter((id): id is BuildingId => (BUILDINGS as readonly string[]).includes(id))
    : null;

type Store = { seen: string[]; opened: string[] };
const KEY = (L: Lineage): string => /* copy:none */ `idlever.town.${L.seed ?? 0}`;
function load(L: Lineage): Store | null {
  try {
    const s = localStorage.getItem(KEY(L));
    return s ? (JSON.parse(s) as Store) : null;
  } catch {
    return null;
  }
}
function save(L: Lineage, s: Store): void {
  try {
    localStorage.setItem(KEY(L), JSON.stringify(s));
  } catch {
    /* a per-viewer convenience */
  }
}
/** a building's panel opened (its `!` rune goes) */
/** Cut 228: the step the Forge is fitting on this home hero (Rust `Town.forge_work`), or none — never a delving,
 *  recovering or cloning hero. */
export function forgeFitting(L: Lineage, slot: HeroSlot | undefined): string | undefined {
  const work = L.town?.forge_work;
  if (!work || !slot || work.hero !== slot.id || heroAway(slot)) return undefined;
  if (slot.life_state === "recovering" || slot.life_state === "reincarnating") return undefined;
  return work.step;
}
/** Cut 120 §10: the town target a worker's post stands at (`WorkerPost.post` / `WorkNode.post`). */
const postTarget = (post?: string): string => post ?? "mouth";
const SHOW_NEXT_MARKER = false;
/** Cut 120 §7/§10: the next worker's mark — his chore's count by hand and the hours to his fallback (`forge 2/3 · or 30h`), from the
 *  core's `Works.next_worker` node (`progress`, `eta_h`); none once he is lit (his post carries his price) or with no count. */
export function nextWorkerMark(
  L: Pick<Lineage, "tree">,
): { id: string; name: string; post?: string; text: string } | null {
  const W = L.tree,
    n = W?.next_worker ? W.nodes.find((x) => x.id === W.next_worker) : undefined;
  if (!n || n.state === "done" || n.state === "lit" || !(n.progress || n.feat)) return null;
  // (Cut235: a feat worker's mark is its feat, not a count)
  const goal = n.feat ? featText(n.feat, n.feat_done) : `${n.chore ?? ""} ${n.progress}`;
  return {
    id: n.id,
    name: n.name,
    post: n.post,
    text: /* copy:callout */ `${goal}${n.eta_h ? ` · or ${n.eta_h}h` : ""}`.trim(),
  };
}

export function markOpened(L: Lineage, id: string): void {
  const s = load(L) ?? { seen: [], opened: [] };
  if (!s.opened.includes(id)) {
    s.opened.push(id);
    save(L, s);
  }
}

/** Cut262: the orders the Guild's lantern has announced this session (one ≤ 3-word toast each, never a control) */
const announced = new Set<string>();
/** Cut272: an exit's or a fetch's gold line — a haul the porter carries home */
const HAUL_WHY =
  /^(banked|returned|driven|stalled|lost thread|died|slain|wake pay|porter bonus|fetched by|salvage|passage|secured )/;

export type TownUi = {
  el: HTMLElement;
  view: TownView;
  paint(): void;
  send(after: () => void): void;
  dispose(): void;
  anchorOf(id: string): HTMLElement | null;
};
export function renderTown(app: App, hooks: TownHooks): TownUi {
  const el = h("div", { class: "town" });
  const hits = h("div", { class: "town-hits" });
  const actorHits = h("div", { class: "town-actor-hits" });
  const delveFaces = h("div", {
    class: "town-delve-faces",
    "aria-label": /* copy:label */ "Delving heroes",
  });
  const actorButtons = new Map<number, HTMLElement>();
  const actorReservations = new Map<number, { x: number; y: number; w: number; h: number }>();
  let actorKey = "",
    choosingActor = 0;
  const chooseActor = async (id: number, watch: boolean, anchor: HTMLElement): Promise<void> => {
    const token = ++choosingActor;
    if (!app.lineage.hero_slots?.some((s) => s.id === id)) return;
    closeTip();
    closeAllSheets();
    if (!(await app.selectBloodline(id)) || token !== choosingActor) return;
    const slot = app.lineage.hero_slots?.find((s) => s.id === id);
    if (!slot || app.lineage.selected_bloodline !== id) return;
    closeAllSheets();
    if (watch && heroAway(slot)) app.go({ kind: "watch" });
    else openHero(app, anchor.isConnected ? anchor : null);
  };
  const buildingId = (id: string): HomeBuilding | null => {
    const actual = id === "tent" ? "house" : id === "staked" ? state?.staked?.id : id;
    return HOME_BUILDINGS.includes(actual as HomeBuilding) ? (actual as HomeBuilding) : null;
  };
  const service = (id: string): HeroService | undefined => {
    const life = app.lineage.persistent_hero;
    return id === "guild"
      ? life?.guild
      : id === "pool"
        ? life?.pool
        : id === "device"
          ? life?.device
          : undefined;
  };
  const serviceDetails = (id: string): Node[] => {
    const actual = service(id);
    if (!actual) return [];
    return [
      // Cut 277: the level in the tip's head, as the works name it (`Guildhouse II`)
      h(
        "div",
        { class: "kw-tip-head" },
        h("b", {}, actual.name),
        id === "guild" &&
          (app.lineage.town?.workplaces?.find((w) => w.id === "guild")?.level ?? 0) >= 2
          ? h("span", { class: "num town-level" }, /* copy:callout */ " II")
          : null,
      ),
      h("div", { class: "kw-tip-gloss" }, actual.body),
    ];
  };
  let building = false;
  const buildPlot = (): void => {
    const plot = state?.staked;
    if (building || !plot?.ready || !app.engine.buildTown) return;
    building = true;
    tag.setAttribute("aria-busy", "true");
    void app
      .mutate(() => app.engine.buildTown!(plot.id), /* copy:callout */ "build", false, {
        saveBeforePaint: true,
      })
      .finally(() => {
        building = false;
        tag.setAttribute("aria-busy", "false");
      });
  };
  const inspectPlot = (): void => {
    const plot = state?.staked;
    if (!plot) return;
    if (plot.ready && app.engine.buildTown) {
      buildPlot();
      return;
    }
    openSheet(() =>
      h("div", { class: "sheet-body plot-preview" }, ...buildingDetails(app.lineage, plot.id)),
    );
  };
  const tag = h("div", {
    class: "town-tag num",
    hidden: true,
    "aria-live": "polite",
    onclick: inspectPlot,
    onkeydown: (e: Event) => {
      const k = e as KeyboardEvent;
      if (k.key === "Enter" || k.key === " ") {
        k.preventDefault();
        inspectPlot();
      }
    },
  });
  const labelResize =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          if (el.isConnected) layout();
        });
  labelResize?.observe(tag);
  const plotDetails = (): Node[] => {
    const plot = state?.staked;
    return plot ? buildingDetails(app.lineage, plot.id) : [];
  };
  detailHost(tag, plotDetails);
  const foundation = h("div", { class: "town-foundation", hidden: true, "aria-hidden": "true" });
  // Presentation-only vector: an empty foundation and four stakes, no house silhouette.
  foundation.innerHTML =
    /* copy:none */ '<svg viewBox="0 0 104 64" xmlns="http://www.w3.org/2000/svg"><path class="chalk" d="M12 32 52 12 92 32 52 52Z"/><path class="stake" d="M12 32V22 M52 12V2 M92 32V22 M52 52V42"/><path class="stake-cap" d="M8 20h8v4H8z M48 0h8v4h-8z M88 20h8v4h-8z M48 40h8v4h-8z"/></svg>';
  const plotArt = decorationSrc("house_plot_v2");
  if (plotArt)
    foundation.append(
      h("img", {
        src: plotArt,
        alt: "",
        draggable: "false",
        onload: () => foundation.classList.add("painted"),
        onerror: () => foundation.classList.remove("painted"),
      }),
    );
  // Cut 30.5: the `next` pill rides the scene's top-left (the home screen's one goal); a tap opens the works on its node
  // Cut272 (owner: collection is diegetic): `open chest` points at the chest in the scene (its tap collects), never a console collect
  const pill = nextPill(app, (node, at) => {
    const chest = btns.get("chest");
    if (app.lineage.tree?.next?.kind === "chest" && chest && !chest.hidden) {
      chest.focus({ preventScroll: true });
      if (!view.pulse("chest")) {
        chest.classList.remove("task-point");
        void chest.offsetWidth;
        chest.classList.add("task-point");
        setTimeout(() => chest.classList.remove("task-point"), 2600);
      }
      return;
    }
    openWorks(app, node, at);
  });
  kwHost(pill.el, "next"); // docs/TOOLTIPS.md: its tip on long-press / hover
  // c30-legible (the owner, a new player: "I didn't understand why there were new buildings"): a building's arrival names what raised
  // it (`first gold home → blacksmith`, the core's trigger), once, over the town while it stands up; its target glows the while
  const arrival = h("div", { class: "town-arrival num", "aria-live": "polite" });
  // Cut264 §4: the first clone's callout, over the vat (placed by layout())
  const cloneCallout = h("div", {
    class: "town-arrival town-clone-callout num",
    "aria-live": "polite",
    "data-callout": "clone",
  });

  // Cut 118 §8: the crier, top right (the pill's opposite), crying the last absence's notable acts
  const crier = townCrier(app);
  // Cut 118 (owner amendment §4): the graveyard at the scene's foot, left — a stone per fallen heir (the newest few), epitaphs on hover
  const yard = townGraveyard(app);
  el.append(
    hits,
    actorHits,
    delveFaces,
    foundation,
    tag,
    arrival,
    cloneCallout,
    pill.el,
    crier.el,
    yard.el,
  );
  let arrivalTimer = 0;
  const view = createTownView(el);
  let chestOpenUntil = 0,
    chestTimer = 0;
  const coins = createGoldTransferFx();
  // Cut272: the ledger this scene has seen (a haul landing after it: the porter's errand); taken at mount, never replayed
  let ledgerSeen: Pick<Lineage, "gold" | "gold_ledger"> = {
    gold: app.lineage.gold,
    gold_ledger: app.lineage.gold_ledger?.map((line) => ({ ...line })),
  };
  // the hit target's id as the view knows it (the lit worker by his own id)
  const rid = (id: string): string =>
    id === "worker" ? `worker:${btns.get("worker")?.dataset.worker ?? ""}` : id;
  // the store: what this viewer has seen built (a building first seen goes up: scaffold → built) and opened (its rune goes)
  let store = load(app.lineage);
  // (an old save's first camp shows its town standing: no scaffold on everything)
  if (!store) {
    store = { seen: townBuilt(app.lineage) ?? [], opened: townBuilt(app.lineage) ?? [] };
    save(app.lineage, store);
  }
  // the absence's parties: the report just read (once per absence)
  const ab = app.lastAbsence && !app.lastAbsence.played ? app.lastAbsence : null;
  if (ab) ab.played = true;
  const absence: ReturnReport | null = ab?.report ?? null;
  let state: TownState | null = null;
  const btns = new Map<string, HTMLButtonElement>();
  // Cut264: the residents this view saw cloning, and those whose clones finished under its eyes (`Clone ready` until he departs
  // or the vat is tapped)
  let cloningSeen = new Set<number>();
  const cloneReadyIds = new Set<number>();
  let calloutTimer = 0;
  let sending = false;
  let tagTimer = 0;

  function kitInfo(): { n: number; price?: number } {
    const n = kitAffordable(app.lineage);
    const price = (app.lineage.kit ?? [])
      .filter((k) => k.next?.affordable)
      .map((k) => k.next!.price)
      .sort((a, b) => a - b)[0];
    return { n, price };
  }
  /** Cut264: the residents cloning now (by id; an old wire without slots reads the selected hero) */
  function cloningIds(L: Lineage): Set<number> {
    const cloning = (x?: string): boolean => x === "reincarnating" || x === "recovering";
    const slots = L.hero_slots;
    if (slots) return new Set(slots.filter((x) => cloning(x.life_state)).map((x) => x.id));
    const hero = L.persistent_hero;
    return new Set(hero && cloning(hero.state) ? [L.selected_bloodline ?? 1] : []);
  }
  function trackClone(L: Lineage): void {
    const now = cloningIds(L);
    for (const id of cloningSeen) if (!now.has(id)) cloneReadyIds.add(id);
    for (const id of cloneReadyIds) {
      const slot = L.hero_slots?.find((x) => x.id === id);
      const gone = slot ? heroAway(slot) : L.persistent_hero?.state === "away";
      if (gone || now.has(id) || (L.hero_slots && !slot)) cloneReadyIds.delete(id);
    }
    cloningSeen = now;
  }
  /** Cut264 §4: the first clone this viewer sees growing — `Clone growing` over the vat, once (the `seen` store); later only the badge */
  function cloneOnce(L: Lineage, s0: Store): void {
    if (!state?.clone || state.clone.left <= 0 || !state.services?.includes("device")) return;
    if (s0.seen.includes("clone")) return;
    save(L, { ...s0, seen: [...new Set([...s0.seen, "clone"])] });
    replace(cloneCallout, h("b", null, /* copy:callout */ "Clone growing"));
    cloneCallout.classList.add("show");
    cloneCallout.dataset.shown = "true";
    clearTimeout(calloutTimer);
    calloutTimer = window.setTimeout(() => cloneCallout.classList.remove("show"), 4600);
  }
  function paint(): void {
    const L = app.lineage;
    const s0 = load(L) ?? store!;
    const previousState = state;
    const previousHome = state?.home;
    trackClone(L);
    state = townState(L, absence, {
      cloneReady: cloneReadyIds.size > 0,
      seen: s0.seen,
      opened: s0.opened,
      kit: kitInfo(),
      absenceNew: !!absence,
      board: questShown(L),
      chestOpen: performance.now() < chestOpenUntil,
    });
    view.setState(state);
    porterHaul(L);
    if (previousHome === false && state.home) hooks.resident?.(0);
    // seen now (a re-mount does not raise it again)
    const built = state.buildings.map((b) => b.id);
    const fresh = built.filter((b) => !s0.seen.includes(b));
    if (fresh.length) save(L, { ...s0, seen: [...new Set([...s0.seen, ...built])] });
    cloneOnce(L, load(L) ?? s0);
    targets();
    paintActors();
    pill.paint();
    pill.el.hidden = !state.home || !L.tree;
    crier.paint(!!state.home);
    yard.paint(!!state.home);
    if (previousState) {
      const constructed = fresh.filter((id) => !previousState.buildings.some((b) => b.id === id));
      if (constructed.length) arrive(constructed);
    }
  }
  /** Cut272: a haul landed with the porter hired (Rust moved the gold already) — he fetches it from the chest and carries it home;
   *  several at once, a catch-up, reduced motion or effects off: no walk, the `+$N` alone */
  function porterHaul(L: Lineage): void {
    const before = ledgerSeen;
    ledgerSeen = { gold: L.gold, gold_ledger: L.gold_ledger?.map((line) => ({ ...line })) };
    const porter = L.tree?.nodes.find((n) => n.id === "porter");
    if (!state?.home || !porter || porter.state !== "done" || porter.paused) return;
    const moves = goldTransfers(before, L);
    const haul = moves.filter((m) => m.delta > 0 && HAUL_WHY.test(m.why ?? ""));
    if (!haul.length) return;
    const gold = haul.reduce((sum, m) => sum + m.delta, 0);
    const to = moves.some((m) => (m.why ?? "").startsWith("bank deposit")) ? "bank" : "house";
    const quick = haul.length > 1 || app.catchingUp || !el.isConnected;
    el.dataset.haul = String(gold);
    if (quick) {
      floatGold(gold, to);
      return;
    }
    void view.haul(to).then((walked) => {
      if (el.isConnected) floatGold(gold, to);
      el.dataset.hauled = walked ? "walked" : "skipped";
    });
  }
  function floatGold(gold: number, to: "house" | "bank"): void {
    const p = view.haulAt(to);
    const f = h("span", { class: "town-haul-float num gold", "aria-hidden": "true" }, `+$${gold}`);
    Object.assign(f.style, { left: `${Math.round(p.x)}px`, top: `${Math.round(p.y)}px` });
    el.appendChild(f);
    setTimeout(() => f.remove(), 1700);
  }
  function paintActors(): void {
    const slots = app.lineage.hero_slots ?? [];
    const key = JSON.stringify(
      slots.map((s) => [
        s.id,
        s.heir,
        s.class,
        s.look,
        s.hero_name,
        s.name,
        s.state,
        s.life_state,
        s.live?.depth,
        s.live?.run_id,
        s.live?.activity,
      ]),
    );
    for (const slot of slots) {
      const button =
        delveFaces.querySelector<HTMLElement>(`[data-delving-hero="${slot.id}"]`) ??
        actorButtons.get(slot.id);
      if (!button) continue;
      button.title = `${slot.hero_name || slot.name} · ${heroPresence(slot).text}`;
      const depth = button.querySelector(".town-delving-depth");
      if (depth) depth.textContent = slot.live ? `D${slot.live.depth}` : "…";
    }
    if (key === actorKey) return;
    actorKey = key;
    if (actorHits.querySelector(".kw-open") || delveFaces.querySelector(".kw-open")) closeTip();
    actorButtons.clear();
    actorHits.replaceChildren();
    delveFaces.replaceChildren();
    for (const slot of slots) {
      const name = slot.hero_name || slot.name;
      const away = heroAway(slot);
      const button = h("button", {
        class: away ? "town-delving-hero" : "town-home-hero",
        "data-home-hero": away ? undefined : slot.id,
        "data-delving-hero": away ? slot.id : undefined,
        "data-heir": slot.heir,
        "aria-label": `${name} · ${away ? "Watch delve" : "Hero details"}`,
        title: `${name} · ${heroPresence(slot).text}`,
        onclick: (e: Event) => {
          let id = slot.id;
          const pointer = e as MouseEvent;
          if (!away && pointer.detail > 0) {
            const townBox = el.getBoundingClientRect();
            let distance = Infinity;
            for (const candidate of actorButtons.keys()) {
              const r = view.actorRect(candidate);
              if (!r) continue;
              const d = Math.hypot(
                pointer.clientX - townBox.left - r.x - r.w / 2,
                pointer.clientY - townBox.top - r.y - r.h / 2,
              );
              if (d < distance) {
                distance = d;
                id = candidate;
              }
            }
          }
          void chooseActor(id, away, e.currentTarget as HTMLElement);
        },
      });
      detailHost(button, () => {
        const current = app.lineage.hero_slots?.find((s) => s.id === slot.id);
        // Cut 228: why he stands at the anvil — the step Rust says the Forge just made for him
        const fitting = forgeFitting(app.lineage, current);
        return current
          ? [
              h("div", { class: "kw-tip-head" }, current.hero_name || current.name),
              h("div", { class: "kw-tip-gloss" }, heroPresence(current).text),
              fitting
                ? h(
                    "div",
                    { class: "kw-tip-gloss", "data-routine": "forge" },
                    /* copy:callout */ `At Forge · ${fitting}`,
                  )
                : null,
            ].filter((n): n is HTMLDivElement => !!n)
          : [];
      });
      if (away) {
        const face = h("span", { class: "town-delving-face", "aria-hidden": "true" });
        paintFace(face, slot.class, 36, slot.look);
        button.append(
          face,
          h("span", { class: "town-delving-depth num" }, slot.live ? `D${slot.live.depth}` : "…"),
        );
        delveFaces.append(button);
      } else {
        button.append(h("span", { class: "vh" }, name));
        actorButtons.set(slot.id, button);
        actorHits.append(button);
      }
    }
    layoutActors();
  }
  function layoutActors(): void {
    const targets = new Map(view.actorTargets().map((target) => [target.id, target]));
    let reservationsChanged = false;
    for (const id of actorReservations.keys()) {
      if (!targets.has(id) || !actorButtons.has(id)) {
        actorReservations.delete(id);
        reservationsChanged = true;
      }
    }
    for (const [id, button] of actorButtons) {
      const r = targets.get(id);
      button.hidden = !r;
      if (!r) continue;
      const reserved = actorReservations.get(id);
      if (
        !reserved ||
        r.x < reserved.x ||
        r.y < reserved.y ||
        r.x + r.w > reserved.x + reserved.w ||
        r.y + r.h > reserved.y + reserved.h
      ) {
        // Re-solve on arrival or when a hero leaves this small envelope,
        // rather than running the label search on every movement frame.
        actorReservations.set(id, { x: r.x - 12, y: r.y - 12, w: r.w + 24, h: r.h + 24 });
        reservationsChanged = true;
      }
      Object.assign(button.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.w}px`,
        height: `${r.h}px`,
      });
    }
    if (reservationsChanged && el.isConnected && !tag.hidden) placeTag();
    const cave = view.rectOf("mouth");
    if (cave)
      Object.assign(delveFaces.style, {
        left: `${Math.round(Math.max(6, Math.min(el.clientWidth - delveFaces.offsetWidth - 6, cave.x + cave.w / 2 - delveFaces.offsetWidth / 2)))}px`,
        top: `${Math.max(6, Math.round(cave.y + 4))}px`,
      });
  }
  view.onActors(layoutActors);
  const offActorLive = app.onLive(() => {
    if (el.isConnected) {
      paint();
    }
  });
  /** c30-legible: the arrival's beat — `first gold home → blacksmith` (≤ 4 words + the arrow) — and the eye drawn to the building */
  function arrive(ids: string[]): void {
    const T = app.lineage.town;
    const parts = ids.map((id) => ({
      id,
      why: T?.buildings.find((b) => b.id === id)?.trigger ?? "",
    }));
    replace(
      arrival,
      ...parts.flatMap((p, i) => [
        i ? h("br") : "",
        p.why ? `${p.why} ` : "",
        p.why ? h("span", { class: "arrow" }, "→ ") : "",
        h("b", null, p.id),
      ]),
    );
    arrival.dataset.arrived = ids.join(" ");
    arrival.dataset.why = parts.map((p) => (p.why ? `${p.why} → ${p.id}` : p.id)).join(" | ");
    arrival.classList.add("show");
    for (const id of ids) btns.get(id)?.classList.add("arrived");
    clearTimeout(arrivalTimer);
    arrivalTimer = window.setTimeout(() => {
      arrival.classList.remove("show");
      for (const id of ids) btns.get(id)?.classList.remove("arrived");
    }, 4600);
  }
  /** the hit targets: one button per thing one can tap, over its sprite (≥ 44 px), its label hidden */
  function targets(): void {
    const s = state;
    if (!s) return;
    const fresh = app.lineage.best_depth === 0 && !app.lineage.runs?.length;
    const want: { id: string; plot: PlotId | "staked" | "chest" | "worker" }[] = [
      ...(s.home
        ? [
            { id: "mouth", plot: "mouth" as PlotId },
            { id: "tent", plot: "house" as PlotId },
            ...(fresh ? [] : [{ id: "crate", plot: "crate" as PlotId }]),
          ]
        : []),
      ...s.buildings.map((b) => ({ id: b.id, plot: b.id as PlotId })),
      ...(["guild", "pool", "device"] as const)
        // (Cut273: the Guildhouse once built — before, its plot is the lit worker's target)
        .filter((id) => service(id)?.available && (s.services ?? []).includes(id))
        .map((id) => ({ id, plot: id as PlotId })),
      ...(s.board ? [{ id: "board", plot: "board" as PlotId }] : []),
    ];
    // Cut 30.5: the chest taps while it holds a haul (drawn, closed and empty, it is no surface); the lit node's greyed worker opens the works
    if (s.chest?.state === "full") want.push({ id: "chest", plot: "chest" });
    if (s.workers.some((w) => w.lit)) want.push({ id: "worker", plot: "worker" });
    // the staked plot shows from day 0; it taps (its trigger) once the first building stands — day 0 keeps its four surfaces
    if (s.staked && (s.home || s.stage >= 1 || s.staked.ready))
      want.push({ id: "staked", plot: "staked" });
    for (const [id, b] of btns)
      if (!want.some((w) => w.id === id)) {
        view.highlight(rid(id), "hover", false);
        view.highlight(rid(id), "focus", false);
        b.remove();
        btns.delete(id);
      }
    // Cut 120 §10: the next worker's count and fallback on his post (`forge 2/3 · or 30h`) while no hire is lit — one marker, inside the
    // budget (≤ 3 with the scene's own); a post with no target here (its building not standing) shows it at the mouth
    const nw = nextWorkerMark(app.lineage),
      lit0 = s.workers.some((x) => x.lit);
    // Cut231 §5 (owner clutter budget): the next worker's count now rides the `next` pill and the task tracker, so the post marker
    // stays off (it was a third copy of `forge 2/3 · or 30h`); nextWorkerMark still feeds tests and tooling
    const nwAt =
      nw && !lit0 && s.markers.length < 3 && SHOW_NEXT_MARKER
        ? want.some((x) => x.id === postTarget(nw.post))
          ? postTarget(nw.post)
          : want.some((x) => x.id === "mouth")
            ? "mouth"
            : undefined
        : undefined;
    for (const w of want) {
      let b = btns.get(w.id);
      const label =
        w.id === "staked" && s.staked?.ready
          ? /* copy:button */ `Build ${BUILD_NAME[s.staked.id] ?? s.staked.id}`
          : w.id === "mouth" && app.lineage.live
            ? /* copy:button */ "Watch run"
            : (LABEL[w.id] ?? w.id);
      if (!b) {
        b = h(
          "button",
          {
            class: `town-hit hit-${w.id}`,
            "data-building": w.id,
            // Cut262: hidden until layout() places it over its sprite (it appeared at the scene's corner, then jumped)
            hidden: true,
            "aria-label": label,
            onclick: () => tap(w.id),
          },
          h("span", { class: "vh" }, label),
        );
        // Cut272: hover and keyboard focus light the sprite's own silhouette (the view draws it; the box is only the fallback)
        const id = w.id,
          hb = b;
        b.addEventListener("pointerenter", () => view.highlight(rid(id), "hover", true));
        b.addEventListener("pointerleave", () => view.highlight(rid(id), "hover", false));
        b.addEventListener("focus", () => {
          if (hb.matches(":focus-visible")) view.highlight(rid(id), "focus", true);
        });
        b.addEventListener("blur", () => view.highlight(rid(id), "focus", false));
        // a task's tap (ui/tasks.ts pointAt): its two pulses on the sprite, the DOM ring only where none can be drawn
        b.addEventListener("idlever:point", () => {
          if (view.pulse(rid(id))) hb.classList.add("glow-pulse");
          setTimeout(() => hb.classList.remove("glow-pulse"), 2600);
        });
        // Rich details keep keyword encounter metadata after toolbar labels disappear.
        if (HIT_TERM[w.id]) kwHost(b, HIT_TERM[w.id]!);
        if (service(w.id)) detailHost(b, () => serviceDetails(w.id));
        else if (buildingId(w.id))
          detailHost(b, () => [
            ...buildingDetails(app.lineage, buildingId(w.id)!),
            ...(state?.markers ?? [])
              .filter((m) => m.at === w.id && m.label)
              .map((m) => h("div", { class: "kw-tip-gloss" }, m.label!)),
          ]);
        btns.set(w.id, b);
        hits.appendChild(b);
      }
      b.setAttribute("aria-label", label);
      b.title = label;
      b.querySelector(".vh")!.textContent = label;
      // markers ride their building's target (one surface, the same panel)
      const mk = s.markers.filter((m) => m.at === w.id);
      // Cut262: an order first useful (Legacy spend, worker ranks) lights the Guild reception's lantern — its row waits in the sheet
      const offer = w.id === "guild" ? guildOfferPending(app.lineage) : null;
      if (offer) {
        mk.unshift({
          at: "guild",
          kind: "rune",
          label:
            offer === "legacy" ? /* copy:label */ "Legacy order" : /* copy:label */ "Rank order",
        });
        if (!announced.has(offer)) {
          announced.add(offer);
          const say = () =>
            toast(
              offer === "legacy"
                ? /* copy:callout */ "Legacy · Guild"
                : /* copy:callout */ "Ranks · Guild",
            );
          // Cut268 (integration): an honour toast up at the same camp paint (honours.ts) speaks first; the order's waits for it
          if (document.querySelector(".toast.honour-toast")) setTimeout(say, 2700);
          else say();
        }
      }
      b.dataset.offer = offer ?? "";
      // the lit worker carries his price (`$40` · `free`), the chest the porter's count (`2/3`)
      const lit = w.id === "worker" ? s.workers.find((x) => x.lit) : undefined;
      // Cut273: the lit worker's workplace is built (or raised a level) — the build brings him; no hire of its own
      const litNode = lit ? app.lineage.tree?.nodes.find((node) => node.id === lit.id) : undefined;
      const verb =
        (litNode?.level ?? 1) > 1 ? /* copy:label */ "Upgrade" : /* copy:label */ "Build";
      if (lit)
        mk.push({
          at: "chest",
          kind: "coin",
          label: lit.price ? `${verb} $${lit.price}` : /* copy:label */ `${verb} free`,
        });
      if (lit) {
        const worker = litNode;
        const hiring = /* copy:tooltip */ `${worker ? buildLabel(worker) : lit.id} · ${worker ? workerTitle(worker) : lit.id} arrives · ${lit.price ? `$${lit.price}` : "free"}`;
        b.setAttribute("aria-label", hiring);
        b.title = hiring;
        b.querySelector(".vh")!.textContent = hiring;
      }
      const actionNames = mk
        .map((m) => m.label)
        .filter(Boolean)
        .join(" · ");
      if (actionNames && !lit) {
        b.setAttribute("aria-label", `${label} · ${actionNames}`);
        b.title = `${label} · ${actionNames}`;
      }
      if (w.id === "worker")
        detailHost(b, () => [h("strong", null, b.getAttribute("aria-label") ?? label)]);
      b.dataset.worker = lit?.id ?? "";
      const holder =
        b.querySelector(".town-markers") ?? b.appendChild(h("span", { class: "town-markers" }));
      const markerState = JSON.stringify([
        mk[0]?.kind ?? null,
        nw && nwAt === w.id ? [nw.id, nw.name, nw.text] : null,
      ]);
      // Preserve the lamp and its animation clock across ordinary Home refreshes.
      if (holder.getAttribute("data-marker-state") !== markerState) {
        holder.setAttribute("data-marker-state", markerState);
        replace(
          holder,
          // One lit lantern per building; its accessible name retains every action.
          ...mk.slice(0, 1).map((m) => {
            const lamp = h("span", {
              class: `town-marker mk-${m.kind}`,
              "data-marker": m.kind,
              "aria-hidden": "true",
            });
            const src = decorationSrc("town_readiness_lantern");
            if (src) {
              const image = h("img", { alt: "", draggable: "false" });
              image.addEventListener("load", () => lamp.classList.add("town-marker-painted"), {
                once: true,
              });
              image.addEventListener(
                "error",
                () => {
                  lamp.classList.remove("town-marker-painted");
                  image.remove();
                },
                { once: true },
              );
              image.src = src;
              lamp.appendChild(image);
            }
            return lamp;
          }),
        );
        if (nw && nwAt === w.id)
          holder.appendChild(
            h(
              "span",
              {
                class: "town-marker mk-next",
                "data-marker": "next",
                "data-node": nw.id,
                title: nw.name,
              },
              nodeIcon(nw.id, nw.name),
              h("b", { class: "num" }, nw.text),
            ),
          );
      }
      b.dataset.markers = [...mk.map((m) => m.kind), ...(nw && nwAt === w.id ? ["next"] : [])].join(
        " ",
      );
      b.dataset.ready = mk.length ? "true" : "false";
      // Cut264 §4: the growing clone's time left on the vat (`.town-count`) and its progress ring
      const growing = w.id === "device" && s.clone && s.clone.left > 0 ? s.clone : undefined;
      const cnt =
        w.id === "chest" && s.chest?.need
          ? `${s.chest.count ?? 0}/${s.chest.need}`
          : growing
            ? spanOf(growing.left)
            : "";
      const ce = b.querySelector(".town-count");
      if (cnt) {
        if (ce) ce.textContent = cnt;
        else b.appendChild(h("span", { class: "town-count num" }, cnt));
      } else ce?.remove();
      const ring = b.querySelector<HTMLElement>(".town-ring");
      if (growing) {
        const r = ring ?? b.appendChild(h("span", { class: "town-ring", "aria-hidden": "true" }));
        r.style.setProperty("--p", `${Math.round(growing.progress * 360)}deg`);
        r.dataset.progress = growing.progress.toFixed(3);
      } else ring?.remove();
      b.dataset.clone =
        w.id === "device" && s.clone ? (s.clone.left > 0 ? "growing" : "ready") : "";
      if (growing) {
        const say = `${label} · ${/* copy:label */ `Cloning ${spanOf(growing.left)}`}`;
        b.setAttribute("aria-label", say);
        b.title = say;
      }
    }
    // c30-legible: the staked plot always wears its tag — what it becomes and what raises it (`kennel · first tame`), not only on tap
    if (s.staked && (s.home || s.stage >= 1 || s.staked.ready)) {
      const ready = s.staked.ready;
      const buildIcon =
        s.staked.id === "house" ? "forge" : (BUILDING_TILE[s.staked.id]?.icon ?? "forge");
      replace(
        tag,
        ready ? icon(buildIcon, "⚒") : null,
        h(
          "span",
          { class: ready ? "build-copy" : "" },
          h(
            "span",
            { class: "build-title" },
            ready ? h("span", { class: "build-ready" }, /* copy:button */ "Build", " ") : null,
            h(
              "b",
              null,
              ready
                ? (BUILD_NAME[s.staked.id] ?? s.staked.id)
                : (LABEL[s.staked.id] ?? s.staked.id),
            ),
          ),
          ready ? h("small", { class: "dim" }, /* copy:label */ "Free") : null,
        ),
        !ready && s.staked.trigger ? h("span", { class: "dim" }, ` · ${s.staked.trigger}`) : null,
      );
      tag.hidden = false;
      tag.dataset.next = s.staked.id;
    } else tag.hidden = true;
    tag.classList.toggle("build-marker", s.staked?.ready === true);
    // Cut272: what can act now shimmers on its own sprite (the eave lantern stays the second cue)
    view.setReady(
      [...btns.entries()].filter(([, b]) => b.dataset.ready === "true").map(([id]) => rid(id)),
    );
    if (s.staked?.ready && app.engine.buildTown) {
      tag.setAttribute("role", "button");
      tag.tabIndex = 0;
    } else {
      tag.setAttribute("role", "button");
      tag.tabIndex = 0;
    }
    layout();
  }
  function layout(): void {
    const s = state;
    if (!s) return;
    for (const [id, b] of btns) {
      const wk = id === "worker" ? state?.workers.find((x) => x.lit) : undefined;
      const r = view.rectOf(
        id === "staked"
          ? "staked"
          : id === "chest"
            ? "chest"
            : id === "worker"
              ? `worker:${wk?.id ?? ""}`
              : (id as PlotId),
      );
      // (Cut262: never shown before the scene stands in the page — a detached mount's rect put it at the corner for a frame)
      if (!r || !el.isConnected || !el.clientWidth) {
        b.hidden = true;
        continue;
      }
      b.hidden = false;
      b.classList.toggle("glow-sprite", view.glowsSprite(rid(id)));
      b.dataset.fx = effectsLevel();
      // ≥ 44 px each way, centred on the sprite (a building's box trimmed to its body: the roof's sky is not the building)
      const readyPlot = id === "staked" && s.staked?.ready === true;
      const cx = r.x + r.w / 2,
        by = r.y + r.h;
      const size = plotSize(cx);
      const w = readyPlot
          ? size.w
          : Math.max(
              44,
              r.w * (id === "mouth" ? 0.6 : id === "chest" || id === "worker" ? 1 : 0.86),
            ),
        hh = readyPlot
          ? size.h
          : Math.max(
              44,
              r.h * (id === "mouth" ? 0.7 : id === "chest" || id === "worker" ? 1 : 0.8),
            );
      Object.assign(b.style, {
        left: `${Math.round(cx - w / 2)}px`,
        top: `${Math.round(by - hh + (hh > r.h ? (hh - r.h) / 2 : 0))}px`,
        width: `${Math.round(w)}px`,
        height: `${Math.round(hh)}px`,
      });
    }
    if (!tag.hidden) placeTag();
    // Cut264: the clone's callout rides above the vat (the scene's top when the vat is out of view)
    const vat = view.rectOf("device");
    if (vat && el.clientWidth) {
      const half = cloneCallout.offsetWidth / 2;
      const cx = Math.max(half + 6, Math.min(el.clientWidth - half - 6, vat.x + vat.w / 2));
      Object.assign(cloneCallout.style, {
        left: `${Math.round(cx)}px`,
        top: `${Math.max(6, Math.round(vat.y - cloneCallout.offsetHeight - 10))}px`,
      });
    }
    foundation.hidden = state?.staked?.ready !== true;
    foundation.dataset.fx = effectsLevel();
  }
  view.onLayout(() => {
    layout();
    layoutActors();
  });
  function plotSize(cx: number): { w: number; h: number } {
    const w = Math.min(164, Math.max(44, 2 * Math.min(cx - 8, el.clientWidth - cx - 8)));
    return { w, h: Math.max(44, (w * 108) / 164) };
  }
  function placeTag(): void {
    const r = view.rectOf("staked");
    if (!r) {
      tag.hidden = true;
      return;
    }
    const ready = state?.staked?.ready === true,
      cx = r.x + r.w / 2;
    const size = plotSize(cx),
      cy = r.y + r.h / 2;
    if (ready)
      Object.assign(foundation.style, {
        left: `${Math.round(cx)}px`,
        top: `${Math.round(cy)}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
      });
    const half = tag.offsetWidth / 2;
    const tagCx = Math.max(half + 8, Math.min(el.clientWidth - half - 8, cx));
    const height = tag.offsetHeight;
    const defaultBottom = ready ? cy + size.h / 2 + 12 + height : r.y - 6;
    const clampBottom = (bottom: number): number =>
      Math.max(height + 8, Math.min(el.clientHeight - 8, bottom));
    // Keep construction copy clear of action centres and their full resource
    // badges. Price text can extend beyond the central44px worker target.
    const targets = [...btns.entries()]
      .filter(([id, b]) => id !== "staked" && !b.hidden)
      .map(([, b]) => ({
        x: Number.parseFloat(b.style.left) + b.offsetWidth / 2 - 22,
        y: Number.parseFloat(b.style.top) + b.offsetHeight / 2 - 22,
        w: 44,
        h: 44,
      }));
    if (ready) targets.push({ x: cx - size.w / 2, y: cy - size.h / 2, w: size.w, h: size.h });
    const origin = el.getBoundingClientRect();
    // the next-worker pill (it grew a count and bar, Cut231 §5) and the task tracker are overlays the tag must clear too
    for (const marker of el.querySelectorAll<HTMLElement>(
      ".town-marker,.next-pill,.task-tracker",
    )) {
      if (marker.hidden) continue;
      const box = marker.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      targets.push({
        x: box.left - origin.left,
        y: box.top - origin.top,
        w: box.width,
        h: box.height,
      });
    }
    targets.push(...actorReservations.values());
    const candidates = [
      ...new Set([
        clampBottom(defaultBottom),
        clampBottom(cy - size.h / 2 - 12),
        ...targets.flatMap((p) => [clampBottom(p.y - 8), clampBottom(p.y + p.h + height + 8)]),
        clampBottom(height + 8),
        clampBottom(el.clientHeight - 8),
      ]),
    ];
    const score = (bottom: number): number =>
      targets.reduce((n, p) => {
        const dx = Math.max(
          0,
          Math.min(tagCx + half + 4, p.x + p.w + 4) - Math.max(tagCx - half, p.x),
        );
        const dy = Math.max(
          0,
          Math.min(bottom + 4, p.y + p.h + 4) - Math.max(bottom - height, p.y),
        );
        return n + dx * dy;
      }, 0);
    const bottom = candidates.reduce(
      (best, candidate) => (score(candidate) < score(best) ? candidate : best),
      candidates[0],
    );
    tag.classList.toggle("marker-above", bottom <= cy);
    tag.style.setProperty("--build-anchor-offset", `${cx - tagCx}px`);
    Object.assign(tag.style, {
      left: `${Math.round(tagCx)}px`,
      top: `${Math.round(bottom)}px`,
    });
  }
  function tap(id: string): void {
    view.poke();
    const b = btns.get(id)!;
    const L = app.lineage;
    const facility = service(id);
    if (facility) {
      if (!facility.available) return;
      // Cut264: a tap on the vat reads its `Clone ready` (the lantern goes)
      if (id === "device" && cloneReadyIds.size > 0) {
        cloneReadyIds.clear();
        paint();
      }
      closeAllSheets();
      if (id === "guild") openWorks(app, L.tree?.next_worker ?? undefined, b);
      else openHeroLife(app, b, id === "pool" ? "recovery" : "rebirth");
      return;
    }
    if (id === "mouth") {
      hooks.send();
      return;
    }
    if (id === "chest") {
      void openChest();
      return;
    }
    if (id === "worker") {
      // Cut273: the lit worker's workplace — a tap builds it (or raises its level) when the purse pays; else the works on him
      const node = app.lineage.tree?.nodes.find((n) => n.id === b.dataset.worker);
      if (node && node.state === "lit" && node.affordable !== false) {
        void buildNode(app, node);
        return;
      }
      openWorks(app, b.dataset.worker || undefined, b);
      return;
    }
    if (id === "staked") {
      const s = state?.staked;
      if (!s) return;
      if (s.ready && app.engine.buildTown) {
        buildPlot();
        return;
      }
      // the next building and what raises it (`kennel · first tame`): always shown (c30-legible); a tap flashes it
      replace(
        tag,
        h("b", null, LABEL[s.id] ?? s.id),
        s.trigger ? h("span", { class: "dim" }, ` · ${s.trigger}`) : "",
      );
      tag.hidden = false;
      placeTag();
      tag.classList.add("flash");
      clearTimeout(tagTimer);
      tagTimer = window.setTimeout(() => {
        tag.classList.remove("flash");
      }, 1200);
      inspectPlot();
      return;
    }
    if ((BUILDINGS as readonly string[]).includes(id)) {
      markOpened(L, id);
      paint();
    }
    if (id === "tent") hooks.hero(b);
    else if (id === "crate") hooks.open("loadout", b);
    else if (id === "kennel") hooks.open("party", b);
    else if (id === "blacksmith") hooks.forge(b);
    else if (id === "bank") openBank(app, b);
    else if (id === "board") hooks.quest(b);
  }
  /** Cut 30.5: the chest's tap — the lid flips, the coins arc to the purse (quick: ~0.5 s), the purse counts up (juice.ts), the porter's
   *  count moves (the core's `openChest`; the porter's chore). */
  async function openChest(): Promise<void> {
    if (!app.engine.openChest || (app.lineage.tree?.chest ?? 0) <= 0) return;
    // Cut272: where the coins start — the chest's own target, read before the paint retires it (a mark holds its place)
    const gold = app.lineage.tree?.chest ?? 0,
      at = btns.get("chest")?.getBoundingClientRect();
    const from = at?.width ? h("i", { class: "town-coin-from", "aria-hidden": "true" }) : null;
    if (from && at) {
      Object.assign(from.style, {
        left: `${at.left + at.width / 2 - 3}px`,
        top: `${at.top + at.height / 2 - 3}px`,
      });
      document.body.appendChild(from);
      setTimeout(() => from.remove(), 1200);
    }
    chestOpenUntil = performance.now() + 1500;
    paint();
    clearTimeout(chestTimer);
    chestTimer = window.setTimeout(() => {
      if (el.isConnected) paint();
    }, 1550);
    audio.cue("exit_bank");
    await app.mutate(() => app.engine.openChest!()); // (no forecast move to name: the purse is the sims' either way)
    // Cut272: the haul's coins fly from the chest to the purse (decoration; the purse's figure is Rust's)
    const purse = [...document.querySelectorAll<HTMLElement>(".gold")].find(
      (g) => !el.contains(g) && visibleGoldPoint(g),
    );
    if (purse && from) coins.play([{ delta: gold, why: "chest" }], purse, () => from);
  }
  function send(after: () => void): void {
    if (sending) return;
    sending = true;
    const reduce =
      document.documentElement.dataset.juice === "off" ||
      matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    void (reduce ? Promise.resolve() : view.walkIn(650)).then(() => {
      after();
    });
    setTimeout(() => {
      sending = false;
    }, 2500);
  }
  paint();
  return {
    el,
    view,
    paint,
    send,
    anchorOf: (id) => btns.get(id) ?? null,
    dispose: () => {
      labelResize?.disconnect();
      offActorLive();
      closeTip();
      clearTimeout(tagTimer);
      clearTimeout(chestTimer);
      clearTimeout(arrivalTimer);
      clearTimeout(calloutTimer);
      coins.dispose();
      view.dispose();
    },
  };
}

/** The building bar's tile for a standing building (`forge` · `kennel` · `bank`): the same panel as the building. */
export function buildingTile(
  id: BuildingId,
  o: { on?: boolean; fresh?: boolean; onclick: () => void },
): HTMLButtonElement {
  const t = BUILDING_TILE[id];
  const b = tile({
    id: t.id,
    label: t.label,
    icon: t.icon,
    glyph: t.glyph,
    on: o.on,
    fresh: o.fresh,
    onclick: o.onclick,
  });
  b.dataset.building = id;
  return b;
}

/** Cut 30 §3: the bank — deposits earn ~2 % a night, capped at `bank_cap` (the core's); one tap each way. */
export function openBank(app: App, anchor?: HTMLElement | null): void {
  openSheet(
    (close) => {
      const body = h("div", { class: "sheet-body bank-sheet" });
      const paint = (): void => {
        const L = app.lineage,
          T = L.town;
        if (!T) {
          close();
          return;
        }
        const room = Math.max(0, T.bank_cap - T.bank),
          put = Math.min(L.gold, room);
        replace(
          body,
          h("div", { class: "label row-label" }, /* copy:label */ "Savings"),
          h(
            "div",
            { class: "bank-line num" },
            h("b", { class: "gold" }, `$${T.bank}`),
            " ",
            h("span", { class: "dim" }, /* copy:label */ "saved"),
            h(
              "span",
              { class: "dim bank-capacity" },
              ` · $${T.bank_cap} `,
              /* copy:label */ "capacity",
            ),
          ),
          h(
            "div",
            { class: "bank-bar", "aria-hidden": "true" },
            h("span", {
              class: "fill",
              style: `width:${Math.round(Math.min(1, T.bank / Math.max(1, T.bank_cap)) * 100)}%`,
            }),
          ),
          T.interest > 0
            ? h(
                "div",
                { class: "num dim bank-interest" },
                /* copy:callout */ `interest $${T.interest}`,
              )
            : "",
          h(
            "div",
            { class: "chips bank-acts" },
            h(
              "button",
              {
                class: "chip bank-in",
                disabled: put <= 0 || !app.engine.bankDeposit,
                onclick: () => void act(() => app.engine.bankDeposit!(put)),
              },
              /* copy:button */ `deposit $${put}`,
            ),
            h(
              "button",
              {
                class: "chip bank-out",
                disabled: T.bank <= 0 || !app.engine.bankWithdraw,
                onclick: () => void act(() => app.engine.bankWithdraw!(T.bank)),
              },
              /* copy:button */ `withdraw $${T.bank}`,
            ),
          ),
          buildingUpgradeRow(app, "bank", () => body.isConnected && paint()) ?? "",
        );
      };
      const act = async (fn: () => Promise<Lineage>): Promise<void> => {
        if ((await app.mutate(fn, /* copy:callout */ "bank")) && body.isConnected) paint();
      };
      paint();
      return body;
    },
    { anchor },
  );
}

const heroRouteIntents = new WeakMap<App, number>();

/** The tent: the hero — the class, its level and xp (the class picker once classes can be had: the camp's). */
export function openHero(
  app: App,
  anchor?: HTMLElement | null,
  initialTab: BloodlineTab = "loadouts",
): void {
  const root = heroHubOwner(app);
  if (!root) return;
  const routeIntent = (heroRouteIntents.get(root) ?? 0) + 1;
  heroRouteIntents.set(root, routeIntent);
  const section: HeroHubSection =
    initialTab === "class" ? "skills" : initialTab === "legacy" ? "attributes" : "gear";
  let choosing = 0;
  let latestSection: HeroHubSection = section;
  const engine = root.engine;
  const owner = (): string =>
    JSON.stringify([
      root.lineage.selected_bloodline,
      root.lineage.persistent_hero?.id,
      root.lineage.persistent_hero?.incarnation,
    ]);
  const folio = (section: HeroHubSection, anchor?: HTMLElement | null): void => {
    if (root.engine !== engine) return;
    latestSection = section;
    let closePending = (): void => {};
    let pendingResident: number | undefined;
    openHeroHub(root, anchor, section, {
      closed: () => {
        if (pendingResident !== undefined && root.lineage.selected_bloodline !== pendingResident)
          choosing++;
        closePending();
      },
      sectionChanged: (next) => {
        latestSection = next;
      },
      selectResident: (id) => {
        if (id === (root.lineage.selected_bloodline ?? 1)) return;
        const request = ++choosing;
        pendingResident = id;
        let selectedOwner: string | undefined;
        const off = root.onChange(() => {
          if (request !== choosing) return;
          if (root.lineage.selected_bloodline === id && !selectedOwner) selectedOwner = owner();
          else if (selectedOwner && owner() !== selectedOwner) choosing++;
        });
        const changedIntent = (event: Event): void => {
          if (request !== choosing) return;
          if (event instanceof KeyboardEvent && event.key === "Escape") {
            choosing++;
            return;
          }
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest("[data-hub-tab],[data-hub-resident]")) return;
          if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
          choosing++;
        };
        const cleanup = (): void => {
          off();
          window.removeEventListener(/* copy:none */ "pointerdown", changedIntent, true);
          window.removeEventListener(/* copy:none */ "keydown", changedIntent, true);
        };
        closePending();
        closePending = cleanup;
        window.addEventListener(/* copy:none */ "pointerdown", changedIntent, true);
        window.addEventListener(/* copy:none */ "keydown", changedIntent, true);
        void root
          .selectBloodline(id)
          .then((selected) => {
            if (
              !selected ||
              request !== choosing ||
              root.engine !== engine ||
              root.lineage.selected_bloodline !== id ||
              root.view.kind !== "camp" ||
              heroRouteIntents.get(root) !== routeIntent ||
              document.querySelector(".sheet-wrap:not(.under)") ||
              (selectedOwner && owner() !== selectedOwner)
            )
              return;
            // App returns to camp; restore the latest section for the selected owner.
            folio(latestSection);
          })
          .finally(cleanup);
      },
      changeClass: () => {
        choosing++;
        openHeroClass(root);
      },
      orders: (anchor) => {
        choosing++;
        openCampOrders(root, anchor);
      },
    });
  };
  folio(section, anchor);
}

/** A camp panel opened from a building stands over it (its foot on the building's top), or under it when the room above is short. */
export function anchorPanel(panel: HTMLElement, anchor: HTMLElement, host: HTMLElement): void {
  const a = anchor.getBoundingClientRect(),
    r = host.getBoundingClientRect();
  // (only over a building on screen: the well scrolled to its rows leaves the town above, and a panel hung from it would be off screen)
  if (!a.height || !r.height || a.bottom <= r.top + 8 || a.top >= r.bottom - 8 || anchor.hidden)
    return;
  const above = a.top - r.top,
    below = r.bottom - a.bottom;
  panel.classList.add("town-anchored");
  if (above >= 220 || above >= below)
    Object.assign(panel.style, {
      top: "auto",
      bottom: `${Math.round(r.bottom - a.top + 6)}px`,
      maxHeight: `${Math.round(above - 12)}px`,
    });
  else
    Object.assign(panel.style, {
      bottom: "auto",
      top: `${Math.round(a.bottom - r.top + 6)}px`,
      maxHeight: `${Math.round(below - 12)}px`,
    });
}

/** dev/test inspection: `window.__town` while a camp stands */
export function exposeTown(ui: TownUi | null): void {
  const w = window as unknown as { __town?: unknown };
  if (!ui) {
    delete w.__town;
    return;
  }
  w.__town = {
    stats: () => ui.view.stats(),
    stress: (n: number) => ui.view.stress(n),
    setHour: (x: number | null) => ui.view.setHour(x),
    // Cut272: drive the silhouette glow directly (QA captures, the tests)
    highlight: (id: string, on = true) => ui.view.highlight(id, "hover", on),
    ready: (ids: string[]) => ui.view.setReady(ids),
    pulse: (id: string) => ui.view.pulse(id),
    haul: (to: "house" | "bank" = "house") => ui.view.haul(to),
    poke: () => ui.view.poke(),
    glowTiming: (n?: number) => inspectTownGlowTiming(n),
    actors: () =>
      [...ui.el.querySelectorAll<HTMLElement>("[data-home-hero]")].map((b) => ({
        id: Number(b.dataset.homeHero),
        rect: ui.view.actorRect(Number(b.dataset.homeHero)),
      })),
    targets: () =>
      [...ui.el.querySelectorAll<HTMLElement>(".town-hit")]
        .filter((b) => !b.hidden)
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            id: b.dataset.building,
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
            markers: b.dataset.markers ?? "",
          };
        }),
  };
}

/** Class controls belong to the selected hero's menu. */
export function openHeroClass(app: App): void {
  const root = heroHubOwner(app);
  if (!root) return;
  app = root;
  heroRouteIntents.set(root, (heroRouteIntents.get(root) ?? 0) + 1);
  const engine = app.engine;
  const identity = (): string =>
    JSON.stringify([
      app.lineage.selected_bloodline,
      app.lineage.persistent_hero?.id,
      app.lineage.persistent_hero?.incarnation,
    ]);
  const owner = identity();
  openSheet((close) => {
    const grid = h("div", { class: "classes" });
    const current = (): boolean =>
      grid.isConnected && app.engine === engine && identity() === owner;
    const paint = (cat?: Awaited<ReturnType<typeof app.engine.unlocks>>): void => {
      replace(
        grid,
        ...classList(app.lineage, cat).map(({ cls, owned, level, needs }) => {
          const u = owned ? undefined : cat?.find((x) => x.id === cls);
          return h(
            "div",
            { class: "class-row" },
            h(
              "button",
              {
                class: `chip${cls === app.lineage.class ? " on" : ""}`,
                disabled: !(owned || u?.available) || !!app.lineage.live,
                onclick: () =>
                  void (async () => {
                    if (!current() || app.lineage.live) return;
                    if (u && !(await app.buy(cls))) return;
                    if (!current() || app.lineage.live) return;
                    await app.setClass(cls);
                    close();
                  })(),
              },
              classIcon(cls),
              cls,
              ` L${level}`,
              u?.cost ? ` ◆${u.cost}` : "",
            ),
            classUnlockReason(u, owned ? undefined : cls, needs),
            classSkillLadder(CLASS_VERBS[cls] ?? {}, level, owned),
          );
        }),
      );
    };
    paint();
    void app.engine.unlocks().then((catalogue) => {
      if (current()) paint(catalogue);
    });
    return h(
      "div",
      { class: "sheet-body" },
      h("div", { class: "label row-label" }, /* copy:label */ "Class"),
      grid,
    );
  });
}
