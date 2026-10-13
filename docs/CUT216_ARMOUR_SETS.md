# Cut216 — legendary armour sets (design proposal)

Owner2026-10-13: consider legendary armour sets inspired by Diablo II/III.
This extends the build-focused permanent Forge collection from Cut215.
Status: queued design; no equipment slots, drops or bonuses implemented here.

## Player model

Start with three equipment positions: helm, body and boots. The current Rust
Hero has only one armour position; that becomes body. Weapon remains separate.
Every discovered piece is automatically kept as a town-wide permanent Forge
choice. Switching owned pieces and saved sets is free at home. Duplicates
settle through ordinary loot value, with no new wallet or duplicate ranks.

Bonuses depend on distinct pieces actually equipped by this hero, not on town
collection count. Each piece works alone; two matching pieces grant a useful
partial bonus; three add one signature combat behaviour. Two set pieces plus
a standalone legendary should be a viable alternative to a complete set.
Keep weapons independent so Crownsplitter can support several armour builds.

Existing Hearthglass/Frostmantle ownership remains ownership of that body
piece alone; it must not silently grant a complete set or change its tested
standalone effect. Standalone armour remains supported. Head/boot alternatives
must exist before evaluating full sets; comparing a complete set to empty
extra slots is not an equal equipment-budget comparison.

## First family and later candidates

Prototype Hearthglass first, reusing its existing kill-healing body piece.
Candidate two-piece effect: direct natural kills extend short regeneration.
Candidate three-piece effect: excess kill healing becomes a small capped ward.
Its light body guard still exposes the hero to strong single-target enemies.
Numbers, duration, cap and proc attribution need a Rust simulation contract.
Summoned/allied kills and ambient hazard damage must not manufacture sustain.

Later candidates, not accepted mechanics:

| Family | Partial bonus | Complete-set behaviour | Intended cost |
|---|---|---|---|
| Nightwatch | Blocking briefly strengthens guard | A block prepares a counterstrike | Slower movement; weak benefit against ranged/hazards |
| Wayfarer | Extends existing ranged slow | Movement prepares the next ranged shot | Lower close-combat protection; requires repositioning |

Sets support skills/tactics rather than prescribing a single class tree.
Retain a viable default build and staged class options. Skill resets remain
free; lasting attributes remain separate from easily changed equipment.

## Progression and Forge presentation

The first piece reveals its family and the next known source. Later pieces
come from distinct later milestones, not all from the first boss or login.
Use deterministic eligible-source protection against endless duplicates.
Provisional ceiling: at most8 eligible source defeats between missing-piece
unlocks once its milestone is reached; finalize source eligibility and pacing
against earned runs before adding the counters. Counters are automatic.
Reading a set or playing offline cannot consume combat RNG or worsen odds.

Forge shows owned pieces, next known source and actual equipped count (0/3,
1/3,2/3,3/3), with active versus inactive bonuses clearly distinguished. One
optional Equip owned pieces action can assemble a partial set, keeping other
slots; missing pieces never remove equipped alternatives. Complete-set and
hybrid configurations save through existing named Loadouts. No required
cleanup, repair, crafting materials, paid re-use or claim action.

Keep existing weapon/armour upgrade progress useful. Body retains the current
armour ladder. Head/boots add explicit behaviours/tradeoffs, not two extra
copies of body guard or independent upgrade ladders. Set bonus power must
have one documented scaling path; avoid multiplying the same rank repeatedly.
Proc caps/cooldowns prevent self-trigger loops.

## Automation — owner follow-up

Owner2026-10-13: figure out automation for sets as well. This section specifies
queued behaviour, not present runtime. Basic collection/free reuse is built
in; no new worker unlock or repeated chore is required to retain a set.
The old Armourer is retired in current tree.rs and must not be brought back
as a prerequisite. The existing Apprentice already automates paid Forge
steps under its Gold share/reserve and selected branch rules.

### Choose once, maintain between delves

Named Loadouts store a concrete equipment choice by default. Discoveries
alone do not replace that choice. An explicit Follow set action creates a
per-hero target family; its slots request compatible owned pieces from that
family. Missing pieces retain the hero's chosen fallback, not an empty slot.
Once selected, Follow set applies new owned pieces automatically on subsequent
departures. This is a player-authorized strategy, distinct from claiming loot.

A slot can be pinned to any owned piece, including another legendary. Pins
win over Follow set, so a2-piece family plus pinned third item remains stable
even after the full set is collected. Turning Follow set off freezes the
resolved selection rather than clearing it. Saved Loadouts retain family,
pins and fallback choices; selecting a saved build restores that intent.

Resolution order for each equipment slot:

1. Compatible, owned pinned piece.
2. Compatible, owned piece of the followed family for this slot.
3. Compatible, owned saved fallback.
4. Existing free class/default equipment if the fallback is unavailable.

Rust resolves the three slots atomically at a safe departure boundary after
mandatory recovery. A discovery never swaps an actor's equipment mid-delve.
Resolved set pieces and explicit pins remain protected against automatic
in-run gear replacement; temporary loot still settles normally. Other slots
retain their documented ordinary loot behaviour. Class changes validate or
show an unavailable target and resolve compatible fallbacks; they cannot
force an incompatible piece. Explicit manual edits supersede queued intents.

Ownership is town-wide, while Follow set/pins/fallbacks belong to each hero.
A piece found by one resident benefits other followers on their next departure
without selecting those residents or editing their builds. Exact saved builds
remain untouched. Rust publishes actual equipped count separately from queued
next-run changes: Current2/3 versus Next3/3 when appropriate.

