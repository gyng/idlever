# Package grades: Idlever against 14 idle competitors (2026-10-15)

Owner request 2026-10-15, parts B–D. Rubric: `eval/PACKAGE_EVAL.md` (13 package dimensions, 0–100 on
anchors at 20/50/80, fun kept as its own score). Cards: `eval/package/*.json` (one per game; every
score has a mode, a confidence and cited evidence). Table: `node eval/package-score.mjs --table
eval/package/*.json --md`. Executive summary: [PACKAGE_REPORT_2026-10.md](PACKAGE_REPORT_2026-10.md).
Earlier research this builds on: [PROGRESSION_COMPETITORS_2026-10.md](PROGRESSION_COMPETITORS_2026-10.md),
`research/comparables.md`, `research/IDLE_STEAM_2026-10*.md`.

## 0. What kind of evidence this is

- **Competitors: desk grades, not play.** Four research agents graded 14 games from Steam store pages
  (price, IAP/DLC, platforms, languages, review %), the Steam review API (300–560 English reviews per
  game, quoted by review id), wikis (Melvor, IdleOn, fandom/wiki.gg via the MediaWiki API), the
  Stone Story FAQ, App Store IAP lists, Wikipedia and press. Nobody played these games or listened to
  them; audio is graded from what reviews say. Reddit, HowLongToBeat and some press sites were
  blocked. Desk graders search for lapses, so negative reviews are over-represented.
- **Idlever: mixed, not blind.** Hands-on scripted walk on the current main (`3823eb8b`, seed 7, an
  8 h absence, headless), a private-display GPU capture (`launchGpu`, D3D12 RTX 3080, never the
  desktop), the Cut231 dayplayer timeline (16 seeds × 14 days) and `cadence30`, and the two latest
  blind rater cards (`d34605e`, 2026-10-11, an older build). The coordinator graded it, so the card
  is a baseline, not a decision (`eval/RATING.md`). Audio is **unassessed**: nobody has filled
  `eval/AUDIO.md`.
- **Fun column.** Idlever: the mean of the two `d34605e` blind cards on `idle-hybrid` (75.2 each).
  Loop Hero: the project's own re-anchor card (74.0). Melvor: the calibration card (65.4, idle-rpg).
  The rest are desk estimates relative to those cards (low confidence).

Evidence for Idlever: `docs/evidence/package-eval/` (walk dumps and screenshots, GPU frames,
`gpu-capture.json`, the capture script).

## 1. The score table

Package score uses preset `idle-package`, except `incremental-package` for Antimatter Dimensions,
NGU Idle, Trimps and Increlution (art, motion and juice weigh less). `!` = gate (a load-bearing
dimension under 50). Sorted by *overall* (0.4 × fun + 0.6 × package, a ranking aid only).

