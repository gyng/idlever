# Cut238 — first Legacy payoff on day1

*Queued contract, 2026-10-15. Not implemented or measured. The continuing-default
versus controlled one-time spend policy remains unresolved.*

Owner order: Cut235 worker feats → Cut237 second hero → this cut. Source:
CUT231_PROGRESSION.md item10 / HANDOFF.md. Deliver an actual day1 Legacy payoff
with +50–200% speed on the next climb toD13, preserving optional build choices
and the persistent hero. An affordable offer, previewed stat or correlated
fortnight result does not prove adoption or causal speed.

## Baseline

Every real completed run earns `1 + max_depth - previous_best_depth` Legacy in
`Game::finish_run`; Death/Bank/Return all earn it, simulations do not. The
persistent bloodline, historical hero, exit receipt and batch record the award.
Other existing deeds/feats can also award Legacy. Do not change those earnings
or credit them twice to manufacture this payoff.

Shipping root prices begin15/40/110, then300/800/2000/5000/12000. Each root rank
adds3HP,1damage or1armour; effect nodes cost700/1800 and require parents/depth.
`legacy::buy_next` already spends actual points for the next departure without
altering the hero/run currently away. A readied home run is refitted legally.
Ordinary death retains the hero; a deliberate reclone has separate confirmation.
This cut needs no mandatory reclone, identity replacement or reset loss.

Fresh Session, new residents and old absent order fields currently use Legacy
`off`. `tree::NEW_LEGACY`, wire defaults and `tests_cut120` pin this behavior.
The existing `balanced` standing order acts on real sends, needs no additional
worker, buys all affordable eligible upgrades and records/announces its acts.
It chooses lowest-ranked health→damage→armour roots or a cheaper eligible effect;
it is continuing spending, not one early purchase.

Historical Cut23116-seed evidence showed affordable Legacy at median22.8min
PICKED (worst31.2min),8h IDLE; neither spent any in14days. Some PICKED seeds
reachedD13 before their first death. These are historical observations, not
final-source adoption/benefit measurements. PICKED+L spends every affordable
balanced choice at check-ins; its fortnight/King comparisons do not isolate
one first-death purchase. Source also records an earlier balanced-plus-automatic
ranks experiment that let IDLE kill the King byday12 on16/16 and compressed
package differences. That warns against unmeasured defaults; it is neither a
current failure nor proof that balanced alone causes the same result.

## Decision and genuine adoption

The owner listed a default Legacy order or a spend at first death. Record the
chosen policy before implementation/acceptance; neither is selected here.

| Candidate | Required contract treatment |
|---|---|
| New-player continuing `balanced` | Explicitly amend fresh-lineage defaults, announce and expose the order, and test its continuing purchases. Existing saved explicit `off`/focus choices remain unchanged. Do not also enable automatic worker ranks as an incidental change. |
| Controlled first-death/first-affordable spend | Choose an actual affordable upgrade through existing public purchase APIs, with an explicit player decision or separately authorized automation rule. If first death lacks enough points, carry the opportunity to the first affordable post-death return. One-time scope/consumption, refusal and cancellation must be serialized/deterministic if automated. No free points, implicit sustained balanced order or fabricated purchase. |

Strict historical IDLE makes no further decisions after Scout. A first-death
button alone therefore cannot satisfy actual default-IDLE adoption. Specify any
fresh-default/IDLE policy amendment openly; retain historical IDLE comparisons
and explicit opt-out behavior. Do not relabel an engaged bot or change saved
orders silently. An order enabled by the player is recorded authorization,
not permission to spend unrelated Gold or alter another resident's choices.

## Earned timing and causal experiment

Use seeds1–16 on final-source IDLE and PICKED policies,32 fresh Session
trajectories. Apply the chosen consent/default contract and real house/send/hire
progression. Save the first actual death and first actual affordable post-death
opportunity for each selected resident; if the choice is affordable at death,
those checkpoints coincide. No Gold/Legacy/depth/gear/worker grants or imported
late-game setup. Keep every seed, failure and unreached checkpoint.

The first genuine purchase must occur within24elapsed hours on all16seeds of
each policy. This is the proposed concrete interpretation of the owner's day1
payoff, not a historical measured pass. Record actual earning, offer, consent,
spend and departure timestamps rather than their later check-in observation.
If a first death/affordability comes too late, retain the failed adoption result;
do not award points or redefine day1 after seeing the data.

For each of32 genuine opportunities, fork the exact unchanged Session before
the proposed purchase into baseline and treatment:

