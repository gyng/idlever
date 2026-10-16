# Wall-clock attribution — offline/absence path and forecast/verdict/search path

Read-only investigation; **no repo file edited**. Scratch artifacts: `scratchpad/perf-attribution/`
(probe page, runners, raw logs, native mirror harness source) and `/tmp/clientshape/` (the native mirror
crate). Under test: working tree at 2026-10-16 19:0x, `/home/g/p/riddle`.

* Client wasm package `web/src/engine/pkg/idlever_wasm_bg.wasm`, sha256
  `ef4b58d7fb4ab69056c8101ce8e528087bdbf6fb47fb561b8926645aebb4eb79` (fast profile, 6 944 684 B —
  `sha256sum` verified).
* Fixtures: `scratchpad/perf-attribution/deep13.json` (D13 camp, 10 runs/8 h, has a death) and
  `deep1.json` (D11 camp that ends in a stall), both from `scratchpad/cut211-fixtures-final/*.game.json`.
* **Host load** (32-core WSL2 box, 3–5 peers running cargo/browser work throughout): `uptime` 1-min load
  was **5.6–33** across the pass. Recorded per run below. **A warning that matters:** the *same* native
  binary on the *same* input measured `run_offline_quick(8h)` = **0.428 s at load ≈17** and
  **1.06–1.32 s at load ≈32** (2.5–3×). Wall-clock differences under ~10 % are not claimed anywhere in
  this report; the native client-shape numbers are therefore quoted as **process CPU time**
  (`/proc/self/stat`, load-robust), and the wasm numbers as wall time measured at load 6–14.

---

## 1. Measured facts — command → wall time → what it covers

### 1.1 Native (fast profile)

