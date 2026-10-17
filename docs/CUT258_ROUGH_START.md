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

## 3. Levers (values set from the diagnosis, swept with `tools/sweep.mjs`)

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
