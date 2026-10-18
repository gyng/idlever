// Cut 30 §3 — the town hub (docs/TOWN.md, targets art/ui/targets/town/): the camp as a place. A fixed tile map with named plots and
// a path graph; `townState(lineage, absence)` turns the core's `Lineage.town` into what stands and what walks (buildings with their
// look, the next plot staked, the hero's loop, the absence's parties walking out of the mouth, pets, markers); the view draws it in
// the pixel pipeline's register — one low-res target of town texels (a cached terrain bitmap and instanced sprite quads, `layers.ts`), upscaled k× with nearest
// sampling, lit by a small light pass (the fire, the mouth's torches, the forge, windows at night; day and night from the local
// clock). The Canvas-2D fallback (`view2d.ts` `drawTown2D`) draws the same frame while the GL context is lost or when none exists.
//
// Coordinates: texels, x right, y DOWN the map (a tile is 16 texels); three's world is (x, −y). Every sprite is anchored at its foot
// (bottom centre) and depth-sorted by foot y. Walkers are cosmetic: seeded by the lineage's seed + the local day, never read back.
// Art never blocks the scene: every sprite id has a primitive fallback (a coloured block in the thing's shape) until the atlas has it.
import * as THREE from "three";
import { QuadLayer, BAYER_GLSL } from "./layers";
import { drawTown2D } from "./view2d";
import type { Lineage, ReturnReport } from "../engine/types";
import { paintTownTerrain, terrainMaterialVersion, townGrassRoots } from "./town-terrain";
import { effectsLevel } from "./fxpref";
import { GlowLayer, type Glow } from "./town-glow";
import { paintHomeService, isHomeServiceArt } from "./home-service-art";
import {
  volumeKind,
  volumeBuilding,
  volumeHero,
  volumeService,
  townWalkIds,
  VOLUME_GLSL,
} from "./town-volume";
import LIGHTS from "./town_lights.json"; // a copy of art/town_lights.json (`python3 art/town_lights.py`): each sprite's painted warm emitters

export const TILE = 16;
export const MAP_W = 56,
  MAP_H = 40;
const CX = 28,
  OY = 5; // the layout's centre column; its rows start OY tiles down (the cliff above the mouth)
const T = (x: number, y: number): Pt => ({ x: x * TILE, y: (y + OY) * TILE });
export type Pt = { x: number; y: number };

// ---- the map: plots, paths -------------------------------------------------------------------------------------------------

export const BUILDINGS = ["blacksmith", "kennel", "bank"] as const;
export type BuildingId = (typeof BUILDINGS)[number];
export type ServiceId = "guild" | "pool" | "device";
export const SERVICE_PLOTS = {
  guild: { x: 386, y: 402, h: 42 },
  pool: { x: 356, y: 338, h: 22 },
  device: { x: 568, y: 318, h: 36 },
} as const;
export type PlotId =
  | ServiceId
  | "mouth"
  | "fire"
  | "tent"
  | "house"
  | "crate"
  | "board"
  | BuildingId;
/** each plot's foot (texels) and its drawn height */
export const PLOTS: Record<PlotId, Pt & { h: number }> = {
  ...SERVICE_PLOTS,
  mouth: { ...T(CX, 6.6), h: 64 },
  fire: { ...T(CX, 14.7), h: 16 },
  tent: { ...T(CX + 3.3, 14.0), h: 32 },
  house: { ...T(CX + 3.3, 14.0), h: 56 },
  crate: { ...T(CX + 5.0, 14.9), h: 16 },
  board: { ...T(CX - 2.2, 7.6), h: 28 }, // Cut 30 §5: the notice board by the mouth (the quest), from the Warlord slain
  blacksmith: { ...T(CX - 4.6, 10.7), h: 64 },
  bank: { ...T(CX + 4.6, 10.7), h: 64 },
  kennel: { ...T(CX + 4.7, 19.8), h: 64 },
};
const NODES: Record<string, Pt> = {
  in: T(CX, 6.3),
  mouth: T(CX, 7.5),
  cross: T(CX, 11.6),
  smith: T(CX - 4.4, 11.0),
  bank: T(CX + 4.4, 11.0),
  fireN: T(CX, 13.1),
  fireW: T(CX - 1.5, 14.95),
  fireE: T(CX + 1.5, 14.95),
  tent: T(CX + 2.45, 14.45),
  crate: T(CX + 4.3, 15.55),
  fireS: T(CX, 16.7),
  south: T(CX, 18.6),
  kennel: T(CX + 4.3, 20.1),
  exit: T(CX, 25),
  guild: { x: 386, y: 410 },
  pool: { x: 356, y: 353 },
  device: { x: 568, y: 330 },
};
const EDGES: [string, string, number][] = [
  // [a, b, half-width of the dirt in tiles]
  ["in", "mouth", 0.9],
  ["mouth", "cross", 0.8],
  ["cross", "smith", 0.5],
  ["cross", "bank", 0.5],
  ["cross", "fireN", 0.8],
  ["fireN", "fireW", 0.55],
  ["fireN", "fireE", 0.55],
  ["fireE", "tent", 0.5],
  ["tent", "crate", 0.45],
  ["fireW", "fireS", 0.55],
  ["fireE", "fireS", 0.55],
  ["fireS", "south", 0.7],
  ["south", "kennel", 0.5],
  ["south", "exit", 0.7],
  ["south", "guild", 0.4],
  ["fireW", "pool", 0.4],
  ["crate", "device", 0.4],
];
const ADJ = new Map<string, string[]>();
for (const [a, b] of EDGES) {
  ADJ.set(a, [...(ADJ.get(a) ?? []), b]);
  ADJ.set(b, [...(ADJ.get(b) ?? []), a]);
}
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
/** the shortest route between two nodes (Dijkstra over the path graph), as points */
export function route(from: string, to: string): Pt[] {
  const d = new Map<string, number>([[from, 0]]),
    prev = new Map<string, string>(),
    open = new Set([from]);
  while (open.size) {
    let u = "";
    let best = Infinity;
    for (const n of open)
      if ((d.get(n) ?? Infinity) < best) {
        best = d.get(n)!;
        u = n;
      }
    open.delete(u);
    if (u === to) break;
    for (const v of ADJ.get(u) ?? []) {
      const nd = best + dist(NODES[u]!, NODES[v]!);
      if (nd < (d.get(v) ?? Infinity)) {
        d.set(v, nd);
        prev.set(v, u);
        open.add(v);
      }
    }
  }
  const out: string[] = [to];
  while (out[0] !== from) {
    const p = prev.get(out[0]!);
    if (!p) return [NODES[from]!, NODES[to]!];
    out.unshift(p);
  }
  return out.map((n) => NODES[n]!);
}
const nearestNode = (p: Pt): string => {
  let b = "fireN",
    bd = Infinity;
  for (const [k, n] of Object.entries(NODES)) {
    if (k === "in" || k === "exit") continue;
    const e = dist(p, n);
    if (e < bd) {
      bd = e;
      b = k;
    }
  }
  return b;
};

// ---- the state: what stands and what walks ----------------------------------------------------------------------------------

export type Marker = {
  at: PlotId | "chest";
  kind: "coin" | "rune" | "sword" | "chest" | "clone";
  label?: string;
};
/** Cut 30.5 (docs/AUTOMATION_TREE.md §3C): the haul chest by the mouth (before the porter) and the workers at their posts */
export type ChestState = {
  state: "closed" | "full" | "open";
  gold: number;
  count?: number;
  need?: number;
};
export type WorkerSpot = {
  id: string;
  post: string;
  lit: boolean;
  /** Cut273: the lit worker's workplace (`guild`, `kennel`) and whether it is a plot not yet built (its build brings him) */
  place?: string;
  plot?: boolean;
  price?: number;
  paused: boolean;
  rank: number;
};
/** the chest's foot, beside the path under the mouth */
export const CHEST_AT: Pt & { h: number } = { ...T(CX + 1.6, 8.3), h: 12 };
/** Cut273: the Drill tent (the drillmaster's workplace) and its straw dummy. Cut 277: moved off the south path into its own
 *  yard west of the Guildhouse (it stood against the hall's east wall, on the guild's spur, among the walkers); the forest
 *  keeps the yard clear and the dummy stands beside the tent, clear of the pool's resting trail (x 306). */
export const DRILL_AT: Pt & { h: number } = { x: 338, y: 396, h: 24 };
const DUMMY_AT: Pt & { h: number } = { x: 315, y: 399, h: 12 };
/** Cut273: a workplace's spot (its plot before it is built) */
/** Cut 277: the Guildhouse's level pip (texels; the workers' rank pip is 2) */
const GUILD_PIP = 4;
export const placeAt = (id: string): (Pt & { h: number }) | null =>
  id === "haul_chest"
    ? CHEST_AT
    : id === "drill_tent"
      ? DRILL_AT
      : ((PLOTS as Record<string, (Pt & { h: number }) | undefined>)[id] ?? null);
/** a worker's spot (texels, its foot): by id, else by its post's plot — art/town-ids.md's posts (the sheet's units × ~0.6 onto the map's
 *  tiles), the herald and the scout moved to the map's own board (left of the mouth) */
const WORKER_AT: Record<string, Pt> = {
  quartermaster: T(CX + 4.9, 15.7),
  porter: T(CX + 1.1, 10.2),
  scout: { x: SERVICE_PLOTS.guild.x + 13, y: SERVICE_PLOTS.guild.y + 7 },
  apprentice: T(CX - 1.9, 11.6),
  clerk: T(CX + 2.8, 11.7),
  drillmaster: { x: 337, y: 424 }, // Cut 277: before his tent, below its foot (the sprite never covers the tent)
  kennel_hand: T(CX + 2.4, 19.7),
  herald: T(CX - 3.6, 7.9),
  guide: T(CX + 1.65, 7.35),
};
/** Cut 109: the town's dressing — props that arrive with the stage (buildings standing), each a foot, a drawn height and the stage it
 *  needs; the forest leaves their glades clear from day 0, so a prop arriving never stands in a tree */
type Prop = Pt & { id: string; h: number; stage: number; lamp?: boolean; flip?: boolean };
const PROPS: Prop[] = [
  { id: "town_woodpile", ...T(CX - 2.75, 13.95), h: 13, stage: 0 },
  { id: "town_lamppost", ...T(CX + 1.3, 12.35), h: 26, stage: 1, lamp: true },
  { id: "town_well", ...T(CX - 2.9, 17.1), h: 26, stage: 2 },
  { id: "town_lamppost", ...T(CX - 1.25, 21.9), h: 26, stage: 2, lamp: true },
  { id: "town_stall", ...T(CX + 3.1, 22.6), h: 34, stage: 3 },
  { id: "town_cart", ...T(CX - 3.3, 22.9), h: 20, stage: 3, flip: true },
  { id: "town_lamppost", ...T(CX + 1.25, 26.4), h: 26, stage: BUILDINGS.length, lamp: true },
];
/** Cut 109: townsfolk by stage (docs/TOWN.md §3: "townsfolk multiply with the houses") — cosmetic, seeded, never read back */
const FOLK_AT = { smith: T(CX - 6.0, 11.35), merchant: T(CX + 4.75, 22.75) };
/** Cut 228: the anvil before the smith, the spot a hero stands to be fitted, and one hammer stroke (s) */
const ANVIL_AT: Pt = { x: FOLK_AT.smith.x + 11, y: FOLK_AT.smith.y + 1 };
const FIT_AT: Pt = { x: FOLK_AT.smith.x + 27, y: FOLK_AT.smith.y - 1 };
const HAMMER_S = 0.8;
export const workerAt = (w: { id: string; post: string }): Pt | null =>
  WORKER_AT[w.id] ?? (PLOTS as Record<string, Pt | undefined>)[w.post] ?? null;
/** a worker's frames (art/town-ids.md: `town_worker_<id>`, `_1` the idle beat) */
export const workerIds = (id: string, frame = 0): string[] =>
  frame ? [`town_worker_${id}_1`, `town_worker_${id}`] : [`town_worker_${id}`];
export type Party = {
  at: number;
  cls: string;
  sack?: "small" | "large";
  chest?: boolean;
  pet?: string;
  to: "tent";
};
export type TownState = {
  home: boolean;
  seed: number;
  day: number;
  stage: number; // buildings standing (0 = the camp)
  buildings: { id: BuildingId; look: number; fresh: boolean }[];
  staked?: { id: BuildingId | "house"; trigger: string; ready?: boolean };
  hero: { cls: string; look?: string };
  residents?: {
    id: number;
    cls: string;
    look?: string;
    resting?: boolean;
    phase?: "away" | "reincarnating" | "recovering" | "ready";
  }[];
  services?: ServiceId[];
  selectedHero?: number;
  roster?: number[]; // actual full roster, including residents currently delving
  pets: string[]; // companions following the hero
  penned: string[]; // companions lying in the kennel's pen
  parties: Party[]; // the absence's runs walking out of the mouth
  markers: Marker[]; // ≤ 3
  board: boolean; // the quest board stands by the mouth
  depth: number; // the best depth (the mouth's plaque)
  chest?: ChestState; // Cut 30.5: the haul chest (none once the porter carries the hauls)
  workers: WorkerSpot[]; // Cut 30.5: hired workers at their posts; the lit node's greyed
  /** Cut273: each workplace's level (absent: an old wire — every workplace drawn as before) */
  places?: Record<string, number>;
  /** Cut 228: the Forge's present work (Rust `Town.forge_work`): the step, the hero it was forged for, seconds left */
  forge?: { step: string; hero: number; left: number };
  /** Cut264: the vat's clone — growing (its progress 0..1, seconds left); ready independently tracks the `Clone ready` lantern. */
  clone?: { progress: number; left: number; ready: boolean };
};
export type HomeResidentSpot = { id: number; pool: Pt; device: Pt };
/** Stable grounds allocated to actual roster IDs, unaffected by selected/away state. */
export function homeResidentSpots(
  s: Pick<TownState, "roster" | "residents" | "selectedHero">,
): HomeResidentSpot[] {
  const ids = [...(s.roster ?? s.residents?.map((r) => r.id) ?? [s.selectedHero ?? 1])].sort(
    (a, b) => a - b,
  );
  return ids.map((id, index) => ({
    id,
    pool: index === 0 ? { x: 306, y: 348 } : { x: 306 + (index - 1) * 72, y: 420 },
    device: index === 0 ? { x: 580, y: 348 } : { x: 580 - (index - 1) * 72, y: 420 },
  }));
}
export type TownActorTarget = { id: number; x: number; y: number; w: number; h: number };
/** Only state transitions observed by this mounted view produce construction FX. */
export function constructionChanges(
  prev: TownState | null,
  next: TownState,
): { id: BuildingId | "house"; fromLook?: number }[] {
  if (!prev) return [];
  const changes: { id: BuildingId | "house"; fromLook?: number }[] = [];
  if (!prev.home && next.home) changes.push({ id: "house" });
  else if (prev.home && next.home && houseLook(next) > houseLook(prev))
    changes.push({ id: "house", fromLook: houseLook(prev) });
  for (const building of next.buildings) {
    const old = prev.buildings.find((b) => b.id === building.id);
    if (!old) changes.push({ id: building.id });
    else if (building.look > old.look) changes.push({ id: building.id, fromLook: old.look });
  }
  return changes;
}
const BUILD_ASSEMBLY_S = 1.2,
  BUILD_FX_S = 2.2;
export type TownOpts = {
  board?: boolean;
  seen?: string[];
  opened?: string[];
  kit?: { n: number; price?: number };
  now?: Date;
  absenceNew?: boolean;
  chestOpen?: boolean;
  /** Cut264: the clone that finished under this view's eyes (its lantern until he departs or the vat is tapped) */
  cloneReady?: boolean;
};

