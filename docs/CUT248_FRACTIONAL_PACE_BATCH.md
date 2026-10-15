# Cut248 — exact fractional pace in quiet tick batches

Contract2026-10-16. Separate correctness fix after the preserved Cut247-only
source boundary. Keep all authored pace values, costs, gear, policies and gate
bars. No class/weapon recommendation or default progression policy is selected.

## Earned pre-fix proof

The unchanged earned Cut246 fighter/sword parent has12021Gold and six armour
steps. Actual e62c public `buyKit("armour:pace")` quotes and debits9000Gold,
leaving3021; its ledger names `forge pace +8%`. Manual send133 has pace8 at D1.
At tick10 public single steps give88energy (8base ×10 +8periodic bonuses),
while a public one-second offline slice gives83. All other hero fields,
monsters and RNG still match. Exact parents, payment, sent Session and original
package hashes are retained in `docs/evidence/cut248/baseline/`; no grants or
direct saved-state edits prepared this case.

`turn::tick` adds the whole-point speed and `pace_energy` separately each tick.
The quiet path previously used only whole speed for both its eligibility bound
and final energy. Adding only the missing sum is insufficient: an action that
becomes eligible inside the span must run at its first real eligible tick.

## Proposed bounded algorithm

Keep the existing fast bound when `pace.rem_euclid(10)==0`. Otherwise inspect
at most the candidate quiet span's nine ticks in chronological order:

```text
energy = current energy
for offset = 1 .. candidate span:
    energy += whole speed
    energy += pace_energy(pace, current turn + offset)
    if energy >= action threshold:
        quiet span = offset - 1
        stop
```

After all actor/status/period bounds have selected the final span, add its exact
fractional bonus sum to `whole speed × span`. Compute the sum in constant time
with a periodic prefix count over the half-open tick interval:

```text
r = pace.rem_euclid(10)
prefix(n) = floor(n / 10) × r + min(n % 10, r)
bonus = prefix(turn + span + 1) - prefix(turn + 1)
```

Use wide intermediates for the tick coordinates. The new helper receives a
bounded quiet span; integer pace points remain in `Hero::speed`. Preserve the
normal single-tick action ordering, including zero/negative whole speed and
negative signed pace representations. Do not disable quiet batching for every
fractional build or change the authored distribution of bonuses across ticks.

## Numeric acceptance

1. Preserve a focused pre-fix native red regression of the immutable actual
   paid sent Session: independent expected tick10energy88 versus old83. On
   corrected runtime the same case has exact single/batched energy, events,
   RNG and complete run state. Input and real9000Gold debit remain unchanged.
2. Exhaust all ten fractional remainders and ten tick phases, whole signed
   pace representatives, whole speeds below/at/above zero, and energies just
   below/at/above the next action threshold. Independently calculate every
   eligible action tick and final energy; compare events, RNG and complete run
   state across arbitrary quiet-span boundaries. At least one fractional case
   must skip actual ticks. Include tick-coordinate edge arithmetic and r0.
3. The prefix helper must equal independent per-tick periodic counts for all
   phases/remainders and span0–9, including rollover. It must not read or move RNG.
4. The complete actual paid earned run must match single ticks/batched/held
   replay, and Cut247's four earned/armour boundary/one-three-resident regressions
   remain passing. Preserve the Cut247-only969test/Clippy pass as its own boundary.
5. After focused red/green, run combined full fast workspace and default
   workspace/all-target Clippy. Coordinate actual new WASM before replacement,
   then verify paid/unpaid earned public continuations, settlement manifests,
   one/three-resident whole/sliced/reload parity, affected pacing and routine full.
   Preserve exact changed outcomes; never weaken bars or normalize differences.
6. Keep dated contextual observations with source/package/input identity and
   revalidation triggers. Earlier e62c and Cut247-only measurements stay
   historical; full goal, exhaustive and fun acceptance remain separate.

No production248 mutation precedes the coordinated candidate review. No UI,
art, new loot or policy/tuning change belongs to this cut.
