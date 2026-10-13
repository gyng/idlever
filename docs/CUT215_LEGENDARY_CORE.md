# Cut215 — core implementation contract

Read-only design, 2026-10-13. Production changes wait for the parent's frozen
Cut211/212 checkpoint. This supplements `CUT215_LEGENDARY_FORGE.md`; it is not
implementation or acceptance evidence.

## Three permanent shapes

One Rust definition owns IDs, labels, effects, tradeoffs and source descriptions.
The ordinary item definitions gain zero-weight entries, so ordinary weighted
loot and default gear keep their existing RNG draws.

| ID / name | Base equipment | Actual effect | Ordinary alternative |
| --- | --- | --- | --- |
| crownsplitter / Crownsplitter | Sword damage3–7, speed−1 | +2 melee damage when the actual target is stunned or slowed | Sword retains speed when control is absent |
| hearthglass / Hearthglass | Armour1, speed0 | Heal2 HP on the hero's actual natural hostile kill; exclude neutral, summoned and allied kills | Mail/plate prevent more damage in a single-target fight |
| frostmantle / Frostmantle | Armour2, speed−1 | Reduce actual gas/poison damage by2, minimum1 per damaging tick; receive +1 melee damage | Mail protects better against ordinary melee |

Effects require the actual equipped item, not merely ownership or a saved kit.
No extra rolls, passive inventory effects, poison immunity or global damage tier.
Named items always have Legendary rarity. Existing power≥8 Legendary rarity is
still an enchantment classification: its ordinary base shape becomes permanent
on actual pickup, but its found enchantment remains temporary. Neither catalogue
nor announcement may promise a permanent +8 enchantment.

## Actual automatic discovery

Natural eligible boss kills create the named item and settle its pickup during
that same action. This is a real source/drop/find, with a normal pickup receipt
and one-time currency valuation; it is not a catalogue grant. It uses no pack
slot and never autoequips. Banking immediately after the kill, a full inventory
or later death cannot erase the find. No corpse walk, Claim, Keep or wait.

Designated pools are Warlord→Crownsplitter for a non-Gunner, Warlord→Hearthglass
for a Gunner, Bloat Mother→Hearthglass, Lich→Frostmantle. Choose using the actual
run actor's class. A compatible designated shape not yet town-owned is
guaranteed; do not substitute arbitrary later unowned shapes. Once that source's
designated shape is owned, repeat drops occur at1/8 using a tagged immutable
hash of run seed and boss kind. Neither timing nor catalogue reads consume
gameplay RNG or reroll this decision. Summoned/spectral/neutral copies do not
qualify. Ordinary world/descent repeats are real encounters, not fake sources.

The first successful ownership insert emits one discovery announcement. Root
owns the typed link metadata, targeting existing Loadouts; keep any growing
event payload boxed to preserve the80-byte event invariant. Duplicate items
produce ordinary item-value Gold once and an ordinary find receipt, no extra
rank, effect or ownership announcement. Settlement must not pay item value a
second time: reuse `claim_item_value` and the existing final pickup ledger.

Because patterns leave no physical inventory item, the run must retain a private
receipt clone for its final found-item card. Used/stolen/lost physical fates
remain physical facts for ordinary enchanted items; never relabel all found IDs
as permanent discoveries. Receipt quantity is the actual find quantity.

## Collection and wire

Store one permanent shape set in Town. Every resident may use an owned shape,
subject to actual class compatibility. Gear ranks, Legacy attributes, starting
selection and named kits remain per lineage. `bloodlines::town_from` unions
source/destination collections before copying the shared town; Session load
unions all slots. Whole/sliced processing and switching must never overwrite a
different resident's new ownership. Normal death, stat rebirth and world reset
retain the collection. Forged config IDs cannot bypass ownership.

Extend GearChoice with optional `legendary`, `effect`, `tradeoff`. Emit owned-only
`Lineage.legendaries` rows with `kind,label,effect,tradeoff,compatible,available,
blocked,source`, using the same canonical definition. Fresh towns do not list
unearned named shapes. Keep existing Rust selection/save/use APIs and free use;
catalogue reads never select, spend or equip. Saved/current kit labels resolve
through the canonical definition. Unknown potion/scroll privacy is unchanged.

## Existing upgrades and prepared-home refit

Default configuration keeps its exact current armour pieces, weapon statistics
and RNG order. Explicit armour shapes instead inherit a monotonic guard bonus
from the existing plate ladder relative to its first leather baseline. Plate
counts0/1/2/3/4/5/6/7 yield bonus0/0/1/2/3/4/4/5. Thus explicit shapes cannot lose
guard at old leather+1→mail transitions. Existing pace branches and the explicit
shape's speed remain real. Weapon aim/edge and firearm compatibility remain
existing per-lineage rules; there is no legendary rank ladder or new wallet.

Turn0 home selection must refit the actual prepared actor. Validate ownership,
class, catalogue and final unit/slot capacity before any mutation. Record exact
prepared supply units before their initial merge, including free kennel status,
authored/automatic origin, ID and paid metadata; a private run record allows
later refit without guessing from the merged leash stack. For an already
prepared saved actor, reconstruct only its unconsumed preparation using actual
packed counts, bought-leash unit counts and recorded origins, with explicit
tests for the fallback. Preserve brought non-prepared gear.

Refit removes/replaces only prepared units and starter IDs. It retains kennel
units, actual companions, ration, paid toll, route, floor, item-ID sequence and
RNG; no `start_run`, floor population, pet spawn or payment replay. Returning
units to preparation cannot mint Gold. Validate authored duplicates plus free
kennel units against the real cap atomically. Set/select updates real prepared
pack IDs and receipt ownership, sent-state, floor-start and capsule snapshot
using the existing preparation sync seam. While actually away, selection stays
the documented next-run config; it cannot alter the live actor midcombat.

## Required evidence

Focused numeric cases cover each effect against an ordinary item at identical
rank/encounter/RNG, including an intended win and ordinary-item win; Frostmantle
damage1/2/3→1/1/1 and damage5→3, plus melee drawback; Hearthglass natural-kill
exclusions; Crownsplitter actual control expiry. Test explicit armour every
rank/class, including rank2→3 nonregression, while default stats stay exact.

Discovery cases cover actual boss kill→immediate Return, full pack, later death,
duplicate, theft/reload final valuation, incompatible forged selection, shared
two-slot union and same whole/sliced/reloaded outcomes. Refit cases include two
authored plus one kennel leash, duplicated heal slots, zero Gold, final full
cap, class/firearm changes and exact paid ration/toll/route/RNG retention.

Export actual earned seeds1/13 immediately before source kill and after first
discovery under `docs/evidence/cut215/earned/seed-N/`, with canonical saves,
actual event/action logs and manifest stage/source/time. Record an actual
duplicate if reached; never manufacture an owned-three collection as earned
proof. Controlled effect fixtures are labelled separately. A bounded16-seed
source survey, final native/Clippy, real package/client checks and targeted
current-game progression remain required. Broader balance and fun are open.
