# AGENTS.md — operating manual for Idlever

**Resuming? Read `docs/HANDOFF.md` first.** Read `PLAN.md` (canonical design) and `docs/CUT30_5.md` (the current implementation contract),
then this file.

## What the game is

A real roguelike whose hero you never drive. The hero climbs on his own while you are away;
you equip packages (stances, tactics, temperaments: pre-written rule bundles that level from
runs), build a town, and late on open the pen to write your own rows. Town chores begin by hand; hire named workers to automate them. The first few sends are
manual, until the scout is hired (within the first session). In-run chores stay silent.
Then runs happen offline, uncapped. Every death names its cause. The dungeon has a bottom.

```
town (packages, buildings, works, forecast; the pen late) → send → run (rows fire, facts learned, drills)
   → checkpoint: secure gold → exit on remaining carry: bank 100% · return 100% · death 0% → death screen (trace, gap/dice, patches)
   → report (learned · bests · found · deaths · workers · chest · reel) → camp
```

## Repo map

```
crates/idlever-core/    all game truth; examples/metrics.rs = the gate table; examples/cli.rs = text playtest
crates/idlever-wasm/    thin JSON bridge (wasm-bindgen camelCases: run_offline → runOffline)
web/src/engine/        types.ts (wire), fake.ts (UI dev), wasm.ts (real), pkg/ (built)
web/src/ui/            camp, watch, death, report, settings
web/src/render/        three.js replay viewer (pixel pipeline); render-demo.html
art/                   ART.md, manifest.json, prompts/, generated/, tiles/, pack.py
tools/                 verify.sh, gates.mjs, copy-lint.mjs, art-qc.py
eval/                  idle fun-eval presets, template, calibration, copy budgets
docs/                  FUN_EVAL_IDLE.md, CUT*.md
research/              the four research reports behind the plan
```

## Local setup

