# Cut225 — Clown and Engineer builds

Read-only source audit and proposed implementation contract. No new class,
ability, item, wire or package is implemented by this document. Cut220 stays
frozen while its browser proof finishes. The owner queued both classes and
made experimenting with builds the main purpose of the game.

## What already exists

Rust has five classes: Fighter, Rogue, Ranger, Caster and Gunner. Each has an
independent earned XP ladder; abilities arrive at levels 1, 3, 5, 7 and 9.
Gunner has seven verbs, Rogue/Ranger/Caster six and Fighter five. Class level
caps at 10. Changing class at home is free; an away change is refused. Paid
home preparations are refitted instead of repurchased. Existing class unlocks
must retain their current gates: Rogue is free after a Bank; Ranger/Caster are
paid Marks unlocks; Gunner requires D13 and its existing purchase.

Each existing class has six cumulative tree nodes: two roots with two children
each. Maximum path depth is two nodes, not a large three-tier tree. Roots open
at class L3/D8; children open at L5/D13 or L7/D18. The point budget is
`min(class level − 2, 6)`. Paths are personal, selected at home, free to reset
and captured in `Hero.class_skills` at departure. Each node has a real combat
modifier and authored rule rows; it is not just an illustration. Sentinel and
Hexbinder are the only current specializations, for Fighter/Caster at L10/D23.

All 30 current tree nodes already have distinct ink/BONE/MIST SVG silhouettes
in `web/src/ui/skill-icons.ts`. Existing ability icons include shield, shadow,
bow, magic and five Gunner icons in `art/ui/icons/`. Class icons reuse them.
Do not duplicate these 30 nodes or replace their art merely to add two classes.
New classes need 12 new node insignias, two class symbols, appropriate ability
marks and three cosmetic looks each. The generic unknown-skill fallback must
remain available.

## Combat roles

Clown manipulates where danger goes, then punishes a real mistake. It should
be frailer than Fighter and lose damage in a straight duel when its control
cannot help. It must not become a renamed Rogue with invisibility, or copy
Fighter's existing all-foe taunt. That taunt currently wakes foes and clears
pending telegraphs; new misdirection must preserve committed attack targets.

Engineer chooses a position, places a temporary tool and fights around it.
Setup takes a real hero action. It should lose value when enemies move out of
its lane; a mobile build trades peak firepower for redeployment. Constructs
are temporary combat actors, not pets, workers, inventory or a new crafting
currency. No manual replenishment, daily service, ammunition purchase, repair
fee or base building is added. The hero uses its chosen build autonomously.

Candidate starting bodies: Clown 28 HP with the existing dagger; Engineer
30 HP with the existing mace. A bell or hammer may distinguish the painted
silhouette without creating new weapon categories or free extra item value.
Numbers below are explicit tuning candidates, not claimed shipped balance.

| Class ability | Level | Initial mechanical contract |
| --- | ---: | --- |
| Clown: Bell lure | 1 | One decoy, visible range 4, lifetime 20 ticks, cooldown 40 ticks; redirect eligible future movement toward its tile. No effect on an attack already committed. |
| Clown: Turnabout | 3 | Arm one counter for 20 ticks; after a real adjacent melee miss, deal 4 physical damage once; cooldown 60 ticks. Apply normal armour/reflect rules and record the cause. |
| Clown: False bow | 5 | One visible eligible foe pauses its next movement for 10 ticks; cooldown 60 ticks. Boss effect capped at 5 ticks; do not erase a telegraphed strike. |
| Clown: Curtain | 7 | Move one tile perpendicular to the nearest threat and leave the existing decoy; cooldown 80 ticks. Fail without a safe passable tile; no teleport through walls. |
| Clown: Grand jape | 9 | Lure up to three visible eligible foes toward the same decoy; cooldown 100 ticks. Boss diversion capped at 5 ticks and cannot chain-lock a boss. |
| Engineer: Deploy | 1 | One stationary sentry: 12 HP, 60-tick lifetime, physical shot 3 every 10 ticks, range 4, deployment cooldown 60 ticks. Setup spends one action; no immediate free shot. |
| Engineer: Brace | 3 | Brace the live construct for 20 ticks, reducing incoming damage by 2 per hit; cooldown 50 ticks. No target means refusal. |
| Engineer: Discharge | 5 | Consume the construct's remaining life for one 5-damage shot; cooldown 60 ticks. Resolve line of sight, projectile counters and reflection normally. |
| Engineer: Relocate | 7 | Move the existing construct to a legal adjacent placement without restoring HP/lifetime; cooldown 40 ticks. No second construct or recycled free shot. |
| Engineer: Overdrive | 9 | For 20 ticks, change shot interval from 10 to 5 ticks; cooldown 100 ticks. Lifetime still expires and the maximum active construct count remains one. |

Every successful action consumes its ordinary action budget. Every refusal
returns control to the next legal rule. No-target, no-space, cooldown and boss
resistance reasons come from Rust. The selected default policy should deploy
only when a visible threat can usefully enter the tool's range; it should not
spend every quiet action rebuilding an expired prop. Cooldown progress uses
simulation ticks, including offline time, never browser clocks.

## Gates and cumulative trees

Proposed earned catalogue gates are Scout + 12 completed personal delves + D13
for Clown, and Scout + 20 completed personal delves + D18 for Engineer. These
are earned free unlocks, with no death or rebirth requirement. Show one Journal
milestone per class and one optional unlock announcement. Do not equip either
class automatically. Switching, legal tree resets and reuse of already-owned
gear remain free. Preserve actual manual construction and first-session Scout.
Engineer does not require a new workshop or recurring Forge purchase.

