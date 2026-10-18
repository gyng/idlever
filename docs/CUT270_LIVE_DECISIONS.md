# Cut 270 — live decisions, the boss chest, flagged moments and the milestone log

Status: **contract, 2026-10-18.** Base: `main` after the 2026-10-18 integration merge
(cut262 town UX, cut263 honours, cut266 hero hub, cut267 art, live-view inventory).
Branch `cut270-live`.

## Why

Owner, 2026-10-18: the live view (`web/src/ui/watch.ts`) "is quite lame with no actions". The owner chose:

1. **Decision moments.** A few per watched run, each a short choice of about 5 s. If the player does not
   choose, the hero auto-picks.
2. **Boss chest.** After a boss kill a chest is revealed and auto-opens (light rays, coin and sparkle burst,
   a rarity-tinted ring, the reward). No tap.
3. No cooldown taps and no active abilities. Take-over (`web/src/ui/control.ts`) already covers acting by hand.

Owner, 2026-10-18, second message: "yes improve flagged moments please but no taps. the live view should show
milestone history log (in addition to the detailed history log). 5 sec, player can pause".

4. **Flagged moments.** Clearer, consistent, rate-limited callouts for the moments that matter. Callouts only:
   no buttons and no new take-over shortcut.
5. **Milestone log.** A compact log of the run's milestones beside the existing detailed log (which stays).
6. **Timer under pause.** The 5 s timer freezes while the watch is paused. The prompt stays open and a choice
   is allowed while paused.

## Hard invariants (AGENTS.md, unchanged)

- All game truth in Rust; the client displays it and sends choices.
- Determinism: same seed + rules + elapsed + commands ⇒ identical events.
- IDLE alone progresses; nothing is required; offline is uncapped and never punished.
- Copy: callout ≤ 3 words, no sentences in chrome, no tutorial text.
- Art never blocks the game: every sprite id has a primitive fallback.
- No gate is weakened to pass. A miss is tuned or recorded as a deviation with a reason.

## 1. Design rule: the auto-pick is today's behaviour

A decision is never a new branch inside a tick. It opens **between two ticks**, after the tick whose state
makes it relevant, and it can only change what the hero does *later*, through an order the engine already has:

| Order | Existing command | Effect when chosen | When not chosen |
|---|---|---|---|
| Cache pick | `choose(itemId)` (`Input::Choose`, today an error "loot is automatic") | when the cache opens, `vault_take` takes that item instead of `vault_pick(pref)` | `vault_pick(pref)`, as today |
| Turn back | `bail()` (`Input::Bail`) | `return` fires on the hero's next action (`choose_and_act`) | nothing |

So the default ("auto") sends **no command at all**, except that the cache pick's default is the same item id
`vault_pick` takes. Detecting a decision is a pure read of the run after a tick. Holding the world between ticks
consumes no tick, no RNG and no state. A run where every decision auto-resolves has the same events, byte for
byte, as a run with decisions off.

## 2. The moments (inventory and choice)

Engine branch points that exist today, and the verdict on each:

| Branch point | Where | Verdict |
|---|---|---|
| Cache "take one" (`vault_choice` / `vault_take` / `choose`) | `turn.rs` `vault_open`, `vault_take` | **Use** (D1). Three different items (weapon, armour, consumable); the preference picks one blind. |
| Player bail (`Input::Bail`) | `engine.rs` `bail`, `turn.rs` `choose_and_act` | **Use** as "turn back" (D2, D3). |
| Wall order bank/carry/push (`tree::wall_hold`) | `turn.rs` `descend` | Retired in Cut 118 (`WALL_ORDER_RETIRED`, "heroes yolo"). Not revived; D3 covers a hurt push. |
| Shrine `pray` | `turn.rs` `pray`, `ai.rs` `"pray"` | Rejected: needs a walk, a fact and a set to lend from; a new mechanic, not an order. |
| Pickup swap (`auto_equip`) | `item.rs` | Rejected: the better item is a stat comparison, so the choice is nearly always the default. |
| Boss drop (`legendary::boss_drop`, `armour_sets::source_drops`) | `turn.rs` boss kill | A fixed drop, not a choice. Shown by the chest (§5), which only reveals. |

The chosen moments:

- **D1 `cache` — the cache's pick.** Opens after the tick in which the floor's closed cache (`Tile::Vault` with
  a non-empty `vault_cage`) is first seen; today the hero then walks to it (`ai::vault_step`). Options: the
  cage's items (weapon +1, armour +1, a consumable). Default: `vault_pick(items, vault_pref)`. It is a real
  choice: a new weapon is the most damage and the default, armour wins against the hitters below, and a
  heal or teleport wins for a hurt hero with an empty belt.
