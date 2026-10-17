// Cut 30.5 — the works tree, client half (docs/CUT30_5.md, docs/AUTOMATION_TREE.md §3): the `next` pill on the home screen (one goal:
// an icon, ≤ 3 words, a number, a thin bar; a tap opens the works on its node), the works sheet (the tracks panel's successor: the
// nodes done, dimmed; the lit or counting node full with its hire; the next two as silhouettes; never the whole tree; the four branches
// once the trunk is done), the hire's beat (`PORTER HIRED`, ≤ 2 words) and the report's worker lines (`apprentice · +2 steps`).
// All truth is the core's (`Lineage.tree`): the client draws the nodes, their states and the pill as the wire sends them.
import "../works.css";
import type { App } from "../app";
import type { Lineage, ReturnReport, WorkNode, WorkerAct, Works } from "../engine/types";
import { h, replace } from "./dom";
import { closeEverything, openWindow as openSheet } from "./sheet";
import { icon } from "./skin";
import { audio } from "../audio";
import { heroFace, trackIcon, trackName, TRACK_IDS } from "./tracks";
import { detailHost, kw, kwHost } from "./tips";
import { supplyReason } from "./report-supplies";
import { guildOrders, takeGuildOffer } from "./order-offer";
import { openCampOrders } from "./camp";

export const hasWorks = (L: Pick<Lineage, "tree"> | undefined): boolean => !!L?.tree;
export const workerNodes = (W: Works): WorkNode[] => W.nodes.filter((n) => n.kind === "worker");
/** the trunk's workers (the first session's goal); the branches open once they are all hired */
export const TRUNK = ["quartermaster", "porter", "scout", "apprentice"];
export const trunkDone = (W: Works): boolean =>
  workerNodes(W)
    .filter((n) => TRUNK.includes(n.id))
    .every((n) => n.state === "done");

/** A node's icon: `node_<id>` (art/town-ids.md), else the name's first letter. */
export const nodeIcon = (id: string, name = id): HTMLElement =>
  icon(`node_${id}`, (name[0] ?? "?").toUpperCase());
/** What each worker retires, ≤ 4 words, a fragment (docs/AUTOMATION_TREE.md §5.4's register; eval/copy-budgets.json `node_tip`). The
 *  client's own words: the wire's `WorkNode.tip` is a sentence, so it is never drawn. */
/* copy:node_tip */
const BLURB: Record<string, string> = {
  quartermaster: "packs heal · drill item",
  porter: "hauls home · while away",
  scout: "books his delves",
  apprentice: "buys forge steps",
  clerk: "banks spare gold",
  drillmaster: "levels the stance",
  kennel_hand: "fields best pets",
  herald: "swaps stale quests",
  guide: "starts deeper",
  kennel_keeper: "breeds · frees spare pets",
};
export const blurb = (id: string): string => BLURB[id] ?? "";
/** week 2: a worker's rank as a numeral (`II`); none at rank 1 */
export const rankNum = (r?: number): string =>
  r && r > 1 ? (["", "I", "II", "III", "IV", "V"][r] ?? String(r)) : "";
/** What the next rank adds (≤ 4 words), once the core sends it (`rank_adds`, reserved); until then the price says it all. */
const rankAdds = (n: WorkNode): string => {
  const a = (n as WorkNode & { rank_adds?: string }).rank_adds;
  return a && a.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length <= 4 ? a : "";
};
/** the chore's count word (`2/3 chests`) */
/* copy:label */
const CHORE: Record<string, string> = {
  chest: "chests",
  send: "sends",
  wear: "worn",
  forge: "steps",
  keep: "sorted",
  deposit: "deposits",
  level: "levels",
  field: "fielded",
  swap: "swaps",
  start: "starts",
  breed: "bred",
};
export const choreWord = (c?: string): string => (c ? (CHORE[c] ?? c) : "");
const price = (n: WorkNode): string => (n.price ? `$${n.price}` : /* copy:label */ "free");
/** A node's one state line (≤ 3 words + a number): `done`, `2/3 chests`, `$120`, `bank built`. */
export function nodeState(n: WorkNode): string {
  if (n.state === "done") return n.paused ? /* copy:label */ "off" : /* copy:label */ "done";
  if (n.state === "lit")
    return n.need ? `${Math.min(n.count ?? 0, n.need)}/${n.need} ${choreWord(n.chore)}` : price(n); // (the price is on the hire)
  if (n.state === "shut") return n.trigger ?? "";
  if (n.need) return `${n.count ?? 0}/${n.need} ${choreWord(n.chore)}`;
  if (n.feat) return featText(n.feat, n.feat_done);
  return n.trigger ?? "";
}
/** Cut235: a feat goal's words, met or not (`✓ interest paid`) */
export const featText = (feat: string, done?: boolean): string => `${done ? "✓ " : ""}${feat}`;
/** Cut231 §5: a counting worker's progress toward its trigger, from the wire's own count (`count`/`need`, the core's `progress`) and the
 *  hours to its time fallback (`eta_h`, absent once ready or with no fallback). None for a hired, lit or shut node, or one with no count. */
