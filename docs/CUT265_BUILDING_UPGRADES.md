# Cut265 — Building upgrades

Status: PLAN (2026-10-18). Owner decisions 2026-10-18: Bank, Vat and Kennel (Forge not in B1/B2); PICKED and TUNED buy,
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
