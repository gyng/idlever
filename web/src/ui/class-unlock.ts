// Cut225: a class earned (Clown, Engineer — `Lineage.earned_classes[].available`, Rust's own gate) is announced once on the camp:
// a herald plate with the class's symbol, `Clown unlocked`, for a few seconds. One class at a time, the next when its plate is gone (if the camp is still up), never
// the same class twice for one lineage (per lineage seed, browser storage, as the reveal ladder keeps its steps). Without storage
// it still says each class only once in this session. The plate is a status, not a control: the class is chosen in the picker.
import type { App } from "../app";
import { h } from "./dom";
import { classIcon } from "./class-icons";

const KEY = "idlever.class-unlocks";
const SHOW_MS = 4200;
const session = new Set<string>();

function stored(seed: number): Set<string> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as {
      seed: number;
      classes: string[];
    } | null;
    return new Set(s && s.seed === seed ? s.classes : []);
  } catch {
    return new Set();
  }
}
function store(seed: number, classes: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ seed, classes: [...classes] }));
  } catch {
    /* per-viewer convenience */
  }
}

/** The earned classes Rust opened that this lineage has not been told of yet (oldest first). */
export function unannouncedClasses(app: App): string[] {
  const L = app.lineage;
  if (!L?.earned_classes?.length) return [];
  const seed = L.seed ?? 0,
    told = stored(seed);
  return L.earned_classes
    .filter((e) => e.available && !told.has(e.class) && !session.has(`${seed}:${e.class}`))
    .map((e) => e.class);
}

/** Announce the first unannounced earned class, once; returns the plate (null when there is nothing to say). */
export function announceClassUnlock(app: App): HTMLElement | null {
  // one plate at a time: a second class waits for a paint after the first plate is gone (never replaces it unread)
  if (typeof document === "undefined" || document.querySelector(".class-unlock")) return null;
  const [cls] = unannouncedClasses(app);
  if (!cls) return null;
  const seed = app.lineage.seed ?? 0,
    told = stored(seed);
  told.add(cls);
  store(seed, told);
  session.add(`${seed}:${cls}`);
  const name = cls.charAt(0).toUpperCase() + cls.slice(1);
  const plate = h(
    "div",
    { class: "class-unlock", role: "status", "aria-live": "polite", "data-class-unlock": cls },
    classIcon(cls),
    h("span", {}, /* copy:callout */ `${name} unlocked`),
  );
  document.body.appendChild(plate);
  setTimeout(() => {
    plate.remove();
    // a second class earned at once follows its plate while the camp is still up (the camp's dispose clears a plate it leaves behind)
    if (document.querySelector("main.camp")) announceClassUnlock(app);
  }, SHOW_MS);
  return plate;
}