Example: choose Hearthglass, keep a standalone pair of boots pinned, then go
away. A newly found hood is collected and queued for that hero's next delve.
The current delve finishes in its original gear. The next wears the new hood
and coat, keeping the pinned boots and the2-piece bonus. Finding Hearthglass
boots later changes collection progress but does not override the pin.

### Collection focus through the Scout

Normal delving already collects all eligible finds automatically. An optional
Find next piece action focuses on one known, unlocked source of a missing
piece for the chosen family. With the Scout hired, this focus repeats through
automatic recovery and sends; before the Scout, it only prepares a source
plan for the next manual send. It neither hires the Scout nor bypasses60s
recovery, construction gates or source milestones.

Focus affects only legal automatic start/route planning. Starting deeper than the
source skips it; that is not a valid source-focused run. A manual route
/start pin that would skip the source produces an explicit unavailable focus
state; it is not silently overwritten. Resolving the focused route is scoped
to those runs, leaving the stored normal route and Guide preferences intact.

Stop the focus on the missing-piece unlock, including a find by another hero.
Also stop after3 consecutive completed runs fail to reach/defeat the source,
and return to normal progression with a short factual explanation. A source
that has not unlocked remains a progression goal, never an endless farming
loop. Reaching the source resets this failure streak. Eligible victories
advance the town-wide missing-piece protection (provisional ceiling8); death
/absence/reading never resets it. A focus seeks one new piece, then resumes
normal delving; another piece requires another deliberate focus choice.
Ending the focus changes future planning only; the current delve finishes
under its normal exit rules. Choosing a focus/family, pinning, loading or
reading never rerolls loot or increments protection counters. Only genuine
eligible source victories count, using source rules fixed by Rust.

### Upgrades and readable outcomes

Free re-equipping never spends Gold. Automatic paid upgrades use the actual
hired Apprentice and existing forge share/reserve/branch orders; Follow set
does not enable spending, hire workers or add helmet/boot upgrade ladders.
No set-count heuristic may silently change class, skill picks, tactics, pets
or lasting attributes. This preserves the player's build choices.

Reports combine first finds and applied preparation changes into a small
summary: which piece unlocked, which hero will use it and2/3 or3/3 activated.
Repeated routine re-equipping needs no new notification. Actual changed
loadouts are captured in each run's start state and failure trace. Depth and
death comparisons describe actual outcomes, not an untested causal claim
that a new set was better. An optional finite build-trial mode belongs to
existing queue item22 after this controller is accepted; automatic best-build
search/constant silent retuning is outside this first set implementation.

### Additional automation acceptance

- Exact whole/sliced/reloaded offline equality for collection, source-focus
  counters, queued changes, equipped slots, set procs and Gold. Reading panels
  must not resolve a pending action or consume RNG.
- Zero Gold movement for Follow set, free reuse, pins, saved-build CRUD and
  automatically applying a newly owned piece. Existing paid supplies/rations
  and Apprentice purchases retain their separate actual accounting.
- Current run unchanged by discoveries; next run uses the real resolved
  pieces once. Recovery and prepared ration/companion/RNG/item-ID provenance
  remain intact, with no repeated send, restock charge or pet spawn.
- Three-slot pin/fallback/compatible/incompatible/none matrices, including empty
  collection,1/2/3 owned pieces,2+1 hybrid and class changes. Collected pieces
  do not activate a set until worn; duplicate pieces count at most once.
- Two actual paid residents with distinct targets: cross-resident discoveries
  merge ownership without overwriting intent; stale actions fail atomically.
- Scout focus starts only at a known eligible source, exits after the unlock
  or third consecutive failed completed run, and restores normal planning.
  Multihero simultaneous discoveries cancel satisfied focuses exactly once.
- Historical run/death gear records remain unchanged after subsequent unlocks
  and automatic preparation. Show pending/active changes and pin state at
 320/400/1440 normal/200%,44px actions, no overflow.

## Required implementation contract and acceptance

- Rust owns slots, equipped-piece count, effects, sources and proc metadata;
  client displays actual active bonuses and actual remaining cooldowns.
- At least16 paired seeds at equal ranks/attributes/skills and equipment
  budget: intended encounters benefit from the set; ordinary/standalone and
  mixed2+1 builds each win at least one specified scenario. Set completion
  must not become a requirement for existing current-game gates.
- Exact whole/sliced/reloaded offline parity, permanent ownership through
  death/stat/world reset and paid resident selection, atomic class/away/stale
  refusals, free use and prepared-actor refit without payment/spawn duplication.
- A copy of the same piece cannot count twice; duplicate conversion pays once.
  Collected but unequipped pieces give zero active set bonus.
- Earned first/second/third-piece timelines across16 seeds establish sensible
  chapter pacing; bounded eligible-source protection is tested at its ceiling.
- Actual320/400/1440 normal/200% collection/loadout/partial/full/hybrid states,
 44px controls, no overflow, clear bonus activation and factual combat cues.
- Begin with one family plus meaningful standalone choices. Add further
  families after that contract passes; full numeric balance remains open.

## References

Diablo II documents distinct equipped-piece partial/full bonuses and allows
mixed sets: https://classic.battle.net/diablo2exp/items/sets/basics.shtml
Diablo III's Tal Rasha item shows a set bonus adding an elemental combat proc:
https://eu.diablo3.blizzard.com/en-us/item/tal-rashas-grasp-P2_Unique_Gloves_02
Borrow the partial-combination and signature-behaviour ideas. The proposed
three-slot scope, automatic permanent collection and pacing rules are Idlever
design choices, not claims about either Diablo game's inventory/progression.
