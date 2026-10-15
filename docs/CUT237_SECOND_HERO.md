# Cut237 — a second hero on day1–2

*Queued contract, 2026-10-15. Not implemented or measured. Acquisition policy
is unresolved; no option below is selected or approved by this document.*

Owner order: finish Cut235 worker feats, then this cut, then Cut238 first Legacy
payoff. Source: CUT231_PROGRESSION.md item6 and HANDOFF.md. Target: default
IDLE/PICKED players actually found and use a second resident on day1–2. An
available button, affordable price or extra harness action is not that outcome.

## Baseline and unresolved policy

`Session::add_bloodline` already purchases an independent resident for250Gold,
requires a house, caps the town at3 and keeps the selected resident unchanged.
Each resident owns its identity, build, XP, Legacy and run; town Gold, buildings
and hires are shared. Active Scout sends the new resident on later simulation;
paused Scout leaves it Ready. UI already confirms the cost and immediate Scout
behavior, supports cancellation and routes to Scout settings.

The current dayplayer owns one `Game`, never founds another resident and records
only `bloodline2:affordable`. Historical Cut231 data shows affordability by8h
on16/16 IDLE seeds and median13.6min on PICKED. These observations do not prove
actual founding or day1–2 use; current final-source earned evidence is missing.
Existing founding UI tests import an earned Gunner save, so they do not prove
the natural fresh-town journey either.

There is a real contract conflict: strict IDLE takes no further actions after
Scout, while UX_BLOODLINES.md requires explicit paid founding and says residents
never appear automatically. The acquisition decision must be resolved before
implementation can satisfy the owner bar. The pending owner question offers:

| Option | Consent and measurement consequence |
|---|---|
| First-session later-recruitment order | Player explicitly authorizes the250Gold recruitment before leaving the initial session. A named order may later act once under its chosen conditions. Requires explicit IDLE first-session policy amendment and actual UI authorization proof; never silently enable spending. |
| Day1 purchase; strict IDLE unchanged | Surface the existing250Gold confirmation as a natural day1 decision. Engaged/default-player adoption can be measured, but literal strict IDLE still never founds. This alone cannot satisfy the current IDLE founding bar; retain that failure rather than relabel the bot. |
| Earned automatic resident | Requires an explicit consent/acquisition-contract change. A free arrival would also supersede the250Gold rule below; it is outside this paid contract unless the owner changes that requirement. Do not implement or infer such approval here. |

Do not change defaults, the price, automatic-spending authority or bot identity
to resolve this question implicitly. Record the eventual decision in the
contract, including any actual amendment, before running acceptance.

## Paid acquisition contract

1. Existing250Gold purchase semantics remain authoritative: one confirmed
   purchase, one actual wallet debit/ledger entry, one fresh second resident.
   No grant, reimbursement, duplicate settlement or fabricated affordability.
   Revalidate house, price, funds and cap at the purchase itself. Failed actions
   and cancellation preserve the complete Session byte-for-byte.
2. A chosen deferred order must state its price, timing/eligibility, one-time
   scope and Scout behavior before authorization. It must be inspectable and
   revocable until execution. Explicit decline/pause/cancel is respected; no
   silent re-enabling after load, another selection or a later report.
   Insufficient funds cannot overdraw the wallet. Preserve economic reserves
   specified by the eventual policy rather than inventing a hidden spend rule.
3. Founding does not restart, replace or select the first resident. The new
   resident has its own stable identity and personal progress, takes only
   explicitly shared orders, and joins the actual shared town clock/wallet.
   Active Scout can depart automatically; paused/unhired Scout cannot.
4. Surface the day1–2 offer/execution through existing roster/Journal/tracker
   routes, coordinated with the one-new-decision report budget. The offer and
   confirmation expose the actual price and destination. A named founding beat
   enters the real timeline once, and its completed state stops advertising a
   second founding as unfinished. Third-resident behavior retains the cap and
   explicit purchase; this cut authorizes no automatic third purchase.
5. Reload/whole/sliced absence and selection must preserve exactly when one
   authorized purchase executes and which resident owns subsequent runs,
   XP/Legacy, receipts and records. Shared Gold/Savings and interest reconcile
   once. Forecasting, opening the offer, reading details and selecting actors
   never execute a pending purchase by themselves.

