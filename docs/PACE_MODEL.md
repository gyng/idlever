# Pacing prediction model

2026-10-22. A statistical and mathematical stand-in for the 14-day dayplayer. Given a balance profile shaped
like `tuning/balance.json`, it predicts the following for the IDLE and PICKED bots:

- the arrival hours at the content milestones D8/13/18/23/28/29/33
- the class level by day
- the daily net gold

It produces these in a fraction of a second, or in about a minute when the profile changes what happens
inside a send. The model is a search tool. It never accepts a change: confirm the winner it finds with
`tools/tune.sh` (docs/STATISTICAL_TUNING.md).

Code: `crates/idlever-core/examples/pace_model.rs` and `examples/pace_model/` (kernel, fit, meta, model,
library, rebase, report).

## Use

```sh
# one-time: the library (dayplayer check-in camps) and the calibration (~11 min at 16 threads with the library
# already played; add ~15 min to play 6 seeds × IDLE+PICKED when --library is left out)
cargo build --profile fast -p idlever-core --features dev-balance --example stat_probe --example pace_model
target/fast/examples/pace_model calibrate --out target/pace-model/ --seeds 1,2,3,4,5,6 --threads 16 [--library DIR]
# a profile
target/fast/examples/pace_model predict --profile P.json [--model target/pace-model/model.json] [--json out.json]
# a sweep grid (tools/sweep.mjs syntax: {"grid":{path:[values]}} and/or {"candidates":[{name,set}]})
target/fast/examples/pace_model search --grid G.json [--base tuning/balance.json] [--claims tuning/studies/cut317-adopt.json]
# check against real fortnights (DIR/obs*.json from stat_probe, DIR/saves from DP_SAVE_DIR)
target/fast/examples/pace_model validate --profile P.json --truth DIR
```

`cargo run -q --profile fast -p idlever-core --features dev-balance --example pace_model -- …` also works.
`calibrate` needs `stat_probe` built next to it, unless you pass `--library`. Workers run as subprocesses of
the same binary, one balance profile each, so `configure_from_env` installs once per process. Parallelism is
capped by `--threads`.

Search workflow:

1. Run `search` over a grid. It ranks candidates by their worst normalized claim margin, using the claims of
   `cut317-adopt` unless you pass `--claims`. TUNED claims print NaN because TUNED is not modeled.
2. Take the top candidate (or two) to a `tools/tune.sh` study with independent confirmation seeds. The study's
   verdict is the evidence. The model's ranking is only discovery.

## Method

**Library.** The calibration plays ordinary dayplayer fortnights under the calibration profile (shipping) with
`DP_SAVE_DIR`. Every check-in camp becomes a library state. Day 1 is densified: each absence is replayed and
the camp after every send is kept, because the porter's hire, the first levels and the first walls move fast
there. Each state is described by its record, class level, drills, porter and lineage hours.

**Layer 1: a send as a Markov chain over floors.** A send ends on floor f (it does not take the stairs) with
hazard σ(η):

η = α_state + β_L·Δlevel + ψ(content) + [wall: γ(·) + ω_w + δ_w·drilled]

