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

## 2c. Baseline (opening probe, 2026-10-17)

`crates/idlever-core/examples/opening.rs`, 16 seeds, 60 min at 1× (a minute is 600 ticks), the current game
(`tuning/balance.json`). Deterministic; ~3 s on 16 threads. It plays the fresh-town opening described in §2
(house, a hand send whenever the hero is home and able, every run watched, the cheapest affordable upgrade bought
at once). Hires and plots come only as the engine offers them (`tree::lit`, `town::build_ready`, Cut232 news).
With the Receptionist hired, a death recovery is counted down by `step` and he sends at its end. Before him, the
camp clock moves by ≤ 60 s absence slices.
"Upgrade" follows §1: a hire that costs gold, a worker rank with an edge, a Legacy rank, a worn package's level
(marks) or a forge step. The free porter/quartermaster hires, plots and the return pick are logged but not counted.
G2 counts the stretch from minute 0 to the first upgrade and from the last one to minute 60. A bar without
"median" is read on every seed.

```sh
cargo run -q --profile fast -p idlever-core --example opening -- [--seeds 16] [--threads N] [--minutes 60] \
    [--absent 8h] [--timeline SEED] [--rows ?|opening-gap,…] [--kit-check]
node tools/gates.mjs --rows opening [--balance P.json]      # targeted opening-* rows; never the gate
tools/tune.sh opening                                         # the same, through the tuning wrapper
node tools/sweep.mjs --example opening --rows opening-gap,opening-first --objective opening-gap:min --grid G.json
IDLEVER_BALANCE_JSON="$(cat target/econ-probe/out/Af.json)" \
    cargo run -q --profile fast -p idlever-core --features dev-balance --example opening
```

| Gate | Bar | Baseline (median · worst) | | Option 1 `Af.json` (median · worst) | |
|---|---|---|---|---|---|
| G1 first upgrade affordable | ≤ 3 min, every seed | 16.1 · 25.3 min | FAIL | 16.1 · 25.3 min | FAIL |
| G2 longest gap 0–60 | median ≤ 6, every seed ≤ 10 | 20.7 · 32.0 min | FAIL | 22.9 · 31.6 min | FAIL |
| G3 upgrades 0–30 | median ≥ 6 | 1 · 1 (min) | FAIL | 2 · 1 (min) | FAIL |
| G4 Receptionist affordable | ≤ 10 min, every seed | 16.1 · 25.3 min | FAIL | 16.1 · **49.7** min | FAIL |
| G6 longest forced wait 0–30 | ≤ 5 min, every seed | 0.0 · 1.0 min | PASS | 0.0 · 1.0 min | PASS |

G5 is client copy and G8 the pacing pack. G7 needs the rest ramp: the probe prints rest and recovery each minute,
so run it with `--minutes 120` once the ramp lands.

What the baseline shows:

- **The Receptionist is the first upgrade on all 16 seeds** (median 16.1 min, range 12.4–25.3; $60–100). Before
  him nothing else is for sale: stance levels need him (`packages::level_open`) and Legacy rank 1 costs 15 against
  5–6 points after the first run. The ~12 min in §1's "Today" column is the fastest seed.
- Next come stance levels L2–L4 with marks (28–53 min, often three at once) and the drillmaster ($60–100, 39–57
  min). No Legacy rank falls inside the hour: the first comes at 67–110 min (median 87). The forge plot is
  offered within 60 min on **4/16** seeds (53.6–55.8 min), and its first step ($150–225) is bought at once.
- G6 passes because a death in hour one is shallow. `recovery_ticks` gives `balance.recovery[0]` = 600 ticks
  (1 min) up to D14, so the 20 min recovery never binds in the opening. The real wait is **watching runs with
  nothing to buy**: runs take 5–13 min, and gold arrives only at an exit.
- With greedy buying, money is not the binding constraint. After 60 min the purse holds $50–500 with nothing to
  spend it on. On 12/16 seeds the forge is not yet offered (Cut232 holds the plot for a quiet report), and once the
  drillmaster is hired nothing else is on offer.

