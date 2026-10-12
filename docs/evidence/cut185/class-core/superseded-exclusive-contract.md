# Cut 185 — optional branching class paths

The owner requests deeper class trees and steady progression. All five classes gain
exactly two roots, each with two alternative leaves (30 authored nodes). Roots
require class L3 and historical D8; leaves require L7 and historical D18. No default
choice, new currency, XP resets, ability unlocks or required upgrades. The existing
ability ladder and later specialization remain unchanged.

A chosen leaf replaces its root's policy with an explicitly previewed one or two
contextual rows using abilities already unlocked at L7. Rows follow safety,
drills, specializations and equipped tactics, preceding generic fallback. Literal
player policies receive no automatic rows. Changes are free at a built home with
no active run. Root changes clear their leaf; leaves reject a different parent.
Each bloodline remembers paths separately for each class. Old saves omit the
empty field; no-selection simulation and cache keys stay identical.

Wire: Lineage.class_tree contains class, level, xp, next, selected_root,
selected_leaf, available, blocked, remove_available, remove_blocked and nodes.
Nodes contain id, name, parent, required_level, required_depth, selected,
available, blocked, tactics (actual Row[]), effect. setClassPath(id) selects one
node; none removes the current class's path. All gates and actions are Rust-owned.

Acceptance: 5 classes ×6 unique nodes; all 30 preview verbs unlocked at their
required level; 100% exact-save refusal checks for wrong IDs, parents, levels,
depths, missing house and away state; old-save and none round trips; class and
bloodline isolation; named compiled rows and priority; actual existing actions;
whole/sliced/reloaded deterministic replay for selected paths. Full native/client
acceptance follows integration. No deployment or claims of verified fun from
mechanical acceptance.

## Client pacing and review

Before L2 the new panel is absent. At L2 it names only the first milestone,
L3/D8. The first actual decision shows two roots. After a root is selected,
only that branch's two refinements appear when available or one class level
away; earlier, a single L7/D18 next-fork line replaces the future choices.
Other paths and the full map require deliberate expansion. The map names
all six nodes and their actual core requirements. No modal interrupts level
ups and no path is required to send, progress or hire workers.

Class pickers keep learned skills plus one next ability tier visible; later
skills remain in a fold. Existing XP amounts, thresholds and automatic ability
unlocks stay core-owned and unchanged. This pass paces the player's decisions
and information; it does not claim measured retention or all-seed balance gains.

Each choice opens a read-only review of the actual rules, bloodline and free
home change. A refinement states that it replaces the root tactics; changing
roots states that the selected refinement clears. Cancel does not mutate;
stale class/bloodline/qualification/run changes invalidate confirmation;
busy confirmation accepts only one transaction; refusals remain visible.
Owned choice and folds survive normal lineage repaint. Literal policies are
labelled Written rules, since a path never injects rows into those policies.
Numeric client gates: real-worker interaction at320/400/1440, all five classes,
L1/L2/L3/L6/L7 progression, root/refinement/change/remove/reload, no overflow,
cancel/stale/refusal/double-confirm, core XP/resources unchanged by a choice.