export type WorkerProgress = {
  id: string;
  name: string;
  have: number;
  need: number;
  unit: string;
  frac: number;
  eta?: string;
  /** Cut235: a feat goal (the core's `WorkNode.feat`, ≤ 3 words) and whether it is met; then `have`/`need` are 0|1 of 1 */
  feat?: string;
  done?: boolean;
};
/** the quiet time fallback (`or 6h`, `or 3d` from two days) */
export const etaText = (h?: number): string =>
  h && h > 0 ? /* copy:callout */ `or ${h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`}` : "";
export function workerProgress(n?: WorkNode): WorkerProgress | null {
  if (!n || n.kind !== "worker" || !["open", "ready"].includes(n.state)) return null;
  const eta = etaText(n.eta_h);
  if (n.goal === "feat" && n.feat) {
    const done = !!n.feat_done;
    return {
      id: n.id,
      name: n.name,
      have: done ? 1 : 0,
      need: 1,
      unit: "",
      frac: done ? 1 : 0,
      feat: n.feat,
      done,
      ...(eta && !done ? { eta } : {}),
    };
  }
  if (!n.need) return null;
  const have = Math.max(0, Math.min(n.count ?? 0, n.need));
  return {
    id: n.id,
    name: n.name,
    have,
    need: n.need,
    unit: choreWord(n.chore),
    frac: have / n.need,
    ...(eta ? { eta } : {}),
  };
}
/** `2/3 sends` */
export const progressText = (p: WorkerProgress): string =>
  p.feat ? featText(p.feat, p.done) : `${p.have}/${p.need} ${p.unit}`.trim();
/** The next worker the town works toward: the core's `next_worker` (the lit one, else the first counting), else the sheet's focus. */
export const nextWorkerNode = (W?: Works): WorkNode | undefined =>
  !W ? undefined : W.next_worker ? W.nodes.find((n) => n.id === W.next_worker) : worksView(W).focus;
/** the thin progress bar a worker's count draws (`cls` the host's bar class) */
export const progressBar = (cls: string, frac: number): HTMLElement =>
  h(
    "span",
    { class: cls, "aria-hidden": "true" },
    h("span", {
      class: "fill",
      style: `width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`,
    }),
  );

/** A silhouette's line: what lights it and its price (`3 sends · $96`; shut: `bank built`). */
const silLine = (n: WorkNode): string =>
  n.state === "shut"
    ? (n.trigger ?? "")
    : [
        n.need
          ? `${n.count ? `${n.count}/` : ""}${n.need} ${choreWord(n.chore)}`
          : n.feat
            ? featText(n.feat, n.feat_done)
            : (n.trigger ?? ""),
        n.state === "ready" ? price(n) : n.price ? `$${n.price}` : /* copy:label */ "free",
      ]
        .filter(Boolean)
        .join(" · ");

/** What the sheet draws of the trunk and the branches' workers: done (dimmed), the focus (lit, else the first counting), the next two. */
export function worksView(W: Works): { done: WorkNode[]; focus?: WorkNode; next: WorkNode[] } {
  const ws = workerNodes(W);
  const done = ws.filter((n) => n.state === "done");
  const pending = ws.filter((n) => n.state !== "done");
  const focus =
    pending.find((n) => n.id === W.lit) ?? pending.find((n) => n.state === "open") ?? pending[0];
  return { done, focus, next: pending.filter((n) => n !== focus).slice(0, 2) };
}

// --- the `next` pill ---

export type Pill = { el: HTMLElement; paint(): void };
/** The `next` pill (docs/AUTOMATION_TREE.md §3A): `kind` buy glows gold; a bar under it when the wire gives `have/need`. */
export function nextPill(app: App, anchorOpen: (node?: string, at?: HTMLElement) => void): Pill {
  const el: HTMLButtonElement = h("button", {
    class: "next-pill game-control",
    hidden: true,
    onclick: (e: Event) => {
      e.stopPropagation();
      anchorOpen(el.dataset.node || undefined, el);
    },
  });
  detailHost(el, () => [h("div", { class: "kw-tip-head" }, el.getAttribute("aria-label") ?? "")]);
  let last = "";
  const paint = (): void => {
    const W = app.lineage.tree;
    if (!W) {
      el.hidden = true;
      return;
    }
    const p = W.next ?? { kind: "none", text: "" };
    const node = W.nodes.find((n) => n.id === p.node);
    const hired = workerNodes(W).filter((n) => n.state === "done").length;
    // This shortcut opens Workers; an unrelated curriculum goal is not its gate.
    const management = hired > 0 && !node && (p.kind === "system" || p.kind === "none");
    // Cut231 §5: the goal's worker counting toward its trigger — a count goal names its chore (`scout · 2/3 sends`), a send or a
    // chest (each advances the worker) carries the count quietly beside it (`scout 1/3`); the time fallback rides quietly (`or 6h`)
    const prog = management ? null : workerProgress(node);
    // Cut235: a feat goal names its feat, met or not (`apprentice · forged new best`, `✓` once met), no bar; its fallback quietly
    const goal = p.kind === "count" || p.kind === "feat";
    const text = management
      ? /* copy:label */ `Workers · ${hired} hired`
      : goal && prog
        ? `${prog.name} · ${progressText(prog)}`
        : p.text || /* copy:label */ "workers";
    const side =
      prog && !prog.feat && (p.kind === "send" || p.kind === "chest")
        ? `${prog.name} ${prog.have}/${prog.need}`
        : "";
    const eta = prog && (goal || side) ? (prog.eta ?? "") : "";
    const frac = management
      ? undefined
      : p.kind === "buy" || p.kind === "chest"
        ? 1
        : p.have !== undefined && p.need
          ? Math.max(0, Math.min(1, p.have / p.need))
          : p.kind === "send" && prog
            ? prog.frac
            : undefined;
    const key = JSON.stringify([p, text, side, eta, frac]);
    el.hidden = false;
    el.dataset.kind = management ? "management" : p.kind;
    el.dataset.node = management ? "" : (p.node ?? "");
    if (prog?.feat) el.dataset.featDone = String(!!prog.done);
    else delete el.dataset.featDone;
    el.classList.toggle("gold", p.kind === "buy");
    if (key === last) return;
    const moved = !!last;
    last = key;
    // (the send's goal wears the gem's mark, the chest's the coin; a node its worker's face)
    const ico =
      p.kind === "send"
        ? icon("v_descend", "▼")
        : p.kind === "chest"
          ? icon("gold", "$")
          : node
            ? nodeIcon(node.id, node.name)
            : icon("gold", "▸");
    replace(
      el,
      h("span", { class: "pill-ico" }, ico),
      h(
        "span",
        { class: "pill-main" },
        h(
          "span",
          { class: "pill-t num" },
          text,
          side
            ? h("small", { class: "pill-prog", "data-worker": prog?.id ?? "" }, ` · ${side}`)
            : "",
          eta ? h("small", { class: "pill-eta" }, ` · ${eta}`) : "",
        ),
        frac !== undefined ? progressBar("pill-bar", frac) : "",
      ),
      p.kind === "buy" && node?.price !== undefined
        ? h("span", { class: "pill-price num", "aria-hidden": "true" }, `$${node.price}`)
        : management
          ? h("span", { class: "pill-price num", "aria-hidden": "true" }, String(hired))
          : "",
    );
    el.setAttribute("aria-label", [text, side, eta].filter(Boolean).join(" · "));
    if (moved) {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
  };
  paint();
  return { el, paint };
}

// --- the works sheet ---

/** Opens the works on `focus` (a node id; the pill's), anchored to `anchor`. */
export function openWorks(app: App, focus?: string, anchor?: HTMLElement | null): void {
  if (!app.lineage.tree) return;
  closeEverything();
  // Cut262: the Guild reception keeps the standing orders its workers follow (Legacy spend, worker ranks)
  const offered = takeGuildOffer(app.lineage);
  openSheet(
    (close) => {
      const body = h("div", { class: "sheet-body works-sheet" });
      const paint = (): void => {
        const W = app.lineage.tree;
        if (!W) {
          close();
          return;
        }
        const v = worksView(W);
        const card = (n: WorkNode): HTMLElement => {
          const lit = n.state === "lit";
          const frac = n.need ? Math.min(1, (n.count ?? 0) / n.need) : lit ? 1 : 0;
          const hire = lit
            ? h(
                "button",
                {
                  class: `btn primary hire-btn${n.affordable === false ? " short" : ""}`,
                  "data-node": n.id,
                  disabled: n.affordable === false || !app.engine.hire,
                  onclick: () => void hireNode(app, n, close),
                },
                n.affordable === false
                  ? `$${app.lineage.gold + W.chest}/$${n.price}`
                  : /* copy:button */ `hire · ${price(n)}`,
              )
            : "";
          return h(
            "div",
            {
              class: `wnode cur${lit ? " lit" : ""}`,
              "data-node": n.id,
              "data-state": n.state,
              ...(n.feat ? { "data-feat-done": String(!!n.feat_done) } : {}),
            },
            h("span", { class: "wn-ico" }, nodeIcon(n.id, n.name)),
            h(
              "div",
              { class: "wn-main" },
              h(
                "div",
                { class: "wn-head" },
                nameEl(n),
                h(
                  "span",
                  { class: "wn-state num" },
                  nodeState(n),
                  // Cut231 §5: the time fallback that lights it without the count, quietly (`or 30h`)
                  !lit && workerProgress(n)?.eta
                    ? h("small", { class: "wn-eta" }, ` · ${workerProgress(n)!.eta}`)
                    : "",
                ),
              ),
              n.need || lit ? progressBar("wn-bar", frac) : "",
              blurb(n.id) ? h("small", { class: "wn-tip" }, blurb(n.id)) : "",
            ),
            hire,
          );
        };
        const sil = (n: WorkNode): HTMLElement =>
          h(
            "div",
            { class: "wnode sil", "data-node": n.id, "data-state": n.state },
            h("span", { class: "wn-ico" }, nodeIcon(n.id, n.name)),
            h(
              "div",
              { class: "wn-main" },
              h("span", { class: "wn-name" }, n.name),
              h("small", { class: "wn-state num" }, silLine(n)),
            ),
          );
        const done = v.done.length
          ? h(
              "div",
              { class: "works-done" },
              h("span", { class: "wd-mark", "aria-hidden": "true" }, "✓"),
              ...v.done.map((n) =>
                h(
                  "span",
                  {
                    class: `wd${n.paused ? " off" : ""}`,
                    "data-node": n.id,
                    "data-rank": n.rank ?? 1,
                    // first-hour pass 2026-10-17 (`Aletta given` read as a sentence fragment): the town's first worker came with it —
                    // her hover says so, the row names her only
                    title: [
                      workerTitle(n),
                      blurb(n.id),
                      n.id === "quartermaster" ? /* copy:tooltip */ "came with the town" : "",
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  nodeIcon(n.id, n.name),
                  // Cut258: a hired worker by her own name (the role on hover)
                  h("small", null, n.person || n.name),
                  rankNum(n.rank) ? h("b", { class: "wd-rank num" }, ` ${rankNum(n.rank)}`) : "",
                ),
              ),
            )
          : "";
        // week 2: the one rank on offer (`Works.lit_rank`, only while no hire is lit) — its card and its promote, above the done row
        const rk = W.lit_rank ? W.nodes.find((n) => n.id === W.lit_rank) : undefined;
        const rankCard = rk
          ? (() => {
              const to = rankNum((rk.rank ?? 1) + 1),
                price = rk.rank_price ?? 0,
                have = app.lineage.gold + W.chest,
                can = have >= price && !!app.engine.promote;
              return h(
                "div",
                { class: "wnode cur lit rank", "data-node": rk.id, "data-state": "rank" },
                h("span", { class: "wn-ico" }, nodeIcon(rk.id, rk.name)),
                h(
                  "div",
                  { class: "wn-main" },
                  h(
                    "div",
                    { class: "wn-head" },
                    nameEl(rk, ` ${to}`),
                    rankAdds(rk) ? h("span", { class: "wn-state num" }, rankAdds(rk)) : "",
                  ),
                  h(
                    "small",
                    { class: "wn-tip" },
                    kw("rank", /* copy:label */ "rank"),
                    ` ${rankNum(rk.rank) || "I"} → ${to}`,
                  ),
                ),
                h(
                  "button",
                  {
                    class: `btn primary promote-btn${can ? "" : " short"}`,
                    "data-node": rk.id,
                    disabled: !can,
                    onclick: () => void promoteNode(app, rk, close),
                  },
                  can ? /* copy:button */ `promote · $${price}` : `$${have}/$${price}`,
                ),
              );
            })()
          : "";
        // the four branches (the tracks: their stage, the next and its trigger) once the trunk is done
        const branches = trunkDone(W)
          ? h(
              "div",
              { class: "works-branches" },
              ...TRACK_IDS.map((t) => {
                const st = W.nodes.filter((n) => n.kind === "stage" && n.branch === t);
                const now = [...st].reverse().find((n) => n.state === "done"),
                  nx = st.find((n) => n.state === "next");
                if (!now && !nx) return "";
                return h(
                  "div",
                  { class: "wbranch", "data-branch": t },
                  h("span", { class: "wb-ico" }, trackIcon(t, heroFace(app.lineage))),
                  h("small", { class: "wb-name" }, trackName(t)),
                  h("b", { class: "wb-now" }, now?.name ?? ""),
                  nx
                    ? h(
                        "small",
                        { class: "wb-next num" },
                        /* copy:callout */ `next · ${nx.name}${nx.trigger ? ` · ${nx.trigger}` : ""}`,
                      )
                    : h("small", { class: "wb-next dim" }, "✓"),
                );
              }),
            )
          : "";
        replace(
          body,
          h("div", { class: "label row-label" }, kw("works", /* copy:label */ "workers")),
          // (a rank on offer takes the second silhouette's place: the sheet stays ≤ 7 nodes on a phone)
          h(
            "div",
            { class: "works-trunk" },
            ...v.next
              .slice(0, rankCard ? 1 : 2)
              .reverse()
              .map(sil),
            v.focus ? card(v.focus) : "",
            rankCard,
            done,
          ),
          guildOrders(app, offered, (at) => openCampOrders(app, at)),
          branches,
        );
        const f =
          (focus && body.querySelector<HTMLElement>(`.wnode[data-node="${focus}"]`)) ||
          (offered && body.querySelector<HTMLElement>(`.guild-order[data-offer="${offered}"]`));
        if (f) {
          f.classList.add("focus");
          setTimeout(() => f.scrollIntoView?.({ block: "nearest" }), 0);
        }
      };
      paint();
      const off = app.onChange(() => {
        if (body.isConnected) paint();
        else off();
      });
      return body;
    },
    { anchor },
  );
}

/** The hire: the core's (`hire(id)`), then the beat — `LILI HIRED` — while the worker walks to his post (the town's). */
export async function hireNode(app: App, n: WorkNode, close?: () => void): Promise<boolean> {
  if (!app.engine.hire) return false;
  const ok = await app.mutate(() => app.engine.hire!(n.id));
  if (!ok) return false;
  audio.cue("unlock");
  close?.();
  hireBeat(n.person || n.name);
  return true;
}
/** week 2: the promotion — the core's (`promote(id)`), then the beat `PORTER II`. */
export async function promoteNode(app: App, n: WorkNode, close?: () => void): Promise<boolean> {
  if (!app.engine.promote) return false;
  const ok = await app.mutate(() => app.engine.promote!(n.id));
  if (!ok) return false;
  audio.cue("level");
  close?.();
  const r = app.lineage.tree?.nodes.find((x) => x.id === n.id)?.rank ?? (n.rank ?? 1) + 1;
  beat(`${n.name.toUpperCase()} ${rankNum(r)}`);
  return true;
}
/** The hire's beat over the well: the worker's own name and `HIRED` (2 words: `LILI HIRED`), ~1.8 s. */
export const hireBeat = (name: string): void =>
  beat(`${name.toUpperCase()} `, /* copy:callout */ "HIRED");
function beat(...text: string[]): void {
  const host = document.querySelector<HTMLElement>(".camp .well-wrap") ?? document.body;
  for (const old of host.querySelectorAll(".works-beat")) old.remove();
  const b = h("div", { class: "works-beat", role: "status" }, h("b", null, ...text));
  host.appendChild(b);
  setTimeout(() => b.remove(), 1900);
}

// --- the send before the scout ---

/** The gem's mark (camp): before the scout the send counter toward him (`1/3`); after, `auto` — the hero goes down after each rest. */
export function sendMark(L: Lineage): HTMLElement | "" {
  const W = L.tree;
  if (!W) return "";
  if (W.auto_send)
    return kwHost(
      h("small", { class: "send-auto", "data-auto": "1" }, /* copy:label */ "auto"),
      "scout",
    );
  const s = W.nodes.find((n) => n.id === "scout");
  return s?.need && s.state !== "done"
    ? kwHost(
        h(
          "small",
          { class: "send-count num", "data-n": s.count ?? 0 },
          `${Math.min(s.count ?? 0, s.need)}/${s.need}`,
        ),
        "scout",
      )
    : "";
}

// --- the report ---

/** the worker's role (the node's; the id's words when the tree is not at hand) */
const nameOf = (L: Lineage, id: string): string =>
  L.tree?.nodes.find((n) => n.id === id)?.name ?? id.replace(/_/g, "-");
/** Cut258 (owner call 5): a worker as a character — `Arina · receptionist`; the role alone without a name */
export const workerTitle = (n: Pick<WorkNode, "name" | "person">): string =>
  n.person ? `${n.person} · ${n.name}` : n.name;
/** a card's title, `Arina · receptionist`: the name and the role each kept whole, the line breaking only between them */
const nameEl = (n: Pick<WorkNode, "name" | "person">, suffix = ""): HTMLElement =>
  n.person
    ? h(
        "b",
        { class: "wn-name" },
        // (the separator its own span: a stacked card — the rank card beside its button — drops it rather than leaving `LILI ·`)
        h("span", { class: "wn-person" }, n.person, h("span", { class: "wn-sep" }, " ·")),
        " ",
        h("span", { class: "wn-role" }, `${n.name}${suffix}`),
      )
    : h("b", { class: "wn-name" }, `${n.name}${suffix}`);
/** Cut258: a report line's worker — met (`first`): `Lili · porter`; after: her name (`Lili`), the role on hover */
const actName = (L: Lineage, id: string, first: boolean): { text: string; full: string } => {
  const n = L.tree?.nodes.find((x) => x.id === id);
  const full = n ? workerTitle(n) : nameOf(L, id);
  return { text: first || !n?.person ? full : n.person, full };
};
/** An absence's worker lines, compact (`apprentice · +2 steps`), and the haul left in the chest (`chest +$120`); null when none. */
export function workersBlock(
  L: Lineage,
  r: Pick<ReturnReport, "workers" | "chest">,
  limit = 4,
  ledger = false,
): HTMLElement | null {
  const acts = (r.workers ?? []).filter((a) => a.n > 0 || a.what);
  if (!acts.length && !r.chest) return null;
  // Cut 120 §9: the While away fold is the worker ledger — one line per worker, none cut (`apprentice · +2 steps · sword +3 · −$X`)
  return h(
    "div",
    { class: `works-acts${ledger ? " works-ledger" : ""}` },
    ...acts.slice(0, limit).map((a) =>
      h(
        "span",
        {
          class: `chip work-act${a.first ? " first" : ""}`,
          "data-worker": a.id,
          title: actName(L, a.id, a.first).full,
        },
        h("span", { class: "wa-ico" }, nodeIcon(a.id, nameOf(L, a.id))),
        h("b", null, actName(L, a.id, a.first).text),
        h("span", { class: "num" }, ` · ${a.what}`),
        boughtText(a) ? h("span", { class: "num work-bought" }, boughtText(a)) : "",
        // Cut 117 §4: why the absence's supplies were limited (`WorkerAct.reason`), its gloss on hover
        ((w) =>
          w
            ? h(
                "small",
                { class: "work-reason warn", "data-reason": a.reason, title: w.tip },
                ` · ${w.text}`,
              )
            : "")(supplyReason(a.reason)),
      ),
    ),
    acts.length > limit
      ? h("small", { class: "dim" }, /* copy:callout */ `+${acts.length - limit} more`)
      : "",
    r.chest
      ? h(
          "span",
          { class: "chip work-act chest", "data-worker": "chest" },
          h("span", { class: "num gold" }, /* copy:callout */ `chest +$${r.chest}`),
        )
      : "",
  );
}
/** Cut 120 §6: the order lines beside the workers (`ranks`, `legacy`) — the ledger's, never a worker's first act (the order's own news
 *  announces it once). */
export const isOrderLine = (id: string): boolean => id === "ranks" || id === "legacy";
/** blind c4705f9 (A, B: `purse −$12562` with only `apprentice · +4 steps`): what a worker bought and paid — ` · sword +3 · mail +2 · −$12562`.
 *  Cut 120 §6: a line with no `spent` names the purse it moved (`WorkerAct.gold`, signed) unless its own words already carry the gold. */
export function boughtText(
  a: Pick<WorkerAct, "items" | "spent" | "gold"> & { what?: string },
): string {
  const items = (a.items ?? []).map((i) => ` · ${i}`).join("");
  const moved =
    !a.spent && a.gold && !/\$/.test(a.what ?? "")
      ? a.gold < 0
        ? ` · −$${-a.gold}`
        : ` · +$${a.gold}`
      : "";
  return /* copy:callout */ `${items}${a.spent ? ` · −$${a.spent}` : ""}${moved}`;
}
/** The purse the absence's workers spent on what they bought (the apprentice's forge steps). */
export const workersSpent = (acts: WorkerAct[] | undefined): number =>
  (acts ?? []).reduce((n, a) => n + (a.spent ?? 0), 0);
/** Slices of one absence merge: each worker's acts summed (its line's number is the sum), `first` if any slice's was. */
export function mergeWorkers(
  a: WorkerAct[] | undefined,
  b: WorkerAct[] | undefined,
): WorkerAct[] | undefined {
  if (!a?.length) return b;
  if (!b?.length) return a;
  const out = a.map((x) => ({ ...x }));
  for (const y of b) {
    const x = out.find((z) => z.id === y.id);
    if (!x) {
      out.push({ ...y });
      continue;
    }
    const n = x.n + y.n;
    x.what = /\d/.test(y.what)
      ? y.what.replace(/\d+/, String(n)).replace(/\b(step|level)$/, n > 1 ? "$1s" : "$1")
      : y.what;
    x.n = n;
    x.first = x.first || y.first;
    // (a later slice's step of a slot is the higher: `sword +4` replaces `sword +3`)
    if (x.items?.length || y.items?.length) {
      const key = (i: string): string => i.replace(/ ?[+\d].*$/, "");
      const later = y.items ?? [];
      x.items = [...(x.items ?? []).filter((i) => !later.some((j) => key(j) === key(i))), ...later];
    }
    if (x.spent || y.spent) x.spent = (x.spent ?? 0) + (y.spent ?? 0);
    if (x.gold || y.gold) x.gold = (x.gold ?? 0) + (y.gold ?? 0);
  }
  return out;
}
