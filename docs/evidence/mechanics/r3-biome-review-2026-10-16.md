# R3 — Biome encounter variety: source-and-evidence review

**Read-only.** Nothing was edited, no simulation, gate, replay, cargo build or browser run was
performed. Every claim below carries a `path:line` citation, or is explicitly labelled
`[U]` = unknown/unsettled, or `[I]` = inference from cited source (not observed output).

Sources read: `docs/QUEUE_ACCEPTANCE.md`, `docs/WORK_QUEUE.md`, `docs/CUT136_ENCOUNTER_CONTRAST.md`,
`PLAN.md`, `docs/evidence/handoff-content/{README.md, six-scenes.json, remaining-requirements.json,
current-camp-replay-availability.json, run131-summary.json, catalogue.py, replay.mjs,
departure-readiness.mjs, current-preparation-inventory.json}`, one `.record.json.gz` in full,
`docs/evidence/cut162/camps/` (file list), and the core sources named below.

---

## 1. What "R3 done" concretely means (contract map)

| Source | Line | Requirement |
|---|---|---|
| `docs/QUEUE_ACCEPTANCE.md` | R3 row | "Causal counter superiority, six legal paired compositions and broader balance remain missing" |
| `docs/WORK_QUEUE.md` | 456 | "author two contrasting encounter compositions in each of three biomes, using existing enemies first. Each composition must reward a different existing package or positioning response" |
| `docs/WORK_QUEUE.md` | 457 | "Fixed-seed before/after replay catalogue; identify the actual tactical counter for each composition… No statistically unsupported claim of six balanced encounters" |
| `docs/CUT136_ENCOUNTER_CONTRAST.md` | 11–15, 21, 23–26 | Six scenes, per-scene "current configuration and two legal alternatives" = 18 cases; "Keep gear, Legacy, party size, elapsed time and randomness matched" |
| `docs/CUT136_ENCOUNTER_CONTRAST.md` | 36–42 | Placement catalogue seeds 1–12 across every valid route; determinism hashes; whole/sliced/reloaded parity; visual evidence; iteration gates |
| `docs/CUT136_ENCOUNTER_CONTRAST.md` | 34 | "**add the formation-selection rate and tactical success thresholds to this contract**… Those are currently unset; no implementation can be accepted without them" |
| `docs/evidence/handoff-content/remaining-requirements.json` | items 1–5 | Six current earned departure states; 18 legal causal forks; distinct Foundry responses; formation scope decision; unchanged mechanical acceptance |
| `PLAN.md` | 232–233, 238, 284–286 | Intent: biomes every five floors with "program-breaking traits" (reflects magic, steals gear, gas-rich); "hazards that hit both sides"; the five-line counters table "ranged beats heavy, pack beats lone, gas beats pack, water beats fire, undead ignores poison" |

So R3 is **not** "more monsters": the generators, situations and rosters are delivered
(`docs/WORK_QUEUE.md:461`). R3 is **proof that a named preparation choice causally beats a named
encounter**, on paired identical states, plus then thresholds for any new formation.

---

## 2. Inventory: every encounter mechanic that exists today

### 2.1 Overlay hazards

| Mechanic | Producer (who/what) | Trigger | Effect (numbers) | Counter (where) | Dead? |
|---|---|---|---|---|---|
| Gas cloud | `tiles.rs:33-37` (`OverlayKind::Gas`) | — | — | — | live |
| " | any `gas`-tagged monster death: `bloat` (`defs.rs:25`), `bloat_mother` (`defs.rs:38`) — `turn.rs:2362-2365`: boss r2/ttl60, lock r1/ttl20, else r1/ttl40 | monster dies | cloud tiles | see counters | live |
| " | lock bloat self-burst `situations.rs:549-551` + adjacent `Src::Burst` 3 dmg and `gas_dmg_floor += 3` `turn.rs:2369-2374` | bloat beside hero, `LOCK_FUSE=10` ticks after it swells (`situations.rs:39,538-563`) | 3 dmg once + cloud r1/ttl20 | step back / ranged (`gas_step`) | live |
| " | Bloat Mother vents on **every melee hit she takes** `turn.rs:2217-2222` | hero melee (`Src::Hero{ranged:false}`) | r2/ttl30 cloud | range/throw (`facts.rs:111` counter row) | live |
| " | Bloat Mother `Pending::Swell` `ai.rs:3404-3405` | sees hero at full hp, cd 80 `ai.rs:3740-3743` | r1/ttl50 cloud | read telegraph, disengage | live |
| " | caustic potion, drunk `ai.rs:2022-2025` or thrown `ai.rs:2352-2353` | hero action | r1/ttl30 (throw: `40*boost/100`) | — (player's own) | live |
| Gas damage | `tick_overlays` `turn.rs:2404-2418` | hero stands on a gas tile, every `TICKS_PER_TURN`=10 | **3 dmg `Src::Gas`** (`turn.rs:2409`) | `escape_hazard` (free AI, `ai.rs:250-289`), `gas_step` (`ai.rs:2571-2597`), `clear_lungs` −2 (`turn.rs:1866`), `iron_lungs` synergy −2 (`turn.rs:1767-1770`, `packages.rs:1459`), `frostmantle` −2 min1 (`turn.rs:1870-1874`) | live |
| Gas immunity | `turn.rs:2423-2428` | monster with `gas` tag on a gas tile | immune; Bloat Mother **heals +3** | — | live |
| Fire overlay | Caster `nova` (`ai.rs:1352-1359`, 5 dmg at once `ai.rs:1368`), fire potion drunk `ai.rs:2032-2034` / thrown `ai.rs:2364-2365` | player action only | r1/ttl20 | `fireward` (halved, `turn.rs:1867`), `resist_fire` (0 dmg, `turn.rs:1863`), water tile (immune, `turn.rs:1678-1689`) | live |
| Fire damage | `turn.rs:2410` | hero on a fire tile | **5 dmg `Src::Fire`** | as above | live |
| Fire spread | `turn.rs:2429-2439` | once per spreading overlay | copies to adjacent floor, ttl ≥10 | — | live |
| Poison (hero DoT) | potions only (`ai.rs:2019` drink, `ai.rs:2347` throw); `tick_poison` `turn.rs:2475-2484` | — | `Src::Poison` per 10 ticks | `drink heal` clears poison (`ai.rs:1999`), `clear_lungs` −2, frostmantle −2 | live |
| Chasm | placed `gen.rs:273` | — | **impassable only** (`tiles.rs:22-25`); no fall, no damage | — | **decorative** |
| Water | `gen.rs` cave/room water; `Tile::Water` | eels act only on water (`ai.rs:3680-3686`) | fire source does **0** to a defender on water (`defs.rs:357`, `turn.rs:1678-1689`); hero pathing avoids water (`ai.rs:81`) | fight at range; never throw fire at a wet eel | live |

