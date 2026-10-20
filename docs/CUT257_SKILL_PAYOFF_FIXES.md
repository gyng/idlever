# Cut257 — make the authored advanced payoffs actually pay

Owner pivot 2026-10-16: UI work moves to Codex/Claude; this pass takes the
game-mechanic side. Source of the work: `docs/evidence/mechanics/skill-payoff-review-2026-10-16.md`
(read-only source + preserved-campaign review of the 15 earned chains). Each row
below is an authored tactic whose *stated effect* never reached the player.

No balance bar is weakened. Playable strength may only rise where an authored
effect was inert; if any gate row changes, the change and its cause are recorded.

## Findings to fix (review verdict → change)

| Skill | Verdict | Change |
|---|---|---|
| Ranger `moving_line` | arming defect: `arm(MovingLine)` sits inside the parent's mark-copy block, so it never arms (0/9 branches) | arm on the two-hit volley itself; the mark copy stays optional |
| Ranger `split_mark` | arming defect: the copy needs the volley to damage the marked boss (applied 2×/169 runs) | copy to any hit foe carrying a lower mark, keep the ≤20-tick copy rule |
| Rogue `ghostwalk` | payoff verb absent: it arms (293/583/652) but the pick owns no `backstab` row, so it can never consume | the pick's own tactics gain a `backstab` row |
| Caster `conduct` | policy-inert: its rows are byte-identical to its parent's, so `packages::compile` drops the duplicate; 0 receipts | give it rows that differ from `chilling_charge`'s |
| Caster `chilling_charge` | no-op: the reward lowers `ward_cd`, which only the sibling `guardian` node's `ward` verb writes, so the amount is always 0 | reward a cooldown the branch actually runs (or make the branch run a ward) |
| Gunner `long_watch` | window shorter than its own cadence: armed 81/98/31, and the measured arm→aim gap is min 30 ticks against a 10-tick window (0/79 inside) | widen the window to at least the branch's own minimum arm→aim gap |
| Fighter `holdfast` | genuinely negligible (15/0/1 applied, ≤2 damage each) | widen its window/charges so the authored two blocks can land; do not invent a new effect |

`fired > matched` is **not** a defect (tally-definition artifact, hunt branch
counts fires with lapsed conditions) and is left as a diagnostic.

## Numeric gates

1. **Per-skill proof (native, deterministic).** For each row above, a test drives a
   seeded scenario that arms the skill and then performs the payoff verb, and
   asserts the receipt sequence `armed → consumed → applied` with a *non-zero*
   measured effect (`Ev::ClassInteraction` amount > 0, or the documented
   equivalent), plus one negative case showing it does not apply while disarmed.
   `ghostwalk` and `conduct` additionally prove the pick is no longer inert:
   picking them changes the compiled row set.
2. **No regression.** `cargo test -q --workspace --profile fast` all green,
   default all-target Clippy clean, `pnpm --dir web fmt:check` and `tools/copy-lint.mjs`
   clean. No existing test is deleted or loosened; any test whose fixture encoded
   the old inert behaviour is updated with the reason recorded.
3. **Pacing pack unchanged or better.** `node tools/gates.mjs --pacing` (24 rows × 16
   seeds, cached) is re-measured for the affected classes' rows: every row that
   passed keeps passing, and any row whose numbers move is recorded with its new
   value. The pack is a check on the tuning, never the gate.
4. **Earned evidence.** One fresh earned continuation for the two classes whose
   capstones had zero receipts (Ranger `moving_line`, Caster `conduct`, seed 1),
   reusing the `docs/evidence/cut253` recorder harness, shows ≥1 `applied` receipt
   for each. If the harness cannot run economically, record the dedicated
   in-game seeded scenario instead and say so — a controlled test never
   substitutes for that claim silently.

## Out of scope

Caster weapon identity (`starting_weapon()` → dagger for Rogue/Caster/Clown; no
staff kind exists) is *not* the cause of any gap and is left as authored content.
UI, art and the Hub presentation findings from Cut255 stay with the UI owner.

