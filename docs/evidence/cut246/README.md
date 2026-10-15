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
