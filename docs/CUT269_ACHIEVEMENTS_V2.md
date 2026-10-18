# Cut269 — Achievements v2: playstyle challenges

Owner feedback (2026-10-18, verbatim): "yes achievements, pure cosmetic. don't need ? for secret honors. these
achievements seem quite boring. we need more interesting achievements that also push for different playstyles? eg,
slay the spire achievements"

This cut follows [CUT263_ACHIEVEMENTS.md](CUT263_ACHIEVEMENTS.md) (v1: 32 "Honours"). v1 mostly said *you got there*.
v2 adds achievements that say *you got there this way*: challenges and feats that are only reachable by choosing a
class, a build, a restriction or a risk.

## 0. Owner decisions applied

| Decision | What changes |
|---|---|
| Name | The player-facing name changes from "Honours" to **Achievements** in the Menu entry, the gallery title, toasts and copy. The core module and wire keep `honours` as their internal ids, because a rename would touch the save key, the wire field and every test fixture for no player-visible gain (§7). |
| Pure cosmetic | Achievements pay nothing. v1 already paid nothing: after its critique pass 2 none of its entries mirrors a trophy, and `honours.rs` writes only `LineageState::honours`. Trophies keep their own ◆ marks, as before. A Rust test now asserts the rule: earning most of the list at once leaves the lineage (marks, gold, unlocks, trophies, rule sets) unchanged apart from `honours` (G3). |
| Secrets | No `?` placeholder. An unearned secret is absent from the wire and the gallery. The header count covers the visible list only (`12/38`). Earned secrets appear in their own group, and add a separate `+2` beside the count, so nothing tells the player how many secrets exist. |

## 1. Research: how roguelikes push playstyles

Conditions are quoted from each game's Steam global achievement page, fetched 2026-10-18. That page also carries the
hidden flag. Names marked [mem] were not verified this session.

### Highlights by game

- **Slay the Spire** [S][sts-steam]:
  - Perfect: "Defeat a boss without taking any damage."
  - Shrug It Off: "Win a battle with 1 HP remaining."
  - You Are Nothing: "Defeat a boss on turn 1."
  - Minimalist: "Beat the game with a 5 card deck or smaller."
  - Who Needs Relics?: "Beat the game with a single relic."
  - Common Sense: "Beat the game with a deck containing no uncommons or rares."
  - Come At Me: "Win a combat without playing an Attack."
  - Infinity: 25 cards in a turn.
  - Barricaded: 999 Block.
  - Catalyst: 99 Poison.
  - Ninja: 10 Shivs in a turn.
  - Ooh Donut!: "Finish Donu with a Feed."
  - Ruby, Emerald, Sapphire and Amethyst: one win per character.
  - Ascend 0/10/20.
  - Boss kills and endings are hidden.
  - Not found under these names: Pyromaniac, Ironic, Who Needs Armor.
- **Hades** [S][hades-steam]:
  - Hold the Onions: "Clear an Infernal Gate without taking damage."
  - Weapon of Fate: escape with a hidden aspect.
  - Blood Bound: max an aspect.
  - Champion of Elysium: clear Elysium under a Pact condition.
  - Bad Call: "Use an Olympian's Greater Call against them in a Trial."
  - Thanks, But No Thanks: "Purge a Legendary Boon."
- **Balatro** [S][balatro-steam]:
  - You Get What You Get: "Win a run without rerolling the shop."
  - Tiny Hands (20 or fewer cards) against Big Hands (80 or more): opposites that pull in both directions.
  - Flushed: a Flush of 5 Wild Cards.
  - Shattered: break 2 Glass Cards in one hand.
  - Rule Bender / Rule Breaker: challenge runs.
  - Low / Mid / High Stakes: difficulty wins.
- **Vampire Survivors** [S][vs-steam]:
  - Victorian Horror: "Survive 30 minutes with no weapons in Inverse Green Acres."
  - Gaze of Gaea: "Defeat 0 enemies in The Coop."
  - Lama: survive with +10% Curse.
  - Torrona's Box: hold 6 evolutions at once.
  - Achievements are named after the content they unlock.
