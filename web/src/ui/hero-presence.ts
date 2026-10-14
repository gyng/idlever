import type { HeroSlot, LiveRun } from "../engine/types";
import { spanOf } from "./dom";

export type ObservedPresence = { slot: number; live: LiveRun; ended: boolean };
export const heroAway = (s: HeroSlot, observed?: ObservedPresence): boolean =>
  (s.life_state ? s.life_state === "away" : s.state === "live") ||
  // A freshly stepped Rust snapshot can precede the next roster refresh.
  // Only this exact prepared run may replace its older Ready summary.
  (s.life_state === "ready" &&
    s.live?.turn === 0 &&
    observed?.slot === s.id &&
    observed.live.heir === s.heir &&
    observed.live.run_id === s.live.run_id &&
    observed.live.turn > 0);
/** Presentation data may replace an older summary only for the exact live hero/run. */
/** Blind ad71e72 (A: `Resting 20m` beside a hero a tap had just sent; B: "rest timers bypassed by SEND"): the rest is the wait
 *  until the next automatic send, which a send skips — it reads as that wait (`Departs 20m`), never as a state a send breaks. */
export function heroPresence(s: HeroSlot, observed?: ObservedPresence) {
  const away = heroAway(s, observed);
  const recovering = s.life_state === "recovering" || s.life_state === "reincarnating";
  const useObserved =
    away &&
    observed?.slot === s.id &&
    observed.live.heir === s.heir &&
    (!s.live || (observed.live.run_id === s.live.run_id && observed.live.turn >= s.live.turn));
  const live = away ? (useObserved ? observed!.live : s.live) : undefined;
  const activity = !away
    ? (s.life_state ?? s.state)
    : useObserved && observed!.ended
      ? "ended"
      : (live?.activity ?? "unknown");
  const names: Record<string, string> = {
    combat: /* copy:label */ "In combat",
    returning: /* copy:label */ "Heading home",
    exploring: /* copy:label */ "Exploring",
    ended: /* copy:label */ "Run ended",
    unknown: /* copy:label */ "Delving",
  };
  const text = recovering
    ? s.life_state === "reincarnating"
      ? /* copy:label */ `Cloning ${spanOf(s.recovery_s ?? 0)}`
      : /* copy:label */ `Recovering ${spanOf(s.recovery_s ?? 0)}`
    : away
      ? live
        ? `D${live.depth} · ${names[activity] ?? names.unknown}`
        : /* copy:label */ "Starting run"
      : s.state === "rests" && s.rest_s > 0
        ? /* copy:label */ `Departs ${spanOf(s.rest_s)}`
        : /* copy:label */ "Ready";
  return {
    text,
    activity,
    detail: live ? /* copy:label */ `${live.hp}/${live.max_hp} hp · run ${live.run_id}` : text,
  };
}
