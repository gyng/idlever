# Cut309 — recovery cap is tunable; both duration candidates fail

Contract: [CUT309](../../CUT309_RECOVERY_CAP.md). The new validated balance
parameter `recovery_full_ticks` enables native cap experiments without rebuilding.
Shipping remains shallow600ticks, full12000ticks. Old profiles default to12000;
stored timers and legacy duration fallback retain their original meaning.
The parameter affects future deaths and explicit reclones. No shorter duration
or town-upgrade redesign is adopted, and nothing is deployed.

One immutable executable runs these complete profiles on the SAME reused seeds1/2,
ordinary PICKED/TUNED, three check-ins/day, D33-or14days. No upgrade prototype,
grants, extra attendance, new pen policy, resampling or sample extension.

| Profile | shallow/full ticks | PICKED D33 hours | TUNED D33 hours | pen median |
| --- | --- | --- | --- | --- |
| reference |600/12000|40,48|40,40|1.10|
| shallow15 |150/12000|40,48|40,40|1.10 FAIL|
| deep5m |150/3000|40,40|40,40|1.00 FAIL|

All candidates' D13/D18/D23 median arrivals are unchanged. Deep5m advances
PICKED seed2 D33 and kit-complete48→40h; it does not advance TUNED D33 and
therefore erases the relative pen advantage. Absolute-arrival requirements pass,
but neither candidate meets≥1.15. No King is observed within these prefixes.
All four reference original records match Cut298 exactly, excluding elapsed
time and separating the additive default balance metadata. Twelve trajectories
are retained with every original record and SeedOut field.

`summary.json` retains every per-seed arrival, observed stop clock, completed
days, sends/deaths, kit timing and daily wealth changes. These endpoint clocks
differ (40/48h), and `gold_day` covers completed days only: no final-wallet,
Legacy, fortnight, worker-away, combined upgrade or population inference.
Original observations remain authoritative. Native profile wall times81.29/
94.07/91.81s were collected amid other builds; they are not isolated speed
benchmarks. The compile-free property is demonstrated by identical runtime
hashes and commands that change only the supplied profile.

Validation:

- Workspace fast tests with dev-balance:1104pass/6ignored,140.40s test time
  after compilation. Two new tests cover parser compatibility/bounds and exact
  depth-curve properties. Strict workspace/all-target Clippy passes.
- Three separate process-level timer probes pass actual configured deep deaths,
  confirmed reclones, whole/sliced/reloaded state equality, historical active
  timers and legacy fallback. The driver is `examples/recovery_profile_probe.rs`.
- New WASM7152841bytes, SHA256
  `53b98bb4214856e1de7a4fc875ca7b2f916bc66ee0f0d397bce7314de2692867`.
  Repin preserves Gold/ledger/ExitLine, expected results and complete after-saves
  on all four native settlements; no golden regeneration. Fresh-port5391
  headless real-WASM settlement check passes564checks/24cases, with all four
  served WASM bodies matching the new pin. Format and pin checks pass.
- Initial browser attempt could not start Vite in the sandbox (`EPERM`). Its
  original log is retained. The successful retry used local execution access;
  it changed no assertion, fixture or package. No automatic approval rejection.

`protocol.json` freezes profiles/request/contract/reference before outcomes;
`preflight.json` binds source240files, complete source archive, both immutable
native runtimes, profile inputs and verifier before campaign collection.
The ongoing WASM build log was excluded from that pre-outcome file set; final
identities cover it. Original logs and packets remain unchanged. Whitespace review excludes only
`core.patch` (literal blank diff-context lines) and `validation/native-tests.log`
(the native runner's final blank line); authored source/docs pass. Recompute:

```sh
python3 docs/evidence/cut309/verify.py
```

Keep both failed durations as discovery evidence. The next pen hypothesis must
change the player's effective policy before its progression deficit, rather
than assume globally faster recovery or more town spending will restore the
relative advantage. Recovery/worker coordination, shared-resident upgrade
API/UI, independent confirmation and broad backlog acceptance remain open.
