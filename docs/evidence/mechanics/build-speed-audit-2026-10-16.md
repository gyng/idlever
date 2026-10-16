# Idlever build & iteration-speed audit — 2026-10-16

Read-only investigation (no repo edits; scratch copies under `/tmp/bsa`, build output only under `target/`
and `/tmp/ba`). Host: WSL2, 32 logical cores, rustc/cargo 1.96.0, GNU ld 2.46, no mold/lld on PATH.
**The box was shared with 5 other agents all session**; the 1-minute load average is printed next to every
number, and tiny (<5 %) differences are noise. Wall times from the saturated window (load > 20) are marked
and are **not** used for any conclusion.

---

## 1. Measured table

| # | Command (run from the repo root) | Wall | load (1 min) | Note |
|---|---|---|---|---|
| 1 | `cargo build --profile fast -p idlever-core --example dayplayer` — no-op | **0.10 s** | 4.8 | cargo prints "Finished … in 0.09s" |
| 2a | `touch crates/idlever-core/src/engine.rs` → same build | **6.61 s** | 3.5 | mtime-only, no content change |
| 2a′ | same, with `--timings` | **10.16 s** | 8.9 | lib frontend **7.63 s** · lib codegen **1.31 s** · dayplayer link **1.10 s** |
| 2b | `touch …/geom.rs` → build | 10.61 s | 3.4 → 8.0 (spike mid-run) | contaminated; do not use |
| 2c | `touch …/ai.rs` → build | 6.35 s | 7.8 | |
| 2d | `touch …/turn.rs` → build | 6.03 s | 7.0 | |
| 2e | `cargo check --profile fast -p idlever-core` after each of the four touches | **3.69 / 4.36 / 3.76 / 3.82 s** | 3.4–7.8 | the cheap inner loop |
| 2f | `cargo check --profile fast -p idlever-core --lib` after a touch | 6.47 s | 47.8 | saturated window; ignore |
| 2g | *first* `cargo check` of the session (no check artifacts yet) | 17.11 s | 4.0–4.8 | one-off |
| 2h | `cargo check` again, warm | **0.02 s** | 3.7 | |
| 3a | `cargo build --profile fast --examples` (~100 example bins, lib rebuilt first) | **14.63 s** | 8.5 | |
| 3b | `cargo test -q --workspace --profile fast` | 148.95 s | 6.9 → **74** spike | unreliable window; docs record **36 s warm**; retry stopped on root's order |
| 4 | `tools/wasm.sh` (fast) | **8.78 s** | 7.8 | cargo wasm build + wasm-bindgen; pkg 6 944 684 B |
| 5 | `pnpm --dir web build` | **7.25 s** | 6.9 | vite's own build **0.92 s** ⇒ tsc ≈ 6.3 s |
| 6 | real body edit in `engine.rs` (`tick_inner`), scratch copy, with `--timings` | lib **9.73 s** = frontend **7.20** + codegen **2.53**; dayplayer link **2.60** (cycle ≈ **12.3 s**) | 37 | matches the documented 13 s floor |

Recorded earlier in `docs/ITERATION_SPEED.md` (not re-measured here, cited for completeness):
`tools/wasm.sh --ship` = 62 s cargo release+wasm32 + 42 s wasm-opt ("2 m 10 s" for `wasm-pack --release`,
§0/§0d); `tools/wasm.sh` after a `turn.rs` edit 13.7 → 7.6 s once `CARGO_PROFILE_FAST_DEBUG=0` (round 3);
`tools/verify.sh --quick` ≈ 45 s warm; gate table warm (all three legs cached) 0.43 s.

### 1.1 Per-file edit floors (why the file name does not matter)
The four touch builds are all ≈ 6.0–6.6 s at load 3.4–7.8 — **the touched file changes nothing**. That is
expected once you know the split in #6: a *no-content-change* rebuild is 7.6 s frontend + 1.3 s codegen +
1.1 s link regardless of which file's mtime moved. A *real* edit adds only the re-codegen of the invalidated
CGU (1.31 → 2.53 s, see §2). Attempts to measure real edits per file in a scratch copy produced walls of
50–225 s under load 20–95 and a non-incremental 94 s build when the incremental session had been disturbed;
those numbers are unusable and are discarded. Nothing in this report depends on them.

---

## 2. Where one core-edit cycle goes — the `--timings` breakdown

