# Cut 179 — recover QA saves and resolve observed feedback gaps

The interactive QA browser disconnected after 42 actual active minutes. Its
nonpersistent context had no original save export, so all three return phases
remain incomplete. Preserve that attempt and every finding; do not reuse its
cold time in another town.

The same pass found three presentation gaps: damage rates and totals silently
used different hero/team scopes; Scout settings discarded a pending bloodline
confirmation; tapping an already fielded companion produced no response.

## Required behavior

- An opt-in driver checkpoint atomically stores committed game browser storage
  after operations. Restoration uses those unchanged earned bytes. No forced
  save, edited timestamps, reset or grants. Reject unrelated origins, storage
  keys and cookies. A disconnected browser must retain the last checkpoint.
- Damage detail labels hero and pets separately, with each rate, HP total and
  hit count belonging to its named owner. Underlying Rust totals stay unchanged.
- Closing Scout settings returns to the pending founding confirmation. It
  reflects the current Scout setting and price, and never buys a bloodline
  until Found is explicitly tapped. Menu/reset/import navigation cancels return.
- Repeating a fielded companion tap announces that state; it never dismisses
  the companion. The selected state is also exposed to assistive technology.

## Gates

1. Original strengthened report-time and founding regressions both fail.
2. Those existing checks pass at 320/400/1440, retaining all original checks,
   including exact-save cancellation, single charge, roster cap and Scout-off
   direct founding. Watch-meter repaint/frontier checks also pass unchanged.
3. Real shipping-WASM browser checkpoint recovery passes after deliberately
   closing the owned test browser: identical seed, earned house, gold and hero
   IDs; original snapshot hash unchanged by the failed operation; zero cookies
   and only game storage. This proves recovery, not a QA/rating horizon.
4. Types/copy lint and complete original client suite pass before adoption.
   No Rust behavior or native gate parameters change.
5. Start a fresh full interactive QA attempt with checkpoints, then preserve
   its complete horizon and resolve each finding before the blind cohort.
   Two fresh independent complete ratings and the original score/reliability
   requirements remain necessary. No deployment.

The first checkpoint smoke used the wrong driver eval argument/result shape;
that failed harness attempt is preserved. A separate corrected attempt passes.

## Complete client acceptance after the text expectation update

The initial complete run finished165/166 in1479.3s. Its only failure was Cut29's
death-meter assertion expecting the old unlabeled `dealt 3.7 dps` text. Preserve
that terminal failed run. Update only this expectation to require the named
hero and exact31/38HP totals; retain its numeric rates,9hits, healing and named
rule checks, all fixtures, every branch and the complete test.

Acceptance may combine those165 completed passing groups with a fresh complete
Cut29 pass, provided a strict guard proves that the only intervening change is
those two expectation expressions, no other test imports Cut29, every shared
product/harness/fixture input and shippingWASM is unchanged, and the exact
current discovery contains all166 unique groups. Keep both original reports
immutable and record the combination as derived evidence. Never call the
original full invocation successful. Any additional shared-source change or
failure requires new affected validation; this exception cannot certify it.

This avoids another25-minute run for an isolated wording expectation while
retaining every actual current client check. It does not reduce the QA or blind
rating horizons, weaken a numeric gate, or prove the fun score.
