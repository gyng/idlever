// Queue 42: the watched hero's portrait reacts to what the replay cursor has actually played — never to an event ahead of it.
// Pure (no imports): the watch notes mood events as batches arrive (their engine tick), and each pump asks for the mood at the
// cursor the HUD was released to. Moods below are the portrait's `data-mood`; screens/portrait.css draws them.

export type Mood = "calm" | "attack" | "hurt" | "danger" | "heal" | "win" | "down";
/** Higher outranks lower: a higher mood may take over at once, a lower one waits out the hold. */
export const MOOD_RANK: Record<Mood, number> = {
  calm: 0,
  danger: 1,
  attack: 2,
  heal: 3,
  hurt: 4,
  win: 5,
  down: 6,
};
/** A transient mood's window on the replay clock (engine ticks after its event; 10 ticks a second at 1×). */
export const MOOD_TICKS: Partial<Record<Mood, number>> = { attack: 4, heal: 8, hurt: 6 };
/** A shown mood holds at least this long (wall ms) before a lower or equal one replaces it: no flicker at 8×. */
export const MOOD_MIN_MS = 450;
/** A transient mood never outlives this (wall ms) on a moving cursor, however slow the replay (a paused cursor freezes it). */
export const MOOD_MAX_MS = 1600;
const TERMINAL = new Set<Mood>(["win", "down"]);
const MAX_EVENTS = 96;

/** The minimal event shape the mood reads (the engine's `Ev`, structurally). */
export type MoodEv =
  | { k: "attack"; t: number; src: number }
  | { k: "hurt"; t: number; id: number; dmg: number }
  | { k: "heal"; t: number; id: number; amount: number; src: string }
  | { k: "die"; t: number; id: number }
  | { k: "exit"; t: number; tier: string }
  | { k: string; t: number };

/** The mood an engine event gives the watched hero (`heroId`), else null. `drain`: the hurt is a drain's (hunger, poison) —
 *  no reaction per bite; the low-hp danger carries it. Regen and rest heals are the meters' read, not a reaction. */
export function moodOf(ev: MoodEv, heroId: number, drain = false): Mood | null {
  const e = ev as {
    k: string;
    src?: unknown;
    id?: number;
    dmg?: number;
    amount?: number;
    tier?: string;
  };
  switch (e.k) {
    case "attack":
      return e.src === heroId ? "attack" : null;
    case "hurt":
      return e.id === heroId && (e.dmg ?? 0) > 0 && !drain ? "hurt" : null;
    case "heal":
      return e.id === heroId && (e.amount ?? 0) > 0 && (e.src === "potion" || e.src === "skill")
        ? "heal"
        : null;
    case "die":
      return e.id === heroId ? "down" : null;
    case "exit":
      return e.tier === "death" ? "down" : "win";
    default:
      return null;
  }
}

export type MoodState = { mood: Mood; t: number; since: number };

/** The portrait's mood machine. `note` events (any order); `at(cursor, low, now)` the mood to show. */
export class HeroMood {
  private evs: { t: number; mood: Mood }[] = [];
  private shown: MoodState = { mood: "calm", t: -1, since: -Infinity };
  private cursor = -Infinity;
  private lastNow = 0;
  /** Per transient mood, the newest event tick whose reaction has run its MOOD_MAX_MS (a slow replay never pins it). */
  private spent: Partial<Record<Mood, number>> = {};

  note(t: number, mood: Mood): void {
    let i = this.evs.length;
    while (i > 0 && this.evs[i - 1].t > t) i--;
    this.evs.splice(i, 0, { t, mood });
    // keep every terminal mood; drop the oldest transient past the cap
    if (this.evs.length > MAX_EVENTS) {
      const j = this.evs.findIndex((e) => !TERMINAL.has(e.mood));
      if (j >= 0) this.evs.splice(j, 1);
    }
  }
  /** The mood the events at or before `cursor` call for (`low`: hp under the danger line), with the event tick (−1 none). */
  target(cursor: number, low: boolean): { mood: Mood; t: number } {
    let best: { mood: Mood; t: number } | null = null;
    for (const e of this.evs) {
      if (e.t > cursor) break; // never ahead of the picture
      if (TERMINAL.has(e.mood)) {
        if (!best || MOOD_RANK[e.mood] >= MOOD_RANK[best.mood]) best = e;
        continue;
      }
      const w = MOOD_TICKS[e.mood] ?? 0;
      if (cursor - e.t > w) continue;
      if (e.t <= (this.spent[e.mood] ?? -Infinity)) continue; // it has had its MOOD_MAX_MS
      if (
        !best ||
        MOOD_RANK[e.mood] > MOOD_RANK[best.mood] ||
        (e.mood === best.mood && e.t > best.t)
      )
        best = { mood: e.mood, t: e.t };
    }
    if (best) return best;
    return { mood: low ? "danger" : "calm", t: -1 };
  }
  /** Steps the shown mood to the cursor: a higher-ranked or terminal mood takes over at once; any other change waits until the
   *  shown one has held MOOD_MIN_MS. A cursor that went back (a seek) resets to the state at the cursor, no hold. `frozen`: the
   *  picture is paused or held — the mood's wall clock stops with it. */
  at(cursor: number, low: boolean, now: number, frozen = false): MoodState {
    const back = cursor < this.cursor;
    // a frozen picture (paused, hidden, held) freezes the mood's clock too: nothing ages while nothing plays
    if (frozen && Number.isFinite(this.shown.since))
      this.shown = { ...this.shown, since: this.shown.since + (now - this.lastNow) };
    this.cursor = cursor;
    this.lastNow = now;
    if (back) this.spent = {};
    else if (MOOD_TICKS[this.shown.mood] && now - this.shown.since > MOOD_MAX_MS)
      this.spent[this.shown.mood] = this.shown.t;
    const want = this.target(cursor, low);
    const cur = this.shown;
    if (back) {
      this.shown = { mood: want.mood, t: want.t, since: now };
      return this.shown;
    }
    if (want.mood === cur.mood) {
      // the same mood renewed by a later event: one reaction (no restart in the picture), its clock from the newest event
      if (want.t > cur.t) this.shown = { mood: cur.mood, t: want.t, since: now };
      return this.shown;
    }
    const up = MOOD_RANK[want.mood] > MOOD_RANK[cur.mood];
    if (TERMINAL.has(cur.mood) && !up) return cur; // the run's end stays
    if (up || TERMINAL.has(want.mood) || now - cur.since >= MOOD_MIN_MS)
      this.shown = { mood: want.mood, t: want.t, since: now };
    return this.shown;
  }
  get state(): MoodState {
    return this.shown;
  }
}
