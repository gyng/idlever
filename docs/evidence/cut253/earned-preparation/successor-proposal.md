# Successor diagnostic proposal — after the retained seed1 pilot

2026-10-16; proposal only. The original pilot, terminal receipt and89raw JSON
archives are frozen in earned-pilot-seed1-fighter/raw-inventory.json. No further
campaign or production change is authorized by this proposal.

## Actual departure captures

Keep exactly the same public offline transport, requested seconds, policy and
clock. After each existing60s slice, inspect the already-generated bounded
`Session.active.capsules.0`. For each ID newer than the frontier, serialize the
actual `Capsule` (its real send Game, pre-events and input sequence), before
serialization eviction. Do not call try_send to manufacture a convenient early
departure, advance an extra tick, remove rest, reset RNG or patch saved state.
The first newly observed capsule, whose run turn must equal0, becomes
`first-actual-departure.capsule.json`. Preserve all newly observed send capsules
and record their actual run IDs/owner/class/weapon/masks. Stop using the misleading
first-slice-with-send-capsule name; a60s transport checkpoint may precede any send.
Assert that every newly completed RunRec has its original captured capsule and
that no capsule belongs to another resident/old frontier. If a short-run burst
could evict an uncaptured capsule, fail explicitly; do not reconstruct its start
from post-run state or silently omit the run.

## Branch-only reason counters

Do not subtract lineage.row_why values. `fold_row_tally` halves counts past20000
and drops rows absent from compiled sets; index-based lifetime differences lose
information and can misattribute different rows. A per-run fold also consumes
`Game.row_tally`, so a post-exit snapshot alone cannot recover its exact raw tally.

Use the captured actual send capsule for a separately labelled diagnostic
reconstruction: clone it, advance through public Game.tick without changing
watched/offline/hero/owner/RNG/rules, stop at real run.over before settlement, and
read its per-run raw row_tally. Pair each tally entry with that capsule's actual
compiled row identity (conditions+verb+origin), bloodline/hero and run ID. Check
its full event hash against public Game.replay and actual duration/outcome/run
identity before admitting it. Do not reset/alter the original Session's counters.
Sum only admitted current-branch run tallies by stable row identity, never by an
index across builds or residents. Keep per-run evidence so retries, missing
runs and owner mismatches cannot silently duplicate counts.

Label these reason counts reconstructed. Preserve separate reasons: unmet
condition, earlier row/chore selected, actual refused eligible verb, row guard
and suppressed loop. A higher-priority row firing is not itself a wasted action;
blocked row evaluations are not necessarily spent energy. Report refusal counts
and actual action meters independently. Do not claim a single "wasted actions"
quantity until its semantics are explicitly defined and supported by the events.

## Validation before more cohorts

The successor should first replay the retained paid frontier into a NEW output
path, never overwrite the original results. Compare complete final reports and
saves against the original branches (diagnostic captures must not affect them),
then independently verify actual new send turn0/owner/class/weapon/mask plus the
new per-run reason reconstruction. This is a capture-only continuation proof,
not a fresh campaign, seed selection or retry for a better outcome. It needs
parent coordination before execution. Preserve any mismatch as a failure.

Full15class/seed cases, genuine three-seed stage availability, zero-defeat
survivor, all30controlled interactions, exact equivalence, rebuilt-WASM client
journeys and progression gates remain required. This proposal supplies none of
those missing passes by itself.
