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

## 6. Idlever measured timeline (main 3ee50b3e, after Cut230; measured 2026-10-15)

**Source.** `dayplayer --bots idle,picked,daily,away --seeds 16 --days 14 --timeline FILE`, summarized by
`node tools/timeline-summary.mjs FILE`. Evidence: `docs/evidence/cut231/timeline/` (`timeline-16x14.json`,
`summary-16x14.md`). The timeline only reads the game: all 48 IDLE, IDLE30 and PICKED jobs are byte-identical to the
base binary once the timeline fields are removed (`invariance.log`).

**Clock.** Times are *player time* under the dayplayer's check-in model. The first session runs on its own clock:
each send's run at the 4× watch, plus 25 s of camp taps per send and 5 s per hire. After that the player is away,
and an unlock that happens during an absence is stamped at the return that shows it. IDLE and PICKED check in 3
times a day (8 h, 16 h, 24 h…), so a time of `8.0h` means "found at the first return". DAILY checks in once a day.
AWAY checks in every 2–3 days. IDLE leaves once the Scout is hired (about 5 min). PICKED, DAILY and AWAY stay
45 min in the first session. All three share PICKED's first session, so their first-hour rows match.

**Bots.** IDLE makes no picks and hires only the Scout (plus the Porter once collection is automatic). PICKED
takes the forecast's package moves, hires every lit worker it can pay for, builds, forges and deposits. DAILY is
PICKED with one check-in a day. AWAY is PICKED looking in every 2–3 days. No bot spends Legacy by hand, founds a
second bloodline or reclones. PICKED+L spends Legacy and is not in this table.

| Milestone | IDLE median · worst | PICKED median (p10–p90) · worst | DAILY · AWAY median | Comparable band (§1) | Gap |
|---|---|---|---|---|---|
| First automation (the Scout: auto send) | 4.9m · 7.2m | 5.2m (4.4–6.9) · 7.5m | 5.2m · 5.2m | Trimps AutoFight <10 min; AdCap managers in minutes; heuristic 3 min | **at par** |
| Porter (auto haul) | 8.0h · 8.0h | 9.1m (7.1–10.6) · 11.2m | 9.1m · 9.1m | minutes | at par (PICKED) |
| Offline unlocked and uncapped (= the Scout) | 4.9m · 7.2m | 5.2m · 7.5m | same | Melvor/Trimps from minute one (Melvor capped at 24 h); Cookie Clicker after its first ascension | **ahead**: uncapped and exact from 5 min |
| Core loop automated (Porter + Scout + Apprentice; the Quartermaster starts hired) | never (IDLE hires no Apprentice) | 16.0h (8.0h–16.0h) · 16.0h | 2.0d · 4.0d | AdCap first session; NGU/IdleOn days; Trimps/Idle Champions weeks | within the band |
| Drillmaster (auto level) | — | 22.0m (19.6–32.7) · 33.4m | 22m · 22m | — | — |
| Clerk · Kennel hand · Herald | — | 40.0h each | 2.0d · 2–4.0d | — | — |
| Guide · Kennel keeper (last hires) | — | 2.0d | 4.0d · 4.0d | — | — |
| All workers hired | never | 2.0d · 2.0d | 4.0d (worst 5.0d) · 4.0d (worst 6.0d) | Trimps' late QoL: hundreds of hours | early: the tree ends on day 2 |
| First worker rank (week-2 upgrades) | — | 4.7d | 6.0d · 6.0d | — | the only new beat on days 3–7 |
| First death (recovery 60 s through D14) | 16.0h · 24.0h | 40.6m (6.4m–8.0h) · 16.0h | 40.6m | NGU/IdleOn/Trimps: seconds to minutes of time lost | at par since Cut230 |
| First new mechanic: the Forge (plot and build) | 8.0h (plot) · never built | 12.5m (9.5–15.7) · 17.3m | 12.5m | under 30 min | **at par** |
| Kennel built | never | 12.0m (8.0–23.2) · 26.0m | 12.0m | — | — |
| Temperament ("six delves") | 20.0h · 24.0h | 21.5m (15.9–28.8) · 29.6m | 21.5m | — | — |
| Stances system ("meet Captain") | 40.0h | 34.8m (31.2–39.4) · 39.9m | 34.8m | — | — |
| First new package beyond Steady | 8.0h | 8.7m (4.5–15.7) · 19.8m | 8.7m | VS/Brotato: several unlocks per run | at par |
| Tactics/quests/start ("slay Warlord") | 2.0d | 8.0h (8.0–16.0h) · 16.0h | 24h · 24h | — | — |
| Pen ("meet Mother") | 12.0h · 24.0h | 8.0h (41.9m–16.0h) · 16.0h | 24h · 24h | — | — |
| Orders/automations, tactic 2 ("meet Lich") | 3.3d | 2.3d | 5.0d · 6.0d | — | — |
| Second bloodline affordable (house + $250) | 8.0h | 13.6m (10.9–16.6) · 17.1m | 13.6m | IdleOn's second character, first session | **affordable at 14 min but never founded**: the dayplayer plays one bloodline |
| First Legacy upgrade affordable | 8.0h | 22.8m (19.8–31.2) · 31.2m | 22.8m | — | — |
| First Legacy spend / reclone (reset-like beat) | never · never | never · never | never | NGU rebirth 30 min; Increlution first life <30 min; AdCap/Clicker Heroes hours | **gap**: no reset-like beat lands without a manual Legacy order |
| First boss slain | 8.0h · 16.0h | 37.5m (28.8–45.0) · 51.0m | 37.5m | — | — |
| D8 · D13 | 8.0h · 12.0h (worst 8.0h · 24.0h) | 19.8m · 47.9m (worst 31.2m · 8.0h) | D13: 47.9m · 47.9m | — | — |
| D18 · D23 | 44.0h · 4.3d (worst 3.0d · 6.3d) | 16.0h · 24.0h (worst 32h · 40h) | 2.0d · 2.0d / 4.0d · 4.0d | — | — |
| D28 · D33 | 5.5d · reached 6/16 | 32.0h · 2.0d (worst 40h · 3.0d) | 3.0d · 4.0d / 4.0d · 9.0d | — | — |
| King attempted · slain | 4/16 · 0/16 | 2.0d (40h–2.7d) · 0/16 | 4.0d · 9.0d; never slain | — | by design (the King guard) |
| Max major-beat gap, first 30 min (§6a) | 3.0m · 4.7m (its own 5 min session) | 6.4m (p90 8.0) · 9.1m; ≤ 6 min on 8/16 | same as PICKED | 3–5 min (heuristic) | **fails on 8/16 seeds** |
| Most new decisions in one look, first 30 min | 3 · 4 | 3.5 · 5 (0/16 ≤ 1) | same | "one decision at a time" | **fails on every seed** |
| Max major-beat gap, days 2–7 | 40h · 56h | 48h · 48h | 24h (= its check-in) · 72h (= its check-in) | Dark Hunting Ground "unlocks every step"; day-2 slowdown punished | **gap**: after D33 and the King's first try (about day 2) only worker ranks arrive |

