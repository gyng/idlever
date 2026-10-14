# Cut211 — persistent heroes and deliberate rebirth

## Existing truth

Each bloodline already owns its class XP, cumulative class tree, Legacy wallet
and branches, kit records, traits and pets. Ordinary death nevertheless calls
`LineageState::new_heir`: it changes the generated given name, rerolls traits and
temperament, and starts another hero-history record. Death recovery is currently
20 game minutes and manual Send bypasses it. Legacy roots give health (+3 HP per
rank), damage (+1 per rank) and armour (+1 per rank), with escalating earned
Legacy prices; the whole allocation can currently be refunded at every visit.
Dungeon ascension is a separate bottom-of-dungeon reset of gold/progression.

## Owner amendment 2026-10-14 — death recovery 600 → 12000 ticks

Death (and rebirth) recovery is now **12000 ticks (20 game minutes, the old
wake)**, `persistent::RECOVERY_TICKS` (also `engine::WAKE_TICKS`). The 600-tick
(60 s) recovery below let PICKED brute-force deep walls by dying repeatedly, and
the hard Cut30 invariant "TUNED beats PICKED by ≥15% at D33" fell to 1.00 (Cut227
bisect: a327b8dd). The owner chose a longer recovery over weakening the gate.

Recovery above ten minutes exposed a bypass: the absence's carried-rest cap
(`REST_CARRY_TICKS`, 10 min) also trimmed owed recovery. The cap now trims
ordinary rest only. Search on the fixed source (TUNED/PICKED 16 seeds; routine
"Workers pay the away player"; qa forecast-vs-sends): 7500 1.00 FAIL; 9000 1.17,
qa FAIL; 10500 1.17, workers and qa FAIL; 11250 1.17, workers FAIL; **12000 1.17,
all PASS** (3000/6000 ≤1.07 FAIL). 12000 is the shortest tested value passing
the three rows above. The routine IDLE "Stance L5 by day 7" median then read 8
on its two seeds (16 seeds: 7), since fewer runs fit a day; content was tuned,
not the gate: package L5 needs 200 runs (was 220; `LEVEL_RUNS`). Evidence: `docs/evidence/cut227/recovery/`. Recovery copy
reads minutes (`Recovering 20m`). The text below keeps the original 600-tick
contract as history; each "60 seconds"/"600 ticks" now means `RECOVERY_TICKS`.
Acceptance item 2 reads: Send refuses with one tick remaining; zero enables it.
Controlled client fixtures at the new value: `docs/evidence/cut227/recovery/fixtures/`.

## Ownership and ordinary defeat

One persistent hero belongs to each existing bloodline slot. Stable actor identity
is seed plus bloodline ID; incarnation (`heir` internally) counts ordinary deaths
and deliberate rebirths, not replacement people. A hero has one editable name
(1–32 trimmed characters, no control characters), initially the existing first
incarnation's full name. Renaming at home costs nothing and cannot rewrite the
recorded name of an earlier run/death. Slots remain independent.

Ordinary death preserves name, lasting Legacy attributes/branches, class XP and
learned skills, trait choices, temperament, kit selection/records and discovered
items. It records the real cause, failure and physical bones normally. Companion
combat loss/recovery remains meaningful; this does not grant pet immortality.
No trait, stat or skill reroll happens on death. Internal incarnation-based floor
and affix seeds remain deterministic and distinct between attempts.

The existing home has a recovery pool and reincarnation device as services, not
two new paid construction chores. The device returns a defeated hero; the pool
finishes recovery. The authoritative readiness need is remaining recovery time,
with no hunger/mood meters, feeding, claims, fee or absence decay. Death recovery
is 60 game seconds (600 ticks), advances through the existing offline/rest clock
and cannot be bypassed by manual Send. Alive return keeps current rest/skip
behavior. This materially changes death cadence from the old20-minute wake;
measure actual early and eight-hour pacing, do not claim unchanged balance.

## Slow stats and easy builds

Reuse existing Legacy ownership/prices/effects rather than add a second stat
currency. Present the root attributes as Vitality (`health`), Strength (`damage`)
and Guard (`armour`). Their current cap/effects/prices are unchanged: the same
earned budget can fund focused Strength or a balanced defensive alternative.
Children remain the existing Legacy branches. Class/tree/specs, packages, pets
and named kits retain their existing free edit APIs and earned eligibility.
Ordinary builds do not reset these lasting attributes.

Legacy depth gains use persistent dungeon best depth, rather than the reset
per-incarnation record: first D8 earns9 points, another D8 earns1. Otherwise a
shorter death cooldown would repeatedly pay the same depth's training reward.
The existing1-point finished-delve reward remains. No new passive stat growth
or automatic daily reward is added.

## Remaining survivor-friendly trait dependency

