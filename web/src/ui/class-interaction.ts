import type { Ev } from "../engine/types";

type Interaction = Extract<Ev, { k: "class_interaction" }>;

/** Arming/using a charge is distinct from the eventual applied benefit. */
export function classInteractionText(event: Interaction): string {
  // Shatter Ward consumes a real timer, rather than one combo-charge count.
  if (event.effect === "ward" && event.phase === "consumed")
    return /* copy:label */ `Ward −${event.amount}t`;
  if (event.phase !== "applied") {
    const phase = event.phase === "armed" ? /* copy:label */ "Armed" : /* copy:label */ "Used";
    const remaining =
      event.expires_t === undefined ? "" : ` · ${Math.max(0, event.expires_t - event.t)}t`;
    return `${phase} ×${event.amount}${remaining}`;
  }
  const amount = event.amount;
  switch (event.effect) {
    case "bash_cooldown":
      return /* copy:label */ `Bash −${amount}t`;
    case "vanish_cooldown":
      return /* copy:label */ `Vanish −${amount}t`;
    case "shadowstep_cooldown":
      return /* copy:label */ `Shadowstep −${amount}t`;
    case "double_shot_cooldown":
      return /* copy:callout */ `Double shot −${amount}t`;
    case "ward_cooldown":
      return /* copy:label */ `Ward −${amount}t`;
    case "nova_cooldown":
      return /* copy:label */ `Nova −${amount}t`;
    case "blink_cooldown":
      return /* copy:label */ `Blink −${amount}t`;
    case "fast_reload_cooldown":
      return /* copy:callout */ `Fast reload −${amount}t`;
    case "melee_block":
      return /* copy:label */ `Guard ${amount} hp`;
    case "damage":
      return /* copy:label */ `Damage +${amount}`;
    case "range":
      return /* copy:label */ `Range +${amount}`;
    case "mark":
      return /* copy:label */ `Mark +${amount}t`;
    case "slow":
      return /* copy:label */ `Slow +${amount}t`;
    case "ward":
      return /* copy:label */ `Ward −${amount}t`;
    case "vanish":
      return /* copy:label */ `Vanish ${amount}t`;
    case "chamber":
      return /* copy:label */ `Chamber +${amount}`;
    case "aim_settle":
      return /* copy:label */ `Aim −${amount}t`;
    case "energy":
      return /* copy:label */ `Energy +${amount}`;
  }
}