const hashN = (...xs: number[]): number => {
  let h = 2166136261;
  for (const x of xs) {
    h ^= x | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
};
export const localDay = (now = new Date()): number =>
  Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
/** Local wall clock, sampled once; lighting stays continuous across minute boundaries. */
export const localHour = (now = new Date()): number =>
  now.getHours() +
  now.getMinutes() / 60 +
  now.getSeconds() / 3600 +
  now.getMilliseconds() / 3600000;
const PARTIES_MAX = 6;
/** Cut 109: the hero's house grows with the town (cottage · lean-to · two storeys at2 and all remaining facilities standing) — a look, no rule */
export const houseLook = (s: { stage: number }): number =>
  s.stage >= BUILDINGS.length ? 3 : s.stage >= 2 ? 2 : 1;
/** Cut264: the clone in the vat — the selected hero's, else any resident's; `ready` the one this view saw finish. */
export function cloneOf(
  L: Lineage,
  ready = false,
): { progress: number; left: number; ready: boolean } | undefined {
  const cloning = (state?: string): boolean => state === "reincarnating" || state === "recovering";
  const slots = (L.hero_slots ?? []).filter(
    (h) => cloning(h.life_state) && (h.recovery_s ?? 0) > 0,
  );
  const slot = slots.find((h) => h.id === L.selected_bloodline) ?? slots[0];
  const hero = L.persistent_hero;
  const [left, total] = slot
    ? [slot.recovery_s ?? 0, slot.recovery_total_s ?? 0]
    : hero && cloning(hero.state) && hero.recovery_s > 0
      ? [hero.recovery_s, hero.recovery_total_s ?? 0]
      : [0, 0];
  if (left > 0) {
    const t = Math.max(total, left);
    return { progress: t > 0 ? Math.min(1, Math.max(0, (t - left) / t)) : 0, left, ready };
  }
  return ready ? { progress: 1, left: 0, ready: true } : undefined;
}
/** The core's town (`Lineage.town`) and the absence's report → the scene. Pure (walkers are seeded, never read back). */
export function townState(L: Lineage, absence?: ReturnReport | null, o: TownOpts = {}): TownState {
  const town = L.town;
  const built = (town?.buildings ?? []).filter((b): b is typeof b & { id: BuildingId } =>
    (BUILDINGS as readonly string[]).includes(b.id),
  );
  const seen = new Set(o.seen ?? built.map((b) => b.id));
  const buildings = built.map((b) => ({
    id: b.id,
    look: Math.max(1, Math.min(3, b.level || 1)),
    fresh: !seen.has(b.id),
  }));
  const has = (id: string): boolean => buildings.some((b) => b.id === id);
  const next =
    town?.next &&
    town.next_ready === true &&
    (town.next === "house" || (BUILDINGS as readonly string[]).includes(town.next)) &&
    !has(town.next)
      ? {
          id: town.next as BuildingId | "house",
          trigger: town.next_trigger ?? "",
          ready: town.next_ready,
        }
      : undefined;
  const day = localDay(o.now);
  const seed = hashN(L.seed ?? 0, day);
  // the absence's parties: one per run that came home (a death walks nobody out), the biggest first, ≤ PARTIES_MAX
  const parties: Party[] = [];
  if (absence) {
    const exits = (absence.exits ?? []).filter(
      (x) => !x.cause && (x.keep_pct > 0 || x.kept > 0) && !/^died\b/.test(x.text),
    );
    const home = exits.length
      ? exits.map((x) => x.kept)
      : Array.from(
          {
            length: Math.min(
              PARTIES_MAX,
              Math.max(0, (absence.returned ?? 0) + (absence.banked ?? 0)),
            ),
          },
          () =>
            Math.round(
              (absence.gold?.home ?? 0) /
                Math.max(1, (absence.returned ?? 0) + (absence.banked ?? 0)),
            ),
        );
    const order = home
      .map((g, i) => ({ g, i }))
      .sort((a, b) => b.g - a.g || a.i - b.i)
      .slice(0, PARTIES_MAX)
      .sort((a, b) => a.i - b.i);
    const finds = (absence.new_finds?.length ?? 0) > 0;
    const tame = absence.tamed?.[0];
    const big = Math.max(60, ...home) * 0.5;
    order.forEach(({ g }, k) => {
      const chest = finds && k === order.length - 1,
        pet = tame && k === 0 ? tame : undefined;
      parties.push({
        at: 0,
        cls: L.class,
        sack: g <= 0 ? undefined : g >= big ? "large" : "small",
        chest,
        pet,
        to: "tent",
      });
    });
    // ~20 s in all, ≤ 3 on screen (a walk out is ~6 s)
    const span = 20 - 6,
      gap = parties.length > 1 ? Math.max(2.2, span / (parties.length - 1)) : 0;
    parties.forEach((p, i) => {
      p.at = 0.6 + i * gap;
    });
  }
  // markers (≤ 3): a sword over the forge when a kit step is affordable, a coin over the bank when a night's interest came in, a `!`
  // over a building not yet opened since it was built
  const markers: Marker[] = [];
  // Cut 30.5: the chest before the porter — closed and empty from day 0 (drawn, not a surface), full with gold (a `!` and the sum), open
  // just after a tap; the porter's hire retires it
  const W = L.tree,
    porter = W?.nodes.find((n) => n.id === "porter");
  const chest: ChestState | undefined =
    W && porter && (porter.state !== "done" || porter.paused)
      ? {
          state: o.chestOpen ? "open" : W.chest > 0 ? "full" : "closed",
          gold: W.chest,
          count: porter.count,
          need: porter.need,
        }
      : undefined;
  if (chest?.state === "full")
    markers.push({ at: "chest", kind: "chest", label: `$${chest.gold}` });
  // Cut273: the workplaces (their level; the lit one's plot)
  const placeList = town?.workplaces;
  const places = placeList ? Object.fromEntries(placeList.map((p) => [p.id, p.level])) : undefined;
  const litPlace = placeList?.find((p) => p.next);
  const workers: WorkerSpot[] = (town?.workers ?? []).map((w) => ({
    id: w.id,
    post: w.post,
    lit: !!w.lit,
    ...(w.lit && litPlace?.next?.worker === w.id
      ? { place: litPlace.id, plot: litPlace.level === 0 }
      : {}),
    price: w.price,
    paused: !!w.paused,
    rank: w.rank ?? 1,
  }));
  if (has("blacksmith") && (o.kit?.n ?? 0) > 0)
    markers.push({
      at: "blacksmith",
      kind: "sword",
      label: o.kit?.price ? /* copy:callout */ `Upgrade $${o.kit.price}` : undefined,
    });
  if (has("bank") && (town?.bank ?? 0) > 0 && o.absenceNew)
    markers.push({ at: "bank", kind: "coin" });
  const opened = new Set(o.opened ?? []);
  // Cut264: the vat's clone has priority in the budget — growing, its badge takes a marker's place; ready, its lantern leads
  const clone = cloneOf(L, !!o.cloneReady);
  const deviceUp = town?.home !== false && !!L.persistent_hero?.device.available;
  if (deviceUp && clone?.ready)
    markers.unshift({ at: "device", kind: "clone", label: /* copy:callout */ "Clone ready" });
  const budget = deviceUp && clone && clone.left > 0 ? 2 : 3;
  for (const b of buildings)
    if (markers.length < budget && !opened.has(b.id) && !markers.some((m) => m.at === b.id))
      markers.push({ at: b.id, kind: "rune" });
  // Bought workplace levels share the existing marker budget and leave stronger readiness signals visible.
  if (town?.home !== false && L.persistent_hero?.state !== "away")
    for (const upgrade of town?.upgrades ?? [])
      if (
        (upgrade.id === "bank" || upgrade.id === "device") &&
        markers.length < budget &&
        upgrade.next?.ready &&
        upgrade.next.affordable &&
        !markers.some((m) => m.at === upgrade.id)
      )
        markers.push({ at: upgrade.id, kind: "rune", label: /* copy:callout */ "Upgrade" });
  return {
    home: town?.home !== false,
    seed,
    day,
    stage: buildings.length,
    buildings,
    staked: next,
    hero: { cls: L.class || "fighter", look: L.look },
    services:
      town?.home === false
        ? []
        : (["guild", "pool", "device"] as const).filter(
            (id) =>
              L.persistent_hero?.[id].available &&
              // Cut273: the Guildhouse stands once built (before, its plot is the lit worker's target)
              (id !== "guild" || !places || (places.guild ?? 0) > 0),
          ),
    residents:
      L.hero_slots
        ?.filter((h) => (h.life_state !== undefined ? h.life_state !== "away" : h.state !== "live"))
        .map((h) => ({
          id: h.id,
          cls: h.class,
          look: h.look,
          resting:
            h.rest_s > 0 ||
            h.life_state === "recovering" ||
            h.life_state === "reincarnating" ||
            (h.life_state === undefined && h.state === "rests"),
          phase:
            h.life_state ?? (h.id === L.selected_bloodline ? L.persistent_hero?.state : undefined),
        })) ??
      (L.live ? [] : [{ id: L.selected_bloodline ?? 1, cls: L.class || "fighter", look: L.look }]),
    selectedHero: L.selected_bloodline ?? 1,
    roster: (L.hero_slots?.map((h) => h.id) ?? [L.selected_bloodline ?? 1]).sort((a, b) => a - b),
    pets: (L.party ?? []).slice(0, 2).map((c) => c.kind),
    penned: has("kennel") ? (L.kennel ?? []).slice(0, 2).map((c) => c.kind) : [],
    parties,
    markers: markers.slice(0, budget),
    ...(deviceUp && clone ? { clone } : {}),
    depth: L.best_depth ?? 0,
    board: !!o.board,
    chest: town?.home === false || town?.auto_collect ? undefined : chest,
    workers: town?.home === false ? [] : workers,
    ...(places ? { places } : {}),
    forge:
      town?.home !== false && has("blacksmith") && town?.forge_work
        ? {
            step: town.forge_work.step,
            hero: town.forge_work.hero,
            left: Math.max(0, town.forge_work.left_s),
          }
        : undefined,
  };
}

// ---- the atlas: town sprites cut to their drawn size, a primitive for anything not packed ----------------------------------------

type Frame = { x: number; y: number; w: number; h: number };
export type Slot = Frame & { u0: number; v0: number; u1: number; v1: number };
let packed: Promise<{ img: HTMLImageElement; frames: Record<string, Frame> } | null> | null = null;
function loadPacked(): Promise<{ img: HTMLImageElement; frames: Record<string, Frame> } | null> {
  packed ??= fetch(`${import.meta.env.BASE_URL}art/atlas.json`)
    .then((r) => r.json())
    .then(
      (j: { frames?: Record<string, Frame>; image?: string }) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => res({ img, frames: j.frames ?? {} });
          img.onerror = () => res(null);
          img.src = `${import.meta.env.BASE_URL}art/${j.image ?? "atlas.png"}`;
        }),
    )
    .catch(() => null) as Promise<{ img: HTMLImageElement; frames: Record<string, Frame> } | null>;
  return packed;
}
const ATLAS = 1024;
/** a walker's coat hue by class (rgb 0..255, applied to the mid-tones at a pixel's own value) */
const WALKER_TINT: Record<string, number[]> = {
  rogue: [120, 70, 140],
  ranger: [80, 140, 72],
  caster: [70, 96, 200],
  fighter: [150, 160, 176],
};
/** fallback aspect (w / h) per id family */
const ASPECT: [RegExp, number][] = [
  [/^town_service_guild/, 1.5],
  [/^town_service_pool/, 2.636],
  [/^town_service_device/, 1.222],
  [/^town_service_station/, 3.333],
  [/^town_mouth/, 1.55],
  [/^town_(blacksmith|bank|kennel)_/, 1.25],
  [/^town_tent/, 1.05],
  [/^town_board/, 0.85],
  [/^town_campfire/, 1.1],
  [/^town_plot/, 1.1],
  [/^town_scaffold/, 0.9],
  [/^(hero_|walk_|town_(smith|merchant|carter|child))/, 0.7],
  [/^town_(sack|chest)/, 0.95],
  [/^town_anvil$/, 1.75],
  [/^town_hammer_down$/, 1.6],
  [/^town_worker_(porter|apprentice|drillmaster|kennel_hand)/, 1.2],
  [/^town_worker_/, 0.75],
  [/^town_haul_chest/, 1.5],
  [/^town_flag/, 0.6],
  [/^env_torch/, 0.66],
  [/^town_env_tree/, 0.5],
  [/^town_env_/, 1],
  [/^fx_/, 1],
];
export class TownAtlas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  version = 0;
  private slots = new Map<string, Slot>();
  private sx = 1;
  private sy = 1;
  private sh = 0;
  private src: { img: HTMLImageElement; frames: Record<string, Frame> } | null = null;
  ready = false;
  private lastId = "";
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = ATLAS;
    this.canvas.height = ATLAS;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    void loadPacked().then((p) => {
      this.src = p;
      this.ready = true;
      this.reset();
    });
  }
  has(id: string): boolean {
    return !!this.src?.frames[id];
  }
  /** Cached stepped pigment ellipse; geometry stays in integer town texels. */
  shadow(width: number, depth: number): Slot {
    return this.get(
      `town_ground_shadow_${Math.max(6, Math.round(width))}`,
      Math.max(3, Math.round(depth)),
    );
  }
  /** Cut 30.5: the slot of `ids` greyed — a lit node's worker not yet hired (art/town_sheet.py `grey()`: the values only, lifted toward a
   *  pale MIST grey, alpha × 0.8), cut once into its own slot */
  grey(ids: string | string[], h: number): Slot {
    const base = this.get(ids, h);
    const key = `grey:${Array.isArray(ids) ? ids.join("|") : ids}@${h}`; // (a reset — the packed atlas landing — clears it with the rest)
    const hit = this.slots.get(key);
    if (hit) return hit;
    const w = base.w;
    if (this.sx + w + 1 > ATLAS) {
      this.sy += this.sh + 1;
      this.sx = 1;
      this.sh = 0;
    }
    if (this.sy + h + 1 > ATLAS) {
      this.reset();
      return this.get(ids, h);
    }
    const x = this.sx,
      y = this.sy;
    this.sx += w + 1;
    this.sh = Math.max(this.sh, h);
    const d = this.ctx.getImageData(base.x, base.y, base.w, base.h),
      p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = 0.2126 * p[i]! + 0.7152 * p[i + 1]! + 0.0722 * p[i + 2]!;
      p[i] = l * 0.4 + 164 * 0.42;
      p[i + 1] = l * 0.4 + 188 * 0.42;
      p[i + 2] = l * 0.4 + 214 * 0.42;
      p[i + 3] = p[i + 3]! * 0.8;
    }
    this.ctx.putImageData(d, x, y);
    const slot: Slot = {
      x,
      y,
      w,
      h,
      u0: x / ATLAS,
      v0: 1 - (y + h) / ATLAS,
      u1: (x + w) / ATLAS,
      v1: 1 - y / ATLAS,
    };
    this.slots.set(key, slot);
    this.version++;
    return slot;
  }
  private seated(ids: string[], h: number): Slot {
    const base = this.get(ids, h),
      key = `seated:${ids.join("|")}@${h}`;
    const cached = this.slots.get(key);
    if (cached) return cached;
    const w = base.w + 3,
      sh = Math.max(8, Math.round(h * 0.8));
    if (this.sx + w + 1 > ATLAS) {
      this.sy += this.sh + 1;
      this.sx = 1;
      this.sh = 0;
    }
    if (this.sy + sh + 1 > ATLAS) {
      this.reset();
      return this.seated(ids, h);
    }
    const x = this.sx,
      y = this.sy;
    this.sx += w + 1;
    this.sh = Math.max(this.sh, sh);
    const torso = Math.round(base.h * 0.68);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.canvas, base.x, base.y, base.w, torso, x, y, base.w, torso);
    this.ctx.drawImage(
      this.canvas,
      base.x,
      base.y + torso,
      base.w,
      base.h - torso,
      x + 2,
      y + torso,
      base.w + 1,
      sh - torso,
    );
    const slot = {
      x,
      y,
      w,
      h: sh,
      u0: x / ATLAS,
      v0: 1 - (y + sh) / ATLAS,
      u1: (x + w) / ATLAS,
      v1: 1 - y / ATLAS,
    };
    this.slots.set(key, slot);
    this.version++;
    return slot;
  }
  private reset(): void {
    this.slots.clear();
    this.sx = 1;
    this.sy = 1;
    this.sh = 0;
    this.ctx.clearRect(0, 0, ATLAS, ATLAS);
    this.version++;
  }
  /** the slot of `id` drawn `h` texels tall (the first id of `ids` the atlas has, else a primitive of the first) */
  get(ids: string | string[], h: number): Slot {
    const requested = Array.isArray(ids) ? ids : [ids];
    if (requested[0]?.startsWith("town_seated:"))
      return this.seated(
        requested.map((id) => id.replace(/^town_seated:/, "")),
        h,
      );
    const list = Array.isArray(ids) ? ids : [ids];
    const id = list.find((x) => this.src?.frames[x]) ?? list[0]!;
    const key = `${id}@${h}`;
    const s = this.slots.get(key);
    if (s) return s;
    const f = this.src?.frames[id];
    const shadowWidth = /^town_ground_shadow_(\d+)$/.exec(id);
    const w = shadowWidth
      ? Number(shadowWidth[1])
      : f
        ? Math.max(1, Math.round((h * f.w) / f.h))
        : Math.max(1, Math.round(h * (ASPECT.find(([re]) => re.test(id))?.[1] ?? 1)));
    if (this.sx + w + 1 > ATLAS) {
      this.sy += this.sh + 1;
      this.sx = 1;
      this.sh = 0;
    }
    if (this.sy + h + 1 > ATLAS) this.reset(); // (never in practice: a full sheet starts over)
    const x = this.sx,
      y = this.sy;
    this.sx += w + 1;
    this.sh = Math.max(this.sh, h);
    const slot: Slot = {
      x,
      y,
      w,
      h,
      u0: x / ATLAS,
      v0: 1 - (y + h) / ATLAS,
      u1: (x + w) / ATLAS,
      v1: 1 - y / ATLAS,
    };
    this.slots.set(key, slot);
    this.lastId = id;
    if (f && this.src) this.cut(this.src.img, f, slot);
    else if (!paintHomeService(this.ctx, id, x, y, w, h, townBaseDepth()))
      drawPrimitive(this.ctx, id, x, y, w, h);
    this.version++;
    return slot;
  }
  /** a packed master cut to its drawn size by area (smoothed, then the alpha thresholded: a crisp silhouette) */
  private cut(img: HTMLImageElement, f: Frame, s: Slot): void {
    if (f.w === s.w && f.h === s.h) {
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(img, f.x, f.y, f.w, f.h, s.x, s.y, s.w, s.h);
      return;
    }
    const c = document.createElement("canvas");
    c.width = s.w;
    c.height = s.h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, s.w, s.h);
    const d = g.getImageData(0, 0, s.w, s.h),
      p = d.data;
    for (let i = 3; i < p.length; i += 4) p[i] = p[i]! < 110 ? 0 : 255;
    // the art note ("the four walkers look alike"): a walker's coat takes its class's hue — mid-tones, never the BLOOD cloak or the ink
    const tint =
      WALKER_TINT[
        /^(?:walk|hero)_(\w+?)(?:_|$)/.exec(f === undefined ? "" : this.lastId)?.[1] ?? ""
      ];
    if (tint)
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const r = p[i]!,
          gg = p[i + 1]!,
          b = p[i + 2]!,
          l = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
        if (l < 0.12 || l > 0.8 || (r > gg * 1.5 && r > b * 1.4)) continue;
        const m = 0.42 * (1 - Math.abs(l - 0.42) * 1.6);
        p[i] = r + (tint[0]! * l * 2 - r) * m;
        p[i + 1] = gg + (tint[1]! * l * 2 - gg) * m;
        p[i + 2] = b + (tint[2]! * l * 2 - b) * m;
      }
    this.ctx.putImageData(d, s.x, s.y);
  }
}
/** the primitive for an id the atlas lacks: a coloured block in the thing's shape (docs/TOWN.md §7: "a coloured block + its icon") */
function drawPrimitive(
  g: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const R = (c: string, a: number, b: number, cw: number, ch: number): void => {
    g.fillStyle = c;
    g.fillRect(
      x + Math.round(a),
      y + Math.round(b),
      Math.max(1, Math.round(cw)),
      Math.max(1, Math.round(ch)),
    );
  };
  const tri = (c: string, x0: number, y0: number, x1: number, x2: number, yb: number): void => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x + x0, y + y0);
    g.lineTo(x + x1, y + yb);
    g.lineTo(x + x2, y + yb);
    g.closePath();
    g.fill();
  };
  const speck = (base: string, dark: string, n: number): void => {
    R(base, 0, 0, w, h);
    for (let i = 0; i < n; i++) R(dark, hashN(i, x, y) % w, hashN(y, i, 7) % h, 1, 1);
  };
  if (id.startsWith("town_ground_shadow_")) {
    // Three quiet ink washes, a crisp outer edge and a dense foot contact.
    // No blur or gradient: both renderer paths sample the same small bitmap.
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const d =
          Math.pow((xx + 0.5 - w / 2) / (w / 2), 2) + Math.pow((yy + 0.5 - h / 2) / (h / 2), 2);
        if (d <= 1)
          R(
            d < 0.24
              ? "rgba(13,17,24,.32)"
              : d < 0.63
                ? "rgba(13,17,24,.21)"
                : "rgba(13,17,24,.09)",
            xx,
            yy,
            1,
            1,
          );
      }
  } else if (id.startsWith("town_wind_grass_")) {
    const lean = Number(id.split("_").at(-1)) - 2;
    // Stepped ink/wash blade clusters, five bends with the same rooted bases.
    for (const [root, tall, bias] of [
      [w * 0.25, h * 0.72, -1],
      [w * 0.5, h, 0],
      [w * 0.75, h * 0.6, 1],
    ]) {
      for (let j = 0; j < tall!; j++) {
        const bend = Math.round((lean + bias!) * Math.pow(j / tall!, 1.35));
        R(
          j === Math.ceil(tall!) - 1 ? "#60715e" : "#394b40",
          Math.max(0, Math.min(w - 1, root! + bend)),
          h - 1 - j,
          1,
          1,
        );
      }
    }
  } else if (id.startsWith("town_env_grass")) speck("#3d5a2a", "#2f4720", 22);
  else if (id.startsWith("town_env_dirt")) speck("#7a5a3a", "#5e442a", 18);
  else if (id.startsWith("town_env_plaza")) {
    speck("#8a8478", "#6b665c", 10);
    R("#5c574e", 0, 7, w, 1);
    R("#5c574e", 7, 0, 1, 8);
  } else if (id.startsWith("town_env_cliff")) speck("#3b3a3f", "#2a292e", 26);
  else if (id.startsWith("town_env_water")) speck("#2a4a62", "#3f6a86", 12);
  else if (id.startsWith("town_env_tree")) {
    R("#4a321f", w * 0.4, h * 0.65, w * 0.2, h * 0.35);
    g.fillStyle = "#24401f";
    g.beginPath();
    g.ellipse(x + w / 2, y + h * 0.4, w * 0.5, h * 0.38, 0, 0, Math.PI * 2);
    g.fill();
  } else if (id.startsWith("town_mouth")) {
    R("#4a474e", 0, h * 0.15, w, h * 0.85);
    g.fillStyle = "#0c0b10";
    g.beginPath();
    g.ellipse(x + w / 2, y + h * 0.62, w * 0.2, h * 0.36, 0, Math.PI, 0);
    g.fill();
    R("#0c0b10", w * 0.3, h * 0.62, w * 0.4, h * 0.38);
  } else if (/^town_(blacksmith|bank|kennel)_/.test(id)) {
    const col = /blacksmith/.test(id)
      ? ["#4b4650", "#7a2a1c"]
      : /bank/.test(id)
        ? ["#b8b0a0", "#5a6f86"]
        : ["#8c6a44", "#6a4a2a"];
    R(col[0]!, w * 0.08, h * 0.42, w * 0.84, h * 0.58);
    tri(col[1]!, w / 2, 0, -w * 0.02 + w * 0.02, w, h * 0.46);
    R("#1e1914", w * 0.42, h * 0.68, w * 0.16, h * 0.32);
    if (/blacksmith/.test(id)) R("#e07a2a", w * 0.16, h * 0.7, w * 0.14, h * 0.1);
    if (/bank/.test(id)) {
      g.fillStyle = "#e3c24a";
      g.beginPath();
      g.arc(x + w * 0.5, y + h * 0.3, Math.max(2, h * 0.08), 0, Math.PI * 2);
      g.fill();
    }
  } else if (id.startsWith("town_drill_dummy")) {
    // Cut273: the straw dummy on its post (a cross), a rag
    R("#4a321f", w * 0.3, h * 0.2, 2, h * 0.8);
    R("#4a321f", w * 0.05, h * 0.35, w * 0.55, 2);
    R("#c9b48a", w * 0.2, h * 0.1, w * 0.22, h * 0.45);
    R("#c01530", w * 0.2, h * 0.14, w * 0.22, 1);
    R("#8a8a92", w * 0.75, h * 0.25, 1, h * 0.75);
  } else if (id.startsWith("town_tent")) {
    tri("#c9b48a", w / 2, 0, 0, w, h);
    tri("#2a2218", w / 2, h * 0.45, w * 0.36, w * 0.64, h);
  } else if (id.startsWith("town_board")) {
    R("#4a321f", w * 0.15, h * 0.3, 2, h * 0.7);
    R("#4a321f", w * 0.8, h * 0.3, 2, h * 0.7);
    R("#6a5034", 0, 0, w, h * 0.6);
    R("#d8c8a0", w * 0.2, h * 0.12, w * 0.3, h * 0.25);
  } else if (id.startsWith("town_crate")) {
    R("#8a6034", 0, 0, w, h);
    R("#5a3c1e", 0, h / 2, w, 1);
    R("#5a3c1e", w / 2, 0, 1, h);
  } else if (id.startsWith("town_campfire")) {
    R("#4a321f", 0, h * 0.75, w, h * 0.25);
    tri(id.endsWith("_1") ? "#ffcf5a" : "#f08a2a", w / 2, 0, w * 0.15, w * 0.85, h * 0.8);
  } else if (id.startsWith("town_plot")) {
    for (const a of [0.1, 0.9]) R("#6a4a2a", w * a - 1, h * 0.2, 2, h * 0.8);
    R("#d8c8a0", w * 0.1, h * 0.35, w * 0.8, 1);
  } else if (id.startsWith("town_scaffold")) {
    for (let i = 0; i <= 3; i++) {
      R("#7a5534", ((w - 2) * i) / 3, 0, 2, h);
      R("#7a5534", 0, ((h - 2) * i) / 3, w, 2);
    }
  } else if (id.startsWith("town_sack")) {
    g.fillStyle = "#b89a62";
    g.beginPath();
    g.ellipse(x + w / 2, y + h * 0.6, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
    g.fill();
    R("#e3c24a", w * 0.4, h * 0.1, w * 0.2, h * 0.25);
  } else if (id.startsWith("town_haul_chest")) {
    // the haul chest: closed · full (a coin heap and a glint) · open (the lid up behind, dark inside)
    const open = id.endsWith("_open"),
      full = id.endsWith("_full");
    if (open) {
      R("#4a3220", w * 0.08, 0, w * 0.84, h * 0.4);
      R("#0d0c14", w * 0.12, h * 0.4, w * 0.76, h * 0.14);
    }
    R("#5a3c22", w * 0.06, h * 0.45, w * 0.88, h * 0.47);
    R("#2b3350", w * 0.06, h * 0.6, w * 0.88, 1);
    R("#2b3350", w * 0.3, h * 0.45, 1, h * 0.47);
    R("#2b3350", w * 0.7, h * 0.45, 1, h * 0.47);
    if (!open) R("#6a4a2c", w * 0.04, h * 0.32, w * 0.92, h * 0.15);
    R("#b89448", w * 0.45, h * 0.52, w * 0.1, h * 0.14);
    if (full) {
      R("#b89448", w * 0.12, h * 0.22, w * 0.76, h * 0.1);
      R("#eadfc5", w * 0.62, h * 0.08, 1, h * 0.16);
      R("#eadfc5", w * 0.56, h * 0.15, w * 0.14, 1);
    }
  } else if (id.startsWith("town_worker_")) {
    // a worker: a townsperson (no BLOOD) and the role's tag in its own colour (art/town-ids.md, workers)
    const role = id.replace(/^town_worker_|_1$/g, "");
    const coat: Record<string, string> = {
      porter: "#3a3448",
      apprentice: "#5a3c22",
      clerk: "#1c1b2b",
      drillmaster: "#6a5a40",
      kennel_hand: "#4a3a2a",
      herald: "#2b3350",
      guide: "#7d8ea4",
      scout: "#4a3a2a",
      quartermaster: "#6a5a40",
    };
    const fw = /porter|apprentice|drillmaster|kennel_hand/.test(role) ? w * 0.55 : w; // the figure's share (the tag object right of it)
    R(coat[role] ?? "#3a3448", fw * 0.22, h * 0.28, fw * 0.56, h * 0.5);
    R("#eadfc5", fw * 0.32, h * 0.06, fw * 0.36, h * 0.2);
    R("#1c1b2b", fw * 0.26, h * 0.78, fw * 0.18, h * 0.22);
    R("#1c1b2b", fw * 0.56, h * 0.78, fw * 0.18, h * 0.22);
    const T = (c: string, a: number, b: number, cw: number, ch: number): void =>
      R(c, fw + (w - fw) * a, h * b, (w - fw) * cw, h * ch);
    if (role === "porter") {
      T("#6a4a2c", 0.05, 0.45, 0.9, 0.3);
      T("#eadfc5", 0.15, 0.25, 0.7, 0.22);
      T("#1c1b2b", 0.3, 0.72, 0.35, 0.28);
    } else if (role === "apprentice") {
      T("#0d0c14", 0.1, 0.55, 0.8, 0.2);
      T("#0d0c14", 0.35, 0.75, 0.3, 0.25);
      T("#e8923a", 0.25, 0.48, 0.5, 0.07);
    } else if (role === "drillmaster") {
      T("#b89448", 0.4, 0.15, 0.2, 0.3);
      T("#6a4a2c", 0.47, 0.45, 0.06, 0.55);
      T("#6a4a2c", 0.1, 0.32, 0.8, 0.06);
    } else if (role === "kennel_hand") {
      T("#4d6c99", 0.1, 0.55, 0.7, 0.25);
      T("#4d6c99", 0.55, 0.4, 0.3, 0.2);
      T("#1c1b2b", 0.15, 0.8, 0.1, 0.2);
    } else if (role === "clerk") R("#eadfc5", fw * 0.5, h * 0.4, fw * 0.45, h * 0.16);
    else if (role === "herald") {
      R("#eadfc5", fw * 0.6, h * 0.42, fw * 0.25, h * 0.4);
      R("#b89448", fw * 0.78, h * 0.25, fw * 0.16, h * 0.1);
    } else if (role === "guide") {
      R("#e8923a", fw * 0.76, h * 0.4, fw * 0.18, h * 0.12);
      R("#6a4a2c", fw * 0.12, h * 0.05, 1, h * 0.95);
    } else if (role === "scout") {
      R("#1c1b2b", fw * 0.15, h * 0.02, fw * 0.7, h * 0.08);
      R("#b89448", fw * 0.62, h * 0.12, fw * 0.32, h * 0.06);
      R("#eadfc5", fw * 0.78, h * 0.35, fw * 0.2, h * 0.06);
    } else if (role === "quartermaster") {
      R("#5a3c22", fw * 0.5, h * 0.3, fw * 0.45, h * 0.35);
      R("#eadfc5", fw * 0.5, h * 0.26, fw * 0.45, h * 0.06);
    }
  } else if (id.startsWith("town_chest")) {
    R("#7a4a1e", 0, h * 0.3, w, h * 0.7);
    R("#ffd76a", 0, h * 0.3, w, 2);
    R("#ffd76a", w * 0.42, h * 0.45, w * 0.16, h * 0.2);
  } else if (id.startsWith("town_flag")) {
    R("#4a321f", 0, 0, 1, h);
    R(id.endsWith("_1") ? "#a01a28" : "#c01530", 1, 1, w - 1, h * 0.4);
  } else if (id.startsWith("env_torch")) {
    R("#4a321f", w * 0.4, h * 0.4, w * 0.2, h * 0.6);
    R(id.endsWith("_1") ? "#ffcf5a" : "#f08a2a", w * 0.25, 0, w * 0.5, h * 0.45);
  } else if (id.startsWith("fx_glint")) {
    const c = Math.floor(w / 2);
    R("#fffbe8", c, 0, 1, h);
    R("#fffbe8", 0, c, w, 1);
    R("#ffffff", c - 1, c - 1, 3, 3);
  } else if (id === "town_lantern") {
    // Ink cage and orange ember wick, shared by GL and Canvas.
    R("#4d6c99", 1, 0, 3, 1);
    R("#0d0c14", 1, 1, 1, 3);
    R("#0d0c14", 3, 1, 1, 3);
    R("#e8923a", 2, 1, 1, 3);
    R("#b89448", 1, 4, 3, 1);
  } else if (id === "town_bench") {
    // Primitive plank-seat fallback; the packed bench comes from art/prompts/town_props_bench_lantern.txt.
    R("#0d0c14", 0, h * 0.3, w, h * 0.32);
    R("#7a5a3a", 1, h * 0.35, w - 2, h * 0.2);
    R("#4d6c99", 1, h * 0.35, w - 2, 1);
    R("#2b3350", w * 0.08, 0, w * 0.84, h * 0.16);
    R("#0d0c14", w * 0.1, h * 0.6, Math.max(1, w * 0.12), h * 0.4);
    R("#0d0c14", w * 0.78, h * 0.6, Math.max(1, w * 0.12), h * 0.4);
  } else if (id === "town_anvil") {
    // Cut 228: the Forge's anvil (code-native; its own fallback): ink face, iron horn, a stem and a block
    R("#0d0c14", 0, 0, w, 2);
    R("#5a5f6a", 1, 0, w - 2, 1);
    R("#2a2c33", 0, 1, 2, 1);
    R("#2a2c33", Math.floor(w * 0.35), 2, Math.max(1, Math.ceil(w * 0.3)), h - 4);
    R("#3a2a1e", 1, h - 2, w - 2, 2);
  } else if (id === "town_hammer_down") {
    // Cut 228: the smith's hammer struck on the anvil (head down, haft toward his hands)
    R("#0d0c14", 0, 0, 4, h);
    R("#5a5f6a", 1, 1, 2, h - 2);
    R("#9aa0aa", 1, 0, 2, 1);
    R("#6b4a2a", 4, Math.floor(h / 2) - 1, w - 4, 2);
  } else if (id.startsWith("fx_dot_")) R(`#${id.slice(7)}`, 0, 0, w, h);
  else if (/^(hero_|walk_)/.test(id)) {
    const body = /rogue/.test(id)
      ? "#4a3a5a"
      : /ranger/.test(id)
        ? "#3f5a32"
        : /caster/.test(id)
          ? "#3a4a7a"
          : "#8a8f98";
    R("#c01530", w * 0.15, h * 0.32, w * 0.3, h * 0.5);
    R(body, w * 0.25, h * 0.3, w * 0.5, h * 0.45);
    R("#e8dcc8", w * 0.32, h * 0.08, w * 0.36, h * 0.22);
    R("#2a2420", w * 0.3, h * 0.75, w * 0.15, h * 0.25);
    R("#2a2420", w * 0.55, h * 0.75, w * 0.15, h * 0.25);
  } else {
    R("#7a6a4a", w * 0.1, h * 0.35, w * 0.8, h * 0.45);
    R("#5a4a32", w * 0.15, h * 0.75, w * 0.12, h * 0.25);
    R("#5a4a32", w * 0.7, h * 0.75, w * 0.12, h * 0.25);
    R("#7a6a4a", w * 0.65, h * 0.15, w * 0.3, h * 0.3);
  } // a beast
}

