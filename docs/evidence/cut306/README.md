# Cut306 — isolated Bank/Vat utility redesign

Owner authorized reopening/redesign. This is a working native prototype,
archived source/patch and real earned-context measurements. It is not integrated
into the shipping client or Session upgrade API, and is not adopted as a default.

Bank L3/L4:5/8-night capacity plus additive20/40permille interest per game night
on real Savings. Vat L2/L3:20/35% shorter future death recovery plus25/50% manual
hurry discounts. Both benefits work offline. Existing recovery in progress is
unchanged; there is no automatic paid hurry. Original3400/13500 prices and
D13/D23 gates remain only for the utility screen, not accepted final pricing.

Fresh current ordinary PICKED seeds1/2,7days,42earned camps. Fixed contexts are
last check-in (c2) on days3and7, not necessarily an upgrade's earliest eligible
camp. All four have D33, an earned Clerk, Gold1975–2775 and Savings17827–23914.
Buyers explicitly withdraw only OWNED Savings as needed, preserving3live-depth
units, then pay3400. No funds, supplies, facts, progress or items are granted.

Each context has shipping unchanged plus prototype unchanged/repeat/Bank-first/
Vat-first. Four shipping-to-prototype no-level full-file comparisons and four
whole repeated continuations are byte-exact. The prototype captures5170actual
completed expeditions across16continuations, including repeats. They are NOT
5170independent statistical observations. Eight paid branches/2290deaths are
retained; results are fixed-context diagnostics, not population acceptance.

| Context | Bank interest payback | Bank wealth delta | Bank available Legacy delta | Vat extra runs | Vat wealth delta | Vat available Legacy delta |
|---|---:|---:|---:|---:|---:|---:|
| seed1/day3 | 10payments | −599 | +4 | +45 | −182 | +93 |
| seed1/day7 | 9payments | +5303 | 0 | +44 | −1490 | +94 |
| seed2/day3 | 9payments | +3443 | 0 | +34 | +8862 | +52 |
| seed2/day7 | 11payments | −12623 | +1 | +37 | −574 | +74 |

All eight diagnostic utility cases PASS. Interest payback means actual extra
interest accrued at matching bank-payment counts≥3400, with the purchased
world's actual reduced principal and ordinary worker behavior. It does not
mean final-wallet or monetary total-value payback. In seed2/day7,6039extra
interest minus3400purchase and15262extra existing-worker sink spending yields
−12623wealth; the worker buys one extra Legacy tithe. Other outputs and rations
also change. No monetary value is assigned to Legacy points. economy.json is
explicitly POST-result descriptive accounting, not an extra inference claim.

Every recorded future Vat death uses ceil(base*80/100) ticks, with at least one
in every context. Actual recovery time spent is independently reconstructed by
intersecting the original/future recovery intervals with each played horizon;
all16native counters agree. More runs/Legacy do not establish deeper progression:
all final bests remain D33. No fortnight, worker-benefit, pen, King, population
or independent fun acceptance is implied.

Horizon:30bank payments or7game days, whichever first. Shortfalls are retained;
the seven-day cap binds before30payments here. Ten-second NONFINAL transport
slices observe each completion/death/payment inside one absence; a single
zero-second final close retains the ordinary at-most-one finish-run tail.
Payback uses matching pre-tail payment receipts. Minutes/deaths/runs are not
additional campaign seeds, and repeated reports are not check-ins.

Runtime: four shipping controls50.71s;16prototype continuations316.78s. Native
compilation is separate (first4m01s, test-only source qualification rebuild
3m55s, final test split3m36s). No broad full-tuning campaign ran.202original
JSON files/751423507raw bytes compressed losslessly to7.9MiB, plus1.5MiBsource
archive. This runtime is specific to these fixed contexts/observation/report
protocols, not a general whole-game speed claim.

Validation: three focused mechanics tests pass, scoped production probe/library
and cleaned test-driver Clippy with warnings denied passes; both probe variants
and cleaned driver pass rustfmt. Independent
archive/source/input/preparation/ledger/timer/control/repeat/utility verification
passes. Wallet/Savings/interest ledgers reconcile fully, including transfers and
purchase spending. Run:

```sh
python3 docs/evidence/cut306/verify.py
python3 docs/evidence/cut306/verify-recovery-spent.py
python3 docs/evidence/cut306/validation-source/verify.py
```

The second command also reproduces economy.json from archived original saves.
The third proves that the cleaned test driver preserves every original test
token, including string literals; only a cfg(test) wrapper and whitespace differ.
Use `python3 docs/evidence/cut306/validation-source/prepare.py` to reproduce the
isolated prototype with this cleaned driver. The original frozen driver/source
archive remain unchanged as the exact historical runtime inputs.
These audits inspect receipts/source identities; they do not implement a second
gameplay simulator. No shipping WASM, frontend or whole-workspace acceptance
claim is made. Main game code/defaults and deployed source remain unchanged.

Preserved corrections/limits:

- First ordinary capture omitted its output-directory creation. Original complete
  observations/18partial camps are retained. Identical fixed request rerun yields
  all42camps; whole observations match except elapsed_seconds, all18overlap camps
  byte-identical. No seed/context reselection.
- Original contract bytes are preserved against their pre-execution hash. Before
  utility outcomes, protocol clarified nonfinal slices/one final close and exact
  rounding. No sample, benefit, price or numeric acceptance change.
- Initial test type path corrected to engine::ExitTier. Two synthetic fixture
  failures fixed by normalizing derived package state through public load, and
  ticking once before an away assertion (turn0 is a home preparation). Sources/
  errors retained, no candidate utility reruns. Test driver split from runtime.
- Initial driver-binary Clippy flags test-only imports/helper as unused; a
  broader --tests attempt additionally requires omitted historical library
  fixtures. Both failures retained. After utility execution, a separate cleaned
  driver places the SAME test tokens inside cfg(test), fixing binary lint and
  the leading blank line. Three tests, strict Clippy on library/production probe/
  driver and driver format now pass. Token proof and source hashes show no
  changed rule/test assertions or native utility rerun. Whole-workspace/library-
  fixture audit remains unclaimed.

Next: make isolated tuning compile-free, then design late pricing/progression
and explicit saving priorities around actual affordability, utility and existing
Legacy/ration spending. The old total33800 cannot meet10%of seed1's598545late
gross even if all purchases move late. Do not satisfy the spend requirement by
pointless purchases or fund grants. Test both effects/levels together and
earliest eligible purchases, shared-resident save/API/UI behavior, and retain
worker/pen/absolute progression/King requirements before adoption. Base shorter
recovery remains coordinated active work, separate from optional Vat reductions.