| game | art | motion | ui | audio | onboarding | pacing | depth | respect | juice | polish | content | hook | access | package | fun | overall | ship | conf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Loop Hero | 80 | 62 | 55 | 82 | 48! | 50 | 75 | 70 | 60 | 62 | 65 | 85 | 62 | 63.9 | 74 | 68 | early access | medium |
| **Idlever** (`3823eb8b`) | 70 | 52 | 52 | — | 62 | 45! | 72 | 86 | 58 | 60 | 60 | 66 | 64 | 62.0 | 75.2 | 67.3 | early access | medium |
| Antimatter Dimensions | 25 | 30 | 75 | 15 | 75 | 80 | 78 | 68 | 30 | 75 | 85 | 55 | 65 | 65.9 | 68 | 66.7 | not yet | medium |
| Stone Story RPG | 85 | 82 | 50 | 80 | 35! | 48! | 82 | 65 | 62 | 75 | 60 | 80 | 68 | 64.0 | 66 | 64.8 | not yet | medium |
| Melvor Idle | 45 | 18 | 52 | 15 | 50 | 58 | 62 | 76 | 35 | 68 | 84 | 55 | 80 | 55.9 | 65 | 59.6 | not yet | medium |
| Increlution | 25 | 20 | 72 | 20 | 60 | 68 | 50 | 55 | 25 | 70 | 55 | 70 | 40 | 54.4 | 62 | 57.4 | not yet | medium |
| NGU Idle | 35 | 20 | 45! | 20 | 50 | 50 | 60 | 70 | 30 | 70 | 85 | 55 | 35 | 52.9 | 58 | 55.0 | not yet | medium |
| Rusty's Retirement | 80 | 65 | 65 | 65 | 55 | 25! | 35! | 55 | 55 | 55 | 45! | 85 | 55 | 54.1 | 55 | 54.5 | not yet | medium |
| Legends of IdleOn | 55 | 45 | 22! | 40 | 52 | 60 | 75 | 30! | 50 | 35 | 85 | 62 | 58 | 51.9 | 58 | 54.3 | not yet (kill) | medium |
| Trimps | 15 | 15 | 50 | 15 | 50 | 48! | 75 | 78 | 15 | 70 | 85 | 45 | 45 | 53.3 | 55 | 54.0 | not yet | medium |
| AFK Journey | 85 | 72 | 45! | 80 | 68 | 32! | 50 | 12! | 60 | 55 | 72 | 55 | 70 | 54.8 | 52 | 53.7 | not yet (kill) | medium |
| Soda Dungeon 2 | 62 | 50 | 42! | 58 | 60 | 40! | 65 | 40! | 58 | 50 | 55 | 50 | 65 | 52.6 | 52 | 52.3 | not yet | medium |
| Dark Hunting Ground | 60 | 55 | 40! | 50 | 60 | 40! | 70 | 55 | 50 | 45 | 50 | 50 | 55 | 52.3 | 52 | 52.2 | not yet | medium |
| Lootun | 30 | 20 | 55 | 35 | 50 | 45! | 65 | 55 | 25 | 60 | 70 | 50 | 25 | 48.3 | 56 | 51.4 | not yet | medium |
| Idle Champions | 50 | 45 | 38! | 52 | 45! | 40! | 58 | 20! | 48 | 35 | 75 | 55 | 62 | 46.8 | 48 | 47.3 | not yet | medium |