Install Rust, Node.js 22 and pnpm 10 (the CI versions). From the repository root:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked --version 0.13.1
pnpm --dir web install --frozen-lockfile
tools/wasm.sh --ship
tools/dev.sh
```

Open http://localhost:5219/. The first engine build takes longer. After a Rust
change, use `tools/wasm.sh` for a fast rebuild. Use `?engine=fake` for interface
work without the real engine. Rust owns game state and rules; the client displays
state and sends choices. Every rendered sprite must have a primitive fallback.

## Formatting, lint and development references

Oxfmt and Oxlint use default rules. Formatting excludes generated engine files
and raw saved test fixtures. CI and tools/verify.sh check formatting and lint.
Clippy uses its default rules with warnings denied.

```sh
pnpm --dir web fmt
pnpm --dir web fmt:check
pnpm --dir web lint
pnpm --dir web lint:fix
cargo clippy --workspace --all-targets -- -D warnings
```

Read docs/HANDOFF.md before resuming work. It records passing checks, failed
runs and remaining limits. The alpha has routine mechanical acceptance; the
separate exhaustive audits and fun-rating goal remain unfinished.

| Area         | References                                   |
| ------------ | -------------------------------------------- |
| Design       | PLAN.md, docs/CUT30_5.md                     |
| Current work | docs/HANDOFF.md, docs/WORK_QUEUE.md          |
| Art          | art/ART.md, docs/ART_DIRECTION.md            |
| Validation   | docs/DEV_VALIDATION_TIERS.md, eval/RATING.md |

## GitHub Pages releases

Pushes, pull requests and manual workflow runs validate the site. Publishing a
versioned GitHub release deploys its exact tagged build to
https://gyng.github.io/idlever/. Prereleases deploy through the same workflow.
A push alone does not deploy. The github-pages environment permits `v*` tags;
production deployments serialize. See docs/CUT187_ALPHA_RELEASE.md.

Current brand: Idlever; repository `gyng/idlever`, Pages base `/idlever/`.
`IDLEVER_BASE` selects the build base. Active crates, generated WASM names,
browser globals, events, storage keys and diagnostics use Idlever identifiers.
No old-brand aliases or saved-setting migration are required by the owner.
Preserve historical evidence and prior tags. The current local checkout path
is still `/home/g/p/riddle`. See docs/CUT190_IDLEVER_RENAME.md.

## Validation and iteration commands — use the cheapest that answers the question

```sh
tools/verify.sh --quick        # tests (fast profile) ∥ format/lint + tsc + copy-lint
tools/tune.sh <row-ids>        # content iteration: full seed counts, targeted requirements, fail-fast; --list lists rows; never a full gate pass
node tools/gates.mjs --pacing [--fail-fast] [--balance P]   # pacing pack: --full --rows of every row that has broken at 16 seeds (picked-idle, scout, porter, tuned-picked, idle-*, stalls-*, …); cached; never the gate
node tools/sweep.mjs --name N --grid G.json --rows a,b [--objective row[@i][:min]] [--threads 32]   # parallel balance sweep: candidate profiles via IDLEVER_BALANCE_JSON (no recompile), fail-fast, resumable; ranked target/sweep/N/results.md
node tools/repin.mjs --dir docs/evidence/cutN --note "…" [--settle [--regen]]   # after a core change: wasm.sh, hash, new gold-settlements manifest + default; --settle replays the saved settlements natively; --check only hashes
node tools/camp-check.mjs SAVE... [--record DIR|--compare DIR] # saved-camp feedback: three 8h native replays ~4 s warm; --mode packages,wall for tuning searches; diagnostic, never the gate
node tools/choice-check.mjs SAVE --choices boss_focus,kite_archers,bold --out NEW_DIR # actual next8h baseline/choice outcomes from one saved Session (~1–3s warm first-boss fixture); --balance PROFILE; diagnostic only, docs/DEV_CHOICE_CHECK.md
node tools/save-history.mjs export --port 5347 --index 0 --out S.json   # dev save history (Shift+T panel, window.__idlever.history): ring entry ↔ native-loadable save; docs/ITERATION_SPEED.md §0i
tools/native-dev.sh                                         # real Rust dev UI on :5367; rebuild native, no wasm packaging; docs/NATIVE_DEV.md
# IDLEVER_BALANCE_FILE=<profile> IDLEVER_NATIVE_PORT=5368 tools/native-dev.sh: compile-free validated tuning
# tools/tune.sh <rows> --resume: internal check-in checkpoints, exact runtime/parameters only
tools/verify.sh                # + clippy → wasm (fast) → web build → quick gates   ~2 min + the quick gate (cached: seconds; fresh after a core edit: ~30–40 min, below)
tools/verify.sh --full         # shipping + bounded current-game regression suite (18 fortnight cases); docs/UX_SIMPLE.md
tools/verify.sh --exhaustive   # explicit 272-case balance/migration audit; about an hour fresh
cargo test -q --workspace --profile fast                     # ~36 s warm (CPU-bound on the cores); never plain `cargo test` (7× slower)
node tools/gates.mjs [--full|--fast] [--fresh] # routine: current-game metrics,10 wire seeds,18 current-player fortnight cases (--full); --exhaustive: original272 cases and30-seed statistical audit. --fresh ignores caches; GATES_THREADS=N caps parallelism. Each genuine completed leg and exact runtime/harness job is cached separately.
node tools/gates.mjs [--full] --rows <ids|substrings> [--fail-fast] [--seeds 8 …]   # TARGETED, a tuning loop's check, never the gate: the dayplayer on the named rows alone — only the bots, seeds and days they read, each game stopped at its row's milestone; --fail-fast plays seeds lowest first and aborts on the first row settled FAIL (an every-seed row's first failing seed, a median the seeds left cannot rescue), naming the seed and value. `target/fast/examples/dayplayer --rows ?` lists the row ids (docs/ITERATION_SPEED.md §0h)
(cd web && pnpm -s test)                                     # routine critical-journey client subset; docs/DEV_VALIDATION_TIERS.md
(cd web && node tests/run.mjs --smoke --failed|--resume)      # rerun failed/unfinished groups, or skip identical-identity passes (HEAD+dirty+wasm sha); state in target/client-tests/; reused passes print ok*, never fresh evidence
(cd web && pnpm -s test:full)                                # current client audit (125 groups); release / pre-blind acceptance
(cd web && pnpm -s test:exhaustive)                          # historical full client inventory (167 groups), all original widths
tools/wasm.sh [--ship]                                       # fast wasm (~8 s after a core edit) / wasm-pack release (~2 min)
tools/ship.sh [--preview]                                    # cohort build on :5230 (fat LTO, ~2 min); --preview: fast wasm, ~25 s, for QA rounds
cargo run -q --profile fast -p idlever-core --example cli -- --seed 1 --rules crates/idlever-core/presets/good.json --runs 3
cargo run -q --profile fast -p idlever-core --example timing -- 1 8   # where a gate job spends its time
node tools/profile-catchup.mjs SAVE --out scratchpad/profile     # headed shipping-WASM CPU profile; --hours N --runs N
tools/dev.sh                                                 # ensure the Vite dev server on :5219 (never restart a running one)
node tools/playtest.mjs [--seed N] [--absent 8h] [--out dir] # scripted walk of every screen, text + screenshots, headed on the GPU (~30 s; --headless ~65 s)
node tools/driver.mjs --dir scratchpad/<who> --port 5347 [--headed] &   # one browser context across an agent session; tools/drive.sh 5347 '{"op":"text"}'
node tools/rater-checkpoint.mjs save|status|restore --dir scratchpad/<who> [--port N] # rater/QA checkpoints: save export + progress; a dead rater resumes (eval/RATING.md, eval/RESUME_PROMPT.md)
node tools/gfx-eval.mjs --out DIR --resume                   # skip moments already captured in DIR (partial.json kept after each moment)
node tools/browser.mjs --probe                               # must print D3D12 (NVIDIA …); --headless prints SwiftShader
python3 art/pack.py && python3 art/art-qc.py
eval/score.sh eval/cards/<card>.json
```

Dev URL params (dev build only): `?seed=N&fresh=1`, `?absent=8h`, `?rules=<text>`, `?speed=4`,
`?autosend=1`, `?engine=fake`. Game at `http://localhost:5219/`.