`Src` has **no `Drain` variant** (`turn.rs:1620-1635`); drain is a `max_hp` effect, not a damage source.

### 2.2 `max_hp` reduction (the "drain" the ledger names)

| Who | Where | Trigger | Effect | Counter |
|---|---|---|---|---|
| `wraith` (tag `drain`, `defs.rs:30`) | `ai.rs:3270-3276` | any landed wraith hit | `max_hp −= 1` (floor 5), `Ev::MaxHp cause "drain"` | **none exists** for wraiths/Lich (`turn.rs`/`ai.rs` have no drain-side mitigation) |
| `lich` (`defs.rs:39`) | `ai.rs:3757-3763` | each adjacent attack | `max_hp −= 1` (floor 5), cause `"drain"` | none |
| Crypt hunger floor | `situations.rs:572-601`, `HUNGER_TURNS=12` (`situations.rs:39`) | unlit hunger floor, every 12 turns | `max_hp −= 1` (floor 5), cause `"hunger"` | lit shrine or **a lantern in the pack** (`lit()` `situations.rs:379-381`), `pray` → `light_shrine` (`situations.rs:603-615`), or a ration (÷4 bite rate, `situations.rs:583-585`, `feats.rs:46`) |
| Recovery | `turn.rs:2870-2875` | floor change | `max_hp += 5`, capped at `max_hp_base`, cause `"recovery"` | — |

### 2.3 Monster mechanics

| Mechanic | Producer / tag | Trigger | Effect (numbers) | Player counter (where) | Dead? |
|---|---|---|---|---|---|
| Melee reflection | `reflect_melee`: `iron_golem` (`defs.rs:41`), `warden` (`defs.rs:53`), `foundry_master` (`defs.rs:61`) | hero/ally melee lands | `back = ((dmg+2)/3).max(1)` returned (`turn.rs:2094-2124`), hero-side only if `cheb ≤ 2` (`turn.rs:2096`); remainder still lands | `reflect_read` card (`ai.rs:2845-2910`, rows `meta.rs:443`); bow swap (`ai.rs:2866-2872`) | live |
| Ranged reflection | `reflect`: `lich`, warden arrow face | hero shoots/bolts/throws | arrow returns as `Ev::Attack{verb:"reflect"}` + `Src::Reflect` (`ai.rs:1771-1780`, `ai.rs:1280-1282`) | same card; iron golem has **no** `reflect`, so arrows land | live |
| Warden flip | `warden` | `Pending::Flip`, cd 40 | `reflects_melee()` ⇄ `reflects_ranged()` (`monster.rs:286-293`) | shoot the blade face / melee the arrow face | live |
| Mirror-verb | `mirror_king` | third repeat of a verb (2 if `tight_mirror`) `ai.rs:991-993` | third of a kind returned + he heals it back | `cadence` card (`meta.rs:441`) | live |
| Summon (conjurer) | `goblin_conjurer` (`defs.rs:22`) | sees hero, cd 150 | 2 `spectral_blade` (hp 3) **spawned around the hero**, ttl 60 (`ai.rs:3647-3655`) | kill the 3-hp blades / `tag:summoned` selector | live |
| Summon (Lich) | `lich` | `Pending::Chant`, cd 60 while summons stand else 100 | 2 skeletons hp 4/def 0 (`ai.rs:3410-3423`) | melee summons first; `boss_focus` row `summoned → attack tag:summoned` (`meta.rs:439`) | live |
| Summon (Warlord/Captain) | `goblin_warlord`, `goblin_captain` | `Pending::Rally`; break at half hp clears goblin buffs `ai.rs:3523-3545` | 2 (captain 1) goblins + `warlord_buff` | `boss_focus` | live |
| Summon (Queen) | `lurker_queen` | any noise heard within 12 tiles (`turn.rs:2567-2574`) | 2 lurkers, ttl 150, bite +`BROOD_BITE` (2), `QUEEN_PACK=8` | silence scroll / `noise_discipline` / `read silence` | live |
| Alarm bell | `bell_sentinel` (`defs.rs:43`) | sees hero, cd **200** | `alert += 2` (cap 8), callout `"bell!"`, `noise(mp, 40)` (`ai.rs:3784-3792`) | **none** — no card/row reads `alarm`; the fact is learned only (`ai.rs:3790`) | **fact decorative** |
| Support armour | `smith` (`defs.rs:45`) | sees hero, cd 30 | `+3 def / 30 ticks` to every hostile within vision 7, self included (`ai.rs:3811-3815`, `buff_allies` `ai.rs:3484-3499`) | kill the smith first (`attack tag:buffer` is expressible, `probes.rs:111`; **no card**) | live |
| Self-armour | `foundry_master` | hurt, cd 40 | `+2 def / 40 ticks` (`ai.rs:3914-3922`) | `reflect_read` is his counter row (`facts.rs:113`) | live |
| Warlord shields | `goblin_warlord` | sees hero, cd 30 | goblins within 7 gain `buff_def=(1,30)` (`ai.rs:3502-3515`) | break him at half hp | live |
| Fast pack | `jackal`, `ghoul` (`defs.rs:19,29`) | same kind ≥2 within 6, or hero <50% hp (`ai.rs:3557-3561`) | **decides chase only** — no damage bonus vs the hero | `pack_break` (`meta.rs:434`), `corridor_fighting` (`meta.rs:430`) | see §2.6 |
| Flank verb (`pack`) | companions only | target adjacent to hero | ×1.5 damage (`ai.rs:4312-4325`) | player-side only | live (ally-side) |
| Splitter | `pink_jelly`; `echo` on ranged hits | damage lands leaving hp > 4 | halves into a child (`turn.rs:2236-2252`) | land a blow leaving ≤4 hp, or fight where no tile is free | live |
| Thief | `monkey`, `forge_imp` (potion-only), den thieves | landed hit, once per run | steals an item, flees (`ai.rs:3227-3263`), `Ev::Steal` | `thief_guard` (`meta.rs:438`) | live |
| Heavy blow | `ogre`, `slag_crawler` | `mult > 1` attack | ×2 roll, learns `heavy` (`ai.rs:3278-3280`) | ranged ×1.5 (`defs.rs:354`); `last_stand` is gated on the fact | live |
| Ranged archer | `goblin_archer` | `Pending::Shoot`, 2..=6 tiles, no cooldown | telegraph then shot (`ai.rs:3373-3382`) | `kite_archers` (`meta.rs:431`); melee in a corridor | live |
| Gaze stun | `sentinel` (`defs.rs:56`) | `Pending::Gaze`, ≤2 tiles + LOS, cd 60 | `paralysed = 12` (`ai.rs:3425-3436`) | step out of 2 tiles/LOS; Rogue `vanish` | live |
| Paralyse | `ghoul` (`defs.rs:29`) | landed hit, 20% (`ai.rs:3266-3270`) | `paralysed = 12` | none direct | live |
| Water lock | `eel`, `deep_eel` | acts only on water (`ai.rs:3680-3686`) | water-only pathing | fire is worthless on water; fight at range | live |