- **Into the Breach** [S][itb-steam]:
  - Each squad has exactly three achievements, usually a combo, a restriction and a clutch. Rift Walkers' Watery Grave:
    drown 3 enemies in one battle. Rusting Hulks' Perfect Battle: "Repaired damage is still damage."
  - Unwitting Allies: "Have 4 enemies die from enemy fire."
  - Engineering Dropout: finish 3 islands without a weapon modification.
  - Flight Specialist: 3 flying mechs.
- **Monster Train** [S][mt-steam]:
  - On Your Own: "Win a run without a Champion."
  - Only Determination: "Win a run without collecting any artifacts."
  - The Ragtag Bunch (10 or fewer cards) against A Cramped Train (40 or more).
  - Clan mastery: all covenants on one clan.
  - Dead-alus: kill a boss before his combat phase.
- **FTL** [S][ftl-steam]:
  - Each ship has three achievements:
    - Kestrel: Tough Little Ship, "repair back to full health when it only has 1 HP remaining."
    - Engi: I hardly lifted a finger, "destroy an enemy ship using only drones."
    - Zoltan: Manpower, "Get to sector 5 without upgrading your reactor."
  - Coming in for my Pacifism run!: sector 5 without firing.
  - Earning 2 of a ship's 3 unlocks its Type B layout ([mem], from a search snippet).

### Patterns, and what Idlever takes from each

| Pattern | Examples | Idlever form |
|---|---|---|
| Build-defining constraints | Jaxxed, Catalyst, Ninja, Retrograde, Robotic Warfare | A boss slain while wearing each named build (*Seven Builds*) or a pet synergy (*Kennel Builds*); a boss slain off the main route |
| "Do X with only Y" | I hardly lifted a finger, Come At Me, Flight Specialist, Victorian Horror | A boss slain by a pet, by fire or by a sentry; a Ranger boss kill with no melee all run; a boss slain with three rows in play |
| Self-imposed restrictions | Who Needs Relics?, Minimalist, You Get What You Get, On Your Own, Manpower | The Queen slain with no drink; the Lich with nothing packed or one tactic only; the Foundry Master slain with no companion or with the forge unbought |
| Flashy combo moments | Infinity, You Are Nothing, Ooh Donut!, Dead-alus | The killing blow itself: fire, a pet, a Clown's counter, gas |
| Near-death clutch | Shrug It Off, Tough Little Ship, Battle Royale; and the inverse, Perfect / Hold the Onions | A boss slain at ≤ 5% HP; a boss slain after a mender's revive; the Lich or deeper untouched |
| Mastery per character | StS gems, ITB/FTL triplets, Monster Train clans | One feat per class, each using that class's own verb or style, plus *Every Trade* (a band boss with each class) |
| Odd interactions | Ooh Donut!, Unwitting Allies, Bad Call | Secret achievements: a boss killed by gas, by a freed captive or by a Clown's counter; a tamed grudge |

Secondary lessons:

- **Opposites, not only abstinence.** Balatro and Monster Train pair thin with fat (Tiny/Big Hands, Ragtag/Cramped).
  Idlever pairs *Three Lines* (a tiny set) with *Seven Builds* (a wide wardrobe), and *No Way Back* (no exit rows) with
  *Teetotal* (no drinks).
- **Precise wording.** Into the Breach's "Repaired damage is still damage." Each check below names exactly what it reads.
- **Graded ladders.** Ascend 0/10/20 and Covenant 25. Idlever already has numbered descents, so *Third Descent* sits
  above v1's *Deeper Still*.
- **Hidden entries for jokes and spoilers.** StS hides its boss kills, and Monster Train hides its shop jokes.
  Idlever hides odd interactions only: finding one is the joke.
- **v1's own lessons still hold** ([research/ACHIEVEMENTS_RESEARCH.md](research/ACHIEVEMENTS_RESEARCH.md)): no
  grind by absence, no gold thresholds, nothing missable, and no reward that moves the pacing gates.

## 2. Rules (v1 §2, amended)

1. **Observer only.** The checks read settled run and lineage state, plus a small set of observation marks the run
   records for them (`Run.honours`, §6). Nothing a run, sim, forecast, bot or price reads is written. Marks are
   recorded only when `!cx.sim`; a sim clone never earns.
