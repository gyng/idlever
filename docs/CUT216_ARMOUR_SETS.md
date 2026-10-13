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