### 2.4 Situations / twists (the actual "encounter compositions")

`TWISTS` = den, lock, captive, nest, shrine, vault, stray, hunger (`situations.rs:60`). One per floor,
never the previous floor's kind, never the flagship twice (`situations.rs:166-215`).

| Twist | Placement | Mechanic | Stated pass | Counter |
|---|---|---|---|---|
| den | `situations.rs` module doc §D3; `place_den` | 3 sleeping monkeys round the down stairs; each snatches an item and bolts on being reached (`snatch` `situations.rs:500-528`); a blow on a sleeper makes it flee empty-handed (`raided` `situations.rs:531-540`) | leave with everything (`situations.rs:645-648`) | `on_see: den → attack nearest` (thief_guard) |
| lock | `place_lock` | bloats in the stairs-room doors; swell then burst (`situations.rs:538-563`) | `gas_dmg_floor ≤ LOCK_PASS_GAS = 6` (`situations.rs:37,649-652`) | `foe_tag gas, adj≥1 → retreat` (gas_step) |
| captive | `place_captive` `situations.rs:325` | captive chained on the stairs; no swapping past | freed (ally) or cut | `free_captive` / `attack nearest` |
| hunger | `place_hunger` `situations.rs:334-359`: 1 Shrine + 3 wraiths | max hp bite, wraiths hunt | leave lit | `on_see: shrine → pray`, or a lantern |
| nest | `wake_nest` `turn.rs:3077-3102` | a sleepless-down nest wakes when the hero is within **2 tiles** and wakes the whole nest | — | `on_see: nest → attack` raid; don't close to 2 |
| shrine | `Tile::Shrine` + `verb_pray` `ai.rs:971-987` | `pray` is free | — | — |
| vault (shown as "cache") | `Tile::Vault`, 3 under a cage (`situations.rs:779`) | one-of-three choice, watch-only | — | — |
| stray | `stray_due_depths` `situations.rs:148-160` | a named loser returns | — | — |

Band pools are fixed and biome-scoped (`situations.rs:85-126`): **Fens** `FENS_POOL` excludes
`lock` (caves have no stairs-room doors, `situations.rs:87`); Crypt `CRYPT_POOL`; Foundry and
Sanctum `ROOMS_POOL`; Deep `DEEP_POOL`. Historical Foundry `lock` records are source drift
(`docs/evidence/handoff-content/README.md`, "Delivered current systems" §).

### 2.5 Player-side counters that exist in the rules

