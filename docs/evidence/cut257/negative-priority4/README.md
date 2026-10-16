# Priority4 boundary clocks, per-cast identity and conservation

2026-10-16. Bounded native controlled component tests for priority item 4 of
`docs/evidence/cut253/negative-audit-2026-10-16/priority.md`. The only source edit is
`crates/idlever-core/src/class_advanced_tests.rs` (eight new `priority4_*` tests plus `p4_*`
test-only helpers); production Rust, data, helpers, WASM and the gate are untouched. Root owns
the checkpoint; no other priority item and no pacing/full/exhaustive run is claimed here.

Method: controlled arenas and the actual verbs/scheduler only. No charge is granted, no
expected value or semantic requirement was relaxed, and every negative names the real
hit/Hurt/kill/position/debit it rests on (so "no benefit" cannot be vacuous because a different
action fired). Fixed RNG seeds are shared by the enabled/disabled forks; a selected branch is
component evidence about that branch, never earned play.

## Sub-items, tests and observed output

| Plan sub-item | Test(s) | Observed line(s) |
| --- | --- | --- |
| 1. Rally's 10-tick history, Execution's 39/40 boundary | `priority4_rally_tenth_tick_history_and_execution_fortieth_tick_boundary` | `priority4 rally elapsed=10 bash_cd=50 applied=[20] disabled_applied=[]` / `elapsed=11 bash_cd=70 applied=[]` / `priority4 execution elapsed=39 paid=false bash_cd=70` / `elapsed=40 paid=true bash_cd=50` |
| 2. Retained Vanish 0/1/2/3, shrinking misses | `priority4_patient_ambush_retains_zero_through_three_and_shrinks_repeated_misses` | `patient_ambush pre=1/2/3 miss_seed=3 retained=1/2/3 disabled_retained=0` / `shrink=3,2,1 expired=0 vanish_cd=97` |
| 3. mark/Slow 50 caps + small remaining deltas | `priority4_spotter_and_ice_lock_clamp_at_fifty_with_real_partial_deltas`, `priority4_small_remaining_cooldowns_apply_only_the_real_delta` | `spotter inherited=45 marked=50 applied=[5]` / `inherited=50 marked=50 applied=[]` / `ice_lock slow_t=40 applied=[10]` / `slow_t=50 applied=[5]` / `slow_t=50 applied=[]` / `snare remaining=3 applied=[3]` / `remaining=0 applied=[]` / `opening_cut remaining=4 hurt=2 applied=[4]` / `remaining=0 applied=[]` |
| 4. old/new Ward, Slow, Aim, physical reload identity across a reload | `priority4_ward_slow_aim_and_reload_identities_survive_a_public_reload` | `ward_identity source=0 new_source=433791696906 new_shatter=[20]` / `slow_identity ward_cd=49 applied=[10, 10]` / `aim_identity spent_recovery=[1] new_recovery=[1, 1]` / `reload_identity item=1 fast=false debit=100 loaded=1 applied=[50]` |
| 5. Refunds: real net debit <100 / 0, combined caps, energy <100 | `priority4_refunds_pay_half_the_real_net_debit_and_never_reach_full_energy` | `refund tier=Common real_debit=50 applied=[25] energy=75 disabled_energy=50` / `tier=Uncommon real_debit=25 applied=[12] energy=87` / `zero_room consumed=[1] applied=[] energy=99` / `combined applied=[5] second=[] energy=99` |
| 6. AimSettle fractional pace / timed speed / at-least-one-future-tick | `priority4_aim_settle_honours_fractional_pace_timed_speed_and_the_first_tick` | `deficits plain=10 pace5=6 pace9=2 speed_t5=10 arrivals=[("plain",21,22),(…,21,22),(…,21,22),("timed_speed",19,20)]` / `no_future_tick energy=95 next=13` |
| 7. Conservation of HP/Gold/chambers/cooldowns | `priority4_promised_energy_and_settlement_conserve_hp_loot_ammo_and_cooldowns` | `conserve veiled_route/moving_line/breach_route applied=[50]` / `chamber_chain/long_watch applied=[1] energy=10` / `smoke_walk world_equal=true energy=40 disabled_energy=90 actions=4 disabled_actions=3` |

`cases.json` carries, per sub-item, the scene, the real actions, the exact assertions added and
the observed line. Highlights of what each negative rests on:

- **Rally/Execution** — the block history is written by a real landed incoming melee blow
  (`last_block_t == the blow's turn`); at t+11 the identical prefix with the node's own bit
  cleared still takes a *legal* wind and pays nothing; both Execution kills are real charged
  melee kills (Siege charge consumed, `hp <= 0`), only the 40-tick one reduces the Bash clock.
- **Vanish** — pre 0 has no legal Ambush (refusal, exact save), pre 1/2/3 retain exactly their
  own ticks on a real miss with the same fixed seed as its node-cleared control, a hit clears
  Vanish, and three successive misses shrink 3 → 2 → 1 while `vanish_cd` only decays by the real
  ticks.
- **Caps and small deltas** — the real trap trigger really extends the mark (30 → 40) and the
  real Slow really lands at the cap before the applied delta is asserted; the cooldown deltas
  are asserted against the *remaining* clock (3, 4, 0), never a flat 20/10 and never negative.
- **Identity** — each of Ward/Slow/Aim/reload passes a real observation tick plus
  `Game::load`, its cast source/flags survive unchanged, the old cast pays once (and not twice),
  and a genuinely *new* cast is a different source that may pay once again (no invented
  permanent once-only lock). The reload pair's complete saves are byte-identical.