`cargo build --profile fast -p idlever-core --example dayplayer --timings` (run #2a′ / #6) splits the rustc
invocation at the emissions cargo sees (`rmeta` = frontend, `rlib`/bin = codegen, then the link step):

| case | frontend | codegen | link (dayplayer bin) |
|---|---|---|---|
| `touch engine.rs`, no content change (load 8.9) | 7.63 s | 1.31 s | 1.10 s |
| **real edit** in `engine.rs`'s `tick_inner` (load 37) | 7.20 s | **2.53 s** | 2.60 s |

- The frontend is ~60 % of the cycle and is **load-insensitive and identical for a no-change rebuild and a
  real edit** (7.63 s at load 8.9 vs 7.20 s at load 37). It is fixed per-rebuild work: parse, resolve, macro
  expansion / cache load, crate-metadata encode, dep-graph persist (a `-Ztime-passes` run shows
  `macro_expand_crate` 1.26 s, `serialize_dep_graph` 1.01 s, `incr_comp_persist_result_cache` 1.01 s,
  `generate_crate_metadata` 0.73 s, `resolve_crate` 0.54 s, `late_resolve_crate` 0.46 s).
- **The codegen term of an edit is only ~1.2 s** (the difference between doing nothing and re-optimising the
  invalidated CGU — which for `engine.rs` is *all 256 of its functions*, §3).
- The link is 1.1 s (load 8.9) to 2.6 s (load 37) per example binary. `--examples` links ~100 of them and
  cost 14.6 s total. So link is a real cost without lld, but a second-order one for a single-binary loop.
- A full non-incremental codegen of the crate is much larger (`-Ztime-passes` full rebuild: `codegen_crate`
  5.8 s + `finish_ongoing_codegen` 42.6 s of which `LLVM_passes` 13.2 s and `LLVM_thinlto` 35.6 s; total
  54 s at load ~10–24, 132 s at load ~11–20, 180 s cold). Incremental builds skip the ThinLTO step
  entirely — that is why a normal edit's codegen is 2.5 s and not ~40 s.

---

## 3. Is `engine.rs` one codegen unit? Yes — and that is not the bottleneck

Measured by `CARGO_INCREMENTAL=0 cargo rustc --profile fast -p idlever-core --lib -- --emit=llvm-ir`
(one `.ll` per CGU, symbol path `_ZN12idlever_core<mod>…` counted per file):

- `codegen-units = 16` (the `fast` profile) ⇒ exactly **16 CGUs**. `engine.rs` is **one CGU** (`cgu.02`):
  **256 defined symbols, 18 MB of IR** (758 defs / 18 MB in total — engine plus a handful of small modules).
- `turn.rs` is *inside* `cgu.04` together with `town` (34), `firearm` (23), `systems` (17), `facts` (17),
  `geom` (7), `tiles` (5), … — one edit in `turn.rs` re-codegens all of those.
- `ai.rs` shares `cgu.10` with `tools` (48), `provenance` (24), `situations` (17), …
- `cgu.00` is 65 MB / 1156 defs and holds **no** `idlever_core` module symbols — it is the inline/generic
  (monomorphised `core`/`std` + `#[inline]`) unit.
- Repeating the emission with `codegen-units=64` gives 64 CGUs but **`engine.rs` is still exactly one CGU**
  (same 256 defs, 18 MB): rustc's default module partitioning never splits a module. Raising
  `codegen-units` only parallelises the full codegen; it does not shrink the per-edit invalidation.

So the "edit in `tick` re-optimises its whole CGU" story is true, but the measurement puts a bound on what
that costs: **≤1.2 s of a ~12.3 s cycle (≈10 %)**.

---

## 4. Ranked options

Ordered by expected value per unit of risk. (a) change, (b) saving, (c) risk, (d) verification.
"Measured" / "[inferred]" is labelled per item.

### S1 — `cargo check` as the inner loop (cheapest real win) — **measured**
- (a) After editing, run `cargo check --profile fast -p idlever-core` (3.7–4.4 s, #2e) instead of the build
  (6.0–6.6 s for the same touch, #2a–2d); with a real edit it also skips the ~1.3–2.5 s codegen and the
  1.1–2.6 s link.
- (b) ≈2.5 s/cycle measured on the touch case (≈40 %); ≈4–5 s on a real edit [inferred from the phase split].
- (c) None: same crate, same profile/flags, no artifact consumed by a run or a gate. (It produces no binary —
  do not use it for gates.)
- (d) Introduce a deliberate type error; `cargo check` and the build must report the same error; confirm
  `target/fast/examples/dayplayer` is untouched by the check.

### S2 — skip the link in the inner loop — **measured**
- (a) `cargo build --profile fast -p idlever-core --lib` (no example), or just S1.
- (b) 1.10 s (load 8.9) / 2.60 s (load 37) per cycle.
- (c) None. Do not run `--examples` (14.6 s, #3a) in the inner loop.
- (d) Compare the mtime of `target/fast/examples/dayplayer`.

### S3 — cache the fast wasm path — **measured cost, [inferred] fix**
- (a) `tools/wasm.sh` (fast) unconditionally runs `cargo build --target wasm32-unknown-unknown` +
  `wasm-bindgen` + copy (8.78 s measured, #4); the `--ship` path has `tools/wasm-cache.mjs`, the fast path
  has no guard, so an mtime-only touch pays the full 8.8 s.
- (b) ~8.8 s → ~0 for an unchanged run (a real edit still pays the cargo frontend ~7 s + bindgen ~1 s).
- (c) Tooling only, but the key must be complete (`crates/**` sources, manifests, `Cargo.lock`, rustc
  identity, `CARGO_PROFILE_FAST_*`, wasm-bindgen version). Fail closed like `wasm-cache.mjs`.
- (d) Run it twice with no change (second prints "cached" in <1 s); edit a Rust file (it rebuilds and the pkg
  sha changes).
- Related: writing the 7 MB pkg into `web/src/engine/pkg` triggers a Vite full reload that kills walks
  (docs §5) — build into a staging dir and `mv` it (one change event).

### S4 — stop type-checking the client twice — **measured cost, [inferred] fix**
- (a) `pnpm --dir web build` is `tsc && vite build`: tsc ≈ 6.3 s of the 7.25 s (#5), vite itself 0.92 s. The
  dev/QA loop runs Vite (no type-check); `tools/verify.sh --quick` already runs `tsc --noEmit` in its
  parallel side job, and the outer verify path then pays tsc again inside `pnpm build`.
- (b) ~6 s on the outer loop; the inner dev loop needs none of it.
- (c) None as long as tsc stays on the verify/CI path.
- (d) `verify.sh --quick` still runs `tsc --noEmit`; a type error still fails verify.

### S5 — a faster linker without sudo (lld) — **measured failure, [inferred] recipe**
- (a) The toolchain ships `rust-lld` (`~/.rustup/toolchains/1.96.0-x86_64-unknown-linux-gnu/lib/rustlib/
  x86_64-unknown-linux-gnu/bin/rust-lld`); rustc infers `-flavor gnu` from the name, but
  `linker = "rust-lld"` alone fails: measured `rust-lld: error: unable to find library -lgcc_s / -lutil /
  -lrt / -lpthread / -lm / -ldl / -lc` (it does not inherit gcc's search paths). Recipe (untested here, the
  root stopped further compiles): add `-L/usr/lib/x86_64-linux-gnu` and
  `-L/usr/lib/gcc/x86_64-linux-gnu/15` via `rustflags = ["-C","link-arg=-L…"]`, or `linker = "clang"` +
  `-fuse-ld=lld` (lld itself is not installed outside the toolchain).
- (b) ≤1 s per inner-loop build (link measured 1.1–2.6 s); a few seconds on `--examples`/`cargo test`.
- (c) Artifact layout only; no gate reads the linker. Changing the linker/flags invalidates all caches once.
- (d) `cargo build -p idlever-core --example dayplayer` links, `examples/fingerprint` and the replay-hash
  test are unchanged, `ldd`/`file` on the binary sane.

### S6 — raise `codegen-units` in `[profile.fast]` — **measured: no benefit for the edit loop**
- (a) e.g. `codegen-units = 32/64`.
- (b) Measured: it does **not** split `engine.rs` (still one 18 MB CGU at 64, §3), so the edit-loop saving is
  ~0. It only gives the *full* codegen more parallelism (cold builds, `cargo test`, wasm release).
- (c) **Behaviour-adjacent:** results stay bit-identical (integer determinism; the replay-hash/fingerprint
  gates cover it), but the optimisation grouping changes, so runtime timing rows (`metrics` per-tick,
  verdict times) can move, and the incremental cache re-warms once. Keep it out of the "safe" bucket.
- (d) `examples/fingerprint` identical; `node tools/gates.mjs` rows unchanged but timing rows re-baselined.

### S7 — split `engine.rs` / `ai.rs` / `turn.rs` into modules (docs §3.5) — **measured bound: far less than claimed**
- (a) Move the module's item groups into submodules of `engine/` and re-export.
- (b) **Measured bound ≈1.2 s of a ~12.3 s cycle (≈10 %)** — the codegen delta between a no-change rebuild
  (1.31 s) and a real `engine.rs` edit (2.53 s). The 7.2 s frontend and the 1.1–2.6 s link do not move.
  This contradicts `docs/ITERATION_SPEED.md` §3.5's "toward ~5 s"; that estimate is not supported by the
  phase split measured here. Additionally, at `codegen-units=16` rustc packs several whole modules per CGU
  (`cgu.04` holds 7), so the new submodules may be merged with other modules' items, and the win is not
  guaranteed even for the codegen term.
- (c) Pure refactor, no semantic change **if** paths and visibility are handled; it touches the largest file
  and the public surface that the 12 k-line test suite and the wasm crate use.
- (d) Before/after, re-emit `--emit=llvm-ir` and count `_ZN12idlever_core6engine` definitions per CGU: the
  win is real only if they spread over several CGUs. Then `examples/fingerprint`, `cargo test --profile
  fast -p idlever-core`, `node tools/gates.mjs` (all rows), and one `tools/repin.mjs` pass.

#### S7 seams (real item groups in `engine.rs`, 7 729 lines)
1. Consts/knobs — lines ≈1–350 (`SAVE_VERSION`, `HISTORY_*`, caps, `wake_pay`, `gold_divisor`, …).
2. Inputs & capsules — `Input`/`Manual` (55–78), `Capsule`/`Capsules` + serde impls + `fold_into` +
   `events_hash` (79–217) (a natural neighbour of the existing `fold.rs`).
3. Run vocabulary — `ExitTier` (297–323), `Bones`, `FloorItem`, and the exit/why free functions
   (`exit_line*`, `gold_term`, `is_exit_why`, `secured_text`, `trophy_label`, `salvage_*`, `apportion_cents`).
4. `Run` — struct 355–1067, `impl Run` 1068–1350, `max_rows_of`, `Ctx`/`impl Ctx` 1362–1413, `Lost`.
5. `LineageState` — struct 1426–1850, `impl LineageState` 1957–2851 (≈900 lines), `trait_offer`.
6. Death/campaign records — `DeathRec` 2862–2978 (+`is_zero*`), `CheckpointLineage` 2993–3021,
   `Root`/`Batch` 3022–3237, `BandRun`/`StallTally`/`RunOutcome` 3238–3273.
7. `Game` — struct 3274–3383, `SentState`, and **`impl Game` 3414–6656** (69 methods, 3 242 lines): the
   1 034-line `finish_run`, 480-line `start_run`, `snapshot`, `send`/`try_send`/`ensure_run`, `step`/`tick`/
   `tick_inner`, `advance`, `replay`, `run_news`/`settle_novelty`, `prune_graves`/`settle_renown`, and all the
   camp verbs (`set_rules*`, `set_class`, packages, supplies, party/companions, `vocabulary*`).
8. Free functions 6656–7729 — exit/report helpers (`exit_finds`, `found_rows`, `found_in_pack`, `exit_trace`,
   `max_steps_in`, `hp_lost`/`hp_healed`, `death_blow(s)`, `exit_reason`, `supply_price`, `kill_value`),
   floor population/placement (`populate_floor`, `bounty_item`, `monster_entity`, `place_bones`,
   `place_situations`, `place_room_kind`, `place_stray`, `vault_cage`, `situation_*`, `pick_room`),
   companions (`spawn_party`, `companion_monster`, `pet_max_hp`, `new_companion`, `tame_chance`),
   wire helpers (`item_wire`, `kind_title`, `boss_escort`), pack planning (`automatic_pack_plan`,
   `current_repeat_plan`, `supplied_slots*`).

Suggested seams: `engine/consts`, `engine/capsules`, `engine/run`, `engine/lineage`, `engine/batch`,
`engine/game_lifecycle` (send/step/tick/advance), `engine/game_settle` (`finish_run`/snapshot/reports),
`engine/game_camp` (the camp/economy verbs), `engine/place` (floor population), `engine/exit` (report).

#### S7 hazards a split must handle
- **Visibility.** `Run`/`Game`/`LineageState` fields are already all `pub`, so no field work is needed; but
  private helpers moving across files must become `pub(crate)`/`pub(super)`: the private methods inside
  `impl Game` (`pay_start`, `pay_start_at`, `input`, `tick_inner`, `settle_novelty`, `hatch_egg`,
  `tick_batch`) and the private free fns (`situation_rooms`, `pick_room`, `situation_spot`, `room_interior`,
  `vault_cage`, `past`, `is_zero_u32`, `automatic_pack_plan`, `current_repeat_plan`, `supplied_slots`,
  `supplied_slot_assignments`). Rust allows several `impl Game` blocks in different modules.
- **Path stability.** 425 `crate::engine::X` references and 66 `use crate::engine…` lines exist outside the
  module. Keep `engine.rs` as a facade and `pub use` the moved items, so *no* call site changes (naming the
  ~40 pub free functions + 24 pub types). Only fall back to editing call sites if a re-export is impossible
  (it is not, for `pub` items).
- **`#[cfg(test)]` and test wiring.** `engine.rs` and `turn.rs` have **no** inline test modules; the crate's
  test modules live in `lib.rs` as separate files and use the public API, so a split does not disturb them
  *provided* the public surface is unchanged. `ai.rs` ends with
  `#[cfg(test)] #[path="class_advanced_tests.rs"] mod advanced_tests;` — that declaration (or its move to
  `lib.rs`) must be carried with `ai.rs`'s split or `class_advanced_tests.rs` (3 093 lines) silently stops
  being compiled. `trace.rs` and `wire.rs` also carry inline `#[cfg(test)]` modules — not in scope, but the
  same rule applies if they are ever touched.
- No `macro_rules!`, `include!` or `#[macro_use]` in the three files (checked), so the split is textually
  clean.

---

## 5. Options that change compiled behaviour or gates — keep separate
- `codegen-units` (S6): results bit-identical by the integer-determinism/replay-hash argument, but runtime
  performance and all wall-clock rows of the gate table may move. Not a "safe" tweak.
- Linker/linker flags (S5): artifact layout only; no gate reads it, but changing flags invalidates the whole
  target cache once.
- `-C target-cpu=native`: **do not** — native/wasm parity would break and FP/SIMD codegen can differ.
- `opt-level` change (e.g. 1) for `fast`: docs already measured opt 1 → tests ~2× slower for a ~2 s build
  saving; rejected.
- `lto = true` in `fast`: rejected (turns every edit into a ~40 s ThinLTO).
- Nightly / `RUSTC_BOOTSTRAP=1` + `-Zthreads=N` (parallel frontend): the only lever that attacks the 7.2 s
  frontend term directly, but it changes the compiler invocation, invalidates every cache, and the gates'
  runtime key (`tools/runtime-key.mjs`) folds in the compiler identity. **[inferred], untested** — schedule
  it as its own experiment on a quiet box.
- `sccache`: no benefit here — the dependency graph is 5 tiny crates and the local crate is always rebuilt.

## 6. Client/gate loop work that is recomputed
- `tools/wasm.sh` fast path: no input cache (S3).
- `verify.sh --quick` side job runs `tsc --noEmit`; the outer path's `pnpm build` runs tsc again (S4).
- Gate table (`node tools/gates.mjs`) already caches by binary hash + per-job source keys (warm 0.43 s per
  docs §3.3); a core edit replays the kept jobs — nothing obvious left to remove there without changing the
  gate's meaning.
- Dev loop: the 7 MB `pkg/` write causes a Vite full reload that kills in-flight walks (S3, staging dir).

## 7. Bottom line
1. **The inner loop should be `cargo check` (and/or a lib-only build): −2.5 s per iteration, zero risk,
   measured.**
2. **The 13 s edit floor is 7.2 s fixed frontend + ~1.3–2.5 s codegen + 1.1–2.6 s link.** Splitting the
   giants (docs §3.5) can only touch the middle term, and that term is ~1.2 s — **~10 %, not the ~8 s the
   docs predict**; verify with `--emit=llvm-ir` before committing to the refactor.
3. `engine.rs` is confirmed to be **one** codegen unit (256 functions, 18 MB IR) — and stays one even at
   `codegen-units=64`.
4. The link is a genuine second-order cost (1–2.6 s per binary, 14.6 s for ~100 examples); rust-lld is
   available without sudo but needs explicit system library paths (measured failure + inferred recipe).
5. The wasm/web loop re-does work that a cache would skip (8.8 s fast wasm, 6.3 s duplicate tsc).

**Measured** = §1 table, §2 breakdown, §3 CGU mapping, S1/S2/S3/S4/S5/S6 costs.
**[inferred]/[inferred untested]** = the S3/S4/S5 fixes' effect sizes, the S3/S4/S5 verification steps, the
`-Zthreads` option, the per-file real-edit walls (discarded).