## Earned16-seed acceptance

Use fresh `Session` seeds1–16 for both IDLE and PICKED, with the selected policy
and all allowed actions written explicitly. Build the free house through its
public action, earn Gold, hire Scout normally, and use actual public founding
or the explicitly authorized order. No grants, imported late saves or direct
state edits in the earned cohort. A separate diagnostic may exercise refusal
edges but cannot enter earned timing results.

| Requirement | Acceptance |
|---|---|
| Actual founding | Median elapsed founding time<=48h independently on IDLE and PICKED,16seeds each; all16 outcomes retained, unreached cases count as failures/infinity |
| Day1–2 use | Every resident founded by48h naturally departs and completes at least1real run by its following8h check-in; active Scout cohort only |
| Population evidence | Real Session contains slot2 with distinct identity; exact250Gold debit and one founding event; no duplicate or third purchase |
| Independent progress | Slot2 run/XP/Legacy changes are owned by slot2 while slot1 stays selected; original run is preserved across founding and selection |
| Consent/refusal | All cancel, decline, revoke, insufficient-funds, no-house, cap and repeated-action cases preserve the expected complete save; no unauthorized debit |
| Paused Scout |0automatic departures for the new resident while paused; explicit manual send remains available under existing rules |
| Determinism/parity | Whole/sliced/reloaded Session saves, reports and founding receipts match; native/WASM action sequences agree |
| Guidance/UI | Actual earned320/400/1440px journeys, normal/200% text; price/confirmation/Scout settings/cancel/return routes usable, no overflow,44px targets |

Record eligibility/offer time, authorization, confirmation/order execution,
actual ledger debit, creation ID/time, first departure, first completion and
per-resident runs/XP/Legacy/Gold. Report median/p90/worst, all seed failures and
all absent events. Use actual elapsed timestamps, not the8h observation boundary
when an event occurred earlier inside an absence. A manually paused-Scout test
is a separate truthful edge case, not a failed active-Scout timing sample.

The acceptance driver must own `Session` and call Session-aware time/offline
methods so all residents affect the shared economy. Reusing dayplayer policy
helpers is acceptable; a single-Game simulation plus affordability timestamps,
an unadvanced side resident or synthetic multiplication of income is not.
Preserve historical single-resident pacing protocol/cache identity unless an
explicit harness migration proves its unchanged scope. Name any new policy
variant; never label an engaged founding action as strict historical IDLE.

## Regression and evidence

Relevant existing hooks/tests: `bloodlines.rs` creation/selection, wallet
conservation, per-resident XP/bests, shared orders, chunk independence and
whole/sliced/reloaded offline reports; `tests_cut120.rs` new-resident order
inheritance/defaults; `web/tests/bloodline-founding.mjs` price/cancel/Scout/cap
journeys; `ui/heroes.ts` existing confirmation; `journal.rs`, `news.rs` and
`ui/tasks.ts` guidance/cadence. Extend these contracts instead of creating a
separate wallet or resident implementation.

Require native fast tests, default Clippy, rebuilt/pinned real WASM,
TypeScript/format/lint/copy, relevant founding/roster/home/offline client groups
and routine client acceptance. Reconcile Gold settlements after package repin.
Run `node tools/gates.mjs --pacing` at16seeds and routine full gate; preserve all
IDLE safety/King, package value/outpace, TUNED lead and automation-pays bars.
The new Session cohort additionally measures shared-wallet/pacing consequences;
a green historical single-Game gate alone cannot certify the second resident.
Measure changed day2–7 major-beat gaps against the owner's<=24h PICKED target
(and<=48h DAILY where required), without treating founding alone as proof of
that whole cadence goal.

Planned evidence: `docs/evidence/cut237/` with the resolved policy/amendments,
source/runtime/profile/harness identity, earned Session saves, action/event
traces, all32 seed results, timing/usage summaries, parity/ledger proofs,
client screenshots and gate logs. No results, approval, completed implementation
or new release are claimed by this queued contract.
