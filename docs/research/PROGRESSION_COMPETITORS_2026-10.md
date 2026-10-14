# Progression and automation pacing: competitor research (2026-10-14)

Owner request 2026-10-14: study how comparable games pace progression and
automation, and find improvements for Idlever. This extends
`research/comparables.md` (2026-09-15) and `research/IDLE_STEAM_2026-10*.md`
(2026-10-10), and does not repeat their findings. The new material here is
timings and gates.

**Method.** Four research subagents and the lead used web search and fetch. The
sources were wikis (Melvor and IdleOn through their own sites; Trimps, NGU,
Antimatter Dimensions (AD) and Idle Champions on fandom through the MediaWiki
API or curl), the Steam store, the Steam review JSON, Steam discussions, guide
sites, speedrun.com, and Pecorella's GDC Europe 2016 slides.

**Blocked sources.** These could not be read: Reddit (old.reddit and the redlib
mirrors), gamedeveloper.com, web.archive.org, the Kongregate blog and the GDC
Vault recordings. So this document has no Reddit quotes, and the "Math of Idle
Games" articles appear only as search snippets.

**Tags.**
- **[F]**: read on a fetched page or in review text.
- **[S]**: a search-result snippet only.
- **[est]**: an estimate from the evidence, never a measurement.
- **[mem]**: the researcher's recall, unconfirmed.

Every review quote links to the Steam review or thread it came from.

## 1. Milestone comparison

Times are wall-clock time for a new player. Most are estimates, because guides
give milestones in zones or levels rather than minutes.

