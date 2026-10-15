# Cut239 — away forecast names the plateau

*Proposed implementation contract, 2026-10-15. Not implemented or measured.*

Queue: Cut231 item7 / WORK_QUEUE package learning5. This follows the owner's
fixed sequence: Cut235 worker feats, second hero day1–2 (Cut237 reserved), then
first Legacy payoff (Cut238 reserved). Writing this contract does not change
that order or certify any work. The existing owner accuracy target is within
one floor of an actual8h absence on at least80% of saves. Window, coverage,
cohort and latency thresholds below are proposed acceptance definitions;
feasibility remains unmeasured, and none is an observed result.

## Problem and existing behavior

The camp names the starting/live floor, record and next encounter/record. Its
forecast estimates one send's reach, exits, Gold and known boss walls, with
results bounded by `best_depth + 1`. It does not describe an8h absence with
worker purchases, package growth, repeated deaths or multiple residents.

`Forecast.ends.stall` means a turn-cap/pathological run. `ReturnReport.stall`
is a retrospective diagnosis requiring a qualifying run window and ending
row. Neither means the predicted progression plateau requested here.
`Forecast.hold` is historical: `tree::wall_hold` always returns `None` after
Cut118's owner amendment. Do not revive the retired wall order to implement
this read model.

## Contract

1. **One selected-resident, eight-hour question.** The answer describes the
   selected resident if the player makes no more choices for28800seconds.
   Existing standing orders continue. Every actual resident and the shared
   wallet run together; selection is an observation, not a different economic
   scenario. Forecasting does not recruit residents, enable orders, buy manual
   choices, reset heroes, or grant anything. An existing run and remaining
   recovery/rest are part of the starting state.
2. **Rust owns the answer.** Publish an optional away-summary read model
   separate from the current next-send forecast. The response carries selected
   resident ID, horizon seconds, prediction status, optional visible floor,
   optional known cause and request/state identity. Do not put speculative
   progress into the real save, Chronicle, report, discovery or worker acts.
   Older wires without the field keep a usable camp.
3. **Exact plateau definition.** Let `H=28800` and `W=7200`seconds. Observe the
   selected resident's real run-completion events over `(0,H]`, with each run's
   persistent ID, completion time, maximum depth, exit kind and cause. Runs
   already active at0 count when they naturally complete. A transport slice is
   not a completion. Final return-boundary cleanup that ends a still-live run
   is excluded from the plateau window; record its depth separately. No
   historical extrapolated/sampled run counts as an actual completion.

   Classify in this priority order:

   | Status | Exact rule | Floor |
   |---|---|---|
   | `victory` | This descent is already cleared, or is cleared during the horizon, without a standing next-descent order carrying play onward | none |
   | `manual` | Automatic departure is unavailable/paused at0; after the actual in-flight run/rest there can be no further automatic sends | none |
   | `progressing` | The resident establishes a new record during `(H-W,H]`, relative to its own record at `H-W`, or advances to a new descent during that interval | none |
   | `insufficient` | Fewer than4 natural completions occur in `(H-W,H]` | none |
   | `plateau` | The final4 natural completions in that interval have `max(depth)-min(depth) <= 2` and no record advance occurred in that interval | lower median of those4 maximum depths |
   | `variable` | At least4 completions exist but the final4 fail the plateau depth-span condition | none |

   A later death after retreat uses that run's maximum depth consistently with
   record/Legacy accounting. A death, Bank, deliberate Return or pathological
   stall may contribute to a plateau; preserve the distinction as optional
   supporting detail, not different definitions of the predicted floor.
   The lower median is the second of4 sorted depths. Cause is the most common
   known terminal cause among those4 runs, with lexical tie-breaking; mixed
   exits without a meaningful known cause need no cause label.

   Window and span are proposed: two hours covers six full20min recoveries
   before combat time; four runs reject one lucky record; a two-floor span
   distinguishes a stable wall from a broad distribution. Preserve all events
   so these choices can be assessed before implementation acceptance. Do not
   widen the span or shorten the window after seeing misses to pass a gate.
4. **Knowledge remains bounded.** Snapshot the original selected resident's
   learned facts, known enemy identities and forecast frontier before work.
   Never publish a cause learned only by the disposable prediction. A raw
   predicted plateau beyond the original `best_depth + 1` becomes visible
   status `unknown`, with no exact floor or undiscovered biome/boss identity.
   Do not use another resident's private knowledge to name this resident's
   cause. Unknown information stays visibly unknown; no invented enemy name
   or guessed learned counter. Non-plateau statuses must not leak future
   encounter identity. The raw prediction may be retained only in diagnostic
   evidence to explain misses/coverage, not shipped in hidden DOM or API fields.