2. **No reward** of any kind (§0).
3. **No time, run or gold counts.** Each achievement names a place, a choice, a restriction or a moment.
4. **Nothing missable.** Every achievement is lifetime and repeatable on any later run or heir. A lineage-level
   restriction (*Bare Steel*) stays reachable through a second hero's fresh lineage.
5. **Deliberate.** Every non-Journey entry needs at least one choice the IDLE bot never makes: a class, a style, a
   build, a pen set, an oath, restock turned off, a party left home, a route, a descent, or a kill that IDLE's play does
   not produce. Measured by G4/G5.
6. **Restrictions are optional challenges.** v1 forbade any honour that rewards withholding automation. The owner has
   asked for StS-style restrictions ("no pets / no potions"), so v2 allows a restriction when it is one run's
   choice and nothing in the pacing contract depends on it. No achievement asks the player to die, stall, idle to a
   timer or fire a worker.

## 3. The list

**42 entries: 38 visible, 4 secret. 30 are new; 12 are kept from v1.** Names have ≤ 3 words and goals ≤ 5 words.
"Band boss" means the six in `descent::BOSS_DEPTHS`. "A boss" means any `Monster::is_boss` kill. "At the kill" means the
mark recorded in `turn::damage_monster_with_bonus` when the blow brings the boss to 0.

### Journey (10, kept from v1): the milestones

| id | Name | Goal | Check |
|---|---|---|---|
| boss_warlord | Warlord Felled | slay the Warlord | `l.kills ∋ goblin_warlord` |
| boss_lich | Lich Undone | slay the Lich | `l.kills ∋ lich` |
| boss_queen | Queen Unseated | slay the Lurker Queen | `l.kills ∋ lurker_queen` |
| boss_king | Mirror Broken | slay the Mirror King | `l.kills ∋ mirror_king` |
| waystones | Every Waystone | light all six waystones | `waystones` (n/6) |
| legend_all | Legend Armory | find all five patterns | `owned_shapes` (n/5) |
| seek | Sought Out | spend a boss token | `feats.seek` |
| descent | Deeper Still | clear a numbered descent | `endgame.cleared` |
| second_hero | Second Hearth | house a second hero | session bloodlines ≥ 2 |
| pen_row | First Row | write a pen row | `pkg.pen` non-empty |

### Mastery (8, new): one feat per class, using that class's own way of fighting

| id | Name | Goal | Check | Pushes |
|---|---|---|---|---|
| m_fighter | Riposte | slay a boss as Sentinel | at the kill: `run.hero.specialization == Sentinel` | the Fighter's style (a choice, at its level and depth) |
| m_rogue | Knife Work | slay the Lich as Rogue | at the Lich's kill: `run.hero.class == Rogue` | a Rogue climb to D18 |
| m_ranger | Arm's Length | Ranger boss, never in melee | at the kill: class Ranger and `!run.melee_used` (the whole run so far) | pure range: kite rows, no bump |
| m_caster | Hexed Down | slay a boss as Hexbinder | at the kill: `specialization == Hexbinder` | the Caster's style |
| m_gunner | Last Round | slay the Lich as Gunner | at the Lich's kill: class Gunner | reload discipline to D18 |
| m_clown | Send In Clown | slay the Lich as Clown | at the Lich's kill: class Clown | the earned misdirection class to D18 (the owner's example) |
| m_engineer | Built To Kill | sentry kills a boss | the killing blow's source is `Src::Tool(Sentry)` | building the construct into the boss fight |
| m_every | Every Trade | band boss with each class | `honours.class_bosses` (n/7): each class that slew a band boss | trying every class |

### Challenges (12; 11 new): self-imposed restrictions and risk