Option 1 (`marks.legacy_root [8,20,55,…]`) moves the first Legacy rank from 67–110 min to 18–43 min, inside the
hour on every seed. G3 rises to a median of 2. It also **delays the Receptionist to 36–50 min on 4/16 seeds** (4, 8, 10, 12): the cheaper rank is
affordable at the first reports. Cut232 counts that rank as a decision that came by itself, so it holds the
Receptionist's offer. On seed 4 a free porter hire then holds it again, until minute 48. The forge plot is offered
on 0/16 seeds by minute 60. On its own, option 1 therefore makes G4 and G2 worse. It needs the
Receptionist (and the forge plot) exempted from, or ordered ahead of, Cut232's one-decision hold.

**`kit::buy` on a fresh town (the metrics Forge 0/44).** Before the blacksmith is built, `kit::buy` returns
`Err("Build the Forge")` (`kit.rs:560`). This holds for a fresh town (`Game::new`, house, $4000) and for the
metrics harness's lineage (`Game::new_literal` + `systems::open_all`, $4000; the town is manual, the blacksmith
is not built and the plot is not ready). In the probe's own play, every affordable step was bought once the
plot was offered and built: 0 refusals at baseline (16 seeds, 60 min) and at 120 min + 8 h (16 seeds, forge built on 16/16, 101 steps).
So the 0/44 is the harness, not the shop. `cohort_forge` (`metrics.rs:587`) never builds the blacksmith on its
manual-town lineage, and the loop stops at the first error.

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

## 4b. Result (2026-10-18)

Landed with the owner's decisions of 2026-10-18 (below). Code: `tree::ready` offers a worker with `need` 0 from the first look (the
Receptionist); `balance` allows `need` 0 for the Scout alone and adds `marks.legacy_start` (a fresh bloodline's
starting Legacy, `LineageState::new`); `news::offered` counts the Legacy offer as report news only until the first
rank is bought; `news::settle` offers the forge's plot (`town::open_forge`) ahead of a worker's hire. Values:
`workers.scout` need 2→0, price 0.4→0.1 unit ($10 before any delve, $18–25 after the first); `marks.legacy_root`
`[15,40,110,300,…]`→`[12,36,108,300,800,2000,5000,12000]` (Cut122's 2–3× curve holds; option 1's
`[8,20,55,382,…]` breaks it, ×6.95); `marks.legacy_start` 20. Tests: `tests_cut258.rs` (4) plus expectation updates
in 7 older tests. Display: a worker that needs no chore shows no count (the journal's Receptionist entry reads her
price alone; the works wire drops `count`/`need`/`progress` for her).

Opening probe, 16 seeds, 60 min at 1×:

| Gate | Bar | Baseline (8f3f6d2f) | Candidate | |
|---|---|---|---|---|
| G1 first upgrade affordable | ≤ 3, every seed | 16.1 · 25.3 | **0.0 · 0.0** | PASS |
| G2 longest gap 0–60 | med ≤ 6, every ≤ 10 | 20.7 · 32.0 | 28.9 · 38.2 | FAIL (deviation) |
| G3 upgrades 0–30 | med ≥ 6 | 1 · 1 | **6 · 5** | PASS |
| G4 Receptionist affordable | ≤ 10, every seed | 16.1 · 25.3 | 9.8 · 16.2 | FAIL (deviation) |
| G6 longest forced wait 0–30 | ≤ 5, every seed | 0.0 · 1.0 | 0.0 · 1.0 | PASS |

Forge built in the hour: 4/16 → 13/16 (15/16 with `unlocks.forge_delves` 3, G2 22.6 · 37.5; not applied, owner call).