- **D2 `boss` — boss ahead.** Opens after the tick in which a band boss (`def().boss`) first comes into view on
  the floor. Options: **Fight** (default) and **Turn back** (bail: a `return` at the next action, the carry kept
  at 100 %, 60 % XP). It is a real choice: a win gives the floor, the drop and the kill; a loss costs the
  unsecured carry and a 20 min recovery (Cut 227).
- **D3 `hurt` — hurt on a record.** Opens after the tick in which the hero reaches a floor deeper than the
  lineage's best at send (a record checkpoint, which secures the carry) with HP under 50 % of max. Options:
  **Push on** (default) and **Turn back**. A hurt push can find the next record or a death; turning back ends
  a safe run.

Options are labelled in ≤ 3 words (`sword +1`, `mail +1`, `heal`, `Fight`, `Turn back`, `Push on`).

### Frequency

- At most **3 per run** and **1 per floor**. D1 at most once per floor (one cache per floor); D2 once per boss
  kind per run; D3 once per run.
- Never on the lineage's first two sends, never in a run's first 300 ticks (30 s at 1×), never while take-over
  is on (the player already acts), never on a homeward walk or after a bail.
- Only in a **watched** run with live decisions enabled by the client (`setLiveDecisions(true)` while the watch
  is mounted and visible). Never in an absence, `advance`, `runOffline`, a fold (▶▶|), a sim, a forecast, a
  replay of an unwatched run or any harness.

## 3. Engine: hold, deadline, determinism

- `Game.live_decisions: bool` (transient, never saved): set by the client. `Game.pending: Option<Decision>`
  (transient, never saved).
- `Game::step(n)`: after each tick, when live decisions are on and caps allow, `decide::detect` reads the run.
  A moment opens `pending` and the step **breaks** (as take-over's `awaiting` does). While `pending` is set,
  `step` ticks nothing and returns the snapshot with `decision`.
- `decide(Some(option))` applies the option's order (recorded as the capsule input `Choose`/`Bail` at the
  hold tick) and clears `pending`. `decide(None)` is the auto-pick: it clears `pending` and records nothing.
- **Never wait away.** Every entry other than `step`, `decide` and pure reads clears `pending` as the default
  before it runs: `advance`, `run_offline*`, `fold`, `send`, `bail`, `take_control`, `act`, `set_rules*`,
  `save`. A pending decision is never saved; a load has none.
- **Deadline.** The engine holds in ticks (a hold consumes no tick). The 5 s deadline is the client's real time,
  measured from when the prompt is shown. If the client never answers, the next non-step call or
  `setLiveDecisions(false)` applies the default. A hidden page applies it at once (`visibilitychange`).
- **Replay.** `Game::replay` applies `Choose`/`Bail` inputs at their ticks, as it already does. A recorded
  choice replays to the live run's event hash.
- Wire: `Snapshot.decision?: Decision { id, kind, t, depth, prompt, options: [{ id, label, tone }], default }`,
  `StepResult.decision?`. `Decision.id` is `t·kind`, unique in the run.

## 4. Client: the prompt and its clock

- The prompt opens when the **picture** reaches the decision's tick (`viewerTick() >= decision.t`), not when
  the engine holds there. The engine is at most the watch's lead ahead, and it stops at the hold, so the
  picture always reaches it.
- **Timer: 5000 ms of wall time at every speed** (`one`, `fights`, `fast`, any rate up to 128×). The world is
  held, so the rate has nothing to scale. A shrinking bar shows it.
- **Paused**: the timer freezes and the prompt stays open. A choice while paused applies; unpausing resumes the
  countdown from where it stopped. A safety cap of **120 s** paused (`DECIDE_PAUSE_MAX_MS`) applies the
  default, so a paused, forgotten tab never stalls the delve. **Hidden** (`document.hidden`): the default at once.
- **▶▶| (skip to end / fold)**: the default at once; a fold never opens one.
- Input: keys **1/2/3** pick the option; **taps ≥ 44 px** high on a phone (402×681). The default is marked
  (outline + `auto` in the timer). No sentence, no tutorial text.
- On the deadline the client calls `decide(null)` (auto). Each decision, chosen or auto, goes to the milestone
  log.
- Density: one compact strip over the bottom of the map, quiet surface, no modal, no dimming of the HUD.

## 5. Boss chest

- Rust reports a `chest` on the step: `StepResult.chests: [{ t, boss, title, rarity, items: [{ kind, label,
  rarity }], gold }]`. It is computed in `Game::step` (and `Game::replay`) from the tick's boss kill and the
  pattern receipts and carry it added. It is a side channel, never an event, so the events hash is
  unchanged. It reveals only and holds no choice: the drop is fixed by `legendary::boss_drop` and
  `armour_sets::source_drops`, and a choice there would be a new mechanic.
