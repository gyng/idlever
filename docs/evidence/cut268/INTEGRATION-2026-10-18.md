# Cut268 integration, 2026-10-18

Branch `integrate-1018` (worktree `.claude/worktrees/integrate`), started at main `bb4cf3ce` (Cut260 `c4fae262`, repin a47a,
plus `161b3120` and `bb4cf3ce`). Five branches merged in order with `git merge --no-ff`. Automated measurements only. No
owner or player feedback was collected for this note.

## Merged

| # | Branch | Head | Base | Merge commit |
|---|---|---|---|---|
| 1 | `cut267-art` | c6fea988 | 9117a8b2 | 39f61df9 |
| 2 | `cut266-hero-hub` | 6cc68f93 | 1684c2e5 | 8f902550 |
| 3 | `cut262-town-ux` | 9b6aac0e | f0e095a2 | 1c6b5849 |
| 4 | `worktree-agent-a5b6d726ca6d0cecd` (Cut261 live inventory) | 56c685ec | f0e095a2 | 198d998d |
| 5 | `cut263-achievements` | 0a75a32a | f0e095a2 | 7e0e98d3 |

Follow-ups on the branch: `d4d29ffc` (oxfmt on honours.ts) and `dc199a56` (repin ce9d and the toast-order fix below).

## Conflicts and how each was resolved

- **Merges 1–3: no textual conflicts.**
  - Cut262's `tips.ts` native-title silencing came in as the branch's version, on top of main's revert `161b3120`.
    The `tips` client group stays at its baseline: 68/70, with only "the report marks its words" failing, on phone and phone360.
- **Merge 4 (live inventory).**
  - `engine.rs`, `item.rs`, `wire.rs`, `types.ts` and `watch.ts` merged automatically. Cut260's `Run/ExitLine/Advance.credited`
    sit beside `InvItem.worth/fate`.
  - `web/src/runs.css`: both added blocks at the same place, so both were kept. Cut262's desktop CLS media blocks come first, then
    the `.pack-worth` list. A shared closing brace was restored.
  - `web/tests/gold-settlements.mjs`: kept the Cut260 a47a default. The integration repin then replaced it.
  - The carry list total was checked against Cut260.
    - The live strip's `carried` is still `max(0, loot) + secured` (watch.ts). Cut260 changed only *when* secured gold
      reaches the purse (`Run.credited`). It did not change what the strip calls carried.
    - The list's rows are each find's `worth` plus a `coins & used` (or `taken`) remainder, computed as `carried − Σ worth`.
      So the rows add up to the strip's `$N` by construction.
    - Gold secured at a checkpoint drops `loot`, raises `secured`, and leaves the finds in the pack with their `worth`. No coin is
      counted twice. No change was needed.
    - The `live-inventory` and `checkpoint-gold` groups pass.
- **Merge 5 (honours).**
  - `web/tests/gold-settlements.mjs`: kept the Cut260 default again.
  - `lib.rs`, `engine.rs`, the wire, `native-api.json`, `native_dev/generated.rs`, `game-menu` and `types.ts` merged
    automatically.
  - The bridge was regenerated with `node tools/native-codegen.mjs`. The output was byte-identical to the merge, and `--check`
    passes.
  - Badge art: `honours.ts` now draws the mark column through `skin.icon()`: `badge_gold` when earned, `badge_secret` for a hidden
    secret, `badge_locked` otherwise. The old glyphs (`✦`, `?`, `·`) are the fallback. Two small rules were added to
    `honours.css`. The tier frames and the bronze/silver medallions are unused, because honours have no tiers.
- **Cross-branch interaction found by the client tests (fixed in `town.ts`).**
  - Cut262's one-time Guild-order toast (`Ranks · Guild` / `Legacy · Guild`) fires on the same camp paint as Cut263's honours
    toast. It replaced the honours toast.
  - The `honours` group timed out: "a single new honour toasts its name" never saw `✦`.
  - Fix: when a `.toast.honour-toast` is up, the order's toast waits 2.7 s. The honours toast lasts 2.6 s. The fix was probed with
    a toast-sequence observer: `✦ Warlord Felled`, then `Ranks · Guild`.

## Results