Use six nodes per class, retaining the existing six-bit class-local mask and
point budget. Give each new class two three-node paths: root L3/D8, middle
L5/D13 and leaf L7/D18. This is a genuine extra tier for these two trees without
silently redesigning the five existing trees. Paths remain cumulative and can
be mixed when points permit; reset at home keeps XP and unlocks.

| Clown path | Root → middle → leaf | Candidate effect increments |
| --- | --- | --- |
| Misdirector | Bellkeeper → False exit → Ringmaster | Lure lifetime +5 ticks → Curtain cooldown −10 ticks → Grand jape affects one additional eligible foe |
| Counterplayer | Turncoat → Cruel joke → Last laugh | Counter damage +1 → counter window +5 ticks → counter cooldown −10 ticks |
| Engineer path | Root → middle → leaf | Candidate effect increments |
| Emplacement | Watchmaker → Bastion → Artificer | Construct HP +4 → Brace reduction +1 → Overdrive duration +5 ticks |
| Fieldwork | Surveyor → Mobile works → Relay | Deployment range +1 → Relocate cooldown −10 ticks → deployment cooldown −10 ticks |

Do not add two specializations just to fill a picker. First prove these paths
produce different useful outcomes. Existing specialization choices remain
unchanged. A later specialization contract can build on actual play evidence.

## Source integration map

| Area | Existing hook | Required work |
| --- | --- | --- |
| Class identity/XP | `hero.rs` Class, ALL, parse, signature, starting weapon, class_ladder; `engine.rs` set_class/class_offer/exit XP | Add exact enum/ladder entries and lazy new-class XP records. Preserve the old initial class map and existing RNG draws while the new class is unselected. |
| Earned gates | `meta.rs` definitions/gates, `journal.rs` milestones | Add Scout/completion/depth reasons in Rust. No TS threshold derivation. |
| Policies/tree | `packages.rs` compile, `class_tree.rs` definitions/rows/mask; `hero.rs` skill modifiers | Add useful default rows plus six cumulative nodes each; new origin tags `class:path:clown_*`/`engineer_*`. Preserve authored rows, package caps and old masks. |
| Action availability | `rules.rs` vocabulary/validation; `ai.rs` class_has_verb, refusal reasons and execution | Implement bounded actions and legal target/placement selectors in Rust. No client target selection. |
| Simulation | `Run` in `engine.rs`, `Monster.ttl`, `ai.rs` summon_ally, `turn.rs` ticks/damage/descend | Share bounded ephemeral actor infrastructure where useful. Existing summon has TTL/spawn events but is not yet a sentry or decoy. Constructors are never persisted in party/kennel. |
| Provenance/verdict | `provenance.rs`, `turn.rs` Src/damage, death replay and trace | Distinguish actual tool/counter contribution and reflected harm. No invented facts, extra kill reward or double pickup conversion. |
| Wire/bridge | existing lineage/class/tree and Ev::Rule.skill, Spawn, Ally, attack events; Cut220 equipment/actual_party | Canonical cooldown/lifetime/target/status descriptors. Add a bounded construct view if existing Entity fields cannot tell the player what the tool is doing. No second combat resolver in TS. |
| Client | Hero Hub Skills/Behaviour; class-tree/class-icons/skill-icons; engine types/fake | Use the same routes and actual/next boundary. New classes appear only with canonical availability and legal actions. Fake content is explicitly development data. |
| Replay/render | `engine.rs` snapshot hero class name; atlas `hero_<class>_<look>` fallback; `combat-cues.ts` source kinds | Add class/construct sprite IDs and replay-driven setup/lure/counter cues. Renderer must not infer that a hit, control or shot occurred from a row selection alone. |

Inactive content must not spawn actors, consume RNG, change packs, alter old
class defaults or add a per-tick scan for every existing run. Do not extend the
old random-choice population silently in workers or bots. Audit all Class::ALL
sites, including initial maps, class offers, label tables and legendary tests.
New actors must have unique IDs, bounded lifetime and deterministic placement,
clear on floor exit, and serialize/reload exactly. Friendly constructs must not
trap their owner in a one-tile corridor or count as tamed companions. Damage
and kills need explicit owner attribution; reusing Src::Mon blindly would
misattribute XP, facts, reflected damage and death causes.

## Art and readability

Follow `docs/ART_DIRECTION.md` over superseded early paragraphs in ART.md:
long elegant figures, BONE face patch, BLOOD cloak, INK outline and MIST rim,
readable at 48 px. Clown is a worn court fool with an angular split cap and a
small bell, not bright circus rainbow paint. Engineer has a long work coat,
large tool silhouette and restrained GILT fittings. EMBER belongs only to an
actual flame. Constructs read as ink-and-metal mechanisms, with a different
silhouette for decoy and sentry. Their setup, target line and expiry need an
honest replay cue. Every sprite/icon retains a primitive fallback; reduced
motion still communicates deployment, diversion and counter success.

## Meaningful bounded acceptance

1. Controlled native tests prove each action's exact amount, target restrictions,
   cooldown, action debit, refusal purity and boss cap. Check actual miss versus
   hit counters, existing locked telegraphs, cover/reflection, no-space corridors,
   one-construct cap, no heal/TTL refresh on relocation and expiry on descent.
   Label authored combat arenas controlled; they are not earned progression proof.
