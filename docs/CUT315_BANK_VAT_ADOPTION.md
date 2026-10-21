# Cut315 — Bank/Vat upgrades and 15-second early recovery, adopted

2026-10-21. Owner: "finish up bank value redesign + recovery tuning. we will queue
up a comprehensive ui rework/refresh after". This cut moves the Cut306–314
redesign out of isolation into the shipping game, and adopts the owner's
original 15-second early clone (Cut264). The UI is functional and deliberately
plain; the queued UI rework restyles it.

## What ships

Core (`upgrades.rs`, numbers in `balance::Upgrades`, `tuning/balance.json`):

- **Bank L3/L4** (after the Clerk's L2): D13/D23, 3400/43200 Gold (8/64 forge
  units at the gate). Hold 5/8 nights of net income, and pay +2%/+4% a night
  extra interest on Savings, on top of the Clerk's rate.
- **Vat L2/L3**: D13/D23, 3400/43200 Gold. Every FUTURE death's recovery
  −20%/−35% (rounded up to the tick); manual hurry −25%/−50%. A recovery
  already in progress keeps its length. A confirmed reclone keeps the full rule.
- One shared town level per building (`Town::levels`, synchronized by
  `town_from`). Empty maps are not serialized; old saves load unchanged.
- **Recovery**: `recovery = [150, 14, 28, 1]`. Deaths through D14 take 15 s
  (was 60 s), ramping linearly to the unchanged 20 min cap at D28.
- Purchase is an explicit home command. `Session::upgrade_building(Request)`
  takes `{id, payer, level, max_price, use_savings}` echoed from the quote.
  It refuses a stale payer, level or price, an away hero, a locked or
  unaffordable level, and a Savings shortfall without `use_savings`. Every
  refusal happens before any mutation. Then it withdraws exactly the quoted
  shortfall, charges once and returns a receipt. Readiness is town-wide: the
  deepest record of any resident, and the Vat earned by any resident. The
  uncollected chest never funds a purchase. Ledger term: `works`. Purchases are
  not counted in the night's net.

Wire/client: `town.upgrades[]` (level, max, effect, the next level's quote with
payer, purse, withdrawal and affordability) and `upgradeBuilding(request)`,
which returns `{receipt, lineage}`. Rows appear in the Bank sheet and in the
Vat's panel. The purse pays by default; a shortfall needs the explicit
`Savings $N` toggle. TS computes nothing. Fake engine mirrors the core's prices
and refusals.

Bots: engaged bots (`arm 2`: PICKED, TUNED, DAILY, AWAY, PICKED+L) run Cut308's
town-first plan. Once Bank III is ready, they pause tithes through the public
`ration` sink order. They buy Bank III → Vat II → Vat III → Bank IV from owned
Gold and Savings, keeping three live-depth units in the purse, then restore
their order. IDLE never buys. A new leave-one-out system, `buildings`, measures
its own output as interest paid.

## Gates

1. Mechanics (native `tests_cut315`): 12 refusals each leave the whole Session
   byte-identical. 2- and 3-resident towns pay 3400/3400/43200/43200 with exact
   wallet debits; levels are shared, survive save/load and whole/sliced/reloaded
   background play, and are inherited by a new resident. A future D28 death
   stores 7800 ticks and announces Rest 780 s; a reclone stays at 12000. The
   chest is not funding. Gold-only leaves Savings untouched. Recovery is 150
   ticks through D14.
2. Bot plan (`dayplayer_upgrades` test): it waits for Bank III, buys all four
   (93200), and restores the sink order.
3. Real-WASM client journey (`web/tests/building-upgrades.mjs`, at 402×681 and
   1440): Savings toggle required, four stale requests refused with the save
   unchanged, one exact debit and exact withdrawal, level kept across reload,
   Vat row present.
4. Routine `node tools/gates.mjs --full`, plus the new bar: PICKED spends ≥ 10%
   of days 3–14 income on upgrades (median).
5. Workspace tests, Clippy `-D warnings`, fmt/lint/tsc/copy-lint, WASM rebuild.

The inherited `tuned-picked` failure (TUNED/PICKED D33 1.10 against ≥ 1.15) was
reproduced unchanged by this redesign in Cut308 and Cut309, and by the current
reference. Neither shallow recovery (Cut309) nor the upgrades (Cut308) moved
it. It is recorded as an inherited deviation below if it persists; it is NOT
re-benched or relaxed.

## Results

See [evidence/cut315/README.md](evidence/cut315/README.md).
