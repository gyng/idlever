# Cut210 core acceptance

The first merged native audit is preserved in `native-all-first.log`: 851
passed, four failed, six ignored. None of these failures required a production
runtime change after the automatic-cache source freeze.

Two tests expected the removed manual chooser. The forecast test now checks
that a loaded pending choice settles once through the saved armour preference
(raw 30, carry 7), while keeping its existing private forecast and memoization
checks. The watched-run test requires an actual automatic cache pickup, no
Choose input, and the same full event replay and tap parity.

The stall test previously required all forecast deltas to descend, although
Cut122 deliberately puts harmful whole-run patches after safe patches. It now
requires safe patches first and descending deltas within each safety tier.
The actual current diagnostic in `root/stall-order-diagnostic.log` shows safe
.76, safe .12, then harmful .30; that last patch raises death probability to
1.0. The harmful patch is never promoted to satisfy an obsolete raw sort.

Immediate cache equipment changes later combat timing, as the contract states.
Historical seed 363/death 15 no longer supplies the zero-survival theft fixture.
The read-only `cut210_trace_probe` example plays actual eight-hour literal
histories, filtering recorded theft causes before measuring their patches.
`theft-search-final.log` finds seed 187/death 2: a den stole the unknown murky
potion. Its baseline is 0, causal patch survival 0, forecast delta 0, no_gain=true;
the first immediate non-root fix has survival 1. The regression changes only
seed, death id and observed flavour; every original numeric/order/cap assertion
remains. No receipt, theft or counterfactual result was manufactured.

All four amended tests pass individually. Earlier failed logs remain intact.
Final whole-workspace native acceptance passes: 855 passed, no failures, six ignored.
All-target workspace Clippy also passes with warnings denied. Full raw terminal
logs are `native-all-final.log` and `clippy-final.log`.
These checks do not certify the exhaustive balance audit or the fun-rating goal.