| Counter | Kind / gate | Exact effect | Mechanic answered | Citation |
|---|---|---|---|---|
| `gas_step` | tactic, **oath** (`meta.rs:98`, `oath.rs:63`), gate `fact: gas` | shoot tag:gas / retreat <60% / attack / hold | gas | rows `meta.rs:433`, runtime `ai.rs:2571-2597` |
| `pack_break` | tactic, ◆4 T2, gate `fact: fast` | back_corridor, attack lowest, hold | fast packs | `meta.rs:434`, `ai.rs:2610-2660` |
| `corridor_fighting` | tactic, ◆4 T2, gate `fact: pack` | back_corridor, hold in corridors | packs / corridors | `meta.rs:430` |
| `reflect_read` | tactic, ◆5 T4, gate `fact: reflect_melee` | shoot reflectors, throw at boss, never melee | melee reflection | `meta.rs:443`, `ai.rs:2845-2910` |
| `boss_focus` | tactic, ◆4 T3, gate `fact: boss` | attack tag:boss; `boss,gas → throw fire`; `summoned → attack tag:summoned` | bosses + summons | `meta.rs:439` |
| `kite_archers` | tactic, **free** T0, gate `fact: ranged` | retreat then attack tag:ranged | archers | `meta.rs:431` |
| `thief_guard` | tactic, ◆4 T2 | den raid, tag:thief attacks | thieves | `meta.rs:438` |
| `noise_discipline` | "quiet steps", free T0 | rest only when no blinder lives; else move | noise/alert | `meta.rs:442`, `ai.rs:2833-2840` |
| `last_stand` | oath T4, gate `fact: heavy` | heal/second wind/lowest | heavy at low hp | `meta.rs:440` |
| `cadence` | ◆5 T5 | rhythm vs the Mirror King | mirror-verb | `meta.rs:441` |
| `clear_lungs` | Legacy node D8 (Warding) | gas & poison −2 | gas/poison | `legacy.rs:72`, `turn.rs:1866` |
| `fireward` | Legacy D18 | fire halved | fire | `legacy.rs:77`, `turn.rs:1867` |
| `brace` | Legacy D18 | below 25% hp: −2 | all | `legacy.rs:78`, `turn.rs:1868` |
| `iron_lungs` | synergy (`iron_gut`+`gas_step`) | gas/poison −2 | gas | `packages.rs:1459`, `turn.rs:1767-1770` |
| `frostmantle` | legendary (from the Lich) | Gas/Poison/Burst −2 **min 1**; +1 melee taken | gas/poison | `legendary.rs:15`, `turn.rs:1870-1874` |
| Hearthglass 2/3-set | armour set | kill-heal; 3 pieces → ward up to 4 | attrition/bursts | `armour_sets.rs:112-114`, `turn.rs:1896-1898` |
| lantern / lit shrine | item / `pray` | stops the hunger bite | hunger | `situations.rs:379-381`, `603-615` |
| ration (`fed`) | town feat | hunger bites ÷4 | hunger | `situations.rs:583-585`, `feats.rs:46` |
| `escape_hazard` / `in_hazard` | **free AI, always on** | step out of gas/fire | overlays | `ai.rs:214-289` |

**Note.** `metal`/letter of the ledger: `iron_gut` is an *unknown-potion temperament*
(`packages.rs:97,132`), not a gas counter; its `iron_lungs` synergy is the gas arm
(`packages.rs:1459`). `CUT136_ENCOUNTER_CONTRAST.md:17` says exactly this.

### 2.6 Decorative / dead / unreachable

| Item | Finding | Citation |
|---|---|---|
| `alarm` fact | learned on the bell but **no card, row or AI branch reads it** | `ai.rs:3789-3792` (only `learn_tag`) |
| `COUNTERS ("pack","lone")` | **can never fire against the hero**: `is_lone` returns false at the hero's tile | `defs.rs:355`, `turn.rs:1661-1664` |
| `heavy` tag | no AI branch; only `learn_tag`, the counter table and `last_stand`'s gate | `ai.rs:3278-3280`, `defs.rs:354` |
| `mirror` tag on `mirror_shade` | does **not** reflect (`mirror_reflects` requires `kind=="mirror_king"`); cosmetic | `defs.rs:51`, `ai.rs:991-993` |
| `Pending::Call` | has no setter in `ai.rs`; set only by `turn::noise` | `turn.rs:2567-2574` |
| `stair_dance`, `last_stand` | **absent from `packages::PACKAGES`** → cannot be worn in a tactic slot; pen/card rows only | `packages.rs:76-94`, `meta.rs:432,440` |
| `meta.rs:182` comment | says "four mastery cards"; `MASTERY_CARDS` has five | `meta.rs:182` vs `184` |
| `skeleton_sentinel` | does not exist in `MONSTERS`; the bell is `bell_sentinel`, the gaze is `sentinel` | `defs.rs:19-68` |
| `caustic` / `burn` | not tags or overlay kinds; a potion name and a trace synonym for gas/fire only | `defs.rs:297`, `ai.rs:2353`, `trace.rs:248-249` |
| `Pending::Flip` | learns `reflect_melee` **and** `reflect` at once regardless of face, and resolves the same turn | `ai.rs:3438-3445` |
| Chasm | impassable decoration; no fall/damage logic | `tiles.rs:25`, `gen.rs:273` |

---

## 3. Distinctness: what each of the six recorded checkpoints demonstrates

All numbers below are from `docs/evidence/handoff-content/six-scenes.json` (per-scene
`actual_trace`, `actual_trace_blows`, checkpoint fields) and `README.md`'s case table.

