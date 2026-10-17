# UI clarity pass, first hour (2026-10-17)

Agent visual review and automated checks only; no owner or player feedback was collected in this pass.

- **Build:** parent `f4b76c7b` plus the uncommitted web/src changes in this commit. Engine: the WASM
  development package in `web/src/engine/pkg`, `idlever_wasm_bg.wasm` sha256 `534102f7bfd8c6d1…`, built 20:32
  local time. Another agent was changing core economy files during this pass, so the core numbers in these
  shots (gold, rates, sends) describe that working tree and are not a reference.
- **Viewport:** 402×681 CSS px (`phoneReviewViewport()`), DPR 2, headless Chromium through `tools/driver.mjs`
  (SwiftShader). This is the visible viewport only, not real Safari. I also checked the watch at 1440×900 for
  the speed tile, the hand cue and the console layout.
- **Input:** scripted taps through the driver. Real engine `?dev=1&seed=157&fresh=1`: build the house, Delve,
  watch, the report, the hero hub, Behaviour and Tactics. Fake engine `?engine=fake&seed=7&fresh=1` with
  `openWorks` for the Workers sheet, which has the same lineage as the cut258 evidence.

| # | Item | Before | After | What changed | Confidence |
|---|------|--------|-------|--------------|------------|
| 1 | Watch Speed tile | `01-speed-tile-before-402.png` | `01-speed-tile-after-402.png`, `01-speed-sheet-after-402.png` | The live clock reads `now 8×` and sits apart from the mode name. The mode name has a ▾ caret to show it opens a menu. Each mode in the sheet has a ≤ 3-word caption (`steady`, `skips travel`, `all quick`). The stage reason chip (`quiet · 19×`) is now a button that opens the same sheet. The tile has a `speed` keyword tip: `watch pace · slows for fights, speeds through quiet` plus the current mode. | medium. The layout is verified. Whether players still read it wrong is untested until a blind reader looks. |
| 2 | Behaviour label clip | `02-behaviour-before-402.png` (`COM/BAT/STYL/E`, 38 vs 44 px) | `02-behaviour-after-402.png` (`COMBAT STYLE`, client 116 = scroll 116) | `.row.tablet.compact` forced a 38 px column on the packages strip. That column is now `auto`, and labels break only between words. Scrolled content now passes under a band in the window's own colour that carries its top rule, instead of sliding over the rule. The band adds no height, so nothing moves at rest. | high |
| 3 | Hand mode | `03-hand-before-402.png` (only the `Hand` badge, plus a misleading `travel · 8×` chip) | `03-hand-after-402.png` | A stage pill reads `awaits order` (or `acting`) with a gilt `auto ▶` button: one tap returns control to the rules. The speed reason chip is hidden while in hand. I checked by tapping the cue: the badge left `Hand` and the control panel reset to `data-on=0`. | high |
| 4 | Tactics `compare outcomes` cut off | `04-tactics-before-402.png` | `04-tactics-after-402.png` | Every centred window with more than 24 px of content below the fold now shows a fade over a ▾ caret (`data-more`, set from the scroll position and a ResizeObserver). At the end of the scroll the caret disappears. | high |
| 5 | Workers names | `05-works-before-402.png` (`LILI ·` / `PORTER II`; `Aletta given`) | `05-works-after-402.png` | On the rank card the name and role stack and the separator is dropped. The given worker is listed by name only; `came with the town` is now in her hover text, and in Settings. | high |
| 6 | Report decision share and time | `06-report-before-402.png` (both inside `details`) | `06-report-after-402.png` | `Who decided` (the build and credit bars) and `Time` (`fight 9% · travel 91% · chores 1%`) now sit on the report surface, above `details`, one line each. The fold's `Who decided` group was removed. The `carried` fold under the go button is renamed `includes`. | high for the layout; the clarity gain is untested |
| 6b | PENDING order before deltas | — | — | **Deferred.** Painting in delta order needs either an `unlockDeltas` ask from the report (0.1–0.4 s of main-thread engine time, and the deltas' first measurement moves, see cut257 §O4) or a sort without deltas, which changes which unlocks are shown. Both are core-adjacent value changes. First-hour players see no unlock cards before the pen opens. | — |
| 7 | Hero hub: a tapped tab looked inert | `07-hub-tab-before-402.png` (Behaviour selected; its content entirely below the window's fold) | `07-hub-tab-after-402.png` | A tapped tab whose section starts below the visible window scrolls the tabs to the top, with the section under them. The old `el.scrollTop` restore targeted a non-scrolling element. | medium |

## Other observations (not fixed; ranked)

1. In the hero hub on a phone, the sheet body stops at the close stud's column, which leaves about a fifth of
   the width unused beside every section. A layout change touches every hub section, so I did not attempt it here.
2. `Ready behaviour.` and `Actual · None  Next delve · None` / `Hire the Receptionist` (the Behaviour section and
   the Temperament box) are sentences or state words from the core (`actual_packages_note`). A new player cannot
   tell that `Hire the Receptionist` is the unlock condition. This needs a core string change.
3. The speed badge keeps reporting the mode's clock (`now 8×`) while the hero is in hand, when nothing moves
   until an order is given. The hand cue now carries the state, but the tile could dim in hand.
4. The report's `includes` fold is drawn as a full-width bordered box that looks like an empty input until it
   is opened. This comes from the parchment `details` styling.
5. The skip tile in the speed sheet shows its icon and the glyph label `▶▶|` together, so the glyph appears
   twice. It has no word label.
6. The camp `town-tag` control is 32×44 at 402 px, under the 44 px minimum width. All other first-hour controls
   I measured are at least 44 px.
