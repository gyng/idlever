# Gas-step safe-fire candidate — REJECTED,2026-10-20

Automated native public-command measurements on the two fixed earned Cut287
Fens parents. No human/visual/fun claim. The preregistered contract is preserved
in frozen-contract.md. No production AI change is retained: ai.rs was restored
byte-for-byte to ai-before.rs. The failed candidate is ai-candidate.rs, exactly
17 added lines, source/native/input identities in identity.json.

Hypothesis: when melee-equipped gas_step has a known fire potion, use it against
a dry, visible gas foe at distance2..6 with LOS and no ranged reflection, before
waiting for an adjacent melee pop. Existing throw mechanics/supply ownership are
used; no potion grants, new damage/rewards, auto-pack or profile changes.

| Fixed scene, gas_step | Original hurt / gas | Candidate hurt / gas | Candidate final floor tick | Contract verdict |
|---|---|---|---:|---|
|Gas s1/D9/a2|15 /6|12 /6|1720|FAIL: hurt>9 and gas>3|
|Pack s2/D9/a2|16 /9|13 /6|1020|PASS bounded local bars|

The gas-scene potion is actually thrown at t20 and kills bloat2 at t30, away from
the hero. Remaining bloat7 and bloat8 die to melee at t150/t250; each creates a
cloud and3 immediate hero gas damage. Using the one prepared fire dose on the
first foe does not solve the remaining melee encounters. Partial aggregate hurt
improvement is insufficient for the named gas gate. No bar is weakened.
On the pack scene fire is used at t730/t740; its accepted/found inventories and
all consumption events are retained rather than rewritten to a fixed item count.

Both full actual runs finish and have exact entire-event/complete-terminal-save
parity at step(1)/step(100). Independent verify.py reconstructs the native
metrics and all five numeric comparisons from archived full frames/events,
verifies original input/source/contract hashes, and returns REJECTED (as a
successful analysis, not an operational error). capture.tar.xz preserves31 raw
receipts (74228753 bytes;1008228 compressed) with standard tar links for identical
payloads, full send/floor/preparation/after data and per-file hashes.

The cheap earned-scene gate failed before adoption. The proposed controlled
unit-test scaffold is explicitly unexecuted (unexecuted-test-plan.rs), and was
never added to the crate. Remaining16 catalogue controls, next8h comparisons,
workspace/Clippy/targeted gate checks and WASM/settlement work are NOT_RUN for
this rejected candidate. A successful compilation and two observer checks do
not certify general throw safety or game acceptance.

The unchanged source was rebuilt successfully before using the normal native example again;
check-restored.py compares that executable's complete events and complete
terminal saves to the ORIGINAL frozen Cut287 hashes on both parents. Its receipt
passes for both complete event streams and both complete after-saves; it is
separate from candidate acceptance. Labelled local executables remain in
target/cut289/probe-before and probe-candidate; do not mistake the latter for an
accepted runtime. Current WASM/defaults/deployment remain Cut284/earlier shipping
state; no repin/release/deployment is needed for a rejected, reverted experiment.

Source readiness also shows both original camps already have craftable bows
and spare pack capacity. preparation-readiness.json records this as a source
observation; public loadout selection is NOT_RUN. Test those existing choices
before assuming the build has no available ranged resources.

Next hypothesis should address the remaining no-ranged-resource melee encounters
and the card's waits while other foes fight the party. Measure the relevant
position/target/kit opportunity before another edit, preserve safe fallback and
bounded progress, and keep these numeric bars for any revised candidate. Existing
bows, optional build/variant choices and finite supplies must not be replaced
with unearned equipment or unlimited ammunition. This experiment does not prove
an overall gas-step defect on every build or accept new encounter formations.