2. One save with a live decoy/sentry passes 8 h whole/split/reload equality.
   Same seed/rules/time reproduces actual events, damage and expiry. Inspecting
   Hub/status/vocabulary preserves the exact save, Gold and RNG. No construction
   gold, loot, pet XP or duplicate kill reward appears.
3. Derive naturally earned unlock camps for seeds 1, 3 and 5 through public
   actions. Record completed/depth/Scout receipts, first legal class selection,
   and actual first three departures. No stat, class-XP, item or unlock grants
   in these progression fixtures. Gates must be available at the named earned
   thresholds with truthful remaining reasons just below them.
4. From each identical eligible saved world, compare base and the two explicitly
   chosen paths over the next 8 h. Preserve actual starting gear ranks, Gold,
   elapsed time and check-in protocol. Record survival, floors, damage taken,
   counter damage, construct shots/uptime and wasted actions. Each branch must
   demonstrate its authored numeric change in a suitable controlled arena and
   at least one real earned run; neither is required to win every encounter.
   Do not substitute aggregate damage alone for a control build's useful result.
5. Existing IDLE D8/day1, D23/day12, stall ≤4 days, daily Gold and no-King rows
   retain all 16 seeds and thresholds. Existing PICKED value/outpace and removal
   invariants stay intact. New classes are optional manual selections; unchanged
   bots are not rewritten to choose them to rescue a failing gate. Start with
   the actual matching seed7 checkpoint, then required targeted 16-seed rows.
   Broader class comparisons remain separate from this claim.
6. One real-WASM functional journey per class covers unlock/refusal, choose,
   tree learn/reset, actual departure, cooldown/construct display and stale
   resident/incarnation guards. Reuse compact Hero Hub geometry instead of a
   new exhaustive width Cartesian suite. Inspect reads and rejected actions
   preserve save/Gold; class/tree changes have no recurring purchase.
7. Capture one actual replay per class at phone/desktop size, including missing
   art and reduced motion. Show an actual lure/counter and setup/shot/expiry,
   with exact event/fixture/package identities. Cues remain bounded like the
   current eight-cue/128-quad budget; record cost before raising either limit.
   No GPU performance claim from SwiftShader. Post settled milestone shots.

No implementation is authorized by this audit itself. Resolve the candidate
ability numbers in a source contract before content tuning; preserve failed
runs and numeric gates. These classes do not close the legendary/petmaster,
base-needs, progression or fun-rating backlog.

## Larger trees for the five existing classes

The owner's larger cumulative-tree request applies to Fighter, Rogue, Ranger,
Caster and Gunner as well as the two new classes. The new-class implementation
and this extension may ship as separate bounded phases, but neither replaces
the other. The existing 30 nodes are the starting branches, not the full scope.

Current shipped node effects, in their existing bit order:

| Class | First branch | Second branch |
| --- | --- | --- |
| Fighter | Warden: bash stun +1 tick; Recovery: second wind +3 HP; Boss guard: boss melee damage −1 | Reaver: cleave damage +1; Crowd breaker: cleave cooldown −10 ticks; Boss breaker: boss bash damage +1 |
| Rogue | Stalker: backstab damage +1; Ambusher: ambush damage +2; Boss stalker: boss backstab damage +1 | Shade: vanish +5 ticks; Escape artist: smoke blind +5 ticks; Counter ambush: vanish cooldown −10 ticks |
| Ranger | Hunter: shot damage +1 below 50% target HP; Boss hunter: boss mark +10 ticks; Finisher: shot damage +1 below 25% target HP | Barrage: volley cooldown −10 ticks; Crossfire: bow shot damage +1; Marked barrage: marked shot damage +1 |
| Caster | Channeler: bolt damage +1; Boss channel: boss slow +10 ticks; Storm: nova damage +1 | Guardian: ward +5 ticks; Frost guard: slow +5 ticks; Nova guard: warded nova damage +1 |
| Gunner | Marksman: aimed shot damage +1; Boss marksman: boss aimed shot damage +1; Quick loader: fast reload −1 tick | Breacher: close burst damage +1; Smoke screen: smoke blind +5 ticks; Close loader: fast reload cooldown −10 ticks |

Add four third-tier nodes per existing class, one below each existing child,
and two fourth-tier capstones, one for each main branch. Each existing class
then has 12 nodes and a maximum four-node parent chain. Across the five classes
this adds 30 nodes and 30 new insignias; the existing 30 icons remain in use.
With the two proposed new six-node classes, the combined catalogue is 72 nodes.
Do not flatten these into a second list of unconditional HP/damage bonuses.
New nodes change action sequences, timing, targets or a resource interaction
within combat, while keeping the existing class identity.

The table defines parent edges and initial numerical interaction candidates.
A successful preceding action is required; selecting a row without performing
it earns nothing. Charge windows expire, are capped at one, and are recorded
on the actor so reload/replay cannot refresh them.

