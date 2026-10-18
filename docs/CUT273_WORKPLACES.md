# Cut273 — Workplaces: every worker comes from building or upgrading their workplace

Status: **W1 landed** on branch `cut273-workplaces`, based on main 7c4c9ef1 after the Cut272 town-glow merge. See §11
for results. W2 (Cut265 effect levels) is still a plan. This cut absorbs Cut265: its levels become workplace levels,
and its effect levels sit on top of the staff levels (§2b).

Owner (2026-10-18, verbatim): "guildhouse is a bit odd should maybe be build guildhouse -> recep arrives. porter is
hired by building the ingame gem/chest apprentice hired by building forge?"

Owner decisions (2026-10-18):

- **All workers come from building or upgrading their workplace.** Building a workplace brings its first worker.
  Upgrading it (the Cut265 levels) brings the next one.
- The tent, board and crate become small buildable plots.
- The Forge is still built free at the 4th delve, and steps are still bought by hand. **Forge L2 (about the
  Apprentice's current price, $600) brings the Apprentice.**
- Build the Guildhouse → the Receptionist arrives. Build the in-game chest → the Porter arrives.

## 0. The rule this cut keeps

Building a workplace is the same act as hiring its worker, with a new name. It has the same gate, the same trigger,
the same price and the same one-offer-at-a-time order (`tree::lit`). Only the words, the place and the picture
change. Building or levelling a workplace calls `tree::hire` and nothing else. Because of that, the bots' timelines
match the old ones exactly, by construction (§2). The ledger reason stays `hire <id>`. Gold settlements, the
night-net exclusion and the save bytes therefore do not move.

## 1. The map

Workplaces are `town::WORKPLACES`, a new table beside `BUILDINGS`. `BUILDINGS` itself is unchanged, so the bots'
`build_town` loop and the beat list stay the same. A workplace's level is derived: whether its L1 stands, plus the
staff hired there. The only stored value is a bought effect level (§2b). There is no second source of truth, and
§4 needs no rewrite of `tree.hired`.

| Worker (person) | Workplace (name ≤ 2 words) | Arrives at | L1 stands when | Post on the scene |
|---|---|---|---|---|
| quartermaster (Aletta) | **Supply crate** | the crate's L1, which comes with the House | the House is built (by hand, as today) | crate |
| porter (Lili) | **Haul chest** (new plot, by the mouth) | build the Haul chest | it is built (by hand) | mouth (chest) |
| scout (Arina) | **Guildhouse** (new plot: the guild service becomes a building) | build the Guildhouse | it is built (by hand) | guild desk |
| guide (Habo) | **Guildhouse** | Guildhouse L2 | — | guild (was mouth) |
| apprentice (Namari) | **Forge** | Forge L2 | four delves; free (as today) | blacksmith |
| clerk (Kraft) | **Bank** | Bank L2 | a night's purse; free (as today) | bank |
| drillmaster (Thors) | **Drill tent** (new plot: today's tent) | build the Drill tent | it is built (by hand) | tent |
| kennel_hand (Nora) | **Kennel** | Kennel L2 | tame a pet; free (as today) | kennel |
| kennel_keeper (Ginko) | **Kennel** | Kennel L3 | — | kennel |
| herald (Luna) | **Quest board** | Quest board L2 | the first quest; automatic (as today) | board |

### Shared posts

- **Guide and Porter at the mouth.** The Porter keeps the mouth: the Haul chest stands there (`CHEST_AT`). The Guide
  moves to the Guildhouse as its L2. The Receptionist books the delve and the Guide picks where it starts, so one desk
  covers both. No new plot or sprite is needed.
- **Two Kennel workers.** Kennel L2 brings the hand and L3 brings the keeper. That is the tree's own order: the hand
  lights at 40 h and the keeper at 48 h.

### Deviations from the owner's examples (measured from the source, not a taste call)

1. **"Build the Kennel and the Kennel hand arrives" becomes Kennel L2.** The Kennel's L1 must stand before the hand.
   Her chore and feat (fielding a pet by hand, then the pet levels up) need the kennel system, and
   `systems::triggered("kennel")` is `town::built("kennel")` (`systems.rs:119`). Moving the free L1 build to the
   hand's trigger (her feat or 40 h, plus 3.0 units) would delay pets for PICKED and TUNED. Making the hand free at
   the taming would bring automatic pets forward. Both options move pacing. **Kennel L2 → Keeper becomes Kennel L3.**
   This follows the owner's own pattern for the Forge: L1 free as today, L2 brings the worker.
2. **The Bank follows the same pattern.** The free L1 is the deposit chore's object, so the clerk comes at L2.
3. **The Quest board's L1 stays automatic.** The board is the quest's own hit target before the herald
   (`ui/town.ts:948`, `hooks.quest`). A manual L1 would cut IDLE off from quests, since IDLE never taps after the
   Receptionist, and that moves IDLE. The herald comes at L2. Alternative: a new "Herald's post" plot (owner
   question 2).
4. **The Supply crate comes with the House.** The quartermaster is given at founding (`Tree::fresh`), and the crate is
   already drawn with the House (`render/town.ts:2298`). A separate tap would add a hire to the first look, which adds
   `HIRE_S` to the dayplayer's first session (owner question 1).

The Drill tent, Haul chest and Guildhouse are true new plots. Each is drawn as a staked plot (`town_plot`) while
its worker is lit, and as the building once he arrives.

### The order and the gates (unchanged)

Only `tree::lit`'s node has a buildable workplace, so there is one BUY at a time and the tree's order holds. A level
needs its L1 to stand. That is already true, because each worker's `chore_open` gate is its L1
(`tree.rs:517-523`: forge/bank/kennel built, quests open). Worker ranks still offer only when no build is lit
(`lit_rank`).

## 2. Pacing neutrality by construction

### 2a. Gates and prices equal the hire's (tuning/balance.json `workers`; unit = 100 + 25 × depth)

| Build | `need` | `goal` | `fallback_h` | Price (`price_tenths`) | ≈ $ at D4 / D8 / D13 |
|---|---|---|---|---|---|
| Supply crate (with the House) | — | given | — | 0 | free |
| Haul chest | 3 hauls | count | — | 0 | free |
| Guildhouse | 0 | count | — | 0.1 u | $20 / 30 / 42 |
| Forge L2 | 3 | feat: forged new best | 30 | 3.0 u | **$600** / 900 / 1275 |
| Bank L2 | 3 | feat: interest paid | 36 | 4.0 u | $800 / 1200 / 1700 |
| Drill tent | 2 | feat: levelled floor clears | 36 | 0.4 u | $80 / 120 / 170 |
| Kennel L2 | 2 | feat: pet levels up | 40 | 3.0 u | $600 / 900 / 1275 |
| Quest board L2 | 2 | feat: swapped quest kept | 40 | 2.0 u | $400 / 600 / 850 |
| Guildhouse L2 | 3 | feat: deep start record | 44 | 4.0 u | $800 / 1200 / 1700 |
| Kennel L3 | 2 | feat: bred pup fielded | 48 | 3.0 u | $600 / 900 / 1275 |

These are the existing keys. No key is renamed, so balance profiles, `IDLEVER_BALANCE_JSON` sweeps and `tools/tune.sh`
still apply. Prices use the locked unit (`kit::unit_of`), exactly as the hire's do.

**Core.** `Game::build_workplace(place)` resolves to the lit worker of `place`'s next staff level and calls
`Game::hire`. A place with no lit staff level is refused with "not ready". `Game::hire` stays as an alias for old
callers (tests, the dev history ring, the opening probe). It has no extra rule, such as hero-home, beyond the hire's
own rules.

**Bots.** `camp_taps` (`dayplayer.rs:584-613`) replaces `g.hire(n.id)` with
`g.build_workplace(town::workplace_of(n.id))`. The same lit node is chosen, at the same price and in the same order,
so `t += HIRE_S × Δhired` is the same. The opening probe's `Act::Hire` is relabelled `Act::Build` with the same call.

**Proof (gate).** For IDLE, PICKED and TUNED on 16 seeds × 14 days, the dayplayer's `SeedOut` (the `--rows` jobs'
cached JSON under `target/gates/dp`) must be **field-for-field identical** before and after. The fields include
`node_open_h`, `node_ready_h` and `node_hired_h` (the worker-arrival hours), `scout_min`, `porter_min` and the beats.
A table of each worker's median arrival hour per bot is recorded before and after in `docs/evidence/cut273/`. Any
difference is a defect in this cut, never a tolerance.

### 2b. Cut265's effect levels layer on top (a later phase, with Cut265's own gates)

These levels move PICKED and TUNED by design. They are therefore phase **W2** and keep Cut265 §4's rows
(`upgrades-sink`, `bank-payback`, `picked-l-king`, `tuned-picked ≥ 1.15`, and leave-one-out with S = buildings).
IDLE never buys them. They are stored in `Town.levels` (id → bought effect level; default none), and their price is
fixed at the gate depth: `price_units × unit(gate_depth)`.

| Workplace | Staff levels | Effect levels (Cut265) | Max |
|---|---|---|---|
| Bank | L2 clerk | **L3** cap 3 → 5 nights (D13, $3,400) · **L4** → 8 nights (D23, $13,500) | 4 |
| Clone vat | none (a service) | L2 / L3 hurry −25 % / −50 % (needs Cut264) | 3 |
| Kennel | L2 hand · L3 keeper | **dropped** (recommended; see below) | 3 |
| Forge | L2 apprentice | Cut265 B3 salvage −20 / −40 % as L3 / L4, only if the owner keeps B3 | 2 (4) |
| Guildhouse, Haul chest, Drill tent, Quest board, Supply crate | staff only | none | 2 / 1 |

**The Kennel effects are dropped.** Kennel L3 is the Keeper. Folding the bench XP (25 → 50 → 75 %) and lameness
(3 → 2 → 1 runs) into L3 would give the Keeper's arrival a pacing effect. PICKED buys the Keeper, so that would break
§2a's identity. An L4 would be a fourth tier for a convenience. Neither is worth it now.

W2 starts only after W1's identity proof passes and Cut264 has landed. W1 carries no effect level and no vat level.

## 3. The IDLE invariant

IDLE "taps only until the scout is hired". After this cut, that tap is **build the Guildhouse**, at the same moment
and price, with the same effect on `auto_send`. IDLE keeps one more existing exception unchanged:
`camp_taps`' trunk rule also builds the free **Haul chest** when the Porter lights in an `auto_collect` town. That is
true of every save after `gold_v` 1. It is today's porter hire under its new name and remains free. IDLE never
builds the Forge, Kennel or Bank (`camp_taps` builds BUILDINGS for arms 2 and 3 only), so it never reaches a staff
level, as today. It never buys an effect level (§2b).

## 4. Save migration

- Workplace levels are derived from `tree.hired`. A save with hired workers therefore loads with their workplaces
  built and at the matching level. Examples: the scout hired → the Guildhouse stands; the guide → Guildhouse L2;
  the keeper → Kennel L3. Nothing is charged and nothing is lost: the purse, chest, bank, ranks and perks are
  untouched.
- One defensive repair at load (`save::load`, after `tree::upgrade`): a hired worker whose L1 is a town building that
  is not in `town.built` gets it built on its hire day. Such a save is possible only from an odd multi-resident or
  legacy state. The building's look and systems then match its staff. A test covers it.
- `tree::upgrade` (v0 saves → `LEGACY` hired) and `tree::grant` need no change.
- `Town.levels` (W2) defaults to empty. An old save has no bought effect level, and its looks never regress
  (`look = max(derived look, level)`).
- Tests: `tests_cut273.rs`.
  - A v0 save, a Cut258 save with the scout and porter hired, and a late save with all ten workers hired load with
    the expected levels and identical gold, ledger and `tree`.
  - Save → load → save is byte-identical.
  - `build_workplace` refuses a non-lit place and leaves the save unchanged.

## 5. Worker ranks II–IV

**Recommendation: ranks stay as they are** (`tree::rank_wait`, `rank_price`, `promote`, `ranks_act`, rank days
[2, 4, 8], and perks). They are the worker's own growth and are already in the pacing rows (Cut260 moved rank IV to
day 8). The alternative, moving ranks onto building levels, would give every workplace 4–5 levels, and those would
collide with Cut265's effect levels. It would also change `picked-stages`, the opening probe's upgrade counts (a rank
with an edge is an upgrade) and the rank-order automation. That is a larger cut with its own gates. Out of scope.