5. **One compact camp line.** Use the existing forecast/shaft area, including
   its pre-pen headline. A visible plateau can read `8h · D23 wall`; the
   existing details surface explains the horizon and optional known cause.
   Distinguish unknown, progressing, manual, insufficient and variable states
   through concise labels and accessible details. Never label a next-send
   reach bar or current record as the8h plateau. Respect three-word callout
   budgets, optional details,320/400/1440px,200% text and44px interactive targets.
   Empty/loading/error states retain normal camp actions and ordinary forecast.
6. **Read-only simulation with complete town context.** A disposable `Session`
   clone/snapshot evaluates the actual unchanged horizon and records the above
   observer stream. The production Session remains byte-identical. Reuse real
   shared-clock/wallet/offline rules rather than a second progression model.
   `forecast::sim_game` suppresses workers and models one send, so it is not an
   equivalent8h model. A predictor may later approximate this evaluator only
   after independent held-out accuracy proof; the unchanged real replay remains
   the acceptance oracle. No full death-verdict/patch search is needed merely
   to classify the window. Cache and observation state are transient.
7. **Asynchronous identity and cancellation.** Capture a consistent immutable
   Session before dispatch. Key the request by complete gameplay-state digest,
   selected resident, horizon, balance/content/runtime identity and knowledge
   snapshot. This includes all resident runs/clocks/rules/packages/gear, town
   wallet/buildings/workers/orders and progression; hashing only selected rules
   or record is insufficient. A cached result is valid only for that key.
   Selection, mutation, time advancement, import/reset and runtime/profile change
   supersede outstanding responses. A late response cannot paint a new resident
   or a different save. Repainting or reopening unchanged state reuses the result.
   Debounce view churn; do not start a forecast per animation frame/live tick.

   Use an independent worker/snapshot execution lane or interruptible chunks so
   a long computation cannot queue mandatory camp mutations behind it. A worker
   must never own or commit the live authoritative Session. Canceling/disposal
   ends work without sending speculative events, audio, particles or reports.
   Failures release busy state and permit a retry; no silent stale-floor fallback.
8. **No outcome changes.** Forecast reads, cache hits, cancellation and rendering
   preserve exact saves/RNG/Gold/history/worker acts and independent residents.
   Existing ordinary forecast, replay, offline and knowledge behavior remains.

## Earned cohort and accuracy proof

Predeclare the cohort and evaluator revision before inspecting predictions.
Use seeds1–16, default IDLE and PICKED policies, at6/24/48/96/168elapsed hours:
160 scheduled camps. Start from fresh towns through public house/send/hire
and policy actions; no Gold/Legacy/depth/worker grants. Use the final ordered
progression/default contracts actually shipping at this cut. Record every
manual action, real elapsed interval and resident founding event. Strict IDLE
must retain its documented action policy; label any revised default policy
explicitly rather than relabeling an engaged cohort as IDLE.

Each saved Session is the immutable source for (a) its displayed prediction and
(b) an actual unchanged8h replay. The oracle independently reduces the raw
completion stream using the rule above; testing a reducer against its own
returned label is insufficient. Save Session hashes, prediction response,
knowledge snapshot, run-window events, actual classification, floor error,
per-resident outcomes and native/runtime/profile/harness hashes. Keep misses
and non-plateau cases. Do not choose only camps already known to stall.

| Gate | Proposed acceptance | Why |
|---|---|---|
| Input cohort |160/160 camps accounted for;16/16 seeds per policy; missing/deadline cases named | prevents selective save removal |
| Plateau accuracy | Within1floor on>=80% of all oracle-plateau camps | owner target; unknown/failed/no-floor predictions count as misses |
| Plateau coverage | Visible numeric plateau on>=80% of all oracle-plateau camps | prevents passing by abstaining on difficult knowledge states |
| False walls | Numeric plateau on<=10% of oracle non-plateau camps | a precise floor must not mislabel continuing progress |
| Status agreement | Exact visible status on>=90% of known-answer camps; unknown-policy cases reported separately | makes other outcomes truthful, not a dumping ground |
| Breadth | At least32 oracle plateaus across>=12seeds, both policies, and at least8 with actual death in the final4 | stops a small/easy plateau subset certifying the feature |
| Knowledge |0future-name/floor leaks in all160 replies/DOM captures | canonical bounded-knowledge rule |

