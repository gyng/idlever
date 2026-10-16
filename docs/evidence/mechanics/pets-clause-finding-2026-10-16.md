# The exhaustive audit's `pets` clause is a 16-seed coin flip (2026-10-16)

The only failing bar in the 272-case exhaustive audit is one clause of "each system
adds value by its own output (TUNED vs TUNED − S)":

```
Each system adds value by its own output (TUNED vs TUNED − S)   FAIL
  packages 28.0/52.0 h→D23 · pen 32.2/32.1 mean best · forge 32.2/30.8 mean best ·
  pets 61.3/59.3 % deaths · bank 1910.8/1700.4 $/day · quests 11.8/0.0 kept
```

The predicate for `pets` is `mean(deaths/sends | with pets) < mean(without)`
(`dayplayer.rs`, the `"pets"` arm of the per-system match). It compares *unpaired*
means over 16 seeds.

## Measured from the gate's own cached legs

`docs/evidence/mechanics/pets-clause-analysis.mjs` reads `target/gates/dp` — the
very legs the audit played (per-seed `deaths`/`sends` at the deepest cached day) —
and reproduces the reported 61.3/59.3 exactly on source key `392c4756e09d775a`, which
proves the parse. Every source key that has both `TUNED` and `TUNED-pets` at 16 seeds:

| source key | with | without | mean Δ (pts) | seeds pets worse/better | paired sign-test p | clause |
|---|---|---|---|---|---|---|
| `32ec69646de439fb` | 32.5 % | 33.4 % | −0.95 | 5 / 6 | 1.00 | PASS |
| `392c4756e09d775a` (today) | 61.3 % | 59.3 % | **+1.95** | 9 / 7 | 0.80 | **FAIL** |
| `4fd4d0e184912ad3` | 10.6 % | 11.0 % | −0.40 | 3 / 8 | 0.23 | PASS |
| `7b74699adc230110` | 10.6 % | 11.0 % | −0.40 | 3 / 8 | 0.23 | PASS |
| `f40be1bf3e2f0fa2` | 10.6 % | 11.0 % | −0.40 | 3 / 8 | 0.23 | PASS |
| `d7ce4c265843bde1` | 10.7 % | 10.7 % | **+0.02** | 3 / 7 | 0.34 | **FAIL** |

4 pass / 2 fail. The effect's absolute size is **0.02–1.95 points**, and the paired
sign test is never significant (p = 0.23…1.00) — including in the failing cases
(today: 9 worse / 7 better, p = 0.80; `d7ce4c26` fails on **+0.02 points**, a rounding
coin flip).

## What this means

- The clause is not measuring a pet balance signal at 16 seeds; it is measuring noise
  around a ≤2-point effect. Chasing the failing value by changing pets' content would
  be tuning to noise.
- The audited 7-pass/7-fail history (`docs/evidence/cut257/exhaustive-audit-findings.md`)
  is the same phenomenon across sources and dates.

## Owner decision (options, all of which need your acceptance — this is a gate)

1. **Tolerance**: accept "pets within ±2 points is neutral" (the only failing clause
   becomes PASS, and the bar keeps its meaning for larger effects). Cheapest, and it
   matches the measured effect size.
2. **More seeds**: raise the pets clause's sample (48+ seeds) so a real 2-point effect
   could be resolved; costs wall time on every exhaustive run.
3. **Re-scope the measure**: compare a statistic pets should move more strongly (e.g.
   deaths per *send* conditioned on companions actually being brought, or pet-specific
   causes), leaving the death-rate clause as descriptive only.
4. **Leave it**: the exhaustive audit keeps reporting exactly this one failure.

## Ready to apply, once you pick (this is the whole change)

The clause is one expression, `crates/idlever-core/examples/dayplayer.rs` (~2110):

```rust
"pets" => {
    let d = |o: &SeedOut| 100.0 * o.deaths as f64 / o.sends.max(1) as f64;
    let (a, b) = (mean(t, &d), mean(w, &d));
    (a, b, "% deaths", a < b)          // ← today
}
```

- **Option 1 (tolerance)** — `a < b + 2.0`, i.e. pets must not be worse by more than two
  points. Consistent with the sibling clauses, which already carry margins (`bank` uses
  `a > b * 1.01`). Comment it with the measured effect size and this finding.
- **Option 2 (more seeds)** — no code change: run the row with a larger sample
  (`node tools/gates.mjs --rows each-system --seeds 48`), which also re-samples every other
  system's clause at 48 seeds.
- **Option 3 (re-scope)** — replace the death-rate measure with one pets should move
  (e.g. deaths per send where companions were actually fielded); this is content/rules
  work, not a one-line edit.
- **Option 4 (leave it)** — nothing to apply; the exhaustive audit keeps reporting this
  one failure.

Either applied form needs the row re-run and the result recorded with the new value.

Do not move the expected value to obtain green. Limits: cached legs only (no new
simulation), one day-depth per leg, and the bar's own per-seed aggregation is
reproduced rather than re-derived from raw runs.
