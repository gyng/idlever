# Cut250 observations — 2026-10-16 Asia/Singapore

Owner feedback: the Home screenshot looks vertically stretched; Heroes could
move into the bottom bar; mobile resources should occupy one row with more
pill side spacing. Earlier feedback asks for realistic browser dimensions,
few presets and dated observations with a limited shelf life.

Measured on current fast WASM8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff,
using the earned menu input and source hashes in each raw result. One phone
browser-content approximation402×681 and desktop1440×900, normal and200% text.
Private-display Chromium captures do not establish actual iPhone/Safari behavior.

Pre-fix `../cut243/aspect-diagnostic-8879/results.json` records402×520buffer
shown402×360 (vertical factor0.692), then402×360buffer shown402×576 (factor1.6)
after larger text. Source review found uniform camera/atlas scaling. Interpretation:
layout changed before a throttled draw resized the backing buffer. The renderer
now lets actual resize/camera changes through the frame cap on the next draw.
It still takes that next frame; no synchronous resize guarantee is claimed.

Corrected `../cut243/aspect-fixed-8879/results.json` passes4GL captures and4
real context-loss Canvas captures, two restores and exact save preservation.
Phone buffers match CSS dimensions; desktop differs by less than one physical
pixel from fractional CSS bounds. Captures wait for the actual active buffer.
Normal and200% phone images were visually inspected: building proportions are
consistent. These are aspect/correctness observations; timing counters gathered
while other native work runs are not performance evidence.

That raw result's canvasAspect width/height fields are backing-buffer dimensions,
because object spreading overwrote viewport fields. The four viewport bindings,
in original order, are402×681 at1×/2× and1440×900 at1×/2×, established by parent
rows, harness loop and image names. Raw results remain unchanged; the successor
harness uses explicit viewportWidth/viewportHeight fields.

`../cut243-mobileheader/compact-focus-fixed-8879/results.json` passes4views:
phone Home/Watch headers62px, desktop82px at both text scales; all20keyboard
resource focus checks reveal the entire pill. Actual Gold/Legacy/Settings and
Heroes opening/Escape preserve saves/focus; Heroes survives100App.refresh calls
per view. A prior200% focus failure is retained in compact-final-8879; browser
native focusing only partially revealed Gold. Explicit nearest scrolling fixes it.

TypeScript, lint, formatting and copy budgets pass after the final event type
annotation. Capture harness metadata was subsequently clarified as described
above; neither change alters the captured rendering behavior.

Shelf life: reassess after header/dock/layout, font/zoom, viewport assumption,
canvas resize/throttle/context handling, resident/controller or resource route
changes. A new native runtime needs its own accounting acceptance. These owner
comments and measured checks are not independent player/fun feedback and do not
close the full handoff, menu audit, paper doll or GPU cost requirements.


Broader regression follow-up: bloodline-founding passes at the original stress
widths. runsui:heroes initially stops at obsolete .hero-sheet expectations;
current Hub ownership/name/Legacy assertions replace that selector. A controlled
presentation-only live-state fixture now sets canonical life_state=away alongside
legacy state=live; exact native-save preservation remains required. These are
test-model corrections, not new native behavior.

The retained Home function budget still fails. Three ready residents in the
mature earned camp produce18physical controls and16old semantic keys. Direct
callback review correctly merges selected-resident sprite/house/Details as one
owner Hub; the corrected count is15, still above12 at320×900,400×900 and the
primary402×681. Guild opens Works, pool opens recovery, device opens deliberate
rebirth, and Ready locates the selected actor, so these cannot simply be counted
as duplicate Heroes routes. Diegetic sprite hits account for ten physical
controls; they are not ten persistent icon labels. Neither observation erases
the numeric failure. Original reds, full control rectangles and callback audit
remain in heroes-density-direct-8879/. No budget was raised or actors hidden.
