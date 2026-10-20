# Cut291 — explain missing Throw permission accurately

Owner: continue backlog. Cut290 proves packed fire + gas-step variant rows can
remain unused on Fighter without Throw, then execute after a real3-mark unlock.
Execution already gates on Rogue Throw OR general throw unlock. block_reason's
throw arm only checks item/foe, then reports no line even when permission is the
actual failure. Keep the existing action gate, prices and package behavior.

## Contract before implementation

1. Reproduce on the two earned Cut290 sword/three-fire, variant1 parents for
   exactly50 watched ticks, before/after the actual Throw purchase. Export source,
   full prefix events, trace row reasons and after-save/native identity. Missing
   permission must report `not learned` (two words), gloss `learn Throw first`;
   authorized rows must retain actual item/target/line reasons or fire normally.
2. Add controlled public-engine regression cases covering Fighter missing
   permission, Rogue natural permission, Fighter global unlock, and authorized
   missing item/no foe/out-of-range. Demonstrate the missing-permission assertion
   fails on original core before fixing it. No unit grants are called earned play.
3. Share one readonly permission predicate between throw execution and its reason.
   Preserve the boolean gate exactly; no new item/class/ability/level/damage/RNG
   behavior. Register the new reason/gloss in the existing diagnostic vocabulary.
4. Earned before/after50-tick physical outputs and complete saves must match after
   ONLY normalizing the explicit new refusal/gloss text (including reason-map
   keys) back to the old text. Export actual differences; never normalize HP,
   Gold, RNG, ownership, counters or other values. Learned cases remain byte-exact.
5. Focused regressions, relevant existing reason/throw tests, warnings-denied
   Clippy and routine quick checks. Rebuild current WASM, repin native settlement
   evidence without expected-save regeneration unless an inspected explanation
   change specifically requires a scoped amendment; prove actual public-WASM
   locked/unlocked reasons on the same earned inputs. No gameplay balance/full/
   exhaustive/fun/deployment acceptance is inferred from this diagnostic fix.

Core changes only failure explanation/vocabulary. Held W2/recovery/Guide defaults,
Cut289 rejection, placement/content and actual Throw availability remain unchanged.
Use a NEW isolated target/cut291-native, with fast profile's configured incremental
cache retained for the red/green loop. This avoids reusing the old shared target;
actual build/probe hashes and output checks remain mandatory. It is not a claimed
compiler speedup without a controlled comparison.
