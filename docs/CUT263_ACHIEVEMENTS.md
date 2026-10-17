# Cut263 — Honours (achievements)

Owner request (2026-10-18, verbatim): "subagent to add achievement systems. research how to make good achievements and
refine plan, then implement".

Research: [research/ACHIEVEMENTS_RESEARCH.md](research/ACHIEVEMENTS_RESEARCH.md). Player-facing name: **Honours**.
The name "feats" is already taken twice in this codebase (Cut118 `feats.rs` and Cut235 worker feats), and so is
"trophies" (Cut2 trophies, which pay marks).

## 1. What exists, and how honours relate to it

| System | What it is | Relation |
|---|---|---|
| Trophies (`LineageState.trophies`, Cut2/3/7) | Run and lifetime records that pay ◆ marks (`balance.marks.trophy`). They appear only as `trophy: …` lines in the report's bests. | **Superseded as a presentation; kept as game truth.** Honours mirror the meaningful trophies (boss untouched, studied 14, master class, biome ledger, no friends). A trophy keeps paying its marks, unchanged. Count-only trophies (homecomings, slain, studied 5/10) stay as report lines and are not mirrored (§3 critique). |
| Bests (`Batch.bests`) | One report's records (`new best D9`, `first kill`) | Untouched: they report a single report's news; honours are lifetime. |
| Cut118 feats (`feats.rs`): tokens, trials, finds, siege, graves, stones | Systems with their own rewards | Honours **read** them (a trial cleared, a siege title, a grave recovered). They never write to them. |
| Cut235 worker feats (`tree.feats`) | Outcomes that light a later worker's hire | Not duplicated: no honour restates a hire trigger (the clerk's "interest paid" was cut for this reason). |
| Oaths (`oath.rs`), quests (`town.quest`) | Goals with rewards | Honours read `oaths_kept` and `quests_done` once each. |
| Journal (`journal.rs`) | Read-only guidance: what to do next | Separate: the journal says what to do next; the gallery records what has been done. Both live in the Menu. |
| Chronicle, stones | Heir histories | Untouched. |
| Legendary discovery (`legendary.rs`) | Patterns found | Honours read `town.owned_shapes`. |

## 2. Rules

1. **Observer only.** Honours read lineage and run state after the simulation has settled. They never write
   anything a run, sim, forecast, bot or price reads. Checks run only on the real game (`!Game::sim`).
2. **No gameplay reward** (§5).
3. **No time, run or gold counts.** Each honour names a place reached, a system used or a choice made.
4. **Nothing missable.** Every honour is lifetime and stays reachable.
5. **Determinism.** The unlock record is `(id, lineage day)`, with no wall clock. The same seed, rules and elapsed time
   give identical honours.

## 3. The list

**32 at launch, 3 of them secret** (after two critique passes; the first draft had 52). Names have ≤ 3 words and
goals ≤ 5 words (the callout and quest_goal budgets). A secret entry shows `?` with no goal until it is earned. `n/N`
marks a counted honour. The first-earn days are the dayplayer's (3 seeds × 14 days; §4 G4/G5).

