import { classIcon } from "./class-icons";
import type { BloodlineTab } from "./bloodline-tabs";
import { openHeroHub, heroHubOwner, type HeroHubSection } from "./hero-hub";
import { heroPresence, heroAway } from "./hero-presence";
// Cut 30 §3 — the town on the camp (docs/TOWN.md): the scene (render/town.ts) in the well, a DOM hit target over everything one can
// tap (≥ 44 px, a hidden label for tests and screen readers), the markers (≤ 3: a sword over the forge when a kit step is affordable,
// a coin over the bank when a night's interest came in, a `!` rune over a building not yet opened), the staked plot's trigger on tap,
// and the building bar (the console's command card: one tile per building standing, in build order; tile and building open the same
// panel and share the badge). Day 0 is a camp — the mouth (tap = send), the tent (the hero), the crate (the pack); nothing else taps.
import "../town.css";
import "../legible.css";
import type { App } from "../app";
import type { HeroService, Lineage, ReturnReport } from "../engine/types";
import {
  createTownView,
  townState,
  BUILDINGS,
  type BuildingId,
  type PlotId,
  type TownState,
  type TownView,
} from "../render/town";
import { h, replace } from "./dom";
import { decorationSrc, icon } from "./skin";
import { kitAffordable } from "./forge";
import { openWindow as openSheet, closeAllSheets } from "./sheet";
import { tile, paintFace } from "./frame";
import { audio } from "../audio";
import { questShown } from "./quest";
import { nextPill, nodeIcon, openWorks } from "./works";
import { townGraveyard } from "./feats"; // Cut 118 (owner amendment §4): the graveyard's stones
import { townCrier } from "./crier"; // Cut 118 §8: the town crier   // Cut 30.5: the `next` pill, the works sheet
import { openHeroLife } from "./hero-life";
import { openCampOrders } from "./camp";
import { classList, classUnlockReason } from "./unlocks";
import { CLASS_VERBS } from "../engine/classes";
import { classSkillLadder } from "./class-skills";
import { kwHost, detailHost, openTip, closeTip } from "./tips";
import { HOME_BUILDINGS, buildingDetails, buildingName, type HomeBuilding } from "./building-help";
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
  device: "Reincarnation device",
  mouth: "Delve",
  tent: "hero",
  crate: "Loadouts",
  blacksmith: "forge",
  kennel: "companions",
  bank: "savings",
  staked: "next plot",
  board: "quest board",
  chest: "chest",
  worker: "next worker",
};
/* copy:label */
const SERVICE_LABEL: Record<string, string> = { guild: "Guild", pool: "Pool", device: "Revival" };
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
  kennel: { id: "party", icon: "party", label: "companions", glyph: "🐾" },
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
/** Cut 120 §10: the town target a worker's post stands at (`WorkerPost.post` / `WorkNode.post`). */
const postTarget = (post?: string): string => post ?? "mouth";
/** Cut 120 §7/§10: the next worker's mark — his chore's count by hand and the hours to his fallback (`forge 2/3 · or 30h`), from the
 *  core's `Works.next_worker` node (`progress`, `eta_h`); none once he is lit (his post carries his price) or with no count. */
export function nextWorkerMark(
  L: Pick<Lineage, "tree">,
): { id: string; name: string; post?: string; text: string } | null {
  const W = L.tree,
    n = W?.next_worker ? W.nodes.find((x) => x.id === W.next_worker) : undefined;
  if (!n || n.state === "done" || n.state === "lit" || !n.progress) return null;
  return {
    id: n.id,
    name: n.name,
    post: n.post,
    text: /* copy:callout */ `${n.chore ?? ""} ${n.progress}${n.eta_h ? ` · or ${n.eta_h}h` : ""}`.trim(),
  };
}

