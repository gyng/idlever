# Cut196 — one loot value, reusable builds

Next implementation stage of Cut191; not implemented or accepted yet.
Owner priority: try builds and see how far they get, without Keep or recurring
item fees. Free preparation is implemented in5f31e378. This cut addresses the
remaining currency and ownership model before deeper saved kits.

## Audited model

Non-Gold pickups already add item value to carried Gold via `Run::loot_add`.
Current exit salvage can pay again. Use one value at pickup, carried through
checkpoint and exit accounting; do not add another automatic salvage payment.
Returning found objects become converted/discovered provenance, not stored
instances or another Gold receipt. Prepared and brought items never produce
conversion income. Preserve truthful known names and actual quantities.

Alive Bank and Return credit100% of remaining carry plus secured Gold. Death
retains secured Gold and any explicitly named existing build protection, such
as a pet's actual fetch. This amends Cut191's literal secured-only target to
preserve meaningful protection builds. Keep `yield_pct` separate for XP and
renown: Return XP remains60%. Timed-out/driven returns and wake grants need
explicit disposition before claiming a consistent financial model.

## Accounting risks that must be fixed

- `turn.rs::descend` currently secures `loot` and resets it without adjusting
  `loot_raw`. A later pickup can recreate secured Gold. The deprecated scout
  carry branch has the same issue. Keep fractional raw remainder.
- Subtracting secured raw alone is insufficient: later theft or swapping of an
  already secured found item can subtract unrelated new carry. Establish a
  persistent monetary basis or a final conversion rule that handles this.
- Secured physical items can enter death bones. Recovering them must not pay
  their already converted/secured value again. Define that provenance before
  changing settlement.
- Ordinary leash pickup adds5 once per stack; cage uses6 per unit. Choose one
  valuation and apply it to genuine found units only. Prepared units merged
  into that stack have zero monetary basis.

## Numeric gates

1. Carry17 plus secured8: Bank and Return credit25; Death credits8 before
   separately named protection. Event, preview, ledger and report agree.
2. Raw43 checkpoint secures10 and preserves remainder3. Pickup raw5 produces
   2 new coins: total12, never22. Repeated checkpoints never mint Gold.
3. Secure an item, then pick up new carry and lose/swap the secured item:
   secured Gold stays unchanged and unrelated remaining carry is not deducted.
4. Recover secured bones: lifetime income from an item is never credited twice.
5. Prepared leash2 merged with found leash3: only3 units are converted or
   discovered; prepared remainder creates0 income. Repeat removal/refill
   remains free and keeps instance ownership exact.
6. Four categories across Bank/Return/Death give12 settlement cases, plus cage,
   equipped weapon/armour, bow-swap, unknown-flavour and protection cases.
   Pending Keep count is0 after actual outcomes; repeat reads/reload pay0 extra.
7. Reports show credited Gold in the actual home destination; converted-find
   counts are not a second receipt. No fictitious per-item value reconstructed
   from modified items. No unknown-name leak.
8. One/three heroes: whole, sliced and save/reloaded8h catch-up have identical
   money, item ownership and event histories. Replay determinism remains.

## Progression and UI dependencies

Remove obsolete Storehouse/keeper progression and the armourer's vault/insurance
role, or implement a useful new role in this cut. Hiding dead nodes is not a
solution. Measure earned first-session pacing after accounting corrections
before adding arbitrary unlock delays. Keep prompt Scout access and stage new
build choices. Current statistical gates remain explicit; amend only genuinely
superseded money/Keep expectations, never unrelated accounting or privacy.

The first Bloodline management window can reuse `town.ts::openHero` with
Loadouts, Class and Legacy tabs. Existing Class/Legacy behavior stays cumulative
and Rust-owned. Extract preparation from `camp.ts::paintSupplies`; guard async
catalogue results by selected hero. Forge retains permanent purchases.

Full saved builds need new Rust ownership/selection and atomic named-kit APIs.
Current `loadout(itemIds)` selects vault instances; it is not permanent starting
gear selection. Branch upgrades currently accumulate rather than select saved
alternatives. Do not disguise these limitations with a renamed tab.

## Status

Read-only audit complete; implementation, pacing and validation pending. No
full queue, current-game balance or fun acceptance follows from this document.
