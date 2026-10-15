# Current earned weapon comparisons — in progress

Contract: [Cut246](../../CUT246_EARNED_BUILD_COMPARISONS.md). This is a bounded
within-class experiment from one actual earned camp, not five fresh class
campaigns or a blanket R4/balance/fun verdict.

`prepare.mjs` is terminalPASS: ten public legal preparations, no sends or grants.
Existing Fighter/Rogue ownership and actual6/8/8mark Ranger/Caster/Gunner
unlocks are pinned by `../handoff-content/class-purchases-e62c/`. Current native
class levels remain different, so comparisons across classes are descriptive.

Each pair shares a complete common parent before weapon selection, native D1
start, Hearthglass following/pinned ironcap, supplies, party, packages, Legacy,
workers and RNG. Gunner's real short-gun quote is200Gold; the common parent
pays it once, then both owned gun selections cost0 and retain11821Gold. All
other paired selections cost0 and retain12021Gold. The five class mark balances
are116/116/110/108/108. Every configured next-weapon field matches the declared
choice; actual first-sent gear is verified for allten branches in played-1/.

All five earned inputs have Scout paused. `play.mjs` therefore explicitly calls
public send once per branch and preserves that policy. Its eight-hour absence
may finish only the actual in-flight run; it must not fabricate a sequence of
autonomous delves. Report/save/replay artifacts are retained in played-1/; a second identical
execution is complete; all10pairs of full saved/report/replay outputs match exactly. Presence-only script checks pass,
but the stricter replay-equivalence audit fails as documented below. Original input files and
common parents remain exact. No outcomes or superiority are asserted yet.

Reproduction, with actuale62c WASM built and no quiet GPU measurement running:

```sh
node docs/evidence/cut246/prepare.mjs
node docs/evidence/cut246/play.mjs --rep 1
node docs/evidence/cut246/play.mjs --rep 2
```

The preparation/played scripts refuse existing result paths to preserve original
attempts. Keep failed attempts and use a new versioned output for a revised
experiment. Dated observations must accompany visual/action review; numbers
alone do not establish a player's experience or counter causality.

Actual first execution:10legal sends, one actual run per eight-hour absence,
paused Scout preserved. `replay-equivalence-first.json` compares each actual
public history entry against the immediately reconstructed currente62c replay.
Allten differ in turn count; five also differ in maximum depth. For example,
Fighter/sword actually dies to a lurker atD28/43260turns, while its reconstructed
replay reachesD22/33345ticks. Gunner discrepancies are smaller but still real.
These are freshly sent current-runtime runs, not the older historical87de
reconstruction mismatch. The original play script PASS checks legal equipment,
execution, read-only replay availability and retained inputs; it did not check
replay equivalence and cannot certify that contract requirement. This stricter
FAIL is preserved separately. Replay-based tactical attribution and fullCut246
acceptance remain blocked on diagnosis/correction; actual report outcomes are
retained and must not be replaced by reconstructed replay outcomes.

Independent first-divergence reproduction identifies the current Hearthglass
quiet-batch timer defect: at tick940, single-step hearth_regen28 vs batched29.
Full public continuations from the identical sent save match the actual offline
record on the batched path and the held replay on the single-tick path. Proofs
are in replay-audit/. This confirms a runtime simulation mismatch, not only a
reporting issue. All actual e62c set/loadout results are pre-fix evidence and
need revalidation after correction. Ten legal choices and exact repeated
execution do not override the failing replay-equivalence contract.

## Corrected c9fa experiment — 2026-10-16

Combined Cut247/248 corrects armour countdown and fractional energy timing.
`revalidate.mjs` is a stricter successor, retaining all original10legal inputs:
actual public send/8h absence, held replay, real watched step continuation and
whole/sliced/reloaded absence. `revalidation-c9fa-1/` and `-2/` both finish
PASS10/10 with0harness errors. `compare-revalidations.mjs` proves90complete
raw artifacts repeat exactly. No grants, input migration, Scout switch or
normalized gameplay differences were used. Watched-vs-absence RunRec excludes
only actual provenance via/absence/clock_s; full original receipts remain.

The original e62c red is retained in `revalidation-e62c-before/`: all10offline/
replay and offline/watched outcomes disagree despite10/10whole/sliced/reload
equality. The successor fixes these exact cases; it does not certify all
possible reload boundaries. A separate real paid pace8case now exposes lost
last-seen provenance on reload, tracked in Cut249. Preserve this c9fa boundary
and revalidate the final package again after that correction.

`corrected-c9fa-observations.json` records actual outcomes, dated interpretations
and explicit revalidation triggers. The old CasterbowBankD19/831Gold and
Rangerbow332Gold observations are historical and cannot guide current builds.
The originalfiveclass levels remain unequal; class mechanisms/visual review,
additional biome causal forks and fullR4/fun acceptance remain open.

## Current8879 successor — 2026-10-16

`revalidation-8879-1/` and `-2/` finish10/10 each on the visibility-provenance
fix package. `revalidation-8879-repeat.json` verifies90complete raw artifacts
repeat exactly, including actual/watched/replay outcomes and whole/sliced/reload
reports/saves. The original preparation bytes and paused Scout remain unchanged.
The paid pace8/7200→7201 case is separately covered by Cut249, not inferred here.

`actions-8879.json` inventories actual first hero attacks, every rule/attack verb,
firearm state/reload events, native accounting and complete before/after ledgers.
Bow/firearm attack modes are directly observed. Preserved package choices do not
fire Fighter or Caster class-specific verbs; these branches cannot establish
those class identities. Fighter level8 versus other classes level1 also forbids
cross-class superiority claims. Losing branches and all lost Gold are retained.

`weapon-frames-8879/` has40first-attack captures; many victims already die on the
attack tick, so these are weak action-recognition views. The successor
`weapon-surviving-targets-8879/` captures40first landed attacks whose target does
not die on that tick, at402×681/1440×900 in GL/Canvas. These use standalone
production viewers, not the complete live Watch UI. Source/served/replay/image
hashes and actual target events are retained. A phone Gunner frame still has an
offscreen ranged target; individual captures are not proof of a readable complete
exchange. Full action recognition, skilled class comparisons and R4 acceptance
remain open. No GPU performance claim under concurrent native pacing work.
