# Cut265 — Building upgrades

Status: ACTIVE REDESIGN by owner decision2026-10-21. Owner returned held items
to the queue and authorized research/refinement/redesign of vault/Vat as needed.
See current [WORK_QUEUE.md](WORK_QUEUE.md) item3; do not restore the failed
candidate unchanged. The proposal and results below remain historical inputs.

Current redesign evidence: [Cut306](CUT306_VAULT_VAT_REDESIGN.md) implements an
isolated Bank yield/capacity and passive Vat recovery prototype. Its fixed paid
utility checks pass; final pricing, saving priorities, earliest purchases,
shared-resident API/UI and broader progression acceptance remain open.

History: held for redesign2026-10-18. Implemented candidate preserved on `hold/cut265-building-upgrades` at `445a1f3f`; excluded from the vat-only delivery. Owner decisions 2026-10-18: Bank, Vat and Kennel (Forge not in B1/B2); PICKED and TUNED buy,
IDLE never. Q2 (price fixed at the gate depth) takes the default. Implementation follows Cut264. Owner request: "plan for building upgrades".

## 1. Today

| Thing | Unlock / cost | Does | Levels now |
|---|---|---|---|
| House | free, by hand (`town.rs:132-136`) | residence, Hero Hub, Legacy | look 1–3 follows town stage |
| Forge | Scout + 4 delves (`unlocks.forge_delves`); free | kit ladders, salvage `[5, 15, 40]`, leash | look 1–3 from steps owned (3, 7) |
| Kennel | tame a pet; free | pets; bench XP 25% (`pets.rs:206`); lame 3 runs | look always 1 (art 2/3 exists) |
| Bank | a night's purse; free | 2% a night, cap 3 nights of net (`town.rs:156-158, 185-193`) | look 1–3 from balance |
| Guild, pool, vat | services, no construction | Receptionist; living rest; clone | none |

- Construction is always free. Worker ranks II–IV cost a locked unit × (rank − 1), about $300 (`tree.rs:665-712`).
- `BuildingWire.level` already exists (`wire.rs:1767`) and tips print "Level N" (`building-help.ts:45-49`).
- Town state is shared across residents (`bloodlines.rs:46-61`).

## 2. Proposal

- `Town.levels: BTreeMap<String, u32>`, default 1, max 3.
- `Game::upgrade_building(id, max_price)` requires: built, hero home, and the next level's depth gate reached. It
  spends `gold_move(-p, "upgrade <id> <n>")`. Add the prefix to the night-net exclusion list (`engine.rs:2215`) and a
  `gold_term` "town" category.
- Look = `max(derived look, bought level)`; existing looks never regress.
- Price is fixed by the gate depth, so it never chases the record:
  `price = price_units[n−2] × unit(gate_depth[n−2])`.
  - L2 = 8 × unit(13) = $3,400.
  - L3 = 20 × unit(23) = $13,500.
  - These are mid/late gold sinks, well above worker ranks.

Effects, orthogonal to worker ranks:

| Building | L2 / L3 | Worker on it | Why not duplicate |
|---|---|---|---|
| Bank | cap 3 → 5 → 8 nights | clerk: rate | capacity vs rate |
| Clone vat | hurry −25% / −50% (Cut264) | none | no bot hurries; gate-neutral |
| Kennel | bench XP 25 → 50 → 75%; lame 3 → 2 → 1 runs | kennel hand, keeper (looks) | convenience |
| Forge (B3, optional) | salvage counts −20% / −40% | apprentice: step price | reach, not price |

No levels for the House, guild, pool, crate or board.

UI:
- One row at the foot of each building's panel: `Level II`, an effect of ≤ 3 words, `Upgrade $3400`, or `D13 needed`
  when locked. Panels: bank sheet `town.ts:984`, kennel strip `party.ts`, `forge.ts:114`, vat header.
- One lantern marker when affordable, only if no other marker is there (≤ 3 markers; never the next pill).
- No tutorial text.

Bots: IDLE never buys. PICKED and TUNED buy in `camp_taps` (`dayplayer.rs:570-580`) when
`purse ≥ price + reserve`, after hires. `S = buildings` joins the leave-one-out for `nothing-required` and
`each-system`.

## 3. Balance keys

```json
"buildings": {
  "max_level": 3, "gate_depth": [13, 23], "price_units": [8, 20],
  "bank_nights": [5, 8], "vat_hurry_off_pct": [25, 50],
  "kennel_bench_pct": [50, 75], "kennel_lame_runs": [2, 1], "forge_salvage_off_pct": [20, 40]
}
```