Ordinary wake removal exposes a real unfinished dependency: fresh heroes start
with Born=None, while temperament/blood/family choices still open at internal
incarnation3/5/12. A successful survivor must not need deaths to open build
choices. This blocks claiming the entire persistent-progression model accepted.
The current core checkpoint preserves chosen commitments and does not silently
invent a personality to compensate for weaker early depth.

Retire the obsolete next-heir automation policy as part of that followup:
`StandingOrders.heir`, camp's next-heir controls and feats' selection policy
currently refer to offers no longer generated by ordinary death. Hide neither
their absence nor their lack of effect behind new copy. Remove that inactive
selection surface/API, or replace it with an explicit saved preference for the
actual earned, stable trait catalogue. No controls should claim to choose the
next incarnation's personality automatically.

Proposed next trait contract: temperament and the first persistent trait choice
open after3 completed delves; the second trait slot opens after reachingD8;
family specialization opens after reachingD13. All use actual earned completion
or depth, irrespective of defeat count. Catalogue/offer IDs stay stable for the
hero (seed+slot), with no new gameplay RNG draws or random redraw after death,
reload or an absence. New eligibility is announced once and appears in Journal.
Existing chosen traits and temperament stay selected. A neutral default remains
viable; choices are optional and require explicit player selection. Specify
whether trait changes belong to free build edits or deliberate hero rebirth
before changing their mutation APIs; retain slow Legacy attributes separately.

Acceptance for that followup: a controlled zero-death3-delve/D8/D13 survivor
gets the same offers as a defeated hero at the same earned milestones; every
repeated read/reload has identical IDs and no mutation/RNG use. Explicit choice
persists across actual death and recovery. Current-game idle/picked milestone
gates must be measured and content tuned rather than restoring random rerolls
or weakening the original D8/D13/D23 requirements.

Replace the repeatable whole-Legacy refund with explicit hero rebirth. The first
correction requires actual depth8 and an allocated Legacy commitment; subsequent
rebirths require at least8 completed delves since the last one and1 game hour
since it. Both are real counters/clocks, not daily login obligations. Rebirth
requires the hero home, fully recovered, and explicit confirmation of the current
preview token. A stale preview, an away hero or unmet requirements refuses
atomically. No Gold fee and no new RNG draws.

Rebirth resets Legacy allocation, refunds exactly its spent Legacy into the same
wallet, increments rebirth/incarnation, clears the current life deeds/best and
starts60 seconds recovery. Identity, name, class XP/tree, discoveries, town,
Gold, kit records/configuration, pets and dungeon progress persist. Traits and
temperament also persist: this is a correction route for commitments, not random
stat gambling. Dungeon ascension remains separate and retains hero identity;
its existing dungeon-reset effects stay explicit. Existing unconfirmed Legacy
respec must refuse with a direction to the rebirth preview, not bypass the gate.

## Wire and actions

Add Rust-owned `persistent_hero` to Lineage: stable identity/name/incarnation/
rebirths, state (`away`, `reincarnating`, `recovering`, `ready`), recovery seconds,
services (Guild reception, recovery pool, reincarnation device), actual attribute
rank/value/next price, and rebirth preview. The Guild associates the existing
named Scout with automatic delves and Journal/worker hiring; no new Scout gate
or fee. Service state reflects actual House/Scout ownership.

Preview includes available/blocked, exact refund and points-after, minimum depth,
completed delves and time remaining, reset/retained lists, and deterministic
confirmation token from actual identity/incarnation/allocation/counters. New APIs:
`rename_hero(name)` and `rebirth_hero(token)`. The wire must expose real readiness,
not require TS to infer a cooldown or reconstruct stats. Root owns WASM/UI glue.

## Numeric acceptance

1. Actual defeat preserves identity/name/traits/temperament/class XP/skills/kit/
   Legacy and advances incarnation exactly once, retaining factual death cause.
2. Recovery600 ticks: Send refuses at599; one remaining tick enables it. Whole,
   sliced, saved/reloaded and Session multihero absence produce identical state.
3. Root ranks/effects/prices and free kit/class edits remain unchanged; compare
   actually earned focused and balanced allocations at one shared budget/wall.
4. Preview/reset conserve Legacy points+spent, Gold and unlocks exactly. First
   depth7 refusal; depth8 eligible. Immediate second reset refuses;8 actual delves
   plus1 hour eligible. False/stale token and away/invalid-name refusal are byte
   unchanged. No automatic reset on death and no fabricated earned fixture.
5. Stored replay/death names remain unchanged after later rename. Three Session
   heroes retain independent identity/commitments/recovery and shared town only.
6. Source freeze, targeted semantics/parity and workspace fast native + Clippy;
   explicit amendment of superseded heir-reroll/free-respec/20-minute-wake gates.
   Preserve accounting, deterministic replay, unknown-fact privacy and offline
   uncapped Scout behavior. Actual pacing evidence is separate from fixture tests.

This contract addresses the core model. Renderer services, hero interactions,
Journal/rebirth UI and broad pacing/fun acceptance are required integration work,
not complete merely because these core APIs exist.
