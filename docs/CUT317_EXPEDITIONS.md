# Cut317 — Expeditions: the hero lives in the dungeon

2026-10-21. Owner: "dungeon runs should be the majority of the time the heros are in, so they go deep in
realtime · no speedup controls etc, that's only for replays · gold/items are sent into the central bank at
every x depths where hero rests and meets with the porter · allowed to change items/tweak etc heros even if
they're delving". Follow-up: "run length you decide, what's actual roguelike games like? basically running
actual roguelike games · porter: early hire · town: yes, we need to fill it out. also a town crier that
espouses hero milestones".

Status: **shipped 2026-10-22** (owner: "yes turn on the new features"; old saves: "fresh start is fine"). Numbers marked ◇ were proposals; §3h records what shipped.

## 1. What a run is today (survey, 2026-10-21)

| Fact | Where |
| --- | --- |
| 10 ticks/s; a run is capped at 120 000 ticks (3 h 20 m) and ends as a Return with no yield | offline.rs:82, engine.rs:223 |
| Early runs D1→D8 Warlord take 13–17k ticks (~25 min); watched at a flat 4× | CUT232_CADENCE |
| After an alive run the hero rests `clamp(turns/2, 20 min, 30 min)` | offline.rs:119, balance.rs:319 |
| Death recovery 15 s to D14, ramping to 20 min at D28 | persistent.rs:13, Cut315 |
| Every new record floor secures the carry (`secure_carry`) | turn.rs:2807, engine.rs:1188 |
| Exit gold: secured + carry × 100/100/0 % (bank/return/death) | engine.rs:1282 |
| Porter (Lili): hired after 3 hand-collected chests; hauls land in the purse | tree.rs:84, balance.rs:311 |
| Rules edits mid-run apply live and are **not** recorded as inputs | engine.rs:3742, 4718 |
| Class, firearm, legacy, upgrades, tree: refused while the hero is away | persistent.rs:113 |
| Live view speeds fights/fast/one (≤ 4×), pause, skip | watch.ts:285, 332, 811 |
| The crier is client-only: one cry after an absence | ui/crier.ts |

