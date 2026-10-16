# Package rating — Idlever build `51d041d0` — 2026-10-16 (rater: PackageRater)

Card: `eval/package/idlever.51d041d0.rater-PackageRater.json`
Scored: `node eval/package-score.mjs eval/package/idlever.51d041d0.rater-PackageRater.json --table`
→ **package 66.6 → shippable, no gate, no kill, confidence medium, desk 0 %**.
Fun is **unassessed** on this card, so the scorer prints `fun: not scored` and `ship verdict: not yet`
*for that reason alone* — not for a package failure. No released fun card exists for this build and I
did not file one.

## Build identity (what I actually graded)

| Item | Value |
|---|---|
| WASM | `51d041d0f88433e9df7ca4b7511589ab3c091df80c7131f5aac702fbdf62e191` — `sha256sum web/src/engine/pkg/idlever_wasm_bg.wasm` |
| Commit | `38d09ab7` (`git log -1 38d09ab7`: "Point the R3 ledger row at the new biome review and its verification note"); HEAD in the worktree was `d2d3b56c`, so the identity above is the WASM hash, verified directly |
| Served | `bash tools/dev.sh` → `http://localhost:5219/` (Vite dev client) |
| In-game stamps | title bar `ALPHA · build 2026-10-14`; Settings → `ENGINE wasm 0.1.0` |

## Viewport, time and what I played

- **Phone 402×681 CSS @ 3×, headed on the GPU** (the repo's declared review viewport,
  `web/tests/lib/viewport-cases.mjs:phoneReviewViewport()`), driver `tools/driver.mjs --port 5395 --headed --checkpoint`.
  Note the headed window came up **402×681**, not 400×800: WSLg's screen is shorter than 800 px. 402×681 *is* the
  build's declared target geometry, so I graded UI at it, and separately rendered 1280×800.
- **Desktop 1280×800 @ 3×, headed**, second driver on port 5401 (`--wide`) — used only to confirm the desktop layout.
- **Cold session, seed 1234** (`?dev=1&runs=1&seed=1234&fresh=1`), 21:52→22:13 wall (~21 min): boot → free house →
  cave hotspot → first delve at **1× for 90 s** (a real-time watch, rAF-sampled) → report → pick → camp panels
  (Loadouts, Behaviour, Orders/run setup, Journal + Glossary, Settings) → **32× ~100 s** to the report → three absence
  boots (`?dev=1&runs=1&absent=20m`, `…absent=4h`, `…absent=8h`) → a second fresh lineage (seed 999) for a clean editor check.
  **Active play ≈ 15 minutes** — well short of `eval/RATING.md`'s 40-minute cold horizon. This is a package/craft pass, not a full rater horizon.
- **Scripted walk** `node tools/playtest.mjs --seed 7 --absent 8h --headless` at phone (25 s wall, 10 dumps) and `--wide`
  at 1280×800 (28 s). Both: `ok: no console errors, no page errors`.
- **Gate table** `node tools/gates.mjs` (254 s): `qa: all PASS (10 seeds)`, `dayplayer: all PASS` — this carries most of my pacing/respect/polish telemetry.

## What I observed (transcript highlights)

