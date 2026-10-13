# Cut191 — automatic loot and reusable builds

Owner resumed the entire queued implementation on2026-10-13. This cut starts
items1–4,19,26–27 of WORK_QUEUE.md. All other queued items and retained content
remain in scope; this cut is not completion of the full goal.

## Owner amendments and chosen model

- Found loot converts automatically into the existing Gold currency. Routine
  outcomes have zero Keep confirmations and no storage sorting requirement.
- Prepared/brought items do not become loot income. Permanent starting gear is
  reconstructed from owned forge upgrades; unused selected supplies are retained.
- Unlocked items are free to prepare, use, replace and restock, including
  consumables/leashes. Gold purchases permanent unlocks/upgrades, not usage.
- Build choices stay optional and easy to change. Class/slot limits and meaningful
  tradeoffs replace a per-delve money budget; stats grow/change more slowly.
- The simple exit target is: returning alive credits all remaining carried Gold
  and found-loot value; death loses unprotected carry/finds and retains secured
  checkpoint Gold. Banking and return do not use competing percentage shares.
  Existing checkpoint security is preserved. A deliberate stop policy will be
  reviewed separately so healthy heroes can test builds meaningfully.
- Forge prepares permanent capabilities; Bloodline Loadouts selects reusable kits.
  Storehouse/keeper/armourer must be removed or given a real remaining purpose;
  hiding their UI while leaving unreachable progression is not acceptable.
- No backwards compatibility/migration is required. Historical raw evidence
  remains immutable. New rules supersede old usage-fee/keep-choice/60%-return
  assertions; unrelated determinism, accounting and absence safety do not change.

## Delivery stages and gates

1. Free preparation: every eligible catalogue item has zero use price; unknown/
   locked items still reject. At zero Gold, test identified and forge-unlocked
   potion/scroll/weapon, leash, authored repeated choices and automatic package
   packing. At least3 repeated delves must retain intended slot ownership with
   zero preparation spending. Removing/readding/clearing never earns Gold.
   A permanent forge upgrade still charges once, rejects insufficient funds,
   and applies on subsequent zero-Gold delves.
2. Automatic conversion:12 bank/return/death cases across weapon, armour,
   consumable and cage finds plus merged found/prepared leash quantities. Gold,
   fractional carry, forge discovery, report quantities and fates reconcile
   exactly; brought gear yields zero conversion income. Zero pending Keep
   decisions after real outcomes. Repeated reads, reports, settlement calls and
   save/reload cannot pay twice. Unknown names do not leak hidden facts.
3. Simple exits: matched bank/return cases retain100% of returned carry/finds;
   death retains only secured checkpoints under the selected model. Preview,
   logs, death/report and journal agree on those exact totals and cause.
4. Loadouts/forge: reusable choices with explicit effects and permanent unlock
   prices. At least2 earned Fighter kits at the same wall have different
   strengths/weaknesses; both remain usable at zero Gold. Leash access is a clear
   permanent preparation unlock. No Storehouse sorting or redundant Keeper fee.
5. Progression: measure first-session unlocks and decision counts across fixed
   seeds; write numeric pacing changes from those baselines before tuning.
   Scout stays within the first-session15min/5-manual-delve bounds unless a
   further explicit design amendment changes that target. First-run new choices
   are staged rather than simultaneously exposing every subsystem.
6. Native one/three-hero whole, sliced and serialized/reloaded8h catch-up produce
   the same authoritative outcomes, transactions and replay metadata. Apply
   current-game regression gates after tuning; preserve failures and distinguish
   old superseded money/keep expectations from genuine regressions.
7. Real-WASM mobile400/desktop1440 journeys prove no keep interruption, free
   reusable Loadouts, accurate reports and forge prices. Post milestone
   screenshots. Routine current client audit and release validation must pass
   before shipping; a targeted pass is not whole-game acceptance.

## Status

First free-preparation slice passes all seven targeted native tests, including
actual healing consumption and free refill across three delves. The integrated
workspace native audit passes829 tests with6 explicit ignored tests; Clippy
passes with warnings denied. Raw results remain in scratchpad/cut191/
(native-integrated.log, free-tests-final.log and clippy-final.log). Old fee
assertions were amended under the owner's explicit rule, preserving eligibility,
slot ownership, quantities, provenance and ledger reconciliation. The original
805-pass/24-fail audit remains preserved as native-all.log.

The real-WASM worker check passes73 assertions, including three actual
consume/retreat/refill delves and a genuinely paid permanent upgrade. See
docs/evidence/cut191/worker-free-preparation.md. Final exact-source fastWASM
rebuild passes (6414194bytes). The integrated free-preparation, ui-clarity,
chronicle-unit-labels and death-actions groups pass4/4 in8.6s on that package.
Broader economy stages remain pending. Found
loot still uses the older Keep/Storehouse path, and alive returns still retain
60% of unprotected carry. No automatic-conversion, simple-exit, balance or full
queue acceptance is claimed. The older Cut140 useful-item retention proposal
is superseded by the owner currency model.