**Highlights against §1.**

- **First automation and offline.** These are now at or ahead of the comparables. The Scout comes at 5.2 min on
  the median PICKED seed and 7.5 min on the worst. Offline is uncapped and exact from then on. That beats Melvor's
  24 h cap and Cookie Clicker's post-ascension gate, and it matches Trimps and AdCap's minutes. Cut230 closed the
  §4 gap (19.3 min, FAIL).
- **The first 45 minutes are dense, but bunched.** Mechanics arrive inside the "under 30 min" band: the Forge at
  12.5 min, the Kennel at 12 min, temperaments at 21.5 min, stances at 35 min, the first boss at 37.5 min and D13 at
  48 min. But they arrive in clumps. The first return brings the chest, a stance level and a reveal together. "Four
  delves" brings the Forge plot, often the Kennel plot, a package and a level together. A 6–9 min hole usually sits
  between the Porter or Forge (8–15 min) and temperaments or the first stray (19–29 min). See §6a.
- **Content runs out early for the engaged player.** PICKED hires every worker by day 2. It reaches D33 and first
  tries the King at a median 2.0 days (worst 3.0). After that the only new things are worker ranks at 4.7 and 5.7
  days. Days 3–14 are the "day 2 slows down" pattern (§3 pattern 6), and the King guard holds it there on purpose.
  The DAILY player reaches the same wall around day 4, and AWAY around day 9.
- **The reset-like beat never lands.** A Legacy upgrade is affordable at 23 min and a second bloodline at 14 min.
  No default bot ever spends either: Legacy waits for a manual order, and the bloodline for a manual founding. The
  §1 comparables put the first reset at 30 min (NGU) to a few hours (AdCap, Clicker Heroes).