| Scene | Source camp / run | Biome, depth | Checkpoint → death | Recorded blows (cause) | What it *demonstrates* |
|---|---|---|---|---|---|
| F1 gas | `AWAY-nodes-s1-d3-c0`, run 79 | Fens D13, 0 rooms, 124 water | t14350 → t14427, 9/15 hp | gas ×12 | A **standing cloud** threat: gas ticks 3 every 10 ticks (t14300 hp12, t14310 hp9, t14320 hp6…), `bank` fires, `drink heal` fires, hero dies cause `gas` (`death.trace.blow` t14440 gas 3 → hp0). Bloat Mother telegraph `mother swells` at t14341. |
| F2 water-pack | `AWAY-nodes-s2-d3-c0`, run 84 | Fens D13, 0 rooms, 36 water | t5580 → t5650, 21/39 hp | eel ×4, jackal ×2 | A **fast melee pack + water**: two eel-5 blows land in the same tick window (t5634: hp11, hp6), then jackal 1s; the set's `attack nearest` never retreats; Mother already dead t5320. Death cause `eel`. |
| C1 drain | `AWAY-nodes-s2-d5-c0`, run 167 | Crypt D18, 22 rooms, 94 doors, 1 chasm | t15800 → t15868, 10/10 hp | wraith ×5, skeleton ×3, lich ×3, spectral_blade ×1 | **`max_hp` attrition**: 16 → 5 across ten actions, each `−1` with cause `drain` (wraith bites t15751/15768/15776/15834/15851; Lich t15801/15818/15834). Nothing in the recorded set addresses it: the set fires `attack tag:summoned` and `drink heal`. |
| C2 summoned-pack | `AWAY-nodes-s1-d3-c0`, run 92 | Crypt D18, 12 rooms | t24740 → t24816, 16/29 hp | skeleton ×18, lich ×2 | **The boss dies and the summons still win**: Lich slain t24738, then 18 skeleton blows end the run at t24819; t24816 `attack nearest` at 2 hp. This is the only scene whose killer is not the named threat's own body. |
| W1 reflector | `AWAY-nodes-s1-d4-c0`, run 102 | Foundry D20, 12 rooms | t25620 → t25804, 19/33 hp | iron_golem ×4, forge_imp ×1 | **Melee against a reflector**: the set continues `attack nearest` while `foes` climbs 3→6 (t25691→t25766); golem blows 4/3/1/2 land t25754–t25791. One golem and one imp carry `buff_def=[3,8]`. |
| W2 support-candidate | `AWAY-nodes-s1-d4-c0`, run 118 | Foundry D23, 13 rooms | t32400 → t32546, 24/44 hp | slag_crawler ×3, foundry_master ×1 | **Sustained focus under support**: 7 smiths + Master carry `armour3` with 20 ticks left at the checkpoint; `crawler heaves` telegraphs repeat; `master hammers` t32546; death cause `foundry_master`. |

### Duplicate analysis

* **F1 vs F2 — genuinely different.** Cloud ticking vs fast-pack burst; different counters
  (`gas_step` vs `pack_break`) and different counter *doors* (the lock/`gas` fact vs the `fast` fact).
* **C1 vs C2 — partially duplicated.** Both are Crypt D18, both are "undead melee attrition with a
  summoner", both die to blow-load rather than to a hazard. C1 is unique only in the `max_hp` arm
  (16→5, cause `drain`); C2 is unique only in "the boss died and the pack still won".
  **Neither demonstrates a distinct *counter***: both recorded sets fire the same two rows
  (`attack tag:summoned`, `attack nearest`).
