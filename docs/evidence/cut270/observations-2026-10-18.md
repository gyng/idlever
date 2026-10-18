# Cut 270 observations — 2026-10-18

Build: branch `cut270-live` (based on `main` 4adcb94a), WASM `879b4577…` (fast build, `tools/wasm.sh`). Agent's own review.
No owner or player feedback is recorded here. Shelf life: revalidate after any change to the watch (`web/src/ui/watch.ts`),
the decision kinds (`crates/idlever-core/src/decide.rs`) or the chest art.

## 1. Automated measurements (native)

- **Default equals today.** `tests_cut270::auto_decisions_are_the_run_with_decisions_off`: 16 seeds × 6 watched runs,
  live decisions on with every decision auto-resolved against live decisions off. The events JSON and hash, the lineage
  wire and the save are identical. 87 decisions were met across the 16 seeds (2 to 10 a seed).
- **Choices replay.** `chosen_decisions_replay_and_respect_the_caps`: 8 seeds × 5 runs, option 2 always chosen. Each
  choice is on the capsule at its tick (`Input::Pick` / `Input::Bail`), and `Game::replay` reproduces the tapped events'
  hash. The caps held: ≤ 3 a run, one a floor, none before tick 300. Met: 48 cache, 9 boss, 7 hurt.
- **A choice changes only its own branch.** `a_choice_changes_only_its_own_branch`: up to the decision's tick, the events
  match the auto run byte for byte. A cache pick is the item found (13 checked); turning back ends the run as a return
  (3 checked).
- **Offline never waits.** `offline_never_waits_on_a_decision`: with a decision open, `advance(1 h)`, `run_offline(1 h)`
  and `bail` each give the same save as auto-resolving first. A held `step(50)` advances no tick and returns no events.
- **Not on the first sends.** Run ids 1–2 open none (8 seeds).
- **Chest.** A Warlord kill on a fresh lineage reports `crownsplitter`, `legendary`.
- **Gold settlements** (`tools/repin.mjs --settle --regen`, manifest `settlements-inputs-879b.json`): Gold, ledger and
  ExitLine are unchanged on 4/4 entries; expected values and after-saves are unchanged on 4/4; none regenerated.
- **Workspace:** `cargo test --workspace --profile fast` 1077 passed, 0 failed, 6 ignored; clippy `-D warnings` is clean.

### Oracle (`examples/decisions.rs`, G6–G8)

The input was 180 dayplayer camp saves (`DP_SAVE_DIR`, IDLE / IDLE30 / PICKED, seeds 1–6, days 1–10, the first check-in
of each day), with 3 watched runs from each. Before each run, recovery was played out on the open app's clock. At every
decision the game forks once per option. Each fork plays a 2 h horizon of `advance` with decisions off and is scored
`purse + 50 × best depth`. The main line always takes the default.

| kind | n | options differ | best is non-default | top option's share | oracle Δ best depth | oracle Δ purse |
|---|---|---|---|---|---|---|
| cache | 652 | 515 | 285 (55 %) | 45 % | +0.06 | +162 (+0.3 %) |
| boss | 477 | 398 | 148 (37 %) | 63 % | +0.01 | +138 (+0.3 %) |
| hurt | 5 | 4 | 2 (50 %) | 50 % | +0.00 | +7 (+0.3 %) |
| all | 1134 | | | | **+0.04 floors** | **+151 (+0.3 %)** |

Frequency: 540 runs, 496 (92 %) with at least one decision, at most 3 in a run, mean 2.1 a run.

Caveat: forks diverge chaotically, because a different item changes every later roll. "Options differ" therefore
includes luck, and the oracle gains are an upper bound for a player who sees the future. A real chooser gains less.

## 2. Client (headless SwiftShader, `web/tests/live-decisions.mjs`, fake engine `?decide=1`)

- Labels are ≤ 3 words. The default is marked `auto`. While the prompt is open the picture stands (t30 → t30 over 3 s).
- ⏸ for 3 s: the prompt stays open and its countdown stands (3612 → 3612 ms left). After resuming, the auto-pick came
  after 5317 ms of watched time (headless). The SwiftShader main thread overshoots its 50 ms timer, so the headless
  result is ~300 ms over the 5000 ms target, outside G9's ±150 ms.
- Key `2` picks option 2 by hand. On a 402×681 touch viewport, a tap on `Turn back` (each button 175×44 px) ends the
  run as a return.
- At 402×681 the stage and console do not move while the milestone fold fills, because the fold is closed and fixed.
- The milestone log has one `arrived` entry for each descend event and an exit entry that matches the exit event.
- The chest steps closed → cracked → open and is gone 1.8 s after it opens, inside the kill beat (4 s). Under
  reduced motion it is a still, open chest with its reward. With no art ids it draws the code primitive.
- The flag limiter, in a 2-minute burst of every kind every 400 ms, shows ≤ 6 flags a minute and keeps ≥ 2.5 s between
  flags. Only a boss cuts into the gap.

## 3. Visual review (headed GPU, `tools/browser.mjs` `launchGpu`, private Xvfb; agent's review)

Real WASM. Save: dayplayer IDLE seed 2, day 1, check-in 1 (best D8, the Warlord not yet slain), recovery played out.
Viewports: 1440×900 and 402×681 (`phoneReviewViewport` geometry, touch), text scale 100 %, screenshot captures of the
visible viewport. Files are in `shots/`.

- `real-*-decision.png`: a D5 cache, `Take one` with `sword +1 (auto) · leather +1 · heal potion`. The strip sits over
  the map's lower edge above the console. On the phone it covers the combat log's last lines while it is open.
- `real-*-chest-live.png` is the live moment: the Warlord falls, `GOBLIN WARLORD DOWN` is the beat line, and the chest
  opens over the fight. `real-*-chest-{0000,0400,0760,1100,1700}ms.png` show the same chest (Crownsplitter +2 · +$11,
  legendary) posed at those times of its sequence over the paused kill frame (`decide.ts` `chestPose`). The watch shows
  `Paused` in these frames because ⏸ holds the picture for the pose.
- Interpretation: the reveal reads as a reward. The pixel-cut chest matches the sprites. The legendary ring is subtle
  against the dark floor. The reward pill can overlap the boss's plate for its 1.7 s. Confidence: medium. This is one
  run and one boss, without a human eye.
- Many repeat boss kills drop nothing (`boss_drop`'s 1-in-8 repeat). Those chests open on `no drop`, which may read as
  a let-down; see the open question in the contract.
