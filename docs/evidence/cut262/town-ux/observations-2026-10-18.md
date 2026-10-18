# Cut262 town UX — observations 2026-10-18

Build/source: branch `cut262-town-ux` on local main `f0e095a2` plus this commit's working tree; real WASM from `tools/wasm.sh` (fast
profile), Vite dev server on :5401. Save: `web/tests/fixtures/earned-gunner-home.json` (seed 52, Vale Ash, gunner, $48 536, Legacy
offer pending) unless noted. Input: Playwright headless Chromium (`tools/browser.mjs launchBrowser`, SwiftShader), mouse at desktop,
taps at phone. Viewports: 1440×900 and 1280×800 desktop; 402×681 CSSpx phone (`phoneReviewViewport()`), text scale 100%. Captures
are visible-viewport screenshots, not full-page. Machine load average 105–150 during every run (shared box), so timing-gated tests
flaked; see "Confidence".

## Owner feedback (verbatim, the brief)

1. "lots of layout shift on desktop eg, legacy setting control should not be a toast, it should be in a building that lets you handle
   automation"
2. "task lists should highlight when can be completed. clicking it should highlight the building or item that should be clicked"
3. "boss portraits in killed is very confusing"
4. (added mid-task) "i'm getting native tooltips in addition to html tooltips in browser"

## Automated measurements — CLS (PerformanceObserver `layout-shift`, no recent input)

Flows (scratch harness, real WASM, earned save): boot into camp (8 s), Delve → watch (9 s), back to camp (8 s), reload with
`?absent=8h` → report (9 s), open `details` (3 s). Sum of shift values per phase.

| viewport | phase         | before (base f0e095a2) | after  |
| -------- | ------------- | ---------------------- | ------ |
| 1440×900 | camp boot     | 0.0059 / 0.0040        | 0.0001 |
| 1440×900 | camp → watch  | 0.0295 / 0.0508        | 0.0033 |
| 1440×900 | watch → camp  | 0.0266 / 0.0243        | 0.0004 |
| 1440×900 | report boot   | 0.0210 / 0.0195        | 0.0022 |
| 1440×900 | report detail | 0.0000 / 0.0029        | 0.0000 |
| 1280×800 | camp boot     | 0.0090                 | 0.0001 |
| 1280×800 | camp → watch  | 0.0914                 | 0.0052 |
| 1280×800 | watch → camp  | 0.0150                 | 0.0005 |
| 1280×800 | report boot   | 0.0252                 | 0.0018 |

(Two "before" runs at 1440; run-to-run noise on the busy machine is about ±0.005.) Sources found by shift attribution and
element-rect diffing, and what changed:

- The busy bar swept by `left` (then, measured, even a transform reported shifts): now a background sweep in a still box.
- Camp remounts drew the town's hit targets at the scene's corner for a frame, then jumped: they stay hidden until the scene stands in
  the page (`town.ts layout`).
- The one-time Legacy/ranks offer was a chip row in the camp grid: its arrival and departure resized the town above it. Gone (below).
- The watch's combat history grew 0→3 lines under the tactic cues and ticker, lifting them each line; on desktop it keeps its
  three-line box from the first frame.
- The hand-control slab mounted with its pad and verbs shown, then collapsed; they start hidden, and the floating slab holds its height.
- The docked fold strip stepped the HUD down 22 px and back over a run's first seconds; on desktop the HUD keeps that row.
- Screen-to-screen: camp, watch, report and death used three different column pairs (camp 288/245, watch 317/202, report 403/245 at
  1440), so the roster and the well jumped sideways on every screen change; all now share `--wide-l`/`--wide-r` (288/230 at 1440,
  280/220 at 1280). Not counted by CLS (a new screen), but the most visible jump.

Remaining, small: the watch console grows by its scrub row once (~0.0008), the speed badge's width changes with its label, and the
container of the watch's message stack moves when a transient ticker line appears above the fixed part (the cues below stay put).

