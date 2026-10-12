# Cut 185 — cumulative class skill trees

Owner amendment: "A larger ability tree with cumulative unlocks" supersedes the
exclusive combat-path proposal preserved in evidence/class-core. All five
classes gain two roots, each with two children, initially30 authored skills.
Learned nodes accumulate: no choice deletes a parent, sibling or other branch.
Skill variants use existing unlocked class verbs; the existing automatic ability
ladder and later specializations keep their schedules.

Roots require L3/D8; each branch has one child at L5/D13 and one at L7/D18.
Class levels earn a derived budget min(6, level-2), one pick per learned node.
No extra XP grind, separately earned currency or default choices. Free current-class
reset at a built home returns all derived picks without resetting XP. Learning
and reset refuse live runs. Memory is per class and bloodline, persisted in
Rust. Parent required before child. Descendants compile before parent policies
in stable authored order, independent of purchase order. Named policies follow
pen, safety, drills, specializations and equipped tactics, above fallback.
Literal written rules are never automatically replaced.

Wire Lineage.class_tree: class,level,xp,next,points(unspent),spent,available,
blocked,reset_available,reset_blocked,nodes. Node: id,name,parent,required_level,
required_depth,owned,available,blocked,tactics(actual Row[]),effect. APIs
learnClassSkill(id) and resetClassSkills(). All validation is Rust-owned.

Acceptance: five classes ×six unique nodes, two roots and two children each;
all30 preview verbs already unlocked at their gate; exact refusal for unknown
IDs, parent, level, depth, house, away and exhausted picks; cumulative parent,
sibling and branch retention; budget/refund/no XP loss; class/bloodline isolation;
old save and empty no-choice exact roundtrip; stable learning-order-independent
compilation and descendant priority; existing actual leaf actions in all five
classes; whole/sliced/reloaded deterministic replay. Ninety bounded seeded
policy diagnostics record combat, depth and per-node fires with scope limits.
No universal balance or fun score claimed from controlled fixtures. Full native
and client acceptance follows integration. Do not deploy.

## Client pacing

At L1 the new panel is absent. At L2 one line names L3/D8. Learned
nodes and the next reachable tier are visible; later nodes stay in a folded
full map. A learned parent's L5/D13 child appears at L4, its L7/D18 child at L6.
Two roots form two persistent branches. Learned abilities never disappear
when another branch is learned. Skill rules on owned nodes fold individually.
The header shows unspent picks, and exhausting a budget names the next class
level. One derived pick per level limits decisions to the existing XP pace.
No forced modal on level-up, purchase or returning from absence.

Class pickers show learned abilities plus the next normal ability tier; later
skills stay available in a fold. Core XP, thresholds and ordinary automatic
ability unlocks remain unchanged. These display choices reduce simultaneous
information; retention and player comprehension still need fresh play evidence.

Learning opens a preview of the actual ability benefit, rules, owner and cost.
Cancel preserves the save. A stale class, bloodline, qualification or run blocks
confirmation. Busy confirmation sends one transaction. Core refusals remain
visible. Reset reviews refunded picks and removes only current-class learned
skills; XP, gold, Legacy, other classes and bloodlines remain untouched.
Client gates:320/400/1440 real-worker, all five cumulative trees, stages L1/L2/
L3/L5/L8, both roots/all children, exhausted picks, stale/cancel/refusal,
double-confirm, exact reload, reset refund, unchanged XP/gold and no overflow.

Each learned node also improves its actual class ability by a small explicit
amount shown in the node brief (damage, cooldown, duration, healing or boss melee
mitigation). Six class-local authored bits are validated from learned IDs and
snapshotted into the hero at send; old/no-choice masks are zero and omitted.
No hot tree lookups, additional RNG draws or new tick scheduling. A nonzero mask
participates in forecast identity even when literal player rules are unchanged.