// ---- the frame: what one paint draws (both views read it) -----------------------------------------------------------------------

export type Quad = {
  s: Slot;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  flip: boolean;
  dim: number;
  fade: number;
  relief?: number;
  /** Exact decoded art key, for dev-only coverage inspection. */
  asset?: string;
  actorId?: string;
};
export type Light = { x: number; y: number; r: number; c: [number, number, number] };
export type TownFrame = {
  x0: number;
  y0: number;
  w: number;
  h: number;
  k: number;
  W: number;
  H: number;
  quads: Quad[];
  n: number;
  terrain: HTMLCanvasElement | null;
  groundKey: string;
  lights: Light[];
  amb: [number, number, number];
  night: number;
  live: number;
  /** Cut272: the sprites lit by their own silhouette this frame (hover/focus, ready, a task tap) */
  glows: Glow[];
};

/** hour (0..24) → night 0..1: day 7–17, dusk 17–21, night 21–5, dawn 5–7 */
export function nightOf(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 21 || h < 5) return 1;
  if (h >= 7 && h < 17) return 0;
  return h < 7 ? 1 - (h - 5) / 2 : (h - 17) / 4;
}
const mix3 = (a: number[], b: number[], t: number): [number, number, number] => [
  a[0]! + (b[0]! - a[0]!) * t,
  a[1]! + (b[1]! - a[1]!) * t,
  a[2]! + (b[2]! - a[2]!) * t,
];
const AMB_DAY = [1.1, 1.08, 1.06],
  AMB_DUSK = [0.86, 0.68, 0.62],
  AMB_NIGHT = [0.27, 0.34, 0.58]; // moonlight: cool and low, so the warm windows and the fire carry the night (the coordinator: night read as just darker)
export function ambientOf(night: number): [number, number, number] {
  return night < 0.5
    ? mix3(AMB_DAY, AMB_DUSK, night * 2)
    : mix3(AMB_DUSK, AMB_NIGHT, (night - 0.5) * 2);
}

// ---- walkers ------------------------------------------------------------------------------------------------------------------

type Leg = { t0: number; t1: number; a: Pt; b: Pt };
type Walker = {
  id: string;
  homeOffset?: { x: number; y: number };
  sprite: string[];
  walk: string[];
  h: number;
  legs: Leg[];
  from: number;
  to: number;
  carry?: string;
  carryH?: number;
  lag: number;
  follow?: Walker;
  emerge?: boolean;
  vanish?: boolean;
  extend?: (w: Walker) => void;
  pet?: boolean;
  reincarnating?: boolean;
  /** the wander's next stop (an index into its stops) */
  stop?: number;
  /** Cut 228: standing still and facing left over [t0, t1) (a hero turned to the smith) */
  faceLeft?: [number, number];
  /** Cut 228: seated from `from` on (a resting hero back on the pool's bench) */
  seat?: { from: number; ids: string[] };
  /** Cut 228: a resident who may be fitted at the Forge: its standing frames, its wander, its bench */
  fit?: {
    sprite: string[];
    walk: string[];
    wander: (w: Walker) => void;
    smithStop: number;
    bench?: Pt;
  };
  /** Cut 228: the forge work this resident answered (`hero:step@from`), and when the fitting ends */
  fitKey?: string;
  fitEnd?: number;
};
const SPEED = 40;
function legsAlong(pts: Pt[], t0: number, speed = SPEED, out: Leg[] = []): number {
  let t = t0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1]!, pts[i]!);
    if (d < 0.01) continue;
    out.push({ t0: t, t1: t + d / speed, a: pts[i - 1]!, b: pts[i]! });
    t += d / speed;
  }
  return t;
}
function walkerAt(
  w: Walker,
  t: number,
): { x: number; y: number; moving: boolean; dx: number } | null {
  if (t < w.from || t > w.to) return null;
  const legs = w.legs;
  if (w.extend && legs.length && legs[legs.length - 1]!.t1 < t + 30) w.extend(w);
  if (!legs.length) return null;
  if (t <= legs[0]!.t0) return { x: legs[0]!.a.x, y: legs[0]!.a.y, moving: false, dx: 0 };
  let lo = 0,
    hi = legs.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (legs[m]!.t0 <= t) lo = m;
    else hi = m - 1;
  }
  const L = legs[lo]!;
  if (t >= L.t1) return { x: L.b.x, y: L.b.y, moving: false, dx: 0 };
  const f = (t - L.t0) / (L.t1 - L.t0);
  return {
    x: L.a.x + (L.b.x - L.a.x) * f,
    y: L.a.y + (L.b.y - L.a.y) * f,
    moving: true,
    dx: L.b.x - L.a.x,
  };
}

// ---- particles (cosmetic) -------------------------------------------------------------------------------------------------------

type Part = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  kind: "smoke" | "ember" | "spark" | "dust";
  c: string;
  s: number;
};
const SMOKE = ["9a958c", "7d7a74", "b4afa4"],
  EMBER = ["ffb04a", "ff7a2a", "ffd76a"],
  DUST = ["b89a6a", "9a7e56", "cdb48a"];

// ---- the view ---------------------------------------------------------------------------------------------------------------------

export type TownStats = {
  fps: number;
  frames: number;
  cpuMs: number;
  /** Renderer plus actor/label callbacks; existing cpuMs excludes those callbacks. */
  cpuWithUiMs: number;
  cpuP50: number;
  cpuP95: number;
  walkers: number;
  mode: "gl" | "2d";
  glLost: boolean;
  k: number;
  night: number;
  characterLights: number;
  lights: number;
  idle: boolean;
  running: boolean;
  terrainPaints: number;
  terrainPaintMs: number;
  windTufts: number;
  windSignature: number;
  services?: ServiceId[];
  /** Cut264: the vat as drawn — its sprite (`""`: none), the clone's state, its mist light's strength and colour */
  vat?: {
    art: string;
    clone: "growing" | "ready" | null;
    light: number;
    color: string;
    /** heroes seen stepping out of the vat on this mount */
    emerged: number;
  };
  residentStates?: {
    id: number;
    resting: boolean;
    phase?: "away" | "reincarnating" | "recovering" | "ready";
  }[];
  buildings: string[];
  activeBuilds: string[];
  buildEvents: number;
  buildDust: number;
  staked?: string;
  markers: string[];
  view: [number, number, number, number];
  chest?: string;
  /** Cut 228: the Forge's present work as drawn (null: the smith idles, no sparks) */
  forge: {
    step: string;
    hero: number;
    left: number;
    still: boolean;
    sparks: number;
    /** spark bursts emitted by real strokes since this view mounted */
    bursts: number;
    fitting: number[];
  } | null;
  workers: string[];
  ranks: Record<string, number>;
  /** Cut272: porter errands begun on this mount, and the one walking */
  hauls: number;
  hauling: "fetch" | "carry" | "return" | null;
  /** Cut272: `hover:id`, `ready:id~` (~ the sweep), `pulse:id`; a trailing `-` when no glow is drawn (outline only) */
  glows: string[];
};
export type TownView = {
  readonly el: HTMLElement;
  setState(s: TownState): void;
  /** At SEND: the hero walks to the mouth and goes in (≤ `ms`); resolves when he is in. */
  walkIn(ms?: number): Promise<void>;
  resize(): void;
  /** a plot's sprite box in CSS px (relative to the view's box); null when nothing stands there */
  rectOf(
    id: PlotId | "staked" | "chest" | `worker:${string}`,
  ): { x: number; y: number; w: number; h: number } | null;
  onLayout(fn: () => void): void;
  stats(): TownStats;
  stress(n: number): void;
  setHour(h: number | null): void;
  focusHero(): void;
  actorRect(id: number): { x: number; y: number; w: number; h: number } | null;
  /** Actual resident hit areas in local CSS pixels; no simulation mutation. */
  actorTargets(): TownActorTarget[];
  onActors(fn: () => void): void;
  /** input seen (the idle cap lifts) */
  poke(): void;
  /** Cut272: light a hit target's sprite (its rectOf id) by its own silhouette: pointer hover or keyboard focus, on or off */
  highlight(id: string, mode: "hover" | "focus", on: boolean): void;
  /** Cut272: the ids that can act now (a hire, a build, a lit order, a waiting haul): the ready shimmer. Replaces the set. */
  setReady(ids: readonly string[]): void;
  /** Cut272: a task tap's two pulses on the sprite; false when the view cannot draw it (no GL, no sprite): the DOM ring stands */
  pulse(id: string): boolean;
  /** Cut272: the porter carries a landed haul from the chest to the house (or the bank); resolves true at the drop (the UI floats
   *  `+$N` there), false at once when nobody can walk it (no porter at his post, reduced motion, effects off) */
  haul(to: "house" | "bank"): Promise<boolean>;
  /** Cut272: the errand's leg (`fetch` · `carry` · `return`), null when none walks */
  hauling(): "fetch" | "carry" | "return" | null;
  /** Cut272: where the haul's `+$N` floats (local CSS px) */
  haulAt(to: "house" | "bank"): Pt;
  /** Cut272: whether this id's highlight is drawn on its sprite (GL live, the sprite standing); false: a CSS outline stands in */
  glowsSprite(id: string): boolean;
  dispose(): void;
};
const IDLE_MS = 10_000,
  IDLE_FPS = 20,
  SOFT_FPS = 2;

let sharedAtlas: TownAtlas | null = null;
let sharedGl: { canvas: HTMLCanvasElement; gl: GLTown; lost: boolean } | null = null;
export type TownLightingPose = {
  asset: string;
  flip: boolean;
  /** Controlled old/new upgrade overlap only; never changes a building. */
  overlayAsset?: string;
};
let lightingInspector: ((pose?: TownLightingPose, withImages?: boolean) => unknown) | null = null;
let artPoseInspector: ((pose: TownLightingPose, withImage: boolean) => unknown) | null = null;
let lightingPairInspector: ((firstOn: boolean, baseDepthOnly: boolean) => unknown) | null = null;
let glowTimingInspector: ((n: number) => unknown) | null = null;
/** Dev-only (Cut272): the same frame rendered with and without its silhouette glows, alternating, each to completion (a 1 px
 *  readback); medians in ms. No engine or clock mutation. */