- α is the state's power in logits; lower is stronger.
- ψ is depth difficulty, a smooth second-difference prior with ψ(1) = 0.
- The walls are the band bosses (content 8/13/18/23/28/33, on the band's last floor) and the Foundry's golem
  band. ω is a wall's extra hazard, and δ is what its drill takes off.
- γ, the share of power a boss wall feels, is fitted on a grid. It came out at 1.

The fit is penalized IRLS on aggregated at-risk rows. The calibration measures each distinct state as it
stands, which gives about 6 sends each. To identify β_L, it also measures each state at class level ±2. At the
state's next wall it uses splitting, with and without that wall's drill: a send that reaches the wall floor is
continued 4 times with the run's random stream redrawn. That gives cheap conditional draws past deep walls,
which a natural send reaches rarely.

From the same sends, the model fits:

- ticks per floor by content and ticks on the last floor by exit
- XP per Σ(2 + content) for a bank or a return (death gives 0, as in the engine)
- wealth per send, as a linear function of Σ content
- P(death | end bucket) and P(return | alive)

Each send is one ordinary offline send from a cloned camp: rest and recovery are cleared and the run id is
bumped for a new seed. It runs in 5-second `run_offline_slice` steps, recording floor arrivals between steps.

**Layer 2: progression between sends.** A Monte Carlo with 96 replicas, each following one calibration seed's
lineage and starting from its post-session camp:

- Absences last one check-in interval. A send begun before the check-in finishes inside it, as the offline
  batch does, and carried rest is capped at 6000 ticks.
- Town rest is clamp(turns/div, min, cap), and death recovery uses the profile's curve, both from the profile.
- XP turns into levels through the profile's `marks` (`xp_to_next`).
- A boss met on a lineage day counts towards his drill, using the profile's `drill_meeting`/`drill_days`/
  `deep_drill_days`. The Foundry counts once its golems are met. The lineage clock runs a session behind the
  check-ins, so a day's first absence still counts as the day before; this matches the bloat/lich/foundry drill
  times in all 12 checked trajectories.
- The porter arrives at his calibrated hour (IDLE 7.9 h; PICKED in the session).
- The record is read at each check-in.

A replica's power α10, its power at level 10, is read from its seed's library curve. Two indexes are used:

| Bot | Index | Why |
| --- | --- | --- |
| IDLE | By record (`record`) | IDLE's power follows what its sends have met |
| PICKED | By lineage hours (`time`) | PICKED's purchases and picks happen at check-ins |

`PACE_INDEX_IDLE` and `PACE_INDEX_PICKED` switch the index at calibration (`record`, `time` or `min`). The
model then adds −β_L·(10 − level).

**Per-profile kernel.** A profile that differs from the calibration only in Layer 2 fields reuses the
calibrated kernel. Those fields are:

- `rest`, `recovery`, `recovery_full_ticks`
- `marks.xp_*`
- the drill days
- the unmodeled sections

Any other change (expedition, monsters, gold, kit, stance, level_runs, …) is measured. About 170–220 sends per
bot run from one state per record, plus wall splits.

With the same structure (stretch/laps/expedition), the same sends also run once under the calibration profile
(common random numbers, cached). The profile's model is then the calibration plus the difference of the two
refits, keeping only the linear trend in content for α and ψ (per-state deltas are noise at this budget), plus
wall and aux deltas.

For a different structure, the classic profile for example, `rebase.rs` maps library states into the profile's
floors through content depth, and the model is refit directly with the calibration as prior. Kernels are
cached by the hash of the profile's kernel fields.

## Validation (calibration: shipping, seeds 1–6; truth: held-out seeds)

"Simulated" is the median of real `stat_probe` fortnights. IDLE uses seeds 101–112 (12 seeds) and PICKED uses
seeds 101–106 (6 seeds), at 3 check-ins a day; unreached counts as 344 h. "Predicted" is the replica median
(hours are quantized to check-ins in both). The profiles:

| Profile | Definition |
| --- | --- |
| classic | expedition off, stretch 1, rest 12000/18000, porter need 3 |
| xplate2 | `marks.xp_late` 200 |
| camp12k | `expedition.camp_every_ticks` 12000 |

Each cell shows predicted / simulated hours (— means the median is unreached).

| Bot | Milestone | shipping | xplate2 | camp12k | classic |
| --- | --- | --- | --- | --- | --- |
| IDLE | D8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| IDLE | D13 | 16 / 16 | 16 / 16 | 16 / 24 | 16 / 16 |
| IDLE | D18 | 32 / 48 | 48 / 56 | 48 / 56 | 32 / 40 |
| IDLE | D23 | 96 / 112 | 136 / 120 | 112 / 112 | 88 / 112 |
| IDLE | D28 | 112 / 136 | 144 / 144 | 136 / 144 | 112 / 128 |
| IDLE | D29 | 304 / 304 (42 % unreached) | — / 328 (42 %) | — / — (75 %) | 240 / 280 |
| IDLE | D33 | — / — (83 %) | — / — | — / — | 272 / — (58 %) |
| PICKED | D8 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| PICKED | D13 | 8 / 8 | 8 / 8 | 8 / 8 | 8 / 8 |
| PICKED | D18 | 16 / 16 | 16 / 16 | 16 / 16 | 8 / 24 |
| PICKED | D23 | 24 / 24 | 24 / 24 | 24 / 24 | 8 / 32 |
| PICKED | D28 | 32 / 32 | 32 / 32 | 32 / 32 | 32 / 32 |
| PICKED | D29 | 80 / 144 | 88 / 144 | 80 / 144 | 88 / 48 |
| PICKED | D33 | 80 / 144 | 96 / 144 | 88 / 152 | 104 / 48 |

Errors over the 22 milestones that the truth reaches on the median:

- IDLE: mean absolute error 9 h. The errors are mostly −8 to −24 h (one to three check-ins early) at D18–D28;
  the largest is −40 h at classic D29.
- PICKED, same-structure profiles: exact at D8–D28.
- PICKED D29/D33: early by 48–64 h.

The other predicted quantities:

| Quantity | Predicted vs simulated |
| --- | --- |
| IDLE level by day | Within one level on every day of every profile. xplate2: `[5,6,7,8,8,9,9,10…]` vs `[5,6,7,8,8,9,10,10…]`. |
| PICKED level by day | Within 1–2 levels. |
| IDLE net gold, day 2 / day 10 (shipping) | 18.1k / 24.1k vs 16.9k / 26.4k |
| IDLE net gold, day 2 / day 10 (other profiles) | Within about 15 %, except classic day 10: 18.4k vs 13.2k |
| PICKED net gold | Not predicted: the model's figure is send income, and PICKED's purchases are not modeled |

Directional checks against the truth's changes from shipping:

| Profile | Truth | Model | Result |
| --- | --- | --- | --- |
| xplate2 | slows IDLE D23 (+8) and leaves D28 unchanged | D23 +40, D28 +32, level curve exact | Right direction; the D23 shift is overestimated |
| camp12k | delays IDLE D13 (+8) and pushes D29 further out (75 % unreached) | D13 0, D29 unreached | D29 right; D13 not seen |
| classic | IDLE D18 −8 and D29 −24 vs shipping | D18 0, D29 −64 | Direction roughly right |
| classic | PICKED reaches D29/D33 at 48 h (much sooner than shipping) | the opposite: no gain at D29/D33, and D18/D23 implausibly early (8 h) | **Wrong** |

## Runtime

| Step | Time |
| --- | --- |
| Calibration with the library given | 682 s at 16 threads (6 seeds; 3474 + 3242 sends measured; the refit alone is 27 s) |
| Playing the library | ~15 min extra |
| Prediction for a Layer-2-only profile (xp, rest, recovery, drill days) | 0.1–0.2 s; a 4-candidate search took 0.25 s |
| Prediction for a kernel-changing profile | 13 s (classic) to 65 s (camp12k, including the one-time paired calibration sends); cached per profile key afterwards |
| One real fortnight, for comparison | IDLE ~150–190 s and PICKED ~400–700 s per seed; a statistical study takes ~2.5 h |

## Known limits

- **PICKED D29/D33 is bimodal and mispredicted.** PICKED passes the Lurker Queen either by power within a day
  or two (seeds 1, 2, 103: 40–56 h) or only after the 6-day deep drill (the other 9 of 12 seeds: 136–168 h).
  The replica median follows the share of fast calibration seeds (2 of 6), so the median falls in the gap.
  Read PICKED D29/D33 as "fast-mode share", not as hours; more calibration seeds would sharpen it. The
  `tuned-d33` claim (TUNED) is not modeled.
- **Power curves are calibration-shaped.** α comes from shipping states indexed by record (IDLE) or hours
  (PICKED). What the state carries beyond level and drills (stance runs, supplies, legacy, gear, packages) is
  assumed to arrive as in shipping. Profiles that change the economy or package levelling (`kit.*`, `gold.*`,
  `level_runs`) are measured only in their effect on one send, not in how quickly that state is reached. The
  time index makes PICKED blind to anything that speeds or slows its shopping.
- **Unmodeled sections.** `workers`, `unlocks`, `upgrades` and `vat` are reported as "not modeled". The porter
  hour, first session and hires come from the calibration.
- **Structure changes are approximate.** Rebased states (`rebase.rs`) carry shipping power into another
  structure, and classic PICKED is wrong.
- **IDLE runs one to three check-ins early at D18–D28.** Wall passes before the drill are slightly too easy.
- **Kernel-changing profiles carry measurement noise.** At ~200 sends per bot, the noise is about the size of
  the camp12k effect (±1 check-in). Paired sends and the linear-trend deltas limit it, but they do not remove
  it.
- **Truth uncertainty.** With 6–12 seeds and 8-hour check-ins, a simulated median is itself uncertain by about
  one check-in.

Evidence for this page (2026-10-22, uncommitted working tree on `ccf196ad`):

- `target/pace-model/cal2/` holds model.json, validation.txt and val-*.json.
- `target/pace-model/truth/<profile>/` holds the obs*.json files and saves.