| Check | Result |
|---|---|
| `cargo test --workspace --profile fast` | 1071 passed, 0 failed, 6 ignored |
| `cargo clippy --workspace --all-targets -- -D warnings` | clean |
| `tools/verify.sh --quick` | Only the two worktree-only `fun-eval.test.mjs` cases fail, because `../eval-fun` is missing: "the packet is the frozen brief…" and "collect reads a card's build…". fmt, lint, tsc and copy-lint (0 violations) pass. |
| `tools/wasm.sh` | fast build, 7395063 bytes; `web/src/engine/pkg` is a real directory |
| repin | see below |
| `node tools/gates.mjs --pacing` | **24/24 PASS** at 16 seeds (`docs/evidence/cut268/pacing.txt`); e.g. PICKED ≥ 1.5× IDLE 1.50 · 2.75 · 3.30, TUNED/PICKED 1.17, porter 8.4 · worst 13.6 min, scout med 2.6 · worst 4.5 min |
| `python3 art/pack.py && python3 art/art-qc.py` | 561 frames; atlas unchanged; QC PASS, 1 warning (17 retained `_v<n>` versions). Main's previous `art-qc.py` FAILs on this tree, listing the registry masters as unregistered. |
| client groups (IDLEVER_PORT=5441, this worktree, `tests/vite.test.config.ts`) | tips 68/70 (baseline); town-ux 19 PASS; hero-hub PASS (10640 checks); live-inventory PASS; sold-finds PASS; honours 27 PASS after the fix; gold-settlements 564 PASS on ce9d; report-bosses 32 PASS; checkpoint-gold PASS |
| `pnpm -s test` (routine, 42 groups) | 38/42 under load 60–70 (pacing running): hero-hub (a tip assertion, hero-hub.mjs:972), worker-first-act, clarity:paint (timing), watch-live-edge (timing, 14.6/15.1 s vs ≤ 12 s). Rerun alone: hero-hub PASS (10640), watch-live-edge PASS (10). Left failing: worker-first-act and clarity:paint, both known pre-existing. |

### Repin (one final repin, ce9d)

`node tools/repin.mjs --dir docs/evidence/cut268 --note "Integration 2026-10-18: art, hero hub, town UX, live inventory, honours" --settle --regen`

- WASM 7395063 bytes, sha256 `ce9d5d42…bc4ff`. The new manifest is `docs/evidence/cut268/settlements-inputs-ce9d.json`, repinned from
  the Cut260 a47a manifest.
- Gold, ledger and ExitLine are **unchanged on 4/4** entries against a47a.
- `expected` is unchanged for bank-positive. For the three entries with finds, it differs only at `exitLine.finds[].worth/fate`
  (`report.exits[].finds[]` for multihero-absence). These are Cut261's presentation-only fields.
- After-saves regenerated 4/4. Every path that differs is `…finds[].worth`, `…finds[].fate`, `last_snapshot.hero.inv[].worth/fate`
  (Cut261), or `lineage.honours` and `others[].lineage.honours` (Cut263). No gold, ledger or exit path differs.
- The "Current package" comment in `web/tests/gold-settlements.mjs` is updated. The branch repins 20ee (cut261) and f22e (cut263)
  are recorded there as superseded.

## Known failures (pre-existing or load)

- `fun-eval.test.mjs`: 2 cases, worktree only (`../eval-fun` is missing).
- `tips`: "the report marks its words" ×2 (baseline).
- `worker-first-act`, `clarity:paint` (timing), runclear's `lineage.vault` probe, `cut29`: known pre-existing.
- `hero-hub` and `watch-live-edge` failed only inside the loaded routine run and passed alone (above).

## Left for the owner

- **art-qc rule change (cut267)**: `art/art-qc.py` now treats `art/generated` masters named by `class-skills.json`,
  `advanced-skills.json` or `equipment.json` as registered. It downgrades unselected `<family>_v<n>` versions of a registered family
  from a failure to a warning, because dated evidence cites those paths. Today that is 17 files. This loosens a former hard failure.
- **hero-hub contrast test (cut266)**: the contrast pass in `web/tests/hero-hub.mjs` now hides two sticky overlays before it
  measures. Text under those overlays is no longer contrast-checked in that pass.
- **Honours (cut263) open questions**:
  - G4 deviation: IDLE seed 2 earns 4 honours on day 1, against a bar of ≤ 3. The bar was kept and the result recorded.
  - G4/G5 were measured on 3 seeds, not 16.
  - Honour-gated cosmetics were not granted.
  - The gallery is reachable only once the town has its House.
  - The badge tier frames and bronze/silver medallions have no use until honours get tiers.
- **Toast order (integration)**: the Guild-order toast is now delayed behind an honours toast. Toasts still replace one another
  in general (`dom.ts toast`). A queue would be the general fix.
