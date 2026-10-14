// Dev-only save history ("time travel"), docs/ITERATION_SPEED.md §0i. Never in shipping: app.ts reaches this module
// only through `import.meta.env.DEV` branches, so the production bundle tree-shakes it out (checked by grep).
//
// A ring of the last RING full saved Sessions per lineage seed, captured at meaningful moments (a check-in's settlement,
// a send, a run's end, a purchase / build / hire, a manual snapshot), kept in IndexedDB (best effort: an in-memory ring
// when it is unavailable). `restore(i)` loads entry i through the app's own import path and drops the entries after it;
// `branch(i)` loads it and keeps them. Shift+T or `?dev=history` opens the panel; `window.__idlever.history` scripts it.
// Automatic capture is on in dev builds, off under automation (navigator.webdriver) unless `?history=1`; `?history=0`
// turns it off anywhere. Strings here are developer chrome, not player copy (copy-lint reads web/src/ui only).
import type { App, Screen } from "../app";
import type { AsyncEngine } from "../engine/types";
import type { SaveBlob } from "../store";

export const RING = 30;
const DB_NAME = "idlever.dev-history";
const STORE = "entries";

export type HistoryMeta = {
  id: number;
  seed: number;
  at: number; // ms since epoch
  label: string;
  gold: number;
  best: number;
  screen: string;
  bytes: number;
};
export type HistoryEntry = HistoryMeta & { key: string; blob: SaveBlob };
/** The file the panel's `save` button writes and `tools/save-history.mjs` reads. */
export type HistoryFile = { format: "idlever-history"; schema: 1; entry: HistoryEntry };

export type DevHistory = {
  /** Newest first; `i` in restore/branch/entry indexes this list. */
  list(): Promise<HistoryMeta[]>;
  entry(i: number): Promise<HistoryEntry>;
  /** A capture now (manual: always recorded, even when unchanged). */
  snapshot(label?: string): Promise<HistoryMeta | null>;
  /** Load entry i (with a confirm when `confirm` is true) and drop every later entry. */
  restore(i: number, opts?: { confirm?: boolean }): Promise<boolean>;
  /** Load entry i, keeping later entries. */
  branch(i: number, opts?: { confirm?: boolean }): Promise<boolean>;
  /** Import a save (client SaveBlob, raw engine save string, or an idlever-history / idlever-debug file) as a new entry. */
  add(save: unknown, label?: string): Promise<HistoryMeta>;
  clear(): Promise<void>;
  /** Resolves once every queued capture has been written. */
  idle(): Promise<void>;
  auto: boolean;
  open(): void;
  close(): void;
};

// Engine calls after which the state is worth keeping: purchases, builds, hires, sends, choices that spend.
const TRACKED: Record<string, (args: unknown[]) => string> = {
  send: () => "send",
  beginDescent: (a) => `descent T${a[0]}`,
  buildTown: (a) => `build ${a[0]}`,
  hire: (a) => `hire ${a[0]}`,
  promote: (a) => `promote ${a[0]}`,
  setPerk: (a) => `perk ${a[0]} ${a[1]}`,
  openChest: () => "open chest",
  buy: (a) => `buy ${a[0]}`,
  buyUnlockGold: (a) => `buy ${a[0]}`,
  buyKit: (a) => `forge ${a[0]}`,
  buySupply: (a) => `supply ${a[0]}`,
  buyRation: () => "ration",
  buySurvey: () => "survey",
  commission: () => "commission",
  upgradeHero: (a) => `upgrade ${a[0]}`,
  upgradeHeroNext: (a) => `upgrade next ${a[0]}`,
  learnClassSkill: (a) => `skill ${a[0]}`,
  setSpecialization: (a) => `spec ${a[0]}`,
  setClass: (a) => `class ${a[0]}`,
  equipPackage: (a) => `equip ${a[0]}`,
  pickTemperament: (a) => `temperament ${a[0]}`,
  spendLevel: (a) => `level ${a[0]}`,
  takeFix: (a) => `fix ${a[0]}`,
  takeReturnPick: (a) => `pick ${a[0]}`,
  swearOath: (a) => `oath ${a[0]}`,
  bankDeposit: (a) => `deposit ${a[0]}`,
  bankWithdraw: (a) => `withdraw ${a[0]}`,
  addBloodline: () => "add hero",
  rebirthHero: () => "rebirth",
  ascend: (a) => `ascend ${a[0]}`,
  tithe: (a) => `tithe ${a[0]}`,
};

