# Cut164 — current-runtime acceptance before a new blind cohort

Prospective acceptance checkpoint, following Cut163 component fix e96607f.
The unchanged-bar two-seed result is diagnostic. Neither the experimental
Cut152/153 actor nor the >=80 goal is accepted by that result.

Keep shipping sources and the experimental actor fixed while collecting:

1. Terminal whole-client results from the existing session80724, started with
   TEST_JOBS=3 TEST_HEAVY_WIDTH=1 on its own no-HMR Vite server and real fast
   WASM. Preserve the whole log and every failure. Missing or quiet observation
   is not terminal. No new native CPU-heavy job until this suite completes.
2. Original targeted actor plan, all22 rows listed below, with16 seeds for the
   main, TUNED and leave-one-out tiers; unchanged numeric bars/configurations.
   Fail-fast is allowed, but an early settled bound is not an exact all-seed
   statistic or proof that every planned job completed. Preserve the command,
   terminal status/log, production runtime and actor source identities, actual
   completed cache jobs, and any failure. No DP_OFF or balance profile.
3. tools/verify.sh --full: workspace tests, types/copy/tooling, Clippy,
   shipping-WASM/webbuild, current full gate metrics/wire/routine18 cases.
   Preserve actual terminal results. Routine18 is not the optional exhaustive
   272-case balance/migration audit. No gate weakening or silent deviation.

Exact targeted command after client completion:

```sh
node tools/gates.mjs --full --rows idle-d8,idle-d13,idle-d23,idle-stall,idle-gold,idle-king,idle-stages,picked-idle,outpace,picked-stages,reach,stalls-idle,stalls-picked,stalls-tuned,tuned-picked,random-picked,hands-idle,automation-pays,picked-l-king,picked-l-purse,porter,scout --fail-fast --seeds 16 --tuned-seeds 16 --loo-seeds 16
```

The20 progression/engagement/King/automation rows match the earlier Cut152
plan; porter/scout add the Cut153 ordering requirements. Original paid-action
and uninterrupted/resumed actor checks also remain required, with their exact
current source applicability verified before adoption. Cached results count
only when current production runtime, source and exact job identities match.
Do not stage the experimental actor until the required acceptance passes.

A native success cannot certify the client after a changed package: after
shipping-WASM packaging verify the current client/worker and production real
WASM. Freeze a new immutable cohort only from accepted sources/assets, with
content hashes, public bridge smoke and phone/desktop screenshots. Fulfil
pre-cohort QA in eval/RATING.md, resolve its lapse list, and reship/refreeze
if gameplay or UI changes. Final client evidence must cover the frozen assets.

Then TWO fresh independent blind raters, from the same immutable build and
precommitted protocol, with complete active phases and declared absences,
first10 actually unnoted, two complete own rule edits, three deaths read and
two normal multi-minute watches. Preserve raw cards/protocol/rules/screenshots;
lock both cards before inspection/scoring/caps. No repair or reuse of the
incomplete d34605e pair as certification. Require measured combined score>=80,
applicable caps/gates, decision reliability alpha>=0.80 and a protocol audit
that proves completion. Audio remains unassessed without a listening note.
Do not infer a score from mechanical checks. Do not deploy.

Queue setup: controller functions cell1747 polls the SAME client session80724.
Only terminal exit0 starts scratchpad/cut164/run-acceptance.py. The runner guards
502 source/public files, then checks current actor paid actions and exact resumed
parity, original22row/16seed plan, full routine and a NEW whole-client suite on
shipping WASM, sequentially. Each command/status/timestamp/log is saved under
scratchpad/cut164; first nonzero or source change stops the queue. Generated
pkg is excluded from the source guard because shipping packaging is explicit.
The runner does not adopt an actor, freeze a cohort, grant a score or deploy.
Source/runner setup evidence in docs/evidence/cut164; no completed queue result
is asserted by this setup artifact.

Terminal checkpoint: initial fast-WASM whole-client session80724 FAIL165/166
in1688.0s. clarity:paint fake-lag first forecast1266ms/retry1327ms exceeds
unchanged1200ms; recorded retry load28.3/32cores. Controller1747 terminal
client_failed, native_started=false. No paid/16seed/full/shipping-client command
started. Whole failure log preserved under evidence/cut164/results.
Post-failure host inspection finds a separate armee unit-test process consuming
26-28 cores; no external process modified. This does not prove causation or
exact PID overlap with failed measurements. Investigate/profile original paint
check, retaining its bar and failure; a focused pass cannot rewrite this full
run into green. Revalidate full client before the existing queue can proceed.

Focused unchanged-source/bar clarity:paint reproduction86754 terminalPASS5
checks/32.6s. Original full failure remains authoritative. No product patch
is justified by this result alone; full-client revalidation required.

Full revalidation58153 now LIVE, owned by functions controller1767. Only its
terminalexit0 starts the same guarded acceptance runner. Original failed run
and controller1747 remain terminal/immutable; narrow success does not permit
adoption. Shipping sources/502-file guard unchanged.