## 6. UI

- **Plots.** The lit worker's workplace is the scene's buildable target:
  - For a new plot (Haul chest, Guildhouse, Drill tent), a staked `town_plot` at its spot.
  - For a level, the standing building itself.
  - When affordable, it carries Cut272's ready shimmer (`view.highlight`/`data-ready`) and the one lantern marker,
    labelled `Build $N` / `Build free`, or `Upgrade $N` for a level (label ≤ 2 words).
  - Its tooltip (≤ 10 words) reads `Guildhouse · Receptionist arrives · $30`.
  - The greyed lit worker standing at his post goes away. Nobody stands at an unbuilt workplace.
- **The arrive beat.** A successful build plays the building's build beat, followed by the worker walking in from the
  mouth to her post. The callout over the well reads **`LILI ARRIVES`** (2 words), replacing `LILI HIRED`.
  - The name comes from the post-build wire: `person` is empty until hired (owner rule, 2026-10-18). Before the build,
    every surface shows the role, or the workplace for a plot, and never the name.
  - Reduced motion shows no walk, only the callout.
- **Works tree and journal.** Node and entry titles read `Build the Guildhouse · auto runs`,
  `Build the Haul chest · auto haul`, `Upgrade the Forge · auto forge`, and so on: the action and workplace, then
  the worker's beat in lower case.
  - The works node's button is `Build $N` / `Upgrade $N`.
  - The journal action kind becomes `build_workplace` with the place id. `hire` stays accepted by the bridge.
  - The Guild reception body becomes `Build the Guildhouse to book delves while away.`. This is a service body, the
    same surface as today's line.