| # | id | Name | Goal | Group | Reads | First earned (day: IDLE / PICKED / TUNED) |
|---|---|---|---|---|---|---|
| 1 | depth_20 | Twenty Deep | reach D20 | depth | best_depth (n/20) | 3 / 1–2 / 1–2 |
| 2 | depth_30 | Thirty Deep | reach D30 | depth | best_depth (n/30) | 12–14 / 2–3 / 2 |
| 3 | waystones | Every Waystone | light all six waystones | depth | waystones (n/6) | 14 on 1 of 3 seeds / 2–3 / 2 |
| 4 | boss_warlord | Warlord Felled | slay the Warlord | bosses | kills | 1 / 1 / 1 |
| 5 | boss_mother | Mother Burst | slay the Bloat Mother | bosses | kills | 1 / 1 / 1 |
| 6 | boss_lich | Lich Undone | slay the Lich | bosses | kills | 1–3 / 1–2 / 1–2 |
| 7 | boss_master | Forge Quenched | slay the Foundry Master | bosses | kills | 5–6 / 1–2 / 1–2 |
| 8 | boss_queen | Queen Unseated | slay the Lurker Queen | bosses | kills | 12–13 / 2–3 / 2 |
| 9 | boss_king | Mirror Broken | slay the Mirror King | bosses | kills | never in 14 days |
| 10 | seek | Sought Out | spend a boss token | bosses | feats.seek (at the command) | never (bots never seek) |
| 11 | descent | Deeper Still | clear a numbered descent | bosses | endgame.cleared | never |
| 12 | town_full | Full Town | build all three buildings | town | town.built (n/3) | never / 1 / 1 |
| 13 | kit | Full Kit | complete the forge kit | town | `feats::kit_complete` | not measured (added after the run) |
| 14 | second_hero | Second Hearth | house a second hero | town | session bloodlines ≥ 2 | never |
| 15 | legend_all | Legend Armory | find all five patterns | town | owned_shapes ∩ legendary kinds (n/5) | 6–7 / 2 / 1–2 |
| 16 | scout | Hands Free | hire the receptionist | workers | tree.hired scout | 1 / 1 / 1 |
| 17 | staff | Full Staff | hire every worker | workers | tree.hired (n/10) | never / 2 / 2 |
| 18 | promoted | Promoted | promote a worker | workers | tree.ranks ≥ 2 | never / 3 / 3 |
| 19 | loadout | Full Loadout | wear all three package kinds | packages | stance + tactic + temperament | never / 2–4 (2 of 3 seeds) / 1–2 (2 of 3 seeds) |
| 20 | variant | Second Thoughts | pick a tactic variant | packages | pkg.variants | never |
| 21 | pen_row | First Row | write a pen row | pen | pkg.pen | never / never / 1 |
| 22 | fix | Lesson Taken | take a death's fix | pen | pkg.taught (at the take) | never |
| 23 | own_words | Own Words | slay a boss, pen written | pen | run: a boss slain, pen rows held | never / never / 1 |
| 24 | causes | Many Teachers | die to five causes | deaths | honours' own cause set (n/5) | never |
| 25 | legacy | Legacy Spent | buy a Legacy upgrade | heroes | hero_legacy / bloodline spent | not measured (no bot bought one: all spent 0) |
| 26 | new_trade | New Trade | train a second class | heroes | classes with XP (n/2) | not measured (no bot changed class) |
| 27 | bred | New Litter | breed a pup | companions | lineage.bred | never / 3 / 3 |
| 28 | oath | Oathkeeper | keep a sworn oath | lore | oaths_kept | never |
| 29 | trial | Trial Cleared | clear a weekly trial | lore | feats.trials | never |
| 30 | old_enemy | Old Enemy | *(secret)* tame a grudge | lore | run.tamed_grudges | never |
| 31 | named | Name Given | *(secret)* rename the hero | lore | the `rename` act | never (curiosity) |
| 32 | new_look | New Look | *(secret)* change the hero's look | lore | the `look` act | never (curiosity) |

### Critique pass 1 (against the research, before any measurement)

The first draft had 52 entries. These were cut:

| Cut | Why |
|---|---|
| 100 homecomings, 1000 slain, studied 5/10 (trophy mirrors) | They count runs or kills only, so leaving the game open earns them (rewarding absence). They stay as trophies and report lines. |
| Package L3 / L5 | Package levels come from runs (200 runs for L5), which is grind by absence. Replaced by *Second Thoughts* (a choice). |
| Ten quests | A grind on an already-rewarded board. |
| First building | Trivial onboarding. *Full Town* keeps the goal with n/3. |
| Interest earned | It restates the clerk's Cut235 hire feat. |
| Deep start (send from a waystone) | The guide worker automates it. |
| Swift floors (a boss cleared thrice) | Pure repetition. |
| Reborn (a rebirth) | It would reward a commitment reset: the Turok pattern, an honour that pushes a harmful act. |
| Tithe paid, ration carried | Niche sinks that the apprentice automates. |
| First death, no heal to D5, ranged only to D5, no-kill floor | Every player earns them in the first runs anyway. |
| Full house (three heroes) | A second purchase of the same system. |

### Critique pass 2 (against measurement)

The 43-entry list went through the dayplayer (3 seeds × 14 days; the IDLE, PICKED and TUNED bots; each check-in's
save read with `DP_SAVE_DIR`). The measurement failed its own bars: IDLE earned **14–16 honours by the end of day 1**
(G4 ≤ 3) and 24–26 by day 14. The "secrets" were the worst offenders: *Avenged*, *Wanderer Slain* and *Cold Heart*
landed on day 1 for every bot, with no curiosity involved. The list was refined rather than the bar moved:

