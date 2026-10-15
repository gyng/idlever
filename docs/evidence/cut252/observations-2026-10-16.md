# Recursive tree observations — 2026-10-16

Engineering review of pinned current8879 source/earned saves, **not player
feedback or a fun verdict**. Root requested existing authored depth be visible;
this does not author the separately requested old-class expansion.

Source discovery: both old `roots.map` loops in class-tree.ts filtered only
`parent===root.id`. Existing third-tier Clown Ringmaster/Last laugh and Engineer
Artificer/Relay were absent from current and Full tree. Recursive native-parent
traversal now exposes those nodes with their real gates/status and stable IDs.

The first visual inspection of `ui-v2/clown-402-1x-current-leaf.png` found a real
layout failure despite passing width bounds: two cramped columns split Learn
into vertical letters. ui-foundations.css's more-specific auto-fit rule defeated
the generic container selector. The final scoped28rem override is explicit
about specificity. `ui-v3`'s red text-line assertion preserves the finding;
`ui-v4/clown-402-1x-current-leaf.png` was personally inspected and shows readable
Turncoat→Cruel joke→Last laugh with parent trunks and a complete Learn button.

`ui-v4/engineer-1440-1x-full-leaf.png` shows both roots and their middle/third
nodes with true parent trunks, gates and learned/available status. The
phone200% Relay card is taller than the visible panel; its caption is readable
and the action is reachable through actual scrolling, but the saved leaf frame
alone need not include the whole action. It is not a simultaneous-all-card
visibility claim. `deep-focus/{clown_ringmaster,engineer_relay}-keyboard.png`
were personally inspected: real keyboard focus ring on the owned third-tier
Skill rules summary, native learned identity and ancestry retained.

Actual earned continuations produced classL7 without XP grants. At that level
only one of the two third-tier leaves fits the remaining pick; independent
forks honestly demonstrate either choice, rather than silently patching a
sixth pick or demanding a longer arbitraryL8 continuation. Existing Gold/
classXP/owner invariants are retained in public action receipts.

The local four-tier fixture is shape coverage only. It must never appear as
proof that native five-class12node expansion or all30advanced interactions
exist. Root's draft Cut253 remains a separate native/content task.

Shelf life: revalidate on native parent graph/gates/points/identity wire,
current/frontier policy, fold/focus routing, class/owner lifecycle, material
specificity, viewport/font policy or runtime changes. These findings remain
historical observations of their pinned build; they do not establish future
player preference, gameplay strength, exhaustive accessibility or fun.