- **No separate hire buttons.** Remove these:
  - the town's `Hire $N` marker on the worker target (`ui/town.ts:625-640`);
  - the works sheet's Hire button (`hireNode` is renamed `buildNode`);
  - the check-in routine kind `hire`, which becomes `build`.
- **Copy budgets.** Labels and buttons ≤ 2 words, callouts ≤ 3, tooltips ≤ 10, node tips ≤ 4. No sentences in
  chrome. `tools/copy-lint.mjs` must pass.
- **Wire.**
  - `WorkNodeWire` gains `workplace` (id), `workplace_name` and `level` (the level the build makes).
  - `TownWire` gains `workplaces: [{id, name, level, max, staff: [worker ids], plot?: {worker, price, affordable}}]`.
  - `WorkerPost.lit` stays, for old clients, but the client no longer draws it.
  - `types.ts` and `fake.ts` follow.

## 7. Art

Every sprite id here has a primitive fallback (`render/town.ts`'s box/stroke draw for an id with no atlas frame;
the UI's text plate).

| Id | Need | Status |
|---|---|---|
| `town_plot` | the staked plot for the Haul chest, Guildhouse and Drill tent | exists |
| `town_haul_chest` (+ `_full`, `_open`) | the Haul chest once built | exists |
| `town_service_guild` | the Guildhouse once built | exists |
| `town_tent` | the Drill tent once built (today's tent, now gated on the drillmaster) | exists |
| `town_board` | Quest board L1 | exists |
| `town_kennel_2`, `town_kennel_3` | Kennel L2 and L3 looks | exist |
| `town_blacksmith_2`, `town_bank_2` | Forge L2 and Bank L2 looks (`max(derived, level)`) | exist |
| `town_service_guild_2` | Guildhouse L2 (the Guide's map sign and lantern) | **generate (Codex)**; fallback: L1 art |
| `town_board_2` | Quest board L2 (the Herald's bell on a post) | **generate (Codex)**; fallback: L1 art |
| `town_drill_dummy` | the Drill tent's straw dummy and weapon rack, so the tent reads as a drill tent | **generate (Codex)**; fallback: none drawn |

The three new sprites are optional looks. The cut ships on the fallbacks if Codex output fails art QC
(`art/art-qc.py`, `docs/CUT267_ART.md`).

## 8. Gates and validation

| Gate | Bar |
|---|---|
| Neutrality identity (§2a) | IDLE, PICKED and TUNED `SeedOut` identical, 16 seeds × 14 days |
| `node tools/gates.mjs --pacing` | 24/24, the same values as on base |
| Opening probe (`examples/opening.rs`, 16 seeds) | G1–G6 identical to base: G1 0.0 · 0.0, G2 28.9 · 38.2 (owner-approved deviation), G3 6 · 5, G4 2.6 · 4.9, G6 0.0 · 1.0 |
| `node tools/repin.mjs --dir docs/evidence/cut273 --note "Cut273 workplaces" --settle --regen` | gold settlements unchanged; each diff explained |
| Save migration | `tests_cut273.rs` (§4) |
| Core | `cargo test --workspace --profile fast`; clippy `-D warnings` |
| Client | `tools/verify.sh --quick`; groups `works`, `cut305`, `worker-first-act`, `home-services`, `town-ux`; new `workplaces` group (below) |
| Copy | `tools/copy-lint.mjs` |
| Visual | 1440 × 900 and 402 × 681 (phone review viewport) screenshots: a ready Guildhouse plot, the arrive beat, Kennel L3; dated observation note |

The new `workplaces` client group has three tests:

1. Build → arrive. On a fresh town, the House is built, then the Guildhouse plot shimmers when affordable. A tap
   builds it. `LILI`/`ARINA ARRIVES` shows, the name appears only after the build, the scout is hired and the Guild
   service is available.
2. Level. Forge L2 shows `Upgrade $N`, and building it brings the Apprentice.
3. No hire buttons. No `Hire` label or button exists on any surface.

## 9. Phasing

- **W1 (this cut).** Core: the workplace table, `build_workplace`, derived levels, the wire and the load repair.
  Bots relabelled. Client: plots, the arrive beat, copy, and the hire surfaces removed. Optional art. §8 gates.
- **W2 (later, after Cut264).** The Cut265 effect levels: Bank L3/L4, Vat L2/L3, and Forge B3 if kept. Cut265 §4's
  rows apply.

## 10. Owner questions (recommended default first)

1. Supply crate: comes with the House, and Aletta arrives at the House build (default). The alternative is its own
   free tap after the House, which moves the opening by one `HIRE_S`.
2. The Herald's workplace: Quest board L2 (default). The alternative is a new "Herald's post" plot (one sprite).
3. Kennel effects from Cut265: dropped (default). The alternative is an L4.
4. Worker ranks: they stay (default). The alternative is to move them to building levels in a later cut.

## 11. Results (W1, 2026-10-18)

Evidence is in `docs/evidence/cut273/`: `neutrality/`, `pacing-pack.txt`, `settlements-inputs-71df.json`,
`screens/` and `observations-2026-10-18.md`.

| Gate | Result |
|---|---|
| Neutrality identity | **identical**. `dayplayer --bots idle,picked,tuned --seeds 16 --days 14` with `DP_NODES=1` was run on base 4adcb94a and on this branch. The output differs only in its wall-clock line. Every per-seed milestone hour and every worker's open/ready/hired hour match (`neutrality/README.md`). |
| `gates.mjs --pacing` | **24/24 PASS**. `tuned-picked` 1.17, PICKED/IDLE 1.50 · 2.75 · 3.30, scout med 2.6 · worst 4.5 min, porter 8.4 · 13.6 min. |
| Opening probe | **identical to base**: G1 0.0 · 0.0, G2 28.9 · 38.2 (owner-approved deviation), G3 6 · 5, G4 2.6 · 4.9, G6 0.0 · 1.0. |
| Repin | `settlements-inputs-71df.json`. Gold, ledger and ExitLine unchanged 4/4. `expected` and after-saves unchanged 4/4, with 0 regenerated. Browser `gold-settlements` 564/564 PASS. |
| Core | `cargo test --workspace --profile fast`: 1079 passed, 0 failed (`tests_cut273.rs` adds 4). Clippy `-D warnings` is clean. |
| Client | `workplaces` (new), `town-ux`, `home-services`, `worker-purchases`, `worker-pause` and `gold-settlements` pass. `cut305` fails 9 checks and `worker-first-act` fails 1. Both fail identically on main 7c4c9ef1, so these failures are pre-existing (the auto-collect chest and the Cut258 scout `need` 0). |
| `verify.sh --quick` | Format, lint, tsc and copy-lint pass, and the Rust tests pass. `fun-eval.test` fails 2 in any worktree, because the sibling `../eval-fun` checkout is missing; main fails the same way. |

**What landed.**

- **Core.**
  - `town::WORKPLACES`, `workplace_level` (derived), `workplaces_wire` and `repair_workplaces` (load).
  - `Game::build_workplace`; the `WorkNodeWire` fields `workplace`, `workplace_name` and `level`; `TownWire.workplaces`.
  - The Guild reception is available once built.
  - The journal and pills name the workplace: `Build the Guildhouse · auto runs`, `Forge II · forged new best`.
  - The Guide's post is the guild.
- **Bridge.** `buildWorkplace`, plus the native codegen.
- **Bots.** `camp_taps` and the opening probe call `build_workplace`.
- **Client.**
  - The lit worker's workplace is the target. A plot draws `town_plot` at its spot; a level shimmers on its building.
    A tap builds it when affordable.
  - The arrive beat reads `LILI ARRIVES`.
  - Labels read `Build $N` / `Upgrade $N`. The tooltip reads `Guildhouse · receptionist arrives · $N`.
  - The works button reads `build · $N` / `upgrade · $N`.
  - Ledger words read `build guildhouse` / `rank scout`; the ledger itself keeps `hire <id>`.
  - Drawing: the Haul chest stands once built, the Drill tent and dummy stand once built, and Guildhouse II and
    Quest board II use their L2 art.
- **Art (Codex).** `town_service_guild_2`, `town_board_2` and `town_drill_dummy` are packed. Art QC passes. Each has a
  primitive fallback.

**Deviation from §6.** The check-in routine keeps its internal kind `hire`, with the label now naming the workplace.
Renaming it would touch saved-UI tests for no player-visible change.
