# Cut314 — shared Bank/Vat API prototype

Isolated native Session implementation; no shipping library, balance, WASM,
wire, UI or deployment adoption. Prices/effects remain experimental. Main adds
only the deterministic `shared_upgrade_baseline` diagnostic. Cut312 stays
terminal INCONCLUSIVE, and worker/pen/recovery progression bars stay open.
Contract: [CUT314_SHARED_UPGRADE_API.md](../../CUT314_SHARED_UPGRADE_API.md).

`Session::building_upgrade_offers` reads maximum resident depth and any resident's
existing earned Vat service. Bank requires its built plot and Clerk. Selected
hero eligibility follows the existing home/preparation convention. Quotes show
collected purse, Savings and exact shortfall. `upgrade_building(id,max_price,
use_savings)` validates every refusal before mutation; explicit permission
allows only the exact required owned withdrawal. It charges once, shares levels
through existing `town_from`, and returns payer/level/price/withdrawal/wallets.
Legacy uncollected chest does not fund purchases. No order changes or ticks.

Controlled mechanics evidence, **not earned affordability/population evidence**:

- Ten distinct refusals preserve the whole serialized Session byte for byte.
- Two- and three-resident fixtures buy Bank3/Vat2/Vat3/Bank4 for
  3400/3400/43200/43200. Low-record selected hero uses the other hero's earned
  readiness without receiving personal record/defeat metadata. Ten successful
  payments total, including legacy-chest and Gold-only routes. Quotes are pure.
- Whole payment snapshots differ only by exact withdrawal/debit/ledger/shared
  levels; personal state, RNG, clocks, existing recovery and orders are unchanged.
  All residents see levels and benefits immediately. New third resident costs
  the existing250 fee, inherits levels and preserves wallets across selection.
- Existing12000-tick recoveries stay unchanged. Future ordinary D28 death stores
  7800ticks and emits Rest780seconds. Confirmed stat-reset recovery remains
  12000ticks. Paid three-resident1300s whole/sliced/reloaded continuation agrees.
- Same earned seed2 16h input, three actually purchased resident slots, no grants:
  shipping/prototype Game, Session before/after, pure read, report and combat
  replay outputs are exact bytes. Native drivers also assert3600s whole versus
  sixty60s slices with reloads. These fixed continuations do not certify pacing.

The old prototype missed the `finish_run` emitted Rest hook while shortening the
stored timer. Both now use the same paid factor in this isolated source. Current
Cut309 configurable recovery cap remains the underlying rule. Default no-level
maps omit serialization and do not change these observed outputs.

Corrections and limits are preserved:

1. First mechanics test failed its blanket paid-save byte equality. The synthetic
   fixture had changed `last_night_net` without refreshing its oath board; existing
   Game::load reprices unsworn oaths500→100. Comparison now loads the identical
   paid state with levels removed as a control, then restores only levels and
   requires complete equality. A second load must be byte stable. Original
   probe and failed log retained. No game load behavior changed.
2. First strict replay-presence assertion failed because this bot input omits
   capsules. Diagnostic now captures one bounded combat run from a clone of the
   same unchanged camp; shipping/prototype replay bytes must agree. This is
   current combat replay evidence, not recovery of a historical missing capsule.
   Initial identity/source hashes and failure retained; corrected runtimes frozen
   before the corrected parity captures.
3. First library-test build lacked three existing include_str! earned fixtures.
   After copying them, the library run passed1096tests, ignored6 and failed8
   solely on missing runtime fixture reads (wish histories, rater rules and an
   earned ascension save). All15 compile/runtime inputs are copied unchanged
   and archived. Only the eight affected tests are rerun, without source changes.
   All eight exact rechecks pass; together with the unchanged1096passes this
   covers1104passing tests/6ignored, not a fresh single green full-suite run.
   Original failures are retained. No tests or assertions removed.
4. Controlled payment fixtures close existing lazy shared-town mirrors before
   measuring deltas. Tests do not claim every arbitrary malformed/stale mirror
   combination is personal-state inert. Existing town synchronization semantics
   remain authoritative. No wire/client behavior is exercised here.

Reproduce the independent archived accounting/transport audit without native
campaigns:

```sh
python3 docs/evidence/cut314/verify.py
```

`source.tar.zst` holds exact base/derived sources, `test-fixtures.tar.zst` the
15 compile/runtime fixture files, and `captures.tar.zst` the immutable input,
all mechanics snapshots and shipping/prototype outputs. `manifest.json` binds
all files. `capture-identity.json` binds runtime/input/profile/WASM hashes;
`prototype.patch`, `upgrades.rs`, `session-api.rs` and `prepare.py` expose the
implementation. Native commands, terminal receipts and failures are in
`validation/`. Focused mechanics test, scoped rustfmt, warnings-denied Clippy,
1104library tests across the initial run/eight repaired-fixture rechecks pass;
6ignored. Independent archived accounting/transport verification passes.
Timings under shared machine load are metadata, not benchmarks.

Next: shared wire/client quotes, explicit Gold/Savings confirmation and paid
resident identity in an isolated integration; then current browser journeys and
independent progression acceptance. Keep main defaults unchanged while the
upgrade/worker/pen/recovery requirements remain unproved. No automatic deploy.