## Status 2026-10-16 — implemented and verified

Three file-exclusive slices (one owner per file) plus the read-only review. Files:
`ai.rs` + `class_skill_effect_tests.rs`, `class_advanced.rs` + `class_advanced_tests.rs`,
`class_tree.rs` + `class_tree_tests.rs`.

Landed

- **Ranger `moving_line`** — the arm moved out of the parent's mark-copy block onto the two-hit
  volley itself (window unchanged). *Earned*: `path:ranger_moving_line` armed 35 / consumed 4 /
  applied 4 × energy 50 in the fresh seed-1 continuation (preserved campaigns: 0 arms, 0 receipts in
  all 9 branches).
- **Ranger `split_mark`** — the copy source is any marked hostile foe in the monster list; the
  recipient is still a volley hit, and the ≤20-tick cap plus the copy-can't-chain guard are unchanged.
  *Earned*: applied mark × 2 in the same continuation's parent-only branch.
- **Rogue `ghostwalk`** — the pick gains its own `backstab` row. Its former rows were byte-identical to
  `veiled_route`'s, so `packages::compile` had been dropping the pick's whole contribution.
- **Caster `chilling_charge`** — the pick gains a `ward` row **placed ahead of its `bolt` row**. Row
  order is load-bearing: a ward row behind a looser `bolt` row is dead (measured: 0 ward fires against
  2467 bolt fires in the preserved branch). *Earned*: `applied ward_cooldown 10` × 3 (parent-only) and
  × 2 (selected) in the fresh continuation.
- **Caster `conduct`** — its rows are no longer duplicates of the parent's (the pick is no longer
  policy-inert; 17 fires in the fresh continuation), and the copy path no longer requires the bolt's
  victim to be the *boss*.
- **Gunner `long_watch`** — window 10 → 100 ticks, at or above the measured minimum arm→next-aim gap
  (30 ticks, median 89; 0/79 fell inside before).
- **Fighter `holdfast`** — window 2/20 → 2/40, effect text follows.
- `fired > matched` stays a diagnostic (all 19 pairs are hunt fires with lapsed conditions).

Verified

- `cargo test -q --workspace --profile fast` → **1047 passed, 0 failed, 6 ignored**; default clippy
  clean; the test fixtures that encoded the old inert behaviour were updated with the reason recorded
  (never deleted or loosened).
- Catalogue fixture regenerated (`docs/evidence/cut257/catalogue-provenance.json`); `skill-icons`
  648 cells / 72 unique / 0 errors; `gold-settlements` 564 checks / 24 cases on the new package
  `51d041d0…`; both repins report native settlement Gold/ledger/ExitLine and after-saves unchanged 4/4.
- One fresh earned continuation per class whose capstone had zero receipts
  (`docs/evidence/cut257/earned/`, counted by `receipts-count.mjs`).
- Pacing rows: `docs/evidence/cut257/pacing-affected-rows-*.log`.

### Caster `conduct` is still unreached in earned play (recorded, not papered over)

The controlled test proves the machinery and the pick now compiles and fires, but its *effect* needs a
slowed foe: the caster branch's only `slow` row is `chilling_charge`'s `slow tag:boss`, and `slow` fires
**once** across the 16 reconstructions of that earned branch. Making this capstone pay in earned play is
a policy/content decision (give the branch a slowing row, or widen the trigger) — owner tuning, not
something this fix can paper over.


### Follow-up2026-10-21 — Cut296 earns the missing Conduct effect

The unreached finding above is historical. Current-runtime replay of that
original earned camp shows zero baseline copies; preparing the slow before the
capstone bolt yields four10tick copies. Both unaffected control branches retain
whole-save/event bytes. See [CUT296_CASTER_CONDUCT.md](CUT296_CASTER_CONDUCT.md)
for the87actual runs, costs/losses, native/WASM parity and bounded acceptance.
This does not infer population strength, universal reachability or fresh pacing.
