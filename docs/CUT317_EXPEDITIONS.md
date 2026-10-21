# Cut317 — Expeditions: the hero lives in the dungeon

2026-10-21. Owner: "dungeon runs should be the majority of the time the heros are in, so they go deep in
realtime · no speedup controls etc, that's only for replays · gold/items are sent into the central bank at
every x depths where hero rests and meets with the porter · allowed to change items/tweak etc heros even if
they're delving". Follow-up: "run length you decide, what's actual roguelike games like? basically running
actual roguelike games · porter: early hire · town: yes, we need to fill it out. also a town crier that
espouses hero milestones".

Status: **draft for owner review** (numbers marked ◇ are proposals).

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
camps, and ends the expedition by dying, by retreating (the existing Return/Bank decisions), or at the bottom.

1. **Length (the owner left this to us).** Typical expedition ◇: 30–60 min early (D1–D8), 1–3 h in the
   midgame, 6–12 h late (an overnight dive). Floor pace ◇ 3–6 min, slower at bosses. The 120k-tick cap rises
   to ◇ 24 h, so it is a safety net and not a pacing device.
2. **Town time is short.** The alive-run rest falls from 20–30 min to ◇ 2–5 min (resupply). Death recovery is
   unchanged (Cut315: 15 s early, 20 min deep); dying deep costs time. Target ◇: after the porter, a hero is in
   the dungeon ≥ 80 % of wall time.
3. **Camps by time, not floor count** (owner: "3 floors depends on floor size"). The hero makes camp at the first
   stairs after ◇ 10 min of diving since the last camp (or the departure), so big floors space camps out and a camp
   always sits on a floor boundary. He rests ◇ 30 s there. With the porter hired, the porter meets
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
