# Proposed test implementation order

2026-10-16. No test/source changes or new game executions were made for this
audit. All work below waits for the remaining14earned recorder cohorts to be
positively terminal and root/feat_review to release their all-core-src guard.
The prior28tests/30positive pairs,14charge expiry/parity prefixes and existing
gates stay passing evidence with their exact limits. Missing assertions are not
established product bugs.

1. **Charge consumption, refusal and saved spent state.** Reuse the14actual
   arming prefixes. Fork before a genuinely applicable refused followup and
   require byte-exact whole save/unchanged charge/deadline. Execute one eligible
   real followup, assert actual Consumed count/remaining count and matching real
   output, then save→publicload→second legal attempt. Compare whole/sliced/
   reloaded reports/events/saves after consumption, not only active prefixes.
   Holdfast must use exactly two actual block charges; all one-charge combos
   must stay spent. Ordinary cooldown refusals cover natural repeat attempts;
   any explicitly reset-cooldown re-arm diagnostic is labelled controlled and
   must not be presented as a natural reachable combo.
2. **Arming counterexamples with the node selected.** This is distinct from
   T21's node-disabled control. First add the sparse/high-value branches: real
   incoming melee miss/unmitigated/hazard/pet interception for Rally; nonboss
   and failed boss Bash for Oathguard/Siege; one real damaged Cleave recipient;
   safe Wind; exact25% Ambush and nonkill/missed kill followups; unmarked or
   naturally mark-expired trap; one-impact Volley/Nova; unwarded/expired Ward
   and unslowed/nonboss Bolt; actual unprepared/nonboss/missed gun hit; ordinary
   reload, no newly blinded living foe, interrupted/original-gun ownership
   changes. Each matrix row supplies the required action/receipt oracle.
3. **Recipient, LOS and original-source controls.** Three actual Volley
   recipients must give exactly one copied Mark: the old tests only had one
   eligible destination. Conduct needs a real B→C attack from a copied boss,
   rather than only checking markerNone. StormCell needs wall/off-line/hidden
   and actual primary/secondary reflection branches; Corridor needs its one
   range charge tested through multi-projectile consumption. Guard charges
   need an actual different attacker, ranged exclusion, pet interception and
   actual incoming1/2damage caps. Validate canonical src/dst and absolute
   expires_t against actual actions/charges; the current receipt helper ignores
   dst/expires_t/name.
4. **Boundary clocks, per-cast identity and conservation.** Rally's10tick
   history and Execution's39/40tick boundary are outside the shared14Combo
   expiry test. Test retained Vanish0/1/2/3 and shrinking repeated misses;
   mark/Slow50caps and actual small remaining cooldown deltas; old/new Ward,
   Slow, Aim and physical reload identities across reload. Refunds need real
   net debit<100/0, combined caps and energy<100; AimSettle needs fractional
   pace/timed-speed and at-least-one-future-tick cases. Assert HP, Gold, physical
   chambers/capacity and normal cooldowns stay conserved when only energy or
   settlement is promised. Distinct successful casts may legitimately earn a
   new benefit; do not invent a permanent once-only lock.

Implement in `class_advanced_tests.rs` using existing actual verbs/scheduler,
actual damage and physical reload completion. Add no production helper merely
to make a test green. Fixed controlled miss seeds must be shared by enabled/
disabled forks; RNG branch selection is component evidence, never earned play.
Explicitly asserted real hit/Hurt/position/debit qualifies a negative so that
"no benefit" is not vacuous because a different action fired.

Before each allowed test phase, retain
`production-identity-before-tests.json`: it reproduces the actual gate native
runtime key from the selected production rlib and rustc depfile, which excludes
test modules. After tests, rehash those exact production inputs, rlib, native
binaries and WASM and reproduce the key. With exact runtime bytes, rerun the
new/affected native tests and appropriate workspace/Clippy, preserving reds;
do not replay25minutes of pacing solely for cfg(test) source edits. If an actual
causal test exposes a production defect, stop and report the exact failure,
expected policy and involved hook to root before coordinating the minimal core
repair and refreshed causal/gate scope. Never change an expected value or
semantic requirement to obtain green.

The policy notes in `matrix.json` matter: Siege is spent by the next legal
attack, Ghostwalk survives a missed/zero-damage hit, and deterministic spells/
reloads do not have a random hit roll. Clarify rolled-hit versus applied-damage
meaning for ambiguous successful-hit arming before calling that policy a bug.
Keep genuine earned campaigns, native↔WASM advanced parity and fun evidence
separate from this controlled negative suite.