- **The core act works at the target viewport.** Boot → one free `Build house` → cave hotspot → `DELVE`. A run ran at 1× for 90 s and at 32× to its report. No crash, no data loss, no console error in the whole session.
- **1× watch, 90 s** (op `watch`, full sample in `artifact://946`): taming ("tamed jackal Zelog", "JACKAL: FETCH"), tiles ("A shrine. The idol watches him.", "TWO STAIRS", "THIEVES! The den wakes: hands everywhere", "BLADES!", "GOLD DRAWS THEM", "DRINK ✗ UNKNOWN ITEM"), floor transitions, then "Run ended / Heading home" → "D5 · banked $149 · $127 secured + 100% of $22 · ◆+8" → REPORT.
- **Frame time measured in the headed GPU window** (rAF via `page.evaluate`): live 1× watch — 299 frames, median 16.7 ms / p95 16.8 ms (59.9 fps), **max 83.3 ms** (one hitch at sample start); camp — 199 frames, median 16.7 ms, max 16.8 ms.
- **Deaths**: `scratchpad/packagerater/walk-seed7/10-death.png` + `10-death.txt` — "spectral blade · summoned by goblin conjurer · D7 · hero at 1/40 hp", wax `YOU DIED` seal, "+1 Legacy", next-run options (sword +1 / Next run / Upgrade hero / Build forge Free). The walk's 8 h return reports "15 RUNS, 2 died".
- **An 8 h absence pays**: `09-report.txt` — "While away 8h · 15 RUNS 2 died · D9 DEEPEST NEW BEST · +$1944 GROSS GOLD · LEGENDARY FOUND Crownsplitter · Free Forge choice · Goblin Warlord Boss defeated · ▶ watch kill · 3rd heir". My own 20 m: "While away 20m · 1 RUNS · D5 · +$123 · Fighter L2 · ✦ legacy shard" then one `Pick one` (drill / legacy / marks / default).
- **Explained in place**: the Journal's `Glossary` defines *action, best depth, combat style, condition, floor chance, gold, next goal, reputation, runs log, scout, supplies, tactics, worker*, each in one line; a rule's WHY sheet reads "fired 4/711 turns · blocked · no leash · 1 run / no leash · needs a leash / edit", and the metrics line attributes "rules chores 83% · attack nearest 12% · bank at 25% 4%".
- **The rule vocabulary is large**: ~90 conditions (hp</hp>, foes ≥, adjacent ≥, unknown item, seen ≥, depth ≥, corridor, stairs seen, ally, on hurt, foe hp <, loot ≥, turns >, on see, has: <~20 items>, on see nest/shrine/vault/den/stray, in: burrows, party hp <, party: jackal, alert ≥, on kill, fact: pack, identify/find/know <~20 effects>) and ~17 actions (attack nearest/lowest, retreat, to corridor, drink/read unknown, descend, pick up, free captive, shield bash, pray for row/trait, tame nearest, drink heal, locked bank/return/tame open).
- **Measured UI defect at the target viewport**: in the Behaviour panel the label column prints `COM / BAT / STYL / E` — `clientWidth 38 px` vs `scrollWidth 44 px` (6 px overflow) at `font-size: 14.875px`, while its compact sibling at 10 px fits; and the sheet header ("Recovery pool") is half-hidden behind the panel's top edge (`13-camp.png`, `15-after-edit.png`).
- **Desktop 1280×800** renders the same game in a centred column with large empty margins (`walk-wide/01-camp.png`), no errors.
- **Settings/Access**: `SOUND mute · SLOWDOWNS on · EFFECTS full · AUTO CONTINUE on · SAVE export/import · RULES export/import · DEBUG export · ENGINE wasm 0.1.0 · LINEAGE seed 1234 reset` (I toggled AUTO CONTINUE off; it persisted). `prefers-reduced-motion: reduce` is honoured (`web/src/render/quality.ts`), software GL drops to `low` FX, PWA manifest is present (`display: standalone`, portrait). English only.

## The one thing I could not close, and why I did not score it as a defect

I could not make a rule **threshold** change stick: opening a chip's picker works (a condition tile even advances the
sheet to its number grid), but tapping a terminal value closed the sheet and left both `window.__idlever.sets[active].rows`
and `engine.exportRules()` unchanged — six attempts, two lineages (seed 1234 mid-play, seed 999 fresh/idle), same result;
a direct `engine.setRules(<modified copy>)` from the console also left `exportRules()` unchanged, with no throw; no
`rules refused` toast and no `document.body.dataset.refused`. A capture-phase probe on the tapped tile fired and
`document.elementFromPoint` at its centre returned that same tile, so the tap was delivered.

Why I refuse to call it a bug on this evidence: the camp keeps **parked, `display:none` copies** of its rule list
(`.camp-main` with `display:none`, rows with 0×0 rects, more than one rule-list DOM in the document), and my text/selector
clicks could have been operating a hidden stale editor while the visible screen was elsewhere — several of my earlier
"successful" clicks turned out to have hit hidden copies (e.g. a `Build house` click that changed nothing on screen).
So the honest position is: **unresolved, flagged, not scored**, and the card says so verbatim under `ui` and `depth`.
It is worth one clean QA transcript (visible-only clicks) before shipping, because the rule layer is this game's whole lever.

## Interpretation and confidence