| # | command | time | covers |
|---|---|---|---|
| N1 | `cargo run -q --profile fast -p idlever-core --example timing -- 1 8` (load 8) | `run_offline(8h) 0.41 s`, 39 runs, 270 539 ticks; `verdicts×39 0.74 s (0.019 s each)`; `forecast 0.03 s`; `forecast_refine 0.03 s`; `death() 0.04 s` | a **fresh literal** `Game::new_literal(1)` — full report (stall at 50 sims + a verdict per death). This is the shallow-camp "0.6 s" number's family. |
| N2 | `--example perf_local -- deep13.json 3 8` | median **0.428 s** (load 17), **1.06–1.32 s** (load 32), 216 273 ticks | saved deep camp, `run_offline_quick(8h)`, `set_parallel_sims(false)`, **no** worst-death verdict |
| N3 | `--example sim_perf -- deep13.json offline` | **4.17 s**, 28 forecast sims (load 57–89) | `run_offline(8h)` *full* on the same camp: stall verdict at `FORECAST_SIMS=50` + the worst death's verdict, single-threaded, includes report+save JSON |
| N4 | `--example sim_perf -- deep1.json offline` | **6.73 s**, 104 sims | same, on the camp that stalls |
| N5 | `--example sim_perf -- deep13.json packages` | **30.7 s**, 600 sims, 7 920 851 ticks | the package-picking search (`packages::options`, 50 sims), single-threaded |
| N6 | `--example sim_perf -- deep13.json wall` | **1.39 s**, 69 sims | the wall-edit search |
| N7 | `--example deep -- --load deep13.json --seq` | forecast **455 ms**, refine 437, kit::deltas 1420, cage 2767, **start_forecast 3601** | the camp forecast path, one core (the wasm shape) |
| N8 | `--example deep -- --load deep13.json` | forecast **177 ms**, refine 226, kit 448, cage 847, **start 360** | the same with the native core pool |
| N9 | `/tmp/clientshape` (native mirror of the client's exact call shape), `deep13.json` | loop **489 ms** (cpu 490), death(59) **780 ms**, lineage 2, vocab 0, save 4 ms (1 346 378 B) — total **1269 ms** | 16 × `run_offline_slice(1800, last)` → `death(worst)` → `lineage`/`vocabulary`/`save`, single-threaded. Also: ticks-only slice pass **453 ms**, so the stall verdict ≈ **54 ms**; `run_offline_quick(8h)` 550 ms; `run_offline_slice(8h,last)` 507 ms |
| N10 | `/tmp/clientshape deep1.json` | loop **1285 ms**, no death — ticks-only **408 ms**, so the stall verdict ≈ **771 ms** | the stalled camp, same shape |
| N11 | `/tmp/clientshape deep13.json --parallel` | loop **468 ms**, death **245 ms wall / 1450 ms cpu** | the same shape with the native pool (`par_map`) |

Single-thread → pool ratios (N7/N8): forecast 2.6×, refine 1.9×, kit 3.2×, cage 3.3×,
**start_forecast 10×**, edit forecast 5.6×, edit refine 4.4×, one death verdict 3.2× (N11). The offline
tick loop itself gains only 4 % (489 → 468 ms): it is serial by nature.

### 1.2 Browser — direct wasm, no app (`scratchpad/perf-attribution/run.mjs`, load 6–14)

| wasm call shape | deep13 | deep1 | `FRESH` (`new Game(1)`) |
|---|---|---|---|
| **client shape**: 16 × `runOfflineSlice(1800,last)` then `death(worst)` | **1781 ms** | 1630 ms | 0.4 ms |
| ├ 16 slices all `last=false` (tick work only) | 510 ms | 435 ms | 0.1 ms |
| ├ final-slice settle + **stall verdict** | 255 ms | 1195 ms | 0.3 ms |
| └ **worst-death verdict** `death(id)` | **1013 ms** | — (no death) | — |
| `runOfflineSlice(28800, true)` (one call) | 549 ms | 1405 ms | 0.1 ms |
| `runOfflineQuick(28800)` | 538 ms | 1559 ms | 0.2 ms |
| `runOffline(28800)` (full) | 1568 ms | 2878 ms | 0.2 ms |
| `lineage()` / `vocabulary()` / `save()` after | 2 / 1 / 16 ms | 2 / 0.2 / 5 ms | 1.5 / 0.1 / 0.4 ms |
| per-slice report JSON | **361 B** each, 56 736 B final | 361 B, 53 569 B | 361 B, 786 B |
| `save()` bytes | 1 344 270 | 723 246 | 5 078 |

Grown camps (wasm `__grow`, +48 h of further absence; load 6–13) — the two D23 camps:

| camp | best | ticks | settle+stall | death verdict | client grand total |
|---|---|---|---|---|---|
| deep13+48h | D23 | 634 ms | 126 ms | **1132 ms** | 1893 ms |
| deep1+48h | D23 | 629 ms | 81 ms | **1042 ms** | 1755 ms |

### 1.3 Browser — the real client (`app3.mjs`/`app4.mjs`/`app5.mjs`, `:5219`, `?dev=1`, worker engine)

`await window.__idlever.absence(28800)`:

| fixture | `absence()` wall | wasm calls the absence makes | camp-screen calls issued by the mount |
|---|---|---|---|
| `FRESH` (no scout → nothing runs) | **399 ms** (2 runs: 394/404) | `runOfflineSlice`×16 (33 ms), `lineage`×1, `vocabulary`×1, `save`×1 | `unlocks`×3 (113 ms), `supplyCatalogue`×3 (159 ms) |
| deep13 | **2443 / 2475 ms** | `runOfflineSlice`×16, **`death`×1 (998 ms)**, `lineage`×2, `vocabulary`×1, `save`×1 | `unlocks`×3, `unlockDeltas`×2, `supplyCatalogue`×2, `forecastMove`×1 |
| deep1 | **2864 / 2943 ms** | `runOfflineSlice`×16 (1 080 ms incl. the stall slice), `lineage`, `vocabulary`, `save` | `unlocks`×3, `unlockDeltas`×2, `supplyCatalogue`×2 (415 ms), `forecastMove`×1 |

A/B control (`app5.mjs`): stubbing `unlockDeltas`+`supplyCatalogue` to instant empty answers moves the
absence by only **−154 ms (deep13) / −169 ms (deep1) / −6 ms (FRESH)** — the camp's *background-lane*
measures mostly overlap the absence (see §2.4), they are not additive.

---

## 2. What the client does per slice (the exact mechanics)

`runOfflineChunked` (`web/src/app.ts:934`), `OFFLINE_SLICE_S = 1800`:

1. **16 calls** of `runOfflineSlice(1800, last)`; `last = left <= slice`. (The `OFFLINE_SLICE_MAX_S = 2 h`
   / `OFFLINE_SLICES = 6` growth path only applies to a stale build without `runOfflineSlice`.)
   Per call that is 18 000 ticks (30 min × 10/s); 8 h of budget = 288 000, of which the camp rests a lot —
   `g.batch.turns` after the absence is **216 273** on deep13, i.e. ≈ 13 500 executed ticks per call.
2. Every non-final slice returns `ReturnReport { slice_pending: true, .. }` — **361 bytes** — and the client
   `continue`s, merging nothing. The core keeps the absence in `game.offline_absence` and accumulates
   `elapsed_s`/`consumed`; **no tick is ever redone across slices** (`offline.rs:132`).
3. The final slice settles the whole absence and — the hidden cost — runs the **stall verdict**, because
   `offline::run_offline_slice` calls
   `run_offline_partition(game, s, full=false, with_stall=last, last, transport=true)` (`offline.rs:77`).
4. Then `this.engine.lineage()` (only if the final report carries `worst_death_id`) and **one** `death(id)`
   for the deepest slice's worst death.
5. Then `refresh()` (`lineage` + `vocabulary`), `queueGoldFeedback`, `adoptSets`, `go(report)`, `flush()`
   (`save()`), on top of the camp mount that `absence()` does first.

**Repeated work found:**

* *Stall verdict*: once per absence (final slice only) — but see §2.2, it fires immediately from a
  *persisted* `stall_runs`, so the first 30-min slice of a stalled camp is the expensive one.
* *Worst-death verdict*: exactly once (`app.ts:993`), but it is a ~1 s single-threaded query that the client
  waits for *inside* the absence window, **even though `ui/report.ts:184` already knows how to fetch a
  `death(id)` lazily behind its own `verdict` busy label**, and the report tolerates `worst_death == null`
  (`report_with`/`lead_of` fall back to the death-count line).
* *Mirror syncs*: `lanes.ts` reloads each mirror engine from the foreground's `save()` whenever the
  foreground "gen" changed; `runOfflineSlice` is a mutation, so **every slice bumps `gen`** — a background
  measure issued during an absence always pays a full `save()` (1.3 MB → 16 ms) + mirror `load()`.
* *Camp queries*: `paintAll()` fires `unlocks()`×2–3 and `supplyCatalogue()`×2–3 per absence on the
  **foreground** worker (they are `READ_ONLY` but not in `BACKGROUND`).

**Serialization is NOT a cost driver**: per-slice payload 361 B; a 1.34 MB `save()` serializes in 4–16 ms;
a 128 KB `lineage` in 2–23 ms. The 8.4 s is not JSON marshalling.

### 2.1 Where a D13 absence's 2.44 s goes (measured components)

| part | ms | source |
|---|---|---|
| 16 slices' tick loop | ~510 | micro probe (§1.2) |
| final slice's settle + stall verdict (12 sims) | ~255 | micro probe |
| **worst-death verdict** | **~1010** | micro probe (998 ms in-app) |
| camp mount's foreground `unlocks`/`supplyCatalogue` | ~250–330 | app4 by-name (front of queue) |
| render + `showBusy` + 17 round trips | ~250–400 | app total − engine-only total; the `FRESH` control, which does **no** engine work, still costs 399 ms |

The single largest item is **one death verdict**: 41–64 % of the measured client absence.

### 2.2 The stall verdict

`stall_verdict_with` (`offline.rs:663`) fires when 4+ runs came home in a row: base `reach_counted` panel
plus up to 3 candidates paired on the same seeds (`stall_patches`, `offline.rs:743`) at the client's
`QUICK_STALL_SIMS = 12` ⇒ 12 + 3×12 expeditions at the stall depth.

* wasm: **1195 ms** (deep1/D11) vs **81–126 ms** on the two D23 grown camps (their 8 h produced new facts,
  which resets the stall).
* A single 30-min slice from a *stalled* camp: **1359–1676 ms wasm** — more than that camp's whole 8 h
  minus the stall — because the camp's persisted `stall_runs` already satisfies `STALL_MIN_RUNS`.
* Native single-thread: 771 ms (deep1), 54 ms (deep13).

### 2.3 The death verdict

`Game::death` = `trace::death` (+`feats::memorial`): `compute_verdict` + `compute_deltas`
(candidates × `DELTA_SIMS = 12` **paired** expeditions at the death's depth, plus patch pricing).
wasm 998–1543 ms for one D13–D18 death; native single-thread 780 ms (deep13), 245 ms wall on the pool.
Per AGENTS's cost facts a D28+ death verdict reaches ~2.9 s native single-thread.

### 2.4 Why the camp's *expensive* measures are not the problem (and which ones are)

`web/src/engine/lanes.ts` runs `unlockDeltas`, `kitDeltas`, `cageForecast`, `startForecast`, `forkForecast`,
`forecastMove`, `packageOptions(For)`, `forecastRefine`, `wallEdit`, `deathDeltas` on **mirror engines**
(up to `MEASURE_LANES = 3`, one extra Worker each, `web/src/engine/index.ts:44`) that reload from the
foreground's `save()`. So they run in parallel with the absence — confirmed by the A/B stub control in
§1.3. What *does* queue in front of the slices is the foreground set: `unlocks`, `supplyCatalogue`,
`lineage`, `vocabulary`, `save`, `death`.

---

## 3. The wasm-vs-native gap, with numbers

Same fixture, same call shape, native CPU time vs wasm wall (load 6–14 for wasm):

| item | native, 1 core | wasm, 1 core | ratio |
|---|---|---|---|
| 16-slice tick loop, deep13 | 489 ms (ticks-only 453) | 765 ms (ticks-only 510) | **1.56×** (ticks alone **1.13×**) |
| 16-slice tick loop, deep1 | 1285 ms (ticks-only 408) | 1630 ms (ticks-only 435) | **1.27×** (ticks alone **1.07×**) |
| server-side stall verdict, deep1 | 771 ms | 1195 ms | 1.55× |
| one death verdict, deep13 | 780 ms | 1013 ms | **1.30×** |
| client-shape total, deep13 | 1269 ms | 1781 ms | **1.40×** |
| the whole client `absence()`, deep13 | — | 2443–2475 ms | **1.95×** native client-shape |

**Conclusions (measured):**

1. **Single-threaded wasm costs only ~1.1–1.3× native single-threaded** on this path (ticks 1.07–1.13×,
   death verdict 1.30×). The headline "8.4× gap" is **not** a wasm codegen penalty.
2. The quoted native 0.6 s is a *shallow-camp, quick-shape* number (N1/N2 family); on a deep camp the
   native `run_offline` **full** report is 4.17 s single-threaded (N3) — *slower* than the client's whole
   absence (2.44 s), because the client's stall uses 12 sims and the full report uses 50.
3. The client's absence is ~1.95× the native mirror of its own call shape. The extra is *client work*:
   the camp's foreground catalogue queries, the report/camp renders and the 17 worker round trips
   (§2.1), plus the mirror `save()`/`load()` syncs.
4. **The 8.4 s figure is camp-depth- and load-dependent, not structural**: the components I measured
   individually scale as (death verdict ×depth, stall verdict ×panel count, ticks ×ticks, camp panels
   ×open cards). At D13/D11 under load 8–14 the same client path is 2.4–2.9 s; the same native binary
   swung 2.5–3× with peer load alone (0.428 s → 1.06–1.32 s on N2). Inference, labelled as such:
   8.4 s ≈ deep camp (verdict ~3 s, cf. the 2.9 s D28+ figure in AGENTS) + stall ~1 s + ticks ~1.5 s +
   camp panels ~1.5 s + UI ~1 s — every term measured here, none of them wasm-vs-native codegen.

### 3.1 The forecast/verdict/search path

| workload | native 1 core | native pool | wasm (1 core) |
|---|---|---|---|
| camp forecast first paint (50 sims, D13) | 455 ms | 177 ms | same code, 1 core ⇒ ~455 ms |
| `forecast_refine` | 437 ms | 226 ms | ~437 ms |
| `kit::deltas` (forge) | 1420 ms | 448 ms | ~1.4 s |
| `cage_forecast` | 2767 ms | 847 ms | ~2.8 s |
| **`start_forecast`** | **3601 ms** | **360 ms (10×)** | ~3.6 s |
| `unlockDeltas` (UNLOCKS shelf) | ~0.7–0.9 s (panel-derived) | n/a | **994–1263 ms** measured in-browser |
| package search (50 sims) | 30.7 s | (not measured) | — |
| wall-edit search | 1.39 s | — | — |

`forecast::parallel_sims()` is `PARALLEL_SIMS = !cfg!(target_arch="wasm32")` (`forecast.rs:348,393`), so
**inside one wasm panel the sims are sequential by construction**. That is where the 3–10× lives — but note
the largest losses (`start_forecast` 10×) are *multi*-panel queries, and the client already spreads panels
across mirror workers (`lanes.ts`), so within-panel threading is not the lever; making panels smaller,
memoised or lazily requested is.

---

## 4. Ranked optimizations

Each entry: (a) change + file, (b) measured/estimated saving, (c) determinism risk + exact-output check,
(d) effort. **Order is by measured saving per unit of risk.**

### O1 — Take the worst-death verdict off the absence critical path *(client only)*
* (a) `web/src/app.ts:993` (`runOfflineChunked`): stop `await`ing `this.engine.death(worst.id)` before
  returning the merged report. Return `worst_death_id` and let the report screen fetch it exactly as it
  already does at `web/src/ui/report.ts:184` (`busy("verdict", …)`) — or set `merged.worst_death`
  asynchronously and `emitChange()`. Nothing in the report needs the verdict synchronously:
  `lead_of` falls back to the death-count line and `death.ts` already fetches `deathDeltas`/`death`.
* (b) **780 ms native / 998–1013 ms wasm per absence** (measured, deep13) — 41–64 % of the current
  2.44 s; on a D28+ camp it is the ~2.9 s term.
* (c) Risk: none in the core (a pure read). Exact-output check: `app.save()` bytes for seed+elapsed must
  be unchanged (the deferred call mutates only `deaths[rec]` fields already present); the report JSON is
  byte-identical except `worst_death` arriving a paint later — assert it lands before the first paint of
  the report screen, or accept the one-paint difference explicitly. `metrics.rs` replay hash untouched
  (no Rust change); client suites `cut28`/`cut24`/`qa`.
* (d) Small (client-only, ~20 lines).

### O2 — Keep the camp's foreground catalogue queries out of the absence queue *(client only)*
* (a) `unlocks` and `supplyCatalogue` are pure reads but run on the foreground worker and are fired 2–3×
  by `paintAll()` (`web/src/ui/camp.ts:2483-2484`, `:2159`, `:2138`). Move both into `BACKGROUND`
  (`web/src/engine/lanes.ts:16`) — or suppress both in `paintAll` while `app.offlineRunning` and fetch once
  when the absence ends (the shelf already falls back to `app.unlockCat`; `supplyCat` likewise).
* (b) **~250–330 ms (deep13) / 415 ms (deep1) / 272 ms on a fresh camp** — the *whole* 399 ms `FRESH`
  absence is this plus render. The A/B stub measured −154/−169 ms for only two of the three fetches.
* (c) Risk: none (same answers, only later). Check: the catalogue DOM is unchanged (`cut24`, `cut23`
  suites), `app.save()` bytes equal.
* (d) Small.

### O3 — Bound the stall verdict (owner-gated approximate forecast) *(core)*
* (a) `crates/idlever-core/src/offline.rs`: `QUICK_STALL_SIMS = 12` (base) + up to `STALL_SHOWN = 3`
  candidate panels. Either drop the quick pass to 8 sims, or skip the patch pricing unless the report will
  actually show it, or reuse the previous report's patches when `(row, depth, rules, vocab)` is unchanged
  (`game.stall_cache` already keys on that — extend it across the absence instead of per call).
* (b) **771 ms native / 1195 ms wasm** on a stalled camp (deep1); 54 ms on a non-stalling one (deep13).
  A sims cut 12→8 saves ~1/3.
* (c) **Risk: high** — the shown patch set/deltas change, so report bytes change. This is exactly the
  owner's "approximate forecasts" permission; it needs a new contract and a full gate, and bit-identical
  output must NOT be claimed. Check: paired `sim_perf`-style raw report/save comparison against the frozen
  baseline binary, plus the balance rows (the stall patch drives progression).
* (d) Medium (core + contract).

### O4 — `unlockDeltas` on return *(read-only memo, core or client)*
* (a) `meta::catalogue_with_deltas(compute=true)` (`crates/idlever-core/src/meta.rs:551`) simulates a base
  panel at 50 sims plus one panel per un-owned card × candidate position, once per lineage state — i.e. once
  per absence. Either serve the previous state's deltas and recompute in idle time (the client already keeps
  `prev` deltas for the transition, `camp.ts:2168`), or measure only the cards on screen, or key the
  memo on the lineage key so a re-mount after the absence reuses it.
* (b) **994–1263 ms wasm** measured in-browser (an earlier doc note records ~9.7 s on a D11 fixture under
  load). It is on a mirror lane, so it does not delay the absence — but it delays the *camp after it* and
  costs a foreground `save()` sync per call.
* (c) Risk: none (reads only). Check: raw `unlockDeltas` JSON equality on the same save; `cut24`/`cut23`.
* (d) Medium.

### O5 — Explicitly NOT recommended
* **Fewer, larger slices.** Measured: 16 slices = 489 ms native / 765 ms wasm vs **one**
  `runOfflineSlice(28800,true)` = 507 ms native / 549 ms wasm. Slicing is free natively and *cheaper* in
  wasm (fewer report builds); the only per-slice cost is one `await` + `JSON.parse` (~1 ms). The 30-min
  slicing exists for the progress label and costs nothing measurable.
* **Threads/atomics in wasm.** The offline loop gains 4 % from the native pool (N9 vs N11: 489 → 468 ms);
  the 3–10× parallel wins are on multi-panel camp queries, which `lanes.ts` already spreads across mirror
  workers. Adding wasm threads buys the loop almost nothing and risks determinism.
* **JSON/serialization work.** 361 B per slice; 1.3 MB serialize in 4–16 ms.

---

## 5. Exact-output verification plan for whatever is landed

Every option in §4 is client-side or read-only except O3. The gate for each:

1. **Determinism gate (unchanged)**: `cargo test -q --workspace --profile fast` (replay-hash test) and
   `node tools/gates.mjs --fast` for anything touching the core; `metrics.rs` replay hash must match.
2. **Same-seed save bytes**: boot the app on a saved camp, run the 8 h absence, and byte-compare
   `JSON.parse(localStorage["idlever.save"]).engine` (and `app.save()` via `__idlever`) before/after the
   change — the client changes in O1/O2/O4 must leave it identical. This is exactly the
   `IDLEVER_SAVE`/`save-history.mjs export` path.
3. **Report bytes**: for the client-side options, compare the merged `ReturnReport` JSON with `worst_death`
   present (O1) — it must be equal to today's after the verdict lands; for O3 any change is a *behaviour
   fix* and must be declared, with paired raw report/save dumps from `sim_perf` against the frozen baseline
   binary (`docs/PERF_SIM_WORK.md` procedure).
4. **Timing**: repeat `scratchpad/perf-attribution/app3.mjs` (absence wall + per-call names) and
   `run.mjs` (engine components) on the same two fixtures, 3 runs each, with `uptime` recorded — the O1
   claim is a ~0.8–1.0 s drop on deep13, far above the ±5 % noise floor; O2 ~0.15–0.4 s, which needs the
   A/B stub method (`app5.mjs`) to be believable under peer load.
5. Client regression suites for the touched screens: `(cd web && pnpm -s test)`, plus `cut24`, `cut23`,
   `cut28` groups.

---

## 6. What I did not measure (limits)

* No **shipping** (fat-LTO/wasm-opt) wasm: only the fast package was measured (the contention notice
  forbade `wasm.sh --ship`). The shipping artifact is ~25 % smaller and typically a little faster; no
  shipping claim is made.
* No **D28+** camp was available offline; the deep test used D13/D11 saves and two D23 camps grown in-wasm.
  The D28+ verdict/panel terms are taken from AGENTS/PERF docs and labelled inference.
* All browser numbers are **headless Chromium with `?dev=1`** (dev-server Vite build); the dev-only
  history wrapper only intercepts purchases/sends and was inactive under automation, but the bundle is
  not the shipping bundle.
* The peer load varied by 2.5–3× during the pass; the native numbers are CPU-time and therefore robust,
  the wasm numbers are wall time from a lower-load window, and the ratios in §3 are stated with that
  asymmetry visible rather than hidden.