- Reward shown: the legendary pattern or set piece (label and rarity), else the kill's gold (`$N`, common).
- Timing lives **inside the existing kill beat** (`beatAt` + `killBeats`, `BEAT_HOLD_MS` 3000 / `fast`
  `BEAT_HOLD_FAST_MS` 1000). Closed 0 ms → cracked 350 ms → open 700 ms; rays, ring and sparks 700–2400 ms;
  reward label from 900 ms. In `fast` the sequence compresses to the 1000 ms beat. The chest never extends
  the beat or the exit flow.
- Art (cut267): `chest_boss_closed|cracked|open` (+ `_px`), `chest_fx_rays` (rotated), `chest_fx_sparks`
  (4×2), `chest_fx_ring` + `_common|_uncommon|_rare|_epic|_legendary`. A missing id falls back to a code
  primitive (CSS box/lid and a ring), as `tags.ts`'s shield does.
- `prefers-reduced-motion` or effects off: the static open chest and the reward, no rays, sparks or ring
  animation. Audio: the existing cue hook, if one exists.

## 6. Flagged moments (callouts, no taps)

Reuse `beatAt`, `showWhy` and the crier. One shape for each: **icon + ≤ 3 words + tint** (danger red, rarity,
gold, calm). The flagged set: boss ahead, low HP (< 25 %), a record checkpoint (`NEW BEST D9 · $N`), a rare find
(rarity ≥ rare), a close call survived (low → recovered above 50 %), the boss chest, a decision.

- Rate limit: at most **1 flag per 2.5 s** of wall time and **6 per minute**; a lower-priority flag inside the
  window is dropped, a higher one replaces it (priority: death > boss > chest > record > decision > rare > low
  HP > close call).
- Copy is linted (`/* copy:callout */`, `eval/copy-budgets.json`).

## 7. Milestone log

A compact list beside the existing detailed run log (kept as it is). One line per entry: `D7 ⛃ secured $42`.
Entries: floor reached; new best; checkpoint secured ($); boss seen and slain; decision (option, or `auto`);
chest (reward); rare find; close call; exit (tier, $). Built by the client from the engine's events, the
step's `decision` and `chests` fields. No rule is added.

- Desktop (≥ 900 px): a narrow column beside the map; phone: a fold under the map, closed by default, of fixed
  height (no layout shift; CLS < 0.02 from opening the watch to the first beat).
- Hover or focus gives a tooltip with the tick and the detail. The watch has no scrub, so an entry does not seek.

## 8. Gates

| # | Gate | Bar |
|---|---|---|
| G1 | IDLE/PICKED/TUNED dayplayer tables, decisions off | identical to main (`node tools/gates.mjs --pacing` 24/24, same values) |
| G2 | events hash, decisions on and all auto | equal to decisions off, 16 seeds × 6 watched runs (`cargo test`) |
| G3 | replay hash | the existing replay-hash test unchanged; a run with recorded choices replays to its live hash (8 seeds) |
| G4 | gold settlements | `repin --settle --regen` unchanged values with no choices |
| G5 | offline never waits | `advance(8h)`, `runOffline`, `fold`, `send`, `save` with a decision pending give the same result as with none |
| G6 | frequency | ≤ 3 per run, ≤ 1 per floor, 0 on sends 1–2 and in ticks < 300 (hard, tested); share of watched mid-game runs with ≥ 1 decision reported |
| G7 | real choice | per kind, the oracle's best option is a non-default one on ≥ 15 % of scored moments, and no single option is best on > 85 % |
| G8 | fairness | oracle chooser vs default over a 2 h horizon per decision: mean best-depth gain ≤ 1.0 floor, purse gain ≤ +15 %; measured spread reported |
| G9 | prompt | 5000 ± 150 ms to auto at speeds one/fights/fast; frozen under pause (≤ 50 ms drift over 3 s paused); keys 1/2; tap targets ≥ 44 px at 402×681; labels ≤ 3 words |
| G10 | chest | auto-opens within the kill beat (≤ 3000 ms, `fast` ≤ 1000 ms); reduced motion static; fallback when an id is missing; reward equals Rust's |
| G11 | flags | ≤ 1 per 2.5 s, ≤ 6/min in a scripted burst; every flag ≤ 3 words |
| G12 | milestone log | entries match the engine's events for a seeded run; no layout shift at 402×681 when it fills |
| G13 | suite | `cargo test --workspace --profile fast`, clippy `-D warnings`, `tools/verify.sh --quick`, the watch client groups (fights, boss-kill-beat, watch-speed-rate, take-control) and the new groups pass |

The oracle (`examples/decisions.rs`): at every decision of a watched mid-game run it forks the game per option,
runs each fork for a 2 h horizon with decisions off, and scores purse + 50 × best depth. G7 counts the best
option; G8 compares the oracle's chosen fork with the default's.

## 9. Not in scope

Active abilities, cooldown taps, a scrub/DVR, chest choices, shrine prayers by hand, and any offline decision.
