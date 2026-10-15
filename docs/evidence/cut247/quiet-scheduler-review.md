# Quiet scheduler review — 2026-10-16

Agent source review, not an independent gameplay or balance verdict. Reviewed
Cut247 candidate `Game::tick_batch` alongside the normal `Game::tick_inner` /
`turn::tick` path; actual source hashes for the Cut247-only native acceptance
are in `native-check-identity.json`. Cut248 changes require their own identity.

| Normal-tick effect | Quiet-path treatment / boundary |
| --- | --- |
| Departure metadata, manual-in-absence clearing, current floor snapshot | First ordinary tick observes state; a new floor snapshot forces an ordinary tick. Taps disable skipping. |
| History snapshots | Never skip past the next `HISTORY_STRIDE`; the exact boundary receives its ordinary tick. |
| Hearthglass piece loss, regeneration and healing | Cut247 adds piece-count clearing and countdown advancement; explicit heal-period bound leaves heal ticks to the ordinary path. Original omission is proved by the earned red case. |
| Firearm reload completion | Bound to strictly before absolute `reload.at`; ordinary tick completes it before hero action. |
| Pending vault choice | Forces ordinary tick. This field is an automatic pending cache, not retired manual Keep UI. |
| Hero / monster energy and actions | Integer energy uses pre-action bound; speed/hex/slow expiry limits span. Fractional hero pace was omitted: separately scoped Cut248 must correct energy sum and earliest action. |
| Hunger | Floor-clock limit leaves every ten-tick boundary ordinary; hunger period is a whole multiple of ten. |
| Overlay, poison damage, regeneration and auras | Run-clock limit leaves every ten-tick boundary ordinary. Poison durations are aged during quiet spans. |
| Alert / spawning | Floor-clock limit leaves every ten-tick boundary ordinary; alert period is800ticks. |
| Clown / Engineer tools | Live constructs/decoys force ordinary ticks; absent/inactive tools have no per-tick effect. |
| Hero / monster status timers and taunt | Shared `tick_statuses_by` helpers and explicit poison/taunt countdowns; TTL bound leaves expiry/death events ordinary. |
| Facts, visibility, trace foe count | First ordinary tick observes the fixed scene. A genuine quiet span has no movement, actor action, overlay/hunger/alert boundary or tool activity to change visibility. |
| Meters, total turns, timeout / stall | Dedicated quiet-meter advancement and total-turn sum; maximum-turn bound leaves timeout ordinary; stalled games force ordinary ticks. |

No additional gameplay omission was established by this source review. This is
not proof for all possible engine states: focused tests compare full events,
RNG and state, and the earned public-path experiment separately checks actual
outcomes. Petstats' diagnostic EarlyTicks counter is incremented only on ordinary
ticks; this review does not claim that diagnostic counter is a gameplay invariant.

Revalidate this map whenever per-tick effects, periods, state transitions or
quiet eligibility change. Do not treat it as permanent scheduler acceptance.