| Class | New node ← existing parent | Candidate interaction |
| --- | --- | --- |
| Fighter | Rally ← Recovery | A successful second wind after a melee block within 10 ticks reduces remaining bash cooldown by 20 ticks, once per wind. |
| Fighter | Oathguard ← Boss guard | A successful boss bash arms one extra 2-damage melee reduction for 10 ticks; the next actual qualifying hit consumes it. |
| Fighter | Opening cut ← Crowd breaker | A cleave that actually hits at least two foes reduces bash cooldown by 10 ticks once, encouraging bash/cleave control rather than repeated single-target cleave. |
| Fighter | Siege rhythm ← Boss breaker | A successful boss bash arms one follow-up ordinary melee attack with +2 damage for 10 ticks, consumed by the attack rather than every hit in the window. |
| Rogue | Afterimage ← Ambusher | A successful ambush permits one follow-up shadowstep to reduce its remaining cooldown by 20 ticks; charge lasts 10 ticks and expires if unused. |
| Rogue | Tell thief ← Boss stalker | A successful backstab against an observed boss's active windup reduces vanish cooldown by 10 ticks once. It does not erase the committed boss attack. |
| Rogue | Veiled route ← Escape artist | After actual smoke blinds a foe, the next legal shadowstep within 10 ticks returns 50% action energy once. |
| Rogue | Patient ambush ← Counter ambush | A missed ambush preserves at most 3 ticks of the pre-attack vanish window for another tactical decision; no restored cooldown, hit reroll or extended full vanish. |
| Ranger | Spotter ← Boss hunter | A real trap trigger on a marked target extends that target's remaining mark by 10 ticks once per trap, with a 50-tick total cap. |
| Ranger | Quiver thread ← Finisher | A shot that kills a target below 25% pre-hit HP reduces double-shot cooldown by 20 ticks once per kill. |
| Ranger | Corridor volley ← Crossfire | A volley that hits at least two foes arms one follow-up shot with one additional tile of range for 10 ticks. Cover and line of sight still apply. |
| Ranger | Split mark ← Marked barrage | A volley hitting a marked foe copies at most 20 ticks of its remaining mark to one other actually hit foe; it cannot spread recursively. |
| Caster | Chilling charge ← Boss channel | A bolt hitting an actually slowed boss reduces ward cooldown by 10 ticks; at most once per successful slow application. |
| Caster | Storm cell ← Storm | A nova actually hitting at least two foes arms one bolt that can hit one additional foe on its actual line at 50% damage, for 10 ticks. No target through a wall. |
| Caster | Ice lock ← Frost guard | A successful slow while warded extends that same slow by 10 ticks once, capped at 50 ticks. Repeated rows do not refresh a permanent lock. |
| Caster | Shatter ward ← Nova guard | A successful warded nova consumes the remaining ward to reduce nova cooldown by 20 ticks; at most once per actual ward cast. This trades protection for tempo. |
| Gunner | Rangefinder ← Boss marksman | A fully aimed hit on an observed boss recovers one actually spent chamber, once per aim sequence. Capacity remains unchanged and the receipt names the recovery. |
| Gunner | Chamber chain ← Quick loader | A completed fast reload arms one aimed shot whose settling time is reduced by 1 tick; charge expires after 10 ticks. Partial reload/refusal grants nothing. |
| Gunner | Smoke walk ← Smoke screen | After actual smoke retreat blinds a foe, the next completed reload within 10 ticks returns 50% action energy once. It still costs rounds/time normally. |
| Gunner | Cycling breach ← Close loader | A close burst that actually kills an adjacent foe reduces fast-reload cooldown by 10 ticks once; a shot selection, miss or remote kill does not qualify. |

Fourth-tier capstones deliberately combine a longer chain with another class
ability. Exact single-parent edges retain the current wire; no client OR-parent
solver is introduced.

| Class | Capstone ← new third-tier parent | Candidate interaction |
| --- | --- | --- |
| Fighter | Holdfast ← Rally | A successful second wind under adjacent threat arms two melee block charges of 2 damage each for 20 ticks. Charges do not stack on another cast. |
| Fighter | Execution arc ← Siege rhythm | Killing with the charged follow-up attack permits one bash cooldown reduction of 20 ticks within 10 ticks. At most one trigger per 40 ticks. |
| Rogue | Ghostwalk ← Veiled route | A successful shadowstep after qualifying smoke arms one additional shadowstep cooldown reduction of 20 ticks; no HP heal or invisibility refresh. |
| Rogue | Silent finish ← Afterimage | A successful ambush against a target below 25% pre-hit HP reduces shadowstep cooldown by 20 ticks once, rewarding a planned finishing escape. |
| Ranger | Patient snare ← Spotter | A real trap trigger on a marked foe reduces double-shot cooldown by 20 ticks once per trap. |
| Ranger | Moving line ← Split mark | After a qualifying mark-splitting volley, one legal kite step within 10 ticks returns 50% action energy. |
| Caster | Conduct ← Chilling charge | The qualifying bolt copies at most 10 ticks of actual slow to one visible adjacent foe, once per original slow cast; no recursive spread. |
| Caster | Last wall ← Ice lock | A ward that actually absorbed at least 4 damage reduces blink cooldown by 20 ticks once, creating a defensive escape sequence. |
| Gunner | Long watch ← Chamber chain | The charged aimed shot, if it actually kills, reduces the next aim settling time by 1 tick once within 10 ticks; no duplicated bullet recovery. |
| Gunner | Breach route ← Cycling breach | After the qualifying close-burst kill, one legal smoke retreat within 10 ticks returns 50% action energy, without restoring HP, ammunition or smoke cooldown. |

These interactions are proposed, not shipped numerical claims. Implementation
must check actual cooldown/status semantics before freezing each candidate.
Energy returns combine with Sure/other existing returns only up to the action's
actual energy debit. A cycle of refunded actions must still consume time and
cannot create unlimited same-tick turns. Existing chamber, shield, poison,
reflection and committed-target rules remain authoritative.

### Slow introduction and earned points

Keep every old gate, learned node ID, bit 0–5 and early point budget unchanged.
Append the six new nodes at bits 6–11; never reorder old bits to prettify the
layout. Existing active choices and saved run capsules continue to play their
original effects. Available knowledge is cumulative: reset/rebirth does not
remove class XP, earned depth/completion history or the catalogue eligibility.
Selected descendants include their parents; builds can be changed at home
without Gold, a death, a new currency or a lasting-stat reset.

