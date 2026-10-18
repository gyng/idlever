# Cut264 — Clone vat: short early clones, gold hurry, vat lighting and indicators

Status: PARTIAL DELIVERY via [Cut279](CUT279_VAT_MILESTONE.md), 2026-10-19. Vat UI/hurry retained; 15-second curve HELD after failed progression gates. Established `[600, 14, 28, 1]` curve restored for the owner-requested deploy-and-pause milestone. Original proposal/results below are historical. Owner decisions 2026-10-18: depth scaler `[150, 14, 28, 1]`; full-skip hurry priced by depth
(`remaining_min × unit(best) × 0.25`). Q3 (callout once) takes the default. Cut260 is integrated.

## Owner requests (2026-10-18, verbatim)

- "after first deat,h, toast over clone. clone vault should have timers"
- "timeres have scalers, but can be shortened with gold. scaling with hero level or something..."
- "for early game, clone timers should be short, like 15 seconds or something"
- "clone vault needs lighting at night and timers/indicators"

## 1. Today

- Death recovery is `recovery_ticks(depth)` (`persistent.rs:13-24`) from `balance.recovery = [600, 14, 28, 1]`
  (`balance.rs:269`, `tuning/balance.json:17`): 60 s through D14, linear to D28, 20 min (12000 ticks, the Cut227 owner
  amendment) from D28. It already scales, by the fatal run's deepest floor. The ramp shape is from the Cut230 search
  (`docs/CUT230_EARLY_PACING.md:58-72`): any ramp not full by D28, and any convex ramp, failed `tuned-picked`.
- Set on death at `engine.rs:5963-5965`; blocks `try_send` / `send` (`engine.rs:4075-4083`), endgame and ascension. An
  absence never skips it (`offline.rs:56-66`).
- `life_state` is `reincarnating` for only the first 1 s (10 ticks), then `recovering` (`persistent.rs:199-202`). So the vat
  sprite is active for about 1 s (`render/town.ts:2316-2322`); the hero then sits on the pool bench.
- Nothing announces the vat after the first death; `arrive()` (`ui/town.ts:490-514`) fires only for built buildings.
- At night, services get one generic dim warm lamp (`render/town.ts:2342-2348`); the vat has no light of its own.

## 2. Recovery curve

Recommended: keep the depth scaler, lower only the shallow value: `recovery: [150, 14, 28, 1]`.

| Deepest floor of fatal run | Now | Proposed |
|---|---|---|
| D1–D14 | 60 s | **15 s** |
| D21 | ≈ 10.5 min | ≈ 10.1 min |
| ≥ D28 | 20 min | 20 min (unchanged; keeps TUNED's D33 lead) |

Not class level alone: `class_level()` is per class (`engine.rs:2336`), so a fresh class would buy 15 s deaths at D30
and break `tuned-picked`. If a level scaler is wanted: `recovery_by: "level"`, `recovery_levels: [2, 8]`, and the
recovery is the **maximum** of the depth term and the level term.

## 3. Gold hurry

- One tap skips the whole remaining time. Offered only while the hero is home and cloning, with
  `remaining_s ≥ vat.hurry_min_s`.
- Price: `max(hurry_floor, roundup(hurry_round, ceil(remaining_s × unit(best) × hurry_permille / 60000)))`, where
  `unit(best) = 100 + 25 × best` is computed live (the locked kit unit freezes, so it would make no late sink). The
  price falls as time passes, and the button shows the live price. Examples: D21 death, 10 min left ≈ $1,560; D28+, 20
  min ≈ $4,250, about one night's net. It is a repeatable, depth-scaled gold sink.
- Core: `Game::hurry_clone(max_price)`. It refuses with "price changed" if the price is above `max_price`; otherwise it
  sets `recovery_until_tick` to now, trims `rest_left`, and calls `gold_move(-p, "hurry clone")`. Add the ledger
  reason to the night-net exclusion list (`engine.rs:2215`) and to `gold_term` "sinks" (`engine.rs:6907-6931`), or
  `conserved` and the bank cap drift. Wire it like `promote` (wasm `lib.rs:668`, `native-api.json`, `types.ts`,
  `fake.ts`).
- Wire: `hurry_price?`, `recovery_total_s` on `persistent::Hero` and `HeroSlot`.
- Determinism and offline: hurry is an explicit camp command and never runs offline; offline stays uncapped.
  **No bot and no worker hurries** (absence gold silently turned into speed would break the "never silent" rule
  and move `tuned-picked`). The diagnostic arm PICKED+H gets two rows: `hurry-king` (King no sooner than day 7) and
  `hurry-share` (spend share, days 3–14).

## 4. Vat UI: callout, timer, ready

1. `life_state` = `reincarnating` for the whole recovery, so the hero stands in the vat and the vat stays active. The
   pool keeps living rest. Copy becomes `Cloning 9m`. Rust never reads the string, so the simulation is unchanged.
2. First death: a one-time `Clone growing` callout over the vat (`arrive()`), stored in the per-viewer `seen` store.
   Later deaths show the badge only.
3. On-building timer: a `num` badge (`.town-count` pattern, `town.ts:675-680`) plus a conic progress ring from
   `(total − remaining)/total`. It has priority in the 3-marker budget.
4. Vat panel: hero-life with a `clone` header showing state, timer and `Hurry $N`. Reclone stays below it.
5. Ready: the readiness-lantern marker `Clone ready`, the vat flips to idle, and the hero emerges with the `emerge`
   fade. It clears when he departs or the vat is tapped.

## 5. Night lighting (code only; no art required)

- Replace the vat's generic lamp with a cool mist light (`#a4bcd6`) at the glass cylinder (offset measured from the
  packed frame):
  - idle: `night × 0.25`;
  - growing: `0.2 + night × 0.6`, pulsing ±15% at 2 Hz (no pulse under reduced motion or effects off);
  - ready: a 1.5 s flash.
