# Cut253 — advanced paths for the five original classes

Implementation contract,2026-10-16. This carries forward the owner requirement
in WORK_QUEUE.md and the full extension specified in
[Cut225](CUT225_CLOWN_ENGINEER.md#larger-trees-for-the-five-existing-classes).
It does not replace that extension with the completed painted equipment figure,
the existing new classes, or a recursive tree renderer. Those are separate work.
Status: contract only; no new native effects, points or earned-play claims yet.

## Required content and compatibility

Fighter, Rogue, Ranger, Caster and Gunner each have12nodes: the existing6, four
third-tier interactions and two fourth-tier capstones. Combined with unchanged
six-node Clown/Engineer trees the catalogue contains72nodes. Every old ID,
parent, bit0–5, gate, effect, icon and unselected-policy ordering remains intact.
Append bits6–11 in the following order; names, parents and initial interaction
numbers are the corresponding Cut225 table entries, not new passive bonuses.

| Class | Bits6–9, third tier | Bits10–11, fourth tier |
| --- | --- | --- |
| Fighter | rally, oathguard, opening_cut, siege_rhythm | holdfast, execution_arc |
| Rogue | afterimage, tell_thief, veiled_route, patient_ambush | ghostwalk, silent_finish |
| Ranger | spotter, quiver_thread, corridor_volley, split_mark | patient_snare, moving_line |
| Caster | chilling_charge, storm_cell, ice_lock, shatter_ward | conduct, last_wall |
| Gunner | rangefinder, chamber_chain, smoke_walk, cycling_breach | long_watch, breach_route |

Stable IDs retain the existing `<class>_<slug>` convention. Every node has one
specific parent from Cut225. No OR-parent solver or new specialization purchase.
Preserve Sentinel/Hexbinder and the existing L1/3/5/7/9 ability ladder. Do not
raise the class cap or change early XP to fund these choices.

## Earned stages

The old budget remains `min(class_level − 2,6)`, saturating at zero. The four
additions are cumulative and require the hired Scout plus all preceding stages:

| Stage | Personal class level | Personal historical depth | Completed personal delves | Added picks |
| --- | ---: | ---: | ---: | ---: |
| Advanced introduction | 9 | 23 | 24 | 1 |
| Second advanced pick | 10 | 28 | 32 | 1 |
| Capstone introduction | 10 | 29 | 48 | 1 |
| Late mastery | 10 | 33 | 64 | 1 |

Completed delves are the saturating sum of the existing personal banked,
returned and died counters; another resident's runs or shared-town best cannot
qualify this resident. Use `legacy::deepest` for personal historical depth.
The maximum budget is10of12, with no Gold cost, purchased point, new currency,
death requirement, clock-only award or repeated-click award. Reads grant nothing.
Third-tier nodes require introduction; fourth-tier nodes require capstone stage.
Reset/rebirth retains earned history; class switching reads that class's XP.

Rust returns next-pick requirements/progress. The client must stop assuming
that `level+1` alone earns another pick: once six are spent, advanced eligibility
also depends on Scout, depth and actual completed delves. Introduce one bounded
advanced-tree milestone for the selected class, with a Journal→Skills route.
Do not announce20nodes or five classes simultaneously.

## Actual interactions and frozen state

Implement all30Cut225 interactions with their actual qualifying actions and
tradeoffs. A refused verb, miss, selected row or unobserved boss does not count
as the successful action named in that interaction. A charged follow-up is
consumed once; repeat rows cannot stack or refresh it beyond its stated cap.
Energy refunds cannot exceed the action's actual debit and cannot create an
unbounded same-tick action loop. Chamber recovery cannot exceed capacity or
recover an unspent round. Existing cover, range, committed-target, reflection,
shield, poison and boss mechanics remain authoritative.

Store any needed bounded combo state on the actual actor, with backward-safe
serde defaults. Expiration, consumption, target/sequence identity and any
once-per-cast receipt survive whole/sliced/reloaded catch-up. No new state or
RNG draws for a hero with no advanced nodes. Existing active masks remain frozen
until the next departure; away purchases/resets are refused without save changes.

Validate every ancestor recursively for availability, compiled tactics and
frozen mask. A stored child plus an invalid/missing grandparent grants no effect.
More-specific descendant tactics precede their parents; equal-depth siblings
retain authored order. With no advanced node selected, compiled old tactics and
all their masks remain exact. Reuse legal verbs and condition vocabulary; any
new condition needs Rust validation before exposure. Emit named evidence only
when the interaction actually happens, so action selection is not mistaken for
a successful combo. Receipts must identify the real actor and applicable target.

## Numeric acceptance and delivery

1. Catalogue: exactly12nodes/old class,2roots, maximum chain4;30new uniqueIDs,
   30new individual insignias, all old30icons/IDs/bits intact. Icons have primitive
   fallbacks and are legible at24/32/48px in learned/available/locked states.
   Cut252 recursively presents current/Full tree; no third/fourth-tier orphan.
2. Stage boundaries: below/at every level/depth/run count and Scout requirement,
   with0Gold, no death, class switch, reset and3differently progressed residents.
   Reads/refusals preserve whole saves; reset preserves gear, traits, Gold,
   family commitments and earned catalogue history. Maximum budget10, never12.
3. Thirty controlled causal interaction cases, one per new node, each paired
   against the same seed/HP/gear/facts/ticks without that node. Cover actual
   success, miss/refusal/no-trigger, expiration, repeated attempt and consumption.
   Include exact energy debit caps, range/LOS, one-hit/one-cast limits and chamber
   capacity. Do not substitute a damage-summary assertion for the interaction.
4. At least one actual earned paired8h comparison per original class, with
   selected/no-selection saves, floors, survival, wasted actions, named triggers
   and outcome. Demonstrate a descendant interacting with its parent. Three
   genuine cohort seeds establish staged availability; one surviving public-action
   hero reaches all four stages without a defeat being required.
5. Whole/split/reload byte equality with an active expiring charge, a consumed
   charge and Gunner chamber receipt. Watched/offline/replay events and complete
   saves agree; no extra Gold, physical loot payout or repeated converted value.
6. Real-WASM one journey per extended tree and shared402×681/1440×900 normal/
   200% layout review: truthful parent edges, canonical picks/blocks, learned
   parent retention, cancel/learn/reset, away read-only and owner guards, usable
  44px controls, no horizontal overflow. Bounded images/feedback retain date,
   context and revalidation triggers. No fabricated earned saves.
7. Native workspace fast tests/Clippy, exact rebuilt WASM/settlements and relevant
   client journeys pass. Retain the existing16-seed IDLE progression/Gold/King,
   PICKED value/outpace, Scout/manual construction and system-removal thresholds;
   then current routine full. Existing bots do not auto-learn advanced nodes:
   unchanged-bot success establishes optionality, not chosen-path value or fun.
   Final exhaustive and independent fun requirements remain in the full ledger.

Implementation may begin with one complete class and then extend the same
bounded hooks to the other four, but all five and all30interactions remain
required. Record rejected tuning and exact runtimes; never reduce this scope or
weaken gates to obtain a pass. Revalidate after mechanics, staging, save/charge
semantics, compiled row order, masks, wire, icons or tree interactions change.

Current work must not compile, rebuild WASM or launch browsers during the
exclusive Cut245 GPU control/candidate lane. Resume implementation checks after
its actual handles are positively terminal; do not infer that from stale files.