| Game | First automation (what) | Core loop fully automated | First prestige / reset | First "new mechanic" | Offline: unlock · cap · rate | Death / failure cost |
|---|---|---|---|---|---|---|
| **Trimps** | AutoFight, under 10 min [est]: the Bloodlust drop at Z1 cell 10, costing 60 science and 150 food [F](https://trimps.fandom.com/wiki/Bloodlust) | AutoStorage when you clear a void map at Z20 or above during the first portals; AutoStructure, Auto-Golden (after 77 bought by hand) and AutoUpgrade come weeks later [F](https://trimps.fandom.com/wiki/NewPlayerGuide(Truth)) | Portal after Z20 plus the Dimension of Anger; the guide says portal at Z23 or later; a few hours to a day [est] [F](https://trimps.fandom.com/wiki/Portal) | Trapstorm (automatic traps) at Z11 [F](https://trimps.fandom.com/wiki/NewPlayerGuide(Truth)) | From the start. The Time Warp mode simulates fully up to 24 h, plus a resource-only mode beyond that ("always use Hybrid") [F] | The squad dies; you lose only the breed timer, never loot [F] |
| **AdVenture Capitalist** | First manager in minutes [est]. Cabe Johnson costs $1,000 and automates the Lemonade business [S](https://adventure-capitalist.fandom.com/wiki/Earth) | Every business managed within the first session [est] | First angel reset at about 50–300 angels; rebuilding takes 2–3 h [F](https://steamcommunity.com/app/346900/discussions/0/618458030681519409) | Angel upgrades after the reset | Managers keep earning offline [F](https://en.wikipedia.org/wiki/AdVenture_Capitalist). No cap found | None. The reset discards managers [S] |
| **Antimatter Dimensions** | Autobuyers at 1e40 antimatter, before the first Infinity; under 1 h [est] [F](https://antimatter-dimensions.fandom.com/wiki/Autobuyers) | 12 autobuyers from the normal challenges; Break Infinity needs the Big Crunch autobuyer at 0.1 s [F](https://antimatter-dimensions.fandom.com/wiki/Infinity) | Big Crunch at 1.79e308. One mobile speedrun with ad boosts took 3.9 h [F](https://www.speedrun.com/antimatter_dimensions?h=Infinity-Mobile_Ad_Bonus&x=l_495zxo49-zdnlz0e2); a casual player takes several hours to a day [est] | Challenges at Infinity | Offline is a catch-up simulation with coarse ticks, "only somewhat accurate". No cap found [F](https://antimatter-dimensions.fandom.com/wiki/Offline_Progress) | No failure state |
| **NGU Idle** | Adventure Idle Mode from the start [F](https://ngu-idle.fandom.com/wiki/New_Player_Guide_(Truth)) | Titan AutoKill by stat thresholds, from about Boss 58 ("the tutorial"); Titan 2 at about 2 weeks; Adventure Advancer costs 65k AP (mid-game) [F](https://ngu-idle.fandom.com/wiki/Adventure) | Rebirth: 3 min minimum, early rebirths of 30 min, so within the first hour [F](https://ngu-idle.fandom.com/wiki/Rebirths) | Blood Magic, then Titans | No cap found. Offline AutoKill gives no item drops [F] | Only respawn time, which upgrades shorten [F] |
| **Melvor Idle** | Combat fights itself from the start. Auto Eat I costs 1M GP, several hours to a day in [est]; "upgrading this as quickly as possible is critical" [F](https://wiki.melvoridle.com/w/Combat) | Auto Eat III costs 20M; Auto Slayer costs 150k Slayer coins [F](https://wiki.melvoridle.com/w/Shop) | None | New skills and areas | From the start. Capped at 24 h and simulated exactly like online; offline combat is an explicit toggle [F](https://wiki.melvoridle.com/w/Offline_Progression) | One random equipped slot is lost forever. The Protect Item prayer prevents it; a Decoy Idol absorbs it [F] |
| **Legends of IdleOn** | AFK fighting and skilling from minute one, at a base 20% of the active rate [F](https://idleon.wiki/wiki/Game_Mechanics_AFK) | A second character at level 10 (first session [est]); slots 7 to 11 at family levels 500 to 5K [F](https://idleon.wiki/wiki/Character_Creation). Auto-loot is a $5 pack [F] | None early | The second character, an idle miner [F](https://idleon.wiki/wiki/Beginner_Guide) | Base cap not found; one curse sets it to 10 h [F]. AFK kills are capped per monster per hour | Respawn: town respawn is free, an instant revive once a day [F](https://idleon.wiki/wiki/Game_Mechanics) |
| **Increlution** | The action queue runs itself; each action automates after N completions (10 for the Funnel) [F](https://steamcommunity.com/app/1593350/discussions/0/3182361055553674146) | Per action, over many lives | The first death, under 30 min [est]. Each life lasts 20–30 min [F] | New zones per arc | Offline does **not** accumulate while paused on an action that is not yet automated [F](https://gamepretty.com/increlution-how-to-unlock-all-automations-with-mod/) | Death is the reset; Instinct carries over [F](https://store.steampowered.com/app/1593350) |
| **Idle Champions** | Familiars from patrons, gems, packs, or 3–4 free a year; about 6 automate bench leveling [S](https://steamcommunity.com/app/627690/discussions/3/3079873787837530455) | The Modron core (from "Split the Party", which needs area 50) loads formations and resets [S](https://idlechampions.fandom.com/wiki/Split_The_Party); a week or more [est] | Adventure resets from the first session | Patrons, the Modron | Offline gold from DPS. Background parties were cut to 1 reset (2023) [S](https://steamcommunity.com/app/627690/discussions/0/3770112515482301845) | None found |
| **AFK Arena / Journey** | Idle chest from minute one [S](https://afk.guide/afk-arena-beginner-guide/) | Campaign auto-battle; modes gated by stage (e.g. 9-20, 14-40) [F] | None | Modes by stage | Arena: 12 h cap; Fast Reward = 2 h, 1 free a day. Journey: 12 h, rising to 24 h by stage [S](https://dotgg.gg/afk-journey/beginners-guide/) | Retry at once, no cost [F] |
| **Clicker Heroes** | Hero DPS runs itself; progression mode auto-advances and switches off on a boss fail [S](https://steamcommunity.com/app/363970/discussions/0/523890681411512637) | — | Ascend at Z130 or later, a few hours in [est] [S](https://gamerofpassion.com/clicker-heroes-when-to-ascend/) | Ancients after ascension; Outsiders at Z300 or later | Uncapped. The game simulates idle DPS "until your heroes hit a wall", banks gold but buys nothing [F](https://blog.clickerheroes.com/offline-progression-in-clicker-heroes/) | A failed boss timer drops you back one zone |
| **Tap Titans 2** | — | — | Prestige unlocks at stage 60; first target about stage 110 [S](https://www.bluestacks.com/blog/game-guides/tap-titans-2/tt2-tips-tricks-en.html) | One pet every 4 h [S] | Inactive gold; cap not found | — |
| **Cookie Clicker** | Buildings in minute one | — | Ascension after 3–4 days to over a week [S](https://steamcommunity.com/app/1454400/discussions/0/2961669453616398504) | Heavenly upgrades | **Gated behind the first ascension**: 5% of production for 1 h, then 0.5% [F](https://cookieclicker.wiki.gg/wiki/Ascension) | None |
| **Soda Dungeon 2** | An auto-combat toggle, probably from the start [est]; Soda Scripts customise the AI [S] | **No automatic dungeon restart.** The game "needs attention every few minutes" [F](https://steamcommunity.com/app/946050/discussions/0/3463848715776669640/) | Dimension 1 ends at level 100 | Scripts, the arena | No true offline. Battle tokens and credits replay floors already cleared [F] | A party wipe stops the idle run [F] |
| **Loop Hero** | The hero always walks the loop. The first camp building comes after expedition 1 [S](https://www.trueachievements.com/a388501/hole-in-memory-achievement) | — | Each expedition is a run | Supply Depot opens farm and alchemy buildings [S] | None [mem] | Retreat keeps 100% on the camp tile and 60% elsewhere; death keeps 30%. No timer [S] |
| **Rusty's Retirement** | First bot inside the first hour [S](https://www.ofzenandcomputing.com/rustys-retirement-guide); "after about an hour a lot runs on its own" [S] | Biofuel, Harvest and Water bots; only one bot plants seeds [F] | None | Echo's Workshop (bot upgrades) | **None.** It runs only while open [S] | None |
| **Stone Story RPG** | Stonescript at the Mind Stone, after the first final-boss kill; about 6–8 h of story [F](https://stonestoryrpg.com/faq.html). The "~3 h" figure is unsupported | Scripts | — | Mind Stone | Offline farming is capped by your performance at that location and a treasure limit; a † marks places where you would die [F](https://stonestoryrpg.com/faq.html) | Death ends the offline haul [F] |
| **Lootun** | Auto-salvage (on by default), automatic ability casting, automatic combat restart [F](https://store.steampowered.com/app/1960270/Lootun/) | Several teams at once | — | Professions, flasks | "Light on idle mechanics" [F] | Combat restarts automatically |
| **Dark Hunting Ground** | A companion auto-loots with filters; "go from hands-on farming to fully automated looting" [F](https://store.steampowered.com/app/2494810/) | Shifts to idle "in the mid to late sections" [S] | — | "Things unlock basically every step of the way" [F] | AFK farming of materials | Not found |
| **Vampire Survivors / Brotato** | Automatic attacks from the first second | — | Each run (VS 30 min; Brotato 20 waves, under 30 min) [F](https://steamcommunity.com/app/1794680/discussions/0/4631482569784832721) | VS: several unlocks per run, many in about 5 min [S]. Brotato: one danger level and one character per win [S] | None | Keep the run's gold [mem] |
| **Idle Slayer** | Auto-run from the start [mem] | — | First ascension when you can afford Permanent Slayer and two bundles [S](https://idleslayer.fandom.com/wiki/FAQ?oldid=381); first Ultra Ascension at about day 32 for one player [S] | Bow through an ascension upgrade | Slower offline, about 1 point per 3 min versus 2 per min active [S] | None |
| **Unnamed Space Idle** | Automation bought with AI Points (also sold for money); auto-research "critical" early [S](https://steamcommunity.com/app/2471100/discussions/0/4364627785844233087) | Auto-merge, auto-optimise | Prestige "within 48 hours" [S](https://steamcommunity.com/app/2471100/discussions/0/3819669231699906757) | Bases at prestige | Yes; no cap found. "Every morning, I wake up just to see my offline progress" [F] | — |
| **Gnorp Apologue** | Drones collect shards; talents automate weapons [S] | — | Burn the settlement for a permanent bonus; about 10 compression levels to the end [S] | Talent at 17 | Leave it open [S] | A bad build "bricks" a run [S] |
| **Kittens Game** | Steamworks automation "only makes beams, slabs and plates" [S](https://forum.kittensgame.com/post/844) | Automation-focused second run [S] | Reset at 80–130 kittens [S] | Religion, Apocrypha | Web offline "maximizes roughly every 8 hours" [F](https://zinsho.github.io/incremental_musings/scripts/kittensgame/2018/02/19/kg-offline/) | — |

## 2. Per-game notes (only what is new beyond earlier research)

- **Trimps.** The original complaint was "you don't get automation until
  hundreds of hours in". It targets the *late* QoL automation. The first
  automation, AutoFight, arrives in minutes, and the next (AutoStorage) is tied
  to a **feat**: a void map at Z20 or above. One player liked the offline
  balance: "a slight advantage to going offline … not enough that being actively
  online feels like a waste"
  ([review](https://steamcommunity.com/profiles/76561198157452747/recommended/1877960/)).
  Another: "everything else is just winging it, or gets automated in the future"
  ([review](https://steamcommunity.com/profiles/76561198097727388/recommended/1877960/)).
- **Increlution.** This is the closest analogue to Idlever's pre-scout "waits"
  state, because offline time stops at a chore that is not yet automated.
  Players asked for automation "after 1 or 2 completions rather than 10". The
  developer kept 10 because it teaches the scaling, then later lowered several
  requirements ([thread](https://steamcommunity.com/app/1593350/discussions/0/3182361055553674146);
  [patch](https://steamdb.info/patchnotes/8550739) [S]). Praised: "the pacing is
  perfect… the tension was absolutely dialed in"
  ([review](https://steamcommunity.com/profiles/76561198328597080/recommended/1593350/)),
  and replays get faster: "things that originally take 20 minutes slowly take
  less and less time… you complete the entire first arc in milliseconds"
  ([review](https://steamcommunity.com/profiles/76561198351855286/recommended/1593350/)).
  Punished: "basically no offline progress since you need to come back every
  20-30 minutes"
  ([review](https://steamcommunity.com/profiles/76561198934151557/recommended/1593350/)).
- **NGU Idle.** Death costs only a respawn timer, and upgrades shorten it.
  Automation is gated by **stat thresholds**: AutoKill unlocks when Power and
  Toughness beat a titan. Players say "the game gets a lot more idle after the
  first 3 titans"
  ([review](https://steamcommunity.com/profiles/76561198023652905/recommended/1147690/))
  and "you see a new one opening quite slow"
  ([review](https://steamcommunity.com/profiles/76561198844163569/recommended/1147690/)).
- **Melvor.** Players value offline that matches online exactly: "thanks to the
  24-hour offline progress, just a [few minutes]…"
  ([review](https://steamcommunity.com/profiles/76561198273943343/recommended/1267910/)).
  The key automation, Auto Eat, is a single expensive **gold** purchase. It is
  the one thing that makes idle combat safe.
- **Antimatter Dimensions.** "Yes there are walls, but they are frontloaded"
  ([review](https://steamcommunity.com/profiles/76561199876283850/recommended/1399720/)).
  "Each prestige tier feels different and has unique mechanics"
  ([review](https://steamcommunity.com/profiles/76561198058892610/recommended/1399720/)).
  Autobuyers come from **challenges** (feats) and get faster with prestige
  currency. Automation is a ladder the player climbs, not a single switch.
- **IdleOn.** The biggest early idle lever is **parallelism**: a second
  character at level 10 who idles a different job. Selling auto-loot is
  resented: a reviewer called it the "true box price"
  ([review](https://steamcommunity.com/profiles/76561198110273987/recommended/1476970/)).
- **Idle Champions.** Paid automation (familiars) and the offline nerf are the
  pacing complaints: "Offline parties now make absolutely no progress after 8+
  hours" ([reviews](https://steamcommunity.com/app/627690/reviews/?browsefilter=toprated)).
- **Soda Dungeon 2.** Without an automatic restart, the game "needs attention
  every few minutes", and players call it "way too grindy … playing the same
  levels over and over"
  ([thread](https://steamcommunity.com/app/946050/discussions/0/3445835585853186933/)).
  Idlever's scout is the fix Soda Dungeon 2 never shipped.
- **Clicker Heroes.** Offline runs "until your heroes hit a wall": uncapped, but
  honest about where it will stop.
- **Stone Story.** The offline haul is bounded by demonstrated performance at
  that location, and a † warns that the hero would die there. It is a forecast
  surfaced *before* the absence. Punished: "a lot of the game is actually about
  waiting for a long time to get your rewards"
  ([reviews](https://store.steampowered.com/appreviews/603390?json=1&filter=all&language=english&num_per_page=100)).
- **Rusty's Retirement.** The first bot arrives inside the first hour. Its late
  game is "pretty slow paced and mostly just waiting", and "there is only 1
  robot that plants seeds for you"
  ([reviews](https://store.steampowered.com/appreviews/2666510?json=1&filter=all&language=english&num_per_page=100)).
- **Unnamed Space Idle.** "A very, very slow game after the first day or so",
  and players dislike "how long it takes to get set up after prestiging". Also
  praised: "it does a pretty good job of moving you past the grind in each
  segment"
  ([reviews](https://store.steampowered.com/appreviews/2471100?json=1&filter=all&language=all&purchase_type=all&num_per_page=100)).
- **Gnorp Apologue.** "Prestiging most of the time is wasted as you hit wall
  after wall with no way to know if what your tweaking [works]" (7.6 h). "I kept
  the game up idling… Pretty sure I could've had the 100% like 20 hours earlier"
  ([reviews](https://store.steampowered.com/appreviews/1473350?json=1&filter=all&language=english&num_per_page=100)).
- **Vampire Survivors.** "The first 10-20 hours are slow, but when you get to
  unlocking several characters…" Unlocks count without finishing the run, so
  every run pays
  ([reviews](https://store.steampowered.com/appreviews/1794680?json=1&filter=all&language=english&num_per_page=100)).
- **Theory.** Pecorella (GDC Europe 2016) recommends prestige at **+50% to +200%**
  prestige currency, active-skill cooldowns of "5 minutes – a few hours", and
  calls Egg Inc.'s **2 h offline limit "a mistake"**
  ([slides](https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507)).
  An anecdotal developer heuristic (no data) gives: first upgrade within 60 s,
  first automation within 3 min, phase transitions of 3–5 min of active play,
  and the run after a reset "visibly faster within the first 30 s"
  ([dev.to](https://dev.to/aguier/i-built-7-idle-games-in-30-days-what-i-learned-about-incremental-design-5d3f)).
  Another post-mortem would cut its first prestige from 25–35 min to 15–20
  ([dev.to](https://dev.to/tanishpaul1106/aura-data-and-prestige-designing-the-economy-of-doomscroll-2077-293f) [S]).

## 3. Patterns

1. **The first automation comes in minutes.** It is under 10 min in Trimps,
   AdCap, AD (under 1 h), AFK Arena, IdleOn and NGU, and inside the first hour
   in Rusty's. The heuristic says 3 min. Games whose first automation is late
   (Stone Story at about 6–8 h, Idle Champions' paid familiars, Soda Dungeon 2
   with no restart at all) collect "grind" and "needy" complaints.
2. **Basic automation is free; *better* automation is earned.** The first rung
   is a toggle or a cheap drop. Later rungs come from feats (Trimps void maps,
   AD challenges, NGU stat thresholds) or a large single gold sink (Melvor Auto
   Eat). Repetition counts are punished once they feel long (Increlution's 10
   and 400). Selling automation is the most resented choice (IdleOn auto-loot,
   Idle Champions familiars, USI AI Points).
3. **Offline either matches online or is honest about its limit.** Melvor
   (exact, 24 h) and Clicker Heroes ("until the wall") are trusted. Caps of 2 h
   (Egg Inc), 8 h (Idle Champions' background parties) and rate cuts (IdleOn at
   20%, Cookie Clicker at 5%) are named mistakes or complaints. Gacha games use
   12–24 h caps on purpose, to force two sessions a day. Increlution's "offline
   stops at an unautomated chore" is the single most punished offline rule
   found.
4. **Failure costs time, not progress, and the timer can be upgraded.** Death
   costs a respawn timer (NGU, IdleOn's free town respawn), a breed timer
   (Trimps), one zone (Clicker Heroes) or an automatic restart (Lootun, AFK).
   Only Loop Hero (keep 30%) and Melvor (lose one item, preventable by prayer)
   take resources, and both offer a protection lever.
5. **The first reset comes early and the replay is faster.** NGU rebirths at
   30 min, Increlution's first life ends under 30 min, Clicker Heroes and AdCap
   reset in hours. Cookie Clicker (days) is the outlier, and it gates offline
   behind that reset. Players praise replays that compress ("the first arc in
   milliseconds") and punish slow setup after a reset (USI).
6. **"Day 2 slows down" is the common punish.** It shows up in USI ("after the
   first day or so"), Rusty's late game, Stone Story's waiting, and VS's first
   10–20 h. The fixes that get praised are a new mechanic each segment (AD tiers,
   Dark Hunting Ground "unlocks every step", NGU titans) and **parallel
   delegates** (IdleOn's second character, Lootun's teams).
7. **Forecasts beat surprises.** Stone Story's † offline marker, Melvor's
   community combat simulator, and Gnorp's "no way to know if what you're
   tweaking works" all point the same way: players want to know where the
   automation will stall before they leave.

## 4. Idlever today (from source, 2026-10-14; for contrast)

- **First automation.** The porter (open the chest) is free after 3 chests; row
  `porter` targets 12 min or less. The scout (automatic send, which makes
  offline uncapped) unlocks after 3 manual sends at 0.5 forge unit; row `scout`
  targets 15 min or less (`docs/CUT30_5.md` §1). The HEAD commit (947cbeb7)
  records **scout worst seed 19.3 min, FAIL**.
- **Before the scout,** an absence yields at most the run in flight
  (`tree.waits`). This is Increlution's punished rule in milder form.
- **Rest between runs** lasts 20–30 min (`REST_MIN_TICKS` / `REST_CAP_TICKS`,
  `engine.rs`). Death recovery is fixed by `persistent::RECOVERY_TICKS`. The
  `engine.rs` comment says 17.5 min (owner amendment 2026-10-14), while
  PLAN.md's Cut211 text says 60 s. The lead should reconcile the two.
- **Later trunk rungs** have count triggers with 24–44 h fallbacks
  (armourer through guide). Rows `nodes-lit` (48 h) and `nodes-bought` (72 h)
  cover them.
- **Offline is uncapped after the scout** and simulated identically (hard
  invariant). This matches the trusted pattern.

## 5. Proposals, ranked

Ranking weighs evidence strength × the size of Idlever's gap × cost. Each
proposal keeps the hard invariants: Rust owns truth, nothing punishes absence,
IDLE taps only until the scout.

1. **Put the first automation inside 5 minutes, and the scout inside 8 on every
   seed.**
   - *Change:* make the scout's trigger the first completed run ("he knows the
     way now"), or 2 sends instead of 3. Make the price affordable from the
     first run's gold. The porter could even arrive with the first chest.
   - *Evidence:* Trimps AutoFight and AdCap managers come in minutes; the
     heuristic says 3 min; pattern 1. The HEAD worst seed is 19.3 min, which
     fails Idlever's own 15-minute bar.
   - *Measure:* `scout` row tightened to 8 min or less on 16/16 seeds and
     `porter` to 5 min or less. Client journeys `first-plot.mjs` and
     `worker-first-act.mjs` record wall time to the hire. Rows `idle-delta`,
     `idle-d8` and `picked-idle` must not regress.
2. **Before the scout, an absence still pays something.**
   - *Change:* while the hero waits, the absence fills a small capped "camp
     chest": a fixed safe-floor trickle up to 2 h of first-floor gold, shown on
     return. The owner's manual-send decision stays: no sends happen, and the
     cap disappears with the scout, so offline is still uncapped after it.
   - *Evidence:* Increlution's "offline does not accumulate while paused" is the
     most-punished offline rule found. AFK Arena's chest fills from minute one.
     Pecorella: "the longer you're away… the greater your incentive to return".
     Pattern 3.
   - *Measure:* a new dayplayer row, "IDLE absent before the scout returns to
     gold > 0" (reuse the `idle-gold` machinery on a pre-scout absence fixture).
     The `return-pick.mjs` journey shows the chest line. `conserved` must pass.
3. **Make failure cost time, and let early time be short.**
   - *Change:* scale rest and death recovery with depth. For example: rest of
     2–5 min while the record is under D8, rising to the current 20–30 min cap
     by about D13. Death recovery starts at 60 s and grows with depth. Offer a
     Legacy or works node that shortens it, the way NGU respawn upgrades do.
   - *Evidence:* NGU, IdleOn, Trimps, Lootun and AFK all charge only time, and
     their timers upgrade (pattern 4). The heuristic says 3–5 min per phase.
     Today a 17.5–20 min wait after a death in the first session is longer than
     the whole first-automation window of every fast comparable.
   - *Measure:* runs completed in the first 30 min of play (a new dayplayer row,
     4 or more on every seed); `scout`/`porter` times; `stalls-*` and
     `idle-stall` unchanged; the `idle-king` guard holds (the shorter rests must
     not shorten the fortnight).
4. **Schedule the unlock cadence explicitly, one beat at a time.**
   - *Change:* for the first session, aim for a new thing (worker, building,
     stance level or wall) every 3–5 min for the first 30 min. Then space beats
     at roughly 1 h, 3 h, 8 h, day 1, day 2, day 4 and day 7. Never put two
     decisions on one screen. This makes WORK_QUEUE item 3 ("Stage early
     progression") numeric.
   - *Evidence:* the heuristic phase timings; Dark Hunting Ground's "things
     unlock basically every step" is praised; VS and Brotato give several
     unlocks per run; "day 2 slows down" is punished in USI, Rusty's and Stone
     Story (pattern 6).
   - *Measure:* a dayplayer timeline dump of unlock timestamps per seed; a row
     for max gap in the first 30 min of 6 min or less, and simultaneous
     decisions of 1 or fewer; `picked-stages` and `idle-stages` already cover
     days 2–14.
5. **Show progress toward the next worker on the trigger, and move later rungs
   from counts to feats.**
   - *Change:* the lit node shows "2/3 sends" or "1/2 finds worn". Triggers for
     the armourer and later become feats ("wear a find that beats your kit")
     where a count is arbitrary. Keep the time fallbacks for IDLE.
   - *Evidence:* Increlution's N-completion counts are punished; AD challenges
     and Trimps void maps (feats) are praised; Round 2 found "automation rewards
     a feat, not a repetition count".
   - *Measure:* client journey: the works pill shows the count and its change
     after a send (extend `worker-first-act.mjs`). `nodes-lit` stays at 48 h or
     less.
6. **A second delegate on day 1–2.**
   - *Change:* the second bloodline slot opens on a day-1 or day-2 milestone,
     for example the first band boss. It can run a different job: a farming
     slot at the start the guide picks, while the main slot pushes the record.
   - *Evidence:* IdleOn's second character at level 10 is its main idle lever;
     Lootun's parallel teams; pattern 6's fix for the day-2 slowdown.
   - *Measure:* a dayplayer row, PICKED with slot 2 open by day 2 on 16/16
     seeds; `automation-pays` and `workers-daily` must hold; a mean-best-depth
     check confirms slot 2 does not cost the daily player more than one floor.
7. **Make the away forecast name where automation will stall.**
   - *Change:* before an absence (and in the return report), show "holds at D14
     · Queen" or a † on the wall the hero will not pass. This uses the existing
     verdict and forecast machinery.
   - *Evidence:* Stone Story's † offline marker; Clicker Heroes' "until your
     heroes hit a wall"; Gnorp's "no way to know if what you're tweaking
     [works]"; pattern 7.
   - *Measure:* a client journey checks that the away panel's predicted stall
     depth matches the 8 h replay within one floor (use
     `tools/camp-check.mjs` saves); the native forecast's cost stays within the
     existing budget.
8. **Make the replay after a death visibly faster in the first 30 s.**
   - *Change:* after a death, floors already cleared in earlier runs resolve as
     a fast-forward (or a "swift" skip earned by clears, Round 2 tweak 5). Then
     time to the previous record is minutes, not a re-climb.
   - *Evidence:* Increlution's "first arc in milliseconds" is praised; USI's
     slow setup after a prestige is punished; the 30 s heuristic; AD milestones
     that start you with early content done.
   - *Measure:* a dayplayer row for median time from death to the previous
     record of 10 min or less; the watch journey shows the fast-forward.
9. **Keep automation earned, never sold or wage-gated into a wall.**
   - *Change:* audit that no worker or rung can be blocked by gold the IDLE
     player cannot reach within its fallback window. Wages must never make a
     hired worker net-negative.
   - *Evidence:* the IdleOn auto-loot "true box price", Idle Champions
     familiars and USI AI Points are the most resented pacing choices
     (pattern 2).
   - *Measure:* `nodes-bought` at 72 h or less on IDLE as well as PICKED; a
     per-worker value check in `each-system`.
10. **Give the first "reset-like" beat a +50–200% payoff early.**
    - *Change:* Idlever's persistent heroes have no early reset. The first
      Legacy purchase after a death (or the first stat rebirth review) should
      show a preview of its effect ("+60% hp") and land inside day 1.
    - *Evidence:* Pecorella's +50% to +200% prestige rule; the "show a reset
      preview" heuristic [S]; NGU and Increlution first resets under 1 h.
    - *Measure:* a dayplayer row, first Legacy purchase by about hour 2 on every
      PICKED seed; a client journey checks the preview line against copy-lint
      budgets.
11. **Do not add offline caps or rate cuts. Write the rationale into the
    invariant.**
    - *Change:* add a one-line citation to AGENTS.md's offline invariant. This
      is a doc change for the lead.
    - *Evidence:* Pecorella on Egg Inc.'s 2 h cap; Idle Champions' 8 h
      complaint; Melvor's exact offline is praised.
    - *Measure:* none new. The existing catch-up parity tests cover it.

## 6. Idlever measured timeline (to fill after Cut230)

*Placeholder for the lead. Fill with measured medians and worst seeds on the
same 16 seeds, in the shape of §1's columns:*

| Milestone | Idlever median | Worst seed | Comparable band (from §1) | Gap |
|---|---|---|---|---|
| First automation (porter) | _tbd_ | _tbd_ | minutes (Trimps, AdCap, AFK) | |
| Automatic send (scout) / offline unlocked | _tbd_ | _tbd_ | minute one to under 1 h | |
| Core loop fully automated (trunk through apprentice) | _tbd_ | _tbd_ | first session to week 1 | |
| All lit nodes bought | _tbd_ | _tbd_ | — | |
| First death and recovery time | _tbd_ | _tbd_ | seconds to minutes (NGU, IdleOn, Trimps) | |
| Runs completed in the first 30 min | _tbd_ | _tbd_ | — | |
| First new mechanic (building, kennel, forge) | _tbd_ | _tbd_ | under 30 min | |
| First Legacy / reset-like beat | _tbd_ | _tbd_ | 30 min to hours (NGU, Clicker Heroes, AdCap) | |
| Max unlock gap, first 30 min / days 2–7 | _tbd_ | _tbd_ | 3–5 min (heuristic) | |
| D8 / D13 / D23 (IDLE, PICKED) | _tbd_ | _tbd_ | — | |

## 7. Gaps

- There are no Reddit quotes; every Reddit route was blocked.
- The GDC talk recordings and the "Math of Idle Games" text were not readable.
- Wall-clock times are estimates for Trimps' first portal, AD's casual first
  Infinity, Melvor's Auto Eat, the Idle Champions Modron and the Clicker Heroes
  ascension. No sourced timings were found for Lootun, Dark Hunting Ground,
  Kittens Game or Gnorp automation.
- Not found: the IdleOn base offline cap, the NGU official offline cap, and
  AdCap's offline rules.