- Baseline makes no such purchase; treatment executes the legal proposed
  purchase/batch at its real cost. Keep the unspent baseline points. For a
  continuing order, isolate the first purchase/batch in this experiment and
  suppress subsequent treatment-only spending in both forks; separately measure
  the actual continuing-policy trajectory for adoption and whole-game effects.
- All other rules, class, gear, workers, other residents, elapsed time,
  check-ins and standing choices remain identical. Both forks retain the same
  real recovery and deterministic future seeds; use Session simulation so the
  shared economy and other residents remain genuine.
- Measure from the common fork to the selected resident next reachingD13 on a
  subsequent actual run. Prior historicalD13 does not satisfy this endpoint.
  Ignore an already-running pre-purchase run for endpoint purposes: treatment
  applies to the next sent hero. Include waiting/recovery/departure time and
  report its components. Retain censored/failed baselines and treatments.
- Record each branch's first post-fork departure stats, owned rank/effects,
  point balance/spent ledger, actions and first eligibleD13 crossing. The live
  pre-purchase run and its historical sent snapshot retain their original stats.

| Gate | Acceptance |
|---|---|
| Earned adoption | Actual purchase<=24h on16/16 seeds independently for each policy; no synthetic affordability or grants |
| Causal speed | `baseline elapsed / treatment elapsed` in[1.5,3.0] on the median paired ratio independently for each policy,16seeds each |
| Ratio accounting | All32 pairs reported; missing/nonpositive/censored endpoints cannot be discarded or treated as successful ratios |
| First sent effect |32/32 treatment departures carry exactly the purchased effects; baseline retains its unspent points and original ownership |
| Economy/history |0Gold change caused by the Legacy purchase; exact points debit/spent increase, once-only earnings and historical receipts preserved |

For a finite speed claim both arms must actually reach the endpoint within a
predeclared48h post-fork observation window. An uncompleted pair is an unresolved
failure for this gate, not an infinite beneficial speedup. Show each policy's
16ratios, median and worst, alongside floor/time/action differences. The1.5–3.0
ratio is +50–200% speed, equivalent to roughly33–67% less time; do not confuse
speed increase with time reduction. No source currently proves this benefit;
first-rank +3HP or +1armour must be tested rather than advertised as a multiplier.

## Acceptance and regression

- Native fast tests/default Clippy: earning and duplicate-finish exclusion,
  actual legal debit/refusal, next-run effect/refitted home run, original
  live/sent-history immutability, opt-out/default/save migration and any
  one-time state machine. Existing hooks: `legacy::offers/buy/buy_next/apply`,
  `Game::upgrade_hero/upgrade_hero_next/set_orders`, `tree::legacy_pick/legacy_act`.
- Whole/sliced/reloaded absence must produce equal complete Session saves,
  reports and purchase timing. Preserve each resident's private points/build
  and ledger; shared worker-act aggregates and per-resident `legacy◆@id`
  reconcile exactly. Shared-order copies occur only when explicitly enabled.
- Real-WASM earned first-death/day1 journeys at320/400/1440 normal/200% text:
  actual affordable price/effect, confirm/cancel/refusal, once-only named payoff,
  current-versus-next stats and personal/order ownership. Save equality on read,
  cancellation and refused choices; no overflow,44px targets, copy budgets.
  Use private-GPU captures for visual evidence without desktop focus.
- Existing `legacy_tests.rs`, `tests_cut120.rs`, `bloodlines.rs` and PICKED+L
  checks remain useful but do not replace the causal experiment. Run final
  native/WASM action/summary equality, TypeScript/format/lint/copy, relevant
  Hero/Legacy/death/order/offline journeys and routine client acceptance.
- Rebuild/pin real WASM and reconcile settlement manifests without changing
  Gold expectations merely to accommodate a Legacy read/model change.
- Run16-seed `--pacing` plus PICKED+L King bar (median>=day7, never<day4), strict
  IDLE no-King fortnight guard, package value/outpace, RANDOM/PICKED and
  TUNED>=1.15atD33. No weakened gate or hidden reclassification of bots.
  Require routine full gate, then retain remaining broad handoff acceptance.

Planned evidence: `docs/evidence/cut238/` with selected policy/default amendment,
source/runtime/profile/harness identities,32 genuine checkpoint Sessions,
complete action/earning/consent traces,64 baseline/treatment outputs, first-sent
stat proofs, per-policy ratios/censoring, migration/parity/ledger checks, UI
captures and gates. No implementation, approval, measured speedup, accepted
payoff or new release is claimed by this queued contract.
