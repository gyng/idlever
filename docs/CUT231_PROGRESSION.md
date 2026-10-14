# Cut231 — progression improvements (owner-queued 2026-10-14)

Source: docs/research/PROGRESSION_COMPETITORS_2026-10.md §5 (22 comparables). Owner: "queue up progression
improvements". Cut230 (earlier Scout after 2 sends + depth-scaled death recovery) covers proposals 1 and 3 and
lands first. Every item keeps the hard invariants (Rust owns truth; nothing punishes absence; IDLE taps only until
the Scout; offline uncapped after the Scout) and is gated at **16 seeds** on the rows it touches, not only the
routine 2-seed gate.

| # | Item | Gate (numeric) | Status |
|---|------|----------------|--------|
| 1 | First automation ≤5 min; Scout ≤8 min every seed (Cut230) | `scout` worst ≤8 min 16/16; `porter` ≤5 min | in progress (Cut230) |
| 3 | Depth-scaled death recovery; short early waits (Cut230) | runs in first 30 min ≥4 every seed; tuned-picked ≥1.15; picked-idle; idle-* | in progress (Cut230) |
| 5 | Next-worker progress on its trigger ("2/3 sends"); later rungs from counts to feats (time fallback for IDLE kept) | worker-first-act/journal journeys show live progress; `nodes-lit` ≤48 h | client part landed (below); feats proposed (5b) |
| 2 | Pre-Scout absence pays: a small capped camp chest (≤2 h of first-floor gold), no sends; cap vanishes with the Scout | new row "IDLE absent pre-Scout returns gold > 0"; `conserved`; return-pick journey shows the line | queued after Cut230 |
| 4 | Explicit unlock cadence: a beat every 3–5 min for 30 min, then ~1 h, 3 h, 8 h, d1, d2, d4, d7; never two decisions at once | dayplayer unlock-timestamp dump; row: max gap in first 30 min ≤6 min, simultaneous decisions ≤1; `picked-stages`/`idle-stages` | Cut232 (CUT232_CADENCE.md): decisions ≤ 1 **16/16** (was worst 5, 0/16); gap med 6.0 · worst 7.4 min, 8/16 (was 6.4 · 9.1) — single watched runs > 6 min; bar options with the lead |
| 6 | A second hero on day 1–2 (IdleOn's idle lever) | bloodline founding median ≤ day 2 on IDLE/PICKED; no pacing regressions | queued |
| 7 | Away forecast names where the hero will stall (Stone Story †) | forecast journey shows the stall floor; matches real stall ≥80% | queued |
| 8 | Faster replays of cleared floors after a death | time to regain previous best after death ↓ ≥30%; King guard holds | queued |
| 9 | Automation never gold-walled (earned, not bought) audit | audit table; no automation rung behind a pure price | queued |
| 10 | Early first-Legacy payoff +50–200% (Pecorella prestige rule) | first Legacy spend measurably speeds the next D13 | queued |
| 11 | Offline stays uncapped: add rationale line to AGENTS.md invariant | doc only | queued |

Cut230 landed (main 3ee50b3e); the timeline is measured: research doc §6 (table), §6a (cadence), §6b (re-ranking). Earlier
note: after Cut230 lands, measure Idlever's own timeline (first automation, core loop fully automated, first reset,
first new mechanic, offline unlock) from dayplayer/client runs, fill §6 of the research doc, and re-rank.

## Item 5 — next-worker progress (client part, landed)

The wire already carries everything the count needs; no core change was required. Each unhired worker node
(`Lineage.tree.nodes[]`, `WorkNode`) has `count` / `need` (chores by hand / trigger), `progress` (`"2/3"`, the core's own
string), `fallback_h` and `eta_h` (hours until the fallback lights it; absent once ready or with no fallback), and
`Works.next_worker` names the worker the town works toward. The client draws them read-only, no new taps:

- **`next` pill** (`ui/works.ts nextPill`): a `count` goal names its chore — `apprentice · 2/3 steps · or 20h`; a `send` or
  `chest` goal (each advances a worker) carries the count quietly beside it — `send · scout 1/3` — and the send's bar is the
  scout's share. The fallback is dim (`.pill-eta`), `or 3d` from 48 h.