**Deviation G2 (measured; owner-approved 2026-10-18).** Gold, marks and Legacy arrive only at a run's exit. The longest stretch with no
payout at all (0 → the first exit, exit → exit, last exit → 60) is 15–25 min, median ~19.5 (forge_delves 3
profile), because runs lengthen to 15–25 min watched at 1× as the hero gets stronger. No price change can put an
affordable upgrade inside a run; G2 ≤ 10 needs shorter watched runs or mid-run income (out of this cut).
Flatter forge steps 2–4 (option 2) changed nothing in hour one (step 2 still ≥ $600 against ~$100 a run).

**Deviation G4 (measured; owner-approved 2026-10-18).** With the Receptionist lit at minute 0 at 0.1 unit she is bought at the first exit
on every seed; G4 equals the first run's length (4.9–16.2 min; 7/16 seeds > 10). The worst seed (12) first pays out
at minute 16.

**Temporary deviation: `picked-stages` (pacing pack; owner-approved 2026-10-18, bar unchanged) — resolved by Cut260 (`docs/CUT260_OPENING_FOLLOWUP.md` §1: `tree.rank_days` [2,4,8], 10.0 PASS, pacing 24/24).** Pacing pack on the candidate: 23/24; `picked-stages` 9.0 (bar
≥ 10; HEAD 10.0, already at the bar). Bisected at 16 seeds (`gates.mjs --full --rows picked-stages`, deterministic):
reverting the forge-first ordering alone → 9.0 (with the current values) / 10.0 (with the old values); reverting the
Scout need 0 alone (forge-first kept) → 9.0; reverting both → 10.0 PASS; reverting the Legacy start or the Legacy
news gate alone → 9.0. The two levers that make the opening's cadence (the Receptionist at the first exit, the forge
plot inside the hour) move PICKED's stages earlier; days 9–14 then rely on bank-look stages and lose one. With both
reverted the probe falls back to G3 3 · 3 and G4 20.3 · 29.9 (worse than the baseline). The owner kept the opening's
levers; the row stays at ≥ 10 and owes a stage on days 9–14 (Next, below).

Other pacing rows on the candidate (16 seeds): picked-idle 1.50 · 2.75 · 3.30 (D13 at the bar, as before),
tuned-picked 1.17 (bar 1.15), porter 8.4 · 13.6, scout 2.6 · 4.5 min, cadence30 16/16, picked-l-king median 14.0 ·
earliest day 10 (baseline 14.5 · 6), picked-l-purse 98 %, all idle-* PASS.

Checks (2026-10-18): `cargo test --workspace --profile fast` 1060 pass; clippy clean; `tools/verify.sh --quick`
green; `tools/wasm.sh`; `repin.mjs --settle --regen` → `docs/evidence/cut258/settlements-inputs-958a.json` (Gold,
ledger, ExitLine and `expected` unchanged 4/4; the bank-positive after-save regenerated, `lineage.marks`/`marks_due`
only: the run's marks land at a different report under the new news bits); browser `gold-settlements` 564 checks
PASS. Client routine `pnpm -s test` 39/41: `worker-first-act` (known) and `hero-hub` (material contrast in the
gear/skills/attributes tabs; identical failure list on a clean ddabdfd7 build, so pre-existing).

Owner decisions (2026-10-18): keep the opening levers as above; `picked-stages` 9.0 is a temporary deviation;
G2 and G4 are measured deviations; `unlocks.forge_delves` stays 4.

Next:
1. **Run length / mid-run banking** (done in Cut260 §2: checkpoint gold paid as it is secured; G4 2.6 · 4.9 PASS, G2 unchanged and re-diagnosed as an offer gap) (owner-approved follow-up cut): G2 and G4 are bounded by payouts arriving only at
   a run's end while watched runs last 15–25 min at 1×.
2. **Refill PICKED days 9–14 with a stage** (done in Cut260 §1) so `picked-stages` passes ≥ 10 again (today those days rest on bank-look
   stages alone).
3. Marks still pile once Steady is L5 (13–18 by 2 h in the probe, as at baseline): a sink remains open.

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
