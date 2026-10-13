# Cut 193 — readable history and stable chrome

Owner resumed the queued work. This checkpoint implements queue12,32,33 and
part of9. It changes presentation only; Rust run outcomes, rewards, hero identity
and automatic delves retain their existing rules.

## Contract

1. Expanding/collapsing camp run diagnostics at1440px retains the
   clicked summary's screen position and viewport reading position within2px.
   At320/400px this desktop-only panel stays hidden. Diagnostics scroll in their own bounded slot instead of
   resizing the central town scene. Keyboard focus remains on the disclosure.
2. Top/bottom bars have zero periodic sweeping-sheen animations. Static material,
   hover/focus feedback and effects elsewhere remain available.
3. Empty Chronicle names the current bloodline/hero, explains that it records
   ended heirs rather than every delve, and links to the current hero and Runs.
   The same state appears in the log's Heirs tab. Other bloodline records remain
   visible beside the current empty state; one real record replaces the empty
   state. No invented record and no suggestion to die deliberately.
4. Player-facing action labels use Delve where Send meant entering the dungeon.
   Wire methods, CSS hooks and internal terminology are unchanged.
5. Focused browser checks cover empty/current/other-bloodline/first-record states,
   disclosure scroll/layout, effects-on bar style and accessible action labels.
   Visual screenshots use the private GPU harness; ordinary assertions headless.

## Evidence

Implemented. Final headless focused checks pass3/3 groups in8.7s, including33 new
disclosure/history checks and the existing ownership/death-action groups. Final
private-GPU run passes33 checks, including both navigation links, at320/400/1440.
Screenshots and raw failures are under docs/evidence/cut193/. Desktop pre-fix
expansion shrank the town and moved its summary87.5px; size containment and
bounded internal scrolling keep each within2px. Static bar material remains;
the periodic j-sheen block is removed. TypeScript, Oxlint and copy lint pass.

This checkpoint does not certify the
complete product queue, the exhaustive balance audit or the fun-rating goal.