- **Refunds** — the `sure` gift makes the real net debit 50 / 25 and the applied refund 25 / 12
  (half the real debit, not a flat 50); a real promise with no room applies nothing while the
  charge is really consumed; two concurrent refunds share one budget and the actor never reaches
  full energy.
- **AimSettle** — every settled clock lands exactly one scheduler tick earlier than its
  node-cleared fork, and the promised energy is the clock's own deficit, which the fractional
  pace really shrinks (10 → 6 → 2); with the clock already about to act, the consumed promise
  settles nothing.
- **Conservation** — with the node on and with its bit cleared the world (hp, carried gold,
  monster hp, floor items + pack, every ordinary cooldown, the gun's ready clocks, chambers,
  capacity, the physical reload identity and the turn) is identical; only the promised energy or
  settlement moves.

## Not reached

Sub-item 5's *real net debit of exactly 0* with a pending refund. `after_action`'s debit is
`ACT_ENERGY` minus the energy the heir's traits returned in that action; the only 100 % return is
`light hands`, gated to a taking `pick_up`, which never queues an energy refund, and `sure` caps
at 75 %. The reachable neighbours above (trait-reduced debits, a zero-room promise, a shared
budget) are tested and the gap is recorded in `results.json.unreached` and
`observations-2026-10-16.json` (O5).

## Production defect

None found. No genuine causal test exposed a production defect, so no production code was
touched. The red phases are preserved and explained:

- `advanced-v1.log` (5 passed / 3 failed): a killed Bloat mother's hazard moved the hero off the
  kill tile so the boundary boss was not adjacent (a melee bash never chases); `p4_leftover`
  asserted the exact leftover before the action's own applied refund; the ambush reference save
  was captured before the event-buffer clear, and `Game::save()` carries that buffer.
- `advanced-v2.log` (7 passed / 1 failed): the retained-window loop's three real ticks decayed
  `vanish_cd` to 97; the assertion now pins the exact one-tick decay per real tick.
- `clippy-v1.log`: `clippy::type_complexity` on the paired conservation-case array type, fixed
  with the `P4Case` alias (compile-time only).

Every one was a fixture/assertion error in this file; no expected value changed to obtain green.

## Production identity before/after

`capture-identity.py` reproduces the `tools/runtime-key.mjs` key from the selected fast-profile
non-test core rlib and its rustc depfile (60 production Rust inputs, no test module) and hashes
every rlib candidate, the native examples and the shipped WASM. No build is performed.

- before: runtimeKey `7b802dde894ffa88` from `libidlever_core-a8cd7cd54e1ba70a.rlib`
  (51242270 bytes, sha256 `7369816e9c36…`)
- after: the same runtimeKey, the same rlib, all four candidates byte-identical, all 60
  production inputs byte-identical, WASM `51d041d0f884…` (6946459 bytes) byte-identical,
  `native_dev` byte-identical.
- The Cut253 gate key `d445c9825416e54e` is **not** reproducible from any current artifact: the
  Cut257 production commit `43aa5655` changed `ai.rs`, `class_advanced.rs` and `class_tree.rs`
  after that gate closed (the audit's recorded inputs differ in exactly those three files). Both
  epochs are recorded rather than relabelled.
- Three native *example* binaries (`dayplayer`, `metrics`, `qa`) differ between the two captures
  while keeping an older, preserved mtime (20:05:46-48) and with their cargo deps hardlink
  targets absent. No invocation of this phase wrote them (their mtimes predate the focused,
  module, clippy and workspace runs); the live perf-attribution peer's target-directory work is
  the likely cause. Reported as peer/environment churn, not as a production-source change, and
  not absorbed: the examples are not an input to the gate's runtime key.

## Checks (final source, sha256 63ca133b…)

| Command | Result |
| --- | --- |
| `cargo test -q --profile fast -p idlever-core --lib -- priority4 --nocapture` | 8 passed / 0 failed (`advanced-v5.log`) |
| `cargo test -q --profile fast -p idlever-core --lib -- advanced_tests --nocapture` | 63 passed / 0 failed (`native-v3.log`) |
| `cargo test -q --profile fast -p idlever-core --lib -- class_tree --nocapture` | 19 passed / 0 failed (`tree-stage-v1.log`) |
| `cargo test -q --workspace --profile fast` | 1055 passed / 6 ignored / 0 failed (`workspace-v3.log`) |
| `cargo clippy --workspace --all-targets --profile fast -- -D warnings` | clean (`clippy-v3.log`) |
| `rustfmt --edition 2021 --check crates/idlever-core/src/class_advanced_tests.rs` | clean |

The module was not rustfmt-clean at the phase start: the Cut257 commit left five regions
unformatted and this phase's new code added eleven more. `rustfmt` was run once on the file,
which formatted exactly those sixteen regions; with every whitespace character stripped, the
pre-edit module survives verbatim (83305 identical leading characters, no suffix difference)
and this phase's 32437 characters are appended at the end, i.e. no token changed. Every check
above was then re-run green on the formatted source.
`results.json` pins each check, its log hash and the retained red phases; `phases.json` is the
phase-by-phase record.

## Limits

Controlled arenas, manual masks, controlled clocks and RNG-selected branches are component
fixtures, never earned play or claims about cadence. Only priority item 4's seven sub-items are
covered; priority 1–3, their limits, the positive pairs, earned cohorts, native↔WASM parity and
pacing/full stand separately. No gate, wasm/release build, client test, balance, fun or
performance claim is made or inferred.