export function inspectTownGlowTiming(n = 60): unknown {
  return import.meta.env.DEV ? glowTimingInspector?.(n) : null;
}
let lightingPreviewOverride: boolean | undefined;
/** Dev-only matched-workload shader toggle. Does not rebuild actors or alter game time. */
export function setTownLightingPreview(enabled: boolean | null): void {
  if (import.meta.env.DEV) lightingPreviewOverride = enabled ?? undefined;
}
/** Dev-only identical-frame readback; never runs in the animation loop. */
export function inspectTownLighting(pose?: TownLightingPose, withImages = true): unknown {
  return import.meta.env.DEV ? lightingInspector?.(pose, withImages) : null;
}
/** Dev-only controlled art delivery in the actual backend/preference; no unlock or save edit. */
export function inspectTownArtPose(pose: TownLightingPose, withImage = false): unknown {
  return import.meta.env.DEV ? artPoseInspector?.(pose, withImage) : null;
}
/** Dev-only same-Frame submission timer; no readback or engine/clock mutation. */
export function inspectTownLightingTiming(firstOn = false, baseDepthOnly = false): unknown {
  return import.meta.env.DEV ? lightingPairInspector?.(firstOn, baseDepthOnly) : null;
}
export function createTownView(host: HTMLElement): TownView {
  const el = host;
  // one GL canvas and context for every mount (a camp re-mounts on every return): taken here, given back on dispose
  const kept = sharedGl && !sharedGl.gl.isLost() ? sharedGl : null;
  if (sharedGl && !kept) sharedGl.gl.dispose();
  sharedGl = null;
  const glCanvas = kept?.canvas ?? document.createElement("canvas");
  glCanvas.className = "town-gl";
  glCanvas.setAttribute("aria-hidden", "true");
  el.appendChild(glCanvas);
  const atlas = (sharedAtlas ??= new TownAtlas()); // one sheet for every mount (the camp re-mounts on every return; the cuts are not free)
  let gl: GLTown | null = null;
  if (kept) {
    gl = kept.gl;
    gl.restored();
  } else
    try {
      gl = new GLTown(glCanvas, atlas);
    } catch (e) {
      console.warn("town: no WebGL, the 2D view stands in", e);
      gl = null;
    }
  let c2d: HTMLCanvasElement | null = null;
  const view2d = (): HTMLCanvasElement => {
    if (c2d) return c2d;
    c2d = document.createElement("canvas");
    c2d.className = "town-2d";
    c2d.setAttribute("aria-hidden", "true");
    el.appendChild(c2d);
    return c2d;
  };
  let glLost = false;
  const onLost = (e: Event): void => {
    e.preventDefault();
    glLost = true;
    sizeDirty = true;
    layoutDirty = true;
  };
  const onRestored = (): void => {
    glLost = false;
    gl?.restored();
    sizeDirty = true;
    layoutDirty = true;
  };
  glCanvas.addEventListener("webglcontextlost", onLost);
  glCanvas.addEventListener("webglcontextrestored", onRestored);

  let state: TownState | null = null;
  let walkers: Walker[] = [];
  let homeSpots: HomeResidentSpot[] = [];
  const parts: Part[] = [];
  let t = 0,
    last = performance.now(),
    raf = 0,
    frames = 0,
    disposed = false;
  const fpsWin: number[] = [],
    cpu: number[] = [];
  let cpuWithUiMs = 0;
  let lastInput = performance.now(),
    lastDraw = 0;
  let hourOverride: number | null = null;
  let layoutDirty = true;
  // A changed camera/host must repaint on the next frame even under idle/test caps.
  let sizeDirty = true;
  const layoutFns: (() => void)[] = [];
  const upgradeFrom = new Map<string, number>();
  let buildEvents = 0;
  const buildFxEnabled = (): boolean =>
    !motionPreference.matches &&
    !document.hidden &&
    effectsLevel() !== "off" &&
    document.documentElement.dataset.juice !== "off";
  let builtAt = new Map<string, number>(); // fresh buildings: the scene time their scaffold went up
  // Cut 228: the Forge's present work in scene time (from Rust's `forge_work.left_s`), its identity and first stroke
  let forgeUntil = -Infinity,
    forgeFrom = 0,
    forgeKey = "",
    strikeN = -1,
    sparkBursts = 0;
  const forging = (): boolean => !!state?.forge && t < forgeUntil;
  const stillForge = (): boolean => motionPreference.matches || effectsLevel() === "off";
  let hero: Walker | null = null;
  const actorLayout: (() => void)[] = [];
  const residentAnchors = new Map<string, Pt>();
  let walkingIn: { t0: number; t1: number; done: () => void } | null = null;
  let stressN = 0;
  const arrive = new Map<string, Leg[]>(); // Cut 30.5: a worker hired on this mount walks out of the tent to his post
  // Cut272: the porter's errand — a haul landed: he walks to the chest by the mouth, takes it up, carries it to the house (or the bank,
  // the clerk depositing) and walks back to his post. Presentation only: the gold moved in Rust before it starts.
  let errand: {
    at: number;
    pick: number;
    drop: number;
    back: number;
    done: (ok: boolean) => void;
  } | null = null;
  let hauls = 0;
  const F: TownFrame = {
    x0: 0,
    y0: 0,
    w: 1,
    h: 1,
    k: 1,
    W: 1,
    H: 1,
    quads: [],
    n: 0,
    terrain: null,
    groundKey: "",
    lights: [],
    amb: [1, 1, 1],
    night: 0,
    live: 0,
    glows: [],
  };
  let volumeFrame = false;
  function controlledArtFrame(pose: TownLightingPose) {
    const kind = volumeKind(pose.asset);
    if (!kind) return null;
    const decoded = atlas.has(pose.asset.replace(/^town_seated:/, ""));
    const generated = isHomeServiceArt(pose.asset);
    const quads = F.quads.slice(0, F.n).map((q) => ({ ...q }));
    const q = quads.find((q) =>
      volumeService(kind)
        ? q.asset === pose.asset
        : volumeBuilding(kind)
          ? volumeBuilding(volumeKind(q.asset)) &&
            [3, 9, 10].includes(kind) === [3, 9, 10].includes(volumeKind(q.asset))
          : q.actorId?.startsWith("resident:"),
    );
    if (!q) return null;
    const reference = { kind: q.relief, asset: q.asset, actorId: q.actorId, x: q.x, y: q.y };
    const slot = atlas.get(pose.asset, volumeBuilding(kind) || volumeService(kind) ? q.h : 24);
    Object.assign(q, {
      s: slot,
      w: slot.w,
      h: slot.h,
      flip: pose.flip,
      relief:
        (decoded || generated) && volumeFrame && (!volumeService(kind) || townBaseDepth())
          ? kind
          : 0,
      asset: pose.asset,
    });
    if (pose.overlayAsset && volumeBuilding(kind)) {
      const overlayKind = volumeKind(pose.overlayAsset);
      if (!volumeBuilding(overlayKind) || !atlas.has(pose.overlayAsset)) return null;
      const overlay = atlas.get(pose.overlayAsset, q.h);
      q.fade = 0.5;
      quads.push({
        ...q,
        s: overlay,
        w: overlay.w,
        h: overlay.h,
        z: q.z + 0.00002,
        relief: overlayKind,
        asset: pose.overlayAsset,
      });
    }
    return {
      frame: { ...F, quads, n: quads.length },
      specimen: { ...pose, kind, decoded, generated, reference, controlled: true },
    };
  }
  if (import.meta.env.DEV) {
    lightingInspector = (pose, withImages = true) => {
      if (!gl || glLost) return null;
      if (!pose) return gl.compareLighting(F, withImages);
      const controlled = controlledArtFrame(pose);
      if (!controlled || (!controlled.specimen.decoded && !controlled.specimen.generated))
        return { unavailable: "painted pose or real anchor not loaded", pose };
      const proof = gl.compareLighting(controlled.frame, withImages) as Record<string, unknown>;
      gl.render(F);
      return { ...proof, specimen: controlled.specimen };
    };
    artPoseInspector = (pose, withImage) => {
      const controlled = controlledArtFrame(pose);
      if (!controlled) return { unavailable: "real anchor not visible", pose };
      const backend = gl && !glLost ? "gl" : "2d";
      let pixels: Uint8Array | Uint8ClampedArray;
      let image: string | undefined;
      if (gl && !glLost) {
        gl.render(controlled.frame);
        pixels = gl.readScreen(controlled.frame);
        if (withImage) image = glCanvas.toDataURL();
        gl.render(F);
      } else {
        const canvas = view2d();
        drawTown2D(canvas, controlled.frame, atlas.canvas);
        pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        if (withImage) image = canvas.toDataURL();
        drawTown2D(canvas, F, atlas.canvas);
      }
      let checksum = 2166136261,
        opaque = 0;
      for (let i = 0; i < pixels.length; i++) {
        checksum = Math.imul(checksum ^ pixels[i]!, 16777619);
        if ((i & 3) === 3 && pixels[i]) opaque++;
      }
      return {
        specimen: controlled.specimen,
        backend,
        effects: effectsLevel(),
        reducedMotion: motionPreference.matches,
        dimensionalLight: backend === "gl" && townVolumeLighting(),
        pixelBytes: pixels.length,
        opaquePixels: opaque,
        checksum: checksum >>> 0,
        image,
      };
    };
  }
  if (import.meta.env.DEV) glowTimingInspector = (n) => (gl && !glLost ? gl.timeGlow(F, n) : null);
  if (import.meta.env.DEV)
    lightingPairInspector = (firstOn, baseDepthOnly) => {
      if (!gl || glLost) return null;
      const submission = gl.timeLightingPair(F, firstOn, baseDepthOnly);
      const uiStart = performance.now();
      for (const fn of actorLayout) fn();
      const sharedUiMs = performance.now() - uiStart;
      return {
        ...submission,
        comparison: baseDepthOnly
          ? "generated service relief only; existing mapped lighting and current cached art retained"
          : "all mapped relief",
        sharedUiMs,
        offWithUiMs: submission.offMs + sharedUiMs,
        onWithUiMs: submission.onMs + sharedUiMs,
        observedAnimatedCpuWithUiMs: cpuWithUiMs,
        frame: {
          id: frames,
          x0: F.x0,
          y0: F.y0,
          w: F.w,
          h: F.h,
          night: F.night,
          quads: F.n,
          lights: F.lights.map((l) => ({ x: l.x, y: l.y, r: l.r, c: [...l.c] })),
          mapped: F.quads
            .slice(0, F.n)
            .filter((q) => q.relief)
            .map((q) => ({ kind: q.relief, x: q.x, y: q.y, w: q.w, h: q.h, flip: q.flip })),
        },
      };
    };
  let terrainPaints = 0,
    terrainPaintMs = 0;
  let windTufts = 0,
    windSignature = 0;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const rng = (n: number): number => (hashN(state?.seed ?? 1, n) % 100000) / 100000;

  // -- the walkers of a state --
  function build(homeArrival = false): void {
    const s = state!;
    walkers = [];
    const cls = s.hero.cls,
      heroIds = [
        ...(s.hero.look ? [`hero_${cls}_${s.hero.look}`] : []),
        `hero_${cls}`,
        "hero_fighter",
      ],
      walkIds = townWalkIds(cls, s.hero.look, heroIds);
    let k = 0;
    const partyEnd = s.parties.length ? s.parties[s.parties.length - 1]!.at + 7 : 0;
    for (const p of s.parties) {
      const legs: Leg[] = [];
      const end = legsAlong(route("in", p.to), p.at, SPEED, legs);
      const w: Walker = {
        id: `party${k++}`,
        sprite: heroIds,
        walk: walkIds,
        h: 24,
        legs,
        from: p.at,
        to: end + 0.4,
        lag: 0,
        emerge: true,
        vanish: true,
        carry: p.chest ? "town_chest_glow" : p.sack ? `town_sack_${p.sack}` : undefined,
        carryH: p.chest ? 8 : p.sack === "large" ? 8 : 6,
      };
      walkers.push(w);
      if (p.pet)
        walkers.push({
          id: `${w.id}pet`,
          sprite: [p.pet, "town_dog"],
          walk: [p.pet, "town_dog"],
          h: 14,
          legs,
          from: p.at + 0.7,
          to: end + 1.1,
          lag: 0.7,
          follow: w,
          emerge: true,
          vanish: true,
          pet: true,
        });
    }
    buildFolk();
    if (!s.home) {
      hero = null;
      addStress();
      return;
    }
    // the hero at home: tent → forge → fire (→ the crate while no forge stands), a pause of 2–6 s at each
    const stops = [
      "tent",
      s.buildings.some((b) => b.id === "blacksmith") ? "smith" : "crate",
      "fireW",
    ];
    hero = null;
    const residents = s.residents ?? [
      { id: s.selectedHero ?? 1, cls: s.hero.cls, look: s.hero.look },
    ];
    for (const resident of residents) {
      const i0 = homeArrival ? 0 : (Math.floor(rng(resident.id * 31) * 3) + resident.id) % 3;
      let n = 0;
      const ids = [
        ...(resident.look ? [`hero_${resident.cls}_${resident.look}`] : []),
        `hero_${resident.cls}`,
        "hero_fighter",
      ];
      const actor: Walker = {
        id: `resident:${resident.id}`,
        homeOffset: { x: (((resident.id - 1) % 3) - 1) * 12, y: 0 },
        sprite: ids,
        walk: townWalkIds(resident.cls, resident.look, ids),
        h: 24,
        legs: [],
        from: partyEnd,
        to: Infinity,
        lag: resident.id * 0.1,
        stop: i0,
        extend: (w) => {
          let tt = w.legs.length ? w.legs[w.legs.length - 1]!.t1 : partyEnd;
          for (let j = 0; j < 6; j++) {
            const i = w.stop ?? 0;
            const a = stops[i % 3]!,
              b = stops[(i + 1) % 3]!;
            w.stop = i + 1;
            const pause = 2 + rng(100 + resident.id * 101 + n++) * 4;
            const at = NODES[a]!;
            w.legs.push({ t0: tt, t1: tt + pause, a: at, b: at });
            tt += pause;
            tt = legsAlong(route(a, b), tt, SPEED * 0.8, w.legs);
          }
        },
      };
      // Cut 228: a hero neither recovering nor cloning may answer the Forge's real work (refit)
      if (resident.phase !== "reincarnating" && resident.phase !== "recovering")
        actor.fit = {
          sprite: actor.sprite,
          walk: actor.walk,
          wander: actor.extend!,
          smithStop: stops.indexOf("smith"),
        };
      if (
        (resident.phase === "reincarnating" || resident.phase === "recovering") &&
        s.services?.includes("device")
      ) {
        actor.homeOffset = { x: 0, y: 0 };
        actor.reincarnating = true;
        const p = homeSpots.find((p) => p.id === resident.id)!.device;
        actor.legs = [{ t0: partyEnd, t1: Infinity, a: p, b: p }];
        actor.extend = undefined;
      } else if (resident.resting && s.services?.includes("pool")) {
        actor.homeOffset = { x: 0, y: 0 };
        actor.sprite = ids.map((id) => `town_seated:${id}`);
        actor.walk = actor.sprite;
        const p = homeSpots.find((p) => p.id === resident.id)!.pool;
        actor.legs = [{ t0: partyEnd, t1: Infinity, a: p, b: p }];
        actor.extend = undefined;
        if (actor.fit) actor.fit.bench = p;
      } else actor.extend!(actor);
      walkers.push(actor);
      if (resident.id === (s.selectedHero ?? 1)) hero = actor;
    }
    if (hero)
      s.pets.forEach((p, j) =>
        walkers.push({
          id: `pet${j}`,
          sprite: [p, "town_dog"],
          walk: [p, "town_dog"],
          h: 14,
          legs: hero!.legs,
          from: partyEnd,
          to: Infinity,
          lag: 0.9 + j * 0.6,
          follow: hero!,
          pet: true,
        }),
      );
    addStress();
  }
  /** Cut 109: the walking townsfolk (`folk` draws them by stage): the child's loop and the carter's round, seeded by the day */
  let townsfolk: (Walker & { minStage: number })[] = [];
  function buildFolk(): void {
    townsfolk = [];
    const loop = (
      id: string,
      sprite: string,
      h: number,
      stops: string[],
      speed: number,
      pauseLo: number,
      pauseHi: number,
      minStage: number,
      carry?: string,
    ): void => {
      let i = 0,
        n = 0;
      const w: Walker & { minStage: number } = {
        id,
        sprite: [sprite],
        walk: [sprite],
        h,
        legs: [],
        from: 0,
        to: Infinity,
        lag: rng(400 + id.length) * 3,
        minStage,
        carry,
        carryH: 16,
        extend: (ww) => {
          let tt = ww.legs.length ? ww.legs[ww.legs.length - 1]!.t1 : rng(500 + id.length) * 4;
          for (let j = 0; j < 6; j++) {
            const a = stops[i % stops.length]!,
              b = stops[(i + 1) % stops.length]!;
            i++;
            const pause = pauseLo + rng(600 + n++ + id.length * 50) * (pauseHi - pauseLo);
            const at = NODES[a]!;
            ww.legs.push({ t0: tt, t1: tt + pause, a: at, b: at });
            tt += pause;
            tt = legsAlong(route(a, b), tt, speed, ww.legs);
          }
        },
      };
      w.extend!(w);
      townsfolk.push(w);
    };
    loop(
      "child",
      "town_child",
      17,
      ["fireS", "fireW", "fireN", "fireE"],
      SPEED * 1.15,
      0.6,
      2.5,
      2,
    );
    loop(
      "carter",
      "town_carter",
      23,
      ["exit", "south", "kennel", "south"],
      SPEED * 0.6,
      2,
      6,
      BUILDINGS.length,
      "town_cart",
    );
  }
  function addStress(): void {
    walkers = walkers.filter((w) => !w.id.startsWith("stress"));
    const names = Object.keys(NODES).filter((x) => x !== "in" && x !== "exit"),
      classes = ["fighter", "rogue", "ranger", "caster"];
    for (let j = 0; j < stressN; j++) {
      const cls = classes[j % 4]!;
      let at = names[j % names.length]!;
      let m = 0;
      const w: Walker = {
        id: `stress${j}`,
        sprite: [`hero_${cls}`],
        walk: [`walk_${cls}`, `hero_${cls}`],
        h: 24,
        legs: [],
        from: t,
        to: Infinity,
        lag: 0,
        extend: (ww) => {
          let tt = ww.legs.length ? ww.legs[ww.legs.length - 1]!.t1 : t;
          for (let q = 0; q < 6; q++) {
            const nx = names[hashN(j, m++, 77) % names.length]!;
            if (nx === at) continue;
            ww.legs.push({ t0: tt, t1: tt + 0.6, a: NODES[at]!, b: NODES[at]! });
            tt = legsAlong(route(at, nx), tt + 0.6, SPEED, ww.legs);
            at = nx;
          }
        },
      };
      w.extend!(w);
      walkers.push(w);
    }
  }

  // -- Cut272: the silhouette glow (hover/focus, ready, the task tap's two pulses) --
  const hovered = new Set<string>(),
    focused = new Set<string>();
  let readyIds = new Set<string>();
  const pulses = new Map<string, number>(); // id → performance.now() at the tap
  const PULSE_MS = 2400;
  const glowPool: Glow[] = [];
  function glows(): void {
    F.glows.length = 0;
    const lvl = effectsLevel(),
      still = motionPreference.matches,
      now = performance.now();
    const ids = new Set([...readyIds, ...hovered, ...focused, ...pulses.keys()]);
    for (const id of ids) {
      const p0 = pulses.get(id);
      if (p0 !== undefined && now - p0 >= PULSE_MS) pulses.delete(id);
      const i = glowAt.get(id);
      if (i === undefined) continue;
      let outline = 0,
        glow = 0,
        sweep = 0,
        breathe = 0,
        hover = 0;
      if (hovered.has(id) || focused.has(id)) {
        outline = 1;
        glow = lvl === "off" ? 0 : 0.55;
        hover = 1;
      } else if (readyIds.has(id) && lvl !== "off") {
        outline = 0.85;
        if (lvl === "full") {
          glow = 0.45;
          if (!still) sweep = breathe = 1;
        }
      }
      if (pulses.has(id)) {
        // two pulses (1.2 s each, as the DOM ring did); reduced motion holds it steady for the same time
        const e = (now - p0!) / 1200;
        const env = still ? 1 : 0.5 - 0.5 * Math.cos(e * Math.PI * 2);
        outline = Math.max(outline, 0.4 + 0.6 * env);
        glow = Math.max(glow, lvl === "off" ? 0 : 0.25 + 0.65 * env);
        hover = 1;
      }
      if (!outline) continue;
      const q = F.quads[i]!;
      const g = (glowPool[F.glows.length] ??= {} as Glow);
      Object.assign(g, {
        id,
        x: q.x,
        y: q.y,
        w: q.w,
        h: q.h,
        u0: q.s.u0,
        v0: q.s.v0,
        u1: q.s.u1,
        v1: q.s.v1,
        flip: q.flip,
        outline,
        glow,
        sweep,
        breathe,
        hover,
        phase: (hashN(id.length, id.charCodeAt(0), id.charCodeAt(id.length - 1)) % 100) / 100,
      });
      F.glows.push(g);
    }
  }

  // -- the frame --
  const push = (
    s: Slot,
    x: number,
    y: number,
    z: number,
    flip = false,
    dim = 1,
    fade = 0,
    w = s.w,
    h = s.h,
  ): void => {
    let q = F.quads[F.n];
    if (!q) {
      q = { s, x, y, z, w, h, flip, dim, fade };
      F.quads[F.n] = q;
    } else {
      q.s = s;
      q.x = x;
      q.y = y;
      q.z = z;
      q.w = w;
      q.h = h;
      q.flip = flip;
      q.dim = dim;
      q.fade = fade;
      q.relief = 0;
      q.asset = undefined;
      q.actorId = undefined;
    }
    F.n++;
  };
  // Cut272: the quad each hit target's sprite took this frame (by its rectOf id), for the silhouette glow
  const glowAt = new Map<string, number>();
  const tagGlow = (id: string, before: number): void => {
    if (F.n > before) glowAt.set(id, F.n - 1);
  };
  const zOf = (footY: number): number => 1 + footY / 2000;
  const inView = (x: number, y: number, w: number, h: number): boolean =>
    x + w / 2 >= F.x0 - 4 &&
    x - w / 2 <= F.x0 + F.w + 4 &&
    y >= F.y0 - 4 &&
    y - h <= F.y0 + F.h + 4;
  function grounding(x: number, y: number, width: number, height: number, fade = 0): void {
    const broad = height >= 36,
      w = Math.max(6, Math.round(width * (broad ? 0.78 : 0.6)));
    const depth = broad ? Math.min(10, Math.max(5, Math.round(width * 0.13))) : 4;
    const contact = atlas.shadow(w, depth);
    push(
      contact,
      Math.round(x),
      Math.round(y + depth / 2 - 1),
      0.22,
      false,
      1,
      Math.max(fade, F.night * 0.12),
    );
    // A short cast mark is visible in daylight; overhead moonlight leaves the
    // contact alone. Ground-plane z keeps it behind every tree, prop and person.
    if (F.night < 0.85) {
      const cast = atlas.shadow(Math.round(w * 1.15), depth + (broad ? 4 : 2));
      push(
        cast,
        Math.round(x + height * 0.08),
        Math.round(y + cast.h - 1),
        0.21,
        false,
        1,
        Math.max(fade, 0.55 + F.night * 0.45),
      );
    }
  }
  function sprite(
    ids: string | string[],
    h: number,
    x: number,
    y: number,
    o: {
      flip?: boolean;
      dim?: number;
      fade?: number;
      z?: number;
      ground?: boolean;
      groundY?: number;
    } = {},
  ): void {
    const s = atlas.get(ids, h);
    if (!inView(x, y, s.w, s.h)) return;
    const id = Array.isArray(ids) ? ids[0]! : ids;
    if (
      o.ground ??
      /^(hero_|walk_|town_(house_|blacksmith_|bank_|kennel_|worker_|smith$|merchant$|carter$|child$|crate$|board$|campfire_|haul_chest|stall$|barrel$|brazier$|bench$|well$))/.test(
        id,
      )
    ) {
      grounding(x, o.groundY ?? y, s.w, s.h, o.fade ?? 0);
    }
    push(s, Math.round(x), Math.round(y), o.z ?? zOf(y), !!o.flip, o.dim ?? 1, o.fade ?? 0);
    // Only exact, decoded painted poses are mapped. Fallbacks and other looks
    // retain their art, including look-specific heroes that lack a walk pose.
    const resolved = (Array.isArray(ids) ? ids : [ids]).find(
      (key) =>
        atlas.has(volumeFrame ? key.replace(/^town_seated:/, "") : key) || isHomeServiceArt(key),
    );
    if (import.meta.env.DEV) F.quads[F.n - 1]!.asset = resolved ?? id;
    const mapped = volumeKind(resolved);
    F.quads[F.n - 1]!.relief =
      (volumeFrame && (!volumeService(mapped) || townBaseDepth()) ? mapped : 0) ||
      (resolved === "town_blacksmith_1"
        ? 1
        : resolved === "hero_fighter" ||
            resolved === "hero_fighter_male" ||
            resolved === "walk_fighter"
          ? 2
          : 0);
  }
  /** Terrain is independent of the sprite atlas and camera. One bitmap per construction state. */
  function ground(): void {
    const s = state!,
      key = `${townBaseDepth()}|${s.home}|${s.stage}|${homeSpots.length}|${(s.services ?? []).join(",")}|${s.buildings
        .map((b) => b.id)
        .sort()
        .join(",")}|${terrainMaterialVersion()}`;
    if (key === F.groundKey) return;
    F.groundKey = key;
    const standing = new Set([...s.buildings.map((b) => DOOR[b.id]), ...(s.services ?? [])]);
    const started = performance.now();
    F.terrain = paintTownTerrain({
      width: MAP_W * TILE,
      height: MAP_H * TILE,
      depth: townBaseDepth(),
      trails: [
        ...EDGES.filter(([, b]) => !SPURS.has(b) || standing.has(b)).map(([a, b, r]) => ({
          a: NODES[a]!,
          b: NODES[b]!,
          r: r * TILE,
        })),
        ...(s.services ?? [])
          .filter((id) => id === "pool" || id === "device")
          .flatMap((id) => {
            const points = homeSpots.map((spot) => spot[id as "pool" | "device"]);
            return points.length
              ? [
                  { a: NODES[id]!, b: points[0]!, r: 4 },
                  ...points.slice(1).map((p, i) => ({ a: points[i]!, b: p, r: 4 })),
                ]
              : [];
          }),
      ],
      fire: PLOTS.fire,
      plaza: s.stage >= BUILDINGS.length,
      aprons: [
        ...(s.home ? [PLOTS.house] : []),
        ...s.buildings.map((b) => PLOTS[b.id]),
        ...(s.services ?? []).map((id) => PLOTS[id]),
      ],
      hillFoot,
      shadows: trees,
    });
    terrainPaintMs = performance.now() - started;
    terrainPaints++;
  }
  function grassWind(): void {
    windTufts = 0;
    windSignature = 0;
    const level = effectsLevel();
    if (!F.terrain || level === "off" || motionPreference.matches) return;
    const roots = townGrassRoots(F.terrain),
      stride = level === "low" ? 3 : 1;
    for (let i = 0; i < roots.length; i += stride) {
      const p = roots[i]!;
      if (!inView(p.x, p.y, 8, p.h)) continue;
      // A shared travelling gust plus a quieter local flutter. Bases never move.
      const gust = Math.sin(t * 0.85 - p.x * 0.025 - p.y * 0.013);
      const pose = Math.max(
        0,
        Math.min(4, 2 + Math.round((gust * 0.8 + Math.sin(t * 1.4 + p.phase) * 0.2) * 2)),
      );
      const slot = atlas.get(`town_wind_grass_${pose}`, p.h);
      push(slot, p.x, p.y, 0.1, false, 0.9, 0.28);
      windTufts++;
      windSignature = (Math.imul(windSignature, 31) + pose + i) >>> 0;
    }
  }
  /** the hill's foot: a ragged line (runs of two columns, one in three, a tile further down, never by the mouth), not a ruled edge */
  const hillFoot = (x: number): number =>
    5 + OY + (Math.abs(x - CX) > 4 && hashN(x >> 1, 0, 7) % 3 === 0 ? 1 : 0);
  const hillDim = (y: number): number => 0.3 + 0.7 * Math.pow(Math.min(1, (y + 1) / (5 + OY)), 1.6);
  const DOOR: Record<string, string> = {
    blacksmith: "smith",
    bank: "bank",
    kennel: "kennel",
  };
  const SPURS = new Set([...Object.values(DOOR), "guild", "pool", "device"]);
  /** the forest: trees on a jittered grid, cleared from the paths, the plots and the cliff */
  let trees: (Pt & { k: boolean; h: number; d?: number })[] = [];
  function forest(): void {
    trees = [];
    const keep = (p: Pt): boolean => {
      if (p.y < (5.6 + OY) * TILE || (p.x > (CX - 19.8) * TILE && p.x < (CX - 16.2) * TILE))
        return false;
      if (
        EDGES.some(
          ([a, b, r]) =>
            (!(["guild", "pool", "device"] as string[]).includes(b) ||
              state?.services?.includes(b as ServiceId)) &&
            segDist(p, NODES[a]!, NODES[b]!) <= (r + 0.9) * TILE,
        )
      )
        return false;
      if (dist(p, PLOTS.fire) < 3 * TILE) return false;
      if (
        PROPS.some(
          (q) =>
            Math.abs(p.x - q.x) < 2.2 * TILE && p.y > q.y - q.h * 0.6 && p.y < q.y + 1.4 * TILE,
        )
      )
        return false;
      for (const id of ["pool", "device"] as const) {
        if (!state?.services?.includes(id)) continue;
        const points = homeSpots.map((spot) => spot[id]);
        if (
          points.some(
            (spot) => Math.abs(p.x - spot.x) < 40 && p.y > spot.y - 32 && p.y < spot.y + 64,
          )
        )
          return false;
        if (points.some((spot, i) => segDist(p, i ? points[i - 1]! : NODES[id]!, spot) < 22))
          return false;
      }
      if (Object.values(FOLK_AT).some((q) => dist(p, q) < 1.6 * TILE)) return false;
      // Cut 277: the Drill tent's yard (its plot from day 0, the tent and dummy once built)
      if (
        Math.abs(p.x - (DRILL_AT.x - 6)) < 2.1 * TILE &&
        p.y > DRILL_AT.y - DRILL_AT.h * 0.7 &&
        p.y < DRILL_AT.y + 2.9 * TILE
      )
        return false;
      for (const [id, pl] of Object.entries(PLOTS)) {
        if ((id === "guild" || id === "pool" || id === "device") && !state?.services?.includes(id))
          continue;
        const hw =
          id === "mouth" ? 4.2 * TILE : id === "fire" || id === "crate" ? 1.4 * TILE : 3.3 * TILE;
        if (Math.abs(p.x - pl.x) < hw && p.y > pl.y - pl.h * 0.55 && p.y < pl.y + 1.6 * TILE)
          return false;
      }
      return true;
    };
    for (let gy = 5.8 + OY; gy < MAP_H; gy += 1.35)
      for (let gx = 0.5; gx < MAP_W; gx += 1.25) {
        const j = hashN(Math.round(gx * 10), Math.round(gy * 10), 9);
        const p = {
          x: (gx + ((j % 100) / 100 - 0.5) * 0.9) * TILE,
          y: (gy + (((j >> 8) % 100) / 100 - 0.5) * 0.8) * TILE,
        };
        if ((j >> 16) % 100 < 18) continue;
        if (keep(p))
          trees.push({
            ...p,
            k: (j >> 4) % 3 === 0,
            h: 24 + (j % 4) * 4,
            d: 0.88 + ((j >> 8) % 4) * 0.04,
          });
      }
    // a thin wood up the hillside (dimmed with the slope), clear of the mouth: the band reads as a hill, not a wall
    for (let gy = 2.2; gy < 5.4 + OY; gy += 1.5)
      for (let gx = 0.5; gx < MAP_W; gx += 1.6) {
        const j = hashN(Math.round(gx * 10), Math.round(gy * 10), 13);
        const p = {
          x: (gx + ((j % 100) / 100 - 0.5) * 1.2) * TILE,
          y: (gy + (((j >> 8) % 100) / 100 - 0.5) * 0.9) * TILE,
        };
        if ((j >> 16) % 100 < 55 || Math.abs(p.x - PLOTS.mouth.x) < 4.6 * TILE) continue;
        trees.push({
          ...p,
          k: (j >> 4) % 2 === 0,
          h: 24 + (j % 4) * 4,
          d: hillDim(p.y / TILE - 0.5) * 0.85,
        });
      }
    trees.sort((a, b) => a.y - b.y);
  }
  forest();

  let flickNow = 1;
  // Cut264: what the vat drew this frame (its sprite, its mist light's strength) and when its clone was first drawn ready
  let deviceArt = "",
    vatLight = 0,
    emerged = 0,
    cloneReadyAt: number | undefined;
  /** the warm emitters painted into a sprite (art/town_lights.json: [dx, dy, strength] from its foot), at `base` strength by day */
  function emitters(
    id: string,
    p: Pt,
    night: number,
    r: number,
    base: number,
    gain = 1.5,
    scale = 1,
  ): void {
    const L = LIGHTS as Record<string, number[][]>;
    const list = L[id] ?? L[id.replace(/_\d$/, "_1")] ?? [];
    for (const [dx, dy, k] of list) {
      const a = (base + night * gain) * (k ?? 1) * flickNow;
      if (a < 0.04 || F.lights.length >= MAX_LIGHTS) continue;
      F.lights.push({
        x: p.x + dx! * scale,
        y: p.y + dy! * scale,
        r: r * (0.7 + 0.3 * (k ?? 1)) + night * 12,
        c: [1.0 * a, 0.64 * a, 0.3 * a],
      });
    }
  }
  const characterLights: Light[] = [];
  function lantern(x: number, y: number, flip: boolean, night: number, fade = 0): void {
    const strength = Math.max(0, Math.min(1, (night - 0.15) / 0.65)) * (1 - fade);
    if (strength <= 0 || !inView(x, y, 24, 30)) return;
    const lx = x + (flip ? -6 : 6),
      ly = y - 8;
    sprite("town_lantern", 5, lx, ly + 2, { z: zOf(y) + 0.0004, fade: 1 - strength });
    const a = strength * 0.85;
    characterLights.push({ x: lx, y: ly, r: 23, c: [a, a * 0.64, a * 0.3] });
  }
  /** Cut 228: stop a walker where it stands now (its later legs dropped) */
  function cutAt(w: Walker): Pt {
    const at = walkerAt(w, t);
    const p = at ? { x: at.x, y: at.y } : (w.legs[0]?.a ?? NODES.tent!);
    w.legs = w.legs.filter((l) => l.t1 <= t);
    w.legs.push({ t0: t, t1: t, a: p, b: p });
    w.faceLeft = undefined;
    return p;
  }
  /** Cut 228: from `p` at `t0` back to the bench (seated again) or to the forge's path node (the wander resumes there) */
  function sendBack(w: Walker, p: Pt, t0: number): void {
    const fit = w.fit!;
    if (fit.bench) {
      const tt = legsAlong(
        [p, ...route(nearestNode(p), "pool"), fit.bench],
        t0,
        SPEED * 0.8,
        w.legs,
      );
      w.legs.push({ t0: tt, t1: Infinity, a: fit.bench, b: fit.bench });
      w.seat = { from: tt, ids: fit.sprite.map((id) => `town_seated:${id}`) };
      w.extend = undefined;
    } else {
      legsAlong([p, NODES.smith!], t0, SPEED * 0.8, w.legs);
      w.stop = Math.max(0, fit.smithStop);
      w.extend = fit.wander;
    }
  }
  /** Cut 228: the hero whose kit the Forge actually worked walks to the anvil and stands to be fitted while the work lasts;
   *  when it ends (or another hero's begins) he goes back. Presentation only: nothing is read back. */
  function refit(): void {
    const s = state;
    if (!s) return;
    const key = forging() ? `${forgeKey}@${forgeFrom}` : "";
    for (const w of walkers) {
      if (!w.fit || !w.id.startsWith("resident:")) continue;
      const mine = key !== "" && Number(w.id.slice(9)) === s.forge!.hero;
      if (mine && w.fitKey !== key) {
        const p = cutAt(w);
        w.sprite = w.fit.sprite;
        w.walk = w.fit.walk;
        w.seat = undefined;
        w.extend = undefined;
        const tt = legsAlong(
          [p, ...route(nearestNode(p), "smith"), FIT_AT],
          t,
          SPEED * 0.8,
          w.legs,
        );
        const end = Math.max(tt + 1.5, forgeUntil);
        w.legs.push({ t0: tt, t1: end, a: FIT_AT, b: FIT_AT });
        w.faceLeft = [tt, end];
        w.fitKey = key;
        w.fitEnd = end;
        sendBack(w, FIT_AT, end);
      } else if (!mine && w.fitKey && w.fitEnd !== undefined && t < w.fitEnd) {
        w.fitKey = undefined;
        w.fitEnd = undefined;
        sendBack(w, cutAt(w), t);
      }
    }
  }
  /** Cut 228: the smith at the anvil, striking only while Rust's forge work lasts (his painted hammer is raised on
   *  his shoulder; the stroke dips him and lays a hammer on the anvil); a still struck pose under reduced motion or
   *  effects Off; the hot work glows */
  function smithAtWork(p: Pt, night: number): void {
    const ph = stillForge()
      ? 0.5
      : ((((t - forgeFrom) % HAMMER_S) + HAMMER_S) % HAMMER_S) / HAMMER_S;
    const down = ph >= 0.42 && ph < 0.66;
    const y = p.y + (down ? 1 : -1);
    sprite("town_smith", 23, p.x + (down ? 1 : 0), y, { flip: false });
    lantern(p.x, y, false, night);
    if (down)
      sprite("town_hammer_down", 5, ANVIL_AT.x - 1, ANVIL_AT.y - 7, {
        z: zOf(ANVIL_AT.y) + 0.0004,
      });
    // the work on the anvil: a hot bar (ember) whose light swells on the stroke
    sprite("fx_dot_ff9a3a", 2, ANVIL_AT.x + 3, ANVIL_AT.y - 8, { z: zOf(ANVIL_AT.y) + 0.0003 });
    const glow = (down ? 0.6 : 0.4) * night;
    // (a light pass by day reads as a grey patch; the forge's own glow is a night light, as the sparks' are)
    if (night > 0.35 && F.lights.length < MAX_LIGHTS)
      F.lights.push({
        x: ANVIL_AT.x + 3,
        y: ANVIL_AT.y - 8,
        r: 14,
        c: [glow, glow * 0.6, glow * 0.25],
      });
  }
  /** Cut 109: the townsfolk — the smith at the forge's door from the first building, a child about the fire and the well from the
   *  second, the merchant at the stall from the third, the carter up and down the south road when all facilities stand; a step bob, no walk frames */
  function folk(s: TownState, night: number): void {
    if (!s.home) return;
    const bob = (ph: number, rate = 1.3): number => Math.floor(t * rate + ph) & 1;
    if (s.buildings.some((b) => b.id === "blacksmith")) {
      const p = FOLK_AT.smith;
      sprite("town_anvil", 8, ANVIL_AT.x, ANVIL_AT.y, { ground: true });
      if (forging()) smithAtWork(p, night);
      else {
        sprite("town_smith", 23, p.x, p.y - bob(0.3, 2.2), { flip: false });
        lantern(p.x, p.y - bob(0.3, 2.2), false, night);
      }
    }
    if (s.stage >= 3) {
      const p = FOLK_AT.merchant;
      sprite("town_merchant", 22, p.x, p.y - bob(0.7, 0.9), { flip: true });
      lantern(p.x, p.y - bob(0.7, 0.9), true, night);
    }
    for (const w of townsfolk) {
      if (w.minStage > s.stage) continue;
      const at = walkerAt(w, t);
      if (!at) continue;
      const step = at.moving && (Math.floor(t * 6 + w.lag) & 1) === 1;
      sprite(w.sprite, w.h, at.x, at.y - (step ? 1 : 0), { flip: at.dx < -0.01 });
      lantern(at.x, at.y - (step ? 1 : 0), at.dx < -0.01, night);
      if (w.carry)
        sprite(w.carry, w.carryH ?? 14, at.x + (at.dx < -0.01 ? 13 : -13), at.y, {
          flip: at.dx < -0.01,
          z: zOf(at.y) - 0.0002,
        });
    }
    // fireflies from dusk: a dozen motes drifting over the grass, each blinking on its own beat
    if (night > 0.35)
      for (let i = 0; i < 14; i++) {
        const hx = hashN(i, 31),
          hy = hashN(i, 57);
        const bx = PLOTS.fire.x + ((hx % 2000) / 1000 - 1) * 9 * TILE,
          by = PLOTS.fire.y + ((hy % 2000) / 1000 - 1) * 7 * TILE;
        const x = bx + Math.sin(t * 0.37 + i) * 10 + Math.sin(t * 1.1 + i * 2.3) * 3,
          y = by + Math.cos(t * 0.29 + i * 1.7) * 7;
        const blink = Math.max(0, Math.sin(t * (0.8 + (hx % 7) / 10) + i * 1.9));
        if (blink < 0.25) continue;
        sprite("fx_dot_e8f08a", 1, x, y, { z: 2.55, fade: 1 - blink });
        if (blink > 0.8 && F.lights.length < MAX_LIGHTS - 4)
          F.lights.push({ x, y, r: 7, c: [0.5 * night, 0.6 * night, 0.25 * night] });
      }
  }
  function completionGlint(p: Pt & { h: number }, at: number | undefined): void {
    if (at === undefined || t - at < BUILD_ASSEMBLY_S || t - at >= BUILD_FX_S) return;
    const g = (t - at - BUILD_ASSEMBLY_S) / (BUILD_FX_S - BUILD_ASSEMBLY_S);
    sprite("fx_glint", effectsLevel() === "low" ? 6 : 9, p.x + 18, p.y - p.h + 8 + g * 4, {
      z: 3,
      fade: Math.max(0, g * 1.2 - 0.2),
    });
  }
  function buildingSprite(id: BuildingId | "house", look: number): void {
    const p = PLOTS[id],
      at = builtAt.get(id);
    const age = at === undefined ? BUILD_FX_S : t - at;
    const art = (n: number): string[] => [`town_${id}_${n}`, `town_${id}_1`];
    if (at === undefined || age >= BUILD_ASSEMBLY_S) {
      const n0 = F.n;
      sprite(art(look), p.h, p.x, p.y);
      tagGlow(id === "house" ? "tent" : id, n0);
    } else {
      const oldLook = upgradeFrom.get(id);
      if (oldLook !== undefined) sprite(art(oldLook), p.h, p.x, p.y);
      else sprite("town_plot", 16, p.x, p.y);
      const reveal = Math.max(0, Math.min(1, (age - 0.6) / 0.6));
      sprite("town_scaffold", oldLook !== undefined ? 28 : p.h, p.x, p.y, {
        fade: reveal,
        ground: true,
      });
      if (reveal > 0) sprite(art(look), p.h, p.x, p.y, { fade: 1 - reveal });
    }
    completionGlint(p, at);
  }
  function frame(): void {
    volumeFrame = townVolumeLighting();
    const s = state!;
    if (!buildFxEnabled()) {
      builtAt.clear();
      upgradeFrom.clear();
      dusted.clear();
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i]!.kind === "dust") parts.splice(i, 1);
    } else
      for (const [id, at] of builtAt)
        if (t - at >= BUILD_FX_S) {
          builtAt.delete(id);
          upgradeFrom.delete(id);
          dusted.delete(id);
        }
    F.n = 0;
    glowAt.clear();
    F.lights.length = 0;
    characterLights.length = 0;
    const hour = hourOverride ?? localHour();
    F.night = nightOf(hour);
    F.amb = ambientOf(F.night);
    const night = F.night;
    ground();
    grassWind();
    // trees (two kinds), the cliff's rim of trees
    for (let i = 0; i < trees.length; i++) {
      const p = trees[i]!,
        sl = atlas.get(p.k ? "town_env_tree_1" : "town_env_tree_0", p.h);
      if (inView(p.x, p.y, sl.w, sl.h))
        push(sl, Math.round(p.x), Math.round(p.y), zOf(p.y), false, p.d ?? 1);
    }
    // the mouth, its torches, the depth plaque's light
    const m = PLOTS.mouth;
    let n0 = F.n;
    sprite(["town_mouth_cave"], m.h, m.x, m.y);
    tagGlow("mouth", n0);
    const fl = Math.floor(t * 6) & 1;
    void fl;
    emitters("town_mouth_cave", m, night, 30, 0.5, 0.7); // the torches a step under the windows and the fire (at 1.5 the mouth read ablaze)
    // the camp: the fire, the tent, the crate
    const f = PLOTS.fire;
    if (s.home)
      sprite([`town_campfire_${Math.floor(t * 5) & 1}`, "town_campfire_0"], f.h, f.x, f.y);
    const flick = 0.9 + 0.1 * Math.sin(t * 11) * Math.sin(t * 3.7);
    if (s.home)
      F.lights.push({
        x: f.x,
        y: f.y - 8,
        r: (46 + night * 44) * flick,
        c: [1.0, 0.6, 0.26].map((v) => v * (0.45 + night * 1.5) * flick) as [
          number,
          number,
          number,
        ],
      });
    flickNow = flick;
    if (s.home) {
      const p = PLOTS.house,
        look = houseLook(s);
      buildingSprite("house", look);
      emitters(`town_house_${look}`, p, night, 16, 0, 1.3, p.h / 64);
    }
    if (s.home && night > 0.3)
      F.lights.push({ x: PLOTS.tent.x, y: PLOTS.tent.y - 6, r: 14, c: [0.9, 0.55, 0.25] });
    n0 = F.n;
    if (s.home) sprite("town_crate", PLOTS.crate.h, PLOTS.crate.x, PLOTS.crate.y);
    tagGlow("crate", n0);
    // Cut 109: the dressing the stage has earned, the lamps lit at dusk
    for (const q of PROPS) {
      if (q.stage > s.stage || (!s.home && q.stage === 0)) continue;
      sprite(q.id, q.h, q.x, q.y, { flip: q.flip });
      if (q.lamp && night > 0.15 && F.lights.length < MAX_LIGHTS) {
        const a = (0.2 + night * 1.05) * flickNow;
        F.lights.push({
          x: q.x - 2,
          y: q.y - q.h * 0.78,
          r: 20 + night * 10,
          c: [1.0 * a, 0.66 * a, 0.32 * a],
        });
      }
      if (q.id === "town_stall") emitters("town_stall", q, night, 12, 0, 0.6, q.h / 40);
    }
    for (const id of s.services ?? []) {
      const p = SERVICE_PLOTS[id];
      const reincarnating =
        id === "device" &&
        s.residents?.some((r) => r.phase === "reincarnating" || r.phase === "recovering");
      const animate = !motionPreference.matches && effectsLevel() !== "off";
      const active = `town_service_device_active_${animate ? Math.floor(t * 2) & 1 : 0}`;
      // Cut264: the clone's growth stage by thirds while it grows, the opened vat while it stands ready; the older frames (and the
      // primitive under them) the fallback
      const clone = id === "device" ? s.clone : undefined;
      const ids: string[] =
        clone && clone.left > 0
          ? [`town_service_device_grow_${Math.min(2, Math.floor(clone.progress * 3))}`, active]
          : clone?.ready
            ? ["town_service_device_ready", "town_service_device"]
            : id === "device" && reincarnating
              ? [active]
              : id === "guild" && (s.places?.guild ?? 0) >= 2
                ? // Cut273: the Guildhouse's second level (the Guide's signpost) when its art is packed, else the hall
                  ["town_service_guild_2", "town_service_guild"]
                : [`town_service_${id}`];
      n0 = F.n;
      sprite(ids, p.h, p.x, p.y, { ground: true });
      // (the resolved art key is recorded in dev builds only; production reports the stage asked for)
      if (id === "device")
        deviceArt =
          F.n > n0 ? ((import.meta.env.DEV ? F.quads[n0]?.asset : undefined) ?? ids[0]!) : "";
      tagGlow(id, n0);
      // Cut 277: Guildhouse II reads at game size — the workers' rank badge (a gilt pip per level past the first), drawn
      // larger, capping the hall's gable finial; the art's signpost alone was lost at 402 px
      const gl = id === "guild" ? (s.places?.guild ?? 0) : 0;
      for (let r = 0; r < gl - 1; r++)
        sprite("fx_dot_d8b45a", GUILD_PIP, p.x - 7 - (gl - 2) * 3 + r * 6, p.y - p.h + 1, {
          z: zOf(p.y) + 0.0003,
        });
      if (id === "pool") {
        for (const spot of homeSpots)
          sprite("town_bench", 8, spot.pool.x, spot.pool.y + 2, { ground: true });
        if (animate) {
          const waves = effectsLevel() === "low" ? 1 : 2;
          for (let i = 0; i < waves; i++)
            sprite(
              "fx_dot_a4bcd6",
              1,
              p.x - 10 + i * 18 + Math.round(Math.sin(t * 0.7 + i) * 2),
              p.y - 10 + i * 3,
              { z: zOf(p.y) + 0.0001, fade: 0.5 },
            );
        }
      }
      if (id === "device")
        for (const spot of homeSpots)
          sprite("town_service_station", 6, spot.device.x, spot.device.y + 2, { ground: true });
      // Cut264 §5: the vat's own cool mist light at its glass cylinder (never the generic warm lamp)
      if (id === "device") {
        const growing = !!clone && clone.left > 0;
        if (clone?.ready) cloneReadyAt ??= t;
        else cloneReadyAt = undefined;
        const flash =
          animate && cloneReadyAt !== undefined ? Math.max(0, 1 - (t - cloneReadyAt) / 1.5) : 0;
        const pulse = growing && animate ? 1 + 0.15 * Math.sin(t * Math.PI * 4) : 1;
        const a = Math.max(
          growing ? (0.2 + night * 0.6) * pulse : night * 0.25,
          flash * (0.6 + night * 0.4),
        );
        vatLight = a;
        if (a >= 0.04 && F.lights.length < MAX_LIGHTS)
          F.lights.push({
            x: p.x,
            y: p.y - 21,
            r: 16 + 8 * a,
            c: [VAT_MIST[0] * a, VAT_MIST[1] * a, VAT_MIST[2] * a],
          });
      } else if (night > 0.15 && F.lights.length < MAX_LIGHTS) {
        const lx = id === "guild" ? p.x + 17 : p.x - 25;
        const ly = id === "guild" ? p.y - 20 : p.y - 6;
        if (id === "pool") sprite("town_lantern", 8, lx, ly, { ground: true });
        const a = night * 0.42;
        F.lights.push({ x: lx, y: ly, r: id === "pool" ? 12 : 17, c: [a, 0.64 * a, 0.3 * a] });
      }
    }
    folk(s, night);
    n0 = F.n;
    if (s.board)
      sprite(
        (s.places?.board ?? 0) >= 2 ? ["town_board_2", "town_board"] : "town_board",
        PLOTS.board.h,
        PLOTS.board.x,
        PLOTS.board.y,
      );
    tagGlow("board", n0);
    // Cut273: the Drill tent and its dummy, once the drillmaster's workplace is built
    if (s.home && (s.places?.drill_tent ?? 0) > 0) {
      sprite("town_drill_dummy", DUMMY_AT.h, DUMMY_AT.x, DUMMY_AT.y);
      sprite("town_tent", DRILL_AT.h, DRILL_AT.x, DRILL_AT.y);
    }
    // Cut273: the Haul chest stands by the mouth once built (the porter's errand draws it full until he takes the haul up)
    if (s.home && !s.chest && (s.places?.haul_chest ?? 0) > 0 && !(errand && t < errand.pick))
      sprite("town_haul_chest", CHEST_AT.h, CHEST_AT.x, CHEST_AT.y);
    // the buildings: scaffold → built (dust, a glint)
    for (const b of s.buildings) {
      const p = PLOTS[b.id];
      buildingSprite(b.id, b.look);
      // the painted emitters (art/town_lights.json: the forge's mouth, lit windows): the forge always, the windows at night
      emitters(
        `town_${b.id}_${b.look}`,
        p,
        night,
        b.id === "blacksmith" ? 26 : 18,
        b.id === "blacksmith" ? 0.35 : 0,
      );
    }
    if (s.staked) {
      const p = PLOTS[s.staked.id];
      // Ready plots use the larger painted foundation in the UI overlay.
      if (!s.staked.ready && s.staked.id !== "house") sprite("town_plot", 16, p.x, p.y);
    }
    // Cut 30.5: the haul chest by the mouth — full, it hops and glints; open, the lid up a moment after the tap
    if (s.chest) {
      const c = CHEST_AT,
        st = s.chest.state,
        full = st === "full";
      const hop = full ? -Math.round(Math.max(0, Math.sin(t * 4)) * 2) : 0;
      n0 = F.n;
      sprite(
        [`town_haul_chest${st === "closed" ? "" : `_${st}`}`, "town_haul_chest"],
        c.h,
        c.x,
        c.y + hop,
      );
      tagGlow("chest", n0);
      if (full) {
        const g = (t * 0.7) % 1;
        sprite("fx_glint", 7, c.x + 5, c.y - c.h + 1 + hop, {
          z: 3,
          fade: Math.min(1, Math.abs(g - 0.5) * 2.4),
        });
        if (F.lights.length < MAX_LIGHTS)
          F.lights.push({ x: c.x, y: c.y - 6, r: 14 + night * 8, c: [0.9, 0.72, 0.3] });
      }
    }
    // Cut 30.5: the workers at their posts — an idle beat (two frames, desynchronised); the lit node's worker greyed, still; a new hire
    // walks out of the tent to his post. Paused workers rest; reduced/Off keeps every worker still.
    // The active beat is ambient inspection, never a recent-action receipt.
    for (const w of s.workers) {
      const p = workerAt(w);
      if (!p) continue;
      let x = p.x,
        y = p.y,
        moving = false,
        flip = false;
      const still = w.lit || w.paused || motionPreference.matches || effectsLevel() === "off";
      if (still) arrive.delete(w.id);
      const legs = arrive.get(w.id);
      if (legs?.length) {
        const at = walkerAt({ legs, from: -Infinity, to: Infinity } as Walker, t);
        if (at && t < legs[legs.length - 1]!.t1) {
          x = at.x;
          y = at.y;
          moving = at.moving;
          flip = at.dx < -0.01;
        } else arrive.delete(w.id);
      }
      const k = hashN(w.id.length, w.id.charCodeAt(0), w.id.charCodeAt(w.id.length - 1));
      const beat = 0.9 + (k % 50) / 100,
        phase = (k % 97) / 31;
      const step = moving && (Math.floor(t * 6.5) & 1) === 1;
      const frameN = still || moving ? 0 : Math.floor((t + phase) / beat) & 1;
      n0 = F.n;
      if (w.lit && w.place) {
        // Cut273: nobody stands at an unbuilt workplace — its plot (a level: the building itself) is the target and shimmers
        const at = placeAt(w.place);
        if (w.plot && at) sprite("town_plot", 16, at.x, at.y);
        if (F.n > n0) tagGlow(`worker:${w.id}`, n0);
        else {
          const q = glowAt.get(
            w.place === "blacksmith" ||
              w.place === "bank" ||
              w.place === "kennel" ||
              w.place === "board" ||
              w.place === "guild"
              ? w.place
              : "",
          );
          if (q !== undefined) glowAt.set(`worker:${w.id}`, q);
        }
        continue;
      } else if (w.lit) {
        const g = atlas.grey(workerIds(w.id), 24);
        if (inView(x, y, g.w, g.h)) {
          grounding(x, y, g.w, g.h);
          push(g, Math.round(x), Math.round(y), zOf(y), flip, 1, 0);
        }
      } else
        sprite(workerIds(w.id, frameN), 24, x, y - (step ? 1 : 0), {
          flip,
          dim: w.paused ? 0.7 : 1,
        });
      tagGlow(`worker:${w.id}`, n0);
      if (w.id === "porter" && errand && !w.lit) {
        if (t < errand.pick)
          sprite(["town_haul_chest_full", "town_haul_chest"], CHEST_AT.h, CHEST_AT.x, CHEST_AT.y);
        else if (t < errand.drop) {
          const back = (flip ? -1 : 1) * 6;
          sprite("town_chest_glow", 8, x + back, y - 8 + 8 - (step ? 1 : 0), {
            z: zOf(y) + 0.0002,
            flip,
          });
          if (F.lights.length < MAX_LIGHTS)
            F.lights.push({ x: x + back, y: y - 8, r: 16, c: [1.0, 0.85, 0.4] });
        }
        if (t >= errand.drop) {
          const e = errand;
          if (t >= e.back) errand = null;
          if (e.drop > -1) {
            e.drop = -1; // (fired once: the UI floats the `+$N`)
            e.pick = -1;
            e.done(true);
          }
        }
      }
      // week 2: his rank, quiet — a gilt pip over his head per rank past the first (II ·, III ··)
      if (!w.lit && w.rank > 1)
        for (let r = 0; r < w.rank - 1; r++)
          sprite("fx_dot_d8b45a", 2, x - (w.rank - 2) * 1.5 + r * 3, y - 26 - (step ? 1 : 0), {
            z: zOf(y) + 0.0003,
          });
      if (!w.lit) lantern(x, y - (step ? 1 : 0), flip, night);
    }
    // the pen: penned pets lie by the kennel
    s.penned.forEach((k, j) => {
      const p = PLOTS.kennel;
      sprite([k, "town_dog"], 10, p.x - 20 + j * 12, p.y + 8, { flip: j % 2 === 1, ground: true });
    });
    // Presentation-only local avoidance: residents keep their route legs and
    // clocks, but their expanded touch targets must remain distinct at crossings.
    residentAnchors.clear();
    const cssScale = F.k / (window.devicePixelRatio || 1);
    const residents = walkers
      .filter((w) => w.id.startsWith("resident:"))
      .sort((a, b) => Number(a.id.slice(9)) - Number(b.id.slice(9)))
      .slice(0, 3)
      .flatMap((w) => {
        const at = walkerAt(w, t);
        if (!at || t > w.to) return [];
        const slot = atlas.get(w.sprite, w.h);
        const halfW = Math.max(44 / cssScale, slot.w) / 2 + 1 / cssScale;
        const halfH = Math.max(44 / cssScale, slot.h) / 2 + 1 / cssScale;
        return [
          {
            id: w.id,
            x: at.x + (w.homeOffset?.x ?? 0),
            y: at.y + (w.homeOffset?.y ?? 0) - slot.h / 2,
            halfW,
            halfH,
            spriteH: slot.h,
          },
        ];
      });
    const contain = (a: (typeof residents)[number]): void => {
      a.x = Math.max(F.x0 + a.halfW, Math.min(F.x0 + F.w - a.halfW, a.x));
      a.y = Math.max(F.y0 + a.halfH, Math.min(F.y0 + F.h - a.halfH, a.y));
    };
    for (const a of residents) contain(a);
    // Three actors need only three pairs. The bounded relaxation also handles
    // simultaneous coincidence without moving their simulation or consuming RNG.
    for (let pass = 0; pass < 16; pass++) {
      let changed = false;
      for (let i = 0; i < residents.length; i++)
        for (let j = i + 1; j < residents.length; j++) {
          const a = residents[i]!,
            b = residents[j]!;
          const dx = b.x - a.x,
            dy = b.y - a.y;
          const ox = a.halfW + b.halfW - Math.abs(dx);
          const oy = a.halfH + b.halfH - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          if (ox <= oy) {
            const push = ox / 2 + 0.01,
              direction = dx < 0 ? -1 : 1;
            a.x -= push * direction;
            b.x += push * direction;
          } else {
            const push = oy / 2 + 0.01,
              direction = dy < 0 ? -1 : 1;
            a.y -= push * direction;
            b.y += push * direction;
          }
          contain(a);
          contain(b);
          changed = true;
        }
      if (!changed) break;
    }
    for (const a of residents) residentAnchors.set(a.id, { x: a.x, y: a.y + a.spriteH / 2 });
    // walkers
    let live = 0;
    for (const w of walkers) {
      const at = w.follow ? walkerAt(w.follow, t - w.lag) : walkerAt(w, t);
      if (!at || (w.follow && t < w.from) || t > w.to) continue;
      const offset = (w.follow ?? w).homeOffset;
      const anchor = residentAnchors.get(w.id);
      let x = anchor?.x ?? at.x + (offset?.x ?? 0),
        y = anchor?.y ?? at.y + (offset?.y ?? 0);
      if (w.follow && at.moving) {
        x -= Math.sign(at.dx) * 4;
        y += 2;
      }
      const flip =
        at.dx < -0.01 || (!at.moving && !!w.faceLeft && t >= w.faceLeft[0] && t < w.faceLeft[1]);
      let fade = 0;
      if (w.emerge) {
        const age = t - w.from;
        if (age < 0.5) fade = 1 - age / 0.5;
      }
      if (w.vanish && w.to - t < 0.5) fade = Math.max(fade, 1 - (w.to - t) / 0.5);
      if (w === hero && walkingIn) {
        const g = (t - walkingIn.t0) / (walkingIn.t1 - walkingIn.t0);
        if (g > 0.75) fade = Math.min(1, (g - 0.75) * 4);
      }
      if (w.reincarnating)
        fade = Math.max(
          fade,
          motionPreference.matches || effectsLevel() === "off"
            ? 0.35
            : 0.3 + Math.sin(t * 2) * 0.12,
        );
      const step = at.moving && (Math.floor(t * 6.5 + w.lag * 3) & 1) === 1;
      const ids = w.seat && t >= w.seat.from ? w.seat.ids : step ? w.walk : w.sprite;
      const previousQuads = F.n;
      const mappedHero =
        w.sprite[0] === "hero_fighter" ||
        w.sprite[0] === "hero_fighter_male" ||
        (volumeFrame && volumeHero(volumeKind(w.sprite[0])));
      sprite(ids, w.h, x, y - (step ? 1 : 0), {
        flip,
        fade,
        ground: true,
        groundY: townDimensionalLighting() && mappedHero ? y : undefined,
      });
      if (F.n > previousQuads) {
        if (!mappedHero) F.quads[F.n - 1]!.relief = 0;
        if (import.meta.env.DEV) F.quads[F.n - 1]!.actorId = w.id;
      }
      if (!w.pet) lantern(x, y - (step ? 1 : 0), flip, night, fade);
      if (w.carry) {
        const back = (flip ? -1 : 1) * (w.carry === "town_chest_glow" ? 6 : 7);
        sprite(w.carry, w.carryH ?? 6, x + back, y - 8 + (w.carryH ?? 6) - (step ? 1 : 0), {
          z: zOf(y) + 0.0002,
          flip,
          fade,
        });
        if (w.carry === "town_chest_glow")
          F.lights.push({ x: x + back, y: y - 8, r: 18, c: [1.0, 0.85, 0.4] });
      }
      live++;
    }
    F.live = live;
    // particles: smoke over the fire and the forge's chimney, embers, forge sparks, the build's dust
    tickParts(night);
    for (const p of parts) {
      const life = p.age / p.life;
      sprite(`fx_dot_${p.c}`, p.s, p.x, p.y, {
        z: p.kind === "smoke" ? 2.5 : 2.6,
        fade: p.kind === "smoke" ? Math.max(0, life * 1.3 - 0.3) : Math.max(0, life * 1.6 - 0.6),
      });
      if (p.kind === "spark" && night > 0.5 && F.lights.length < MAX_LIGHTS)
        F.lights.push({ x: p.x, y: p.y, r: 6, c: [1, 0.6, 0.2] });
    }
    // Prioritize people over decorative motes within the existing shader budget.
    F.lights.unshift(...characterLights);
    F.lights.length = Math.min(F.lights.length, MAX_LIGHTS);
  }
  let emitT = 0,
    chimT = 0;
  function tickParts(night: number): void {
    void night;
    const dt = Math.min(0.1, t - emitT);
    emitT = t;
    const f = PLOTS.fire;
    const rand = Math.random;
    if (state!.home && rand() < dt * 5)
      parts.push({
        x: f.x + (rand() - 0.5) * 4,
        y: f.y - 10,
        vx: (rand() - 0.5) * 2,
        vy: -10 - rand() * 4,
        age: 0,
        life: 2.4 + rand(),
        kind: "smoke",
        c: SMOKE[Math.floor(rand() * 3)]!,
        s: rand() < 0.5 ? 2 : 3,
      });
    if (state!.home && rand() < dt * 4)
      parts.push({
        x: f.x + (rand() - 0.5) * 6,
        y: f.y - 6,
        vx: (rand() - 0.5) * 6,
        vy: -22 - rand() * 10,
        age: 0,
        life: 0.6 + rand() * 0.4,
        kind: "ember",
        c: EMBER[Math.floor(rand() * 3)]!,
        s: 1,
      });
    const smith = state!.buildings.find(
      (b) =>
        b.id === "blacksmith" && !(builtAt.has(b.id) && t - builtAt.get(b.id)! < BUILD_ASSEMBLY_S),
    );
    if (smith) {
      const p = PLOTS.blacksmith;
      // Cut 228: sparks fly only from a real stroke (Rust's forge work), never on a guessed beat; none under reduced
      // motion or effects Off, fewer at Low
      const n = forging() && !stillForge() ? Math.floor((t - forgeFrom) / HAMMER_S + 0.58) : -1;
      if (n !== strikeN && n >= 0) {
        strikeN = n;
        sparkBursts++;
        for (let i = 0; i < (effectsLevel() === "low" ? 3 : 6); i++)
          parts.push({
            x: ANVIL_AT.x,
            y: ANVIL_AT.y - 6,
            vx: (rand() - 0.5) * 40,
            vy: -20 - rand() * 25,
            age: 0,
            life: 0.4 + rand() * 0.3,
            kind: "spark",
            c: EMBER[Math.floor(rand() * 3)]!,
            s: 1,
          });
      }
      if (t - chimT > 0.45) {
        chimT = t;
        parts.push({
          x: p.x + 14 + (rand() - 0.5) * 2,
          y: p.y - p.h + 2,
          vx: 3 + rand() * 2,
          vy: -8 - rand() * 3,
          age: 0,
          life: 2.6 + rand(),
          kind: "smoke",
          c: SMOKE[Math.floor(rand() * 3)]!,
          s: 2,
        });
      }
    }
    for (const [id, at] of builtAt)
      if (buildFxEnabled() && t - at >= BUILD_ASSEMBLY_S && !dusted.has(id)) {
        dusted.add(id);
        const p = PLOTS[id as PlotId];
        for (let i = 0; i < (effectsLevel() === "low" ? 8 : 22); i++) {
          const a = rand() * Math.PI * 2,
            v = 14 + rand() * 22;
          parts.push({
            x: p.x + Math.cos(a) * 14,
            y: p.y - 4,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v * 0.4 - 6,
            age: 0,
            life: 0.5 + rand() * 0.3,
            kind: "dust",
            c: (id === "blacksmith" ? SMOKE : DUST)[Math.floor(rand() * 3)]!,
            s: 2,
          });
        }
      }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        parts.splice(i, 1);
        continue;
      }
      if (p.kind === "smoke") {
        p.vx += Math.sin(t * 1.3 + i) * dt * 2;
        p.s = p.age / p.life > 0.5 ? 3 : p.s;
      }
      if (p.kind === "spark") p.vy += 70 * dt;
      if (p.kind === "dust") {
        p.vx *= 1 - dt * 3;
        p.vy *= 1 - dt * 3;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }
  const dusted = new Set<string>();

  // -- the camera: the stage's box fits the view, k = whole device px per texel --
  function fit(): void {
    const s = state;
    if (!s) return;
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(r.width * dpr)),
      H = Math.max(1, Math.round(r.height * dpr));
    // the box: what stands (the mouth, the camp, the buildings, the staked plot) with a margin
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    const add = (p: Pt & { h: number }, hw: number): void => {
      x0 = Math.min(x0, p.x - hw);
      x1 = Math.max(x1, p.x + hw);
      y0 = Math.min(y0, p.y - p.h);
      y1 = Math.max(y1, p.y + 6);
    };
    add(PLOTS.mouth, 52);
    add(PLOTS.fire, 30);
    add(PLOTS.tent, 18);
    add(PLOTS.crate, 10);
    for (const b of s.buildings) add(PLOTS[b.id], 44);
    for (const id of s.services ?? [])
      add(PLOTS[id], id === "guild" ? 32 : id === "pool" ? 30 : 23);
    for (const id of ["pool", "device"] as const)
      if (s.services?.includes(id)) for (const spot of homeSpots) add({ ...spot[id], h: 44 }, 34);
    for (const w of s.workers) {
      const p = workerAt(w);
      if (p) add({ ...p, h: 24 }, 10);
    }
    if (s.staked) add({ ...PLOTS[s.staked.id], h: 22 }, 24);
    for (const q of PROPS)
      if (q.stage <= s.stage && q.stage > 0 && q.y < PLOTS.kennel.y + 4.5 * TILE) add(q, 12);
    const M = 10;
    x0 -= M;
    x1 += M;
    y0 -= M;
    y1 += M + 4;
    // k: whole device px per texel — the largest that fits the box, or one more when that crops ≤ a margin's worth on each side
    const kf = Math.min(W / (x1 - x0), H / (y1 - y0));
    const up = Math.ceil(kf),
      fitsUp = W / up >= x1 - x0 - 2 * M - 4 && H / up >= y1 - y0 - 2 * M - 8;
    // (a low-density screen — fewer than 2 device px a texel — scales by a fraction instead: the town at k = 1 was a postage stamp)
    const k =
      up > kf && fitsUp ? up : kf < 2 ? Math.max(1, Math.floor(kf * 8) / 8) : Math.floor(kf);
    const w = Math.ceil(W / k),
      h = Math.ceil(H / k);
    let cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2;
    cx = Math.max(w / 2, Math.min(MAP_W * TILE - w / 2, cx));
    cy = Math.max(h / 2, Math.min(MAP_H * TILE - h / 2, cy));
    const nx0 = Math.round(cx - w / 2),
      ny0 = Math.round(cy - h / 2);
    if (
      nx0 !== F.x0 ||
      ny0 !== F.y0 ||
      w !== F.w ||
      h !== F.h ||
      k !== F.k ||
      W !== F.W ||
      H !== F.H
    ) {
      F.x0 = nx0;
      F.y0 = ny0;
      F.w = w;
      F.h = h;
      F.k = k;
      F.W = W;
      F.H = H;
      sizeDirty = true;
      layoutDirty = true;
      for (const fn of actorLayout) fn();
    }
  }

  function loop(now: number): void {
    raf = 0;
    if (disposed) return;
    if (document.hidden) {
      last = now;
      return;
    } // hidden: no frames (visibilitychange resumes)
    if (!el.isConnected) {
      last = now;
      raf = requestAnimationFrame(loop);
      return;
    } // (not mounted yet)
    const idle = now - lastInput > IDLE_MS;
    // the frame cap: none while input arrives, IDLE_FPS after 10 s without; a software GL under automation (juice off: the headless
    // suites, seven browsers on the CPU) draws at SOFT_FPS — the scene is cosmetic and its frames were the suite's load
    const cap = document.documentElement.dataset.juice === "off" ? SOFT_FPS : idle ? IDLE_FPS : 0;
    if (cap && !sizeDirty && now - lastDraw < 1000 / cap - 2) {
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    lastDraw = now;
    t += dt;
    if (state) {
      const c0 = performance.now();
      fit();
      frame();
      glows();
      if (gl && !glLost) {
        gl.render(F, effectsLevel() === "off" ? false : lightingPreviewOverride);
        if (c2d) c2d.style.display = "none";
      } else {
        const c = view2d();
        c.style.display = "block";
        drawTown2D(c, F, atlas.canvas);
      }
      sizeDirty = false;
      cpu.push(performance.now() - c0);
      if (cpu.length > 120) cpu.shift();
      for (const fn of actorLayout) fn();
      cpuWithUiMs = performance.now() - c0;
      frames++;
      fpsWin.push(now);
      while (fpsWin.length && fpsWin[0]! < now - 1000) fpsWin.shift();
      if (walkingIn && t >= walkingIn.t1) {
        const d = walkingIn.done;
        walkingIn = null;
        d();
      }
      if (layoutDirty) {
        layoutDirty = false;
        for (const fn of layoutFns) fn();
      }
    }
    raf = requestAnimationFrame(loop);
  }
  const start = (): void => {
    if (!raf && !disposed) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  const onVis = (): void => {
    if (!document.hidden) start();
  };
  document.addEventListener("visibilitychange", onVis);
  const poke = (): void => {
    lastInput = performance.now();
  };
  const inputs = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
  for (const ev of inputs) window.addEventListener(ev, poke, { passive: true });
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          fit();
          layoutDirty = true;
        })
      : null;
  ro?.observe(el);

  const css = (x: number, y: number): Pt => {
    const dpr = window.devicePixelRatio || 1;
    return { x: ((x - F.x0) * F.k) / dpr, y: ((y - F.y0) * F.k) / dpr };
  };
  const actorRect = (id: number): { x: number; y: number; w: number; h: number } | null => {
    const actor = walkers.find((w) => w.id === `resident:${id}`);
    if (!actor) return null;
    const at = walkerAt(actor, t);
    if (!at) return null;
    const slot = atlas.get(actor.sprite, actor.h);
    const anchor = residentAnchors.get(actor.id);
    const x = anchor?.x ?? at.x + (actor.homeOffset?.x ?? 0),
      y = anchor?.y ?? at.y + (actor.homeOffset?.y ?? 0);
    const a = css(x - slot.w / 2, y - slot.h),
      b = css(x + slot.w / 2, y);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };
  return {
    el,
    setState(s) {
      const prev = state;
      state = s;
      homeSpots = homeResidentSpots(s);
      // Cut 228: Rust's forge work → a scene-time deadline (a new step or hero starts a new first stroke)
      const fk = s.forge ? `${s.forge.hero}:${s.forge.step}` : "";
      if (s.forge) {
        if (fk !== forgeKey || !(t < forgeUntil)) {
          forgeFrom = t;
          strikeN = -1;
        }
        forgeUntil = t + s.forge.left;
      } else forgeUntil = -Infinity;
      forgeKey = fk;
      if (prev)
        for (const id of builtAt.keys()) {
          const oldLook =
            id === "house" ? houseLook(prev) : prev.buildings.find((b) => b.id === id)?.look;
          const nextLook =
            id === "house"
              ? s.home
                ? houseLook(s)
                : undefined
              : s.buildings.find((b) => b.id === id)?.look;
          if (nextLook === undefined || (oldLook !== undefined && nextLook < oldLook)) {
            builtAt.delete(id);
            upgradeFrom.delete(id);
            dusted.delete(id);
          }
        }
      const changes = constructionChanges(prev, s);
      buildEvents += changes.length;
      if (changes.length && buildFxEnabled()) poke();
      if (buildFxEnabled())
        for (const change of changes) {
          builtAt.set(change.id, t);
          dusted.delete(change.id);
          if (change.fromLook !== undefined) upgradeFrom.set(change.id, change.fromLook);
          else upgradeFrom.delete(change.id);
        }
      // a worker hired since the last state (he stood greyed, or nowhere): out of the tent, along the paths, to his post
      if (prev)
        for (const w of s.workers) {
          if (w.lit || prev.workers.some((x) => x.id === w.id && !x.lit)) continue;
          const p = workerAt(w);
          if (!p) continue;
          const legs: Leg[] = [];
          legsAlong([NODES.tent!, ...route("tent", nearestNode(p)), p], t + 0.2, SPEED * 1.3, legs);
          arrive.set(w.id, legs);
        }
      if (
        !prev ||
        JSON.stringify([prev.services, prev.roster?.length]) !==
          JSON.stringify([s.services, s.roster?.length])
      )
        forest();
      const key = (x: TownState | null): string =>
        x
          ? JSON.stringify([
              x.home,
              x.hero,
              x.residents,
              x.roster,
              x.services,
              x.selectedHero,
              x.pets,
              x.parties.length,
              x.buildings.map((b) => b.id),
              x.seed,
            ])
          : "";
      if (!prev || key(prev) !== key(s)) build(prev?.home === false && s.home);
      // Cut264 §4: a clone finished under this view — its hero steps out of the vat (the `emerge` fade), then goes about the camp
      if (prev && s.services?.includes("device"))
        for (const r of s.residents ?? []) {
          const was = prev.residents?.find((x) => x.id === r.id)?.phase;
          if ((was !== "reincarnating" && was !== "recovering") || r.phase !== "ready") continue;
          const w = walkers.find((x) => x.id === `resident:${r.id}`);
          const at = homeSpots.find((x) => x.id === r.id)?.device;
          if (!w || !at || !w.extend) continue;
          if (motionPreference.matches || effectsLevel() === "off") {
            w.emerge = false;
            continue;
          }
          w.emerge = true;
          w.from = t;
          w.legs = [{ t0: t, t1: t + 1.2, a: at, b: at }];
          w.extend(w);
          emerged += 1;
        }
      if (
        prev?.home === false &&
        s.home &&
        hero &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const destination = NODES.tent!;
        hero.from = t + 0.5;
        hero.legs = [];
        legsAlong(
          [{ x: destination.x + 100, y: destination.y + 70 }, destination],
          t + 0.5,
          100,
          hero.legs,
        );
      }
      refit();
      fit();
      layoutDirty = true;
      start();
    },
    focusHero() {
      if (!hero) return;
      const at = walkerAt(hero, t);
      if (!at) return;
      const p = css(at.x, at.y);
      const ring = document.createElement("i");
      ring.className = "town-hero-focus";
      ring.setAttribute("aria-hidden", "true");
      ring.style.left = `${p.x}px`;
      ring.style.top = `${p.y}px`;
      el.appendChild(ring);
      window.setTimeout(() => ring.remove(), 1800);
      poke();
      start();
    },
    walkIn(ms = 700) {
      if (!hero || !state) return Promise.resolve();
      if (walkingIn)
        return new Promise((res) => {
          const d = walkingIn!.done;
          walkingIn!.done = () => {
            d();
            res();
          };
        });
      const at = walkerAt(hero, t) ?? { x: NODES.tent!.x, y: NODES.tent!.y };
      const pts = [{ x: at.x, y: at.y }, ...route(nearestNode(at), "in")];
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1]!, pts[i]!);
      const dur = ms / 1000;
      hero.from = Math.min(hero.from, t);
      hero.legs = [];
      hero.extend = undefined;
      hero.to = t + dur + 0.05;
      hero.vanish = false;
      legsAlong(pts, t, Math.max(SPEED, len / dur), hero.legs);
      poke();
      return new Promise((res) => {
        walkingIn = { t0: t, t1: t + dur, done: res };
        start();
      });
    },
    resize() {
      fit();
      layoutDirty = true;
    },
    rectOf(id) {
      if (!state) return null;
      if (id === "chest" || id.startsWith("worker:")) {
        // (the chest and the workers stand off the plots)
        const wk = id === "chest" ? null : state.workers.find((w) => `worker:${w.id}` === id);
        // (Cut273: the lit worker's unbuilt workplace — its plot is his target)
        const plot = wk?.lit && wk.plot && wk.place ? placeAt(wk.place) : null;
        const p =
          id === "chest" ? (state.chest ? CHEST_AT : null) : plot ? plot : wk ? workerAt(wk) : null;
        if (!p) return null;
        const s =
          id === "chest"
            ? atlas.get(["town_haul_chest"], CHEST_AT.h)
            : plot
              ? atlas.get("town_plot", 16)
              : atlas.get(workerIds(wk!.id), 24);
        const a = css(p.x - s.w / 2, p.y - s.h),
          b = css(p.x + s.w / 2, p.y);
        return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      }
      if ((id === "guild" || id === "pool" || id === "device") && !state.services?.includes(id))
        return null;
      const plot =
        id === "staked" ? (state.staked ? PLOTS[state.staked.id] : null) : PLOTS[id as PlotId];
      if (!plot) return null;
      const ids: Record<string, string[]> = {
        mouth: ["town_mouth_cave"],
        fire: ["town_campfire_0"],
        tent: ["town_tent"],
        crate: ["town_crate"],
        board: ["town_board"],
        guild: ["town_service_guild"],
        pool: ["town_service_pool"],
        device: ["town_service_device"],
      };
      let s: Slot;
      if (id === "tent" && state.home)
        s = atlas.get([`town_house_${houseLook(state)}`, "town_house_1"], PLOTS.house.h);
      else if (id === "staked") s = atlas.get("town_plot", 16);
      else if ((BUILDINGS as readonly string[]).includes(id)) {
        const b = state.buildings.find((x) => x.id === id);
        if (!b) return null;
        s = atlas.get([`town_${id}_${b.look}`, `town_${id}_1`], plot.h);
      } else s = atlas.get(ids[id] ?? [id], plot.h);
      const a = css(plot.x - s.w / 2, plot.y - s.h),
        b = css(plot.x + s.w / 2, plot.y);
      return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
    },
    onLayout(fn) {
      layoutFns.push(fn);
    },
    onActors(fn) {
      actorLayout.push(fn);
    },
    actorRect,
    actorTargets() {
      return (state?.residents ?? []).flatMap((resident) => {
        const r = actorRect(resident.id);
        if (!r) return [];
        const w = Math.max(44, r.w),
          h = Math.max(44, r.h);
        return [
          {
            id: resident.id,
            x: Math.round(r.x + r.w / 2 - w / 2),
            y: Math.round(r.y + r.h / 2 - h / 2),
            w: Math.round(w),
            h: Math.round(h),
          },
        ];
      });
    },
    stats() {
      const s = state;
      const sorted = [...cpu].sort((a, b) => a - b);
      return {
        fps: fpsWin.length,
        frames,
        cpuMs: cpu[cpu.length - 1] ?? 0,
        cpuWithUiMs,
        cpuP50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
        cpuP95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        walkers: F.live,
        mode: gl && !glLost ? "gl" : "2d",
        glLost,
        k: F.k,
        night: F.night,
        vat: s?.services?.includes("device")
          ? {
              art: deviceArt,
              clone: s.clone ? (s.clone.left > 0 ? "growing" : "ready") : null,
              light: Math.round(vatLight * 1000) / 1000,
              emerged,
              color: "#a4bcd6",
            }
          : undefined,
        characterLights: characterLights.length,
        dimensionalLight:
          gl &&
          !glLost &&
          effectsLevel() !== "off" &&
          (lightingPreviewOverride ?? townDimensionalLighting()),
        baseDepth: townBaseDepth(),
        volumeLight: Boolean(gl && !glLost && townVolumeLighting()),
        mappedSprites: F.quads
          .slice(0, F.n)
          .filter((q) => q.relief)
          .map((q) => ({
            kind: q.relief,
            asset: q.asset,
            actorId: q.actorId,
            flip: q.flip,
            x: q.x,
            y: q.y,
          })),
        lights: F.lights.length,
        idle: performance.now() - lastInput > IDLE_MS,
        running: !!raf,
        terrainPaints,
        terrainPaintMs,
        windTufts,
        windSignature,
        buildings: s?.buildings.map((b) => b.id) ?? [],
        services: s?.services ?? [],
        residentStates:
          s?.residents?.map((r) => ({ id: r.id, resting: !!r.resting, phase: r.phase })) ?? [],
        activeBuilds: [...builtAt.keys()],
        buildEvents,
        buildDust: parts.filter((p) => p.kind === "dust").length,
        staked: s?.staked?.id,
        markers: s?.markers.map((m) => `${m.kind}@${m.at}`) ?? [],
        view: [F.x0, F.y0, F.w, F.h],
        chest: s?.chest?.state,
        forge: forging()
          ? {
              step: s!.forge!.step,
              hero: s!.forge!.hero,
              left: Math.max(0, forgeUntil - t),
              still: stillForge(),
              sparks: parts.filter((p) => p.kind === "spark").length,
              bursts: sparkBursts,
              fitting: walkers
                .filter((w) => w.fitEnd !== undefined && t < w.fitEnd)
                .map((w) => Number(w.id.slice(9))),
            }
          : null,
        workers: s?.workers.map((w) => `${w.id}${w.lit ? "(lit)" : w.paused ? "(off)" : ""}`) ?? [],
        hauls,
        hauling: errand
          ? t < errand.pick
            ? "fetch"
            : errand.drop > -1
              ? "carry"
              : "return"
          : null,
        glows: F.glows.map(
          (g) =>
            `${hovered.has(g.id) || focused.has(g.id) ? "hover" : pulses.has(g.id) ? "pulse" : "ready"}:${g.id}${g.sweep ? "~" : ""}${g.glow ? "" : "-"}`,
        ),
        ranks: Object.fromEntries(
          (s?.workers ?? []).filter((w) => !w.lit && w.rank > 1).map((w) => [w.id, w.rank]),
        ),
      };
    },
    stress(n) {
      stressN = n;
      if (state) addStress();
    },
    setHour(h) {
      hourOverride = h;
    },
    poke,
    highlight(id, mode, on) {
      const set = mode === "hover" ? hovered : focused;
      if (on) set.add(id);
      else set.delete(id);
      poke();
    },
    setReady(ids) {
      readyIds = new Set(ids);
    },
    haul(to) {
      const w = state?.workers.find((x) => x.id === "porter" && !x.lit && !x.paused);
      const post = w && workerAt(w);
      if (
        !state?.home ||
        !post ||
        motionPreference.matches ||
        effectsLevel() === "off" ||
        document.documentElement.dataset.juice === "off" ||
        document.hidden
      )
        return Promise.resolve(false);
      errand?.done(false);
      const sp = SPEED * 1.5,
        legs: Leg[] = [];
      const chest = { x: CHEST_AT.x - 7, y: CHEST_AT.y + 1 };
      let tt = legsAlong([post, chest], t + 0.15, sp, legs);
      const pick = tt + 0.35;
      legs.push({ t0: tt, t1: pick, a: chest, b: chest });
      const dest =
        to === "bank" && PLOTS.bank && state.buildings.some((b) => b.id === "bank")
          ? "bank"
          : "tent";
      tt = legsAlong([chest, ...route("mouth", dest)], pick, sp, legs);
      const drop = tt + 0.3;
      const at = NODES[dest]!;
      legs.push({ t0: tt, t1: drop, a: at, b: at });
      const back = legsAlong([...route(dest, nearestNode(post)), post], drop, sp, legs);
      arrive.set("porter", legs);
      hauls++;
      poke();
      start();
      return new Promise((res) => {
        errand = { at: t, pick, drop, back, done: res };
      });
    },
    hauling() {
      return errand ? (t < errand.pick ? "fetch" : errand.drop > -1 ? "carry" : "return") : null;
    },
    haulAt(to) {
      const p = NODES[to === "bank" ? "bank" : "tent"]!;
      return css(p.x, p.y - 30);
    },
    pulse(id) {
      if (!this.glowsSprite(id)) return false;
      pulses.set(id, performance.now());
      poke();
      return true;
    },
    glowsSprite(id) {
      if (!gl || glLost || !state || id === "staked") return false;
      return this.rectOf(id as Parameters<TownView["rectOf"]>[0]) !== null;
    },
    dispose() {
      disposed = true;
      errand?.done(false);
      errand = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener("visibilitychange", onVis);
      for (const ev of inputs) window.removeEventListener(ev, poke);
      ro?.disconnect();
      glCanvas.removeEventListener("webglcontextlost", onLost);
      glCanvas.removeEventListener("webglcontextrestored", onRestored);
      glCanvas.remove();
      c2d?.remove();
      // the context is kept for the next mount (never left for the browser to reap: a dozen camps held a dozen contexts, and Chrome's
      // cap then forced the oldest live one — the watch's — lost); a lost one is let go
      if (gl && !glLost) {
        sharedGl?.gl.dispose();
        sharedGl = { canvas: glCanvas, gl, lost: false };
      } else gl?.dispose();
    },
  };
}
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l2 = dx * dx + dy * dy;
  const u = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

