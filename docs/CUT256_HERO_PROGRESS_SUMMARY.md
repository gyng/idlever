# Cut256 — retain personal and class progress in Hero Hub

The current broader client run exposes an actual Hub omission alongside stale
selectors: personal XP and the separate class-training XP disappeared when the
old hero sheet was replaced. Home's reduced chrome makes the Hub's canonical
progress read more important. Keep one compact personal-progress line and put
class-training detail under an explicit disclosure; no extra Home label.

Acceptance: actual earned personal level/XP/next match the selected Rust slot;
class training matches the distinct class track. A labelled controlled view
with HeroL3/ClassL10 proves those values cannot be interchanged. Live updates
refresh personal XP, activity and HP detail, retaining an open Training fold.
Ready/away/recovering use canonical life_state rather than obsolete state-only
assumptions. Opening/cancelling changes no save; closing removes subscriptions.
Phone402×681/desktop1440×900 normal/200% retain readable wrapped text,44px
action targets and no horizontal overflow. Existing ownership and stale-callback
guards remain. Preserve original failures and dated source-bound observations.

Parking status2026-10-16: canonical/controlled HeroXP versus classXP, live activity/
HP detail, open Training retention, save equality and listener cleanup pass the
updated hero-summary journey. Current default header adds one visible personal
XP line and a collapsed Training fold; desktop200% captures with that fold open
show a very tall identity header. Whole-window scrolling reaches Skills/Gear,
but compactness and primary phone200% usability remain open. Proposed next
refinement is to combine class/personal-level and presence/bloodline lines and
put detailed XP into one optional Progress fold; no compact-header edit was made
before parking. Preserve the expanded-header captures as a real finding.

Resume status2026-10-16: the header was compacted without losing a single value,
selector or accessible name (`web/src/hero-hub.css`, measured in
`docs/evidence/cut255/hub-header-probe-{1,2}/results.json`, summary in
`docs/evidence/cut255/observations-2026-10-16-resume.md`). The identity's short
values now pack onto shared lines (name and Training keep their own row), the
header's pad/gap went `0.75rem → 0.5rem`, the Training fold keeps a 44 CSS px
target instead of the material's font-scaled 88 px at 200%, and from 8rem of hub
width down the block takes its own row under the face. Measured header heights:
1440×900 2× 696 → 518, 402×681 2× 959 → 824, 320×1000 2× 1383 → 1029; the Hub's
3 px horizontal overflow at 320/200% (which failed `hero-hub`'s geometry gate) is
gone. At 200% desktop the tab row is now inside the initial view; the 200% phone
hub still scrolls past a header+tall-tabs stack larger than the viewport, and the
`hero-hub` journey now stops in its material-contrast stage — both recorded as
open Hub presentation work, not claimed as passing.