- Respect `MAX_LIGHTS` (32).
- Optional: let `art/town_lights.py:58` include `town_service_*` with a cool-pixel detector (regenerates the JSON only).
- Optional art, with the idle sprite as fallback: `town_service_device_ready` and three growth-stage frames.

## 6. Balance keys, gates, validation

- Keys: `recovery: [150, 14, 28, 1]`; new `vat` section: `hurry_permille 250`, `hurry_min_s 30`, `hurry_round 5`,
  `hurry_floor 10`. Optional: `recovery_by`, `recovery_levels`.
- Rows likely to move:
  - improving: `scout`, `cadence30`, `opening-wait30`, `opening-gap`, `porter`;
  - at risk: `idle-delta`, `picked-idle` (1.50, no margin), `outpace`, `idle-d8`/`idle-d13`, `stalls-*`,
    `hands-idle`, `workers-daily`, and `tuned-picked` (margin 0.02);
  - pets: pet XP and egg hatching come sooner (`examples/pets_eval.rs`).
- Gates: every pacing row passes (24/24 once Cut260 lands), `conserved` holds, and IDLE byte-identical except via the
  recovery value.
- Order:
  1. `cargo test --profile fast` (hurry whole = sliced, price-changed refusal, offline never hurries,
     `recovery_ticks(1) == 150`).
  2. `tools/tune.sh scout,picked-idle,tuned-picked,idle-delta,cadence30 --fail-fast`.
  3. The opening probe.
  4. `gates.mjs --pacing`.
  5. If a row fails, sweep `recovery[0]` over {100, 150, 200, 300}.
  6. `pets_eval`.
  7. `repin --settle`.
  8. Client tests (home-resident-phases, hero-presence, hero-hub; fixtures for `recovering` → `reincarnating`),
     copy-lint, and a 402×681 night/day capture of the vat (growing and ready).
  9. `verify.sh --full`.

## 7. Owner questions (recommended default first)

1. Scaler: depth `[150, 14, 28, 1]` (default) / class level combined with depth through the maximum.
2. Hurry price: `remaining_min × unit(best) × 0.25`, full skip (default) / `× class level` / step skips.
3. Callout: once at the first death, then only the badge (default) / on every death.

## Resume implementation — 2026-10-18

Claude's interrupted implementation was recovered from `.claude/worktrees/cut264` and integrated with Cut277's
Drill yard/Guildhouse changes. Core recovery is 150 ticks through D14, linear to 12000 at D28; the whole interval
reads `reincarnating`. `hurryClone(max_price)` spends collected purse gold only, preserves night-net income and
records `hurry clone` under sinks. It never runs in an absence or bot.

The vat displays growth-stage art, time left and a progress ring. A first-viewed clone announces `Clone growing`
once per viewer's town store. Finished resident IDs are tracked independently: a ready lantern can coexist with
another resident's growing badge, and a departing resident cannot erase another's unread readiness. A tap clears
readiness. New emerge/flash/pulse effects respect reduced motion and effects off; every art path retains fallback.

Initial native validation: 1092 tests passed, six ignored (before W2 integration and the final collected-purse
refusal assertion). Final-source checks and their identities are recorded in `docs/evidence/cut265/`. Initial
browser proof: 42 checks pass, including real-WASM hurry and controlled three-resident readiness; 402×681 and
1440×900 day/night captures are in `docs/evidence/cut264/screens/`. These are controlled fixtures, not earned
campaigns or performance measurements. Harness failures and their fixes remain in separate logs.

## Vat-only delivery and paid-hurry diagnostic — 2026-10-18

Owner held Cut265 effects for redesign after eight failed price-only trials.
Vat-only delivery removes upgrade commands, balances, persisted levels, offers,
UI rows and bot purchases. The held implementation/evidence is preserved on
`hold/cut265-building-upgrades` (source445a1f3f; evidence6c16bd41). Clone hurry
uses its original undiscounted price. Staff/workplace levels from Cut273 remain.

The missing PICKED+H diagnostic is now implemented separately:

```sh
cargo run -q --profile fast -p idlever-core --example picked_hurry -- \
  --seeds 16 --threads 8 --out docs/evidence/cut264/hurry
```

It runs actual PICKED choices, then presses one affordable hurry at each of the
42 normal check-ins (three per day for 14 days). No extra funding, first-session
hurry, between-check-in hurry or away hurry is added. Ordinary dayplayer policy
and its pre-main cache salt are unchanged. Per-seed results resume only for the
same executable and balance identity. `hurry-king` requires **every** slain King
on day 7 or later; its median is informational. `hurry-share` reports spending /
earned+fetched+recovered income on days3–14; no numeric share bar was specified
in this contract. This diagnostic covers this check-in policy, not every possible
sequence of deliberate paid hurries. All 16 campaigns completed42 check-ins;
no King was slain in the fortnight, so the earliest day ≥ 7 check passes.
Median hurry spending was1.6882% of days3–14 income. Per-seed results and
exact executable/balance identities are in `docs/evidence/cut264/hurry/`.

The16-seed opening probe retained Cut260’s documented G2 deviation unchanged:
longest upgrade gap median28.9min, worst38.2min. G1/G3/G4/G6 pass. This is
not an all-opening-gates pass and no bar was changed.