- **IDLE gets its whole first day's content at the 8 h return.** The Forge plot, the first package, the first boss,
  D8 and the Legacy offer all appear at 8.0 h. That is by design: IDLE is away after the Scout. It also means IDLE's
  first return is one large report.

## 6a. First-30-min cadence (Cut231 item 4)

Row `cadence30` (`node tools/gates.mjs --full --rows cadence30`, 62 s, PICKED 16 seeds, first session only).

- **Beat.** A beat is a new major entry in the state at a look. A look is the camp before and after its taps in the
  first session, and the return at each check-in. Major beats are: a worker lit (hire offered) or hired; a worker's
  rank offered or bought; a building plot offered or built; a stance level affordable or bought; a package owned;
  a system revealed (one per trigger); the first chest; a Legacy offer or the first spend; a reclone; a first boss
  kill; a `MILESTONES` record (D8, D13, …); a King try or kill; the first death. Minor beats are excluded from the
  gap: each new record floor, each class level, and the second bloodline becoming affordable.
- **Decision.** A decision is a major beat that asks the player to act: a worker lit, a rank on offer, a plot, a
  package, a stance level affordable, a system reveal, the first chest, or a Legacy offer. Units: each hire, each
  plot and each reveal counts as one. The packages that arrive together count as one pick, as do the stance levels,
  the chest and the Legacy offers.
- **Bar.** On every PICKED seed, the longest gap between major beats over the first 30 player-minutes is ≤ 6 min.
  The gap counts from minute 0 to the first beat, between beats, and from the last beat to minute 30. Also on every
  seed, no look brings more than 1 new decision. The row is targeted only. The routine table shows it as `info`
  until it passes.

**Current values: FAIL.** The gap has median 6.4 min, p90 8.0 and worst 9.1 (seed 13); it is ≤ 6 min on 8/16
seeds. The most decisions in one look have median 3.5 and worst 5; ≤ 1 holds on 0/16 seeds. The summarizer also
reports a looser count that merges each reveal with its own offer: the Forge plot with "four delves",
temperaments with "six delves", the Kennel plot with "first tame", the bank plot with "a night's purse", and the
first chest with "first gold home". Even then the median is 3 and the worst 5, and 0/16 seeds pass.

Where it fails (16 seeds, `summary-16x14.md`):

| Pile-up (one look) | Seeds | Units |
|---|---|---|
| First return, about 1.3–4.5 min | 16/16 | chest + stance level affordable + a reveal ("first gold home"; "first death" on seed 6) |
| "Four delves", about 9.5–15.7 min | 16/16 | Forge plot + "four delves", often with the Kennel plot, a package or a level (5-unit looks on seeds 1, 13 and 14) |
| "Six delves", about 15.6–29.6 min | 16/16 | temperament packages + their reveal |
| The first Legacy offer | 12/16 | arrives in the same look as "six delves" or "first stray" |
| A worker lit (Scout, Porter or Drillmaster) | 13/16 | arrives in the same look as a plot, a package or a level |

The longest gaps fall between the Porter or the Forge (8–15 min) and "six delves" or "first stray" (19–29 min).

**Candidate content fixes. Not tuned in this task; the lead decides.**

1. **Stagger the first return.** Make the stance's L2 cost what two runs earn, not one. The chest and "first gold
   home" stay together, since the chest is how the first gold reaches home. This removes one unit on 16/16 seeds.
2. **Split "four delves".** Open the Forge plot at four delves and leave its system reveal as is. Have the Kennel
   plot wait for its own pet. It already needs a tame, but that tame sometimes lands in the same look (seeds 1, 13
   and 14). Defer the package the forecast offers in that look to the next look.
3. **Move the Legacy offer off the reveals.** Show the first affordable Legacy offer at the first death or the first
   boss instead. The first death comes at a median 40 min, and the first boss at 37.5 min.
4. **Fill the 12–22 min hole with one beat.** For example, price the Drillmaster so PICKED hires him near 12–16
   min (he is lit at 4–6 min but paid only at about 20–22 min). Or move temperaments to five delves. Either puts a
   beat near 16–18 min.
5. **One package at a time.** Arrive temperaments one per look (4–6 arrive at once today) so packages spread across
   the 20–40 min window.