Level-1 values stay where they are (`gold.bank_nights`, `BENCH_PCT`, `LAME_RUNS`, `kit.forge_ladder`); `BENCH_PCT` and
`LAME_RUNS` become balance-read helpers.

## 4. Phasing and gates (16 seeds)

- **B1, core + wire + Bank and Vat panels.**
  - IDLE 16×14 byte-identical.
  - These rows pass: `picked-idle`, `tuned-picked ≥ 1.15`, `outpace`, `workers-daily`, `conserved`,
    `picked-l-king` (King no sooner than day 7), `picked-l-purse`.
  - New row `upgrades-sink`: PICKED median upgrade spend ≥ 10% of gold, days 3–14.
  - New diagnostic `bank-payback`: median L2 payback ≤ 30 nights.
  - Also: repin, a client journey at 402×681, copy-lint.
- **B2, Kennel.**
  - `pets_eval` shows no early regression.
  - These rows pass: `nodes-lit`, `nodes-bought`, `each-system`, `nothing-required` with S = buildings.
  - `gates.mjs --pacing` passes.
- **B3, Forge salvage (if kept), look unification, FX** (WORK_QUEUE #38).
  - `tuned-picked` and `picked-l-king` hold.
  - `verify.sh --full`.

## 5. Depends on

Cut264 (the vat hurry that the vat levels discount). Cut260 must land first; it touches the economy and pacing rows.

## 6. Owner questions (recommended default first)

1. Which buildings: Bank, Vat and Kennel (default); Forge only in B3 if wanted.
2. Price basis: fixed at the gate depth, L2 ≈ 8 units, L3 ≈ 20 (default) / rises with the record.
3. Do the engaged bots buy upgrades: yes, PICKED and TUNED; IDLE never (default) / no bot buys.

## Owner-approved scope and integration — 2026-10-18

The later Cut273 §12 decision supersedes the Kennel proposal above: Kennel effects are dropped, no L4. Staff
levels remain as W1 implemented. Bank effect levels are **L3/L4**, after the Clerk's L2, holding 5/8 nights;
Vat L2/L3 discounts hurry by 25/50%. Prices remain 8×unit(D13) = $3400 and 20×unit(D23) = $13500. Forge effects
remain outside this cut. `Town.levels` is persisted, shared across residents and empty on old saves.

`upgradeBuilding(id,max_price)` refuses stale price, insufficient collected purse, locked depth, max level or an
away selected hero. Native single-hero games use their own record; a Session uses the deepest resident record
and the union of earned service availability, matching its existing shared service unlocks. Payment never copies
another resident's progression. Bank/Vat panels display current level, next effect and the priced action. The
existing three-marker budget covers affordable upgrades after stronger signals. Ledger/purse labels distinguish
upgrades and clone hurry from supplies.

PICKED/TUNED buy effect levels after staff/ranks while preserving three live-depth units. IDLE never buys. The
`buildings` leave-one-out skips these buys; `each-system` compares actual bank interest. `upgrades-sink` measures
median upgrade spending / earned+fetched+recovered gold during days 3–14, with the original ≥10% bar. The bank
payback line is explicitly a fully-funded incremental-capacity estimate, not actual payback acceptance; opt-in
`DP_BANK_PAYBACK=1` forks the exact pre-purchase world to measure real additional interest for up to30 bank nights.

Evidence is in `docs/evidence/cut265/`. Three focused core tests pass; an earned multi-resident regression is
included in the workspace suite. Initial real-WASM purchases pass 26 checks across 402×681 and1440×900;
related client groups pass6/7 initially (Hero Hub's obsolete Hire tooltip expectation was updated to the actual
workplace/arriving-worker/price contract and is being rechecked). Final pacing, settlement and shipping results
remain pending; the interrupted pre-purse-guard pacing log is not a passing gate.

## Owner hold — 2026-10-18

Owner chose “Hold upgrades for redesign; finish the vat” after reviewing the
failed price-only trials and actual Bank payback. Eight price profiles, all
on seed1, spent0% during days3–14. Cheaper profiles bought byday2; near-cap
profiles bought nothing. These are diagnostics, not a16-seed median verdict.
Bank price3400 generated only131 extra interest in30 nights in its actual
pre-purchase-world counterfactual. The original gates remain unchanged.

Implementation is preserved in branch `hold/cut265-building-upgrades`,
commit `445a1f3f`; exact price profiles, logs, caches and identity are in
`docs/evidence/cut265/price-only-search/`. Combined-source pacing and Hero Hub
runs were stopped after the owner hold; partial outputs are not acceptance
for the vat-only build. Later redesign must validate actual funding, useful
effects and payback rather than tune only the purchase price.