| New stage | Requirements, all personal except hired Scout | Additional tree budget |
| --- | --- | ---: |
| Third-tier introduction | Scout, class L9, D23, 24 completed delves | +1 |
| Second advanced pick | Class L10, D28, 32 completed delves | +1 |
| Fourth-tier introduction | Class L10, D29, 48 completed delves | +1 |
| Late mastery pick | Class L10, D33, 64 completed delves | +1 |

All advanced stages inherit the Scout prerequisite and the preceding stages.
Use the existing personal historical depth (`legacy::deepest`), which retains
this resident's recorded bests, rather than another resident's shared town
progress. Eligibility is a pure read of earned records; no read awards points.

Budget becomes the existing `min(level − 2, 6)` plus those four earned additions,
maximum 10 of 12 nodes. This permits mixed cumulative paths without making all
late effects compulsory. Third-tier nodes require their specific old parent;
fourth-tier nodes require the specific new parent in the table and their own
stage. No pure clock progress, purchased points or repeated presentation click.
All availability and remaining requirements come from Rust.

Announce one advanced-tree milestone for the selected class, not 20 new nodes
or five classes at once. The Journal points to Skills; the tree initially
expands the chosen branches and permits inspection of other branches. Show the
new budget and next earned requirement in the existing tree UI. Keep class
abilities gained at L1/3/5/7/9; the extension does not delay or take them away.
Do not increase class level caps or rewrite the early XP curve merely to fund
these options. No new specialization purchase is needed to use a node.

### Extension proof and delivery boundary

Implement the existing-tree extension as its own source/evidence phase after
Clown/Engineer if that keeps verification bounded. It remains a required scope
item, tracked by this contract and the queue, until all five real trees have
larger branches and meaningful effects. New-class delivery alone cannot close
the owner's larger-tree request.

Use `Hero.class_skills` for frozen learned effects, plus bounded serializable
combo charges where the current cooldown/status fields cannot encode them.
Rows use the existing action verbs and canonical legal targeting where possible;
new condition tokens require Rust vocabulary/validation/refusal support before
UI exposure. Successful interactions emit actual origin/event evidence for
trace and combat cues. Source-selected row names are not proof that a combo
happened. Preserve current Sentinel/Hexbinder and every existing node modifier.
Each of the 30 new insignias should depict its real interaction rather than
reuse one generic stat arrow; keep primitive fallbacks and the ink palette.

Add boundary tests just below/at all four numerical stages, including zero
Gold, no defeat, class switching, free reset, paid preparation preservation and
three residents whose progress is different. Reads and refused choices preserve
whole saves. A genuine surviving public-action hero must reach each stage;
controlled counter tables alone do not prove no-death progression. A reset
returns selected-node budget, preserves unlock history and clears no unrelated
gear/trait/family commitments. Away edits remain refused and live masks/charges
stay frozen.

For each class, one controlled paired arena must prove the new interaction
with and without the node at identical HP, gear, facts, elapsed ticks and RNG,
including a miss/refusal case that grants no charge. One actual earned paired
8 h camp comparison per class then records floors, survival, wasted actions and
the branch's actual triggers; preserve distinct source/selected/no-selection
saves. Use three genuine cohort seeds for staged unlock availability. Prove
8 h whole/split/reload equality with an active combo charge and a Gunner chamber
receipt; no extra Gold or physical loot conversion. At least one descendant
must show a genuine interaction with its parent, not only a numeric baseline
increase from the parent's existing effect.

Retain the existing targeted 16-seed IDLE progression/Gold/King and PICKED
value/outpace thresholds, first-session Scout, manual construction and removal
invariants. The unchanged bot protocol does not automatically learn new nodes.
That baseline proves optionality, not the fun or strength of chosen advanced
paths; report the five actual paired build comparisons separately. Capture one
compact real-WASM journey for each extended tree plus a shared phone/desktop
geometry pass, without multiplying the entire full-suite Cartesian inventory.
Record the parent/child edges, 12 unique labels/icons per old class, exact actual
versus selected masks and replayed successful combo cues. No production edits
or CPU tests are made by this audit.

## Implementation record (2026-10-14, worktree branch)

Commits: `bda3a479` (core phases 1–2), `ff4a4fe5` (minimal client, phase 3),
then this record with evidence under `docs/evidence/cut225/`. Base `b497aa59`.
The existing-tree extension above is untouched and remains open.

### What exists now

- `hero.rs`: `Class::Clown` (28 HP, dagger) and `Class::Engineer` (30 HP,
  mace) appended. `Class::ALL` still holds exactly the original five in their
  original order, so every legacy initial map, offer, random population and
  label loop is unchanged; `Class::EARNED` and `Class::EVERY` add the new ones.
  Ladders: Clown `bell_lure 1, turnabout 3, false_bow 5, curtain 7,
  grand_jape 9`; Engineer `deploy 1, brace_sentry 3, discharge 5, relocate 7,
  overdrive 9`. Mastery cards: none (empty; nothing is granted at L10).
- Earned gate, a pure read in `meta::class_gate`: Scout hired, then
  `persistent.completed` ≥ 12/20, then `legacy::deepest` ≥ D13/D18. Reasons
  are Rust strings (`Hire Scout`, `Complete N more delves`, `Reach D13`).
  Nothing is stored or granted; `set_class` refuses with the reason and no
  change; the class XP record is created only when the class is chosen.
  `Lineage.earned_classes` carries availability/progress; the Journal gains
  one milestone per class (`class_clown`, `class_engineer`).