- **Works sheet** focus card: `2/3 steps · or 20h` beside the bar (`.wn-eta`).
- **Task tracker** (`ui/tasks.ts`): the dark `workers` rung under Control gets the focus's bar and fallback; once that rung is
  lit the next counting worker rides the Town group as one line (`Apprentice — 2/3 steps · or 20h`, thin bar; tap opens the
  works on it). Never twice: a Town journal entry for the same worker wins.
- Journey: `web/tests/worker-first-act.mjs` second leg — real engine, fresh seed 3: the send pill shows the scout's wire count,
  the tracker's Town line the porter's; a real send moves the scout to `1/3` on the wire and in the pill; a wire-shaped
  fixture checks the count pill, tracker line, works card and the lit state at 400 and 1440.

Evidence: `docs/evidence/cut231/` (GPU, 400 and 1440).

## Item 5b — later rungs from counts to feats (proposal, not implemented)

Round 2 and the comparables (Increlution counts punished; AD challenges, Trimps void maps praised): "automation rewards a
feat, not a repetition count". The Porter and the Scout keep counts — they teach the chore itself (the Scout moves to 2
sends in Cut230). From the Apprentice on, a count of the same tap is arbitrary; each worker's trigger becomes one feat that
shows the chore mattering, and **the time fallback stays exactly as it is** so IDLE (no picks) still lights every node, and
`nodes-lit` stays ≤ 48 h (the largest fallback is the kennel keeper's 48 h).

Current values from `crates/idlever-core/src/tree.rs NODES` (chore counted by `tree::did`):

| Worker | Gate (chore opens) | Current trigger | Fallback | Candidate feat trigger (≤ 3 words on the wire) | Feat check (core) |
|---|---|---|---|---|---|
| apprentice | blacksmith built | 3 forge steps by hand | 30 h | `forged kit wins` — a run with a hand-bought forge step reaches a new best depth | a new best on a run whose kit holds a step `did("forge")` bought |
| clerk | bank built | 3 deposits by hand | 36 h | `interest paid` — a hand deposit earns its first nightly interest | first night with bank interest > 0 after a hand deposit |
| drillmaster | — | 2 stance levels by hand | 36 h | `levelled wall falls` — a wall the hero died at is cleared after a hand level | a `walls[]` entry slain after a `did("level")` |
| kennel_hand | kennel built | 2 pets fielded by hand | 40 h | `pet lands kill` — a hand-fielded pet kills on a run | first run kill credited to a pet fielded by hand |
| herald | quest board | 2 quest swaps by hand | 40 h | `swapped quest done` — a quest taken by a hand swap completes | quest completion whose quest came from `did("swap")` |
| guide | waystones | 3 waystone starts by hand | 44 h | `deep start pays` — a waystone start reaches a new best depth | a new best on a run started below D1 by hand |
| kennel_keeper | kennel built | 2 breedings by hand | 48 h | `bred pet fields` — a pup bred by hand is fielded on a run | a run whose party holds a pet from `did("breed")` |

Rules kept: a feat lights the node exactly as the count does now (`ready()`), one lit at a time in the tree's order; the
fallback lights it untouched; a hired worker's feat is never re-asked. Each feat is a real outcome of the chore, never a
new chore or tap.

Wire the client would need for feats (core adds after Cut230; the client then shows `forged kit wins · or 30h`):

| Field | Type | Meaning |
|---|---|---|
| `WorkNode.goal` | `"count" \| "feat"` | which trigger the node uses (absent = `count`, today's) |
| `WorkNode.feat` | `string` (≤ 3 words) | the feat's name, drawn where `2/3 steps` is drawn now |
| `WorkNode.feat_done` | `boolean` | the feat is met (the node is then `ready`/`lit` as with a count) |
| `NextPill.kind` | add `"feat"` | the pill's goal is a feat (`text` = `<worker> · <feat>`, no `have`/`need`, no bar) |

Gates for 5b when built: `nodes-lit` ≤ 48 h (16 seeds); IDLE unchanged within a check-in (it reaches every node by the
fallback); PICKED reaches each feat-triggered hire no later than its current count median on ≥ 14/16 seeds; the
worker-first-act journey shows the feat text and its flip to the hire.

## Item 4 — unlock timeline and the first-30-min cadence (measured, not tuned)

Tooling (diagnostic; the dayplayer is an example, no core change):

- `dayplayer --timeline FILE`: per configuration × seed, each beat's first player minute (`SeedOut.timeline`, from
  `note_beats`/`beats_now`, read-only), the first session's length, the milestone hours. Summarize with
  `node tools/timeline-summary.mjs FILE [--bots IDLE,PICKED] [--json OUT]` (median, p10, p90, worst, reached).
- Invariance: `node tools/timeline-invariance.mjs BASE_KEY NEW_KEY --labels IDLE,IDLE30,PICKED` compares two job caches
  with the timeline fields dropped — 48/48 identical, IDLE/PICKED 16 × 14 vs base 3ee50b3e
  (`docs/evidence/cut231/timeline/invariance.log`).
- Row `cadence30` ("First-30-min cadence"; `node tools/gates.mjs --full --rows cadence30`, 62 s at 16 seeds, first
  session only). A targeted bar; the routine table prints it as `info` until it passes, so it is kept out of the routine
  gate. Definitions of beat, decision and look: research doc §6a.

| Measure (PICKED, 16 seeds) | Bar | Current |
|---|---|---|
| Longest major-beat gap, first 30 player-min | ≤ 6 min every seed | median 6.4 · p90 8.0 · worst 9.1 min; 8/16 pass |
| Most new decisions in one look, first 30 min | ≤ 1 every seed | median 3.5 · worst 5; 0/16 pass (with each reveal's own offer merged into it: median 3 · worst 5; 0/16) |
| Longest major-beat gap, days 2–7 (info) | — | 48 h (all seeds): after D33 and the King's first try (median 2.0 d) only worker ranks (4.7 d) |

The pile-ups and candidate content fixes (stagger the first return's stance level; split the Forge/Kennel plots off
"four delves"; move the Legacy offer off the reveals; one beat at about 16–18 min; temperaments one per look) are in research
doc §6a. Proposing to add `cadence30` to the routine gate once it passes (it is cheap).
Evidence: `docs/evidence/cut231/timeline/`.

## Owner order 2026-10-14 (after the measured timeline, research §6b)

All four selected; run in sequence (each touches core pacing and is verified at 16 seeds before the next):
1. **Cut232 first-session cadence** — implemented ([CUT232_CADENCE.md](CUT232_CADENCE.md)): one new decision a report; decisions ≤ 1 on 16/16 (was 0/16); gap ≤ 6 min 8/16 (worst 7.4, was 9.1) — every remaining failure is a single watched run > 6 min; gap-bar options proposed to the lead. picked-idle D13 1.50 kept; all 30 other targeted rows PASS at 16 seeds.
2. **Feats for later workers** (§5b plan; time fallbacks kept for IDLE) — next.
3. **Second hero on day 1–2** — a natural day-1/2 bloodline beat the default players use (answers the day-2 cliff).
4. **First reset payoff** — a day-1 reset-like moment (default Legacy order or a spend at the first death; +50–200%).

## Package-eval cross-check (2026-10-15)

The whole-package grades ([research/PACKAGE_REPORT_2026-10.md](research/PACKAGE_REPORT_2026-10.md),
[research/PACKAGE_GRADES_2026-10.md](research/PACKAGE_GRADES_2026-10.md)) cover 14 competitors and
Idlever. They put Idlever's long-arc **pacing at 45, the only load-bearing gate it fails**. The field
median is 48; Antimatter Dimensions scores 80 and Increlution 68. This supports the owner order above:
the second hero (3) and the first reset payoff (4) are package-eval learning #1, the feats (2) are #2,
and the cadence (1) is #3. A new numeric target follows from the comparison: PICKED's day 2–7 max
major-beat gap must fall to ≤ 24 h (now 48 h). The other proposals (a codex, UI defects, worker
scenes, an audio pass) are in docs/WORK_QUEUE.md under "Package-eval proposals".
