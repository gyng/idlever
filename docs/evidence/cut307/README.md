# Cut307 — compile-free profiles, earliest purchases and a funded saving plan

Isolated prototype only. No shipping rules/defaults, client, Session API or
deployment change. Complete schema1 upgrade profiles are validated and locked
once before game/forecast use. Separate Bank/Vat prices, gates, capacity/yield,
recovery and hurry percentages are adjustable without rebuilding. Profiles do
not enter saves. Missing/unknown/duplicate/type/range/order/version errors fail
before output; invalid parses do not lock state, later reconfiguration fails.

Six native mechanics/parser tests and six invalid-profile/two valid-profile
process checks pass. The SAME immutable profile-probe executable reads42camps
under each profile and quotes a legitimately paid first effect in5.42s total.
Reference/budget second prices are13500/43200, while the actual paid-first Game
preparations, rules and RNG remain byte-identical. This is observed scan/quote
cost, not a whole-game tuning benchmark. Profile initialization is per process.

Default-profile refactor parity: all four original Cut306 seed1/day7 branches,
all seven original files each, byte-identical to Cut306. This is one-context
executable parity, not a new four-context utility result.

Earliest legal first purchases are selected by actual clock then numeric day/
check-in from all42 original current earned camps, never by future outcomes:

| Context | Clock seconds | Gold | Savings | Reserve | Bank extra-interest payback |
|---|---:|---:|---:|---:|---:|
| seed1 Bank | 141154 | 6863 | 0 | 2775 | 12payments |
| seed2 Bank | 141010 | 15821 | 0 | 2700 | 10payments |
| seed1 Vat | 83554 | 5609 | 0 | 2175 | — |
| seed2 Vat | 83410 | 6200 | 0 | 2400 | — |

Each gets unchanged/repeat/matching-first-upgrade:12continuations/3612actual
completed runs including repeats. All four fixed utility cases PASS; every
future Vat timer uses ceil(80%base). Payment is3400from earned funds, retaining
the reserve; nothing is granted. Bank endpoint wallet differences+3890/−3946,
available Legacy0/+1; latter includes an extra existing-worker tithe. Interest
payback is not a final-wallet guarantee. Vat available Legacy+83/+28, wallets
−1045/−396. Its seed1 D33 arrival is6230s LATER, seed2 is13170s EARLIER; Bank D33
arrival unchanged. These conditional tradeoffs are retained, not an absolute
progression/non-regression or population claim. There are only two reused seeds.

Reference first/second prices3400/13500 total33800; budget candidate3400/43200
total93200 across four buys. All42 baseline camps have insufficient owned
surplus for even one43200second effect (maximum23914). Static saved affordability
is a bound, not sequential spending or upgraded-world income. It motivates an
explicit saving choice, rather than another purse-only price search.

Prespecified saving tactic: from each seed's earliest Bank camp, keep the existing
`ration` order while saving for Bank L3 → Vat L2 → Vat L3 → Bank L4. Only actual
owned Gold/Savings pay,3live-depth-unit reserve retained. Restore original `both`
after all four. No new automatic buyer/worker, mandatory policy or free funds.
Initial purchase choice then21ordinary8h returns; all other choices stay as saved.
Unchanged/town-first/repeat for each seed: six continuations/2333actual runs.

| Seed | Last purchase, actual town day | Total paid | Paid from day3 onward | Extra completed runs | Extra available Legacy | Wallet difference |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 5 | 93200 | 86400 | +78 | +170 | −2232 |
| 2 | 4 | 93200 | 86400 | +151 | +306 | +5697 |

Both fixed funding targets PASS; original order restored. No King slain; all
final bests D33. Full before/after camps, paid preparations, transfers, policies,
reports and exact repeats retained. Outcomes combine upgrades AND the explicit
saving tactic; they do not isolate either second tier's marginal value. Day3
here is the actual town clock, not certification of the dayplayer days3–14
window or its≥10%median-spending requirement. No monetary Legacy valuation.

Reference123.91s, earliest103.82s, saving165.87s (jobs overlapped). No full ordinary
fortnight/canonical gate or independent population/fun acceptance. Frozen source,
three executable hashes, profiles, input/spec and pre-outcome selection receipts
are retained.431original raw files/1707956085bytes compressed to16.9MiB, plus a
source archive. Cut306's existing archive supplies the original42inputs and
reference oracle, avoiding another copy of that full corpus.

Validation status is recorded in validation.json. Scoped new Rust formatting,
production/library/all selected example-driver Clippy with warnings denied and
six native tests pass. Independent archive/source/input/selection/preparation/
ledger/timer/reference/repeat/saving checks inspect original receipts, not a
second gameplay implementation:

```sh
python3 docs/evidence/cut307/verify.py
python3 docs/evidence/cut307/verify-summary.py
```

Reproduce isolated source with `python3 docs/evidence/cut307/prepare.py`.
The summary-only command reads hash-checked retained local raw outputs; restore
capture.tar.zst into target/cut307 if those generated files were cleaned. The
full archive audit is a milestone check, not part of an inner tuning loop.
This extracts the exact Cut306 source and replaces only the declared module/
drivers, checking the current shipping core still matches that base. Runtime
profile JSON is a distinct part of every job's identity, never a canonical
gate-cache alias. No candidate gameplay reruns or numeric bar changes.

Next: an ordinary new-town targeted fortnight discovery pilot of the explicit
saving/buying policy, including both PICKED/TUNED and actual days3–14 gross/spend,
absolute arrivals/worker/pen/King constraints. Then suitable independent
confirmation and shared-resident API/UI integration. Prices remain a tested
funding candidate, not accepted shipping prices. Base shorter recovery stays
active coordinated work; the full backlog remains open.