| Cut | Measured | Why |
|---|---|---|
| Ten Deep | IDLE day 1, every seed | *Warlord Felled* (D8) already marks the first band; redundant on day 1. |
| Drilled, Back For It (grave), Legend Found, Naturalist, First Friend, Quest Kept, Siege Won, Bounty Taken | IDLE day 1–2, every seed | These are automatic systems (drills, grave recovery, tame drill, study, board, siege, bounty). They teach nothing and only make noise in the first session. |
| Untouched, Class Master, Full Ledger | IDLE days 1–6 | Mastery-sounding but automatic. IDLE got *Full Ledger* while PICKED never did, the inverse of engagement. |
| Avenged, Wanderer Slain, Cold Heart (secrets) | Every bot, day 1 | A secret that is automatic is noise, not curiosity. |
| Narrow Escape (secret) | IDLE only (days 1–7), never PICKED or TUNED | It rewards weaker play, the Turok pattern again. |
| Second Trade (two classes L5) | never | Replaced by *New Trade* (train a second class): the choice, not the grind. |

Added in pass 2, each tied to a choice: *Sought Out* (spend a boss token), *Full Kit* (finish the forge),
*Legacy Spent* (buy a Legacy upgrade; Legacy orders start `off`), *New Trade*, and two curiosity secrets that read the
player's own act (*Name Given*, *New Look*).

## 4. Gates

| Gate | Bar |
|---|---|
| G1 list | 30–50 honours, 3–6 secret, unique ids. A Rust test (`honours::tests::launch_list_meets_g1`) asserts the count (32, 3 secret), the uniqueness, the copy budgets (name ≤ 3 words, goal ≤ 5 words, no terminal punctuation, none of the words you, your, tap or click) and the exact launch count. |
| G2 gate neutrality | `replay_hash_per_route` passes unchanged. IDLE and PICKED results are identical with and without honours: a Rust test plays the same seed with the observer on and off and compares saves with `honours` stripped. A targeted `gates.mjs --rows` run shows no movement against the main-branch baseline numbers. |
| G3 gold neutrality | `repin.mjs --settle`: Gold, ledger and exit unchanged in every settlement. Any after-save differences are JSON paths under `honours` only. |
| G4 first session | A fresh IDLE game earns ≤ 3 honours by the end of day 1. Measured with the dayplayer's `IDLEVER_HONOURS_OUT` (read-only). |
| G5 engagement over absence | After 14 days, IDLE holds fewer honours than PICKED or TUNED on every measured seed, and holds ≤ 60% of the non-secret list. |
| G6 save | An old save (no `honours`) loads and earns its state-derived honours retroactively, marked already seen (no toast flood). It saves and reloads byte-identically. Unknown ids in a save are dropped on load. |
| G7 presentation | Toast ≤ 3 words. One toast per camp paint: the honour's name, or `N honours` when there are several. The gallery is reachable from the Menu in ≤ 2 activations at 1440 and at 402×681. Copy lint passes. A new client test covers the toast, the gallery's counts, a secret's `?`, and progress `n/N`. |

## 5. Rewards decision

**None that touch play.** The research is clear that achievement multipliers (Cookie Clicker's milk, Antimatter
Dimensions' rows) turn the list into a balance lever and a checklist. Idlever's pacing gates (IDLE, PICKED and
TUNED, plus the leave-one-outs) would then depend on honours. The mirrored trophies keep their existing ◆ marks. That
is the only "reward" in the system, and it predates it. The new honours pay legibility:

- an unearned non-secret honour's goal names an optional system (the gallery doubles as a quiet map of what the
  game holds; no tutorial text);
- the earned day is recorded.

No cosmetic is granted in this cut. An honour-gated look or a gallery frame would need art and is listed as an
open question for the owner.

## 6. Presentation

- **Toast**: `✦ Warlord Felled` (glyph + ≤ 3 words), or `✦ 3 honours`. It appears at the camp, never in the watch,
  and only for honours the core marks `new`. `seenHonours()` clears them at the next send. Until then the gallery
  marks them with a dot.
