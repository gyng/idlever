# Cut255/Cut256 resume observations — 2026-10-16

Dated engineering observations from resuming the parked Home work. Headless
Chromium (private display), real `ef4b58d7…` WASM from a fresh Vite test server,
the genuine mature three-resident session produced by the proof itself
(Bloodline 1 Vale Ash L10, 2 Bryn Thorn, 3 Corin Flint · gold 48036 · Scout
disabled · both extra bloodlines founded at the quoted 250 Gold). Not Safari,
not GPU/performance, not owner or player feedback, not fun.

## Cut255 Home matrix — PASS (attempt-5)

`docs/evidence/cut255/home-proof/check.mjs attempt-5`, exit 0, status PASS,
`fontFailures []`, no page errors, one served package (`ef4b58d7…`). Four cases:
402×681 and 1440×900 at normal and 200% root text.

- **Density (the parked 13-function failure).** At 402×681 the complete physical
  inventory inside `.camp` is exactly the 12 required functions at *both* text
  scales — `gold, menu, savings, forge, guild, recovery, clone, hub:1, hub:2,
  hub:3, heroes, send` — and all 12 are inside the visible viewport. The Tasks
  tracker is no longer a Home surface on mobile: `[data-tasks]` lives in the Menu
  panel (`data-tasks` count 0 in `.town`), so it adds no function to the screen.
  Desktop still reports its compact roster/Locate/Chronicle and the scene Tasks
  overlay (18 physical, 11 visible) — reported, not part of the mobile bar.
- **Three residents retained** and no duplicate selected-resident card
  (`.hero-mobile .hero-row` count 0).
- **Menu.** Menu → Journal and Menu → Settings by pointer and by keyboard, four
  routes: exactly one sheet visible after each, focus back on the connected
  `[data-home-menu]` stud, exact unchanged save each time. Menu/Tasks typography
  measures exactly 2.00× at 200% (`menuFonts`, `taskFontRatios` all 2.0) — the
  parked "phone Menu/Tasks typography unreached" finding is now measured.
- **Owners.** All three resident sprites, the House and all three expanded-roster
  Details resolve the canonical owner Hub (`hubProgress`: `Hero L{n} · XP x/y`
  from the selected Rust slot, the separate class track under Training, live
  `data-hub-life-state` text/title), the expanded-roster Locate shows a connected
  52×52 ring, and an actual away-owner Watch route works. Full saves equal the
  base after read-only opens.
- **Fresh pre-House flow**: no Home Menu before the Journal exists, Settings
  directly available, House arrival and the Heroes dock reachable, saves exact.
- **Nested sheets (measured, not papered over).** On mobile, a task entry inside
  the Menu routes to the Journal as a sheet *over* the Menu (Menu `hidden`+`under`,
  Journal with a `‹` back, recorded `backButtons: 1`); it takes two Escapes to
  return to a Home control (`taskClosePresses: 2`). This is the platform's existing
  sheet/Escape behavior, which CUT255 §3 asks the menu to keep. The Menu's own
  Journal/Settings chips close the menu first and clear in one. Only one sheet is
  ever visible.

## Affected client groups

`screens ui:frame post-clear-town ambient-motes class-switch runsui:heroes
first-plot game-menu town-clock town-save hero-summary hero-hub`:
**11/12 PASS** (`docs/evidence/cut255/affected-current.log`). The clock change is
covered by `town-clock` (36 checks) and `town-save`; the camp/locate change by
`runsui:heroes`, `screens`, `ui:frame`, `first-plot`.

`hero-hub` failed on the Hub's 200%-text geometry: at 320 CSS px width with a 200%
root font the hub measured `scrollWidth 208` against `clientWidth 205` — a real
3 px horizontal overflow from the identity column (see below). After the header
compaction the geometry stage passes and the group progresses to its
material-contrast stage; that stage's outcome is recorded separately below.

Static: `tsc --noEmit` 0, `pnpm fmt:check` 0, `pnpm lint` (deny-warnings) 0,
`tools/copy-lint.mjs` 114 files/2850 literals/0 violations.

## Cut256 Hub header: the 3 px overflow and the tall 200% header

`docs/evidence/cut255/hub-header-probe.mjs` measures the header's parts at four
viewports/scales plus 320/400×1000 (the geometry gate's own widths).
Before (`hub-header-probe-1`), the identity column children measured `x 153.6,
w 88` against a **61 px** column: at 200% text every rem gap doubles (0.75rem
padding + 0.75rem gap = 48 px) while the face column keeps its 72 px, so the
column collapsed and its own words hung past the window. At 320×1000/2× the hub
overflowed by 3.2 px. The header itself measured 1383 px at 320/2×, 959 px at
402/2× and 696 px at 1440/2× — at 200% nothing below the header was visible
(`.hero-hub-tabs` `visibleH 0`, `.hero-hub-content` `visibleH 0`) on either
viewport.

Change (`web/src/hero-hub.css`):

- `.hero-hub-header` padding/gap `0.75rem → 0.5rem`.
- `@container hero-navigation (max-width: 8rem)`: under 8rem of hub width the
  block takes its own row under the face — `rem`, so bigger text reaches the
  threshold at a wider viewport, the same font-relative convention as the
  existing tab rules (`15rem`/`420px`). At 1× it never fires on the supported
  widths (320 hub = 205 px > 128 px); at 2× it fires at 320 (205 ≤ 256), not at
  400/402 (280/282).
- `.hero-hub-identity` `grid → flex, wrap`: the name and the class-training fold
  keep their own row, the short values (`class`, `Hero L · XP`, life state,
  `Bloodline n`) pack onto shared lines; `min-inline-size: 0` lets them shrink
  instead of pushing the window.
- The Training fold keeps a **44 CSS px** target instead of the material's
  font-scaled `2.75rem` (88 px at 200%), matching the Hub's other control opt-outs
  (`hero-hub.css` §Cut220). Its text and `Class L · Class XP` values are unchanged.

After (`hub-header-probe-2`), with every value, selector and accessible name kept:

| case | header before | header after | hub overflow |
|---|---|---|---|
| 402×681 @1× | 379 | **308** | 0 |
| 402×681 @2× | 959 | **824** | 0 |
| 1440×900 @1× | 338 | **238** | 0 |
| 1440×900 @2× | 696 | **518** | 0 |
| 320×1000 @2× | 1383 | **1029** | **3 → 0** |
| 400×1000 @2× | 959 | **824** | 0 |

At 200% desktop the tab row is now inside the initial view (`visibleH 216`, was 0)
— it is the navigation, so that is the meaningful "content visible" step. At 200%
on a phone the hub still needs scrolling: the tall tab stack is 331 px by design
when the hub is under `15rem` (a font-relative rule, so 200% text gets the single
column), and the header alone is 824 px on a 681 px viewport. Recorded, not
claimed as fixed.

## Limits and shelf life

Local Chromium geometry/timing, one genuine fixture, engineering observation.
The contrast stage of `hero-hub` is recorded separately; the header numbers
expire when the Hub markup, its materials, the sheet frame or these probes
change. Revalidate rather than carrying a pass forward.