| id | Name | Goal | Check | Pushes |
|---|---|---|---|---|
| c_dry | Teetotal | slay the Queen, no drink | at the Queen's kill: `run.drinks == 0` | a set that heals without potions (rest, ward, retreat) |
| c_empty | Empty Pockets | slay the Lich, nothing packed | at the Lich's kill: the send packed nothing (`run.packed` and `run.prepared_supplies` empty) | restock off: Minimalist / Only Determination |
| c_lone | Lone Wolf | Foundry Master, no companion | at the Master's kill: party 0 at the send, `run.tamed` empty, no living ally | On Your Own: no pets |
| c_bare | Bare Steel | Foundry Master, forge unbought | at the Master's kill: `l.forge` empty and every `kit` slot 0 | Who Needs Relics?: no forge (a fresh hero's lineage) |
| c_one | One Trick | Lich with one tactic only | at the Lich's kill: the send wore exactly one tactic and no temperament | "do X with only Y": one card, committed |
| c_noexit | No Way Back | new record, no exit rows | a new record at D18 or deeper in a run whose set held no `bank` or `return` row | pushing past a wall instead of banking (a written stance) |
| c_first | First Sight | slay the Queen, first meeting | the Queen slain in the first run that met her (`pkg.meets` lacked `lurker_queen` at the send) | preparing before the wall: a build, not a drill |
| c_flawless | Flawless | Queen or King, untouched | the Queen or the King slain with `!run.hurt_since_boss` | Perfect / Hold the Onions |
| c_three | Three Lines | slay a boss, three rows | the send's compiled set held ≤ 3 rows | Minimalist for rules: a written whole stance |
| c_desc3 | Third Descent | clear descent three | `endgame.cleared ≥ 3` | Ascension: a ladder above *Deeper Still* |
| c_vows | Many Vows | keep three oath kinds | `honours.oaths` (n/3): the kinds of the oaths a run kept | a varied oath board |
| trial | Trial Cleared | clear a weekly trial | `feats.trials` (kept from v1) | the weekly challenge |

### Builds (4, new): build-defining

| id | Name | Goal | Check | Pushes |
|---|---|---|---|---|
| b_seven | Seven Builds | boss with each build | `honours.builds` (n/7): the synergies in the send's set (`packages::build_mask`) when a boss fell | trying every named pair |
| b_kennel | Kennel Builds | boss with each pet build | `honours.pet_builds` (n/3): `run.pets.syn` bits when a boss fell | pets paired with tactics |
| b_stance | Own Stance | slay the Lich, own stance | at the Lich's kill: the send's stance was `custom` | writing a whole stance |
| b_route | Off The Map | slay a boss off-route | at the kill: `!run.route.is_base()` | the fork routes |

### Moments (4, new): the killing blow and the clutch

| id | Name | Goal | Check | Pushes |
|---|---|---|---|---|
| x_thread | By A Thread | Lich or deeper at 5% | a band boss at D18 or deeper, at the kill: `0 < hero.hp × 20 ≤ hero.max_hp` | Shrug It Off: a set that fights on at low HP |
| x_wind | Second Wind | revived, then a boss | at the kill: `run.pets.revived` (a mender's revive happened earlier this run) | a Mender pet |
| x_dog | Good Dog | pet fells Lich or deeper | a band boss at D18 or deeper; the killing blow's source is a companion (`Src::Mon(j)`, `ally && cid.is_some()`) | I hardly lifted a finger: a guard party |
| x_fire | Pyromaniac | fire fells Lich or deeper | a band boss at D18 or deeper; the killing blow's source is `Src::Fire` | fire throws on the boss |

### Oddities (4 secret; 3 new): found by play, invisible until earned

| id | Name | Goal (shown once earned) | Check |
|---|---|---|---|
| o_gas | Bad Air | gas kills a boss | the killing blow's source is `Src::Gas` or `Src::Burst` (a bloat's cloud, a burst) |
| o_turncoat | Turncoat | captive fells Lich or deeper | a band boss at D18 or deeper; the killing blow's source is a freed ally with no companion id (`ally && cid.is_none()`) |
| o_pratfall | Pratfall | counter kills a boss | the killing blow's source is `Src::Tool(Counter)` (a Clown's decoy counter) |
| old_enemy | Old Enemy | tame a grudge | `run.tamed_grudges` non-empty (kept from v1) |

### Group order

Journey, Mastery, Challenges, Builds, Moments, Oddities. The Oddities group is drawn only once one of its entries is
earned.

## 4. Cuts from v1 (20 of 32 dropped)