- `tools.rs`: `Run.tools: Option<Tools>` exists only for the two new classes.
  All cooldowns and lifetimes are absolute run ticks. Every verb is a pure
  `plan_*` (legality and refusal reason) plus `apply_*`, so refusals are pure.
  Quiet offline batches stop only while a decoy, construct, pause, diversion
  or armed counter is live (`Tools::live`).
- Numbers are the contract candidates unchanged (no number was tuned).
- Clown semantics: bell placed 2–4 tiles from the hero, visible, in sight of
  the first lure-eligible foe (awake, not fleeing, not adjacent, not a boss),
  nearest that foe and farthest from the hero; the decoy never blocks.
  Every non-boss hostile within 4 tiles of the bell with sight of it spends
  its chase moves walking to it, then loses moves beside it. Only `ai::chase`
  is redirected: adjacent attackers still attack and telegraphed `pending`
  strikes are never touched. Turnabout is active for ticks `(t0, t0+20)`;
  the first real adjacent melee miss on the hero deals `4 − def` (min 0)
  through `damage_monster` with `Src::Tool(Counter)`, so reflection, the
  shield wall and the counter table apply; then it disarms. False bow pauses
  the chase moves of one awake non-adjacent foe within 4 (boss 5 ticks plus a
  40-tick immunity: no chain-lock). Curtain picks among the two perpendicular
  steps and the perpendicular-and-back diagonals the free, steppable tile
  with fewest adjacent threats; refuses `no space` otherwise; leaves a
  10-tick decoy on the vacated tile when none stands. Grand jape needs a live
  decoy and diverts up to 3 (+1 Ringmaster) visible non-adjacent foes,
  bosses for 5 ticks then immune 40.
- Engineer semantics: one sentry that blocks its tile, placed within 1 (+1
  Surveyor) tile of the hero on a visible, non-corridor tile in sight with at
  least five passable neighbours (it cannot seal its owner into a passage);
  deploy refuses without a visible threat within 7 tiles. First shot at
  `t0+10`, then every 10 (5 under overdrive) at the nearest visible hostile
  within 4 in the sentry's line of sight, `3 − def` via `Src::Tool(Sentry)`; a
  reflecting target sends the shot into the sentry. A hostile whose chase
  move starts adjacent to the sentry attacks it instead (the only new RNG
  draw, and only in tool runs). Brace −2 (+1 Bastion) per hit for 20 ticks;
  discharge spends the sentry on one `5 − def` shot; relocate keeps HP,
  lifetime, id and shot timer; overdrive 20 (+5 Artificer) ticks, lifetime
  unchanged. Decoy and sentry expire on descent (`turn::descend`).
- Attribution: `Src::Tool` names `counter`/`sentry` in Hurt/Die causes; kills
  are the hero's ordinary kills (no extra reward, no hero-weapon procs);
  tool events are `Ev::Tool` plus `Ev::Attack` verbs `counter`, `sentry`,
  `discharge`, `false_bow`, `grand_jape`; each use logs a provenance cooldown.
  `ToolStats` receipts accumulate into the return report (`tools`).
- Trees: six nodes per class with real three-tier chains (root L3/D8, middle
  L5/D13, leaf L7/D18), the existing six-bit mask and budget, origins
  `class:path:clown_*`/`engineer_*`. Default policy rows `class:clown`
  (`clown_tactic`) and `class:engineer` (`engineer_tactic`) sit where the
  Gunner row sits; neither is compiled for any other class.
- Wire: `Snapshot.tools` (abilities with canonical cooldowns, decoy, sentry
  with target/braced/overdrive, armed counter, receipts); absent otherwise.
- Client (phase 3): type mirrors, ladders, primitive glyph fallbacks `♧`/`⚙`
  for the two class symbols (sprite ids `v_clown`/`v_engineer` do not exist
  yet), and the class picker lists an earned class only when Rust says it is
  available. Fake-engine earned classes are labelled development data.

### Invariance proof (unchanged bots, unchanged results)

Baseline binary built from pristine `b497aa59` before any edit, then the
committed `bda3a479` binary; same command for both:

```sh
target/fast/examples/dayplayer --seeds 16 --days 14 --bots idle,picked --routine --threads 12
```

All 32 per-seed job results (16 seeds × IDLE/PICKED, 14 days, 3 check-ins)
are byte-identical (`dayplayer/base-b746f911b19f5fc3/` versus
`dayplayer/final-e9dc6bd27f41e82c/`), and the printed bar tables are
identical. Both runs show the same pre-existing `Scout bought ≤ min 15` FAIL
(worst seed 15.6 min); it is a baseline row, not caused here. An interim
binary (`7ed6db76015f167a`) was also identical. This is the routine IDLE/PICKED
fortnight, not the full/exhaustive gate, TUNED/RANDOM/HANDS or leave-one-outs.

### Checks

- `cargo test -q --workspace --profile fast`: 936 passed, 6 ignored with the
  final tools suite; it is 22 controlled arena tests (labelled
  controlled), including the 8 h whole/split/reload equality with a live tool.
- `cargo clippy --workspace --all-targets -- -D warnings`: clean.
- Client: format/lint/tsc/copy-lint clean; `pnpm -s test` smoke 38/38 on the
  rebuilt fast WASM. `class-tree` and `class-styles` fail identically on a
  pristine `b497aa59` WASM with pristine client sources (pre-existing).