* **W1 vs W2 — duplicated as evidence, distinct as hypotheses.** Both are Foundry, both are a
  sword-Fighter dying to accumulated blows from a formation containing a `reflect_melee` or
  `buffer` unit; both recorded sets fire `attack nearest`. The ledger's distinguishing events are
  **not present in the records**: W1 retains no `reflect`-verb event, W2 retains no `armours` and
  no `bell!` (`README.md`, W1/W2 rows: "golem-attributed damage does not distinguish ordinary blows
  from reflection"; "no retained 'armours' or sentinel 'bell!' event").
  `[I]` W1's `iron_golem` blows of **1 and 2** (t25779, t25791) are below the golem's minimum
  attack roll of 3 (`defs.rs:41`), but `Hero::blunt` can reduce a 3 to 1 (`ai.rs:3210-3211`), so
  they cannot be attributed to reflection from the retained trace either. **Unprovable here.**
* **Same-source duplication.** F1 and C2 come from **the same camp file**
  (`AWAY-nodes-s1-d3-c0.json.gz`, sha `f8218260…`) and W1/W2 from the same file
  (`AWAY-nodes-s1-d4-c0.json.gz`, sha `66c8be90…`) — i.e. two of the six "scenes" are pairs of runs
  from two saves, not six independent earning states.

**Verdict:** the six checkpoints span **four distinct demonstrated axes** — overlay gas (F1),
fast pack on water (F2), `max_hp` drain (C1), and boss-death-with-pack (C2) — plus **two
undistinguished Foundry blow-attrition axes** (W1, W2) whose causal events were never retained.
`causal_matched_comparisons: 0` and `current_balance_claim: false` on all six.

---

## 4. Causality: what would make a counter *provably* superior

### 4.1 The paired construction (this is the only legitimate form)

The engine already guarantees the pairing: every set a lineage forecasts "plays the same dungeons
(seed × depth × sim index), so an edit's delta is a paired difference, not two draws"
(`forecast.rs:499-506`, `forecast_tag`). The measured primitive is
`forecast::paired(a, b, f) -> VsMove { base, delta, pm }` (`forecast.rs:1510`); the example-level
helper `paired(...)` and its `meaningful()` bar are `progression_lib/mod.rs:377-390`
(bank ≥ 3 pts, reach ≥ 3 pts, or mean depth ≥ 0.25 floors, each clearing its own ±).

Therefore a "provably superior counter" = **same lineage state (`sim_clone`/`clone` of one save),
same seeds (`forecast_tag`), one changed legal choice, and a measured Δ that clears its own ±**. A
comparison of two different saves, two different seeds, or two different hours is not evidence.

### 4.2 The legal choice path

* Public, no grants: `Game::equip_package(id, slot)` (`lib.rs:259`, `bloodlines.rs:103-109`) and
  `Session::equip_package`.
* Already proven legal **on the earned current camp**, with gold and clock unchanged, for exactly
  the six tactic ids this review needs: `gas_step, pack_break, corridor_fighting, reflect_read,
  boss_focus` (and the `hunter` stance) — `docs/evidence/handoff-content/departure-readiness.mjs`
  asserts `after.clock_s == before.clock_s`, `after.gold` unchanged, and writes
  `departure-readiness-e62c/package-<id>.session.json.gz`; those files are pinned with SHAs in
  `current-preparation-inventory.json`.
* Card gates are fact-based, so legality is not universal: `gas_step` needs `foe:*:gas`
  (`meta.rs:280`), `pack_break` needs `foe:*:fast` (`meta.rs:281`), `reflect_read` needs
  `foe:*:reflect_melee` (`meta.rs:291`), `boss_focus` needs `foe:*:boss` (`meta.rs:283`).
  A scene whose fact is absent cannot legally wear that counter. `CUT136_ENCOUNTER_CONTRAST.md:21`
  states the same rule ("Public controls must actually permit and afford each tested choice").

### 4.3 What is measurable today (the outcomes a claim may cite)

| Outcome | Where it lives | Granularity |
|---|---|---|
| survival / exit tier | `SimResult.tier`, `cause`, `timed_out` (`forecast.rs:51-60`) | per sim |
| depth | `SimResult.max_depth`, `arrive` (`forecast.rs:52,84`) | per sim |
| damage by cause | death trace `trace.blows` (cap 24, `BLOWS_CAP` `turn.rs:2454`) with `by`+`dmg` | last 10 actions |
| hazard-attributed floor damage | `Run.gas_dmg_floor` (`engine.rs:983`), `hunger_periods`/`hunger_lost` (`engine.rs:762-764`) | per floor / run |
| `max_hp` steps with cause | `Ev::MaxHp { cause }` (`turn.rs:1504-1509`), `Run.max_steps` | per event |
| action order + refusals | `Run.trace`/death `trace.turns` (verb, hp, foes, telegraphs, per-row `why`) | per action |
| **reflection attribution** | `Ev::Attack { verb: "reflect", src: monster_id }` (`turn.rs:2111`) | per event |
| support attribution | callout `"armours"` (`ai.rs:3496`), `buff_def` on each monster (`monster.rs`) | per event |
| alarm attribution | callout `"bell!"` (`ai.rs:3789`) | per event |
| run outcome for a whole absence | `ReturnReport { runs, deaths: Vec<DeathCount{cause,n}>, bests, reel[].arc.threat/resolution }` (`wire.rs:1476-1479, 1510-1540, 1462-1472`) | per absence |

**The one non-negotiable rule** (from `CUT136_ENCOUNTER_CONTRAST.md:26`): a proposed counter
"justified only by a label or a final aggregate number" is not evidence. Use the
`verb: "reflect"` event, the `armours` callout, `Ev::MaxHp{cause}`, or the `blows.by` list — never
the monster's name in the death summary.

### 4.4 Exact command-line forms

```
# A. legality/affordability of the six choices on the earned current camp (no sends)
node docs/evidence/handoff-content/departure-readiness.mjs

# B. paired absence outcomes: baseline + each alternative, one saved Session, same seed/town
cargo run -q --profile fast -p idlever-core --example choice_check -- \
  <SAVE.json.gz-extracted.json> <HOURS 1..336> "<id>:0,<id2>:0" <OUT.json> [UPGRADES=health,armour,damage,all]
#   writes per-case {choice, seconds, report{ReturnReport}, save}   (choice_check.rs:6-63)

# C. paired panel over seeds with a printed Δ and PASS/FAIL (closest existing paired-delta harness)
cargo run -q --profile fast -p idlever-core --example builds -- 16 24 variants
cargo run -q --profile fast -p idlever-core --example varied_descent -- --seeds 4 --sims 48 affixes

# D. single-seed, alternate-rule-set pairing (same seed ⇒ same dungeon)
cargo run -q --profile fast -p idlever-core --example cli -- --seed <N> --rules <A.json> --runs 3
cargo run -q --profile fast -p idlever-core --example cli -- --seed <N> --rules <B.json> --runs 3

# E. death-cause survey / cause entropy
cargo run --example probe -- presets/good.json 8 6 [--full]

# F. the event-stream recorder (full Ev::Attack verbs, incl. "reflect")
cargo run -q --profile fast -p idlever-core --example gunner_trace -- <SAVE> <NEW_OUT_DIR> [RUNS]
#   writes run{n}-before.json / -send.json / -events.json / -after.json   (gunner_trace.rs:1-19)

# G. verdict audit of a recorded death
cargo run -q --profile fast -p idlever-core --example death_check -- <SAVE> <ID[,ID...]>

# H. read-only reconstruction of a saved capsule (the 87de path already used)
node docs/evidence/handoff-content/replay.mjs

# I. idle/engagement bounds that R3's acceptance keeps
cargo run -q --profile fast -p idlever-core --example dayplayer -- --seeds 8 --days 14 --gate

# J. layout-variety inspection for a proposed formation's ground
cargo run -q --profile fast -p idlever-core --example floors -- <biome> <depth> <seeds>
```

There is **no single example that takes one seed, two tactic ids and prints the scene-level Δ**;
`builds.rs` is the closest paired-delta harness (both sides play the same seeds,
`builds.rs:3,158`), and `choice_check.rs` is the closest *legal same-save* runner. A new
scene-level harness (or a thin wrapper that reads `choice_check`'s JSON) is the one piece of
tooling R3 needs; it is small, not a new system. `[U]` whether that wrapper counts as "new
content" under the contract's rules — I read the contract as requiring *no new content*, only a
harness, but that is a call for the owner.

---

## 5. Proposal: six legal paired compositions, with thresholds

Each pair = **baseline (the recorded/current configuration) vs exactly one alternative that is
already proven legal in `departure-readiness.mjs`**, on one save, one seed, one outcome.

Two honest caveats stated up front:

1. **None of the six historical checkpoints can be re-run today.** Their source saves are Cut162
   camps; the records carry `package_levels_at_send: null` and `unlock_state_at_send: null`
   (`six-scenes.json`), so the send-level preparation is unknown and "no retroactive package
   equipment is permitted" (`README.md`). Each pair therefore needs a **new current earned send**
   whose descent reaches the same scene — the scene must be *re-encountered*, not replayed.
   `[U]` the probability that a single new earned camp meets each named scene in one absence; that
   is a measurement, not an assumption.
2. **Two of the six pairs need new content, and I will not invent it.** C1's wraith/Lich drain has
   **no counter in the rules at all** (no mitigation path exists anywhere in `turn.rs`/`ai.rs`),
   and the alarm bell's `alarm` fact has **no consumer**. Where the honest counter is a
   *positioning/targeting* behaviour rather than an item, I say so.

| # | Scene | Threat (mechanic) | Counter (legal choice) | Fixed seed/pair | One outcome measured | Proposed pass threshold |
|---|---|---|---|---|---|---|
| P1 | F1 gas (Fens D13, cloud) | gas overlay 3/10 ticks + Mother vent on melee | `gas_step`:0 vs baseline | camp `AWAY-nodes-s1-d3-c0`-equivalent **new** earned send; pair = same save, baseline vs `package-gas_step.session.json.gz`; seeds 1–16 | share of panel runs whose `cause == "gas"`, plus mean `max_depth` | counter reduces the `gas`-cause share by **≥ 10 points** and mean depth Δ **≥ 0** (never worse); scene trace must show ≥1 `Ev::Overlay{ov:Gas}` and a `retreat`/`shoot` where the baseline fired `attack tag:boss` |
| P2 | F2 water-pack (Fens D13) | two eel blows in one tick + jackals (`fast`) | `pack_break`:0 vs baseline | same camp family `AWAY-nodes-s2-d3-c0`; seeds 1–16 | share of runs whose `cause ∈ {eel, jackal}` + mean depth | eel/jackal-cause share **≥ 10 points lower**; **no** increase in `timed_out` share (`SimResult.timed_out`, `forecast.rs:60`) — a hold-forever set is not a win |
| P3 | C1 drain (Crypt D18) | wraith/Lich `max_hp −1` per landed blow | **`boss_focus`:0** (target priority) — *not* a drain counter | camp `AWAY-nodes-s2-d5-c0`; seeds 1–16 | total `−max_hp` steps with `cause ∈ {drain, hunger}` per run (`Ev::MaxHp`) | counter shows **≥ 25 % fewer** drain steps **and** ≥ 0 depth Δ; **explicitly do not claim lantern/pray immunity to wraiths** — `lit()` gates only the hunger (`situations.rs:379-381,575`) |
| P4 | C2 summoned pack (Crypt D18) | Lich chant → 2 skeletons hp4, boss dies first | `boss_focus`:0 (its `summoned → attack tag:summoned` row) vs baseline | camp `AWAY-nodes-s1-d3-c0`; seeds 1–16 | share of runs whose `cause == "skeleton"` after a Lich kill (`reel[].arc.threat`/resolution) | skeleton-cause share **≥ 10 points lower**, and the trace shows ≥1 `attack tag:summoned` before the Lich's death |
| P5 | W1 reflector (Foundry D20) | `reflect_melee` returns `((dmg+2)/3).max(1)` | `reflect_read`:0 vs baseline | camp `AWAY-nodes-s1-d4-c0`; seeds 1–16 | **count of `Ev::Attack{verb:"reflect"}` events targeting the hero** (event stream, not the summary) + `cause == "iron_golem"` share | reflect events **≥ 30 % fewer** and iron_golem-cause share ≥ 10 points lower, with the bow/thrown arm actually visible (`provenance` "bow up", `ai.rs:2866-2872`) |
| P6 | W2 support (Foundry D23) | smith `+3/30` to every hostile in vision; Master `+2/40` | `corridor_fighting`:0 vs baseline | camp `AWAY-nodes-s1-d4-c0`; seeds 1–16 | `foes≥2` handling: share of `bank`/`return` exits + blows taken per action while `foes ≥ 5` | counter reduces blows-taken-per-action by **≥ 15 %** **or** raises survival share by ≥ 10 points; must not reduce `runs` (no oxymoronic "safer by idling") |

**Global threshold that must accompany all six** (from `CUT136_ENCOUNTER_CONTRAST.md:34` and
`WORK_QUEUE.md:457`): no single choice may win all six (each pair must show a loser somewhere),
and every threshold above is *provisional* until the baseline is measured
(`CUT136_ENCOUNTER_CONTRAST.md` requires the formation-selection rate and tactical success
thresholds to be pinned from baseline measurements before any implementation).

**What each pairing cannot be expressed as today** (no invention permitted):

* P3: there is **no drain counter**. The composition must either (a) be rescoped to the hunger arm
  as the primary outcome with wraiths as the uncontrolled threat, or (b) wait for a new ruling
  (a lantern that actually stops wraith drain). Do not dress `lantern_rig` (+2 vision,
  `meta.rs:454`) up as a drain answer.
* P6: the intended counter is "kill the buffer". `attack tag:buffer` is expressible in the pen
  (`probes.rs:111`) but **no card carries it** and no `foe_tag buffer` answer exists in the card
  tables (`meta.rs:423-444`), so P6 can only test *positional* responses today. A `buffer` answer
  card would be new content — say so explicitly rather than smuggling it in.
* The alarm bell has **no counter to test at all**; it must not appear as the mechanic of any pair
  until something consumes `alarm`.

---

## 6. Unknowns: what the preserved evidence cannot settle

1. **The ticks mismatch.** Run 131: historical `run_log` `turns = 33697` vs reconstructed
   `replay.ticks = 30689`, `ticksMatchRecorded: false` (`run131-summary.json`). Historical
   bit-identity is not claimed. What that reconstruction therefore cannot prove: that any event it
   shows happened in the original fight, or in the same order.
2. **Send-level preparation of the six scenes is unknowable.** `package_levels_at_send: null`,
   `unlock_state_at_send: null` on all six; the final-camp package is later state
   (`six-scenes.json`). Without it, "the counter would have won" cannot be computed for the
   historical sends — only for a new earned send.
3. **No per-tick positions in the records.** `death.trace.turns` holds `{t,row,verb,hp,foes,
   telegraphs}` with no coordinates; positions survive only at the `t10` checkpoint
   (`t10.floor.map`, `t10.monsters[].pos`, `t10.hero.pos`) and as `overlays[{x,y,k,ttl}]`. So
   "was there a corridor to retreat down", "was another clean tile adjacent", and "did the pack
   actually flank" are **not answerable** from the preserved evidence — exactly what
   `CUT136_ENCOUNTER_CONTRAST.md:23-24` asks to prove.
4. **Reflection and support attribution are absent from the records.** W1 has no `verb:"reflect"`
   event; W2 has no `armours` callout and no `bell!` (`README.md`). `death.replays` is a **count**
   (12), not retained continuations, and the per-death `patches` list is empty in F1 — the
   alternative branches were never kept.
5. **Per-tick blow records are a tail, not a history.** The scene traces are the last ~10 actions
   and the blow list caps at `BLOWS_CAP = 24` (`turn.rs:2454`); causally earlier damage in the same
   fight is simply gone.
6. **Two of six scenes share a source save** (F1/C2 and W1/W2) — so "six scenes" is four saves and
   six runs; any claim of six independent earning states is unsupported.
7. **The 24 stills are renderer review, not gameplay proof.** `capture.mjs` "no gameplay runs in
   that browser"; the stills must retain the reconstruction label and are already at t+2 of the
   *reconstructed* events (`README.md`, "Actual current-runtime capture anchors").
8. **Two live mechanics have no counter to measure**: the alarm bell (no consumer for `alarm`) and
   the sentinel's gaze stun (no card; only positional/Rogue `vanish`).
9. **Everything not observed here is `[U]`**: no run was performed in this review, so no Δ, no
   share, and no attribution in §5 is measured — all six thresholds are proposed, not estimated
   from data.

### What a new run must capture (minimum set)

For each of the six compositions, on one frozen runtime hash and one unchanged parent save:

1. The **full event stream**, not the death summary: retain `Ev::Attack{src,dst,dmg,verb}`
   (including `verb:"reflect"` and `verb:"shoot"`), `Ev::Overlay`, `Ev::MaxHp{cause}`,
   `Ev::Telegraph`, `Ev::Use`, `Ev::Hp`. `gunner_trace` already writes exactly this shape
   (`run{n}-events.json`).
2. **Per-action positions** for hero and every monster (or at least the positions at each
   `Ev::Attack`), so corridor/flank/clear-tile claims are checkable.
3. `gas_dmg_floor` at the lock, `hunger_periods`/`hunger_lost`, and the `lock`/`hunger`/`den`
   pass records (`Run.passed`) alongside the exit.
4. The **18 paired cases'** inputs: the exact `equip_package` calls, the parent SHAs before and
   after, gold/clock/Legacy unchanged assertions, the seed and the `forecast_tag` used.
5. A **baseline-measured** formation-selection rate and the tactical success threshold, pinned into
   `CUT136_ENCOUNTER_CONTRAST.md`, before any content change.
6. For any implemented formation: the placement catalogue over seeds 1–12 across every valid
   `Route::all()` route and each eligible floor of the changed biome, exact repeated-replay hashes,
   whole/sliced/reloaded parity for one and three residents including an in-flight old save, and the
   matched 400/1440 real-replay screenshots — all per `CUT136_ENCOUNTER_CONTRAST.md:36-42`.

---

### One-paragraph summary for the ledger

R3's "missing causal counter superiority" is not a content shortage: the counters `gas_step`,
`pack_break`, `corridor_fighting`, `reflect_read`, `boss_focus`, `thief_guard`, `noise_discipline`
and the Legacy/legendary hazard arms all exist and are already proven *legal and affordable* on
the current earned camp (`departure-readiness.mjs`); what is missing is a **paired measurement**.
The preserved six checkpoints can supply neither the pairing nor the attribution, because their
send-level preparation is unrecorded, their blow lists are tails without verbs or positions, and
two of the six share a source save. The concrete, bounded plan is the six pairs in §5 — each on a
new current earned send, each measured by `choice_check`/`builds` plus a full event stream from
`gunner_trace`, with the §5 thresholds — and two of the six honest answers are "no counter exists
yet" (drain, alarm), which must be recorded as gaps rather than papered over with new content.