// ---- the GL view: one target of town texels, the light pass upscaling it ---------------------------------------------------------

const MAX_LIGHTS = 32;
/** Cut264 §5: the clone vat's cool mist (#a4bcd6) */
const VAT_MIST: [number, number, number] = [0xa4 / 255, 0xbc / 255, 0xd6 / 255];
function townBaseDepth(): boolean {
  return !import.meta.env.DEV || new URLSearchParams(location.search).get("townDepth") !== "off";
}
// Mapped town lighting is the normal GL presentation. Explicit comparison
// modes keep art review reproducible; preferences and Canvas remain authoritative.
function townDimensionalLighting(): boolean {
  return (
    new URLSearchParams(location.search).get("townLight") !== "flat" && effectsLevel() !== "off"
  );
}
function townVolumeLighting(): boolean {
  const mode = new URLSearchParams(location.search).get("townLight");
  return mode !== "flat" && mode !== "planes" && effectsLevel() !== "off";
}

// Analytic surface masks in sprite-local coordinates: no repeated atlas reads,
// luma-derived geometry, extra buffer, or authored-art replacement. Local X is
// mirrored with the colour UV; normal X is then returned to world orientation.
const TOWN_RELIEF = /* glsl */ `
${VOLUME_GLSL}
uniform float uReliefOn;
uniform float uReliefNight;
uniform vec4 uReliefL[${MAX_LIGHTS}];
uniform vec3 uReliefC[${MAX_LIGHTS}];
uniform int uReliefN;
varying vec2 vLocal;
varying vec2 vWorld;
vec3 townNormal(vec2 p, float kind) {
  if (uVolumeOn > 0.5 && kind > 1.5) return volumeNormal(p,kind);
  if (kind < 1.5) {
    // Main slate roof, lower timber side, open gable/front; chimney is masonry.
    if (p.x < 0.22 && p.y > 0.53) return normalize(vec3(-0.65, 0.0, 0.8));
    if (p.y > 0.40 + 0.27 * (1.0 - p.x)) return normalize(vec3(-0.22, 0.78, 0.65));
    if (p.x < 0.56) return normalize(vec3(-0.7, 0.05, 0.72));
    return normalize(vec3(0.48, 0.05, 0.88));
  }
  // Tiny head/cloth volumes: silhouette art remains authoritative. No gloss,
  // no treating ink/wash brightness as bumps. Both existing poses share axes.
  float head = step(0.76, p.y);
  float centre = mix(0.49, 0.46, head);
  float nx = clamp((p.x - centre) * 1.5, -0.65, 0.65);
  float ny = mix(0.12, clamp((p.y - 0.85) * 4.0, -0.3, 0.45), head);
  return normalize(vec3(nx, ny, 1.0));
}
vec3 townRelief(vec3 colour) {
  if (uReliefOn < 0.5 || vParam.y < 0.5) return colour;
  vec3 N = townNormal(vLocal, vParam.y);
  if (vParam.w > 0.5) N.x = -N.x;
  vec3 sky = normalize(vec3(mix(-0.55, -0.12, uReliefNight), 0.82, 0.85));
  float key = clamp((dot(N, sky) - 0.65) * 0.4, -0.18, 0.18);
  vec3 response = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uReliefN) break;
    vec2 d = uReliefL[i].xy - vWorld;
    float fall = max(0.0, 1.0 - length(d) / uReliefL[i].z);
    vec3 L = normalize(vec3(d.x, -d.y, 14.0));
    response += uReliefC[i] * fall * fall * (dot(N, L) - 0.65) * 0.3 * (fall>0.0 ? volumeVisibility(vWorld,uReliefL[i].xy) : 1.0);
  }
  float ink = smoothstep(0.035, 0.12, dot(colour, vec3(0.2126, 0.7152, 0.0722)));
  return colour * (vec3(1.0) + ink * (vec3(key) + clamp(response, vec3(-0.12), vec3(0.12))));
}
`;
const BLIT_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLIT_FRAG = /* glsl */ `
${VOLUME_GLSL}
uniform sampler2D tex;
uniform vec2 uSize;      // the target, texels
uniform float uK;        // device px per texel
uniform float uDevH;
uniform vec3 uAmb;
uniform float uNight;
uniform vec4 uL[${MAX_LIGHTS}];   // x, y (texels from the view's top-left), radius, unused
uniform vec3 uC[${MAX_LIGHTS}];
uniform int uN;
uniform vec2 uOrigin;    // the view's top-left in world texels (the moonlight's patches stay on the ground)
uniform float uTime;
${BAYER_GLSL}
void main() {
  vec2 px = floor(vec2(gl_FragCoord.x, uDevH - gl_FragCoord.y) / uK);
  vec2 uv = vec2((px.x + 0.5) / uSize.x, 1.0 - (px.y + 0.5) / uSize.y);
  vec3 c = texture2D(tex, uv).rgb;
  vec3 light = vec3(0.0);
  float d4 = bayer4(px);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uN) break;
    vec2 d = px - uL[i].xy;
    float f = max(0.0, 1.0 - length(d * vec2(1.0, 1.25)) / uL[i].z);
    f = floor(f * f * 6.0 + d4) / 6.0;   // banded, dithered falloff: a pixel-art pool
    light += uC[i] * f * (f>0.0 ? volumeVisibility(px + uOrigin, uL[i].xy + uOrigin) : 1.0);
  }
  // moonlight in drifting patches (the art note: the grass read flat): a slow, broad value swell over the ground, banded
  vec2 w = px + uOrigin;
  float m = sin(w.x * 0.021 + uTime * 0.04) * sin(w.y * 0.027 - uTime * 0.03) + 0.5 * sin((w.x + w.y) * 0.013 + 1.7);
  m = floor((0.5 + 0.33 * m) * 5.0 + d4) / 5.0;
  // night: what the warm light does not reach is graded toward the moon (cool, desaturated), so a lit window or the fire reads
  // against a blue world rather than a darker copy of the day
  float lit = clamp(dot(light, vec3(0.45, 0.35, 0.2)) * 2.0, 0.0, 1.0);
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(0.62, 0.8, 1.2) * lum, 0.65 * uNight * (1.0 - lit));
  vec3 col = c * (uAmb * (0.84 + 0.36 * m) + light) + light * light * (0.05 + 0.12 * uNight) * (0.4 + uNight);
  // a soft vignette: the corners a step down (the night's more)
  vec2 q = px / uSize - 0.5;
  col *= 1.0 - (0.18 + 0.22 * uNight) * smoothstep(0.32, 0.75, length(q * vec2(1.0, 0.8)));
  gl_FragColor = vec4(col, 1.0);
}`;
class GLTown {
  private renderer: THREE.WebGLRenderer;
  private rt: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  private tex: THREE.CanvasTexture;
  private terrainTex: THREE.CanvasTexture;
  private groundL: QuadLayer;
  private objL: QuadLayer;
  private shadowL: QuadLayer;
  private glowL: GlowLayer;
  private blitScene = new THREE.Scene();
  private blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;
  private groundKey = "";
  private atlasV = -1;
  private lv = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
  private lc = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3());
  private volumeBlocks = [new THREE.Vector4(), new THREE.Vector4()];
  private canvas: HTMLCanvasElement;
  private atlas: TownAtlas;
  constructor(canvas: HTMLCanvasElement, atlas: TownAtlas) {
    this.canvas = canvas;
    this.atlas = atlas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      depth: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
    this.tex = new THREE.CanvasTexture(atlas.canvas);
    Object.assign(this.tex, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      colorSpace: THREE.NoColorSpace,
      flipY: true,
      premultiplyAlpha: false,
    });
    this.terrainTex = new THREE.CanvasTexture(document.createElement("canvas"));
    Object.assign(this.terrainTex, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      colorSpace: THREE.NoColorSpace,
      flipY: true,
    });
    this.groundL = new QuadLayer(this.terrainTex, 1, 1, 0);
    this.objL = new QuadLayer(this.tex, 1600, 1, 1);
    this.shadowL = new QuadLayer(this.tex, 800, 1, 1);
    this.glowL = new GlowLayer(this.tex, ATLAS);
    const objectMat = this.objL.mesh.material as THREE.ShaderMaterial;
    objectMat.vertexShader = objectMat.vertexShader
      .replace("varying vec2 vUv;", "varying vec2 vUv; varying vec2 vLocal; varying vec2 vWorld;")
      .replace("vParam = iParam;", "vParam = iParam; vLocal = vec2(u, uv.y);")
      .replace("gl_Position =", "vWorld = vec2(p.x, -p.y); gl_Position =");
    objectMat.fragmentShader = objectMat.fragmentShader
      .replace("void main() {", `${TOWN_RELIEF}\nvoid main() {`)
      .replace(
        "col = mix(col, uFlash, vParam.y * smoothstep(0.06, 0.3, l));",
        "col = townRelief(col);",
      );
    Object.assign(objectMat.uniforms, {
      uVolumeOn: { value: 0 },
      uVolumeBlock: { value: this.volumeBlocks },
      uReliefOn: { value: 0 },
      uReliefNight: { value: 0 },
      uReliefL: { value: this.lv },
      uReliefC: { value: this.lc },
      uReliefN: { value: 0 },
    });
    // Town-only translucent ground pigment. Ordinary sprites retain their
    // existing hard alpha threshold; this layer writes no depth or light tags.
    const shadowMat = this.shadowL.mesh.material as THREE.ShaderMaterial;
    shadowMat.fragmentShader = shadowMat.fragmentShader
      .replace("if (c.a < 0.5) discard;", "if (c.a < 0.01) discard;")
      .replace("if (vParam.z > 0.0 && vParam.z > bayer4(gl_FragCoord.xy)) discard;", "")
      .replace(
        "gl_FragColor = vec4(col, uTag);",
        "gl_FragColor = vec4(col, c.a * (1.0 - vParam.z));",
      );
    shadowMat.transparent = true;
    shadowMat.depthWrite = false;
    this.scene.add(this.groundL.mesh, this.objL.mesh, this.shadowL.mesh);
    this.camera.position.set(0, 0, 100);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: BLIT_VERT,
      fragmentShader: BLIT_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tex: { value: this.rt.texture },
        uSize: { value: new THREE.Vector2(4, 4) },
        uK: { value: 1 },
        uDevH: { value: 4 },
        uAmb: { value: new THREE.Vector3(1, 1, 1) },
        uNight: { value: 0 },
        uL: { value: this.lv },
        uC: { value: this.lc },
        uN: { value: 0 },
        uOrigin: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uVolumeOn: { value: 0 },
        uVolumeBlock: { value: this.volumeBlocks },
      },
    });
    this.blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }
  restored(): void {
    this.groundKey = "";
    this.atlasV = -1;
    this.tex.needsUpdate = true;
    this.terrainTex.needsUpdate = true;
  }
  /** the GL context is gone (forced lost on dispose, or by the browser) */
  isLost(): boolean {
    return this.renderer.getContext().isContextLost();
  }
  readScreen(F: TownFrame): Uint8Array {
    const pixels = new Uint8Array(F.W * F.H * 4),
      context = this.renderer.getContext();
    context.readPixels(0, 0, F.W, F.H, context.RGBA, context.UNSIGNED_BYTE, pixels);
    return pixels;
  }
  compareLighting(F: TownFrame, withImages = true): unknown {
    const captures: Uint8Array[] = [];
    const screenCaptures: Uint8Array[] = [];
    for (const enabled of [false, true]) {
      this.render(F, enabled, 0);
      const pixels = new Uint8Array(F.w * F.h * 4);
      this.renderer.readRenderTargetPixels(this.rt, 0, 0, F.w, F.h, pixels);
      captures.push(pixels);
      if (townVolumeLighting()) {
        const screen = new Uint8Array(F.W * F.H * 4);
        const context = this.renderer.getContext();
        context.readPixels(0, 0, F.W, F.H, context.RGBA, context.UNSIGNED_BYTE, screen);
        screenCaptures.push(screen);
      }
    }
    let changed = 0,
      unmapped = 0,
      alphaChanges = 0,
      max = 0,
      sum = 0;
    const maps = F.quads.slice(0, F.n).filter((q) => q.relief);
    const changedByKind: Record<number, number> = {};
    for (let y = 0; y < F.h; y++)
      for (let x = 0; x < F.w; x++) {
        const i = (y * F.w + x) * 4;
        const delta = Math.max(
          ...[0, 1, 2].map((c) => Math.abs(captures[0]![i + c]! - captures[1]![i + c]!)),
        );
        if (captures[0]![i + 3] !== captures[1]![i + 3]) alphaChanges++;
        if (!delta) continue;
        changed++;
        sum += delta;
        max = Math.max(max, delta);
        const wx = F.x0 + x + 0.5,
          wy = F.y0 + F.h - y - 0.5;
        for (const q of maps) {
          if (wx >= q.x - q.w / 2 && wx <= q.x + q.w / 2 && wy <= q.y && wy >= q.y - q.h)
            changedByKind[q.relief!] = (changedByKind[q.relief!] ?? 0) + 1;
        }
        if (
          !maps.some(
            (q) => wx >= q.x - q.w / 2 && wx <= q.x + q.w / 2 && wy <= q.y && wy >= q.y - q.h,
          )
        )
          unmapped++;
      }
    const images = (withImages ? captures : []).map((pixels) => {
      const canvas = document.createElement("canvas");
      canvas.width = F.w;
      canvas.height = F.h;
      const ctx = canvas.getContext("2d")!,
        image = ctx.createImageData(F.w, F.h);
      for (let y = 0; y < F.h; y++)
        image.data.set(pixels.subarray(y * F.w * 4, (y + 1) * F.w * 4), (F.h - 1 - y) * F.w * 4);
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL();
    });
    let screenChanged = 0,
      screenAlphaChanges = 0,
      outsideMappedChanged = 0;
    if (screenCaptures.length === 2)
      for (let y = 0; y < F.H; y++)
        for (let x = 0; x < F.W; x++) {
          const i = (y * F.W + x) * 4;
          if (screenCaptures[0]![i + 3] !== screenCaptures[1]![i + 3]) screenAlphaChanges++;
          if (![0, 1, 2].some((c) => screenCaptures[0]![i + c] !== screenCaptures[1]![i + c]))
            continue;
          screenChanged++;
          const wx = F.x0 + (x + 0.5) / F.k,
            wy = F.y0 + (F.H - y - 0.5) / F.k;
          if (
            !maps.some(
              (q) => wx >= q.x - q.w / 2 && wx <= q.x + q.w / 2 && wy <= q.y && wy >= q.y - q.h,
            )
          )
            outsideMappedChanged++;
        }
    const screenImages = (withImages ? screenCaptures : []).map((pixels) => {
      const canvas = document.createElement("canvas");
      canvas.width = F.W;
      canvas.height = F.H;
      const ctx = canvas.getContext("2d")!,
        image = ctx.createImageData(F.W, F.H);
      for (let y = 0; y < F.H; y++)
        image.data.set(pixels.subarray(y * F.W * 4, (y + 1) * F.W * 4), (F.H - 1 - y) * F.W * 4);
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL();
    });
    this.render(F);
    const material = this.objL.mesh.material as THREE.ShaderMaterial;
    return {
      width: F.w,
      height: F.h,
      night: F.night,
      changed,
      unmapped,
      alphaChanges,
      maxDelta: max,
      meanChangedDelta: changed ? sum / changed : 0,
      changedByKind,
      lightSources: F.lights.map((light) => ({ ...light, c: [...light.c] })),
      mappedPoses: maps.map((q) => ({ kind: q.relief, w: q.w, h: q.h, flip: q.flip })),
      footprints: this.volumeBlocks.map((b, i) => ({
        family: i === 0 ? "house" : "forge",
        x: b.x,
        y: b.y,
        halfW: b.z,
        halfH: b.w,
      })),
      shaderPatched:
        material.fragmentShader.includes("col = townRelief(col);") &&
        material.vertexShader.includes("vLocal = vec2(u, uv.y)"),
      images,
      screen: { changed: screenChanged, alphaChanges: screenAlphaChanges, outsideMappedChanged },
      screenImages,
    };
  }
  timeLightingPair(
    F: TownFrame,
    firstOn: boolean,
    baseDepthOnly = false,
  ): { offMs: number; onMs: number; firstOn: boolean } {
    const values = { offMs: 0, onMs: 0, firstOn };
    const baseline = baseDepthOnly
      ? {
          ...F,
          quads: F.quads.map((q) => (volumeService(q.relief ?? 0) ? { ...q, relief: 0 } : q)),
        }
      : F;
    for (const enabled of [firstOn, !firstOn]) {
      const start = performance.now();
      this.render(enabled ? F : baseline, baseDepthOnly ? undefined : enabled, 0);
      values[enabled ? "onMs" : "offMs"] = performance.now() - start;
    }
    this.render(F, lightingPreviewOverride);
    return values;
  }
  timeGlow(F: TownFrame, n: number): { offMs: number; onMs: number; glows: number; n: number } {
    const context = this.renderer.getContext(),
      px = new Uint8Array(4);
    const kept = F.glows.slice(),
      off: number[] = [],
      on: number[] = [];
    const once = (glows: Glow[]): number => {
      F.glows = glows;
      const t0 = performance.now();
      this.render(F);
      context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, px);
      return performance.now() - t0;
    };
    once(kept);
    for (let i = 0; i < n; i++) {
      if (i & 1) {
        on.push(once(kept));
        off.push(once([]));
      } else {
        off.push(once([]));
        on.push(once(kept));
      }
    }
    F.glows = kept;
    const med = (a: number[]): number => a.sort((x, y) => x - y)[a.length >> 1]!;
    return { offMs: med(off), onMs: med(on), glows: kept.length, n };
  }
  render(F: TownFrame, reliefOverride?: boolean, timeOverride?: number): void {
    const r = this.renderer;
    if (this.canvas.width !== F.W || this.canvas.height !== F.H) r.setSize(F.W, F.H, false);
    if (this.rt.width !== F.w || this.rt.height !== F.h) this.rt.setSize(F.w, F.h);
    if (this.atlas.version !== this.atlasV) {
      this.atlasV = this.atlas.version;
      this.tex.needsUpdate = true;
    }
    if (F.groundKey !== this.groundKey) {
      this.groundKey = F.groundKey;
      const L = this.groundL;
      L.begin();
      if (F.terrain) {
        this.terrainTex.image = F.terrain;
        this.terrainTex.needsUpdate = true;
        L.push((MAP_W * TILE) / 2, -MAP_H * TILE, 0, MAP_W * TILE, MAP_H * TILE, 0, 0, 1, 1);
      }
      L.end();
    }
    const O = this.objL,
      S = this.shadowL;
    O.begin();
    S.begin();
    const volume = townVolumeLighting() && (reliefOverride ?? true);
    for (const b of this.volumeBlocks) b.set(0, 0, 0, 0);
    for (let i = 0; i < F.n; i++) {
      const q = F.quads[i]!;
      if (volume && volumeBuilding(q.relief ?? 0) && q.fade < 1) {
        // Old/new tier paintings overlap during construction. Keep one coarse
        // footprint per building family, so House never consumes Forge's slot.
        const kind = q.relief!,
          house = kind === 3 || kind === 9 || kind === 10;
        const b = this.volumeBlocks[house ? 0 : 1]!;
        b.set(q.x, q.y - 5, Math.max(b.z, q.w * 0.27), Math.max(b.w, 3, q.h * 0.07));
      }
      // .21/.22 are reserved for ground pigment; wind stays at .1.
      const layer = q.z === 0.21 || q.z === 0.22 ? S : O;
      layer.push(
        q.x,
        -q.y,
        q.z,
        q.w,
        q.h,
        q.s.u0,
        q.s.v0,
        q.s.u1,
        q.s.v1,
        q.dim,
        q.relief ?? 0,
        q.fade,
        q.flip ? 1 : 0,
      );
    }
    O.end();
    S.end();
    const c = this.camera;
    c.left = F.x0;
    c.right = F.x0 + F.w;
    c.top = -F.y0;
    c.bottom = -(F.y0 + F.h);
    c.updateProjectionMatrix();
    const relief = (this.objL.mesh.material as THREE.ShaderMaterial).uniforms;
    relief.uReliefOn!.value = (reliefOverride ?? townDimensionalLighting()) ? 1 : 0;
    relief.uVolumeOn!.value = volume ? 1 : 0;
    relief.uReliefNight!.value = F.night;
    relief.uReliefN!.value = Math.min(MAX_LIGHTS, F.lights.length);
    for (let i = 0; i < relief.uReliefN!.value; i++) {
      const light = F.lights[i]!;
      this.lv[i]!.set(light.x, light.y, light.r, 0);
      this.lc[i]!.set(...light.c);
    }
    r.setRenderTarget(this.rt);
    r.setClearColor(0x1b2412, 1);
    r.clear();
    r.render(this.scene, c);
    const u = this.mat.uniforms;
    u.uVolumeOn!.value = volume ? 1 : 0;
    (u.uSize!.value as THREE.Vector2).set(F.w, F.h);
    u.uK!.value = F.k;
    u.uDevH!.value = F.H;
    (u.uAmb!.value as THREE.Vector3).set(...F.amb);
    u.uNight!.value = F.night;
    const n = Math.min(MAX_LIGHTS, F.lights.length);
    for (let i = 0; i < n; i++) {
      const l = F.lights[i]!;
      this.lv[i]!.set(l.x - F.x0, l.y - F.y0, l.r, 0);
      this.lc[i]!.set(...l.c);
    }
    u.uN!.value = n;
    (u.uOrigin!.value as THREE.Vector2).set(F.x0, F.y0);
    u.uTime!.value = timeOverride ?? performance.now() / 1000;
    r.setRenderTarget(null);
    r.render(this.blitScene, this.blitCam);
    // Cut272: the lit silhouettes go over the lit screen (emitted gold, never dimmed by the night's grade); none, no draw
    if (this.glowL.set(F.glows, F, timeOverride ?? performance.now() / 1000)) {
      const auto = r.autoClear;
      r.autoClear = false;
      r.render(this.glowL.scene, this.glowL.camera);
      r.autoClear = auto;
    }
  }
  // (the context is let go, not left for the browser to reap: a camp mounted a dozen times held a dozen contexts, and Chrome's cap
  // then forced the oldest live one — the watch's — lost)
  dispose(): void {
    this.groundL.dispose();
    this.objL.dispose();
    this.shadowL.dispose();
    this.glowL.dispose();
    this.mat.dispose();
    this.rt.dispose();
    this.tex.dispose();
    this.terrainTex.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
