# The pen arrives earlier: the stall fallback 120 h → 8 h (owner, 2026-10-17)

**Change.** `crates/idlever-core/src/balance.rs` (`unlocks.pen_fallback_h`): **120 → 8**
hours, with `tuning/balance.json` mirrored (the sweep base profile is documented as matching
the shipping default, `docs/CUT61_PACING_REVIEW.md:25`).

**Why.** Three of three blind raters named the closed pen as their top gripe
(`docs/evidence/eval-2026-10-16/blind-a-triage-2026-10-16.md`): the game's own verb — writing
rules — was reachable only by meeting the Bloat Mother or after five days of lineage age, and
nobody met either inside a rating session. The owner asked for it earlier.

**The mechanism, so the next reader knows what the number does** (`crates/idlever-core`):

- The pen's *system reveal* is the gate. `systems.rs:176` — a system is ready when
  `triggered(...) && age >= min_age_h()` **or** (`fallback_h() > 0 && age >= fallback_h()`);
  for the whole `PEN` group the trigger is `pen || mother_met(l)` (`systems.rs:124`) and
  `min_age_h()` is `hours.pen = 0`, while `fallback_h()` is `pen_fallback_h`
  (`systems.rs:47-50`).
- The pen group is **free** (outside the one-a-report reveal budget) only when `pen_due`
  fires, i.e. the Mother was met (`systems.rs:206-210`); the fallback path still waits its
  turn in the queue — one report, the group together.
- `packages::update_pen` flips `pen_open` once that system is revealed (`packages.rs:1172`),
  and `systems::update_inner` also opens it directly (`systems.rs:295`).

So at 8 h the pen lands on the **first night**, level with `bank`'s age gate and ahead of
quests (12) / class (16) / start (20) / tactic2 (56) / automations (96), with the Mother met
still the instant path. Nothing else changed: no other system's hours, no trigger.

**What this does not do.** A cold 40-minute session still cannot reach it — the gate is
lineage *age*, and 40 minutes is 0.7 h. If the pen should be reachable inside a first
session, the lever is the **trigger** (an earlier milestone than the Bloat Mother), not this
number. That is a design call, deliberately not taken here.

**Verification.**

- `tuning/balance.json` parses and reads 8 (`node -e`).
- `cargo test -q --workspace --profile fast`: **1055 passed, 0 failed, 6 ignored**. Two tests
  pinned the old contract and were updated to the new one rather than re-pinned blindly:
  `tests_cut30_pkg::the_pen_writes_nothing_until_it_opens` now asserts the pen waits *before*
  `pen_fallback_h` and opens at it (values read from balance, so they cannot drift), and
  `custom_rule_lock_explanation_matches_core_gate` derives the copy it checks
  (`"or {fallback}h elapsed"`) from the same field. The client needed nothing: the lock chip
  renders core's `pen_needs` (`web/src/ui/packages.ts:1147`).
- The sanctioned post-balance check is the pacing pack
  (`node tools/gates.mjs --pacing`, ~51 min per `docs/ITERATION_SPEED.md`); it must be run on
  this source, and so must the exhaustive audit, because a balance edit invalidates leg
  caches. The exhaustive run that was in flight when this landed certifies the *pets
  tolerance* on the pre-change source and nothing about the pen.
- Watch the clauses that could move: `tuned-picked` (TUNED ≥ 1.15× PICKED at D33 — an
  earlier pen gives TUNED more pen time, so it should hold or improve), the `pen` leave-one-
  out row (TUNED vs TUNED − pen, sign unchanged), and `nothing-required` / the IDLE rows
  (IDLE writes no rules, so it should be untouched). **Corrected 2026-10-17:** not untouched. Once the pen
  opens, `packages::lever()` returns `None` (`packages.rs:1393`) for every player, IDLE
  included, so the death screen's cheapest lever now disappears after about 8 h instead of
  day 5; `counter_offer` (`packages.rs:916`) and forecast pricing (`forecast.rs:419`) also
  switch at 8 h. Pacing 24/24 still passes on this source; the new-player death-screen
  experience is unchecked. `each-system`'s `pets` clause now carries
  the owner's ±2-point tolerance (`pets-clause-finding-2026-10-16.md`).