Fixes 1–3 address the decision bar. Fixes 4–5 address the gap. Every fix touches `systems::SYSTEMS` triggers,
`town::triggered`, `packages` arrival or `tree::NODES` prices. Each needs the `scout`, `porter`, `picked-idle`,
`idle-d8`, `idle-delta` and `picked-stages` rows at 16 seeds. The decision bar of ≤ 1 may be stricter than the
owner intends for a reveal and its own offer. If the lead accepts the merged ("coupled") count, the bar still
fails (worst 5), so fixes 1–3 are needed either way.

## 6b. Proposals re-ranked against the measured timeline

§5's original order is kept above. This ranking weighs the gaps that §6 measured.

1. **§5 #4: the unlock cadence. Was 4th; now the top.** It is the one row that fails, and on every seed (decisions
   ≤ 1: 0/16; gap ≤ 6 min: 8/16). The fixes are small content moves (§6a 1–5). The row is cheap (62 s for 16 seeds)
   and ready to gate.
2. **§5 #6: a second delegate on day 1–2. Was 6th; now 2nd.** PICKED runs out of new content at about day 2: every
   worker hired by 2.0 d, D33 and the King's first try at 2.0 d. After that only ranks arrive. A second bloodline is
   affordable at 13.6 min ($250, every seed) but nothing points the player at it. IdleOn's second character answers
   exactly this.
   - Measure: a DAILY/PICKED bot that founds slot 2 when affordable, with "PICKED major-beat gap, days 2–7 ≤ 24 h"
     (now 48 h).
3. **§5 #10: the first reset-like payoff. Was 10th; now 3rd.** Legacy is affordable at 22.8 min, yet no default bot
   spends any by day 14, and there are no reclones. The comparables' first reset lands at 30 min to a few hours.
   - Change: a default Legacy order (or a one-tap "spend" beat at the first death) that lands on day 1, with
     Pecorella's +50–200% preview.
4. **§5 #5: feats for later rungs. Unchanged at 4th–5th.** The count triggers are not slow for PICKED (all hires by
   day 2). The case for feats is now about adding beats on days 1–2, not speed: a feat lights a worker on a
   memorable run instead of a check-in.
5. **§5 #7: the away forecast names the stall. Unchanged.** IDLE first sees D18 at a median 44 h, and AWAY reaches
   D33 at day 9. Naming the wall before an absence still matters most to these players.
6. **§5 #8: faster replays after a death. Was 8th; lower.** The first death comes at 40.6 min (PICKED) and recovery
   is 60 s through D14 since Cut230, so early deaths cost little. Deep deaths (20 min from D28) remain, and the King
   guard holds there on purpose.
7. **§5 #9: the "never sold" audit. Low.** Every worker is hired by gold PICKED has by day 2. The open question is
   IDLE, which never hires past the Porter and the Scout; that is the bot's rule, not a price.
8. **§5 #2: a pre-Scout absence pays. Was 2nd; now low.** The Scout comes at 5.2 min (worst 7.5), so a pre-Scout
   absence is a window of a few minutes. It costs little to build but buys little.
9. **§5 #1 and #3. Done (Cut230), measured at par:** the Scout at 5.2 / 7.5 min, the Porter at 9.1 / 11.2 min, and
   60 s recovery through D14. One residual: the Porter's §5 aim of ≤ 5 min is not met (it is 9.1 min, and the row's
   bar is ≤ 12 min).
10. **§5 #11: the offline rationale line. A doc change; unchanged.**

## 6c. Whole-package grades (2026-10-15)

14 of these games are graded on all 13 package dimensions (art through access) beside Idlever, in
[PACKAGE_GRADES_2026-10.md](PACKAGE_GRADES_2026-10.md). The summary is in
[PACKAGE_REPORT_2026-10.md](PACKAGE_REPORT_2026-10.md). The long-arc pacing gap measured in §6 is the
one load-bearing gate Idlever fails there.

## 7. Gaps

- There are no Reddit quotes; every Reddit route was blocked.
- The GDC talk recordings and the "Math of Idle Games" text were not readable.
- Wall-clock times are estimates for Trimps' first portal, AD's casual first
  Infinity, Melvor's Auto Eat, the Idle Champions Modron and the Clicker Heroes
  ascension. No sourced timings were found for Lootun, Dark Hunting Ground,
  Kittens Game or Gnorp automation.
- Not found: the IdleOn base offline cap, the NGU official offline cap, and
  AdCap's offline rules.
