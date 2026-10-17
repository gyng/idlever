# Cut 258 — the rough start

Status: **contract, 2026-10-17.** Levers in §3 are candidates; the economy diagnosis
(`scratchpad/economy/findings.md`, pending) fixes their values before any edit lands.

## Why

New-player owner feedback 2026-10-17: "game economy is hard, very slow upgrades". The
three e33d50b blind cards (`eval/cards/e33d50b.blind-{a,b,c}.json`, AI raters, 32–45 active
minutes) agree. The first run takes 5–13 min for $52–91. Income is ~$6–7/min against
first prices of $80 (Scout), $200 (forge sword +1), $250 (bloodline), $450 (rule slot) and
$480 (Mother pick). The rest floor is 20 min (`rest.min_ticks` 12000, `offline.rs:123`).
blind-c held $305 after 40 min and never hired the Scout, so its 20m/4h/8h absences
returned nothing. The genre benchmark is a first buy in seconds and an upgrade every few
minutes (`research/IDLE_STEAM_2026-10.md:20` lists "slow first hours" and "gold with
nothing to buy" among what players punish).

## Owner calls (2026-10-17)

1. **Rest ramps.** Short rests early, reaching the current 20 min floor by about hour 2.
2. **Pen unchanged.** The 8 h fallback (a9541092) stands; no first-session rule taste.
3. **Cadence: an upgrade every ~5 min** of active play in the opening.
4. **The Scout is displayed as the Receptionist** (Guild reception); id `scout` unchanged.
5. **Workers get personal names**, displayed "Name · role"; ids and saves unchanged.
   Quiet anime references, never surnames or catchphrases: receptionist **Arina**, porter
   **Lili**, quartermaster **Aletta**, apprentice **Namari**, clerk **Kraft**, drillmaster
   **Thors**, herald **Luna**, guide **Habo**, kennel hand **Nora**, kennel keeper **Ginko**.

## 1. Gates (opening probe, 16 seeds, active new player)

| # | Gate | Bar | Today |
|---|---|---|---|
| G1 | First gold or token purchase affordable | ≤ 3 min | ~12 min (Scout) |
| G2 | Longest gap between affordable upgrades, minutes 0–60 | ≤ 6 min on the median seed, ≤ 10 min on every seed | 30+ min |
| G3 | Upgrades bought or spent, minutes 0–30 | ≥ 6 on the median seed | ~3–4 |
| G4 | Receptionist affordable | ≤ 10 min on every seed | ~12 min |
| G5 | A pre-Receptionist absence states why it returned only the run in flight | callout ≤ 3 words | silent |
| G6 | Longest forced wait (nothing to send, nothing to buy), minutes 0–30 | ≤ 5 min | 20 min rest |
| G7 | Rest reaches the current floor | by 2 h lineage age; unchanged after | flat 20 min |
| G8 | Hard invariants: the pacing pack (`gates.mjs --pacing`, 24 rows) and the routine `--full` | all PASS, no gate edited | 24/24 on a9541092 |

"Upgrade" means a purchase or spend that changes the next run: kit, worker, legacy rank,
stance level, forge step. A free pick does not count. Cosmetic purchases do not count.

## 2. Instrument first: the opening probe

New `crates/idlever-core/examples/opening.rs`. It plays minutes 0–60 as an attentive new
player: build the house, send at once, watch at the shipped speed, and buy the cheapest
upgrade the moment it is affordable (stance and token spends included). It prints a
per-minute timeline (gold, tokens, runs, rest left, purchases, idle waits) and the G1–G7
values per seed. It is deterministic and native, and joins `gates.mjs --rows` as
`opening-*` rows. It is a tuning loop's check like the others, never a weakened gate. The
probe also reproduces the metrics Forge 0/44 refusal (`kit::buy` erroring on replayed
camps, `exhaustive-audit-findings.md` §4 Correction) or rules it out for fresh towns.

## 2b. Diagnosis (2026-10-17, probe on the real engine, 8 seeds)

Full notes: `scratchpad/economy/findings.md`; profiles in `target/econ-probe/out/`.

- A watched (hand) send clears the rest (`engine.rs:4089`), so the 20 min rest binds only auto
  sends; for an active player the forced wait is **death recovery** (20 min, Cut227) plus
  stretches with nothing to buy.
- Median first buys at 1× watch (2× in brackets): Receptionist 0.27 h (0.14), porter 0.43,
  stance L2–4 0.52, drillmaster 0.78, first Legacy rank 1.18 (0.60), sword/armour +1 1.24,
  pack +1 1.83, weapon #2 2.39, then Legacy roots 2–3 at **10.1 h** and the first Legacy
  rank 2 at **20.7 h**. Gaps are 10–35 min in hour one and hours after it, against a 5 min target.
- Income is flat with depth ($510–810/h); forge steps are quadratic (unit ≈ $200 × mult), so
  every step past #3 costs a whole absence.
- Session-1 dead zone 0.3–1.2 h: the forge plot waits for a report with nothing else new (Cut232
  one decision per report) while the purse holds $150–270 and only the $80 drillmaster sells.
- Legacy ("Upgrade hero") is the slowest track: about one rank a day after hour one.
- Marks overflow (28 after session 1, 50–60 by morning): a currency with nothing to buy.

## 3. Levers (values set from the diagnosis, swept with `tools/sweep.mjs`)

Measured candidates first:

- **Legacy front-load (option 1).** `marks.legacy_root` `[15,40,110,300,…]` →
  `[8,20,55,382,800,2000,5000,12000]` (ranks 1–4 still total 465 per root). First rank
  0.39 h, root 2 rank 1 1.53 h, first rank 2 10.25 h. `picked-l-king` median 14.0 (base
  14.5), earliest day 7 (base 6); `picked-l-purse` 98 %. A steeper A2 brought the King to
  day 9 and is rejected. Still owed: `tuned-picked`, `each-system`, full `--pacing`.
- **Forge plot ordering (code).** Let the forge plot outrank stance/drillmaster news when its
  delves are met, closing the 0.3–1.2 h dead zone.
- **Flatter forge steps 2–4, same totals (option 2).** `kit.weapon_mult [1,3,6,12,25,44]`,
  `armour_mult [1,3,6,11,20,35,50]`, `pack_mult [2,4,8,19]`. Modest; untested on dayplayer.
- **Marks sink.** Marks overflow; give them a cheap repeatable use in the opening, or price
  early stance levels so they pace with the 5 min cadence.
- **Rest/recovery ramp.** Applies to auto sends and to death recovery in the first hours.
- Rejected: `gold.divisor` 4 → 3 (raises IDLE income, buys barely sooner than option 2).

Original candidate list:

- **Rest ramp (core).** `rest.min_ticks` becomes a ladder keyed on completed runs or lineage
  age. New key `rest.early_min_ticks` (e.g. `[1200, 2400, 3600, 6000, 9000]` per run), then
  the existing 12000. The cap is unchanged. Offline accounting uses the same function, so
  absence and active play agree. The Receptionist's `shorter rest` perk keeps its %.
- **A cheap first rung.** Early purchases at $10–40 so G2's 6-minute bar has something to
  hit: a first forge step below `kit.forge_ladder [5,15,40]`, cheap supplies, and the
  Receptionist priced for G4 (`workers.scout.price_tenths`, `need`).
- **Early gold.** A first-hour taper on `gold.divisor` or the freshness curve that fades out
  by hour 1–2, so day-1 IDLE and the long arc are unchanged.
- **Token spends.** If tokens already arrive per run (`marks.xp_early`), surface the spend as
  an upgrade beat rather than adding gold.

Each lever is swept against the probe and the targeted pacing rows (`picked-idle`,
`idle-*`, `stalls-*`, `tuned-picked`, `scout`, `porter`) with `IDLEVER_BALANCE_JSON`. The rest
ramp lands in core first, behind a key whose default reproduces today.

## 4. Client

- The Receptionist rename (display only; in progress).
- G5: an empty pre-Receptionist absence shows a ≤ 3-word callout pointing at the Guild
  reception ("hire receptionist" or "book delves"), within `eval/copy-budgets.json`. No
  tutorial text.
- No new screens. An "upgrade ready" marker is the existing PENDING list, not a new widget.

## 5. Acceptance

1. The probe passes G1–G7 on 16 seeds; the pacing pack and routine `--full` pass (G8).
2. `tools/repin.mjs` (gold settlements and replay goldens move with the rest ramp), WASM
   ship build, the affected client journeys, copy-lint.
3. A fresh three-rater blind cohort on the new build. Compare the 15- and 30-minute
   snapshots with the e33d50b cards; fun ≥ 80 is not claimed from it.
4. One human new-player session, recorded as a dated observation (owner amendment
   2026-10-16): build, seed, viewport, what happened, confidence.

## Risks

- Faster early gold or rests make IDLE's D8-on-day-1 easier (allowed) but can shrink
  PICKED's ≥ 1.5× lead at D13. Every boost fades out within the first hours.
- The rest ramp changes offline time accounting: replay hashes and the gold-settlements
  manifest must be repinned, and the determinism test must still hold.
- A 5-minute cadence needs many cheap rungs; too many become clutter
  (`ui-density` preference: a numeric clutter budget). Prefer deepening existing ladders
  over adding new shops.