| v1 entry | Verdict | Why |
|---|---|---|
| depth_20, depth_30 | cut | Depth counts are what IDLE does anyway; the boss stages already mark the bands. |
| boss_mother, boss_master | cut | Four boss stages are enough for the journey. The Master returns as the target of *Lone Wolf* and *Bare Steel*. |
| town_full, staff, kit, scout, promoted | cut | Purchases: PICKED buys them by day 1–3, and IDLE hires the Receptionist on day 1. They are checklists, not play. |
| loadout, variant | merged | Into *Seven Builds*, which asks for a boss kill with each build rather than a menu click. |
| fix | cut | An onboarding click. |
| own_words | merged | Into *Three Lines* and *Own Stance*, which ask what the pen was for. |
| causes | cut | It rewards dying five ways (the Turok pattern). |
| legacy | cut | A purchase. |
| new_trade | merged | Into *Every Trade* (a band boss with each class). |
| bred | cut | Automatic once the kennel is open. |
| oath | merged | Into *Many Vows* (three kinds). |
| named, new_look (secrets) | cut | They are curiosity clicks with no play in them, and boring by the owner's measure. |

Kept: 10 Journey entries, *Trial Cleared* (moved to Challenges) and *Old Enemy* (moved to Oddities).

## 5. Gates

