# Cut263 honours — observations, 2026-10-18

Follows the owner amendment of 2026-10-16: dated, with identity, kept separate from automated measurement, and
revalidated before reuse.

## Identity

- Source: branch `cut263-achievements` on main `f0e095a2`, with the Cut263 diff (this commit).
- WASM: fast build, 7392761 bytes, sha256 `f22ede1e621f35512a96c98f878382ee2c3106b55d163caa1b3149051367a7f8` (the new gold
  settlements default).
- Save: `docs/evidence/handoff-menus/input.game.json.gz`, a mature single-hero town at best D28 that predates honours,
  loaded through the real engine. Its load migrated 9 state-derived honours silently. The client test then marked
  *Warlord Felled* and *Twenty Deep* unseen again, standing in for honours earned by a run.
- Viewports: 1440×900 CSS px, and 402×681 CSS px (`phoneReviewViewport()`, the primary iPhone Pro browser-content
  geometry). Text scale 100%. Headless Chromium (SwiftShader) via `tools/browser.mjs launchBrowser`, with reduced motion.
- Capture kind: visible-viewport screenshots. The `-lore` shots scroll the gallery to its last group, a scroll inventory.
- Input: scripted Playwright clicks (gear → Honours).

## Automated measurements (not opinion)

- Client group `honours`: 27 checks pass at both widths, with no page errors and no horizontal overflow.
- The dayplayer, 3 seeds × 14 days, is identical to main apart from wall-clock lines.
- Honours earned per bot: IDLE 3/4/3 on day 1 and 7 on day 14; PICKED 7/7/4 and 15–16; TUNED 8/9/6 and 17–18 (out of 32).
- The draft list of 43 had IDLE at 14–16 on day 1. That measurement drove critique pass 2 (see the contract).

## Agent's visual review (this agent; not owner or player feedback)

Shots: `shots/toast-1440.png`, `shots/toast-402.png`, `shots/gallery-1440.png`, `shots/gallery-402.png`,
`shots/gallery-1440-lore.png`, `shots/gallery-402-lore.png`.

- Toast: `✦ 2 honours` sits above the console in the existing toast style with a gilt border. It is quiet and does
  not cover the Delve gem. At 1440 it overlaps the trial card's lower edge for its 2.6 s. Confidence: high.
- Gallery: the parchment window uses the journal material. The `9/32` count sits beside the close stud, and groups
  have small caps headings. Earned rows are lit with ✦ and `day N`; unearned rows are dimmed with `n/N` where counted;
  fresh rows have a gold wash and a dot. At 402 the list scrolls inside the window, and the first view shows Depth
  plus the start of Bosses. Confidence: medium-high. It reads as calm and is not intimidating; the density judgement
  is the agent's, not the owner's.
- The toast draws above an open sheet (toast z-index 60). When the gallery was opened during the toast's 2.6 s, it
  covered the sheet's scroll cue `▼` until it faded (`gallery-1440.png`). This is minor, and only while both are up.
- Secrets read `?` with no goal, three in a row at the end of Lore. A row of three bare `?` is slightly stark. Open
  question for the owner: a softer `hidden` label could replace them.
- Every earned row in this fixture reads `day 4`, because the migration stamps the load day. For a migrated save
  that is accurate (earned no later than day 4) but uninformative.

## Owner or player feedback

None yet. This cut has not been played by the owner or a rater.

## Shelf life

Revalidate before relying on these notes if the Menu, sheet material, toast styling, the honours list or the pacing
(the dayplayer's day-1 depth) changes.
