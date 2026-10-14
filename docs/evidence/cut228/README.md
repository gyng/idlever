# Cut228 evidence

Contract and implementation: `docs/CUT228_ANT_FARM.md`. Base `ec85d656`.

## Invariance (IDLE/PICKED, 16 seeds × 14 days)

```sh
target/fast/examples/dayplayer --seeds 16 --days 14 --bots idle,picked --routine --threads 12
```

- `dayplayer-base.log`: pristine binary built before any Rust edit
  (sha256 `f5c3dbe3…bfcc5c`, job key `f79b2b135198e380`).
- `dayplayer-final.log`: the Cut228 core (sha256 `a8850c2e…943962`, key `2c60366783cba424`).
- `dayplayer/base-*/`, `dayplayer/final-*/`: the 32 per-seed job results. All 32 are
  byte-identical (`filecmp` of each `<key>-<BOT>-s<N>-d14-c3.json` pair), and the bar
  table after `bar` is identical, including the pre-existing `Scout bought ≤ min 15`
  FAIL row (worst 15.6 min) that Cut225 also recorded.

## Checks

- `native-tests.log`: `cargo test -q --workspace --profile fast`: 937 passed, 6 ignored
  (includes the new `forge_work_is_a_read_model_of_a_real_recent_step_on_a_moving_clock`).
  `cargo clippy --workspace --all-targets -- -D warnings`: clean.
- WASM (fast, `tools/wasm.sh`): 6849656 bytes, sha256
  `c2f0a14ef0282d80b66b29dbfcf111a5409a10e70a07c41a1de7fe727920c104`.
  `settlements-inputs-c2f0.json` is the fd56 manifest with the new package pinned;
  `gold-settlements` passes 564 checks / 24 cases on it (`gold-settlements-c2f0.log`,
  `gold-settlements-c2f0/results.json`) and is now the test's default.
- oxfmt, oxlint (deny warnings), tsc and copy-lint (0 violations): pass.
- Routine client (`pnpm -s test`): the first run (`client-smoke-loaded.log`) ran with
  machine load 80–175 on 32 cores (other agents' gates) and passed 29/38; the nine
  failures were timeouts/timing budgets in watch, hub and forecast groups. Rerun on
  the same source at lower load, all nine pass (`client-smoke-rerun1.log`: 7/9, then
  `client-smoke-rerun2.log`: hero-hub 11658 checks and clarity:paint pass). Across the
  runs every routine group has passed; no single quiet 38/38 run is claimed.
- New `web/tests/home-forge-work.mjs`: 31 checks PASS (real WASM, public actions, Full
  and reduced motion; save unchanged by viewing).
- Home/town groups (`client-home-groups.log`): town-clock 36, home-resident-phases 25,
  town-save 39, home-services 38, home-label-layout PASS. `home-building-help`
  (line 107, the tent's hero window), `home-heroes` (timeout at line 105) and
  `home-residents` ("actual tent centre routes to its own action") fail, and fail
  identically with the four Cut228 client files reverted to `ec85d656` on the same
  package (`client-home-groups-pristine-client.log`): pre-existing on this base, not
  caused here. `cut30town` (exhaustive-only) still waits for the retired storehouse.

## Captures (private-Xvfb GPU, `tools/browser.mjs` launchGpu)

`capture.mjs` loads the Cut223 multihero session, advances five real minutes (heroes
1 and 2 leave on delves, hero 3 rests at home), selects hero 3 and buys the cheapest
Forge step with `buyKit` (`sword +1`, $150 from the earned purse). Nothing is set by the
client. `--before` stops before the purchase (same state, idle smith); `--reduced`
uses `prefers-reduced-motion`. Each frame has a whole-town PNG and a `-forge` crop
around the building; `*-report.json` holds served package hashes, Rust
`forge_work` and the renderer's `stats().forge` per frame.

- `gpu/before-{400,1440}-{day,night}[-forge].png`: idle smith, no sparks, hero 3 on
  the bench.
- `gpu/forge-{400,1440}-{day,night}[-forge].png`: the smith strikes at the anvil with
  sparks; hero 3 stands at the anvil facing him; heroes 1 and 2 only as delving
  portraits over the cave. In the 1440 day frame the Forge's details tooltip happens
  to be open and reads `Forging sword +1`.
- `gpu/forge-reduced-*`: still struck pose, zero spark bursts.

Day is 12:00 and night 23:00 via the dev `setHour`; the task tracker is folded (a
view preference) so it does not cover the Forge.