Like for like without audio (`--drop=audio`; Idlever's audio is unassessed): Antimatter Dimensions
68.0, Stone Story 63.4, Loop Hero 63.3, **Idlever 62.0**, Melvor 57.5, Increlution 55.8, Trimps 54.9,
NGU 54.3, AFK Journey 53.9, Rusty's 53.7, IdleOn 52.3, Soda Dungeon 2 52.4, Dark Hunting Ground 52.4,
Lootun 48.8, Idle Champions 46.6.

Kill flags: IdleOn sells Time Candy ("instant AFK progress on a single character") and AFK Journey
sells Instant AFK attempts on a 2 h 48 base cap extended by VIP level: both are paid skips of waits
the game created. Antimatter Dimensions sells 6 h / 24 h offline skips but its offline is free and
uncapped; the grader left it unflagged and recorded the judgement in the card (`killNote`).

**Reading the table.**

- No game reaches *ship-ready* (≥ 68, no gate). The bands were set from this table (`eval/PACKAGE_EVAL.md`
  §2, §5): the best comparables sit at 64–66, loved small-scope titles at 53–56.
- **Idlever is at genre par on package (62.0, 4th of 15, 4th like for like) and first on fun
  (75.2).** Its verdict is *early access*: fun ≥ 72 and package ≥ 55, but fun is under the owner's 80
  and the pacing gate (45) blocks *ship-ready* even if the total rose.
- The two numbers the owner cares about are not the same problem. Fun ≥ 80 needs the fun gap list
  (clarity 0.6, pacing 0.6, feel 0.6 on both blind cards). The package layer adds a second list:
  pacing over the long arc, content after day 2, UI defects, and an audio verdict.

## 2. Where Idlever is better, at par, or worse

Field = the 14 competitors. Median and best are of their scores.

| Dimension | Idlever | Field median · best | Verdict | Why |
|---|---:|---|---|---|
| respect | 86 | 55 · Trimps 78 | **better (best in table)** | Offline uncapped and exact from ~5 min (the Scout), no monetisation, no dailies, no decay, 60 s recovery through D14. Melvor caps at 24 h; Lootun's offline grants "no items or xp"; IdleOn and AFK Journey sell the wait. |
| onboarding | 62 | 51 · AD 75 | **better** | First delve within ~20 s of boot; Scout 5.2 min median (worst 7.5) is at par with Trimps/AdCap. Lapse: `cadence30` FAIL, 3–5 decisions per look. AD's context help and front-loaded walls are the benchmark. |
| depth | 72 | 65 · Stone Story 82 | **better** | Stances × tactics × temperaments × gear × pets × authored rows; TUNED ≥ 15 % over PICKED is gated. Stone Story's script and AD's automation ladder sit higher: our expert layer arrives locked and package rows swamp authored ones. |
| art | 70 | 52 · Stone Story, AFK Journey 85 | **better than median, below the top four** | Coherent moonlit ink-and-wash, a striking death banner. Below Loop Hero/Stone Story/AFK Journey/Rusty's: grey actors on grey stone at 48 px; the depth rail hides a quarter of the watch. |
| juice | 58 | 49 · Stone Story 62 | **better than median, near the top** | Death stamp, "LEGENDARY FOUND", boss "watch kill", "COLLECTED $63". Routine bubbles ("REST ✗ NOT SAFE") compete with the fight. |
| hook | 66 | 55 · Loop Hero, Rusty's 85 | **better than median, well below the leaders** (low confidence) | "A roguelike whose hero you never drive" is unowned, but the first screen is "Empty town · Build house", with no hero and no dungeon in view, and there is no store capsule. |
| motion | 52 | 45 · Stone Story 82 | at par | Tile-step movement with short hit FX; ordinary fights read alike. |
| ui | 52 | 50 · AD 75 | at par (just above the gate) | Both blind raters gave clarity 0.6. The walk found two pills overlapping on the camp (`08-camp.webp`: "porter · 2/3 hauls" over "… 2 more delves") and a toast covering DELVE. |
| polish | 60 | 61 · AD, Stone Story 75 | at par | No console errors and deep automated checks, but every blind cohort still finds contradictory labels ("King · slain 100%", "set log 0/3"). The build is still labelled ALPHA. |
| access | 64 | 60 · Melvor 80 | at par | Free web PWA at phone and desktop widths, contrast audited, reduced motion, save export. English only, no cloud sync, no store presence. |
| pacing | 45 | 48 · AD 80 | **worse than the leaders; gate** | Days 0–2 are dense. After that, PICKED has hired every worker and first tries the King (2.0 d), and the only new beats are worker ranks (4.7 d). The day 2–7 gap is 48 h, and no reset-like beat lands. This is the "day 2 slows down" pattern of Rusty's, USI and AFK Journey. |
| content | 60 | 71 · several 85 | **worse** | Seven places, six bosses, an ending and ascension tiers. But an engaged player spends the new content by day 2–4, against months in Melvor, NGU, AD, IdleOn and Trimps. |
| audio | — | 45 · Loop Hero 82 | **unknown** | Cues, biome beds and boss stingers ship. No human has listened (`eval/AUDIO.md` is unfilled). The leaders' soundtracks are cited unprompted, even in negative reviews. |
| fun | 75.2 | 56 · Loop Hero 74 | **best in table** (mixed modes) | Blind-card fun versus desk estimates. Only Loop Hero's 74.0 is a like-for-like card. |

## 3. Findings from the hands-on pass (current main)

- **UI defect:** on the camp after the Scout hire, the porter pill overlaps the next-plot pill, whose
  text is clipped to "… 2 more delves". The scout toast sits on the DELVE button
  (`docs/evidence/package-eval/walk-seed7/08-camp.webp`). This is a concrete fix for the client journeys.
- **Watch readability:** the depth rail covers about 25 % of the map width at 400 px. Grey sprites
  sit on grey stone. An odd callout reads "TAME FAILED · NONE" (`gpu/fresh-watch-2.webp`).
- **The return:** "While away 8h · 15 runs · 2 died · D9 new best · +$1944 · LEGENDARY FOUND Crownsplitter ·
  Goblin Warlord ▶ watch kill · Pick one ◇◇◇◇" (`walk-seed7/09-report.txt`). This is a strong return
  screen. The 8 h catch-up took 26.8 s on the fast dev WASM in headless Chromium on a saturated host
  (load average about 60 on 32 cores), so it is not a shipping measurement. Profile it on the shipping
  build (`tools/profile-catchup.mjs`) before acting.
- **The death screen** names the cause, the summoner, the floor and the HP ("spectral blade · summoned by
  goblin conjurer · D7 · hero at 1/40 hp") and offers a lever ("BUY sword +1"). It is at the top of
  the field. Increlution's "faster than last run at each stage" is the one improvement found.
- **GPU:** the viewer's JS frame cost was 5.7 ms (p95 11.8) and GPU 2.3 ms (p95 19). rAF ran at 23–36 fps
  in the last window, but the host was saturated, so treat fps as unmeasured.
  `docs/RENDER_PERF.md`'s earlier 59–60 fps at 400×800@3 stands.

## 4. What to learn, ranked

Ranking: the dimension's weight × the size of the gap × evidence strength ÷ cost, with load-bearing
gates first. Every item keeps the hard invariants (Rust owns truth, nothing punishes absence, IDLE taps
only until the Scout, offline uncapped after the Scout, no tutorial text). These are **proposals,
not implemented**. They feed `docs/WORK_QUEUE.md` ("Package-eval proposals") and Cut231's order.

1. **A new mechanic per segment after day 2, not just ranks** (pacing, gate; content).
   - *Practice:* Antimatter Dimensions: "each prestige tier feels different and has unique mechanics"; Dark
     Hunting Ground: "things unlock basically every step of the way". Anti-pattern: Rusty's "end game
     progression in 2 days, now im just waiting" and AFK Journey's 6–14 h level gates.
   - *Change:* finish Cut231 owner items 3–4 (a second hero on day 1–2; a first reset payoff) and add one
     named mechanic per band wall from D23 on (for example the ascension tier or a wall-specific trial as the day-3
     and day-5 beats), each announced as a journal beat.
   - *Measure:* PICKED max major-beat gap on days 2–7 ≤ 24 h (now 48 h) and DAILY ≤ 48 h, via
     `dayplayer --timeline`. `idle-king` and the King guard hold.
2. **Feats with visible progress light later automation** (pacing; onboarding).
   - *Practice:* NGU AutoKill at shown stat bars ("can be AutoKilled once you have 3K power and 2.5K
     toughness"); Trimps AutoStorage from a void map at Z20; AD autobuyers from challenges.
   - *Change:* Cut231 §5b (feat triggers, time fallbacks kept), with `goal`/`feat` on the wire.
   - *Measure:* `nodes-lit` ≤ 48 h; PICKED reaches each feat hire no later than the count median on
     ≥ 14/16 seeds; the `worker-first-act` journey shows the feat text.
3. **One decision per look in the first 30 minutes** (onboarding).
   - *Practice:* AD's front-loaded, one-at-a-time walls and context help per tab; the heuristic of a phase every
     3–5 min.
   - *Change:* the Cut232 cadence fixes (stagger the first return, split "four delves", move the
     Legacy offer).
   - *Measure:* `cadence30` 16/16 (gap ≤ 6 min, ≤ 1 decision per look).
4. **A codex one tap from every term, filled as facts are learned** (ui; onboarding).
   - *Practice:* Lootun's glossary is "a built in wiki"; AD opens How to Play on the current tab; Loop
     Hero's top complaint is "I have to keep googling mechanics".
   - *Change:* a sheet (not chrome) opened from any unit, status or number. It holds what the hero has
     learned (it fits "facts are learned"), so it adds no tutorial text and stays inside the copy budgets.
   - *Measure:* both blind raters' clarity ≥ 0.8; QA misreads ≤ 1 per session; `copy-lint` passes.
5. **Name where the hero will stall before you leave** (respect; ui).
   - *Practice:* Stone Story's † on the location screen ("the game calculates you will die"); AFK Journey's
     offline overview; Clicker Heroes' "until your heroes hit a wall".
   - *Change:* Cut231 #7: the away panel shows "holds at D14 · Queen".
   - *Measure:* the predicted stall matches the 8 h replay within one floor on ≥ 80 % of `camp-check`
     saves.
6. **Fix the UI defects and declutter the watch** (ui; art; juice).
   - *Practice:* Increlution's "extremely clean" queue UI; Stone Story's and Loop Hero's readable battle
     panels; the raters' "REST ✗ NOT SAFE" and "overlapping grey figures" gripes.
   - *Change:* fix the overlapping camp pills and the toast over DELVE. Shrink or auto-hide the depth rail
     during fights, keeping it at or under 10 % of the map area at 400 px. Lift actor/ground value
     separation (ART_DIRECTION §3's "≥ 2 value steps"). Rate-limit routine bubbles.
   - *Measure:* a screens lint for overlapping pills at 320/400/1440; `art-qc` actor/ground contrast; the
     next blind cards' feel ≥ 0.8.
7. **Show the workers doing the chores** (art; juice; hook).
   - *Practice:* Rusty's Retirement: named little bots visibly farm ("everything on the farm is colorful,
     distinct, and full of character"); 97 % positive on a glanceable strip.
   - *Change:* each hired worker acts in the town scene (the porter carries the chest, the scout walks the
     hero to the cave, the apprentice hammers at the forge) when its chore fires.
   - *Measure:* a GPU capture shows each hired worker's act within 10 s of the chore event; the
     `worker-first-act` journey asserts the scene cue.
8. **An audio verdict and a soundtrack identity** (audio; hook).
   - *Practice:* Loop Hero's soundtrack is cited even in negative reviews ("the music is quite memorable");
     AFK Journey's score won an award; Idle Champions players love its jukebox.
   - *Change:* the owner fills `eval/AUDIO.md` (15 min), then decides on one music theme per place over the
     current beds.
   - *Measure:* the AUDIO.md table filled with no "bad" verdict; the audio dimension scored (no longer `—`).
9. **A glanceable compact view** (hook; access).
   - *Practice:* Rusty's "sits at the bottom of your screen while you do other things"; Melvor's "one save
     everywhere".
   - *Change:* a compact strip mode of the watch or away view (hero, floor, carry, next wall) for a
     desktop edge or a phone home screen. Later: an optional save sync.
   - *Measure:* the journey renders the strip at 1280×160 and 400×200 with no overlap; the access card is
     re-graded.
10. **Show the store-page pitch in the first screen** (hook).
    - *Practice:* Loop Hero: "an auto-battler where you build the world around your hero using cards", and every
      screenshot shows both.
    - *Change:* the empty-town first screen shows the hero at the cave mouth with his stance chip. A capsule
      or screenshot set shows the hero and the player's configuration on one frame.
    - *Measure:* the cold rater's "tell a friend" sentence names the auto-hero within 1 minute.
11. **Per-run improvement on the death screen** (pacing; juice).
    - *Practice:* Increlution: "you get to see how much seconds you were faster than last run at each stage".
    - *Change:* the death screen adds one line, "D7 · 2 floors past last heir".
    - *Measure:* the copy budget holds; the death journey shows the delta.
12. **Profile the return wait** (polish).
    - *Practice:* Melvor and Trimps simulate absence exactly and return quickly.
    - *Change:* none until measured. The 26.8 s in this walk was on fast WASM on a saturated host.
    - *Measure:* `tools/profile-catchup.mjs` on the shipping build, 8 h, phone viewport; set a bar in a cut.

Not to copy: selling time or automation (IdleOn Time Candy, AFK Journey Instant AFK, Soda Dungeon 2
Magic Clock, Idle Champions familiars); offline caps or offline that stops at a chore (Melvor 24 h,
Lootun gathering-only, Increlution's empty queue); an online-only launch (Melvor's top recent
complaint); timed level gates (AFK Journey).

## 5. Limits

- Competitor scores are desk grades from four graders with one pass each. Krippendorff's α is not
  measurable. Desk evidence over-samples complaints, while our own card risks the opposite bias.
- Several fun estimates are low confidence. Only Loop Hero (74.0) and Melvor (65.4) come from scored
  cards.
- Idlever's fun (75.2) comes from blind cards on `d34605e`, four days and several cuts older than the
  build graded here. There is no blind card for `3823eb8b`.
- Idlever's audio is unassessed, and the GPU fps is contaminated by host load.
- HowLongToBeat and Reddit were blocked, so content-hours figures come from reviews and wikis.