### Class comparison (diagnostic, not balance or fun)

`cut225_classes docs/evidence/cut225/classes --seeds 1,3,5 --checkins 9`
derives each camp from a fresh town by public actions (manual house, manual
sends until the Scout, 8 h check-ins, shared paid home preparation). Clown
opened at the first 8 h check-in on all three seeds (16–17 delves, D13–14);
Engineer at 16/24/32 h. From each identical camp, 72 h:

| Build | Median best | Bests (s1/3/5) | Deaths/run | Notes |
| --- | ---: | --- | ---: | --- |
| Fighter (Clown camp) | D28 | 28/28/28 | 0.34 | existing class level |
| Rogue (Clown camp) | D28 | 28/28/28 | 0.25 | from L1, same body as Clown |
| Clown base | D19 | 23/19/19 | 0.29 | 0.54 counter conversion |
| Clown Misdirector | D22 | 22/22/23 | 0.25 | 2.4 lured moves per bell |
| Clown Counterplayer | D23 | 24/23/21 | 0.30 | 4.34 vs 3.86 dmg per counter |
| Fighter (Engineer camp) | D28 | 28/28/33 | 0.60 | |
| Engineer base | D28 | 28/28/28 | 0.52 | sentry idle 29.0% of its life |
| Engineer Emplacement | D28 | 28/28/28 | 0.59 | 1.7 sentries destroyed/run |
| Engineer Fieldwork | D28 | 28/28/28 | 0.52 | idle 22.9%, 10.1 destroyed/run |

Clown is frailer and, with the candidate numbers, not yet viable at the
same pace: it trails Rogue (identical body, also from L1) by 5–9 floors at
72 h. Each Clown action costs an attack; a counter returns ~4 once per
window and a pause holds a foe for about one move. Engineer keeps pace with
Fighter from L1 with fewer deaths per run; its sentry is idle 29% of its
life when foes leave its lane, and Fieldwork's relocation cuts that to 23%
at the price of six times more destroyed sentries. Both paths of each class
produce their authored numeric change in controlled arenas and in these
earned runs. The first policy measurement (bell on any visible foe, counter
whenever adjacent) wasted half its bells and reached only D16–D23; tightening
the default policy and the Clown tree-row conditions (no number changed)
produced the table above. Earlier measurements are summarized in
`docs/evidence/cut225/README.md`.

### Open

- Resolved by "Owner tuning 2026-10-14" below: the Clown's counter, pause and
  lure numbers were raised, and the Engineer's mace now hits 2–6 while its sentry
  is stronger.
- Not done: real-WASM per-class journey (acceptance 6), replay capture and
  render cues for decoy/sentry/counter (7; the renderer does not draw them
  yet, `Snapshot.tools` and `Ev::Tool` are ready), art (12 insignias, two
  class symbols, looks, construct sprites), an optional unlock announcement
  beyond the Journal milestone, Hub ability/cooldown display, targeted
  `--rows` 16-seed runs beyond routine IDLE/PICKED, and the existing-tree
  extension.

## Owner tuning 2026-10-14

Owner decisions:

1. **Clown.** Default pace should sit between its earlier pace and the
   Rogue's median: clearly above D19–23, below or near D28. Skilled play
   (packages and pen rows that use decoy, counter and pause well) should meet
   or beat the Rogue's median. The weakness was that every ability costs an
   attack and repaid too little. Only Clown content numbers change.
2. **Engineer.** The first instruction ("the mace stays 4–8") was corrected
   by the owner the same day: "Make turret stronger and mace weaker." The
   Engineer's power moves from melee to the sentry, and its overall pace stays
   near the Fighter's. Only Engineer content changes.

Base: `origin/main` 8bee3697, which includes Cut227 recovery (12000 ticks,
L5 at 200 runs) and Cut228. Evidence is in `docs/evidence/cut225/clown-tuning/`.

### Changed numbers (`tools.rs`, `Hero::atk`)

| Number | Before | After |
| --- | ---: | ---: |
| Turnabout damage | 4 | 10 |
| Turnabout window | 20 ticks | 30 ticks |
| Turnabout cooldown | 60 ticks | 40 ticks |
| Turnabout blows per window (`COUNTER_CHARGES`, new) | 1 | 3 (one per real adjacent melee miss) |
| False bow pause (non-boss; boss cap stays 5) | 10 ticks | 30 ticks |
| Bell lure lifetime | 20 ticks | 30 ticks |
| Sentry HP | 12 | 16 |
| Sentry shot | 3 | 4 |
| Engineer melee (`ENGINEER_MELEE`, new) | 0 | −2 per blow, floor 1: the mace hits 2–6, below the sword's 3–7 |

Nothing else changed: no cooldowns or ranges of the other verbs, no tree node
increments, no default policy, no other class, and no item definition. The
global mace stays 4–8 for every other class, and the mace penalty applies only
to an Engineer's non-ranged blows. `Tools.counter_hits` is a new field. It is
serialized only while it is non-zero and exists only in Clown/Engineer runs.
New or updated tests: `turnabout_answers_only_a_real_adjacent_melee_miss`
checks the charges, and `engineer_melee_is_lighter_than_the_same_mace_for_anyone_else`
is new.

### Before/after (diagnostic, 10 seeds, 72 h from the same earned camps)