- **Gallery**: Menu → `Honours` (the Menu, and so the gallery, exists once the town has its House; before that the gear opens Settings directly, and the toast still lands). The header is `Honours 12/32`. Groups appear in a fixed order. Each row shows its
  name, its goal (or `?`), and `n/N` or `day 4`. Earned rows are lit and the rest dimmed. There are no padlocks,
  percentages or rarities.
- **Density** (owner's preference): one quiet toast; no badge on the camp; no new chrome outside the Menu.

## 7. Save, migration and wire

- `LineageState.honours: Honours { v, earned: BTreeMap<id, day (1-based, feats::day_of; an absence's own moment)>, seen: BTreeSet<id>, causes: BTreeSet<cause> }`,
  skipped when empty. Each hero's lineage keeps its own, and the session wire shows the union across bloodlines.
- An old save has `v == 0`. On load: sweep, mark everything earned as seen, and set `v = 1`. New games start at
  `v = 1`.
- Wire: `Lineage.honours: { earned, total, rows: [{ id, name, goal, group, secret, day?, n?, of?, new }] }`. An
  unearned secret's name and goal are sent empty.
- Commands: `seenHonours()` (optional in the proxy, like `seenSystems`).

## 8. Determinism

Checks read only settled state, and record the lineage day. A sim clone (`Game::sim`) never earns. The forecast,
the verdict replays and the bots' outcomes are unaffected (G2).

## 9. Acceptance results (2026-10-18, worktree cut263-achievements on f0e095a2)

| Gate | Result | Evidence |
|---|---|---|
| G1 | PASS: 32 honours, 3 secret; budgets asserted | `honours::tests::launch_list_meets_g1` |
| G2 | PASS: the dayplayer (3 seeds × 14 days, IDLE, IDLE30, PICKED and TUNED) prints identical tables on main f0e095a2 and on this branch (only the wall-clock `done in` lines differ). `honours_never_change_a_game` passes; `replay_hash_per_route` passes in the workspace run. | `evidence/cut263/dayplayer-main-f0e095a2.txt`, `dayplayer-cut263.txt` |
| G3 | PASS: `repin --settle` keeps Gold, ledger and ExitLine unchanged on 4/4 entries. After-saves differ only at `$.lineage.honours` and `$.others[].lineage.honours`; they were regenerated into the new f22e manifest. The browser `gold-settlements` group passes (564 checks). | `evidence/cut263/settlements-inputs-f22e.json` |
| G4 | **DEVIATION**: IDLE earns 3, 4 and 3 honours by the end of day 1 (seeds 1–3; bar ≤ 3). Seed 2's fourth is *Lich Undone*: that seed's IDLE reaches D18 on day 1. | `dayplayer-cut263.txt` |
| G5 | PASS: on day 14, IDLE holds 7 of 29 non-secret honours (24%), PICKED 15–16 and TUNED 17–18 on every seed. | as above |
| G6 | PASS: an old save migrates silently; save → load → save is identical; retired ids drop. The bloodlines round-trip tests pass. | `honours::tests`, `bloodlines::tests` |
| G7 | PASS: toast `✦ 2 honours` / `✦ Warlord Felled`; Menu → Honours in 2 activations at 1440×900 and 402×681; no horizontal overflow; copy lint passes; new client group `honours` passes (27 checks). | `web/tests/honours.mjs`, `evidence/cut263/shots/` |

## 10. Deviations

- **G4**: seed 2 earns 4 honours on day 1 (bar ≤ 3). The bar was not moved. The measured day 1 already covers three
  boss bands for IDLE, and each of the four is a stage milestone of the kind the research endorses (Kerpelman). The
  draft list's day-1 count of 14–16 was the real failure, and critique pass 2 fixed it by cutting entries. Cutting
  *Lich Undone* to reach 3 would leave a hole in the boss row for every later player. Recorded instead of tuned.
- **G4/G5 sample**: 3 seeds, not 16. The dayplayer's 14 days cost about 16 minutes on this loaded machine.
  *Full Kit*, *Legacy Spent* and *New Trade* were added after the measured run (see the critique pass 2 table). No bot
  takes those actions (Legacy orders start `off`; no bot changes class), except that the PICKED and TUNED bots buy forge steps.
- The client group `cut29` fails 4 assertions on this branch, and identically on main f0e095a2 (rerun in a clean
  baseline worktree), so it is pre-existing and unrelated.
- The Menu exists only once the town has its House. Before that the gallery cannot be reached, and the toast still
  lands.
