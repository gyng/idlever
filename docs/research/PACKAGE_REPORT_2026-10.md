# Package report: is Idlever ready to ship? (2026-10-15)

This is a two-page summary. The full grades and sources are in [PACKAGE_GRADES_2026-10.md](PACKAGE_GRADES_2026-10.md),
the rubric in [`eval/PACKAGE_EVAL.md`](../../eval/PACKAGE_EVAL.md), and the cards in `eval/package/`.

## The eval decision

**We extended the fun eval with a package layer. We did not build a second eval.** The fun score stays
exactly as it was: same axes, weights, gates, bands and cards, and the `fun ≥ 80` goal on `idle-hybrid`.
A card can now carry an optional `package` block with 13 craft dimensions, each scored 0–100 on anchors at
20/50/80, with confidence, evidence mode and sources:

> art · motion (animation/FX) · ui (UI/UX, readability) · audio · onboarding · pacing (long arc) ·
> depth (build agency) · respect (idle/offline fairness, business model) · juice · polish (performance,
> stability) · content · hook (identity) · access (platforms, accessibility)

The scorer `node eval/package-score.mjs` reports **fun and package side by side**. The two are never
summed. It calls `../eval-fun` for the fun part. A *ship* verdict needs **fun ≥ 80** and **package ≥ 65**,
with no load-bearing dimension under 50. *Early access* needs fun ≥ 72 and package ≥ 55. The tool lives
in this repo because the package layer has a different card shape and covers desk grading. Putting it in
the shared `eval-fun` repo would change that repo's contract for every game that uses it.

## The scores

These are desk grades of 14 competitors (store pages, Steam review API, wikis; not played) against a
mixed-evidence, non-blind grade of Idlever on main `3823eb8b`. The Idlever grade drew on a walk, a GPU
capture, the 16-seed timeline and the latest blind cards. `!` marks a gate.

| Game | Package | Fun | Verdict | Weakest load-bearing dimension |
|---|---:|---:|---|---|
| Antimatter Dimensions | 65.9 | 68 | not yet | art and audio (light weight) |
| Stone Story RPG | 64.0 | 66 | not yet | onboarding 35!, pacing 48! |
| Loop Hero | 63.9 | 74 | early access | onboarding 48! |
| **Idlever** | **62.0** | **75.2** | **early access** | **pacing 45!** |
| Melvor Idle | 55.9 | 65 | not yet | onboarding 50 |
| Increlution | 54.4 | 62 | not yet | depth 50 |
| AFK Journey | 54.8 | 52 | kill (paid AFK time) | respect 12! |
| Rusty's Retirement | 54.1 | 55 | not yet | pacing 25! |
| Trimps · NGU · IdleOn · Soda Dungeon 2 · Dark Hunting Ground · Lootun · Idle Champions | 53.3 · 52.9 · 51.9 · 52.6 · 52.3 · 48.3 · 46.8 | 48–58 | not yet | pacing, ui, respect |

Idlever is **at genre par on package** (4th of 15, and 4th like for like without audio, which is
unassessed for Idlever) and **first on fun**. The fun comparison mixes blind cards with desk estimates;
only Loop Hero's 74.0 is like for like. Idlever is not yet shippable as a finished game. Fun is under 80,
and the long-arc pacing gate fails.

## Where Idlever is better, worse, or unknown

- **Better:**
  - **respect** 86 (best in the table): uncapped exact offline from about 5 min, no monetisation, no caps
    or dailies.
  - **onboarding** 62: first delve in about 20 s, first automation at 5.2 min.
  - **depth** 72: stances, tactics, temperaments, gear, pets and authored rows.
  - **art** 70, **juice** 58 and **hook** 66: all above the field median, though below the top four in art
    (Loop Hero, Stone Story, AFK Journey, Rusty's).
- **At par:** ui 52, motion 52, polish 60 and access 64.
- **Worse:**
  - **pacing** 45 (gate): every worker is hired and the King tried by day 2; after that only ranks arrive,
    a 48 h beat gap on days 2–7.
  - **content** 60: an engaged player spends the new content by day 2–4, against months in Melvor, NGU and
    Antimatter Dimensions.
- **Unknown:** **audio**. Cues and beds ship, but nobody has listened (`eval/AUDIO.md` is unfilled).
- **New defects from this pass:**
  - On the camp after the Scout hire, two progress pills overlap and a toast covers DELVE.
  - The depth rail covers about a quarter of the watch at phone width.

## Top learnings

Each item names the dimension it moves. All are proposals; WORK_QUEUE has an entry for them.

1. **A new mechanic every segment after day 2** (Antimatter Dimensions' prestige tiers, Dark Hunting
   Ground's "unlocks every step"). This means the second hero, the first reset payoff, and a named mechanic
   per wall. Moves *pacing*, *content*. Measure: days 2–7 beat gap ≤ 24 h (now 48 h).
2. **Feats with visible progress light later automation** (NGU's stat bars, Trimps' void maps). Moves
   *pacing*, *onboarding*. Measure: `nodes-lit` ≤ 48 h, with feat text shown.
3. **One decision per look in the first 30 min** (the Cut232 cadence fixes). Moves *onboarding*. Measure:
   `cadence30` 16/16.
4. **A codex one tap from every term, filled as facts are learned** (Lootun's glossary, Antimatter
   Dimensions' context help, Loop Hero's "keep googling" complaint). Moves *ui*. Measure: blind clarity
   ≥ 0.8.
5. **Name where the hero will stall before you leave** (Stone Story's †). Moves *respect*, *ui*. Measure:
   the forecast is within one floor of the 8 h replay ≥ 80 %.
6. **Fix the overlapping pills, slim the depth rail, separate actors from the ground** (raters' gripes,
   Increlution's clean UI). Moves *ui*, *art*, *juice*. Measure: overlap lint at 320/400/1440; feel ≥ 0.8.
7. **Show workers doing the chores in town** (Rusty's Retirement). Moves *art*, *juice*, *hook*. Measure:
   a GPU capture shows each worker's act within 10 s.
8. **Get an audio verdict, then give each place a theme** (Loop Hero's and AFK Journey's soundtracks).
   Moves *audio*. Measure: the AUDIO.md table is filled and audio is scored.

What not to copy: selling time or automation (IdleOn, AFK Journey, Soda Dungeon 2, Idle Champions),
offline caps or offline that stops at a chore, online-only launch, and timed level gates.
