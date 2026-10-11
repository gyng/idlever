# Cut140 — reduce routine keep interruptions

Preparation only, 2026-10-11. Owner feedback: “Gear keeping feels like busywork... Are items converted into some currency instead?” Salvage already pays gold and advances kind-specific forge progress. No second currency is needed. Independent d34605e sessions are still live; do not change their product, read their unfinished opinions, or claim this refinement delivered. Fresh locked evidence may reorder this work.

## What the existing code establishes

- `engine.rs::exit_pending_wire` exposes a core decision flag and the existing order's proposed keep ids. `keep_is_a_decision` currently asks on a higher-value same-category find when storage is full, or more gear finds than free slots. Thus an obvious same-kind enchantment upgrade may still interrupt a watched exit.
- `watch.ts::finish` opens a blocking sheet when that flag is true. Otherwise it invokes Rust `auto_keep`, refreshes the lineage and names retained finds. Storage capacity is read fresh at exit; do not reinstate the old double-count of gear brought on the run.
- `auto_keep_plan` returns brought gear first, then the standing order's preferred category and fallback. It upgrades only weaker stored items of the same category, protects stored other-category items and honors `none`. `auto_keep` removes its planned evictions before settling. Manual `keep_settle` and automatic settlement are not interchangeable: the manual path can evict by overall value after an explicit pick.
- `salvage_paid` uses the quoted per-item coins, keeps fractional gold in `gold_carry`, updates forge counts and report reconciliation. Death at0% still advances forge progress but must not advertise a gold sale. Restock, identification/found names and brought-item bookkeeping also occur in settlement.
- The existing keeper already suppresses the decision sheet. Its current definition requires2 manual keep/sell acts, costs20 tenths of a forge unit and has a30-hour fallback after the storehouse gate. `keep` and `sell_vault` count the chore; `auto_keep` does not. Do not misread20 as the act count, strand an old keeper or charge for an automation that became redundant.

## First bounded delivery to measure

Classify saved pending-exit cases before altering a predicate. First reduce obvious same-kind upgrade confirmations and redundant room-contest confirmations where the existing standing order already determines the result. Preserve genuine conflicts between distinct loadout choices and the keeper's ability to settle those without interruption. Keep manual review available; retaining a find is storage, never silent equipment. No new value heuristic based only on resale price may claim one weapon kind universally dominates another.

Use twelve cases: empty storage; zero slots; free slot/one find; several same-kind finds exceeding capacity; full storage/same-kind enchantment upgrade; full storage/weaker same-kind find; full storage/distinct-kind alternative; preferred-category plus fallback competing for one slot; brought gear at capacity; `none`; owned keeper; paused keeper. Run each at bank/return/death tiers (36 settlement cases). Include a protected stored consumable and rounded-down fractional salvage in relevant cases. Record the exact baseline choice, UI interruption, retained/evicted ids, gold/carry, forge counters, reports and worker state; preserve losing/ambiguous cases.

Numeric gates before accepting implementation:

1. Zero mandatory keep-sheet confirmations in the six clearly routine cases (empty/zero/free-one/same-kind excess/same-kind upgrade/weaker same-kind). The explicit distinct-kind conflict remains reviewable; no silent loss of the alternative claimed protected by the chosen order.
2. All36 automatic outcomes reconcile exactly with their explicitly specified existing-order baseline: retained/evicted ids, gold, fractional carry, forge counters, identified/found names and report fates. Changing a true manual choice needs its own documented expected outcome, not an assumed equivalence with `auto_keep`.
3. Keeper owned/paused/legacy states remain valid;2-act manual/sale and30-hour fallback behavior do not become unreachable. Record a concrete remaining keeper benefit for the conflict case. No new hire fee for redundant behavior.
4. One/three-hero whole8h, sliced8h and serialized-reloaded8h settlement parity: exact game truth and replay metadata, no duplication of currency/items or extra silent equip. Include an old save stopped at the keep sheet.
5. Phone400/desktop1440 public checks show retained finds and actual salvage gold without a blocking routine sheet, and manual choice still works. Save cancellation/focus/continue and absence safety remain intact. Post paired screenshots; distinguish fixtures from earned play.

Run existing keep/order/salvage tests and focused client keep checks first, rebuild the real WASM after core edits, then the required native/current-game and client checks. Do not weaken worker, idle/engagement or reconciliation gates. Discovery measurements and implementation remain pending until the frozen cohort finishes; these numeric requirements are prospective, not baseline results or balance certification.