Cost facts: a death verdict is ~0.1 s native single-threaded (candidates × 12 reseeded replays;
~0.02 s across the cores, `forecast::par_map`), ~1 s in wasm; the gate table samples verdicts
(3–8 per seed) for that reason. `runOfflineQuick` skips it per slice; the client calls `death(id)`
once at the end of an absence. Forecast panels and verdict replays run on all cores natively
(`forecast::parallel_sims`; `metrics.rs` turns it off because it fills the machine by seed);
results are bit-identical to the sequential order. 8 h offline ≈ 0.4 s of ticks (3 µs/tick, a
third of it the chores' floods).

## How work gets done

1. Write a contract (`docs/CUT<n>.md`) with numeric gates.
2. Build core / client / renderer / art in parallel; they meet at the wire types.
3. Gate it. Never weaken a gate to pass it; tune content, or record a deviation with a reason.
4. Fun-verdict playtest on the `idle-hybrid` preset (`docs/FUN_EVAL_IDLE.md`); the gaps
   become the next contract.

## Hard invariants

Owner economy amendment2026-10-13 (Cut196): accepted found-item pickups convert
their value once into carried Gold. Alive Bank/Return credit100% of remaining
carry; Death credits secured Gold plus explicitly named protection. Return
XP/renown remain60%. Physical loss/recovery never subtracts or pays the same
converted value again. No new Keep decision or exit salvage payment is created.
Storehouse/worker retirement, saved kits and pacing validation remain pending.

Owner amendment2026-10-14 (Cut227): death recovery is12000 ticks (20 min;
was600) so TUNED keeps its D33 lead; package L5 needs200 runs (was220). Routine `--full` plays RANDOM and PICKED
on16 seeds for the RANDOM-vs-PICKED row alone (`--random-seeds16`).

Owner amendment2026-10-04: routine full checks use18 current-player cases;
the16-seed statistical balance/migration invariants below remain in the explicit
exhaustive audit. Routine success does not certify that omitted audit.
New towns and unbuilt legacy plots require manual construction.

- All game truth in Rust. TS renders and edits only.
- Determinism: same seed + rules + elapsed ⇒ identical events. Replay-hash test exists.
- Idle alone progresses (`examples/dayplayer.rs`, 16 seeds × 14 days): IDLE (no picks, no edits)
  reaches D8 on day 1 and D23 by day 12, gold every day, stall ≤ 4 d, and never slays the King
  in a fortnight. Engaging multiplies: PICKED (packages) reaches D13/D18/D23 ≥ 1.5× sooner than
  IDLE and is never out-paced on ≥ 90% of seed × milestone pairs; TUNED (the pen, optional late fine-tuning) beats PICKED by ≥ 15 %
  at D33. RANDOM is slower than PICKED at D13/D23 on the median and on ≥ 14/16 seeds. Nothing is required: removing any one system never leaves a
  bot slower than IDLE on the median seed (± a check-in), no seed > 48 h behind from day 5; each
  system adds value by its own output. Steady is the safest default; every other stance is best
  at some wall. (Cut 30; DEFAULT/EDITED/PASSIVE/LEARNED retired with the pivot.)
- Every death has a cause, a trace and a cheapest lever; `dice` deaths ≤ 5%.
- Facts are learned; policy is chosen, drilled or written — never silent: every drilled row is
  named, announced once, shown and revocable.
- Art never blocks the game: every sprite id has a primitive fallback.
- Copy: callout ≤ 3 words, verdict 1 word, no sentences in chrome (`eval/copy-budgets.json`,
  `tools/copy-lint.mjs`). No tutorial text.
- Offline is uncapped after the scout; before then an absence finishes at most the run in flight.
  Nothing punishes absence; chest gold does not decay and funds restocking. IDLE taps only until
  the scout is hired, then makes no picks or edits; its early delta from Cut 30 is bounded.
- Workers are named in the town and report, with their first act announced. Works replaces tracks.
  Policy rungs stay optional. Automation improves the away player without costing the daily player
  more than one floor of mean best depth (Cut 30.5).
- A record checkpoint secures carry permanently, even on death. The 30% heir purse floor is
  separate from the exit share; never describe death as keeping 30% of the new carry.

## Gotchas

- `/home/g` is itself a git repo. Never stage from the home toplevel.
- Codex writes asynchronously; poll `art/generated/` mtimes to quiescence; run batches
  detached (`setsid nohup`).
- `web/src/engine/pkg` must be a real directory: Vite glob imports skip a symlink and can
  fall back to the fake engine. Production builds and release smoke must verify real WASM.
- After editing Rust, rebuild `web/src/engine/pkg`; the PWA precache is versioned, so verify
  frontend changes on a fresh port.
- `tools/ship.sh` takes ~2 min (fat-LTO wasm + wasm-opt; `--preview` ~25 s). Never pipe it
  (`ship.sh | tail`): the detached preview holds the pipe and the call never returns — redirect
  to a file and poll `curl localhost:5230` (+ a marker string in the served JS). Never wait on
  it with `pgrep -f tools/ship.sh`: the waiter's own command line matches.
- `docs/ITERATION_SPEED.md` ranks what to speed up next (mechanical QA, compound driver ops,
  the history ring, a table cache).
- A stale Vite dev server from a previous day can serve stale transforms; `tools/dev.sh`
  reuses whatever is on the port, so kill it by pid when a walk shows old UI.

## Browser harness (hybrid: headless for text, headed GPU for render)

Owner amendment2026-10-07: **automation must never steal desktop focus**, for any
purpose. Every headed browser uses `tools/browser.mjs`'s private Xvfb display,
not the active WSLg display. The launcher pins X11/DISPLAY and owns Xauthority
and server cleanup; caller overrides cannot route it back to the desktop.
WSL GPU probe still reports D3D12/NVIDIA. If isolation cannot start, fail rather
than opening a foreground window. Keep headless for ordinary DOM/text checks.

`tools/browser.mjs` has two paths. `launchBrowser()` is headless Chromium (SwiftShader WebGL):
the client gates (`pnpm test`: routine subset, four at once; `pnpm test:full`: current feature groups, up to twelve CPU-bounded workers with timing checks isolated; `pnpm test:exhaustive`: historical inventory), QA sessions and anything that reads text and
clicks — fast to start, parallel-safe, no desktop window, audio muted. `launchGpu()` /
`launchBrowser({ gpu: true })` is headed Chromium on a private X display in WSL with Mesa's D3D12 driver forced via
`/usr/lib/wsl/lib`, which reaches the real GPU (`--probe` prints `D3D12 (NVIDIA …)` and `native
scale 1.5`): frame times, render QA, blind raters (feel is rated) and the playtest walk, whose
watch pump is per-frame — headless is pixel-bound (14 fps at 3×, 32 at 2×; the walk takes 65 s
headless vs 26 s headed), so headless sessions render at 2×. `IDLEVER_BROWSER=headed|headless`
overrides callers that pass nothing. Headless cannot reach the GPU whatever the flags (probed:
`--headless=new` + the Mesa env still reports SwiftShader/llvmpipe). WSLg's GDK_SCALE=2 ×
Xft.dpi=144 made headed Chromium think the 4K screen was 1280×720 at 3×; the launch pins
GDK_SCALE=1 and forces the Windows scale (`Xft.dpi/96`, override with `WSL_SCALE=`), hides the
15 px classic scrollbar that made full-page shots 385 CSS px wide, and mutes audio (`--mute-audio`;
WebAudio still schedules, `window.__audio` still sees cues). The Playwright MCP tools are
headless/SwiftShader; do not use them for performance claims.