- Package 66.6 sits in the **shippable** band (genre par: Loop Hero 63.9, Stone Story 64.0, Antimatter Dimensions 65.9 in the rubric's calibration) and below the 68 ship-ready line; no load-bearing dimension is under 50, so nothing is gated.
- Strongest: depth 76 (vocabulary + attribution + loadouts), respect 74 (full absence simulation, workers keep paying, failure costs time not wealth), onboarding 72 (core act in ~2 min, scout at 4.4 min median, glossary).
- Weakest load-bearing: ui 58 (clipped label, dense locked-heavy pickers) — the next cut's cheapest fix.
- Confidence is **medium** overall (scorer prints `medium`, desk 0 %); `art`, `motion`, `onboarding` are high (measured, hands-on), `ui`/`depth` deliberately medium because of the unresolved editor puzzle, and every long-arc claim is telemetry-weighted.
- My own horizon (~15 min active) is the main threat to validity on pacing/content; the gate table and the two scripted walks carry those claims, and the card names that in the notes.

## Limits of this card

1. **Audio is `null`** (the only unassessed dimension): the harness mutes the browser (`tools/browser.mjs`), so I cannot judge whether music/SFX fit, distinguish events or tire over an hour.
2. **Time played**: ~15 min active in one cold lineage + 3 absence boots + two scripted walks + the gate table. Not the 40-minute rater horizon, not a cohort, no second rater — so no reliability coefficient and no release decision.
3. **Endgame unplayed**: D23+, the Mirror King, oaths, packages and the forge are telemetry/desk-level for me (gate rows + report text), not played.
4. **One viewport family**: 402×681 phone and 1280×800 desktop only; no real device, no 320 px, no 200 % zoom pass.
5. **No store/IAP audit**: this is a browser dev build with no store page, so `respect`'s desk half is absent (it is graded from in-game economy and the gate table instead).

## Evidence sources used (all named on the card)

- `web/src/engine/pkg/idlever_wasm_bg.wasm` (sha256), `git log -1 38d09ab7`, `bash tools/dev.sh`
- Live session: `http://localhost:5219/?dev=1&runs=1&seed=1234&fresh=1` (+ `absent=20m|4h|8h`, + `seed=999&fresh=1`), 402×681, headed GPU; screenshots in `scratchpad/packagerater/play/shots/` (`01-first-house`, `03-watch-16x`, `07-camp`, `13-camp`, `15-after-edit`, `17-picker-before`, `20-return-20m`, `21-return-4h`, `watch-01..04`, `22-now`); console/DOM probes run in-page; rAF frame-time samples in-page; `artifact://946` (1× watch), `artifact://1119` (32× watch)
- Scripted walks: `scratchpad/packagerater/walk-seed7/` (phone, seed 7, 8 h absent) and `scratchpad/packagerater/walk-wide/` (1280×800) — `.txt` dumps + `.png`s + `summary.txt`
- Telemetry: `node tools/gates.mjs` output (qa + dayplayer legs, quoted verbatim in the card)
- Game source read for behaviour I could not click: `web/src/ui/settings.ts`, `web/src/ui/editor.ts`, `web/src/ui/camp.ts`, `web/src/ui/dom.ts`, `web/src/ui/meters.ts`, `web/src/render/quality.ts`, `web/src/app.ts`, `web/src/engine/wasm.ts`, `web/public/manifest.webmanifest`, `web/tests/lib/viewport-cases.mjs`
- Rubric/protocol: `eval/PACKAGE_EVAL.md`, `eval/PACKAGE_SCORECARD.template.json`, `eval/RATER_PROMPT.md`, `eval/RATING.md`, `eval/package-presets.json`, `eval/presets.json`, `eval/package-score.mjs`
- `eval/package/idlever.3823eb8b.coordinator.json` — **schema reference only** (explicitly allowed). I saw that earlier build's dimension scores (70/52/52…) and did **not** use them to place a single number of mine; my scores come from this build's own evidence.

## Refused to read (and no target number was seen)

`docs/HANDOFF.md`, `PLAN.md`, `README.md`, `docs/CUT*.md`, `docs/WORK_QUEUE.md`, `docs/QUEUE_ACCEPTANCE.md`, everything under
`docs/research/` and `docs/evidence/` (other than writing this file), every other rater/QA card (`eval/cards/*.json`, `eval/qa/*.md`),
and any file stating a previous score. I did not go looking for a "fun" score; the only numbers of that shape I saw are the rubric's own
calibration bands and per-anchor examples (e.g. "Loop Hero 63.9"), which are the rubric's, not a target for this build.
I stopped reading `eval/package/idlever.3823eb8b.coordinator.json` as soon as I had the schema I needed.

## What this score does **not** establish

It is **one rater's package/craft assessment of one build**, graded from a short hands-on session plus telemetry and code reading.
It is **not** a blind fun verdict (fun is `null` here, so the scorer's `not yet` says nothing about fun), **not** a reliability-checked
cohort result (no second card, no α), and **not** a release decision — it is a baseline for the next cut. The band it lands in
(`shippable`, 60–67) means "genre par", with UI the cheapest next gain and the rule-editor question still open.