| Gate | Bar |
|---|---|
| G1 list | 38–46 entries, 3–6 secret, ≥ 25 new, unique ids, budgets (name ≤ 3 words, goal ≤ 5, no terminal punctuation, no you/your/tap/click). `honours::tests::launch_list_meets_g1` asserts the exact counts (42, 4 secret, 30 new). |
| G2 gate neutrality | (a) A Rust test plays the same seed with the observer on, and again with every achievement pre-earned and marks disabled. Saves are identical once `$.lineage.honours`, `$..run.honours` and `$.others[].lineage.honours` are stripped. (b) `replay_hash_per_route` passes unchanged. (c) The dayplayer's IDLE/PICKED/TUNED tables are identical to main's (only `done in` lines differ). |
| G3 no reward | A Rust test earns every achievement on a lineage. `marks`, `marks_due`, `gold`, `unlocks`, `trophies` and the forecast for the next send are all unchanged. `repin --settle`: Gold, ledger and ExitLine unchanged in every settlement; after-save diffs only under `honours` paths. |
| G4 IDLE day 1 | A fresh IDLE game earns ≤ 3 achievements by the end of day 1 (dayplayer `DP_SAVE_DIR` saves, read by `docs/evidence/cut269/dp_honours.py`). |
| G5 deliberate | (a) IDLE earns **0** non-Journey entries by the end of day 3 and ≤ 3 by day 14, on every measured seed. (b) PICKED and TUNED hold more than IDLE on day 14 on every seed. (c) A static per-entry choice table (this document §3's "Pushes") names, for each non-Journey entry, the choice IDLE never makes. Any entry IDLE earns in (a) is either tightened or listed as a deviation with its measured day. |
| G6 save | A v1 save (`v = 1`) loads at `v = 2`. Kept ids keep their day, and cut ids drop. New state-derived entries are earned silently and marked seen. Observation marks on a saved run in flight are optional (`serde(default)`). Save → load → save is identical. |
| G7 presentation | Toast: `✦ Warlord Felled` or `✦ 3 achievements` (≤ 3 words). Menu → Achievements in ≤ 2 activations at 1440 and 402×681. The header is `n/N` over the visible list, plus `+k` when k secrets are earned. An unearned secret is absent from the wire (a test greps the wire for its name). Badge art: `badge_bronze/silver/gold` by group tier, `badge_locked` for unearned, and `badge_secret` only on earned secrets, each with a primitive fallback. Copy lint passes; the client group `achievements` passes. |

## 6. Observation marks (`Run.honours: honours::RunMarks`)

Recorded only on a real run (`!cx.sim`), skipped in saves when empty, and read by nothing but `honours.rs`.

- **At the send** (`Game::send`): `rows` (the compiled set's row count), `custom` (the stance was `custom`), `exit_rows`
  (the set holds a `bank` or `return` verb), `builds` (`build_mask`), `tactics` and `temper` (the tactics worn, a
  temperament worn), `party` (the party size), `met` (the band bosses `pkg.meets` held).
- **At a boss kill**: `kind`, `by` (`hero`, `ranged`, `pet`, `ally`, `fire`, `gas`, `poison`, `counter`, `sentry`,
  `other`), `hp`, `max_hp`, `untouched` (`!hurt_since_boss`), `drinks`, `melee` (`run.melee_used`), `revived`, and
  `allies` (living allies).

The checks also read run state that already exists (`hero.class`, `hero.specialization`, `packed`, `tamed`, `start`,
`max_depth`, `best_at_send`, `route`, `pets.syn`, `oath`, `oath_said`). `Honours` gains `class_bosses`, `builds`, `pet_builds`
and `oaths` sets (counted entries), filled at run end.

## 7. Wire and naming

- `Lineage.honours: { earned, total, secrets, rows }`. `earned` and `total` cover visible entries only, and
  `secrets` counts the earned secrets. `rows` holds no unearned secret. Each row gains `tier` (`bronze`, `silver`,
  `gold`: Journey and Moments bronze, Builds and Challenges silver, Mastery and *Every Trade* gold; an earned secret
  draws `badge_secret`).
- The internal ids stay `honours` (module, save key `honours`, wire field, `seenHonours()`). A rename would touch the
  save format and every fixture, and players never see these ids. Player copy, the gallery title, the Menu label, toasts
  and test names say "Achievements".

## 8. Critique pass (against measurement)

The first measured list (dayplayer, 3 seeds × 15 days, IDLE, IDLE30, PICKED and TUNED) let IDLE earn 5 or 6
non-Journey entries by day 14, and 1 or 2 by day 3. That failed G5(a). The bar was not moved. Each entry was tightened
toward the deliberate version of its own idea:

| Entry | Measured on IDLE (first draft) | Change |
|---|---|---|
| First Sight (Lich, first meeting) | days 1–3, five of six IDLE games | The Queen, first meeting. IDLE meets the Queen for 10+ days before it kills her. |
| Teetotal (Lich, no drink) | days 3–14, four of six | The Queen, no drink. |
| Flawless (Lich or deeper, untouched) | days 6–7, every game | The Queen or the King, untouched. |
| Long Walk (D1 to D23 in one run) | days 4–7, every game: IDLE never takes a waystone start | Cut. Replaced by *One Trick* (the Lich with one tactic only), because IDLE wears no tactic. |
| Good Dog, Pyromaniac, By A Thread, Turncoat (any boss) | days 3–14 | The Lich or deeper: the Warlord's and Mother's escorts gave pets, fire and captives the killing blow by themselves. |

The second and third measurements are in `docs/evidence/cut269/achievements-first-earn-pass2.txt` and
`achievements-first-earn.txt` (the final list).

## 9. Acceptance results (2026-10-18, branch cut269-achievements on main 4adcb94a)

The dayplayer ran 3 seeds × 15 days with the IDLE, IDLE30, PICKED and TUNED bots. The machine was shared and loaded
(load average about 60 on 32 cores), so the sample is 3 seeds, as in v1 (§10). Day 15's saves hold every entry earned
through day 14.

| Gate | Result | Evidence |
|---|---|---|
| G1 | PASS: 42 entries, 4 secret, 30 new; budgets asserted | `honours::tests::launch_list_meets_g1` |
| G2 | PASS: (a) `achievements_never_change_a_game`: the observer on, or switched off entirely, gives the same save once `honours` is stripped, with a run in flight. (b) Workspace tests pass, including `replay_hash_per_route`. (c) The dayplayer tables with the observer on and with `IDLEVER_HONOURS_OFF=1` are identical apart from the `done in` timings, on both measured builds. | `dayplayer-on.txt`, `dayplayer-observer-off.txt` |
| G3 | PASS: `achievements_pay_nothing`: earning 15+ entries in one settle leaves the lineage identical apart from `honours`. `repin --settle` from ce9d gives Gold, ledger, ExitLine and expected unchanged on 4/4. After-saves differ only under `$.lineage.honours` and `$.others[].lineage.honours` (v 2, cut ids dropped, retired `causes`), regenerated into 14b5. The browser `gold-settlements` group passes 564 checks. | `settlements-inputs-14b5.json` |
| G4 | PASS: IDLE earns 1, 2 and 1 by the end of day 1; IDLE30 earns 1, 2 and 1. | `achievements-first-earn.txt` |
| G5(a) | PASS: IDLE earns **0** non-Journey entries by day 3 on every seed, and 1, 2 and 1 by day 14 (≤ 3). The entries it does reach are Moments: *By A Thread* (s1 day 5), *Good Dog* (s2 day 8, s3 day 7) and *Pyromaniac* (s2 day 6). | as above |
| G5(b) | PASS: on day 14 PICKED holds 7, 8 and 7 against IDLE's 5, 6 and 6; TUNED holds 9, 9 and 11. | as above |
| G5(c) | PASS: 24 of the 31 non-Journey entries were earned by no bot in 15 days. They need a class, a style, a pen set, an oath, restock off, a party left home, a route, a descent or a second hero. The other 7 were earned by bots: *One Trick* and *Teetotal* (PICKED and TUNED: they wear one tactic), *Flawless*, *Turncoat*, *Good Dog*, *Pyromaniac* and *By A Thread*. | as above |
| G6 | PASS: `a_v1_save_migrates_silently_and_round_trips`, `a_pre_honours_save_migrates_silently`, `unknown_ids_are_dropped_on_load`. | `honours_tests.rs` |
| G7 | PASS: the client group `achievements` passes 39 checks at 1440×900 and 402×681. Toasts read `✦ 2 achievements` and `✦ Warlord Felled`. Menu → Achievements takes 2 activations, with no horizontal overflow. The header reads `3/38`, or `3/38 +1` with an earned secret. No `?` and no unearned secret row is shown, and the wire holds no unearned secret's id or name. Badges: tier medal when earned, `badge_locked` otherwise, `badge_secret` only on an earned secret, and a `badge_frame_*` tier rim on each group heading. `game-menu` passes 81 checks. Copy lint passes. | `web/tests/achievements.mjs`, `evidence/cut269/shots/`, `observations-2026-10-18.md` |

## 10. Deviations

- **Sample**: 3 seeds, not 16, on a shared machine (each 15-day dayplayer pass took about 17 minutes). This is the
  same deviation v1 recorded.
- The dayplayer's `PICKED ≥ 1.5× IDLE at D13, D18, D23` row prints FAIL at 3 seeds (1.00 · 1.60 · 6.00). The
  observer-off run prints the identical row, so the row predates this cut and comes from the 3-seed sample.
- The bots never change class, pick a style, write a whole stance, swear an oath, turn restock off or take a route.
  For 24 of the entries, then, the only evidence is the per-check unit cases (`every_new_check_has_a_case`,
  `near_misses_earn_nothing`). A human playtest of the Mastery and Builds groups is the open follow-up.
- The internal ids stay `honours`: the module, the save key, the wire field, CSS classes and `seenHonours()`. Only the
  player-facing copy and the client test group were renamed (§7).

## Sources

- [sts-steam] Slay the Spire, Steam global achievements. https://steamcommunity.com/stats/646570/achievements/?l=english
  and https://slaythespire.wiki.gg/wiki/Achievements
- [hades-steam] Hades, Steam global achievements. https://steamcommunity.com/stats/1145360/achievements/?l=english
- [balatro-steam] Balatro, Steam global achievements. https://steamcommunity.com/stats/2379780/achievements/?l=english
  and https://balatrowiki.org/w/Achievements
- [vs-steam] Vampire Survivors, Steam global achievements. https://steamcommunity.com/stats/1794680/achievements/?l=english
- [itb-steam] Into the Breach, Steam global achievements. https://steamcommunity.com/stats/590380/achievements/?l=english
  and https://www.gamepressure.com/into-the-breach/achievements/zbaa72
- [mt-steam] Monster Train, Steam global achievements. https://steamcommunity.com/stats/1102190/achievements/?l=english
- [ftl-steam] FTL, Steam global achievements. https://steamcommunity.com/stats/212680/achievements/?l=english .
  The Type B unlock rule comes from a search snippet of https://ftl.fandom.com/wiki/Category:Ship_Achievements, a page
  that could not be fetched.
- v1's sources: [research/ACHIEVEMENTS_RESEARCH.md](research/ACHIEVEMENTS_RESEARCH.md) (Hamari & Eranti 2011;
  Jakobsson GDC Europe 2010; Kerpelman; Steamworks).