export function markOpened(L: Lineage, id: string): void {
  const s = load(L) ?? { seen: [], opened: [] };
  if (!s.opened.includes(id)) {
    s.opened.push(id);
    save(L, s);
  }
}

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
  const helpLabels = h("div", { class: "town-building-labels" });
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
  const helpButtons = new Map<string, HTMLElement>();
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
      h("div", { class: "kw-tip-head" }, h("b", {}, actual.name)),
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
  const pill = nextPill(app, (node, at) => openWorks(app, node, at));
  kwHost(pill.el, "next"); // docs/TOOLTIPS.md: its tip on long-press / hover
  // c30-legible (the owner, a new player: "I didn't understand why there were new buildings"): a building's arrival names what raised
  // it (`first gold home → blacksmith`, the core's trigger), once, over the town while it stands up; its target glows the while
  const arrival = h("div", { class: "town-arrival num", "aria-live": "polite" });
  // Cut 118 §8: the crier, top right (the pill's opposite), crying the last absence's notable acts
  const crier = townCrier(app);
  // Cut 118 (owner amendment §4): the graveyard at the scene's foot, left — a stone per fallen heir (the newest few), epitaphs on hover
  const yard = townGraveyard(app);
  el.append(
    hits,
    helpLabels,
    actorHits,
    delveFaces,
    foundation,
    tag,
    arrival,
    pill.el,
    crier.el,
    yard.el,
  );
  let arrivalTimer = 0;
  const view = createTownView(el);
  let chestOpenUntil = 0,
    chestTimer = 0;
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
  function paint(): void {
    const L = app.lineage;
    const s0 = load(L) ?? store!;
    const previousState = state;
    const previousHome = state?.home;
    state = townState(L, absence, {
      seen: s0.seen,
      opened: s0.opened,
      kit: kitInfo(),
      absenceNew: !!absence,
      board: questShown(L),
      chestOpen: performance.now() < chestOpenUntil,
    });
    view.setState(state);
    if (previousHome === false && state.home) hooks.resident?.(0);
    // seen now (a re-mount does not raise it again)
    const built = state.buildings.map((b) => b.id);
    const fresh = built.filter((b) => !s0.seen.includes(b));
    if (fresh.length) save(L, { ...s0, seen: [...new Set([...s0.seen, ...built])] });
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
        return current
          ? [
              h("div", { class: "kw-tip-head" }, current.hero_name || current.name),
              h("div", { class: "kw-tip-gloss" }, heroPresence(current).text),
            ]
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
    if (reservationsChanged && el.isConnected) placeHelpLabels();
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
        .filter((id) => service(id)?.available)
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
        b.remove();
        const help = helpButtons.get(id);
        if (help) {
          labelResize?.unobserve(help);
          help.remove();
        }
        helpButtons.delete(id);
        btns.delete(id);
      }
    // Cut 120 §10: the next worker's count and fallback on his post (`forge 2/3 · or 30h`) while no hire is lit — one marker, inside the
    // budget (≤ 3 with the scene's own); a post with no target here (its building not standing) shows it at the mouth
    const nw = nextWorkerMark(app.lineage),
      lit0 = s.workers.some((x) => x.lit);
    const nwAt =
      nw && !lit0 && s.markers.length < 3
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
            "aria-label": label,
            onclick: (e: Event) => tap(w.id, e),
          },
          h("span", { class: "vh" }, label),
        );
        if (service(w.id)) detailHost(b, () => serviceDetails(w.id));
        else if (buildingId(w.id))
          detailHost(b, () => buildingDetails(app.lineage, buildingId(w.id)!));
        else if (HIT_TERM[w.id]) kwHost(b, HIT_TERM[w.id]!);
        btns.set(w.id, b);
        hits.appendChild(b);
      }
      const homeId = buildingId(w.id);
      const actualService = service(w.id);
      if (homeId || actualService) {
        let help = helpButtons.get(w.id);
        if (!help) {
          help = h("button", {
            class: "town-building-info",
            "data-building-info": w.id,
            onclick: (e: Event) => {
              e.stopPropagation();
              openTip(e.currentTarget as HTMLElement);
            },
          });
          detailHost(help, () =>
            service(w.id) ? serviceDetails(w.id) : buildingDetails(app.lineage, buildingId(w.id)!),
          );
          helpLabels.append(help);
          helpButtons.set(w.id, help);
          labelResize?.observe(help);
        }
        const name = actualService?.name ?? buildingName(homeId!);
        const helpId = homeId ?? w.id;
        help.setAttribute("aria-label", `${name} information`);
        if (help.dataset.homeId !== helpId) {
          help.dataset.homeId = helpId;
          replace(
            help,
            h("span", { class: "town-building-name" }, SERVICE_LABEL[w.id] ?? name),
            h("span", { class: "town-info-glyph", "aria-hidden": "true" }, "i"),
          );
        }
        help.dataset.state = w.id === "staked" ? (s.staked?.ready ? "ready" : "locked") : "built";
      }
      b.setAttribute("aria-label", label);
      b.title = label;
      b.querySelector(".vh")!.textContent = label;
      // markers ride their building's target (one surface, the same panel)
      const mk = s.markers.filter((m) => m.at === w.id);
      // the lit worker carries his price (`$40` · `free`), the chest the porter's count (`2/3`)
      const lit = w.id === "worker" ? s.workers.find((x) => x.lit) : undefined;
      if (lit)
        mk.push({
          at: "chest",
          kind: "coin",
          label: lit.price ? /* copy:label */ `Hire $${lit.price}` : /* copy:label */ "Hire free",
        });
      if (lit) {
        const worker = app.lineage.tree?.nodes.find((node) => node.id === lit.id);
        const role = buildingId(lit.post);
        const hiring = /* copy:tooltip */ `Hire ${worker?.name ?? lit.id} · ${role ? buildingName(role) : lit.post} · ${lit.price ? `$${lit.price}` : "free"}`;
        b.setAttribute("aria-label", hiring);
        b.title = hiring;
        b.querySelector(".vh")!.textContent = hiring;
      }
      b.dataset.worker = lit?.id ?? "";
      const holder =
        b.querySelector(".town-markers") ?? b.appendChild(h("span", { class: "town-markers" }));
      replace(
        holder,
        ...mk.map((m) =>
          h(
            "span",
            { class: `town-marker mk-${m.kind}`, "data-marker": m.kind },
            icon(
              m.kind === "sword" ? "v_attack" : m.kind === "coin" ? "gold" : "alert",
              m.kind === "sword" ? "⚔" : m.kind === "coin" ? "$" : "!",
            ),
            m.label ? h("b", { class: "num" }, m.label) : "",
          ),
        ),
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
      b.dataset.markers = [...mk.map((m) => m.kind), ...(nw && nwAt === w.id ? ["next"] : [])].join(
        " ",
      );
      const cnt = w.id === "chest" && s.chest?.need ? `${s.chest.count ?? 0}/${s.chest.need}` : "";
      const ce = b.querySelector(".town-count");
      if (cnt) {
        if (ce) ce.textContent = cnt;
        else b.appendChild(h("span", { class: "town-count num" }, cnt));
      } else ce?.remove();
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
      if (!r) {
        if (helpButtons.get(id)) helpButtons.get(id)!.hidden = true;
        b.hidden = true;
        continue;
      }
      b.hidden = false;
      const help = helpButtons.get(id);
      if (help) {
        help.hidden = false;
      }
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
    placeHelpLabels();
    foundation.hidden = state?.staked?.ready !== true;
  }
  function placeHelpLabels(): void {
    const origin = el.getBoundingClientRect();
    type Box = { x: number; y: number; w: number; h: number; owner?: string };
    const box = (node: HTMLElement): Box => {
      const r = node.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    };
    // Resource badges and construction copy keep their own anchors. Help
    // labels fit around them, rather than hiding the price beneath a nameplate.
    const occupied = [
      ...el.querySelectorAll<HTMLElement>(".town-marker,.town-tag,.next-pill,.town-delve-faces"),
    ]
      .filter(
        (node) =>
          !node.hidden &&
          node.getBoundingClientRect().width > 0 &&
          node.getBoundingClientRect().height > 0,
      )
      .map(box);
    occupied.push(...actorReservations.values());
    // Keep every scene action's central44px accessible, including its own
    // information label. The label stays near the body without intercepting it.
    for (const [id, node] of btns) {
      if (node.hidden) continue;
      const r = box(node);
      occupied.push({ x: r.x + r.w / 2 - 22, y: r.y + r.h / 2 - 22, w: 44, h: 44, owner: id });
    }
    const overlap = (a: Box, b: Box): number =>
      Math.max(0, Math.min(a.x + a.w + 4, b.x + b.w + 4) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h + 4, b.y + b.h + 4) - Math.max(a.y, b.y));
    for (const [id, help] of helpButtons) {
      if (help.hidden) continue;
      const r = view.rectOf(id === "staked" ? "staked" : (id as PlotId));
      if (!r) continue;
      const w = help.offsetWidth,
        h = help.offsetHeight;
      const preferredX = Math.max(6, Math.min(el.clientWidth - w - 6, r.x + r.w / 2 - w / 2));
      const preferredY = Math.max(
        6,
        Math.min(
          el.clientHeight - h - 6,
          id === "staked" && !state?.staked?.ready ? r.y + r.h + 8 : r.y - h,
        ),
      );
      const xs = [
        ...new Set(
          [
            preferredX,
            r.x - w - 8,
            r.x + r.w + 8,
            6,
            el.clientWidth - w - 6,
            ...occupied.flatMap((other) => [other.x - w - 8, other.x + other.w + 8]),
          ].map((x) => Math.max(6, Math.min(el.clientWidth - w - 6, x))),
        ),
      ];
      let best = { x: preferredX, y: preferredY, w, h },
        bestScore = Infinity;
      const ys = [
        preferredY,
        ...occupied.flatMap((other) => [other.y - h - 8, other.y + other.h + 8]),
      ];
      for (let offset = 8; offset < el.clientHeight; offset += 8)
        ys.push(preferredY - offset, preferredY + offset);
      for (const y of ys) {
        if (y < 6 || y + h > el.clientHeight - 6) continue;
        for (const x of xs) {
          const candidate = { x, y, w, h };
          const collisions = occupied.reduce((sum, other) => sum + overlap(candidate, other), 0);
          const score = collisions * 1_000_000 + (x - preferredX) ** 2 + (y - preferredY) ** 2;
          if (score < bestScore) {
            best = candidate;
            bestScore = score;
          }
        }
      }
      Object.assign(help.style, {
        left: `${Math.round(best.x)}px`,
        top: `${Math.round(best.y)}px`,
      });
      occupied.push(best);
    }
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
    const origin = el.getBoundingClientRect();
    for (const marker of el.querySelectorAll<HTMLElement>(".town-marker")) {
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
  function tap(id: string, e: Event): void {
    view.poke();
    const b = btns.get(id)!;
    const L = app.lineage;
    const facility = service(id);
    if (facility) {
      if (!facility.available) return;
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
    const marker = (e.target as HTMLElement | null)?.closest?.(
      ".town-marker",
    ) as HTMLElement | null;
    if (marker?.dataset.marker === "sword" && id === "blacksmith") {
      void buyKit();
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
  /** the sword marker: one tap buys the cheapest kit step the purse can pay (the check-in's spend) */
  async function buyKit(): Promise<void> {
    const lad = (app.lineage.kit ?? [])
      .filter((k) => k.next?.affordable)
      .sort((a, b) => a.next!.price - b.next!.price)[0];
    if (!lad || !app.engine.buyKit) return;
    const ok = await app.mutate(() => app.engine.buyKit!(lad.slot), /* copy:callout */ "kit");
    if (ok) audio.cue("unlock");
  }
  /** Cut 30.5: the chest's tap — the lid flips, the coins arc to the purse (quick: ~0.5 s), the purse counts up (juice.ts), the porter's
   *  count moves (the core's `openChest`; the porter's chore). */
  async function openChest(): Promise<void> {
    if (!app.engine.openChest || (app.lineage.tree?.chest ?? 0) <= 0) return;
    chestOpenUntil = performance.now() + 1500;
    paint();
    clearTimeout(chestTimer);
    chestTimer = window.setTimeout(() => {
      if (el.isConnected) paint();
    }, 1550);
    audio.cue("exit_bank");
    await app.mutate(() => app.engine.openChest!()); // (no forecast move to name: the purse is the sims' either way)
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
        ...classList(app.lineage, cat).map(({ cls, owned, level }) => {
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
            classUnlockReason(u, owned ? undefined : cls),
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