const q = new URLSearchParams(location.search);
const automated = typeof navigator !== "undefined" && !!navigator.webdriver;
const autoDefault =
  q.get("history") === "0"
    ? false
    : q.get("history") === "1" || q.get("dev") === "history" || !automated;

// --- storage: IndexedDB when it opens, else memory -------------------------------------------------
let dbP: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbP ??= new Promise<IDBDatabase | null>((res) => {
    try {
      if (q.get("history_idb") === "0" || typeof indexedDB === "undefined") return res(null);
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const s = r.result.createObjectStore(STORE, { keyPath: "key" });
        s.createIndex("seed", "seed");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbP;
}
function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbAll(seed: number): Promise<HistoryEntry[] | null> {
  try {
    const d = await db();
    if (!d) return null;
    const all = await req(d.transaction(STORE).objectStore(STORE).index("seed").getAll(seed));
    return (all as HistoryEntry[]).sort((a, b) => a.id - b.id);
  } catch {
    return null;
  }
}
async function idbPut(e: HistoryEntry): Promise<void> {
  try {
    const d = await db();
    if (d) await req(d.transaction(STORE, "readwrite").objectStore(STORE).put(e));
  } catch {
    /* memory only */
  }
}
async function idbDelete(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    const d = await db();
    if (!d) return;
    const s = d.transaction(STORE, "readwrite").objectStore(STORE);
    await Promise.all(keys.map((k) => req(s.delete(k))));
  } catch {
    /* memory only */
  }
}

const meta = (e: HistoryEntry): HistoryMeta => {
  const { key: _k, blob: _b, ...m } = e;
  return m;
};

/** Normalizes the shapes a save arrives in to a client SaveBlob. */
export function toBlob(save: unknown): SaveBlob {
  let s = save;
  if (typeof s === "string") {
    const parsed = JSON.parse(s);
    // a raw engine save is an object without the blob's `engine` string
    if (parsed && typeof parsed === "object" && typeof parsed.engine !== "string" && !parsed.format)
      return { v: 2, engine: s, loadout: [], last_seen: Date.now() };
    s = parsed;
  }
  const o = s as Record<string, unknown>;
  if (o?.format === "idlever-history") return (o.entry as HistoryEntry).blob;
  if (o?.format === "idlever-debug") return o.save as SaveBlob;
  if (o && typeof o.engine === "string") return o as unknown as SaveBlob;
  if (o && typeof o === "object")
    return { v: 2, engine: JSON.stringify(o), loadout: [], last_seen: Date.now() };
  throw new Error("unrecognized save");
}

const span = (s: number): string =>
  s >= 86400
    ? `${(s / 86400).toFixed(1)}d`
    : s >= 3600
      ? `${(s / 3600).toFixed(1)}h`
      : `${Math.round(s / 60)}m`;

/** Wraps the engine (purchases, sends, run ends through `advance`) and puts `history` on the App. Returns the wrapped engine. */
export function installHistory(app: App, engine: AsyncEngine): AsyncEngine {
  const priv = app as unknown as { offlineRunning: boolean; offlineIncomplete: boolean };
  let seed = -1;
  let ring: HistoryEntry[] = [];
  let loaded: Promise<void> = Promise.resolve();
  let queue: Promise<unknown> = Promise.resolve();
  let nextId = 1;
  let restoring = false;
  let panel: HTMLElement | null = null;

  const ensure = (): Promise<void> => {
    const s = app.lineage?.seed ?? 0;
    if (s === seed) return loaded;
    seed = s;
    ring = [];
    loaded = idbAll(s).then((all) => {
      if (seed !== s) return;
      if (all) ring = all;
      nextId = Math.max(nextId, ...ring.map((e) => e.id + 1));
    });
    return loaded;
  };

  const record = async (
    label: string,
    blob: SaveBlob,
    force: boolean,
  ): Promise<HistoryMeta | null> => {
    await ensure();
    const last = ring[ring.length - 1];
    if (!force && last && last.blob.engine === blob.engine) return null;
    const L = app.lineage;
    const id = nextId++;
    const e: HistoryEntry = {
      key: `${seed}-${id}`,
      id,
      seed,
      at: Date.now(),
      label,
      gold: L?.gold ?? 0,
      best: L?.best_depth ?? 0,
      screen: app.view?.kind ?? "camp",
      bytes: blob.engine.length,
      blob,
    };
    ring.push(e);
    const drop = ring.splice(0, Math.max(0, ring.length - RING));
    await idbPut(e);
    await idbDelete(drop.map((d) => d.key));
    paint();
    return meta(e);
  };

  const capture = (label: string | (() => string), force = false): Promise<HistoryMeta | null> => {
    const p = queue.then(async () => {
      if (restoring || priv.offlineRunning || priv.offlineIncomplete) return null;
      const fresh = await app.engine.save(); // the ordered lane: the state right after the call that asked
      const blob: SaveBlob = { ...(JSON.parse(app.exportSave()) as SaveBlob), engine: fresh };
      return record(typeof label === "function" ? label() : label, blob, force);
    });
    queue = p.catch((e) => console.warn("history capture", e));
    return p;
  };

  const wrapped = new Proxy(engine, {
    get(target, key, recv) {
      const v = Reflect.get(target, key, recv);
      if (typeof key !== "string" || typeof v !== "function") return v;
      const name = TRACKED[key];
      if (key === "advance")
        return async (...a: unknown[]) => {
          const r = await (v as (...x: unknown[]) => Promise<{ ended: number[] }>).apply(target, a);
          if (api.auto && r?.ended?.length)
            void capture(() => `D${app.lineage?.best_depth ?? 0} run end ×${r.ended.length}`);
          return r;
        };
      if (!name) return v;
      return async (...a: unknown[]) => {
        const r = await (v as (...x: unknown[]) => Promise<unknown>).apply(target, a);
        if (api.auto) void capture(name(a));
        return r;
      };
    },
  });

  const at = async (i: number): Promise<HistoryEntry> => {
    await ensure();
    const e = ring[ring.length - 1 - i];
    if (!e) throw new RangeError(`no history entry ${i}`);
    return e;
  };

  const load = async (i: number, truncate: boolean, ask: boolean): Promise<boolean> => {
    await queue;
    const e = await at(i);
    if (
      ask &&
      !confirm(
        `${truncate ? "restore" : "branch"}: ${e.label} (${new Date(e.at).toLocaleTimeString()})?`,
      )
    )
      return false;
    if (priv.offlineRunning) return false;
    restoring = true;
    let ok = false;
    try {
      ok = await app.importSave(JSON.stringify(e.blob));
    } finally {
      restoring = false;
    }
    if (ok && truncate) {
      const later = ring.filter((x) => x.id > e.id);
      ring = ring.filter((x) => x.id <= e.id);
      await idbDelete(later.map((x) => x.key));
    }
    paint();
    return ok;
  };

  const api: DevHistory = {
    auto: autoDefault,
    async list() {
      await queue;
      await ensure();
      return ring.map(meta).reverse();
    },
    entry: async (i) => structuredClone(await at(i)),
    snapshot: (label = "snapshot") => capture(label, true),
    restore: (i, o) => load(i, true, !!o?.confirm),
    branch: (i, o) => load(i, false, !!o?.confirm),
    async add(save, label = "import") {
      await queue;
      const blob = toBlob(save);
      JSON.parse(blob.engine);
      const m = await record(label, blob, true);
      return m!;
    },
    async clear() {
      await queue;
      await ensure();
      await idbDelete(ring.map((e) => e.key));
      ring = [];
      paint();
    },
    idle: async () => {
      await queue;
    },
    open: () => openPanel(),
    close: () => {
      panel?.remove();
      panel = null;
    },
  };
  (app as unknown as { history: DevHistory }).history = api;

  // --- the screens' hooks (app.go): a run's end on the watch, a check-in's settlement ---
  (app as unknown as { devScreen: (s: Screen) => void }).devScreen = (s) => {
    if (!api.auto) return;
    if (s.kind === "death" && !s.kept && !s.from)
      void capture(`D${s.death.depth} ${s.death.verdict === "stall" ? "stall" : "death"}`);
    else if (s.kind === "report") {
      const r = s.report;
      if (s.absence) void capture(`check-in ${span(r.elapsed_s)} · ${r.runs} runs`);
      else {
        const tier = r.banked
          ? "bank"
          : r.stalled
            ? "stall"
            : r.returned
              ? "return"
              : r.deaths.length
                ? "death"
                : "run end";
        void capture(`D${r.deepest ?? app.lineage?.best_depth ?? 0} ${tier}`);
      }
    }
  };

  // --- the panel ---
  const btn = (text: string, on: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = (ev) => {
      ev.stopPropagation();
      on();
    };
    b.style.cssText = "font:inherit;padding:2px 6px;margin-left:4px;cursor:pointer";
    return b;
  };
  function download(e: HistoryEntry): void {
    const file: HistoryFile = { format: "idlever-history", schema: 1, entry: e };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `idlever-history-${e.seed}-${e.id}-${e.label.replace(/[^\w-]+/g, "_")}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  function paint(): void {
    if (!panel) return;
    const list = panel.querySelector<HTMLElement>(".dev-history-list")!;
    const head = panel.querySelector<HTMLElement>(".dev-history-title")!;
    head.textContent = `history · seed ${seed} · ${ring.length}/${RING}`;
    const auto = panel.querySelector<HTMLButtonElement>(".dev-history-auto")!;
    auto.textContent = `auto ${api.auto ? "on" : "off"}`;
    list.replaceChildren(
      ...[...ring].reverse().map((e, i) => {
        const row = document.createElement("div");
        row.className = "dev-history-row";
        row.dataset.i = String(i);
        row.style.cssText =
          "display:flex;align-items:center;gap:6px;padding:3px 0;border-top:1px solid #444";
        const t = document.createElement("span");
        t.style.cssText =
          "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        t.textContent = `${i} · ${new Date(e.at).toLocaleTimeString()} · ${e.label} · $${e.gold} · D${e.best}`;
        t.title = `${e.screen} · ${(e.bytes / 1024).toFixed(0)} KB`;
        row.append(
          t,
          btn("restore", () => void load(i, true, true)),
          btn("branch", () => void load(i, false, true)),
          btn("save", () => download(e)),
        );
        return row;
      }),
    );
  }
  function openPanel(): void {
    if (panel) return;
    void ensure().then(paint);
    panel = document.createElement("div");
    panel.className = "dev-history";
    panel.style.cssText =
      "position:fixed;top:8px;right:8px;z-index:2147483000;width:min(560px,calc(100vw - 16px));max-height:70vh;overflow:auto;" +
      "background:#15151bee;color:#ddd;font:12px/1.4 ui-monospace,monospace;padding:8px;border:1px solid #666;border-radius:4px;box-shadow:0 4px 16px #000a";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px";
    const title = document.createElement("strong");
    title.className = "dev-history-title";
    title.style.flex = "1";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.style.display = "none";
    file.onchange = async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        await api.add(await f.text(), `import ${f.name.slice(0, 24)}`);
      } catch (e) {
        console.warn("history import", e);
      }
      file.value = "";
    };
    const autoB = btn("auto", () => {
      api.auto = !api.auto;
      paint();
    });
    autoB.className = "dev-history-auto";
    top.append(
      title,
      btn("snapshot", () => void api.snapshot()),
      btn("import", () => file.click()),
      autoB,
      btn("clear", () => {
        if (confirm("clear history?")) void api.clear();
      }),
      btn("×", () => api.close()),
      file,
    );
    const list = document.createElement("div");
    list.className = "dev-history-list";
    panel.append(top, list);
    document.body.append(panel);
    paint();
  }

  window.addEventListener("keydown", (e) => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.key !== "T") return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    if (panel) api.close();
    else openPanel();
  });
  if (q.get("dev") === "history") {
    const wait = setInterval(() => {
      if (!app.booted) return;
      clearInterval(wait);
      openPanel();
    }, 100);
  }
  return wrapped;
}
