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
   matches the measured effect size. — **chosen and applied 2026-10-17** (below).
2. **More seeds**: raise the pets clause's sample (48+ seeds) so a real 2-point effect
   could be resolved; costs wall time on every exhaustive run.
3. **Re-scope the measure**: compare a statistic pets should move more strongly (e.g.
   deaths per *send* conditioned on companions actually being brought, or pet-specific
   causes), leaving the death-rate clause as descriptive only.
4. **Leave it**: the exhaustive audit keeps reporting exactly this one failure.

## Applied 2026-10-17: option 1, the ±2-point tolerance (owner-authorized)

The owner chose the tolerance. The clause is one expression,
`crates/idlever-core/examples/dayplayer.rs:2103`:

```rust
"pets" => {
    let d = |o: &SeedOut| 100.0 * o.deaths as f64 / o.sends.max(1) as f64;
    let (a, b) = (mean(t, &d), mean(w, &d));
    // Owner 2026-10-17: ±2 points — the effect this tests is 0.02–1.95 points with no
    // significant paired signal at 16 seeds (this finding), so a strict `<` reports noise.
    (a, b, "% deaths", a < b + 2.0)
}
```

Verified against the gate's **own cached legs**, which is the only affordable way to read the
new bar's verdict (the cost note below): every key carrying both configs now passes.

| source key | seeds | with | without | Δ (pts) | strict `<` | `a < b + 2.0` |
|---|---|---|---|---|---|---|
| `32ec69646de439fb` | 16 | 32.5 % | 33.4 % | −0.95 | PASS | PASS |
| `392c4756e09d775a` (the reported failure) | 16 | 61.3 % | 59.3 % | +1.95 | FAIL | **PASS** |
| `4fd4d0e184912ad3` | 16 | 10.6 % | 11.0 % | −0.40 | PASS | PASS |
| `7b74699adc230110` | 16 | 10.6 % | 11.0 % | −0.40 | PASS | PASS |
| `f40be1bf3e2f0fa2` | 16 | 10.6 % | 11.0 % | −0.40 | PASS | PASS |
| `d7ce4c265843bde1` | 15 | 10.7 % | 10.7 % | +0.02 | FAIL | **PASS** |

4/6 strict → **6/6 under the tolerance**; `pets-clause-analysis.mjs` now prints both verdicts.

What this does and does not settle:

- The clause no longer fails on an effect it cannot resolve at 16 seeds; it tests "pets must
  not be worse by more than two points", consistent with `bank`'s existing 1 % margin.
- **The exhaustive audit's dayplayer leg still needs a fresh run** to certify today's source:
  the cached legs above belong to their own source keys, and editing this expression changes
  the cache key. That run is expensive — a measured attempt at 16 seeds spent 638 s on one
  TUNED seed and had not finished its first configuration after 900 s — so pay it inside
  `tools/verify.sh --exhaustive` (or `tools/gates.mjs --exhaustive`), not ad hoc.
- Options 2 (48 seeds) and 3 (a re-scoped measure) remain open as better science; option 4 is
  withdrawn because the noise is now documented rather than suspected.

Do not move the expected value to obtain green. Limits: cached legs only (no new
simulation), one day-depth per leg, and the bar's own per-seed aggregation is
reproduced rather than re-derived from raw runs.