For plateau accuracy, coverage and false walls, print pooled counts and each
policy's counts; each policy independently meets its percentage gate. Report
known-frontier and unknown-frontier cases separately while retaining both in
accuracy/coverage denominators. Status agreement excludes only mandated
knowledge-redacted `unknown` cases, which remain misses in plateau gates.
If the fixed160 camps do not provide the breadth minimum, append prespecified
checkpoint240h for all32seed/policy pairs, then336h for all32; never append only
successful seeds. If still insufficient, report unmet breadth and keep this cut
unaccepted. The window/knowledge interaction may make proposed coverage
unattainable; that is a pending design finding, not permission to leak facts or
exclude unknown misses.

Supplement with earned multihero snapshots from the final founding cohort and
explicitly labeled diagnostics for paused Scout, pre-Scout in-flight run,
no-run recovery, guide start, victory/standing ascension, timed-out run and
variable-depth exits. These exercise classification/parity/refusal edges; they
cannot replace earned accuracy camps or be counted in the160-camp result.

## Latency and integration acceptance

Targets are proposed product budgets, not existing measurements. Record hardware,
CPU load, build mode and served WASM bytes/SHA. Use a quiet host and complete
captures rather than borrowing old native tick timings as browser evidence.

| Check | Proposed bar |
|---|---|
| Fresh8h prediction, native fast | p95<=1.5s single resident;<=4s three residents |
| Fresh8h prediction, shipping WASM worker | p95<=3s single resident;<=8s three residents |
| Unchanged cached answer, browser | p95<=50ms request-to-paint |
| Main-thread impact | No added task>50ms; required camp interaction response p95 increment<=50ms during forecasting versus matched idle |
| Cancel/supersede | Job acknowledges cancellation or is terminated<=250ms;0late-response paints |

Measure at least30cold prediction calls per resident-count group from distinct
cohort snapshots and30cached calls; cold here means empty prediction cache,
not cold terrain load. Costs include clone/serialization/worker transfer and
answer reduction. Compare three-resident execution against the actual shared
Session, not three unrelated single-Game forecasts. Proposed higher multihero
budgets reflect shared tick-order simulation; correctness and actionable camp
controls remain required while pending. Record errors/timeouts as failed calls.

Required checks: native fast semantic/parity tests, default Clippy; deterministic
native/WASM summary equality on earned snapshots; whole/sliced/reloaded actual
absence equality and per-resident wallet/XP/Legacy attribution; async lifecycle
journeys including failed retry/import/selection/navigation cancellation;
TypeScript/format/lint/copy; routine client suite plus forecast/selection/offline
journeys; phone/desktop and200% text screenshots, with private GPU for visual
claims. Rebuild WASM and repin settlement manifest without changing expected
Gold/ledgers if the package changes. Confirm matched16seed IDLE/PICKED per-seed
outcomes remain identical for this read-model-only change, then routine full
acceptance. Preserve final broad handoff audits as separate unfinished work.

## Implementation map and pending evidence

- Core: `forecast.rs` for the summary; `bloodlines.rs` for immutable Session
  prediction context; `offline.rs`/run settlement observer for natural completion
  times and IDs. Avoid relying on capped `run_log` or final synthetic returns.
- Wire/bridge: `wire.rs`, `idlever-wasm/src/lib.rs`, client `engine/types.ts`,
  `engine/wasm.ts` and proxy/worker API as required.
- Client: `app.ts` request identity/lifecycle; `ui/forecast.ts`/`ui/camp.ts`
  compact rendering and existing details. Extend `forecast-requests.mjs` rather
  than introducing incompatible stale-response rules.
- Evidence tooling: a dedicated earned cohort/evaluator can reuse Session
  loading and actual-absence mechanics from `examples/choice_check.rs` and
  `examples/sim_perf.rs`; existing camp/choice checks are diagnostics, not this
  accuracy gate. Capture actual completion observations independently.

Planned destination: `docs/evidence/cut239/`, including cohort manifest/source
saves, raw predictions/oracle windows, failure inventory, accuracy/coverage
summary, latency samples, exactness checks and screenshots. No such results
are claimed by this proposal. No new release is inferred.
