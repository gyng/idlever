# Cut235 — later workers lit by visible feats (WIP, parked 2026-10-15)

Owner decision 2026-10-14/15 (Cut231 §5b; package-eval learning #2). Parked by the lead mid-cut: the core, wire, client
and tests are in; the 16-seed pacing pack and the node rows pass; the timeline, the routine full gate, the repin and the
contract doc (`docs/CUT235_FEATS.md`) are **not done**.

## What changed

- `balance.json` `workers.<id>.goal`: `"count"` | `"feat"` (default `count`; validated; the porter and the Scout must
  count). The seven later workers ship `feat`; `need` stays for saves from before. Sweepable
  (`{"grid":{"workers.clerk.goal":["feat","count"]}}`).
- `tree.rs`: `feat_name`, `NodeDef::feat`, `goal_met`, `feat_done`, `note_feats` (called at a run's end before the
  report's offer, `engine.rs`), `Tree.feat_base` (the measure at a chore's first time by hand) and `Tree.feats` (kept once
  met). Fresh trees are `v` 3: a feat worker is lit by its feat or its unchanged fallback only; a `v` ≤ 2 tree (a save
  from before) still lights by its count as well (no player regresses). Feats latch.
- Wire: `WorkNode.goal` (`"feat"`), `feat` (≤ 3 words), `feat_done`; a feat node carries no `count`/`need`/`progress`.
  `NextPill.kind` `"feat"` (`text` = `<worker> · <feat>`, no have/need, no bar).
- Client: `works.ts` (`featText`, `workerProgress` feat path, pill `feat` kind with quiet fallback and no bar, works card,
  silhouettes), `tasks.ts` (tracker line without bar, `data-feat-done`), `town.ts` mark, `ladder.ts`, `fake.ts` stand-in,
  `types.ts`.

## Feat table (shipping)

| Worker | Feat (wire) | Check | Needs the chore by hand first | Fallback (unchanged) |
|---|---|---|---|---|
| apprentice | `forged boss kill` | a band boss kind slain after the first forge step by hand | yes | 30 h |
| clerk | `full haul banked` | a Bank exit (not timed out) keeping ≥ the clerk's price, bank built | no (bank: IDLE never builds) | 36 h |
| drillmaster | `levelled new best` | a new record after the first stance level by hand | yes | 36 h |
| kennel_hand | `pet levels up` | a pet of the run's party gains a level on it, kennel built | no (kennel: IDLE never builds) | 40 h |
| herald | `swapped quest kept` | a quest kept after the first swap by hand | yes | 40 h |
| guide | `deep start record` | a new record after a waystone start (> D1) picked by hand | yes | 44 h |
| kennel_keeper | `bred pup fielded` | a run's party holds a bred pup (gen ≥ 1) after a breeding by hand | yes | 48 h |

IDLE does no chore after the Scout and builds nothing, so every feat is unreachable to it and it lights each node by the
fallback exactly as before (idle rows unchanged below).

PICKED node hours, 16 seeds × 3 days (DP_NODES probe, not saved; ready/hired h): apprentice 8–24 (count before: 8–16),
clerk 16–40 (was 40), drillmaster 0.2–0.7 (same), kennel_hand 16–24 (was 40), herald 40 (fallback, as before), guide
40–48 (fallback, as before), kennel_keeper 48 (fallback; no bot breeds). The per-seed "feat hire ≤ count median on ≥
14/16" table is **not yet computed** (`hire-compare.mjs` against `docs/evidence/cut232/timeline-16x14.json`).

## Verified (this worktree, uncommitted core state at commit time)

- `pacing.log`: `node tools/gates.mjs --pacing`, 16 seeds, GATES_THREADS=26 — **24/24 rows PASS** incl. cadence30
  (gap 0.0 · 0.0 · dec 1 · 16/16), picked-idle 1.50 · 2.00 · 3.42, tuned-picked 1.17, idle-delta +0 h, automation-pays
  D18 48 vs 48 h · mean best 29.67 vs 29.27, workers-daily 31.03 vs 30.84.
- `nodes-rows.log`: nodes-lit 0 · 0 PASS; nodes-bought 0 (9 hired by day 14) PASS (16 seeds).
- `cargo test -q --workspace --profile fast`: 938 + new; after fixing `tests_cut120` and adding `tests_cut235` (6 tests)
  the targeted lib tests pass (tests_cut235, tests_cut120, balance: 17/17). A full workspace rerun after those edits was
  not done.
- `cargo clippy --workspace --all-targets -D warnings`: clean.
- Client: fmt:check, lint, tsc, copy-lint (0 violations) pass. Targeted: worker-first-act (feat leg: real wire shows the
  apprentice's feat; pill/tracker/card undone, met ✓, hire flip; 320/400/1440), cut120, worker-purchases, first-plot PASS.
- `client-routine.log` (`pnpm -s test`): 39/40; **glossary FAIL** (journal window height 254 < 300). It fails the same
  way against the main checkout's own dev server (:5219, no Cut235 code), and journal-earned fails its panel-overflow
  assertion there too — pre-existing, not Cut235. `--failed` had no prior state to rerun from.
- WASM (fast build, untracked pkg): `72d4391d…`, 6913734 bytes.
- GPU screenshots (private display) at 400/1440: `feat-undone-*` (real engine played from seed 3 to the apprentice's feat
  goal: `apprentice · forged boss kill · or 28h`), `feat-*-tracker-open-*`, `feat-pill-*`, `feat-tracker-*`, `feat-met-*`
  (met shape overlay), `feat-works-*` (works sheet; drillmaster card shows `levelled new best · or 34h`). Script:
  `shots.mjs`.

## Not done — next steps

1. Timeline: `target/fast/examples/dayplayer --bots idle,picked,daily,away --seeds 16 --days 14 --threads 28 --timeline
   docs/evidence/cut235/timeline-16x14.json`, then `node tools/timeline-summary.mjs …` and
   `node docs/evidence/cut235/hire-compare.mjs docs/evidence/cut232/timeline-16x14.json docs/evidence/cut235/timeline-16x14.json`.
   Report PICKED's days 2–7 major-beat gap (base 48 h; target ≤ 24 h). Expectation: feats light hires earlier (day 1),
   so they are unlikely to close the day 3–4 hole alone; rank days (`tree.rank_days`) are the likely lever.
2. Routine full gate: `GATES_THREADS=26 node tools/gates.mjs --full`.
3. Full `cargo test -q --workspace --profile fast`.
4. `node tools/repin.mjs --dir docs/evidence/cut235 --note "Cut235 feats" --settle [--regen]`, then
   `cd web && node tests/run.mjs gold-settlements`.
5. Write `docs/CUT235_FEATS.md` (contract + gates as above), update HANDOFF and CUT231 §5b status.