## Agent visual review (screenshots in this folder)

- `camp-1440.png`, `camp-402x681.png`: no chip row under the town; the Guild reception (the receptionist's hall) wears its lantern,
  name `Guild reception · Legacy order`; a one-time toast `Legacy · Guild` (3 words) points there.
- `guild-orders-1440.png`, `guild-orders-402x681.png`: the Guild's works sheet now ends its worker cards with **Orders** — Legacy
  spend (balanced · health · damage · armour · off) and worker ranks (auto · off) — and a `Run setup ▸` link to the full orders sheet.
  The announced row has a quiet gold edge. The desktop works sheet is one column now; its old second column squeezed the branches to a
  letter per line (pre-existing, seen while placing the orders).
- `task-point-1440.png`, `task-point-402x681.png`, `menu-tasks-402x681.png`: completable tasks get a filled gold pip, brighter title
  and a faint band (no motion). A tap rings the surface that completes it — here `Class builds` → the house — with a two-pulse gold
  ring (~2.6 s); at the phone the Menu closes onto the ring. Desktop task entries were not clickable at all before (the tracker's
  `pointer-events: none` was inherited through `all: unset`, so the town canvas took the taps) — fixed.
- `report-bosses-1440.png`, `report-bosses-402x681.png`: what confused — "Boss defeated" showed one row per hero, the same boss face
  twice, the hero's name under the boss where it read as the boss's victim, next to the red `3 died`. Now: **Bosses slain**, one row per
  boss, the portrait muted with a gold crossed-blades mark, `slain by Vale Ash · Thorn`, and, apart in red, `killed 3 heroes` from the
  report's own deaths to that boss.
- `cls-after-1440/`: the flow screens after the change (watch, back to camp, report) at 1440×900.

## Native tooltips (automated)

`tips.ts` now holds the `title` of the hovered trigger and every element around it while the pointer rests there, gives it back on
leave or close, and lets a body that reads `title` (the home tiles' reasons) see it while the plate is built. `town-ux --part=titles`:
4/4 camp tip hosts open their plate with no `title` under the pointer and get it back after. `tips.mjs` on this machine, same hour:
clean base source 56/70; this tree without the title change 47/58 (+1 runner error); this tree with it 56/70 — the same 14 failures
(tile/seal/lever long-press and hover, "one plate at a time", "report marks its words") in the base run, so they are load timing here,
not this change. Rerun alone on a quiet machine before trusting either count.

## Tests

- New `web/tests/town-ux.mjs` (legacy, tasks, shift, titles): 19/19 pass (parts run separately and together).
- Updated `report-bosses` (32 checks pass at 400 and 1440), `enemy-tips` (one row per boss; passes except its touch long-press step,
  which fails on the base source too under this load), `cut120 --part=offer` (8/8, the Guild flow).

- Routine client subset (`run.mjs --smoke`, :5401, load ~80–150): 29/41. Rerun alone: watch-console, death-fix-discovery,
  watch-live-edge pass (watch-live-edge had been hit by a dev-server reload while the agent stashed source for a base comparison).
  glossary, package-selection, gunner-observer, fights and forge-requests fail identically on the base source alone; hero-hub,
  post-clear-town, worker-first-act are on the known pre-existing list; clarity:paint is a ≤ 1.2 s paint budget (3.4 s under load 81).
- `pnpm fmt:check`, `lint`, `tsc --noEmit`, `copy-lint` (0 violations) pass. Cargo tests not run (no Rust change).

## Interpretation and confidence

Confidence high that the listed shift sources are gone (attributed entries vanish; numbers drop by roughly 10×). Medium on the
absolute CLS values (busy machine, ±0.005). Owner-facing comprehension of the boss rows and the task ring is the agent's visual
judgement only; no owner or blind-rater check yet. Revalidate if the camp grid, watch dock or tips change.
