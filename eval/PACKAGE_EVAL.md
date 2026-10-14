# Package evaluation — is the whole game ready to ship?

*Written 2026-10-15 (owner request A). Template: `eval/PACKAGE_SCORECARD.template.json`.
Weights and bands: `eval/package-presets.json`. Scorer: `node eval/package-score.mjs`.
Cards: `eval/package/`. First use: `docs/research/PACKAGE_GRADES_2026-10.md` (14 competitors
and Idlever); executive summary: `docs/research/PACKAGE_REPORT_2026-10.md`.*

## 0. Decision: extend the fun eval with a package layer, not a second eval

The fun eval (`docs/FUN_EVAL_IDLE.md`, `eval/RATING.md`, scored by `../eval-fun/tools/fun-score.mjs`)
asks one question: *is the experience fun?* It deliberately ignores most of what a shipping game also
needs. Art counts only as atmosphere (`aesthetic`, weight 1 of 33.5 in `idle-hybrid`). Sound is
"unassessed" on every agent card. Onboarding, performance, content breadth and fairness of the
business model have no axis at all. A game can score "fun" and still not be ready to ship.

We considered three options:

| Option | For | Against |
|---|---|---|
| Add the new dimensions as more axes in `eval/presets.json` | One number | Dilutes the fun score: every craft axis added moves the `fun ≥ 80` goal and breaks comparison with 138 existing cards and the Loop Hero re-anchor series. It mixes "is it fun" with "is it finished". |
| A separate package eval with its own cards | Clean | Duplicates the horizon, the evidence rules, the cohort contract and the calibration habit. Two cards per rating session drift apart. |
| **A package layer on the same card (chosen)** | Fun keeps its axes, weights, anchors, gates and bands unchanged. The package layer reuses the same session, horizon and evidence rules. Old cards stay valid. | Needs one new repo-local scorer. |

**Chosen: a package layer.** A scorecard may carry an optional `package` block next to its fun `axes`.
The package layer has 13 dimensions, scored 0–100 on anchors at 20/50/80. It has its own weights,
gates and bands, and it reports **fun as its own first-class score beside the package score**. Package
dimensions never enter the fun total, and fun axes never enter the package total. The owner's goal
stays exactly as written: **fun ≥ 80 on `idle-hybrid`**. The package verdict is an extra condition for
shipping, not a substitute.