The command for both runs is
`cut225_classes DIR --seeds 1,2,3,4,5,6,7,8,9,10 --checkins 9`. "Before"
runs the base core with this example. The `send` waits out a death recovery,
which seed 6 needs under Cut227. "Skilled" adds the forecast's top package
move each check-in (PICKED's bar), every legal tree node and a five-row Clown
pen block (curtain when hurt and engaged, turnabout at two adjacent, bell
when engaged with a joiner, jape at three, bow) or a two-row Engineer block.
In the tables, "h28" is hours to D28; "—" means it was not reached by 72 h,
and those seeds count as 80 h in the median.

| Build | Before: median / mean best | Before: D28 reached, median h28 | After: median / mean best | After: D28 reached, median h28 |
| --- | --- | --- | --- | --- |
| Clown default | D24 / 24.6 | 2/10, — | D28 / 26.4 | 7/10, 72 h |
| Clown skilled | D28 / 27.8 | 9/10, 68 h | D28 / 28.0 | 9/10, 40 h |
| Clown Misdirector | D22 / 22.7 | 2/10, — | D24 / 24.8 | 4/10, — |
| Clown Counterplayer | D23.5 / 24.0 | 3/10, — | D24 / 25.1 | 4/10, — |
| Rogue default (unchanged) | D28 / 28.0 | 10/10, 44 h | same | same |
| Rogue skilled (unchanged) | D28 / 29.6 | 10/10, 24 h | same | same |
| Fighter, Clown camp (unchanged) | D28 / 29.5 | 10/10, 40 h | same | same |
| Engineer default | D28 / 28.5 | 10/10, 32 h | D28 / 28.5 | 10/10, 32 h |
| Engineer Emplacement | D28 / 28.5 | 10/10, 28 h | D28 / 28.5 | 10/10, 32 h |
| Engineer Fieldwork | D28 / 29.0 | 10/10, 32 h | D28 / 28.5 | 10/10, 32 h |
| Engineer skilled | D33 / 32.9 | 10/10, 16 h | D33 / 32.2 | 10/10, 16 h |
| Fighter, Engineer camp (unchanged) | D28 / 29.5 | 10/10, 28 h | same | same |
| Fighter skilled, Engineer camp (unchanged) | D33 / 32.5 | 10/10, 8 h | same | same |

Per-seed bests (seeds 1–10):

- Clown default before: 22/27/23/28/21/27/28/23/22/25.
- Clown default after: 22/28/28/28/28/28/28/23/23/28.
- Clown skilled after: 23/28/28/28/28/33/28/28/28/28. Hours to D28:
  —/32/64/32/24/56/48/56/24/16.
- Rogue default hours to D28: 48/40/64/40/40/64/40/56/40/48.

Tool receipts per run, before → after:

- Clown default:
  - counter damage: 28.9 → 87.6
  - damage per counter: 3.7 → 6.3
  - counters per window: 0.54 → 0.88
  - paused moves: 15.6 → 49.2
  - tool kills: 2.8 → 10.8
- Engineer default:
  - sentry damage: 1103 → 1303 (+18%)
  - tool kills: 56.5 → 71.1
  - sentries destroyed: 3.5 → 1.6
  - deaths per run: 0.62 → 0.59

Reading:

- **Clown default.** It now sits between its earlier pace and the Rogue. Mean
  best rose from 24.6 to 26.4, and 7 of 10 seeds reach D28, but late (median
  72 h against the Rogue's 44 h). Three seeds still stop at D22–23. The median
  best equals the Rogue's D28 because bests bunch at the D23/D28 walls. On
  hours to D28 and on mean best, the Clown default is clearly below the Rogue.
- **Clown skilled.** It reaches D28 on 9 of 10 seeds. Its median of 40 h
  beats the default Rogue's 44 h, and one seed reaches D33. It does not match
  a skilled Rogue (24 h).
- **Engineer.** Its overall pace is unchanged, the same as before and close to
  the Fighter: median 32 h against the Fighter's 28 h, and D33 skilled. Its
  damage moved from melee to the construct: 18% more sentry damage, 26% more
  tool kills, and half as many destroyed sentries.

Sweep: `sweep.txt` lists the candidate sets tried, measured on the
cut227-recovery-wip base with a temporary environment hook. The hook was
removed before commit. Lighter Clown sets (damage 8, one or two charges) left
the default at mean 24.3–24.8 and the skilled build at a median of 52 h. A
stronger lure/bow set without three charges did no better. For the Engineer,
melee −3 with shot 5 was faster than the Fighter (median 28 h), and a sentry
lifetime of 80 raised idle time to 41%.

### Invariance and checks

- **IDLE/PICKED.** `dayplayer --seeds 16 --days 14 --bots idle,picked
  --routine --threads 6` ran on base 8bee3697 (`ea45b8fbe95df509`) and on
  this core (`394b3281829a4e14`). All 32 per-seed results are byte-identical,
  and the bar table is identical. The table includes two FAIL rows that were
  present before this change: `PICKED ≥ 1.5× IDLE at D13…` (1.00 at D13) and
  `Scout bought ≤ min 15` (worst 19.3 min).
- **Native tests.** `cargo test -q --workspace --profile fast`: 938 passed,
  6 ignored. `cargo clippy --workspace --all-targets -- -D warnings`: clean.
- **WASM.** The fast build is 6850193 bytes, sha256 `5844fe1b…9977`. The gold
  settlements were repinned to `settlements-inputs-5844.json`, a copy of the
  Cut228 main manifest with only the WASM fields and a note changed, and it is
  now the test's default. `gold-settlements` passes 564 checks / 24 cases.
  Client `class-tools` (43 checks) and `class-tree` pass. oxfmt and oxlint
  are clean.
