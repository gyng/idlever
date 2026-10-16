# Cut255 — keep Home focused on the town

Owner feedback asks for fewer labels/icons, direct building interaction and a
friendlier opening. The retained mature three-resident Home audit has15distinct
visible functions against its unchanged12function limit. The three corrections
below reduce duplicated chrome while retaining every resident and building.
This contract addresses that existing failure; no engine/progression rule changes.

## Resulting interaction

1. Home's Legacy pill displays the current canonical amount/progress as a
   resource, like the other passive stats. Its existing upgrade panel remains
   available through the selected hero's Hub. Other screens keep their current
   header behavior. Avoid presenting a resource as a second Home upgrade button.
2. On mobile, remove the duplicate selected-resident roster card from Home now
   that Heroes lives in the bottom dock. The selected name stays in the header;
   actual resident and House sprites remain the primary Hub controls. The
   expanded Heroes roster keeps its existing locate/watch and Details actions
   for every actual owner. Desktop retains its compact roster column. Remove only duplicate interface chrome, never a
   resident sprite, and retain the existing expanded-roster semantics.
3. One Home Menu control groups Tasks, Journal and Settings. Journal moves from the
   bottom dock into this short labelled menu; Heroes remains in the dock.
   On mobile, mount the existing complete Tasks tracker inside Menu rather than
   adding a second scene disclosure. Preserve its exact ladder/worker ETA/quest
   values and callbacks. Desktop retains its scene overlay. Existing contextual
   quest/Journal links still route their actual entries.
   The menu uses existing sheet/focus/Escape behavior and accessible names.
   Before Journal exists, the settings control remains directly available.

The expected mature function inventory is12: Gold ledger; Menu; five services
(Savings, Forge, Guild, Recovery pool, Clone vat); three owner-specific Hubs;
Heroes roster; Send. Count actual callbacks/owners, including diegetic controls.
Do not exclude sprites, inflate the limit, collapse distinct owners into one,
hide buildings or treat locate as equivalent to Hub just to obtain a pass.

## Acceptance

- Reproduce the mature native-earned three-resident case on the current real
  ef4b runtime, retaining source save/owner identities and actual enabled state.
  Primary402×681 browser-content viewport has≤12distinct visible functions,
  with a saved complete physical target inventory and justified callback keys.
- Review402×681 and1440×900 at normal/200%root text. Preserve one-row mobile
  header, reachable complete pills,≥44px actionable targets and0horizontal
  document overflow. Keep the routine matrix to these four cases.
- Actual mouse/touch-sized clicks and keyboard open Menu→Journal and
  Menu→Settings; Escape/close returns focus to a connected Home control.
  Journal's actual route actions still work; only one sheet/panel is open.
- Actual House/resident sprites and expanded-roster Details resolve the correct
  canonical owner Hub. Expanded roster locate and an actual away-owner Watch
  route still work. The duplicate Home selected card has no hidden focus target.
  Legacy upgrades remain available through Hub with unchanged canonical values.
- Keep fresh pre-House construction/arrival and Heroes disclosure behavior.
  No added early wall of text or unearned building/control is introduced.
- Compare full saves after read-only opens/cancels. Selection may change only
  the intended selected owner; no Gold, gear, history, family or policy mutation.
  No new art dependency without a primitive fallback.
- Run affected current client journeys, TypeScript, lint, format and copy checks.
  Record original failures and dated source/viewport/input observations. A local
  Chromium approximation is not real iPhone/Safari or fun acceptance.

Status2026-10-16 (resumed): the Home contract's own four-case matrix now
**passes** on the current source — `docs/evidence/cut255/home-proof/attempt-5`
(exit 0, status PASS, four cases 402×681/1440×900 at normal and 200%, no page
errors, served `ef4b58d7…`). At 402×681 the complete physical inventory inside
`.camp` is exactly the 12 expected functions at both text scales; the Tasks
tracker lives in the Menu panel on mobile and adds no Home function. Menu→Journal
and Menu→Settings pass by pointer and keyboard with focus back on the connected
Menu stud and exact unchanged saves; the three residents, House and expanded
roster all resolve the canonical Hub with canonical personal/class XP and live
HP; an away-owner Watch route works; the fresh pre-House flow and read-only save
equality pass. Two defects found and fixed while getting there (see
`docs/evidence/cut255/locate-fix-observations-2026-10-16.md`): the roster locate
wrote into the disposed scene after a remount, and the town's scene clock could
start negative so `focusHero` could silently do nothing. Both the parked bounded
cross-owner proof (`cross-owner-locate-2`) and the four-case matrix are green.

Affected client journeys: 11/12 (`docs/evidence/cut255/affected-current.log`);
TypeScript/lint/format/copy pass. `hero-hub` now passes the density/geometry
stage it previously failed (the Hub's 200%-text horizontal overflow) and stops
later in its material-contrast stage — a Hub presentation finding, recorded for
the UI owner in `docs/evidence/cut255/observations-2026-10-16-resume.md`; the
pre-compaction source never reached that stage (it failed geometry first), so
this is not a known-good→known-bad regression. Phone 200% Menu/Tasks typography
now measures exactly 2.00×. Desktop 200% Hub tabs are inside the initial view;
the 200% phone Hub still needs scrolling (its tall tab stack is a deliberate
font-relative rule). Do not carry a density, typography or full visual pass
forward.