**Why the scorer is repo-local (`eval/package-score.mjs`), not in `../eval-fun`.** eval-fun does take
per-repo presets (a card's `presets` path), but only for its fixed fun shape: axes with 0–1 awards and
bot caps. The package layer has a different shape (0–100 scores, confidence, evidence mode, desk
grading of games we have not played). Putting it in eval-fun would change that repo's contract for
every game that uses it, and eval-fun is a separate checkout outside this repository. The local tool
*calls* eval-fun's scorer for the fun part when a card has fun axes, so there is one fun scorer.

## 1. The thirteen package dimensions

Each dimension: definition, what to count, anchors (20 / 50 / 80), the evidence required, and its weight
in the `idle-package` preset (0–3, renormalised to 100). Anchor games are named per anchor; §5 lists
the calibration set. Scores may sit between anchors (for example 65), unlike fun's five anchors, because
this layer is graded from mixed evidence. A score above 80 needs a named benchmark it matches or beats
and a quoted lapse check ("no material lapse seen in …").

Boundaries with the fun axes (the same observation may appear on both layers, because the layers are
never summed; within the package layer, one observation supports one dimension):

| Package dimension | Nearest fun axis | The package dimension asks | The fun axis asks |
|---|---|---|---|
| `art` | `aesthetic` | Is the craft coherent, readable and distinctive? | Is the place worth being in? |
| `motion`, `juice` | `feel` | Are animation and feedback produced well? | Did it feel good in the hands? |
| `ui` | `clarity` | Can a player find, read and operate everything? | Does the player know the goal? |
| `pacing` | `pacing`, `progression` | Does the long arc keep delivering (days 1–30)? | Is the session loop bounded? |
| `depth` | `decisions`, `expression` | How large and real is the build space? | Did this player make interesting choices? |
| `respect` | `return` | Are the offline rules, caps and business model fair? | What did the player come back to? |

### 1.1 `art` — Visual art and style (weight 2)

*Definition.* The art is coherent across sprites, tiles, UI and portraits; actors read against the ground
at the target size; the style is distinctive enough to recognise from one screenshot.

*Count.* One register (no pixel art next to vector UI unless intended); silhouette readability at phone
size; palette discipline; the number of distinct places that look distinct.

| Score | Anchor | Example |
|---|---|---|
| 20 | Text, programmer art or stock icons; no identity | Progress Quest; a text incremental (Trimps, early Kittens Game) |
| 50 | Competent and readable, but generic or mixed registers; serviceable icons | Melvor Idle (RuneScape-style icons on a web UI); Idle Champions (licensed D&D art, uneven) |
| 80 | One coherent, distinctive style that also reads at size; a screenshot sells it | Loop Hero (limited-palette pixel art, card tiles); Rusty's Retirement (cosy desktop-edge pixel farm) |

*Evidence.* Hands-on: at least three screenshots at the target viewport (camp, watch, a death or
report), one per distinct place seen. Desk: store screenshots plus at least one review that comments on
the art. *Above 80:* named benchmark plus no register clash across every screen seen.

### 1.2 `motion` — Animation and FX (weight 1.5)

*Definition.* Characters, hits, deaths, spells and transitions animate with clear anticipation, impact
and recovery; effects tell the player what happened; nothing jitters, pops or freezes.

| Score | Anchor | Example |
|---|---|---|
| 20 | Static images; numbers change with no motion | Progress Quest; Melvor combat bars |
| 50 | Simple tweens or 2-frame loops; hits register but read alike | Soda Dungeon 2 (bouncy sprite attacks); IdleOn (light MapleStory-like loops) |
| 80 | Readable, characterful animation with distinct impact per action; transitions guide the eye | Stone Story RPG (hand-animated ASCII, praised in reviews); Loop Hero battle panel |

*Evidence.* Hands-on: a GPU capture (frames at ≥ 30 fps, private display), naming two moments
(a kill, a death). Desk: trailer or gameplay video description plus a review quote. Frame-rate claims
need a measured frame time.

### 1.3 `ui` — UI/UX and readability (weight 3)

*Definition.* A player can find every function, read every number and operate every control at the
target viewport (phone 400×800 and desktop 1280×800 for Idlever) without a guide. Information is
grouped by decision; nothing important is hidden behind a modal chain; text is legible.

*Count.* Misreads per hour; taps to the core act; truncated or overlapping text; menus a player cannot
find; numbers that do not reconcile.

| Score | Anchor | Example |
|---|---|---|
| 20 | Walls of menus, numbers that need a wiki, unreadable on the target device | Legends of IdleOn late game ("needs a guide", 50+ currencies); Revolution Idle |
| 50 | Usable once learned; some screens crowded; a few misreads per session | Melvor Idle (dense sidebar, clean once learned); NGU Idle (functional, joke-dense, wiki-dependent) |
| 80 | Every screen grouped by decision; numbers explained in place; works on the target device | Antimatter Dimensions' modern UI (tabs, % bar, context help); Increlution (clean queue UI) |

*Evidence.* Hands-on: the misread list from a QA or rater session; playtest text dumps; viewport
screenshots at both widths. Desk: review quotes on UI and the presence of a "needs a guide" complaint
cluster. *Kill (package):* the core act cannot be performed at the declared target viewport.

### 1.4 `audio` — Audio (weight 1)

*Definition.* Music and sound effects fit the world, distinguish events, are mixed so fights sit over
beds and chrome sits under fights, and do not tire over an hour.

| Score | Anchor | Example |
|---|---|---|
| 20 | Silent, or a single loop that players mute | Progress Quest; Melvor Idle ("the lack of music or other sounds"); most web incrementals |
| 50 | Pleasant generic music and stock SFX; some repetition fatigue | IdleOn; Idle Champions (players lean on its jukebox) |
| 80 | A soundtrack players cite unprompted; SFX that carry information | Loop Hero (soundtrack widely praised); Stone Story RPG |

*Evidence.* Only a human who listened (`eval/AUDIO.md`'s filled verdicts) or, for desk grades, review
quotes about the sound. **Agent raters mark `audio` unassessed** (`"score": null`); the scorer then
leaves it out and renormalises, and reports the dimension as unassessed. An objective loudness report
(`docs/JUICE.md` §6) may cap the score at 50 but never raises it.

### 1.5 `onboarding` — Onboarding and first session (weight 3)

*Definition.* In the first 10 minutes a new player does the core act, understands why, and meets the
first automation or unlock; in the first 30 minutes there is a new beat every few minutes and at most
one new decision at a time; no tutorial wall.

*Count.* Time to the core act; time to the first automation; longest gap between beats in the first
30 minutes; decisions per look; drop-off points in reviews ("slow first hours").

| Score | Anchor | Example |
|---|---|---|
| 20 | Confusing or very slow start; first automation hours away; players quit in hour one | Stone Story RPG's Stonescript after ~6–8 h; Scapewatch "slow first 4 h" |
| 50 | Clear core act but a slow or bunched first hour; a wiki helps | Melvor (clear but slow early combat until Auto Eat); Trimps (minutes to AutoFight but terse) |
| 80 | Core act in the first minute, first automation in minutes, a steady beat for 30 min | Antimatter Dimensions (fast early autobuyers, frontloaded walls); AdVenture Capitalist (managers in minutes) |

*Evidence.* Hands-on: the scripted walk (`tools/playtest.mjs`) and the cold 10 minutes of a rater card;
`cadence30` (first-30-minute beat gap and decisions per look) and the `scout`/`porter` rows. Desk:
milestone timings from wikis/guides (`docs/research/PROGRESSION_COMPETITORS_2026-10.md` §1) plus
review complaints about the start.

### 1.6 `pacing` — Progression pacing over the long arc (weight 3)

*Definition.* After the first session the game keeps delivering new things on a legible cadence
(hour 1, 3, 8, day 1, 2, 4, 7, 30); walls are visible before they arrive and have a lever; there is no
"day 2 slows down" cliff and no grind that the player cannot see the end of.

| Score | Anchor | Example |
|---|---|---|
| 20 | One wall after the first day, then waiting; resets feel alike | Rusty's Retirement late game ("mostly just waiting"); Unnamed Space Idle "after the first day or so" |
| 50 | A good first week, then long walls or alike rebirths | NGU Idle (great early, titans "opening quite slow"); Loop Hero (repetition after 1–2 h of a chapter) |
| 80 | New mechanics each segment for weeks; walls front-loaded and named | Antimatter Dimensions ("each prestige tier feels different"); Increlution ("the pacing is perfect") |

*Evidence.* Hands-on: the dayplayer timeline (`dayplayer --timeline`, `tools/timeline-summary.mjs`):
max major-beat gap on days 2–7, milestone hours for IDLE/PICKED/DAILY/AWAY. Desk: wiki milestone
times and review complaints about walls. A score above 50 for a game with an ending must state when
the ending arrives for a casual player.

### 1.7 `depth` — Build depth and agency (weight 3)

*Definition.* The space of builds (gear, skills, party, rules, scripts) is large *and* real: several
configurations are defensible at the same wall, the player's choices visibly change outcomes, and
there is a ceiling for experts (scripting, automation logic) without forcing it on everyone.

| Score | Anchor | Example |
|---|---|---|
| 20 | Upgrades strictly ordered; "buy the cheapest" wins; nothing to configure | Progress Quest; Cookie Clicker's buildings |
| 50 | Real choices at a few points; one meta build dominates | AFK Journey (team comps, but a tier list rules); Idle Champions (formations, but a meta per variant) |
| 80 | Many defensible builds; restrictions that change the best build; an expert layer | Stone Story RPG (Stonescript); Loop Hero (deck × road × class); Soda Dungeon 2 (party plus Soda Scripts) |

*Evidence.* Hands-on: rule-set diversity across clears, default-vs-edited gap (`tuned-picked`), rater
`decisions`/`expression` quotes. Desk: wiki build pages, review praise for "builds" or complaints about
"one meta".

### 1.8 `respect` — Idle and offline respect, and fairness (weight 2.5)

*Definition.* Absence is never punished: offline progress matches online or is honest about its limit;
no daily chores the player must do; no paid skips of waits the game created; automation is earned,
not sold. Death and failure cost time, not wealth, unless the player chose the stake.

| Score | Anchor | Example |
|---|---|---|
| 20 | Short offline caps, timers sold for money, FOMO events, paid automation | AFK-style gacha with energy and pass gating; Idle Champions' paid familiars plus the 8 h offline nerf |
| 50 | Offline works with a cap or a rate cut; some paid convenience; dailies optional but nagging | Legends of IdleOn (AFK at a base rate, auto-loot sold for $5); AFK Journey (12–24 h caps) |
| 80 | Offline exact and long (or uncapped); one price; nothing nags | Melvor Idle (24 h exact simulation, one purchase); Trimps (time warp, free) |

*Evidence.* Hands-on: catch-up parity tests, the offline cap, the death cost. Desk: the store page's
pricing and IAP list, wiki offline rules, review complaints about caps, energy or paywalls.
*Kill (package):* a paid skip of a wait the game itself created (eval-fun's `darkPatternInLoop`).

### 1.9 `juice` — Juice and feedback (weight 2)

*Definition.* Every reward, purchase, level, kill, unlock and death gets proportionate audiovisual
feedback at the moment it matters (and quiet otherwise); the player sees a number move when their
choice paid; big moments are bigger than small ones.

| Score | Anchor | Example |
|---|---|---|
| 20 | Numbers change silently; purchases and unlocks look alike | Progress Quest; most spreadsheet idlers |
| 50 | Floating numbers, a level-up flash; big and small moments look similar | Melvor (toasts); Idle Champions (gold rain, ultimates) |
| 80 | Proportionate, layered feedback; the big moment is unmistakable and earned | Gnorp Apologue / Nodebuster ("every upgrade felt"); Vampire Survivors (chest opening, screen fill) |

*Evidence.* Hands-on: GPU capture of a kill, a boss fall, a purchase and an unlock; `docs/JUICE.md`
measurements. Desk: trailer descriptions and review quotes ("satisfying", "juicy"). Audio part of juice
follows the `audio` rule (unassessed unless heard).

### 1.10 `polish` — Performance, stability and polish (weight 2)

*Definition.* Loads fast, runs at a stable frame rate on the target hardware, never loses a save, has
few visible bugs, and copy, numbers and labels agree with each other.

| Score | Anchor | Example |
|---|---|---|
| 20 | Crashes, save loss, frequent bugs, contradictory numbers | An early-access build with save-wipe patches |
| 50 | Stable, but known bugs, some contradictory labels, slow on low-end devices | IdleOn (frequent patches, mobile lag reports); a mid-alpha web game |
| 80 | Stable for years, fast, consistent; bugs rare and minor | Melvor Idle; Antimatter Dimensions (Reality update, long-running) |

*Evidence.* Hands-on: console errors in the walk, the client gate, frame times on the GPU path,
the QA list of contradictions (`eval/qa/`), the rater gripes. Desk: review mentions of bugs, crashes,
save loss; patch cadence. *Kill:* crash or data loss in a session.

### 1.11 `content` — Content breadth and longevity (weight 2.5)

*Definition.* Enough distinct content (places, enemies, bosses, classes, systems, an ending or endless
mode) to carry the declared horizon (for idle games: weeks), with variety, not reskins.

| Score | Anchor | Example |
|---|---|---|
| 20 | One loop, a few enemies, finished in an afternoon | Progress Quest; a jam idler |
| 50 | One to three weeks of content, or long but repetitive | Soda Dungeon 2 (strong first dimension, then grind); Rusty's Retirement (cosy, short) |
| 80 | Months of distinct systems and areas; or a complete, varied campaign with an ending and replay | Melvor Idle (dozens of skills, expansions); NGU Idle; Antimatter Dimensions |

*Evidence.* Hands-on: the content inventory (biomes, enemies, bosses, systems, the King ending) and the
fortnight timeline (when PICKED/DAILY/AWAY run out of new things). Desk: wiki content counts,
"hours to finish" (HowLongToBeat where available) and review comments.

### 1.12 `hook` — Hook and identity (weight 1.5)

*Definition.* The game's promise is legible in one screenshot or one sentence and is distinctive
in its genre; the store page or first minute shows the actual game; players can say what makes it
different.

| Score | Anchor | Example |
|---|---|---|
| 20 | Indistinguishable from its genre's clones | A generic idle hero tapper |
| 50 | A clear genre pitch with one twist | Lootun ("ARPG loot, idle"); Dark Hunting Ground |
| 80 | A one-line pitch nobody else owns, visible in the first screenshot | Loop Hero ("you build the world the hero walks"); Rusty's Retirement (sits at the screen's edge) |

*Evidence.* Hands-on: a cold rater's "tell a friend" sentences; the first screenshot. Desk: store
capsule and short description; review sentences that state the pitch.

### 1.13 `access` — Accessibility and reach (weight 1)

*Definition.* Platforms (web, phone, desktop), input (pointer only, keyboard), text size, contrast,
colour independence, reduced motion, mute, localisation and save export.

| Score | Anchor | Example |
|---|---|---|
| 20 | One platform, fixed tiny text, no settings | A desktop-only jam build |
| 50 | Two platforms or decent settings, English only, no reduced motion | Loop Hero (PC/Switch, few accessibility options) |
| 80 | Cross-platform with cloud save, scalable text, contrast and motion settings, several languages | Melvor Idle (web, Steam, mobile, cloud save, many languages) |

*Evidence.* Hands-on: settings screen, contrast checks, the 320 px/200 % checks. Desk: store platform
list, language list, settings described in reviews or the wiki.

## 2. Weights, gates, verdicts

`eval/package-presets.json` holds the weights (0–3). Preset `idle-package` (default, Idlever and any
auto-played idle game): art 2, motion 1.5, ui 3, audio 1, onboarding 3, pacing 3, depth 3, respect 2.5,
juice 2, polish 2, content 2.5, hook 1.5, access 1 (sum 28, renormalised to 100). Preset
`incremental-package` (pure incrementals: Antimatter Dimensions, NGU, Trimps): art 1, motion 1, depth
2.5, juice 1.5, the rest as `idle-package`. A pure incremental is not penalised for having little art.

- **Package score** = Σ score × weight / Σ weight over the assessed dimensions (unassessed `null`
  dimensions drop out and are listed).
- **Gate.** A load-bearing dimension (weight ≥ 2.5: ui, onboarding, pacing, depth, respect, content)
  under 50 blocks *ship-ready*.
- **Package bands** (set by the first calibration, §5, as fun's bands were): ≥ 68 and no gate
  **ship-ready** (above the best comparables) · 60–67 **shippable** (genre par: Loop Hero 63.9,
  Stone Story 64.0, Antimatter Dimensions 65.9) · 50–59 **niche** (loved small-scope or flawed titles:
  Rusty's 54.1, Trimps 53.3, Melvor 55.9) · < 50 **below the field**. An 80 is a per-dimension
  benchmark; no game in the calibration set averages it, so the bands sit lower than the anchors.
- **Ship verdict** (needs both layers): **ship** = fun ≥ 80 (the owner's goal, `idle-hybrid`) and
  package ≥ 65, no gate, no kill · **early access** = fun ≥ 72 (eval-fun's *fun* band) and package
  ≥ 55, no kill · otherwise **not yet**. The fun score is never raised by the package layer.
- **Overall** = 0.4 × fun + 0.6 × package, printed for ranking a table of games only. It is never a goal
  and never replaces either score.
- **Kill criteria (package).** Crash or data loss; a paid skip of a created wait; the core act cannot be
  done at the declared target viewport. Any one: verdict *not yet*.

## 3. Evidence modes and confidence

Every dimension records `mode` and `confidence`:

| Mode | Meaning | Rule |
|---|---|---|
| `hands-on` | The rater played the build | As the fun eval: quote what you saw; one observation, one dimension |
| `telemetry` | Bot rows, gate tables, timelines, frame times | May set a ceiling or support a score; may not raise one above what hands-on evidence shows when both exist |
| `desk` | Store pages, review distributions and quotes, wikis, guides, trailers | Cite each source (URL). A desk score above 80 needs two independent sources. A desk grade is never a hands-on claim |
| `mixed` | More than one of the above | Name each |

| Confidence | Test |
|---|---|
| `high` | Hands-on or telemetry evidence covering the dimension's definition, or ≥ 3 independent desk sources that agree |
| `medium` | One good source, or several that partly cover the definition |
| `low` | Inference from a trailer, a capsule or general reputation |

The scorer prints the mean confidence and the share of desk evidence. A table that compares desk
grades with a hands-on grade says so in its title.

## 4. Protocol

1. **Same session as the fun card.** A rater who files a fun card (`eval/RATING.md`) may add the
   `package` block from the same horizon. A coordinator-only package card (like the first one in
   `eval/package/idlever.*.json`) is a baseline, not a decision, exactly as for fun.
2. **Hands-on minimum for Idlever.** The scripted walk (`node tools/playtest.mjs --seed 7 --absent 8h
   --headless --out DIR`), one GPU capture on a private display (`tools/browser.mjs` `launchGpu`,
   never the desktop), the latest blind cards and QA lists, the gate table and the dayplayer timeline.
3. **Desk grading of a competitor.** Store page (price, IAP, platforms, languages, review summary),
   the review API or review quotes, the wiki (systems, offline rules, milestone times), one trailer
   or video description. Mark it `desk`. Fill fun as `funEstimate` with `source` naming a calibration
   card (`eval/calibration/`) or "desk estimate".
4. **Score.** `node eval/package-score.mjs eval/package/<card>.json`; a table:
   `node eval/package-score.mjs --table eval/package/*.json [--md]`.
5. **Reliability.** As fun: two independent cards on the same immutable build before a package verdict
   is a decision. Krippendorff's α can be computed over the 13 dimension scores (÷ 100) with
   `../eval-fun/tools/fun-reliability.mjs` after mapping them to `axes` (a later tool change); until
   then the package score is a coordinator baseline.

## 5. Calibration anchors per dimension

Before trusting a package table, the evaluator checks that these desk anchors land in their band in
the same sitting (the scores in `eval/package/` are the first calibration pass):

| Dimension | ~20 | ~50 | ~80 |
|---|---|---|---|
| art | Progress Quest, Trimps | Melvor Idle, Idle Champions | Loop Hero, Rusty's Retirement |
| motion | Progress Quest, Melvor | Soda Dungeon 2, IdleOn | Stone Story RPG, Loop Hero |
| ui | IdleOn late game | Melvor, NGU Idle | Antimatter Dimensions, Increlution |
| audio | Progress Quest, Melvor Idle | IdleOn, Idle Champions | Loop Hero, Stone Story RPG, AFK Journey |
| onboarding | Stone Story (scripting at 6–8 h) | Melvor, Trimps | Antimatter Dimensions, AdVenture Capitalist |
| pacing | Rusty's late game | NGU Idle, Loop Hero | Antimatter Dimensions, Increlution |
| depth | Progress Quest, Cookie Clicker | AFK Journey, Idle Champions | Stone Story RPG, Loop Hero |
| respect | Idle Champions (paid familiars, 8 h nerf) | IdleOn, AFK Journey | Melvor Idle, Trimps |
| juice | Progress Quest | Melvor, Idle Champions | Gnorp Apologue, Vampire Survivors |
| polish | save-wipe EA build | IdleOn | Melvor, Antimatter Dimensions |
| content | Progress Quest | Soda Dungeon 2, Rusty's | Melvor, NGU Idle |
| hook | generic tapper | Lootun, Dark Hunting Ground | Loop Hero, Rusty's Retirement |
| access | desktop-only jam | Loop Hero | Melvor Idle |

Pass condition: the ~80 anchors score 70–90 on their dimension, the ~20 anchors 10–30. If an anchor
game misses its band by more than 15 points the anchor text is wrong, not the game. Re-anchor on
Loop Hero's package card in the same sitting when the rubric is used after a gap of a month (as for fun).

**First calibration pass (2026-10-15, 14 desk cards in `eval/package/`, four independent desk
researchers).** Two anchors moved: Melvor's audio scored 15 (reviews call it near-silent), more than
15 under the old ~50 anchor, so Melvor moved to the ~20 column; Rusty's Retirement's ui scored 65
(no placement grid, no tutorial), exactly 15 under, so Increlution (72, "extremely clean and
surprisingly powerful") replaced it at ~80. Every other named anchor landed within 15 points. The
package totals then set the bands in §2: the strongest comparables 64–66, the loved small-scope
titles 53–56, the weakest 47. Loop Hero is gated on onboarding (48), which matches its documented
weakness ("the developers apologize for [the tutorial] instead of fixing it"); a gate marks a hole,
not a bad game. Desk cards over-weight complaints (graders pull negative reviews to find lapses);
a hands-on card of our own game risks the opposite bias. Read cross-mode comparisons with that in mind.

## 6. Using it on Idlever

```sh
cp eval/PACKAGE_SCORECARD.template.json eval/package/idlever.<build>.<rater>.json
node eval/package-score.mjs eval/package/idlever.<build>.<rater>.json
node eval/package-score.mjs --table eval/package/*.json --md   # the comparison table
node eval/package-score.mjs --self-test
```

Fix the lowest weighted gap on a load-bearing dimension first, then re-grade on a new immutable build.
The package layer never changes the order of the fun gap list; fun ≥ 80 remains the goal.