Measured (`examples/expedition_probe.rs`, 24 h of the open app's clock, 2026-10-22):

| Save | Runs | Median run | Floor pace | In dungeon | Ends |
| --- | --- | --- | --- | --- | --- |
| `earned-gunner-home` (midgame, starts D1) | 7 | 200 min | 2–8 min | 85 % | 5 of 7 hit the 120k-tick cap mid-dive (D24–D28); the carry since the last record floor is lost |
| `earned-first-ascension-clear` (late, starts D29) | 59 | 4.5 min | ~1 min | 18 % | return after 1–4 floors, then a 20–30 min rest |

So the midgame already lives in the dungeon but is cut off by the cap; the late game is mostly rest. Floor
pace varies ~8×, which is why camps are timed, not counted. The live view is watched at 4×.

## 2. Reference: what real roguelikes are like

One run is one life, from the top until death, a voluntary exit, or the bottom. Most runs die early;
a few go long. Brogue: 26 floors, a win in ~2–4 h, most deaths inside the first hour. DCSS: 15 main
floors plus branches, a win in 6–15 h. Shiren: 30 floors in ~2–4 h. NetHack: tens of hours. A floor
takes roughly 3–10 minutes, and deeper floors are slower. Rest happens inside the run (stairs, safe rooms),
not in a town between runs.

## 3. The model

**An expedition is one hero life at real speed.** The hero departs, descends floor by floor at 1×, rests at
camps, and ends the expedition by dying, by a deliberate bank, by running out of supplies, or at the bottom.

0. **Hurt means rest, not home** (decided 2026-10-22). The probe shows late runs end on the hero's own safety
   rows: `hp < 25% → return` and `lacks heal · hp < 35% → bank` fire after 1–4 floors, and each is a walk home
   plus a 20–30 min rest. In a roguelike a hurt hero backs off and rests. So during an expedition a `return`
   walks to the floor's up-stairs and **rests there until healed** (◇ ~1 HP/s, wandering foes can still find him),
   then the dive resumes. The player's rows keep their words; the verb's meaning changes (the glossary and the
   pen say "retreat · rest"). `bank` stays a real exit, chosen with a carry worth taking home. An expedition also
   ends when supplies are spent and he is still hurt (◇ the rest heals only to ◇ 60% without a heal in the pack).

1. **Length (the owner left this to us).** Typical expedition ◇: 30–60 min early (D1–D8), 1–2 h for a full
   dive. The dungeon has a bottom (D33) and floors take ~1–4 min, so one expedition is at most ~2 h; an overnight
   absence is several expeditions, not one. The 120k-tick cap rises to 24 h, a net and not a pacing device.
   Owner 2026-10-22: **"start fresh"**: every expedition starts at D1 (no guide or waystone skip). **"d33 is way
   too short"** → both:
   - **Dive past the King** (phase 1b): after D33 the expedition carries on into the next, harder descent (the
     numbered descents / Ascension tiers) instead of ending. Reuses all content; a strong hero dives for hours.
   - **Stretch to D99** (phase 7): three times the floors per biome, bosses at the same relative places
     (Warlord D24, King D99). Touches ~366 depth references in the core, the route tables, the client depth rail
     and every depth-based gate (translated ×3, never weakened).
2. **Town time is short.** The alive-run rest falls from 20–30 min to ◇ 2–5 min (resupply). Death recovery is
   unchanged (Cut315: 15 s early, 20 min deep); dying deep costs time. Target ◇: after the porter, a hero is in
   the dungeon ≥ 80 % of wall time.
3. **Camps by time, not floor count** (owner: "3 floors depends on floor size"), **a rest level** (owner: "camps
   I'm feeling it's like a rest level · safe zone in the dungeon"). After ◇ 10 min of diving since the last camp
   (or the departure), the next stairs down lead to a camp: a safe room between two floors (no new depth, nothing
   hostile, no wandering spawns). He heals whole at the fire and rests ◇ 30 s, then takes its stairs on. With the porter hired, the porter meets
   him there: the whole carry goes to the bank (secured: it can never be lost again) and queued changes come
   down. Before the porter, a camp is only a rest; the record-floor checkpoint behaves as today.
4. **Death costs what was found since the last camp, plus recovery time.** Nothing else (owner left this open; this keeps
   Cut196: secured gold is never lost, and nothing is paid twice).
5. **Changes while delving.** Rules, packages, loadout and gear may be edited while the hero is away. Each edit
   is queued and takes effect at the next camp the porter reaches. Before the porter, it takes effect at the next
   departure. The client shows "next camp · D24". The applied edit is recorded as a run input at that camp's tick.
   This closes today's gap (live rules edits unrecorded): same seed + rules + elapsed + commands ⇒
   identical events, whole or sliced.
6. **Porter is the early hire that opens camps.** It keeps its current hire (3 hand-collected chests) and ranks.
   Rank bonus stays a haul bonus; a rank could later shorten camp rest (◇ not in this cut).
7. **No speed in the live view.** The live view is 1×: no speed tile, no skip; pause stays (pausing the
   watcher, not the hero). Replays (the death trace, the report reel, the chain-link sheet) keep speed and
   gain scrub/pause.
8. **The town fills while heroes are away.** It's a real-time town:
   - The porter visibly walks the trail to the bank at each camp, with a sack.
   - Workers do their work in place: the forge glows on an order, the clerk at the bank, the kennel-hand with pets.
   - **The town crier**, in the square, calls hero milestones as they happen. Core-owned feed: record depth,
     boss slain, camp reached and banked sum, new class/level, death (cause), return. One cry at a time,
     ≤ 3 words + a name and a number (copy budgets hold), and a tap opens the diary (today's crier sheet). A
     cry is the core's event, so offline catch-up yields the same cries, summarised on return.

## 3b. Phase 1 prototype (2026-10-22, `tuning/studies/cut317-expedition.json`)

`balance.expedition {on, run_cap_ticks}` (off in shipping); rest after an alive run 2–5 min. In the core:

- **Retreat** (`Run.retreat`): a `return` rests the hero (`ai::rest_now`) while nothing awake is in sight — a
  sleeper is scenery — and the rows wait until he is healed. A foe in sight: his rows fight, or the `return`
  backs him toward the up-stairs. Five minutes without a rest (`RETREAT_GIVE_UP`) and the next `return` walks
  him home as ever.
- **Start fresh**: in an expedition every send starts at D1 (`Game::pay_start_at`).
- **Progress clock** (`turn::progress_clock`, the expedition's hunger clock): no new floor and no more gold
  carried for 20 min (`STALL_GIVE_UP`) and he commits a return (out where he stands `RETURN_TICKS` later, carry
  kept). A bank walk he cannot finish is clocked too.

The probe found a **shipping stalemate**, masked until now by the run cap. A gunner in plate at D24–D28 is
surrounded: no foe's blow gets through (0 damage), and his long gun cannot outpace a lurker queen who heals and
spawns. Or a bank walk has no path home. The run then stands still until the 120k-tick cap ends it as "Lost the
thread", losing the carry since the last record floor. In `earned-gunner-home`, 5 of 7 shipping runs ended this way.

| Save, 24 h | Shipping: runs · median · in dungeon | Prototype: runs · median · in dungeon |
| --- | --- | --- |
| `earned-gunner-home` | 7 · 200 min (5 capped) · 85 % | 23 · 68 min · 82 % |
| `earned-first-ascension-clear` | 59 · 4.5 min · 18 % | 109 · 5.9 min · 44 % |

## 3b'. Phases 2–3 built (2026-10-22)

- **Camps** (`turn::enter_camp`, `gen::camp_floor`): a 13×7 lit room, up-stairs west, down-stairs east. Entering
  heals him whole, clears poison, and with the porter (`Run.porter`, hired at the send) secures the whole carry
  (`secure_carry`). The camp is a safe zone: `tick_alert` spawns nothing there, and he sits out `camp_rest_ticks`
  before the chores take the stairs. `Ev::Descend { biome: "camp" }` marks it for the client.
- **Queued edits** (`LineageState.carried_sets`, `Game::kit_at_camp`): an expedition plays the sets it left with.
  Edits in town change `sets` only; at each porter camp the carried sets renew from the town's before the next
  tick, recorded as `Input::Kit` on the run's capsule so the replay applies the same rows at the same tick.
- Tests (`tests_cut317.rs`, a thread-local test profile): shipping has no expeditions; expeditions start at D1;
  camps are safe and banked; no run approaches the shipping cap; whole = sliced absence (byte-identical save);
  an edit waits for the next porter camp, then applies, and the run's replay hash equals its live events.
- Probe, 24 h: gunner 16 expeditions · median 84 min · 90 % in dungeon · 5–6 camps each; first-ascension 24 ·
  49 min · 91 %.

## 3c. Depth model (shared by "dive past the King" and "stretch to D99")

Today one field, `Run.depth`, is both the floor number the player sees and records, and the depth content reads
(biome, spawn tables, boss floors, loot, waystones, the forecast): 366 references in the core. Reaching D34 ends
the run (`turn::descend`, `ENDING_DEPTH`). Both owner picks need the two separated:

- **floor**: the number shown, recorded, lit as a stone and gated. It counts up without end.
- **content depth + tier**: what the floor is generated and scaled as. For the stretch, content depth =
  ⌈floor / 3⌉ (three floors a band, the boss on the band's last). Past the bottom, the tier rises by one and the
  content depth restarts at D1, harder (the numbered descents' tier bonus).

Survey (2026-10-22): `descent::tier_depth` already maps a depth to "the content depth" for stat, group, item
and XP scaling, so the new accessor feeds it. Content flows through five chokepoints: `Run::biome`, `descend` /
the first floor's `generate`, `populate_floor`'s `let depth`, `place_situations` / `place_twist` / omen, and
about 15 mid-floor spawn calls that pass `run.depth`. Then there are about 8–10 single-floor decisions (boss,
lieutenant, flagship situation, grudges, guests, bounty, the biome-change event), each of which must happen on
exactly one of a band's three floors. About 40–60 ambiguous sites compare boss floors, forks or waystones with
records; one floor-from-content helper on `Route` cuts these to about 5. About 25 floor-space literals need a
rescale-or-keep decision each (unlock gates, `QUEEN_PACK_DEPTH`, `DEEP_FROM`, class-tree stages…), and about 10
economy sites are keyed on the record. The ~250 pure floor sites stay. The tier bonus lives only in
`endgame::spawn`; four direct `Monster::spawn` sites skip it today.

Plan:
1. `Run::content_depth()` (= `depth` at stretch 1, lap 0) and `Run::band_floor()` (a band's last floor, the
   one that holds its single events: always true at stretch 1). Route the chokepoints and single events through
   them; shipping stays byte-identical (all core tests, replay hashes, gold settlements).
2. `Route` floor-from-content helpers for bosses, forks and waystones; literal gates expressed in content depth
   and converted where they meet records.
3. The profile turns on `stretch: 3` and `laps` (past the bottom: tier + 1, content back to D1, floors count on).

## 3d. Depth step 1 and the stretch on (2026-10-22)

`engine::{content_of, band_floor, lap_of, lap_floors}` and `Run::{content_depth, band_floor}`; shipping (stretch
1, no laps) byte-identical (1119 core tests, replay hashes, settlements). Content now reads the content depth:

- generation, biome and the first floor
- `populate_floor`, its spawns and budgets
- situations, omens and room kinds
- mid-floor, alert and rest spawns
- pet HP
- run XP
- the rows' `depth>=` condition (rows are written against the content: the packages' D19 Foundry)

Boss and lieutenant stand on a band's last floor, and twists too. Grudges, bones and texts stay on floors. The
bottom is the content's: with laps the content wraps to D1, the run's difficulty rises (`Run.bottoms`), and
each tier passed completes.

Profile (stretch 3, laps on), 24 h:

| Save | Expeditions | Median | Deepest | In dungeon |
| --- | --- | --- | --- | --- |
| first-ascension | 7 | 233 min | D84 (content D28) | 97 % |
| gunner | 9 | 80 min | D84 | 96 % |

The first-ascension expeditions end on "hurt · went home" or "no heals · banked". The gunner still meets
stalemates at content D5/D11/D24/D28, which the progress clock ends (tuning).

Before the profile could stretch, the rows' `depth>=` read the floor. Deep tactics then fired on floor 24 against
the Warlord (content D8), whose HP never moved, so he "repelled" every expedition there. Hence the content
condition. Open for step 2: the gates in floor space (class stages D23/D28/29/33, the specialization's D23,
legacy nodes, boss-record comparisons, unlock depths, the forge unit, the recovery curve) scale to floors, and
the pen shows `depth ≥` in the player's floors.

## 3e. Client and crier (2026-10-22)

- **Wire**:
  - `Snapshot.camp`
  - `LiveRun.{camp, camps}`
  - `Lineage.expedition {porter, waiting, next_camp_s}`, present only when expeditions are on
  - `Lineage.cries[]`
  - boss landmarks on the stretched floors (`engine::boss_floor`)
- **Live view at 1×** (`ui/watch.ts`, `live1x`):
  - an expedition is watched in the plain mode at a true 1×: no 4× travel over a quiet stretch, no news jump
  - the Speed tile becomes "Run" with only the run controls (meters, Turn back)
  - no speed choices, no skip and no rate badge
  - replays keep theirs
- **Camp** in the live view: the camp's `Descend` reads "camp · porter" and marks the stage (`data-camp`), and
  no floor is recorded for it.
- **Pen**: "waits · camp 10m" above the rules while an edit waits for the porter ("waits · next send" before him).
- **Crier** (`LineageState.cries`, `CRIES_KEPT` 30): the core cries:
  - a new record ("D24 record")
  - a boss slain ("slew Warlord")
  - a porter's camp ("banked $512")
  - a bottom passed ("deeper still")
  - the end: "fell on D40" or "home · $4511"

  Lines are stamped by the lineage's ticks, so whole and sliced absences stay byte-identical. The town crier
  rings for the newest unheard line ("Vale · D24 record") and opens the diary. Shipping cries nothing.
- Verified on the native dev server with the profile (`IDLEVER_BALANCE_FILE`, port 5368): expedition 1×
  controls, the pen's waiting line, `waiting` cleared at the porter's camp, camps in the live view. Shipping
  client tests unchanged (watch-console, ui:frame, screens, pen-edit, editor-packages, depth-rail).

Still open on the client: the camp drawn as its own room (a fire, the porter); floors beyond D33 on the depth
rail and the forecast; the pen's `depth ≥` shown in the player's floors.

## 3f. Retune, round 1 (2026-10-22)

Targeted pacing rows (`gates.mjs --rows … --balance`, 2 seeds):

- **Flat profile** (stretch 1, the expedition mechanics alone): progression races. IDLE reaches D13 at day 0.3 and
  D23 at day 2.2, with heroes ~90 % in the dungeon against ~50 % before. PICKED ≥ 1.5× IDLE fails at D13 (1.00),
  RANDOM-slower fails, and the porter is at worst min 15.1.
- **Stretched profile** (stretch 3): the extra floors restore the pacing. IDLE D8 by day 1, D13 at day 1.0, D23
  at day 4.8. PICKED 3.0× / 5.3× / 5.5× IDLE at D13/D18/D23; TUNED 2.35× PICKED at D33; RANDOM slower; no stalls;
  workers cost the daily player nothing.

Changes made while getting there:

- The dayplayer's `--rows` stop (`dayplayer_rows`) reads a record through `reach`. Read as a floor, it stopped
  TUNED at floor 33 (content 11), which showed as `NaN`.
- **Expeditions begin after the first session's two hires** (`Game::expedition_now`: the scout and the porter).
  Before them, a send by hand is a short classic run. A long first expedition held back every chore counted at a
  run's report: the scout went from min 2.5 to 37 in a harness that modelled taps during the dive. So every
  expedition has its porter.
- **Camps**: the first comes at half the spacing. Every camp secures the carry and pays it up at once
  (`Game::camp_haul`): to the purse with the porter, to the chest before him (his chore).
- **Porter need 2** (shipping 3) in the profile. The classic first runs dive the stretched floors, so each takes
  longer; with 3 he came at min 13.0, worst 15.4, against 12 / 15. Need 2: min 10.2, worst 11.6.

The scout comes at min 5.6 against shipping's 2.5, still inside the gate of 15.

## 3g. Round 1 result, 8 seeds (2026-10-22)

All 15 targeted rows pass on the profile (`--seeds 8`):

| Row | Result |
| --- | --- |
| IDLE D8 by day 1 | 8/8 |
| IDLE D13 | median day 0.7 |
| IDLE D23 | 8/8 by day 4.7 |
| IDLE stall | 1 d |
| IDLE gold | 14/14 |
| IDLE King | 0/8 |
| PICKED vs IDLE (D13/D18/D23) | 2.0× / 3.25× / 4.67× |
| outpace | 100 % |
| stalls (IDLE / PICKED) | 0.73 % / 0 |
| TUNED vs PICKED | 1.43× |
| RANDOM slower | 8/8 · 8/8 |
| porter | min 11.5, worst 13.2 |
| scout | min 4.5, worst 6.7 |
| workers-daily | 30.35 vs 29.20 |

Not a gate pass: the routine `--full` and exhaustive audit on the profile remain before adoption.

Loose ends fixed before the commit:

- The rule snapshot at the send read the previous run (expeditions never carried their rules).
- The next-camp countdown now knows the first camp's half spacing.
- Swift floors compare as floors.

## 3h. Shipped (2026-10-22)

Shipping `DEFAULT` and `tuning/balance.json`:

- `expedition {on, run_cap_ticks 864 000, camp_every_ticks 6000, camp_rest_ticks 300, stretch 3, laps}`
- `rest 1200–3000` ticks
- `workers.porter.need 2`

Expeditions start after the first session's scout and porter. A harness's literal lineage stays on classic runs,
for exact exit tiers and the metrics. The live view goes 1× only for an expedition run (`Snapshot.expedition`).

Evidence:

- **Statistical study** `cut317-adopt` (`tools/tune.sh`, 32 held-out confirmation seeds, α 0.05 across claims):
  - **Confirmed:**
    - IDLE D8 within a day (8 h); D13 by day 4 (16 h); D23 by day 12 (112 h)
    - PICKED ≥ 1.5× IDLE at D23 (4.5× [3.7, 5])
    - TUNED ≥ 1.15× PICKED at D33 (2.5× [1.5, 3.3])
    - IDLE net gold on days 2 and 10
  - **Inconclusive:** PICKED ≥ 1.5× at D13 (2.0× [1, 2]), quantised by 3 check-ins a day. A follow-up with 8
    check-ins is `cut317-adopt-d13`.
- **Targeted canonical rows**, 8 seeds: all 15 pass (§3g).
- **Core:** 1123 tests. The pre-Cut317 suite runs `balance::CLASSIC` under `cfg(test)`. The shipping game is
  `tests_cut317`: stretch and laps, a shipping dive past floor 33, camps, edits, crier, whole = sliced.
- **Client routine subset** after the flip: see HANDOFF. Two groups replay deaths from pre-Cut317 saves
  (`king-advice-scope`, `death-fix-discovery`). Under "fresh start" those saves describe a dungeon that no longer
  ships, and they need new fixtures.

Not done: the routine `--full` and exhaustive gates on the shipping defaults, the gold-settlement re-pin, a
fun-eval playtest.

## 3i. Return after idle (2026-10-22)

Owner: "cap to one week and have a catch up loader screen · show progress and also announce milestones".

- An absence counts at most a week (`offline::ABSENCE_CAP_S`). Whole absences clamp in the core, and the client's
  sliced catch-up stops at `Lineage.absence_cap_s`.
- `ui/catchup.ts` covers absences of 10 min or more. It shows:
  - the time away, with "a week counts" when capped
  - a progress bar of the time played
  - the porter's running banked total
  - the crier's milestones, newest first: records on boss floors and every 10th, bosses slain, deaths, the
    bottom
- Catch-up cost is unchanged by expeditions. Native: 8 h 0.9 s, 24 h 4.1 s, 72 h 10.2 s (classic: 1.6 / 4.6 /
  11.3 s). Headless WASM plays a week in ~30 s.

## 4. Gates

The hard invariants in AGENTS.md stand. In particular, Idle alone progresses: IDLE D8 on day 1, D23 by day 12,
PICKED ≥ 1.5× IDLE, TUNED +15 % at D33, RANDOM slower than PICKED, dice deaths ≤ 5 %, nothing punishes
absence, uncapped offline after the scout, death has a cause/trace/lever.

New, measured by the dayplayer (16 seeds × 14 days) and native tests:

| Gate | Target ◇ |
| --- | --- |
| Expedition length, IDLE, median, days 1–2 | 30–60 min |
| Expedition length, median, days 5–14 | 1–3 h; P90 ≥ 6 h |
| In-dungeon share of wall time after the porter, median seed | ≥ 80 % |
| Floor pace, median | 3–6 min |
| Camp spacing | first stairs after ≥ 10 min since the last camp; median gap 10–15 min |
| Camp banking | 100 % of carry at a camp is secured; a later death loses only the post-camp carry |
| Edit at camp | a queued edit applies at the next camp tick exactly; whole = sliced offline, byte-identical save |
| Replay | `replay_hash_per_route` + a new route with a mid-run edit |
| Live view | no speed/skip control on a live run; replays keep them (client test) |
| Crier | every milestone kind cried once, in order; offline cries = live cries; copy-lint clean |

## 5. Phases

1. **Core: expeditions.** Real-speed pacing (floor pace, run cap, short rest), camps every N floors, as a
   balance profile first (the Cut306–314 pattern: isolated, gated, then adopted).
2. **Core: porter at camps.** Camp banking and the death rule.
3. **Core: queued edits.** The edit queue, the camp application, recorded inputs, and the wire showing the
   next camp. The away refusals (class, gear…) become queued.
4. **Tune.** The dayplayer gates above, then the AGENTS.md invariants (`--pacing`, `--full`).
5. **Client: live view 1×.** Remove the live speed/skip; replay controls.
6. **Town fill + crier.** Core crier feed; the square crier; the porter's walk; worker activity.

## 6. Risks

- Pacing gates are measured over days. Longer runs with shorter rests change how depth accrues per day, so
  phase 4 may move numbers widely. Gates are tuned, never weakened.
- Camp banking makes death cheaper; the pressure moves to time (recovery) and to the camp gap.
- The 4× watch gave the live view its energy. At 1× the camera, the log and the town must carry it (phases 5–6).
- Offline catch-up cost grows with longer runs (≈ 3 µs/tick, so a 12 h expedition ≈ 1.3 s native).
